import express from 'express';
import { getSimilarQuestions } from '../controller/question.controller.js';

const router = express.Router();

router.get(
  '/:questionHash/similar',
  getSimilarQuestions
);

export default router;