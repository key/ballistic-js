// Wait for BallisticsCalculator to be available
const calculator = new BallisticsCalculator();
let chart = null;
let chartInstance = null; // Chart.js instance
let currentTrajectoryData = null;
let currentMass = null;

// Unit conversion constants
const GRAMS_TO_GRAINS = 15.4324;
const FPS_TO_MPS = 0.3048;
const JOULES_TO_FTLBF = 0.737562;
const MM_TO_M = 0.001;
const M_TO_MM = 1000;

// Environmental calculation constants
const ALTITUDE_TEMP_GRADIENT = 0.0065;  // Temperature gradient K/m
const SEA_LEVEL_TEMP = 288.15;  // Sea level standard temperature K
const BAROMETRIC_EXPONENT = -5.255;  // Barometric formula exponent
const GAS_CONSTANT = 8.314462618;  // Universal gas constant J/(mol·K)
const DRY_AIR_MOLAR_MASS = 0.0289644;  // kg/mol
const WATER_VAPOR_MOLAR_MASS = 0.01801528;  // kg/mol
const CELSIUS_TO_KELVIN = 273.15;
const SOUND_SPEED_BASE = 331.5;  // Base sound speed at 0°C (m/s)
const SOUND_SPEED_TEMP_COEFF = 0.6;  // Temperature coefficient for sound speed

// Cookie constants
const COOKIE_EXPIRY_DAYS = 365;

// Unit conversion states
let useGrains = false;  // Mass: false = grams, true = grains
let useMetersPerSec = false;  // Velocity: false = fps, true = m/s
let useFootPounds = false;  // Energy: false = joules, true = ft-lbf

// Cookie functions
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Load unit preferences from cookies
function loadUnitPreferences() {
    const massUnit = getCookie('massUnit');
    const velocityUnit = getCookie('velocityUnit');
    const energyUnit = getCookie('energyUnit');
    
    // Load mass unit preference
    const massInput = document.getElementById('mass');
    const defaultMassValue = parseFloat(massInput.getAttribute('data-default-value') || massInput.value);
    
    if (massUnit === 'grains') {
        useGrains = true;
        document.getElementById('massUnitToggle').checked = true;
        document.getElementById('massUnit').textContent = 'gr';
        // Convert default value to grains
        massInput.value = (defaultMassValue * GRAMS_TO_GRAINS).toFixed(1);
        massInput.step = "1";
    } else {
        // Default is grams
        massInput.value = defaultMassValue;
    }
    
    // Load velocity unit preference
    const velocityInput = document.getElementById('velocity');
    const defaultVelocityValue = parseFloat(velocityInput.getAttribute('data-default-value') || velocityInput.value);
    
    if (velocityUnit === 'mps') {
        useMetersPerSec = true;
        document.getElementById('velocityUnitToggle').checked = true;
        document.getElementById('velocityUnit').textContent = 'm/s';
        // Convert default value to m/s
        velocityInput.value = (defaultVelocityValue * FPS_TO_MPS).toFixed(1);
        velocityInput.step = "1";
    } else {
        // Default is fps
        velocityInput.value = defaultVelocityValue;
    }
    
    // Load energy unit preference
    if (energyUnit === 'ftlbf') {
        useFootPounds = true;
        document.getElementById('energyUnitToggle').checked = true;
    }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('calculate').addEventListener('click', calculate);
    document.getElementById('downloadCSV').addEventListener('click', downloadCSV);

    // Add event listeners for environment inputs
    const envInputs = ['temperature', 'pressure', 'humidity', 'altitude'];
    envInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateCalculatedValues);
    });

    // Remove automatic calculation on zero-in distance change
    // Calculation will happen when "計算" button is clicked

    // Initial calculation of air density
    updateCalculatedValues();
    
    // Load unit preferences from cookies
    loadUnitPreferences();

    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // Add active class to clicked button and corresponding panel
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // Unit toggle event listeners
    document.getElementById('massUnitToggle').addEventListener('change', function(e) {
        useGrains = e.target.checked;
        const massInput = document.getElementById('mass');
        const massUnit = document.getElementById('massUnit');
        
        if (useGrains) {
            // Convert grams to grains
            massInput.value = (parseFloat(massInput.value) * GRAMS_TO_GRAINS).toFixed(1);
            massInput.step = "1";
            massUnit.textContent = "gr";
            setCookie('massUnit', 'grains', COOKIE_EXPIRY_DAYS);
        } else {
            // Convert grains to grams
            massInput.value = (parseFloat(massInput.value) / GRAMS_TO_GRAINS).toFixed(1);
            massInput.step = "0.1";
            massUnit.textContent = "g";
            setCookie('massUnit', 'grams', COOKIE_EXPIRY_DAYS);
        }
    });

    document.getElementById('velocityUnitToggle').addEventListener('change', function(e) {
        useMetersPerSec = e.target.checked;
        const velocityInput = document.getElementById('velocity');
        const velocityUnit = document.getElementById('velocityUnit');
        
        if (useMetersPerSec) {
            // Convert fps to m/s
            velocityInput.value = (parseFloat(velocityInput.value) * FPS_TO_MPS).toFixed(1);
            velocityInput.step = "1";
            velocityUnit.textContent = "m/s";
            setCookie('velocityUnit', 'mps', COOKIE_EXPIRY_DAYS);
        } else {
            // Convert m/s to fps
            velocityInput.value = (parseFloat(velocityInput.value) / FPS_TO_MPS).toFixed(0);
            velocityInput.step = "10";
            velocityUnit.textContent = "fps";
            setCookie('velocityUnit', 'fps', COOKIE_EXPIRY_DAYS);
        }
    });

    document.getElementById('energyUnitToggle').addEventListener('change', function(e) {
        useFootPounds = e.target.checked;
        setCookie('energyUnit', useFootPounds ? 'ftlbf' : 'joules', COOKIE_EXPIRY_DAYS);
        // Recalculate to update display
        if (currentTrajectoryData && currentMass) {
            calculate();
        }
    });
});

