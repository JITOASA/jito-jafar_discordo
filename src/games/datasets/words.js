/**
 * Arabic Words & Phrases Dataset for لعبة "اعكس" (Reverse Game)
 * Includes diverse single words, compound phrases, and cultural idioms.
 */

export const ARABIC_WORDS = [
  // Easy / Common (3-5 letters)
  { word: 'قلم', category: 'أدوات', difficulty: 'سهل' },
  { word: 'كتاب', category: 'ثقافة', difficulty: 'سهل' },
  { word: 'نجمة', category: 'فضاء', difficulty: 'سهل' },
  { word: 'قمر', category: 'فضاء', difficulty: 'سهل' },
  { word: 'شمس', category: 'طبيعة', difficulty: 'سهل' },
  { word: 'بحر', category: 'طبيعة', difficulty: 'سهل' },
  { word: 'سماء', category: 'طبيعة', difficulty: 'سهل' },
  { word: 'صحراء', category: 'طبيعة', difficulty: 'سهل' },
  { word: 'قهوة', category: 'مشروبات', difficulty: 'سهل' },
  { word: 'تمر', category: 'طعام', difficulty: 'سهل' },
  { word: 'صقر', category: 'طيور', difficulty: 'سهل' },
  { word: 'جمل', category: 'حيوانات', difficulty: 'سهل' },
  { word: 'فرس', category: 'حيوانات', difficulty: 'سهل' },
  { word: 'ذهب', category: 'معادن', difficulty: 'سهل' },
  { word: 'فضة', category: 'معادن', difficulty: 'سهل' },
  { word: 'مسجد', category: 'معالم', difficulty: 'سهل' },
  { word: 'شجرة', category: 'طبيعة', difficulty: 'سهل' },
  { word: 'وردة', category: 'نباتات', difficulty: 'سهل' },
  { word: 'مطر', category: 'طقس', difficulty: 'سهل' },
  { word: 'ثلج', category: 'طقس', difficulty: 'سهل' },

  // Medium (5-7 letters)
  { word: 'مستقبل', category: 'مفاهيم', difficulty: 'متوسط' },
  { word: 'حاسوب', category: 'تقنية', difficulty: 'متوسط' },
  { word: 'برمجة', category: 'تقنية', difficulty: 'متوسط' },
  { word: 'فراشة', category: 'حشرات', difficulty: 'متوسط' },
  { word: 'طائرة', category: 'مواصلات', difficulty: 'متوسط' },
  { word: 'سيارة', category: 'مواصلات', difficulty: 'متوسط' },
  { word: 'نافذة', category: 'أثاث', difficulty: 'متوسط' },
  { word: 'مكتبة', category: 'أماكن', difficulty: 'متوسط' },
  { word: 'مستشفى', category: 'أماكن', difficulty: 'متوسط' },
  { word: 'مهندس', category: 'مهن', difficulty: 'متوسط' },
  { word: 'طبيبة', category: 'مهن', difficulty: 'متوسط' },
  { word: 'معلمة', category: 'مهن', difficulty: 'متوسط' },
  { word: 'جزيرة', category: 'جغرافيا', difficulty: 'متوسط' },
  { word: 'شلالات', category: 'جغرافيا', difficulty: 'متوسط' },
  { word: 'كهرباء', category: 'علوم', difficulty: 'متوسط' },
  { word: 'مغناطيس', category: 'علوم', difficulty: 'متوسط' },
  { word: 'أوركسترا', category: 'فنون', difficulty: 'متوسط' },
  { word: 'قصيدة', category: 'أدب', difficulty: 'متوسط' },
  { word: 'رواية', category: 'أدب', difficulty: 'متوسط' },
  { word: 'مروحة', category: 'أجهزة', difficulty: 'متوسط' },

  // Challenging / Long words & Short Phrases
  { word: 'سفينة الصحراء', category: 'ألقاب', difficulty: 'تحدي' },
  { word: 'قهوة عربية', category: 'تراث', difficulty: 'تحدي' },
  { word: 'شمس ساطعة', category: 'طبيعة', difficulty: 'تحدي' },
  { word: 'بيت الشعر', category: 'تراث', difficulty: 'تحدي' },
  { word: 'هلال رمضان', category: 'مناسبات', difficulty: 'تحدي' },
  { word: 'نخيل البصرة', category: 'معالم', difficulty: 'تحدي' },
  { word: 'برج العرب', category: 'معالم', difficulty: 'تحدي' },
  { word: 'اهرامات الجيزة', category: 'معالم', difficulty: 'تحدي' },
  { word: 'قصر الحمراء', category: 'تاريخ', difficulty: 'تحدي' },
  { word: 'تاج محل', category: 'معالم', difficulty: 'تحدي' },
  { word: 'اسطرلاب', category: 'تاريخ', difficulty: 'تحدي' },
  { word: 'خوارزمية', category: 'علوم', difficulty: 'تحدي' },
  { word: 'ذكاء اصطناعي', category: 'تقنية', difficulty: 'تحدي' },
  { word: 'رائد فضاء', category: 'وظائف', difficulty: 'تحدي' },
  { word: 'سيمفونية', category: 'موسيقى', difficulty: 'تحدي' },
];

/**
 * Returns a random Arabic word or phrase for the reverse game
 */
export function getRandomReverseWord() {
  const index = Math.floor(Math.random() * ARABIC_WORDS.length);
  return ARABIC_WORDS[index];
}

export default ARABIC_WORDS;
