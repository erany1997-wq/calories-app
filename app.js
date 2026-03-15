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
  injectSVGDefs();
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

  if (remaining < 0) {
    ringEl.classList.add("over-budget");
    remainingEl.classList.add("over-budget");
    remainingEl.textContent = Math.abs(remaining);
    document.querySelector(".ring-label").textContent = "חריגה";
  } else {
    ringEl.classList.remove("over-budget");
    remainingEl.classList.remove("over-budget");
    remainingEl.textContent = remaining;
    document.querySelector(".ring-label").textContent = "נשאר";
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
      <div class="food-item-icon">${item.emoji || "🍽"}</div>
      <div class="food-item-info">
        <div class="food-item-name">${item.name}</div>
        <div class="food-item-meta">${item.amount}ג' · חלבון: ${Math.round(item.protein||0)}g · פחמ': ${Math.round(item.carbs||0)}g · שומן: ${Math.round(item.fat||0)}g</div>
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

// ============ API SEARCH (Open Food Facts) ============
let searchDebounceTimer = null;
let lastSearchQuery = "";

async function searchOpenFoodFacts(query) {
  // Search both in Hebrew and English; use world + Israel
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,product_name_he,brands,nutriments,image_small_url,categories_tags`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("API error");
  const data = await res.json();
  return (data.products || []);
}

function parseOFFProduct(product) {
  const n = product.nutriments || {};
  const cal = n["energy-kcal_100g"] || n["energy-kcal"] || (n["energy_100g"] ? n["energy_100g"] / 4.184 : 0);
  const protein = n["proteins_100g"] || n["proteins"] || 0;
  const carbs = n["carbohydrates_100g"] || n["carbohydrates"] || 0;
  const fat = n["fat_100g"] || n["fat"] || 0;

  const name = product.product_name_he || product.product_name || "מוצר לא ידוע";
  const brand = product.brands ? ` (${product.brands.split(",")[0].trim()})` : "";

  return {
    id: "off_" + Math.random().toString(36).slice(2),
    name: name + brand,
    emoji: "🛒",
    category: "other",
    isAPI: true,
    per100: {
      cal: Math.round(cal),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10
    }
  };
}

async function renderSearchResults(q) {
  const container = document.getElementById("search-results");

  if (!q || q.length < 2) {
    container.innerHTML = "";
    return;
  }

  // Local results first (instant)
  const localResults = getAllFoods().filter(f => f.name.includes(q)).slice(0, 5);

  // Show local + loading spinner
  container.innerHTML = "";
  if (localResults.length > 0) {
    renderLocalResults(localResults, container);
  }

  // Loading indicator
  const loadingEl = document.createElement("div");
  loadingEl.id = "api-loading";
  loadingEl.className = "api-loading";
  loadingEl.innerHTML = `<span class="spinner"></span> מחפש במאגר עולמי...`;
  container.appendChild(loadingEl);

  try {
    lastSearchQuery = q;
    const products = await searchOpenFoodFacts(q);

    // If query changed while fetching, ignore
    if (lastSearchQuery !== q) return;

    // Remove loading
    document.getElementById("api-loading")?.remove();

    if (products.length === 0 && localResults.length === 0) {
      container.innerHTML = '<div class="no-results">לא נמצאו תוצאות — הזן ידנית למטה</div>';
      return;
    }

    if (products.length > 0) {
      // Section header for API results
      const header = document.createElement("div");
      header.className = "results-section-title";
      header.textContent = "🌍 תוצאות מהמאגר העולמי";
      container.appendChild(header);

      products
        .filter(p => {
          const n = p.nutriments || {};
          const cal = n["energy-kcal_100g"] || n["energy-kcal"] || 0;
          return cal > 0 && (p.product_name_he || p.product_name);
        })
        .slice(0, 12)
        .forEach(product => {
          const food = parseOFFProduct(product);
          container.appendChild(createSearchResultEl(food));
        });
    }

  } catch(err) {
    document.getElementById("api-loading")?.remove();
    const errEl = document.createElement("div");
    errEl.className = "no-results";
    errEl.textContent = "⚠️ לא ניתן להתחבר לאינטרנט — מציג תוצאות מקומיות בלבד";
    container.appendChild(errEl);
  }
}

function renderLocalResults(results, container) {
  if (results.length === 0) return;
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
    <span class="sr-icon">${food.emoji || "🍽"}</span>
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

// Also use API in food-db screen
async function searchFoodDBWithAPI(query) {
  const list = document.getElementById("food-db-list");

  if (!query || query.length < 2) {
    renderFoodDB("");
    return;
  }

  // Local first
  const localResults = getAllFoods().filter(f => f.name.includes(query));
  list.innerHTML = "";

  if (localResults.length > 0) {
    const section = document.createElement("div");
    section.className = "db-category";
    section.innerHTML = `<div class="db-category-title">⭐ מאגר מקומי</div>`;
    localResults.forEach(f => section.appendChild(createDBItem(f)));
    list.appendChild(section);
  }

  const loadEl = document.createElement("div");
  loadEl.id = "db-loading";
  loadEl.className = "api-loading";
  loadEl.innerHTML = `<span class="spinner"></span> מחפש במאגר עולמי...`;
  list.appendChild(loadEl);

  try {
    const products = await searchOpenFoodFacts(query);
    document.getElementById("db-loading")?.remove();

    const valid = products.filter(p => {
      const n = p.nutriments || {};
      return (n["energy-kcal_100g"] || n["energy-kcal"] || 0) > 0 &&
             (p.product_name_he || p.product_name);
    }).slice(0, 15);

    if (valid.length > 0) {
      const section = document.createElement("div");
      section.className = "db-category";
      section.innerHTML = `<div class="db-category-title">🌍 מאגר עולמי (Open Food Facts)</div>`;
      valid.forEach(p => {
        const food = parseOFFProduct(p);
        section.appendChild(createDBItem(food));
      });
      list.appendChild(section);
    }

    if (localResults.length === 0 && valid.length === 0) {
      list.innerHTML = '<div class="empty-log"><div class="empty-icon">🔍</div><p>לא נמצאו תוצאות</p></div>';
    }
  } catch(e) {
    document.getElementById("db-loading")?.remove();
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
function openPortionModal(food) {
  portionFood = food;
  document.getElementById("portion-name").textContent = food.emoji + " " + food.name;
  document.getElementById("portion-per100").textContent =
    `ל-100ג': ${food.per100.cal} קק"ל | חלבון: ${food.per100.protein}g | פחמ': ${food.per100.carbs}g | שומן: ${food.per100.fat}g`;
  document.getElementById("portion-amount").value = 100;
  updatePortionPreview();
  openModal("modal-portion");
}

function updatePortionPreview() {
  if (!portionFood) return;
  const amount = parseFloat(document.getElementById("portion-amount").value) || 100;
  const factor = amount / 100;
  const cal = Math.round(portionFood.per100.cal * factor);
  const protein = Math.round(portionFood.per100.protein * factor * 10) / 10;
  const carbs = Math.round(portionFood.per100.carbs * factor * 10) / 10;
  const fat = Math.round(portionFood.per100.fat * factor * 10) / 10;
  document.getElementById("portion-preview").innerHTML =
    `<div style="font-size:36px;font-weight:900">${cal}</div>
     <div style="font-size:13px;color:var(--text2);font-family:var(--font);margin-top:4px">קק"ל</div>
     <div style="font-size:12px;color:var(--text3);margin-top:8px">חלבון: ${protein}g · פחמ': ${carbs}g · שומן: ${fat}g</div>`;
}

function confirmPortion() {
  if (!portionFood) return;
  const amount = parseFloat(document.getElementById("portion-amount").value) || 100;
  const factor = amount / 100;
  const item = {
    id: "log_" + Date.now(),
    name: portionFood.name,
    emoji: portionFood.emoji || "🍽",
    amount,
    cal: Math.round(portionFood.per100.cal * factor),
    protein: Math.round(portionFood.per100.protein * factor * 10) / 10,
    carbs: Math.round(portionFood.per100.carbs * factor * 10) / 10,
    fat: Math.round(portionFood.per100.fat * factor * 10) / 10,
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

// ============ SVG GRADIENT ============
function injectSVGDefs() {
  const svg = document.querySelector(".calorie-ring");
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c6cf0"/>
      <stop offset="100%" stop-color="#5ce0c5"/>
    </linearGradient>
  `;
  svg.insertBefore(defs, svg.firstChild);
  document.getElementById("ring-fill").setAttribute("stroke", "url(#ringGradient)");
}

// ============ SERVICE WORKER ============
function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
