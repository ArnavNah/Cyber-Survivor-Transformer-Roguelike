import { distSq, randomRange, clamp } from './utils.js';
import { audio } from './audio.js';

export class SideWeaponManager {
  constructor() {
    this.drones = [];
    this.bladesAngle = 0;
    this.missiles = [];
    this.satelliteAngle = 0;
    this.laserBeamActive = false;
    this.laserBeamTimer = 0;
    this.laserBeamDuration = 0.5;
    this.orbAngle = 0;
    this.orbZapTimer = 0;
    
    this.droneFireTimers = [];
    this.droneProjectiles = [];
    
    this.zapLines = []; // visual lightning bolts for orb
  }

  reset() {
    this.drones = [];
    this.bladesAngle = 0;
    this.missiles = [];
    this.satelliteAngle = 0;
    this.laserBeamActive = false;
    this.laserBeamTimer = 0;
    this.orbAngle = 0;
    this.orbZapTimer = 0;
    this.droneFireTimers = [];
    this.droneProjectiles = [];
    this.zapLines = [];
  }

  update(dt, player, spatialGrid, particleManager, floatingTextManager, enemiesSystem) {
    if (!player.inventory) return;

    for (let i = this.zapLines.length - 1; i >= 0; i--) {
      this.zapLines[i].life -= dt * 1000;
      if (this.zapLines[i].life <= 0) this.zapLines.splice(i, 1);
    }

    this._updateCompanionDrones(dt, player, enemiesSystem, particleManager, floatingTextManager);
    this._updateOrbitalBlades(dt, player, enemiesSystem, particleManager, floatingTextManager);
    this._updateMissilePod(dt, player, enemiesSystem, particleManager, floatingTextManager);
    this._updateLaserSatellite(dt, player, enemiesSystem, particleManager, floatingTextManager);
    this._updateElectricOrb(dt, player, enemiesSystem, particleManager, floatingTextManager);
  }

  draw(ctx, camera, player) {
    if (!player.inventory) return;

    ctx.save();
    for (let line of this.zapLines) {
      ctx.beginPath();
      ctx.moveTo(line.x1 - camera.x, line.y1 - camera.y);
      const midX = (line.x1 + line.x2) / 2 - camera.x + randomRange(-15, 15);
      const midY = (line.y1 + line.y2) / 2 - camera.y + randomRange(-15, 15);
      ctx.lineTo(midX, midY);
      ctx.lineTo(line.x2 - camera.x, line.y2 - camera.y);
      ctx.strokeStyle = line.color || '#00ffff';
      ctx.lineWidth = 3;
      ctx.globalAlpha = Math.max(0, line.life / 150);
      ctx.stroke();
    }
    ctx.restore();

    this._drawCompanionDrones(ctx, camera, player);
    this._drawOrbitalBlades(ctx, camera, player);
    this._drawMissilePod(ctx, camera);
    this._drawLaserSatellite(ctx, camera, player);
    this._drawElectricOrb(ctx, camera, player);
  }

