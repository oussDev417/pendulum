// ===== VARIABLES GLOBALES =====
let animationId;
let currentAnimationData = null;
let angleChart = null;
let isSimulationRunning = false;

// ===== ÉLÉMENTS DOM =====
const form = document.getElementById('pendulumForm');
const simulateBtn = document.getElementById('simulateBtn');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const canvas = document.getElementById('pendulumCanvas');
const ctx = canvas.getContext('2d');

// ===== CONSTANTES =====
const ANIMATION_SPEED = 50; // ms entre chaque frame
const GRID_SIZE = 50;
const PENDULUM_SCALE = 0.3;

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de l\'application Simulation Pendule...');
    setupCanvas();
    setupForm();
    initializeChart();
    setupEventListeners();
    showWelcomeMessage();
});

// ===== CONFIGURATION DU CANVAS =====
function setupCanvas() {
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Redessiner si des données sont disponibles
        if (currentAnimationData) {
            const currentFrame = Math.floor((Date.now() / ANIMATION_SPEED) % currentAnimationData.time.length);
            if (currentFrame < currentAnimationData.time.length) {
                drawPendulum(
                    currentAnimationData.x_pos[currentFrame],
                    currentAnimationData.y_pos[currentFrame],
                    currentAnimationData.theta_deg[currentFrame],
                    currentAnimationData.time[currentFrame]
                );
            }
        }
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Dessiner le canvas initial
    drawInitialCanvas();
}

function drawInitialCanvas() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dessiner le fond
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dessiner la grille
    drawGrid();
    
    // Dessiner le pivot
    ctx.fillStyle = '#2d3748';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    // Message d'accueil
    ctx.fillStyle = '#4a5568';
    ctx.font = 'bold 18px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Prêt pour la simulation', centerX, centerY + 60);
    ctx.font = '14px Inter';
    ctx.fillText('Configurez les paramètres et lancez la simulation', centerX, centerY + 85);
}

// ===== CONFIGURATION DU FORMULAIRE =====
function setupForm() {
    // Gérer le changement de forme
    document.getElementById('shape').addEventListener('change', function() {
        updateDimensions();
        addFormAnimation();
    });

    // Gérer la soumission du formulaire
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        launchSimulation();
    });

    // Initialiser les dimensions
    updateDimensions();
}

function updateDimensions() {
    const shape = document.getElementById('shape').value;
    const dim1 = document.getElementById('dim1');
    const dim2 = document.getElementById('dim2');
    const dim3 = document.getElementById('dim3');

    // Réinitialiser les labels et affichage
    dim1.placeholder = 'd1';
    dim2.placeholder = 'd2';
    dim3.placeholder = 'd3';
    dim2.style.display = 'block';
    dim3.style.display = 'block';

    if (shape === 'sphère') {
        dim1.placeholder = 'rayon';
        dim2.style.display = 'none';
        dim3.style.display = 'none';
    } else if (shape === 'cylindre') {
        dim1.placeholder = 'rayon';
        dim2.placeholder = 'hauteur';
        dim3.style.display = 'none';
    } else if (shape === 'pavé') {
        dim1.placeholder = 'longueur';
        dim2.placeholder = 'largeur';
        dim3.placeholder = 'hauteur';
    }
}

function addFormAnimation() {
    const formGroups = document.querySelectorAll('.form-group');
    formGroups.forEach((group, index) => {
        group.style.animation = 'none';
        setTimeout(() => {
            group.style.animation = `fadeInUp 0.5s ease-out ${index * 0.1}s both`;
        }, 10);
    });
}

// ===== CONFIGURATION DES ÉVÉNEMENTS =====
function setupEventListeners() {
    // Validation en temps réel des inputs
    const inputs = form.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', validateInput);
        input.addEventListener('blur', validateInput);
    });
    
    // Animation des cartes au survol
    const cards = document.querySelectorAll('.result-card, .comparison-item');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

function validateInput(event) {
    const input = event.target;
    const value = parseFloat(input.value);
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    
    if (value < min || value > max) {
        input.style.borderColor = '#f56565';
        input.style.boxShadow = '0 0 0 3px rgba(245, 101, 101, 0.1)';
    } else {
        input.style.borderColor = '#e2e8f0';
        input.style.boxShadow = 'none';
    }
}

