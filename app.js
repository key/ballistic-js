const calculator = new BallisticsCalculator();
let chart = null;
let currentTrajectoryData = null;
let currentMass = null;
let chartScales = null;

document.getElementById('calculate').addEventListener('click', calculate);
document.getElementById('downloadCSV').addEventListener('click', downloadCSV);

function getInputValues() {
    return {
        velocity: parseFloat(document.getElementById('velocity').value) * 0.3048, // Convert fps to m/s
        angle: parseFloat(document.getElementById('angle').value),
        initialHeight: parseFloat(document.getElementById('initialHeight').value),
        mass: parseFloat(document.getElementById('mass').value) / 1000, // Convert grams to kg
        dragCoeff: parseFloat(document.getElementById('dragCoeff').value),
        area: parseFloat(document.getElementById('area').value) / 1000000, // Convert mm² to m²
        airDensity: parseFloat(document.getElementById('airDensity').value)
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
        <div class="result-item">
            <h3>空気抵抗あり</h3>
            <p><strong>最大高度:</strong> ${withDrag.maxHeight.toFixed(2)} m</p>
            <p><strong>最大射程:</strong> ${withDrag.maxRange.toFixed(2)} m</p>
            <p><strong>飛行時間:</strong> ${withDrag.flightTime.toFixed(2)} s</p>
            <p><strong>着弾速度:</strong> ${withDrag.impactVelocity.toFixed(2)} m/s</p>
        </div>
        
        <div class="result-item">
            <h3>初期条件</h3>
            <p><strong>運動エネルギー:</strong> ${energy.toFixed(2)} J</p>
            <p><strong>運動量:</strong> ${momentum.toFixed(4)} kg·m/s</p>
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
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, canvas.height - margin);
    ctx.lineTo(canvas.width - margin, canvas.height - margin);
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
            
            const px = margin + closestPoint.x * scaleX;
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
            ctx.fillRect(px - 40, py - 40, 80, 35);
            
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(px - 40, py - 40, 80, 35);
            
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText(`${distance}m`, px, py - 28);
            ctx.fillText(`${velocityFps.toFixed(0)} fps`, px, py - 15);
            ctx.fillText(`${energy.toFixed(0)} J`, px, py - 2);
        }
    });
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

calculate();