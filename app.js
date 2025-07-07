const calculator = new BallisticsCalculator();
let chart = null;
let currentTrajectoryData = null;
let currentMass = null;
let chartScales = null;

// Unit conversion states
let useGrains = false;  // Mass: false = grams, true = grains
let useMetersPerSec = false;  // Velocity: false = fps, true = m/s
let useFootPounds = false;  // Energy: false = joules, true = ft-lbs

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
        massInput.value = (defaultMassValue * 15.4324).toFixed(1);
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
        velocityInput.value = (defaultVelocityValue * 0.3048).toFixed(1);
        velocityInput.step = "1";
    } else {
        // Default is fps
        velocityInput.value = defaultVelocityValue;
    }
    
    // Load energy unit preference
    if (energyUnit === 'ftlbs') {
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
            // Convert grams to grains (1 gram = 15.4324 grains)
            massInput.value = (parseFloat(massInput.value) * 15.4324).toFixed(1);
            massInput.step = "1";
            massUnit.textContent = "gr";
            setCookie('massUnit', 'grains', 365);
        } else {
            // Convert grains to grams
            massInput.value = (parseFloat(massInput.value) / 15.4324).toFixed(1);
            massInput.step = "0.1";
            massUnit.textContent = "g";
            setCookie('massUnit', 'grams', 365);
        }
    });

    document.getElementById('velocityUnitToggle').addEventListener('change', function(e) {
        useMetersPerSec = e.target.checked;
        const velocityInput = document.getElementById('velocity');
        const velocityUnit = document.getElementById('velocityUnit');
        
        if (useMetersPerSec) {
            // Convert fps to m/s (1 fps = 0.3048 m/s)
            velocityInput.value = (parseFloat(velocityInput.value) * 0.3048).toFixed(1);
            velocityInput.step = "1";
            velocityUnit.textContent = "m/s";
            setCookie('velocityUnit', 'mps', 365);
        } else {
            // Convert m/s to fps
            velocityInput.value = (parseFloat(velocityInput.value) / 0.3048).toFixed(0);
            velocityInput.step = "10";
            velocityUnit.textContent = "fps";
            setCookie('velocityUnit', 'fps', 365);
        }
    });

    document.getElementById('energyUnitToggle').addEventListener('change', function(e) {
        useFootPounds = e.target.checked;
        setCookie('energyUnit', useFootPounds ? 'ftlbs' : 'joules', 365);
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
        massValue = (massValue / 15.4324) / 1000;
    } else {
        // Convert grams to kg
        massValue = massValue / 1000;
    }
    
    // Get velocity in m/s
    let velocityValue = parseFloat(document.getElementById('velocity').value);
    if (!useMetersPerSec) {
        // Convert fps to m/s
        velocityValue = velocityValue * 0.3048;
    }
    
    return {
        velocity: velocityValue,
        angle: parseFloat(document.getElementById('angle').value),
        initialHeight: parseFloat(document.getElementById('initialHeight').value),
        scopeHeight: parseFloat(document.getElementById('scopeHeight').value) / 1000, // Convert mm to m
        mass: massValue,
        dragCoeff: parseFloat(document.getElementById('dragCoeff').value),
        diameter: parseFloat(document.getElementById('diameter').value) / 1000, // Convert mm to m
        airDensity: airDensity,
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
        // Convert joules to foot-pounds (1 J = 0.737562 ft-lbs)
        energyValue = energy * 0.737562;
        energyUnit = 'ft-lbs';
    }
    
    // Convert impact velocity if needed
    let impactVelocityValue = withDrag.impactVelocity;
    let velocityUnit = 'm/s';
    if (!useMetersPerSec) {
        // Convert m/s to fps
        impactVelocityValue = withDrag.impactVelocity / 0.3048;
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
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const margin = 40;
    const plotWidth = canvas.width - 2 * margin;
    const plotHeight = canvas.height - 2 * margin;
    
    const maxX = Math.max(...trajectoryData.map(p => p.x)) * 1.1;
    const maxY = Math.max(...trajectoryData.map(p => p.y)) * 1.1;
    
    const scaleX = plotWidth / maxX;
    const scaleY = plotHeight / maxY;
    
    // Store scales for mouse hover
    chartScales = {
        margin,
        scaleX,
        scaleY,
        maxX,
        maxY
    };
    
    // Draw horizontal grid lines (distance) - 25m dashed, 50m solid
    ctx.lineWidth = 1;
    for (let distance = 0; distance <= maxX; distance += 25) {
        const x = margin + distance * scaleX;
        
        if (x > margin && x < canvas.width - margin) {
            ctx.strokeStyle = '#ddd';
            if (distance % 50 === 0) {
                // Solid line for 50m intervals
                ctx.setLineDash([]);
            } else {
                // Dashed line for 25m intervals
                ctx.setLineDash([5, 5]);
            }
            
            ctx.beginPath();
            ctx.moveTo(x, margin);
            ctx.lineTo(x, canvas.height - margin);
            ctx.stroke();
        }
    }
    ctx.setLineDash([]);
    
    // Draw vertical grid lines (height) - every 5m
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let height = 0; height <= maxY; height += 5) {
        const y = canvas.height - margin - height * scaleY;
        
        if (y > margin && y < canvas.height - margin) {
            ctx.beginPath();
            ctx.moveTo(margin, y);
            ctx.lineTo(canvas.width - margin, y);
            ctx.stroke();
        }
    }
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // Draw horizontal axis (x-axis)
    ctx.beginPath();
    ctx.moveTo(margin, canvas.height - margin);
    ctx.lineTo(canvas.width - margin, canvas.height - margin);
    ctx.stroke();
    
    // Draw vertical axis (y-axis)
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, canvas.height - margin);
    ctx.stroke();
    
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trajectoryData.forEach((point, index) => {
        const x = margin + point.x * scaleX;
        const y = canvas.height - margin - point.y * scaleY;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // Draw scope height line
    const initialHeight = parseFloat(document.getElementById('initialHeight').value);
    const scopeHeight = parseFloat(document.getElementById('scopeHeight').value) / 1000; // Convert mm to m
    const totalScopeHeight = initialHeight + scopeHeight;
    
    ctx.strokeStyle = '#4444ff';
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 5]); // Dashed line
    ctx.beginPath();
    const scopeY = canvas.height - margin - totalScopeHeight * scaleY;
    ctx.moveTo(margin, scopeY);
    ctx.lineTo(canvas.width - margin, scopeY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset to solid line
    
    // Add label for scope height
    ctx.fillStyle = '#4444ff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`スコープハイト: ${totalScopeHeight.toFixed(3)}m`, margin + 5, scopeY - 5);
    
    // Draw zero-in distance marker if selected
    const zeroDistance = parseFloat(document.getElementById('zeroDistance').value);
    if (zeroDistance) {
        const zeroX = margin + zeroDistance * scaleX;
        if (zeroX <= canvas.width - margin) {
            ctx.strokeStyle = '#00aa00';  // Darker green
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(zeroX, margin);
            ctx.lineTo(zeroX, canvas.height - margin);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Add label
            ctx.fillStyle = '#00aa00';  // Darker green
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`ゼロイン: ${zeroDistance}m`, zeroX, margin - 5);
        }
    }
    
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // X-axis labels (distance) - every 50m
    for (let distance = 0; distance <= maxX; distance += 50) {
        const x = margin + distance * scaleX;
        if (x >= margin && x <= canvas.width - margin) {
            ctx.fillText(distance + 'm', x, canvas.height - margin + 20);
        }
    }
    
    // Y-axis labels (height) - every 5m
    ctx.textAlign = 'right';
    for (let height = 0; height <= maxY; height += 5) {
        const y = canvas.height - margin - height * scaleY;
        if (y >= margin && y <= canvas.height - margin) {
            ctx.fillText(height + 'm', margin - 5, y + 5);
        }
    }
    
    ctx.save();
    ctx.translate(margin - 30, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('高度 (m)', 0, 0);
    ctx.restore();
    
    ctx.textAlign = 'left';
    ctx.fillText('距離 (m)', canvas.width / 2 - 30, canvas.height - 10);
    
    // Store distance marker data for mouse interaction
    const distanceMarkers = [];
    const distances = [50, 100, 150, 200, 300];
    
    distances.forEach(distance => {
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
        
        if (closestPoint && closestPoint.x <= maxX) {
            const velocity = Math.sqrt(closestPoint.vx * closestPoint.vx + closestPoint.vy * closestPoint.vy);
            const velocityFps = velocity / 0.3048; // Convert m/s to fps
            const energy = calculator.calculateEnergy(mass, velocity);
            
            // Use exact distance for x position to align with grid lines
            const px = margin + distance * scaleX;
            const py = canvas.height - margin - closestPoint.y * scaleY;
            
            // Store marker data for interaction
            distanceMarkers.push({
                distance: distance,
                x: px,
                y: py,
                height: closestPoint.y,
                velocityFps: velocityFps,
                energy: energy,
                energyInJoules: energy,  // Always store in joules for conversion
                scopeHeight: totalScopeHeight  // Store scope height for zero deviation calculation
            });
            
            // Draw small circle marker
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
    
    // Store markers for mouse/touch interaction
    chartScales.distanceMarkers = distanceMarkers;
}

function calculateZeroAngle() {
    const zeroDistance = parseFloat(document.getElementById('zeroDistance').value);
    if (!zeroDistance) {
        return; // No zero distance selected
    }
    
    const scopeHeight = parseFloat(document.getElementById('scopeHeight').value) / 1000; // Convert mm to m
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
            const velocityFps = velocity / 0.3048;
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

// Mouse hover functionality
const canvas = document.getElementById('trajectoryChart');
const tooltip = document.getElementById('tooltip');

canvas.addEventListener('mousemove', function(e) {
    if (!currentTrajectoryData || !chartScales || !currentMass) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if near a distance marker first
    if (chartScales.distanceMarkers) {
        for (let marker of chartScales.distanceMarkers) {
            const markerDist = Math.sqrt(Math.pow(mouseX - marker.x, 2) + Math.pow(mouseY - marker.y, 2));
            if (markerDist < 15) { // Within 15 pixels of marker
                // Convert energy if needed
                let energyValue = marker.energyInJoules;
                let energyUnit = 'J';
                if (useFootPounds) {
                    energyValue = marker.energyInJoules * 0.737562;
                    energyUnit = 'ft-lbs';
                }
                
                // Convert velocity if needed
                let velocityValue = marker.velocityFps;
                let velocityUnit = 'fps';
                if (useMetersPerSec) {
                    velocityValue = marker.velocityFps * 0.3048;
                    velocityUnit = 'm/s';
                }
                
                // Calculate zero deviation in mm
                const zeroDeviation = (marker.height - marker.scopeHeight) * 1000; // Convert m to mm
                const deviationSign = zeroDeviation >= 0 ? '+' : '';
                
                tooltip.innerHTML = `
                    <strong>${marker.distance}m</strong><br>
                    高度: ${marker.height.toFixed(1)}m<br>
                    ゼロ偏差: ${deviationSign}${zeroDeviation.toFixed(0)}mm<br>
                    速度: ${velocityValue.toFixed(useMetersPerSec ? 1 : 0)} ${velocityUnit}<br>
                    エネルギー: ${energyValue.toFixed(0)} ${energyUnit}
                `;
                
                tooltip.className = 'tooltip marker-tooltip';
                tooltip.style.left = (mouseX + 10) + 'px';
                tooltip.style.top = (mouseY - 60) + 'px';
                tooltip.style.display = 'block';
                return;
            }
        }
    }
    
    // Convert mouse position to chart coordinates
    const chartX = (mouseX - chartScales.margin) / chartScales.scaleX;
    const chartY = (canvas.height - mouseY - chartScales.margin) / chartScales.scaleY;
    
    // Find closest trajectory point
    let closestPoint = null;
    let minDistance = Infinity;
    
    for (let point of currentTrajectoryData) {
        const distance = Math.sqrt(Math.pow(point.x - chartX, 2) + Math.pow(point.y - chartY, 2));
        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
        }
    }
    
    // Show tooltip if close enough to trajectory
    if (closestPoint && minDistance < 10) {
        const velocity = Math.sqrt(closestPoint.vx * closestPoint.vx + closestPoint.vy * closestPoint.vy);
        const energy = calculator.calculateEnergy(currentMass, velocity);
        
        // Convert velocity if needed
        let velocityValue = velocity;
        let velocityUnit = 'm/s';
        if (!useMetersPerSec) {
            velocityValue = velocity / 0.3048;
            velocityUnit = 'fps';
        }
        
        // Convert energy if needed
        let energyValue = energy;
        let energyUnit = 'J';
        if (useFootPounds) {
            energyValue = energy * 0.737562;
            energyUnit = 'ft-lbs';
        }
        
        tooltip.innerHTML = `
            距離: ${closestPoint.x.toFixed(1)}m<br>
            高度: ${closestPoint.y.toFixed(1)}m<br>
            速度: ${velocityValue.toFixed(useMetersPerSec ? 1 : 0)} ${velocityUnit}<br>
            エネルギー: ${energyValue.toFixed(0)} ${energyUnit}
        `;
        
        tooltip.className = 'tooltip';
        tooltip.style.left = (mouseX + 10) + 'px';
        tooltip.style.top = (mouseY - 40) + 'px';
        tooltip.style.display = 'block';
    } else {
        tooltip.style.display = 'none';
    }
});

canvas.addEventListener('mouseleave', function() {
    tooltip.style.display = 'none';
});

// Touch support for mobile devices
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchend', function() {
    tooltip.style.display = 'none';
});

function calculateAirDensity() {
    const temperature = parseFloat(document.getElementById('temperature').value);
    const pressure = parseFloat(document.getElementById('pressure').value);
    const humidity = parseFloat(document.getElementById('humidity').value);
    const altitude = parseFloat(document.getElementById('altitude').value);
    
    // 標高による気圧補正
    const seaLevelPressure = pressure * Math.pow(1 - 0.0065 * altitude / 288.15, -5.255);
    
    // 飽和水蒸気圧の計算 (Magnus formula)
    const Es = 6.1078 * Math.pow(10, (7.5 * temperature) / (temperature + 237.3));
    
    // 実際の水蒸気圧
    const E = (humidity / 100) * Es;
    
    // 乾燥空気の分圧
    const Pd = (seaLevelPressure - E) * 100; // hPa to Pa
    
    // 水蒸気の分圧
    const Pv = E * 100; // hPa to Pa
    
    // 絶対温度
    const T = temperature + 273.15;
    
    // 空気密度の計算
    // ρ = (Pd * Md + Pv * Mv) / (R * T)
    // Md = 28.9644 g/mol (乾燥空気のモル質量)
    // Mv = 18.01528 g/mol (水蒸気のモル質量)
    // R = 8.314462618 J/(mol·K) (気体定数)
    const R = 8.314462618;
    const Md = 0.0289644; // kg/mol
    const Mv = 0.01801528; // kg/mol
    
    const airDensity = (Pd * Md + Pv * Mv) / (R * T);
    
    return airDensity;
}

function calculateSoundSpeed(temperature) {
    // 音速 = 331.5 + 0.6 * temperature (m/s)
    return 331.5 + 0.6 * temperature;
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