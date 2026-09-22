/**
 * Dataset for "🔄 فكك" (Disassemble Word Game)
 * High-quality Arabic words, easy to medium difficulty, clear letter breakdown.
 */

export const DISASSEMBLE_WORDS = [
  'مدرسة',
  'جافاسكربت',
  'مكتبة',
  'برمجة',
  'حاسوب',
  'مستقبل',
  'تطوير',
  'شاشة',
  'سماعة',
  'طاولة',
  'طائرة',
  'سيارة',
  'جامعة',
  'تفاح',
  'زهرة',
  'حديقة',
  'صديق',
  'عائلة',
  'استكشاف',
  'مبتكر',
  'شمسية',
  'مسجد',
  'نافذة',
  'كوكب',
  'محيط',
  'سفينة',
  'مطبخ',
  'مدينة',
  'قطار',
  'محرك',
  'مكتب',
  'هاتف',
  'كاميرا',
  'تلفاز',
  'ساعة',
  'نظارة',
  'لوحة',
  'دفتر',
  'حقيبة',
  'مفتاح',
  'صندوق',
  'مظلة',
  'زجاج',
  'عاصفة',
  'جزيرة',
  'قلعة',
  'متحف',
  'مسرح',
  'مطعم',
  'شلال',
  'حدادة',
  'نجارة',
  'خريطة',
  'منطاد',
  'صاروخ',
  'قارب',
  'غواصة',
  'شاحنة',
  'دراجة',
];

let lastSelectedIndex = -1;

/**
 * Returns a random Arabic word for the disassemble game, avoiding consecutive duplicates.
 * @returns {string}
 */
export function getRandomDisassembleWord() {
  if (DISASSEMBLE_WORDS.length === 0) {
    return 'مدرسة';
  }

  if (DISASSEMBLE_WORDS.length === 1) {
    return DISASSEMBLE_WORDS[0];
  }

  let index = Math.floor(Math.random() * DISASSEMBLE_WORDS.length);
  while (index === lastSelectedIndex) {
    index = Math.floor(Math.random() * DISASSEMBLE_WORDS.length);
  }

  lastSelectedIndex = index;
  return DISASSEMBLE_WORDS[index];
}

/**
 * Disassembles an Arabic word into space-separated characters.
 * @param {string} word 
 * @returns {string}
 */
export function getDisassembledAnswer(word) {
  if (!word) return '';
  return word.trim().replace(/[\u064B-\u0652]/g, '').split('').join(' ');
}

/**
 * Normalizes user input for comparison against expected disassembled string.
 * Trims extra spaces and removes Arabic tashkeel.
 * @param {string} input 
 * @returns {string}
 */
export function normalizeDisassembleText(input) {
  if (!input) return '';
  return input
    .trim()
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/\s+/g, ' ');
}
