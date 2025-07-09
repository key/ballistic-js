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
const BAROMETRIC_EXPONENT = -5.25577;  // Barometric formula exponent (g*M)/(R*L)
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
    
    // Convert energy to display unit
    let displayEnergy = energy;
    let energyUnit = 'J';
    if (useFootPounds) {
        displayEnergy = energy * JOULES_TO_FTLBF;
        energyUnit = 'ft-lbf';
    }
    
    resultsDiv.innerHTML = `
        <div class="results-grid">
            <div class="result-card">
                <div class="result-value">${withDrag.maxRange.toFixed(1)}</div>
                <div class="result-label">最大飛距離 (m)</div>
            </div>
            <div class="result-card">
                <div class="result-value">${withDrag.maxHeight.toFixed(1)}</div>
                <div class="result-label">最大高度 (m)</div>
            </div>
            <div class="result-card">
                <div class="result-value">${withDrag.flightTime.toFixed(2)}</div>
                <div class="result-label">飛行時間 (秒)</div>
            </div>
            <div class="result-card">
                <div class="result-value">${withDrag.impactVelocity.toFixed(1)}</div>
                <div class="result-label">着弾速度 (m/s)</div>
            </div>
            <div class="result-card">
                <div class="result-value">${displayEnergy.toFixed(0)}</div>
                <div class="result-label">初速エネルギー (${energyUnit})</div>
            </div>
            <div class="result-card">
                <div class="result-value">${momentum.toFixed(2)}</div>
                <div class="result-label">運動量 (kg·m/s)</div>
            </div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 6px;">
            <h4 style="margin-top: 0;">空気抵抗なしの理論値との比較</h4>
            <p>最大飛距離: ${noDrag.maxRange.toFixed(1)} m (差: ${(withDrag.maxRange - noDrag.maxRange).toFixed(1)} m)</p>
            <p>最大高度: ${noDrag.maxHeight.toFixed(1)} m (差: ${(withDrag.maxHeight - noDrag.maxHeight).toFixed(1)} m)</p>
            <p>飛行時間: ${noDrag.flightTime.toFixed(2)} 秒 (差: ${(withDrag.flightTime - noDrag.flightTime).toFixed(2)} 秒)</p>
        </div>
    `;
}

function calculateZeroAngle() {
    const zeroDistance = parseFloat(document.getElementById('zeroDistance').value);
    if (!zeroDistance) return;
    
    const params = getInputValues();
    const scopeHeight = params.scopeHeight;
    const totalScopeHeight = params.initialHeight + scopeHeight;
    
    // Binary search for the angle that gives zero at the specified distance
    let minAngle = -5; // degrees
    let maxAngle = 5;  // degrees
    let bestAngle = 0;
    let iterations = 0;
    const maxIterations = 50;
    const tolerance = 0.001; // meters
    
    while (iterations < maxIterations) {
        const midAngle = (minAngle + maxAngle) / 2;
        params.angle = midAngle;
        
        const trajectory = calculator.calculateTrajectory(params);
        
        // Find the height at zero distance
        let heightAtZero = null;
        for (let i = 0; i < trajectory.trajectory.length - 1; i++) {
            const point = trajectory.trajectory[i];
            const nextPoint = trajectory.trajectory[i + 1];
            
            if (point.x <= zeroDistance && nextPoint.x >= zeroDistance) {
                // Interpolate
                const ratio = (zeroDistance - point.x) / (nextPoint.x - point.x);
                heightAtZero = point.y + ratio * (nextPoint.y - point.y);
                break;
            }
        }
        
        if (heightAtZero === null && trajectory.trajectory.length > 0) {
            // Zero distance is beyond trajectory
            if (trajectory.trajectory[trajectory.trajectory.length - 1].x < zeroDistance) {
                maxAngle = midAngle;
                continue;
            }
        }
        
        if (heightAtZero !== null) {
            const error = heightAtZero - totalScopeHeight;
            
            if (Math.abs(error) < tolerance) {
                bestAngle = midAngle;
                break;
            }
            
            if (error > 0) {
                // Shooting too high
                maxAngle = midAngle;
            } else {
                // Shooting too low
                minAngle = midAngle;
            }
        }
        
        iterations++;
    }
    
    // Set the calculated angle
    document.getElementById('angle').value = bestAngle.toFixed(3);
}

// Format energy value for display
function formatEnergy(energy) {
    if (useFootPounds) {
        return (energy * JOULES_TO_FTLBF).toFixed(0) + ' ft-lbf';
    } else {
        return energy.toFixed(0) + ' J';
    }
}

