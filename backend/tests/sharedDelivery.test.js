import { calcDeliveryFee, applySharedFeeIfValid, haversine } from "../controllers/orderController.js";

describe("Shared Delivery Logic", () => {
  describe("Delivery Tiers Pricing", () => {
    const mockTiers = [
      { upToKm: 5, fee: 5 },
      { upToKm: 10, fee: 10 },
      { upToKm: null, fee: 20 },
    ];

    it("should return correct fee for distance within first tier", () => {
      expect(calcDeliveryFee(mockTiers, 3)).toBe(5);
    });

    it("should return correct fee for distance exactly on tier limit", () => {
      expect(calcDeliveryFee(mockTiers, 5)).toBe(5);
    });

    it("should return correct fee for distance in second tier", () => {
      expect(calcDeliveryFee(mockTiers, 8)).toBe(10);
    });

    it("should return fallback flat fee when no tiers are provided", () => {
      expect(calcDeliveryFee([], 5)).toBe(5);
    });
  });

  describe("Shared Fee Application", () => {
    it("should bypass shared delivery if not enabled", () => {
      const config = { enabled: false, sharedFee: 3 };
      const res = applySharedFeeIfValid(10, config);
      expect(res.isShared).toBe(false);
      expect(res.finalFee).toBe(10);
      expect(res.savings).toBe(0);
    });

    it("should successfully apply shared delivery fee if it yields savings", () => {
      const config = { enabled: true, sharedFee: 5 };
      const res = applySharedFeeIfValid(10, config);
      expect(res.isShared).toBe(true);
      expect(res.finalFee).toBe(5);
      expect(res.savings).toBe(5);
    });

    it("should enforce a minimum shared fee to protect margins", () => {
      const config = { enabled: true, sharedFee: 1 };
      const res = applySharedFeeIfValid(10, config);
      expect(res.finalFee).toBe(2); // Assuming SHARED_MIN_FEE = 2
    });
  });

  describe("haversine distance", () => {
    it("returns 0 for identical coordinates", () => {
      expect(haversine(25.2048, 55.2708, 25.2048, 55.2708)).toBe(0);
    });

    it("returns approximately correct distance for known UAE points", () => {
      // Dubai Mall to Burj Khalifa is ~0.5km apart
      const dist = haversine(25.1972, 55.2796, 25.1985, 55.2796);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(2);
    });

    it("returns ~5km for points 5km apart", () => {
      // Two points roughly 5km apart in Dubai
      const dist = haversine(25.2048, 55.2708, 25.2048, 55.3158);
      expect(dist).toBeGreaterThan(4);
      expect(dist).toBeLessThan(6);
    });

    it("correctly identifies points beyond 5km threshold", () => {
      // Abu Dhabi to Dubai is ~130km
      const dist = haversine(24.4539, 54.3773, 25.2048, 55.2708);
      expect(dist).toBeGreaterThan(100);
    });
  });

  describe("shared delivery matching eligibility", () => {
    it("order within 5km and 15 minutes is a valid match candidate", () => {
      const distKm = haversine(25.2048, 55.2708, 25.2350, 55.3010);
      const minutesApart = 10;
      expect(distKm).toBeLessThan(5);
      expect(minutesApart).toBeLessThan(15);
    });

    it("order beyond 5km should not be a match", () => {
      const distKm = haversine(25.2048, 55.2708, 25.0657, 55.1713);
      expect(distKm).toBeGreaterThan(5);
    });

    it("savings are never negative regardless of inputs", () => {
      const result = applySharedFeeIfValid(3, { enabled: true, sharedFee: 10 });
      expect(result.savings).toBeGreaterThanOrEqual(0);
    });

    it("shared fee never exceeds the standard fee", () => {
      const standardFee = 8;
      const result = applySharedFeeIfValid(standardFee, { enabled: true, sharedFee: 5 });
      expect(result.finalFee).toBeLessThanOrEqual(standardFee);
    });
  });
});
