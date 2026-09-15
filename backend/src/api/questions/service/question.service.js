import { safeExecute } from '../../../../db/config.js';

const cosineSimilarity = (vectorA, vectorB) => {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB)) {
    return 0;
  }

  if (vectorA.length !== vectorB.length || vectorA.length === 0) {
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

const findSimilarQuestions = async (questionHash) => {
  // Find the requested question and its embedding
  const sourceRows = await safeExecute(
    `
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
      WHERE q.question_hash = ?
        AND qv.status = 'ready'
      LIMIT 1
    `,
    [questionHash]
  );

  if (sourceRows.length === 0) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  const sourceQuestion = sourceRows[0];

  // Parse the source embedding
  let sourceEmbedding;

  try {
    sourceEmbedding =
      typeof sourceQuestion.embedding === 'string'
        ? JSON.parse(sourceQuestion.embedding)
        : sourceQuestion.embedding;
  } catch (error) {
    throw new Error('INVALID_SOURCE_EMBEDDING');
  }

  // Get embeddings for all other ready questions
  const rows = await safeExecute(
    `
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
    `,
    [sourceQuestion.question_id]
  );

  const similarQuestions = [];

  // Calculate cosine similarity for every other question
  for (const row of rows) {
    let embedding;

    try {
      embedding =
        typeof row.embedding === 'string'
          ? JSON.parse(row.embedding)
          : row.embedding;
    } catch (error) {
      // Ignore questions with invalid embeddings
      continue;
    }

    const similarity = cosineSimilarity(
      sourceEmbedding,
      embedding
    );

    similarQuestions.push({
      questionHash: row.question_hash,
      title: row.title,
      content: row.content,
      userId: row.user_id,
      createdAt: row.created_at,
      similarity,
    });
  }

  // Highest similarity first
  similarQuestions.sort(
    (a, b) => b.similarity - a.similarity
  );

  // Return top 5 similar questions
  return similarQuestions.slice(0, 5);
};

export {
  findSimilarQuestions,
};