const BallisticsCalculator = require('./ballistics.node');

describe('BallisticsCalculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new BallisticsCalculator();
  });

  describe('calculateTrajectory', () => {
    it('should calculate trajectory with initial height', () => {
      const params = {
        velocity: 411.48, // 1350 fps in m/s
        angle: 6,
        initialHeight: 1.6,
        mass: 0.032, // 32g in kg
        dragCoeff: 0.47,
        area: 0.000235, // 235mm² in m²
        airDensity: 1.225
      };

      const result = calculator.calculateTrajectory(params);

      expect(result.trajectory).toBeDefined();
      expect(result.trajectory.length).toBeGreaterThan(0);
      expect(result.trajectory[0].y).toBe(1.6);
      expect(result.maxHeight).toBeGreaterThan(1.6);
      expect(result.maxRange).toBeGreaterThan(0);
      expect(result.flightTime).toBeGreaterThan(0);
      expect(result.impactVelocity).toBeGreaterThan(0);
    });

    it('should handle zero angle', () => {
      const params = {
        velocity: 300,
        angle: 0,
        initialHeight: 2,
        mass: 0.01,
        dragCoeff: 0.47,
        area: 0.0001,
        airDensity: 1.225
      };

      const result = calculator.calculateTrajectory(params);

      expect(result.trajectory).toBeDefined();
      expect(result.maxHeight).toBeCloseTo(2, 2);
    });
  });

  describe('calculateEnergy', () => {
    it('should calculate kinetic energy correctly', () => {
      const mass = 0.032; // 32g
      const velocity = 411.48; // 1350 fps
      
      const energy = calculator.calculateEnergy(mass, velocity);
      
      expect(energy).toBeCloseTo(2709.05, 1);
    });
  });

  describe('calculateMomentum', () => {
    it('should calculate momentum correctly', () => {
      const mass = 0.032;
      const velocity = 411.48;
      
      const momentum = calculator.calculateMomentum(mass, velocity);
      
      expect(momentum).toBeCloseTo(13.167, 3);
    });
  });

  describe('calculateNoDrag', () => {
    it('should calculate ideal trajectory without drag', () => {
      const velocity = 300;
      const angle = 45;
      
      const result = calculator.calculateNoDrag(velocity, angle);
      
      expect(result.maxHeight).toBeCloseTo(2293.58, 1);
      expect(result.maxRange).toBeCloseTo(9174.31, 1);
      expect(result.flightTime).toBeCloseTo(43.248, 2);
    });
  });
});