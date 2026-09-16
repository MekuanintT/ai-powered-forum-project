import { StatusCodes } from 'http-status-codes';

import {
  createQuestionWithVectorService,
  getSimilarQuestionsService,
} from '../service/question.service.js';

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
      userId: req.user.id,
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

/**
 * Handles retrieving questions similar to a specific question.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const getSimilarQuestionsController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;

    const questions = await getSimilarQuestionsService(questionHash);

    res.status(StatusCodes.OK).json({
      success: true,
      data: questions,
    });
  } catch (error) {
    next(error);
  }
};