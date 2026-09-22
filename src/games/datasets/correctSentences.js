/**
 * Dataset for لعبة "صحح" (Correct Spelling Error Game)
 * Arabic sentences containing exactly ONE clear, unambiguous spelling or orthographic error.
 */

export const CORRECT_SENTENCES_DATASET = [
  {
    id: 1,
    incorrect: "ذهبت الى المدرسه مع صديقي",
    correct: "ذهبت إلى المدرسة مع صديقي",
    explanation: "الهمزة في (إلى) والتاء المربوطة في (المدرسة)"
  },
  {
    id: 2,
    incorrect: "ذهب احمد إلى المسجد لأداء الصلاة",
    correct: "ذهب أحمد إلى المسجد لأداء الصلاة",
    explanation: "همزة القطع في كلمة (أحمد)"
  },
  {
    id: 3,
    incorrect: "إن القراءه تغذي العقل والروح",
    correct: "إن القراءة تغذي العقل والروح",
    explanation: "كتابة الهمزة المفتوحة بعد الألف على السطر (القراءة)"
  },
  {
    id: 4,
    incorrect: "هدا اليوم جميل ومشرق جداً",
    correct: "هذا اليوم جميل ومشرق جداً",
    explanation: "كتابة الذال في اسم الإشارة (هذا)"
  },
  {
    id: 5,
    incorrect: "نجح الطالب لاكنه لم يحتفل بعد",
    correct: "نجح الطالب لكنه لم يحتفل بعد",
    explanation: "عدم كتابة الألف الزائدة في كلمة (لكنه)"
  },
  {
    id: 6,
    incorrect: "استمعت الى نصيحة أستاذي العزيز",
    correct: "استمعت إلى نصيحة أستاذي العزيز",
    explanation: "همزة القطع في حرف الجر (إلى)"
  },
  {
    id: 7,
    incorrect: "سافرت الى مكه المكرمه في العطله",
    correct: "سافرت إلى مكة المكرمة في العطلة",
    explanation: "التاء المربوطة في (مكة المكرمة العطلة)"
  },
  {
    id: 8,
    incorrect: "المعلم يثني على الطلاب المجتهدون",
    correct: "المعلم يثني على الطلاب المجتهدين",
    explanation: "جمع المذكر السالم مجرور بالياء (المجتهدين)"
  },
  {
    id: 9,
    incorrect: "شربت الماء البارد مساءا",
    correct: "شربت الماء البارد مساءً",
    explanation: "تنوين الفتح على الهمزة المسبوقة بألف لا يتبعه ألف (مساءً)"
  },
  {
    id: 10,
    incorrect: "كتب الطالب الواجب ببطئ شديد",
    correct: "كتب الطالب الواجب ببطء شديد",
    explanation: "كتابة الهمزة المتطرفة على السطر بعد ساكن (ببطء)"
  },
  {
    id: 11,
    incorrect: "هؤلاء الطلاب يحرصون على القراءه",
    correct: "هؤلاء الطلاب يحرصون على القراءة",
    explanation: "الهمزة المفتوحة بعد الألف (القراءة)"
  },
  {
    id: 12,
    incorrect: "المسلم يبتدئ يومه بذكر الله تعالى",
    correct: "المسلم يبدأ يومه بذكر الله تعالى",
    explanation: "تصحيح الفعل (يبدأ) بهزة متطرفة على الألف"
  },
  {
    id: 13,
    incorrect: "إن الله غفور رحيم للعباد",
    correct: "إن الله غفور رحيم بالعباد",
    explanation: "استخدام حرف الجر المناسب (بالعباد)"
  },
  {
    id: 14,
    incorrect: "قرأت قصه ممتعة في المكتبة",
    correct: "قرأتقصة ممتعة في المكتبة",
    explanation: "التاء المربوطة في كلمة (قصة)"
  },
  {
    id: 15,
    incorrect: "حضرت المعلمة الى الفصل مبكراً",
    correct: "حضرت المعلمة إلى الفصل مبكراً",
    explanation: "همزة القطع في (إلى)"
  },
  {
    id: 16,
    incorrect: "سالت أستاذي عن المسألة الصعبة",
    correct: "سألت أستاذي عن المسألة الصعبة",
    explanation: "كتابة الهمزة المتوسطة المفتوحة على الألف (سألت)"
  },
  {
    id: 17,
    incorrect: "الصدق صفه حميدة يبتغي بها المؤمن الجنة",
    correct: "الصدق صفة حميدة يبتغي بها المؤمن الجنة",
    explanation: "التاء المربوطة في كلمة (صفة)"
  },
  {
    id: 18,
    incorrect: "العلماء هم ورثه الأنبياء",
    correct: "العلماء هم ورثة الأنبياء",
    explanation: "التاء المربوطة في كلمة (ورثة)"
  },
  {
    id: 19,
    incorrect: "عليك ان تحترم الآخرين دائماً",
    correct: "عليك أن تحترم الآخرين دائماً",
    explanation: "همزة القطع في (أن)"
  },
  {
    id: 20,
    incorrect: "العلم نور والجهل ظلام خيم على الأمه",
    correct: "العلم نور والجهل ظلام خيم على الأمة",
    explanation: "التاء المربوطة في كلمة (الأمة)"
  },
  {
    id: 21,
    incorrect: "هدا القلم يخص أخي الأصغر",
    correct: "هذا القلم يخص أخي الأصغر",
    explanation: "كتابة اسم الإشارة بالذال (هذا)"
  },
  {
    id: 22,
    incorrect: "أكل الولد تفاحه طازجة",
    correct: "أكل الولد تفاحة طازجة",
    explanation: "التاء المربوطة في (تفاحة)"
  },
  {
    id: 23,
    incorrect: "الرياضة مفيده للجسم والعقل",
    correct: "الرياضة مفيدة للجسم والعقل",
    explanation: "التاء المربوطة في (مفيدة)"
  },
  {
    id: 24,
    incorrect: "رأيت القاضي في محكمه المدينة",
    correct: "رأيت القاضي في محكمة المدينة",
    explanation: "التاء المربوطة في (محكمة)"
  },
  {
    id: 25,
    incorrect: "شاهدت مباراه حماسية مساء أمس",
    correct: "شاهدت مباراة حماسية مساء أمس",
    explanation: "التاء المربوطة في كلمة (مباراة)"
  }
];

/**
 * Normalizes a sentence for comparison:
 * - Trims extra spaces
 * - Collapses multiple spaces into one space
 * - Strips tashkeel / diacritics
 * @param {string} text 
 * @returns {string}
 */
export function normalizeCorrectSentence(text) {
  if (!text) return '';
  return text
    .trim()
    .replace(/[\u064B-\u0652]/g, '') // strip tashkeel
    .replace(/\s+/g, ' '); // collapse multiple spaces
}

/**
 * Returns a random sentence pair from the dataset
 * @returns {{ id: number, incorrect: string, correct: string, explanation?: string }}
 */
export function getRandomCorrectSentence() {
  const index = Math.floor(Math.random() * CORRECT_SENTENCES_DATASET.length);
  return CORRECT_SENTENCES_DATASET[index];
}

export default {
  CORRECT_SENTENCES_DATASET,
  normalizeCorrectSentence,
  getRandomCorrectSentence,
};
