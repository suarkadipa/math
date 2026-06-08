'use strict';


// ── Default config ──
const DEF = {
  name: 'Tugus', welcome: '', timer: 23, pm: 5, digits: 7,
  bm: 3, bd: 3, pass: 2, fail: 3, passmsg: '', failmsg: '',
  theme: 'dark', anim: -1, pin: '0436', float: true, sound: true, tts: true, focusskip: true, focusarrows: false, focusTimer: true,
  failstreaklimit: 3, cooldowndays: 2
};

function loadCfg() {
  try {
    var s = JSON.parse(localStorage.getItem('mc') || '{}');
    if (s.welcome === 'Are you ready to show your math skills?') s.welcome = '';
    return Object.assign({}, DEF, s);
  } catch(e) { return Object.assign({}, DEF); }
}
function saveCfg() { localStorage.setItem('mc', JSON.stringify(CFG)); }

var CFG = loadCfg();

const CD_KEY = 'mcCooldownState';
function loadCooldownState() {
  try {
    var s = JSON.parse(localStorage.getItem(CD_KEY) || '{}');
    var until = Math.max(0, parseInt(s.cooldownUntil) || 0);
    var startedAt = Math.max(0, parseInt(s.cooldownStartedAt) || 0);
    if (until > 0 && !startedAt) startedAt = until - (DEF.cooldowndays * 24 * 60 * 60 * 1000);
    return {
      failStreak: Math.max(0, parseInt(s.failStreak) || 0),
      cooldownUntil: until,
      cooldownStartedAt: startedAt
    };
  } catch (e) {
    return { failStreak: 0, cooldownUntil: 0, cooldownStartedAt: 0 };
  }
}
function saveCooldownState() { localStorage.setItem(CD_KEY, JSON.stringify(CD)); }
var CD = loadCooldownState();

// ── Shared quiz state ──
var allQ      = [];   // {ans, inp, icon, lbl, colIdx}
var colData   = [];   // {title, qs, cardEl, colIdx, colorClass, wide}
var reviewedCols = new Set();
var totalCols = 0;

// ── Session state ──
var chkCount     = 0;
var showCorr     = false;
var wrongList    = [];
var pinCb        = null;
var timerEnd     = 0;
var autoFill     = 0;
var cheatChk     = 0;
var isChecking      = false;
var sessionPassed = false;
var sessionFailRecorded = false;
var hasStarted    = false;
var timedOut     = false;
var TTOTAL       = CFG.timer * 60;

// ── Streak (persisted) ──
var streak        = parseInt(localStorage.getItem('streak') || '0');
var longestStreak = parseInt(localStorage.getItem('longestStreak') || '0');

const ACHIEVEMENTS = [
  { id: 'a1',  emoji: '🏆', name: 'First Win Hero', rule: 'Total pass count: 1', minAttempt: 1, maxAttempt: 1 },
  { id: 'a2',  emoji: '🥈', name: 'Second Win Champ', rule: 'Total pass count: 2', minAttempt: 2, maxAttempt: 2 },
  { id: 'a3',  emoji: '🥉', name: 'Third Win Fighter', rule: 'Total pass count: 3', minAttempt: 3, maxAttempt: 3 },
  { id: 'a4',  emoji: '💪', name: 'Never Give Up Star', rule: 'Total pass count: 4', minAttempt: 4, maxAttempt: 4 },
  { id: 'a5',  emoji: '🚀', name: 'Persistence Rocket', rule: 'Total pass count: 5', minAttempt: 5, maxAttempt: 5 },
  { id: 'a6',  emoji: '🔥', name: 'Comeback Legend', rule: 'Total pass count: 6-9', minAttempt: 6, maxAttempt: 9 },
  { id: 'a7',  emoji: '🌟', name: 'Double Digit Star', rule: 'Total pass count: 10-14', minAttempt: 10, maxAttempt: 14 },
  { id: 'a8',  emoji: '👑', name: 'Bronze Master', rule: 'Total pass count: 15-24', minAttempt: 15, maxAttempt: 24 },
  { id: 'a9',  emoji: '💎', name: 'Silver Master', rule: 'Total pass count: 25-34', minAttempt: 25, maxAttempt: 34 },
  { id: 'a10', emoji: '🔮', name: 'Gold Master', rule: 'Total pass count: 35-49', minAttempt: 35, maxAttempt: 49 },
  { id: 'a11', emoji: '🛡️', name: 'Grand Master', rule: 'Total pass count: 50-59', minAttempt: 50, maxAttempt: 59 },
  { id: 'a12', emoji: '⚡', name: 'Lightning Speed', rule: 'Total pass count: 60-69', minAttempt: 60, maxAttempt: 69 },
  { id: 'a13', emoji: '🌀', name: 'Math Storm', rule: 'Total pass count: 70-79', minAttempt: 70, maxAttempt: 79 },
  { id: 'a14', emoji: '☄️', name: 'Cosmic Genius', rule: 'Total pass count: 80-89', minAttempt: 80, maxAttempt: 89 },
  { id: 'a15', emoji: '🌌', name: 'Galaxy Conqueror', rule: 'Total pass count: 90-99', minAttempt: 90, maxAttempt: 99 },
  { id: 'a16', emoji: '👽', name: 'Alien Brain', rule: 'Total pass count: 100+', minAttempt: 100, maxAttempt: 99999 }
];

