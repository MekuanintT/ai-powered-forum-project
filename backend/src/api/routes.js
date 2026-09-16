import express from 'express';
import authRoutes from './auth/routes/auth.routes.js';
import questionRoutes from './question/routes/question.routes.js';
import answerRoutes from './answer/routes/answer.routes.js';
// ...


export const mainRouter = express.Router();

// Authentication routes
mainRouter.use('/auth', authRoutes);
mainRouter.use('/questions', questionRoutes);
mainRouter.use('/answers', answerRoutes);