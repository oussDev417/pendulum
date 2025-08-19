import os

class Config:
    """Configuration de base de l'application"""
    
    # Configuration Flask
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'pendulum-simulation-secret-key-2024'
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    # Configuration physique
    G = 9.81              # Accélération de la pesanteur (m/s^2)
    B_PIVOT = 0.002       # Coefficient de frottement visqueux du pivot (N*m*s/rad)
    EPSILON = 0.02        # Seuil d'arrêt en radians (environ 1.15 degrés)
    TC_DRY_FRICTION = 0.005  # Couple de frottement sec constant (N*m)
    ALPHA_TANH = 1000.0   # Coefficient de "raideur" pour la régularisation de tanh
    T_MAX_SIMULATION = 3600 # Temps maximal pour une simulation (secondes)
    
    # Propriétés des fluides
    FLUID_PROPERTIES = {
        'air':   {'rho': 1.225, 'color': '#e6f7ff', 'name': 'Air'},
        'eau':   {'rho': 1000.0, 'color': '#66b3ff', 'name': 'Eau'},
        'huile': {'rho': 900.0, 'color': '#ffcc66', 'name': 'Huile'}
    }
    
    # Limites des paramètres
    PARAM_LIMITS = {
        'L': {'min': 0.1, 'max': 5.0, 'step': 0.1, 'default': 1.0},
        'm': {'min': 0.001, 'max': 10.0, 'step': 0.1, 'default': 2.0},
        'theta0_deg': {'min': 10, 'max': 90, 'step': 1, 'default': 45},
        'dimensions': {'min': 0.01, 'max': 1.0, 'step': 0.01, 'default': 0.1}
    }
    
    # Configuration du modèle ML
    MODEL_PATH = 'mlp_model_4_1.pkl'
    MODEL_INFO = {
        'name': 'MLP Neural Network',
        'architecture': '200-150-100',
        'performance': {
            'R²': 0.9915,
            'RMSE': 40.34,
            'MAE': 12.22
        }
    }

class DevelopmentConfig(Config):
    """Configuration pour le développement"""
    DEBUG = True
    HOST = '0.0.0.0'
    PORT = 5000

class ProductionConfig(Config):
    """Configuration pour la production"""
    DEBUG = False
    HOST = '0.0.0.0'
    PORT = int(os.environ.get('PORT', 5000))

# Configuration par défaut
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

