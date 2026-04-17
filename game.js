'use strict';

/**
 * SUPER MAJZIE MO — GAME ENGINE
 * Premium Edition · Optimized for iPhone & Desktop
 */

// ═══════════════════════════════════════════════════
//  CANVAS + CONTEXT
// ═══════════════════════════════════════════════════
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// ═══════════════════════════════════════════════════
//  GAME STATE
// ═══════════════════════════════════════════════════
let W, H;
let gameState  = 'title';  // 'title' | 'playing' | 'paused' | 'dead' | 'clear'
let paused     = false;
let frameCount = 0;
let score      = 0;
let bestScore  = parseInt(localStorage.getItem('smm_best') || '0', 10);
let lives      = 3;
let level      = 1;
let combo      = 0;
let comboTimer = 0;
let bgScroll   = 0;
let shakeTimer = 0;
let shakeMag   = 0;
let spawnTimer = 0;
let enemiesKilled = 0;
const ENEMIES_PER_LEVEL = 8;

const keys    = {};
const enemies = [];
const effects = [];

// ═══════════════════════════════════════════════════
//  SPRITE SHEETS
// ═══════════════════════════════════════════════════
const sheet1 = new Image(); // main pack  (majzie_sprites.jpeg)
const sheet2 = new Image(); // expansion  (9cb61436-...jpeg)
let   spritesLoaded = 0;
sheet1.onload = () => spritesLoaded++;
sheet2.onload = () => spritesLoaded++;
sheet1.src = 'majzie_sprites.jpeg';
sheet2.src = '9cb61436-e956-43f0-bea7-de670796b352.jpeg';

// Sprite cell dimensions on the sheet
const SW = 130, SH = 130;

// Sheet 1 column x-starts (left = Majzie, right = base enemies)
const S1L = [18, 148, 278];   // Majzie columns
const S1R = [408, 538, 668];  // Enemy columns
const S1Y = [65, 195, 325, 455, 585, 715, 845];

// Sheet 2 column x-starts
const S2L = [18, 148, 278];
const S2R = [408, 538, 668];
const S2Y = [55, 185, 315, 445, 575, 705];

function getSpriteCoords(type, frame, attackType, isAttacking) {
  const wf = Math.floor(frame / 8) % 3;   // walk cycle: 3 frames
  const af = Math.floor(frame / 5) % 3;   // attack cycle: 3 frames
  const rf = Math.floor(frame / 6) % 6;   // run cycle: 6 frames

  switch (type) {
    case 'majzie':
      if (isAttacking) {
        if (attackType === 'punch')   return { sh: sheet1, sx: S1L[0],     sy: S1Y[3] };
        if (attackType === 'kick') {
          const kf = Math.floor(frame / 4) % 3;
          if (kf < 2)                return { sh: sheet1, sx: S1L[kf + 1], sy: S1Y[3] };
                                     return { sh: sheet1, sx: S1L[0],     sy: S1Y[4] };
        }
        // special
        const sf = Math.floor(frame / 4) % 2;
        return { sh: sheet1, sx: S1L[sf + 1], sy: S1Y[4] };
      }
      // Run
      if (rf < 3) return { sh: sheet1, sx: S1L[rf],     sy: S1Y[0] };
                  return { sh: sheet1, sx: S1L[rf - 3],  sy: S1Y[1] };

    case 'bigGuy':
      return isAttacking
        ? { sh: sheet1, sx: S1R[af], sy: S1Y[1] }
        : { sh: sheet1, sx: S1R[wf], sy: S1Y[0] };

    case 'ninja':
      return isAttacking
        ? { sh: sheet1, sx: S1R[af], sy: S1Y[3] }
        : { sh: sheet1, sx: S1R[wf], sy: S1Y[2] };

    case 'hoodGuy':
      return isAttacking
        ? { sh: sheet1, sx: S1R[Math.min(af, 1)], sy: S1Y[5] }
        : { sh: sheet1, sx: S1R[wf],              sy: S1Y[4] };

    case 'biker':
      return isAttacking
        ? { sh: sheet2, sx: S2R[af], sy: S2Y[0] }
        : { sh: sheet2, sx: S2L[wf], sy: S2Y[0] };

    case 'punk':
      return isAttacking
        ? { sh: sheet2, sx: S2R[af], sy: S2Y[2] }
        : { sh: sheet2, sx: S2L[wf], sy: S2Y[2] };

    case 'blackOps':
      return isAttacking
        ? { sh: sheet2, sx: S2R[Math.min(af, 1)], sy: S2Y[4] }
        : { sh: sheet2, sx: S2L[wf],              sy: S2Y[5] };

    default:
      return { sh: sheet1, sx: S1R[wf], sy: S1Y[0] };
  }
}

