// ================= Firebase Betting System - Simplified =================

// Firebase configuration
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
    betsCollection = collection(db, 'bets_2026');
    
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
let currentOddsEl, possibleWinningsEl;
let voittajaEl, betAmountEl;

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
    
    
    // Clear loading message
    if (successMessage) successMessage.style.display = 'none';
    
    // Update connection status
    updateConnectionStatus(true);
    
    return bets;
    
  } catch (error) {
    console.error('Error loading bets from Firebase:', error);
    showMessage(`Virhe ladattaessa vetoja: ${error.message}`, true);
    
    // Update connection status
    updateConnectionStatus(false);
    
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem('bets_2026_local');
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
    
    
    // Also save to localStorage as backup
    try {
      const raw = localStorage.getItem('bets_2026_local');
      const localBets = raw ? JSON.parse(raw) : [];
      localBets.push(savedBet);
      localStorage.setItem('bets_2026_local', JSON.stringify(localBets));
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // Update connection status
    updateConnectionStatus(true);
    
    return savedBet;
    
  } catch (error) {
    console.error('Error saving bet to Firebase:', error);
    
    // Update connection status
    updateConnectionStatus(false);
    
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem('bets_2026_local');
      const localBets = raw ? JSON.parse(raw) : [];
      const localBet = { id: generateId(), ...betData };
      localBets.push(localBet);
      localStorage.setItem('bets_2026_local', JSON.stringify(localBets));
      
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
        updateStats();
      }
      
      // Update connection status
      updateConnectionStatus(true);
    }, (error) => {
      console.error('Real-time listener error:', error);
      updateConnectionStatus(false);
    });
    
    return unsubscribe;
    
  } catch (error) {
    console.error('Error setting up real-time listener:', error);
    updateConnectionStatus(false);
  }
}

// ================= Betting System Integration =================

function initFirebaseBettingSystem() {
  initBettingDOM();
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
  betAmountEl = document.getElementById('betAmount');

  // Load saved values
  loadSavedFormValues();

  // Enforce integer-only input for Summa (€) with range 1-200
  if (betAmountEl) {
    betAmountEl.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D+/g, ''); // Keep only digits
      if (value) {
        value = Math.max(1, Math.min(200, parseInt(value, 10))); // Clamp between 1-200
        e.target.value = value;
      } else {
        e.target.value = '';
      }
      updateOddsDisplay();
    });
  }

  // Add change listener for dropdown and save selection
  if (voittajaEl) {
    voittajaEl.addEventListener('change', (e) => {
      saveFormValue('lastWinner', e.target.value);
      updateOddsDisplay();
    });
  }

  // Save veikkaaja name when it changes
  const veikkaajaEl = document.getElementById('veikkaaja');
  if (veikkaajaEl) {
    veikkaajaEl.addEventListener('input', (e) => {
      saveFormValue('lastVeikkaaja', e.target.value);
    });
  }
}

// Load saved form values
function loadSavedFormValues() {
  try {
    // Load last veikkaaja name
    const lastVeikkaaja = localStorage.getItem('betting_lastVeikkaaja');
    if (lastVeikkaaja && document.getElementById('veikkaaja')) {
      document.getElementById('veikkaaja').value = lastVeikkaaja;
    }

    // Load last winner selection
    const lastWinner = localStorage.getItem('betting_lastWinner');
    if (lastWinner && document.getElementById('voittaja')) {
      document.getElementById('voittaja').value = lastWinner;
    }

  } catch (error) {
    console.error('Error loading saved form values:', error);
  }
}

// Save form value to localStorage
function saveFormValue(key, value) {
  try {
    if (value && value.trim()) {
      localStorage.setItem(`betting_${key}`, value.trim());
    }
  } catch (error) {
    console.error('Error saving form value:', error);
  }
}

// Update connection status indicator
function updateConnectionStatus(isConnected) {
  const statusEl = document.getElementById('connectionStatus');
  if (statusEl) {
    if (isConnected) {
      statusEl.textContent = 'Yhdistetty Firebase';
      statusEl.style.color = '#90EE90';
    } else {
      statusEl.textContent = 'Offline-tila';
      statusEl.style.color = '#FFB6C1';
    }
  }
}

