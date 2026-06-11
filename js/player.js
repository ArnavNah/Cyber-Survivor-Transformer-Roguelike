// Survivors Arena Player Controller — Roguelite Upgrade
import { PLAYER_DEFAULTS, PASSIVE_DEFS, getXPNeeded } from './config.js';
import { InventoryManager } from './inventory.js';
import { clamp } from './utils.js';

export class PlayerController {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    
    this.radius = 20;
    this.spriteSize = 56;

    this.hp = 100;
    this.level = 1;
    this.xp = 0;
    this.xpNeeded = getXPNeeded(1);

    // Base stats (modified by passives at runtime)
    this.stats = { ...PLAYER_DEFAULTS };
    
    this.facing = 1;
    this.lastFacingX = 1;
    this.lastFacingY = 0;

    this.invulnTimer = 0;
    this.invulnDuration = 400;
    this.regenAccumulator = 0;

    // New Inventory System
    this.inventory = new InventoryManager();

    // Legacy tracking (kept for backward compat with weapons.js powers)
    this.upgradesCount = {};

    // Combo system
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboBuffs = {};
    this.comboBuffTimer = 0;
    this.onComboBuff = null;

    // Frenzy Mode (triggered by combo milestone)
    this.frenzyMode = false;
    this.frenzyTimer = 0;
    this.frenzyMeter = 0;
    this.onComboBreak = null;

    // Walk Animation
    this.animTimer = 0;
    this.animFrame = 0;
    this.animSpeed = 0.12;
    this.moveFrames = [
      { sx: 63, sy: 67, sw: 305, sh: 319 },
      { sx: 358, sy: 67, sw: 305, sh: 319 },
      { sx: 653, sy: 67, sw: 305, sh: 319 }
    ];
    this.idleTimer = 0;