function getInputValues() {
    const airDensity = calculateAirDensity();
    
    // Get mass in kg
    let massValue = parseFloat(document.getElementById('mass').value);
    if (useGrains) {
        // Convert grains to grams first, then to kg
        massValue = (massValue / GRAMS_TO_GRAINS) * MM_TO_M;
    } else {
        // Convert grams to kg
        massValue = massValue * MM_TO_M;
    }
    
    // Get velocity in m/s
    let velocityValue = parseFloat(document.getElementById('velocity').value);
    if (!useMetersPerSec) {
        // Convert fps to m/s
        velocityValue = velocityValue * FPS_TO_MPS;
    }
    
    return {
        velocity: velocityValue,
        angle: parseFloat(document.getElementById('angle').value),
        initialHeight: parseFloat(document.getElementById('initialHeight').value),
        scopeHeight: parseFloat(document.getElementById('scopeHeight').value) * MM_TO_M, // Convert mm to m
        mass: massValue,
        bc: parseFloat(document.getElementById('dragCoeff').value),  // Using dragCoeff input for BC
        dragModel: document.getElementById('dragModel').value,
        diameter: parseFloat(document.getElementById('diameter').value) * MM_TO_M, // Convert mm to m
        airDensity: airDensity,
        soundSpeed: parseFloat(document.getElementById('soundSpeed').textContent),
        windSpeed: parseFloat(document.getElementById('windSpeed').value),
        windAngle: parseFloat(document.getElementById('windAngle').value)
    };
}

function calculate() {
    // Check if zero-in distance is selected and calculate angle if needed
    const zeroDistance = parseFloat(document.getElementById('zeroDistance').value);
    if (zeroDistance) {
        calculateZeroAngle();
        // Get parameters after angle calculation
    }
    
    const params = getInputValues();
    
    const withDrag = calculator.calculateTrajectory(params);
    const noDrag = calculator.calculateNoDrag(params.velocity, params.angle);
    const initialEnergy = calculator.calculateEnergy(params.mass, params.velocity);
    const initialMomentum = calculator.calculateMomentum(params.mass, params.velocity);
    
    displayResults(withDrag, noDrag, initialEnergy, initialMomentum);
    drawTrajectory(withDrag.trajectory, noDrag, params.mass);
    
    // Store data for CSV download
    currentTrajectoryData = withDrag.trajectory;
    currentMass = params.mass;
    
    // Show download button
    document.getElementById('downloadCSV').style.display = 'inline-block';
}

