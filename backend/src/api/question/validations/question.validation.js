import { body, param, query } from 'express-validator';
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

/**
 * Validates query parameters for listing questions.
 *
 * search: optional string, filters title/content by LIKE
 * mine: optional boolean, when true restricts to the authenticated user's own questions
 */
export const getQuestionsValidation = [
  query('search')
    .optional()
    .isString()
    .withMessage('search must be a string')
    .trim()
    .isLength({ min: 1 })
    .withMessage('search must not be empty when provided'),

  query('mine')
    .optional()
    .isBoolean()
    .withMessage('mine must be a boolean (true or false)')
    .toBoolean(),

  validationErrorHandler,
];

/**
 * Validates the questionHash path param format: 16-character lowercase hex.
 */
export const getSingleQuestionValidation = [
  param('questionHash')
    .matches(/^[a-f0-9]{16}$/)
    .withMessage('questionHash must be a 16-character hex string'),

  validationErrorHandler,
];

/**
 * Validates the questionHash path param for the similar-questions endpoint,
 * plus optional k and threshold query params.
 */
export const getSimilarQuestionsValidation = [
  param('questionHash')
    .matches(/^[a-f0-9]{16}$/)
    .withMessage('questionHash must be a 16-character hex string'),

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

/**
 * Validates the body for the AI question draft coach endpoint.
 *
 * title: optional string
 * content: required string
 */
export const generateQuestionDraftCoachValidation = [
  body('title')
    .optional()
    .isString()
    .withMessage('title must be a string')
    .trim(),

  body('content')
    .notEmpty()
    .withMessage('content is required')
    .isString()
    .withMessage('content must be a string')
    .trim(),

  validationErrorHandler,
];

/**
 * Validates the questionHash path param and answerText body for the
 * AI answer fit evaluation endpoint.
 */
export const assessAnswerFitValidation = [
  param('questionHash')
    .matches(/^[a-f0-9]{16}$/)
    .withMessage('questionHash must be a 16-character hex string'),

  body('answerText')
    .notEmpty()
    .withMessage('answerText is required')
    .isString()
    .withMessage('answerText must be a string')
    .isLength({ min: 20 })
    .withMessage('answerText must be at least 20 characters')
    .trim(),

  validationErrorHandler,
];