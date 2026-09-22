/**
 * Central Game Registry for جعفر Bot
 * Contains metadata, commands, game types, and availability status.
 * All game listings and help commands reference this single source of truth.
 */

/**
 * @typedef {'solo' | 'multiplayer'} GameType
 * @typedef {'available' | 'upcoming'} GameStatus
 * 
 * @typedef {Object} GameEntry
 * @property {string} id - Unique game identifier
 * @property {string} name - Game display name in Arabic
 * @property {string} emoji - Icon/Emoji representing the game
 * @property {string} command - Primary chat command (e.g. !اعكس)
 * @property {string} [slashCommand] - Slash command (e.g. /reverse)
 * @property {GameType} type - 'solo' (فردية) or 'multiplayer' (جماعية)
 * @property {GameStatus} status - 'available' (متاحة) or 'upcoming' (قادمة)
 * @property {string} [description] - Brief description of game mechanics
 */

export const GAME_REGISTRY = [
  // ==========================================
  // 🎯 ألعاب فردية (Solo Games)
  // ==========================================
  {
    id: 'button',
    name: 'زر',
    emoji: '🔘',
    command: '!زر',
    slashCommand: '/button',
    type: 'solo',
    status: 'available',
    description: 'الضغط السريع على الزر الصحيح',
  },
  {
    id: 'fastest',
    name: 'أسرع',
    emoji: '⚡',
    command: '!اسرع',
    slashCommand: '/اسرع',
    type: 'solo',
    status: 'available',
    description: 'أسرع كتابة للنص المطلوب',
  },
  {
    id: 'disassemble',
    name: 'فكك',
    emoji: '🔄',
    command: '!فكك',
    slashCommand: '/فكك',
    type: 'solo',
    status: 'available',
    description: 'تفكيك الكلمة إلى حروف متباعدة',
  },
  {
    id: 'merge',
    name: 'ادمج',
    emoji: '🧩',
    command: '!ادمج',
    slashCommand: '/ادمج',
    type: 'solo',
    status: 'upcoming',
    description: 'دمج الحروف المبعثرة لتكوين الكلمة',
  },
  {
    id: 'flags',
    name: 'أعلام',
    emoji: '🚩',
    command: '!اعلام',
    slashCommand: '/flags',
    type: 'solo',
    status: 'available',
    description: 'تخمين الدولة من صورة علمها بدقة عالية',
  },
  {
    id: 'reverse',
    name: 'اعكس',
    emoji: '🔃',
    command: '!اعكس',
    slashCommand: '/reverse',
    type: 'solo',
    status: 'available',
    description: 'كتابة الكلمة العربية بالعكس حرفاً بحرف',
  },
  {
    id: 'harf',
    name: 'حرف',
    emoji: '🔤',
    command: '!حرف',
    slashCommand: '/harf',
    type: 'solo',
    status: 'available',
    description: 'ذكر كلمة تبدأ بالحرف المطلوب وضمن التصنيف المحدد',
  },
  {
    id: 'correct',
    name: 'صحح',
    emoji: '✏️',
    command: '!صحح',
    slashCommand: '/صحح',
    type: 'solo',
    status: 'available',
    description: 'تصحيح الخطأ الإملائي في الجملة',
  },
  {
    id: 'order',
    name: 'ترتيب',
    emoji: '🔢',
    command: '!ترتيب',
    slashCommand: '/ترتيب',
    type: 'solo',
    status: 'upcoming',
    description: 'ترتيب الأرقام أو الكلمات بالشكل الصحيح',
  },
  {
    id: 'colors',
    name: 'ألوان',
    emoji: '🎨',
    command: '!الوان',
    slashCommand: '/الوان',
    type: 'solo',
    status: 'upcoming',
    description: 'معرفة اللون الحقيقي المكتوب أو المعروض',
  },
  {
    id: 'emoji',
    name: 'إيموجي',
    emoji: '😀',
    command: '!ايموجي',
    slashCommand: '/ايموجي',
    type: 'solo',
    status: 'upcoming',
    description: 'تخمين المثل أو الكلمة من الإيموجي',
  },
  {
    id: 'reveal',
    name: 'اكشف',
    emoji: '👀',
    command: '!اكشف',
    slashCommand: '/اكشف',
    type: 'solo',
    status: 'upcoming',
    description: 'كشف الصورة المخفية تدريجياً',
  },

  // ==========================================
  // 🎮 ألعاب جماعية (Multiplayer Games)
  // ==========================================
  {
    id: 'roulette',
    name: 'روليت',
    emoji: '🎰',
    command: '!روليت',
    slashCommand: '/روليت',
    type: 'multiplayer',
    status: 'available',
    description: 'لعبة حظ جماعية بعجلة تفاعلية بالأزرار',
    minPlayers: 4,
    maxPlayers: 12,
  },
  {
    id: 'xo',
    name: 'XO',
    emoji: '❌⭕',
    command: '!xo',
    slashCommand: '/xo',
    type: 'multiplayer',
    status: 'available',
    description: 'مباراة تيك تاك تو ثنائية تفاعلية بأزرار ديسكورد',
  },
  {
    id: 'mafia',
    name: 'مافيا',
    emoji: '🔪',
    command: '!مافيا',
    slashCommand: '/مافيا',
    type: 'multiplayer',
    status: 'available',
    description: 'لعبة المافيا والتحقيق والتصويت الجماعي',
  },
  {
    id: 'chairs',
    name: 'كراسي',
    emoji: '🪑',
    command: '!كراسي',
    slashCommand: '/كراسي',
    type: 'multiplayer',
    status: 'available',
    description: 'لعبة الكراسي الموسيقية التفاعلية بالأزرار',
  },
  {
    id: 'rps',
    name: 'حجرة',
    emoji: '🪨',
    command: '!حجرة',
    slashCommand: '/حجرة',
    type: 'multiplayer',
    status: 'upcoming',
    description: 'حجرة ورقة مقص ضد لاعب آخر',
  },
  {
    id: 'dice',
    name: 'نرد',
    emoji: '🎲',
    command: '!نرد',
    slashCommand: '/نرد',
    type: 'multiplayer',
    status: 'upcoming',
    description: 'رمي النرد والمنافسة على أعلى رقم',
  },
  {
    id: 'wheel',
    name: 'عجلة',
    emoji: '🎡',
    command: '!عجلة',
    slashCommand: '/عجلة',
    type: 'multiplayer',
    status: 'upcoming',
    description: 'عجلة الحظ والجوائز العشوائية',
  },
  {
    id: 'hotxo',
    name: 'HOTXO',
    emoji: '🔥',
    command: '!hotxo',
    slashCommand: '/hotxo',
    type: 'multiplayer',
    status: 'upcoming',
    description: 'نسخة سريعة ومثيرة من لعبة XO',
  },
  {
    id: 'hide_and_seek',
    name: 'غميضة',
    emoji: '🙈',
    command: '!غميضة',
    slashCommand: '/غميضة',
    type: 'multiplayer',
    status: 'available',
    description: 'لعبة الغميضة والبحث عن المختبئين',
  },
  {
    id: 'replica',
    name: 'ريبلكا',
    emoji: '🗣️',
    command: '!ريبلكا',
    slashCommand: '/ريبلكا',
    type: 'multiplayer',
    status: 'upcoming',
    description: 'لعبة المحاكاة وتكرار العبارات',
  },
  {
    id: 'guess_number',
    name: 'خمن الرقم',
    emoji: '🎯',
    command: '!خمن',
    slashCommand: '/guess',
    type: 'solo',
    status: 'available',
    description: 'تخمين الرقم السري بين 1 و 100 مع توجيهات (أكبر / أصغر)',
  },
  {
    id: 'drawing',
    name: 'رسمة',
    emoji: '🎨',
    command: '!رسمة',
    slashCommand: '/رسمة',
    type: 'multiplayer',
    status: 'upcoming',
    description: 'تخمين الرسمة والكلمة المعبرة عنها',
  },
  {
    id: 'word',
    name: 'كلمة',
    emoji: '📝',
    command: '!كلمة',
    slashCommand: '/كلمة',
    type: 'multiplayer',
    status: 'upcoming',
    description: 'سلسلة الكلمات وتناقل الحروف بين اللاعبين',
  },
];

