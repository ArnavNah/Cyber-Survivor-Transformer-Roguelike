// Survivors Arena Main Game Manager
import { ASSETS, BOSS_CADENCE_SECS, EVOLUTION_MILESTONES } from './config.js';
import { PlayerController } from './player.js';
import { WeaponSystem } from './weapons.js';
import { EnemySystem } from './enemies.js';
import { PickupSystem } from './pickups.js';
import { SpatialGrid, ParticleManager, FloatingTextManager, randomRange } from './utils.js';
import { UIManager } from './ui.js';
import { audio } from './audio.js';

class GameManager {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Subsystem instances
    this.player = new PlayerController();
    this.weapons = new WeaponSystem();
    this.enemies = new EnemySystem();
    this.pickups = new PickupSystem();
    this.spatialGrid = new SpatialGrid(120); // 120px grid cells
    this.particleManager = new ParticleManager(400);
    this.floatingTextManager = new FloatingTextManager(100);
    this.ui = new UIManager();

    // Asset map
    this.sprites = {};
    
    // Logical screen sizing
    this.logicalWidth = 1280;
    this.logicalHeight = 720;
    
    // Keyboard inputs
    this.keys = {};

    // Camera space
    this.camera = { x: 0, y: 0 };
    
    // Screenshake state
    this.shakeDuration = 0;
    this.shakeMagnitude = 0;
    
    // Gameloop stats
    this.isPaused = false;
    this.isStarted = false;
    this.isGameOver = false;

    this.score = 0;
    this.surviveTime = 0;
    this.lastTime = 0;

    // Debugging controls
    this.debugMode = false;
    this.godMode = false;
    this.fps = 0;
    this.fpsTimer = 0;
    this.fpsCount = 0;
    
    // Boss track
    this.lastBossSpawnMinute = 0;

