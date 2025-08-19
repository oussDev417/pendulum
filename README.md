# Simulation Pendule - Prédiction IA - PROJET EEIA 2025 BENIN EXCELLENCE PNUD

## 📋 Description du Projet

Ce projet propose une **interface web moderne** pour la simulation et la prédiction du temps de stabilisation d'un pendule en utilisant l'intelligence artificielle.

### Objectif Principal
Déterminer le temps de stabilisation d'un pendule à l'aide d'un modèle d'intelligence artificielle. Un modèle physique de haute fidélité (méthode RK45) est d'abord utilisé pour générer des données d'entraînement, puis un modèle MLP (Multi-Layer Perceptron) fournit des prédictions rapides et précises.

### 🔬 Méthodologie
1. **Modèle physique haute fidélité** : Résolution numérique de l'équation différentielle du pendule
2. **Collecte de données** : Génération d'un large jeu de données via simulation
3. **Entraînement IA** : Modèle MLP avec R² = 0.9915 et RMSE = 40.34s
4. **Interface web** : Comparaison temps réel entre simulation et prédiction

## 🚀 Installation et Démarrage

### Prérequis
- Python 3.8+
- pip (gestionnaire de paquets Python)

### Étapes d'installation

1. **Cloner le projet**
```bash
git clone <url-du-repo>
cd pendulum
```

2. **Installer les dépendances**
```bash
pip install -r requirements.txt
```

3. **Vérifier la présence du modèle MLP**
Assurez-vous que le fichier `mlp_model_40_v3.pkl` est présent dans le répertoire racine.

4. **Lancer l'application**
```bash
python app.py
```

5. **Accéder à l'interface**
Ouvrez votre navigateur et allez sur : `http://localhost:5000`

## 🎮 Utilisation de l'Interface

### 📊 Configuration des Paramètres

#### **Forme du solide**
- **Sphère** : Rayon uniquement
- **Cylindre** : Rayon + Hauteur  
- **Pavé** : Longueur + Largeur + Hauteur

#### **Fluide environnant**
- **Air** (ρ = 1.225 kg/m³)
- **Eau** (ρ = 1000 kg/m³)
- **Huile** (ρ = 900 kg/m³)

#### **Paramètres du pendule**
- **Longueur du fil** : 0.1 à 5.0 mètres
- **Masse** : 0.1 à 10.0 kg
- **Angle initial** : 10° à 90°
- **Dimensions** : Adaptées selon la forme choisie

### 🔄 Processus de Simulation

1. **Remplir le formulaire** avec les paramètres souhaités
2. **Cliquer sur "Lancer la simulation"**
3. **Observer** :
   - Animation en temps réel du pendule
   - Graphique de l'évolution de l'angle
   - Temps de stabilisation simulé
   - Prédiction du modèle MLP
   - Comparaison des deux résultats

## 🏗️ Architecture Technique

### Backend (Flask)
- **API `/api/simulate`** : Simulation physique avec RK45
- **API `/api/predict`** : Prédiction avec le modèle MLP
- **Physique complète** : Poussée d'Archimède, traînée, frottements

### Frontend (HTML/CSS/JavaScript)
- **Interface responsive** avec design moderne
- **Canvas HTML5** pour l'animation du pendule
- **Chart.js** pour les graphiques
- **Animations fluides** et transitions CSS

### Modèle ML
- **Architecture** : MLP (200, 150, 100) neurones
- **Performance** : R² = 0.9915, RMSE = 40.34s
- **Features** : 14 variables (géométrie, physique, encodage)

## 📁 Structure des Fichiers

```
pendulum/
├── app.py                 # Application Flask principale
├── collecteur.py         # Script de collecte de données
├── test.py              # Tests de simulation
├── mlp_model_4_v1.pkl  # Modèle MLP entraîné
├── Projet_5.ipynb     # Notebook d'entraînement
├── requirements.txt      # Dépendances Python
├── templates/
│   └── index.html       # Interface web
└── README.md            # Ce fichier
```

## 🔧 Fonctionnalités Avancées

### 🎨 Interface Utilisateur
- **Design moderne** avec gradients et ombres
- **Responsive** pour tous les écrans
- **Animations fluides** et transitions
- **Feedback visuel** en temps réel

### 📊 Visualisations
- **Animation du pendule** en temps réel
- **Graphique d'évolution** de l'angle
- **Comparaison côte à côte** simulation vs prédiction
- **Métriques de performance** du modèle

### ⚡ Performance
- **Simulation optimisée** avec RK45
- **Prédiction instantanée** avec le modèle MLP
- **Interface réactive** sans blocage

## 🧪 Tests et Validation

### Validation Physique
- **Conservation de l'énergie** vérifiée
- **Convergence numérique** contrôlée
- **Comparaison** avec solutions analytiques

### Validation du Modèle ML
- **R² élevé** (0.9915) indique une excellente prédiction
- **RMSE faible** (40.34s) pour des temps de l'ordre de 1000s
- **Généralisation** testée sur différents paramètres

## 🚀 Déploiement

### Développement Local
```bash
python app.py
```

### Production
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.
Et est la propriété de BENIN EXCELLENCE

## 👥 Auteurs

- **Équipe de développement** - *Travail initial* - BIO KOUMAZAN Ousséni

## Remerciements

 **EEIA-BENIN EXCELLENCE** 

---

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement

---

**⭐ N'oubliez pas de donner une étoile au projet si vous l'appréciez !**