/**
 * Get all games in the registry
 * @returns {GameEntry[]}
 */
export function getAllGames() {
  return [...GAME_REGISTRY];
}

/**
 * Get only currently available / playable games
 * @returns {GameEntry[]}
 */
export function getAvailableGames() {
  return GAME_REGISTRY.filter((game) => game.status === 'available');
}

/**
 * Get games filtered by type and optional status
 * @param {GameType} type - 'solo' | 'multiplayer'
 * @param {GameStatus} [status] - 'available' | 'upcoming'
 * @returns {GameEntry[]}
 */
export function getGamesByType(type, status = null) {
  return GAME_REGISTRY.filter((game) => {
    const matchType = game.type === type;
    const matchStatus = status ? game.status === status : true;
    return matchType && matchStatus;
  });
}

/**
 * Register or update a game in the registry
 * @param {GameEntry} gameData 
 */
export function registerGame(gameData) {
  const index = GAME_REGISTRY.findIndex((g) => g.id === gameData.id);
  if (index >= 0) {
    GAME_REGISTRY[index] = { ...GAME_REGISTRY[index], ...gameData };
  } else {
    GAME_REGISTRY.push(gameData);
  }
}

/**
 * Update the status of a game
 * @param {string} id 
 * @param {GameStatus} status 
 */
export function setGameStatus(id, status) {
  const game = GAME_REGISTRY.find((g) => g.id === id);
  if (game) {
    game.status = status;
    return true;
  }
  return false;
}

export default {
  registry: GAME_REGISTRY,
  getAllGames,
  getAvailableGames,
  getGamesByType,
  registerGame,
  setGameStatus,
};
