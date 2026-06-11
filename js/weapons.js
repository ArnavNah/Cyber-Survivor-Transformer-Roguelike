import { distSq, randomRange, clamp } from './utils.js';
import { audio } from './audio.js';
import { SideWeaponManager } from './sideWeapons.js';

class Projectile {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    
    this.damage = 0;
    this.isCrit = false;
    
    this.radius = 8;
    this.baseRadius = 8;
    
    this.life = 0;
    this.maxLife = 0;

    this.pierce = 1;
    this.sizeScale = 1.0;
    
    // Milestone progress properties
    this.explosionRadius = 0;
    this.splitCount = 0;
    this.ricochetCount = 0;
    this.homingPower = 0;
    this.glowColor = null;
  }

  init(x, y, angle, damage, speed, lifetime, pierce, sizeScale, explosionRadius, splitCount, ricochetCount = 0, homingPower = 0, isCrit = false, glowColor = null) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    this.damage = damage;
    this.isCrit = isCrit;
    
    this.sizeScale = sizeScale;
    this.radius = this.baseRadius * sizeScale;
    
    this.life = lifetime;
    this.maxLife = lifetime;
    
    this.pierce = pierce;
    this.explosionRadius = explosionRadius;
    this.splitCount = splitCount;
    this.ricochetCount = ricochetCount;
    this.homingPower = homingPower;
    this.isCrit = isCrit;
    this.glowColor = glowColor;
    this.active = true;
  }

  update(dt, enemiesSystem) {
    if (!this.active) return;
    
    // Homing logic
    if (this.homingPower > 0 && enemiesSystem) {
       let target = null;
       let minDistSq = 400 * 400; // Search radius
       const activeEnemies = enemiesSystem.getActiveEnemies();
       for (let i = 0; i < activeEnemies.length; i++) {
         const e = activeEnemies[i];
         if (!e.active) continue;
         const dSq = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
         if (dSq < minDistSq) {
           minDistSq = dSq;
           target = e;
         }
       }
       if (target) {
         const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
         const currentAngle = Math.atan2(this.vy, this.vx);
         let angleDiff = angleToTarget - currentAngle;
         
         while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
         while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
         
         const turnRate = this.homingPower * dt * 3.0; // homing speed
         const newAngle = currentAngle + Math.max(-turnRate, Math.min(turnRate, angleDiff));
         const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
         
         this.vx = Math.cos(newAngle) * speed;
         this.vy = Math.sin(newAngle) * speed;
       }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    this.life -= dt * 1000;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx, camera, sprite) {
    if (!this.active) return;

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    
    const angle = Math.atan2(this.vy, this.vx);

    ctx.save();
    ctx.translate(screenX, screenY);

    if (this.isCrit) {
      ctx.filter = 'drop-shadow(0 0 6px #ffd700) saturate(1.5)';
    } else if (this.glowColor) {
      ctx.filter = `drop-shadow(0 0 6px ${this.glowColor})`;
    } else {
      ctx.filter = 'drop-shadow(0 0 4px rgba(0, 255, 255, 0.8))';
    }

    if (sprite && sprite.complete) {
      // The sprite points UP (tip at top = -PI/2 in canvas coords).
      // To align the tip with the direction of travel, rotate by (angle + PI/2).
      ctx.rotate(angle + Math.PI / 2);
      
      // Preserve the natural tall aspect ratio (16w x 33h)
      const drawH = 30 * this.sizeScale;
      const drawW = drawH * (16 / 33);
      
      ctx.drawImage(
        sprite,
        -drawW / 2,
        -drawH / 2,
        drawW,
        drawH
      );
    } else {
      // Fallback shape: Neon cyan streak aligned with motion
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 1.5, this.radius * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.isCrit ? '#ffd700' : (this.glowColor || '#00ffff');
      ctx.fill();
    }
    ctx.restore();
  }
}

export class WeaponSystem {
  constructor(maxProjectiles = 300) {
    this.pool = Array.from({ length: maxProjectiles }, () => new Projectile());
    this.cooldownTimer = 0;
    this.sideWeapons = new SideWeaponManager();

    // Active power states
    this.garlicTickTimer = 0;
    this.shieldAngle = 0;
    
    this.spores = [];
    this.sporesTimer = 0;
    
    this.flames = [];
    this.flameSpawnTimer = 0;
    
    this.laserTimer = 0;
    this.activeLasers = [];

    // Chain lightning line segments
    this.lightnings = [];
  }

