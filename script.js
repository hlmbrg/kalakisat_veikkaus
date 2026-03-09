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
  window.closeImageViewer = closeImageViewer;
  window.closeTextViewer = closeTextViewer;
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
    // 'window-betting',    // Veikkaus window
    // 'window-bets',       // Veikkaukset window  
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
    const win = document.getElementById(windowId);
    if (win) {
      win.dataset.wasOpened = 'true';
      win.style.display = 'block';
    }
  });
  
  // Activate the primary window (only if it's in the startup list)
  if (startupWindows.length > 0) {
    let windowToActivate = activeStartupWindow;
    
    // Make sure the activeStartupWindow is actually in the startup list
    if (!startupWindows.includes(activeStartupWindow)) {
      windowToActivate = startupWindows[0]; // Fallback to first window
    }
    
    activateWindow(windowToActivate);
  }
  
  updateTaskbar();
  initStartMenu();
  initMobileEnhancements();
  initFileExplorer();
  showWinnerPopup();
});

// ================= Window Click-to-Front =================
function initDesktopSystem() {
  initWindowDragging();
  initDesktopIcons();
  initWindowClickToFront();
}

function initWindowClickToFront() {
  document.querySelectorAll('.app-window').forEach(win => {
    win.addEventListener('mousedown', (e) => {
      if (e.target.closest('.title-bar') || e.target.tagName === 'BUTTON') {
        return;
      }
      activateWindow(win.id);
    });

    const titleBar = win.querySelector('.title-bar');
    if (titleBar) {
      titleBar.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        activateWindow(win.id);
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

  updateTaskbar();
}

function openWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) {
    console.error(`Window ${windowId} not found`);
    return;
  }
  
  // Show the window first
  win.style.display = 'block';
  win.dataset.wasOpened = 'true';
  
  // Then activate it
  activateWindow(windowId);
}

function minimizeWindow(windowId) {
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
  const win = document.getElementById(windowId);
  if (!win) {
    console.error(`Window ${windowId} not found for maximizing`);
    return;
  }
  win.classList.toggle('maximized');
}

function closeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) {
    console.error(`Window ${windowId} not found for closing`);
    return;
  }
  
  // Hide the window and mark it as closed
  win.style.display = 'none';
  win.dataset.wasOpened = 'false'; // Mark as closed so it disappears from taskbar

  // Remember winner popup dismissal for this session
  if (windowId === 'window-winner') {
    sessionStorage.setItem('winnerPopupDismissed', 'true');
  }
  
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
        
        activateWindow(id);
      } else {
        // Just activate the window (don't open if it's closed)
        activateWindow(id);
      }
    };
    
    container.appendChild(btn);
  });
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
  // Desktop click-to-deselect (icon handlers are set up in initFileExplorer)
  document.getElementById('desktop').addEventListener('click', (e) => {
    if (e.target.id === 'desktop') {
      document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    }
  });
}

// ================= Winner Window =================
function showWinnerPopup() {
  if (sessionStorage.getItem('winnerPopupDismissed')) return;
  openWindow('window-winner');
}

// ================= Clock =================
function updateTime() {
  const timeEl = document.getElementById('currentTime');
  const dateEl = document.getElementById('currentDate');
  if (!timeEl) return;

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  timeEl.textContent = `${hh}:${mm}:${ss}`;

  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('fi-FI');
  }
}

// ================= Start Menu =================
function initStartMenu() {
  const startBtn = document.getElementById('startBtn');
  const startMenu = document.getElementById('startMenu');
  if (!startBtn || !startMenu) return;

  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = startMenu.style.display !== 'none';
    startMenu.style.display = isOpen ? 'none' : 'flex';
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#startMenu') && !e.target.closest('#startBtn')) {
      startMenu.style.display = 'none';
    }
  });

  startMenu.querySelectorAll('.start-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      startMenu.style.display = 'none';
      if (action) handleIconOpen(action);
    });
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

  updateTaskbar();
}


