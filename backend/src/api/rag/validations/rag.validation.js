import { body, param, query } from 'express-validator';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';

export const documentIdParamValidation = [
  param('documentId')
    .exists()
    .withMessage('documentId is required')
    .isInt({ min: 1 })
    .withMessage('documentId must be a positive integer')
    .toInt(),
  validationErrorHandler,
];

export const queryDocumentValidation = [
  param('documentId')
    .isInt()
    .withMessage('documentId must be an integer')
    .toInt(),

  body('query')
    .notEmpty()
    .withMessage('query is required')
    .isString()
    .withMessage('query must be a string')
    .isLength({ min: 5 })
    .withMessage('query must be at least 5 characters')
    .trim(),

  validationErrorHandler,
];

/**
 * Validates the documentId path param and query string for semantic
 * search within a single document.
 */
export const searchInDocumentValidation = [
  param('documentId')
    .isInt()
    .withMessage('documentId must be an integer')
    .toInt(),

  query('query')
    .notEmpty()
    .withMessage('query is required')
    .isString()
    .withMessage('query must be a string')
    .isLength({ min: 3 })
    .withMessage('query must be at least 3 characters')
    .trim(),

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