import { body } from 'express-validator';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';

export const createQuestionValidation = [
  body('title')
    .notEmpty()
    .withMessage('Question title is required')
    .isString()
    .withMessage('Question title must be a string')
    .isLength({ min: 5, max: 255 })
    .withMessage('Question title must be between 5 and 255 characters')
    .trim(),
  body('content')
    .notEmpty()
    .withMessage('Question content is required')
    .isString()
    .withMessage('Question content must be a string')
    .isLength({ min: 10 })
    .withMessage('Question content must be at least 10 characters')
    .trim(),
  validationErrorHandler,
];

/**
 * Validates query parameters for semantic question search.
 *
 * query: required, minimum 5 characters
 * k: optional integer between 1 and 20
 * threshold: optional float between 0 and 1
 */
export const searchQuestionsValidation = [
  queryParam('query')
    .exists()
    .withMessage('Search query is required')
    .bail()
    .isString()
    .withMessage('Search query must be a string')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Search query must be at least 5 characters'),

  queryParam('k')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('k must be an integer between 1 and 20')
    .toInt(),

  queryParam('threshold')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('threshold must be a number between 0 and 1')
    .toFloat(),

  validationErrorHandler,
];