const SPRITE_HEIGHTS = {
  majzie: 110, bigGuy: 130, ninja: 108,
  hoodGuy: 108, biker: 114, punk: 108, blackOps: 112
};

function drawSprite(type, frame, cx, cy, scale, facingRight, attackType, isAttacking, alpha = 1) {
  const c = getSpriteCoords(type, frame, attackType, isAttacking);
  if (!c.sh.complete || !c.sh.naturalWidth) return false;

  const h  = (SPRITE_HEIGHTS[type] || 110) * scale;
  const w  = (SW / SH) * h;

  ctx.save();
  ctx.globalAlpha *= alpha;
  if (!facingRight) {
    ctx.translate(cx, 0);
    ctx.scale(-1, 1);
    ctx.translate(-cx, 0);
  }
  ctx.drawImage(c.sh, c.sx, c.sy, SW, SH, cx - w / 2, cy - h, w, h);
  ctx.restore();
  return true;
}

// Fallback rectangle if sprites not loaded
function drawFallback(cx, cy, scale, color) {
  const w = 28 * scale, h = 60 * scale;
  ctx.fillStyle = color;
  ctx.fillRect(cx - w / 2, cy - h, w, h);
}

// ═══════════════════════════════════════════════════
//  PLAYER
// ═══════════════════════════════════════════════════
const SCALE_MOBILE  = window.innerWidth < 600 ? 1.3 : 1.7;

const player = {
  x: 0, y: 0,
  vx: 0, vy: 0,
  speed: 5,
  health: 100, maxHealth: 100,
  grounded: false,
  attacking: false,
  attackType: null,
  attackFrame: 0,
  attackDuration: 16,
  invincible: false,
  invincibleTimer: 0,
  facing: 1,   // 1 = right, -1 = left
  scale: SCALE_MOBILE,
  hitFlash: 0
};

// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════
function init() {
  resize();
  window.addEventListener('resize', resize);
  setupControls();
  renderLives();
}

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width  = W;
  canvas.height = H;
  const floor = H - 120;
  if (player.y === 0 || player.y > floor) player.y = floor;
  if (player.x === 0) player.x = W * 0.2;
}

// ═══════════════════════════════════════════════════
//  GAME LOOP
// ═══════════════════════════════════════════════════
function gameLoop() {
  requestAnimationFrame(gameLoop);

  if (gameState !== 'playing' || paused) return;

  frameCount++;
  ctx.clearRect(0, 0, W, H);

  applyShake();
  update();
  render();
}

function applyShake() {
  if (shakeTimer > 0) {
    shakeTimer--;
    const dx = (Math.random() - 0.5) * shakeMag;
    const dy = (Math.random() - 0.5) * shakeMag;
    ctx.save();
    ctx.translate(dx, dy);
  }
}

// ═══════════════════════════════════════════════════
//  UPDATE
// ═══════════════════════════════════════════════════
function update() {
  // ── Player movement ─────────────────────────────
  const movingLeft  = keys['ArrowLeft']  || keys['a'] || keys['A'];
  const movingRight = keys['ArrowRight'] || keys['d'] || keys['D'];

  if (movingLeft)       { player.vx = -player.speed; player.facing = -1; }
  else if (movingRight) { player.vx =  player.speed;  player.facing =  1; }
  else                  { player.vx *= 0.75; }

  player.x += player.vx;
  bgScroll  += player.vx * 0.4;

  // ── Gravity ──────────────────────────────────────
  player.vy += 0.75;
  player.y  += player.vy;

  const floor = H - 120;
  if (player.y >= floor) {
    player.y      = floor;
    player.vy     = 0;
    player.grounded = true;
  }

  // ── Bounds ──────────────────────────────────────
  player.x = Math.max(30, Math.min(W - 30, player.x));

  // ── Attack animation ────────────────────────────
  if (player.attacking) {
    player.attackFrame++;
    if (player.attackFrame >= player.attackDuration) {
      player.attacking   = false;
      player.attackFrame = 0;
    }
  }

  // ── Invincibility frames ─────────────────────────
  if (player.invincible) {
    player.invincibleTimer--;
    if (player.invincibleTimer <= 0) player.invincible = false;
  }
  if (player.hitFlash > 0) player.hitFlash--;

  // ── Combo decay ──────────────────────────────────
  if (comboTimer > 0) {
    comboTimer--;
  } else if (combo > 0) {
    combo = 0;
    updateComboDisplay();
  }

  // ── Enemy spawning ───────────────────────────────
  spawnTimer++;
  const spawnInterval = Math.max(45, 90 - level * 8);
  if (spawnTimer >= spawnInterval && enemies.length < 5) {
    spawnEnemy();
    spawnTimer = 0;
  }

  updateEnemies();
  updateEffects();

  // ── Level clear check ────────────────────────────
  if (enemiesKilled >= ENEMIES_PER_LEVEL) {
    triggerLevelClear();
  }
}

