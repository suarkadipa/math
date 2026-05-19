'use strict';

// ── Web Audio SFX ──
var SFX = (function () {
  var ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function play(freq, freq2, dur, vol, wave, delay) {
    if (!CFG.sound) return;
    try {
      var ac = getCtx(), osc = ac.createOscillator(), gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = wave || 'sine';
      var t = ac.currentTime + (delay || 0);
      osc.frequency.setValueAtTime(freq, t);
      if (freq2) osc.frequency.exponentialRampToValueAtTime(freq2, t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.05);
    } catch(e) {}
  }
  return {
    type:    () => play(600, 500, 0.04, 0.08),
    correct: () => { play(523,null,0.12,0.25); play(659,null,0.12,0.25,null,0.1); play(784,null,0.15,0.2,null,0.2); },
    wrong:   () => play(300, 150, 0.2, 0.25, 'sawtooth'),
    click:   () => play(800, 700, 0.06, 0.12),
    open:    () => play(300, 600, 0.15, 0.15, 'triangle'),
    close:   () => play(500, 400, 0.08, 0.12),
    fanfare: () => { [523,659,784,1047].forEach((f,i) => play(f,null,0.18,0.28,null,i*0.13)); },
    streak:  () => { play(400,null,0.08,0.2); play(600,null,0.08,0.2,null,0.08); play(800,null,0.1,0.2,null,0.16); },
    tick:    fast => play(fast ? 800 : 500, null, 0.05, 0.15, 'square'),
    bell:    () => { play(880,null,0.4,0.3); play(659,null,0.4,0.25,null,0.45); },
    launch:  () => play(400, 800, 0.3, 0.2, 'triangle'),
    review:  () => play(700, 900, 0.12, 0.2),
    speak: (title, sub) => {
      if (CFG.tts === false) return;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        var cleanTitle = (title || '').trim();
        var cleanSub = (sub || '').trim();
        if (CFG.name && cleanTitle && cleanSub) {
          var escName = CFG.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          var nameRegex = new RegExp('\\b' + escName + '\\b', 'gi');
          if (nameRegex.test(cleanTitle)) {
            cleanSub = cleanSub.replace(nameRegex, '')
                               .replace(/,\s*!/g, '!')
                               .replace(/,\s*\./g, '.')
                               .replace(/,\s*,/g, ',')
                               .replace(/\s+/g, ' ')
                               .trim();
            cleanSub = cleanSub.replace(/^[\s,;!.\-]+/, '').trim();
          }
        }
        var text = cleanTitle + '. ' + cleanSub;
        var clean = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
                        .replace(/❌/g, '')
                        .replace(/🏆/g, '')
                        .replace(/✅/g, '')
                        .replace(/⭐/g, '')
                        .trim();
        if (clean) {
          var u = new SpeechSynthesisUtterance(clean);
          u.lang = 'en-US';
          u.rate = 1.0;
          window.speechSynthesis.speak(u);
        }
      }
    }
  };
})();

