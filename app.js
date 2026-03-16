// ========== STATE ==========
let currentView = 'dashboard';
let foodLog = JSON.parse(localStorage.getItem('foodLog') || '[]');
let dailyGoals = JSON.parse(localStorage.getItem('dailyGoals') || 'null') || {
  calories: 2000, protein: 150, carbs: 250, fat: 65
};

// ========== NAVIGATION ==========
function showView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`view-${view}`)?.classList.add('active');
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
  currentView = view;
  if (view === 'dashboard') renderDashboard();
  if (view === 'log') renderLog();
}

// ========== DASHBOARD ==========
function renderDashboard() {
  const today = new Date().toDateString();
  const todayLog = foodLog.filter(e => new Date(e.timestamp).toDateString() === today);
  const totals = calcTotals(todayLog);

  document.getElementById('cal-value').textContent = Math.round(totals.calories);
  document.getElementById('protein-value').textContent = Math.round(totals.protein);
  document.getElementById('carbs-value').textContent = Math.round(totals.carbs);
  document.getElementById('fat-value').textContent = Math.round(totals.fat);

  // Progress rings
  updateRing('cal-ring', totals.calories, dailyGoals.calories);
  updateRing('protein-ring', totals.protein, dailyGoals.protein);
  updateRing('carbs-ring', totals.carbs, dailyGoals.carbs);
  updateRing('fat-ring', totals.fat, dailyGoals.fat);
}

function updateRing(id, value, goal) {
  const el = document.getElementById(id);
  if (!el) return;
  const pct = Math.min(value / goal, 1);
  const circumference = 2 * Math.PI * 28;
  const offset = circumference * (1 - pct);
  el.style.strokeDasharray = circumference;
  el.style.strokeDashoffset = offset;
}

