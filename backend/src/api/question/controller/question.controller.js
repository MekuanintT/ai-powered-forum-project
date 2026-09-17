import { StatusCodes } from 'http-status-codes';

import {
  createQuestionWithVectorService,
  getSimilarQuestionsService,
  searchQuestionsSemanticService,
  getQuestionsService,
} from '../service/question.service.js';

import {
  generateQuestionDraftCoachService,
  assessAnswerAgainstQuestionService,
} from '../service/geminiTextCoach.service.js';

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

/**
 * Handles semantic search for questions.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const searchQuestionsSemanticController = async (req, res, next) => {
  try {
    const { query, k, threshold } = req.query;

    const result = await searchQuestionsSemanticService({
      query,
      k,
      threshold,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Semantic search completed successfully',
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles listing questions with optional search and "mine" filtering.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const getQuestionsController = async (req, res, next) => {
  try {
    const { search, mine } = req.query;

    const result = await getQuestionsService({
      search,
      mine,
      userId: req.user?.id,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Questions fetched successfully.',
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles generating AI coaching tips for a draft question.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const generateQuestionDraftCoachController = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    const data = await generateQuestionDraftCoachService({ title, content });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Draft suggestions generated',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles assessing how well a draft answer fits a specific question.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const assessAnswerAgainstQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { answerText } = req.body;

    const data = await assessAnswerAgainstQuestionService({
      questionHash,
      answerText,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Answer fit assessed',
      data,
    });
  } catch (error) {
    next(error);
  }
};