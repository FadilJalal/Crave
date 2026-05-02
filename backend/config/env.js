/**
 * Validated environment configuration.
 * Throws at startup if required variables are missing — fail fast, no surprises in production.
 */

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`❌ Missing required environment variable: ${key}`);
  return val;
};

const optional = (key, fallback = null) => process.env[key] || fallback;

export const config = {
  // Core
  port:        Number(optional("PORT", 4000)),
  nodeEnv:     optional("NODE_ENV", "development"),

  // Database
  mongoUrl:    required("MONGO_URL"),

  // Auth
  jwtSecret:   required("JWT_SECRET"),
  jwtRefreshSecret: optional("JWT_REFRESH_SECRET", null),

  // AI
  groqApiKey:       optional("GROQ_API_KEY"),
  groqMoodApiKey:   optional("GROQ_MOOD_API_KEY"),

  // Payments
  stripeSecret:     optional("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: optional("STRIPE_WEBHOOK_SECRET"),

  // Email
  resendApiKey:     optional("RESEND_API_KEY"),

  // Frontend
  frontendUrl:      optional("FRONTEND_URL", "http://localhost:5173"),
  allowedOrigins:   (optional("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:5175")).split(","),

  // Google OAuth
  googleClientId:   optional("GOOGLE_CLIENT_ID"),

  get isDev()  { return this.nodeEnv === "development"; },
  get isProd() { return this.nodeEnv === "production"; },
};
