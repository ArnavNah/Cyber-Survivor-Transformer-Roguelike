// Survivors Arena UI and Overlay Screens Manager
import { WEAPON_DEFS, PASSIVE_DEFS, RARITY_TIERS, UPGRADES, generateUpgradeOffers, rollRarity } from './config.js';
import { audio } from './audio.js';

export class UIManager {
  constructor() {
    this.game = null; // linked during initialization
    
    // UI elements cache
    this.hud = document.getElementById('hud');
    this.xpFill = document.getElementById('xp-bar-fill');
    this.xpText = document.getElementById('xp-text');
    
    this.hpFill = document.getElementById('hp-bar-fill');
    this.hpText = document.getElementById('hp-text');
    this.timerText = document.getElementById('hud-timer');
    this.killText = document.getElementById('kill-count');
    this.bossHpContainer = document.getElementById('boss-health-container');
    this.bossHpFill = document.getElementById('boss-health-fill');
    this.bossNameText = document.getElementById('boss-name');
    
    // Screens
    this.startScreen = document.getElementById('start-screen');
    this.levelupScreen = document.getElementById('levelup-screen');
    this.chestScreen = document.getElementById('chest-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    
    // Debug HUD
    this.debugPanel = document.getElementById('debug-panel');
    this.debugFps = document.getElementById('debug-fps');
    this.debugEnemies = document.getElementById('debug-enemies');
    this.debugProj = document.getElementById('debug-projectiles');
    this.debugPickups = document.getElementById('debug-pickups');

    // Combo UI cache
    this.comboContainer = document.getElementById('hud-combo');
    this.comboNumber = document.getElementById('combo-number');
    this.comboBuffName = document.getElementById('combo-buff-name');

    // Inventory Trays
    this.weaponSlots = document.getElementById('weapon-slots');
    this.passiveSlots = document.getElementById('passive-slots');
    
    this.frenzyOverlay = document.getElementById('frenzy-overlay');
    this.xpStormOverlay = document.getElementById('xpstorm-overlay');
    
    // Frenzy Meter
    this.frenzyMeterContainer = document.getElementById('hud-frenzy');
    this.frenzyBarFill = document.getElementById('frenzy-bar-fill');

    // Score
    this.scoreValueText = document.getElementById('score-value');
    this.displayScore = 0;
  }

  init(gameManager) {
    this.game = gameManager;

    // Start Button listener
    document.getElementById('start-btn').addEventListener('click', () => {
      audio.init();
      this.hideStartScreen();
      this.game.startGame();
    });

    // Restart Button listener
    document.getElementById('restart-btn').addEventListener('click', () => {
      this.hideGameOverScreen();
      this.game.startGame();
    });
  }

  showStartScreen() {
    this.startScreen.classList.remove('hidden');
    this.hud.classList.add('hidden');
  }

  hideStartScreen() {
    this.startScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');
  }

  showGameOverScreen(timeStr, level, kills) {
    this.gameoverScreen.classList.remove('hidden');
    this.hud.classList.add('hidden');
    
    document.getElementById('summary-time').innerText = timeStr;
    document.getElementById('summary-level').innerText = level;
    document.getElementById('summary-kills').innerText = kills;
    document.getElementById('summary-score').innerText = (this.game ? this.game.score : 0).toLocaleString();
    
    audio.playGameOver();
  }

  hideGameOverScreen() {
    this.gameoverScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');
  }

  updateHUD(player, surviveTime, kills, activeBoss) {
    // 1. XP Bar
    const xpPercent = (player.xp / player.xpNeeded) * 100;
    this.xpFill.style.width = `${xpPercent}%`;
    this.xpText.innerText = `Lv. ${player.level} - ${player.xp} / ${player.xpNeeded} XP`;

    // 2. HP Bar
    const eff = player.getEffectiveStats();
    const hpPercent = (player.hp / eff.maxHp) * 100;
    this.hpFill.style.width = `${hpPercent}%`;
    this.hpText.innerText = `${player.hp} / ${eff.maxHp}`;
    if (hpPercent > 40) {
      this.hpFill.classList.add('healthy');
    } else {
      this.hpFill.classList.remove('healthy');
    }

    // 3. Survival Timer
    const min = Math.floor(surviveTime / 60).toString().padStart(2, '0');
    const sec = Math.floor(surviveTime % 60).toString().padStart(2, '0');
    this.timerText.innerText = `${min}:${sec}`;

    // 4. Defeated Kills
    this.killText.innerText = kills;

    // 5. Boss health bar
    if (activeBoss && activeBoss.active) {
      this.bossHpContainer.classList.remove('hidden');
      const bossHpPercent = (activeBoss.hp / activeBoss.maxHp) * 100;
      this.bossHpFill.style.width = `${bossHpPercent}%`;
      this.bossNameText.innerText = activeBoss.stats.type.toUpperCase() + ' GUARDIAN';
    } else {
      this.bossHpContainer.classList.add('hidden');
    }

    // 6. Combo Counter Display
    if (player.comboCount > 1) {
      if (this.comboContainer) {
        this.comboContainer.classList.remove('hidden');
        this.comboNumber.innerText = player.comboCount + 'x';

        const activeBuffKeys = Object.keys(player.comboBuffs);
        if (activeBuffKeys.length > 0 && player.comboBuffTimer > 0) {
          this.comboContainer.classList.add('buffed');
          let buffText = '';
          if (player.comboCount >= 500) buffText = 'APOCALYPSE!';
          else if (player.comboCount >= 250) buffText = 'RAMPAGE!';
          else if (player.comboCount >= 100) buffText = 'FRENZY!';
          else if (player.comboCount >= 50) buffText = 'SHIELDED!';
          else if (player.comboCount >= 25) buffText = 'FIREPOWER!';
          else if (player.comboCount >= 10) buffText = 'SWIFTNESS!';

          const timeRemaining = Math.ceil(player.comboBuffTimer);
          this.comboBuffName.innerText = `${buffText} (${timeRemaining}s)`;
          this.comboBuffName.classList.remove('hidden');
        } else {
          this.comboContainer.classList.remove('buffed');
          this.comboBuffName.classList.add('hidden');
        }
      }
    } else {
      if (this.comboContainer) {
        this.comboContainer.classList.add('hidden');
      }
    }

    // 7. Score Display Update
    if (this.game && this.scoreValueText) {
      if (this.displayScore < this.game.score) {
        this.displayScore += Math.max(1, Math.floor((this.game.score - this.displayScore) * 0.2));
        if (this.displayScore > this.game.score) this.displayScore = this.game.score;
        this.scoreValueText.innerText = this.displayScore.toLocaleString();
      } else if (this.displayScore > this.game.score) {
        this.displayScore = this.game.score; // In case of reset
        this.scoreValueText.innerText = this.displayScore.toLocaleString();
      }
    }

    // 8. Inventory Tray
    this.updateInventoryTray(player);
    
    // 8. Event Overlays and Frenzy Meter
    if (this.frenzyOverlay) {
       if (player.frenzyMode) this.frenzyOverlay.classList.remove('hidden');
       else this.frenzyOverlay.classList.add('hidden');
    }
    
    if (this.frenzyMeterContainer) {
       if (player.frenzyMode) {
         this.frenzyMeterContainer.classList.add('frenzy-active');
         const frenzyPercent = (player.frenzyTimer / player.getEffectiveStats().frenzyDuration) * 100;
         this.frenzyBarFill.style.width = `${frenzyPercent}%`;
       } else {
         this.frenzyMeterContainer.classList.remove('frenzy-active');
         this.frenzyBarFill.style.width = `${player.frenzyMeter}%`;
       }
    }
    
    if (this.xpStormOverlay) {
       if (this.game.activeEvent === 'XP_STORM') this.xpStormOverlay.classList.remove('hidden');
       else this.xpStormOverlay.classList.add('hidden');
    }
  }

  updateInventoryTray(player) {
    if (!player.inventory) return;
    
    if (this.weaponSlots) {
       this.weaponSlots.innerHTML = '';
       for (let i = 0; i < player.inventory.MAX_WEAPONS; i++) {
         const w = player.inventory.activeWeapons.filter(aw => !WEAPON_DEFS[aw.id]?.isBase)[i];
         const slot = document.createElement('div');
         if (w) {
           slot.className = `inv-slot active ${w.evolved ? 'evolved' : ''}`;
           slot.innerText = WEAPON_DEFS[w.id].icon;
           if (!w.evolved) {
             const lvl = document.createElement('div');
             lvl.className = 'inv-slot-level';
             lvl.innerText = w.level;
             slot.appendChild(lvl);
           }
         } else {
           slot.className = 'inv-slot';
         }
         this.weaponSlots.appendChild(slot);
       }
    }
    
    if (this.passiveSlots) {
       this.passiveSlots.innerHTML = '';
       for (let i = 0; i < player.inventory.MAX_PASSIVES; i++) {
         const p = player.inventory.passiveItems[i];
         const slot = document.createElement('div');
         if (p) {
           slot.className = 'inv-slot active';
           slot.innerText = PASSIVE_DEFS[p.id].icon;
           const lvl = document.createElement('div');
           lvl.className = 'inv-slot-level';
           lvl.innerText = p.level;
           slot.appendChild(lvl);
         } else {
           slot.className = 'inv-slot';
         }
         this.passiveSlots.appendChild(slot);
       }
    }
  }

  showLevelUpScreen(player, onSelectUpgrade) {
    this.game.pause();
    this.levelupScreen.classList.remove('hidden');
    audio.playLevelUp();

    const container = document.getElementById('upgrade-cards-container');
    container.innerHTML = '';

    const eff = player.getEffectiveStats();
    const offers = generateUpgradeOffers(player.inventory, eff.luck, 3);

    offers.forEach(offer => {
      const card = document.createElement('div');
      
      if (offer.type === 'evolution') {
        card.className = 'upgrade-card evolution-card rarity-mythic';
        card.innerHTML = `
          <div class="evolution-badge">EVOLUTION</div>
          <div class="upgrade-icon-wrapper">${offer.def.icon}</div>
          <div class="upgrade-name">${offer.def.evolutionName}</div>
          <div class="upgrade-desc">${offer.def.evolutionDesc}</div>
        `;
      } else {
        const rarityClass = `rarity-${offer.rarity.toLowerCase()}`;
        card.className = `upgrade-card ${rarityClass}`;
        
        card.innerHTML = `
          <div class="rarity-label ${offer.rarity.toLowerCase()}">${offer.rarity}</div>
          <div class="upgrade-icon-wrapper">${offer.def.icon}</div>
          <div class="upgrade-name">${offer.def.name}</div>
          <div class="upgrade-desc">${offer.def.desc}</div>
          <div class="upgrade-level">Lv. ${offer.currentLevel} &rarr; ${offer.currentLevel + 1}</div>
        `;
      }

      card.addEventListener('click', () => {
        // Selected animation
        card.style.transform = 'scale(1.1)';
        card.style.filter = 'brightness(1.5)';
        card.style.transition = 'all 0.2s ease-out';
        
        setTimeout(() => {
          this.levelupScreen.classList.add('hidden');
          if (offer.type === 'evolution' || offer.rarity === 'MYTHIC') {
             this.playEvolutionSequence(offer, () => {
               onSelectUpgrade(offer);
               this.game.resume();
             });
          } else {
             onSelectUpgrade(offer);
             this.game.resume();
          }
        }, 200);
      });

      container.appendChild(card);
    });
  }

  showChestScreen(player, onFinished, isBoss = false) {
    this.game.pause();
    this.chestScreen.classList.remove('hidden');

    const chestSprite = document.getElementById('chest-sprite');
    const instruction = document.getElementById('chest-instruction');
    const rewardsGrid = document.getElementById('chest-rewards-container');
    const continueBtn = document.getElementById('chest-continue-btn');

    // Reset chest classes
    chestSprite.className = 'chest-closed';
    chestSprite.classList.remove('celebrating');
    instruction.classList.remove('hidden');
    rewardsGrid.classList.add('hidden');
    rewardsGrid.innerHTML = '';
    continueBtn.classList.add('hidden');
    
    // Clear old confetti
    const oldConfetti = document.querySelectorAll('.chest-confetti');
    oldConfetti.forEach(c => c.remove());

    // Setup chest click (one-shot listener)
    const openChestHandler = () => {
      chestSprite.removeEventListener('click', openChestHandler);
      
      // 1. Shaking phase
      chestSprite.className = 'chest-shaking';
      audio.playHit();
      
      setTimeout(() => {
        // 2. Open chest and show rewards
        chestSprite.className = 'chest-open celebrating';
        instruction.classList.add('hidden');
        rewardsGrid.classList.remove('hidden');
        audio.playChestOpen();
        
        // Spawn confetti
        for(let i=0; i<30; i++) {
           const conf = document.createElement('div');
           conf.className = 'chest-confetti';
           conf.style.left = (Math.random() * 100) + '%';
           conf.style.top = '30%';
           const colors = ['#ff0055', '#ffd700', '#00ffff', '#9c27b0'];
           conf.style.backgroundColor = colors[Math.floor(Math.random()*colors.length)];
           conf.style.animationDelay = (Math.random() * 0.5) + 's';
           this.chestScreen.appendChild(conf);
        }

        // 3. Roll rewards count and chest rarity
        let rewardCount = isBoss ? 3 : 1;
        const eff = player.getEffectiveStats();
        
        let chestRarity = 'COMMON';
        if (isBoss) {
          const roll = Math.random();
          if (roll < 0.01 * (1 + eff.luck / 50)) chestRarity = 'MYTHIC';
          else if (roll < 0.03 * (1 + eff.luck / 50)) chestRarity = 'LEGENDARY';
          else if (roll < 0.10 * (1 + eff.luck / 100)) chestRarity = 'EPIC';
          else if (roll < 0.30 * (1 + eff.luck / 200)) chestRarity = 'RARE';
        } else {
           const roll = Math.random();
           if (roll < 0.05) rewardCount = 4;
           else if (roll < 0.25) rewardCount = 2;
        }

        // Apply chest rarity visually to the chest sprite
        if (isBoss && chestRarity !== 'COMMON') {
           chestSprite.style.filter = `drop-shadow(0 0 20px ${RARITY_TIERS[chestRarity].color})`;
        }

        // Generate offers (use same logic as level up but apply immediately)
        const offers = generateUpgradeOffers(player.inventory, eff.luck, rewardCount);
        
        if (isBoss && offers.length > 0) {
           // Guarantee at least Epic/Legendary for first boss item
           if (offers[0].type !== 'evolution') {
              offers[0].rarity = 'LEGENDARY';
              offers[0].rarityTier = RARITY_TIERS['LEGENDARY'];
           }
        }

        // Stagger display of reward cards
        offers.forEach((offer, index) => {
          player.applyUpgradeOffer(offer);
          
          const card = document.createElement('div');
          let rClass = '';
          if(offer.type !== 'evolution') rClass = `rarity-${offer.rarity.toLowerCase()}`;
          else rClass = 'rarity-mythic';
          
          card.className = `reward-card ${rClass}`;
          card.style.animationDelay = `${index * 0.3}s`;

          card.innerHTML = `
            <div class="reward-icon">${offer.def.icon}</div>
            <div class="reward-title">${offer.type === 'evolution' ? offer.def.evolutionName : offer.def.name}</div>
            <div class="reward-value" style="font-size:10px; margin-top:4px; color:${offer.type==='evolution'?'#ffd700':RARITY_TIERS[offer.rarity].color}">${offer.type === 'evolution' ? 'EVOLVED!' : '+UPGRADED'}</div>
          `;

          // Play high note chime as each card reveals
          setTimeout(() => {
            if (this.chestScreen.classList.contains('hidden')) return;
            audio.playShoot();
            const px = player.x; // We don't have screen coords here easily, but just play sound
          }, index * 300);

          rewardsGrid.appendChild(card);
        });

        // Show continue button after all cards have revealed
        setTimeout(() => {
          continueBtn.classList.remove('hidden');
        }, rewardCount * 300 + 200);

      }, 1000);
    };

    chestSprite.addEventListener('click', openChestHandler);

    // Setup continue click
    const continueHandler = () => {
      continueBtn.removeEventListener('click', continueHandler);
      this.chestScreen.classList.add('hidden');
      onFinished();
      this.game.resume();
    };
    continueBtn.addEventListener('click', continueHandler);
  }

  playEvolutionSequence(offer, callback) {
    const flash = document.createElement('div');
    flash.style.position = 'absolute';
    flash.style.top = '0'; flash.style.left = '0'; flash.style.width = '100%'; flash.style.height = '100%';
    flash.style.backgroundColor = 'white';
    flash.style.zIndex = '9999';
    flash.style.transition = 'opacity 1s ease-out';
    document.getElementById('game-container').appendChild(flash);
    
    const card = document.createElement('div');
    card.className = 'upgrade-card evolution-card rarity-mythic';
    card.style.position = 'absolute';
    card.style.top = '50%'; card.style.left = '50%';
    card.style.transform = 'translate(-50%, -50%) scale(0.1)';
    card.style.zIndex = '10000';
    card.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    card.innerHTML = `
      <div class="evolution-badge">${offer.type === 'evolution' ? 'EVOLUTION ACHIEVED' : 'MYTHIC FOUND'}</div>
      <div class="upgrade-icon-wrapper" style="font-size: 64px">${offer.def.icon}</div>
      <div class="upgrade-name">${offer.type === 'evolution' ? offer.def.evolutionName : offer.def.name}</div>
      <div class="upgrade-desc">${offer.type === 'evolution' ? offer.def.evolutionDesc : offer.def.desc}</div>
    `;
    document.getElementById('game-container').appendChild(card);

    requestAnimationFrame(() => {
       flash.style.opacity = '0';
       card.style.transform = 'translate(-50%, -50%) scale(1.5)';
    });

    setTimeout(() => {
       flash.remove();
       card.style.transform = 'translate(-50%, -50%) scale(0.1)';
       card.style.opacity = '0';
       setTimeout(() => {
          card.remove();
          callback();
       }, 500);
    }, 2500);
  }

  toggleDebugPanel(visible) {
    if (visible) {
      this.debugPanel.classList.remove('hidden');
    } else {
      this.debugPanel.classList.add('hidden');
    }
  }

  updateDebug(fps, enemiesCount, projCount, pickupsCount) {
    this.debugFps.innerText = fps;
    this.debugEnemies.innerText = enemiesCount;
    this.debugProj.innerText = projCount;
    this.debugPickups.innerText = pickupsCount;
  }
}
