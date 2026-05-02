import { calcDeliveryFee, applySharedFeeIfValid } from "../controllers/orderController.js";

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
});