function displayResults(withDrag, noDrag, energy, momentum) {
    const resultsDiv = document.getElementById('results');
    
    // Convert energy if needed
    let energyValue = energy;
    let energyUnit = 'J';
    if (useFootPounds) {
        // Convert joules to foot-pounds force
        energyValue = energy * JOULES_TO_FTLBF;
        energyUnit = 'ft-lbf';
    }
    
    // Convert impact velocity if needed
    let impactVelocityValue = withDrag.impactVelocity;
    let velocityUnit = 'm/s';
    if (!useMetersPerSec) {
        // Convert m/s to fps
        impactVelocityValue = withDrag.impactVelocity / FPS_TO_MPS;
        velocityUnit = 'fps';
    }
    
    resultsDiv.innerHTML = `
        <div class="results-grid">
            <div class="result-card">
                <div class="result-value">${withDrag.maxRange.toFixed(0)}</div>
                <div class="result-label">最大射程 (m)</div>
            </div>
            
            <div class="result-card">
                <div class="result-value">${withDrag.maxHeight.toFixed(1)}</div>
                <div class="result-label">最大高度 (m)</div>
            </div>
            
            <div class="result-card">
                <div class="result-value">${withDrag.flightTime.toFixed(1)}</div>
                <div class="result-label">飛行時間 (s)</div>
            </div>
            
            <div class="result-card">
                <div class="result-value">${impactVelocityValue.toFixed(useMetersPerSec ? 1 : 0)}</div>
                <div class="result-label">着弾速度 (${velocityUnit})</div>
            </div>
            
            <div class="result-card">
                <div class="result-value">${energyValue.toFixed(0)}</div>
                <div class="result-label">初期エネルギー (${energyUnit})</div>
            </div>
        </div>
    `;
}

