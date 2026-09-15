import { findSimilarQuestions } from '../service/question.service.js';

const getSimilarQuestions = async (req, res) => {
  try {
    const { questionHash } = req.params;

    if (!questionHash) {
      return res.status(400).json({
        message: 'Question hash is required',
      });
    }

    const questions = await findSimilarQuestions(questionHash);

    return res.status(200).json({
      questions,
    });
  } catch (error) {
    console.error('Get similar questions error:', error);

    if (error.message === 'QUESTION_NOT_FOUND') {
      return res.status(404).json({
        message: 'Question not found',
      });
    }

    if (error.message === 'INVALID_SOURCE_EMBEDDING') {
      return res.status(500).json({
        message: 'Question embedding is invalid',
      });
    }

    return res.status(500).json({
      message: 'Failed to find similar questions',
    });
  }
};

export {
  getSimilarQuestions,
};