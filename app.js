/* ============================
   NUTRITION TRACKER PWA - app.js
   ============================ */

// ============ STATE ============
let profile = null;
let foodLog = []; // today's log
let customFoods = [];
let currentGoal = "lose";
let editingItemId = null;
let portionFood = null;
let todayKey = getTodayKey();

// ============ INIT ============
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  initRouter();
  initOnboarding();
  initDashboard();
  initFoodDB();
  initSettings();
  initModals();
  registerSW();
  checkDayRollover();
});

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function loadData() {
  try {
    const p = localStorage.getItem("profile");
    if (p) profile = JSON.parse(p);
    const fl = localStorage.getItem("foodLog_" + todayKey);
    if (fl) foodLog = JSON.parse(fl);
    const cf = localStorage.getItem("customFoods");
    if (cf) customFoods = JSON.parse(cf);
  } catch(e) { console.error(e); }
}

function saveData() {
  try {
    if (profile) localStorage.setItem("profile", JSON.stringify(profile));
    localStorage.setItem("foodLog_" + todayKey, JSON.stringify(foodLog));
    localStorage.setItem("customFoods", JSON.stringify(customFoods));
  } catch(e) {}
}

function checkDayRollover() {
  const key = getTodayKey();
  if (key !== todayKey) {
    todayKey = key;
    foodLog = [];
  }
}

// ============ CALCULATIONS ============
function calcBMR(p) {
  // Mifflin-St Jeor
  if (p.gender === "male") {
    return (10 * p.weight) + (6.25 * p.height) - (5 * p.age) + 5;
  } else {
    return (10 * p.weight) + (6.25 * p.height) - (5 * p.age) - 161;
  }
}

function calcTDEE(p) {
  return calcBMR(p) * parseFloat(p.activity);
}

function calcDailyCalorieTarget(p) {
  const tdee = calcTDEE(p);
  if (p.goal === "maintain") return Math.round(tdee);
  if (p.goal === "lose") {
    const kgPerMonth = parseFloat(p.monthlyChange) || 2;
    // 1 kg fat ≈ 7700 kcal, per day deficit:
    const dailyDeficit = (kgPerMonth * 7700) / 30;
    return Math.max(1200, Math.round(tdee - dailyDeficit));
  }
  if (p.goal === "gain") {
    const kgPerMonth = parseFloat(p.monthlyChange) || 1;
    const dailySurplus = (kgPerMonth * 7700) / 30;
    return Math.round(tdee + dailySurplus);
  }
  return Math.round(tdee);
}

function calcMacroTargets(target) {
  // Protein: 2g/kg bodyweight for lose/gain, 1.6 for maintain
  const proteinMultiplier = (profile && profile.goal !== "maintain") ? 2.0 : 1.6;
  const protein = profile ? Math.round(profile.weight * proteinMultiplier) : Math.round(target * 0.25 / 4);
  const fat = Math.round(target * 0.25 / 9);
  const carbs = Math.round((target - (protein * 4) - (fat * 9)) / 4);
  return { protein, carbs, fat };
}

// ============ ROUTER ============
function initRouter() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const screen = btn.dataset.screen;
      navigateTo(screen);
    });
  });
}

function navigateTo(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + screenId).classList.add("active");

  // Update nav buttons
  document.querySelectorAll(`.nav-btn[data-screen="${screenId}"]`).forEach(b => {
    document.querySelectorAll(".nav-btn").forEach(nb => nb.classList.remove("active"));
    document.querySelectorAll(`.nav-btn[data-screen="${screenId}"]`).forEach(nb => nb.classList.add("active"));
  });

  if (screenId === "dashboard") refreshDashboard();
  if (screenId === "history") renderHistory();
  if (screenId === "food-db") renderFoodDB();
  if (screenId === "settings") refreshSettings();
}

function showInitialScreen() {
  if (profile) {
    navigateTo("dashboard");
  } else {
    document.getElementById("screen-onboarding").classList.add("active");
  }
}

// ============ ONBOARDING ============
function initOnboarding() {
  // Goal tabs
  document.querySelectorAll("#screen-onboarding .goal-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("#screen-onboarding .goal-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentGoal = tab.dataset.goal;
      document.querySelectorAll("#screen-onboarding .goal-section").forEach(s => s.classList.add("hidden"));
      document.getElementById("goal-" + currentGoal)?.classList.remove("hidden");
    });
  });

  document.getElementById("btn-save-profile").addEventListener("click", saveProfile);

  // Check if we have a profile
  setTimeout(showInitialScreen, 100);
}

function saveProfile() {
  const age = parseInt(document.getElementById("ob-age").value);
  const gender = document.getElementById("ob-gender").value;
  const height = parseFloat(document.getElementById("ob-height").value);
  const weight = parseFloat(document.getElementById("ob-weight").value);
  const activity = document.getElementById("ob-activity").value;

  if (!age || !height || !weight) {
    showToast("אנא מלא את כל השדות הנדרשים");
    return;
  }

  const goal = document.querySelector("#screen-onboarding .goal-tab.active").dataset.goal;
  let monthlyChange = 2;
  if (goal === "lose") {
    monthlyChange = parseFloat(document.getElementById("ob-monthly-loss").value) || 2;
  } else if (goal === "gain") {
    monthlyChange = parseFloat(document.getElementById("ob-monthly-gain").value) || 1;
  }

  const targetWeight = parseFloat(document.getElementById("ob-target-weight").value) || null;
  const name = document.getElementById("ob-name").value.trim();

  profile = { name, age, gender, height, weight, activity, goal, monthlyChange, targetWeight };
  saveData();
  showToast("הפרופיל נשמר! 🎉");
  setTimeout(() => navigateTo("dashboard"), 400);
}

// ============ DASHBOARD ============
function initDashboard() {
  document.getElementById("btn-to-settings").addEventListener("click", () => navigateTo("settings"));
  document.getElementById("btn-open-add").addEventListener("click", () => openModal("modal-add-food"));
}