// ── Splash Animations ──
var ANIMS = [
  // 0 — Emoji Rain
  {
    css: '.particle{position:absolute;pointer-events:none;font-size:1.6rem;animation:fallingParticle linear infinite;opacity:.85;z-index:1}@keyframes fallingParticle{0%{transform:translateY(-60px) rotate(0deg);opacity:0}10%{opacity:.9}90%{opacity:.8}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}',
    emojis: ['⭐','🌟','✨','💫','🎈','🎉','🎊','🌈','🍭','🎯','🔢','➕','✖️','🎀','💥'],
    spawn(o) {
      var e = this.emojis;
      function mk() {
        if (!g('readyOv') || g('readyOv').style.display === 'none') return;
        var el = document.createElement('span'); el.className = 'particle';
        el.textContent = e[Math.floor(Math.random()*e.length)];
        el.style.left = Math.random()*100+'vw';
        el.style.fontSize = (1.2+Math.random()*1.5)+'rem';
        var d = 3.5+Math.random()*4;
        el.style.animationDuration = d+'s'; el.style.animationDelay = (Math.random()*1.5)+'s';
        o.appendChild(el); setTimeout(() => el.remove(), (d+2)*1000);
      }
      for (var i=0;i<20;i++) setTimeout(mk, i*160); setInterval(mk, 380);
    }
  },
  // 1 — Bubbles
  {
    css: '.particle{position:absolute;pointer-events:none;font-size:1.8rem;animation:bubbleUp linear infinite;opacity:0;z-index:1}@keyframes bubbleUp{0%{transform:translateY(110vh) scale(.5);opacity:0}10%{opacity:.9}90%{opacity:.7}100%{transform:translateY(-80px) scale(.8);opacity:0}}',
    emojis: ['🫧','🐠','🐟','🐙','🌊','🐬','⭐','🦀','🐡','💦','🌟'],
    spawn(o) {
      var e = this.emojis;
      function mk() {
        if (!g('readyOv') || g('readyOv').style.display === 'none') return;
        var el = document.createElement('span'); el.className = 'particle';
        el.textContent = e[Math.floor(Math.random()*e.length)];
        el.style.left = Math.random()*100+'vw';
        el.style.fontSize = (1.4+Math.random()*1.6)+'rem';
        var d = 4+Math.random()*5;
        el.style.animationDuration = d+'s'; el.style.animationDelay = (Math.random()*2)+'s';
        o.appendChild(el); setTimeout(() => el.remove(), (d+3)*1000);
      }
      for (var i=0;i<18;i++) setTimeout(mk, i*200); setInterval(mk, 420);
    }
  },
  // 2 — Star Burst
  {
    css: '.particle{position:absolute;pointer-events:none;font-size:1.5rem;z-index:1;opacity:0;left:50vw;top:50vh}',
    emojis: ['⭐','🌟','💛','✨','🌠','🌙','☀️','🪐','🚀','👾','🛸','💫'],
    spawn(o) {
      var e = this.emojis;
      function mk() {
        if (!g('readyOv') || g('readyOv').style.display === 'none') return;
        var el = document.createElement('span'); el.className = 'particle';
        el.textContent = e[Math.floor(Math.random()*e.length)];
        el.style.fontSize = (1.2+Math.random()*1.8)+'rem';
        var angle = Math.random()*360, dist = 120+Math.random()*300;
        var tx = Math.cos(angle*Math.PI/180)*dist, ty = Math.sin(angle*Math.PI/180)*dist;
        var d = 2+Math.random()*2.5;
        el.style.left='50vw'; el.style.top='50vh'; el.style.opacity='0';
        o.appendChild(el);
        requestAnimationFrame(() => {
          el.style.transition = `transform ${d}s ease-out,opacity ${d}s ease-out`;
          el.style.transform = `translate(${tx}px,${ty}px) scale(1)`; el.style.opacity='1';
          setTimeout(() => el.style.opacity='0', d*700);
        });
        setTimeout(() => el.remove(), (d+2)*1000);
      }
      for (var i=0;i<16;i++) setTimeout(mk, i*220); setInterval(mk, 350);
    }
  },
  // 3 — Animals
  {
    css: '.particle{position:absolute;pointer-events:none;font-size:2rem;animation:sideSlide ease-in-out infinite alternate;z-index:1}@keyframes sideSlide{0%{transform:translateX(-30px) rotate(-15deg) scale(.9)}100%{transform:translateX(30px) rotate(15deg) scale(1.1)}}',
    emojis: ['🐱','🐶','🐸','🐼','🐨','🦊','🐯','🐮','🐻','🦁','🐧','🦋','🐝','🐞'],
    spawn(o) {
      var e = this.emojis;
      for (var i=0;i<14;i++) {
        var el = document.createElement('span'); el.className='particle';
        el.textContent = e[i%e.length];
        el.style.left = (5+i*7)+'vw'; el.style.top = (8+Math.random()*80)+'vh';
        el.style.fontSize = (1.6+Math.random()*1.4)+'rem';
        el.style.animationDuration = (1.2+Math.random()*1.5)+'s';
        el.style.animationDelay = (Math.random()*1.5)+'s';
        o.appendChild(el);
      }
    }
  },
  // 4 — Confetti
  {
    css: '.particle{position:absolute;pointer-events:none;font-size:1.5rem;animation:confettiFall linear infinite;z-index:1;opacity:0}@keyframes confettiFall{0%{transform:translateY(-40px) rotate(0deg) scale(.6);opacity:0}15%{opacity:1}85%{opacity:.8}100%{transform:translateY(105vh) rotate(1080deg) scale(1);opacity:0}}',
    emojis: ['🎊','🎉','🎀','🎁','🎈','🎏','🎆','🎇','🧨','✨'],
    spawn(o) {
      var e = this.emojis;
      function mk() {
        if (!g('readyOv') || g('readyOv').style.display === 'none') return;
        var el = document.createElement('span'); el.className='particle';
        el.textContent = e[Math.floor(Math.random()*e.length)];
        el.style.left = Math.random()*105+'vw';
        el.style.fontSize = (1+Math.random()*1.5)+'rem';
        var d = 2.5+Math.random()*3.5;
        el.style.animationDuration = d+'s'; el.style.animationDelay = Math.random()+'s';
        o.appendChild(el); setTimeout(() => el.remove(), (d+2)*1000);
      }
      for (var i=0;i<24;i++) setTimeout(mk, i*100); setInterval(mk, 260);
    }
  },
  // 5 — Numbers
  {
    css: '.particle{position:absolute;pointer-events:none;font-size:1.8rem;animation:spinFloat ease-in-out infinite;z-index:1}@keyframes spinFloat{0%{transform:translateY(0) rotate(0deg) scale(1);opacity:.7}25%{transform:translateY(-30px) rotate(90deg) scale(1.2);opacity:1}50%{transform:translateY(10px) rotate(180deg) scale(.9);opacity:.8}75%{transform:translateY(-20px) rotate(270deg) scale(1.1);opacity:1}100%{transform:translateY(0) rotate(360deg) scale(1);opacity:.7}}',
    emojis: ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','0️⃣','➕','➖','✖️','➗','🟰','💯'],
    spawn(o) {
      var e = this.emojis;
      for (var i=0;i<16;i++) {
        var el = document.createElement('span'); el.className='particle';
        el.textContent = e[i%e.length];
        el.style.left = (3+Math.random()*94)+'vw'; el.style.top = (5+Math.random()*88)+'vh';
        el.style.fontSize = (1.4+Math.random()*1.2)+'rem';
        el.style.animationDuration = (2+Math.random()*3)+'s';
        el.style.animationDelay = (Math.random()*2)+'s';
        o.appendChild(el);
      }
    }
  },
  // 6 — Fruits
  {
    css: '.particle{position:absolute;pointer-events:none;font-size:1.8rem;animation:fruitDrop cubic-bezier(.25,.46,.45,.94) infinite;z-index:1;opacity:0}@keyframes fruitDrop{0%{transform:translateY(-50px) rotate(0deg);opacity:0}8%{opacity:1}80%{opacity:1}100%{transform:translateY(108vh) rotate(540deg);opacity:0}}',
    emojis: ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥝','🍉','🍌','🍍','🥭','🍦','🍩','🍪','🧁'],
    spawn(o) {
      var e = this.emojis;
      function mk() {
        if (!g('readyOv') || g('readyOv').style.display === 'none') return;
        var el = document.createElement('span'); el.className='particle';
        el.textContent = e[Math.floor(Math.random()*e.length)];
        el.style.left = Math.random()*100+'vw';
        el.style.fontSize = (1.5+Math.random()*1.5)+'rem';
        var d = 3+Math.random()*4;
        el.style.animationDuration = d+'s'; el.style.animationDelay = (Math.random()*1.5)+'s';
        o.appendChild(el); setTimeout(() => el.remove(), (d+2)*1000);
      }
      for (var i=0;i<18;i++) setTimeout(mk, i*170); setInterval(mk, 360);
    }
  }
];

function initSplashAnim() {
  var ai = CFG.anim === -1
    ? Math.floor(Math.random() * ANIMS.length)
    : Math.max(0, Math.min(ANIMS.length - 1, CFG.anim));
  var sEl = document.createElement('style');
  sEl.textContent = ANIMS[ai].css;
  document.head.appendChild(sEl);
  ANIMS[ai].spawn(g('readyOv'));
}