  reset() {
    this.pool.forEach(p => p.active = false);
    this.cooldownTimer = 0;
    this.sideWeapons.reset();

    this.garlicTickTimer = 0;
    this.shieldAngle = 0;
    this.spores.length = 0;
    this.sporesTimer = 0;
    this.flames.length = 0;
    this.flameSpawnTimer = 0;
    this.laserTimer = 0;
    this.activeLasers.length = 0;
    this.lightnings.length = 0;
  }

  update(dt, player, spatialGrid, particleManager, floatingTextManager, enemiesSystem) {
    // Update lightning line timers
    for (let i = this.lightnings.length - 1; i >= 0; i--) {
      this.lightnings[i].life -= dt * 1000;
      if (this.lightnings[i].life <= 0) {
        this.lightnings.splice(i, 1);
      }
    }

    // 1. Update active projectiles
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].update(dt, enemiesSystem);
      }
    }

    // 2. Cooldown timer and firing logic
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt * 1000;
    }

    if (this.cooldownTimer <= 0) {
      // Find nearest enemy using the spatial grid or full search (since we need nearest)
      // For targeting nearest, iterating all active enemies is quick enough in Javascript (under 1000 items)
      let target = null;
      let minDistSq = Infinity;

      // Access active enemies
      const activeEnemies = enemiesSystem.getActiveEnemies();
      for (let i = 0; i < activeEnemies.length; i++) {
        const e = activeEnemies[i];
        const dSq = distSq(player.x, player.y, e.x, e.y);
        if (dSq < minDistSq) {
          minDistSq = dSq;
          target = e;
        }
      }

      let angle = Math.atan2(player.lastFacingY, player.lastFacingX);
      if (target) {
        angle = Math.atan2(target.y - player.y, target.x - player.x);
      }

      this.fireProjectiles(player, angle, particleManager);
      
      // Calculate cooldown factoring in combo buffs and frenzy event
      let cd = player.stats.attackCooldown;
      if (player.comboBuffs && player.comboBuffs.attackSpeed) {
        cd *= player.comboBuffs.attackSpeed;
      }
      if (player.game && player.game.activeEvent === 'FRENZY') {
        cd *= 0.5;
      }
      this.cooldownTimer = cd;
    }

    // 3. Collision checking with enemies
    this.checkCollisions(spatialGrid, particleManager, floatingTextManager, enemiesSystem, player);

    // 4. Update Active Powers
    this.updatePowers(dt, player, spatialGrid, particleManager, floatingTextManager, enemiesSystem);
    this.sideWeapons.update(dt, player, spatialGrid, particleManager, floatingTextManager, enemiesSystem);
  }

  fireProjectiles(player, baseAngle, particleManager, customOrigin = null) {
    const projCount = player.stats.projCount;
    
    // Spread logic based on prompt
    let spread = 0.20; // Fan spread (approx 11 degrees) for 2-5
    if (projCount >= 6 && projCount <= 8) {
      spread = 0.35; // Wider spread
    } else if (projCount >= 9) {
      spread = 0.15; // Shotgun cone (dense but wide)
    }

    let startAngle = baseAngle - ((projCount - 1) * spread) / 2;
    if (projCount >= 9) {
      startAngle = baseAngle - (Math.PI / 4); // 90 degree cone
      spread = (Math.PI / 2) / Math.max(1, projCount - 1);
    }

    const ox = customOrigin ? customOrigin.x : player.x;
    const oy = customOrigin ? customOrigin.y : player.y;

    audio.playShoot();

    for (let i = 0; i < projCount; i++) {
      const angle = startAngle + i * spread;
      const proj = this.pool.find(p => !p.active);
      if (proj) {
        // Critical hit determination
        const isCrit = Math.random() < player.stats.critChance;
        let damage = player.stats.baseDamage;
        if (isCrit) {
          const critMult = player.stats.critMultiplier + (player.stats.critDamageBonus || 0);
          damage = Math.round(damage * critMult);
        }

        let glow = null;
        let pSize = player.stats.projSize;
        if (player.inventory && !customOrigin) {
          const evo = player.inventory.getWeaponEvolutionLevel('BASE_PROJECTILE');
          if (evo === 1) glow = '#ff00ff'; // Piercing Cannon
          else if (evo === 2) { glow = '#ff8800'; pSize *= 1.2; } // Explosive Cannon
          else if (evo === 3) { glow = '#0088ff'; pSize *= 1.3; } // Storm Cannon
          else if (evo >= 4) { glow = '#ff0000'; pSize *= 1.5; } // Apocalypse Cannon
        }

        proj.init(
          ox,
          oy,
          angle,
          damage,
          player.stats.projSpeed,
          player.stats.projLifetime,
          player.stats.projPierce,
          pSize,
          player.stats.projExplosionRadius,
          player.stats.projSplitCount,
          player.stats.ricochetCount || 0,
          player.stats.homingPower || 0,
          isCrit,
          glow
        );
      }
    }
  }

  checkCollisions(spatialGrid, particleManager, floatingTextManager, enemiesSystem, player) {
    for (let i = 0; i < this.pool.length; i++) {
      const proj = this.pool[i];
      if (!proj.active) continue;

      // Query Spatial Grid for enemies near the projectile's position
      const nearbyEnemies = spatialGrid.getNearby(proj.x, proj.y, proj.radius + 64);
      for (let j = 0; j < nearbyEnemies.length; j++) {
        const enemy = nearbyEnemies[j];
        if (!enemy.active) continue;

        // Circle-circle intersection check
        const dSq = distSq(proj.x, proj.y, enemy.x, enemy.y);
        const touchDist = proj.radius + enemy.radius;

        if (dSq < touchDist * touchDist) {
          // HIT!
          this.applyHit(proj, enemy, particleManager, floatingTextManager, enemiesSystem, player, spatialGrid);
          
          // Trigger explosion on hit if upgrade exists
          if (proj.explosionRadius > 0) {
            this.triggerExplosion(proj.x, proj.y, proj.explosionRadius, proj.damage, enemiesSystem, particleManager, floatingTextManager, player);
          }

          // Pierce calculation
          proj.pierce -= 1;
          if (proj.pierce <= 0) {
            proj.active = false;
            break; // Projectile dead, stop checking other enemies for this projectile
          } else if (proj.ricochetCount > 0) {
            // Find another nearby enemy
            let nextTarget = null;
            let minDistSq = 200 * 200;
            const candidates = spatialGrid.getNearby(proj.x, proj.y, 200);
            for (let k = 0; k < candidates.length; k++) {
              const c = candidates[k];
              if (c.active && c !== enemy) {
                const cDist = (c.x - proj.x) ** 2 + (c.y - proj.y) ** 2;
                if (cDist < minDistSq) {
                  minDistSq = cDist;
                  nextTarget = c;
                }
              }
            }
            if (nextTarget) {
              proj.ricochetCount--;
              const angleToTarget = Math.atan2(nextTarget.y - proj.y, nextTarget.x - proj.x);
              const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
              proj.vx = Math.cos(angleToTarget) * speed;
              proj.vy = Math.sin(angleToTarget) * speed;
              proj.x += proj.vx * 0.05;
              proj.y += proj.vy * 0.05;
              break; // Prevent hitting other enemies in the same frame
            }
          }
        }
      }
    }
  }

  applyHit(proj, enemy, particleManager, floatingTextManager, enemiesSystem, player, spatialGrid) {
    // Take damage
    const damageDealt = proj.damage;
    const isDead = enemy.takeDamage(damageDealt, enemiesSystem);
    
    // Play audio
    audio.playHit();

    // Floating text feedback (yellow for crit, white/magenta for regular)
    const textColor = proj.isCrit ? '#ffd700' : '#ffffff';
    floatingTextManager.spawn(enemy.x, enemy.y - 10, `${damageDealt}`, textColor, proj.isCrit);

    // Particles: spark burst in opposite direction of travel
    const angle = Math.atan2(proj.vy, proj.vx);
    particleManager.spawnHitSparks(enemy.x, enemy.y, -Math.cos(angle), -Math.sin(angle), proj.isCrit ? '#ffd700' : '#00ffff');

    // Knockback: apply brief push vector
    const pushStrength = 180 / (enemy.stats.separationWeight || 1); // tanks resist knockback more
    enemy.applyKnockback(Math.cos(angle) * pushStrength, Math.sin(angle) * pushStrength);

    // Apply status effects based on player upgrade chances
    if (player.stats.burnChance && Math.random() < player.stats.burnChance) {
      enemy.burnTimer = 3.0;
      enemy.burnDamage = Math.max(1, Math.round(player.stats.baseDamage * 0.15));
      enemy.burnTickTimer = 1.0;
    }
    if (player.stats.freezeChance && Math.random() < player.stats.freezeChance) {
      enemy.freezeTimer = 1.5;
    }
    if (player.stats.poisonChance && Math.random() < player.stats.poisonChance) {
      enemy.poisonTimer = 4.0;
      enemy.poisonStacks = (enemy.poisonStacks || 0) + 1;
      enemy.poisonDamage = Math.max(1, Math.round(player.stats.baseDamage * 0.08));
      enemy.poisonTickTimer = 1.0;
    }
    if (player.stats.chainLightningChance && Math.random() < player.stats.chainLightningChance) {
      this.triggerChainLightning(enemy, proj.damage, enemiesSystem, spatialGrid, particleManager, floatingTextManager);
    }

    // Split shot mechanics
    if (proj.splitCount > 0) {
      this.triggerSplit(enemy.x, enemy.y, proj.vx, proj.vy, proj.damage, player, particleManager);
    }

    if (isDead) {
      // Drop XP Gems via system
      enemiesSystem.handleEnemyDeath(enemy);
    }
  }

  triggerExplosion(x, y, radius, damage, enemiesSystem, particleManager, floatingTextManager, player) {
    // Spawn visually stunning explosion ring
    particleManager.spawnExplosion(x, y, '#ff4500', 25, 220);

    const activeEnemies = enemiesSystem.getActiveEnemies();
    const radiusSq = radius * radius;

    for (let i = 0; i < activeEnemies.length; i++) {
      const enemy = activeEnemies[i];
      if (!enemy.active) continue;

      const dSq = (enemy.x - x) ** 2 + (enemy.y - y) ** 2;
      if (dSq < radiusSq) {
        // Explode damage (deal 75% of projectile damage in AOE)
        const explodeDamage = Math.round(damage * 0.75);
        const isDead = enemy.takeDamage(explodeDamage, enemiesSystem);

        // Sparks & Text
        floatingTextManager.spawn(enemy.x, enemy.y - 12, `${explodeDamage}`, '#ff6b6b', false, 14);
        
        // Blow away from center
        const angle = Math.atan2(enemy.y - y, enemy.x - x);
        enemy.applyKnockback(Math.cos(angle) * 250, Math.sin(angle) * 250);

        if (isDead) {
          enemiesSystem.handleEnemyDeath(enemy);
        }
      }
    }
  }

  triggerSplit(x, y, vx, vy, damage, player, particleManager) {
    // Calculate angle of original movement
    const baseAngle = Math.atan2(vy, vx);
    
    // Spawn two secondary projectiles perpendicular to direction (+90 and -90 degrees)
    const angles = [baseAngle + Math.PI / 2, baseAngle - Math.PI / 2];
    
    angles.forEach(angle => {
      const proj = this.pool.find(p => !p.active);
      if (proj) {
        // Split shots deal 70% damage, pierce once, and are smaller
        proj.init(
          x,
          y,
          angle,
          Math.round(damage * 0.7),
          player.stats.projSpeed * 0.8,
          1000, // shorter lifetime (1s)
          1,    // pierce 1
          player.stats.projSize * 0.7,
          0,    // no recursive explosions
          0,    // no recursive splits
          0,    // no recursive ricochet
          0,    // no recursive homing
          false // non-crit
        );
      }
    });
  }

  triggerChainLightning(startEnemy, damage, enemiesSystem, spatialGrid, particleManager, floatingTextManager) {
    const hitEnemies = new Set([startEnemy]);
    let currentSource = startEnemy;
    let jumps = 3;
    let chainDamage = Math.round(damage * 0.5);

    while (jumps > 0) {
      let nextTarget = null;
      let minDistSq = Infinity;
      const candidates = spatialGrid.getNearby(currentSource.x, currentSource.y, 244);

      for (let k = 0; k < candidates.length; k++) {
        const c = candidates[k];
        if (c.active && !hitEnemies.has(c)) {
          const dSq = (c.x - currentSource.x) ** 2 + (c.y - currentSource.y) ** 2;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            nextTarget = c;
          }
        }
      }

      if (nextTarget) {
        hitEnemies.add(nextTarget);
        const isDead = nextTarget.takeDamage(chainDamage, enemiesSystem);
        
        floatingTextManager.spawn(nextTarget.x, nextTarget.y - 12, `${chainDamage}`, '#00ffff', false, 11);
        
        particleManager.spawnHitSparks(nextTarget.x, nextTarget.y, 0, -1, '#00ffff');
        particleManager.spawnGemSparkle(nextTarget.x, nextTarget.y, '#00ffff');

        this.lightnings.push({
          x1: currentSource.x,
          y1: currentSource.y,
          x2: nextTarget.x,
          y2: nextTarget.y,
          life: 120,
          maxLife: 120
        });

        if (isDead) {
          enemiesSystem.handleEnemyDeath(nextTarget);
        }

        currentSource = nextTarget;
        jumps--;
      } else {
        break;
      }
    }
  }

  draw(ctx, camera, sprite, player) {
    // Draw chain lightning bolts
    if (this.lightnings && this.lightnings.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8;
      
      for (let i = 0; i < this.lightnings.length; i++) {
        const l = this.lightnings[i];
        const screenX1 = l.x1 - camera.x;
        const screenY1 = l.y1 - camera.y;
        const screenX2 = l.x2 - camera.x;
        const screenY2 = l.y2 - camera.y;
        
        ctx.beginPath();
        ctx.moveTo(screenX1, screenY1);
        
        const mx = (screenX1 + screenX2) / 2;
        const my = (screenY1 + screenY2) / 2;
        const dx = screenX2 - screenX1;
        const dy = screenY2 - screenY1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          const nx = -dy / len;
          const ny = dx / len;
          const offset = (Math.random() - 0.5) * 20;
          ctx.lineTo(mx + nx * offset, my + ny * offset);
        }
        
        ctx.lineTo(screenX2, screenY2);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].draw(ctx, camera, sprite);
      }
    }
    
    this.sideWeapons.draw(ctx, camera, player);
  }

  updatePowers(dt, player, spatialGrid, particleManager, floatingTextManager, enemiesSystem) {
    const px = player.x;
    const py = player.y;

    // Decay immunity cooldowns on enemies
    const activeEnemies = enemiesSystem.getActiveEnemies();
    for (let i = 0; i < activeEnemies.length; i++) {
      const enemy = activeEnemies[i];
      if (enemy.shieldHitCooldown > 0) enemy.shieldHitCooldown -= dt * 1000;
      if (enemy.flameHitCooldown > 0) enemy.flameHitCooldown -= dt * 1000;
      if (enemy.sporeHitCooldown > 0) enemy.sporeHitCooldown -= dt * 1000;
    }

    // ==========================================
    // 1. Orbiting Shield Plates (SHIELD upgrade)
    // ==========================================
    const armorLevel = player.inventory?.getWeaponLevel('SHIELD_ORBIT') || 0;
    if (armorLevel > 0) {
      this.shieldAngle += 2.5 * dt; // Rotate speed
      const radius = 80;
      
      for (let i = 0; i < armorLevel; i++) {
        const angle = this.shieldAngle + (i * Math.PI * 2) / armorLevel;
        const sx = px + Math.cos(angle) * radius;
        const sy = py + Math.sin(angle) * radius;
        const shieldRadius = 16;

        // Check collision against nearby enemies
        const nearby = spatialGrid.getNearby(sx, sy, shieldRadius + 64);
        for (let j = 0; j < nearby.length; j++) {
          const enemy = nearby[j];
          if (!enemy.active) continue;
          
          if (!enemy.shieldHitCooldown || enemy.shieldHitCooldown <= 0) {
            const dx = enemy.x - sx;
            const dy = enemy.y - sy;
            const dSq = dx * dx + dy * dy;
            const touchDist = shieldRadius + enemy.radius;
            
            if (dSq < touchDist * touchDist) {
              // Hit!
              const dmg = Math.round(player.stats.baseDamage * 0.45 * (1 + armorLevel * 0.1));
              const isDead = enemy.takeDamage(dmg, enemiesSystem);
              enemy.shieldHitCooldown = 350; // 350ms immunity

              audio.playHit();
              floatingTextManager.spawn(enemy.x, enemy.y - 10, `${dmg}`, '#00e5ff', false, 12);
              
              // Push back enemy
              const pushAngle = Math.atan2(enemy.y - py, enemy.x - px);
              enemy.applyKnockback(Math.cos(pushAngle) * 200, Math.sin(pushAngle) * 200);

              // Spawn particles
              particleManager.spawnHitSparks(enemy.x, enemy.y, Math.cos(pushAngle), Math.sin(pushAngle), '#00ffff');

              if (isDead) {
                enemiesSystem.handleEnemyDeath(enemy);
              }
            }
          }
        }
      }
    }

    // ==========================================
    // 2. Garlic Damage Aura (GARLIC upgrade)
    // ==========================================
    const magnetLevel = player.inventory?.getWeaponLevel('GARLIC_AURA') || 0;
    if (magnetLevel > 0) {
      this.garlicTickTimer -= dt;
      const garlicRadius = 90 + magnetLevel * 18;
      
      if (this.garlicTickTimer <= 0) {
        this.garlicTickTimer = 0.5; // ticks twice a second
        
        const garlicDmg = Math.round(player.stats.baseDamage * 0.20 * magnetLevel);
        const nearby = spatialGrid.getNearby(px, py, garlicRadius + 64);
        
        for (let i = 0; i < nearby.length; i++) {
          const enemy = nearby[i];
          if (!enemy.active) continue;

          const dx = enemy.x - px;
          const dy = enemy.y - py;
          const dSq = dx * dx + dy * dy;
          
          if (dSq < garlicRadius * garlicRadius) {
            // Apply slow & damage
            enemy.slowTimer = 0.7; // last slightly past next tick

            const isDead = enemy.takeDamage(garlicDmg, enemiesSystem);
            floatingTextManager.spawn(enemy.x, enemy.y - 12, `${garlicDmg}`, '#00f5d4', false, 11);
            
            // Light sparks
            particleManager.spawnGemSparkle(enemy.x, enemy.y, '#00f5d4');

            if (isDead) {
              enemiesSystem.handleEnemyDeath(enemy);
            }
          }
        }
      }
    }

    // ==========================================
    // 3. Flame Trails (FLAME_TRAIL upgrade)
    // ==========================================
    const speedLevel = player.inventory?.getWeaponLevel('FLAME_TRAIL') || 0;
    const isMoving = player.vx !== 0 || player.vy !== 0;
    
    if (speedLevel > 0 && isMoving) {
      this.flameSpawnTimer -= dt;
      if (this.flameSpawnTimer <= 0) {
        this.flameSpawnTimer = Math.max(0.12, 0.40 - speedLevel * 0.05); // spawn speed scales
        
        this.flames.push({
          x: px - player.lastFacingX * 12,
          y: py - player.lastFacingY * 12,
          radius: 14 + speedLevel * 2,
          life: 1200 + speedLevel * 150, // lasts ~1.5s
          maxLife: 1200 + speedLevel * 150,
          damage: Math.round(player.stats.baseDamage * 0.35 * speedLevel)
        });
      }
    }

    // Update existing flames
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i];
      f.life -= dt * 1000;
      if (f.life <= 0) {
        this.flames.splice(i, 1);
        continue;
      }

      // Check flame contact damage
      const nearby = spatialGrid.getNearby(f.x, f.y, f.radius + 64);
      for (let j = 0; j < nearby.length; j++) {
        const enemy = nearby[j];
        if (!enemy.active) continue;

        if (!enemy.flameHitCooldown || enemy.flameHitCooldown <= 0) {
          const dx = enemy.x - f.x;
          const dy = enemy.y - f.y;
          const dSq = dx * dx + dy * dy;
          
          if (dSq < f.radius * f.radius) {
            const isDead = enemy.takeDamage(f.damage, enemiesSystem);
            enemy.flameHitCooldown = 400; // 400ms tick cooldown
            
            floatingTextManager.spawn(enemy.x, enemy.y - 10, `${f.damage}`, '#ffb703', false, 11);
            particleManager.spawnHitSparks(enemy.x, enemy.y, 0, -1, '#ff5e00');

            if (isDead) {
              enemiesSystem.handleEnemyDeath(enemy);
            }
          }
        }
      }
    }

    // ==========================================
    // 4. Spore Clouds (SPORES upgrade)
    // ==========================================
    const regenLevel = player.inventory?.getWeaponLevel('SPORE_CLOUD') || 0;
    if (regenLevel > 0) {
      this.sporesTimer -= dt;
      if (this.sporesTimer <= 0) {
        this.sporesTimer = 2.0; // spawn spores every 2 seconds
        
        // Spawn spore count equal to level
        for (let i = 0; i < regenLevel; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = randomRange(30, 130);
          this.spores.push({
            x: px + Math.cos(angle) * dist,
            y: py + Math.sin(angle) * dist,
            radius: 20 + regenLevel * 3,
            life: 2500, // lasts 2.5s
            maxLife: 2500,
            damage: Math.round(player.stats.baseDamage * 0.28 * regenLevel)
          });
        }
      }
    }

    // Update existing spores
    for (let i = this.spores.length - 1; i >= 0; i--) {
      const s = this.spores[i];
      s.life -= dt * 1000;
      if (s.life <= 0) {
        this.spores.splice(i, 1);
        continue;
      }

      // Check contact
      const nearby = spatialGrid.getNearby(s.x, s.y, s.radius + 64);
      for (let j = 0; j < nearby.length; j++) {
        const enemy = nearby[j];
        if (!enemy.active) continue;

        if (!enemy.sporeHitCooldown || enemy.sporeHitCooldown <= 0) {
          const dx = enemy.x - s.x;
          const dy = enemy.y - s.y;
          const dSq = dx * dx + dy * dy;

          if (dSq < s.radius * s.radius) {
            const isDead = enemy.takeDamage(s.damage, enemiesSystem);
            enemy.sporeHitCooldown = 500; // 500ms ticks

            floatingTextManager.spawn(enemy.x, enemy.y - 12, `${s.damage}`, '#9ef01a', false, 11);
            
            // green particles
            particleManager.spawnGemSparkle(enemy.x, enemy.y, '#9ef01a');

            if (isDead) {
              enemiesSystem.handleEnemyDeath(enemy);
            }
          }
        }
      }
    }

    // ==========================================
    // 5. Sniper Laser Beam (LASER upgrade)
    // ==========================================
    const critLevel = player.inventory?.getWeaponLevel('LASER_SNIPER') || 0;
    if (critLevel > 0) {
      this.laserTimer -= dt;
      if (this.laserTimer <= 0) {
        this.laserTimer = Math.max(1.2, 3.8 - critLevel * 0.4); // fires faster

        // Aim at nearest enemy
        let target = null;
        let minDistSq = Infinity;
        for (let i = 0; i < activeEnemies.length; i++) {
          const e = activeEnemies[i];
          const dSq = distSq(px, py, e.x, e.y);
          if (dSq < minDistSq) {
            minDistSq = dSq;
            target = e;
          }
        }

        if (target) {
          const dx = target.x - px;
          const dy = target.y - py;
          const d = Math.sqrt(dx * dx + dy * dy);
          
          if (d > 0.1) {
            // Extend beam 1200px (fills screen)
            const length = 1200;
            const lx = px + (dx / d) * length;
            const ly = py + (dy / d) * length;
            const damage = Math.round(player.stats.baseDamage * 2.2 * (1 + critLevel * 0.25));

            this.activeLasers.push({
              x1: px, y1: py,
              x2: lx, y2: ly,
              life: 180, // visible for 180ms
              maxLife: 180
            });

            audio.playShoot();

            // Check intersection against all active enemies
            const thickness = 14;
            const ABx = lx - px;
            const ABy = ly - py;
            const lenSq = ABx * ABx + ABy * ABy;

            for (let i = 0; i < activeEnemies.length; i++) {
              const enemy = activeEnemies[i];
              if (!enemy.active) continue;

              // Project P onto segment AB
              const APx = enemy.x - px;
              const APy = enemy.y - py;
              const t = clamp((APx * ABx + APy * ABy) / lenSq, 0, 1);
              const cx = px + t * ABx;
              const cy = py + t * ABy;

              const distToLaserSq = distSq(enemy.x, enemy.y, cx, cy);
              const hitRange = enemy.radius + thickness;

              if (distToLaserSq < hitRange * hitRange) {
                // Hit!
                const isDead = enemy.takeDamage(damage, enemiesSystem);
                
                floatingTextManager.spawn(enemy.x, enemy.y - 12, `${damage}`, '#ffb703', true, 16);
                
                // Blast particles along direction
                const pushAngle = Math.atan2(dy, dx);
                enemy.applyKnockback(Math.cos(pushAngle) * 350, Math.sin(pushAngle) * 350);
                particleManager.spawnHitSparks(enemy.x, enemy.y, Math.cos(pushAngle), Math.sin(pushAngle), '#ffcc00');

                if (isDead) {
                  enemiesSystem.handleEnemyDeath(enemy);
                }
              }
            }
          }
        }
      }
    }

    // Decay active lasers
    for (let i = this.activeLasers.length - 1; i >= 0; i--) {
      this.activeLasers[i].life -= dt * 1000;
      if (this.activeLasers[i].life <= 0) {
        this.activeLasers.splice(i, 1);
      }
    }
  }

  drawPowers(ctx, camera, player) {
    ctx.save();
    
    // Convert world positions to screen positions
    const pScreenX = player.x - camera.x;
    const pScreenY = player.y - camera.y;

    // -------------------------------------------------------------
    // A. Draw Flame Trails (Fleetfoot Boots)
    // -------------------------------------------------------------
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i];
      const screenX = f.x - camera.x;
      const screenY = f.y - camera.y;
      const alpha = Math.max(0, f.life / f.maxLife);
      const drawRadius = f.radius * (0.6 + alpha * 0.4);

      ctx.save();
      ctx.globalAlpha = alpha * 0.65;
      
      // Draw fire spot with flat colors (pixel look)
      ctx.fillStyle = '#ff3c00';
      ctx.beginPath();
      ctx.arc(screenX, screenY, drawRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner fire core
      ctx.fillStyle = '#ffb700';
      ctx.beginPath();
      ctx.arc(screenX, screenY, drawRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // -------------------------------------------------------------
    // B. Draw Spore Clouds (Regrowth Spores)
    // -------------------------------------------------------------
    for (let i = 0; i < this.spores.length; i++) {
      const s = this.spores[i];
      const screenX = s.x - camera.x;
      const screenY = s.y - camera.y;
      const alpha = Math.max(0, s.life / s.maxLife);
      const drawRadius = s.radius * (0.8 + 0.2 * Math.sin(s.life * 0.01));

      ctx.save();
      ctx.globalAlpha = alpha * 0.45;
      ctx.fillStyle = '#70e000'; // Lime poison cloud
      
      // Cloud overlapping circles
      ctx.beginPath();
      ctx.arc(screenX, screenY, drawRadius, 0, Math.PI * 2);
      ctx.arc(screenX - 8, screenY + 4, drawRadius * 0.7, 0, Math.PI * 2);
      ctx.arc(screenX + 8, screenY - 4, drawRadius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // -------------------------------------------------------------
    // C. Draw Garlic Aura (Garlic Aura Card)
    // -------------------------------------------------------------
    const magnetLevel = player.inventory?.getWeaponLevel('GARLIC_AURA') || 0;
    if (magnetLevel > 0) {
      const garlicRadius = 90 + magnetLevel * 18;
      
      ctx.save();
      ctx.globalAlpha = 0.2 + 0.05 * Math.sin(performance.now() * 0.005); // pulse
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 3;
      
      // Dashed neon ring
      if (ctx.setLineDash) ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.arc(pScreenX, pScreenY, garlicRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Soft fill
      ctx.fillStyle = 'rgba(0, 245, 212, 0.03)';
      ctx.beginPath();
      ctx.arc(pScreenX, pScreenY, garlicRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // -------------------------------------------------------------
    // D. Draw Orbiting Shield Plates (Orbiting Shields Card)
    // -------------------------------------------------------------
    const armorLevel = player.inventory?.getWeaponLevel('SHIELD_ORBIT') || 0;
    if (armorLevel > 0) {
      const radius = 80;
      for (let i = 0; i < armorLevel; i++) {
        const angle = this.shieldAngle + (i * Math.PI * 2) / armorLevel;
        const sx = pScreenX + Math.cos(angle) * radius;
        const sy = pScreenY + Math.sin(angle) * radius;
        
        ctx.save();
        ctx.fillStyle = '#00e5ff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        // Draw flat blocky retro shield plate
        ctx.translate(sx, sy);
        ctx.rotate(angle + Math.PI / 2);
        
        ctx.fillRect(-12, -4, 24, 8);
        ctx.strokeRect(-12, -4, 24, 8);
        ctx.restore();
      }
    }

    // -------------------------------------------------------------
    // E. Draw Sniper Lasers (Precision Scope)
    // -------------------------------------------------------------
    for (let i = 0; i < this.activeLasers.length; i++) {
      const l = this.activeLasers[i];
      const sX1 = l.x1 - camera.x;
      const sY1 = l.y1 - camera.y;
      const sX2 = l.x2 - camera.x;
      const sY2 = l.y2 - camera.y;
      const alpha = Math.max(0, l.life / l.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;
      
      // outer laser beam (thick golden neon line)
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(sX1, sY1);
      ctx.lineTo(sX2, sY2);
      ctx.stroke();

      // inner laser beam (thin white hot line)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sX1, sY1);
      ctx.lineTo(sX2, sY2);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }
}