    // Adrenaline events & hit stop states
    this.eventTimer = 75.0;
    this.activeEvent = null;
    this.activeEventTimer = 0;
    this.hitStopTimer = 0;
  }

  init() {
    this.setupCanvas();
    this.loadAssets();
    this.setupInput();
    
    // Link player reference to game
    this.player.game = this;

    // Link player combo callbacks
    this.player.onComboBuff = (buffName, comboCount) => {
      this.floatingTextManager.spawn(
        this.player.x,
        this.player.y - 60,
        `${comboCount} COMBO: ${buffName.toUpperCase()}!`,
        '#ffd700',
        true,
        18
      );
      audio.playGem();
      this.triggerScreenShake(6, 0.25);
    };
    
    this.player.onComboBreak = () => {
      this.floatingTextManager.spawn(
        this.player.x,
        this.player.y - 60,
        `Combo Lost!`,
        '#ff3366',
        true,
        14
      );
    };

    // Connect systems
    this.enemies.init(this.pickups, this.particleManager, this);
    this.pickups.init(this.particleManager, this.floatingTextManager);
    this.ui.init(this);
    
    this.ui.showStartScreen();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
  }

  setupCanvas() {
    this.canvas.width = this.logicalWidth;
    this.canvas.height = this.logicalHeight;
    
    // Disable image smoothing for crisp retro pixel art
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.mozImageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.msImageSmoothingEnabled = false;
  }

  resizeCanvas() {
    // Keep aspect ratio 16:9 while fitting the window
    const container = document.getElementById('game-container');
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = Math.min(w / this.logicalWidth, h / this.logicalHeight);
    
    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'center center';
  }

  loadAssets() {
    let loadedCount = 0;
    const totalAssets = Object.keys(ASSETS).length;
    
    Object.keys(ASSETS).forEach(key => {
      const img = new Image();
      img.src = ASSETS[key];
      img.onload = () => {
        this.sprites[key] = img;
        loadedCount++;
        if (loadedCount === totalAssets) {
          console.log('All image sprites preloaded successfully.');
        }
      };
      img.onerror = () => {
        console.warn(`Asset failed to load: ${ASSETS[key]}. Fallback color rendering enabled.`);
        loadedCount++;
      };
    });
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      this.keys[key] = true;
      
      // F3 triggers developer console debug overlay
      if (e.key === 'F3') {
        e.preventDefault();
        this.debugMode = !this.debugMode;
        this.ui.toggleDebugPanel(this.debugMode);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.keys[key] = false;
    });

    // Hook up debug buttons
    document.getElementById('db-level').addEventListener('click', () => {
      this.player.gainXP(this.player.xpNeeded - this.player.xp);
      this.triggerLevelUp();
    });

    document.getElementById('db-boss').addEventListener('click', () => {
      const min = Math.floor(this.surviveTime / 60);
      this.enemies.spawnBoss(this.player, 1.0 + min * 0.1, 1.0 + min * 0.05, 1.0 + min * 0.02);
    });

    document.getElementById('db-god').addEventListener('click', (e) => {
      this.godMode = !this.godMode;
      e.target.style.background = this.godMode ? '#00ffcc' : '#222';
      e.target.style.color = this.godMode ? '#000' : '#fff';
      if (this.godMode) {
        this.player.hp = this.player.stats.maxHp;
      }
    });

    document.getElementById('db-kill').addEventListener('click', () => {
      const active = this.enemies.getActiveEnemies();
      active.forEach(enemy => {
        this.enemies.handleEnemyDeath(enemy);
        enemy.active = false;
      });
    });
  }

  startGame() {
    // Reset all parameters
    this.player.reset();
    this.weapons.reset();
    this.enemies.reset();
    this.pickups.reset();
    
    this.surviveTime = 0;
    this.score = 0;
    this.isPaused = false;
    this.isStarted = true;
    this.isGameOver = false;
    this.lastTime = 0; // Initialize to 0 so loop() can sync with requestAnimationFrame time
    this.lastBossSpawnMinute = 0;

    // Reset event manager & hit stop
    this.eventTimer = 75.0;
    this.activeEvent = null;
    this.activeEventTimer = 0;
    this.hitStopTimer = 0;

    // Hide event visuals if active from previous game
    const banner = document.getElementById('event-banner');
    if (banner) banner.classList.add('hidden');
    const overlay = document.getElementById('blood-moon-overlay');
    if (overlay) overlay.classList.add('hidden');

    // Reset camera to center
    this.camera.x = -this.logicalWidth / 2;
    this.camera.y = -this.logicalHeight / 2;

    // Trigger game loop frame request
    requestAnimationFrame((t) => this.loop(t));
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.lastTime = performance.now(); // reset timer to prevent time jumps
  }

  triggerLevelUp() {
    // Check and apply weapon evolutions milestones (Level 5, 10, 15, 20)
    const milestone = EVOLUTION_MILESTONES[this.player.level];
    if (milestone) {
      if (!this.player.appliedMilestones) this.player.appliedMilestones = {};
      if (!this.player.appliedMilestones[this.player.level]) {
        this.player.appliedMilestones[this.player.level] = true;
        milestone.apply(this.player);
        this.floatingTextManager.spawn(
          this.player.x,
          this.player.y - 45,
          `EVOLUTION: ${milestone.name}!`,
          '#ffd700',
          true,
          20
        );
      }
    }

    this.ui.showLevelUpScreen(this.player, (offer) => {
      this.player.applyUpgradeOffer(offer);
      this.particleManager.spawnLevelUpEffects(this.player.x, this.player.y);
    });
  }

  triggerChestReward() {
    this.ui.showChestScreen(this.player, () => {
      // Particles on return
      this.particleManager.spawnLevelUpEffects(this.player.x, this.player.y);
    });
  }

  triggerScreenShake(magnitude, duration) {
    this.shakeMagnitude = magnitude;
    this.shakeDuration = duration;
  }

  triggerHitStop(ms) {
    this.hitStopTimer = Math.max(this.hitStopTimer, ms);
  }

  triggerRandomEvent() {
    const events = ['BLOOD_MOON', 'FRENZY', 'TREASURE_RAIN'];
    const chosen = events[Math.floor(Math.random() * events.length)];
    this.activeEvent = chosen;

    const banner = document.getElementById('event-banner');
    const title = document.getElementById('event-title');
    const desc = document.getElementById('event-desc');
    const overlay = document.getElementById('blood-moon-overlay');

    if (banner) {
      banner.className = 'event-banner';
      banner.classList.remove('hidden');
    }

    if (chosen === 'BLOOD_MOON') {
      this.activeEventTimer = 30.0;
      if (banner) {
        banner.classList.add('blood-moon');
        title.innerText = 'BLOOD MOON ACTIVATED!';
        desc.innerText = 'Enemies spawn +50% faster & move faster. Double XP!';
      }
      if (overlay) overlay.classList.remove('hidden');
      audio.playBossSpawn();
      this.triggerScreenShake(10, 0.4);
    } else if (chosen === 'FRENZY') {
      this.activeEventTimer = 15.0;
      if (banner) {
        banner.classList.add('frenzy');
        title.innerText = 'FRENZY ACTIVATED!';
        desc.innerText = 'Your weapon fire rate is doubled!';
      }
      audio.playChestOpen();
      this.triggerScreenShake(5, 0.2);
    } else if (chosen === 'TREASURE_RAIN') {
      this.activeEventTimer = 15.0;
      if (banner) {
        banner.classList.add('treasure-rain');
        title.innerText = 'TREASURE RAIN!';
        desc.innerText = 'XP gems are falling from the sky!';
      }
      audio.playGem();

      const count = Math.floor(randomRange(12, 18));
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = randomRange(100, 350);
        const gx = this.player.x + Math.cos(angle) * dist;
        const gy = this.player.y + Math.sin(angle) * dist;
        const xpVal = Math.floor(randomRange(3, 8));
        this.pickups.spawnGem(gx, gy, xpVal);
      }
      this.triggerScreenShake(8, 0.3);
    }

    setTimeout(() => {
      if (this.activeEvent === chosen) {
        if (banner) banner.classList.add('hidden');
      }
    }, 5000);
  }

  endActiveEvent() {
    this.activeEvent = null;
    this.eventTimer = 75.0;

    const banner = document.getElementById('event-banner');
    if (banner) banner.classList.add('hidden');

    const overlay = document.getElementById('blood-moon-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  gameOver() {
    this.isGameOver = true;
    const min = Math.floor(this.surviveTime / 60).toString().padStart(2, '0');
    const sec = Math.floor(this.surviveTime % 60).toString().padStart(2, '0');
    const timeStr = `${min}:${sec}`;
    
    this.ui.showGameOverScreen(timeStr, this.player.level, this.enemies.totalKills, this.score);
  }

  addScore(basePoints) {
    const comboMult = this.player.comboCount > 0 ? (1 + this.player.comboCount * 0.1) : 1;
    let points = Math.round(basePoints * comboMult);
    if (this.player.frenzyMode) {
      points = Math.round(points * 1.5);
    }
    this.score += points;
    
    // Trigger visual pop on HUD
    const scoreVal = document.getElementById('score-value');
    if (scoreVal) {
      scoreVal.classList.remove('score-pop');
      void scoreVal.offsetWidth; // trigger reflow
      scoreVal.classList.add('score-pop');
    }
    
    return points;
  }

  loop(timestamp) {
    if (this.isGameOver) return;

    if (!this.lastTime) {
      this.lastTime = timestamp;
      requestAnimationFrame((t) => this.loop(t));
      return; // Skip first loop frame to align timing systems cleanly
    }
    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Cap delta time to prevent massive jumps during browser background freezing
    if (dt > 0.1) dt = 0.1;

    if (!this.isPaused) {
      if (this.hitStopTimer > 0) {
        this.hitStopTimer -= dt * 1000;
        this.render();
        this.updateFPS(dt);
      } else {
        this.update(dt);
        this.render();
        this.updateFPS(dt);
      }
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.surviveTime += dt;

    if (this.godMode) {
      this.player.hp = this.player.stats.maxHp;
    }

    // Update Event Manager Ticker
    if (this.activeEvent) {
      this.activeEventTimer -= dt;
      if (this.activeEventTimer <= 0) {
        this.endActiveEvent();
      }
    } else {
      this.eventTimer -= dt;
      if (this.eventTimer <= 0) {
        this.triggerRandomEvent();
      }
    }

    // 1. Process wave and boss milestone cadence (spawn boss every 5 minutes)
    const currentMinute = Math.floor(this.surviveTime / 60);
    const expectedBossCount = Math.floor(this.surviveTime / BOSS_CADENCE_SECS);
    
    if (expectedBossCount > this.lastBossSpawnMinute) {
      this.lastBossSpawnMinute = expectedBossCount;
      const hpMult = 1.0 + currentMinute * 0.15;
      const dmgMult = 1.0 + currentMinute * 0.08;
      const speedMult = 1.0 + currentMinute * 0.03;
      this.enemies.spawnBoss(this.player, hpMult, dmgMult, speedMult);
    }

    // 2. Build Spatial Grid with active enemies
    this.spatialGrid.clear();
    const activeEnemies = this.enemies.getActiveEnemies();
    for (let i = 0; i < activeEnemies.length; i++) {
      this.spatialGrid.insert(activeEnemies[i]);
    }

    // 3. Update player
    this.player.handleInput(this.keys);
    this.player.update(dt);

    if (this.player.hp <= 0) {
      this.gameOver();
      return;
    }
    
    if (this.player.frenzyMode && Math.random() < 0.2) {
      this.particleManager.spawn(this.player.x, this.player.y, (Math.random()-0.5)*10, (Math.random()-0.5)*10, '#00ffff', 4, 0.5);
    }

    // 4. Update enemies (steer, push, contact dmg)
    this.enemies.update(dt, this.player, this.spatialGrid);

    // 5. Update weapons (shooting, target aiming, collisions checking)
    this.weapons.update(dt, this.player, this.spatialGrid, this.particleManager, this.floatingTextManager, this.enemies);

    // 6. Update Pickups
    this.pickups.update(
      dt,
      this.player,
      null, // level up callback removed, handled below
      () => this.triggerChestReward()
    );

    // 6.5 Check for pending level ups
    if (this.player.pendingUpgrades > 0 && !this.isPaused) {
      this.player.pendingUpgrades--;
      this.triggerLevelUp();
    }

    // 7. Update VFX pools
    this.particleManager.update(dt);
    this.floatingTextManager.update(dt);

    // 8. Smooth Camera follow player (damping lerp)
    const targetCamX = this.player.x - this.logicalWidth / 2;
    const targetCamY = this.player.y - this.logicalHeight / 2;
    this.camera.x += (targetCamX - this.camera.x) * 6 * dt;
    this.camera.y += (targetCamY - this.camera.y) * 6 * dt;

    // 9. Update screenshake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);

    this.ctx.save();
    
    // Apply screenshake transform offsets
    if (this.shakeDuration > 0) {
      const dx = (Math.random() - 0.5) * this.shakeMagnitude;
      const dy = (Math.random() - 0.5) * this.shakeMagnitude;
      this.ctx.translate(dx, dy);
    }

    // 1. Draw tiled background relative to camera
    this.drawTiledBackground(this.ctx);

    // 2. Draw pickups (gems, chests)
    this.pickups.draw(this.ctx, this.camera, this.sprites);

    // 3. Draw enemies
    this.enemies.draw(this.ctx, this.camera, this.sprites);

    // 4. Draw weapons (projectiles)
    this.weapons.draw(this.ctx, this.camera, this.sprites['projectile'], this.player);

    // 5. Draw player
    this.player.draw(this.ctx, this.camera, this.sprites['hero']);

    // 6. Draw active powers (Shields, Garlic, Spores, Flames, Lasers)
    this.weapons.drawPowers(this.ctx, this.camera, this.player);

    // 7. Draw VFX particles
    this.particleManager.draw(this.ctx, this.camera);

    // 8. Draw floating text
    this.floatingTextManager.draw(this.ctx, this.camera);

    this.ctx.restore();

    // 8. Low HP Warning Vignette
    const eff = this.player.getEffectiveStats();
    if (this.player.hp / eff.maxHp < 0.3) {
      const pulse = Math.abs(Math.sin(performance.now() * 0.005));
      const grad = this.ctx.createRadialGradient(
        this.logicalWidth / 2, this.logicalHeight / 2, this.logicalHeight * 0.3,
        this.logicalWidth / 2, this.logicalHeight / 2, this.logicalHeight * 0.8
      );
      grad.addColorStop(0, 'rgba(255, 0, 0, 0)');
      grad.addColorStop(1, `rgba(255, 0, 0, ${0.2 + pulse * 0.3})`);
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
      
      if (!this.lastHeartbeat || performance.now() - this.lastHeartbeat > 800) {
         this.lastHeartbeat = performance.now();
         // Subtle heartbeat thud
         if (typeof audio !== 'undefined' && audio.playHit) audio.playHit();
      }
    }

    // 9. Update HUD Overlays
    this.ui.updateHUD(
      this.player,
      this.surviveTime,
      this.enemies.totalKills,
      this.enemies.activeBoss
    );
  }

  drawTiledBackground(ctx) {
    const bg = this.sprites['bg'];
    if (bg && bg.complete && bg.width > 0) {
      const W = bg.width;
      const H = bg.height;
      
      // Calculate viewport boundary cells (e.g. 2x2 grid overlapping the viewport)
      const startX = Math.floor(this.camera.x / W);
      const endX = Math.floor((this.camera.x + this.logicalWidth) / W);
      const startY = Math.floor(this.camera.y / H);
      const endY = Math.floor((this.camera.y + this.logicalHeight) / H);

      ctx.save();
      // Translate coordinates to draw tiles in world space
      ctx.translate(-this.camera.x, -this.camera.y);

      for (let cx = startX; cx <= endX; cx++) {
        for (let cy = startY; cy <= endY; cy++) {
          ctx.drawImage(bg, cx * W, cy * H, W, H);
        }
      }
      ctx.restore();
      
      // Add Parallax Grid over background
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 255, 0.05)';
      ctx.lineWidth = 2;
      const pGridGap = 150;
      // Scroll at 50% speed for parallax
      const pxOffset = -(this.camera.x * 0.5) % pGridGap;
      const pyOffset = -(this.camera.y * 0.5) % pGridGap;

      for (let x = pxOffset - pGridGap; x < this.logicalWidth + pGridGap; x += pGridGap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.logicalHeight);
        ctx.stroke();
      }
      for (let y = pyOffset - pGridGap; y < this.logicalHeight + pGridGap; y += pGridGap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.logicalWidth, y);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Fallback grid pattern if bg image fails
      ctx.save();
      ctx.fillStyle = '#0f0c22';
      ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      ctx.lineWidth = 1;
      
      const gridGap = 80;
      const startX = Math.floor(this.camera.x / gridGap) * gridGap;
      const startY = Math.floor(this.camera.y / gridGap) * gridGap;

      ctx.translate(-this.camera.x, -this.camera.y);

      for (let x = startX; x < startX + this.logicalWidth + gridGap; x += gridGap) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + this.logicalHeight + gridGap);
        ctx.stroke();
      }
      for (let y = startY; y < startY + this.logicalHeight + gridGap; y += gridGap) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + this.logicalWidth + gridGap, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  updateFPS(dt) {
    this.fpsTimer += dt;
    this.fpsCount++;
    if (this.fpsTimer >= 1.0) {
      this.fps = this.fpsCount;
      this.fpsCount = 0;
      this.fpsTimer -= 1.0;
      
      if (this.debugMode) {
        const activeEnemies = this.enemies.getActiveEnemies().length;
        const activeProj = this.weapons.pool.filter(p => p.active).length;
        const activePickups = this.pickups.getActivePickups().length;
        
        this.ui.updateDebug(this.fps, activeEnemies, activeProj, activePickups);
      }
    }
  }
}

// Instantiate and kick off loading
export const game = new GameManager();
window.game = game;
window.addEventListener('DOMContentLoaded', () => {
  game.init();
});
