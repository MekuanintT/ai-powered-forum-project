import { body, param } from 'express-validator';
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