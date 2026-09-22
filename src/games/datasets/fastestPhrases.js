/**
 * Rich set of Arabic phrases and sentences for "⚡ أسرع" (Fastest Writing Game)
 * Easy to type on keyboards, diverse, non-repeating.
 */

export const FASTEST_PHRASES = [
  'جعفر بوت الألعاب الأسرع والأفضل في ديسكورد',
  'العقل السليم في الجسم السليم',
  'من جد وجد ومن زرع حصد',
  'الصبر مفتاح الفرج والنجاح',
  'خير الكلام ما قل ودل',
  'الاتحاد قوة والتفرق ضعف',
  'الوقت كالسيف إن لم تقطعه قطعك',
  'لا تؤجل عمل اليوم إلى الغد',
  'العلم نور والجهل تاريك',
  'الكلمة الطيبة صدقة',
  'من طلب العلا سهر الليالي',
  'حب الوطن من الإيمان',
  'الجمال جمال الروح والأخلاق',
  'رحلة الألف ميل تبدأ بطلب خطوة',
  'رب همة أحيت أمة',
  'العمل العظيم يحتاج إلى شغف',
  'الابتسامة بوجه أخيك صدقة',
  'القراءة تغذي العقل والروح',
  'النجاح يحتاج إلى الإصرار والمثابرة',
  'الصداقة كنز لا يفنى',
  'السرعة والتقنية معاً في تجربة واحدة',
  'رمضان كريم وكل عام وأنتم بخير',
  'المعرفة قوة والتطبيق نجاح',
  'الخطأ طريق التعلم والتطوير',
  'سبحان الله وبحمده سبحان الله العظيم',
  'الحمد لله على كل حال وفي كل وقت',
  'تفاءلوا بالخير تجدوه في طريقكم',
  'لا تحزن إن الله معنا',
  'كن بلسم إن صار دهرك أرقما',
  'سفر اللسان ينبيك عن عقل الإنسان',
];

let lastSelectedIndex = -1;

/**
 * Returns a random Arabic phrase for the fastest game, ensuring non-consecutive duplicates.
 * @returns {string}
 */
export function getRandomFastestPhrase() {
  if (FASTEST_PHRASES.length === 0) {
    return 'جعفر بوت الألعاب';
  }

  if (FASTEST_PHRASES.length === 1) {
    return FASTEST_PHRASES[0];
  }

  let index = Math.floor(Math.random() * FASTEST_PHRASES.length);
  while (index === lastSelectedIndex) {
    index = Math.floor(Math.random() * FASTEST_PHRASES.length);
  }

  lastSelectedIndex = index;
  return FASTEST_PHRASES[index];
}

export default {
  FASTEST_PHRASES,
  getRandomFastestPhrase,
};
