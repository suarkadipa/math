'use strict';


var timerRunId = 0;
var timerTickInterval = null;
var allowCloseOnce = false;

function toggleSplashAchievements(forceOpen) {
  var wrap = g('readyAchWrap');
  var head = g('readyAchHead');
  if (!wrap) return;
  var shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : wrap.classList.contains('collapsed');
  wrap.classList.toggle('collapsed', !shouldOpen);
  if (head) head.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}

function cooldownMsLeft() {
  if (CD.cooldownStartedAt && CD.cooldownUntil > 0) {
    var days = Math.max(1, parseInt(CFG.cooldowndays) || DEF.cooldowndays);
    var target = CD.cooldownStartedAt + days * 24 * 60 * 60 * 1000;
    return Math.max(0, target - Date.now());
  }
  return Math.max(0, (CD.cooldownUntil || 0) - Date.now());
}
function isCooldownActive() {
  if (cooldownMsLeft() > 0) return true;
  if (CD.cooldownUntil) {
    CD.cooldownUntil = 0;
    CD.cooldownStartedAt = 0;
    CD.failStreak = 0;
    saveCooldownState();
  }
  return false;
}
function fmtCooldownLeft(ms) {
  var totalSec = Math.ceil(ms / 1000);
  var d = Math.floor(totalSec / 86400);
  var h = Math.floor((totalSec % 86400) / 3600);
  var m = Math.floor((totalSec % 3600) / 60);
  if (d > 0) return d + ' day' + (d > 1 ? 's' : '') + (h > 0 ? ' ' + h + 'h' : '');
  if (h > 0) return h + 'h ' + m + 'm';
  return m + 'm';
}
function refreshCooldownUI() {
  var box = g('readyCooldown');
  var btn = g('readyStartBtn');
  var rules = g('readyRules');
  var streak = g('readyStreak');
  var timerTxt = g('readyTimerTxt');
  var sub = g('readySub');
  var hstreak = g('headerStreak');
  if (!box || !btn) return;
  var active = isCooldownActive();
  if (active) {
    if (hstreak) hstreak.style.display = 'none';
    var left = cooldownMsLeft();
    if (rules) rules.style.display = 'none';
    if (streak) streak.style.display = 'none';
    if (timerTxt) timerTxt.style.display = 'none';
    if (sub) sub.style.display = 'none';
    box.style.display = 'block';
    var limit = Math.max(1, parseInt(CFG.failstreaklimit) || DEF.failstreaklimit);
    box.innerHTML = '⛔ Cooldown active after <strong>' + limit + '</strong> consecutive failed sessions.<br>You can try again in <strong>' + fmtCooldownLeft(left) + '</strong>.';
    btn.disabled = true;
    btn.style.opacity = '.65';
    btn.style.cursor = 'not-allowed';
    btn.textContent = '⏳ Cooldown Active';

    // Auto-redirect to splash if active but hidden (and not currently checking or reviewing errors)
    var ov = g('readyOv');
    var isWrongOpen = g('wrongOv') && g('wrongOv').classList.contains('on');
    if (!isChecking && !isWrongOpen && ov && (ov.style.display === 'none' || hasStarted)) {
      ov.style.display = 'flex';
      ov.style.opacity = '1';
      ov.style.pointerEvents = 'auto';
      document.body.classList.add('splash-active');
      hasStarted = false;
      timerRunId++; // Stop any running timer
    }
  } else {
    var limit = Math.max(1, parseInt(CFG.failstreaklimit) || DEF.failstreaklimit);
    if (rules) rules.style.display = '';
    if (streak) streak.style.display = 'table';
    if (timerTxt) timerTxt.style.display = '';
    if (sub) sub.style.display = '';
    box.style.display = 'block';
    var msg = CD.failStreak > 0
      ? '⚠️ Failed streak: <strong>' + CD.failStreak + ' / ' + limit + '</strong>. Reach the limit and cooldown will start.'
      : '';
    box.innerHTML = msg;
    box.style.display = CD.failStreak > 0 ? 'block' : 'none';
    var hstreak = g('headerStreak');
    if (hstreak) {
      hstreak.innerHTML = msg;
      hstreak.style.display = CD.failStreak > 0 ? 'block' : 'none';
    }
    btn.disabled = false;
    btn.style.opacity = '';
    btn.style.cursor = 'pointer';
    btn.textContent = "🚀 Let's Go!";
  }
}
function onSessionPassed() {
  if (CD.failStreak !== 0 || CD.cooldownUntil) {
    CD.failStreak = 0;
    CD.cooldownUntil = 0;
    CD.cooldownStartedAt = 0;
    saveCooldownState();
  }
  refreshCooldownUI();
}
function onSessionFailed() {
  if (isCooldownActive()) { refreshCooldownUI(); return; }
  CD.failStreak++;
  var limit = Math.max(1, parseInt(CFG.failstreaklimit) || DEF.failstreaklimit);
  if (CD.failStreak >= limit) {
    var days = Math.max(1, parseInt(CFG.cooldowndays) || DEF.cooldowndays);
    CD.cooldownStartedAt = Date.now();
    CD.cooldownUntil = CD.cooldownStartedAt + days * 24 * 60 * 60 * 1000;
    CD.failStreak = 0;
  }
  saveCooldownState();
  refreshCooldownUI();
}
// ── Theme ──
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); g('themeDropdown').value = t; }
function onThemeChange(t) { CFG.theme = t; saveCfg(); applyTheme(t); }