// ═══════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════
function render() {
  drawBackground();
  drawFloor();
  drawEnemies();
  drawPlayerSprite();
  drawEffects();
  if (shakeTimer > 0) ctx.restore();
  updateHUD();
}

function drawBackground() {
  // Deep city gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0,   '#0a0010');
  grad.addColorStop(0.6, '#14000a');
  grad.addColorStop(1,   '#050005');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Scrolling city silhouette
  ctx.fillStyle = 'rgba(15,0,20,0.9)';
  for (let i = 0; i < 14; i++) {
    const bx  = ((i * 180 - bgScroll * 0.15) % (W + 200) + W + 200) % (W + 200) - 100;
    const bh  = 80 + (i * 37) % 120;
    const bw  = 60 + (i * 23) % 80;
    ctx.fillRect(bx, H - 120 - bh, bw, bh);

    // Window lights
    ctx.fillStyle = 'rgba(255,200,80,0.25)';
    for (let wy = 0; wy < 4; wy++) {
      for (let wx = 0; wx < 3; wx++) {
        if ((i + wy + wx + frameCount / 90 | 0) % 3 !== 0) {
          ctx.fillRect(bx + 8 + wx * 16, H - 120 - bh + 14 + wy * 18, 8, 10);
        }
      }
    }
    ctx.fillStyle = 'rgba(15,0,20,0.9)';
  }

  // Ground fire glow
  const fireGrad = ctx.createRadialGradient(W / 2, H - 100, 0, W / 2, H - 100, W * 0.55);
  fireGrad.addColorStop(0,   'rgba(255,80,0,0.18)');
  fireGrad.addColorStop(1,   'transparent');
  ctx.fillStyle = fireGrad;
  ctx.fillRect(0, H - 200, W, 200);
}

function drawFloor() {
  // Street
  ctx.fillStyle = '#0d0018';
  ctx.fillRect(0, H - 120, W, 120);

  // Wet street reflections
  ctx.fillStyle = 'rgba(255,80,0,0.07)';
  ctx.fillRect(0, H - 120, W, 3);
  for (let i = 0; i < 8; i++) {
    const rx = ((i * 210 - bgScroll * 0.3) % (W + 300) + W + 300) % (W + 300) - 100;
    ctx.fillStyle = `rgba(255,${60 + i * 10},0,${0.06 + i * 0.01})`;
    ctx.fillRect(rx, H - 118, 80 + i * 20, 2);
  }
}

