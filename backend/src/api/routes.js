import express from 'express';

import authRoutes from './auth/routes/auth.routes.js';
import questionsRoutes from './questions/routes/question.routes.js';

export const mainRouter = express.Router();

// Authentication routes
mainRouter.use('/auth', authRoutes);

// API Questions routes
mainRouter.use('/questions', questionsRoutes);