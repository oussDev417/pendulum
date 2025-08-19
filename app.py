from flask import Flask, render_template, request, jsonify
import numpy as np
from scipy.integrate import solve_ivp
from scipy.signal import find_peaks
import joblib
import pandas as pd
from sklearn.preprocessing import StandardScaler
import json
import os

# Import de la configuration
from config import config

# Configuration de l'environnement
env = os.environ.get('FLASK_ENV', 'development')
app_config = config[env]

app = Flask(__name__)
app.config.from_object(app_config)

# --- CONSTANTES PHYSIQUES ---
G = app_config.G
B_PIVOT = app_config.B_PIVOT
EPSILON = app_config.EPSILON
TC_DRY_FRICTION = app_config.TC_DRY_FRICTION
ALPHA_TANH = app_config.ALPHA_TANH
T_MAX_SIMULATION = app_config.T_MAX_SIMULATION

FLUID_PROPERTIES = app_config.FLUID_PROPERTIES

# --- CHARGEMENT DU MODÈLE ET SCALER ---
MODEL_PATH = app_config.MODEL_PATH
SCALER_PATH = 'scaler_4_1.pkl'

# Charger le modèle MLP et le scaler
try:
    model = joblib.load('mlp_model_4_1.pkl')
    print("✅ Modèle MLP chargé depuis mlp_model_4_1.pkl")
except Exception as e:
    print(f"❌ Erreur chargement modèle MLP: {e}")
    model = None

try:
    scaler = joblib.load('scaler_4_1.pkl')  # Utiliser le scaler corrigé
    print("✅ StandardScaler chargé depuis scaler_4_1.pkl")
except Exception as e:
    print(f"❌ Erreur chargement StandardScaler: {e}")
    scaler = None

# --- FONCTIONS UTILITAIRES ---
def calculate_properties(shape, dims, m, L):
    """Calcule les propriétés physiques selon la forme - Version qui fonctionne"""
    if shape == 'sphère':
        R = dims[0]
        S, V, I, Cd = np.pi * R**2, (4/3) * np.pi * R**3, (2/5) * m * R**2 + m * (L+R)**2, 0.47
    elif shape == 'cylindre':
        R, H = dims[0], dims[1]
        S, V, I, Cd = np.pi * R**2, np.pi * R**2 * H, m * (R**2/4 + H**2/12) + m * (L+R)**2, 0.82
    elif shape == 'pavé':
        d1, d2, d3 = dims[0], dims[1], dims[2]
        S, V, I, Cd = d3 * d2, d1 * d2 * d3, m * (d1**2 + d2**2) / 12 + m * (L+d3/2)**2, 1.05
    else:
        raise ValueError(f"Forme '{shape}' non reconnue.")
    
    # Debug: afficher les valeurs calculées
    print(f"🔍 Debug calculate_properties - {shape}: S={S:.6f}, V={V:.6f}, I={I:.6f}")
    
    return I, S, Cd, V

def pendulum_ode(t, y, I, m, L, S, Cd, rho_fluid, V_object, Tc, alpha_tanh):
    """Équation différentielle complète avec poussée d'Archimède, traînée et frottement sec."""
    theta, omega = y
    
    buoyancy_force = rho_fluid * V_object * G
    torque_gravity = -(m * G - buoyancy_force) * L * np.sin(theta)
    torque_pivot_friction = -B_PIVOT * omega
    torque_dry_friction = -Tc * np.tanh(alpha_tanh * omega)
    speed = L * omega
    torque_fluid_drag = -0.5 * rho_fluid * S * Cd * abs(speed) * speed * L
    
    domega_dt = (torque_gravity + torque_pivot_friction + torque_dry_friction + torque_fluid_drag) / I
    dtheta_dt = omega
    return [dtheta_dt, domega_dt]

