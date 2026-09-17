import crypto from 'crypto';

import { safeExecute } from '../../../../db/config.js';

import { BadRequestError } from '../../../utils/errors/index.js';

import {
  generateQuestionEmbedding,
  normalizeQuestionText,
  storeQuestionVector,
} from './vector.service.js';

const generateQuestionHash = () =>
  crypto.randomBytes(8).toString('hex');

/**
 * Creates a new question and stores its vector embedding for semantic search.
 *
 * @param {Object} payload - The question data
 * @param {string} payload.userId - ID of the user creating the question
 * @param {string} payload.title - Title of the question
 * @param {string} payload.content - Content/body of the question
 * @returns {Promise<Object>} Object containing the created question
 */
export const createQuestionWithVectorService = async payload => {
  const { userId, title, content } = payload;

  const insertQuestionSql =
    'INSERT INTO questions (question_hash, user_id, title, content) VALUES (?, ?, ?, ?)';

  const questionHash = generateQuestionHash();

  let questionResult;

  try {
    questionResult = await safeExecute(insertQuestionSql, [
      questionHash,
      userId,
      title,
      content,
    ]);
  } catch (error) {
    if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
      throw new BadRequestError('User does not exist.');
    }

    throw error;
  }

  const questionId = questionResult.insertId;

  const creationResult = {
    id: questionId,
    questionHash,
    title,
    content,
    userId,
  };

  // Normalize the question title to prepare it for vector embedding
  const sourceText = normalizeQuestionText({
    title: payload.title,
  });

  try {
    const embeddingResult = await generateQuestionEmbedding(
      sourceText,
      {
        questionId: creationResult.id,
      },
    );

    await storeQuestionVector({
      questionId: creationResult.id,
      sourceText,
      embedding: embeddingResult.embedding,
      status: 'ready',
    });
  } catch (error) {
    console.error('=== FAILED TO STORE VECTOR FOR QUESTION ===');
    console.error('Question ID:', creationResult.id);
    console.error('Operation: question creation');
    console.error('Error:', error);
    console.error('=============================================');

    await storeQuestionVector({
      questionId: creationResult.id,
      sourceText,
      embedding: [],
      status: 'failed',
    }).catch(e =>
      console.error(
        'Failed to save failed status',
        e,
      ),
    );
  }

  return {
    question: creationResult,
  };
};

/**
 * Calculates cosine similarity between two vectors.
 *
 * @param {number[]} vectorA
 * @param {number[]} vectorB
 * @returns {number}
 */
const cosineSimilarity = (vectorA, vectorB) => {
  if (
    !Array.isArray(vectorA) ||
    !Array.isArray(vectorB) ||
    vectorA.length === 0 ||
    vectorB.length === 0 ||
    vectorA.length !== vectorB.length
  ) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i += 1) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return (
    dotProduct /
    (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB))
  );
};

/**
 * Gets questions similar to a question identified by its hash.
 *
 * @param {string} questionHash
 * @returns {Promise<Array>}
 */
export const getSimilarQuestionsService = async questionHash => {
  if (!questionHash) {
    throw new BadRequestError(
      'Question hash is required.',
    );
  }

  // Get the requested question
  const questionSql = `
    SELECT
      question_id,
      question_hash,
      title,
      content,
      user_id,
      created_at
    FROM questions
    WHERE question_hash = ?
    LIMIT 1
  `;

  const questions = await safeExecute(
    questionSql,
    [questionHash],
  );

  if (!questions || questions.length === 0) {
    throw new BadRequestError(
      'Question not found.',
    );
  }

  const question = questions[0];

  // Get the embedding of the requested question
  const vectorSql = `
    SELECT
      embedding
    FROM question_vectors
    WHERE question_id = ?
      AND status = 'ready'
    LIMIT 1
  `;

  const vectorRows = await safeExecute(
    vectorSql,
    [question.question_id],
  );

  if (!vectorRows || vectorRows.length === 0) {
    return [];
  }

  let targetEmbedding = vectorRows[0].embedding;

  if (typeof targetEmbedding === 'string') {
    targetEmbedding = JSON.parse(targetEmbedding);
  }

  // Get all other ready question vectors
  const similarVectorSql = `
    SELECT
      q.question_id,
      q.question_hash,
      q.title,
      q.content,
      q.user_id,
      q.created_at,
      qv.embedding
    FROM questions q
    INNER JOIN question_vectors qv
      ON q.question_id = qv.question_id
    WHERE q.question_id != ?
      AND qv.status = 'ready'
  `;

  const candidateRows = await safeExecute(
    similarVectorSql,
    [question.question_id],
  );

  const similarQuestions = candidateRows
    .map(row => {
      let embedding = row.embedding;

      if (typeof embedding === 'string') {
        try {
          embedding = JSON.parse(embedding);
        } catch {
          return null;
        }
      }

      const similarity = cosineSimilarity(
        targetEmbedding,
        embedding,
      );

      return {
        questionId: row.question_id,
        questionHash: row.question_hash,
        title: row.title,
        content: row.content,
        userId: row.user_id,
        createdAt: row.created_at,
        similarity,
      };
    })
    .filter(Boolean)
    .filter(question => question.similarity > 0)
    .sort(
      (a, b) =>
        b.similarity - a.similarity,
    )
    .slice(0, 5);

  return similarQuestions;
};