function drawPlayerSprite() {
  const facingRight = player.facing === 1;

  // Invincibility blink
  if (player.invincible && player.invincibleTimer % 5 < 2) {
    ctx.globalAlpha = 0.35;
  }

  // Hit flash
  if (player.hitFlash > 0 && player.hitFlash % 3 === 0) {
    ctx.filter = 'brightness(10) saturate(0) sepia(1)';
  }

  const animFrame = player.attacking ? player.attackFrame * 2 : frameCount;
  const drawn = drawSprite(
    'majzie', animFrame,
    player.x, player.y,
    player.scale, facingRight,
    player.attackType, player.attacking
  );
  if (!drawn) drawFallback(player.x, player.y, player.scale, player.attacking ? '#FFD700' : '#00AAFF');

  // Special attack aura
  if (player.attacking && player.attackType === 'special') {
    const prog = 1 - player.attackFrame / player.attackDuration;
    ctx.globalAlpha = prog * 0.55;
    ctx.fillStyle   = '#00EEFF';
    ctx.shadowBlur  = 35;
    ctx.shadowColor = '#00EEFF';
    ctx.beginPath();
    ctx.arc(player.x, player.y - 40, 65 * prog, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.filter      = 'none';
  ctx.globalAlpha = 1;
}

// ═══════════════════════════════════════════════════
//  ENEMIES
// ═══════════════════════════════════════════════════
const ENEMY_TYPES = ['bigGuy', 'ninja', 'hoodGuy'];
const EXPANSION   = ['biker', 'punk', 'blackOps'];

function spawnEnemy() {
  const pool = level >= 2 ? [...ENEMY_TYPES, ...EXPANSION] : ENEMY_TYPES;
  const type = pool[Math.floor(Math.random() * pool.length)];
  const fromRight = Math.random() > 0.35;
  const isBig   = type === 'bigGuy';
  const isElite = type === 'biker' || type === 'blackOps';

  enemies.push({
    x:          fromRight ? W + 80 : -80,
    y:          H - 120,
    type,
    health:     isBig ? 80 : isElite ? 65 : 50,
    maxHealth:  isBig ? 80 : isElite ? 65 : 50,
    speed:      isBig ? 1.2 : isElite ? 2.3 : 1.9,
    facingRight: !fromRight,
    scale:      (isBig ? 1.7 : 1.4) * (W < 600 ? 0.82 : 1),
    attackTimer: Math.floor(Math.random() * 120) + 80,
    hitFlash:   0,
    dying:      false,
    dyingTimer: 0
  });
}

function updateEnemies() {
  const ATTACK_RANGE  = 75;
  const PLAYER_DAMAGE = 8;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    if (e.dying) {
      e.dyingTimer++;
      if (e.dyingTimer > 45) enemies.splice(i, 1);
      continue;
    }

    if (e.hitFlash > 0) e.hitFlash--;

    // Move toward player
    const dx   = player.x - e.x;
    const dist = Math.abs(dx);

    if (dist > ATTACK_RANGE) {
      e.x += e.speed * Math.sign(dx);
      e.facingRight = dx > 0;
    }

    // Attack player
    e.attackTimer--;
    if (e.attackTimer <= 0 && dist < ATTACK_RANGE) {
      if (!player.invincible) {
        player.health  -= PLAYER_DAMAGE;
        player.hitFlash = 8;
        player.invincible     = true;
        player.invincibleTimer = 50;
        triggerHaptic(20);
        addScreenShake(4, 8);
        if (player.health <= 0) {
          player.health = 0;
          handlePlayerDeath();
        }
        updateHealthBar();
      }
      e.attackTimer = Math.floor(Math.random() * 100) + 90;
    }

    // Check if player hits this enemy
    if (player.attacking && dist < (player.attackType === 'special' ? 120 : 80)) {
      const dmg = player.attackType === 'special' ? 30
                : player.attackType === 'kick'    ? 18
                : 12;

      e.health   -= dmg;
      e.hitFlash  = 6;
      addHitEffect(e.x, e.y - 30, '#FF6B35');
      addScreenShake(2, 6);

      // Combo
      combo++;
      comboTimer = 90;
      score += dmg * (1 + Math.floor(combo / 5));
      updateComboDisplay();
      updateScoreDisplay();
      triggerHaptic(14);

      if (e.health <= 0) {
        e.dying = true;
        addHitEffect(e.x, e.y - 50, '#FFD700');
        score += 150 + level * 50;
        enemiesKilled++;
        updateScoreDisplay();
        saveBest();
      }
    }
  }
}

function drawEnemies() {
  for (const e of enemies) {
    const alpha = e.dying ? Math.max(0, 1 - e.dyingTimer / 45) : 1;
    if (e.hitFlash > 0 && e.hitFlash % 3 === 0) ctx.filter = 'brightness(10) saturate(0)';

    ctx.globalAlpha = alpha;
    const isAttacking = e.attackTimer < 20;
    const drawn = drawSprite(e.type, frameCount, e.x, e.y, e.scale, e.facingRight, 'punch', isAttacking, alpha);
    if (!drawn) drawFallback(e.x, e.y, e.scale, '#FF4500');

    ctx.filter      = 'none';
    ctx.globalAlpha = 1;

    // Enemy health bar
    if (!e.dying && e.health < e.maxHealth) {
      const bw = 44 * e.scale;
      const bx = e.x - bw / 2;
      const by = e.y - 68 * e.scale;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = '#FF2200';
      ctx.fillRect(bx, by, bw * (e.health / e.maxHealth), 5);
    }
  }
}

// ═══════════════════════════════════════════════════
//  EFFECTS
// ═══════════════════════════════════════════════════
function addHitEffect(x, y, color) {
  for (let i = 0; i < 10; i++) {
    effects.push({
      type: 'particle',
      x, y,
      vx: (Math.random() - 0.5) * 9,
      vy: (Math.random() - 0.5) * 7 - 2,
      life: 1,
      color,
      size: Math.random() * 5 + 3
    });
  }
  const words = ['POW!', 'BAM!', 'CRACK!', 'SMASH!'];
  effects.push({
    type: 'text',
    x, y,
    vx: (Math.random() - 0.5) * 2,
    vy: -2.5,
    life: 1,
    color,
    word: words[Math.floor(Math.random() * words.length)]
  });
}

function addScreenShake(mag, dur) {
  shakeMag   = mag;
  shakeTimer = dur;
}

function updateEffects() {
  for (let i = effects.length - 1; i >= 0; i--) {
    const p = effects[i];
    p.x    += p.vx || 0;
    p.y    += p.vy || 0;
    p.life -= 0.025;
    if (p.life <= 0) effects.splice(i, 1);
  }
}

function drawEffects() {
  for (const ef of effects) {
    ctx.globalAlpha = ef.life;
    if (ef.type === 'text') {
      ctx.font        = `bold ${Math.floor(24 * (W / 800))}px 'Bebas Neue', sans-serif`;
      ctx.fillStyle   = ef.color || '#FF6B35';
      ctx.shadowBlur  = 18;
      ctx.shadowColor = ef.color || '#FF6B35';
      ctx.fillText(ef.word, ef.x - 20, ef.y);
      ctx.shadowBlur  = 0;
    } else {
      ctx.fillStyle   = ef.color;
      ctx.shadowBlur  = 8;
      ctx.shadowColor = ef.color;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.size * ef.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur  = 0;
    }
    ctx.globalAlpha = 1;
  }
}

// ═══════════════════════════════════════════════════
//  HUD UPDATES
// ═══════════════════════════════════════════════════
function updateHUD() {
  updateHealthBar();
  updateScoreDisplay();
}

function updateHealthBar() {
  const bar  = document.getElementById('health-bar');
  const text = document.getElementById('hp-text');
  if (bar)  bar.style.width = player.health + '%';
  if (text) text.textContent = player.health;
}

function updateScoreDisplay() {
  const el = document.getElementById('score-display');
  if (el) el.textContent = String(score).padStart(6, '0');
}

function updateComboDisplay() {
  const el = document.getElementById('combo-display');
  if (!el) return;
  if (combo >= 3) {
    el.textContent = `${combo}x COMBO!`;
    el.style.opacity = '1';
  } else {
    el.textContent = '';
    el.style.opacity = '0';
  }
}

function renderLives() {
  const row = document.getElementById('lives-row');
  if (!row) return;
  row.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'life-dot' + (i >= lives ? ' lost' : '');
    row.appendChild(dot);
  }
}

