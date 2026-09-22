import express from 'express';

import {
  createQuestionController,
  getSimilarQuestionsController,
  searchQuestionsSemanticController,
  getQuestionsController,
  generateQuestionDraftCoachController,
  assessAnswerAgainstQuestionController,
   getSingleQuestionController,
} from '../controller/question.controller.js';

import {
  createQuestionValidation,
  searchQuestionsValidation,
  getQuestionsValidation,
  getSimilarQuestionsValidation,
  generateQuestionDraftCoachValidation,
  assessAnswerFitValidation,
  getSingleQuestionValidation, 
} from '../validations/question.validation.js';

import { authenticateUser } from '../../../middleware/authentication.js';


const router = express.Router();

/**
 * @route GET /api/questions
 * @desc List questions with optional search and "mine" filtering
 * @access Protected
 */
router.get(
  '/',
  authenticateUser,
  getQuestionsValidation,
  getQuestionsController,
);

/**
 * @route POST /api/questions
 * @desc Post a new question
 * @access Protected
 */
router.post(
  '/',
  authenticateUser,
  createQuestionValidation,
  createQuestionController,
);

/**
 * @route GET /api/questions/search
 * @desc Semantic search across questions
 * @access Protected
 */
router.get(
  '/search',
  authenticateUser,
  searchQuestionsValidation,
  searchQuestionsSemanticController,
);

/**
 * @route POST /api/questions/draft-coach
 * @desc Generate AI coaching tips for a draft question
 * @access Protected
 */
router.post(
  '/draft-coach',
  authenticateUser,
  generateQuestionDraftCoachValidation,
  generateQuestionDraftCoachController,
);

/**
 * @route GET /api/questions/:questionHash/similar
 * @desc Get questions similar to a specific question
 * @access Protected
 */
router.get(
  '/:questionHash/similar',
  authenticateUser,
  getSimilarQuestionsValidation,
  getSimilarQuestionsController,
);

/**
 * @route POST /api/questions/:questionHash/answer-fit
 * @desc Assess how well a draft answer fits a specific question, using AI
 * @access Protected
 */
router.post(
  '/:questionHash/answer-fit',
  authenticateUser,
  assessAnswerFitValidation,
  assessAnswerAgainstQuestionController,
);

/**
 * @route GET /api/questions/:questionHash
 * @desc Get a single question, its author, and its answers
 * @access Protected
 */
router.get(
  '/:questionHash',
  authenticateUser,
  getSingleQuestionValidation,
  getSingleQuestionController,
);
















export default router;