const ACH_KEY = 'mcAchievementState';
function loadAchievementState() {
  try {
    var s = JSON.parse(localStorage.getItem(ACH_KEY) || '{}');
    var unlocked = s.unlocked || {};
    var passChecks = Math.max(0, parseInt(s.passChecks) || 0);
    if (passChecks === 0) {
      var unlockedCount = Object.keys(unlocked).length;
      if (unlockedCount > 0) passChecks = unlockedCount;
    }
    ACHIEVEMENTS.forEach(function(a) {
      if (passChecks >= a.minAttempt) {
        unlocked[a.id] = true;
      }
    });
    return {
      unlocked: unlocked,
      history: Array.isArray(s.history) ? s.history.slice(0, 20) : [],
      passChecks: passChecks
    };
  } catch (e) {
    return { unlocked: {}, history: [], passChecks: 0 };
  }
}
function saveAchievementState() { localStorage.setItem(ACH_KEY, JSON.stringify(ACH)); }
var ACH = loadAchievementState();

// ── Helpers ──
const g   = id => document.getElementById(id);
const fmt = n  => Number(n).toLocaleString('en-US');
const ri  = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = a => a.sort(() => Math.random() - .5);
function rndDigits(d) {
  var mn = Math.pow(10, d - 1), mx = Math.pow(10, d) - 1;
  return mn + Math.floor(Math.random() * (mx - mn + 1));
}

// ── Message pools ──
const WELCOME_MSGS = [
  'Are you ready to show your math skills?',
  "Let's crush some numbers today! 💥",
  'Time to be a math superhero! 🦸',
  'Can you beat your best score today? 🏆',
  "Your brain is warmed up — let's go! 🧠",
  'Math adventure awaits you! 🗺️',
  "Show the world what you're made of! 🌟",
  'Every problem has a solution — find them all! 🔍',
  "Focus, breathe, and let's do this! 🎯",
  'Today is a great day to be awesome at math! ✨'
];
const PASS_MSGS = [
  'You passed, {n}! Great job, keep it up! 💪',
  "Awesome work, {n}! You're a math star! ⭐",
  "Well done, {n}! You're getting better every day! 📈",
  "Fantastic effort, {n}! You should be proud! 🥳",
  "You nailed it, {n}! Keep shining bright! ✨",
  "Super job, {n}! Math is your superpower! 🦸",
  "Brilliant, {n}! You're on fire today! 🔥",
  "Amazing, {n}! You make math look easy! 🎯",
  "Outstanding, {n}! Your hard work is paying off! 🏅",
  "You did it, {n}! Nothing can stop you now! 🚀"
];
const FAIL_MSGS = [
  "Don't give up, {n}! Every mistake makes you stronger! 💪",
  "Keep practicing, {n}! You can do better next time! 🚀",
  "Mistakes help us learn, {n} — try again! 🧠",
  "You're a math star in training, {n}! Keep going! ⭐",
  "Almost there, {n}! A little more practice and you'll ace it! 🎯",
  "Don't worry, {n}! Even math heroes make mistakes! 🦸",
  "Try again, {n}! You're smarter than you think! 💡",
  "Hard work beats talent, {n} — keep practicing! 🏋️",
  "Every champion was once a beginner, {n}! Keep at it! 🏆",
  "You got this, {n}! Believe in yourself and try again! 🌟"
];
function randMsg(pool, custom) {
  var all = custom ? pool.concat([custom]) : pool;
  return all[Math.floor(Math.random() * all.length)].replace(/{n}/g, CFG.name);
}