function refreshDashboard() {
  if (!profile) return;

  // Header
  const now = new Date();
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  document.getElementById("header-date").textContent =
    `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`;

  const hour = now.getHours();
  let greet = hour < 12 ? "בוקר טוב" : hour < 17 ? "צהריים טובים" : "ערב טוב";
  const name = profile.name ? `, ${profile.name}` : "";
  document.getElementById("header-greeting").textContent = greet + name + " 👋";

  // Calorie target
  const target = calcDailyCalorieTarget(profile);
  const totalEaten = foodLog.reduce((s, i) => s + i.cal, 0);
  const remaining = target - totalEaten;

  document.getElementById("stat-goal").textContent = target;
  document.getElementById("stat-eaten").textContent = totalEaten;
  document.getElementById("stat-burned").textContent = "—";

  // Ring
  const ringEl = document.getElementById("ring-fill");
  const remainingEl = document.getElementById("ring-remaining");
  const circumference = 2 * Math.PI * 85; // r=85
  const fraction = Math.min(totalEaten / target, 1);
  const offset = circumference * (1 - fraction);

  ringEl.style.strokeDasharray = circumference;
  ringEl.style.strokeDashoffset = offset;

  // Sync glow ring
  const glowEl = document.getElementById("ring-glow");
  if (glowEl) {
    glowEl.style.strokeDasharray = circumference;
    glowEl.style.strokeDashoffset = offset;
  }

  // Color state: ok → warn (80%) → over (100%+)
  const svgEl = document.querySelector(".calorie-ring");
  const pct = (totalEaten / target) * 100;

  if (remaining < 0) {
    ringEl.classList.add("over-budget");
    ringEl.classList.remove("warn-state");
    remainingEl.classList.add("over-budget");
    remainingEl.textContent = Math.abs(remaining);
    document.querySelector(".ring-label").textContent = "חריגה";
    svgEl?.classList.add("over-budget-ring");
    svgEl?.classList.remove("warn-state");
  } else if (pct >= 80) {
    ringEl.classList.add("warn-state");
    ringEl.classList.remove("over-budget");
    remainingEl.classList.remove("over-budget");
    remainingEl.textContent = remaining;
    document.querySelector(".ring-label").textContent = "נשאר";
    svgEl?.classList.add("warn-state");
    svgEl?.classList.remove("over-budget-ring");
  } else {
    ringEl.classList.remove("over-budget", "warn-state");
    remainingEl.classList.remove("over-budget");
    remainingEl.textContent = remaining;
    document.querySelector(".ring-label").textContent = "נשאר";
    svgEl?.classList.remove("over-budget-ring", "warn-state");
  }

  // Progress bar
  const fillEl = document.getElementById("progress-fill");
  const pctEl = document.getElementById("progress-pct");
  if (fillEl && pctEl) {
    const barPct = Math.min(Math.round(pct), 100);
    fillEl.style.width = barPct + "%";
    pctEl.textContent = Math.round(pct) + "%";
    fillEl.classList.remove("warn", "over");
    pctEl.classList.remove("warn", "over");
    if (pct > 100) { fillEl.classList.add("over"); pctEl.classList.add("over"); }
    else if (pct >= 80) { fillEl.classList.add("warn"); pctEl.classList.add("warn"); }
  }

  // Macros
  const macroTargets = calcMacroTargets(target);
  const totalProtein = foodLog.reduce((s, i) => s + (i.protein || 0), 0);
  const totalCarbs = foodLog.reduce((s, i) => s + (i.carbs || 0), 0);
  const totalFat = foodLog.reduce((s, i) => s + (i.fat || 0), 0);

  document.getElementById("val-protein").textContent = Math.round(totalProtein) + "g";
  document.getElementById("val-carbs").textContent = Math.round(totalCarbs) + "g";
  document.getElementById("val-fat").textContent = Math.round(totalFat) + "g";

  document.getElementById("bar-protein").style.width = Math.min(100, (totalProtein / macroTargets.protein) * 100) + "%";
  document.getElementById("bar-carbs").style.width = Math.min(100, (totalCarbs / macroTargets.carbs) * 100) + "%";
  document.getElementById("bar-fat").style.width = Math.min(100, (totalFat / macroTargets.fat) * 100) + "%";

  // Food log
  renderFoodLog();
}

function renderFoodLog() {
  const log = document.getElementById("food-log");
  const empty = document.getElementById("empty-log");
  document.getElementById("food-count").textContent = foodLog.length + " פריטים";

  if (foodLog.length === 0) {
    empty.style.display = "block";
    // Remove all items except empty
    Array.from(log.children).forEach(c => {
      if (c.id !== "empty-log") c.remove();
    });
    return;
  }

  empty.style.display = "none";
  log.innerHTML = '<div id="empty-log" style="display:none"></div>';

  foodLog.forEach(item => {
    const el = document.createElement("div");
    el.className = "food-item";
    el.dataset.id = item.id;
    el.innerHTML = `
      <div class="food-item-icon"><i class="fa-solid fa-bowl-food"></i></div>
      <div class="food-item-info">
        <div class="food-item-name">${item.name}</div>
        <div class="food-item-meta">${item.unitLabel || item.amount+'ג\''} · חלבון: ${Math.round(item.protein||0)}g · פחמ': ${Math.round(item.carbs||0)}g · שומן: ${Math.round(item.fat||0)}g</div>
      </div>
      <div class="food-item-cal">${Math.round(item.cal)}</div>
      <div class="food-item-actions">
        <button class="food-action-btn" onclick="openEditItem('${item.id}')" aria-label="עריכה">✏️</button>
        <button class="food-action-btn delete" onclick="deleteItem('${item.id}')" aria-label="מחיקה">🗑</button>
      </div>
    `;
    log.appendChild(el);
  });
}

function deleteItem(id) {
  foodLog = foodLog.filter(i => i.id !== id);
  saveData();
  refreshDashboard();
}

function openEditItem(id) {
  const item = foodLog.find(i => i.id === id);
  if (!item) return;
  editingItemId = id;
  document.getElementById("edit-name").value = item.name;
  document.getElementById("edit-cal").value = item.cal;
  document.getElementById("edit-amount").value = item.amount;
  document.getElementById("edit-protein").value = item.protein || 0;
  document.getElementById("edit-carbs").value = item.carbs || 0;
  document.getElementById("edit-fat").value = item.fat || 0;
  openModal("modal-edit-food");
}

// ============ FOOD DATABASE ============
function getAllFoods() {
  return [...FOOD_DB, ...customFoods];
}

function initFoodDB() {
  document.getElementById("db-search").addEventListener("input", (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => searchFoodDBWithAPI(e.target.value.trim()), 400);
  });

  document.getElementById("btn-add-custom-food").addEventListener("click", () => {
    openModal("modal-custom-food");
  });
}

function renderFoodDB(query = "") {
  const list = document.getElementById("food-db-list");
  list.innerHTML = "";

  const allFoods = getAllFoods();
  const filtered = query
    ? allFoods.filter(f => f.name.includes(query))
    : allFoods;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-log"><div class="empty-icon">🔍</div><p>לא נמצאו תוצאות</p></div>';
    return;
  }

  if (query) {
    // Show flat list
    const wrap = document.createElement("div");
    wrap.className = "db-category";
    filtered.forEach(f => {
      wrap.appendChild(createDBItem(f));
    });
    list.appendChild(wrap);
  } else {
    // Group by category
    CATEGORY_ORDER.forEach(cat => {
      const items = filtered.filter(f => f.category === cat);
      if (items.length === 0) return;
      const section = document.createElement("div");
      section.className = "db-category";
      section.innerHTML = `<div class="db-category-title">${CATEGORY_LABELS[cat] || cat}</div>`;
      items.forEach(f => section.appendChild(createDBItem(f)));
      list.appendChild(section);
    });
  }
}

function createDBItem(food) {
  const el = document.createElement("div");
  el.className = "db-food-item" + (food.isCustom ? " custom-item" : "");
  el.innerHTML = `
    <span class="db-food-icon">${food.emoji || "🍽"}</span>
    <div class="db-food-info">
      <div class="db-food-name">${food.name}${food.isCustom ? ' <small style="color:var(--accent2)">✦</small>' : ''}</div>
      <div class="db-food-macros">חלבון: ${food.per100.protein}g · פחמ': ${food.per100.carbs}g · שומן: ${food.per100.fat}g</div>
    </div>
    <span class="db-food-cal">${food.per100.cal} קק"ל</span>
  `;
  el.addEventListener("click", () => openPortionModal(food));
  return el;
}

// ============ API SEARCH — USDA FoodData Central + Open Food Facts ============
let searchDebounceTimer = null;
let lastSearchQuery = "";