function updateLevelLabel() {
  const el = document.getElementById('level-label');
  if (el) el.textContent = `LEVEL ${level}`;
}

function saveBest() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('smm_best', bestScore);
  }
}

// ═══════════════════════════════════════════════════
//  GAME FLOW
// ═══════════════════════════════════════════════════
function handlePlayerDeath() {
  lives--;
  renderLives();

  if (lives <= 0) {
    gameState = 'dead';
    saveBest();
    setTimeout(showGameOver, 600);
  } else {
    // Respawn with brief invincibility
    player.health         = 100;
    player.invincible     = true;
    player.invincibleTimer = 120;
    updateHealthBar();
  }
}

function triggerLevelClear() {
  gameState = 'clear';
  const bonus = level * 2000;
  score += bonus;
  saveBest();
  document.getElementById('lc-bonus').textContent = `BONUS +${bonus}`;
  showScreen('levelclear-screen');
}

function showGameOver() {
  document.getElementById('go-score').textContent = `SCORE: ${String(score).padStart(6, '0')}`;
  document.getElementById('go-best').textContent  = `BEST: ${String(bestScore).padStart(6, '0')}`;
  showScreen('gameover-screen');
}

function nextLevel() {
  level++;
  enemiesKilled = 0;
  spawnTimer    = 0;
  enemies.length = 0;
  effects.length = 0;
  player.health = Math.min(100, player.health + 30);
  updateHealthBar();
  updateLevelLabel();
  hideScreen('levelclear-screen');
  gameState = 'playing';
}

