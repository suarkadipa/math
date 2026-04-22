'use strict';

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
function startTimer() {
  TTOTAL=CFG.timer*60; timedOut=false; timerEnd=Date.now()+TTOTAL*1000;
  var warnPlayed=false, dangerPlayed=false, tickIv=null;
  function tick() {
    var left = Math.max(0, Math.round((timerEnd-Date.now())/1000));
    updTimer(left);
    if (left<=300&&left>60&&!warnPlayed) { warnPlayed=true; SFX.tick(false); }
    if (left<=60&&!dangerPlayed)         { dangerPlayed=true; tickIv=setInterval(()=>SFX.tick(true),1000); }
    if (left>0) setTimeout(tick,500); else { if(tickIv)clearInterval(tickIv); onTimeUp(); }
  }
  tick();
}
function onTimeUp() {
  timedOut=true; updTimer(0); SFX.bell();
  allQ.forEach(q => { q.inp.disabled=true; q.inp.style.cursor='not-allowed'; });
  g('btnCheck').disabled=false; g('tuOv').classList.add('on');
}

// ── Start test ──
function startTest() {
  SFX.launch();
  var ov=g('readyOv'); ov.style.transition='opacity .5s'; ov.style.opacity='0';
  setTimeout(()=>ov.style.display='none', 500);
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
  // Splash Enter → start
  if (e.key==='Enter' && g('readyOv') && g('readyOv').style.display!=='none' && g('readyOv').style.opacity!=='0') { e.preventDefault(); startTest(); return; }
  // Focus mode navigation
  if (g('focusBackdrop').classList.contains('on')) {
    if (e.key==='Escape')    { restoreInputsToGrid(focusIdx); closeFocus(); return; }
    if (CFG.focusarrows !== false && e.key==='ArrowRight') { e.preventDefault(); focusNav(1); return; }
    if (CFG.focusarrows !== false && e.key==='ArrowLeft')  { e.preventDefault(); focusNav(-1); return; }
  }
  if (e.altKey && e.key==='Enter')    { e.preventDefault(); openPin(doCheck); }
  if (e.altKey && e.code==='KeyB')    { e.preventDefault(); showCfm('Reset Answers','Reset all answers?',resetAll); }
  if (e.altKey && e.code==='KeyN')    { e.preventDefault(); showCfm('New Questions','Generate new questions? All answers will be lost.',genAll); }
  if (e.altKey && e.code==='KeyA')    { e.preventDefault(); openPin(openAdm); }
  if (e.altKey && e.code==='KeyF')    { e.preventDefault(); if(focusIdx<0) openFocus(0); else { restoreInputsToGrid(focusIdx); closeFocus(); } }
});

// ── Prevent accidental close ──
window.addEventListener('beforeunload', e => { e.preventDefault(); e.returnValue=''; });

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
applyTheme(CFG.theme || 'dark');
applyFloat();

g('mainTitle').textContent  = '📐 '+CFG.name+"'s Math Practice";
g('readyTitle').textContent = 'Hi, '+CFG.name+'! 👋';
g('readySub').textContent   = CFG.welcome || WELCOME_MSGS[Math.floor(Math.random()*WELCOME_MSGS.length)];
g('ruleTimer').innerHTML    = '⏱ You have <strong>'+CFG.timer+' minutes</strong> to finish';
if (g('readyVersion')) g('readyVersion').textContent = 'Made with ❤️ by Gus Ari · Powered by Claude AI · ' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '');

// Streak display on splash
var rs = g('readyStreak');
if (streak > 0)          rs.innerHTML = '🔥 Current streak: <strong>'+streak+'</strong> session'+(streak>1?'s':'')+' &nbsp;|&nbsp; 🏅 Best: <strong>'+longestStreak+'</strong>';
else if (longestStreak>0) rs.innerHTML = '🏅 Best streak: <strong>'+longestStreak+'</strong> — can you beat it?';
else                       rs.innerHTML = '🌟 No streak yet — go for it!';

initSplashAnim();
genAll();