// ── Float timer ──
function applyFloat() {
  window.removeEventListener('scroll', onScroll);
  if (CFG.float) { window.addEventListener('scroll', onScroll); onScroll(); }
  else g('fpill').classList.remove('show');
}
function onScroll() {
  var bar = document.querySelector('.timer-bar'); if (!bar) return;
  g('fpill').classList.toggle('show', bar.getBoundingClientRect().bottom < 0);
}

// ── Timer ──
function updTimer(left) {
  var m = Math.floor(left/60), s = left%60;
  var txt = String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  var pct = (left/TTOTAL*100)+'%';
  g('tdisp').textContent=txt; g('fpillTxt').textContent=txt;
  g('tf').style.width=pct; g('fpillTf').style.width=pct;
  var box=g('tbox'), pill=g('fpill');
  box.classList.remove('danger','warning'); pill.classList.remove('danger','warning');
  if (left<=60)  { box.classList.add('danger');  pill.classList.add('danger');  }
  else if (left<=300) { box.classList.add('warning'); pill.classList.add('warning'); }
}
function stopTimer() {
  timerRunId++;
  if (timerTickInterval) {
    clearInterval(timerTickInterval);
    timerTickInterval = null;
  }
  var box = g('tbox');
  var pill = g('fpill');
  if (box) box.classList.remove('danger', 'warning');
  if (pill) pill.classList.remove('danger', 'warning');
}
function startTimer() {
  if (timerTickInterval) {
    clearInterval(timerTickInterval);
    timerTickInterval = null;
  }
  var runId = ++timerRunId;
  TTOTAL=CFG.timer*60; timedOut=false; timerEnd=Date.now()+TTOTAL*1000;
  var lastTickSecond = -1;
  function tick() {
    if (runId !== timerRunId) return;
    var left = Math.max(0, Math.round((timerEnd-Date.now())/1000));
    updTimer(left);
    if (left !== lastTickSecond) {
      lastTickSecond = left;
      if (left <= 60 && left > 0) {
        SFX.tick(true);
      } else if (left <= 120 && left > 60) {
        if ((120 - left) % 2 === 0) SFX.tick(false);
      } else if (left <= 180 && left > 120) {
        if ((180 - left) % 6 === 0) SFX.tick(false);
      } else if (left <= 240 && left > 180) {
        if ((240 - left) % 12 === 0) SFX.tick(false);
      } else if (left <= 300 && left > 240) {
        if ((300 - left) % 24 === 0) SFX.tick(false);
      }
    }
    if (left>0) setTimeout(tick,500); else {
      if (timerTickInterval) {
        clearInterval(timerTickInterval);
        timerTickInterval = null;
      }
      onTimeUp(runId);
    }
  }
  tick();
}
function onTimeUp(runId) {
  if (typeof runId === 'number' && runId !== timerRunId) return;
  timedOut=true; updTimer(0); SFX.bell();
  allQ.forEach(q => { q.inp.disabled=true; q.inp.style.cursor='not-allowed'; });
  g('btnCheck').disabled=false; g('tuOv').classList.add('on');
}