function restartGame() {
  score         = 0;
  lives         = 3;
  level         = 1;
  combo         = 0;
  comboTimer    = 0;
  enemiesKilled = 0;
  spawnTimer    = 0;
  frameCount    = 0;
  bgScroll      = 0;
  player.health = 100;
  player.x      = W * 0.2;
  player.y      = H - 120;
  player.vx = player.vy = 0;
  enemies.length = 0;
  effects.length = 0;

  renderLives();
  updateHealthBar();
  updateScoreDisplay();
  updateLevelLabel();
  updateComboDisplay();

  hideScreen('gameover-screen');
  hideScreen('levelclear-screen');
  gameState = 'playing';
}

function showScreen(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function hideScreen(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ═══════════════════════════════════════════════════
//  PAUSE
// ═══════════════════════════════════════════════════
function togglePause() {
  if (gameState !== 'playing' && !paused) return;
  paused = !paused;
  const pauseScreen = document.getElementById('pause-screen');
  const pauseBtn    = document.getElementById('pause-btn');
  if (paused) {
    showScreen('pause-screen');
    if (pauseBtn) pauseBtn.textContent = '▶';
  } else {
    hideScreen('pause-screen');
    if (pauseBtn) pauseBtn.textContent = '⏸';
  }
}

// ═══════════════════════════════════════════════════
//  HAPTIC FEEDBACK
// ═══════════════════════════════════════════════════
function triggerHaptic(ms = 15) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

// ═══════════════════════════════════════════════════
//  CONTROLS
// ═══════════════════════════════════════════════════
function setupControls() {

  // ── START BUTTON ─────────────────────────────────
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click',      launchGame);
    startBtn.addEventListener('touchstart', (e) => { e.preventDefault(); launchGame(); }, { passive: false });
  }

  // ── RESUME / QUIT ─────────────────────────────────
  const resumeBtn = document.getElementById('resume-btn');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', togglePause);
    resumeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); togglePause(); }, { passive: false });
  }
  const quitBtn = document.getElementById('quit-btn');
  if (quitBtn) {
    quitBtn.addEventListener('click', () => { togglePause(); showGameOver(); gameState = 'dead'; });
    quitBtn.addEventListener('touchstart', (e) => { e.preventDefault(); togglePause(); showGameOver(); gameState = 'dead'; }, { passive: false });
  }

  // ── RETRY / NEXT LEVEL ────────────────────────────
  const retryBtn    = document.getElementById('retry-btn');
  const nextLvlBtn  = document.getElementById('nextlevel-btn');
  if (retryBtn)   retryBtn.addEventListener('click', restartGame);
  if (nextLvlBtn) nextLvlBtn.addEventListener('click', nextLevel);
  if (retryBtn)   retryBtn.addEventListener('touchstart',   (e) => { e.preventDefault(); restartGame(); }, { passive: false });
  if (nextLvlBtn) nextLvlBtn.addEventListener('touchstart', (e) => { e.preventDefault(); nextLevel();   }, { passive: false });

  // ── PAUSE BUTTON (mobile) ─────────────────────────
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click',      togglePause);
    pauseBtn.addEventListener('touchstart', (e) => { e.preventDefault(); togglePause(); }, { passive: false });
  }

  // ── KEYBOARD ──────────────────────────────────────
  window.addEventListener('keydown', e => {
    keys[e.key] = true;

    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      togglePause();
    }

    if (gameState === 'playing' && !paused) {
      if (e.key === 'ArrowUp' || e.key === ' ') {
        if (player.grounded) { player.vy = -15; player.grounded = false; }
      }
      if (e.key === 'z' || e.key === 'Z') triggerAttack('punch');
      if (e.key === 'x' || e.key === 'X') triggerAttack('kick');
      if (e.key === 'c' || e.key === 'C') triggerAttack('special');
    }

    e.preventDefault();
  });

  window.addEventListener('keyup', e => {
    keys[e.key] = false;
  });

  // ── MOBILE BUTTONS ────────────────────────────────
  document.querySelectorAll('#mobile-controls .ctrl-btn').forEach(btn => {
    const key = btn.getAttribute('data-key');

    const onDown = (e) => {
      e.preventDefault();
      if (paused) return;
      keys[key] = true;
      btn.classList.add('pressed');

      if (gameState === 'playing') {
        if (key === 'ArrowUp' && player.grounded) {
          player.vy = -15; player.grounded = false;
        }
        if (key === 'KeyZ')  triggerAttack('punch');
        if (key === 'KeyX')  triggerAttack('kick');
        if (key === 'KeyC')  triggerAttack('special');
      }
    };

    const onUp = (e) => {
      e.preventDefault();
      keys[key] = false;
      btn.classList.remove('pressed');
    };

    btn.addEventListener('touchstart',  onDown, { passive: false });
    btn.addEventListener('touchend',    onUp,   { passive: false });
    btn.addEventListener('touchcancel', onUp,   { passive: false });
  });

  // ── STOP PULL-TO-REFRESH ──────────────────────────
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) return;
    e.preventDefault();
  }, { passive: false });
}

