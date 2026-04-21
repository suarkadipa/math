'use strict';

// ════════════════════════════════════
// GENERATE
// ════════════════════════════════════
function genMultCol(n) {
  var base = shuffle([1,2,3,4,5,6,7,8,9,10].map(i => ({ lbl: n+' × '+i, ans: n*i })));
  var mults = shuffle([10,100,1000]).slice(0, CFG.bm).map(m => {
    var a = ri(1000, 99999); return { lbl: fmt(a)+' × '+fmt(m), ans: a*m };
  });
  var divs = shuffle([10,100,1000]).slice(0, CFG.bd).map(m => {
    var a = ri(100, 9999)*m; return { lbl: fmt(a)+' ÷ '+fmt(m), ans: a/m };
  });
  return { title: 'Multiplication '+n, qs: base.concat(mults).concat(divs) };
}

function genPMCol() {
  var d = CFG.digits || 7, qs = [];
  for (var i = 0; i < CFG.pm; i++) {
    var a = rndDigits(d), b = rndDigits(d), c = rndDigits(d), lbl, ans;
    if (Math.random() < 0.5) {
      var maxC = a + b - 1;
      c = 1 + Math.floor(Math.random() * Math.min(maxC, Math.pow(10,d)-1));
      lbl = fmt(a)+' + '+fmt(b)+' - '+fmt(c); ans = a+b-c;
    } else {
      var nums = [a,b].sort((x,y) => y-x);
      lbl = fmt(nums[0])+' - '+fmt(nums[1])+' + '+fmt(c); ans = nums[0]-nums[1]+c;
    }
    qs.push({ lbl, ans, wide: true });
  }
  return { title: '➕➖ Addition & Subtraction ('+d+'-digit)', qs, wide: true };
}

function genAll() {
  var cols = shuffle([2,3,4,5,6,7,8,9]).map(genMultCol);
  cols.push(genPMCol());
  renderGrid(cols);
}

// ════════════════════════════════════
// RENDER GRID
// ════════════════════════════════════
function renderGrid(cols) {
  var grid = g('grid');
  grid.innerHTML = ''; allQ = []; colData = [];
  g('chkCtr').style.display = 'none';
  g('streakBar').style.display = 'none';
  g('revProg').style.display = 'none';
  g('resultBadge').style.display = 'none';
  g('rbScore').textContent = '';
  chkCount = 0; cheatChk = 0; reviewedCols = new Set();
  totalCols = cols.length; sessionPassed = false;
  streak = parseInt(localStorage.getItem('streak') || '0');
  ['s1','s2','s3','s4','s5'].forEach(s => g(s).classList.remove('lit'));
  g('btnCheck').disabled = true;

  cols.forEach((col, ci) => {
    var card = document.createElement('div');
    var colorClass = 'c' + ci;
    card.className = 'col-card ' + colorClass + (col.wide ? ' wide' : '');
    card.innerHTML = '<div class="col-done-overlay"></div><div class="col-reviewed-badge">✓ Reviewed</div>';

    // Header with focus button
    var hdr = document.createElement('div'); hdr.className = 'col-header';
    var htitle = document.createElement('span'); htitle.className = 'col-header-title'; htitle.textContent = col.title;
    var fbtn = document.createElement('button'); fbtn.className = 'col-focus-btn'; fbtn.title = 'Focus Mode'; fbtn.textContent = '⛶';
    fbtn.addEventListener('click', (function(idx) { return function(e) { e.stopPropagation(); openFocus(idx); }; })(ci));
    hdr.appendChild(htitle); hdr.appendChild(fbtn); card.appendChild(hdr);

    // Progress bar
    var cpw = document.createElement('div'); cpw.className = 'cpw';
    var cpf = document.createElement('div'); cpf.className = 'cpf';
    cpw.appendChild(cpf); card.appendChild(cpw);

    var body = document.createElement('div'); body.className = 'col-body';

    col.qs.forEach((q, qi) => {
      var row = document.createElement('div'); row.className = 'qr';
      var lbl = document.createElement('span'); lbl.className = q.wide ? 'ql wl' : 'ql';
      lbl.innerHTML = '<span class="qn">'+(qi+1)+'</span>'+q.lbl+' =';
      var inp = document.createElement('input');
      inp.type = 'text'; inp.className = 'qi'; inp.placeholder = '?'; inp.disabled = true;
      inp.inputMode = 'numeric';
      inp.addEventListener('input', (function(c, idx) {
        return function() {
          SFX.type();
          var raw = inp.value.replace(/,/g,'').replace(/\D/g,'');
          if (!raw) { inp.value = ''; updColProg(); refreshColReview(c, idx); return; }
          var pos = inp.selectionStart, prev = inp.value.length;
          inp.value = parseInt(raw).toLocaleString('en-US');
          inp.setSelectionRange(pos+(inp.value.length-prev), pos+(inp.value.length-prev));
          updColProg(); refreshColReview(c, idx);
        };
      })(card, ci));
      var icon = document.createElement('span'); icon.className = 'ci';
      row.appendChild(lbl); row.appendChild(inp); row.appendChild(icon);
      body.appendChild(row);
      allQ.push({ ans: q.ans, inp, icon, lbl: q.lbl, colIdx: ci });
    });

    // Review checkbox
    var rev = document.createElement('div'); rev.className = 'col-review';
    rev.innerHTML = '<div class="col-rev-box"></div><span class="col-rev-lbl">I\'ve reviewed all answers in this column</span>';
    rev.addEventListener('click', (function(idx, r) { return function() { toggleReview(idx, r); }; })(ci, rev));
    body.appendChild(rev); card.appendChild(body); grid.appendChild(card);

    colData.push({ title: col.title, qs: col.qs, cardEl: card, colIdx: ci, colorClass, wide: col.wide });
  });
}

