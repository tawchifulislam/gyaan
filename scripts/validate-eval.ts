// Checks eval/cases.json against the corpus. Run it every time you add questions.
//
//   npm run validate
import { loadCases, loadCorpus } from '../src/core/corpus.js';
import { TARGET_TOTAL, validateCases } from '../src/eval/validate.js';

try {
  const result = validateCases(loadCorpus(), loadCases());

  console.log(`Cases: ${result.total} (target ${TARGET_TOTAL}+)`);
  console.log('By category:', result.byCategory);
  console.log('By language:', result.byLanguage);
  if (result.total === 0) console.log('\nNo cases yet. Add questions to eval/cases.json (see eval/README.md).');

  if (result.warnings.length) {
    console.log(`\nWarnings (${result.warnings.length}):\n` + result.warnings.map(w => `  - ${w}`).join('\n'));
  }
  if (result.errors.length) {
    console.log(`\nErrors (${result.errors.length}):\n` + result.errors.map(e => `  - ${e}`).join('\n'));
    process.exit(1);
  }
  console.log('\nValidation passed.');
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