function drawTrajectory(trajectoryData, noDragResult, mass) {
    const canvas = document.getElementById('trajectoryChart');
    const zeroDistance = parseFloat(document.getElementById('zeroDistance').value) || 0;
    const scopeHeight = parseFloat(document.getElementById('scopeHeight').value) * MM_TO_M || 0;
    const initialHeight = parseFloat(document.getElementById('initialHeight').value);
    const zeroInHeight = initialHeight + scopeHeight;
    
    // Extract data for plotting
    const distances = trajectoryData.map(point => point.x);
    const heights = trajectoryData.map(point => point.y);
    const velocities = trajectoryData.map(point => {
        const v = Math.sqrt(point.vx * point.vx + point.vy * point.vy);
        return v;
    });
    
    // Calculate energy and deviation at each point
    const energies = velocities.map(v => {
        const energy = 0.5 * mass * v * v;
        return useFootPounds ? energy * JOULES_TO_FTLBF : energy;
    });
    
    const deviations = trajectoryData.map(point => {
        // Deviation from zero-in height in mm
        const deviationM = point.y - zeroInHeight;
        return deviationM * M_TO_MM;
    });
    
    // If there's an existing chart, destroy it
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Get canvas context
    const ctx = canvas.getContext('2d');
    
    // Energy unit for display
    const energyUnit = useFootPounds ? 'ft-lbf' : 'J';
    
    // Create Chart.js configuration
    const config = {
        type: 'line',
        data: {
            labels: distances,
            datasets: [
                {
                    label: '弾道',
                    data: heights,
                    borderColor: '#ff4444',
                    backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    yAxisID: 'y'
                },
                {
                    label: '速度 (m/s)',
                    data: velocities,
                    borderColor: '#4444ff',
                    backgroundColor: 'rgba(68, 68, 255, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    yAxisID: 'y1'
                },
                {
                    label: `エネルギー (${energyUnit})`,
                    data: energies,
                    borderColor: '#00aa00',
                    backgroundColor: 'rgba(0, 170, 0, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    yAxisID: 'y2'
                },
                {
                    label: '偏差 (mm)',
                    data: deviations,
                    borderColor: '#ff44ff',
                    backgroundColor: 'rgba(255, 68, 255, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    yAxisID: 'y3'
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
                title: {
                    display: true,
                    text: '弾道軌道'
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const index = context.dataIndex;
                            const point = trajectoryData[index];
                            const v = Math.sqrt(point.vx * point.vx + point.vy * point.vy);
                            const energy = 0.5 * mass * v * v;
                            const displayEnergy = useFootPounds ? energy * JOULES_TO_FTLBF : energy;
                            const deviation = (point.y - zeroInHeight) * M_TO_MM;
                            
                            return [
                                `時間: ${point.t.toFixed(2)}秒`,
                                `速度: ${v.toFixed(1)} m/s`,
                                `エネルギー: ${displayEnergy.toFixed(0)} ${energyUnit}`,
                                `偏差: ${deviation.toFixed(0)} mm`
                            ];
                        }
                    }
                },
                annotation: {
                    annotations: {}
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
        // Add vertical line
        chartInstance.options.plugins.annotation.annotations.subsonicLine = {
            type: 'line',
            xMin: subsonicDistance,
            xMax: subsonicDistance,
            borderColor: '#4444ff',
            borderWidth: 2,
            borderDash: [8, 4],
            xScaleID: 'x'
        };
        
        // Find the velocity at subsonic distance for box position
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
        
        // Add box label on velocity line
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
            yScaleID: 'y1',  // Velocity scale
            xScaleID: 'x'
        };
        chartInstance.update();
    }
}

function updateDistanceTable(trajectoryData, mass, zeroInHeight) {
    const markerDistances = [50, 100, 150, 200, 300];
    const tableBody = document.querySelector('#distanceTable tbody');
    tableBody.innerHTML = '';
    
    markerDistances.forEach(distance => {
        // Find the data point closest to this distance
        let closestPoint = null;
        let minDiff = Infinity;
        
        for (let i = 0; i < trajectoryData.length; i++) {
            const diff = Math.abs(trajectoryData[i].x - distance);
            if (diff < minDiff) {
                minDiff = diff;
                closestPoint = trajectoryData[i];
            }
        }
        
        if (closestPoint && closestPoint.x <= distance * 1.1) { // Allow 10% tolerance
            const velocity = Math.sqrt(closestPoint.vx * closestPoint.vx + closestPoint.vy * closestPoint.vy);
            const energy = 0.5 * mass * velocity * velocity;
            const displayEnergy = useFootPounds ? energy * JOULES_TO_FTLBF : energy;
            const energyUnit = useFootPounds ? 'ft-lbf' : 'J';
            const deviation = (closestPoint.y - zeroInHeight) * M_TO_MM;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${distance}m</td>
                <td>${closestPoint.y.toFixed(2)}m</td>
                <td>${velocity.toFixed(0)} m/s</td>
                <td>${displayEnergy.toFixed(0)} ${energyUnit}</td>
                <td>${deviation >= 0 ? '+' : ''}${deviation.toFixed(0)} mm</td>
            `;
            tableBody.appendChild(row);
        }
    });
}

function downloadCSV() {
    if (!currentTrajectoryData || !currentMass) return;
    
    let csv = 'Time (s),Distance (m),Height (m),Velocity X (m/s),Velocity Y (m/s),Total Velocity (m/s),Energy (J),Energy (ft-lbf)\n';
    
    currentTrajectoryData.forEach(point => {
        const totalVelocity = Math.sqrt(point.vx * point.vx + point.vy * point.vy);
        const energy = 0.5 * currentMass * totalVelocity * totalVelocity;
        const energyFtLbf = energy * JOULES_TO_FTLBF;
        
        csv += `${point.t.toFixed(3)},${point.x.toFixed(2)},${point.y.toFixed(3)},${point.vx.toFixed(2)},${point.vy.toFixed(2)},${totalVelocity.toFixed(2)},${energy.toFixed(1)},${energyFtLbf.toFixed(1)}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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
    
    // 気圧と温度の扱い
    // 入力された気圧は現在地（射撃地点）の実測気圧として扱う
    // 入力された温度も現在地の実測温度として扱う
    // 標高の影響は既に実測値に反映されているため、追加の補正は不要
    const currentPressure = pressure;
    const currentTemperature = temperature;
    
    // 飽和水蒸気圧の計算 (Magnus formula)
    const Es = 6.1078 * Math.pow(10, (7.5 * currentTemperature) / (currentTemperature + 237.3));
    
    // 実際の水蒸気圧
    const E = (humidity / 100) * Es;
    
    // 乾燥空気の分圧
    const Pd = (currentPressure - E) * 100; // hPa to Pa
    
    // 水蒸気の分圧
    const Pv = E * 100; // hPa to Pa
    
    // 絶対温度
    const T = currentTemperature + CELSIUS_TO_KELVIN;
    
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