// Expanded Hebrew → English dictionary (150+ entries)
const HE_TO_EN = {
  // רטבים ותבלינים
  "מיונז": "mayonnaise", "מיונז סושי": "mayonnaise", "רוטב סויה": "soy sauce",
  "סויה": "soy sauce", "קטשופ": "ketchup", "חרדל": "mustard",
  "טחינה": "tahini", "חומוס": "hummus", "סלסה": "salsa",
  "רוטב עגבניות": "tomato sauce", "פסטו": "pesto", "גוואקמולה": "guacamole",
  "רוטב": "sauce", "ויניגרט": "vinaigrette", "רוטב צזר": "caesar dressing",
  "רוטב רנץ'": "ranch dressing", "טבסקו": "tabasco", "סריראצ'ה": "sriracha",
  "מרינרה": "marinara", "ברביקיו": "bbq sauce", "טריאקי": "teriyaki sauce",
  "נאצ'ו": "nacho cheese", "חמוציות": "cranberry sauce", "עינביות": "berry sauce",
  // שמנים
  "שמן זית": "olive oil", "שמן קוקוס": "coconut oil", "שמן שומשום": "sesame oil",
  "חמאה": "butter", "מרגרינה": "margarine",
  // חטיפים ומתוקים
  "קרקר": "cracker", "ביסקוויט": "biscuit", "עוגייה": "cookie",
  "פופקורן": "popcorn", "צ'יפס": "chips", "פרצל": "pretzel",
  "שוקולד": "chocolate", "וופל": "waffle", "גרנולה": "granola",
  "במבה": "peanut snack", "ביסלי": "wheat snack", "אפרופו": "corn snack",
  "עוגה": "cake", "מאפין": "muffin", "קרואסון": "croissant",
  "דונאט": "donut", "בייגל": "bagel", "טוסט": "toast",
  "מרשמלו": "marshmallow", "סוכריות": "candy", "גומי": "gummy candy",
  "חלבה": "halva", "רוגלך": "rugelach", "עוגיית שיבולת שועל": "oatmeal cookie",
  // פחמימות
  "פסטה": "pasta", "ספגטי": "spaghetti", "פנה": "penne pasta",
  "אורז": "rice", "אורז מלא": "brown rice", "אורז לבן": "white rice",
  "לחם": "bread", "פיתה": "pita bread", "לחמניה": "bread roll",
  "קוסקוס": "couscous", "בורגול": "bulgur", "קינואה": "quinoa",
  "שיבולת שועל": "oatmeal", "גרנולה": "granola", "קמח": "flour",
  "תירס": "corn", "פולנטה": "polenta", "גריסים": "groats",
  "לזניה": "lasagna", "נודלס": "noodles", "אטריות": "noodles",
  "בטטה": "sweet potato", "תפוח אדמה": "potato",
  // חלבונים
  "עוף": "chicken", "חזה עוף": "chicken breast", "כרעי עוף": "chicken thigh",
  "בשר": "beef", "בשר טחון": "ground beef", "סטייק": "steak",
  "הודו": "turkey", "סלמון": "salmon", "טונה": "tuna",
  "דג": "fish", "שרימפס": "shrimp", "קלמרי": "calamari",
  "ביצה": "egg", "טופו": "tofu", "טמפה": "tempeh",
  "שעועית": "beans", "עדשים": "lentils", "חומוס גרגירים": "chickpeas",
  "גבינה": "cheese", "קוטג'": "cottage cheese", "ריקוטה": "ricotta",
  "נקניק": "sausage", "שניצל": "schnitzel", "המבורגר": "hamburger",
  "פלאפל": "falafel", "שאוורמה": "shawarma", "קבב": "kebab",
  // מוצרי חלב
  "יוגורט": "yogurt", "יוגורט יווני": "greek yogurt",
  "חלב": "milk", "שמנת": "cream", "גבינה לבנה": "white cheese",
  "גבינה צהובה": "yellow cheese", "מוצרלה": "mozzarella",
  "פרמזן": "parmesan", "קממבר": "camembert", "בולגרית": "bulgarian cheese",
  // ירקות
  "עגבנייה": "tomato", "מלפפון": "cucumber", "גזר": "carrot",
  "ברוקולי": "broccoli", "תרד": "spinach", "חסה": "lettuce",
  "פלפל": "bell pepper", "בצל": "onion", "שום": "garlic",
  "קישוא": "zucchini", "חציל": "eggplant", "כרובית": "cauliflower",
  "כרוב": "cabbage", "סלרי": "celery", "פטריות": "mushrooms",
  "תירס": "corn", "אפונה": "peas", "שעועית ירוקה": "green beans",
  "אספרגוס": "asparagus", "ארטישוק": "artichoke",
  // פירות
  "תפוח": "apple", "בננה": "banana", "תפוז": "orange",
  "אבטיח": "watermelon", "ענבים": "grapes", "אבוקדו": "avocado",
  "מנגו": "mango", "תות": "strawberry", "אוכמניות": "blueberry",
  "פטל": "raspberry", "אננס": "pineapple", "קיווי": "kiwi",
  "אפרסק": "peach", "שזיף": "plum", "תמר": "date",
  "לימון": "lemon", "גרפרות": "grapefruit", "פפאיה": "papaya",
  // שתייה
  "מיץ": "juice", "מיץ תפוזים": "orange juice", "מיץ תפוחים": "apple juice",
  "קפה": "coffee", "תה": "tea", "קקאו": "cocoa",
  "שייק": "protein shake", "סמוזי": "smoothie",
  "חלב שקדים": "almond milk", "חלב סויה": "soy milk",
  "משקה אנרגיה": "energy drink", "סודה": "soda",
  // אגוזים ושומנים
  "שקדים": "almonds", "אגוזי מלך": "walnuts", "קשיו": "cashews",
  "בוטנים": "peanuts", "פיסטוקים": "pistachios", "פקאן": "pecans",
  "חמאת בוטנים": "peanut butter", "חמאת שקדים": "almond butter",
  // ארוחות מוכנות
  "פיצה": "pizza", "בורקס": "bourekas", "קיש": "quiche",
  "סושי": "sushi", "ראמן": "ramen", "פד תאי": "pad thai",
  "ווק": "stir fry", "קארי": "curry", "תבשיל": "stew",
  "מרק": "soup", "מרק עוף": "chicken soup", "מרק עגבניות": "tomato soup",
  // מותגים ישראלים
  "סיקווט": "seequet biscuit", "אסם": "osem snack",
  "תנובה": "dairy", "שטראוס": "strauss",
  // רטבים נוספים
  "מיונז סושי": "spicy mayo sushi",
  "רוטב וסאבי": "wasabi sauce",
  "מיסו": "miso paste",
  "רוטב אוסטר": "oyster sauce",
  "רוטב דגים": "fish sauce",
  "חריסה": "harissa",
  "עינביות": "cranberry sauce",
  "ממרח": "spread",
  "שמן שומשום": "sesame oil",
};

function translateToEnglish(hebrewQuery) {
  const q = hebrewQuery.trim();
  const qLower = q.toLowerCase();
  if (HE_TO_EN[q]) return HE_TO_EN[q];
  // Try each word combination - longest match wins
  let best = null, bestLen = 0;
  for (const [he, en] of Object.entries(HE_TO_EN)) {
    if (q.includes(he) && he.length > bestLen) {
      best = en; bestLen = he.length;
    }
  }
  return best;
}

function isHebrew(str) { return /[֐-׿]/.test(str); }

// ---- Search Engine: Israeli Gov DB + Open Food Facts ----

