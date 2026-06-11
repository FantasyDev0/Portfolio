        // --- Web Audio API Setup ---
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Sound effect function
        function playSfx(freq, type = 'square', duration = 0.1, vol = 0.05) {
            if (audioCtx.state === 'suspended') return;
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

        // Add hover effects to interactables
        document.querySelectorAll('a, .btn, .card').forEach(el => {
            el.addEventListener('mouseenter', () => playSfx(600, 'square', 0.05, 0.02)); // Hover blip
            el.addEventListener('mousedown', () => playSfx(400, 'sawtooth', 0.1, 0.05)); // Click blop
        });

        // BGM Logic
        let isPlayingBgm = false;
        let bgmInterval;
        const bgmNotes = [
            329.6, 261.6, 329.6, 392.0, 261.6, 196.0, 261.6, 329.6,
            349.2, 329.6, 293.6, 261.6, 293.6, 392.0, 349.2, 293.6
        ];

        function toggleBGM() {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            
            const btn = document.getElementById('music-btn');
            if (isPlayingBgm) {
                clearInterval(bgmInterval);
                isPlayingBgm = false;
                btn.innerText = '🎵 MUSIC: OFF';
                btn.style.background = 'var(--accent)';
            } else {
                let step = 0;
                bgmInterval = setInterval(() => {
                    playSfx(bgmNotes[step % bgmNotes.length], 'square', 0.15, 0.03);
                    step++;
                }, 200);
                isPlayingBgm = true;
                btn.innerText = '🎵 MUSIC: ON';
                btn.style.background = 'var(--grass)';
            }
        }

        // Auto-start music on first interaction (required by browsers)
        document.addEventListener('click', () => {
            if (!isPlayingBgm) {
                toggleBGM();
            }
        }, { once: true });

        // --- Throwable Blocks Logic ---
        let draggedBlock = null;
        let offsetX = 0;
        let offsetY = 0;
        let lastMouseX = 0;
        let lastMouseY = 0;
        let lastTimeDrag = 0;
        const blocksData = new Map();

        document.querySelectorAll('.deco-block').forEach(block => {
            blocksData.set(block, { vx: 0, vy: 0 });
            
            block.addEventListener('mousedown', (e) => {
                draggedBlock = block;
                const rect = block.getBoundingClientRect();
                const absLeft = rect.left + window.scrollX;
                const absTop = rect.top + window.scrollY;
                offsetX = e.pageX - absLeft;
                offsetY = e.pageY - absTop;
                
                block.style.cursor = 'grabbing';
                block.style.zIndex = '1000'; 
                
                const data = blocksData.get(block);
                data.vx = 0;
                data.vy = 0;
                
                lastMouseX = e.pageX;
                lastMouseY = e.pageY;
                lastTimeDrag = performance.now();
                e.preventDefault();
            });
        });

        document.addEventListener('mousemove', (e) => {
            createTrailBlock(e.clientX, e.clientY);
            
            if (draggedBlock) {
                const now = performance.now();
                const dt = Math.max(1, now - lastTimeDrag);
                const data = blocksData.get(draggedBlock);
                
                data.vx = ((e.pageX - lastMouseX) / dt) * 35;
                data.vy = ((e.pageY - lastMouseY) / dt) * 35;
                
                draggedBlock.style.left = (e.pageX - offsetX) + 'px';
                draggedBlock.style.top = (e.pageY - offsetY) + 'px';
                draggedBlock.style.bottom = 'auto';
                draggedBlock.style.right = 'auto';

                lastMouseX = e.pageX;
                lastMouseY = e.pageY;
                lastTimeDrag = now;
            }
        });

        document.addEventListener('mouseup', () => {
            if (draggedBlock) {
                draggedBlock.style.cursor = 'move';
                draggedBlock.style.zIndex = '10';
                draggedBlock = null;
            }
        });

        // Ensure blocks have inline absolute positions so physics math works
        document.querySelectorAll('.deco-block').forEach(block => {
            const rect = block.getBoundingClientRect();
            block.style.left = (rect.left + window.scrollX) + 'px';
            block.style.top = (rect.top + window.scrollY) + 'px';
            block.style.bottom = 'auto';
            block.style.right = 'auto';
        });

        function updatePhysics() {
            const friction = 0.98;
            const bounce = 0.8;
            const time = performance.now() * 0.002;

            document.querySelectorAll('.deco-block').forEach((block, index) => {
                if (block === draggedBlock) return;
                
                const data = blocksData.get(block);
                const isIdle = (Math.abs(data.vx) < 0.5 && Math.abs(data.vy) < 0.5);

                let currentLeft = parseFloat(block.style.left);
                let currentTop = parseFloat(block.style.top);

                if (isIdle) {
                    currentLeft += Math.cos(time * 0.8 + index) * 0.5;
                    currentTop += Math.sin(time + index * 2) * 0.5;
                } else {
                    currentLeft += data.vx;
                    currentTop += data.vy;

                    const maxW = document.documentElement.scrollWidth;
                    const maxH = document.documentElement.scrollHeight;
                    const rect = block.getBoundingClientRect(); 

                    if (currentLeft <= 0) {
                        currentLeft = 0;
                        data.vx *= -bounce;
                    } else if (currentLeft + rect.width >= maxW) {
                        currentLeft = maxW - rect.width;
                        data.vx *= -bounce;
                    }

                    if (currentTop <= 0) {
                        currentTop = 0;
                        data.vy *= -bounce;
                    } else if (currentTop + rect.height >= maxH) {
                        currentTop = maxH - rect.height;
                        data.vy *= -bounce;
                    }

                    data.vx *= friction;
                    data.vy *= friction;
                }

                block.style.left = currentLeft + 'px';
                block.style.top = currentTop + 'px';
            });
            requestAnimationFrame(updatePhysics);
        }
        requestAnimationFrame(updatePhysics);

        const colors = ['#FF0055', '#00E5FF', '#FFD500', '#00FF33'];
        let lastTime = 0;
        
        function createTrailBlock(x, y) {
            const now = Date.now();
            if (now - lastTime < 30) return; // Limit spawn rate
            lastTime = now;

            const block = document.createElement('div');
            block.style.position = 'fixed';
            block.style.left = (x - 6) + 'px';
            block.style.top = (y - 6) + 'px';
            block.style.width = '12px';
            block.style.height = '12px';
            block.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            block.style.border = '2px solid var(--black)';
            block.style.pointerEvents = 'none';
            block.style.zIndex = '9999';
            block.style.transition = 'all 0.6s cubic-bezier(0.1, 0.8, 0.3, 1)';
            
            document.body.appendChild(block);

            requestAnimationFrame(() => {
                // Force reflow
                void block.offsetWidth;
                block.style.transform = `translate(${(Math.random() - 0.5) * 50}px, ${(Math.random() - 0.5) * 50 + 20}px) scale(0) rotate(${Math.random() * 90}deg)`;
                block.style.opacity = '0';
            });

            setTimeout(() => block.remove(), 600);
        }