// ════════════════════════════════════
// REVIEW
// ════════════════════════════════════
function isColFull(card) {
  var ins = Array.from(card.querySelectorAll('.qi'));
  return ins.length > 0 && ins.every(i => i.value.trim() !== '');
}

function refreshColReview(card, colIdx) {
  var rev = card.querySelector('.col-review'); if (!rev) return;
  var full = isColFull(card);
  rev.classList.toggle('ready', full);
  if (!full && rev.classList.contains('checked')) {
    rev.classList.remove('checked'); rev.querySelector('.col-rev-box').textContent = '';
    card.classList.remove('reviewed'); reviewedCols.delete(colIdx); updRevProg();
    setTimeout(() => { reorderCards(); setTimeout(() => window.scrollTo({top:0,behavior:'smooth'}), 500); }, 150);
  }
  if (focusIdx === colIdx) syncFocusReview();
}

function reorderCards() {
  var grid = g('grid');
  var cards = Array.from(grid.querySelectorAll('.col-card'));
  var rects = new Map(); cards.forEach(c => rects.set(c, c.getBoundingClientRect()));
  var unreviewed = cards.filter(c => !c.classList.contains('reviewed'));
  var reviewed   = cards.filter(c =>  c.classList.contains('reviewed'));
  unreviewed.concat(reviewed).forEach(c => grid.appendChild(c));
  cards.forEach(c => {
    var from = rects.get(c), to = c.getBoundingClientRect();
    var dx = from.left-to.left, dy = from.top-to.top;
    if (dx===0 && dy===0) return;
    c.style.transition = 'none'; c.style.transform = `translate(${dx}px,${dy}px)`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      c.style.transition = 'transform .45s cubic-bezier(.4,0,.2,1)'; c.style.transform = '';
    }));
  });
}

function toggleReview(colIdx, el) {
  var card = el.closest ? el.closest('.col-card') : colData[colIdx].cardEl;
  if (!el.classList.contains('ready')) return;
  var checked = el.classList.toggle('checked');
  el.querySelector('.col-rev-box').textContent = checked ? '✓' : '';
  card.classList.toggle('reviewed', checked);
  // sync grid checkbox
  var gridRev = card.querySelector('.col-review');
  if (gridRev && gridRev !== el) {
    gridRev.classList.toggle('checked', checked);
    gridRev.querySelector('.col-rev-box').textContent = checked ? '✓' : '';
  }
  if (checked) { reviewedCols.add(colIdx); SFX.review(); } else { reviewedCols.delete(colIdx); }
  updRevProg(); syncFocusReview(); setTimeout(reorderCards, 150);
}

function updRevProg() {
  var done = reviewedCols.size, prog = g('revProg'), btn = g('btnCheck');
  prog.style.display = 'block';
  if (done === totalCols) {
    prog.textContent = '✅ All columns reviewed — ready to check!';
    prog.className = 'rev-prog done'; btn.disabled = false;
  } else {
    prog.textContent = '📋 Reviewed '+done+' / '+totalCols+' columns';
    prog.className = 'rev-prog'; btn.disabled = true;
  }
}