// Israeli Ministry of Health - National Nutrition Database (data.gov.il)
// 4500+ Israeli food items, free, no API key needed
const IL_RESOURCE_ID = "b8bfd5a5-e6ce-4e89-8783-5e3f9a8b8a4f";

async function searchIsraeliGovDB(query) {
  const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${IL_RESOURCE_ID}&limit=15&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error("IL Gov API error");
  const data = await res.json();
  if (!data.success) throw new Error("IL Gov API failed");
  return data.result?.records || [];
}

function parseIsraeliGovFood(record) {
  // Field names from the Israeli National Nutrition Database
  const name = record["שם מזון"] || record["food_name"] || record["FoodName"] || record["name"] || "מזון ישראלי";
  const cal  = parseFloat(record["אנרגיה (קק"ל)"] || record["energy_kcal"] || record["calories"] || record["Calories"] || 0);
  const protein = parseFloat(record["חלבון (ג')"] || record["protein"] || record["Protein"] || 0);
  const carbs   = parseFloat(record["פחמימות (ג')"] || record["carbohydrates"] || record["Carbohydrates"] || 0);
  const fat     = parseFloat(record["שומן (ג')"] || record["fat"] || record["Fat"] || 0);

  if (!name || cal <= 0) return null;

  return {
    id: "il_" + (record["_id"] || Math.random().toString(36).slice(2)),
    name: name.trim(),
    emoji: "🇮🇱",
    category: "other",
    isAPI: true,
    per100: {
      cal: Math.round(cal),
      protein: Math.round(protein * 10) / 10,
      carbs:   Math.round(carbs * 10) / 10,
      fat:     Math.round(fat * 10) / 10
    }
  };
}

// Open Food Facts fallback
async function fetchOFF(query, pageSize = 10) {
  const urls = [
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${pageSize}&fields=product_name,product_name_he,brands,nutriments`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.products?.length > 0) return data.products;
    } catch(e) { continue; }
  }
  return [];
}

function parseOFFProduct(product) {
  const n = product.nutriments || {};
  const cal     = n["energy-kcal_100g"] || n["energy-kcal"] || (n["energy_100g"] ? n["energy_100g"]/4.184 : 0);
  const protein = n["proteins_100g"] || 0;
  const carbs   = n["carbohydrates_100g"] || 0;
  const fat     = n["fat_100g"] || 0;
  const name    = product.product_name_he || product.product_name || "";
  const brand   = product.brands ? ` · ${product.brands.split(",")[0].trim()}` : "";
  if (!name || cal <= 0) return null;
  return {
    id: "off_" + Math.random().toString(36).slice(2),
    name: (name + brand).trim(),
    emoji: "🛒",
    category: "other",
    isAPI: true,
    per100: {
      cal:     Math.round(cal),
      protein: Math.round(protein * 10) / 10,
      carbs:   Math.round(carbs * 10) / 10,
      fat:     Math.round(fat * 10) / 10
    }
  };
}

// Local instant fallback for common items
const INSTANT_FOODS = {
  "מיונז": {cal:680,protein:1,carbs:0.6,fat:75,name:"מיונז"},
  "מיונז קל": {cal:300,protein:1.5,carbs:8,fat:30,name:"מיונז קל 30%"},
  "מיונז סושי": {cal:500,protein:1,carbs:5,fat:52,name:"מיונז סושי (ספייסי)"},
  "סויה": {cal:60,protein:8,carbs:5,fat:0,name:"רוטב סויה"},
  "רוטב סויה": {cal:60,protein:8,carbs:5,fat:0,name:"רוטב סויה"},
  "קטשופ": {cal:101,protein:1.7,carbs:25,fat:0.1,name:"קטשופ"},
  "חרדל": {cal:66,protein:4,carbs:6,fat:4,name:"חרדל"},
  "טחינה": {cal:570,protein:17,carbs:26,fat:48,name:"טחינה גולמית"},
  "סריראצ'ה": {cal:93,protein:3,carbs:18,fat:1,name:"סריראצ'ה"},
  "פסטו": {cal:430,protein:6,carbs:5,fat:43,name:"פסטו"},
  "bbq": {cal:172,protein:1,carbs:40,fat:0.5,name:"רוטב BBQ"},
  "ברביקיו": {cal:172,protein:1,carbs:40,fat:0.5,name:"רוטב BBQ"},
  "נוטלה": {cal:539,protein:6,carbs:58,fat:31,name:"נוטלה"},
  "שמן זית": {cal:884,protein:0,carbs:0,fat:100,name:"שמן זית"},
  "חמאה": {cal:717,protein:0.9,carbs:0.1,fat:81,name:"חמאה"},
};

function searchInstant(query) {
  const q = query.toLowerCase().trim();
  return Object.entries(INSTANT_FOODS)
    .filter(([k]) => q.includes(k) || k.includes(q))
    .map(([, v]) => ({
      id: "inst_" + v.name,
      name: v.name,
      emoji: "⭐",
      category: "sauces",
      isAPI: false,
      per100: {cal:v.cal, protein:v.protein, carbs:v.carbs, fat:v.fat}
    }));
}

async function searchAllAPIs(query) {
  const englishQuery = isHebrew(query) ? (translateToEnglish(query) || query) : query;
  const seen = new Set();
  const results = [];

  // 1. Instant local match (immediate)
  const instant = searchInstant(query);
  instant.forEach(f => { seen.add(f.name); results.push(f); });

  // 2. Israeli Gov DB (Hebrew search — best for Israeli foods!)
  // 3. Open Food Facts (English search)
  const [ilRes, offRes] = await Promise.allSettled([
    searchIsraeliGovDB(query),
    fetchOFF(isHebrew(query) ? englishQuery : query, 12)
  ]);

  // Israeli Gov results
  if (ilRes.status === "fulfilled") {
    for (const record of ilRes.value) {
      const food = parseIsraeliGovFood(record);
      if (!food || seen.has(food.name)) continue;
      seen.add(food.name);
      results.push(food);
    }
  }

  // OFF results
  if (offRes.status === "fulfilled") {
    for (const p of offRes.value) {
      const food = parseOFFProduct(p);
      if (!food || seen.has(food.name.slice(0,20))) continue;
      seen.add(food.name.slice(0,20));
      results.push(food);
    }
  }

  return results;
}


function renderLocalResults(results, container) {
  if (!results.length) return;
  const header = document.createElement("div");
  header.className = "results-section-title";
  header.textContent = "⭐ מאגר מקומי";
  container.appendChild(header);
  results.forEach(food => container.appendChild(createSearchResultEl(food)));
}

function createSearchResultEl(food) {
  const el = document.createElement("div");
  el.className = "search-result-item";
  el.innerHTML = `
    <div class="sr-icon"><i class="fa-solid fa-bowl-food"></i></div>
    <div style="flex:1;min-width:0">
      <div class="sr-name">${food.name}</div>
      <div class="sr-meta">חלבון: ${food.per100.protein}g · פחמ': ${food.per100.carbs}g · שומן: ${food.per100.fat}g</div>
    </div>
    <span class="sr-cal">${food.per100.cal} קק"ל</span>
  `;
  el.addEventListener("click", () => {
    closeModal("modal-add-food");
    openPortionModal(food);
  });
  return el;
}

async function renderSearchResults(q) {
  const container = document.getElementById("search-results");
  if (!q || q.length < 2) { container.innerHTML = ""; return; }

  // Local results instantly
  const localResults = getAllFoods().filter(f => 
    f.name.includes(q) || 
    (q.length >= 3 && f.name.toLowerCase().includes(q.toLowerCase()))
  ).slice(0, 6);
  container.innerHTML = "";
  if (localResults.length > 0) renderLocalResults(localResults, container);

  // Show search hint
  const englishQuery = isHebrew(q) ? translateToEnglish(q) : null;
  const searchNote = englishQuery ? ` ← "${englishQuery}"` : "";

  const loadingEl = document.createElement("div");
  loadingEl.id = "api-loading";
  loadingEl.className = "api-loading";
  loadingEl.innerHTML = `<span class="spinner"></span> מחפש במאגר ישראלי + עולמי${searchNote}...`;
  container.appendChild(loadingEl);

  try {
    lastSearchQuery = q;
    const products = await searchAllAPIs(q);
    if (lastSearchQuery !== q) return;
    document.getElementById("api-loading")?.remove();

    if (products.length === 0 && localResults.length === 0) {
      container.innerHTML = `<div class="no-results">לא נמצאו תוצאות עבור "${q}"<br><small>נסה באנגלית (למשל: mayo, soy sauce)</small></div>`;
      return;
    }

    if (products.length > 0) {
      const header = document.createElement("div");
      header.className = "results-section-title";
      const ilCount = products.filter(f=>f.id?.startsWith("il_")).length;
      const localCount = products.filter(f=>!f.isAPI).length;
      header.textContent = `🇮🇱 ${ilCount} ישראלי · 🌍 ${products.length - ilCount} עולמי`;
      container.appendChild(header);
      products.slice(0, 15).forEach(f => container.appendChild(createSearchResultEl(f)));
    }
  } catch(err) {
    document.getElementById("api-loading")?.remove();
    if (localResults.length === 0)
      container.innerHTML = `<div class="no-results">⚠️ שגיאת חיבור — נסה שוב</div>`;
  }
}

// Also use API in food-db screen
async function searchFoodDBWithAPI(query) {
  const list = document.getElementById("food-db-list");
  if (!query || query.length < 2) { renderFoodDB(""); return; }

  const localResults = getAllFoods().filter(f => f.name.includes(query));
  list.innerHTML = "";

  if (localResults.length > 0) {
    const section = document.createElement("div");
    section.className = "db-category";
    section.innerHTML = `<div class="db-category-title">⭐ מאגר מקומי</div>`;
    localResults.forEach(f => section.appendChild(createDBItem(f)));
    list.appendChild(section);
  }

  const englishQuery = isHebrew(query) ? translateToEnglish(query) : null;
  const searchNote = englishQuery ? ` ← "${englishQuery}"` : "";
  const loadEl = document.createElement("div");
  loadEl.id = "db-loading"; loadEl.className = "api-loading";
  loadEl.innerHTML = `<span class="spinner"></span> מחפש במאגר ישראלי + עולמי${searchNote}...`;
  list.appendChild(loadEl);

  try {
    const products = await searchAllAPIs(query);
    document.getElementById("db-loading")?.remove();
    if (products.length > 0) {
      const section = document.createElement("div");
      section.className = "db-category";
      section.innerHTML = `<div class="db-category-title">🌍 מאגר עולמי — ${products.length} תוצאות</div>`;
      products.slice(0, 20).forEach(p => section.appendChild(createDBItem(p)));
      list.appendChild(section);
    }
    if (localResults.length === 0 && products.length === 0) {
      list.innerHTML = `<div class="empty-log"><div class="empty-icon">🔍</div><p>לא נמצאו תוצאות</p><p class="empty-sub">נסה באנגלית</p></div>`;
    }
  } catch(e) {
    document.getElementById("db-loading")?.remove();
    if (localResults.length === 0) list.innerHTML = `<div class="empty-log"><div class="empty-icon">⚠️</div><p>שגיאת חיבור</p></div>`;
  }
}

// ============ ADD FOOD MODAL ============
function initModals() {
  // Add food search — with debounce for API
  document.getElementById("food-search").addEventListener("input", (e) => {
    const q = e.target.value.trim();
    clearTimeout(searchDebounceTimer);
    if (!q || q.length < 2) {
      document.getElementById("search-results").innerHTML = "";
      return;
    }
    // Show local immediately, debounce API call
    searchDebounceTimer = setTimeout(() => renderSearchResults(q), 400);
  });

  document.getElementById("btn-close-modal").addEventListener("click", () => closeModal("modal-add-food"));
  document.getElementById("btn-add-manual").addEventListener("click", addManualFood);

  // Portion modal
  initUnitSelector();
  document.getElementById("btn-confirm-portion").addEventListener("click", confirmPortion);
  document.getElementById("btn-cancel-portion").addEventListener("click", () => closeModal("modal-portion"));
  document.getElementById("portion-amount").addEventListener("input", updatePortionPreview);

  // Custom food
  document.getElementById("btn-save-custom-food").addEventListener("click", saveCustomFood);
  document.getElementById("btn-cancel-custom-food").addEventListener("click", () => closeModal("modal-custom-food"));

  // Edit food
  document.getElementById("btn-save-edit").addEventListener("click", saveEdit);
  document.getElementById("btn-cancel-edit").addEventListener("click", () => closeModal("modal-edit-food"));

  // Overlay close on backdrop click
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}



function openModal(id) {
  document.getElementById(id).classList.add("open");
  if (id === "modal-add-food") {
    document.getElementById("food-search").value = "";
    document.getElementById("search-results").innerHTML = "";
    setTimeout(() => document.getElementById("food-search").focus(), 300);
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

function addManualFood() {
  const name = document.getElementById("manual-name").value.trim();
  const cal = parseFloat(document.getElementById("manual-cal").value);
  const amount = parseFloat(document.getElementById("manual-amount").value) || 100;
  const protein = parseFloat(document.getElementById("manual-protein").value) || 0;
  const carbs = parseFloat(document.getElementById("manual-carbs").value) || 0;
  const fat = parseFloat(document.getElementById("manual-fat").value) || 0;
  const doSave = document.getElementById("manual-save").checked;

  if (!name || !cal) {
    showToast("אנא מלא שם וקלוריות");
    return;
  }

  const logItem = {
    id: "log_" + Date.now(),
    name, cal, amount, protein, carbs, fat, emoji: "🍽",
    time: new Date().toTimeString().slice(0,5)
  };

  if (doSave) {
    const customFood = {
      id: "cf_" + Date.now(),
      name, category: "other", emoji: "🍽", isCustom: true,
      per100: {
        cal: Math.round((cal / amount) * 100),
        protein: Math.round((protein / amount) * 100 * 10) / 10,
        carbs: Math.round((carbs / amount) * 100 * 10) / 10,
        fat: Math.round((fat / amount) * 100 * 10) / 10
      }
    };
    customFoods.push(customFood);
  }

  foodLog.push(logItem);
  saveData();
  closeModal("modal-add-food");
  refreshDashboard();
  showToast(`${name} נוסף ✓`);
}

// ============ PORTION MODAL ============
let currentUnitGrams = 1; // grams per unit
let currentUnitName = "גרם";

function openPortionModal(food) {
  portionFood = food;
  document.getElementById("portion-name").textContent = (food.emoji || "🍽") + " " + food.name;
  document.getElementById("portion-per100").textContent =
    `ל-100ג': ${food.per100.cal} קק"ל | חלבון: ${food.per100.protein}g | פחמ': ${food.per100.carbs}g | שומן: ${food.per100.fat}g`;

  // Reset unit to grams
  currentUnitGrams = 1;
  currentUnitName = "גרם";
  document.querySelectorAll(".unit-btn").forEach(b => b.classList.remove("active"));
  document.querySelector('.unit-btn[data-unit="g"]')?.classList.add("active");
  document.getElementById("portion-amount-label").textContent = 'כמות (גרם)';
  document.getElementById("portion-grams-hint").textContent = '';
  document.getElementById("portion-amount").value = 100;

  updatePortionPreview();
  openModal("modal-portion");
}

function initUnitSelector() {
  document.querySelectorAll(".unit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".unit-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentUnitGrams = parseFloat(btn.dataset.grams);
      currentUnitName = btn.textContent;
      const label = document.getElementById("portion-amount-label");
      const hint = document.getElementById("portion-grams-hint");
      if (currentUnitGrams === 1) {
        label.textContent = "כמות (גרם)";
        hint.textContent = "";
        document.getElementById("portion-amount").value = 100;
      } else {
        label.textContent = `כמות (${currentUnitName})`;
        document.getElementById("portion-amount").value = 1;
        const grams = 1 * currentUnitGrams;
        hint.textContent = `= ${grams}ג'`;
      }
      updatePortionPreview();
    });
  });

  // Steppers
  document.getElementById("portion-minus")?.addEventListener("click", () => {
    const inp = document.getElementById("portion-amount");
    const step = currentUnitGrams === 1 ? 10 : 0.5;
    inp.value = Math.max(parseFloat(inp.value) - step, 0.5);
    updatePortionPreview();
  });
  document.getElementById("portion-plus")?.addEventListener("click", () => {
    const inp = document.getElementById("portion-amount");
    const step = currentUnitGrams === 1 ? 10 : 0.5;
    inp.value = parseFloat(inp.value) + step;
    updatePortionPreview();
  });
}

