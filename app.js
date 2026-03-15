// ===== STATE =====
let profile = null;
let selectedGender = 'male';
let selectedPace = 0.5;
let selectedMeal = 'ארוחת בוקר';
let todayLog = [];
let weightLog = [];
let customFoods = [];

// ===== FOOD DATABASE =====
const FOOD_DB = [
  // חלבונים
  { name: 'חזה עוף מבושל', cal: 165, protein: 31, carbs: 0, fat: 3.6, unit: 'g', icon: '🍗' },
  { name: 'חזה עוף בגריל', cal: 175, protein: 33, carbs: 0, fat: 4, unit: 'g', icon: '🍗' },
  { name: 'יוגורט חלבון 0%', cal: 57, protein: 10, carbs: 3.5, fat: 0.2, unit: 'g', icon: '🥛' },
  { name: 'קוטג\' 5%', cal: 98, protein: 11, carbs: 3.5, fat: 5, unit: 'g', icon: '🧀' },
  { name: 'ביצה שלמה', cal: 155, protein: 13, carbs: 1.1, fat: 11, unit: 'g', icon: '🥚' },
  { name: 'חלבון ביצה', cal: 52, protein: 11, carbs: 0.7, fat: 0.2, unit: 'g', icon: '🥚' },
  { name: 'טונה במים', cal: 116, protein: 26, carbs: 0, fat: 1, unit: 'g', icon: '🐟' },
  { name: 'סלמון מבושל', cal: 208, protein: 20, carbs: 0, fat: 13, unit: 'g', icon: '🐟' },
  { name: 'בשר בקר רזה', cal: 215, protein: 26, carbs: 0, fat: 12, unit: 'g', icon: '🥩' },
  { name: 'גבינה צהובה 28%', cal: 340, protein: 25, carbs: 0.5, fat: 26, unit: 'g', icon: '🧀' },
  { name: 'חלב 1%', cal: 42, protein: 3.4, carbs: 5, fat: 1, unit: 'ml', icon: '🥛' },
  { name: 'שייק חלבון (30g)', cal: 120, protein: 24, carbs: 3, fat: 1.5, unit: 'g', icon: '💪' },
  { name: 'טופו קשה', cal: 76, protein: 8, carbs: 2, fat: 4.5, unit: 'g', icon: '🟡' },
  { name: 'עדשים מבושלות', cal: 116, protein: 9, carbs: 20, fat: 0.4, unit: 'g', icon: '🫘' },
  // פחמימות
  { name: 'פסטה מבושלת', cal: 131, protein: 5, carbs: 25, fat: 1.1, unit: 'g', icon: '🍝' },
  { name: 'אורז לבן מבושל', cal: 130, protein: 2.7, carbs: 28, fat: 0.3, unit: 'g', icon: '🍚' },
  { name: 'אורז מלא מבושל', cal: 111, protein: 2.6, carbs: 23, fat: 0.9, unit: 'g', icon: '🍚' },
  { name: 'לחם אחיד פרוסה', cal: 79, protein: 3, carbs: 15, fat: 1, unit: 'g', icon: '🍞' },
  { name: 'לחם מחיטה מלאה פרוסה', cal: 69, protein: 3.6, carbs: 12, fat: 1, unit: 'g', icon: '🍞' },
  { name: 'בטטה מבושלת', cal: 86, protein: 1.6, carbs: 20, fat: 0.1, unit: 'g', icon: '🍠' },
  { name: 'תפוח אדמה מבושל', cal: 87, protein: 1.9, carbs: 20, fat: 0.1, unit: 'g', icon: '🥔' },
  { name: 'שיבולת שועל', cal: 379, protein: 13, carbs: 68, fat: 6.5, unit: 'g', icon: '🌾' },
  { name: 'קינואה מבושלת', cal: 120, protein: 4.4, carbs: 21, fat: 1.9, unit: 'g', icon: '🌾' },
  { name: 'בננה', cal: 89, protein: 1.1, carbs: 23, fat: 0.3, unit: 'g', icon: '🍌' },
  { name: 'תפוח', cal: 52, protein: 0.3, carbs: 14, fat: 0.2, unit: 'g', icon: '🍎' },
  // ירקות
  { name: 'ברוקולי מבושל', cal: 35, protein: 2.4, carbs: 7, fat: 0.4, unit: 'g', icon: '🥦' },
  { name: 'עגבנייה', cal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, unit: 'g', icon: '🍅' },
  { name: 'מלפפון', cal: 16, protein: 0.7, carbs: 3.6, fat: 0.1, unit: 'g', icon: '🥒' },
  { name: 'גזר', cal: 41, protein: 0.9, carbs: 10, fat: 0.2, unit: 'g', icon: '🥕' },
  { name: 'תרד מבושל', cal: 23, protein: 2.9, carbs: 3.8, fat: 0.3, unit: 'g', icon: '🥬' },
  // שומנים
  { name: 'אבוקדו', cal: 160, protein: 2, carbs: 9, fat: 15, unit: 'g', icon: '🥑' },
  { name: 'שמן זית', cal: 884, protein: 0, carbs: 0, fat: 100, unit: 'ml', icon: '🫒' },
  { name: 'שקדים', cal: 579, protein: 21, carbs: 22, fat: 50, unit: 'g', icon: '🌰' },
  { name: 'טחינה גולמית', cal: 595, protein: 17, carbs: 22, fat: 54, unit: 'g', icon: '🫙' },
  { name: 'חמאת בוטנים', cal: 588, protein: 25, carbs: 20, fat: 50, unit: 'g', icon: '🥜' },
  // מזון מהיר / מוכן
  { name: 'פיתה', cal: 275, protein: 9, carbs: 55, fat: 2.5, unit: 'g', icon: '🫓' },
  { name: 'פלאפל כדור', cal: 57, protein: 2.2, carbs: 5.5, fat: 3, unit: 'g', icon: '🟤' },
  { name: 'אורז עם עוף', cal: 150, protein: 12, carbs: 17, fat: 3.5, unit: 'g', icon: '🍱' },
  { name: 'סלט ירקות', cal: 25, protein: 1.5, carbs: 4.5, fat: 0.3, unit: 'g', icon: '🥗' },
];

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  loadData();
  if (profile) {
    showApp();
    updateDashboard();
    loadSettingsForm();
  } else {
    document.getElementById('splash').classList.add('active');
  }
  // Inject SVG gradient defs
  const svgDefs = `<svg width="0" height="0" style="position:absolute"><defs>
    <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4ade80"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs></svg>`;
  document.body.insertAdjacentHTML('afterbegin', svgDefs);
  // Date label
  const d = new Date();
  document.getElementById('today-label').textContent = d.toLocaleDateString('he-IL', { weekday:'long', day:'numeric', month:'long' });
  const h = d.getHours();
  const name = profile?.name || '';
  const greet = h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : 'ערב טוב';
  document.getElementById('greeting').textContent = greet + (name ? `, ${name}` : '!');
});

