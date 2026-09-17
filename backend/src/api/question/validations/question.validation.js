import { body, query } from 'express-validator';
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
 * Validates optional query parameters for listing questions.
 * - search: optional string
 * - mine: optional boolean string ('true' | 'false' | '1' | '0')
 */
export const getQuestionsValidation = [
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string')
    .trim(),
  query('mine')
    .optional()
    .isIn(['true', 'false', '1', '0'])
    .withMessage('mine must be a boolean value'),
  validationErrorHandler,
];

/**
 * Validates the body for the AI draft coach endpoint.
 * - content: required string, min 10 chars
 * - title: optional string
 */
export const generateQuestionDraftCoachValidation = [
  body('content')
    .notEmpty()
    .withMessage('Question content is required')
    .isString()
    .withMessage('Content must be a string')
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters')
    .trim(),
  body('title')
    .optional()
    .isString()
    .withMessage('Title must be a string')
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
  query('query')
    .exists()
    .withMessage('Search query is required')
    .bail()
    .isString()
    .withMessage('Search query must be a string')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Search query must be at least 5 characters'),

  query('k')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('k must be an integer between 1 and 20')
    .toInt(),

  query('threshold')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('threshold must be a number between 0 and 1')
    .toFloat(),

  validationErrorHandler,
];