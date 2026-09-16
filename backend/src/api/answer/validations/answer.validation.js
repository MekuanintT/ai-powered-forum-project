import { body } from 'express-validator';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';

export const createAnswerValidation = [
  body('questionId')
    .notEmpty()
    .withMessage('Question ID is required')
    .isInt({ min: 1 })
    .withMessage('Question ID must be a valid integer')
    .toInt(),
  body('content')
    .notEmpty()
    .withMessage('Answer content is required')
    .isString()
    .withMessage('Answer content must be a string')
    .isLength({ min: 20 })
    .withMessage('Answer content must be at least 20 characters')
    .trim(),
  validationErrorHandler,
];