function updColProg() {
  colData.forEach(cd => {
    var ins = cd.cardEl.querySelectorAll('.qi');
    var f = Array.from(ins).filter(i => i.value.trim() !== '').length;
    var fill = cd.cardEl.querySelector('.cpf');
    if (fill && ins.length) fill.style.width = (f/ins.length*100)+'%';
  });
  if (focusIdx >= 0) syncFocusProg();
}

// ════════════════════════════════════
// STARS & STREAK
// ════════════════════════════════════
function updStars(w, t) {
  var p = t > 0 ? (t-w)/t : 0;
  var n = p===1?5:p>=.9?4:p>=.75?3:p>=.5?2:p>0?1:0;
  ['s1','s2','s3','s4','s5'].forEach((s,i) => {
    var el = g(s);
    el.classList.toggle('lit', i<n);
    el.style.animation = i<n ? `starPop .4s ease ${i*.1}s both` : '';
  });
}

function updStreak(passed) {
  if (passed) {
    streak++;
    if (streak > longestStreak) { longestStreak = streak; localStorage.setItem('longestStreak', longestStreak); }
    localStorage.setItem('streak', streak);
  } else { streak = 0; localStorage.setItem('streak', '0'); }

  var bar = g('streakBar');
  if (streak > 0) {
    bar.style.display = 'block';
    bar.innerHTML = '🔥 Streak: <span class="streak-count">'+streak+'</span> passing session'+(streak>1?'s':'')+' in a row! &nbsp;|&nbsp; 🏅 Best: <span class="streak-count">'+longestStreak+'</span>';
    if (streak % 5 === 0) SFX.streak();
  } else {
    bar.style.display = 'block';
    bar.innerHTML = '💔 Streak reset. &nbsp;|&nbsp; 🏅 Best: <span class="streak-count">'+longestStreak+'</span>';
  }
  var cs = g('cgStreak');
  if (cs) { cs.innerHTML = streak > 0 ? '🔥 '+streak+' passing session'+(streak>1?'s':'')+' in a row! &nbsp; 🏅 Best: '+longestStreak : '🏅 Best streak: '+longestStreak; }
  var rs = g('readyStreak');
  if (rs) {
    if (streak > 0) rs.innerHTML = '🔥 Current streak: <strong>'+streak+'</strong> session'+(streak>1?'s':'')+' &nbsp;|&nbsp; 🏅 Best: <strong>'+longestStreak+'</strong>';
    else if (longestStreak > 0) rs.innerHTML = '🏅 Best streak: <strong>'+longestStreak+'</strong> — can you beat it?';
    else rs.innerHTML = '🌟 No streak yet — go for it!';
  }
}

function updCheat() {
  var b = g('cheatBadge'), parts = [];
  if (autoFill > 0) parts.push('🤖 Auto-fill: '+autoFill+'x');
  if (cheatChk > 1) parts.push('⚠️ Check: '+cheatChk+'x');
  if (parts.length) { b.style.display = 'block'; b.textContent = parts.join(' · '); }
}

// ════════════════════════════════════
// CONFETTI
// ════════════════════════════════════
function launchConfetti() {
  var cv = g('confetti'), ctx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight;
  var ps = Array.from({length:120}, () => ({
    x: Math.random()*cv.width, y: Math.random()*cv.height-cv.height,
    w: ri(8,16), h: ri(6,12),
    color: ['#667eea','#f093fb','#43e97b','#fa709a','#fee140','#4facfe'][ri(0,5)],
    vx: (Math.random()-.5)*3, vy: Math.random()*4+2,
    a: Math.random()*360, va: (Math.random()-.5)*6
  }));
  var fr = 0;
  function draw() {
    ctx.clearRect(0,0,cv.width,cv.height);
    ps.forEach(p => {
      ctx.save(); ctx.translate(p.x+p.w/2, p.y+p.h/2); ctx.rotate(p.a*Math.PI/180);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      p.x+=p.vx; p.y+=p.vy; p.a+=p.va;
    });
    if (++fr < 140) requestAnimationFrame(draw); else ctx.clearRect(0,0,cv.width,cv.height);
  }
  draw();
}