function calcTotals(entries) {
  return entries.reduce((acc, e) => ({
    calories: acc.calories + (e.calories || 0),
    protein: acc.protein + (e.protein || 0),
    carbs: acc.carbs + (e.carbs || 0),
    fat: acc.fat + (e.fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

// ========== ADD FOOD - MAIN MODAL ==========
function openAddFood() {
  document.getElementById('add-food-modal').classList.add('active');
}
function closeAddFood() {
  document.getElementById('add-food-modal').classList.remove('active');
}

// ========== CAMERA / PHOTO ANALYSIS ==========
function openCamera() {
  closeAddFood();
  document.getElementById('camera-modal').classList.add('active');
  startCamera();
}

let cameraStream = null;

async function startCamera() {
  const video = document.getElementById('camera-video');
  const errorEl = document.getElementById('camera-error');
  errorEl.style.display = 'none';
  
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
    });
    video.srcObject = cameraStream;
    video.play();
    document.getElementById('capture-btn').style.display = 'flex';
    document.getElementById('upload-btn-camera').style.display = 'flex';
  } catch (err) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'לא ניתן לגשת למצלמה. נסה להעלות תמונה במקום.';
    document.getElementById('capture-btn').style.display = 'none';
    document.getElementById('upload-btn-camera').style.display = 'flex';
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
}

function closeCameraModal() {
  stopCamera();
  document.getElementById('camera-modal').classList.remove('active');
  document.getElementById('camera-result').style.display = 'none';
  document.getElementById('camera-video').style.display = 'block';
  document.getElementById('capture-btn').style.display = 'flex';
  document.getElementById('camera-preview').style.display = 'none';
}

function capturePhoto() {
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext('2d').drawImage(video, 0, 0);
  
  const imageData = canvas.toDataURL('image/jpeg', 0.85);
  showCameraPreview(imageData);
  stopCamera();
}

function showCameraPreview(imageData) {
  const preview = document.getElementById('camera-preview');
  preview.src = imageData;
  preview.style.display = 'block';
  document.getElementById('camera-video').style.display = 'none';
  document.getElementById('capture-btn').style.display = 'none';
  
  analyzeImageWithAI(imageData);
}

function triggerPhotoUpload() {
  document.getElementById('photo-file-input').click();
}

function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    closeCameraModal();
    document.getElementById('camera-modal').classList.add('active');
    showCameraPreview(e.target.result);
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

async function analyzeImageWithAI(imageData) {
  const resultEl = document.getElementById('camera-result');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div class="analyzing-spinner">
      <div class="spinner"></div>
      <p>מנתח את הארוחה עם AI...</p>
    </div>`;

  try {
    const base64Data = imageData.split(',')[1];
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: base64Data }
            },
            {
              type: "text",
              text: `אתה מומחה תזונה. נתח את התמונה וזהה את האוכל/מנה.
החזר תשובה בפורמט JSON בלבד, ללא טקסט נוסף:
{
  "name": "שם המנה בעברית",
  "quantity": "כמות משוערת (גרמים או יחידות)",
  "calories": מספר,
  "protein": גרמים,
  "carbs": גרמים,
  "fat": גרמים,
  "confidence": "high/medium/low",
  "notes": "הערות קצרות"
}
אם לא ניתן לזהות אוכל בתמונה, החזר { "error": "לא זוהה אוכל בתמונה" }`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.map(b => b.text || '').join('') || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    if (parsed.error) {
      resultEl.innerHTML = `<div class="error-msg">⚠️ ${parsed.error}</div>`;
      return;
    }

    renderAIFoodResult(parsed);
  } catch (err) {
    resultEl.innerHTML = `<div class="error-msg">❌ שגיאה בניתוח התמונה. נסה שוב.</div>`;
  }
}

function renderAIFoodResult(food) {
  const resultEl = document.getElementById('camera-result');
  const confidenceLabel = { high: '✅ בטוח', medium: '🟡 בינוני', low: '🔴 לא בטוח' };
  
  resultEl.innerHTML = `
    <div class="ai-result">
      <div class="ai-result-header">
        <h3>${food.name}</h3>
        <span class="confidence-badge">${confidenceLabel[food.confidence] || '?'}</span>
      </div>
      <p class="quantity-text">כמות: ${food.quantity}</p>
      <div class="macro-grid-small">
        <div class="macro-item-small cal"><span>${Math.round(food.calories)}</span><label>קלוריות</label></div>
        <div class="macro-item-small pro"><span>${Math.round(food.protein)}g</span><label>חלבון</label></div>
        <div class="macro-item-small carb"><span>${Math.round(food.carbs)}g</span><label>פחממות</label></div>
        <div class="macro-item-small fat"><span>${Math.round(food.fat)}g</span><label>שומן</label></div>
      </div>
      ${food.notes ? `<p class="ai-notes">💡 ${food.notes}</p>` : ''}
      <div class="result-actions">
        <button class="btn-add-confirm" onclick="addAIFoodToLog(${JSON.stringify(food).replace(/"/g, '&quot;')})">✅ הוסף ליומן</button>
        <button class="btn-edit-result" onclick="openEditBeforeAdd(${JSON.stringify(food).replace(/"/g, '&quot;')})">✏️ ערוך</button>
      </div>
    </div>`;
}

function addAIFoodToLog(food) {
  const entry = {
    id: Date.now(),
    name: food.name,
    quantity: food.quantity,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    timestamp: new Date().toISOString(),
    source: 'camera'
  };
  foodLog.unshift(entry);
  localStorage.setItem('foodLog', JSON.stringify(foodLog));
  closeCameraModal();
  showToast(`✅ ${food.name} נוסף ליומן!`);
  renderDashboard();
}

// ========== BARCODE SCANNER ==========
function openBarcode() {
  closeAddFood();
  document.getElementById('barcode-modal').classList.add('active');
  startBarcodeScanner();
}

let barcodeStream = null;
let barcodeInterval = null;

async function startBarcodeScanner() {
  const video = document.getElementById('barcode-video');
  const errorEl = document.getElementById('barcode-error');
  errorEl.style.display = 'none';

  // Try native BarcodeDetector first
  if ('BarcodeDetector' in window) {
    try {
      barcodeStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      video.srcObject = barcodeStream;
      await video.play();
      
      const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
      
      barcodeInterval = setInterval(async () => {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            clearInterval(barcodeInterval);
            stopBarcodeScanner();
            lookupBarcode(barcodes[0].rawValue);
          }
        } catch(e) {}
      }, 500);
      return;
    } catch(e) {}
  }

  // Fallback: manual entry
  errorEl.style.display = 'block';
  errorEl.textContent = 'הסורק האוטומטי אינו נתמך. הזן ברקוד ידנית:';
  document.getElementById('manual-barcode-input').style.display = 'flex';
}

function stopBarcodeScanner() {
  if (barcodeInterval) { clearInterval(barcodeInterval); barcodeInterval = null; }
  if (barcodeStream) { barcodeStream.getTracks().forEach(t => t.stop()); barcodeStream = null; }
}

function closeBarcodeModal() {
  stopBarcodeScanner();
  document.getElementById('barcode-modal').classList.remove('active');
  document.getElementById('barcode-result').style.display = 'none';
  document.getElementById('manual-barcode-input').style.display = 'none';
  document.getElementById('barcode-error').style.display = 'none';
}

async function lookupBarcode(barcode) {
  const resultEl = document.getElementById('barcode-result');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div class="analyzing-spinner">
      <div class="spinner"></div>
      <p>מחפש מוצר: ${barcode}</p>
    </div>`;

  try {
    // Try Open Food Facts API
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const data = await response.json();

    if (data.status === 1 && data.product) {
      const p = data.product;
      const nutriments = p.nutriments || {};
      const per100 = {
        name: p.product_name_he || p.product_name || p.generic_name || 'מוצר לא ידוע',
        brand: p.brands || '',
        quantity: p.quantity || '100g',
        calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
        protein: nutriments.proteins_100g || 0,
        carbs: nutriments.carbohydrates_100g || 0,
        fat: nutriments.fat_100g || 0,
        image: p.image_front_small_url || p.image_url || null,
        barcode: barcode
      };
      renderBarcodeResult(per100);
    } else {
      // Not found - ask AI
      resultEl.innerHTML = `
        <div class="not-found-msg">
          <p>⚠️ המוצר לא נמצא במסד הנתונים (${barcode})</p>
          <button class="btn-secondary" onclick="searchBarcodeWithAI('${barcode}')">🤖 נסה עם AI</button>
        </div>`;
    }
  } catch(err) {
    resultEl.innerHTML = `<div class="error-msg">❌ שגיאת חיבור. בדוק אינטרנט ונסה שוב.</div>`;
  }
}

