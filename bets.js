// ================= Betting System Logic =================

// Betting state
let bets = [];

// API Base URL - change this to your server URL
const API_BASE = window.location.origin; // Uses same domain as frontend
// const API_BASE = 'http://localhost:3000'; // Use this if server is on different port

// DOM refs for betting
let betForm, betsList, successMessage, errorMessage;
let totalBetsEl, totalAmountEl, uniqueCombinationsEl;
let currentOddsEl, possibleWinningsEl;
let voittajaEl, pituusEl, betAmountEl;

// ================= Betting Initialization =================
function initBettingSystem() {
  initBettingDOM();
  moveStatsToTilastotWindow();
  initBettingEventListeners();
}

function initBettingDOM() {
  betForm = document.getElementById('betForm');
  betsList = document.getElementById('betsList');
  successMessage = document.getElementById('successMessage');
  errorMessage = document.getElementById('errorMessage');
  currentOddsEl = document.getElementById('currentOdds');
  possibleWinningsEl = document.getElementById('possibleWinnings');
  voittajaEl = document.getElementById('voittaja');
  pituusEl = document.getElementById('pituus');
  betAmountEl = document.getElementById('betAmount');

  // Note: totalBetsEl, totalAmountEl, uniqueCombinationsEl will be set after moveStatsToTilastotWindow()

  // Enforce integer-only input for Pituus (cm)
  if (pituusEl) {
    pituusEl.addEventListener('input', (e) => {
      const digits = e.target.value.replace(/\D+/g, '');
      e.target.value = digits;
      updateOddsDisplay();
    });
  }
}

// ================= Server API Functions =================

