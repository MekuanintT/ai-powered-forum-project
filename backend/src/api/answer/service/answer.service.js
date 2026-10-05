import { safeExecute } from '../../../../db/config.js';
import { BadRequestError, NotFoundError } from '../../../utils/errors/index.js';

/**
 * Creates a new answer for a question, after verifying the question exists
 * and the user is not answering their own question.
 *
 * @param {Object} payload - The answer data
 * @param {number} payload.questionId - ID of the question being answered
 * @param {string} payload.content - Content of the answer
 * @param {number} payload.userId - ID of the user creating the answer
 * @returns {Promise<Object>} Object containing the created answer with author info
 */
export const createAnswerService = async payload => {
  const { questionId, content, userId } = payload;

  // Fetch the question to verify it exists and check its owner
  const findQuestionSql =
    'SELECT question_id, user_id FROM questions WHERE question_id = ?';
  const [question] = await safeExecute(findQuestionSql, [questionId]);

  if (!question) {
    throw new NotFoundError('Question not found.');
  }

  // Check ownership - prevent users from answering their own question
  if (question.user_id === userId) {
    throw new BadRequestError('You cannot answer your own question.');
  }

  // Insert the answer into the answers table
  const insertAnswerSql =
    'INSERT INTO answers (question_id, user_id, content) VALUES (?, ?, ?)';
  const insertResult = await safeExecute(insertAnswerSql, [
    questionId,
    userId,
    content,
  ]);

  const answerId = insertResult.insertId;

  // Fetch the newly created answer along with author info
  const getAnswerSql = `
    SELECT
      a.answer_id AS id,
      a.question_id AS questionId,
      a.content,
      a.created_at AS createdAt,
      a.updated_at AS updatedAt,
      u.user_id AS authorId,
      u.first_name AS authorFirstName,
      u.last_name AS authorLastName
    FROM answers a
    JOIN users u ON u.user_id = a.user_id
    WHERE a.answer_id = ?
  `;
  const [answerRow] = await safeExecute(getAnswerSql, [answerId]);

  if (!answerRow) {
    throw new NotFoundError('Answer could not be retrieved after creation.');
  }

  // Shape the result to match the documented API response
  const answer = {
    id: answerRow.id,
    questionId: answerRow.questionId,
    content: answerRow.content,
    createdAt: answerRow.createdAt,
    updatedAt: answerRow.updatedAt,
    author: {
      id: answerRow.authorId,
      firstName: answerRow.authorFirstName,
      lastName: answerRow.authorLastName,
    },
  };

  return { answer };
};

export const updateAnswerService = async ({ answerId, userId, content }) => {
  const result = await safeExecute(
    'UPDATE answers SET content = ? WHERE answer_id = ? AND user_id = ?',
    [content, answerId, userId],
  );

  if (!result.affectedRows) {
    const ownedAnswer = await safeExecute(
      'SELECT answer_id FROM answers WHERE answer_id = ? AND user_id = ? LIMIT 1',
      [answerId, userId],
    );

    if (!ownedAnswer.length) {
      throw new NotFoundError('Answer not found.');
    }
  }

  const [answerRow] = await safeExecute(
    `
      SELECT
        a.answer_id AS id,
        a.question_id AS questionId,
        a.content,
        a.created_at AS createdAt,
        a.updated_at AS updatedAt,
        u.user_id AS authorId,
        u.first_name AS authorFirstName,
        u.last_name AS authorLastName
      FROM answers a
      JOIN users u ON u.user_id = a.user_id
      WHERE a.answer_id = ? AND a.user_id = ?
    `,
    [answerId, userId],
  );

  return {
    answer: {
      id: answerRow.id,
      questionId: answerRow.questionId,
      content: answerRow.content,
      createdAt: answerRow.createdAt,
      updatedAt: answerRow.updatedAt,
      author: {
        id: answerRow.authorId,
        firstName: answerRow.authorFirstName,
        lastName: answerRow.authorLastName,
      },
    },
  };
};

export const deleteAnswerService = async ({ answerId, userId }) => {
  const result = await safeExecute(
    'DELETE FROM answers WHERE answer_id = ? AND user_id = ?',
    [answerId, userId],
  );

  if (!result.affectedRows) {
    throw new NotFoundError('Answer not found.');
  }
};