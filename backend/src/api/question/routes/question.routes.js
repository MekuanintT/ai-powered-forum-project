import express from 'express';

import {
  createQuestionController,
  getSimilarQuestionsController,
} from '../controller/question.controller.js';

import { createQuestionValidation } from '../validations/question.validation.js';

import { authenticateUser } from '../../../middleware/authentication.js';

const router = express.Router();

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
 * @route GET /api/questions/:questionHash/similar
 * @desc Get questions similar to a specific question
 * @access Public
 */
router.get(
  '/:questionHash/similar',
  getSimilarQuestionsController,
);

export default router;