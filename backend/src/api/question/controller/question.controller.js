import { StatusCodes } from 'http-status-codes';
import { createQuestionWithVectorService } from '../service/question.service.js';

/**
 * Handles creating a new question.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const createQuestionController = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const result = await createQuestionWithVectorService({
      userId: req.user.id, // author id (authenticated user)
      title,
      content,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Question posted successfully.',
      data: result.question,
    });
  } catch (error) {
    next(error);
  }
};