function triggerAttack(type) {
  if (!player.attacking) {
    player.attacking   = true;
    player.attackType  = type;
    player.attackFrame = 0;
    triggerHaptic(type === 'special' ? 30 : 12);
  }
}

// ═══════════════════════════════════════════════════
//  LAUNCH
// ═══════════════════════════════════════════════════
function launchGame() {
  // Wait for sprites if needed
  if (spritesLoaded < 2) {
    const msg = document.createElement('div');
    msg.id = 'loading-msg';
    msg.style.cssText = [
      'position:fixed;inset:0;background:#000',
      'display:flex;align-items:center;justify-content:center',
      'color:#FF6B35;font-family:Bebas Neue,sans-serif',
      'font-size:clamp(24px,5vw,36px);letter-spacing:8px;z-index:500'
    ].join(';');
    msg.textContent = 'LOADING…';
    document.body.appendChild(msg);

    const poll = setInterval(() => {
      if (spritesLoaded >= 2) {
        clearInterval(poll);
        msg.remove();
        _startGame();
      }
    }, 100);
    return;
  }
  _startGame();
}

function _startGame() {
  const ts = document.getElementById('title-screen');
  ts.style.opacity = '0';

  setTimeout(() => {
    ts.style.display = 'none';

    // Show HUD
    const hud = document.getElementById('hud');
    if (hud) { hud.style.display = 'flex'; }

    // Show mobile controls
    const mc = document.getElementById('mobile-controls');
    if (mc) mc.classList.add('active');

    updateLevelLabel();
    updateScoreDisplay();
    renderLives();

    gameState = 'playing';
    gameLoop();
  }, 800);
}

// ═══════════════════════════════════════════════════
//  TITLE SCREEN RAIN (canvas-less, DOM-free, pure JS)
// ═══════════════════════════════════════════════════
(function initTitleRain() {
  const rc = document.createElement('canvas');
  rc.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  const container = document.getElementById('title-screen');
  if (container) container.appendChild(rc);

  const rctx = rc.getContext('2d');
  let drops = [];

  function sizeRain() {
    rc.width  = window.innerWidth;
    rc.height = window.innerHeight;
    drops = [];
    for (let i = 0; i < 160; i++) {
      drops.push({
        x:   Math.random() * rc.width,
        y:   Math.random() * rc.height,
        len: Math.random() * 22 + 10,
        sp:  Math.random() * 5 + 3,
        op:  Math.random() * 0.38 + 0.08
      });
    }
  }

  window.addEventListener('resize', sizeRain);
  sizeRain();

  let titleActive = true;
  document.getElementById('start-btn')?.addEventListener('click', () => { titleActive = false; });

  function rainLoop() {
    if (!titleActive) return;
    rctx.clearRect(0, 0, rc.width, rc.height);
    rctx.strokeStyle = 'rgba(120,160,255,0.4)';
    rctx.lineWidth = 1.2;
    for (const d of drops) {
      rctx.globalAlpha = d.op;
      rctx.beginPath();
      rctx.moveTo(d.x, d.y);
      rctx.lineTo(d.x - d.len * 0.15, d.y + d.len);
      rctx.stroke();
      d.y += d.sp; d.x -= d.sp * 0.15;
      if (d.y > rc.height) { d.y = -d.len; d.x = Math.random() * rc.width; }
    }
    rctx.globalAlpha = 1;
    requestAnimationFrame(rainLoop);
  }
  rainLoop();
})();

// ═══════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════
window.onload = () => {
  init();
  console.log('%cSuper Majzie Mo · Engine Ready', 'color:#FF6B35;font-family:monospace;font-size:14px;');
};
