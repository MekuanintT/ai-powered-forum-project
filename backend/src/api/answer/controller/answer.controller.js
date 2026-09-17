import { StatusCodes } from 'http-status-codes';
import { createAnswerService } from '../service/answer.service.js';
import { getSingteQuestionService } from '../../question/service/question.service.js';
import { assessAnswerAgainstQuestionService } from '../../question/service/geminiTextCoach.service.js';

/**
 * Handles creating a new answer to a question.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const createAnswerController = async (req, res, next) => {
  try {
    const { questionId, content } = req.body;
    const result = await createAnswerService({
      questionId,
      content,
      userId: req.user.id,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Answer posted successfully',
      data: result.answer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles AI relevance assessment of an answer draft against a question.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const assessAnswerAgainstQuestionControtter = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { answerText } = req.body;

    const { question } = await getSingteQuestionService(
      questionHash,
      false,
    );

    const data = await assessAnswerAgainstQuestionService(
      question.title,
      question.content,
      answerText,
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Answer fit assessed.',
      data,
    });
  } catch (error) {
    next(error);
  }
};