def find_stop_time(t_array, theta_array, epsilon, theta_eq):
    """Trouve le temps où l'amplitude des oscillations passe sous epsilon"""
    deviation = np.abs(theta_array - theta_eq)
    peaks_indices, _ = find_peaks(deviation)
    if len(peaks_indices) == 0: 
        return None
    peak_times = t_array[peaks_indices]
    peak_amplitudes = deviation[peaks_indices]
    sub_threshold_peaks = np.where(peak_amplitudes < epsilon)[0]
    if len(sub_threshold_peaks) > 0:
        return peak_times[sub_threshold_peaks[0]]
    else:
        return None

def prepare_features_for_mlp(params, scaler):
    """Prépare les features pour le modèle MLP en suivant le même format d'entraînement"""
    shape = params['shape']
    fluid = params['fluid']
    dims = params['dims']
    m = params['m']
    L = params['L']
    theta0_deg = params['theta0_deg']  # Utiliser theta0_deg au lieu de theta0_rad
    theta0_rad = np.deg2rad(theta0_deg)  # Convertir en radians
    Tc = params.get('Tc', 0.005)  # Valeur par défaut si Tc n'existe pas
    
    # Calculer les propriétés physiques
    I, S, Cd, V_object = calculate_properties(shape, dims, m, L)
    
    # Créer le DataFrame avec les mêmes colonnes que l'entraînement
    #L	m	theta0_rad	Tc	fluid	dim1	dim2	dim3	surface	volume	inertie	shape_cylindre	shape_pavé	shape_sphère
    data_dict = {
        'L': [L],
        'm': [m],
        'theta0_rad': [theta0_rad],
        'Tc': [Tc],
        'fluid': [FLUID_PROPERTIES[fluid]['rho']],  # Convertir en densité numérique
        'dim1': [dims[0]],
        'dim2': [dims[1] if len(dims) > 1 else 0],
        'dim3': [dims[2] if len(dims) > 2 else 0]
    }
    
    # Ajouter les colonnes calculées
    data_dict['surface'] = [S]
    data_dict['volume'] = [V_object]
    data_dict['inertie'] = [I]
    data_dict['shape_cylindre'] = [1 if shape == 'cylindre' else 0]
    data_dict['shape_pavé'] = [1 if shape == 'pavé' else 0]
    data_dict['shape_sphère'] = [1 if shape == 'sphère' else 0]
    
    # Créer le DataFrame
    df = pd.DataFrame(data_dict)

    
    
    
    # IMPORTANT: Réorganiser les colonnes dans l'ordre attendu par le scaler
    # Le scaler attend 14 colonnes dans cet ordre exact
    expected_order = [
        'L', 'm', 'theta0_rad', 'Tc', 'fluid', 'dim1', 'dim2', 'dim3', 
        'surface', 'volume', 'inertie', 'shape_cylindre', 'shape_pavé', 'shape_sphère'
    ]
    
    # Réorganiser et retourner
    df_final = scaler.transform(df[expected_order])
    
    return df_final

