import express from 'express';

import {
  createQuestionController,
  getQuestionsController,
  generateQuestionDraftCoachController,
  getSimilarQuestionsController,
  searchQuestionsSemanticController,
} from '../controller/question.controller.js';

import {
  createQuestionValidation,
  getQuestionsValidation,
  generateQuestionDraftCoachValidation,
} from '../validations/question.validation.js';

import { authenticateUser } from '../../../middleware/authentication.js';

const router = express.Router();

/**
 * @route GET /api/questions
 * @desc List questions with optional keyword search and mine filter
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
 * @route POST /api/questions/draft-coach
 * @desc Get AI writing tips for a question draft
 * @access Protected
 * Note: Must be declared before /:questionHash to avoid route shadowing.
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
 * @access Public
 */
router.get(
  '/:questionHash/similar',
  getSimilarQuestionsController,
);

export default router;