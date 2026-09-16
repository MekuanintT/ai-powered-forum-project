import express from 'express';
import { createAnswerController } from '../controller/answer.controller.js';
import { createAnswerValidation } from '../validations/answer.validation.js';
import { authenticateUser } from '../../../middleware/authentication.js';

const router = express.Router();

/**
 * @route POST /api/answers
 * @desc Post a new answer to a question
 * @access Protected
 */
router.post(
  '/',
  authenticateUser,
  createAnswerValidation,
  createAnswerController,
);

export default router;