// ===== INITIALISATION DU GRAPHIQUE =====
function initializeChart() {
    const chartCtx = document.getElementById('angleChart').getContext('2d');
    
    // Configuration du graphique avec des options avancées
    angleChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Angle (degrés)',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#667eea',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Évolution de l\'angle du pendule',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    color: '#2d3748'
                },
                legend: {
                    display: true,
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#667eea',
                    borderWidth: 2,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Temps (s)',
                        font: {
                            size: 14,
                            weight: '600'
                        },
                        color: '#4a5568'
                    },
                    grid: {
                        color: '#e2e8f0',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#718096',
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Angle (degrés)',
                        font: {
                            size: 14,
                            weight: '600'
                        },
                        color: '#4a5568'
                    },
                    grid: {
                        color: '#e2e8f0',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#718096',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            elements: {
                point: {
                    hoverRadius: 8
                }
            }
        }
    });
}

// ===== LANCEMENT DE LA SIMULATION =====
async function launchSimulation() {
    if (isSimulationRunning) {
        showError('Une simulation est déjà en cours...');
        return;
    }
    
    try {
        isSimulationRunning = true;
        
        // Afficher le loading avec animation
        showLoading();
        simulateBtn.disabled = true;
        hideMessages();
        
        // Récupérer et valider les données du formulaire
        const params = getFormData();
        if (!validateFormData(params)) {
            throw new Error('Données du formulaire invalides');
        }

        // Lancer la simulation
        console.log('🔄 Lancement de la simulation...', params);
        const simulationData = await runSimulation(params);
        
        // Lancer la prédiction
        console.log('🤖 Lancement de la prédiction...');
        const predictionData = await runPrediction(params);
        
        // Afficher les résultats
        displayResults(simulationData, predictionData);
        
        // Démarrer l'animation
        startAnimation(simulationData.animation_data);
        
        // Message de succès
        showSuccess('🎉 Simulation et prédiction terminées avec succès !');
        
        // Sauvegarder les paramètres dans le localStorage
        saveSimulationParams(params);
        
    } catch (error) {
        console.error('❌ Erreur lors de la simulation:', error);
        showError('Erreur lors de la simulation: ' + error.message);
    } finally {
        hideLoading();
        simulateBtn.disabled = false;
        isSimulationRunning = false;
    }
}

function getFormData() {
    const formData = new FormData(form);
    return {
        shape: formData.get('shape'),
        fluid: formData.get('fluid'),
        L: parseFloat(formData.get('L')),
        m: parseFloat(formData.get('m')),
        theta0_deg: parseFloat(formData.get('theta0_deg')),
        dims: [
            parseFloat(formData.get('dim1')),
            parseFloat(formData.get('dim2')),
            parseFloat(formData.get('dim3'))
        ]
    };
}

function validateFormData(params) {
    const limits = {
        L: { min: 0.1, max: 5.0 },
        m: { min: 0.001, max: 10.0 },
        theta0_deg: { min: 10, max: 90 },
        dims: { min: 0.01, max: 1.0 }
    };
    
    if (params.L < limits.L.min || params.L > limits.L.max) return false;
    if (params.m < limits.m.min || params.m > limits.m.max) return false;
    if (params.theta0_deg < limits.theta0_deg.min || params.theta0_deg > limits.theta0_deg.max) return false;
    
    // Validation des dimensions selon la forme
    if (params.shape === 'sphère') {
        // Sphère: seulement dim1 doit être valide
        if (params.dims[0] < limits.dims.min || params.dims[0] > limits.dims.max) return false;
        // dim2 et dim3 peuvent être 0 pour une sphère
    } else if (params.shape === 'cylindre') {
        // Cylindre: dim1 et dim2 doivent être valides
        if (params.dims[0] < limits.dims.min || params.dims[0] > limits.dims.max) return false;
        if (params.dims[1] < limits.dims.min || params.dims[1] > limits.dims.max) return false;
        // dim3 peut être 0 pour un cylindre
    } else if (params.shape === 'pavé') {
        // Pavé: toutes les dimensions doivent être valides
        for (let dim of params.dims) {
            if (dim < limits.dims.min || dim > limits.dims.max) return false;
        }
    }
    
    return true;
}

async function runSimulation(params) {
    const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error);
    }
    
    return data;
}

async function runPrediction(params) {
    const response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...params,
            theta0_rad: params.theta0_deg * Math.PI / 180,
            Tc: 0.005
        })
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error);
    }
    
    return data;
}

// ===== AFFICHAGE DES RÉSULTATS =====
function displayResults(simulationData, predictionData) {
    // Mettre à jour les résultats de simulation
    updateSimulationResults(simulationData);
    
    // Mettre à jour la comparaison
    updateComparisonResults(simulationData, predictionData);
    
    // Mettre à jour le graphique
    updateChart(simulationData.animation_data);
    
    // Animation des cartes de résultats
    animateResultCards();
}