// Shared function to handle icon opening
function handleIconOpen(app) {
  if (app === 'mycomputer') {
    openUnifiedExplorer('Oma tietokone');
  } else if (app === 'recyclebin') {
    openUnifiedExplorer('Roskakori');
  } else if (app === 'rules') {
    openTextViewer('veikkaus_säännöt.txt');
  } else if (app === 'kisarules') {
    openTextViewer('kisa_säännöt.txt');
  } else if (app === 'kartta') {
    openImageViewer('kilpailu_alue.png');
  } else if (app === 'kohdelaji') {
    openImageViewer('kohdelaji.png');
  } else if (app === 'mittausohje') {
    openImageViewer('mittausohje.png');
  } else {
    const targetId = app === 'betting' ? 'window-betting'
                   : app === 'betsdata' ? 'window-bets'
                   : app === 'stats' ? 'window-stats'
                   : app === 'calendar' ? 'window-calendar'
                   : null;
    
    if (targetId) {
      if (isMobile()) {
        openWindowMobile(targetId);
      } else {
        openWindow(targetId);
      }
    }
  }
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
      { name: 'Tissit (D:)', path: 'D:', icon: 'hard-drive' },
      { name: 'Kalastus (E:)', path: 'E:', icon: 'hard-drive' }
    ]
  },
  'Roskakori': {
    folders: ['Poistetut kansiot'],
    files: ['säännöt-2023.txt','säännöt-2024.txt','porttikiellot-2023.txt']
  },
  'C:': {
    folders: ['Windows', 'Ohjelmat', 'Käyttäjät'],
    files: ['autoexec.bat', 'config.sys']
  },
  'D:': {
    folders: ['Varmuuskopiot'],
    files: ['sydney_sweeney.png','sydney_sweeney2.png']
  },
  'E:': {
    folders: ['Kilpailut', 'Kuvat'],
    files: []
  }
};

// Folder contents
const folderContents = {
  'Kilpailut': {
    folders: ['2025', '2026'],
    files: []
  },
  '2025': {
    folders: [],
    files: ['tulokset_2025.txt', 'säännöt_2025.txt']
  },
  '2026': {
    folders: [],
    files: ['veikkaus_säännöt.txt', 'kisa_säännöt.txt']
  },
  'Kuvat': {
    folders: [],
    files: ['matun_hauki.jpg', 'kohdelaji.png', 'mittausohje.png']
  },
  'Varmuuskopiot': {
    folders: [],
    files: []
  },
  'Windows': {
    folders: ['System32', 'Fonts', 'Temp'],
    files: ['win.ini', 'notepad.exe', 'explorer.exe']
  },
  'System32': {
    folders: ['drivers'],
    files: ['cmd.exe', 'calc.exe', 'mspaint.exe']
  },
  'drivers': {
    folders: [],
    files: ['keyboard.sys', 'mouse.sys', 'vga.sys']
  },
  'Fonts': {
    folders: [],
    files: ['arial.ttf', 'times.ttf', 'comic.ttf']
  },
  'Temp': {
    folders: [],
    files: []
  },
  'Ohjelmat': {
    folders: ['Internet Explorer', 'Kalakisat Veikkaus'],
    files: []
  },
  'Internet Explorer': {
    folders: [],
    files: ['iexplore.exe']
  },
  'Kalakisat Veikkaus': {
    folders: [],
    files: ['kalakisat.exe', 'readme.txt']
  },
  'Käyttäjät': {
    folders: ['Kalastaja'],
    files: []
  },
  'Kalastaja': {
    folders: ['Omat tiedostot', 'Työpöytä'],
    files: []
  },
  'Omat tiedostot': {
    folders: [],
    files: ['muistiinpanot.txt']
  },
  'Työpöytä': {
    folders: [],
    files: []
  },
  'Poistetut kansiot': {
    folders: [],
    files: []
  },
};

let currentPath = 'Oma tietokone';
let navigationHistory = [];
let selectedFile = null;


