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
 * Lists questions, with optional keyword search and "mine" filtering.
 * @param {{ search?: string, mine?: boolean }} [params]
 * @returns {Promise<Array>}
 */
export async function getQuestions(params = {}) {
  try {
    const response = await apiClient.get('/api/questions', { params });
    return getResponseData(response) ?? [];
  } catch (error) {
    throw handleQuestionError(
      error,
      'Failed to load questions. Please try again.',
    );
  }
}

/**
 * Runs an AI-powered semantic search across questions.
 * @param {string} query
 * @param {{ k?: number, threshold?: number }} [options]
 * @returns {Promise<Array>}
 */
export async function searchQuestionsSemantic(query, options = {}) {
  try {
    const response = await apiClient.get('/api/questions/search', {
      params: {
        query,
        k: options.k,
        threshold: options.threshold,
      },
    });
    return getResponseData(response) ?? [];
  } catch (error) {
    throw handleQuestionError(
      error,
      'Failed to run semantic search. Please try again.',
    );
  }
}

/**
 * Fetches a single question, its author, and all its answers.
 * @param {string} questionHash
 * @returns {Promise<{ success: boolean, question: Object, answers: Array, answersMeta: Object }>}
 */
export async function getSingleQuestion(questionHash) {
  try {
    const response = await apiClient.get(`/api/questions/${questionHash}`);
    return response.data;
  } catch (error) {
    throw handleQuestionError(
      error,
      'Failed to load this question. Please try again.',
    );
  }
}

/**
 * Fetches questions similar to a given question, ranked by AI similarity.
 * @param {string} questionHash
 * @param {{ k?: number, threshold?: number }} [options]
 * @returns {Promise<Array>}
 */
export async function getSimilarQuestions(questionHash, options = {}) {
  try {
    const response = await apiClient.get(
      `/api/questions/${questionHash}/similar`,
      {
        params: {
          k: options.k,
          threshold: options.threshold,
        },
      },
    );
    return getResponseData(response) ?? [];
  } catch (error) {
    throw handleQuestionError(
      error,
      'Failed to load similar questions. Please try again.',
    );
  }
}

/**
 * Asks the AI to assess how well a draft answer fits a specific question.
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
    return getResponseData(response);
  } catch (error) {
    throw handleQuestionError(
      error,
      'Unable to assess this answer right now. Please try again.',
    );
  }
}

export const questionService = {
  createQuestion,
  generateQuestionDraftCoach,
  getQuestions,
  searchQuestionsSemantic,
  getSingleQuestion,
  getSimilarQuestions,
  assessAnswerFit,
};