function lookupManualBarcode() {
  const input = document.getElementById('barcode-manual-input');
  const barcode = input.value.trim();
  if (!barcode || barcode.length < 8) {
    showToast('❌ הזן ברקוד תקין (8+ ספרות)');
    return;
  }
  lookupBarcode(barcode);
}

async function searchBarcodeWithAI(barcode) {
  const resultEl = document.getElementById('barcode-result');
  resultEl.innerHTML = `
    <div class="analyzing-spinner">
      <div class="spinner"></div>
      <p>שואל AI על ברקוד ${barcode}...</p>
    </div>`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `ברקוד: ${barcode}. האם אתה מכיר מוצר מזון עם ברקוד זה? אם כן, תן ערכים תזונתיים ל-100 גרם.
החזר JSON בלבד:
{ "name": "שם המוצר", "brand": "מותג", "calories": מספר, "protein": מספר, "carbs": מספר, "fat": מספר }
אם לא מכיר, החזר: { "error": "מוצר לא נמצא" }`
        }]
      })
    });
    const data = await response.json();
    const text = data.content?.map(b => b.text || '').join('') || '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (parsed.error) {
      resultEl.innerHTML = `<div class="error-msg">מוצר לא נמצא עבור ברקוד ${barcode}</div>`;
    } else {
      renderBarcodeResult({ ...parsed, quantity: '100g', barcode });
    }
  } catch(e) {
    resultEl.innerHTML = `<div class="error-msg">❌ שגיאה בחיפוש</div>`;
  }
}

