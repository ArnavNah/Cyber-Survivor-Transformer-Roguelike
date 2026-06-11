// Survivors Arena Pickups and Collectibles System
import { distSq, randomRange } from './utils.js';
import { audio } from './audio.js';

class Gem {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.xpValue = 1;
    this.isChest = false;
    this.type = 'gem';

    this.radius = 10;
    this.spriteSize = 24;

    this.beingPulled = false;
    this.pullSpeed = 100; // starts slow, accelerates
  }

  init(x, y, xpValue = 1, isChest = false) {
    this.x = x;
    this.y = y;
    this.xpValue = xpValue;
    this.isChest = isChest;
    this.type = 'gem';

    this.radius = isChest ? 20 : 10;
    this.spriteSize = isChest ? 48 : 24;

    this.beingPulled = false;
    this.pullSpeed = 120;
    this.active = true;
  }

  update(dt, playerX, playerY, pickupRadius) {
    if (!this.active) return;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dSq = dx * dx + dy * dy;

    // Boss chests are always pulled from farther away once you get near (e.g. 200px)
    const effectiveRadius = this.isChest ? Math.max(pickupRadius, 200) : pickupRadius;

    if (!this.beingPulled && dSq < effectiveRadius * effectiveRadius) {
      this.beingPulled = true;
    }

    if (this.beingPulled) {
      const d = Math.sqrt(dSq);
      if (d > 0) {
        // Accelerating pull speed
        this.pullSpeed += 650 * dt;
        
        // Move towards player
        this.x += (dx / d) * this.pullSpeed * dt;
        this.y += (dy / d) * this.pullSpeed * dt;
      }
    }
  }

  draw(ctx, camera, gemSprite, bossSprite) {
    if (!this.active) return;

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.save();

    if (this.isChest) {
      // Glow and render chest representation
      ctx.filter = 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))';
      if (bossSprite && bossSprite.complete) {
        // Draw boss image shrunk as chest placeholder
        ctx.drawImage(
          bossSprite,
          -this.spriteSize / 2,
          -this.spriteSize / 2,
          this.spriteSize,
          this.spriteSize
        );
      } else {
        // Fallback chest draw
        ctx.fillStyle = '#ffd700';
        ctx.strokeStyle = '#ffa500';
        ctx.lineWidth = 3;
        ctx.fillRect(screenX - 16, screenY - 12, 32, 24);
        ctx.strokeRect(screenX - 16, screenY - 12, 32, 24);
      }
    } else if (this.type === 'chicken') {
      // Draw Floor Chicken: Red Cross symbol
      ctx.filter = 'drop-shadow(0 0 8px #ff3366)';
      ctx.fillStyle = '#ff3366';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      
      ctx.fillRect(screenX - 8, screenY - 3, 16, 6);
      ctx.fillRect(screenX - 3, screenY - 8, 6, 16);
      ctx.strokeRect(screenX - 8, screenY - 3, 16, 6);
      ctx.strokeRect(screenX - 3, screenY - 8, 6, 16);
    } else if (this.type === 'vacuum') {
      // Draw Aether Vacuum: Red horseshoe magnet
      ctx.filter = 'drop-shadow(0 0 8px #ffd700)';
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.arc(screenX, screenY + 2, 7, Math.PI, 0, false);
      ctx.stroke();
      
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(screenX - 9, screenY - 4, 3, 3);
      ctx.fillRect(screenX + 6, screenY - 4, 3, 3);
    } else if (this.type === 'nuke') {
      // Draw Holy Hand Grenade: Circle Bomb with gold cross
      ctx.filter = 'drop-shadow(0 0 10px #ff3c00)';
      
      ctx.fillStyle = '#333333';
      ctx.beginPath();
      ctx.arc(screenX, screenY + 2, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(screenX - 1, screenY - 10, 2, 6);
      ctx.fillRect(screenX - 3, screenY - 8, 6, 2);
    } else if (this.type === 'freeze') {
      // Draw Glacial Hourglass: Cyan Snowflake
      ctx.filter = 'drop-shadow(0 0 8px #00ffff)';
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(screenX - 7, screenY - 7);
      ctx.lineTo(screenX + 7, screenY + 7);
      ctx.moveTo(screenX + 7, screenY - 7);
      ctx.lineTo(screenX - 7, screenY + 7);
      ctx.moveTo(screenX, screenY - 9);
      ctx.lineTo(screenX, screenY + 9);
      ctx.moveTo(screenX - 9, screenY);
      ctx.lineTo(screenX + 9, screenY);
      ctx.stroke();
    } else {
      // XP Gem
      ctx.filter = 'drop-shadow(0 0 5px rgba(0, 255, 255, 0.6))';
      if (gemSprite && gemSprite.complete) {
        ctx.drawImage(
          gemSprite,
          screenX - this.spriteSize / 2,
          screenY - this.spriteSize / 2,
          this.spriteSize,
          this.spriteSize
        );
      } else {
        // Fallback shape: glowing turquoise diamond
        ctx.fillStyle = '#00f5d4';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - this.radius);
        ctx.lineTo(screenX + this.radius, screenY);
        ctx.lineTo(screenX, screenY + this.radius);
        ctx.lineTo(screenX - this.radius, screenY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

export class PickupSystem {
  constructor(maxPickups = 600) {
    this.pool = Array.from({ length: maxPickups }, () => new Gem());
    this.particleManager = null;
    this.floatingTextManager = null;
  }

  init(particleManager, floatingTextManager) {
    this.particleManager = particleManager;
    this.floatingTextManager = floatingTextManager;
  }

  reset() {
    this.pool.forEach(p => p.active = false);
  }

  getActivePickups() {
    return this.pool.filter(p => p.active);
  }

  triggerMagnetBurst(player) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (p.active) {
        p.beingPulled = true;
      }
    }
  }

  spawnGem(x, y, xpValue) {
    const gem = this.pool.find(p => !p.active);
    if (gem) {
      gem.init(x, y, xpValue, false);
    }
  }

  spawnChest(x, y) {
    const gem = this.pool.find(p => !p.active);
    if (gem) {
      gem.init(x, y, 0, true);
    }
  }

  spawnUtility(x, y, type) {
    const gem = this.pool.find(p => !p.active);
    if (gem) {
      gem.init(x, y, 0, false);
      gem.type = type;
      gem.radius = 14;
      gem.spriteSize = 32;
    }
  }

  update(dt, player, onLevelUp, onChestCollect) {
    const activePickups = this.getActivePickups();
    
    for (let i = 0; i < activePickups.length; i++) {
      const pickup = activePickups[i];
      
      // Update pickup movements
      pickup.update(dt, player.x, player.y, player.stats.pickupRadius);

      // Check collection distance
      const dSq = distSq(pickup.x, pickup.y, player.x, player.y);
      const touchDist = pickup.radius + player.radius;

      if (dSq < touchDist * touchDist) {
        // Collect!
        pickup.active = false;

        if (pickup.isChest) {
          // Trigger boss chest opening callback
          audio.playChestOpen();
          onChestCollect();
        } else if (pickup.type === 'chicken') {
          audio.playGem();
          player.heal(25);
          this.floatingTextManager.spawn(player.x, player.y - 30, "+25 HP", "#ff3366", true, 16);
          this.particleManager.spawnGemSparkle(player.x, player.y, "#ff3366");
        } else if (pickup.type === 'vacuum') {
          audio.playGem();
          this.triggerMagnetBurst(player);
          this.floatingTextManager.spawn(player.x, player.y - 30, "AETHER VACUUM!", "#ffd700", true, 18);
          this.particleManager.spawnGemSparkle(player.x, player.y, "#ffd700");
        } else if (pickup.type === 'nuke') {
          audio.playHit();
          
          // Deal high damage to all active enemies
          const activeEnemies = player.game.enemies.getActiveEnemies();
          activeEnemies.forEach(e => {
            if (!e.isBoss) {
              const isDead = e.takeDamage(120, player.game.enemies);
              if (isDead) {
                player.game.enemies.handleEnemyDeath(e);
              }
            } else {
              e.takeDamage(200, player.game.enemies);
            }
          });
          
          this.floatingTextManager.spawn(player.x, player.y - 30, "HOLY GRENADE!", "#ff3c00", true, 22);
          player.game.triggerScreenShake(20, 0.6);
          player.game.triggerHitStop(100);
          this.particleManager.spawnExplosion(player.x, player.y, "#ff3c00", 40, 400);
        } else if (pickup.type === 'freeze') {
          audio.playGem();
          
          const activeEnemies = player.game.enemies.getActiveEnemies();
          activeEnemies.forEach(e => {
            e.freezeTimer = 4.0;
          });
          
          this.floatingTextManager.spawn(player.x, player.y - 30, "GLACIAL TIMER!", "#00ffff", true, 18);
          this.particleManager.spawnGemSparkle(player.x, player.y, "#00ffff");
        } else {
          // Normal gem collect
          audio.playGem();
          
          const leveledUp = player.gainXP(pickup.xpValue);
          
          // Particle trail sparks
          this.particleManager.spawnGemSparkle(player.x, player.y, '#00ffff');

          // Floating text
          this.floatingTextManager.spawn(
            player.x + randomRange(-20, 20),
            player.y - 30,
            `+${pickup.xpValue} XP`,
            '#00f5d4',
            false,
            12
          );

          if (leveledUp) {
            onLevelUp();
          }
        }
      }
    }
  }

  draw(ctx, camera, spritesMap) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (p.active) {
        p.draw(ctx, camera, spritesMap['gem'], spritesMap['boss']);
      }
    }
  }
}