function getPortionGrams() {
  const qty = parseFloat(document.getElementById("portion-amount").value) || 1;
  return qty * currentUnitGrams;
}

function updatePortionPreview() {
  if (!portionFood) return;
  const grams = getPortionGrams();
  const factor = grams / 100;
  const cal     = Math.round(portionFood.per100.cal * factor);
  const protein = Math.round(portionFood.per100.protein * factor * 10) / 10;
  const carbs   = Math.round(portionFood.per100.carbs * factor * 10) / 10;
  const fat     = Math.round(portionFood.per100.fat * factor * 10) / 10;

  // Update hint
  const hint = document.getElementById("portion-grams-hint");
  if (hint && currentUnitGrams !== 1) {
    hint.textContent = `= ${Math.round(grams)}ג'`;
  }

  document.getElementById("portion-preview").innerHTML = `
    <div style="font-size:40px;font-weight:500;color:var(--accent);font-family:var(--font-mono)">${cal}</div>
    <div style="font-size:12px;color:var(--text-t);margin-top:4px;font-family:var(--font-b)">קק"ל</div>
    <div style="font-size:12px;color:var(--text-s);margin-top:8px">חלבון: ${protein}g · פחמ': ${carbs}g · שומן: ${fat}g</div>
    <div style="font-size:11px;color:var(--text-t);margin-top:4px">${Math.round(grams)}ג' סה"כ</div>`;
}

