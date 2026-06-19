// ============================================
// SHARED MUSIC — Fantasy Portfolio
// Loaded on all pages for consistent BGM toggle
// ============================================

const musicCtx = new (window.AudioContext || window.webkitAudioContext)();

let isPlayingBgm = false;
let bgmInterval;
const bgmNotes = [
    329.6, 261.6, 329.6, 392.0, 261.6, 196.0, 261.6, 329.6,
    349.2, 329.6, 293.6, 261.6, 293.6, 392.0, 349.2, 293.6
];

function playBgmNote(freq, type = 'square', duration = 0.15, vol = 0.03) {
    if (musicCtx.state === 'suspended') return;
    const osc = musicCtx.createOscillator();
    const gain = musicCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, musicCtx.currentTime);
    gain.gain.setValueAtTime(vol, musicCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, musicCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(musicCtx.destination);
    osc.start();
    osc.stop(musicCtx.currentTime + duration);
}

function toggleBGM() {
    if (musicCtx.state === 'suspended') musicCtx.resume();

    const btn = document.getElementById('music-btn');
    if (isPlayingBgm) {
        clearInterval(bgmInterval);
        isPlayingBgm = false;
        btn.innerText = '🎵 MUSIC: OFF';
        btn.style.background = 'var(--accent)';
    } else {
        let step = 0;
        bgmInterval = setInterval(() => {
            playBgmNote(bgmNotes[step % bgmNotes.length]);
            step++;
        }, 200);
        isPlayingBgm = true;
        btn.innerText = '🎵 MUSIC: ON';
        btn.style.background = 'var(--grass)';
    }
}
