// ================= Windows 98 Desktop System =================

// Desktop state
let activeWindow = 'window-betting';
let isDragging = false;
let dragWindow = null;
let dragOffset = { x: 0, y: 0 };

document.addEventListener('DOMContentLoaded', async () => {
  // Make functions globally available first
  window.minimizeWindow = minimizeWindow;
  window.maximizeWindow = maximizeWindow;
  window.closeWindow = closeWindow;
  window.activateWindow = activateWindow;
  
  initDesktopSystem();
  
  // Initialize betting system if available
  if (window.bettingSystem) {
    window.bettingSystem.init();
    await window.bettingSystem.loadBets();
    window.bettingSystem.renderBets();
    window.bettingSystem.updateOddsDisplay();
  }
  
  updateTime();
  setInterval(updateTime, 1000);

  renameVeikkausDataToVeikkaukset();
  
  // Start with Veikkaus and Veikkaukset windows open
  activateWindow('window-betting');
  
  // Also open Veikkaukset window but don't make it active
  const veikkauksetWindow = document.getElementById('window-bets');
  if (veikkauksetWindow) {
    veikkauksetWindow.dataset.wasOpened = 'true';
    veikkauksetWindow.style.display = 'block';
  }
  
  updateTaskbar();
});

// ================= Desktop System Initialization =================
function initDesktopSystem() {
  initWindowDragging();
  initDesktopIcons();
  initWindowClickToFront(); // Add click-to-front functionality
}

// ================= Window Click-to-Front =================
function initWindowClickToFront() {
  // Add click listeners to all windows
  document.querySelectorAll('.app-window').forEach(window => {
    // Listen for clicks anywhere on the window
    window.addEventListener('mousedown', (e) => {
      // Don't interfere with dragging or button clicks
      if (e.target.closest('.title-bar') || e.target.tagName === 'BUTTON') {
        return;
      }
      
      // Bring window to front
      activateWindow(window.id);
    });
    
    // Also listen for clicks on the title bar (in addition to dragging)
    const titleBar = window.querySelector('.title-bar');
    if (titleBar) {
      titleBar.addEventListener('mousedown', (e) => {
        // Don't interfere with button clicks
        if (e.target.tagName === 'BUTTON') {
          return;
        }
        
        // Bring window to front
        activateWindow(window.id);
      });
    }
  });
}

// ================= Window management =================
let currentZIndex = 1000; // Track the highest z-index

function activateWindow(windowId) {
  // First, ensure the window exists
  const win = document.getElementById(windowId);
  if (!win) {
    console.error(`Window ${windowId} not found`);
    return;
  }

  // Mark window as having been opened
  win.dataset.wasOpened = 'true';

  // Deactivate all windows
  document.querySelectorAll('.app-window').forEach(w => {
    w.classList.remove('active');
    w.classList.add('inactive');
  });
  
  // Activate target window and bring it to front
  win.classList.add('active');
  win.classList.remove('inactive');
  win.style.display = 'block';
  win.style.zIndex = ++currentZIndex; // Increment and assign new z-index
  activeWindow = windowId;

  // Special handling for rules window
  if (windowId === 'window-rules') {
    loadRules();
  }

  // Special handling for stats window - ensure stats are updated
  if (windowId === 'window-stats' && window.bettingSystem) {
    window.bettingSystem.updateStats();
  }

  updateTaskbar();
  console.log(`Activated window: ${windowId} with z-index: ${currentZIndex}`);
}

function minimizeWindow(windowId) {
  console.log(`Minimizing window: ${windowId}`); // Debug log
  const win = document.getElementById(windowId);
  if (!win) {
    console.error(`Window ${windowId} not found for minimizing`);
    return;
  }
  
  // Hide the window completely
  win.style.display = 'none';
  
  // Find another window to activate
  const nextWindow = Array.from(document.querySelectorAll('.app-window'))
    .find(w => w.style.display !== 'none' && w.id !== windowId);
  
  if (nextWindow) {
    activateWindow(nextWindow.id);
  }
  
  updateTaskbar();
}

function maximizeWindow(windowId) {
  console.log(`Maximizing window: ${windowId}`); // Debug log
  const win = document.getElementById(windowId);
  if (!win) {
    console.error(`Window ${windowId} not found for maximizing`);
    return;
  }
  win.classList.toggle('maximized');
}

function closeWindow(windowId) {
  console.log(`Closing window: ${windowId}`); // Debug log
  const win = document.getElementById(windowId);
  if (!win) {
    console.error(`Window ${windowId} not found for closing`);
    return;
  }
  
  // Hide the window and mark it as closed
  win.style.display = 'none';
  win.dataset.wasOpened = 'false'; // Mark as closed so it disappears from taskbar
  
  // Find another window to activate
  const nextWindow = Array.from(document.querySelectorAll('.app-window'))
    .find(w => w.style.display === 'block' && w.id !== windowId);
  
  if (nextWindow) {
    activateWindow(nextWindow.id);
  }
  
  updateTaskbar();
}

