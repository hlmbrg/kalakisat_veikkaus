// ================= Firebase Betting System =================

// Import Firebase modules (add this to your HTML head)
// <script type="module">
//   import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
//   import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
//   // ... other imports
// </script>

// Firebase configuration - replace with your config
const firebaseConfig = {
  apiKey: "AIzaSyAYd1XtkfUb4gNyHeO0kEqw68XF-k-e7L0",
  authDomain: "kalakisat-c6a21.firebaseapp.com",
  projectId: "kalakisat-c6a21",
  storageBucket: "kalakisat-c6a21.firebasestorage.app",
  messagingSenderId: "230043715899",
  appId: "1:230043715899:web:435638322c9324140f4f1e"
};

// Initialize Firebase
let db;
let betsCollection;

async function initFirebase() {
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
    const { getFirestore, collection, addDoc, getDocs, onSnapshot, query, orderBy } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
    
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    betsCollection = collection(db, 'bets');
    
    console.log('Firebase initialized successfully');
    return { addDoc, getDocs, onSnapshot, query, orderBy };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

// Betting state
let bets = [];
let firebaseUtils = null;

// DOM refs for betting
let betForm, betsList, successMessage, errorMessage;
let totalBetsEl, totalAmountEl, uniqueCombinationsEl;
let currentOddsEl, possibleWinningsEl;
let voittajaEl, pituusEl, betAmountEl;

// ================= Firebase Betting Functions =================

async function loadBetsFromFirebase() {
  try {
    if (!firebaseUtils) {
      firebaseUtils = await initFirebase();
    }
    
    showMessage('Ladataan vetoja...', false);
    
    const { getDocs, query, orderBy } = firebaseUtils;
    const q = query(betsCollection, orderBy('placedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    bets = [];
    querySnapshot.forEach((doc) => {
      bets.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`Loaded ${bets.length} bets from Firebase`);
    
    // Clear loading message
    if (successMessage) successMessage.style.display = 'none';
    
    return bets;
    
  } catch (error) {
    console.error('Error loading bets from Firebase:', error);
    showMessage(`Virhe ladattaessa vetoja: ${error.message}`, true);
    
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem('bets_v1');
      bets = raw ? JSON.parse(raw) : [];
      showMessage(`Firebase ei käytettävissä, käytetään paikallista tallennusta. Ladattu ${bets.length} vetoa.`, false);
    } catch (storageError) {
      bets = [];
    }
    
    return bets;
  }
}

async function saveBetToFirebase(betData) {
  try {
    if (!firebaseUtils) {
      firebaseUtils = await initFirebase();
    }
    
    const { addDoc } = firebaseUtils;
    
    // Add timestamp if not present
    if (!betData.placedAt) {
      betData.placedAt = new Date().toISOString();
    }
    
    // Save to Firebase
    const docRef = await addDoc(betsCollection, betData);
    const savedBet = { id: docRef.id, ...betData };
    
    console.log('Bet saved to Firebase with ID:', docRef.id);
    
    // Also save to localStorage as backup
    try {
      const raw = localStorage.getItem('bets_v1');
      const localBets = raw ? JSON.parse(raw) : [];
      localBets.push(savedBet);
      localStorage.setItem('bets_v1', JSON.stringify(localBets));
    } catch (e) {
      // Ignore localStorage errors
    }
    
    return savedBet;
    
  } catch (error) {
    console.error('Error saving bet to Firebase:', error);
    
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem('bets_v1');
      const localBets = raw ? JSON.parse(raw) : [];
      const localBet = { id: generateId(), ...betData };
      localBets.push(localBet);
      localStorage.setItem('bets_v1', JSON.stringify(localBets));
      
      console.log('Saved bet to localStorage (Firebase fallback)');
      return localBet;
    } catch (storageError) {
      throw new Error('Sekä Firebase että paikallinen tallennus epäonnistuivat');
    }
  }
}

// Real-time listener for new bets
async function setupRealtimeListener() {
  try {
    if (!firebaseUtils) {
      firebaseUtils = await initFirebase();
    }
    
    const { onSnapshot, query, orderBy } = firebaseUtils;
    const q = query(betsCollection, orderBy('placedAt', 'desc'));
    
    // Listen for real-time updates
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newBets = [];
      querySnapshot.forEach((doc) => {
        newBets.push({ id: doc.id, ...doc.data() });
      });
      
      // Only update if there are changes
      if (JSON.stringify(newBets) !== JSON.stringify(bets)) {
        bets = newBets;
        renderBets();
        console.log(`Real-time update: ${bets.length} bets loaded`);
      }
    });
    
    console.log('Real-time listener set up');
    return unsubscribe;
    
  } catch (error) {
    console.error('Error setting up real-time listener:', error);
  }
}

// ================= Betting System Integration =================