// ── Start test ──
function startTest(adminBypass) {
  if (!adminBypass && isCooldownActive()) {
    var left = fmtCooldownLeft(cooldownMsLeft());
    showCfm('Cooldown Active', 'Too many failed sessions. You can try again in ' + left + '.', function(){});
    refreshCooldownUI();
    return;
  }
  if (hasStarted) return;
  hasStarted = true;
  SFX.launch();
  var ov=g('readyOv'); ov.style.transition='opacity .5s'; ov.style.opacity='0'; ov.style.pointerEvents='none';
  setTimeout(()=>{
    ov.style.display='none';
    document.body.classList.remove('splash-active');
  }, 500);
  allQ.forEach(q=>q.inp.disabled=false); startTimer();
}

// ── PIN input events ──
g('pinInp').addEventListener('input', function() {
  this.value=this.value.replace(/\D/g,''); g('pinErr').textContent='';
  if(this.value.length===4) setTimeout(submitPin,100);
});
g('pinInp').addEventListener('keydown', e => { if(e.key==='Enter') submitPin(); });

g('ipinInp').addEventListener('input', function() {
  this.value=this.value.replace(/\D/g,''); g('ipinErr').textContent='';
  if(this.value.length===4) setTimeout(submitIpin,100);
});
g('ipinInp').addEventListener('keydown', e => { if(e.key==='Enter') submitIpin(); });

// ── Wrong overlay ──
g('wrongOv').addEventListener('click', e => { if(e.target===g('wrongOv')) closeWrong(); });
document.addEventListener('keydown', e => {
  if (e.code==='Space'&&g('wrongOv').classList.contains('on')&&!g('ipinOv').classList.contains('on')) { e.preventDefault(); togCorrect(); }
});

// ── Focus backdrop ──
g('focusBackdrop').addEventListener('click', e => {
  if (e.target===g('focusBackdrop')) { restoreInputsToGrid(focusIdx); closeFocus(); }
});

// ── Button bindings ──
g('btnCheck').onclick = () => { SFX.click(); openPin(doCheck); };
g('btnReset').onclick = () => { SFX.click(); showCfm('Reset Answers','Reset all answers?',resetAll); };
g('btnNew').onclick   = () => { SFX.click(); showCfm('New Questions','Generate new questions? All answers will be lost.',genAll); };