function renderBarcodeResult(product) {
  const resultEl = document.getElementById('barcode-result');
  resultEl.innerHTML = `
    <div class="barcode-product">
      ${product.image ? `<img src="${product.image}" class="product-image" alt="${product.name}">` : '<div class="product-no-img">📦</div>'}
      <div class="product-info">
        <h3>${product.name}</h3>
        ${product.brand ? `<p class="brand">${product.brand}</p>` : ''}
        <p class="per-label">ערכים ל-100 גרם:</p>
      </div>
      <div class="macro-grid-small">
        <div class="macro-item-small cal"><span>${Math.round(product.calories)}</span><label>קלוריות</label></div>
        <div class="macro-item-small pro"><span>${Math.round(product.protein)}g</span><label>חלבון</label></div>
        <div class="macro-item-small carb"><span>${Math.round(product.carbs)}g</span><label>פחממות</label></div>
        <div class="macro-item-small fat"><span>${Math.round(product.fat)}g</span><label>שומן</label></div>
      </div>
      <div class="portion-selector">
        <label>כמות (גרם):</label>
        <input type="number" id="portion-input" value="100" min="1" max="2000" 
               onchange="updatePortionCalc(${product.calories},${product.protein},${product.carbs},${product.fat})">
        <span id="portion-calc">= ${Math.round(product.calories)} קלוריות</span>
      </div>
      <div class="result-actions">
        <button class="btn-add-confirm" onclick="addBarcodeFood('${product.name.replace(/'/g,"\\'")}',${product.calories},${product.protein},${product.carbs},${product.fat})">✅ הוסף ליומן</button>
      </div>
    </div>`;
}

function updatePortionCalc(cal, pro, carb, fat) {
  const grams = parseFloat(document.getElementById('portion-input').value) || 100;
  const factor = grams / 100;
  document.getElementById('portion-calc').textContent = `= ${Math.round(cal * factor)} קלוריות`;
}

function addBarcodeFood(name, cal, pro, carb, fat) {
  const grams = parseFloat(document.getElementById('portion-input')?.value) || 100;
  const factor = grams / 100;
  const entry = {
    id: Date.now(),
    name: name,
    quantity: `${grams}g`,
    calories: cal * factor,
    protein: pro * factor,
    carbs: carb * factor,
    fat: fat * factor,
    timestamp: new Date().toISOString(),
    source: 'barcode'
  };
  foodLog.unshift(entry);
  localStorage.setItem('foodLog', JSON.stringify(foodLog));
  closeBarcodeModal();
  showToast(`✅ ${name} נוסף ליומן!`);
  renderDashboard();
}

// ========== MANUAL ENTRY ==========
function openManualEntry() {
  closeAddFood();
  document.getElementById('manual-modal').classList.add('active');
}
function closeManualModal() {
  document.getElementById('manual-modal').classList.remove('active');
}

async function searchFoodManual() {
  const query = document.getElementById('manual-search').value.trim();
  if (!query) return;
  
  const resultsEl = document.getElementById('manual-results');
  resultsEl.innerHTML = '<div class="spinner-small"></div>';

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: `ערכים תזונתיים ל: "${query}".
החזר JSON בלבד - מערך של עד 3 אפשרויות:
[{"name":"שם","quantity":"100g","calories":X,"protein":X,"carbs":X,"fat":X}]`
        }]
      })
    });
    const data = await response.json();
    const text = data.content?.map(b => b.text || '').join('') || '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    
    resultsEl.innerHTML = parsed.map(item => `
      <div class="search-result-item" onclick="selectManualFood(this)" 
           data-food='${JSON.stringify(item).replace(/'/g,"&#39;")}'>
        <div class="result-name">${item.name}</div>
        <div class="result-macros">${Math.round(item.calories)} קל | ${Math.round(item.protein)}g חלבון</div>
      </div>`).join('');
  } catch(e) {
    resultsEl.innerHTML = '<div class="error-msg">❌ שגיאה בחיפוש</div>';
  }
}

let selectedManualFood = null;

function selectManualFood(el) {
  document.querySelectorAll('.search-result-item').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  selectedManualFood = JSON.parse(el.dataset.food);
  document.getElementById('manual-add-section').style.display = 'block';
}

function addManualFood() {
  if (!selectedManualFood) return;
  const grams = parseFloat(document.getElementById('manual-grams').value) || 100;
  const factor = grams / 100;
  const entry = {
    id: Date.now(),
    name: selectedManualFood.name,
    quantity: `${grams}g`,
    calories: selectedManualFood.calories * factor,
    protein: selectedManualFood.protein * factor,
    carbs: selectedManualFood.carbs * factor,
    fat: selectedManualFood.fat * factor,
    timestamp: new Date().toISOString(),
    source: 'manual'
  };
  foodLog.unshift(entry);
  localStorage.setItem('foodLog', JSON.stringify(foodLog));
  closeManualModal();
  showToast(`✅ ${entry.name} נוסף!`);
  renderDashboard();
}

