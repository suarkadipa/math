'use strict';

var admCdIv = null;

function fmtAbsDt(ts) {
  try {
    return new Date(ts).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) { return '-'; }
}

function updateAdmCooldownMeta() {
  var el = g('admCooldownMeta'); if (!el) return;
  var limit = Math.max(1, parseInt(CFG.failstreaklimit) || DEF.failstreaklimit);
  var fs = Math.max(0, parseInt(CD.failStreak) || 0);
  var active = typeof isCooldownActive === 'function' ? isCooldownActive() : false;
  if (active) {
    var leftMs = typeof cooldownMsLeft === 'function' ? cooldownMsLeft() : Math.max(0, (CD.cooldownUntil || 0) - Date.now());
    var leftTxt = typeof fmtCooldownLeft === 'function' ? fmtCooldownLeft(leftMs) : Math.ceil(leftMs/60000) + 'm';
    el.innerHTML =
      '⛔ Cooldown status: <span style="color:var(--bad)">ACTIVE</span><br>' +
      '⏳ Remaining: <strong>' + leftTxt + '</strong><br>' +
      '📅 Ends at: <strong>' + fmtAbsDt(CD.cooldownUntil) + '</strong><br>' +
      '📉 Failed streak progress: <strong>' + fs + ' / ' + limit + '</strong>';
  } else {
    el.innerHTML =
      '✅ Cooldown status: <span style="color:var(--ok)">INACTIVE</span><br>' +
      '📉 Failed streak progress: <strong>' + fs + ' / ' + limit + '</strong><br>' +
      'ℹ️ Cooldown starts when failed streak reaches the configured limit.';
  }
  var btn = g('admResetCd');
  if (btn) btn.style.display = (active || fs > 0) ? 'block' : 'none';
}

function openAdm() {
  g('as-name').value    = CFG.name;
  g('as-welcome').value = CFG.welcome || '';
  g('as-timer').value   = CFG.timer;
  g('as-float').classList.toggle('on', CFG.float);
  g('as-sound').classList.toggle('on', CFG.sound);
  g('as-focusskip').classList.toggle('on', CFG.focusskip !== false);
  g('as-focusarrows').classList.toggle('on', CFG.focusarrows !== false);
  g('as-pm').value      = CFG.pm;
  g('as-digits').value  = String(CFG.digits || 7);
  g('as-bm').value      = CFG.bm;
  g('as-bd').value      = CFG.bd;
  g('as-pass').value    = CFG.pass;
  g('as-fail').value    = CFG.fail;
  g('as-failstreaklimit').value = CFG.failstreaklimit || DEF.failstreaklimit;
  g('as-cooldowndays').value    = CFG.cooldowndays || DEF.cooldowndays;
  g('as-passmsg').value = CFG.passmsg || '';
  g('as-failmsg').value = CFG.failmsg || '';
  g('as-anim').value    = CFG.anim;
  g('as-pin').value     = '';
  g('as-theme').value   = CFG.theme || 'dark';
  g('admToast').textContent = '';
  ['ar1','ar2'].forEach(id => { var e=g(id); if(e) e.remove(); });
  if (admCdIv) { clearInterval(admCdIv); admCdIv = null; }
  updateAdmCooldownMeta();
  admCdIv = setInterval(updateAdmCooldownMeta, 1000);
  g('admOv').classList.add('on');
}

function closeAdm() {
  if (admCdIv) { clearInterval(admCdIv); admCdIv = null; }
  g('admOv').classList.remove('on');
}