// ── Keyboard shortcuts ──
document.addEventListener('keydown', e => {
  var isSplash = g('readyOv') && g('readyOv').style.display !== 'none';

  // Splash specific logic
  if (isSplash) {
    // If any modal is open (PIN, Admin, etc.), don't interfere with keys
    if (document.querySelector('.ov.on:not(#readyOv)')) return;

    if (e.key === 'Enter') { e.preventDefault(); startTest(); return; }
    if (e.altKey && e.code === 'KeyA') { e.preventDefault(); openPin(openAdm); return; }
    return; // Block all other shortcuts on splash
  }

  // Quiz active shortcuts
  if (g('focusBackdrop').classList.contains('on')) {
    if (e.defaultPrevented) return;
    var tabLikeForward = e.key === 'Tab' && !e.shiftKey || e.key === 'ArrowDown';
    var tabLikeBackward = e.key === 'Tab' && e.shiftKey || e.key === 'ArrowUp';
    if (tabLikeForward || tabLikeBackward) {
      var isBack = tabLikeBackward;
      var activeEl = document.activeElement;
      var isQi = activeEl && activeEl.classList && activeEl.classList.contains('qi');
      var isRev = activeEl && activeEl.id === 'focusReview';
      if (isQi) {
        var focusInputs = Array.from(g('focusBody').querySelectorAll('.qi:not(:disabled)'));
        var idx = focusInputs.indexOf(activeEl);
        if (e.key !== 'Tab') {
          var nextIdx = idx + (isBack ? -1 : 1);
          if (nextIdx >= 0 && nextIdx < focusInputs.length) {
            e.preventDefault();
            focusInputs[nextIdx].focus();
            return;
          }
        }
        if (!isBack && idx === focusInputs.length - 1) { e.preventDefault(); g('focusReview').focus(); return; }
        if (isBack && idx === 0) { e.preventDefault(); focusNav(-1); return; }
      }
      if (isRev) {
        if (!isBack) { e.preventDefault(); focusNav(1); return; }
        else {
          e.preventDefault();
          var focusInputs = Array.from(g('focusBody').querySelectorAll('.qi:not(:disabled)'));
          if (focusInputs.length) focusInputs[focusInputs.length - 1].focus();
          return;
        }
      }
    }
    if (e.key === ' ' && document.activeElement && document.activeElement.id === 'focusReview') {
      e.preventDefault();
      var focusRev = g('focusReview');
      if (focusIdx >= 0 && focusRev.classList.contains('ready')) {
        var capturedIdx = focusIdx;
        var gridRev = colData[capturedIdx].cardEl.querySelector('.col-review');
        if (gridRev) { gridRev.classList.add('ready'); toggleReview(capturedIdx, gridRev); }
        setTimeout(function() {
          var next = findNextUnreviewed(capturedIdx, 1);
          if (next === -1) showCfm('All columns reviewed! 🎉', 'Ready to check your answers?', function() { openPin(doCheck); });
          else focusNav(1);
        }, 400);
      }
      return;
    }
    if (e.key === 'Escape') { restoreInputsToGrid(focusIdx); closeFocus(); return; }
    if (CFG.focusarrows !== false && e.key === 'ArrowRight') { e.preventDefault(); focusNav(1); return; }
    if (CFG.focusarrows !== false && e.key === 'ArrowLeft') { e.preventDefault(); focusNav(-1); return; }
  }
  if (e.altKey && e.key === 'Enter') { e.preventDefault(); openPin(doCheck); }
  if (e.altKey && e.code === 'KeyB') { e.preventDefault(); showCfm('Reset Answers', 'Reset all answers?', resetAll); }
  if (e.altKey && e.code === 'KeyN') { e.preventDefault(); showCfm('New Questions', 'Generate new questions? All answers will be lost.', genAll); }
  if (e.altKey && e.code === 'KeyA') { e.preventDefault(); openPin(openAdm); }
  if (e.altKey && e.code === 'KeyF') { e.preventDefault(); if (focusIdx < 0) openFocus(0); else { restoreInputsToGrid(focusIdx); closeFocus(); } }
});

// ── Prevent accidental close ──

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
function quizResultVisible() {
  var badge = g('resultBadge');
  var score = g('rbScore');
  if (!badge || !score) return false;
  return badge.style.display === 'block' && score.textContent.trim() !== '';
}

window.addEventListener('beforeunload', function(e) {
  if (allowCloseOnce) return;
  if (quizResultVisible()) return;
  var hasAnyAnswer = Array.isArray(allQ) && allQ.some(function(q) { return q.inp && q.inp.value && q.inp.value.trim() !== ''; });
  var shouldWarn = hasStarted || hasAnyAnswer || (g('focusBackdrop') && g('focusBackdrop').classList.contains('on'));
  if (!shouldWarn) return;
  e.preventDefault();
  e.returnValue = '';
});

window.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'w') {
    if (quizResultVisible()) {
      allowCloseOnce = true;
      return;
    }
    if (confirm('Close this app tab/window? Your current progress may be lost.')) {
      allowCloseOnce = true;
    } else {
      e.preventDefault();
    }
  }
});

applyTheme(CFG.theme || 'dark');
applyFloat();

g('mainTitle').textContent  = '📐 '+CFG.name+"'s Math Practice";
g('readyTitle').textContent = 'Hi, '+CFG.name+'! 👋';
g('readySub').textContent   = CFG.welcome || WELCOME_MSGS[Math.floor(Math.random()*WELCOME_MSGS.length)];
g('ruleTimer').innerHTML    = '⏱ You have <strong>'+CFG.timer+' minutes</strong> to finish';


// Streak display on splash
var rs = g('readyStreak');
if (streak > 0)          rs.innerHTML = '🔥 Current streak: <strong>'+streak+'</strong> session'+(streak>1?'s':'')+' &nbsp;|&nbsp; 🏅 Best: <strong>'+longestStreak+'</strong>';
else if (longestStreak>0) rs.innerHTML = '🏅 Best streak: <strong>'+longestStreak+'</strong> — can you beat it?';
else                       rs.innerHTML = '🌟 No streak yet — go for it!';

if (typeof renderSplashAchievements === 'function') renderSplashAchievements();
toggleSplashAchievements(false);
refreshCooldownUI();
initSplashAnim();
genAll();