function updateTaskbar() {
  const container = document.getElementById('taskbarButtons');
  if (!container) return;
  
  container.innerHTML = '';
  document.querySelectorAll('.app-window').forEach(win => {
    const id = win.id;
    const titleEl = win.querySelector('.title-bar-text');
    if (!titleEl) return;
    
    // Only show in taskbar if window has been opened and not closed
    const isVisible = win.style.display === 'block';
    const wasOpened = win.dataset.wasOpened === 'true';
    const isMinimized = win.style.display === 'none' && wasOpened;
    
    if (!isVisible && !isMinimized) {
      return; // Don't show windows that haven't been opened or were closed
    }
    
    const title = titleEl.textContent.trim();
    const iconSrc = taskbarIconForWindow(id);
    
    const isActive = win.classList.contains('active') && isVisible;

    const btn = document.createElement('button');
    btn.className = 'taskbar-button' + (isActive ? ' active' : '') + (isMinimized ? ' minimized' : '');

    const img = document.createElement('img');
    img.className = 'tb-icon';
    img.alt = '';
    img.src = iconSrc;

    const span = document.createElement('span');
    span.textContent = title;

    btn.appendChild(img);
    btn.appendChild(span);

    btn.onclick = () => {
      if (isMinimized) {
        // Restore minimized window
        win.style.display = 'block';
        activateWindow(id);
      } else {
        // Just activate the window
        activateWindow(id);
      }
    };
    
    container.appendChild(btn);
  });
}

function taskbarIconForWindow(id) {
  switch (id) {
    case 'window-mycomputer': return 'icons/my-computer.png';
    case 'window-betting':    return 'icons/betting.png';
    case 'window-bets':       return 'icons/bets.png';
    case 'window-stats':      return 'icons/chart.png';
    case 'window-rules':      return 'icons/txt-file.png';
    case 'window-recycle':    return 'icons/recycle-bin.png';
    default: return 'icons/windows.png';
  }
}

// ================= Window Dragging =================
function initWindowDragging() {
  document.querySelectorAll('.app-window .title-bar').forEach(titleBar => {
    titleBar.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      
      isDragging = true;
      dragWindow = titleBar.closest('.app-window');
      
      // Bring to front when starting to drag
      activateWindow(dragWindow.id);
      
      const rect = dragWindow.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      e.preventDefault();
    });
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !dragWindow) return;
    if (dragWindow.classList.contains('maximized')) return;
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    const maxX = window.innerWidth - 120;
    const maxY = window.innerHeight - 120;
    dragWindow.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    dragWindow.style.top  = Math.max(0, Math.min(y, maxY)) + 'px';
  });

  document.addEventListener('mouseup', () => { 
    isDragging = false; 
    dragWindow = null; 
  });
}

// ================= Desktop Icons =================
function initDesktopIcons() {
  document.querySelectorAll('.desktop-icon').forEach(icon => {
    icon.addEventListener('dblclick', () => {
      const app = icon.dataset.app;
      console.log(`Double-clicked icon: ${app}`);
      
      const targetId = app === 'mycomputer' ? 'window-mycomputer'
                     : app === 'betting'    ? 'window-betting'
                     : app === 'betsdata'   ? 'window-bets'
                     : app === 'tilastot'   ? 'window-stats'
                     : app === 'rules'      ? 'window-rules'
                     : app === 'recyclebin' ? 'window-recycle'
                     : null;
      
      console.log(`Target window ID: ${targetId}`);
      
      if (!targetId) {
        console.error(`No target window found for app: ${app}`);
        return;
      }
      
      const win = document.getElementById(targetId);
      if (!win) {
        console.error(`Window element not found: ${targetId}`);
        return;
      }
      
      console.log(`Opening window: ${targetId}`);
      // activateWindow will handle setting display: block and wasOpened flag
      activateWindow(targetId);
    });
    
    icon.addEventListener('click', () => {
      document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
      icon.classList.add('selected');
    });
  });

  document.getElementById('desktop').addEventListener('click', (e) => {
    if (e.target.id === 'desktop') {
      document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    }
  });
}

// ================= Clock =================
function updateTime() {
  const timeEl = document.getElementById('currentTime');
  if (!timeEl) return;
  
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  timeEl.textContent = `${hh}:${mm}:${ss}`;
}

// ================= Rules loader =================
function loadRules() {
  const el = document.getElementById('rulesContent');
  if (!el) return;
  
  el.textContent = 'Ladataan sääntöjä...';
  fetch('rules.txt?_=' + Date.now())
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(txt => { el.textContent = txt; })
    .catch(err => { 
      el.textContent = 'Sääntöjen lataaminen epäonnistui.'; 
      console.error(err); 
    });
}

// ================= Rename function =================
function renameVeikkausDataToVeikkaukset() {
  const iconSpan = document.querySelector('.icon-betsdata span');
  if (iconSpan) iconSpan.textContent = 'Veikkaukset';
  
  const title = document.querySelector('#window-bets .title-bar-text');
  if (title) title.textContent = 'Veikkaukset';
}