// Load bets from server
async function loadBetsFromServer() {
  try {
    showMessage('Ladataan vetoja...', false);
    const response = await fetch(`${API_BASE}/api/bets`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    bets = await response.json();
    console.log(`Loaded ${bets.length} bets from server`);
    
    // Clear loading message
    if (successMessage) successMessage.style.display = 'none';
    
  } catch (error) {
    console.error('Error loading bets from server:', error);
    showMessage(`Virhe ladattaessa vetoja: ${error.message}`, true);
    bets = []; // Fallback to empty array
  }
}

// Save bet to server
async function saveBetToServer(betData) {
  try {
    const response = await fetch(`${API_BASE}/api/bets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(betData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving bet to server:', error);
    throw error;
  }
}

// Delete bet from server (optional function)
async function deleteBetFromServer(betId) {
  try {
    const response = await fetch(`${API_BASE}/api/bets/${betId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting bet from server:', error);
    throw error;
  }
}

// ================= Move Tilastot to own window =================
function moveStatsToTilastotWindow() {
  // Remove stats panel from Veikkaus window (if it exists there)
  const statsInBetting = document.querySelector('#window-betting .stats-panel');
  if (statsInBetting) {
    statsInBetting.remove();
  }
  
  // Remove stats panel from Veikkaukset window (if it exists there)
  const statsInBets = document.querySelector('#window-bets .stats-panel');
  if (statsInBets) {
    statsInBets.remove();
  }

  // Ensure Tilastot window has proper stats structure
  const tilastotWindow = document.getElementById('window-stats');
  const tilastotBody = tilastotWindow?.querySelector('.window-body');
  
  if (tilastotBody) {
    // Clear existing content
    tilastotBody.innerHTML = '';
    
    // Create new stats panel
    const statsPanel = document.createElement('fieldset');
    statsPanel.className = 'stats-panel';
    statsPanel.id = 'statsPanel';
    statsPanel.innerHTML = `
      <legend>Tilastot</legend>
      <div class="stats-row"><span>Vetoja yhteensä:</span> <strong id="totalBets">0</strong></div>
      <div class="stats-row"><span>Panokset yhteensä:</span> <strong id="totalAmount">0,00 €</strong></div>
      <div class="stats-row"><span>Uniikkeja yhdistelmiä:</span> <strong id="uniqueCombinations">0</strong></div>

      <div class="stats-sublist">
        <h4>Vedot kilpailijoittain</h4>
        <ul id="statsByCompetitor"></ul>
      </div>
      <div class="stats-sublist">
        <h4>Vedot pituuksittain</h4>
        <ul id="statsByLength"></ul>
      </div>
    `;
    
    tilastotBody.appendChild(statsPanel);
    
    // Update DOM references to point to the new locations
    totalBetsEl = document.getElementById('totalBets');
    totalAmountEl = document.getElementById('totalAmount');
    uniqueCombinationsEl = document.getElementById('uniqueCombinations');
  }
}

// ================= Betting logic =================
function updateOddsDisplay() {
  const voittaja = (document.getElementById('voittaja') || {}).value?.trim() || '';
  const pituus = (document.getElementById('pituus') || {}).value?.trim() || '';
  const amount = parseFloat((document.getElementById('betAmount') || {}).value) || 0;

  if (voittaja && pituus && amount > 0) {
    const odds = calculateOdds(voittaja, pituus, amount);
    document.getElementById('currentOdds').textContent = odds.toFixed(2);
    document.getElementById('possibleWinnings').textContent = formatCurrency(amount * odds);
  } else {
    document.getElementById('currentOdds').textContent = '--.--';
    document.getElementById('possibleWinnings').textContent = formatCurrency(0);
  }
}

function calculateOdds(voittaja, pituus, currentAmount = 0) {
  const totalBets = bets.length || 1;
  const totalAmount = bets.reduce((sum, bet) => sum + bet.amount, 0) + currentAmount;
  
  // Find matching bets (same winner + same length)
  const matching = bets.filter(b => 
    b.voittaja.toLowerCase() === voittaja.toLowerCase() && 
    String(b.pituus).toLowerCase() === String(pituus).toLowerCase()
  );
  
  const matchingCount = matching.length;
  const matchingAmount = matching.reduce((sum, bet) => sum + bet.amount, 0) + currentAmount;
  
  // Calculate odds: Total pool / Amount bet on this combination
  const odds = totalAmount / matchingAmount;
  
  // Ensure minimum odds of 1.01
  return Math.max(1.01, odds);
}

function computeBreakdowns() {
  const byCompetitor = {};
  const byLength = {};
  bets.forEach(b => {
    const comp = b.voittaja || '(tyhjä)';
    const len = String(b.pituus || '');
    byCompetitor[comp] = (byCompetitor[comp] || 0) + 1;
    byLength[len] = (byLength[len] || 0) + 1;
  });
  return { byCompetitor, byLength };
}

function updateStats() {
  if (totalBetsEl) totalBetsEl.textContent = bets.length;
  if (totalAmountEl) {
    totalAmountEl.textContent =
      formatCurrency(bets.reduce((s, b) => s + (Number(b.amount) || 0), 0));
  }
  if (uniqueCombinationsEl) {
    const combos = new Set(bets.map(b => `${(b.voittaja||'').toLowerCase()}|${String(b.pituus||'').toLowerCase()}`));
    uniqueCombinationsEl.textContent = combos.size;
  }

  const { byCompetitor, byLength } = computeBreakdowns();
  const compUl = document.getElementById('statsByCompetitor');
  if (compUl) {
    compUl.innerHTML = Object.keys(byCompetitor)
      .sort((a,b)=>a.localeCompare(b,'fi'))
      .map(name => `<li><span>${name}</span><strong>${byCompetitor[name]}</strong></li>`)
      .join('') || '<li>-</li>';
  }
  const lenUl = document.getElementById('statsByLength');
  if (lenUl) {
    lenUl.innerHTML = Object.keys(byLength)
      .sort((a,b)=>Number(a)-Number(b))
      .map(k => `<li><span>${k} cm</span><strong>${byLength[k]}</strong></li>`)
      .join('') || '<li>-</li>';
  }
}

function groupByVeikkaaja() {
  const map = {};
  bets.forEach(b => {
    if (!map[b.veikkaaja]) map[b.veikkaaja] = [];
    map[b.veikkaaja].push(b);
  });
  return map;
}

function renderBets() {
  const list = document.getElementById('betsList');
  if (!list) return;

  if (!bets.length) {
    list.innerHTML = '<div class="no-bets-message">Ei vielä vetoja. Aseta ensimmäinen vetosi!</div>';
    updateStats();
    return;
  }
  const groups = groupByVeikkaaja();
  let html = '';
  Object.keys(groups).sort((a,b)=>a.localeCompare(b,'fi')).forEach(name => {
    html += `<div class="group-header">${name}</div>`;
    groups[name].forEach(bet => {
      const winnings = bet.amount * bet.odds;
      html += `
        <div class="bet-item">
          <div class="bet-header">
            <span class="bet-amount">${formatCurrency(bet.amount)}</span>
            <span class="bet-odds">${bet.odds.toFixed(2)}x</span>
          </div>
          <div>
            <div><strong>Voittaja:</strong> ${bet.voittaja}</div>
            <div><strong>Pituus:</strong> ${bet.pituus}</div>
            <div><strong>Mahdollinen voitto:</strong> ${formatCurrency(winnings)}</div>
            <div style="color:#666; margin-top:4px; border-top:1px solid #e0e0e0; padding-top:4px;">
              ${formatDate(bet.placedAt)}
            </div>
          </div>
        </div>`;
    });
  });
  list.innerHTML = html;
  updateStats();
}

// ================= Betting Events =================
function initBettingEventListeners() {
  const form = document.getElementById('betForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const veikkaaja = document.getElementById('veikkaaja').value.trim();
      const voittaja = document.getElementById('voittaja').value.trim();
      const pituusRaw = document.getElementById('pituus').value.trim();
      const amount = parseFloat(document.getElementById('betAmount').value);

      // Validation
      if (!/^\d+$/.test(pituusRaw)) {
        showMessage('ERROR: Pituus (cm) on kokonaisluku, esim. 102.', true);
        return;
      }
      const pituus = parseInt(pituusRaw, 10);

      if (!veikkaaja || !voittaja || !pituusRaw || !amount) {
        showMessage('ERROR: Täytä kaikki kentät.', true);
        return;
      }
      if (amount <= 0) {
        showMessage('ERROR: Panoksen on oltava suurempi kuin 0.', true);
        return;
      }

      // Calculate odds and create bet object
      const odds = calculateOdds(voittaja, String(pituus), amount);
      const newBet = {
        id: generateId(),
        veikkaaja, 
        voittaja, 
        pituus: String(pituus),
        amount, 
        odds,
        placedAt: new Date().toISOString()
      };

      // Show saving message
      showMessage('Tallennetaan vetoa...', false);

      try {
        // Save to server
        const savedBet = await saveBetToServer(newBet);
        
        // Add to local array
        bets.push(savedBet);
        
        // Update UI
        form.reset();
        updateOddsDisplay();
        renderBets();
        showMessage(`Veto asetettu! Kerroin: ${odds.toFixed(2)}, Mahdollinen voitto: ${formatCurrency(amount * odds)}`);
        
      } catch (error) {
        showMessage(`Virhe tallentaessa vetoa: ${error.message}`, true);
      }
    });

    // Live updates
    ['voittaja','pituus','betAmount'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updateOddsDisplay);
    });
  }
}

// ================= Betting Utilities =================
function formatCurrency(amount) {
  return new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR' }).format(amount || 0);
}

function formatDate(dateString) {
  const d = new Date(dateString);
  const date = d.toLocaleDateString('fi-FI');
  const time = d.toLocaleTimeString('fi-FI', { hour12: false });
  return `${date} ${time}`;
}

function showMessage(message, isError = false) {
  const el = isError ? errorMessage : successMessage;
  const other = isError ? successMessage : errorMessage;
  if (!el || !other) return; // Safety check
  
  el.textContent = message;
  el.style.display = 'block';
  other.style.display = 'none';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function generateId() {
  return 'bet_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

// ================= Public API for main script =================
// Export functions that the main script needs to call
window.bettingSystem = {
  init: initBettingSystem,
  loadBets: loadBetsFromServer,
  renderBets: renderBets,
  updateOddsDisplay: updateOddsDisplay,
  updateStats: updateStats
};