import { body } from 'express-validator';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';

// TODO: Implement registration validation rules.
// Required fields: firstName, lastName (strings, reasonable min length),
// email (must be a valid email), password (minimum length).
// Remember to end the chain with validationErrorHandler.
export const registerValidation = [validationErrorHandler];

// TODO: Implement login validation rules.
// Required fields: email (must be a valid email), password (required).
// Remember to end the chain with validationErrorHandler.
export const loginValidation = [validationErrorHandler];