// ================= Betting Logic =================
function updateOddsDisplay() {
  const voittaja = (document.getElementById('voittaja') || {}).value?.trim() || '';
  const amount = parseFloat((document.getElementById('betAmount') || {}).value) || 0;

  if (voittaja && amount > 0) {
    const odds = calculateOdds(voittaja, amount);
    document.getElementById('currentOdds').textContent = odds.toFixed(2);
    document.getElementById('possibleWinnings').textContent = formatCurrency(amount * odds);
  } else {
    document.getElementById('currentOdds').textContent = '--.--';
    document.getElementById('possibleWinnings').textContent = formatCurrency(0);
  }
}

function calculateOdds(voittaja, currentAmount = 0) {
  const totalAmount = bets.reduce((sum, bet) => sum + bet.amount, 0) + currentAmount;

  const matching = bets.filter(b =>
    b.voittaja.toLowerCase() === voittaja.toLowerCase()
  );

  const matchingAmount = matching.reduce((sum, bet) => sum + bet.amount, 0) + currentAmount;
  
  // Calculate odds: Total pool / Amount bet on this winner
  const odds = totalAmount / matchingAmount;
  
  // Ensure minimum odds of 1.01
  return Math.max(1.01, odds);
}

function updateStats() {
  const totalBetsEl = document.getElementById('totalBets');
  const totalAmountEl = document.getElementById('totalAmount');
  const activePlayersEl = document.getElementById('activePlayers');
  const averageBetEl = document.getElementById('averageBet');

  if (totalBetsEl) totalBetsEl.textContent = bets.length;
  if (totalAmountEl) {
    totalAmountEl.textContent = formatCurrency(bets.reduce((s, b) => s + (Number(b.amount) || 0), 0));
  }
  
  // Update active players count
  if (activePlayersEl) {
    const uniquePlayers = new Set(bets.map(b => b.veikkaaja));
    activePlayersEl.textContent = uniquePlayers.size;
  }
  
  // Update average bet
  if (averageBetEl) {
    const totalAmount = bets.reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const avgBet = bets.length > 0 ? totalAmount / bets.length : 0;
    averageBetEl.textContent = formatCurrency(avgBet);
  }

  // Update breakdowns
  const byWinner = {};
  const byPlayer = {};
  
  bets.forEach(b => {
    const winner = b.voittaja || '(tyhjä)';
    const player = b.veikkaaja || '(tuntematon)';
    
    // Count by winner and sum amounts
    if (!byWinner[winner]) {
      byWinner[winner] = { count: 0, amount: 0 };
    }
    byWinner[winner].count += 1;
    byWinner[winner].amount += Number(b.amount) || 0;
    
    // Count by player and sum amounts
    if (!byPlayer[player]) {
      byPlayer[player] = { count: 0, amount: 0 };
    }
    byPlayer[player].count += 1;
    byPlayer[player].amount += Number(b.amount) || 0;
  });

  // Update winner chart
  updateWinnerChart(byWinner);
  
  // Update winner stats list
  const winnerUl = document.getElementById('statsByWinner');
  if (winnerUl) {
    winnerUl.innerHTML = Object.keys(byWinner)
      .sort((a,b) => byWinner[b].amount - byWinner[a].amount) // Sort by amount desc
      .map(name => `<li><span>${escapeHtml(name)}</span><strong>${formatCurrency(byWinner[name].amount)} (${byWinner[name].count} vetoa)</strong></li>`)
      .join('') || '<li>-</li>';
  }

  // Update player stats list
  const playerUl = document.getElementById('statsByPlayer');
  if (playerUl) {
    playerUl.innerHTML = Object.keys(byPlayer)
      .sort((a,b) => byPlayer[b].amount - byPlayer[a].amount)
      .map(name => `<li><span>${escapeHtml(name)}</span><strong>${formatCurrency(byPlayer[name].amount)} (${byPlayer[name].count} vetoa)</strong></li>`)
      .join('') || '<li>-</li>';
  }
  
  // Update top 3 largest bets
  updateTopBets();
}