    // Applied evolution milestones tracker
    this.appliedMilestones = {};
  }

  reset(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.hp = PLAYER_DEFAULTS.maxHp;
    this.level = 1;
    this.xp = 0;
    this.xpNeeded = getXPNeeded(1);
    this.stats = { ...PLAYER_DEFAULTS };
    this.facing = 1;
    this.lastFacingX = 1;
    this.lastFacingY = 0;
    this.invulnTimer = 0;
    this.regenAccumulator = 0;
    this.upgradesCount = {};
    this.inventory.reset();

    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboBuffs = {};
    this.comboBuffTimer = 0;

    this.frenzyMode = false;
    this.frenzyTimer = 0;
    this.frenzyMeter = 0;

    this.animTimer = 0;
    this.animFrame = 0;
    this.idleTimer = 0;
    this.appliedMilestones = {};
  }

  // ========================================
  // Computed Effective Stats (base + passives + combo buffs + frenzy)
  // ========================================
  getEffectiveStats() {
    const bonuses = this.inventory.getPassiveBonuses();
    const comboSpeedMult = this.comboBuffs.speed || 1.0;
    const comboDamageMult = this.comboBuffs.damage || 1.0;
    const comboArmorBonus = this.comboBuffs.armor || 0;
    const comboAtkSpeedMult = this.comboBuffs.attackSpeed || 1.0;
    const comboXpMult = this.comboBuffs.xpMult || 1.0;

    const frenzyDuration = this.stats.frenzyDuration + (bonuses.frenzyDuration || 0);
    const frenzyChargeRateMult = this.stats.frenzyChargeRateMult + (bonuses.frenzyChargeRateMult || 0);
    const frenzyDamageMult = this.stats.frenzyDamageMult + (bonuses.frenzyDamageMult || 0);
    const frenzyExplosion = this.stats.frenzyExplosion || (bonuses.frenzyExplosion > 0);

    const frenzyAtkSpeed = this.frenzyMode ? 0.50 : 0;
    const frenzyDamage = this.frenzyMode ? (frenzyDamageMult - 1.0) : 0; // if 1.5 -> +0.5
    const frenzySpeed = this.frenzyMode ? 0.30 : 0;
    const frenzyPickup = this.frenzyMode ? 100 : 0;
    const frenzyCrit = this.frenzyMode ? 0.25 : 0;

    return {
      luck: this.stats.luck + (bonuses.luck || 0),
      frenzyDuration,
      frenzyChargeRateMult,
      frenzyExplosion,
      xpMult: comboXpMult,
      maxHp: this.stats.maxHp + (bonuses.maxHp || 0),
      speed: this.stats.speed * (1 + (bonuses.moveSpeedMult || 0) + frenzySpeed) * comboSpeedMult,
      pickupRadius: this.stats.pickupRadius + (bonuses.pickupRadius || 0) + frenzyPickup,
      baseDamage: Math.round(this.stats.baseDamage * (1 + (bonuses.damageMult || 0) + frenzyDamage) * comboDamageMult),
      attackCooldown: Math.max(50, Math.round(this.stats.attackCooldown * (1 - (bonuses.attackSpeedMult || 0) - frenzyAtkSpeed) / comboAtkSpeedMult)),
      projSpeed: this.stats.projSpeed,
      projLifetime: this.stats.projLifetime,
      projCount: this.stats.projCount + (bonuses.projCount || 0),
      projPierce: this.stats.projPierce,
      projSize: this.stats.projSize,
      projExplosionRadius: this.stats.projExplosionRadius,
      projSplitCount: this.stats.projSplitCount,
      armor: Math.min(0.75, this.stats.armor + (bonuses.armor || 0) + comboArmorBonus),
      regen: this.stats.regen + (bonuses.regen || 0),
      critChance: Math.min(1.0, this.stats.critChance + (bonuses.critChance || 0) + frenzyCrit),
      critMultiplier: this.stats.critMultiplier,
      critDamageBonus: this.stats.critDamageBonus + (bonuses.critDamageBonus || 0),
      chainLightningChance: this.stats.chainLightningChance,
      burnChance: this.stats.burnChance,
      freezeChance: this.stats.freezeChance,
      poisonChance: this.stats.poisonChance,
      projGlow: this.stats.projGlow,
    };
  }

  handleInput(keys) {
    let dx = 0;
    let dy = 0;

    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    const eff = this.getEffectiveStats();
    this.vx = dx * eff.speed;
    this.vy = dy * eff.speed;

    if (dx !== 0) {
      this.facing = dx > 0 ? 1 : -1;
      this.lastFacingX = dx;
      this.lastFacingY = dy;
    } else if (dy !== 0) {
      this.lastFacingX = 0;
      this.lastFacingY = dy;
    }
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Animation
    const isMoving = this.vx !== 0 || this.vy !== 0;
    if (isMoving) {
      this.animTimer += dt;
      if (this.animTimer >= this.animSpeed) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
      }
      this.idleTimer = 0;
    } else {
      this.idleTimer += dt;
      this.animFrame = 0;
      this.animTimer = 0;
    }

    // Invulnerability
    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt * 1000;
    }

    // Health Regeneration (uses effective regen)
    const eff = this.getEffectiveStats();
    const effectiveMaxHp = eff.maxHp;
    if (eff.regen > 0 && this.hp < effectiveMaxHp) {
      this.regenAccumulator += dt;
      if (this.regenAccumulator >= 1.0) {
        const healTicks = Math.floor(this.regenAccumulator);
        this.heal(healTicks * eff.regen);
        this.regenAccumulator -= healTicks;
      }
    }

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        if (this.comboCount > 0 && this.onComboBreak) {
          this.onComboBreak();
        }
        this.endCombo();
      }
    }

    // Combo buff duration
    if (this.comboBuffTimer > 0) {
      this.comboBuffTimer -= dt;
      if (this.comboBuffTimer <= 0) {
        this.clearComboBuffs();
      }
    }

    // Frenzy Mode timer
    if (this.frenzyTimer > 0) {
      this.frenzyTimer -= dt;
      if (this.frenzyTimer <= 0) {
        this.frenzyMode = false;
        this.frenzyTimer = 0;
      }
    }
  }

  onKill() {
    this.comboCount += 1;
    this.comboTimer = 3.0; // 3 seconds to keep combo alive
    this.gainFrenzy(1);
    this.checkComboMilestones();
  }

  gainFrenzy(amount) {
    if (this.frenzyMode) return; // Don't charge while active
    const eff = this.getEffectiveStats();
    this.frenzyMeter += amount * eff.frenzyChargeRateMult;
    if (this.frenzyMeter >= 100) {
      this.triggerFrenzy();
    }
  }

  triggerFrenzy() {
    if (this.frenzyMode) return;
    this.frenzyMode = true;
    const eff = this.getEffectiveStats();
    this.frenzyTimer = eff.frenzyDuration;
    this.frenzyMeter = 0;
    
    // Play sound and show floating text from game.js
    if (this.game && this.game.audio) this.game.audio.playChestOpen(); // fallback audio
  }

  checkComboMilestones() {
    let buffTriggered = false;
    let buffName = '';
    
    if (this.comboCount === 10) {
      this.comboBuffs.xpMult = 1.10;
      this.comboBuffTimer = 10.0;
      buffName = 'XP Boost (+10% XP)';
      buffTriggered = true;
    } else if (this.comboCount === 25) {
      this.comboBuffs.attackSpeed = 1.10; // divides cooldown by 1.10
      this.comboBuffTimer = 10.0;
      buffName = 'Swift Strikes (+10% Atk Speed)';
      buffTriggered = true;
    } else if (this.comboCount === 50) {
      this.comboBuffs.damage = 1.15;
      this.comboBuffTimer = 15.0;
      buffName = 'Brutality (+15% Damage)';
      buffTriggered = true;
    } else if (this.comboCount === 100) {
      this.gainFrenzy(25);
      buffName = 'Frenzy Surge (+25% Frenzy)';
      buffTriggered = true;
    } else if (this.comboCount === 250) {
      this.gainFrenzy(50);
      buffName = 'Frenzy Rush (+50% Frenzy)';
      buffTriggered = true;
    } else if (this.comboCount === 500) {
      this.triggerFrenzy();
      buffName = 'INSTANT FRENZY!';
      buffTriggered = true;
    }

    if (buffTriggered && this.onComboBuff) {
      this.onComboBuff(buffName, this.comboCount);
    }
  }

  endCombo() {
    this.comboCount = 0;
  }

  clearComboBuffs() {
    this.comboBuffs = {};
  }

  takeDamage(amount) {
    if (this.invulnTimer > 0) return 0;

    const eff = this.getEffectiveStats();
    const reduction = Math.min(0.75, eff.armor);
    const actualDamage = Math.max(1, Math.round(amount * (1 - reduction)));

    this.hp -= actualDamage;
    this.invulnTimer = this.invulnDuration;

    if (this.game && this.game.triggerHitStop) {
      this.game.triggerHitStop(20);
    }

    if (this.hp < 0) this.hp = 0;

    return actualDamage;
  }

  heal(amount) {
    const eff = this.getEffectiveStats();
    this.hp = Math.min(eff.maxHp, this.hp + amount);
  }

  gainXP(amount) {
    const eff = this.getEffectiveStats();
    this.xp += amount * eff.xpMult;
    let leveledUp = false;
    
    while (this.xp >= this.xpNeeded) {
      this.levelUp();
      leveledUp = true;
    }

    return leveledUp;
  }

  levelUp() {
    this.xp -= this.xpNeeded;
    this.level += 1;
    this.xpNeeded = getXPNeeded(this.level);
  }

  // ========================================
  // New Upgrade Application (routed through inventory)
  // ========================================
  applyUpgradeOffer(offer) {
    // offer: { type: 'weapon'|'passive'|'evolution', id: string, rarity: string }
    if (offer.type === 'evolution') {
      this.inventory.evolveWeapon(offer.id);
      return;
    }

    if (offer.type === 'weapon') {
      if (this.inventory.hasWeapon(offer.id)) {
        this.inventory.upgradeWeapon(offer.id);
      } else {
        this.inventory.addWeapon(offer.id);
      }
      // Sync legacy tracking for existing powers
      this.upgradesCount[offer.id] = this.inventory.getWeaponLevel(offer.id);
      return;
    }

    if (offer.type === 'passive') {
      if (this.inventory.hasPassive(offer.id)) {
        this.inventory.upgradePassive(offer.id);
      } else {
        this.inventory.addPassive(offer.id);
      }
      return;
    }
  }

  // Legacy applyUpgrade for backward compat (called by old chest reward system)
  applyUpgrade(upgradeId) {
    this.upgradesCount[upgradeId] = (this.upgradesCount[upgradeId] || 0) + 1;

    switch (upgradeId) {
      case 'DAMAGE_UP':
        this.stats.baseDamage = Math.round(this.stats.baseDamage * 1.20);
        break;
      case 'ATTACK_SPEED':
        this.stats.attackCooldown = Math.max(120, Math.round(this.stats.attackCooldown * 0.90));
        break;
      case 'MOVE_SPEED':
        this.stats.speed = Math.round(this.stats.speed * 1.10);
        break;
      case 'PROJECTILE_SPEED':
        this.stats.projSpeed = Math.round(this.stats.projSpeed * 1.15);
        break;
      case 'MAX_HEALTH':
        this.stats.maxHp += 25;
        this.heal(25);
        break;
      case 'MAGNET':
        this.stats.pickupRadius += 50;
        break;
      case 'MULTI_SHOT':
        this.stats.projCount = Math.min(12, this.stats.projCount + 1);
        break;
      case 'ARMOR':
        this.stats.armor = Math.min(0.75, this.stats.armor + 0.05);
        break;
      case 'REGEN':
        this.stats.regen += 1;
        break;
      case 'CRIT_CHANCE':
        this.stats.critChance = Math.min(1.0, this.stats.critChance + 0.05);
        break;
      case 'CRIT_DAMAGE':
        this.stats.critDamageBonus += 0.25;
        break;
      case 'PIERCING_SHOTS':
        this.stats.projPierce += 1;
        break;
      case 'PROJECTILE_SIZE':
        this.stats.projSize += 0.20;
        break;
      case 'AREA_DAMAGE':
        this.stats.projExplosionRadius = Math.max(40, this.stats.projExplosionRadius + 20);
        break;
      case 'CHAIN_LIGHTNING':
        this.stats.chainLightningChance += 0.10;
        break;
      case 'BURN_EFFECT':
        this.stats.burnChance += 0.15;
        break;
      case 'FREEZE_EFFECT':
        this.stats.freezeChance += 0.10;
        break;
      case 'POISON_EFFECT':
        this.stats.poisonChance += 0.15;
        break;
      case 'GARLIC':
      case 'SHIELD':
      case 'FLAME_TRAIL':
      case 'SPORES':
      case 'LASER':
        break;
    }
  }

  draw(ctx, camera, sprite) {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    // Draw Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 28, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();

    // Frenzy Mode visual glow
    if (this.frenzyMode) {
      ctx.filter = 'drop-shadow(0px 0px 12px rgba(0, 255, 255, 0.9)) drop-shadow(0px 0px 24px rgba(0, 255, 255, 0.5))';
    } else if (this.invulnTimer > 0 && Math.floor(this.invulnTimer / 60) % 2 === 0) {
      ctx.filter = 'drop-shadow(0px 0px 8px rgba(255, 0, 0, 0.8)) brightness(1.5)';
    }

    const moveSprite = this.game ? this.game.sprites['move'] : null;
    const isMoving = this.vx !== 0 || this.vy !== 0;

    if (isMoving && moveSprite && moveSprite.complete) {
      ctx.translate(screenX, screenY + 28);
      ctx.scale(this.facing, 1);
      
      const sequence = [0, 1, 2, 1];
      const frame = this.moveFrames[sequence[this.animFrame]];
      const drawH = 56;
      const drawW = Math.round(drawH * (frame.sw / frame.sh));
      
      ctx.drawImage(
        moveSprite,
        frame.sx, frame.sy, frame.sw, frame.sh,
        -drawW / 2, -drawH, drawW, drawH
      );
    } else if (sprite && sprite.complete) {
      ctx.translate(screenX, screenY + 28);
      
      const bobScaleY = 1 + Math.sin(this.idleTimer * 6) * 0.03;
      const bobScaleX = 1 - Math.sin(this.idleTimer * 6) * 0.015;
      ctx.scale(this.facing * bobScaleX, bobScaleY);
      
      const drawH = 51;
      const drawW = 50;
      
      ctx.drawImage(
        sprite,
        16, 42, 287, 292,
        -drawW / 2, -drawH, drawW, drawH
      );
    } else {
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#8a2be2';
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(screenX + 10 * this.facing, screenY - 4, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    ctx.restore();

    // HP Bar
    const eff = this.getEffectiveStats();
    const barWidth = 40;
    const barHeight = 5;
    const barX = screenX - barWidth / 2;
    const barY = screenY - this.spriteSize / 2 - 8;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
    
    const hpRatio = clamp(this.hp / eff.maxHp, 0, 1);
    ctx.fillStyle = hpRatio > 0.4 ? '#00ffcc' : '#ff3366';
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    ctx.restore();
  }
}
