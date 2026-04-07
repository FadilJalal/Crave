import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { isRestaurantOpen } from "../utils/restaurantHours.js";

describe("isRestaurantOpen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("returns false when restaurant is inactive", () => {
    const result = isRestaurantOpen({ isActive: false });
    expect(result).toBe(false);
  });

  test("returns true for 24/7 day config", () => {
    jest.setSystemTime(Date.parse("2026-04-07T08:00:00.000Z"));
    const result = isRestaurantOpen({
      isActive: true,
      openingHours: {
        tuesday: { open: "00:00", close: "23:59", closed: false },
      },
    });
    expect(result).toBe(true);
  });

  test("supports overnight window from previous day", () => {
    // UTC Sunday 21:00 = Dubai Monday 01:00
    jest.setSystemTime(Date.parse("2026-04-05T21:00:00.000Z"));
    const result = isRestaurantOpen({
      isActive: true,
      openingHours: {
        sunday: { open: "20:00", close: "02:00", closed: false },
      },
    });
    expect(result).toBe(true);
  });

  test("returns false when current time is outside opening window", () => {
    // UTC Tuesday 04:00 = Dubai Tuesday 08:00
    jest.setSystemTime(Date.parse("2026-04-07T04:00:00.000Z"));
    const result = isRestaurantOpen({
      isActive: true,
      openingHours: {
        tuesday: { open: "12:00", close: "18:00", closed: false },
      },
    });
    expect(result).toBe(false);
  });
});
