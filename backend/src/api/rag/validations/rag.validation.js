import { param } from 'express-validator';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';

/**
 * Validates the :documentId route parameter.
 * Must be a positive integer.
 */
export const documentIdParamValidation = [
  param('documentId')
    .exists()
    .withMessage('documentId is required')
    .isInt({ min: 1 })
    .withMessage('documentId must be a positive integer')
    .toInt(),
  validationErrorHandler,
];
