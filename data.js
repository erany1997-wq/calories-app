// Food Database - values per 100g / 100ml
const FOOD_DB = [
  // ===== חלבונים =====
  {
    id: "f001", name: "חזה עוף מבושל", category: "protein", emoji: "🍗",
    per100: { cal: 165, protein: 31, carbs: 0, fat: 3.6 }
  },
  {
    id: "f002", name: "חזה עוף צלוי", category: "protein", emoji: "🍗",
    per100: { cal: 185, protein: 35, carbs: 0, fat: 4 }
  },
  {
    id: "f003", name: "סטייק בקר רזה", category: "protein", emoji: "🥩",
    per100: { cal: 217, protein: 26, carbs: 0, fat: 12 }
  },
  {
    id: "f004", name: "שמינית טונה בשמן (יבשה)", category: "protein", emoji: "🐟",
    per100: { cal: 198, protein: 30, carbs: 0, fat: 8.2 }
  },
  {
    id: "f005", name: "טונה במים", category: "protein", emoji: "🐟",
    per100: { cal: 116, protein: 25.5, carbs: 0, fat: 0.8 }
  },
  {
    id: "f006", name: "ביצה שלמה", category: "protein", emoji: "🥚",
    per100: { cal: 155, protein: 13, carbs: 1.1, fat: 11 }
  },
  {
    id: "f007", name: "חלבון ביצה", category: "protein", emoji: "🥚",
    per100: { cal: 52, protein: 11, carbs: 0.7, fat: 0.2 }
  },
  {
    id: "f008", name: "סלמון", category: "protein", emoji: "🐟",
    per100: { cal: 208, protein: 20, carbs: 0, fat: 13 }
  },
  {
    id: "f009", name: "שייק חלבון (ממוצע)", category: "protein", emoji: "💪",
    per100: { cal: 120, protein: 25, carbs: 4, fat: 1.5 }
  },
  {
    id: "f010", name: "קוטג' 3%", category: "protein", emoji: "🫙",
    per100: { cal: 83, protein: 11, carbs: 2.8, fat: 3 }
  },
  {
    id: "f011", name: "טופו מוצק", category: "protein", emoji: "🌱",
    per100: { cal: 76, protein: 8, carbs: 1.9, fat: 4.2 }
  },
  {
    id: "f012", name: "שניצל עוף מטוגן", category: "protein", emoji: "🍗",
    per100: { cal: 258, protein: 21, carbs: 14, fat: 13 }
  },
  {
    id: "f013", name: "עוף שלם צלוי עם עור", category: "protein", emoji: "🍗",
    per100: { cal: 239, protein: 27, carbs: 0, fat: 14 }
  },
  {
    id: "f014", name: "דג דניס/לברק", category: "protein", emoji: "🐟",
    per100: { cal: 128, protein: 24, carbs: 0, fat: 3.5 }
  },
  {
    id: "f015", name: "חמוצי בשר (ספגטי בולונז)", category: "protein", emoji: "🍝",
    per100: { cal: 140, protein: 9, carbs: 12, fat: 6 }
  },

  // ===== מוצרי חלב =====
  {
    id: "d001", name: "יוגורט חלבון", category: "dairy", emoji: "🥛",
    per100: { cal: 62, protein: 10, carbs: 4, fat: 0.2 }
  },
  {
    id: "d002", name: "יוגורט יווני 0%", category: "dairy", emoji: "🥛",
    per100: { cal: 59, protein: 10, carbs: 3.6, fat: 0.4 }
  },
  {
    id: "d003", name: "יוגורט יווני 5%", category: "dairy", emoji: "🥛",
    per100: { cal: 97, protein: 9, carbs: 3.6, fat: 5 }
  },
  {
    id: "d004", name: "חלב 1%", category: "dairy", emoji: "🥛",
    per100: { cal: 46, protein: 3.4, carbs: 5, fat: 1 }
  },
  {
    id: "d005", name: "גבינה צהובה 9%", category: "dairy", emoji: "🧀",
    per100: { cal: 240, protein: 25, carbs: 2, fat: 14 }
  },
  {
    id: "d006", name: "גבינה צהובה 28%", category: "dairy", emoji: "🧀",
    per100: { cal: 352, protein: 25, carbs: 2, fat: 27 }
  },
  {
    id: "d007", name: "גבינה לבנה 5%", category: "dairy", emoji: "🫙",
    per100: { cal: 101, protein: 12, carbs: 3.6, fat: 5 }
  },
  {
    id: "d008", name: "גבינה לבנה 9%", category: "dairy", emoji: "🫙",
    per100: { cal: 140, protein: 11.5, carbs: 3.4, fat: 9 }
  },
  {
    id: "d009", name: "קפיר 1.5%", category: "dairy", emoji: "🥛",
    per100: { cal: 52, protein: 3.3, carbs: 5.5, fat: 1.5 }
  },
  {
    id: "d010", name: "שמנת 15%", category: "dairy", emoji: "🫙",
    per100: { cal: 162, protein: 2.7, carbs: 3.6, fat: 15 }
  },

  // ===== פחמימות =====
  {
    id: "c001", name: "פסטה מבושלת", category: "carbs", emoji: "🍝",
    per100: { cal: 131, protein: 5, carbs: 25, fat: 1.1 }
  },
  {
    id: "c002", name: "פסטה יבשה", category: "carbs", emoji: "🍝",
    per100: { cal: 371, protein: 13, carbs: 75, fat: 1.5 }
  },
  {
    id: "c003", name: "אורז לבן מבושל", category: "carbs", emoji: "🍚",
    per100: { cal: 130, protein: 2.7, carbs: 28, fat: 0.3 }
  },
  {
    id: "c004", name: "אורז מלא מבושל", category: "carbs", emoji: "🍚",
    per100: { cal: 112, protein: 2.6, carbs: 23, fat: 0.9 }
  },
  {
    id: "c005", name: "לחם לבן", category: "carbs", emoji: "🍞",
    per100: { cal: 265, protein: 9, carbs: 51, fat: 3.2 }
  },
  {
    id: "c006", name: "לחם מחיטה מלאה", category: "carbs", emoji: "🍞",
    per100: { cal: 247, protein: 10, carbs: 43, fat: 4.2 }
  },
  {
    id: "c007", name: "בטטה מבושלת", category: "carbs", emoji: "🍠",
    per100: { cal: 86, protein: 1.6, carbs: 20, fat: 0.1 }
  },
  {
    id: "c008", name: "תפוח אדמה מבושל", category: "carbs", emoji: "🥔",
    per100: { cal: 77, protein: 2, carbs: 17, fat: 0.1 }
  },
  {
    id: "c009", name: "קוואקר / שיבולת שועל", category: "carbs", emoji: "🥣",
    per100: { cal: 389, protein: 17, carbs: 66, fat: 7 }
  },
  {
    id: "c010", name: "קינואה מבושלת", category: "carbs", emoji: "🌾",
    per100: { cal: 120, protein: 4.4, carbs: 21.3, fat: 1.9 }
  },
  {
    id: "c011", name: "בורגול מבושל", category: "carbs", emoji: "🌾",
    per100: { cal: 83, protein: 3.1, carbs: 18.6, fat: 0.2 }
  },
  {
    id: "c012", name: "פיתה", category: "carbs", emoji: "🫓",
    per100: { cal: 275, protein: 9, carbs: 55, fat: 1.2 }
  },

  // ===== ירקות ופירות =====
  {
    id: "v001", name: "מלפפון", category: "veggies", emoji: "🥒",
    per100: { cal: 15, protein: 0.7, carbs: 3.6, fat: 0.1 }
  },
  {
    id: "v002", name: "עגבנייה", category: "veggies", emoji: "🍅",
    per100: { cal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 }
  },
  {
    id: "v003", name: "חסה", category: "veggies", emoji: "🥬",
    per100: { cal: 15, protein: 1.4, carbs: 2.9, fat: 0.2 }
  },
  {
    id: "v004", name: "פלפל", category: "veggies", emoji: "🫑",
    per100: { cal: 31, protein: 1, carbs: 6, fat: 0.3 }
  },
  {
    id: "v005", name: "גזר", category: "veggies", emoji: "🥕",
    per100: { cal: 41, protein: 0.9, carbs: 10, fat: 0.2 }
  },
  {
    id: "v006", name: "ברוקולי", category: "veggies", emoji: "🥦",
    per100: { cal: 34, protein: 2.8, carbs: 7, fat: 0.4 }
  },
  {
    id: "v007", name: "תרד", category: "veggies", emoji: "🥬",
    per100: { cal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 }
  },
  {
    id: "v008", name: "תפוח", category: "veggies", emoji: "🍎",
    per100: { cal: 52, protein: 0.3, carbs: 14, fat: 0.2 }
  },
  {
    id: "v009", name: "בננה", category: "veggies", emoji: "🍌",
    per100: { cal: 89, protein: 1.1, carbs: 23, fat: 0.3 }
  },
  {
    id: "v010", name: "תפוז", category: "veggies", emoji: "🍊",
    per100: { cal: 47, protein: 0.9, carbs: 12, fat: 0.1 }
  },
  {
    id: "v011", name: "אבוקדו", category: "veggies", emoji: "🥑",
    per100: { cal: 160, protein: 2, carbs: 9, fat: 15 }
  },
  {
    id: "v012", name: "תמר מג'הול", category: "veggies", emoji: "🌴",
    per100: { cal: 282, protein: 2, carbs: 75, fat: 0.4 }
  },

  // ===== שומנים =====
  {
    id: "fat001", name: "שמן זית", category: "fats", emoji: "🫒",
    per100: { cal: 884, protein: 0, carbs: 0, fat: 100 }
  },
  {
    id: "fat002", name: "חמאת בוטנים טבעית", category: "fats", emoji: "🥜",
    per100: { cal: 588, protein: 25, carbs: 20, fat: 50 }
  },
  {
    id: "fat003", name: "שקדים", category: "fats", emoji: "🫘",
    per100: { cal: 579, protein: 21, carbs: 22, fat: 50 }
  },
  {
    id: "fat004", name: "אגוזי מלך", category: "fats", emoji: "🫘",
    per100: { cal: 654, protein: 15, carbs: 14, fat: 65 }
  },
  {
    id: "fat005", name: "טחינה גולמית", category: "fats", emoji: "🌰",
    per100: { cal: 570, protein: 17, carbs: 26, fat: 48 }
  },
  {
    id: "fat006", name: "חומוס מוכן", category: "fats", emoji: "🥙",
    per100: { cal: 166, protein: 8.9, carbs: 14, fat: 9.6 }
  },

  // ===== אחר =====
  {
    id: "o001", name: "קפה שחור", category: "other", emoji: "☕",
    per100: { cal: 2, protein: 0.3, carbs: 0, fat: 0 }
  },
  {
    id: "o002", name: "חלב שקדים לא ממותק", category: "other", emoji: "🥛",
    per100: { cal: 15, protein: 0.5, carbs: 0.3, fat: 1.2 }
  },
  {
    id: "o003", name: "שוקולד מריר 85%", category: "other", emoji: "🍫",
    per100: { cal: 598, protein: 8, carbs: 46, fat: 43 }
  },
  {
    id: "o004", name: "פלאפל (כדור)", category: "other", emoji: "🧆",
    per100: { cal: 333, protein: 13, carbs: 31, fat: 18 }
  },
  {
    id: "o005", name: "שקשוקה", category: "other", emoji: "🍳",
    per100: { cal: 85, protein: 5, carbs: 6, fat: 4.5 }
  }
];

const CATEGORY_LABELS = {
  protein: "חלבונים",
  dairy: "מוצרי חלב",
  carbs: "פחמימות",
  veggies: "ירקות ופירות",
  fats: "שומנים ואגוזים",
  other: "אחר"
};

const CATEGORY_ORDER = ["protein", "dairy", "carbs", "veggies", "fats", "other"];