function confirmPortion() {
  if (!portionFood) return;
  const grams = getPortionGrams();
  const qty   = parseFloat(document.getElementById("portion-amount").value) || 1;
  const factor = grams / 100;
  const unitLabel = currentUnitGrams === 1 ? `${Math.round(grams)}ג'` : `${qty} ${currentUnitName} (${Math.round(grams)}ג')`;

  const item = {
    id: "log_" + Date.now(),
    name: portionFood.name,
    emoji: portionFood.emoji || "🍽",
    amount: Math.round(grams),
    unitLabel,
    cal:     Math.round(portionFood.per100.cal * factor),
    protein: Math.round(portionFood.per100.protein * factor * 10) / 10,
    carbs:   Math.round(portionFood.per100.carbs * factor * 10) / 10,
    fat:     Math.round(portionFood.per100.fat * factor * 10) / 10,
    time: new Date().toTimeString().slice(0,5)
  };
  foodLog.push(item);
  saveData();
  closeModal("modal-portion");
  refreshDashboard();
  showToast(`${item.name} נוסף ✓`);
}

// ============ CUSTOM FOOD ============
function saveCustomFood() {
  const name = document.getElementById("cf-name").value.trim();
  const cat = document.getElementById("cf-category").value;
  const cal = parseFloat(document.getElementById("cf-cal").value) || 0;
  const protein = parseFloat(document.getElementById("cf-protein").value) || 0;
  const carbs = parseFloat(document.getElementById("cf-carbs").value) || 0;
  const fat = parseFloat(document.getElementById("cf-fat").value) || 0;

  if (!name || !cal) {
    showToast("אנא מלא שם וקלוריות");
    return;
  }

  const food = {
    id: "cf_" + Date.now(),
    name, category: cat, emoji: "🍽", isCustom: true,
    per100: { cal, protein, carbs, fat }
  };

  customFoods.push(food);
  saveData();
  closeModal("modal-custom-food");
  renderFoodDB();
  showToast(`${name} נוסף למאגר ✓`);

  // Clear fields
  ["cf-name","cf-cal","cf-protein","cf-carbs","cf-fat"].forEach(id => {
    document.getElementById(id).value = "";
  });
}

// ============ EDIT FOOD ============
function saveEdit() {
  if (!editingItemId) return;
  const idx = foodLog.findIndex(i => i.id === editingItemId);
  if (idx < 0) return;

  foodLog[idx].name = document.getElementById("edit-name").value.trim() || foodLog[idx].name;
  foodLog[idx].cal = parseFloat(document.getElementById("edit-cal").value) || foodLog[idx].cal;
  foodLog[idx].amount = parseFloat(document.getElementById("edit-amount").value) || foodLog[idx].amount;
  foodLog[idx].protein = parseFloat(document.getElementById("edit-protein").value) || 0;
  foodLog[idx].carbs = parseFloat(document.getElementById("edit-carbs").value) || 0;
  foodLog[idx].fat = parseFloat(document.getElementById("edit-fat").value) || 0;

  saveData();
  closeModal("modal-edit-food");
  refreshDashboard();
  showToast("הפריט עודכן ✓");
  editingItemId = null;
}

// ============ HISTORY ============
function renderHistory() {
  const container = document.getElementById("history-content");
  container.innerHTML = "";

  // Collect all food log keys
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("foodLog_")) keys.push(k);
  }

  if (keys.length === 0) {
    container.innerHTML = '<div class="empty-log"><div class="empty-icon">📅</div><p>אין היסטוריה עדיין</p></div>';
    return;
  }

  keys.sort().reverse().forEach(key => {
    const dateStr = key.replace("foodLog_", "");
    const items = JSON.parse(localStorage.getItem(key) || "[]");
    if (items.length === 0) return;

    const total = items.reduce((s, i) => s + i.cal, 0);
    const target = profile ? calcDailyCalorieTarget(profile) : 2000;
    const pct = Math.min(100, (total / target) * 100);

    const el = document.createElement("div");
    el.className = "history-day";
    el.innerHTML = `
      <div class="history-day-header">
        <span class="history-date">${formatDate(dateStr)}</span>
        <span class="history-cals">${total} / ${target} קק"ל</span>
      </div>
      <div class="history-bar-wrap">
        <div class="history-bar" style="width:${pct}%"></div>
      </div>
      <div class="history-meta">${items.length} פריטים · ${Math.round(pct)}% מהיעד</div>
    `;
    container.appendChild(el);
  });
}

