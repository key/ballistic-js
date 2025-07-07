class BallisticsCalculator {
    constructor() {
        this.g = 9.81; // gravity (m/s²)
        this.timeStep = 0.001; // time step for simulation (s) - 1ms for better precision
        this.maxSimTime = 1000; // Maximum simulation time (s)
    }

    calculateTrajectory(params) {
        const {
            velocity,
            angle,
            initialHeight = 0,
            mass,
            dragCoeff,
            diameter,
            airDensity
        } = params;
        
        // Calculate area from diameter (diameter in m, area in m²)
        const area = Math.PI * Math.pow(diameter / 2, 2);

        const angleRad = angle * Math.PI / 180;
        const vx0 = velocity * Math.cos(angleRad);
        const vy0 = velocity * Math.sin(angleRad);

        const trajectory = [];
        let x = 0, y = initialHeight;
        let vx = vx0, vy = vy0;
        let t = 0;
        let maxHeight = 0;
        let maxRange = 0;

        while (y >= 0 || t === 0) {
            trajectory.push({ x, y, t, vx, vy });

            const v = Math.sqrt(vx * vx + vy * vy);
            const dragForce = 0.5 * dragCoeff * airDensity * area * v * v;
            const dragAx = -(dragForce / mass) * (vx / v);
            const dragAy = -(dragForce / mass) * (vy / v);

            vx += dragAx * this.timeStep;
            vy += (dragAy - this.g) * this.timeStep;

            x += vx * this.timeStep;
            y += vy * this.timeStep;
            t += this.timeStep;

            if (y > maxHeight) maxHeight = y;
            if (y >= 0) maxRange = x;

            if (t > this.maxSimTime) break; // Safety limit
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

module.exports = BallisticsCalculator;