// ════════════════════════════════════
// PIN
// ════════════════════════════════════
function openPin(cb) {
  pinCb = cb;
  var i = g('pinInp'); i.value=''; i.classList.remove('shake'); g('pinErr').textContent='';
  g('pinOv').classList.add('on'); SFX.open(); setTimeout(() => i.focus(), 100);
}
function closePin() { g('pinOv').classList.remove('on'); SFX.close(); pinCb = null; }
function submitPin() {
  var i = g('pinInp');
  if (i.value === CFG.pin) { var cb=pinCb; closePin(); if(cb) cb(); }
  else { g('pinErr').textContent='Incorrect PIN. Try again.'; i.classList.add('shake'); setTimeout(() => { i.classList.remove('shake'); i.value=''; i.focus(); }, 350); }
}
function openIpin() {
  var i=g('ipinInp'); i.value=''; i.classList.remove('shake'); g('ipinErr').textContent='';
  g('ipinOv').classList.add('on'); setTimeout(() => i.focus(), 100);
}
function closeIpin() { g('ipinOv').classList.remove('on'); }
function submitIpin() {
  var i=g('ipinInp');
  if (i.value===CFG.pin) { closeIpin(); showCorr=true; g('tsw').classList.add('on'); g('tswLbl').textContent='Hide correct answers'; document.querySelectorAll('.wic').forEach(el=>el.style.display='inline'); }
  else { g('ipinErr').textContent='Incorrect PIN. Try again.'; i.classList.add('shake'); setTimeout(()=>{i.classList.remove('shake');i.value='';i.focus();},350); }
}
function togCorrect() {
  if (!showCorr) openIpin();
  else { showCorr=false; g('tsw').classList.remove('on'); g('tswLbl').textContent='Show correct answers'; document.querySelectorAll('.wic').forEach(el=>el.style.display='none'); }
}

// ════════════════════════════════════
// WRONG MODAL
// ════════════════════════════════════
function closeWrong() { g('wrongOv').classList.remove('on'); SFX.close(); }
function showWrong(list) {
  wrongList=list; showCorr=false; g('tsw').classList.remove('on'); g('tswLbl').textContent='Show correct answers'; g('ipinOv').classList.remove('on');
  g('wmTitle').textContent = list.length+' incorrect answer'+(list.length>1?'s':'');
  var fe=g('wmFail');
  if (list.length>=CFG.fail) { fe.innerHTML='❌ FAILED · '+randMsg(FAIL_MSGS,CFG.failmsg); fe.className='wm-fail'; }
  else { fe.innerHTML=''; fe.className=''; }
  renderWrong(Math.min(list.length,5)); g('wrongOv').classList.add('on'); SFX.open();
}
function renderWrong(count) {
  var el=g('wmList'); el.innerHTML='';
  wrongList.slice(0,count).forEach((w,i) => {
    var d=document.createElement('div'); d.className='wi';
    d.innerHTML='<span class="winum">'+(i+1)+'</span><span class="wiq">'+w.q+' =</span><span class="wiy">'+fmt(w.yours)+'</span><span class="wic">✓ '+fmt(w.correct)+'</span>';
    el.appendChild(d);
  });
  el.querySelectorAll('.wic').forEach(e=>e.style.display=showCorr?'inline':'none');
  if (wrongList.length>5&&count<=5) {
    var btn=document.createElement('button'); btn.className='sm-btn';
    btn.textContent='... show '+(wrongList.length-5)+' more';
    btn.onclick=()=>renderWrong(wrongList.length); el.appendChild(btn);
  }
}

// ════════════════════════════════════
// RESET / CONFIRM
// ════════════════════════════════════
function resetAll() {
  allQ.forEach(q => { q.inp.value=''; q.inp.className='qi'; q.icon.textContent=''; });
  document.querySelectorAll('.cpf,.focus-cpf').forEach(f => f.style.width='0%');
  document.querySelectorAll('.col-review').forEach(r => { r.classList.remove('checked','ready'); r.querySelector('.col-rev-box').textContent=''; });
  document.querySelectorAll('.col-card').forEach(c => c.classList.remove('reviewed'));
  reviewedCols=new Set(); updRevProg();
  g('streakBar').style.display='none';
  g('resultBadge').style.display='none'; g('rbScore').textContent='';
  g('chkCtr').style.display='none'; updStars(1,1);
  if (focusIdx>=0) syncFocusReview();
}
function showCfm(t,m,cb) { g('cfmTitle').textContent=t; g('cfmMsg').textContent=m; g('cfmOk').onclick=()=>{closeCfm();cb();}; g('cfmOv').classList.add('on'); }
function closeCfm() { g('cfmOv').classList.remove('on'); }

