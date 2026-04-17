'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- GAME STATE ---
let W, H;
let gameState = 'title'; // title, playing, gameover
let paused = false;
let frameCount = 0;
let score = 0;
let bgScroll = 0;

// --- PLAYER SETTINGS ---
const player = {
  x: 100, y: 0, w: 60, h: 100,
  vx: 0, vy: 0,
  speed: 5,
  health: 100,
  maxHealth: 100,
  grounded: false,
  attacking: false,
  attackType: null,
  attackFrame: 0,
  facing: 1 // 1 for right, -1 for left
};

const keys = {};
const enemies = [];
const effects = [];
const enemiesPerLevel = 5;
let enemiesSpawned = 0;

// --- INITIALIZATION ---
function init() {
  resize();
  window.addEventListener('resize', resize);
  // Initial setup: Player starts on the floor
  player.y = H - player.h - 50;
}

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  
  // Safety: Reposition player if they are off screen after resize
  if (player.y > H) player.y = H - player.h - 50;
}

// --- CORE GAME ENGINE ---
function gameLoop() {
  if (gameState !== 'playing' || paused) {
    if (paused) drawPauseScreen();
    requestAnimationFrame(gameLoop);
    return;
  }

  frameCount++;
  ctx.clearRect(0, 0, W, H);

  // 1. Update
  updateBackground();
  updatePlayer();
  updateEnemies();
  updateEffects();

  // 2. Draw
  drawBackground();
  drawEnemies();
  drawPlayer();
  drawEffects();
  drawUI();

  requestAnimationFrame(gameLoop);
}

// --- LOGIC FUNCTIONS ---
function updatePlayer() {
  // Horizontal Movement
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

  // Jump & Gravity
  if (!player.grounded) {
    player.vy += 0.8; // Gravity
  }
  player.y += player.vy;

  // Floor Collision
  const floorY = H - 50;
  if (player.y + player.h > floorY) {
    player.y = floorY - player.h;
    player.vy = 0;
    player.grounded = true;
  }

  // Attack Animation Logic
  if (player.attacking) {
    player.attackFrame++;
    if (player.attackFrame > 20) {
      player.attacking = false;
      player.attackFrame = 0;
      player.attackType = null;
    }
  }

  // Bound player to screen
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > W) player.x = W - player.w;
}

function updateBackground() {
  if (Math.abs(player.vx) > 0.1) {
    bgScroll -= player.vx * 0.5;
  }
}

function spawnEnemy() {
  if (enemiesSpawned >= enemiesPerLevel) return;
  enemies.push({
    x: W + 50,
    y: H - 150,
    w: 60, h: 100,
    health: 50,
    speed: 2 + Math.random() * 2
  });
  enemiesSpawned++;
}

function updateEnemies() {
  if (frameCount % 120 === 0) spawnEnemy();

  enemies.forEach((en, index) => {
    // Basic AI: Move toward player
    const dist = player.x - en.x;
    en.x += Math.sign(dist) * en.speed;

    // Check if player hit enemy
    if (player.attacking && player.attackFrame === 10) {
      if (Math.abs(player.x - en.x) < 100 && Math.abs(player.y - en.y) < 50) {
        en.health -= 25;
        createHitEffect(en.x, en.y);
      }
    }

    if (en.health <= 0) {
      enemies.splice(index, 1);
      score += 100;
    }
  });
}

// --- VISUALS ---
function drawBackground() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);
  
  // Simple Parallax floor
  ctx.fillStyle = '#333';
  ctx.fillRect(0, H - 50, W, 50);
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x + player.w/2, player.y + player.h/2);
  ctx.scale(player.facing, 1);
  
  // Body
  ctx.fillStyle = player.attacking ? '#ff0' : '#0af';
  ctx.fillRect(-player.w/2, -player.h/2, player.w, player.h);
  
  // Arm/Weapon if attacking
  if (player.attacking) {
    ctx.fillStyle = '#fff';
    const ext = player.attackFrame * 2;
    ctx.fillRect(20, -10, ext > 40 ? 40 : ext, 10);
  }
  
  ctx.restore();
}

function drawEnemies() {
  enemies.forEach(en => {
    ctx.fillStyle = '#f44';
    ctx.fillRect(en.x, en.y, en.w, en.h);
  });
}

function createHitEffect(x, y) {
  effects.push({ x, y, life: 20 });
}

function updateEffects() {
  effects.forEach((eff, i) => {
    eff.life--;
    if (eff.life <= 0) effects.splice(i, 1);
  });
}

function drawEffects() {
  effects.forEach(eff => {
    ctx.fillStyle = 'rgba(255, 255, 255, ' + (eff.life / 20) + ')';
    ctx.beginPath();
    ctx.arc(eff.x, eff.y, 30, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawUI() {
  document.getElementById('health-bar').style.width = player.health + '%';
}

function drawPauseScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = '40px Russo One';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', W/2, H/2);
}

// --- INPUT & CONTROL HANDLERS ---
function togglePause() {
  paused = !paused;
}

function startGame() {
  const title = document.getElementById('title-screen');
  title.style.opacity = '0';
  setTimeout(() => {
    title.style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    gameState = 'playing';
    gameLoop();
  }, 800);
}

// Start Button Link
const startBtn = document.getElementById('start-btn');
if (startBtn) {
  startBtn.addEventListener('click', startGame);
  startBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startGame();
  }, { passive: false });
}

// Keyboard Listeners
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === 'p' || e.key === 'P') togglePause();
  
  if (gameState === 'playing' && !paused) {
    if ((e.key === 'z' || e.key === 'Z') && !player.attacking) {
      player.attacking = true; player.attackType = 'punch'; player.attackFrame = 0;
    }
    if ((e.key === 'ArrowUp' || e.key === ' ') && player.grounded) {
      player.vy = -14;
      player.grounded = false;
    }
  }
});

document.addEventListener('keyup', e => keys[e.key] = false);

// Mobile Button Listeners
document.querySelectorAll('#mobile-controls button').forEach(btn => {
  const key = btn.getAttribute('data-key');
  
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys[key] = true;
    
    if (gameState === 'playing' && !paused) {
      if (key === 'KeyZ' && !player.attacking) {
        player.attacking = true; player.attackType = 'punch'; player.attackFrame = 0;
      }
      if (key === 'ArrowUp' && player.grounded) {
        player.vy = -14;
        player.grounded = false;
      }
    }
  }, { passive: false });

  btn.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys[key] = false;
  }, { passive: false });
});

// Run Init
init();