function drawTrajectory(trajectoryData, noDragData, mass) {
    const canvas = document.getElementById('trajectoryChart');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Get zero-in parameters for deviation calculation
    const scopeHeight = parseFloat(document.getElementById('scopeHeight').value) * MM_TO_M;
    const initialHeight = parseFloat(document.getElementById('initialHeight').value);
    const zeroInHeight = initialHeight + scopeHeight;
    const zeroDistance = parseFloat(document.getElementById('zeroDistance').value) || 0;
    
    // Prepare data for Chart.js
    const distances = trajectoryData.map(p => p.x);
    const heights = trajectoryData.map(p => p.y);
    const velocities = trajectoryData.map(p => Math.sqrt(p.vx * p.vx + p.vy * p.vy));
    const energies = trajectoryData.map(p => {
        const v = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        return calculator.calculateEnergy(mass, v);
    });
    const deviations = trajectoryData.map(p => (p.y - zeroInHeight) * M_TO_MM); // Convert to mm
    
    // Convert energy units if needed
    const displayEnergies = useFootPounds ? energies.map(e => e * JOULES_TO_FTLBF) : energies;
    const energyUnit = useFootPounds ? 'ft-lbf' : 'J';
    
    // Store trajectory data for tooltips
    currentTrajectoryData = trajectoryData;
    currentMass = mass;
    
    // Prepare annotations
    const annotations = {};
    
    // Add scope height line annotation
    annotations.scopeHeightLine = {
        type: 'line',
        yMin: zeroInHeight,
        yMax: zeroInHeight,
        borderColor: '#4444ff',
        borderWidth: 1,
        borderDash: [10, 5],
        label: {
            content: `スコープハイト: ${zeroInHeight.toFixed(3)}m`,
            display: true,
            position: {
                x: 'start',
                y: 'start'
            },
            backgroundColor: 'rgba(68, 68, 255, 0.8)',
            color: 'white',
            font: {
                size: 10
            },
            yAdjust: -20  // 上に20ピクセル移動
        },
        yScaleID: 'y' // Height scale
    };
    
    // Add zero-in distance marker if selected
    if (zeroDistance) {
        annotations.zeroDistanceLine = {
            type: 'line',
            xMin: zeroDistance,
            xMax: zeroDistance,
            borderColor: '#00aa00',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
                content: `ゼロイン: ${zeroDistance}m`,
                display: true,
                position: 'start',
                backgroundColor: 'rgba(0, 170, 0, 0.8)',
                color: 'white',
                font: {
                    size: 10
                }
            },
            xScaleID: 'x'
        };
    }
    
    
    // Chart.js configuration
    const config = {
        type: 'line',
        data: {
            labels: distances,
            datasets: [
                {
                    label: '軌道',
                    data: heights,
                    borderColor: '#ff4444',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    yAxisID: 'y',
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    tension: 0
                },
                {
                    label: '速度',
                    data: velocities,
                    borderColor: '#4444ff',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    yAxisID: 'y1',
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    tension: 0
                },
                {
                    label: 'エネルギー',
                    data: displayEnergies,
                    borderColor: '#00aa00',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    yAxisID: 'y2',
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    tension: 0
                },
                {
                    label: '偏差',
                    data: deviations,
                    borderColor: '#ff44ff',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    yAxisID: 'y3',
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        padding: 10,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            const point = trajectoryData[index];
                            return `距離: ${point.x.toFixed(1)}m`;
                        },
                        afterTitle: function(context) {
                            const index = context[0].dataIndex;
                            const point = trajectoryData[index];
                            return `時間: ${point.t.toFixed(2)}秒`;
                        },
                        label: function(context) {
                            const datasetLabel = context.dataset.label;
                            const value = context.parsed.y;
                            
                            switch(datasetLabel) {
                                case '軌道':
                                    return `高度: ${value.toFixed(1)}m`;
                                case '速度':
                                    if (useMetersPerSec) {
                                        return `速度: ${value.toFixed(1)} m/s`;
                                    } else {
                                        return `速度: ${(value / FPS_TO_MPS).toFixed(0)} fps`;
                                    }
                                case 'エネルギー':
                                    return `エネルギー: ${value.toFixed(0)} ${energyUnit}`;
                                case '偏差':
                                    const sign = value >= 0 ? '+' : '';
                                    return `偏差: ${sign}${value.toFixed(0)}mm`;
                                default:
                                    return '';
                            }
                        }
                    }
                },
                annotation: {
                    annotations: annotations
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: '距離 (m)',
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        display: true,
                        drawBorder: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                        tickLength: 5,
                        lineWidth: function(context) {
                            if (context.tick.value % 50 === 0) {
                                return 1; // Solid line for 50m intervals
                            }
                            return 0.5; // Thinner for other intervals
                        },
                        color: function(context) {
                            if (context.tick.value % 50 === 0) {
                                return '#ddd';
                            }
                            return '#eee';
                        }
                    },
                    ticks: {
                        stepSize: 25,
                        maxTicksLimit: 20
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: '高度 (m)',
                        font: {
                            size: 12
                        },
                        color: '#ff4444'
                    },
                    grid: {
                        display: true,
                        drawBorder: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                        color: '#eee'
                    },
                    ticks: {
                        stepSize: 5,
                        color: '#ff4444'
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: '速度 (m/s)',
                        font: {
                            size: 12
                        },
                        color: '#4444ff'
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#4444ff'
                    }
                },
                y2: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: `エネルギー (${energyUnit})`,
                        font: {
                            size: 12
                        },
                        color: '#00aa00'
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#00aa00'
                    }
                },
                y3: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: '偏差 (mm)',
                        font: {
                            size: 12
                        },
                        color: '#ff44ff'
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#ff44ff',
                        callback: function(value) {
                            return (value >= 0 ? '+' : '') + value;
                        },
                        stepSize: 50
                    },
                    min: -500,  // Fixed minimum at -500mm
                    grace: '10%'  // Add 10% padding to the scale for max
                }
            }
        }
    };
    
    // Create the chart
    chartInstance = new Chart(ctx, config);
    
    // Update distance table
    updateDistanceTable(trajectoryData, mass, zeroInHeight);
    
    // Find subsonic threshold (where velocity drops below sound speed)
    const soundSpeed = calculateSoundSpeed(parseFloat(document.getElementById('temperature').value));
    let subsonicDistance = null;
    
    for (let i = 1; i < trajectoryData.length; i++) {
        const velocity = Math.sqrt(trajectoryData[i].vx * trajectoryData[i].vx + trajectoryData[i].vy * trajectoryData[i].vy);
        if (velocity < soundSpeed && trajectoryData[i-1]) {
            const prevVelocity = Math.sqrt(trajectoryData[i-1].vx * trajectoryData[i-1].vx + trajectoryData[i-1].vy * trajectoryData[i-1].vy);
            if (prevVelocity >= soundSpeed) {
                // Interpolate to find exact crossing point
                const ratio = (soundSpeed - prevVelocity) / (velocity - prevVelocity);
                subsonicDistance = trajectoryData[i-1].x + ratio * (trajectoryData[i].x - trajectoryData[i-1].x);
                break;
            }
        }
    }
    
    // Add subsonic threshold annotation if found
    if (subsonicDistance !== null) {
        // Find the velocity at subsonic distance
        let subsonicVelocity = soundSpeed;
        for (let i = 0; i < trajectoryData.length - 1; i++) {
            if (trajectoryData[i].x <= subsonicDistance && trajectoryData[i+1].x >= subsonicDistance) {
                // Interpolate to find exact velocity at subsonic distance
                const ratio = (subsonicDistance - trajectoryData[i].x) / (trajectoryData[i+1].x - trajectoryData[i].x);
                const v1 = Math.sqrt(trajectoryData[i].vx * trajectoryData[i].vx + trajectoryData[i].vy * trajectoryData[i].vy);
                const v2 = Math.sqrt(trajectoryData[i+1].vx * trajectoryData[i+1].vx + trajectoryData[i+1].vy * trajectoryData[i+1].vy);
                subsonicVelocity = v1 + ratio * (v2 - v1);
                break;
            }
        }
        
        chartInstance.options.plugins.annotation.annotations.subsonicBox = {
            type: 'label',
            xValue: subsonicDistance,
            yValue: subsonicVelocity,
            content: ['亜音速', `${subsonicDistance.toFixed(0)}m`],
            backgroundColor: 'rgba(68, 68, 255, 0.9)',
            borderColor: '#4444ff',
            borderWidth: 2,
            color: 'white',
            font: {
                size: 11,
                weight: 'bold'
            },
            padding: {
                top: 4,
                bottom: 4,
                left: 8,
                right: 8
            },
            borderRadius: 4,
            position: {
                x: 'start',
                y: 'end'
            },
            xAdjust: 15,  // 右に15ピクセル移動
            yAdjust: -25, // 上に25ピクセル移動
            yScaleID: 'y1',  // Velocity scale
            xScaleID: 'x'
        };
        chartInstance.update();
    }
}

