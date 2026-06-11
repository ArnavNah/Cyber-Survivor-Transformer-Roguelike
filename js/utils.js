// Survivors Arena Math Utilities, Spatial Grid, and VFX Pools

// Vector & Math helpers
export function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function distSq(x1, y1, x2, y2) {
  return (x2 - x1) ** 2 + (y2 - y1) ** 2;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

// -------------------------------------------------------------
// Spatial Hash Grid (for O(N) proximity and collision queries)
// -------------------------------------------------------------
export class SpatialGrid {
  constructor(cellSize = 100) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.queryResults = []; // pre-allocated buffer to prevent array garbage collection
  }

  clear() {
    this.grid.clear();
  }

  _getKey(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    // Standard pairing hash: packs cell coordinates as a 32-bit unsigned integer.
    // Handles negative coordinates using a offset.
    return ((cx + 0x7FFF) & 0xFFFF) | (((cy + 0x7FFF) & 0xFFFF) << 16);
  }

  insert(entity) {
    const key = this._getKey(entity.x, entity.y);
    let cell = this.grid.get(key);
    if (!cell) {
      cell = [];
      this.grid.set(key, cell);
    }
    cell.push(entity);
  }

  // Get all entities in the cells that could overlap with a circle at (x, y) with radius
  getNearby(x, y, radius) {
    this.queryResults.length = 0; // Clear without allocating a new array
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = ((cx + 0x7FFF) & 0xFFFF) | (((cy + 0x7FFF) & 0xFFFF) << 16);
        const cell = this.grid.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            this.queryResults.push(cell[i]);
          }
        }
      }
    }
    return this.queryResults;
  }
}

// -------------------------------------------------------------
// Particle System (Object Pooled)
// -------------------------------------------------------------
class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.color = '#fff';
    this.size = 2;
    this.life = 0;
    this.maxLife = 0;
    this.gravity = 0;
    this.drag = 0.98;
  }

  init(x, y, vx, vy, color, size, life, gravity = 0, drag = 0.98) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.gravity = gravity;
    this.drag = drag;
    this.active = true;
  }

  update(dt) {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.life -= dt * 1000; // subtract ms
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx, camera) {
    if (!this.active) return;
    
    // Convert world space to screen space
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    const alpha = clamp(this.life / this.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class ParticleManager {
  constructor(maxParticles = 800) {
    this.pool = Array.from({ length: maxParticles }, () => new Particle());
  }

  spawn(x, y, vx, vy, color, size, life, gravity = 0, drag = 0.98) {
    const particle = this.pool.find(p => !p.active);
    if (particle) {
      particle.init(x, y, vx, vy, color, size, life, gravity, drag);
    }
  }

  // Visual effects helper functions
  spawnExplosion(x, y, color = '#ff5e00', count = 20, force = 200) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(50, force);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = randomRange(2, 6);
      const life = randomRange(300, 800);
      this.spawn(x, y, vx, vy, color, size, life, 0, 0.92);
    }
  }

  spawnHitSparks(x, y, vxDir = 0, vyDir = 0, color = '#ffffff') {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(vyDir, vxDir) + randomRange(-0.5, 0.5);
      const speed = randomRange(100, 250);
      const vx = Math.cos(angle) * speed + randomRange(-30, 30);
      const vy = Math.sin(angle) * speed + randomRange(-30, 30);
      const size = randomRange(1, 3);
      const life = randomRange(200, 500);
      this.spawn(x, y, vx, vy, color, size, life, 0, 0.95);
    }
  }

  spawnLevelUpEffects(x, y) {
    // Generate concentric expansion particles
    const colors = ['#8a2be2', '#00ffff', '#ffd700', '#ff0055'];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(120, 350);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = randomRange(3, 7);
      const life = randomRange(800, 1500);
      this.spawn(x, y, vx, vy, color, size, life, 0, 0.96);
    }
  }

  spawnGemSparkle(x, y, color = '#00ffff') {
    for (let i = 0; i < 3; i++) {
      const vx = randomRange(-40, 40);
      const vy = randomRange(-40, -10);
      const size = randomRange(1.5, 3);
      const life = randomRange(300, 600);
      this.spawn(x, y, vx, vy, color, size, life, -15, 0.97);
    }
  }

  spawnDeathBurst(x, y, enemyType, isBoss, isElite) {
    const colorMap = {
      basic: '#00bbff', mid: '#f15bb5', tank: '#9b5de5',
      hunter: '#ff5e00', brute: '#9b5de5', ranged: '#f15bb5',
      summoner: '#7209b7', crawler: '#00bbff', exploder: '#ff4500',
      boss: '#ff0055'
    };
    const color = colorMap[enemyType] || '#ffffff';
    const count = isBoss ? 60 : isElite ? 25 : 12;
    const force = isBoss ? 400 : isElite ? 250 : 150;
    this.spawnExplosion(x, y, color, count, force);
    
    if (isBoss || isElite) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const speed = force * 0.6;
        this.spawn(x, y, Math.cos(a) * speed, Math.sin(a) * speed, '#ffd700', 4, 600, 0, 0.94);
      }
    }
  }

  spawnBossDeathCascade(x, y) {
    const colors = ['#ff0055', '#ffd700', '#ff5e00', '#ffffff'];
    for (let wave = 0; wave < 4; wave++) {
      const waveForce = 200 + wave * 100;
      const waveCount = 15 + wave * 5;
      for (let i = 0; i < waveCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = randomRange(waveForce * 0.5, waveForce);
        const color = colors[wave % colors.length];
        const size = randomRange(2, 5 + wave);
        const life = randomRange(400 + wave * 200, 1000 + wave * 200);
        this.spawn(x, y, Math.cos(a) * speed, Math.sin(a) * speed, color, size, life, 30, 0.95);
      }
    }
  }

  spawnTelegraphRing(x, y, radius) {
    const count = 24;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      this.spawn(px, py, 0, 0, '#ff0033', 3, 1200, 0, 1.0);
    }
  }

  update(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].update(dt);
      }
    }
  }

  draw(ctx, camera) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].draw(ctx, camera);
      }
    }
  }
}

