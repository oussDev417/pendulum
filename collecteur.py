import numpy as np
from scipy.integrate import solve_ivp
from scipy.signal import find_peaks
from scipy.stats import qmc
import pandas as pd
import multiprocessing
from tqdm import tqdm
import time
import os

# --- 1. PARAMÈTRES FIXES ET CONSTANTES DE LA SIMULATION ---
N_SAMPLES = 10000        # Nombre d'observations à générer
G = 9.81                  # Accélération de la pesanteur (m/s^2)
B_PIVOT = 0.002           # Coefficient de frottement visqueux du pivot (N*m*s/rad)
ALPHA_TANH = 1000.0       # Coefficient de "raideur" pour la régularisation de tanh

EPSILON = 0.02            # Seuil d'arrêt en radians (~1.15 degrés)
T_MAX_SIMULATION = 3600   # Temps maximal pour une simulation (secondes)

FLUID_PROPERTIES = {
    'air':   {'rho': 1.225},
    'eau':   {'rho': 1000.0},
    'huile': {'rho': 900.0}
}

# --- 2. FONCTIONS UTILITAIRES ---

def calculate_properties(shape, dims, m, L):
    """Calcule I, S, Cd, et V (Volume)"""
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
    """Trouve le temps où l'amplitude des oscillations passe sous epsilon, autour de la position d'équilibre theta_eq."""
    deviation = np.abs(theta_array - theta_eq)
    peaks_indices, _ = find_peaks(deviation)
    if len(peaks_indices) == 0: return None
    peak_times = t_array[peaks_indices]
    peak_amplitudes = deviation[peaks_indices]
    sub_threshold_peaks = np.where(peak_amplitudes < epsilon)[0]
    if len(sub_threshold_peaks) > 0:
        return peak_times[sub_threshold_peaks[0]]
    return None

# --- 3. FONCTION "WORKER" POUR LA PARALLÉLISATION ---
def run_simulation(params):
    """Exécute une seule simulation complète avec la physique complète."""
    try:
        # Extraire tous les paramètres
        shape = params['shape']
        fluid = params['fluid']
        dims = params['dims']
        m = params['m']
        L = params['L']
        theta0_rad = params['theta0_rad']
        Tc = params['Tc']
        
        rho_fluid = FLUID_PROPERTIES[fluid]['rho']

        # Calculer les propriétés physiques de l'objet
        I, S, Cd, V_object = calculate_properties(shape, dims, m, L)
        
        effective_weight = m * G - rho_fluid * V_object * G
        theta_eq = np.pi if effective_weight < 0 else 0.0
        
        # Lancer la simulation avec les arguments complets
        y0 = [theta0_rad, 0.0]
        solution = solve_ivp(
            fun=pendulum_ode,
            t_span=[0, T_MAX_SIMULATION],
            y0=y0,
            method='RK45',
            args=(I, m, L, S, Cd, rho_fluid, V_object, Tc, ALPHA_TANH),
            t_eval=np.linspace(0, T_MAX_SIMULATION, int(T_MAX_SIMULATION * 10))
        )
        
        # Analyser le résultat en passant la position d'équilibre
        t_stop = find_stop_time(solution.t, solution.y[0], EPSILON, theta_eq)
        
        # Préparer le dictionnaire de sortie
        result_dict = params.copy()
        for i, d in enumerate(dims):
            result_dict[f'dim{i+1}'] = d
        del result_dict['dims']
        result_dict['t_epsilon'] = t_stop if t_stop is not None else -1.0

        return result_dict

    except Exception as e:
        return None

# --- 4. SCRIPT PRINCIPAL ---
if __name__ == "__main__":
    # a) Plan d'expériences (LHS)
    print("1/4 - Génération du plan d'expériences (LHS)...")
    
    # Ordre: [L, m, theta0_deg, Tc, dim1, dim2, dim3]
    l_bounds = [0.2, 0.1, 10.0, 0.0,    0.02, 0.02, 0.02]
    u_bounds = [2.0, 5.0, 90.0, 0.01,   0.50, 0.50, 0.50]
    
    scaled_sample = np.random.uniform(low=l_bounds, high= u_bounds, size=(N_SAMPLES, len(l_bounds)))
    
    # b) Créer la liste des tâches à exécuter
    print("2/4 - Préparation de la liste des tâches de simulation...")
    tasks = []
    shapes = ['sphère', 'cylindre', 'pavé']
    fluids = list(FLUID_PROPERTIES.keys())
    num_shapes = len(shapes)
    num_fluids = len(fluids)
    
    for i in range(N_SAMPLES):
        shape = shapes[i % num_shapes]
        fluid = fluids[(i // num_shapes) % num_fluids]
        params_row = scaled_sample[i]
        
        # Gérer les dimensions selon la forme
        if shape == 'sphère':
            dims = [params_row[4]] # dim1
        elif shape == 'cylindre':
            dims = [params_row[4], params_row[5]] # dim1, dim2
        else: # pavé
            dims = [params_row[4], params_row[5], params_row[6]] # dim1, dim2, dim3

        task = {
            'L': params_row[0],
            'm': params_row[1],
            'theta0_rad': np.deg2rad(params_row[2]),
            'Tc': params_row[3], # NOUVEAU: Ajout de Tc à la tâche
            'shape': shape,
            'fluid': fluid,
            'dims': dims
        }
        tasks.append(task)

    # c) Exécution en parallèle
    num_cores = max(1, multiprocessing.cpu_count() - 1)
    print(f"3/4 - Démarrage des simulations en parallèle sur {num_cores} cœurs...")
    start_time = time.time()
    
    with multiprocessing.Pool(processes=num_cores) as pool:
        results = list(tqdm(pool.imap_unordered(run_simulation, tasks), total=len(tasks)))
    
    end_time = time.time()
    print(f"--- Simulations terminées en {end_time - start_time:.2f} secondes ---")

    # d) Collecte et sauvegarde des résultats
    print("4/4 - Traitement des résultats et sauvegarde dans un fichier CSV...")
    
    valid_results = [r for r in results if r is not None]
    
    if not valid_results:
        print("ERREUR : Aucune simulation n'a réussi. Le DataFrame est vide.")
    else:
        df = pd.DataFrame(valid_results)
        df['t_epsilon'].replace(-1.0, np.nan, inplace=True)
        df.dropna(subset=['t_epsilon'], inplace=True)
        
        output_filename = f"pendulum_data_full_physics_{len(df)}_samples.csv"
        df.to_csv(output_filename, index=False)
        
        print(f"Terminé ! {len(df)} observations valides ont été sauvegardées dans '{output_filename}'.")