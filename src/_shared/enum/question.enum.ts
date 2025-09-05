const QuestionTypeEnum = Object.freeze({
  MULTIPLE_CHOICE: "multiple-choice",
  TRUE_FALSE: "true-false",
  SHORT_ANSWER: "short-answer",
} as const);

export type QuestionType = typeof QuestionTypeEnum[keyof typeof QuestionTypeEnum];
export default QuestionTypeEnum;