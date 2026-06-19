// ============================================
// POMODORO TIMER — Fantasy Portfolio
// ============================================

// --- Config ---
const MODES = {
    work:  { duration: 25 * 60, label: 'FOCUS TIME',  color: 'var(--primary)'   },
    short: { duration: 5 * 60,  label: 'SHORT BREAK',  color: 'var(--secondary)' },
    long:  { duration: 15 * 60, label: 'LONG BREAK',   color: 'var(--grass)'     },
};

const RING_CIRCUMFERENCE = 2 * Math.PI * 120; // matches SVG r="120"

// --- State ---
let currentMode = 'work';
let timeLeft = MODES.work.duration;
let totalDuration = MODES.work.duration;
let isRunning = false;
let timerInterval = null;
let sessionsCompleted = 0;
let currentSessionDot = 0;   // 0-3 within a cycle
let totalFocusSeconds = 0;
let streak = 0;

// --- DOM ---
const timeDisplay = document.getElementById('pomo-time');
const labelDisplay = document.getElementById('pomo-label');
const ringProgress = document.getElementById('pomo-ring-progress');
const startBtn = document.getElementById('pomo-start');
const timerWrap = document.querySelector('.pomo-timer-wrap');
const container = document.querySelector('.pomo-container');
const dotsContainer = document.getElementById('pomo-dots');
const statCompleted = document.getElementById('stat-completed');
const statTotalTime = document.getElementById('stat-total-time');
const statStreak = document.getElementById('stat-streak');

// --- Audio (same Web Audio API style as main site) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSfx(freq, type = 'square', duration = 0.1, vol = 0.05) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playCompletionChime() {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
        setTimeout(() => playSfx(freq, 'square', 0.25, 0.04), i * 150);
    });
}

// --- Add hover/click SFX to buttons ---
document.querySelectorAll('.pomo-btn, .pomo-tab, .nav-links a').forEach(el => {
    el.addEventListener('mouseenter', () => playSfx(600, 'square', 0.05, 0.02));
    el.addEventListener('mousedown', () => playSfx(400, 'sawtooth', 0.1, 0.05));
});

// --- Tab Switching ---
document.querySelectorAll('.pomo-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        if (mode === currentMode && !isRunning) return;
        switchMode(mode);
    });
});

function switchMode(mode) {
    // Stop any running timer
    if (isRunning) {
        clearInterval(timerInterval);
        isRunning = false;
    }

    currentMode = mode;
    timeLeft = MODES[mode].duration;
    totalDuration = MODES[mode].duration;

    // Update tab styling
    document.querySelectorAll('.pomo-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.pomo-tab[data-mode="${mode}"]`).classList.add('active');

    // Update ring color
    ringProgress.style.stroke = MODES[mode].color;

    // Update UI
    updateDisplay();
    updateRing();
    updateStartButton();
    labelDisplay.textContent = MODES[mode].label;
    timerWrap.classList.remove('running');
}

// --- Timer Logic ---
function toggleTimer() {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    isRunning = true;
    updateStartButton();
    timerWrap.classList.add('running');

    timerInterval = setInterval(() => {
        timeLeft--;

        if (currentMode === 'work') {
            totalFocusSeconds++;
        }

        updateDisplay();
        updateRing();
        updateStats();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            timerWrap.classList.remove('running');
            onTimerComplete();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    timerWrap.classList.remove('running');
    updateStartButton();
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    timeLeft = MODES[currentMode].duration;
    totalDuration = MODES[currentMode].duration;
    timerWrap.classList.remove('running');
    updateDisplay();
    updateRing();
    updateStartButton();
    playSfx(200, 'triangle', 0.15, 0.03);
}

function onTimerComplete() {
    playCompletionChime();

    // Flash animation
    container.classList.add('flash');
    setTimeout(() => container.classList.remove('flash'), 1800);

    if (currentMode === 'work') {
        sessionsCompleted++;
        streak++;

        // Fill session dot
        const dots = dotsContainer.querySelectorAll('.pomo-dot');
        if (currentSessionDot < dots.length) {
            dots[currentSessionDot].classList.add('filled');
        }
        currentSessionDot++;

        updateStats();

        // After 4 sessions, long break + reset dots
        if (currentSessionDot >= 4) {
            setTimeout(() => {
                // Reset dots
                currentSessionDot = 0;
                dots.forEach(d => d.classList.remove('filled'));
                switchMode('long');
            }, 2000);
        } else {
            setTimeout(() => switchMode('short'), 2000);
        }
    } else {
        // Break complete — go back to work
        setTimeout(() => switchMode('work'), 2000);
    }

    // Browser notification
    if (Notification.permission === 'granted') {
        const msg = currentMode === 'work'
            ? '🎉 Session complete! Time for a break.'
            : '⚡ Break over! Back to work.';
        new Notification('Fantasy Pomodoro', { body: msg });
    }

    updateStartButton();
}

// --- UI Updates ---
function updateDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timeDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Update page title
    document.title = `${timeDisplay.textContent} — Fantasy Pomodoro`;
}

function updateRing() {
    const progress = timeLeft / totalDuration;
    const offset = RING_CIRCUMFERENCE * (1 - progress);
    ringProgress.style.strokeDashoffset = offset;
}

function updateStartButton() {
    if (isRunning) {
        startBtn.textContent = '⏸ PAUSE';
        startBtn.classList.add('running');
    } else {
        startBtn.textContent = timeLeft < totalDuration ? '▶ RESUME' : '▶ START';
        startBtn.classList.remove('running');
    }
}

function updateStats() {
    statCompleted.textContent = sessionsCompleted;
    const focusMins = Math.floor(totalFocusSeconds / 60);
    statTotalTime.textContent = focusMins >= 60
        ? `${Math.floor(focusMins / 60)}h ${focusMins % 60}m`
        : `${focusMins}m`;
    statStreak.textContent = streak;
}

// --- Init ---
function init() {
    // Set initial ring
    ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;
    ringProgress.style.strokeDashoffset = 0;

    updateDisplay();
    updateStats();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

init();