function formatDate(str) {
  const [y, m, d] = str.split("-");
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const date = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (str === getTodayKey()) return "היום";
  if (str === `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`) return "אתמול";
  return `${days[date.getDay()]}, ${d}/${m}/${y}`;
}

// ============ SETTINGS ============
function initSettings() {
  // Goal tabs in settings
  document.querySelectorAll("#s-goal-tabs .goal-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("#s-goal-tabs .goal-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const goal = tab.dataset.goal;
      const lossRow = document.getElementById("s-loss-row");
      const targetRow = document.getElementById("s-target-row");
      if (goal === "lose") { lossRow.style.display = ""; targetRow.style.display = ""; }
      else if (goal === "gain") { lossRow.style.display = ""; targetRow.style.display = "none"; }
      else { lossRow.style.display = "none"; targetRow.style.display = "none"; }
    });
  });

  document.getElementById("btn-save-settings").addEventListener("click", saveSettings);
  document.getElementById("btn-reset-day").addEventListener("click", () => {
    if (confirm("למחוק את כל הנתונים של היום?")) {
      foodLog = [];
      saveData();
      showToast("נתוני היום נמחקו");
      refreshDashboard();
    }
  });
  document.getElementById("btn-reset-all").addEventListener("click", () => {
    if (confirm("למחוק את כל הנתונים? פעולה זו אינה ניתנת לביטול.")) {
      localStorage.clear();
      profile = null;
      foodLog = [];
      customFoods = [];
      location.reload();
    }
  });
}

function refreshSettings() {
  if (!profile) return;
  document.getElementById("s-age").value = profile.age;
  document.getElementById("s-gender").value = profile.gender;
  document.getElementById("s-height").value = profile.height;
  document.getElementById("s-weight").value = profile.weight;
  document.getElementById("s-activity").value = profile.activity;
  document.getElementById("s-monthly-change").value = profile.monthlyChange || 2;
  document.getElementById("s-target-weight").value = profile.targetWeight || "";

  // Goal tabs
  document.querySelectorAll("#s-goal-tabs .goal-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.goal === profile.goal);
  });

  // Show/hide goal-specific fields
  const lossRow = document.getElementById("s-loss-row");
  const targetRow = document.getElementById("s-target-row");
  if (profile.goal === "lose") { lossRow.style.display = ""; targetRow.style.display = ""; }
  else if (profile.goal === "gain") { lossRow.style.display = ""; targetRow.style.display = "none"; }
  else { lossRow.style.display = "none"; targetRow.style.display = "none"; }

  // BMR info
  const bmr = Math.round(calcBMR(profile));
  const tdee = Math.round(calcTDEE(profile));
  const target = calcDailyCalorieTarget(profile);

  document.getElementById("bmr-info").innerHTML = `
    <div class="info-item">
      <div class="info-item-label">BMR (מנוחה)</div>
      <div class="info-item-val">${bmr}</div>
      <div class="info-item-unit">קק"ל/יום</div>
    </div>
    <div class="info-item">
      <div class="info-item-label">TDEE (פעיל)</div>
      <div class="info-item-val">${tdee}</div>
      <div class="info-item-unit">קק"ל/יום</div>
    </div>
    <div class="info-item">
      <div class="info-item-label">יעד קלורי</div>
      <div class="info-item-val">${target}</div>
      <div class="info-item-unit">קק"ל/יום</div>
    </div>
    <div class="info-item">
      <div class="info-item-label">משקל נוכחי</div>
      <div class="info-item-val">${profile.weight}</div>
      <div class="info-item-unit">ק"ג</div>
    </div>
  `;
}

function saveSettings() {
  if (!profile) return;
  const goal = document.querySelector("#s-goal-tabs .goal-tab.active")?.dataset.goal || profile.goal;
  profile.age = parseInt(document.getElementById("s-age").value) || profile.age;
  profile.gender = document.getElementById("s-gender").value;
  profile.height = parseFloat(document.getElementById("s-height").value) || profile.height;
  profile.weight = parseFloat(document.getElementById("s-weight").value) || profile.weight;
  profile.activity = document.getElementById("s-activity").value;
  profile.goal = goal;
  profile.monthlyChange = parseFloat(document.getElementById("s-monthly-change").value) || 2;
  profile.targetWeight = parseFloat(document.getElementById("s-target-weight").value) || null;

  saveData();
  refreshSettings();
  showToast("ההגדרות נשמרו ✓");
}

// ============ TOAST ============
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2500);
}


// ============ SERVICE WORKER ============
function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

// ============================================================
// MOTIVATION MESSAGES
// ============================================================
const MOTIVATIONS = [
  { icon: "fa-dumbbell", text: "כוח הוא בנייה של הרגלים!", sub: "כל ארוחה שאתה עוקב אחריה היא צעד קדימה" },
  { icon: "fa-fire", text: "אתה שורף את זה!", sub: "העקביות היא הסוד לתוצאות אמיתיות" },
  { icon: "fa-bullseye", text: "יעד ברור = הצלחה בטוחה", sub: "מה שנמדד — משתפר. המשך כך!" },
  { icon: "fa-seedling", text: "כל יום הוא הזדמנות חדשה", sub: "לא משנה מה היה אתמול, היום חדש" },
  { icon: "fa-bolt", text: "אנרגיה מתחילה מהצלחה", sub: "גוף שמזינים נכון — ביצועים גבוהים יותר" },
  { icon: "fa-trophy", text: "אלופים נבנים ביום יום", sub: "כל כוס מים, כל ארוחה — זה נחשב!" },
  { icon: "fa-star", text: "אתה יותר חזק ממה שאתה חושב", sub: "הגוף שלך מסוגל לדברים מדהימים" },
  { icon: "fa-rocket", text: "מוכן להמריא היום?", sub: "התדלק נכון ותגיע לאן שאתה רוצה" },
  { icon: "fa-brain", text: "מוח חד מתחיל בתזונה נכונה", sub: "מה שאוכלים משפיע על איך שחושבים" },
  { icon: "fa-heart", text: "תאהב את הגוף שלך", sub: "כבד אותו בכל ביס שאתה בוחר" },
];

function showMotivationSplash() {
  const splash = document.getElementById("motivation-splash");
  if (!splash) return;

  // Pick random motivation
  const m = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
  document.getElementById("motivation-icon").innerHTML = `<i class="fa-solid ${m.icon}"></i>`;
  document.getElementById("motivation-text").textContent = m.text;
  document.getElementById("motivation-sub").textContent = m.sub;

  document.getElementById("btn-motivation-close").addEventListener("click", () => {
    splash.classList.add("hide");
    setTimeout(() => splash.remove(), 500);
  });

  // Auto-close after 6 seconds
  setTimeout(() => {
    if (document.getElementById("motivation-splash")) {
      splash.classList.add("hide");
      setTimeout(() => splash.remove(), 500);
    }
  }, 6000);
}

// ============================================================
// WATER TRACKER
// ============================================================
let waterCups = 0;
let waterGoal = 8;

function loadWater() {
  const saved = localStorage.getItem("water_" + todayKey);
  waterCups = saved ? parseInt(saved) : 0;
  const goal = localStorage.getItem("waterGoal");
  waterGoal = goal ? parseInt(goal) : 8;
}

