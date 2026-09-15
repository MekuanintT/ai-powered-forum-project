const validateQuestionHash = (questionHash) => {
  if (!questionHash || typeof questionHash !== 'string') {
    return false;
  }

  return questionHash.trim().length > 0;
};

export {
  validateQuestionHash,
};