// -------------------------------------------------------------
// Floating Damage Numbers (Object Pooled)
// -------------------------------------------------------------
class FloatingText {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.text = '';
    this.color = '#fff';
    this.size = 14;
    this.life = 0;
    this.maxLife = 0;
    this.isCrit = false;
  }

  init(x, y, text, color, isCrit = false, size = 16, life = 800) {
    this.x = x;
    this.y = y;
    this.vx = randomRange(-40, 40);
    this.vy = randomRange(-120, -80);
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.isCrit = isCrit;
    this.active = true;
  }

  update(dt) {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 60 * dt; // slight downward drift deceleration
    this.vx *= 0.98;
    this.life -= dt * 1000;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx, camera) {
    if (!this.active) return;

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    const alpha = clamp(this.life / this.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Premium text styling with bold outfit-style font
    ctx.textAlign = 'center';
    
    if (this.isCrit) {
      // Add a pop animation based on life
      const lifeRatio = this.life / this.maxLife;
      const popScale = 1.0 + Math.sin((1 - lifeRatio) * Math.PI) * 0.5;
      const drawSize = this.size * popScale;
      
      ctx.font = `800 ${drawSize + 6}px 'VT323', monospace`;
      ctx.fillStyle = '#ffb703'; // Gold crit text
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      
      // Random subtle shake
      const sx = screenX + (Math.random() - 0.5) * 4;
      const sy = screenY + (Math.random() - 0.5) * 4;
      
      ctx.strokeText(this.text, sx, sy);
      ctx.fillText(this.text, sx, sy);
    } else {
      ctx.font = `600 ${this.size + 2}px 'VT323', monospace`;
      ctx.fillStyle = this.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(this.text, screenX, screenY);
      ctx.fillText(this.text, screenX, screenY);
    }
    
    ctx.restore();
  }
}

export class FloatingTextManager {
  constructor(maxTexts = 200) {
    this.pool = Array.from({ length: maxTexts }, () => new FloatingText());
  }

  spawn(x, y, text, color = '#ffffff', isCrit = false, size = 16) {
    const textObj = this.pool.find(t => !t.active);
    if (textObj) {
      textObj.init(x, y, text, color, isCrit, size);
    }
  }

  update(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].update(dt);
      }
    }
  }

  draw(ctx, camera) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].draw(ctx, camera);
      }
    }
  }
}
