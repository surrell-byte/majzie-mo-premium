'use strict';

/**
 * SUPER MAJZIE MO — GAME ENGINE
 * Premium Edition · Optimized for Sprite Rendering & Mobile Comfort
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- GAME STATE ---
let W, H;
let gameState = 'title'; // 'title', 'playing', 'paused', 'dead'
let frameCount = 0;
let score = 0;
let level = 1;
const keys = {};
const enemies = [];
const effects = [];

// --- SPRITE LOADING ---
const sheet1 = new Image();
sheet1.src = 'majzie_sprites.jpeg';
const sheet2 = new Image();
sheet2.src = '9cb61436-419b-4378-9571-04192d77d730.jpeg';

// --- PLAYER OBJECT ---
const player = {
    x: 100, y: 0, w: 70, h: 110,
    vx: 0, vy: 0,
    speed: 5.5,
    health: 100,
    grounded: false,
    attacking: false,
    attackFrame: 0,
    facing: 1, // 1: Right, -1: Left
    animFrame: 0
};

// --- INITIALIZATION ---
function init() {
    resize();
    window.addEventListener('resize', resize);
    setupControls();
}

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    player.y = H - 160;
}

// --- CORE LOOP ---
function gameLoop() {
    if (gameState !== 'playing') {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    frameCount++;
    ctx.clearRect(0, 0, W, H);

    update();
    draw();

    requestAnimationFrame(gameLoop);
}

// --- LOGIC ---
function update() {
    // Movement
    if (keys['ArrowLeft']) { player.vx = -player.speed; player.facing = -1; }
    else if (keys['ArrowRight']) { player.vx = player.speed; player.facing = 1; }
    else { player.vx *= 0.8; }
    
    player.x += player.vx;
    player.vy += 0.85; // Gravity
    player.y += player.vy;

    // Floor Collision
    if (player.y > H - 160) {
        player.y = H - 160;
        player.vy = 0;
        player.grounded = true;
    }

    // Animation Ticker
    if (Math.abs(player.vx) > 0.1) {
        player.animFrame = Math.floor(frameCount / 6) % 4;
    } else {
        player.animFrame = 0;
    }

    // Attack Logic
    if (player.attacking) {
        player.attackFrame++;
        if (player.attackFrame > 12) {
            player.attacking = false;
            player.attackFrame = 0;
        }
    }

    updateEnemies();
}

// --- RENDERING ---
function draw() {
    // Simple Ground
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, H - 60, W, 60);

    drawPlayer();
    
    enemies.forEach(en => drawEnemy(en));
    updateHUD();
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
    ctx.scale(player.facing, 1);

    if (sheet1.complete && sheet1.naturalWidth !== 0) {
        // Source coordinates from your sprite sheet
        let sx = player.attacking ? 150 : (player.animFrame * 50);
        let sy = 0;
        ctx.drawImage(sheet1, sx, sy, 50, 80, -player.w/2, -player.h/2, player.w, player.h);
    } else {
        // Fallback Box if image fails
        ctx.fillStyle = player.attacking ? 'gold' : '#0099ff';
        ctx.fillRect(-player.w/2, -player.h/2, player.w, player.h);
    }
    ctx.restore();
}

function drawEnemy(en) {
    ctx.fillStyle = '#ff4400';
    if (sheet1.complete) {
        ctx.drawImage(sheet1, 0, 100, 50, 80, en.x, en.y, en.w, en.h);
    } else {
        ctx.fillRect(en.x, en.y, en.w, en.h);
    }
}

function updateHUD() {
    const hb = document.getElementById('health-bar');
    if (hb) hb.style.width = player.health + '%';
    const sd = document.getElementById('score-display');
    if (sd) sd.innerText = `SCORE: ${score}`;
}

// --- ENEMIES ---
function updateEnemies() {
    if (frameCount % 100 === 0) {
        enemies.push({ x: W + 50, y: H - 160, w: 70, h: 110, health: 40, speed: 2 + Math.random() });
    }
    enemies.forEach((en, i) => {
        en.x -= en.speed;
        // Hit detection
        if (player.attacking && Math.abs((player.x + player.w/2) - (en.x + en.w/2)) < 90) {
            en.health -= 10;
        }
        if (en.health <= 0 || en.x < -100) {
            enemies.splice(i, 1);
            if (en.health <= 0) score += 50;
        }
    });
}

// --- CONTROLS ---
function setupControls() {
    const startBtn = document.getElementById('start-btn');
    const launch = (e) => {
        if (e) e.preventDefault();
        gameState = 'playing';
        document.body.classList.add('playing');
        document.getElementById('title-screen').style.display = 'none';
        document.getElementById('hud').style.display = 'block';
        gameLoop();
    };

    if (startBtn) {
        startBtn.onclick = launch;
        startBtn.addEventListener('touchstart', launch, { passive: false });
    }

    // Mobile Buttons
    document.querySelectorAll('.ctrl-btn').forEach(btn => {
        const key = btn.getAttribute('data-key');
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys[key] = true;
            if (key === 'ArrowUp' && player.grounded) {
                player.vy = -17;
                player.grounded = false;
            }
            if (key.includes('Key')) player.attacking = true;
        }, { passive: false });
        
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys[key] = false;
        }, { passive: false });
    });

    // Keyboard
    window.addEventListener('keydown', e => keys[e.key] = true);
    window.addEventListener('keyup', e => keys[e.key] = false);
}

window.onload = init;