'use strict';

/**
 * SUPER MAJZIE MO - GAME ENGINE
 * Final Cut Version - Optimized for iOS/Desktop
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- GAME STATE ---
let W, H;
let gameState = 'title'; 
let paused = false;
let frameCount = 0;
let score = 0;
const keys = {};
const enemies = [];
const effects = [];

// --- PLAYER OBJECT ---
const player = {
  x: 100,
  y: 0,
  w: 60,
  h: 100,
  vx: 0,
  vy: 0,
  speed: 5,
  health: 100,
  maxHealth: 100,
  grounded: false,
  attacking: false,
  attackType: null,
  attackFrame: 0,
  facing: 1 
};

// --- INITIALIZATION ---
function init() {
  resize();
  window.addEventListener('resize', resize);
  
  // Set initial player height based on screen
  player.y = H - 150;
  
  setupControls();
}

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  if (player.y > H - 150) player.y = H - 150;
}

// --- ENGINE LOOP ---
function gameLoop() {
  if (gameState !== 'playing' || paused) {
    if (paused) drawPauseScreen();
    requestAnimationFrame(gameLoop);
    return;
  }

  frameCount++;
  ctx.clearRect(0, 0, W, H);

  update();
  draw();

  requestAnimationFrame(gameLoop);
}

// --- UPDATE LOGIC ---
function update() {
  // Movement
  if (keys['ArrowLeft'] || keys['a']) {
    player.vx = -player.speed;
    player.facing = -1;
  } else if (keys['ArrowRight'] || keys['d']) {
    player.vx = player.speed;
    player.facing = 1;
  } else {
    player.vx *= 0.8;
  }
  player.x += player.vx;

  // Gravity
  player.vy += 0.8;
  player.y += player.vy;

  // Collision
  if (player.y > H - 150) {
    player.y = H - 150;
    player.vy = 0;
    player.grounded = true;
  }

  // Animation
  if (player.attacking) {
    player.attackFrame++;
    if (player.attackFrame > 15) {
      player.attacking = false;
      player.attackFrame = 0;
    }
  }

  // Bounds
  if (player.x < 0) player.x = 0;
  if (player.x > W - player.w) player.x = W - player.w;

  updateEnemies();
  updateEffects();
}

// --- RENDER ---
function draw() {
  // Floor
  ctx.fillStyle = '#222';
  ctx.fillRect(0, H - 50, W, 50);

  // Player
  ctx.save();
  ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
  ctx.scale(player.facing, 1);
  ctx.fillStyle = player.attacking ? '#FFD700' : '#00AAFF';
  ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);
  ctx.restore();

  drawEnemies();
  drawEffects();
  updateHUD();
}

function updateHUD() {
  const bar = document.getElementById('health-bar');
  if (bar) bar.style.width = player.health + '%';
  const scoreDisp = document.getElementById('score-display');
  if (scoreDisp) scoreDisp.innerText = `SCORE: ${score}`;
}

function drawPauseScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = '40px Russo One';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', W / 2, H / 2);
}

// --- ENTITIES ---
function updateEnemies() {
  if (frameCount % 120 === 0) {
    enemies.push({ x: W + 50, y: H - 150, w: 60, h: 100, health: 50, speed: 2 });
  }
  enemies.forEach((en, i) => {
    en.x -= en.speed;
    if (player.attacking && Math.abs(player.x - en.x) < 80) {
      en.health -= 5;
      effects.push({ x: en.x, y: en.y, life: 10 });
    }
    if (en.health <= 0 || en.x < -100) {
      enemies.splice(i, 1);
      if (en.health <= 0) score += 100;
    }
  });
}

function drawEnemies() {
  enemies.forEach(en => {
    ctx.fillStyle = '#FF4500';
    ctx.fillRect(en.x, en.y, en.w, en.h);
  });
}

function updateEffects() {
  effects.forEach((eff, i) => {
    eff.life--;
    if (eff.life <= 0) effects.splice(i, 1);
  });
}

function drawEffects() {
  effects.forEach(eff => {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(eff.x, eff.y, 20, 0, Math.PI * 2);
    ctx.fill();
  });
}

// --- CONTROLS ---
function setupControls() {
  const startBtn = document.getElementById('start-btn');
  
  const launch = (e) => {
    if (e) e.preventDefault();
    
    // Sync with CSS
    document.body.classList.add('playing');
    
    const ts = document.getElementById('title-screen');
    ts.style.opacity = '0';
    
    setTimeout(() => {
      ts.style.display = 'none';
      document.getElementById('hud').style.display = 'block';
      gameState = 'playing';
      gameLoop();
    }, 800);
  };

  if (startBtn) {
    startBtn.onclick = launch; // Standard fallback
    startBtn.addEventListener('touchstart', launch, { passive: false });
  }

  // Input Listeners
  window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key.toLowerCase() === 'p') paused = !paused;
    if (gameState === 'playing' && !paused) {
        if (e.key === ' ' || e.key === 'ArrowUp') {
            if (player.grounded) { player.vy = -16; player.grounded = false; }
        }
        if (e.key.toLowerCase() === 'z') player.attacking = true;
    }
  });
  window.addEventListener('keyup', e => keys[e.key] = false);

  document.querySelectorAll('#mobile-controls button').forEach(btn => {
    const key = btn.getAttribute('data-key');
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      keys[key] = true;
      if (gameState === 'playing' && !paused) {
        if (key === 'ArrowUp' && player.grounded) { player.vy = -16; player.grounded = false; }
        if (key.includes('Key')) player.attacking = true;
      }
    }, { passive: false });
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      keys[key] = false;
    }, { passive: false });
  });
}

// --- CRITICAL: Wait for browser to be ready ---
window.onload = () => {
  init();
  console.log("Super Majzie Mo Engine: Loaded");
};