/**
 * Arabic Text Processing & Normalization Utility
 * Designed specifically for Arabic Discord Mini-Games (اعكس, أعلام, etc.)
 */

// Arabic Tashkeel (Diacritics) Unicode Range
const TASHKEEL_REGEX = /[\u064B-\u065F\u0670]/g;

// Tatweel / Kashida (ـ)
const TATWEEL_REGEX = /\u0640/g;

/**
 * Strips Arabic Tashkeel / Harakat and Tatweel
 * @param {string} text 
 * @returns {string}
 */
export function removeTashkeel(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(TASHKEEL_REGEX, '').replace(TATWEEL_REGEX, '');
}

/**
 * Reverses an Arabic string cleanly using Unicode-aware grapheme splitting
 * @param {string} text 
 * @returns {string}
 */
export function reverseArabicText(text) {
  if (!text || typeof text !== 'string') return '';
  const clean = removeTashkeel(text.trim());
  // Array.from splits correctly on Unicode code points
  return Array.from(clean).reverse().join('');
}

/**
 * Normalizes Arabic string for lenient fuzzy matching (alef variations, teh marbuta, etc.)
 * @param {string} text 
 * @returns {string}
 */
export function normalizeArabic(text) {
  if (!text || typeof text !== 'string') return '';
  
  let str = removeTashkeel(text).toLowerCase().trim();

  // Normalize Alef variations (أ, إ, آ, ٱ -> ا)
  str = str.replace(/[أإآٱ]/g, 'ا');

  // Normalize Teh Marbuta (ة -> ه)
  str = str.replace(/ة/g, 'ه');

  // Normalize Alef Maksura (ى -> ي)
  str = str.replace(/ى/g, 'ي');

  // Normalize Hamza forms
  str = str.replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');

  // Remove common punctuation and special chars
  str = str.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»]/g, '');

  // Normalize multi-spaces
  str = str.replace(/\s+/g, ' ').trim();

  return str;
}

/**
 * Removes leading "ال" (definite article) from Arabic text
 * @param {string} text 
 * @returns {string}
 */
export function stripDefiniteArticle(text) {
  const norm = normalizeArabic(text);
  if (norm.startsWith('ال') && norm.length > 2) {
    return norm.slice(2);
  }
  return norm;
}

/**
 * Checks if user's input matches the target country name or its aliases
 * @param {string} userInput 
 * @param {string} primaryName 
 * @param {string[]} aliases 
 * @returns {boolean}
 */
export function matchesArabicAnswer(userInput, primaryName, aliases = []) {
  if (!userInput || (!primaryName && (!aliases || aliases.length === 0))) return false;

  const userNorm = normalizeArabic(userInput);
  const userWithoutAl = stripDefiniteArticle(userInput);

  const targets = [primaryName, ...(aliases || [])].filter(Boolean);

  for (const target of targets) {
    const targetNorm = normalizeArabic(target);
    const targetWithoutAl = stripDefiniteArticle(target);

    // 1. Exact normalized match
    if (userNorm === targetNorm) return true;

    // 2. Match without "ال"
    if (userWithoutAl === targetWithoutAl) return true;

    // 3. User input without "ال" matches target with "ال" or vice versa
    if (userWithoutAl === targetNorm || userNorm === targetWithoutAl) return true;
  }

  return false;
}

/**
 * Verifies if user's reversed guess matches the expected reversed word
 * @param {string} userInput 
 * @param {string} originalWord 
 * @returns {boolean}
 */
export function checkReverseMatch(userInput, originalWord) {
  if (!userInput || !originalWord) return false;
  
  const expectedReverse = reverseArabicText(originalWord);
  
  // Direct check
  const inputClean = userInput.trim().replace(/\s+/g, ' ');
  if (inputClean === expectedReverse) return true;

  // Normalized check (lenient for alef/taa marbuta if typed reversed)
  const normInput = normalizeArabic(inputClean);
  const normExpected = normalizeArabic(expectedReverse);
  return normInput === normExpected;
}

/**
 * Checks if user's input is a valid answer for the target letter and category.
 * @param {string} userInput 
 * @param {string} targetLetter 
 * @param {string[]} validAnswers 
 * @returns {boolean}
 */
export function checkHarfAnswer(userInput, targetLetter, validAnswers = []) {
  if (!userInput || !targetLetter || !validAnswers || validAnswers.length === 0) return false;

  const rawInput = userInput.trim();
  const userNorm = normalizeArabic(rawInput);
  const userWithoutAl = stripDefiniteArticle(rawInput);
  const letterNorm = normalizeArabic(targetLetter);

  // 1. Verify that the answer starts with the target letter (or with 'ال' + target letter)
  const startsDirectly = userNorm.startsWith(letterNorm);
  const startsAfterAl = userWithoutAl.startsWith(letterNorm);

  if (!startsDirectly && !startsAfterAl) {
    return false;
  }

  // 2. Check if user input matches any of the accepted valid answers
  for (const answer of validAnswers) {
    const ansNorm = normalizeArabic(answer);
    const ansWithoutAl = stripDefiniteArticle(answer);

    if (
      userNorm === ansNorm ||
      userWithoutAl === ansWithoutAl ||
      userWithoutAl === ansNorm ||
      userNorm === ansWithoutAl
    ) {
      return true;
    }
  }

  return false;
}

