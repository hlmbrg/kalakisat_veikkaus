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
  window.openWindow = openWindow;
  
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

  // ================= STARTUP WINDOWS CONFIGURATION =================
  // Configure which windows open at startup here:
  
  const startupWindows = [
    'window-betting',    // Veikkaus window
    'window-bets',       // Veikkaukset window  
    // 'window-stats',      // Tilastot window (commented out = closed)
    // 'window-mycomputer', // Oma tietokone (commented out = closed)
    // 'window-rules',      // Säännöt (commented out = closed)
    // 'window-recycle'     // Roskakori (commented out = closed)
  ];
  
  // Set the active window (the one that gets focus)
  const activeStartupWindow = 'window-betting';
  
  // ================= APPLY STARTUP CONFIGURATION =================
  
  // First, ensure ALL windows are hidden and not marked as opened
  document.querySelectorAll('.app-window').forEach(win => {
    win.style.display = 'none';
    win.dataset.wasOpened = 'false';
    win.classList.remove('active');
    win.classList.add('inactive');
  });
  
  // Open only the startup windows
  startupWindows.forEach(windowId => {
    const window = document.getElementById(windowId);
    if (window) {
      window.dataset.wasOpened = 'true';
      window.style.display = 'block';
      console.log(`Opening startup window: ${windowId}`);
      
      // Special handling for rules window at startup
      if (windowId === 'window-rules') {
        loadRules();
      }
    }
  });
  
  // Activate the primary window (only if it's in the startup list)
  if (startupWindows.length > 0) {
    let windowToActivate = activeStartupWindow;
    
    // Make sure the activeStartupWindow is actually in the startup list
    if (!startupWindows.includes(activeStartupWindow)) {
      windowToActivate = startupWindows[0]; // Fallback to first window
    }
    
    console.log(`Activating startup window: ${windowToActivate}`);
    activateWindow(windowToActivate);
  }
  
  updateTaskbar();
  initMobileEnhancements();
  initFileExplorer();
});

