import { apiClient } from '../core/api.client';

const getQuestions = async (params = {}) => {
  const response = await apiClient.get('/api/questions', {
    params,
  });

  return response.data;
};

const searchQuestionsSemantic = async (query) => {
  const response = await apiClient.get('/api/questions/search', {
    params: {
      q: query,
      semantic: true,
    },
  });

  return response.data;
};

export {
  getQuestions,
  searchQuestionsSemantic,
};