function updateSimulationResults(simulationData) {
    const stopTimeElement = document.getElementById('stopTime');
    const equilibriumPosElement = document.getElementById('equilibriumPos');
    
    // Animation du temps de stabilisation
    animateValue(stopTimeElement, '--', 
        simulationData.stop_time ? simulationData.stop_time.toFixed(2) : '--');
    
    // Animation de la position d'équilibre
    animateValue(equilibriumPosElement, '--', 
        simulationData.theta_eq_deg.toFixed(1));
}

function updateComparisonResults(simulationData, predictionData) {
    const simulationTimeElement = document.getElementById('simulationTime');
    const predictionTimeElement = document.getElementById('predictionTime');
    const differenceElement = document.getElementById('differenceText');
    
    // Animation des temps
    animateValue(simulationTimeElement, '--', 
        simulationData.stop_time ? simulationData.stop_time.toFixed(2) : '--');
    animateValue(predictionTimeElement, '--', 
        predictionData.predicted_time.toFixed(2));
    
    // Calculer et afficher la différence
    if (simulationData.stop_time) {
        const diff = Math.abs(simulationData.stop_time - predictionData.predicted_time);
        const diffPercent = (diff / simulationData.stop_time * 100).toFixed(1);
        const diffText = `Différence: ${diff.toFixed(2)}s (${diffPercent}%)`;
        
        animateValue(differenceElement, '--', diffText);
    }
}

function animateValue(element, fromValue, toValue) {
    element.style.transform = 'scale(1.1)';
    element.style.color = '#667eea';
    
    setTimeout(() => {
        element.textContent = toValue;
        element.style.transform = 'scale(1)';
        element.style.color = '';
    }, 200);
}

function animateResultCards() {
    const cards = document.querySelectorAll('.result-card, .comparison-item');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.style.animation = 'pulse 0.6s ease-in-out';
            setTimeout(() => {
                card.style.animation = '';
            }, 600);
        }, index * 100);
    });
}

// ===== MISE À JOUR DU GRAPHIQUE =====
function updateChart(animationData) {
    console.log('📊 Mise à jour du graphique avec:', animationData);
    console.log('�� Temps:', animationData.time.length, 'points');
    console.log('📊 Angles:', animationData.theta_deg.length, 'points');
    
    if (!angleChart) {
        console.error('❌ Chart.js non initialisé');
        return;
    }
    
    // Mettre à jour les données
    angleChart.data.labels = animationData.time.map(t => t.toFixed(1));
    angleChart.data.datasets[0].data = animationData.theta_deg;
    
    console.log('📊 Labels mis à jour:', angleChart.data.labels.length);
    console.log('📊 Données mises à jour:', angleChart.data.datasets[0].data.length);
    
    // Animation du graphique
    angleChart.update('active');
    console.log('✅ Graphique mis à jour');
}

// ===== ANIMATION DU PENDULE =====
function startAnimation(animationData) {
    currentAnimationData = animationData;
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    let currentFrame = 0;
    let isAnimating = true;
    
    function animate() {
        if (!isAnimating || currentFrame >= animationData.time.length) {
            // Arrêter complètement l'animation
            isAnimating = false;
            animationId = null;
            console.log('🛑 Animation arrêtée après', currentFrame, 'frames');
            return;
        }

        drawPendulum(
            animationData.x_pos[currentFrame],
            animationData.y_pos[currentFrame],
            animationData.theta_deg[currentFrame],
            animationData.time[currentFrame]
        );

        currentFrame++;
        
        if (isAnimating && currentFrame < animationData.time.length) {
            animationId = requestAnimationFrame(() => setTimeout(animate, ANIMATION_SPEED));
        } else {
            isAnimating = false;
            animationId = null;
            console.log('🛑 Animation terminée naturellement');
        }
    }

    animate();
}

function drawPendulum(x, y, angle, time) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = Math.min(canvas.width, canvas.height) * PENDULUM_SCALE;

    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dessiner le fond
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessiner la grille
    drawGrid();

    // Calculer les positions exactes avec un meilleur alignement
    const pivotX = centerX;
    const pivotY = centerY;
    
    // Ajuster l'échelle pour que le pendule soit visible
    const adjustedScale = scale * 0.8; // Réduire légèrement l'échelle
    
    const massX = centerX + x * adjustedScale;
    const massY = centerY + y * adjustedScale;

    // Dessiner le pivot avec ombre
    drawPivot(pivotX, pivotY);

    // Dessiner le fil avec effet de profondeur
    drawString(pivotX, pivotY, massX, massY);

    // Dessiner la masse avec forme adaptée
    drawMass(massX, massY, angle);

    // Afficher les informations
    drawInfo(time, angle);
}