// ================= Window Click-to-Front =================
function initDesktopSystem() {
  initWindowDragging();
  initDesktopIcons();
  initWindowClickToFront();
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

  // Only activate if window is already visible or meant to be opened
  if (win.style.display === 'none') {
    console.log(`Cannot activate hidden window: ${windowId}`);
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
  win.style.zIndex = ++currentZIndex; // Increment and assign new z-index
  activeWindow = windowId;

  // Special handling for stats window - ensure stats are updated
  if (windowId === 'window-stats' && window.bettingSystem) {
    window.bettingSystem.updateStats();
  }

  // Note: Rules loading is now handled in openWindow() when first opened

  updateTaskbar();
  console.log(`Activated window: ${windowId} with z-index: ${currentZIndex}`);
}

// New function to open a window (used by desktop icons)
function openWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) {
    console.error(`Window ${windowId} not found`);
    return;
  }
  
  // Show the window first
  win.style.display = 'block';
  win.dataset.wasOpened = 'true';
  
  // Special handling for rules window - load rules when first opened
  if (windowId === 'window-rules') {
    loadRules();
  }
  
  // Then activate it
  activateWindow(windowId);
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
        win.dataset.wasOpened = 'true';
        
        // Special handling for rules window - load rules when restored
        if (id === 'window-rules') {
          loadRules();
        }
        
        activateWindow(id);
      } else {
        // Just activate the window (don't open if it's closed)
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
                     : app === 'stats'      ? 'window-stats'
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
      // Use openWindow instead of activateWindow for desktop icons
      openWindow(targetId);
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


// ================= Mobile Detection & Handling =================
function isMobile() {
  return window.innerWidth <= 900;
}

// Mobile-specific window management
function activateWindowMobile(windowId) {
  if (!isMobile()) {
    activateWindow(windowId);
    return;
  }
  
  const win = document.getElementById(windowId);
  if (!win) {
    console.error(`Window ${windowId} not found`);
    return;
  }

  // On mobile, hide all other windows completely
  document.querySelectorAll('.app-window').forEach(w => {
    if (w.id !== windowId) {
      w.style.display = 'none';
      w.classList.remove('active');
      w.classList.add('inactive');
    }
  });

  // Show and activate the target window
  win.style.display = 'block';
  win.dataset.wasOpened = 'true';
  win.classList.add('active');
  win.classList.remove('inactive');
  win.style.zIndex = ++currentZIndex;
  activeWindow = windowId;

  // Special handling for stats window
  if (windowId === 'window-stats' && window.bettingSystem) {
    window.bettingSystem.updateStats();
  }

  // Load rules if needed
  if (windowId === 'window-rules') {
    loadRules();
  }

  updateTaskbar();
  console.log(`Activated mobile window: ${windowId}`);
}

// Icon handling for mobile
function addMobileIconHandling() {
  if (!isMobile()) return;
  
  document.querySelectorAll('.desktop-icon').forEach(icon => {
    const newIcon = icon.cloneNode(true);
    icon.parentNode.replaceChild(newIcon, icon);
    
    let touchTimeout;
    
    newIcon.addEventListener('touchstart', (e) => {
      e.preventDefault();
      
      if (touchTimeout) {
        clearTimeout(touchTimeout);
        touchTimeout = null;
        
        // Double tap detected - open window
        const app = newIcon.dataset.app;
        
        if (app === 'mycomputer') {
          openUnifiedExplorer('Oma tietokone');
        } else if (app === 'recyclebin') {
          openUnifiedExplorer('Roskakori');
        } else {
          const targetId = app === 'betting' ? 'window-betting'
                         : app === 'betsdata' ? 'window-bets'
                         : app === 'stats' ? 'window-stats'
                         : app === 'rules' ? 'window-rules'
                         : null;
          
          if (targetId) {
            openWindowMobile(targetId);
          }
        }
      } else {
        // First tap - select icon
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        newIcon.classList.add('selected');
        
        touchTimeout = setTimeout(() => {
          touchTimeout = null;
        }, 300);
      }
    });
  });
}

// Mobile window opening
function openWindowMobile(windowId) {
  if (!isMobile()) {
    openWindow(windowId);
    return;
  }
  
  const win = document.getElementById(windowId);
  if (!win) {
    console.error(`Window ${windowId} not found`);
    return;
  }
  
  // Hide all other windows
  document.querySelectorAll('.app-window').forEach(w => {
    if (w.id !== windowId) {
      w.style.display = 'none';
    }
  });
  
  // Show and setup the target window
  win.style.display = 'block';
  win.dataset.wasOpened = 'true';
  
  // Special handling for rules window
  if (windowId === 'window-rules') {
    loadRules();
  }
  
  activateWindowMobile(windowId);
}

// Prevent zoom on double tap
function preventZoomOnDoubleTap() {
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
}

// Mobile orientation change handler
function handleOrientationChange() {
  if (!isMobile()) return;
  
  // Refresh layout after orientation change
  setTimeout(() => {
    updateTaskbar();
    if (window.bettingSystem) {
      window.bettingSystem.updateOddsDisplay();
      window.bettingSystem.updateStats();
    }
  }, 100);
}

// Initialize mobile enhancements
function initMobileEnhancements() {
  if (!isMobile()) return;
  
  console.log('Initializing mobile enhancements');
  
  // Add mobile-specific handlers
  addMobileIconHandling();
  preventZoomOnDoubleTap();
  
  // Override window management functions for mobile
  window.activateWindow = activateWindowMobile;
  window.openWindow = openWindowMobile;
  
  // Handle orientation changes
  window.addEventListener('orientationchange', handleOrientationChange);
  window.addEventListener('resize', () => {
    setTimeout(handleOrientationChange, 100);
  });
  
  // Ensure proper initial state
  setTimeout(() => {
    updateTaskbar();
  }, 500);
}

// Folder structure
const driveContents = {
  'Oma tietokone': {
    folders: [],
    files: [],
    drives: [
      { name: 'Kiintolevy (C:)', path: 'C:', icon: 'hard-drive' },
      { name: 'Tissikuvat (D:)', path: 'D:', icon: 'hard-drive' },
      { name: 'Kalakuvat (E:)', path: 'E:', icon: 'hard-drive' }
    ]
  },
  'Roskakori': {
    folders: [],
    files: ['säännöt-2023.txt','säännöt-2024.txt','säännöt-2025.txt','porttikiellot-2023.txt','vp-mestari.png' ,'kalastusalue.png']
  },
  'C:': {
    folders: ['Windows'],
    files: []
  },
  'D:': {
    folders: ['Tissikuvat', 'Varmuuskopiot'],
    files: []
  },
  'E:': {
    folders: ['Kalakuvat', 'Kilpailutulokset'],
    files: ['kala001.jpg', 'iso_saalis.png', 'jarvi_auringonlasku.jpg']
  }
};

// Folder contents with Finnish names
const folderContents = {
  'Tissikuvat': {
    folders: [],
    files: ['sydney_sweeney.png','sydney_sweeney2.png', 'bonnie_blue.png']
  },
  'Kalakuvat': {
    folders: ['Kesä 2024', 'Parhaat saaliit'],
    files: ['hauki_45cm.jpg', 'ahvenet.png', 'aamukala.jpg']
  },
  'Asiakirjat': {
    folders: ['Työ', 'Henkilökohtainen'],
    files: ['kirje.txt', 'muistio.txt', 'lista.txt']
  },
  'Kuvat': {
    folders: ['Valokuvat'],
    files: ['perhekuva.jpg', 'maisema.png']
  },
  'Työ': {
    folders: [],
    files: ['raportti.txt', 'kokous.txt']
  },
  'Henkilökohtainen': {
    folders: [],
    files: ['päiväkirja.txt', 'ostoslista.txt']
  },
  'Poistetut kansiot': {
    folders: [],
    files: []
  },
  'Kesä 2024': {
    folders: [],
    files: ['heinakuu_kala.jpg', 'elokuun_saalis.png']
  },
  'Parhaat saaliit': {
    folders: [],
    files: ['ennatys_hauki.jpg', 'iso_ahven.jpg']
  }
};

let currentPath = 'Oma tietokone';
let navigationHistory = [];
let selectedFile = null;


function initFileExplorer() {
  // Add double-click handlers to desktop icons
  document.querySelectorAll('.desktop-icon').forEach(icon => {
    // Remove existing handlers and add unified one
    const newIcon = icon.cloneNode(true);
    icon.parentNode.replaceChild(newIcon, icon);
    
    newIcon.addEventListener('dblclick', () => {
      const app = newIcon.dataset.app;
      
      if (app === 'mycomputer') {
        openUnifiedExplorer('Oma tietokone');
      } else if (app === 'recyclebin') {
        openUnifiedExplorer('Roskakori');
      } else {
        // Handle other apps normally
        const targetId = app === 'betting'    ? 'window-betting'
                       : app === 'betsdata'   ? 'window-bets'
                       : app === 'stats'      ? 'window-stats'
                       : app === 'rules'      ? 'window-rules'
                       : null;
        
        if (targetId) {
          openWindow(targetId);
        }
      }
    });
    
    // Handle selection
    newIcon.addEventListener('click', () => {
      document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
      newIcon.classList.add('selected');
    });
  });
  
  // Add click handlers for file/folder selection in explorer
  document.addEventListener('click', (e) => {
    if (e.target.closest('.explorer-content')) {
      const fileItem = e.target.closest('.file-item');
      if (fileItem) {
        selectFile(fileItem);
      } else {
        clearFileSelection();
      }
    }
  });
  
  // Add double-click handler for folders and files
  document.addEventListener('dblclick', (e) => {
    const fileItem = e.target.closest('.file-item');
    if (fileItem) {
      const fileName = fileItem.querySelector('.file-name').textContent;
      const fileIcon = fileItem.querySelector('.file-icon');
      
      if (fileIcon.classList.contains('folder')) {
        openFolder(fileName);
      } else if (fileIcon.classList.contains('drive')) {
        // Extract drive path from the name
        const drivePath = fileName.match(/\(([^)]+)\)/);
        if (drivePath) {
          openFolder(drivePath[1]);
        }
      } else {
        openFile(fileName);
      }
    }
  });
}

