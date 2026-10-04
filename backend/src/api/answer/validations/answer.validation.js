import { body, param } from 'express-validator';
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

export const answerIdParamValidation = [
  param('answerId')
    .isInt({ min: 1 })
    .withMessage('Answer ID must be a valid integer')
    .toInt(),
  validationErrorHandler,
];

export const updateAnswerValidation = [
  ...answerIdParamValidation.slice(0, -1),
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