  // --------------------------------------------------------------------------
  // COMPANION DRONES
  // --------------------------------------------------------------------------
  _updateCompanionDrones(dt, player, enemiesSystem, particleManager, floatingTextManager) {
    const level = player.inventory.getWeaponLevel('COMPANION_DRONE');
    if (level === 0) return;
    
    const count = level;
    const isEvolved = player.inventory.isWeaponEvolved('COMPANION_DRONE');
    const fireRate = Math.max(1.0, 2.0 - (level - 1) * 0.25);
    const baseDamage = Math.round(player.getEffectiveStats().baseDamage * (0.4 + (level - 1) * 0.05));
    
    // Setup drones array if needed
    if (this.drones.length !== count) {
      this.drones = [];
      this.droneFireTimers = [];
      for (let i = 0; i < count; i++) {
        this.drones.push({ angle: (i / count) * Math.PI * 2 });
        this.droneFireTimers.push(Math.random() * fireRate);
      }
    }
    
    // Update drones orbit
    for (let i = 0; i < this.drones.length; i++) {
      this.drones[i].angle += 1.2 * dt;
      this.droneFireTimers[i] -= dt;
      
      if (this.droneFireTimers[i] <= 0) {
        this.droneFireTimers[i] = fireRate;
        
        // Find nearest enemy
        const px = player.x + Math.cos(this.drones[i].angle) * 130;
        const py = player.y + Math.sin(this.drones[i].angle) * 130;
        
        const enemies = enemiesSystem.getActiveEnemies();
        let target = null;
        let minDistSq = 400 * 400;
        for (let e of enemies) {
          const dSq = distSq(px, py, e.x, e.y);
          if (dSq < minDistSq) {
            minDistSq = dSq;
            target = e;
          }
        }
        
        if (target) {
          audio.playShoot();
          if (isEvolved) {
             // Evolution: Chain Lightning (Thunder Drone)
             const damage = baseDamage;
             let hitEnemies = [target];
             if (target.takeDamage(damage, enemiesSystem)) enemiesSystem.handleEnemyDeath(target);
             floatingTextManager.spawn(target.x, target.y - 10, damage.toString(), '#0088ff');
             
             let currentTarget = target;
             for (let j = 0; j < 3; j++) {
                let nextTarget = null;
                let nextMinDist = 200 * 200;
                for (let e of enemies) {
                   if (!hitEnemies.includes(e)) {
                      const d2 = distSq(currentTarget.x, currentTarget.y, e.x, e.y);
                      if (d2 < nextMinDist) {
                         nextMinDist = d2;
                         nextTarget = e;
                      }
                   }
                }
                if (nextTarget) {
                   if (nextTarget.takeDamage(Math.round(damage * 0.5), enemiesSystem)) enemiesSystem.handleEnemyDeath(nextTarget);
                   floatingTextManager.spawn(nextTarget.x, nextTarget.y - 10, Math.round(damage * 0.5).toString(), '#0088ff');
                   
                   this.zapLines.push({
                      x1: currentTarget.x, y1: currentTarget.y,
                      x2: nextTarget.x, y2: nextTarget.y,
                      life: 150,
                      color: '#0088ff' // Blue electric VFX
                   });
                   
                   hitEnemies.push(nextTarget);
                   currentTarget = nextTarget;
                } else {
                   break;
                }
             }
             
             this.zapLines.push({
               x1: px, y1: py,
               x2: target.x, y2: target.y,
               life: 150,
               color: '#0088ff' // Blue electric VFX
             });
          } else {
            // Fire projectile (for levels 1-5)
            const angle = Math.atan2(target.y - py, target.x - px);
            this.droneProjectiles.push({
              x: px, y: py,
              vx: Math.cos(angle) * 500, vy: Math.sin(angle) * 500,
              damage: baseDamage,
              life: 1.5
            });
          }
        }
      }
    }
    
    // Update drone projectiles
    for (let i = this.droneProjectiles.length - 1; i >= 0; i--) {
      const p = this.droneProjectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      
      let hit = false;
      const enemies = enemiesSystem.getActiveEnemies();
      for (let e of enemies) {
        if (distSq(p.x, p.y, e.x, e.y) < (e.size + 6) ** 2) {
          if (e.takeDamage(p.damage, enemiesSystem)) enemiesSystem.handleEnemyDeath(e);
          floatingTextManager.spawn(e.x, e.y - 10, p.damage.toString(), '#ffffff');
          audio.playHit();
          hit = true;
          break;
        }
      }
      
      if (hit || p.life <= 0) {
        this.droneProjectiles.splice(i, 1);
      }
    }
  }

