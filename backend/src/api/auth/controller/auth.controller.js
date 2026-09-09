import { StatusCodes } from 'http-status-codes';
import { registerService, loginService } from '../service/auth.service.js';

/**
 * Handles user registration requests.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const registerController = async (req, res, next) => {
  try {
    // TODO: Implement registration.
    // 1. Extract firstName, lastName, email, password from req.body
    // 2. Call registerService with that data
    // 3. Respond with StatusCodes.CREATED and the created user
  } catch (error) {
    next(error);
  }
};

/**
 * Handles user login requests.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const loginController = async (req, res, next) => {
  try {
    // TODO: Implement login.
    // 1. Extract email, password from req.body
    // 2. Call loginService with those credentials
    // 3. Respond with StatusCodes.OK, the user, and the token
  } catch (error) {
    next(error);
  }
};
