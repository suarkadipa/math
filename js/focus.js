'use strict';

// ── Focus Mode state ──
var focusIdx   = -1;
var focusFsSteps = [0.85, 1.0, 1.1, 1.25, 1.4, 1.6, 1.85, 2.1];
var focusFsIdx   = 3; // default 1.25×

function openFocus(colIdx) {
  focusIdx = colIdx;
  renderFocusCard(colIdx);
  g('focusBackdrop').classList.add('on');
  SFX.open();
  setTimeout(() => { var inp=g('focusBody').querySelector('.qi:not(:disabled)'); if(inp) inp.focus(); }, 200);
}

function closeFocus() {
  g('focusBackdrop').classList.remove('on');
  focusIdx = -1;
  SFX.close();
}

function getFocusFs() { return focusFsSteps[focusFsIdx] + 'rem'; }

function adjFocusFs(dir) {
  focusFsIdx = Math.max(0, Math.min(focusFsSteps.length-1, focusFsIdx+dir));
  var fs = focusFsSteps[focusFsIdx];
  g('focusFsLbl').textContent = fs + '×';
  g('focusBody').style.setProperty('--focus-fs', fs+'rem');
  g('focusBody').querySelectorAll('.ql').forEach(el => el.style.fontSize = fs+'rem');
  g('focusBody').querySelectorAll('.qi').forEach(el => el.style.fontSize = fs+'rem');
}

function renderFocusCard(colIdx) {
  var cd = colData[colIdx]; if (!cd) return;

  // Set header color class
  var hdr = g('focusHeader');
  hdr.className = 'focus-header ' + cd.colorClass;
  g('focusTitle').textContent = cd.title;

  // Build body — reuse the same input elements from allQ
  var body = g('focusBody');
  body.innerHTML = '';
  var fs = focusFsSteps[focusFsIdx];
  body.style.setProperty('--focus-fs', fs+'rem');

  var colQs = allQ.filter(q => q.colIdx === colIdx);
  colQs.forEach((q, qi) => {
    var row = document.createElement('div'); row.className = 'qr';
    var lbl = document.createElement('span');
    lbl.className = cd.wide ? 'ql wl' : 'ql';
    lbl.style.fontSize = fs + 'rem';
    lbl.innerHTML = '<span class="qn">'+(qi+1)+'</span>'+q.lbl+' =';
    q.inp.style.fontSize = fs + 'rem';
    var icon = document.createElement('span'); icon.className='ci'; icon.textContent = q.icon.textContent;
    row.appendChild(lbl); row.appendChild(q.inp); row.appendChild(icon);
    body.appendChild(row);
  });

  syncFocusProg();
  syncFocusReview();
  updFocusDots(colIdx);
  updFocusCounter(colIdx);
  g('focusFsLbl').textContent = focusFsSteps[focusFsIdx] + '×';
}

function syncFocusProg() {
  if (focusIdx < 0) return;
  var cd = colData[focusIdx]; if (!cd) return;
  var ins = cd.cardEl.querySelectorAll('.qi');
  var f = Array.from(ins).filter(i => i.value.trim() !== '').length;
  g('focusCpf').style.width = ins.length ? (f/ins.length*100)+'%' : '0%';
}

function syncFocusReview() {
  if (focusIdx < 0) return;
  var cd = colData[focusIdx]; if (!cd) return;
  var isReviewed = reviewedCols.has(focusIdx);
  var isFull = isColFull(cd.cardEl);
  var rev = g('focusReview');
  var box = g('focusRevBox');
  var lbl = g('focusRevLbl');
  rev.classList.toggle('ready', isFull);
  rev.classList.toggle('checked', isReviewed);
  box.textContent = isReviewed ? '✓' : '';
  lbl.textContent = isReviewed ? 'Reviewed ✓' : "I've reviewed all answers in this column";
  if (rev._listener) rev.removeEventListener('click', rev._listener);
  rev._listener = (function(idx) {
    return function() {
      var gridRev = colData[idx].cardEl.querySelector('.col-review');
      if (gridRev) toggleReview(idx, gridRev);
      if (CFG.focusskip !== false) {
        setTimeout(() => {
          var next = findNextUnreviewed(idx, 1);
          if (next === -1) showCfm('All columns reviewed! 🎉','Ready to check your answers?', () => openPin(doCheck));
          else focusNav(1);
        }, 400);
      }
    };
  })(focusIdx);
  rev.addEventListener('click', rev._listener);
  updFocusDots(focusIdx);
}

function updFocusDots(activeIdx) {
  var dots = g('focusDots'); dots.innerHTML = '';
  colData.forEach((cd, i) => {
    var dot = document.createElement('button'); dot.className = 'focus-dot';
    if (i === activeIdx) dot.classList.add('active');
    else if (reviewedCols.has(i)) dot.classList.add('done');
    dot.title = cd.title;
    dot.addEventListener('click', () => { restoreInputsToGrid(focusIdx); focusIdx=i; renderFocusCard(i); });
    dots.appendChild(dot);
  });
}

function updFocusCounter(colIdx) {
  var unreviewedCount = colData.filter((_,i) => !reviewedCols.has(i)).length;
  g('focusCounter').textContent = 'Card '+(colIdx+1)+' of '+colData.length+' · '+unreviewedCount+' remaining';
}

function findNextUnreviewed(fromIdx, dir) {
  var n = colData.length;
  for (var step=1; step<n; step++) {
    var idx = ((fromIdx + dir*step) % n + n) % n;
    if (!reviewedCols.has(idx)) return idx;
  }
  return -1;
}

function focusNav(dir) {
  if (focusIdx < 0) return;
  var next;
  if (CFG.focusskip !== false) {
    next = findNextUnreviewed(focusIdx, dir);
    if (next === -1) { showCfm('All columns reviewed! 🎉','Ready to check your answers?', () => openPin(doCheck)); return; }
  } else {
    var n = colData.length;
    next = ((focusIdx + dir) % n + n) % n;
  }
  restoreInputsToGrid(focusIdx);
  focusIdx = next;
  renderFocusCard(next);
  var inp = g('focusBody').querySelector('.qi:not(:disabled)'); if(inp) inp.focus();
}

function restoreInputsToGrid(colIdx) {
  var colQs = allQ.filter(q => q.colIdx === colIdx);
  var cd = colData[colIdx];
  var rows = Array.from(cd.cardEl.querySelectorAll('.qr'));
  colQs.forEach((q, i) => {
    if (rows[i]) {
      var icon = rows[i].querySelector('.ci'); if(icon) icon.textContent = q.icon.textContent;
      if (!rows[i].contains(q.inp)) {
        var oldInp = rows[i].querySelector('.qi');
        if (oldInp) rows[i].replaceChild(q.inp, oldInp);
        else rows[i].insertBefore(q.inp, rows[i].querySelector('.ci'));
      }
    }
  });
}