# --- ROUTES FLASK ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/simulate', methods=['POST'])
def simulate_pendulum():
    """API pour la simulation du pendule"""
    try:
        data = request.get_json()
        
        # Extraire les paramètres
        L = float(data['L'])
        m = float(data['m'])
        theta0_deg = float(data['theta0_deg'])
        shape = data['shape']
        fluid = data['fluid']
        dims = [float(d) for d in data['dims']]
        
        theta0_rad = np.deg2rad(theta0_deg)
        rho_fluid = FLUID_PROPERTIES[fluid]['rho']
        
        # Calculer les propriétés physiques
        I, S, Cd, V_object = calculate_properties(shape, dims, m, L)
        
        # Déterminer la position d'équilibre
        effective_weight = m * G - rho_fluid * V_object * G
        theta_eq = np.pi if effective_weight < 0 else 0
        
        # Debug: afficher les valeurs pour comprendre
        print(f"🔍 Debug équilibre: m={m}, rho_fluid={rho_fluid}, V={V_object}")
        print(f"🔍 effective_weight={effective_weight}, theta_eq={theta_eq} rad = {np.rad2deg(theta_eq)}°")
        
        # Lancer la simulation
        y0 = [theta0_rad, 0.0]
        solution = solve_ivp(
            fun=pendulum_ode, 
            t_span=[0, T_MAX_SIMULATION], 
            y0=y0,
            method='RK45', 
            dense_output=True,
            args=(I, m, L, S, Cd, rho_fluid, V_object, TC_DRY_FRICTION, ALPHA_TANH)
        )
        
        # Analyser le résultat
        t_sim = solution.t
        theta_sim = solution.y[0]
        t_stop = find_stop_time(t_sim, theta_sim, EPSILON, theta_eq)
        
        # Debug: afficher les résultats de simulation
        print(f"🔍 Debug simulation: t_sim={len(t_sim)} points, theta_sim={len(theta_sim)} points")
        print(f"🔍 Debug simulation: t_sim[0]={t_sim[0]:.3f}s, t_sim[-1]={t_sim[-1]:.3f}s")
        print(f"🔍 Debug simulation: theta_sim[0]={np.rad2deg(theta_sim[0]):.3f}°, theta_sim[-1]={np.rad2deg(theta_sim[-1]):.3f}°")
        print(f"🔍 Debug simulation: t_stop={t_stop}")
        
        # Préparer les données pour l'animation
        t_anim = np.arange(0, min(t_sim[-1], 100), 0.1)  # Limiter à 100s pour l'animation
        theta_anim = solution.sol(t_anim)[0]
        
        # Debug: afficher les données d'animation
        print(f"🔍 Debug animation: t_anim={len(t_anim)} points, theta_anim={len(theta_anim)} points")
        print(f"🔍 Debug animation: t_anim[0]={t_anim[0]:.3f}s, t_anim[-1]={t_anim[-1]:.3f}s")
        print(f"🔍 Debug animation: theta_anim[0]={np.rad2deg(theta_anim[0]):.3f}°, theta_anim[-1]={np.rad2deg(theta_anim[-1]):.3f}°")
        
        # Convertir en degrés pour l'affichage
        theta_deg = np.rad2deg(theta_anim)
        
        # Préparer la réponse
        response = {
            'success': True,
            'simulation_time': float(t_sim[-1]) if len(t_sim) > 0 else 0,
            'stop_time': float(t_stop) if t_stop is not None else None,
            'theta_eq_deg': float(np.rad2deg(theta_eq)),
            'animation_data': {
                'time': t_anim.tolist(),
                'theta_deg': theta_deg.tolist(),
                'x_pos': (L * np.sin(theta_anim)).tolist(),
                'y_pos': (L * np.cos(theta_anim)).tolist()  # Supprimer le signe négatif
            },
            'parameters': {
                'L': L,
                'm': m,
                'shape': shape,
                'fluid': fluid,
                'dims': dims,
                'I': float(I),
                'S': float(S),
                'Cd': float(Cd),
                'V': float(V_object)
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/predict', methods=['POST'])
def predict_stabilization():
    """API pour la prédiction avec le modèle MLP"""
    try:
        if model is None or scaler is None:
            return jsonify({'success': False, 'error': 'Modèle ou scaler non chargé'}), 500
            
        data = request.get_json()
        
        # Préparer les features
        features = prepare_features_for_mlp(data, scaler)
        
        # Debug: afficher les features
        print(f"🔍 Debug MLP - Features shape: {features.shape}")
        print(f"🔍 Debug MLP - Features: {features}")
        
        # Faire la prédiction
        prediction = model.predict(features)[0]
        
        # Debug: afficher la prédiction
        print(f"🔍 Debug MLP - Prédiction brute: {prediction}")
        
        # Gérer les prédictions négatives
        if prediction < 0:
            prediction = abs(prediction)
            print(f"🔍 Debug MLP - Prédiction corrigée: {prediction}")
        
        response = {
            'success': True,
            'predicted_time': float(prediction),
            'model_info': {
                'name': 'MLP Neural Network',
                'performance': 'R² = 0.9915, RMSE = 40.34s'
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(
        debug=app_config.DEBUG,
        host=app_config.HOST,
        port=app_config.PORT
    )
