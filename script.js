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
      
      if (app === 'rules') {
        // Open rules as a text file
        openTextViewer('säännöt.txt');
        return;
      }

      const targetId = app === 'mycomputer' ? 'window-mycomputer'
                     : app === 'betting'    ? 'window-betting'
                     : app === 'betsdata'   ? 'window-bets'
                     : app === 'stats'      ? 'window-stats'
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

  updateTaskbar();
  console.log(`Activated mobile window: ${windowId}`);
}


// Shared function to handle icon opening
function handleIconOpen(app) {
  if (app === 'mycomputer') {
    openUnifiedExplorer('Oma tietokone');
  } else if (app === 'recyclebin') {
    openUnifiedExplorer('Roskakori');
  } else if (app === 'rules') {
    openTextViewer('säännöt.txt');
  } else {
    const targetId = app === 'betting' ? 'window-betting'
                   : app === 'betsdata' ? 'window-bets'
                   : app === 'stats' ? 'window-stats'
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
  
  console.log('Initializing mobile enhancements');
  
  // Remove this line: addMobileIconHandling();
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
    folders: [],
    files: ['säännöt-2023.txt','säännöt-2024.txt','säännöt-2025.txt','porttikiellot-2023.txt','vp-mestari.png' ,'kalastusalue.png']
  },
  'C:': {
    folders: ['Windows'],
    files: []
  },
  'D:': {
    folders: ['Varmuuskopiot'],
    files: ['sydney_sweeney.png','sydney_sweeney2.png']
  },
  'E:': {
    folders: ['Kilpailutulokset'],
    files: ['mikan_vauvahauki.jpg','villen_ahven.png','matun_hauki.jpg']
  }
};

// Folder contents with Finnish names
const folderContents = {
  'Tissikuvat': {
    folders: [],
    files: []
  },
  'Asiakirjat': {
    folders: [],
    files: ['sääntö_ehdotukset.txt']
  },
  'Kilpailutulokset': {
    folders: [],
    files: ['2020.txt','2021.txt','2022.txt','2023.txt','2024.txt','2025.txt']
  },
  'Kuvat': {
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

// Add this helper function after initFileExplorer
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
  
  // For non-supported files or deleted files, show the existing message
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

// Text viewer
function openTextViewer(fileName) {
  const win = document.getElementById('window-textviewer');
  const titleBar = win.querySelector('.title-bar-text');
  const content = document.getElementById('textViewerContent');
  
  if (!win || !titleBar || !content) {
    console.error('Text viewer elements not found');
    return;
  }
  
  // Set the window title to the file name
  titleBar.textContent = fileName;
  
  // Load the text file content
  loadTextFile(fileName, content);
  
  // Show and activate the window
  if (isMobile()) {
    openWindowMobile('window-textviewer');
  } else {
    openWindow('window-textviewer');
  }
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

// Image viewer simple
function openImageViewer(fileName) {
  const win = document.getElementById('window-imageviewer');
  const titleBar = win.querySelector('.title-bar-text');
  const image = document.getElementById('viewerImage');
  
  if (!win || !titleBar || !image) {
    console.error('Image viewer elements not found');
    return;
  }
  
  // Set the window title to the image name
  titleBar.textContent = fileName;
  
  // Create the image path based on current location
  let imagePath = getImagePath(fileName);
  
  // Set the image source
  image.src = imagePath;
  image.alt = `Viewing ${fileName}`;
  
  // Handle image load error
  image.onerror = function() {
    // If image fails to load, show a placeholder
    this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjBGMEYwIiBzdHJva2U9IiNEMEQwRDAiLz4KPHN2ZyB4PSI3NSIgeT0iNDAiIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIiBmaWxsPSIjQzBDMEMwIj4KPHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xNS42MjUgMTAuNDE2N0gyOC4xMjVMMzEuMjUgMTMuNTQxN0g0MS42NjY3VjQxLjY2NjdIOC4zMzMzM1YxMy41NDE3SDE1LjYyNVYxMC40MTY3WiIgc3Ryb2tlPSIjOTk5OTk5IiBzdHJva2Utd2lkdGg9IjEuNSIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4KPHN2Zz4KPHR4dCB4PSI1MCIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjY2NjYiPkltYWdlIG5vdCBmb3VuZDwvdGV4dD4KPHN2Zz4=';
    this.alt = `Image not found: ${fileName}`;
  };
  
  // Show and activate the window
  if (isMobile()) {
    openWindowMobile('window-imageviewer');
  } else {
    openWindow('window-imageviewer');
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
    case 'window-explorer':   return 'icons/folder.png'; /* Make sure this line exists */
    default: return 'icons/windows.png';
  }
}