function initFileExplorer() {
  // Add handlers to desktop icons (mobile-aware)
  document.querySelectorAll('.desktop-icon').forEach(icon => {
    // Remove existing handlers and add unified one
    const newIcon = icon.cloneNode(true);
    icon.parentNode.replaceChild(newIcon, icon);
    
    if (isMobile()) {
      // Mobile: touch events
      let touchTimeout;
      
      newIcon.addEventListener('touchstart', (e) => {
        e.preventDefault();
        
        if (touchTimeout) {
          clearTimeout(touchTimeout);
          touchTimeout = null;
          
          // Double tap detected - open window
          const app = newIcon.dataset.app;
          handleIconOpen(app);
        } else {
          // First tap - select icon
          document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
          newIcon.classList.add('selected');
          
          touchTimeout = setTimeout(() => {
            touchTimeout = null;
          }, 300);
        }
      });
    } else {
      // Desktop: double-click events
      newIcon.addEventListener('dblclick', () => {
        const app = newIcon.dataset.app;
        handleIconOpen(app);
      });
    }
    
    // Handle selection for both mobile and desktop
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
  
  // Add double-click handler for desktop
  if (!isMobile()) {
    document.addEventListener('dblclick', (e) => {
      const fileItem = e.target.closest('.file-item');
      if (fileItem && e.target.closest('.explorer-content')) {
        handleFileItemOpen(fileItem);
      }
    });
  }
  
  // Add touch handler for mobile file items
  if (isMobile()) {
    let fileTouchTimeout = null;
    
    document.addEventListener('touchstart', (e) => {
      const fileItem = e.target.closest('.file-item');
      if (!fileItem || !e.target.closest('.explorer-content')) return;
      
      e.preventDefault();
      
      if (fileTouchTimeout) {
        clearTimeout(fileTouchTimeout);
        fileTouchTimeout = null;
        handleFileItemOpen(fileItem);
      } else {
        selectFile(fileItem);
        fileTouchTimeout = setTimeout(() => {
          fileTouchTimeout = null;
        }, 300);
      }
    });
  }
}

function handleFileItemOpen(fileItem) {
  const fileName = fileItem.querySelector('.file-name').textContent;
  const fileIcon = fileItem.querySelector('.file-icon');
  
  if (fileIcon.classList.contains('folder')) {
    openFolder(fileName);
  } else if (fileIcon.classList.contains('drive')) {
    const drivePath = fileName.match(/\(([^)]+)\)/);
    if (drivePath) {
      openFolder(drivePath[1]);
    }
  } else {
    openFile(fileName);
  }
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
    if (currentPath === 'Oma tietokone') {
      displayPath = 'Oma tietokone';
    } else if (currentPath === 'Roskakori') {
      displayPath = 'Roskakori';
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
  const isTxt = /\.txt$/i.test(fileName);
  const isDeleted = currentPath === 'Roskakori' || navigationHistory.includes('Roskakori');
  
  if (isImage && !isDeleted) {
    // Open image in the image viewer
    openImageViewer(fileName);
    return;
  }
  
  if (isTxt && !isDeleted) {
    // Open text file in the text viewer
    openTextViewer(fileName);
    return;
  }
  
  let title, messageText;
  if (isDeleted) {
    title = 'Roskakori';
    messageText = `Poistettu tiedosto: ${fileName}<br><small>Tiedosto on roskakorissa</small>`;
  } else {
    title = 'Virhe';
    messageText = `Avataan tiedosto: ${fileName}<br><small>Tiedostolle ei ole ohjelmaa</small>`;
  }
  showAlert(title, messageText);
}

function showAlert(title, messageHtml) {
  const titleEl = document.getElementById('alertTitle');
  const msgEl = document.getElementById('alertMessage');
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.innerHTML = messageHtml;
  if (isMobile()) {
    openWindowMobile('window-alert');
  } else {
    openWindow('window-alert');
  }
}



function goBack() {
  if (navigationHistory.length > 0) {
    currentPath = navigationHistory.pop();
    updateExplorerUI();
    populateExplorer();
  }
}

// Text viewer - creates a separate window per file
let textViewerCount = 0;

function openTextViewer(fileName) {
  textViewerCount++;
  const winId = `window-textviewer-${textViewerCount}`;
  const offset = (textViewerCount - 1) * 30;

  const win = document.createElement('div');
  win.id = winId;
  win.className = 'window app-window textviewer-window';
  win.style.top = (170 + offset) + 'px';
  win.style.left = (400 + offset) + 'px';
  win.style.display = 'none';

  win.innerHTML = `
    <div class="title-bar">
      <div class="title-bar-text">${fileName}</div>
      <div class="title-bar-controls">
        <button aria-label="Minimize" onclick="minimizeWindow('${winId}')"></button>
        <button aria-label="Maximize" onclick="maximizeWindow('${winId}')"></button>
        <button aria-label="Close" onclick="closeTextViewer('${winId}')"></button>
      </div>
    </div>
    <div class="window-body">
      <div class="notepad-content">Ladataan tiedostoa...</div>
    </div>
  `;

  document.body.appendChild(win);
  setupWindowInteractions(win);

  const content = win.querySelector('.notepad-content');
  loadTextFile(fileName, content);

  if (isMobile()) {
    openWindowMobile(winId);
  } else {
    openWindow(winId);
  }
}

function closeTextViewer(winId) {
  closeWindow(winId);
  const win = document.getElementById(winId);
  if (win) win.remove();
}
// Loading text files
function loadTextFile(fileName, contentElement) {
  if (!contentElement) return;
  
  contentElement.textContent = 'Ladataan tiedostoa...';
  
  // Construct the path to txt_files folder
  const filePath = `txt_files/${fileName}`;
  
  fetch(filePath + '?_=' + Date.now())
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' - File not found');
      return r.text();
    })
    .then(txt => { 
      contentElement.textContent = txt; 
    })
    .catch(err => { 
      contentElement.textContent = `Tiedoston lataaminen epäonnistui: ${fileName}\n`; 
      console.error('Error loading text file:', err); 
    });
}

