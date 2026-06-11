// Survivors Arena Enemy and Spawning Systems
import { ENEMY_TYPES, SCALING_RULES, BOSS_CADENCE_SECS } from './config.js';
import { dist, distSq, randomRange, clamp } from './utils.js';
import { audio } from './audio.js';

class Enemy {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;

    this.type = 'basic';
    this.spriteKey = 'enemy';

    this.hp = 20;
    this.maxHp = 20;
    this.damage = 5;
    this.speed = 120;
    this.xp = 1;
    
    this.radius = 16;
    this.spriteSize = 48;

    this.knockbackX = 0;
    this.knockbackY = 0;

    this.facing = 1;
    this.hitFlashTimer = 0;
    
    this.isBoss = false;
    this.stats = {}; // hold individual config
    
    this.shieldHitCooldown = 0;
    this.flameHitCooldown = 0;
    this.sporeHitCooldown = 0;
    this.slowTimer = 0;
  }

  init(config, x, y, hpMult, dmgMult, speedMult) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;

    this.type = config.type;
    this.spriteKey = config.spriteKey;
    this.isBoss = !!config.isBoss;

    this.maxHp = Math.round(config.hp * hpMult);
    this.hp = this.maxHp;
    this.damage = Math.round(config.damage * dmgMult);
    this.speed = config.speed * speedMult;
    this.xp = config.xp;
    
    this.radius = config.size;
    this.spriteSize = config.size * 2.2; // slight scale for visual clearance
    this.stats = config;

    this.knockbackX = 0;
    this.knockbackY = 0;
    this.facing = 1;
    this.hitFlashTimer = 0;
    this.active = true;

    this.shieldHitCooldown = 0;
    this.flameHitCooldown = 0;
    this.sporeHitCooldown = 0;
    this.slowTimer = 0;
    this.isElite = false;

    // Status effects reset
    this.burnTimer = 0;
    this.burnDamage = 0;
    this.burnTickTimer = 0;
    this.poisonTimer = 0;
    this.poisonDamage = 0;
    this.poisonTickTimer = 0;
    this.poisonStacks = 0;
    this.freezeTimer = 0;

    // Custom behaviors
    this.explodingTimer = 0;
    this.rangedAttackTimer = 0;
    this.summonTimer = 0;
    this.bossMinionTimer = 0;
    this.bossShockwaveTimer = 0;
  }

  update(dt, player, spatialGrid, enemySystem) {
    if (!this.active) return;

    // Decay status effect timers
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt * 1000;
    if (this.slowTimer > 0) this.slowTimer -= dt;
    if (this.shieldHitCooldown > 0) this.shieldHitCooldown -= dt * 1000;
    if (this.flameHitCooldown > 0) this.flameHitCooldown -= dt * 1000;
    if (this.sporeHitCooldown > 0) this.sporeHitCooldown -= dt * 1000;

    // Burn tick damage (Napalm Core)
    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      this.burnTickTimer = (this.burnTickTimer || 0) - dt;
      if (this.burnTickTimer <= 0) {
        this.burnTickTimer = 1.0;
        this.takeDamage(this.burnDamage, enemySystem);
        enemySystem.gameManager.floatingTextManager.spawn(this.x, this.y - 12, `${this.burnDamage}`, '#ff5e00', false, 11);
        enemySystem.particleManager.spawnHitSparks(this.x, this.y, 0, -1, '#ff5e00');
      }
    }

    // Poison tick damage (Venom Core)
    if (this.poisonTimer > 0) {
      this.poisonTimer -= dt;
      this.poisonTickTimer = (this.poisonTickTimer || 0) - dt;
      if (this.poisonTickTimer <= 0) {
        this.poisonTickTimer = 1.0;
        const poisonDmgTotal = this.poisonDamage * (this.poisonStacks || 1);
        this.takeDamage(poisonDmgTotal, enemySystem);
        enemySystem.gameManager.floatingTextManager.spawn(this.x, this.y - 12, `${poisonDmgTotal}`, '#9ef01a', false, 11);
        enemySystem.particleManager.spawnGemSparkle(this.x, this.y, '#9ef01a');
      }
    }

    // Freeze effect halts movement (Glacial Core)
    let frozen = false;
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      frozen = true;
    }

    // Exploder self-destruct fuse phase
    let selfDestructing = false;
    if (this.explodingTimer > 0) {
      this.explodingTimer -= dt * 1000;
      selfDestructing = true;
      if (this.explodingTimer <= 0) {
        // Trigger self-destruct explosion
        this.active = false;
        enemySystem.handleEnemyDeath(this);
        return;
      }
    }

    // Calculate movement speed
    let currentSpeed = this.speed;
    if (frozen) {
      currentSpeed = 0;
    } else if (this.slowTimer > 0) {
      currentSpeed *= 0.70; // 30% slow
    }

    // Boss Phase speed boost
    if (this.isBoss) {
      const hpRatio = this.hp / this.maxHp;
      if (hpRatio < 0.30) {
        this.currentPhase = 3;
        currentSpeed = this.speed * 1.4; // Phase 3: +40% speed
      } else if (hpRatio < 0.70) {
        this.currentPhase = 2;
        currentSpeed = this.speed * 1.2; // Phase 2: +20% speed
      } else {
        this.currentPhase = 1;
      }
    }

    // Direction to player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    let moveX = 0;
    let moveY = 0;

    // Custom movement algorithms based on type
    if (d > 0.01 && !selfDestructing && !frozen) {
      if (this.type === 'ranged' && d < 280) {
        // Keep distance for ranged shooters
        if (d < 220) {
          moveX = -(dx / d) * currentSpeed;
          moveY = -(dy / d) * currentSpeed;
        } else {
          moveX = 0;
          moveY = 0;
        }
      } else if (this.type === 'summoner' && d < 380) {
        // Keep far distance for summoners
        if (d < 300) {
          moveX = -(dx / d) * currentSpeed;
          moveY = -(dy / d) * currentSpeed;
        } else {
          moveX = 0;
          moveY = 0;
        }
      } else {
        // Chase player
        moveX = (dx / d) * currentSpeed;
        moveY = (dy / d) * currentSpeed;
      }
    }

    // Decay knockback velocity
    this.knockbackX *= Math.pow(0.02, dt);
    this.knockbackY *= Math.pow(0.02, dt);

    // Combine forces: Chase player + Separation steering + Knockback
    let finalVx = moveX + (this.sepX || 0) * 80 + this.knockbackX;
    let finalVy = moveY + (this.sepY || 0) * 80 + this.knockbackY;

    if (this.type === 'torch') {
      finalVx = 0;
      finalVy = 0;
    }

    this.x += finalVx * dt;
    this.y += finalVy * dt;

    // Determine facing
    if (moveX !== 0) {
      this.facing = moveX > 0 ? 1 : -1;
    }

    // ==========================================
    // RANGED SHOOTING LOGIC
    // ==========================================
    if (this.type === 'ranged' && this.active && !frozen) {
      this.rangedAttackTimer = (this.rangedAttackTimer || 0) - dt * 1000;
      if (this.rangedAttackTimer <= 0) {
        this.rangedAttackTimer = 2500; // fire every 2.5s
        
        // Spawn enemy bullet towards player
        if (d > 10) {
          const bulletSpeed = 260;
          enemySystem.projectiles.push({
            x: this.x,
            y: this.y,
            vx: (dx / d) * bulletSpeed,
            vy: (dy / d) * bulletSpeed,
            radius: 6,
            damage: this.damage,
            life: 3500 // expires after 3.5s
          });
        }
      }
    }

    // ==========================================
    // SUMMONER LOGIC
    // ==========================================
    if (this.type === 'summoner' && this.active && !frozen) {
      this.summonTimer = (this.summonTimer || 0) - dt * 1000;
      if (this.summonTimer <= 0) {
        this.summonTimer = 4000; // summon every 4s
        
        // Spawn 2 minions near summoner
        for (let i = 0; i < 2; i++) {
          const offsetAngle = Math.random() * Math.PI * 2;
          const sx = this.x + Math.cos(offsetAngle) * 40;
          const sy = this.y + Math.sin(offsetAngle) * 40;
          enemySystem.spawnEnemy(
            ENEMY_TYPES.CRAWLER,
            sx, sy,
            enemySystem.currentHpMult,
            enemySystem.currentDmgMult,
            enemySystem.currentSpeedMult
          );
        }
        
        enemySystem.particleManager.spawnExplosion(this.x, this.y, '#7b2cbf', 5, 80);
      }
    }

    // ==========================================
    // EXPLODER COLLISION DETECT (PRE-DETONATION)
    // ==========================================
    if (this.type === 'exploder' && this.active && !selfDestructing) {
      if (d < this.radius + player.radius + 15) {
        this.explodingTimer = 300; // 0.3s fuse flash
        this.hitFlashTimer = 300; // blink flash
        enemySystem.particleManager.spawnTelegraphRing(this.x, this.y, 110);
      }
    }

    // ==========================================
    // BOSS SPECIAL ABILITIES BY PHASE
    // ==========================================
    if (this.isBoss && this.active && !frozen) {
      if (this.currentPhase === 2) {
        // Phase 2: summon minions every 8s
        this.bossMinionTimer = (this.bossMinionTimer || 0) - dt * 1000;
        if (this.bossMinionTimer <= 0) {
          this.bossMinionTimer = 8000;
          // Spawn a ring of 4 minions
          for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI * 2) / 4;
            const sx = this.x + Math.cos(angle) * 120;
            const sy = this.y + Math.sin(angle) * 120;
            enemySystem.spawnEnemy(
              ENEMY_TYPES.MID,
              sx, sy,
              enemySystem.currentHpMult,
              enemySystem.currentDmgMult,
              enemySystem.currentSpeedMult
            );
          }
          enemySystem.gameManager.floatingTextManager.spawn(this.x, this.y - 70, 'MINIONS SUMMONED!', '#ff0055', true, 16);
          enemySystem.gameManager.triggerScreenShake(8, 0.3);
        }
      } else if (this.currentPhase === 3) {
        // Phase 3: boss releases shockwaves every 3.5s
        this.bossShockwaveTimer = (this.bossShockwaveTimer || 0) - dt * 1000;
        
        // Telegraph 1 second before shockwave
        if (this.bossShockwaveTimer <= 1000 && !this.shockwaveTelegraphed) {
          this.shockwaveTelegraphed = true;
          enemySystem.particleManager.spawnTelegraphRing(this.x, this.y, 250);
        }

        if (this.bossShockwaveTimer <= 0) {
          this.bossShockwaveTimer = 3500;
          this.shockwaveTelegraphed = false;
          
          enemySystem.particleManager.spawnExplosion(this.x, this.y, '#ff3c00', 30, 350);
          enemySystem.gameManager.triggerScreenShake(15, 0.6);
          audio.playBossSpawn();

          // Damage player if close
          if (d < 250) {
            const shockwaveDmg = Math.round(this.damage * 0.8);
            player.takeDamage(shockwaveDmg);
            enemySystem.gameManager.floatingTextManager.spawn(player.x, player.y - 20, `-${shockwaveDmg} (Shockwave)`, '#ff0033', true, 20);
          }
        }
      }
    }
  }

  applyKnockback(kx, ky) {
    this.knockbackX = kx;
    this.knockbackY = ky;
  }

  takeDamage(amount, enemySystem = null) {
    if (!this.active) return false;
    
    this.hp -= amount;
    this.hitFlashTimer = 100; // 100ms flash

    if (this.isBoss && enemySystem) {
      enemySystem.gameManager.player.gainFrenzy(amount * 0.05); // Gain 5 frenzy per 100 dmg
      const hpRatio = this.hp / this.maxHp;
      let nextPhase = 1;
      if (hpRatio < 0.30) nextPhase = 3;
      else if (hpRatio < 0.70) nextPhase = 2;

      if (nextPhase > (this.currentPhase || 1)) {
        this.currentPhase = nextPhase;
        
        enemySystem.gameManager.triggerScreenShake(15, 0.5);
        audio.playBossSpawn();
        
        enemySystem.gameManager.floatingTextManager.spawn(
          this.x, this.y - 70,
          `BOSS ENRAGED: PHASE ${nextPhase}!`,
          '#ff0055',
          true,
          22
        );
        
        if (nextPhase === 2) {
          for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI * 2) / 4;
            const sx = this.x + Math.cos(angle) * 100;
            const sy = this.y + Math.sin(angle) * 100;
            enemySystem.spawnEnemy(
              ENEMY_TYPES.MID,
              sx, sy,
              enemySystem.currentHpMult,
              enemySystem.currentDmgMult,
              enemySystem.currentSpeedMult
            );
          }
        } else if (nextPhase === 3) {
          enemySystem.particleManager.spawnExplosion(this.x, this.y, '#ff3c00', 35, 350);
        }

        enemySystem.gameManager.triggerHitStop(80); // 80ms hitstop
      }
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.active = false;
      return true; // indicates death
    }
    return false;
  }

  draw(ctx, camera, sprite) {
    if (!this.active) return;

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(this.facing, 1);

    // Filter effects for hit flash or elite glows
    if (this.hitFlashTimer > 0) {
      if (this.type === 'exploder') {
        const flashRate = Math.floor(performance.now() / 60) % 2 === 0;
        ctx.filter = flashRate ? 'brightness(3) saturate(0)' : 'hue-rotate(0deg) saturate(2) brightness(0.8) sepia(1) red';
      } else {
        ctx.filter = 'brightness(3) saturate(0)'; // solid white flash
      }
    } else if (this.isBoss) {
      ctx.filter = 'drop-shadow(0 0 16px rgba(255, 0, 85, 0.85))';
    } else if (this.isElite) {
      ctx.filter = 'drop-shadow(0 0 12px rgba(255, 94, 0, 0.85))'; // Orange/red elite aura
    }

    // Ground Shadow
    if (this.type !== 'torch') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, this.radius, this.radius * 1.2, this.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.type === 'torch') {
      // Draw a brown stick/base
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(-3, 0, 6, 18);
      
      // Draw a flickering orange/yellow flame
      const flick = Math.sin(performance.now() * 0.02) * 2;
      ctx.fillStyle = '#ff5e00';
      ctx.beginPath();
      ctx.arc(0, -6 + flick / 2, 7 + flick, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(0, -4 + flick / 2, 3.5 + flick / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (sprite && sprite.complete) {
      ctx.drawImage(
        sprite,
        -this.spriteSize / 2,
        -this.spriteSize / 2,
        this.spriteSize,
        this.spriteSize
      );
    } else {
      // Fallback rendering
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      
      // Color coding based on type
      if (this.isBoss) {
        ctx.fillStyle = '#ff0055';
        ctx.strokeStyle = '#ffd700';
      } else if (this.type === 'tank' || this.type === 'brute') {
        ctx.fillStyle = '#9b5de5';
        ctx.strokeStyle = '#f15bb5';
      } else if (this.type === 'mid' || this.type === 'ranged') {
        ctx.fillStyle = '#f15bb5';
        ctx.strokeStyle = '#00f5d4';
      } else if (this.type === 'hunter') {
        ctx.fillStyle = '#ff5e00';
        ctx.strokeStyle = '#ffff00';
      } else if (this.type === 'summoner') {
        ctx.fillStyle = '#7209b7';
        ctx.strokeStyle = '#f72585';
      } else if (this.type === 'exploder') {
        ctx.fillStyle = '#f72585';
        ctx.strokeStyle = '#ff9e00';
      } else {
        ctx.fillStyle = '#00bbff';
        ctx.strokeStyle = '#ffffff';
      }

      ctx.lineWidth = this.isBoss ? 4 : 2;
      ctx.fill();
      ctx.stroke();

      // Angry eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(4, -6, 4, 4);
    }

    ctx.restore();

    // Small local HP bar for bosses or if damaged
    if (this.hp < this.maxHp && !this.isBoss) {
      const barW = this.radius * 1.5;
      const barH = 3;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(screenX - barW / 2, screenY - this.radius - 6, barW, barH);
      ctx.fillStyle = '#ff3366';
      ctx.fillRect(screenX - barW / 2, screenY - this.radius - 6, barW * (this.hp / this.maxHp), barH);
    }
  }
}

export class EnemySystem {
  constructor(maxEnemies = 600) {
    this.pool = Array.from({ length: maxEnemies }, () => new Enemy());
    this.spawnTimer = 0;
    this.totalKills = 0;
    
    this.activeBoss = null;
    this.pickupSystem = null;
    this.particleManager = null;
    this.gameManager = null; // linked later
    
    // Wave tuning
    this.baseSpawnInterval = 1200; // start spawning basic every 1.2 seconds
    this.timeElapsed = 0;

    // Enemy projectiles and elite spawning
    this.projectiles = [];
    this.eliteSpawnTimer = 20.0; // spawn elites every 20-40s for adrenaline progression
    this.currentHpMult = 1.0;
    this.currentDmgMult = 1.0;
    this.currentSpeedMult = 1.0;
  }

  init(pickupSystem, particleManager, gameManager) {
    this.pickupSystem = pickupSystem;
    this.particleManager = particleManager;
    this.gameManager = gameManager;
  }

  reset() {
    this.pool.forEach(e => e.active = false);
    this.spawnTimer = 0;
    this.totalKills = 0;
    this.activeBoss = null;
    this.timeElapsed = 0;
    this.projectiles.length = 0;
    this.eliteSpawnTimer = 20.0;
    this.torchSpawnTimer = 3.0; // spawn first torch after 3s
  }

  getActiveEnemies() {
    return this.pool.filter(e => e.active);
  }

  update(dt, player, spatialGrid) {
    this.timeElapsed += dt;
    const currentMinutes = Math.floor(this.timeElapsed / 60);

    // 1. Calculate difficulty scaling multipliers
    const hpMult = 1.0 + currentMinutes * SCALING_RULES.hp;
    const dmgMult = 1.0 + currentMinutes * SCALING_RULES.damage;
    const speedMult = 1.0 + currentMinutes * SCALING_RULES.speed;
    const rateMult = 1.0 + currentMinutes * SCALING_RULES.spawnRate;

    this.currentHpMult = hpMult;
    this.currentDmgMult = dmgMult;
    this.currentSpeedMult = speedMult;

    // Apply Blood Moon adrenaline event multiplier
    const isBloodMoon = this.gameManager.activeEvent === 'BLOOD_MOON';
    const activeRateMult = isBloodMoon ? rateMult * 1.5 : rateMult;
    const activeSpeedMult = isBloodMoon ? speedMult * 1.35 : speedMult;

    // Spawn interval decreases as rate multiplier rises
    const currentSpawnInterval = Math.max(150, this.baseSpawnInterval / activeRateMult);

    // 2. Spawn timer processing
    this.spawnTimer -= dt * 1000;
    if (this.spawnTimer <= 0) {
      this.spawnWave(player, hpMult, dmgMult, activeSpeedMult);
      this.spawnTimer = currentSpawnInterval;
    }

    // Spawn static torches periodically
    this.torchSpawnTimer -= dt;
    if (this.torchSpawnTimer <= 0) {
      this.torchSpawnTimer = randomRange(8, 12);
      const spawnAngle = Math.random() * Math.PI * 2;
      const spawnRadius = randomRange(180, 450);
      const tx = player.x + Math.cos(spawnAngle) * spawnRadius;
      const ty = player.y + Math.sin(spawnAngle) * spawnRadius;
      this.spawnEnemy(ENEMY_TYPES.TORCH, tx, ty, 1.0, 1.0, 1.0);
    }

    // 3. Spawning Elites periodically
    this.eliteSpawnTimer -= dt;
    if (this.eliteSpawnTimer <= 0) {
      this.eliteSpawnTimer = randomRange(25, 40); // spawn waves every 25-40s
      this.spawnEliteWave(player, hpMult, dmgMult, activeSpeedMult);
    }

    // 4. Update enemy projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt * 1000;
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // check collision against player
      const dx = p.x - player.x;
      const dy = p.y - player.y;
      const dSq = dx * dx + dy * dy;
      const touchDist = p.radius + player.radius;
      if (dSq < touchDist * touchDist) {
        const damageDealt = player.takeDamage(p.damage);
        if (damageDealt > 0) {
          audio.playHit();
          this.particleManager.spawnExplosion(player.x, player.y, '#ff0033', 6, 100);
          this.gameManager.floatingTextManager.spawn(player.x, player.y - 15, `-${damageDealt}`, '#ff3366', false, 18);
        }
        this.projectiles.splice(i, 1);
      }
    }

    // 5. Separation pass using Spatial Grid
    // Compute separation vectors for all active enemies and store directly on objects
    const activeEnemies = this.getActiveEnemies();

    for (let i = 0; i < activeEnemies.length; i++) {
      const e = activeEnemies[i];
      let sepX = 0;
      let sepY = 0;
      let count = 0;

      // Query spatial grid for neighbors within separation zone (radius * 1.5)
      const queryRadius = e.radius * 1.6;
      const neighbors = spatialGrid.getNearby(e.x, e.y, queryRadius);

      for (let j = 0; j < neighbors.length; j++) {
        const other = neighbors[j];
        if (other === e || !other.active) continue;

        const dx = e.x - other.x;
        const dy = e.y - other.y;
        const dSq = dx * dx + dy * dy;
        const minDist = e.radius + other.radius;

        // Fast squared distance pre-check (guards against exact overlaps at center)
        if (dSq < minDist * minDist && dSq > 0.001) {
          const d = Math.sqrt(dSq);
          const force = (minDist - d) / minDist;
          sepX += (dx / d) * force;
          sepY += (dy / d) * force;
          count++;
        }
      }

      if (count > 0) {
        sepX /= count;
        sepY /= count;
        // Damp separation for bosses
        if (e.isBoss) {
          sepX *= 0.1;
          sepY *= 0.1;
        } else {
          sepX *= e.stats.separationWeight;
          sepY *= e.stats.separationWeight;
        }
      }

      e.sepX = sepX;
      e.sepY = sepY;
    }

    // 6. Update and move enemies
    for (let i = 0; i < activeEnemies.length; i++) {
      const e = activeEnemies[i];
      
      e.update(dt, player, spatialGrid, this);

      // Check player contact collision
      const dSq = distSq(e.x, e.y, player.x, player.y);
      const touchDist = e.radius + player.radius;
      if (dSq < touchDist * touchDist) {
        if (e.type === 'exploder') {
          // Suicide explosion!
          e.active = false;
          this.handleEnemyDeath(e);
        } else {
          // Player takes damage
          const damageDealt = player.takeDamage(e.damage);
          if (damageDealt > 0) {
            audio.playHit();
            // Spawn blood particle splash
            this.particleManager.spawnExplosion(player.x, player.y, '#ff0033', 12, 180);
            this.gameManager.floatingTextManager.spawn(player.x, player.y - 15, `-${damageDealt}`, '#ff3366', false, 18);
          }
        }
      }
    }
  }

  spawnWave(player, hpMult, dmgMult, speedMult) {
    const currentMinutes = Math.floor(this.timeElapsed / 60);

    // Spawn 1 to 5 enemies depending on scaling wave schedule
    const spawnCount = Math.min(8, 1 + Math.floor(currentMinutes / 1.5) + (this.gameManager.activeEvent === 'BLOOD_MOON' ? 3 : 0));
    
    for (let s = 0; s < spawnCount; s++) {
      // Pick enemy type configuration based on minute schedule
      let config = ENEMY_TYPES.BASIC;
      
      const roll = Math.random();
      if (currentMinutes >= 5) {
        if (roll < 0.10) config = ENEMY_TYPES.BRUTE;
        else if (roll < 0.25) config = ENEMY_TYPES.SUMMONER;
        else if (roll < 0.45) config = ENEMY_TYPES.RANGED;
        else if (roll < 0.70) config = ENEMY_TYPES.EXPLODER;
        else config = ENEMY_TYPES.HUNTER;
      } else if (currentMinutes >= 3) {
        if (roll < 0.12) config = ENEMY_TYPES.SUMMONER;
        else if (roll < 0.32) config = ENEMY_TYPES.RANGED;
        else if (roll < 0.55) config = ENEMY_TYPES.EXPLODER;
        else config = ENEMY_TYPES.HUNTER;
      } else if (currentMinutes >= 1) {
        if (roll < 0.30) config = ENEMY_TYPES.HUNTER;
        else if (roll < 0.50) config = ENEMY_TYPES.EXPLODER;
        else config = ENEMY_TYPES.MID;
      } else {
        if (roll < 0.25) config = ENEMY_TYPES.HUNTER;
        else config = ENEMY_TYPES.BASIC;
      }

      // Spawn location: circular ring just outside viewport limits (width 1280, height 720)
      // View radius is approx 750px from player center
      const spawnAngle = Math.random() * Math.PI * 2;
      const spawnRadius = randomRange(750, 900);
      const sx = player.x + Math.cos(spawnAngle) * spawnRadius;
      const sy = player.y + Math.sin(spawnAngle) * spawnRadius;

      this.spawnEnemy(config, sx, sy, hpMult, dmgMult, speedMult);
    }
  }

  spawnEliteWave(player, hpMult, dmgMult, speedMult) {
    const count = Math.floor(randomRange(1, 4));
    const types = [ENEMY_TYPES.BASIC, ENEMY_TYPES.MID, ENEMY_TYPES.TANK, ENEMY_TYPES.HUNTER, ENEMY_TYPES.BRUTE];
    
    for (let i = 0; i < count; i++) {
      const config = types[Math.floor(Math.random() * types.length)];
      const angle = Math.random() * Math.PI * 2;
      const sx = player.x + Math.cos(angle) * 750;
      const sy = player.y + Math.sin(angle) * 750;
      
      const enemy = this.pool.find(e => !e.active);
      if (enemy) {
        enemy.init(config, sx, sy, hpMult, dmgMult, speedMult);
        enemy.isElite = true;
        enemy.radius *= 1.35;
        enemy.spriteSize *= 1.35;
        enemy.maxHp = Math.round(enemy.maxHp * 1.8);
        enemy.hp = enemy.maxHp;
        enemy.damage = Math.round(enemy.damage * 1.5);
        enemy.speed *= 1.15;
      }
    }

    this.gameManager.floatingTextManager.spawn(
      player.x, player.y - 65,
      'ELITE WAVE INCOMING!',
      '#ff5e00',
      true,
      20
    );
    this.gameManager.triggerScreenShake(10, 0.3);
  }

  spawnEnemy(config, x, y, hpMult, dmgMult, speedMult) {
    const enemy = this.pool.find(e => !e.active);
    if (enemy) {
      enemy.init(config, x, y, hpMult, dmgMult, speedMult);
    }
  }

  spawnBoss(player, hpMult, dmgMult, speedMult) {
    // Spawn boss at a random angle
    const angle = Math.random() * Math.PI * 2;
    const sx = player.x + Math.cos(angle) * 700;
    const sy = player.y + Math.sin(angle) * 700;

    const bossConfig = ENEMY_TYPES.BOSS;
    const enemy = this.pool.find(e => !e.active);
    if (enemy) {
      enemy.init(bossConfig, sx, sy, hpMult, dmgMult, speedMult);
      this.activeBoss = enemy;
      audio.playBossSpawn();
      
      // Boss entry screen juice
      this.gameManager.triggerScreenShake(20, 0.7);
      this.gameManager.floatingTextManager.spawn(player.x, player.y - 80, 'BOSS WARNING: ELITE GUARDIAN ARRIVED!', '#ff003c', true, 22);
    }
  }

  handleEnemyDeath(enemy) {
    if (enemy.type === 'torch') {
      // Spawns yellow dust burst
      this.particleManager.spawnExplosion(enemy.x, enemy.y, '#ffd700', 8, 80);
      
      // Roll drop: 15% Chicken, 10% Vacuum, 10% Nuke, 5% Freeze, 60% XP Gem
      const roll = Math.random();
      if (roll < 0.15) {
        this.pickupSystem.spawnUtility(enemy.x, enemy.y, 'chicken');
      } else if (roll < 0.25) {
        this.pickupSystem.spawnUtility(enemy.x, enemy.y, 'vacuum');
      } else if (roll < 0.35) {
        this.pickupSystem.spawnUtility(enemy.x, enemy.y, 'nuke');
      } else if (roll < 0.40) {
        this.pickupSystem.spawnUtility(enemy.x, enemy.y, 'freeze');
      } else {
        this.pickupSystem.spawnGem(enemy.x, enemy.y, Math.floor(randomRange(5, 10)));
      }
      return;
    }

    this.totalKills += 1;

    // Calculate and award score
    let scoreBase = enemy.maxHp * 5;
    if (enemy.isBoss) scoreBase *= 10;
    else if (enemy.isElite) scoreBase *= 4;
    const finalScore = this.gameManager.addScore(scoreBase);
    
    if (enemy.isBoss || enemy.isElite) {
       this.gameManager.floatingTextManager.spawn(enemy.x, enemy.y - 40, `+${finalScore} PTS`, '#ffd700', true, 18);
    }

    // Spawn combo increments on player controller
    this.gameManager.player.onKill();
    if (enemy.isElite) {
      this.gameManager.player.gainFrenzy(10);
      this.gameManager.triggerHitStop(20); // satisfying hit stop on elite kill
    }

    // Enhanced Death VFX burst
    if (enemy.isBoss) {
      this.particleManager.spawnBossDeathCascade(enemy.x, enemy.y);
    } else {
      this.particleManager.spawnDeathBurst(enemy.x, enemy.y, enemy.type, enemy.isBoss, enemy.isElite);
    }
    
    const eff = this.gameManager.player.getEffectiveStats();
    if (this.gameManager.player.frenzyMode && eff.frenzyExplosion && !enemy.isBoss) {
       this.particleManager.spawnExplosion(enemy.x, enemy.y, '#00ffff', 15, 80);
       const nearbyEnemies = this.getActiveEnemies();
       for (let j = 0; j < nearbyEnemies.length; j++) {
         const other = nearbyEnemies[j];
         if (other !== enemy) {
           const dx = enemy.x - other.x;
           const dy = enemy.y - other.y;
           if (dx * dx + dy * dy < 100 * 100) {
             other.takeDamage(eff.baseDamage * 0.5, this);
           }
         }
       }
    }

    // Exploder custom suicide bomb mechanics
    if (enemy.type === 'exploder') {
      audio.playHit();
      this.particleManager.spawnExplosion(enemy.x, enemy.y, '#ff4500', 35, 250);
      
      // Blast player
      const player = this.gameManager.player;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < 110 * 110) {
        const playerDmg = Math.round(enemy.damage * 1.4);
        player.takeDamage(playerDmg);
        this.gameManager.floatingTextManager.spawn(player.x, player.y - 20, `-${playerDmg}`, '#ff0033', true, 22);
        this.gameManager.triggerScreenShake(15, 0.4);
      }

      // Blast nearby enemies (friendly fire)
      const nearbyEnemies = this.getActiveEnemies();
      for (let j = 0; j < nearbyEnemies.length; j++) {
        const other = nearbyEnemies[j];
        if (other === enemy || !other.active) continue;
        const dxOther = enemy.x - other.x;
        const dyOther = enemy.y - other.y;
        const dSqOther = dxOther * dxOther + dyOther * dyOther;
        if (dSqOther < 100 * 100) {
          other.takeDamage(Math.round(enemy.damage * 1.2), this);
        }
      }
    }

    // Drop Rewards
    let xpVal = enemy.xp;
    // Event multiplier
    if (this.gameManager.activeEvent === 'BLOOD_MOON') xpVal *= 2;
    if (enemy.isElite) xpVal *= 3;

    if (enemy.isBoss) {
      this.gameManager.triggerScreenShake(25, 1.2);
      this.activeBoss = null;
      
      // Trigger Magnet Burst: pull all XP gems instantly on boss death
      this.pickupSystem.triggerMagnetBurst(this.gameManager.player);

      // Drop Elite Chest items
      this.pickupSystem.spawnChest(enemy.x, enemy.y);
    } else if (enemy.isElite) {
      // Spawn 3 gems
      for (let g = 0; g < 3; g++) {
        const ox = enemy.x + randomRange(-15, 15);
        const oy = enemy.y + randomRange(-15, 15);
        this.pickupSystem.spawnGem(ox, oy, xpVal);
      }
      // 20% chance to drop chest
      if (Math.random() < 0.20) {
        this.pickupSystem.spawnChest(enemy.x, enemy.y);
      }
      this.gameManager.triggerScreenShake(8, 0.25);
    } else {
      // Normal XP Gem drop
      this.pickupSystem.spawnGem(enemy.x, enemy.y, xpVal);
    }
  }

  draw(ctx, camera, spritesMap) {
    // 1. Draw active enemies
    for (let i = 0; i < this.pool.length; i++) {
      const e = this.pool[i];
      if (e.active) {
        const sprite = spritesMap[e.spriteKey];
        e.draw(ctx, camera, sprite);
      }
    }

    // 2. Draw enemy projectiles
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      const screenX = p.x - camera.x;
      const screenY = p.y - camera.y;

      ctx.save();
      ctx.fillStyle = '#ff3c00'; // fiery red enemy bullet
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.filter = 'drop-shadow(0 0 5px #ff3c00)';
      
      ctx.beginPath();
      ctx.arc(screenX, screenY, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}
