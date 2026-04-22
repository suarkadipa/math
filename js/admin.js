'use strict';

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
  g('as-passmsg').value = CFG.passmsg || '';
  g('as-failmsg').value = CFG.failmsg || '';
  g('as-anim').value    = CFG.anim;
  g('as-pin').value     = '';
  g('as-theme').value   = CFG.theme || 'dark';
  g('admToast').textContent = '';
  ['ar1','ar2'].forEach(id => { var e=g(id); if(e) e.remove(); });
  g('admOv').classList.add('on');
}

function closeAdm() { g('admOv').classList.remove('on'); }

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
  closeAdm();
  g('readyOv').style.display = 'none';
  genAll();
  allQ.forEach(q => q.inp.disabled = false);
  g('btnCheck').disabled = true;
  startTimer();
}