function saveWater() {
  localStorage.setItem("water_" + todayKey, waterCups);
  localStorage.setItem("waterGoal", waterGoal);
}

function initWater() {
  loadWater();
  renderWater();

  document.getElementById("btn-water-goal")?.addEventListener("click", () => {
    navigateTo("settings");
    setTimeout(() => {
      document.getElementById("s-water-goal").focus();
      document.getElementById("s-water-goal").scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);
  });

  document.getElementById("btn-water-add").addEventListener("click", () => {
    if (waterCups < waterGoal) {
      waterCups++;
      saveWater();
      renderWater();
      if (waterCups === waterGoal) showToast("🎉 יעד השתייה הושג!");
    } else {
      showToast("כבר הגעת ליעד! 💧");
    }
  });

  document.getElementById("btn-water-reset").addEventListener("click", () => {
    waterCups = 0;
    saveWater();
    renderWater();
  });
}

function renderWater() {
  const container = document.getElementById("water-cups");
  const sub = document.getElementById("water-sub");
  if (!container || !sub) return;

  sub.textContent = `${waterCups} / ${waterGoal} כוסות · ${waterCups * 250} מ"ל`;

  container.innerHTML = "";
  for (let i = 0; i < waterGoal; i++) {
    const cup = document.createElement("div");
    cup.className = "water-cup" + (i < waterCups ? " filled" : "");
    cup.innerHTML = '<i class="fa-solid fa-droplet"></i>';
    cup.addEventListener("click", () => {
      waterCups = i < waterCups ? i : i + 1;
      saveWater();
      renderWater();
    });
    container.appendChild(cup);
  }
}

// ============================================================
// CHARTS
// ============================================================
let chartCalories = null;
let chartWater = null;
let chartMacros = null;

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const label = i === 0 ? "היום" : i === 1 ? "אתמול" : `${d.getDate()}/${d.getMonth()+1}`;
    days.push({ key, label });
  }
  return days;
}

function renderCharts() {
  const days = getLast7Days();

  // Calories data
  const calData = days.map(d => {
    const log = JSON.parse(localStorage.getItem("foodLog_" + d.key) || "[]");
    return log.reduce((s, i) => s + (i.cal || 0), 0);
  });

  // Water data
  const waterData = days.map(d => {
    return parseInt(localStorage.getItem("water_" + d.key) || "0");
  });

  const labels = days.map(d => d.label);
  const target = profile ? calcDailyCalorieTarget(profile) : 2000;

  // Calories chart
  const ctxCal = document.getElementById("chart-calories");
  if (ctxCal) {
    if (chartCalories) chartCalories.destroy();
    chartCalories = new Chart(ctxCal, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "קלוריות",
          data: calData,
          backgroundColor: calData.map(v => v > target ? "rgba(244,63,94,.7)" : v > target * 0.8 ? "rgba(251,191,36,.7)" : "rgba(0,245,196,.7)"),
          borderRadius: 8,
          borderSkipped: false,
        }, {
          label: "יעד",
          data: Array(7).fill(target),
          type: "line",
          borderColor: "rgba(14,165,233,.6)",
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
        }]
      },
      options: chartOptions("קק\"ל")
    });
  }

  // Water chart
  const ctxWater = document.getElementById("chart-water");
  if (ctxWater) {
    if (chartWater) chartWater.destroy();
    chartWater = new Chart(ctxWater, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "כוסות",
          data: waterData,
          backgroundColor: "rgba(14,165,233,.6)",
          borderRadius: 8,
          borderSkipped: false,
        }, {
          label: "יעד",
          data: Array(7).fill(waterGoal),
          type: "line",
          borderColor: "rgba(0,245,196,.6)",
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
        }]
      },
      options: chartOptions("כוסות")
    });
  }

  // Macros donut
  const ctxMacros = document.getElementById("chart-macros");
  if (ctxMacros) {
    const todayLog = JSON.parse(localStorage.getItem("foodLog_" + todayKey) || "[]");
    const p = todayLog.reduce((s, i) => s + (i.protein || 0), 0);
    const c = todayLog.reduce((s, i) => s + (i.carbs || 0), 0);
    const f = todayLog.reduce((s, i) => s + (i.fat || 0), 0);

    if (chartMacros) chartMacros.destroy();
    chartMacros = new Chart(ctxMacros, {
      type: "doughnut",
      data: {
        labels: ["חלבון", "פחמימות", "שומן"],
        datasets: [{
          data: [Math.round(p), Math.round(c), Math.round(f)],
          backgroundColor: ["rgba(0,245,196,.8)", "rgba(251,191,36,.8)", "rgba(244,63,94,.8)"],
          borderWidth: 0,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.raw}g`
            },
            backgroundColor: "rgba(8,14,30,.9)",
            titleColor: "#e8f4ff", bodyColor: "#7a9bbf",
            borderColor: "rgba(0,245,196,.2)", borderWidth: 1,
          }
        },
        cutout: "65%",
      }
    });

    // Legend
    const legend = document.getElementById("macro-legend");
    if (legend) {
      legend.innerHTML = [
        { color: "#00f5c4", label: "חלבון", val: Math.round(p) + "g" },
        { color: "#fbbf24", label: "פחמימות", val: Math.round(c) + "g" },
        { color: "#f43f5e", label: "שומן", val: Math.round(f) + "g" },
      ].map(l => `
        <div class="legend-item">
          <div class="legend-dot" style="background:${l.color}"></div>
          <span>${l.label}: <strong style="color:${l.color}">${l.val}</strong></span>
        </div>
      `).join("");
    }
  }

  // Summary stats
  const summaryEl = document.getElementById("stats-summary");
  if (summaryEl) {
    const avgCal = Math.round(calData.reduce((a,b) => a+b, 0) / 7);
    const daysLogged = calData.filter(v => v > 0).length;
    const avgWater = Math.round(waterData.reduce((a,b) => a+b, 0) / 7);
    const bestDay = Math.max(...calData);

    summaryEl.innerHTML = [
      { val: avgCal, lbl: 'ממוצע קלורי יומי' },
      { val: daysLogged + '/7', lbl: 'ימים עם מעקב' },
      { val: avgWater, lbl: 'ממוצע כוסות יומי' },
      { val: bestDay, lbl: 'שיא קלורי שבועי' },
    ].map(s => `
      <div class="summary-stat">
        <div class="summary-stat-val">${s.val}</div>
        <div class="summary-stat-lbl">${s.lbl}</div>
      </div>
    `).join("");
  }
}

function chartOptions(yLabel) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(8,14,30,.9)",
        titleColor: "#e8f4ff", bodyColor: "#7a9bbf",
        borderColor: "rgba(0,245,196,.2)", borderWidth: 1,
        rtl: true,
      }
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,.04)" },
        ticks: { color: "#3d5470", font: { size: 11 } }
      },
      y: {
        grid: { color: "rgba(255,255,255,.04)" },
        ticks: { color: "#3d5470", font: { size: 11 } },
        beginAtZero: true,
      }
    }
  };
}

// ============================================================
// INIT ADDITIONS — patch into DOMContentLoaded
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  showMotivationSplash();
  initWater();

  // Water goal in settings
  document.getElementById("btn-save-water-goal")?.addEventListener("click", () => {
    const val = parseInt(document.getElementById("s-water-goal").value) || 8;
    waterGoal = Math.max(4, Math.min(20, val));
    saveWater();
    renderWater();
    showToast("יעד השתייה עודכן ל-" + waterGoal + " כוסות ✓");
  });
});
