import { apiClient } from '../core/api.client.js';

function getResponseData(response) {
  return response.data?.data ?? response.data;
}

function handleQuestionError(error, fallbackMessage) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return new Error('The request timed out. Please try again.');
    }

    return new Error(
      'Unable to connect to the server. Please check your connection and try again.',
    );
  }

  const backendMessage =
    error.response.data?.message ||
    error.response.data?.msg ||
    error.response.data?.errors?.[0]?.msg;

  if (error.response.status >= 500) {
    return new Error('Something went wrong on our end. Please try again later.');
  }

  return new Error(backendMessage || fallbackMessage);
}

/**
 * Fetches a list of questions with optional filters.
 * @param {{ search?: string, mine?: boolean }} [params]
 */
export async function getQuestions(params = {}) {
  try {
    const response = await apiClient.get('/api/questions', { params });
    const payload = response.data;
    // Support { data: [] } and raw array responses
    return Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  } catch (error) {
    throw handleQuestionError(error, 'Failed to load questions. Please try again.');
  }
}

/**
 * Performs semantic search for questions.
 * @param {string} query
 */
export async function searchQuestionsSemantic(query) {
  try {
    const response = await apiClient.get('/api/questions/search', {
      params: { query },
    });
    const payload = response.data;
    return Array.isArray(payload?.data) ? payload.data : [];
  } catch (error) {
    throw handleQuestionError(error, 'Semantic search failed. Please try again.');
  }
}

/**
 * Creates a forum question for the authenticated user.
 * @param {{ title: string, content: string }} question
 */
export async function createQuestion(question) {
  try {
    const response = await apiClient.post('/api/questions', question);
    return getResponseData(response);
  } catch (error) {
    throw handleQuestionError(error, 'Failed to post question. Please try again.');
  }
}

/**
 * Requests writing feedback from the AI draft coach.
 * @param {{ title: string, content: string }} draft
 */
export async function generateQuestionDraftCoach(draft) {
  try {
    const response = await apiClient.post(
      '/api/questions/draft-coach',
      draft,
    );
    const data = getResponseData(response) ?? {};
    const tips = Array.isArray(data.tips)
      ? data.tips
      : Array.isArray(data.suggestions)
        ? data.suggestions
        : [];

    return {
      feedback: data.feedback || data.message || '',
      tips,
    };
  } catch (error) {
    throw handleQuestionError(
      error,
      'Unable to generate suggestions right now. Please try again.',
    );
  }
}

/**
 * Fetches full details (question + answers) for a single question.
 * @param {string} questionHash - The 16-char hex hash for the question.
 */
export async function getSingleQuestion(questionHash) {
  try {
    const response = await apiClient.get(`/api/questions/${questionHash}`);
    const payload = response.data;
    // Backend returns { success, message, question: {..., answers: [] } }
    return payload?.question ?? payload?.data ?? payload;
  } catch (error) {
    throw handleQuestionError(error, 'Failed to load question. Please try again.');
  }
}

/**
 * Evaluates how well a draft answer fits the question using AI.
 * @param {string} questionHash
 * @param {string} answerText
 * @returns {Promise<{ level: 'strong'|'partial'|'weak', note: string }>}
 */
export async function assessAnswerFit(questionHash, answerText) {
  try {
    const response = await apiClient.post(
      `/api/questions/${questionHash}/answer-fit`,
      { answerText },
    );
    return getResponseData(response) ?? {};
  } catch (error) {
    throw handleQuestionError(
      error,
      'AI fit check is unavailable right now. Please try again.',
    );
  }
}

export const questionService = {
  createQuestion,
  getQuestions,
  searchQuestionsSemantic,
  generateQuestionDraftCoach,
  getSingleQuestion,
  assessAnswerFit,
};