function drawPivot(x, y) {
    // Ombre
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillStyle = '#2d3748';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    // Réinitialiser l'ombre
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Reflet
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 3, 0, 2 * Math.PI);
    ctx.fill();
}

function drawString(x1, y1, x2, y2) {
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    // Effet de profondeur
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Réinitialiser l'ombre
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function drawMass(x, y, angle) {
    const massSize = 20;
    
    // Ombre
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    
    // Dessiner la masse selon la forme
    const shape = document.getElementById('shape').value;
    
    if (shape === 'sphère') {
        ctx.fillStyle = '#e53e3e';
        ctx.beginPath();
        ctx.arc(x, y, massSize/2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Bordure pour l'attachement
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 2;
        ctx.stroke();
        
    } else if (shape === 'cylindre') {
        ctx.fillStyle = '#3182ce';
        ctx.fillRect(x - massSize/2, y - massSize/3, massSize, massSize*2/3);
        
        // Bordure pour l'attachement
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 2;
        ctx.stroke();
        
    } else if (shape === 'pavé') {
        ctx.fillStyle = '#38a169';
        ctx.fillRect(x - massSize/2, y - massSize/2, massSize, massSize);
        
        // Bordure pour l'attachement
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Réinitialiser l'ombre
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Reflet
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    if (shape === 'sphère') {
        ctx.beginPath();
        ctx.arc(x - 3, y - 3, 6, 0, 2 * Math.PI);
        ctx.fill();
    } else if (shape === 'cylindre') {
        ctx.fillRect(x - massSize/2 + 2, y - massSize/3 + 2, 6, 6);
    } else {
        ctx.fillRect(x - massSize/2 + 2, y - massSize/2 + 2, 6, 6);
    }
}

function drawInfo(time, angle) {
    ctx.fillStyle = '#2d3748';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    ctx.fillText(`Temps: ${time.toFixed(1)}s`, 20, 35);
    ctx.fillText(`Angle: ${angle.toFixed(1)}°`, 20, 60);
    
    // Réinitialiser l'ombre
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function drawGrid() {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    ctx.setLineDash([]);
}

// ===== FONCTIONS UTILITAIRES =====
function showLoading() {
    loading.style.display = 'block';
    loading.style.animation = 'fadeInUp 0.5s ease-out';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.style.animation = 'fadeInUp 0.5s ease-out';
    
    // Auto-hide après 5 secondes
    setTimeout(() => {
        hideMessages();
    }, 5000);
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    successMessage.style.animation = 'fadeInUp 0.5s ease-out';
    
    // Auto-hide après 3 secondes
    setTimeout(() => {
        hideMessages();
    }, 3000);
}

function hideMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

function showWelcomeMessage() {
    setTimeout(() => {
        showSuccess('👋 Bienvenue ! Configurez vos paramètres et lancez la simulation');
    }, 1000);
}

// ===== PERSISTANCE DES DONNÉES =====
function saveSimulationParams(params) {
    try {
        localStorage.setItem('lastSimulationParams', JSON.stringify(params));
        localStorage.setItem('lastSimulationTime', new Date().toISOString());
    } catch (error) {
        console.warn('Impossible de sauvegarder les paramètres:', error);
    }
}

function loadLastSimulationParams() {
    try {
        const params = localStorage.getItem('lastSimulationParams');
        if (params) {
            const data = JSON.parse(params);
            populateForm(data);
            showSuccess('📋 Paramètres de la dernière simulation chargés');
        }
    } catch (error) {
        console.warn('Impossible de charger les paramètres:', error);
    }
}

function populateForm(params) {
    document.getElementById('shape').value = params.shape;
    document.getElementById('fluid').value = params.fluid;
    document.getElementById('L').value = params.L;
    document.getElementById('m').value = params.m;
    document.getElementById('theta0_deg').value = params.theta0_deg;
    document.getElementById('dim1').value = params.dims[0];
    document.getElementById('dim2').value = params.dims[1];
    document.getElementById('dim3').value = params.dims[2];
    
    updateDimensions();
}

// ===== GESTION DES ERREURS =====
window.addEventListener('error', function(e) {
    console.error('Erreur JavaScript:', e.error);
    showError('Une erreur JavaScript est survenue. Vérifiez la console pour plus de détails.');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Promesse rejetée:', e.reason);
    showError('Une erreur réseau est survenue. Vérifiez votre connexion.');
});

// ===== EXPORT DES FONCTIONS =====
window.pendulumApp = {
    launchSimulation,
    loadLastSimulationParams,
    resetForm: () => form.reset(),
    stopAnimation: () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }
};