function updateDistanceTable(trajectoryData, mass, zeroInHeight) {
    const markerDistances = [50, 100, 150, 200, 300];
    const tbody = document.querySelector('#distanceTable tbody');
    tbody.innerHTML = '';
    
    markerDistances.forEach(distance => {
        // Find the trajectory point closest to this distance
        let closestPoint = null;
        let minDiff = Infinity;
        
        for (let point of trajectoryData) {
            const diff = Math.abs(point.x - distance);
            if (diff < minDiff && point.y >= 0) {
                minDiff = diff;
                closestPoint = point;
            }
        }
        
        if (closestPoint && closestPoint.x <= Math.max(...trajectoryData.map(p => p.x))) {
            const velocity = Math.sqrt(closestPoint.vx * closestPoint.vx + closestPoint.vy * closestPoint.vy);
            const energy = calculator.calculateEnergy(mass, velocity);
            const deviation = (closestPoint.y - zeroInHeight) * M_TO_MM;
            
            // Format velocity
            let velocityText = '';
            if (useMetersPerSec) {
                velocityText = `${velocity.toFixed(1)} m/s`;
            } else {
                velocityText = `${(velocity / FPS_TO_MPS).toFixed(0)} fps`;
            }
            
            // Format energy
            let energyText = '';
            if (useFootPounds) {
                energyText = `${(energy * JOULES_TO_FTLBF).toFixed(0)} ft-lbf`;
            } else {
                energyText = `${energy.toFixed(0)} J`;
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${distance}m</td>
                <td>${closestPoint.y.toFixed(1)}m</td>
                <td>${velocityText}</td>
                <td>${energyText}</td>
                <td>${deviation >= 0 ? '+' : ''}${deviation.toFixed(0)}mm</td>
            `;
            tbody.appendChild(row);
        }
    });
}

function calculateZeroAngle() {
    const zeroDistance = parseFloat(document.getElementById('zeroDistance').value);
    if (!zeroDistance) {
        return; // No zero distance selected
    }
    
    const scopeHeight = parseFloat(document.getElementById('scopeHeight').value) * MM_TO_M; // Convert mm to m
    const initialHeight = parseFloat(document.getElementById('initialHeight').value);
    const targetHeight = initialHeight + scopeHeight; // Target height = barrel height + scope height
    
    // Get current parameters
    const params = getInputValues();
    
    // Use binary search to find the angle that gives us the zero distance
    let lowAngle = 0;      // Start from 0 degrees
    let highAngle = 0.01;  // Start with 0.01 degrees for first zero
    let bestAngle = 0;
    let bestDistanceDiff = Infinity;  // Track best distance difference
    let iterations = 0;
    const maxIterations = 100;  // More iterations for better precision
    const tolerance = 0.5; // 0.5m tolerance for distance
    
    while (iterations < maxIterations && (highAngle - lowAngle) > 0.0001) {  // Better precision
        const midAngle = (lowAngle + highAngle) / 2;
        
        // Calculate trajectory with this angle
        const testParams = {...params, angle: midAngle};
        const trajectory = calculator.calculateTrajectory(testParams);
        
        // Check if trajectory is valid
        if (!trajectory || !trajectory.trajectory) {
            continue;
        }
        
        const trajectoryPoints = trajectory.trajectory;
        
        // Find first crossing point with scope height (first zero)
        let firstZeroDistance = null;
        let crossingHeight = null;
        
        // First, find where trajectory crosses scope height line
        for (let i = 1; i < trajectoryPoints.length; i++) {
            const prevHeight = trajectoryPoints[i-1].y;
            const currHeight = trajectoryPoints[i].y;
            
            // Check if trajectory crosses the target height between these two points
            if ((prevHeight <= targetHeight && currHeight >= targetHeight) || 
                (prevHeight >= targetHeight && currHeight <= targetHeight)) {
                // Interpolate to find exact crossing distance
                const ratio = (targetHeight - prevHeight) / (currHeight - prevHeight);
                firstZeroDistance = trajectoryPoints[i-1].x + ratio * (trajectoryPoints[i].x - trajectoryPoints[i-1].x);
                
                // Only consider this if it's ascending (first zero)
                if (trajectoryPoints[i].vy > 0 || (trajectoryPoints[i].vy === 0 && trajectoryPoints[i-1].vy > 0)) {
                    break;
                }
            }
        }
        
        // Now check the height at the target distance
        for (let i = 1; i < trajectoryPoints.length; i++) {
            if (trajectoryPoints[i].x >= zeroDistance) {
                const ratio = (zeroDistance - trajectoryPoints[i-1].x) / (trajectoryPoints[i].x - trajectoryPoints[i-1].x);
                crossingHeight = trajectoryPoints[i-1].y + ratio * (trajectoryPoints[i].y - trajectoryPoints[i-1].y);
                break;
            }
        }
        
        // If we have the height at target distance, use it for binary search
        if (crossingHeight !== null) {
            const heightDiff = crossingHeight - targetHeight;
            
            // Keep track of best angle
            if (Math.abs(heightDiff) < Math.abs(bestDistanceDiff)) {
                bestAngle = midAngle;
                bestDistanceDiff = heightDiff;
            }
            
            if (Math.abs(heightDiff) < 0.001) { // 1mm tolerance
                break;
            } else if (heightDiff < 0) {
                // Shooting too low, increase angle
                lowAngle = midAngle;
                
                // If we're at the high end and still too low, expand the range
                if (midAngle > highAngle * 0.9 && iterations < 20) {
                    highAngle *= 2;
                }
            } else {
                // Shooting too high, decrease angle
                highAngle = midAngle;
            }
        } else {
            // Trajectory doesn't reach target distance
            lowAngle = midAngle;
        }
        
        iterations++;
    }
    
    // Set the calculated angle
    document.getElementById('angle').value = bestAngle.toFixed(3);
}

function downloadCSV() {
    if (!currentTrajectoryData || !currentMass) return;
    
    let csvContent = "距離(m),高度(m),速度(m/s),速度(fps),エネルギー(J)\n";
    
    // Process trajectory data at 5m intervals
    let processedDistances = new Set();
    let dataPoints = [];
    
    for (let point of currentTrajectoryData) {
        const distance = Math.floor(point.x / 5) * 5; // Round down to nearest 5m
        
        if (!processedDistances.has(distance) && point.y >= 0) {
            processedDistances.add(distance);
            
            const velocity = Math.sqrt(point.vx * point.vx + point.vy * point.vy);
            const velocityFps = velocity / FPS_TO_MPS;
            const energy = calculator.calculateEnergy(currentMass, velocity);
            
            dataPoints.push({
                distance: distance,
                altitude: point.y,
                velocityMs: velocity,
                velocityFps: velocityFps,
                energy: energy
            });
        }
    }
    
    // Sort by distance
    dataPoints.sort((a, b) => a.distance - b.distance);
    
    // Generate CSV
    for (let data of dataPoints) {
        csvContent += `${data.distance},${data.altitude.toFixed(2)},${data.velocityMs.toFixed(2)},${data.velocityFps.toFixed(0)},${data.energy.toFixed(2)}\n`;
    }
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ballistic_data_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Note: Mouse hover functionality is now handled by Chart.js tooltip configuration

function calculateAirDensity() {
    const temperature = parseFloat(document.getElementById('temperature').value);
    const pressure = parseFloat(document.getElementById('pressure').value);
    const humidity = parseFloat(document.getElementById('humidity').value);
    const altitude = parseFloat(document.getElementById('altitude').value);
    
    // 標高による気圧補正
    const seaLevelPressure = pressure * Math.pow(1 - ALTITUDE_TEMP_GRADIENT * altitude / SEA_LEVEL_TEMP, BAROMETRIC_EXPONENT);
    
    // 飽和水蒸気圧の計算 (Magnus formula)
    const Es = 6.1078 * Math.pow(10, (7.5 * temperature) / (temperature + 237.3));
    
    // 実際の水蒸気圧
    const E = (humidity / 100) * Es;
    
    // 乾燥空気の分圧
    const Pd = (seaLevelPressure - E) * 100; // hPa to Pa
    
    // 水蒸気の分圧
    const Pv = E * 100; // hPa to Pa
    
    // 絶対温度
    const T = temperature + CELSIUS_TO_KELVIN;
    
    // 空気密度の計算
    const airDensity = (Pd * DRY_AIR_MOLAR_MASS + Pv * WATER_VAPOR_MOLAR_MASS) / (GAS_CONSTANT * T);
    
    return airDensity;
}

function calculateSoundSpeed(temperature) {
    // 音速 = 331.5 + 0.6 * temperature (m/s)
    return SOUND_SPEED_BASE + SOUND_SPEED_TEMP_COEFF * temperature;
}

function updateCalculatedValues() {
    const airDensity = calculateAirDensity();
    const temperature = parseFloat(document.getElementById('temperature').value);
    const soundSpeed = calculateSoundSpeed(temperature);
    
    document.getElementById('calculatedAirDensity').textContent = airDensity.toFixed(4);
    document.getElementById('soundSpeed').textContent = soundSpeed.toFixed(1);
}

// Initial calculation with default zero-in distance
calculate();