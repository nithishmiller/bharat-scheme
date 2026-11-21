import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.resolve(__dirname, '../src/i18n');

const REQUIRED_LANGUAGES = [
  'en', 'as', 'bn', 'brx', 'doi', 'gu', 'hi', 'kn', 'ks', 'kok',
  'mai', 'ml', 'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sat', 'sd',
  'ta', 'te', 'ur'
];

const enPath = path.join(i18nDir, 'en.json');
if (!fs.existsSync(enPath)) {
  console.error(`ERROR: Missing en.json at ${enPath}`);
  process.exit(1);
}

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const enKeys = Object.keys(en);
console.log(`Reference en.json has ${enKeys.length} keys.`);

let hasError = false;

for (const lang of REQUIRED_LANGUAGES) {
  const filePath = path.join(i18nDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ [${lang}] File does not exist: ${filePath}`);
    hasError = true;
    continue;
  }

  let dict;
  try {
    dict = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`❌ [${lang}] Invalid JSON in ${filePath}:`, err.message);
    hasError = true;
    continue;
  }

  const missingKeys = enKeys.filter(k => !(k in dict));
  if (missingKeys.length > 0) {
    console.error(`❌ [${lang}] Missing ${missingKeys.length} keys:`, missingKeys.slice(0, 5));
    hasError = true;
  } else {
    // Check placeholders integrity
    let phErrors = 0;
    for (const key of enKeys) {
      const enVal = en[key];
      const transVal = dict[key];
      const phEn = enVal.match(/\{[a-zA-Z0-9_]+\}/g) || [];
      const phTrans = typeof transVal === 'string' ? (transVal.match(/\{[a-zA-Z0-9_]+\}/g) || []) : [];
      
      const missingPh = phEn.filter(p => !phTrans.includes(p));
      if (missingPh.length > 0) {
        phErrors++;
        if (phErrors <= 3) {
          console.warn(`⚠️ [${lang}][${key}] Missing placeholders: ${missingPh.join(', ')} in "${transVal}"`);
        }
      }
    }
    if (phErrors > 0) {
      console.warn(`⚠️ [${lang}] Total keys with placeholder mismatches: ${phErrors}`);
    }
    console.log(`✅ [${lang}] All ${enKeys.length} keys present.`);
  }
}

if (hasError) {
  console.error('\n❌ i18n-check FAILED: Some language files are missing or incomplete.');
  process.exit(1);
} else {
  console.log(`\n🎉 i18n-check PASSED: All ${REQUIRED_LANGUAGES.length} language files have all ${enKeys.length} keys!`);
  process.exit(0);
}