function saveAdm() {
  CFG.name      = g('as-name').value.trim() || DEF.name;
  CFG.welcome   = g('as-welcome').value.trim();
  CFG.timer     = Math.min(60, Math.max(1, parseInt(g('as-timer').value) || DEF.timer));
  CFG.float     = g('as-float').classList.contains('on');
  CFG.sound     = g('as-sound').classList.contains('on');
  CFG.focusskip = g('as-focusskip').classList.contains('on');
  CFG.focusarrows = g('as-focusarrows').classList.contains('on');
  CFG.pm        = Math.min(10, Math.max(1, parseInt(g('as-pm').value) || DEF.pm));
  CFG.digits    = parseInt(g('as-digits').value) || 7;
  CFG.bm        = Math.min(3, Math.max(1, parseInt(g('as-bm').value) || DEF.bm));
  CFG.bd        = Math.min(3, Math.max(1, parseInt(g('as-bd').value) || DEF.bd));
  CFG.pass      = Math.max(0, parseInt(g('as-pass').value) || DEF.pass);
  CFG.fail      = Math.max(1, parseInt(g('as-fail').value) || DEF.fail);
  CFG.failstreaklimit = Math.max(1, parseInt(g('as-failstreaklimit').value) || DEF.failstreaklimit);
  CFG.cooldowndays    = Math.max(1, parseInt(g('as-cooldowndays').value) || DEF.cooldowndays);
  if (CD.cooldownStartedAt && CD.cooldownUntil > 0) {
    CD.cooldownUntil = CD.cooldownStartedAt + CFG.cooldowndays * 24 * 60 * 60 * 1000;
    saveCooldownState();
  }
  CFG.passmsg   = g('as-passmsg').value.trim();
  CFG.failmsg   = g('as-failmsg').value.trim();
  CFG.anim      = parseInt(g('as-anim').value);
  CFG.theme     = g('as-theme').value;
  var np = g('as-pin').value.replace(/\D/g,''); if(np.length===4) CFG.pin=np;

  saveCfg(); applyTheme(CFG.theme); applyFloat();

  g('mainTitle').textContent  = '📐 '+CFG.name+"'s Math Practice";
  g('readyTitle').textContent = 'Hi, '+CFG.name+'! 👋';
  g('readySub').textContent   = CFG.welcome || WELCOME_MSGS[Math.floor(Math.random()*WELCOME_MSGS.length)];
  g('ruleTimer').innerHTML    = '⏱ You have <strong>'+CFG.timer+' minutes</strong> to finish';
  TTOTAL = CFG.timer * 60;
  if (typeof refreshCooldownUI === 'function') refreshCooldownUI();
  updateAdmCooldownMeta();

  g('admToast').textContent = '✅ Settings saved!';
  setTimeout(() => g('admToast').textContent = '', 2500);

  // Reload / Quiz shortcut buttons
  ['ar1','ar2'].forEach(id => { var e=g(id); if(e) e.remove(); });
  var foot = g('admFoot');
  var b1 = document.createElement('button'); b1.id='ar1'; b1.onclick=()=>location.reload();
  b1.style.cssText='padding:11px 14px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:12px;font-weight:800;font-size:.85rem;cursor:pointer;font-family:Nunito,sans-serif;white-space:nowrap';
  b1.textContent='🔄 Splash'; foot.appendChild(b1);
  var b2 = document.createElement('button'); b2.id='ar2'; b2.onclick=skipToQuiz;
  b2.style.cssText='padding:11px 14px;background:linear-gradient(135deg,#43e97b,#38f9d7);color:#fff;border:none;border-radius:12px;font-weight:800;font-size:.85rem;cursor:pointer;font-family:Nunito,sans-serif;white-space:nowrap';
  b2.textContent='🚀 Quiz'; foot.appendChild(b2);
}

function skipToQuiz() {
  if (isCooldownActive()) {
    closeAdm();
    refreshCooldownUI();
    return;
  }
  closeAdm();
  g('readyOv').style.display = 'none';
  hasStarted = true;
  genAll();
  allQ.forEach(q => q.inp.disabled = false);
  g('btnCheck').disabled = true;
  startTimer();
}

function resetCooldown() {
  showCfm('Reset Cooldown', 'Clear active cooldown and failed streak?', function() {
    CD.failStreak = 0;
    CD.cooldownUntil = 0;
    CD.cooldownStartedAt = 0;
    saveCooldownState();
    closeAdm(); // Close admin panel
    
    // Force show splash screen
    var ov = g('readyOv');
    if (ov) {
      ov.style.display = 'flex';
      ov.style.opacity = '1';
      ov.style.pointerEvents = 'auto';
    }
    hasStarted = false;
    timerRunId++; // Stop any running timer

    if (typeof refreshCooldownUI === 'function') refreshCooldownUI();
    updateAdmCooldownMeta();
  });
}