// Image viewer - creates a separate window per image
let imageViewerCount = 0;

function openImageViewer(fileName) {
  imageViewerCount++;
  const winId = `window-imageviewer-${imageViewerCount}`;
  const offset = (imageViewerCount - 1) * 30;

  const win = document.createElement('div');
  win.id = winId;
  win.className = 'window app-window imageviewer-window';
  win.style.top = (120 + offset) + 'px';
  win.style.left = (300 + offset) + 'px';
  win.style.display = 'none';

  win.innerHTML = `
    <div class="title-bar">
      <div class="title-bar-text">${fileName}</div>
      <div class="title-bar-controls">
        <button aria-label="Minimize" onclick="minimizeWindow('${winId}')"></button>
        <button aria-label="Maximize" onclick="maximizeWindow('${winId}')"></button>
        <button aria-label="Close" onclick="closeImageViewer('${winId}')"></button>
      </div>
    </div>
    <div class="window-body">
      <div class="image-viewer-content">
        <img src="${getImagePath(fileName)}" alt="${fileName}" onerror="this.alt='Kuvaa ei löydy: ${fileName}'" />
      </div>
    </div>
  `;

  document.body.appendChild(win);

  // Set up dragging and click-to-front for the new window
  setupWindowInteractions(win);

  if (isMobile()) {
    openWindowMobile(winId);
  } else {
    openWindow(winId);
  }
}

function closeImageViewer(winId) {
  closeWindow(winId);
  const win = document.getElementById(winId);
  if (win) win.remove();
}

function setupWindowInteractions(win) {
  win.addEventListener('mousedown', (e) => {
    if (e.target.closest('.title-bar') || e.target.tagName === 'BUTTON') return;
    activateWindow(win.id);
  });

  const titleBar = win.querySelector('.title-bar');
  if (titleBar) {
    titleBar.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      activateWindow(win.id);
      if (e.target.closest('.title-bar-controls')) return;
      isDragging = true;
      dragWindow = win;
      const rect = win.getBoundingClientRect();
      dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      e.preventDefault();
    });
  }
}

// Image paths
function getImagePath(fileName) {
  // Load all images from the images/ folder
  return `images/${fileName}`;
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
    case 'window-calendar':   return 'icons/kaikki/calendar-0.png';
    case 'window-winner':     return 'icons/kaikki/msg_information-0.png';
    case 'window-alert':      return 'icons/kaikki/msg_warning-0.png';
    default:
      if (id.startsWith('window-imageviewer-')) return 'icons/img.png';
      if (id.startsWith('window-textviewer-')) return 'icons/txt-file.png';
      return 'icons/windows.png';
  }
}