function openUnifiedExplorer(location) {
  currentPath = location;
  navigationHistory = [];
  
  updateExplorerUI();
  populateExplorer();
  openWindow('window-explorer');
}

function updateExplorerUI() {
  // Update window title
  const titleBar = document.querySelector('#window-explorer .title-bar-text');
  if (titleBar) {
    titleBar.textContent = currentPath;
  }
  
  // Update address bar with proper path formatting
  const addressInput = document.getElementById('addressBar');
  if (addressInput) {
    let displayPath = currentPath;
    
    // Format different path types
    if (currentPath === 'My Computer') {
      displayPath = 'My Computer';
    } else if (currentPath === 'Recycle Bin') {
      displayPath = 'Recycle Bin';
    } else if (currentPath.match(/^[A-Z]:$/)) {
      // Root drive like "C:" becomes "C:\"
      displayPath = currentPath + '\\';
    } else if (currentPath.includes(':')) {
      // Already contains drive, check if it needs proper formatting
      if (!currentPath.includes('\\')) {
        displayPath = currentPath + '\\';
      }
    } else {
      // Folder inside a drive, need to reconstruct full path
      if (navigationHistory.length > 0) {
        const parentPath = navigationHistory[navigationHistory.length - 1];
        if (parentPath.match(/^[A-Z]:$/)) {
          displayPath = parentPath + '\\' + currentPath;
        } else {
          displayPath = parentPath + '\\' + currentPath;
        }
      }
    }
    
    addressInput.value = displayPath;
  }
  
  // Update back button state
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.disabled = navigationHistory.length === 0;
  }
}