// ========== LOG VIEW ==========
function renderLog() {
  const container = document.getElementById('log-entries');
  if (!foodLog.length) {
    container.innerHTML = '<div class="empty-log">אין רשומות עדיין 🍽️</div>';
    return;
  }
  
  // Group by date
  const groups = {};
  foodLog.forEach(e => {
    const d = new Date(e.timestamp).toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!groups[d]) groups[d] = [];
    groups[d].push(e);
  });

  container.innerHTML = Object.entries(groups).map(([date, entries]) => {
    const totals = calcTotals(entries);
    return `
      <div class="log-group">
        <div class="log-date-header">
          <span>${date}</span>
          <span class="log-date-total">${Math.round(totals.calories)} קל</span>
        </div>
        ${entries.map(e => `
          <div class="log-entry">
            <div class="entry-icon">${e.source === 'camera' ? '📷' : e.source === 'barcode' ? '🔍' : '✏️'}</div>
            <div class="entry-info">
              <div class="entry-name">${e.name}</div>
              <div class="entry-qty">${e.quantity || ''}</div>
            </div>
            <div class="entry-macros">
              <span class="e-cal">${Math.round(e.calories)} קל</span>
              <span class="e-mac">${Math.round(e.protein)}P · ${Math.round(e.carbs)}C · ${Math.round(e.fat)}F</span>
            </div>
            <button class="entry-delete" onclick="deleteEntry(${e.id})">✕</button>
          </div>`).join('')}
      </div>`;
  }).join('');
}

function deleteEntry(id) {
  foodLog = foodLog.filter(e => e.id !== id);
  localStorage.setItem('foodLog', JSON.stringify(foodLog));
  renderLog();
  renderDashboard();
}

// ========== GOALS ==========
function openGoals() {
  document.getElementById('goals-modal').classList.add('active');
  document.getElementById('goal-calories').value = dailyGoals.calories;
  document.getElementById('goal-protein').value = dailyGoals.protein;
  document.getElementById('goal-carbs').value = dailyGoals.carbs;
  document.getElementById('goal-fat').value = dailyGoals.fat;
}
function closeGoals() {
  document.getElementById('goals-modal').classList.remove('active');
}
function saveGoals() {
  dailyGoals = {
    calories: parseFloat(document.getElementById('goal-calories').value) || 2000,
    protein: parseFloat(document.getElementById('goal-protein').value) || 150,
    carbs: parseFloat(document.getElementById('goal-carbs').value) || 250,
    fat: parseFloat(document.getElementById('goal-fat').value) || 65
  };
  localStorage.setItem('dailyGoals', JSON.stringify(dailyGoals));
  closeGoals();
  renderDashboard();
  showToast('✅ יעדים נשמרו!');
}

// ========== EDIT BEFORE ADD ==========
function openEditBeforeAdd(food) {
  // Show edit form with food data pre-filled
  const modal = document.getElementById('edit-food-modal');
  document.getElementById('edit-name').value = food.name;
  document.getElementById('edit-calories').value = food.calories;
  document.getElementById('edit-protein').value = food.protein;
  document.getElementById('edit-carbs').value = food.carbs;
  document.getElementById('edit-fat').value = food.fat;
  modal.classList.add('active');
}
function closeEditModal() {
  document.getElementById('edit-food-modal').classList.remove('active');
}
function saveEditedFood() {
  const entry = {
    id: Date.now(),
    name: document.getElementById('edit-name').value,
    quantity: 'ידני',
    calories: parseFloat(document.getElementById('edit-calories').value) || 0,
    protein: parseFloat(document.getElementById('edit-protein').value) || 0,
    carbs: parseFloat(document.getElementById('edit-carbs').value) || 0,
    fat: parseFloat(document.getElementById('edit-fat').value) || 0,
    timestamp: new Date().toISOString(),
    source: 'manual'
  };
  foodLog.unshift(entry);
  localStorage.setItem('foodLog', JSON.stringify(foodLog));
  closeEditModal();
  closeCameraModal();
  showToast(`✅ ${entry.name} נוסף!`);
  renderDashboard();
}

// ========== TOAST ==========
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  
  // Enter key for search
  document.getElementById('manual-search')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') searchFoodManual();
  });
  document.getElementById('barcode-manual-input')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') lookupManualBarcode();
  });
});
