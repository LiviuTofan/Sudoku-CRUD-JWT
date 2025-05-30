import Joi from 'joi';

/**
 * Validation schemas
 */
export const schemas = {
  // Token request validation
  tokenRequest: Joi.object({
    role: Joi.string().valid('ADMIN', 'USER', 'VISITOR').default('USER'),
    permissions: Joi.array().items(Joi.string().valid('READ', 'WRITE', 'DELETE')).default(['READ'])
  }),

  // Puzzle creation validation
  createPuzzle: Joi.object({
    difficulty: Joi.string().valid('easy', 'medium', 'hard').required(),
    title: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional()
  }),

  // Puzzle update validation
  updatePuzzle: Joi.object({
    difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
    title: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional(),
    puzzle: Joi.array().length(9).items(
      Joi.array().length(9).items(Joi.number().integer().min(0).max(9))
    ).optional(),
    solution: Joi.array().length(9).items(
      Joi.array().length(9).items(Joi.number().integer().min(1).max(9))
    ).optional()
  }),

  // Puzzle validation request
  validateMove: Joi.object({
    row: Joi.number().integer().min(0).max(8).required(),
    col: Joi.number().integer().min(0).max(8).required(),
    value: Joi.number().integer().min(1).max(9).required(),
    currentBoard: Joi.array().length(9).items(
      Joi.array().length(9).items(Joi.number().integer().min(0).max(9))
    ).required()
  }),

  // Pagination validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
    sortBy: Joi.string().valid('createdAt', 'difficulty', 'title').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Validation middleware factory
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: errorMessage,
        details: error.details
      });
    }

    // Replace the request property with the validated value
    req[property] = value;
    next();
  };
};