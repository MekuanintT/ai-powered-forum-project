import { apiClient } from '../core/api.client.js';

function getResponseData(response) {
  return response.data?.data ?? response.data;
}

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
 * Posts an answer to a question.
 *
 * NOTE: the request body below is the one assumption in this file that I could
 * not verify against your backend. The task doc specifies the signature
 * `postAnswer(questionId, content)` hitting `POST /api/answers`, so the body is
 * sent as `{ questionId, content }`. If your answer validation layer expects
 * snake_case (`question_id`) or the lowercase `questionid` used by some of the
 * Evangadi starter backends, change the object literal on the line marked below
 * and nothing else needs to move.
 *
 * @param {string|number} questionId
 * @param {string} content
 * @returns {Promise<Object>} the created answer
 */
export async function postAnswer(questionId, content) {
  try {
    const response = await apiClient.post('/api/answers', {
      questionId, // <-- change this key if your backend expects a different one
      content,
    });
    return getResponseData(response);
  } catch (error) {
    throw handleAnswerError(error, 'Failed to post answer. Please try again.');
  }
}

/**
 * Lists the answers belonging to a question.
 *
 * `getSingleQuestion()` already returns answers alongside the question, so the
 * detail page does not need this on mount. It is here for the re-fetch path and
 * for any later view that wants answers without the question payload.
 *
 * @param {string} questionHash
 * @returns {Promise<Array>}
 */
export async function getAnswersByQuestion(questionHash) {
  try {
    const response = await apiClient.get(`/api/answers/${questionHash}`);
    return getResponseData(response) ?? [];
  } catch (error) {
    throw handleAnswerError(
      error,
      'Failed to load answers. Please try again.',
    );
  }
}

export const answerService = {
  postAnswer,
  getAnswersByQuestion,
};