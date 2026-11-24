import { describe, expect, it } from 'vitest';
import { answerLanguageOk, bengaliShare, detectQuestionLanguage } from './language.js';

describe('detectQuestionLanguage', () => {
  it('English only means English', () => {
    expect(detectQuestionLanguage('Why did Tariq ibn Ziyad burn his ships?')).toBe('en');
    expect(detectQuestionLanguage('Who was freed on 6 November 1975?')).toBe('en');
  });
  it('anything with Bengali letters means Bengali, even with English words or digits', () => {
    expect(detectQuestionLanguage('তারিক কেন জাহাজ পুড়িয়েছিলেন?')).toBe('bn');
    expect(detectQuestionLanguage('Granada এর পতন কবে হয়েছিল?')).toBe('bn');
    expect(detectQuestionLanguage('Mughal সাম্রাজ্যের আনুষ্ঠানিক সমাপ্তি কবে ঘটে?')).toBe('bn');
    expect(detectQuestionLanguage('1526 সালে ইব্রাহিম লোদিকে কে পরাজিত করেন?')).toBe('bn');
  });
  it('defaults to Bengali when there are no letters at all', () => {
    expect(detectQuestionLanguage('1526?')).toBe('bn');
    expect(detectQuestionLanguage('')).toBe('bn');
  });
});

describe('answerLanguageOk', () => {
  it('an English question needs an English answer', () => {
    expect(answerLanguageOk('en', 'Tariq burned his ships so his soldiers could not retreat.')).toBe(true);
    expect(answerLanguageOk('en', 'শবে বরাত একটি ফারসি শব্দ।')).toBe(false);
  });
  it('allows a few Bengali names inside an English answer, and Latin names inside a Bengali one', () => {
    expect(answerLanguageOk('en', 'The post calls it "শবে বরাত", meaning the night of fortune.')).toBe(true);
    expect(answerLanguageOk('bn', 'তারিক বিন জিয়াদ (Tariq ibn Ziyad) ৭১১ সালে স্পেনে যান।')).toBe(true);
  });
  it('a Bengali question needs a mostly Bengali answer', () => {
    expect(answerLanguageOk('bn', 'Tariq burned his ships.')).toBe(false);
  });
  it('measures the Bengali share of the letters', () => {
    expect(bengaliShare('abc')).toBe(0);
    expect(bengaliShare('কখ')).toBe(1);
    expect(bengaliShare('')).toBe(0);
    expect(bengaliShare('কখab')).toBe(0.5);
  });
});