function initFirebaseBettingSystem() {
  initBettingDOM();
  moveStatsToTilastotWindow();
  initBettingEventListeners();
  
  // Set up real-time listener
  setupRealtimeListener();
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

  // Enforce integer-only input for Pituus (cm)
  if (pituusEl) {
    pituusEl.addEventListener('input', (e) => {
      const digits = e.target.value.replace(/\D+/g, '');
      e.target.value = digits;
      updateOddsDisplay();
    });
  }

  // Add change listener for dropdown
  if (voittajaEl) {
    voittajaEl.addEventListener('change', updateOddsDisplay);
  }
}

function moveStatsToTilastotWindow() {
  // Remove stats panel from other windows
  const statsInBetting = document.querySelector('#window-betting .stats-panel');
  if (statsInBetting) statsInBetting.remove();
  
  const statsInBets = document.querySelector('#window-bets .stats-panel');
  if (statsInBets) statsInBets.remove();

  // Create stats in Tilastot window
  const tilastotWindow = document.getElementById('window-stats');
  const tilastotBody = tilastotWindow?.querySelector('.window-body');
  
  if (tilastotBody) {
    tilastotBody.innerHTML = '';
    
    const statsPanel = document.createElement('fieldset');
    statsPanel.className = 'stats-panel';
    statsPanel.id = 'statsPanel';
    statsPanel.innerHTML = `
      <div class="stats-row"><span>Vetoja yhteensä:</span> <strong id="totalBets">0</strong></div>
      <div class="stats-row"><span>Panokset yhteensä:</span> <strong id="totalAmount">0,00 €</strong></div>
      <div class="stats-row"><span>Uniikkeja yhdistelmiä:</span> <strong id="uniqueCombinations">0</strong></div>
      <div class="stats-row"><span>Aktiivisia käyttäjiä:</span> <strong id="activePlayers">0</strong></div>

      <div class="stats-sublist">
        <h4>Vedot kilpailijoittain</h4>
        <ul id="statsByCompetitor"></ul>
      </div>
      
      <div class="stats-sublist">
        <h4>Vedot pituuksittain</h4>
        <div id="lengthChart" class="length-chart"></div>
        <ul id="statsByLength"></ul>
      </div>
      
      <div class="firebase-status">
        <div id="connectionStatus">🔄 Yhdistetään...</div>
      </div>
    `;
    
    tilastotBody.appendChild(statsPanel);
    
    // Update DOM references
    totalBetsEl = document.getElementById('totalBets');
    totalAmountEl = document.getElementById('totalAmount');
    uniqueCombinationsEl = document.getElementById('uniqueCombinations');
  }
}

// ================= Betting Logic (same as before) =================
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

function updateStats() {
  if (totalBetsEl) totalBetsEl.textContent = bets.length;
  if (totalAmountEl) {
    totalAmountEl.textContent = formatCurrency(bets.reduce((s, b) => s + (Number(b.amount) || 0), 0));
  }
  if (uniqueCombinationsEl) {
    const combos = new Set(bets.map(b => `${(b.voittaja||'').toLowerCase()}|${String(b.pituus||'').toLowerCase()}`));
    uniqueCombinationsEl.textContent = combos.size;
  }
  
  // Update active players count
  const activePlayersEl = document.getElementById('activePlayers');
  if (activePlayersEl) {
    const uniquePlayers = new Set(bets.map(b => b.veikkaaja));
    activePlayersEl.textContent = uniquePlayers.size;
  }

  // Update breakdowns
  const byCompetitor = {};
  const byLength = {};
  bets.forEach(b => {
    const comp = b.voittaja || '(tyhjä)';
    const len = String(b.pituus || '');
    byCompetitor[comp] = (byCompetitor[comp] || 0) + 1;
    byLength[len] = (byLength[len] || 0) + 1;
  });

  const compUl = document.getElementById('statsByCompetitor');
  if (compUl) {
    compUl.innerHTML = Object.keys(byCompetitor)
      .sort((a,b)=>a.localeCompare(b,'fi'))
      .map(name => `<li><span>${name}</span><strong>${byCompetitor[name]}</strong></li>`)
      .join('') || '<li>-</li>';
  }
  
  // Update length chart
  updateLengthChart(byLength);
  
  const lenUl = document.getElementById('statsByLength');
  if (lenUl) {
    lenUl.innerHTML = Object.keys(byLength)
      .sort((a,b)=>Number(a)-Number(b))
      .map(k => `<li><span>${k} cm</span><strong>${byLength[k]}</strong></li>`)
      .join('') || '<li>-</li>';
  }
  
  // Update connection status
  const statusEl = document.getElementById('connectionStatus');
  if (statusEl) {
    statusEl.textContent = firebaseUtils ? '🟢 Yhdistetty' : '🔴 Offline-tila';
  }
}

