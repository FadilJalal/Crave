import Joi from "joi";

/**
 * Generic Joi validation middleware factory.
 * @param {Joi.Schema} schema - Joi schema to validate req.body against
 */
export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((d) => d.message).join(", "),
    });
  }
  next();
};

// ── Reusable schemas ───────────────────────────────────────────────────────

export const schemas = {
  register: Joi.object({
    name:     Joi.string().min(2).max(80).required(),
    email:    Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  login: Joi.object({
    email:    Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  placeOrder: Joi.object({
    userId:    Joi.string().required(),
    items:     Joi.array().min(1).required(),
    amount:    Joi.number().positive().required(),
    address:   Joi.object().required(),
  }),

  createFood: Joi.object({
    name:        Joi.string().min(2).max(120).required(),
    description: Joi.string().max(500).required(),
    price:       Joi.number().positive().required(),
    category:    Joi.string().required(),
  }),

  createCoupon: Joi.object({
    code:    Joi.string().min(3).max(30).uppercase().required(),
    type:    Joi.string().valid("percent", "flat", "free-delivery").required(),
    value:   Joi.number().min(0).optional(),
  }),
};
