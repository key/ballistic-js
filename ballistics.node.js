// Import drag function calculator
const { DragFunctionCalculator } = require('./dragFunctions.js');

class BallisticsCalculator {
    constructor() {
        this.g = 9.81; // gravity (m/s²)
        this.timeStep = 0.001; // time step for simulation (s) - 1ms for better precision
        this.maxSimTime = 1000; // Maximum simulation time (s)
        
        // Ballistic constants
        this.BC_CONSTANT = 7503; // Standard constant for BC calculations
        this.FPS_TO_MPS = 0.3048; // Feet per second to meters per second
        this.STANDARD_AIR_DENSITY = 1.225; // Standard air density at sea level (kg/m³)
        
        this.dragCalculator = new DragFunctionCalculator();
        // Bind interpolateDragCoefficient method for direct access
        this.interpolateDragCoefficient = this.dragCalculator.interpolateDragCoefficient.bind(this.dragCalculator);
    }

    calculateTrajectory(params) {
        const {
            velocity,
            angle,
            initialHeight = 0,
            mass,
            bc,  // Ballistic coefficient
            dragModel = 'G1',  // Drag model (G1-G8)
            diameter,
            airDensity,
            soundSpeed,  // Speed of sound for Mach number calculation
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
            
            // Get drag function value based on current velocity
            const machNumber = vRel / soundSpeed;
            const dragFunction = this.interpolateDragCoefficient(machNumber, dragModel);
            
            // BC system: deceleration = 41.43 × (dragFunction / BC) × (ρ/ρ₀) × v²
            // Standard BC formula uses velocity in fps and returns deceleration in ft/s²
            const vFps = vRel / this.FPS_TO_MPS; // Convert m/s to fps
            const rhoRatio = airDensity / this.STANDARD_AIR_DENSITY; // Air density ratio
            
            // Calculate deceleration in ft/s² using standard BC formula
            // Standard formula: a = (ρ/ρ₀) × (i/BC) × (v²/BC_CONSTANT)
            const dragDecelFps2 = (dragFunction / bc) * rhoRatio * (vFps * vFps) / this.BC_CONSTANT;
            // Convert to m/s²
            const dragDecel = dragDecelFps2 * this.FPS_TO_MPS;
            const dragAx = -dragDecel * (vRelX / vRel);
            const dragAy = -dragDecel * (vRelY / vRel);

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