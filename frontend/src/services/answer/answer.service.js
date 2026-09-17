import { apiClient } from '../core/api.client.js';

function handleAnswerError(error, fallbackMessage) {
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
 * Posts a new answer to a question.
 * @param {number} questionId - The numeric ID of the question.
 * @param {string} content - The answer text.
 * @returns {Promise<Object>} The created answer object.
 */
export async function postAnswer(questionId, content) {
  try {
    const response = await apiClient.post('/api/answers', {
      questionId,
      content,
    });
    return response.data?.data ?? response.data;
  } catch (error) {
    throw handleAnswerError(error, 'Failed to post answer. Please try again.');
  }
}

export const answerService = { postAnswer };
