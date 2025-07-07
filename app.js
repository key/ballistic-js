const calculator = new BallisticsCalculator();
let chart = null;
let currentTrajectoryData = null;
let currentMass = null;
let chartScales = null;

document.getElementById('calculate').addEventListener('click', calculate);
document.getElementById('downloadCSV').addEventListener('click', downloadCSV);

// Add event listeners for environment inputs
const envInputs = ['temperature', 'pressure', 'humidity', 'altitude'];
envInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', updateCalculatedValues);
});

// Add event listener for zero-in distance
document.getElementById('zeroDistance').addEventListener('change', calculateZeroAngle);

// Initial calculation of air density
updateCalculatedValues();

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

function getInputValues() {
    const airDensity = calculateAirDensity();
    
    return {
        velocity: parseFloat(document.getElementById('velocity').value) * 0.3048, // Convert fps to m/s
        angle: parseFloat(document.getElementById('angle').value),
        initialHeight: parseFloat(document.getElementById('initialHeight').value),
        scopeHeight: parseFloat(document.getElementById('scopeHeight').value) / 1000, // Convert mm to m
        mass: parseFloat(document.getElementById('mass').value) / 1000, // Convert grams to kg
        dragCoeff: parseFloat(document.getElementById('dragCoeff').value),
        diameter: parseFloat(document.getElementById('diameter').value) / 1000, // Convert mm to m
        airDensity: airDensity,
        windSpeed: parseFloat(document.getElementById('windSpeed').value),
        windAngle: parseFloat(document.getElementById('windAngle').value)
    };
}

function calculate() {
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
                <div class="result-value">${(withDrag.impactVelocity / 0.3048).toFixed(0)}</div>
                <div class="result-label">着弾速度 (fps)</div>
            </div>
            
            <div class="result-card">
                <div class="result-value">${energy.toFixed(0)}</div>
                <div class="result-label">初期エネルギー (J)</div>
            </div>
            
            <div class="result-card">
                <div class="result-value">${((withDrag.maxRange / noDrag.maxRange) * 100).toFixed(0)}%</div>
                <div class="result-label">射程効率</div>
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
            ctx.strokeStyle = '#44ff44';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(zeroX, margin);
            ctx.lineTo(zeroX, canvas.height - margin);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Add label
            ctx.fillStyle = '#44ff44';
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
    
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(canvas.width - 150, 20, 15, 15);
    ctx.fillStyle = '#333';
    ctx.fillText('空気抵抗あり', canvas.width - 130, 32);
    
    // Display velocity and energy at specific distances
    const distances = [50, 100, 150, 200, 300];
    ctx.fillStyle = '#333';
    ctx.font = '11px Arial';
    
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
            
            // Draw vertical line at this distance
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(px, margin);
            ctx.lineTo(px, canvas.height - margin);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw data box
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(px - 40, py - 55, 80, 58);
            
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(px - 40, py - 55, 80, 58);
            
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText(`${distance}m`, px, py - 43);
            ctx.fillText(`${closestPoint.y.toFixed(1)}m`, px, py - 30);
            ctx.fillText(`${velocityFps.toFixed(0)} fps`, px, py - 17);
            ctx.fillText(`${energy.toFixed(0)} J`, px, py - 4);
        }
    });
}

function calculateZeroAngle() {
    const zeroDistance = parseFloat(document.getElementById('zeroDistance').value);
    if (!zeroDistance) {
        return; // No zero distance selected
    }
    
    const scopeHeight = parseFloat(document.getElementById('scopeHeight').value) / 1000; // Convert mm to m
    const initialHeight = parseFloat(document.getElementById('initialHeight').value);
    const targetHeight = initialHeight + scopeHeight; // Target height where trajectory should cross at zero distance
    
    // Get current parameters
    const params = getInputValues();
    
    // Use binary search to find the angle that gives us the zero distance
    let lowAngle = -10;
    let highAngle = 10;
    let bestAngle = 0;
    let iterations = 0;
    const maxIterations = 50;
    const tolerance = 0.1; // 0.1m tolerance
    
    while (iterations < maxIterations && (highAngle - lowAngle) > 0.001) {
        const midAngle = (lowAngle + highAngle) / 2;
        
        // Calculate trajectory with this angle
        const testParams = {...params, angle: midAngle};
        const trajectory = calculator.calculateTrajectory(
            testParams.velocity,
            testParams.angle,
            testParams.initialHeight,
            testParams.mass,
            testParams.dragCoeff,
            testParams.diameter,
            testParams.airDensity,
            testParams.windSpeed,
            testParams.windAngle
        );
        
        // Find where trajectory crosses scope height line at the zero distance
        let crossingHeight = null;
        for (let i = 1; i < trajectory.length; i++) {
            if (trajectory[i].x >= zeroDistance) {
                // Interpolate to find exact height at zero distance
                const ratio = (zeroDistance - trajectory[i-1].x) / (trajectory[i].x - trajectory[i-1].x);
                crossingHeight = trajectory[i-1].y + ratio * (trajectory[i].y - trajectory[i-1].y);
                break;
            }
        }
        
        if (crossingHeight === null) {
            // Trajectory doesn't reach zero distance
            lowAngle = midAngle;
        } else {
            // Calculate the difference between the trajectory height and target height at zero distance
            const heightDiff = crossingHeight - targetHeight;
            
            if (Math.abs(heightDiff) < tolerance / 100) {
                bestAngle = midAngle;
                break;
            } else if (heightDiff > 0) {
                // Shooting too high, reduce angle
                highAngle = midAngle;
            } else {
                // Shooting too low, increase angle
                lowAngle = midAngle;
            }
            bestAngle = midAngle;
        }
        
        iterations++;
    }
    
    // Set the calculated angle
    document.getElementById('angle').value = bestAngle.toFixed(3);
    
    // Trigger recalculation
    calculate();
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
        const velocityFps = velocity / 0.3048;
        const energy = calculator.calculateEnergy(currentMass, velocity);
        
        tooltip.innerHTML = `
            距離: ${closestPoint.x.toFixed(1)}m<br>
            高度: ${closestPoint.y.toFixed(1)}m<br>
            速度: ${velocityFps.toFixed(0)} fps<br>
            エネルギー: ${energy.toFixed(0)} J
        `;
        
        tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
        tooltip.style.top = (e.clientY - rect.top - 40) + 'px';
        tooltip.style.display = 'block';
    } else {
        tooltip.style.display = 'none';
    }
});

canvas.addEventListener('mouseleave', function() {
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

calculate();