function updateLengthChart(byLength) {
  const chartEl = document.getElementById('lengthChart');
  if (!chartEl || !Object.keys(byLength).length) {
    if (chartEl) chartEl.innerHTML = '<div class="no-data">Ei dataa näytettäväksi</div>';
    return;
  }

  // Sort lengths numerically and get max count for scaling
  const sortedLengths = Object.keys(byLength).sort((a, b) => Number(a) - Number(b));
  const maxCount = Math.max(...Object.values(byLength));
  
  // Create bar chart
  let chartHTML = '<div class="chart-container">';
  
  sortedLengths.forEach(length => {
    const count = byLength[length];
    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
    const barHeight = Math.max(percentage, 5); // Minimum 5% height for visibility
    
    // Use single color for all bars
    const barColor = '#4ecdc4'; // Teal color
    
    chartHTML += `
      <div class="chart-bar-container">
        <div class="chart-bar" style="height: ${barHeight}%; background-color: ${barColor};" 
             title="${length}cm: ${count} vetoa">
          <div class="bar-value">${count}</div>
        </div>
        <div class="bar-label">${length}cm</div>
      </div>
    `;
  });
  
  chartHTML += '</div>';
  
  // No legend - removed completely
  
  chartEl.innerHTML = chartHTML;
}

function renderBets() {
  const list = document.getElementById('betsList');
  if (!list) return;

  if (!bets.length) {
    list.innerHTML = '<div class="no-bets-message">Ei vielä vetoja. Aseta ensimmäinen vetosi!</div>';
    updateStats();
    return;
  }
  
  // Sort bets by timestamp (newest first) and group by player
  const sortedBets = [...bets].sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  
  const groups = {};
  sortedBets.forEach(b => {
    if (!groups[b.veikkaaja]) groups[b.veikkaaja] = [];
    groups[b.veikkaaja].push(b);
  });
  
  let html = '';
  
  // Sort players by their most recent bet
  const playersByRecentBet = Object.keys(groups).sort((a, b) => {
    const latestA = Math.max(...groups[a].map(bet => new Date(bet.placedAt)));
    const latestB = Math.max(...groups[b].map(bet => new Date(bet.placedAt)));
    return latestB - latestA;
  });
  
  playersByRecentBet.forEach(name => {
    const playerBets = groups[name];
    const totalAmount = playerBets.reduce((sum, bet) => sum + bet.amount, 0);
    
    html += `<div class="group-header">${name} (${playerBets.length} vetoa, yhteensä ${formatCurrency(totalAmount)})</div>`;
    
    // Show bets in chronological order (newest first within each player)
    playerBets.forEach(bet => {
      const timeDiff = getTimeDifference(bet.placedAt);
      html += `
        <div class="bet-item">
          <div class="bet-header">
            <span class="bet-amount">${formatCurrency(bet.amount)}</span>
            <span class="bet-time">${timeDiff}</span>
          </div>
          <div>
            <div><strong>Voittaja:</strong> ${bet.voittaja}</div>
            <div><strong>Pituus:</strong> ${bet.pituus} cm</div>
            <div class="bet-timestamp">${formatDate(bet.placedAt)}</div>
          </div>
        </div>`;
    });
  });
  
  list.innerHTML = html;
  updateStats();
}

// ================= Event Listeners =================
function initBettingEventListeners() {
  const form = document.getElementById('betForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const veikkaaja = document.getElementById('veikkaaja').value.trim();
      const voittaja = document.getElementById('voittaja').value; // No trim needed for dropdown
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
        // Save to Firebase
        const savedBet = await saveBetToFirebase(newBet);
        
        // Update UI
        form.reset();
        updateOddsDisplay();
        showMessage(`Veto tallennettu! Kerroin: ${odds.toFixed(2)}, Mahdollinen voitto: ${formatCurrency(amount * odds)} 🔥`);
        
        // Note: renderBets() will be called automatically by the real-time listener
        
      } catch (error) {
        showMessage(`Virhe tallentaessa vetoa: ${error.message}`, true);
      }
    });

    // Live updates - updated to handle dropdown
    ['voittaja','pituus','betAmount'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'SELECT') {
          el.addEventListener('change', updateOddsDisplay);
        } else {
          el.addEventListener('input', updateOddsDisplay);
        }
      }
    });
  }
}

// ================= Utilities =================
function formatCurrency(amount) {
  return new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR' }).format(amount || 0);
}

function formatDate(dateString) {
  const d = new Date(dateString);
  const date = d.toLocaleDateString('fi-FI');
  const time = d.toLocaleTimeString('fi-FI', { hour12: false });
  return `${date} ${time}`;
}

function getTimeDifference(dateString) {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'juuri nyt';
  if (diffMins < 60) return `${diffMins} min sitten`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} h sitten`;
  return `${Math.floor(diffMins / 1440)} pv sitten`;
}

function showMessage(message, isError = false) {
  const el = isError ? errorMessage : successMessage;
  const other = isError ? successMessage : errorMessage;
  if (!el || !other) return;
  
  el.textContent = message;
  el.style.display = 'block';
  other.style.display = 'none';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function generateId() {
  return 'bet_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

// ================= Public API =================
window.bettingSystem = {
  init: initFirebaseBettingSystem,
  loadBets: loadBetsFromFirebase,
  renderBets: renderBets,
  updateOddsDisplay: updateOddsDisplay,
  updateStats: updateStats
};