/**
 * Performs semantic search for questions.
 *
 * @param {Object} params
 * @param {string} params.query - Search query
 * @param {number} params.k - Maximum number of results
 * @param {number} params.threshold - Minimum similarity score
 * @returns {Promise<Object>}
 */
export const searchQuestionsSemanticService = async ({
  query,
  k = 5,
  threshold = Number(
    process.env.RECOMMEND_THRESHOLD ?? 0.75,
  ),
}) => {
  // 1. Embed the search query
  const embeddingResult = await generateQuestionEmbedding(
    query,
    {
      taskType: 'RETRIEVAL_QUERY',
    },
  );

  const queryEmbedding = embeddingResult.embedding;

  // 2. Get all ready question vectors
  const vectorSql = `
    SELECT
      question_id,
      embedding
    FROM question_vectors
    WHERE status = 'ready'
  `;

  const vectorRows = await safeExecute(vectorSql);

  // 3. Calculate cosine similarity
  const scoredQuestions = vectorRows
    .map(row => {
      let embedding = row.embedding;

      if (typeof embedding === 'string') {
        try {
          embedding = JSON.parse(embedding);
        } catch {
          return null;
        }
      }

      const score = cosineSimilarity(
        queryEmbedding,
        embedding,
      );

      return {
        questionId: row.question_id,
        score,
      };
    })
    .filter(Boolean)

    // 4. Filter by threshold
    .filter(result => result.score >= threshold)

    // 5. Sort highest score first
    .sort(
      (a, b) => b.score - a.score,
    )

    // 6. Take top k results
    .slice(0, k);

  // If nothing matches
  if (scoredQuestions.length === 0) {
    return {
      data: [],
      meta: {
        total: 0,
        k,
        threshold,
        query,
        questionHash: null,
      },
    };
  }

  // 7. Get matching question IDs
  const questionIds = scoredQuestions.map(
    result => result.questionId,
  );

  const placeholders = questionIds
    .map(() => '?')
    .join(', ');

  // 8. Fetch question and author details
  const questionSql = `
    SELECT
      q.question_id AS id,
      q.question_hash AS questionHash,
      q.title,
      q.content,
      COUNT(a.answer_id) AS answerCount,
      q.created_at AS createdAt,
      q.updated_at AS updatedAt,
      u.user_id AS authorId,
      u.first_name AS authorFirstName,
      u.last_name AS authorLastName
    FROM questions q
    INNER JOIN users u
      ON q.user_id = u.user_id
    LEFT JOIN answers a
      ON q.question_id = a.question_id
    WHERE q.question_id IN (${placeholders})
    GROUP BY
      q.question_id,
      q.question_hash,
      q.title,
      q.content,
      q.created_at,
      q.updated_at,
      u.user_id,
      u.first_name,
      u.last_name
  `;

  const questionRows = await safeExecute(
    questionSql,
    questionIds,
  );

  // 9. Map question details by ID
  const questionMap = new Map(
    questionRows.map(question => [
      question.id,
      question,
    ]),
  );

  // 10. Combine question details with similarity score
  const data = scoredQuestions
    .map(result => {
      const question = questionMap.get(
        result.questionId,
      );

      if (!question) {
        return null;
      }

      return {
        id: question.id,
        questionHash: question.questionHash,
        title: question.title,
        content: question.content,
        answerCount: Number(
          question.answerCount,
        ),
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
        author: {
          id: question.authorId,
          firstName: question.authorFirstName,
          lastName: question.authorLastName,
        },
        score: Number(
          result.score.toFixed(6),
        ),
      };
    })
    .filter(Boolean);

  return {
    data,
    meta: {
      total: data.length,
      k,
      threshold,
      query,
      questionHash: null,
    },
  };
};