// ===== DATA PERSISTENCE =====
function saveData() {
  localStorage.setItem('calx_profile', JSON.stringify(profile));
  localStorage.setItem('calx_log_' + todayKey(), JSON.stringify(todayLog));
  localStorage.setItem('calx_weight', JSON.stringify(weightLog));
  localStorage.setItem('calx_foods', JSON.stringify(customFoods));
}

function loadData() {
  try { profile = JSON.parse(localStorage.getItem('calx_profile')); } catch(e) { profile = null; }
  try { todayLog = JSON.parse(localStorage.getItem('calx_log_' + todayKey())) || []; } catch(e) { todayLog = []; }
  try { weightLog = JSON.parse(localStorage.getItem('calx_weight')) || []; } catch(e) { weightLog = []; }
  try { customFoods = JSON.parse(localStorage.getItem('calx_foods')) || []; } catch(e) { customFoods = []; }
}

function todayKey() { return new Date().toISOString().slice(0,10); }

// ===== CALORIE MATH =====
function calcBMR(p) {
  // Mifflin-St Jeor
  let bmr;
  if (p.gender === 'male') {
    bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + 5;
  } else {
    bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age - 161;
  }
  return Math.round(bmr);
}

function calcTDEE(p) { return Math.round(calcBMR(p) * p.activity); }

