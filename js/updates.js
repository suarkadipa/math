'use strict';

(function() {
  const CHECK_INTERVAL = 30 * 1000; // 30 seconds
  let updateToastVisible = false;

  // ── Sync Version from SW (Single Source of Truth) ──
  async function syncVersionFromSW() {
    try {
      const res = await fetch('./sw.js?t=' + Date.now());
      const text = await res.text();
      const match = text.match(/const\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
      if (match && match[1]) {
        window.APP_VERSION = match[1]; // Set global variable
        
        // Update UI splash screen version text
        const el = document.getElementById('readyVersion');
        if (el) {
          el.textContent = 'Made with ❤️ by Gus Ari · Powered by Claude AI · ' + window.APP_VERSION;
        }
        console.log('[Updates] Synced current version from sw.js:', window.APP_VERSION);
      }
    } catch (e) {
      console.warn('[Updates] Failed to sync version from sw.js:', e);
    }
  }

  function createUpdateToast() {
    if (updateToastVisible) return;
    updateToastVisible = true;

    const toast = document.createElement('div');
    toast.id = 'updateToast';
    toast.className = 'update-toast';
    toast.innerHTML = `
      <div class="update-toast-content">
        <div class="update-toast-icon">🚀</div>
        <div class="update-toast-body">
          <div class="update-toast-title">Update Available!</div>
          <div class="update-toast-msg">A new version is ready. Refresh to update.</div>
        </div>
        <button id="updateRefreshBtn" class="update-toast-btn">Refresh Now</button>
      </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);

    document.getElementById('updateRefreshBtn').onclick = () => {
      window.bypassUnloadConfirm = true;
      window.location.reload();
    };
  }

  async function checkForUpdates() {
    console.log('[Updates] Checking for updates...');
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.update();
      });
    }

    try {
      const swResponse = await fetch('./sw.js?t=' + Date.now(), { cache: 'no-store' });
      if (!swResponse.ok) return;
      
      const swText = await swResponse.text();
      const versionMatch = swText.match(/const\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
      
      if (versionMatch && versionMatch[1]) {
        const latestVersion = versionMatch[1];
        const currentVersion = window.APP_VERSION || '';

        console.log('[Updates] Current (Live):', currentVersion, 'Latest (Server):', latestVersion);

        if (currentVersion && latestVersion !== currentVersion) {
          createUpdateToast();
        }
      }
    } catch (err) {
      console.warn('[Updates] Failed to check for updates:', err);
    }
  }

  // Initial sync and setup
  syncVersionFromSW();
  
  window.addEventListener('load', () => {
    setTimeout(checkForUpdates, 3000);
    setInterval(checkForUpdates, CHECK_INTERVAL);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    });
  });
})();