// ════════════════════════════════════
// CHECK
// ════════════════════════════════════
function doCheck() {
  if (timedOut) allQ.forEach(q => { q.inp.disabled=false; q.inp.style.cursor=''; });
  var filled = allQ.filter(q=>q.inp.value.trim()!=='');
  var empty  = allQ.filter(q=>!q.inp.value.trim());
  if (filled.length===0) {
    g('cfmOk').textContent='OK'; g('cfmOk').style.background='var(--pri)';
    showCfm('No Answers Yet!','Please fill in your answers before checking.',()=>{}); return;
  }
  if (empty.length>0) {
    g('cfmOk').textContent='Check anyway'; g('cfmOk').style.background='var(--org)';
    showCfm(empty.length+' question'+(empty.length>1?'s':'')+' unanswered','You left '+empty.length+' answer'+(empty.length>1?'s':'')+' empty. Check anyway?',()=>{g('cfmOk').textContent='Yes';g('cfmOk').style.background='';runCheck();});
    empty.forEach(q=>{q.inp.style.borderColor='var(--org)';q.inp.style.background='rgba(237,137,54,.15)';});
    setTimeout(()=>empty.forEach(q=>{q.inp.style.borderColor='';q.inp.style.background='';}),3000);
    return;
  }
  runCheck();
}
function runCheck() {
  if (timedOut) allQ.forEach(q=>{q.inp.disabled=false;q.inp.style.cursor='';});
  chkCount++; cheatChk++; if(cheatChk>1) updCheat();
  var correct=0, total=0, wrong=[];
  allQ.forEach(q => {
    if (!q.inp.value) { q.inp.className='qi'; q.icon.textContent=''; return; }
    total++;
    var val = parseFloat(q.inp.value.replace(/,/g,''));
    if (val===q.ans) { q.inp.className='qi correct'; q.icon.textContent='✅'; correct++; SFX.correct(); }
    else { q.inp.className='qi wrong'; q.icon.textContent='❌'; wrong.push({q:q.lbl,yours:val,correct:q.ans}); SFX.wrong(); }
  });
  if (timedOut) allQ.forEach(q=>{q.inp.disabled=true;q.inp.style.cursor='not-allowed';});
  g('chkCtr').style.display='block'; g('chkCtr').textContent='Checked '+chkCount+' time'+(chkCount>1?'s':'');
  var sc = total>0 ? Math.round(correct/total*100) : 0;
  g('rbScore').textContent='🏆 '+correct+' / '+total+' — Score: '+sc;
  g('resultBadge').style.display='block';
  updStars(wrong.length, total);
  if (total>0 && wrong.length===0) {
    if (!sessionPassed) { sessionPassed=true; updStreak(true); }
    SFX.fanfare(); g('cgTitle').textContent='Perfect Score!'; g('cgSub').textContent='Congratulations, '+CFG.name+'! '+randMsg(PASS_MSGS,CFG.passmsg);
    g('cgStars').textContent='⭐⭐⭐⭐⭐'; g('cgScore').textContent='✅ '+correct+' / '+total+' — Score: 100';
    g('cgOv').classList.add('on'); launchConfetti();
  } else if (wrong.length>0 && wrong.length<=CFG.pass) {
    if (!sessionPassed) { sessionPassed=true; updStreak(true); }
    SFX.fanfare(); g('cgTitle').textContent='Well Done, '+CFG.name+'!'; g('cgSub').textContent=randMsg(PASS_MSGS,CFG.passmsg);
    g('cgStars').textContent='⭐⭐⭐⭐'; g('cgScore').textContent='✅ '+correct+' / '+total+' — Score: '+sc;
    g('cgOv').classList.add('on'); launchConfetti();
  } else if (wrong.length>0) { if(!sessionPassed) updStreak(false); showWrong(wrong); }
}

// ════════════════════════════════════
// TEST FILL (Dev Tools)
// ════════════════════════════════════
function testFill(mode) {
  if (mode==='empty') {
    allQ.forEach(q=>{q.inp.value='';q.inp.className='qi';q.icon.textContent='';});
    updColProg(); colData.forEach((cd,idx)=>refreshColReview(cd.cardEl,idx)); return;
  }
  autoFill++; updCheat();
  var wi=[];
  if (mode==='one-wrong')  wi=[Math.floor(Math.random()*allQ.length)];
  if (mode==='two-wrong')  { var ii=Math.floor(Math.random()*(allQ.length-1)); wi=[ii,ii+1]; }
  if (mode==='half-wrong') wi=allQ.map((_,i)=>i).filter(i=>i%2===0);
  if (mode==='all-wrong')  wi=allQ.map((_,i)=>i);
  allQ.forEach((q,i)=>{q.inp.value=fmt(wi.indexOf(i)>=0?q.ans+1:q.ans);q.inp.className='qi';q.icon.textContent='';});
  updColProg(); colData.forEach((cd,idx)=>refreshColReview(cd.cardEl,idx));
}