function populateExplorer() {
  const content = document.getElementById('explorerContent');
  if (!content) return;
  
  content.innerHTML = '';
  
  let folders = [];
  let files = [];
  let drives = [];
  
  // Determine what to show based on current path
  if (driveContents[currentPath]) {
    const data = driveContents[currentPath];
    folders = data.folders || [];
    files = data.files || [];
    drives = data.drives || [];
  } else {
    // Check if it's inside a folder
    const folderData = folderContents[currentPath];
    if (folderData) {
      folders = folderData.folders || [];
      files = folderData.files || [];
    }
  }
  
  // Add drives first (for My Computer)
  drives.forEach(drive => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
      <div class="file-icon drive"></div>
      <div class="file-name">${drive.name}</div>
    `;
    content.appendChild(fileItem);
  });
  
  // Add folders
  folders.forEach(folderName => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
      <div class="file-icon folder"></div>
      <div class="file-name">${folderName}</div>
    `;
    content.appendChild(fileItem);
  });
  
  files.forEach(fileName => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    // Determine file type - only images and txt files
    const isImage = /\.(jpg|jpeg|png|gif|bmp)$/i.test(fileName);
    const isTxt = /\.txt$/i.test(fileName);
    
    let iconClass = 'file'; // default
    if (isImage) {
      iconClass = 'image';
    } else if (isTxt) {
      iconClass = 'txt';
    }
    
    fileItem.innerHTML = `
      <div class="file-icon ${iconClass}"></div>
      <div class="file-name">${fileName}</div>
    `;
    content.appendChild(fileItem);
  });
}

function openFolder(folderName) {
  // Save current path to history
  navigationHistory.push(currentPath);
  
  // Navigate to folder/drive
  currentPath = folderName;
  
  updateExplorerUI();
  populateExplorer();
}

function openFile(fileName) {
  const isImage = /\.(jpg|jpeg|png|gif|bmp)$/i.test(fileName);
  const isDeleted = currentPath === 'Recycle Bin' || navigationHistory.includes('Recycle Bin');
  
  const message = document.createElement('div');
  message.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    padding: 20px;
    z-index: 10000;
    font-size: 14px;
    text-align: center;
    min-width: 250px;
  `;
  
  let messageText;
  if (isDeleted) {
    messageText = `Deleted file: ${fileName}<br><small>File is in Recycle Bin</small>`;
  } else if (isImage) {
    messageText = `Opening image: ${fileName}<br><small>Image viewer would open here</small>`;
  } else {
    messageText = `Opening file: ${fileName}<br><small>Associated program would open here</small>`;
  }
  
  message.innerHTML = `
    <div>${messageText}</div>
    <div style="margin-top: 15px;">
      <button onclick="this.parentElement.parentElement.remove()" 
              style="padding: 6px 16px;">OK</button>
    </div>
  `;
  
  document.body.appendChild(message);
  
  setTimeout(() => {
    if (message.parentElement) {
      message.remove();
    }
  }, 4000);
}

function goBack() {
  if (navigationHistory.length > 0) {
    currentPath = navigationHistory.pop();
    updateExplorerUI();
    populateExplorer();
  }
}

function selectFile(fileItem) {
  clearFileSelection();
  fileItem.classList.add('selected');
  selectedFile = fileItem;
}

function clearFileSelection() {
  document.querySelectorAll('.file-item.selected').forEach(item => {
    item.classList.remove('selected');
  });
  selectedFile = null;
}

// Update taskbar icon mapping
function taskbarIconForWindow(id) {
  switch (id) {
    case 'window-mycomputer': return 'icons/my-computer.png';
    case 'window-betting':    return 'icons/betting.png';
    case 'window-bets':       return 'icons/bets.png';
    case 'window-stats':      return 'icons/chart.png';
    case 'window-rules':      return 'icons/txt-file.png';
    case 'window-recycle':    return 'icons/recycle-bin.png';
    case 'window-explorer':   return 'icons/folder.png';
    default: return 'icons/windows.png';
  }
}