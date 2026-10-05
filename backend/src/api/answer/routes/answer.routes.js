import express from 'express';
import {
  createAnswerController,
  updateAnswerController,
  deleteAnswerController,
} from '../controller/answer.controller.js';
import {
  createAnswerValidation,
  updateAnswerValidation,
  answerIdParamValidation,
} from '../validations/answer.validation.js';
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

router.put(
  '/:answerId',
  authenticateUser,
  updateAnswerValidation,
  updateAnswerController,
);

router.delete(
  '/:answerId',
  authenticateUser,
  answerIdParamValidation,
  deleteAnswerController,
);

export default router;