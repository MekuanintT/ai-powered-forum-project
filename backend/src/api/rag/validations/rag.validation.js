import { body, param, query } from 'express-validator';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';

export const documentIdParamValidation = [
  param('documentId')
    .isInt()
    .withMessage('documentId must be an integer')
    .toInt(),
  validationErrorHandler,
];

export const searchDocumentValidation = [
  param('documentId')
    .isInt()
    .withMessage('documentId must be an integer')
    .toInt(),
  query('query')
    .notEmpty()
    .withMessage('query is required')
    .isString()
    .withMessage('query must be a string')
    .isLength({ min: 2 })
    .withMessage('query must be at least 2 characters')
    .trim(),
  query('k')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('k must be an integer between 1 and 50')
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