function calcGoal(p) {
  const tdee = calcTDEE(p);
  const weeklyDeficit = p.pace * 7700; // ~7700 kcal per kg
  const dailyDeficit = Math.round(weeklyDeficit / 7);
  const direction = p.targetWeight < p.weight ? -1 : 1;
  return tdee + direction * (-dailyDeficit);
}

function getGoal() { return profile ? calcGoal(profile) : 2000; }

// ===== SCREENS =====
function showOnboarding() {
  document.getElementById('splash').classList.remove('active');
  document.getElementById('onboarding').classList.add('active');
  // Live preview
  ['age','height','weight','targetWeight'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateBMRPreview);
  });
  document.getElementById('activity').addEventListener('change', updateBMRPreview);
}

function showApp() {
  document.getElementById('splash').classList.remove('active');
  document.getElementById('onboarding').classList.remove('active');
  document.getElementById('app').classList.add('active');
}

// ===== GENDER =====
function selectGender(g) {
  selectedGender = g;
  document.getElementById('btn-male').classList.toggle('active', g === 'male');
  document.getElementById('btn-female').classList.toggle('active', g === 'female');
  updateBMRPreview();
}

function selectGenderSettings(g) {
  selectedGender = g;
  document.getElementById('s-btn-male').classList.toggle('active', g === 'male');
  document.getElementById('s-btn-female').classList.toggle('active', g === 'female');
}

