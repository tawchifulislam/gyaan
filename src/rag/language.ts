// Which language should the answer be in? Decided here, in code, and then told to the model.
// Leaving the model to guess does not work reliably: the sources are Bengali, so a model drifts
// towards Bengali even when the question was in English.

const BENGALI = /[\u0980-\u09FF]/g;
const LATIN = /[A-Za-z]/g;

export type AnswerLanguage = 'bn' | 'en';

/**
 * Purely English questions get English answers. Anything with Bengali letters in it, including a
 * Bengali sentence with an English word like "Granada এর পতন কবে হয়েছিল?", gets a Bengali answer.
 */
export const detectQuestionLanguage = (question: string): AnswerLanguage => {
  const bengali = (question.match(BENGALI) ?? []).length;
  const latin = (question.match(LATIN) ?? []).length;
  return bengali === 0 && latin > 0 ? 'en' : 'bn';
};

/** Share of Bengali among the letters of a text (Bengali or Latin letters only). */
export const bengaliShare = (text: string): number => {
  const bengali = (text.match(BENGALI) ?? []).length;
  const latin = (text.match(LATIN) ?? []).length;
  const total = bengali + latin;
  return total === 0 ? 0 : bengali / total;
};

/** Did the answer come back in the language that was asked for? */
export const answerLanguageOk = (expected: AnswerLanguage, answer: string): boolean => {
  const share = bengaliShare(answer);
  return expected === 'en' ? share < 0.2 : share >= 0.5;
};
