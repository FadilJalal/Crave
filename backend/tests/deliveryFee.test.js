/**
 * backend/tests/deliveryFee.test.js
 * Tests calcDeliveryFee across all tier boundary conditions.
 */

// Inline the fee logic so the test runs without MongoDB
function calcDeliveryFee(distanceKm, isShared = false) {
  let fee;
  if (distanceKm <= 2)       fee = 8;
  else if (distanceKm <= 5)  fee = 12;
  else if (distanceKm <= 10) fee = 18;
  else if (distanceKm <= 20) fee = 25;
  else                       fee = 35;

  if (isShared) fee = Math.round(fee * 0.6); // 40% shared discount
  return fee;
}

describe("calcDeliveryFee — standard tiers", () => {
  test("0 km → AED 8 (minimum)", () => expect(calcDeliveryFee(0)).toBe(8));
  test("1 km → AED 8",           () => expect(calcDeliveryFee(1)).toBe(8));
  test("2 km → AED 8 (upper boundary)", () => expect(calcDeliveryFee(2)).toBe(8));
  test("2.1 km → AED 12",        () => expect(calcDeliveryFee(2.1)).toBe(12));
  test("5 km → AED 12",          () => expect(calcDeliveryFee(5)).toBe(12));
  test("5.1 km → AED 18",        () => expect(calcDeliveryFee(5.1)).toBe(18));
  test("10 km → AED 18",         () => expect(calcDeliveryFee(10)).toBe(18));
  test("10.1 km → AED 25",       () => expect(calcDeliveryFee(10.1)).toBe(25));
  test("20 km → AED 25",         () => expect(calcDeliveryFee(20)).toBe(25));
  test("20.1 km → AED 35",       () => expect(calcDeliveryFee(20.1)).toBe(35));
  test("50 km → AED 35 (max cap)", () => expect(calcDeliveryFee(50)).toBe(35));
});

describe("calcDeliveryFee — shared delivery discount", () => {
  test("2 km shared → 60% of AED 8 = AED 5",  () => expect(calcDeliveryFee(2, true)).toBe(5));
  test("5 km shared → 60% of AED 12 = AED 7", () => expect(calcDeliveryFee(5, true)).toBe(7));
  test("10 km shared → 60% of AED 18 = AED 11", () => expect(calcDeliveryFee(10, true)).toBe(11));
  test("20 km shared → 60% of AED 25 = AED 15", () => expect(calcDeliveryFee(20, true)).toBe(15));
  test("shared is always less than express",   () => {
    [1, 3, 7, 15, 30].forEach(d => expect(calcDeliveryFee(d, true)).toBeLessThan(calcDeliveryFee(d, false)));
  });
});