// ===== PACE =====
function selectPace(btn) {
  selectedPace = parseFloat(btn.dataset.kg);
  document.querySelectorAll('#onboarding .pace-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateBMRPreview();
}

function selectPaceSettings(btn) {
  selectedPace = parseFloat(btn.dataset.kg);
  document.querySelectorAll('#tab-settings .pace-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ===== MEAL SELECTOR =====
function selectMeal(btn) {
  selectedMeal = btn.dataset.meal;
  document.querySelectorAll('.meal-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ===== BMR PREVIEW =====
function updateBMRPreview() {
  const age = parseInt(document.getElementById('age').value);
  const height = parseFloat(document.getElementById('height').value);
  const weight = parseFloat(document.getElementById('weight').value);
  const target = parseFloat(document.getElementById('targetWeight').value);
  const activity = parseFloat(document.getElementById('activity').value);
  if (!age || !height || !weight) {
    document.getElementById('bmr-preview').classList.add('hidden');
    return;
  }
  const p = { gender: selectedGender, age, height, weight, targetWeight: target || weight, activity, pace: selectedPace };
  const bmr = calcBMR(p);
  const tdee = calcTDEE(p);
  const goal = calcGoal(p);
  document.getElementById('bmr-val').textContent = bmr + ' קק"ל';
  document.getElementById('tdee-val').textContent = tdee + ' קק"ל';
  document.getElementById('budget-val').textContent = goal + ' קק"ל';
  document.getElementById('bmr-preview').classList.remove('hidden');
}

// ===== SAVE PROFILE =====
function saveProfile() {
  const age = parseInt(document.getElementById('age').value);
  const height = parseFloat(document.getElementById('height').value);
  const weight = parseFloat(document.getElementById('weight').value);
  const targetWeight = parseFloat(document.getElementById('targetWeight').value) || weight;
  const activity = parseFloat(document.getElementById('activity').value);
  if (!age || !height || !weight) { showToast('⚠️ אנא מלא את כל השדות'); return; }
  profile = { gender: selectedGender, age, height, weight, targetWeight, activity, pace: selectedPace };
  saveData();
  showApp();
  updateDashboard();
  loadSettingsForm();
  showToast('✅ פרופיל נשמר!');
}

function updateProfile() {
  const age = parseInt(document.getElementById('s-age').value);
  const height = parseFloat(document.getElementById('s-height').value);
  const weight = parseFloat(document.getElementById('s-weight').value);
  const targetWeight = parseFloat(document.getElementById('s-target').value) || weight;
  const activity = parseFloat(document.getElementById('s-activity').value);
  if (!age || !height || !weight) { showToast('⚠️ אנא מלא את כל השדות'); return; }
  profile = { gender: selectedGender, age, height, weight, targetWeight, activity, pace: selectedPace };
  saveData();
  updateDashboard();
  loadSettingsStatsDisplay();
  showToast('✅ פרופיל עודכן!');
}

function loadSettingsForm() {
  if (!profile) return;
  document.getElementById('s-age').value = profile.age;
  document.getElementById('s-height').value = profile.height;
  document.getElementById('s-weight').value = profile.weight;
  document.getElementById('s-target').value = profile.targetWeight;
  document.getElementById('s-activity').value = profile.activity;
  selectedGender = profile.gender;
  selectedPace = profile.pace;
  document.getElementById('s-btn-male').classList.toggle('active', profile.gender === 'male');
  document.getElementById('s-btn-female').classList.toggle('active', profile.gender === 'female');
  document.querySelectorAll('#tab-settings .pace-btn').forEach(b => {
    b.classList.toggle('active', parseFloat(b.dataset.kg) === profile.pace);
  });
  loadSettingsStatsDisplay();
}

function loadSettingsStatsDisplay() {
  if (!profile) return;
  const bmr = calcBMR(profile);
  const tdee = calcTDEE(profile);
  const goal = calcGoal(profile);
  const bmi = (profile.weight / Math.pow(profile.height/100, 2)).toFixed(1);
  document.getElementById('disp-bmr').textContent = bmr;
  document.getElementById('disp-tdee').textContent = tdee;
  document.getElementById('disp-goal').textContent = goal;
  document.getElementById('disp-bmi').textContent = bmi;
}

// ===== TABS =====
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('nav-' + tab).classList.add('active');
  if (tab === 'food') document.getElementById('food-search').focus();
}

// ===== DASHBOARD =====
function updateDashboard() {
  if (!profile) return;
  const goal = getGoal();
  const consumed = todayLog.reduce((s, e) => s + e.cal, 0);
  const remain = goal - consumed;
  const protein = todayLog.reduce((s, e) => s + (e.protein || 0), 0);
  const carbs = todayLog.reduce((s, e) => s + (e.carbs || 0), 0);
  const fat = todayLog.reduce((s, e) => s + (e.fat || 0), 0);

  // Ring
  document.getElementById('ring-consumed').textContent = consumed;
  document.getElementById('stat-goal').textContent = goal;
  document.getElementById('stat-remain').textContent = remain;
  document.getElementById('stat-burned').textContent = Math.round(calcTDEE(profile) - goal);

  // Ring arc
  const pct = Math.min(consumed / goal, 1);
  const circ = 515;
  document.getElementById('ring-arc').style.strokeDashoffset = circ - pct * circ;
  document.getElementById('ring-arc').style.stroke = consumed > goal ? '#f87171' : 'url(#ring-grad)';

  // Macros
  document.getElementById('m-protein').textContent = Math.round(protein) + 'g';
  document.getElementById('m-carbs').textContent = Math.round(carbs) + 'g';
  document.getElementById('m-fat').textContent = Math.round(fat) + 'g';
  const pMax = 150, cMax = 250, fMax = 80;
  document.getElementById('bar-protein').style.width = Math.min(protein/pMax*100,100) + '%';
  document.getElementById('bar-carbs').style.width = Math.min(carbs/cMax*100,100) + '%';
  document.getElementById('bar-fat').style.width = Math.min(fat/fMax*100,100) + '%';

  // Food log
  renderFoodLog();
  // Weight
  renderWeightHistory();
}

function renderFoodLog() {
  const el = document.getElementById('food-log');
  if (todayLog.length === 0) {
    el.innerHTML = '<div class="empty-state"><span>🍽️</span><p>לא נרשמו ארוחות היום</p></div>';
    return;
  }
  const byMeal = {};
  todayLog.forEach(item => {
    if (!byMeal[item.meal]) byMeal[item.meal] = [];
    byMeal[item.meal].push(item);
  });
  let html = '';
  for (const [meal, items] of Object.entries(byMeal)) {
    html += `<div class="meal-label">${meal}</div>`;
    items.forEach(item => {
      html += `
        <div class="food-item" id="fi-${item.id}">
          <span class="food-item-icon">${item.icon || '🍴'}</span>
          <div class="food-item-info">
            <div class="food-item-name">${item.name}</div>
            <div class="food-item-meta">${item.amount}${item.unit || 'g'} · חלבון ${Math.round(item.protein||0)}g</div>
          </div>
          <span class="food-item-cal">${Math.round(item.cal)}</span>
          <button class="food-item-del" onclick="deleteEntry('${item.id}')">✕</button>
        </div>`;
    });
  }
  el.innerHTML = html;
}

function deleteEntry(id) {
  todayLog = todayLog.filter(e => e.id !== id);
  saveData();
  updateDashboard();
  showToast('🗑️ נמחק');
}

// ===== FOOD SEARCH =====
function searchFood(query) {
  const el = document.getElementById('search-results');
  if (!query || query.length < 1) { el.innerHTML = ''; return; }
  const q = query.trim().toLowerCase();
  const allFoods = [...FOOD_DB, ...customFoods];
  const results = allFoods.filter(f =>
    f.name.toLowerCase().includes(q) ||
    (f.tags || []).some(t => t.includes(q))
  ).slice(0, 12);
  if (results.length === 0) {
    el.innerHTML = '<div style="text-align:center;color:var(--text3);font-size:.85rem;padding:1rem">לא נמצאו תוצאות. נסה להוסיף ידנית.</div>';
    return;
  }
  el.innerHTML = results.map(f =>
    `<div class="result-item" onclick="openAmountModal(${JSON.stringify(f).replace(/"/g,'&quot;')})">
      <div>
        <div class="result-name">${f.icon || '🍴'} ${f.name}</div>
        <div class="result-sub">ל-100${f.unit} · חלבון ${f.protein}g · פחמ ${f.carbs}g · שומן ${f.fat}g</div>
      </div>
      <span class="result-cal">${f.cal}</span>
    </div>`
  ).join('');
}

// ===== AMOUNT MODAL =====
let pendingFood = null;
function openAmountModal(food) {
  pendingFood = food;
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <h3>${food.icon || '🍴'} ${food.name}</h3>
    <p style="font-size:.8rem;color:var(--text3);margin-bottom:1rem">ל-100${food.unit}: ${food.cal} קק"ל</p>
    <div class="amount-row">
      <div class="input-wrap" style="flex:1">
        <input type="number" id="modal-amount" value="100" min="1" max="2000" oninput="updateModalCalc()" />
        <span class="unit">${food.unit}</span>
      </div>
    </div>
    <div class="amount-info" id="modal-calc">
      קלוריות: <strong>${food.cal}</strong> קק"ל · חלבון: <strong>${food.protein}g</strong>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">ביטול</button>
      <button class="btn-primary" onclick="addFromModal()">הוסף לארוחה</button>
    </div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('modal-amount').focus(), 100);
}

function updateModalCalc() {
  if (!pendingFood) return;
  const amount = parseFloat(document.getElementById('modal-amount').value) || 0;
  const ratio = amount / 100;
  const cal = Math.round(pendingFood.cal * ratio);
  const protein = Math.round((pendingFood.protein || 0) * ratio * 10) / 10;
  const carbs = Math.round((pendingFood.carbs || 0) * ratio * 10) / 10;
  const fat = Math.round((pendingFood.fat || 0) * ratio * 10) / 10;
  document.getElementById('modal-calc').innerHTML =
    `קלוריות: <strong>${cal}</strong> קק"ל · חלבון: <strong>${protein}g</strong> · פחמ: <strong>${carbs}g</strong> · שומן: <strong>${fat}g</strong>`;
}

function addFromModal() {
  if (!pendingFood) return;
  const amount = parseFloat(document.getElementById('modal-amount').value) || 100;
  const ratio = amount / 100;
  addToLog({
    name: pendingFood.name,
    icon: pendingFood.icon || '🍴',
    amount,
    unit: pendingFood.unit,
    cal: pendingFood.cal * ratio,
    protein: (pendingFood.protein || 0) * ratio,
    carbs: (pendingFood.carbs || 0) * ratio,
    fat: (pendingFood.fat || 0) * ratio,
  });
  closeModal();
  document.getElementById('food-search').value = '';
  document.getElementById('search-results').innerHTML = '';
  switchTab('dashboard');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  pendingFood = null;
}

// ===== ADD MANUAL =====
function addManualFood() {
  const name = document.getElementById('manual-name').value.trim();
  const cal = parseFloat(document.getElementById('manual-cal').value);
  const amount = parseFloat(document.getElementById('manual-amount').value) || 100;
  const protein = parseFloat(document.getElementById('manual-protein').value) || 0;
  const carbs = parseFloat(document.getElementById('manual-carbs').value) || 0;
  const fat = parseFloat(document.getElementById('manual-fat').value) || 0;
  if (!name || !cal) { showToast('⚠️ שם וקלוריות הם שדות חובה'); return; }
  const ratio = amount / 100;
  addToLog({ name, icon: '🍴', amount, unit: 'g', cal: cal * ratio, protein: protein * ratio, carbs: carbs * ratio, fat: fat * ratio });
  clearManualForm();
  switchTab('dashboard');
}

function saveToDatabase() {
  const name = document.getElementById('manual-name').value.trim();
  const cal = parseFloat(document.getElementById('manual-cal').value);
  const protein = parseFloat(document.getElementById('manual-protein').value) || 0;
  const carbs = parseFloat(document.getElementById('manual-carbs').value) || 0;
  const fat = parseFloat(document.getElementById('manual-fat').value) || 0;
  if (!name || !cal) { showToast('⚠️ שם וקלוריות הם שדות חובה'); return; }
  customFoods.push({ name, cal, protein, carbs, fat, unit: 'g', icon: '⭐' });
  saveData();
  showToast('⭐ נשמר במאגר האישי!');
}

function clearManualForm() {
  ['manual-name','manual-cal','manual-amount','manual-protein','manual-carbs','manual-fat'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

// ===== ADD TO LOG =====
function addToLog(item) {
  const entry = { ...item, meal: selectedMeal, id: Date.now().toString(36) + Math.random().toString(36).slice(2,6), date: todayKey() };
  todayLog.push(entry);
  saveData();
  updateDashboard();
  showToast(`✅ ${item.name} נוסף!`);
}

// ===== WEIGHT LOG =====
function logWeight() {
  const w = parseFloat(document.getElementById('weight-today').value);
  if (!w || w < 20 || w > 300) { showToast('⚠️ הכנס משקל תקין'); return; }
  const entry = { date: todayKey(), weight: w };
  const existing = weightLog.findIndex(e => e.date === todayKey());
  if (existing >= 0) weightLog[existing] = entry; else weightLog.unshift(entry);
  weightLog = weightLog.slice(0, 30);
  if (profile) { profile.weight = w; saveData(); }
  document.getElementById('weight-today').value = '';
  renderWeightHistory();
  showToast('⚖️ משקל נשמר!');
}

function renderWeightHistory() {
  const el = document.getElementById('weight-history');
  if (weightLog.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = weightLog.slice(0,7).map(e => {
    const d = new Date(e.date).toLocaleDateString('he-IL', { day:'numeric', month:'short' });
    return `<div class="weight-entry"><span>${d}</span><span>${e.weight} ק"ג</span></div>`;
  }).join('');
}

// ===== CLEAR / RESET =====
function clearTodayLog() {
  if (!confirm('למחוק את כל הרשומות של היום?')) return;
  todayLog = [];
  saveData();
  updateDashboard();
  showToast('🗑️ היומן נוקה');
}

function resetAll() {
  if (!confirm('לאפס את כל הנתונים? פעולה זו בלתי הפיכה!')) return;
  localStorage.clear();
  location.reload();
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}
