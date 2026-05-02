/**
 * backend/tests/auth.test.js
 * Tests JWT generation, verification, expiry, and auth middleware.
 */

import jwt from "jsonwebtoken";
import { jest } from "@jest/globals";

const SECRET = "test_secret_key_ci";
process.env.JWT_SECRET = SECRET;

// ── Helper ────────────────────────────────────────────────────────────────────
function createToken(payload, expiresIn = "1h") {
  return jwt.sign(payload, SECRET, { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("JWT — Token generation", () => {
  test("creates a token with correct userId payload", () => {
    const token = createToken({ id: "user123" });
    const decoded = verifyToken(token);
    expect(decoded.id).toBe("user123");
  });

  test("token contains iat and exp fields", () => {
    const token = createToken({ id: "user123" });
    const decoded = verifyToken(token);
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  test("exp is in the future", () => {
    const token = createToken({ id: "user123" });
    const decoded = verifyToken(token);
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

describe("JWT — Token verification", () => {
  test("verifies a valid token successfully", () => {
    const token = createToken({ id: "abc" });
    expect(() => verifyToken(token)).not.toThrow();
  });

  test("throws on tampered token", () => {
    const token = createToken({ id: "abc" }) + "tampered";
    expect(() => verifyToken(token)).toThrow();
  });

  test("throws on wrong secret", () => {
    const token = jwt.sign({ id: "abc" }, "wrong_secret");
    expect(() => verifyToken(token)).toThrow();
  });

  test("throws on expired token", () => {
    const token = createToken({ id: "abc" }, "-1s");
    expect(() => verifyToken(token)).toThrow(/expired/);
  });

  test("returns correct payload on valid token", () => {
    const token = createToken({ id: "xyz", role: "restaurant" });
    const decoded = verifyToken(token);
    expect(decoded.id).toBe("xyz");
    expect(decoded.role).toBe("restaurant");
  });
});

describe("JWT — Auth middleware simulation", () => {
  function mockAuthMiddleware(req, res, next) {
    const token = req.headers.token;
    if (!token) {
      return res.status(401).json({ success: false, message: "Not Authorized" });
    }
    try {
      const decoded = jwt.verify(token, SECRET);
      req.userId = decoded.id;
      next();
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  }

  function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  test("calls next() with valid token", () => {
    const token = createToken({ id: "user42" });
    const req = { headers: { token } };
    const res = mockRes();
    const next = jest.fn();
    mockAuthMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe("user42");
  });

  test("returns 401 with no token", () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    mockAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 401 with expired token", () => {
    const token = createToken({ id: "abc" }, "-1s");
    const req = { headers: { token } };
    const res = mockRes();
    const next = jest.fn();
    mockAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
