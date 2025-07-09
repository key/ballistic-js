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
        bc: 0.400,  // Ballistic coefficient
        dragModel: 'G1',
        diameter: 0.0173, // 17.3mm in m
        airDensity: 1.225,
        soundSpeed: 340.3  // Standard speed of sound
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
        bc: 0.300,  // Ballistic coefficient
        dragModel: 'G1',
        diameter: 0.0113, // 11.3mm in m
        airDensity: 1.225,
        soundSpeed: 340.3  // Standard speed of sound
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

  describe('trajectory data structure', () => {
    it('should include velocity components in trajectory points', () => {
      const params = {
        velocity: 100,
        angle: 45,
        initialHeight: 0,
        mass: 0.01,
        bc: 0.300,  // Ballistic coefficient
        dragModel: 'G1',
        diameter: 0.0113, // 11.3mm in m
        airDensity: 1.225,
        soundSpeed: 340.3  // Standard speed of sound
      };

      const result = calculator.calculateTrajectory(params);
      const firstPoint = result.trajectory[0];

      expect(firstPoint).toHaveProperty('x');
      expect(firstPoint).toHaveProperty('y');
      expect(firstPoint).toHaveProperty('t');
      expect(firstPoint).toHaveProperty('vx');
      expect(firstPoint).toHaveProperty('vy');
      expect(firstPoint.x).toBe(0);
      expect(firstPoint.y).toBe(0);
      expect(firstPoint.t).toBe(0);
    });

    it('should calculate decreasing velocity due to drag', () => {
      const params = {
        velocity: 300,
        angle: 30,
        initialHeight: 0,
        mass: 0.032,
        bc: 0.400,  // Ballistic coefficient
        dragModel: 'G1',
        diameter: 0.0173, // 17.3mm in m
        airDensity: 1.225,
        soundSpeed: 340.3  // Standard speed of sound
      };

      const result = calculator.calculateTrajectory(params);
      const trajectory = result.trajectory;
      
      // Check that velocity decreases over time
      const initialVelocity = Math.sqrt(trajectory[0].vx ** 2 + trajectory[0].vy ** 2);
      const midVelocity = Math.sqrt(trajectory[Math.floor(trajectory.length/2)].vx ** 2 + 
                                    trajectory[Math.floor(trajectory.length/2)].vy ** 2);
      
      expect(midVelocity).toBeLessThan(initialVelocity);
    });
  });

  describe('edge cases', () => {
    it('should handle very high drag coefficient', () => {
      const params = {
        velocity: 100,
        angle: 45,
        initialHeight: 0,
        mass: 0.01,
        bc: 0.01,  // Extremely low BC (very high drag)
        dragModel: 'G1',
        diameter: 0.0357, // 35.7mm in m
        airDensity: 1.225,
        soundSpeed: 340.3  // Standard speed of sound
      };

      const result = calculator.calculateTrajectory(params);
      
      expect(result.trajectory).toBeDefined();
      expect(result.maxRange).toBeLessThan(200); // Should have shorter range due to high drag
      // With BC=0.01 and v=100m/s, the drag is significant but still allows ~154m range
    });

    it('should handle 90 degree angle', () => {
      const params = {
        velocity: 100,
        angle: 90,
        initialHeight: 0,
        mass: 0.01,
        bc: 0.300,  // Ballistic coefficient
        dragModel: 'G1',
        diameter: 0.0113, // 11.3mm in m
        airDensity: 1.225,
        soundSpeed: 340.3  // Standard speed of sound
      };

      const result = calculator.calculateTrajectory(params);
      
      expect(result.trajectory).toBeDefined();
      expect(result.maxRange).toBeCloseTo(0, 1); // Should fall straight down
      expect(result.trajectory[0].vx).toBeCloseTo(0, 5); // Horizontal velocity should be ~0
    });
  });
});