function updateWinnerChart(byWinner) {
  const chartEl = document.getElementById('winnerChart');
  if (!chartEl || !Object.keys(byWinner).length) {
    if (chartEl) chartEl.innerHTML = '<div class="no-data">Ei dataa näytettäväksi</div>';
    return;
  }

  // Sort winners by amount and get max amount for scaling
  const sortedWinners = Object.keys(byWinner).sort((a, b) => byWinner[b].amount - byWinner[a].amount);
  const maxAmount = Math.max(...Object.values(byWinner).map(w => w.amount));
  
  // Create bar chart
  let chartHTML = '<div class="chart-container">';
  
  // Use different colors for each winner
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];
  
  sortedWinners.forEach((winner, index) => {
    const data = byWinner[winner];
    const percentage = maxAmount > 0 ? (data.amount / maxAmount) * 100 : 0;
    const barHeight = Math.max(percentage, 5); // Minimum 5% height for visibility
    
    const barColor = colors[index % colors.length];
    
    chartHTML += `
      <div class="chart-bar-container">
        <div class="chart-bar" style="height: ${barHeight}%; background-color: ${barColor};" 
             title="${escapeHtml(winner)}: ${formatCurrency(data.amount)} (${data.count} vetoa)">
          <div class="bar-value">${formatCurrency(data.amount)}</div>
        </div>
        <div class="bar-label">${escapeHtml(winner)}</div>
      </div>
    `;
  });
  
  chartHTML += '</div>';
  
  chartEl.innerHTML = chartHTML;
}

function updateTopBets() {
  const topBetsEl = document.getElementById('topBets');
  if (!topBetsEl) return;
  
  if (!bets.length) {
    topBetsEl.innerHTML = '<li>Ei vetoja</li>';
    return;
  }
  
  // Sort bets by amount (descending) and take top 3
  const sortedBets = [...bets].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
  const top3 = sortedBets.slice(0, 3);
  
  topBetsEl.innerHTML = top3.map((bet, index) => {
    return `<li><span>Veikkaaja: ${escapeHtml(bet.veikkaaja)} → ${escapeHtml(bet.voittaja)}</span><strong>${formatCurrency(bet.amount)}</strong></li>`;
  }).join('');
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
    
    html += `<div class="group-header">${escapeHtml(name)} (${playerBets.length} vetoa, yhteensä ${formatCurrency(totalAmount)})</div>`;
    
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
            <div><strong>Voittaja:</strong> ${escapeHtml(bet.voittaja)}</div>
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
      const amount = parseFloat(document.getElementById('betAmount').value);

      if (!veikkaaja || !voittaja || !amount) {
        showMessage('ERROR: Täytä kaikki kentät.', true);
        return;
      }
      
      if (amount < 1 || amount > 200 || !Number.isInteger(amount)) {
        showMessage('ERROR: Summa on oltava kokonaisluku väliltä 1-200 €.', true);
        return;
      }

      // Save the values before submitting (in case of success)
      saveFormValue('lastVeikkaaja', veikkaaja);
      saveFormValue('lastWinner', voittaja);

      // Calculate odds and create bet object
      const odds = calculateOdds(voittaja, amount);
      const newBet = {
        veikkaaja, 
        voittaja, 
        amount, 
        odds,
        placedAt: new Date().toISOString()
      };

      // Show saving message
      showMessage('Tallennetaan vetoa...', false);

      try {
        // Save to Firebase
        const savedBet = await saveBetToFirebase(newBet);
        
        // Reset form but keep saved values
        form.reset();
        
        // Restore the saved values after reset
        loadSavedFormValues();
        
        // Update odds display
        updateOddsDisplay();
        showMessage(`Veto tallennettu! Kerroin: ${odds.toFixed(2)}, Mahdollinen voitto: ${formatCurrency(amount * odds)}`);
        
    
      } catch (error) {
        showMessage(`Virhe tallentaessa vetoa: ${error.message}`, true);
      }
    });

    ['voittaja','betAmount'].forEach(id => {
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
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

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