// ============================================
// CALCULATOR — Fantasy Portfolio
// ============================================

// --- State ---
let currentValue = '0';
let previousValue = '';
let currentOperator = null;
let shouldResetDisplay = false;

// --- DOM ---
const display = document.getElementById('calc-display');
const expression = document.getElementById('calc-expression');

// --- Audio (matching portfolio 8-bit style) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSfx(freq, type = 'square', duration = 0.08, vol = 0.03) {
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

// --- Hover/click SFX ---
document.querySelectorAll('.calc-btn, .nav-links a').forEach(el => {
    el.addEventListener('mouseenter', () => playSfx(600, 'square', 0.04, 0.015));
    el.addEventListener('mousedown', () => playSfx(400, 'sawtooth', 0.08, 0.03));
});

// --- Display punch animation ---
function punchDisplay() {
    display.classList.add('punch');
    setTimeout(() => display.classList.remove('punch'), 80);
}

// --- Format number for display ---
function formatDisplay(val) {
    if (val === 'Error') return 'Error';
    const num = parseFloat(val);
    if (isNaN(num)) return '0';

    // If it has a decimal point being typed, preserve it
    if (val.includes('.') && val.endsWith('.')) return val;
    if (val.includes('.') && val.endsWith('0') && val.indexOf('.') !== -1) {
        // Preserve trailing zeros during input
        const parts = val.split('.');
        if (parts[1] && /0+$/.test(parts[1]) && !shouldResetDisplay) return val;
    }

    // For very large/small numbers use exponential
    if (Math.abs(num) >= 1e12 || (Math.abs(num) < 1e-8 && num !== 0)) {
        return num.toExponential(4);
    }

    // Limit decimal places to prevent overflow
    const str = val.toString();
    if (str.length > 12) {
        return parseFloat(num.toPrecision(10)).toString();
    }

    return val;
}

function updateDisplay() {
    display.textContent = formatDisplay(currentValue);
}

// --- Digit Input ---
function calcDigit(digit) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playSfx(520 + Math.random() * 80, 'square', 0.06, 0.025);
    punchDisplay();

    if (shouldResetDisplay || currentValue === '0') {
        currentValue = digit;
        shouldResetDisplay = false;
    } else {
        if (currentValue.replace('.', '').replace('-', '').length >= 12) return;
        currentValue += digit;
    }

    clearActiveOp();
    updateDisplay();
}

// --- Decimal ---
function calcDecimal() {
    playSfx(440, 'square', 0.06, 0.02);
    punchDisplay();

    if (shouldResetDisplay) {
        currentValue = '0.';
        shouldResetDisplay = false;
    } else if (!currentValue.includes('.')) {
        currentValue += '.';
    }
    updateDisplay();
}

// --- Operator ---
function calcOp(op) {
    playSfx(350, 'triangle', 0.1, 0.03);
    punchDisplay();

    if (currentOperator && !shouldResetDisplay) {
        calcEquals();
    }

    previousValue = currentValue;
    currentOperator = op;
    shouldResetDisplay = true;

    // Update expression display
    const opSymbol = { '/': '÷', '*': '×', '-': '−', '+': '+' }[op];
    expression.textContent = `${formatDisplay(previousValue)} ${opSymbol}`;

    // Highlight active operator
    clearActiveOp();
    const opBtnMap = { '/': 'btn-divide', '*': 'btn-multiply', '-': 'btn-subtract', '+': 'btn-add' };
    const btn = document.getElementById(opBtnMap[op]);
    if (btn) btn.classList.add('active-op');
}

function clearActiveOp() {
    document.querySelectorAll('.calc-op').forEach(b => b.classList.remove('active-op'));
}

// --- Equals ---
function calcEquals() {
    if (!currentOperator || !previousValue) return;

    playSfx(660, 'square', 0.12, 0.04);

    const prev = parseFloat(previousValue);
    const curr = parseFloat(currentValue);
    let result;

    switch (currentOperator) {
        case '+': result = prev + curr; break;
        case '-': result = prev - curr; break;
        case '*': result = prev * curr; break;
        case '/':
            if (curr === 0) {
                currentValue = 'Error';
                expression.textContent = '';
                currentOperator = null;
                previousValue = '';
                shouldResetDisplay = true;
                updateDisplay();
                // Shake animation
                const wrap = document.querySelector('.calc-display-wrap');
                wrap.classList.add('error');
                setTimeout(() => wrap.classList.remove('error'), 400);
                playSfx(150, 'sawtooth', 0.3, 0.05);
                return;
            }
            result = prev / curr;
            break;
    }

    // Flash animation
    const wrap = document.querySelector('.calc-display-wrap');
    wrap.classList.add('flash');
    setTimeout(() => wrap.classList.remove('flash'), 300);

    // Update expression
    const opSymbol = { '/': '÷', '*': '×', '-': '−', '+': '+' }[currentOperator];
    expression.textContent = `${formatDisplay(previousValue)} ${opSymbol} ${formatDisplay(currentValue)} =`;

    currentValue = result.toString();
    currentOperator = null;
    previousValue = '';
    shouldResetDisplay = true;

    clearActiveOp();
    updateDisplay();
}

// --- Clear ---
function calcClear() {
    playSfx(200, 'triangle', 0.15, 0.03);
    punchDisplay();

    currentValue = '0';
    previousValue = '';
    currentOperator = null;
    shouldResetDisplay = false;
    expression.textContent = '\u00A0';

    clearActiveOp();
    updateDisplay();
}

// --- Sign Toggle ---
function calcSign() {
    playSfx(300, 'triangle', 0.08, 0.02);
    punchDisplay();

    if (currentValue === '0' || currentValue === 'Error') return;

    if (currentValue.startsWith('-')) {
        currentValue = currentValue.slice(1);
    } else {
        currentValue = '-' + currentValue;
    }
    updateDisplay();
}

// --- Percent ---
function calcPercent() {
    playSfx(380, 'triangle', 0.08, 0.02);
    punchDisplay();

    if (currentValue === 'Error') return;
    const num = parseFloat(currentValue);
    currentValue = (num / 100).toString();
    updateDisplay();
}

// --- Keyboard Support ---
document.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') {
        calcDigit(e.key);
        e.preventDefault();
    } else if (e.key === '.') {
        calcDecimal();
        e.preventDefault();
    } else if (e.key === '+') {
        calcOp('+');
        e.preventDefault();
    } else if (e.key === '-') {
        calcOp('-');
        e.preventDefault();
    } else if (e.key === '*') {
        calcOp('*');
        e.preventDefault();
    } else if (e.key === '/') {
        calcOp('/');
        e.preventDefault();
    } else if (e.key === 'Enter' || e.key === '=') {
        calcEquals();
        e.preventDefault();
    } else if (e.key === 'Escape' || e.key === 'Delete') {
        calcClear();
        e.preventDefault();
    } else if (e.key === 'Backspace') {
        e.preventDefault();
        playSfx(250, 'triangle', 0.08, 0.02);
        punchDisplay();
        if (currentValue.length > 1 && currentValue !== 'Error') {
            currentValue = currentValue.slice(0, -1);
            if (currentValue === '-') currentValue = '0';
        } else {
            currentValue = '0';
        }
        updateDisplay();
    } else if (e.key === '%') {
        calcPercent();
        e.preventDefault();
    }
});