  _drawCompanionDrones(ctx, camera, player) {
    if (player.inventory.getWeaponLevel('COMPANION_DRONE') === 0) return;
    
    const isEvolved = player.inventory.isWeaponEvolved('COMPANION_DRONE');
    ctx.save();
    
    for (let i = 0; i < this.drones.length; i++) {
      const px = player.x + Math.cos(this.drones[i].angle) * 130 - camera.x;
      const py = player.y + Math.sin(this.drones[i].angle) * 130 - camera.y;
      
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = isEvolved ? '#0088ff' : '#ffff00';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    
    for (let p of this.droneProjectiles) {
      ctx.beginPath();
      ctx.arc(p.x - camera.x, p.y - camera.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffff00';
      ctx.fill();
    }
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // ORBITAL BLADES
  // --------------------------------------------------------------------------
  _updateOrbitalBlades(dt, player, enemiesSystem, particleManager, floatingTextManager) {
    const level = player.inventory.getWeaponLevel('ORBITAL_BLADES');
    if (level === 0) return;
    
    const isEvolved = player.inventory.isWeaponEvolved('ORBITAL_BLADES');
    const bladeCount = level + 1;
    const radius = 45 + level * 7;
    const speed = 2.5 + level * 0.5;
    const damage = Math.round(player.getEffectiveStats().baseDamage * (0.5 + level * 0.1));
    
    this.bladesAngle += speed * dt;
    const enemies = enemiesSystem.getActiveEnemies();
    
    if (isEvolved) {
      // Death Ring evolution
      for (let e of enemies) {
        if (distSq(player.x, player.y, e.x, e.y) < 150 * 150) { // Large radius
          if (!e._voidRingCD || e._voidRingCD <= 0) {
            const deathRingDamage = damage * 3; // Huge contact damage
            if (e.takeDamage(deathRingDamage, enemiesSystem)) enemiesSystem.handleEnemyDeath(e);
            floatingTextManager.spawn(e.x, e.y - 10, deathRingDamage.toString(), '#ff0000');
            e._voidRingCD = 0.2; // Ticks fast
          } else {
            e._voidRingCD -= dt;
          }
        }
      }
    } else {
      // Standard Blades
      for (let i = 0; i < bladeCount; i++) {
        const angle = this.bladesAngle + (i / bladeCount) * Math.PI * 2;
        const bx = player.x + Math.cos(angle) * radius;
        const by = player.y + Math.sin(angle) * radius;
        
        for (let e of enemies) {
          if (distSq(bx, by, e.x, e.y) < (e.size + 15) ** 2) {
            if (!e._bladeHitCD || e._bladeHitCD <= 0) {
              if (e.takeDamage(damage, enemiesSystem)) enemiesSystem.handleEnemyDeath(e);
              floatingTextManager.spawn(e.x, e.y - 10, damage.toString(), '#ff00ff');
              particleManager.spawnHitSparks(e.x, e.y, 0, 0, '#ff00ff');
              audio.playHit();
              e._bladeHitCD = 0.3;
            }
          }
        }
      }
      
      for (let e of enemies) {
        if (e._bladeHitCD > 0) e._bladeHitCD -= dt;
      }
    }
  }

  _drawOrbitalBlades(ctx, camera, player) {
    const level = player.inventory.getWeaponLevel('ORBITAL_BLADES');
    if (level === 0) return;
    
    const isEvolved = player.inventory.isWeaponEvolved('ORBITAL_BLADES');
    ctx.save();
    
    if (isEvolved) {
      // Draw Death Ring
      ctx.beginPath();
      ctx.arc(player.x - camera.x, player.y - camera.y, 150, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
      ctx.fill();
      
      // Make it look like a spinning ring
      ctx.save();
      ctx.translate(player.x - camera.x, player.y - camera.y);
      ctx.rotate(this.bladesAngle);
      
      ctx.beginPath();
      ctx.arc(0, 0, 150, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 4;
      ctx.setLineDash([20, 20, 50, 20]);
      ctx.stroke();
      
      // Outer thinner ring
      ctx.beginPath();
      ctx.arc(0, 0, 160, 0, Math.PI * 2);
      ctx.strokeStyle = '#aa0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 30]);
      ctx.stroke();
      
      ctx.restore();
    } else {
      const bladeCount = level + 1;
      const radius = 45 + level * 7;
      
      for (let i = 0; i < bladeCount; i++) {
        const angle = this.bladesAngle + (i / bladeCount) * Math.PI * 2;
        const bx = player.x + Math.cos(angle) * radius - camera.x;
        const by = player.y + Math.sin(angle) * radius - camera.y;
        
        ctx.translate(bx, by);
        ctx.rotate(angle + Math.PI / 2);
        
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fillStyle = '#ff00ff';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.rotate(-(angle + Math.PI / 2));
        ctx.translate(-bx, -by);
      }
    }
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // MISSILE POD
  // --------------------------------------------------------------------------
  _updateMissilePod(dt, player, enemiesSystem, particleManager, floatingTextManager) {
    const level = player.inventory.getWeaponLevel('MISSILE_POD');
    if (level === 0) return;
    
    const isEvolved = player.inventory.isWeaponEvolved('MISSILE_POD');
    const reloadSpeed = Math.max(1.0, 3.0 - (level - 1) * 0.35);
    const missileCount = level;
    const damage = Math.round(player.getEffectiveStats().baseDamage * (0.8 + (level - 1) * 0.2));
    const explosionRadius = 40 + (level - 1) * 10;
    
    if (!this.missileReloadTimer) this.missileReloadTimer = reloadSpeed;
    this.missileReloadTimer -= dt;
    
    const enemies = enemiesSystem.getActiveEnemies();
    
    if (this.missileReloadTimer <= 0 && enemies.length > 0) {
      this.missileReloadTimer = reloadSpeed;
      audio.playShoot();
      
      // Find highest HP targets
      let targets = [...enemies].sort((a, b) => b.hp - a.hp).slice(0, Math.min(missileCount, enemies.length));
      
      for (let i = 0; i < missileCount; i++) {
        const target = targets[i % targets.length];
        const angle = Math.random() * Math.PI * 2;
        this.missiles.push({
          x: player.x, y: player.y,
          vx: Math.cos(angle) * 150, vy: Math.sin(angle) * 150,
          target: target,
          damage: damage,
          explosionRadius: explosionRadius,
          life: 4.0
        });
      }
    }
    
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt;
      
      // Homing logic
      if (m.target && m.target.active) {
        const angleToTarget = Math.atan2(m.target.y - m.y, m.target.x - m.x);
        const currentAngle = Math.atan2(m.vy, m.vx);
        let angleDiff = angleToTarget - currentAngle;
        
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        const turnRate = 4.0 * dt;
        const newAngle = currentAngle + clamp(angleDiff, -turnRate, turnRate);
        const speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy) + 300 * dt; // accelerate
        const maxSpeed = 450;
        const finalSpeed = Math.min(speed, maxSpeed);
        
        m.vx = Math.cos(newAngle) * finalSpeed;
        m.vy = Math.sin(newAngle) * finalSpeed;
      }
      
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      
      // Trail particles
      if (Math.random() < 0.3) {
        particleManager.spawn(m.x, m.y, -m.vx * 0.1, -m.vy * 0.1, '#ff6600', 3, 300);
      }
      
      let hit = false;
      for (let e of enemies) {
        if (distSq(m.x, m.y, e.x, e.y) < (e.size + 8) ** 2) {
          hit = true;
          break;
        }
      }
      
      if (hit || m.life <= 0) {
        audio.playHit();
        particleManager.spawnExplosion(m.x, m.y, '#ff4500', 20, 200);
        
        for (let e of enemies) {
          if (distSq(m.x, m.y, e.x, e.y) < m.explosionRadius * m.explosionRadius) {
             if (e.takeDamage(m.damage, enemiesSystem)) enemiesSystem.handleEnemyDeath(e);
             floatingTextManager.spawn(e.x, e.y - 10, m.damage.toString(), '#ffaa00');
          }
        }
        
        if (isEvolved && hit) {
          // Cluster Storm
          for (let c = 0; c < 4; c++) {
            const cx = m.x + randomRange(-40, 40);
            const cy = m.y + randomRange(-40, 40);
            particleManager.spawnExplosion(cx, cy, '#ffaa00', 10, 100);
            for (let e of enemies) {
              if (distSq(cx, cy, e.x, e.y) < 30 * 30) {
                 if (e.takeDamage(Math.round(m.damage * 0.4), enemiesSystem)) enemiesSystem.handleEnemyDeath(e);
                 floatingTextManager.spawn(e.x, e.y - 10, Math.round(m.damage * 0.4).toString(), '#ffaa00', false, 12);
              }
            }
          }
        }
        
        this.missiles.splice(i, 1);
      }
    }
  }

  _drawMissilePod(ctx, camera) {
    ctx.save();
    for (let m of this.missiles) {
      const angle = Math.atan2(m.vy, m.vx);
      ctx.translate(m.x - camera.x, m.y - camera.y);
      ctx.rotate(angle);
      
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(-6, -3, 12, 6);
      ctx.fillStyle = '#ff4500';
      ctx.fillRect(-8, -2, 4, 4);
      
      ctx.rotate(-angle);
      ctx.translate(-(m.x - camera.x), -(m.y - camera.y));
    }
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // LASER SATELLITE
  // --------------------------------------------------------------------------
  _updateLaserSatellite(dt, player, enemiesSystem, particleManager, floatingTextManager) {
    const level = player.inventory.getWeaponLevel('LASER_SATELLITE');
    if (level === 0) return;
    
    const isEvolved = player.inventory.isWeaponEvolved('LASER_SATELLITE');
    const orbitSpeed = 1.2 + level * 0.3;
    const fireCooldown = Math.max(1.5, 4.5 - level * 0.5);
    const damage = Math.round(player.getEffectiveStats().baseDamage * (0.6 + level * 0.15));
    const sweepRange = Math.PI * (0.5 + level * 0.3); // 90 deg to 270 deg
    
    this.satelliteAngle += orbitSpeed * dt;
    
    if (isEvolved) {
      this.laserBeamActive = true;
      this.laserBeamDuration = 1000;
      this.laserSweepAngle = this.satelliteAngle; 
    } else {
      if (!this.laserCooldownTimer) this.laserCooldownTimer = fireCooldown;
      this.laserCooldownTimer -= dt;
      
      if (this.laserCooldownTimer <= 0 && !this.laserBeamActive) {
        this.laserBeamActive = true;
        this.laserBeamTimer = 0.5; // sweep duration
        this.laserSweepStart = this.satelliteAngle - sweepRange / 2;
        this.laserSweepEnd = this.satelliteAngle + sweepRange / 2;
      }
    }
    
    if (this.laserBeamActive) {
      if (!isEvolved) {
        this.laserBeamTimer -= dt;
        if (this.laserBeamTimer <= 0) {
          this.laserBeamActive = false;
          this.laserCooldownTimer = fireCooldown;
          return;
        }
        const progress = 1.0 - (this.laserBeamTimer / 0.5);
        this.laserSweepAngle = this.laserSweepStart + (this.laserSweepEnd - this.laserSweepStart) * progress;
      }
      
      const beamLength = 600;
      const satX = player.x + Math.cos(this.satelliteAngle) * 120;
      const satY = player.y + Math.sin(this.satelliteAngle) * 120;
      const endX = satX + Math.cos(this.laserSweepAngle) * beamLength;
      const endY = satY + Math.sin(this.laserSweepAngle) * beamLength;
      
      const enemies = enemiesSystem.getActiveEnemies();
      for (let e of enemies) {
        if (!e._laserHitCD || e._laserHitCD <= 0) {
          // Line-circle distance
          const l2 = distSq(satX, satY, endX, endY);
          let t = 0;
          if (l2 > 0) {
            t = clamp(((e.x - satX) * (endX - satX) + (e.y - satY) * (endY - satY)) / l2, 0, 1);
          }
          const projX = satX + t * (endX - satX);
          const projY = satY + t * (endY - satY);
          
          if (distSq(e.x, e.y, projX, projY) < (e.size + 10) ** 2) {
             const actualDamage = isEvolved ? Math.round(damage * 0.3) : damage;
             if (e.takeDamage(actualDamage, enemiesSystem)) enemiesSystem.handleEnemyDeath(e);
             floatingTextManager.spawn(e.x, e.y - 10, actualDamage.toString(), '#00ffff');
             particleManager.spawnHitSparks(e.x, e.y, 0, 0, '#00ffff');
             e._laserHitCD = isEvolved ? 0.2 : 0.5; // continuous hits if evolved
          }
        } else {
          e._laserHitCD -= dt;
        }
      }
    }
  }

  _drawLaserSatellite(ctx, camera, player) {
    const level = player.inventory.getWeaponLevel('LASER_SATELLITE');
    if (level === 0) return;
    
    const satX = player.x + Math.cos(this.satelliteAngle) * 120 - camera.x;
    const satY = player.y + Math.sin(this.satelliteAngle) * 120 - camera.y;
    
    ctx.save();
    if (this.laserBeamActive) {
      const beamLength = 600;
      const endX = satX + Math.cos(this.laserSweepAngle) * beamLength;
      const endY = satY + Math.sin(this.laserSweepAngle) * beamLength;
      
      ctx.beginPath();
      ctx.moveTo(satX, satY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.lineWidth = 10 + level * 2;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(satX, satY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4 + level;
      ctx.stroke();
    }
    
    // Draw satellite
    ctx.translate(satX, satY);
    ctx.rotate(this.satelliteAngle);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fillStyle = '#00ffff';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // ELECTRIC ORB
  // --------------------------------------------------------------------------
  _updateElectricOrb(dt, player, enemiesSystem, particleManager, floatingTextManager) {
    const level = player.inventory.getWeaponLevel('ELECTRIC_ORB');
    if (level === 0) return;
    
    const isEvolved = player.inventory.isWeaponEvolved('ELECTRIC_ORB');
    const zapRate = isEvolved ? 0.3 : Math.max(0.6, 1.5 - (level - 1) * 0.2);
    const range = isEvolved ? 800 : 150 + (level - 1) * 35;
    const damage = Math.round(player.getEffectiveStats().baseDamage * (isEvolved ? 0.3 : (0.5 + (level - 1) * 0.1)));
    const targetsCount = isEvolved ? 999 : level; // 1 to 5, or all
    
    this.orbAngle -= 2.0 * dt; // orbit opposite direction
    
    this.orbZapTimer -= dt;
    if (this.orbZapTimer <= 0) {
      this.orbZapTimer = zapRate;
      
      const orbX = player.x + Math.cos(this.orbAngle) * 100;
      const orbY = player.y + Math.sin(this.orbAngle) * 100;
      
      const enemies = enemiesSystem.getActiveEnemies();
      let validTargets = enemies.filter(e => distSq(orbX, orbY, e.x, e.y) < range * range);
      
      if (validTargets.length > 0) {
        audio.playHit();
        
        if (isEvolved) {
           // Zap everyone
           let lastPos = {x: orbX, y: orbY};
           for (let e of validTargets) {
              if (e.takeDamage(damage, enemiesSystem)) enemiesSystem.handleEnemyDeath(e);
              floatingTextManager.spawn(e.x, e.y - 10, damage.toString(), '#7209b7');
              this.zapLines.push({ x1: lastPos.x, y1: lastPos.y, x2: e.x, y2: e.y, life: 150, color: '#7209b7' });
              lastPos = {x: e.x, y: e.y};
           }
        } else {
           // Random targets chaining
           // Shuffle and pick
           validTargets.sort(() => 0.5 - Math.random());
           const selected = validTargets.slice(0, targetsCount);
           
           let lastPos = {x: orbX, y: orbY};
           for (let e of selected) {
              if (e.takeDamage(damage, enemiesSystem)) enemiesSystem.handleEnemyDeath(e);
              floatingTextManager.spawn(e.x, e.y - 10, damage.toString(), '#00bbff');
              this.zapLines.push({ x1: lastPos.x, y1: lastPos.y, x2: e.x, y2: e.y, life: 150, color: '#00bbff' });
              lastPos = {x: e.x, y: e.y};
           }
        }
      }
    }
  }

  _drawElectricOrb(ctx, camera, player) {
    const level = player.inventory.getWeaponLevel('ELECTRIC_ORB');
    if (level === 0) return;
    
    const orbX = player.x + Math.cos(this.orbAngle) * 100 - camera.x;
    const orbY = player.y + Math.sin(this.orbAngle) * 100 - camera.y;
    
    ctx.save();
    
    // Draw orb
    ctx.beginPath();
    ctx.arc(orbX, orbY, 12, 0, Math.PI * 2);
    ctx.fillStyle = player.inventory.isWeaponEvolved('ELECTRIC_ORB') ? '#7209b7' : '#00bbff';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Sparks
    for(let i=0; i<4; i++) {
      const a = Math.random() * Math.PI * 2;
      const l = randomRange(10, 20);
      ctx.beginPath();
      ctx.moveTo(orbX, orbY);
      ctx.lineTo(orbX + Math.cos(a)*l, orbY + Math.sin(a)*l);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    ctx.restore();
  }
}
