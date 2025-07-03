class BallisticsCalculator {
    constructor() {
        this.g = 9.81; // gravity (m/s²)
        this.timeStep = 0.01; // time step for simulation (s)
    }

    calculateTrajectory(params) {
        const {
            velocity,
            angle,
            initialHeight = 0,
            mass,
            dragCoeff,
            diameter,
            airDensity,
            windSpeed = 0,
            windAngle = 0
        } = params;
        
        // Calculate area from diameter (diameter in m, area in m²)
        const area = Math.PI * Math.pow(diameter / 2, 2);

        const angleRad = angle * Math.PI / 180;
        const vx0 = velocity * Math.cos(angleRad);
        const vy0 = velocity * Math.sin(angleRad);
        
        // Convert wind angle to radians (0° = North, 90° = East, etc.)
        // For ballistics, we need: 0° = headwind, 90° = right crosswind
        const windAngleRad = (windAngle - 90) * Math.PI / 180;
        const windVx = windSpeed * Math.cos(windAngleRad);
        const windVy = 0; // Assume horizontal wind only

        const trajectory = [];
        let x = 0, y = initialHeight;
        let vx = vx0, vy = vy0;
        let t = 0;
        let maxHeight = 0;
        let maxRange = 0;

        while (y >= 0 || t === 0) {
            trajectory.push({ x, y, t, vx, vy });

            // Relative velocity considering wind
            const vRelX = vx - windVx;
            const vRelY = vy - windVy;
            const vRel = Math.sqrt(vRelX * vRelX + vRelY * vRelY);
            
            const dragForce = 0.5 * dragCoeff * airDensity * area * vRel * vRel;
            const dragAx = -(dragForce / mass) * (vRelX / vRel);
            const dragAy = -(dragForce / mass) * (vRelY / vRel);

            vx += dragAx * this.timeStep;
            vy += (dragAy - this.g) * this.timeStep;

            x += vx * this.timeStep;
            y += vy * this.timeStep;
            t += this.timeStep;

            if (y > maxHeight) maxHeight = y;
            if (y >= 0) maxRange = x;

            if (t > 1000) break; // Safety limit
        }

        const flightTime = t - this.timeStep;
        const impactVelocity = Math.sqrt(vx * vx + vy * vy);

        return {
            trajectory,
            maxHeight,
            maxRange,
            flightTime,
            impactVelocity
        };
    }

    calculateNoDrag(velocity, angle) {
        const angleRad = angle * Math.PI / 180;
        const vx = velocity * Math.cos(angleRad);
        const vy = velocity * Math.sin(angleRad);

        const flightTime = 2 * vy / this.g;
        const maxHeight = (vy * vy) / (2 * this.g);
        const maxRange = vx * flightTime;

        return {
            maxHeight,
            maxRange,
            flightTime
        };
    }

    calculateEnergy(mass, velocity) {
        return 0.5 * mass * velocity * velocity;
    }

    calculateMomentum(mass, velocity) {
        return mass * velocity;
    }
}