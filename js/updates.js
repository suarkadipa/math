'use strict';

(function() {
  const CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes
  let currentVersion = null;
  let updateToastVisible = false;

  // Extract version from sw.js text
  function extractVersion(text) {
    const match = text.match(/const\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  }

  async function getVersionFromServer() {
    try {
      const res = await fetch('./sw.js?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return null;
      const text = await res.text();
      return extractVersion(text);
    } catch (e) {
      console.warn('[Updates] Failed to fetch version from server:', e);
      return null;
    }
  }

  async function initVersion() {
    // Try to get current version from window or fetch sw.js (likely from cache)
    if (window.APP_VERSION) {
      currentVersion = window.APP_VERSION;
    } else {
      try {
        const res = await fetch('./sw.js'); // No cache bust, should get cached version
        const text = await res.text();
        currentVersion = extractVersion(text);
        window.APP_VERSION = currentVersion;
      } catch (e) {
        console.warn('[Updates] Failed to init version:', e);
      }
    }
    
    // Update UI if element exists
    const el = document.getElementById('readyVersion');
    if (el && currentVersion) {
       el.textContent = 'Made with ❤️ by Gus Ari · Powered by Claude AI · ' + currentVersion;
    }
    
    console.log('[Updates] Current version established:', currentVersion);
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
          <div class="update-toast-msg">A new version is ready with fresh improvements.</div>
        </div>
        <button id="updateRefreshBtn" class="update-toast-btn">Update Now</button>
      </div>
    `;

    document.body.appendChild(toast);
    
    // Smooth entry
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    document.getElementById('updateRefreshBtn').onclick = () => {
      window.bypassUnloadConfirm = true;
      window.location.reload();
    };
  }

  async function checkForUpdates() {
    // Don't check if toast is already shown
    if (updateToastVisible) return;

    console.log('[Updates] Checking for updates...');
    
    // Tell browser to check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.update();
      });
    }

    const latestVersion = await getVersionFromServer();
    
    if (latestVersion && currentVersion && latestVersion !== currentVersion) {
      console.log('[Updates] New version detected!', { current: currentVersion, latest: latestVersion });
      createUpdateToast();
    }
  }

  // --- Start ---
  initVersion().then(() => {
    // Initial check after short delay
    setTimeout(checkForUpdates, 5000);
    
    // Periodic check
    setInterval(checkForUpdates, CHECK_INTERVAL);
  });

  // Check on visibility change (user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdates();
    }
  });

  // Check on window focus (user returns to window)
  window.addEventListener('focus', () => {
    checkForUpdates();
  });

})();

