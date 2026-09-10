import { body } from 'express-validator';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';

// TODO: Implement registration validation rules.
// Required fields: firstName, lastName (strings, reasonable min length),
// email (must be a valid email), password (minimum length).
// Remember to end the chain with validationErrorHandler.
export const registerValidation = [ 
    body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .isString()
    .withMessage('First name must be a string')
    .isLength({ min: 3 })
    .withMessage('First name must be at least 3 characters long'),
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .isString()
    .withMessage('Last name must be a string')
    .isLength({ min: 3 })
    .withMessage('Last name must be at least 3 characters long'),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  validationErrorHandler,];

// TODO: Implement login validation rules.
// Required fields: email (must be a valid email), password (required).
// Remember to end the chain with validationErrorHandler.
export const loginValidation = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("A valid email address is required")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),

  validationErrorHandler,
];
