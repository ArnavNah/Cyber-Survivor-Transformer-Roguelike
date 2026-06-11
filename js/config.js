// Survivors Arena Game Configuration Constants

export const ASSETS = {
  bg: 'images/bg.png',
  hero: 'images/hero.png',
  enemy: 'images/enemy.png',
  enemy1: 'images/enemy1.png',
  enemy2: 'images/enemy2.png',
  boss: 'images/boss.png',
  projectile: 'images/projectile.png',
  gem: 'images/gem.png',
  move: 'animation/move.png'
};

export const PLAYER_DEFAULTS = {
  maxHp: 100,
  speed: 250,
  pickupRadius: 50,
  baseDamage: 10,
  attackCooldown: 1000, // in milliseconds
  projSpeed: 700,
  projLifetime: 2000, // in milliseconds
  projCount: 1,
  projPierce: 1,
  projSize: 1.0, // scale factor
  projExplosionRadius: 0, // 0 = no explosion
  projSplitCount: 0, // 0 = no splitting
  armor: 0, // percent damage reduction (e.g. 0.05 for 5%)
  regen: 0, // hp per second
  critChance: 0.0, // percent (e.g. 0.05 for 5%)
  critMultiplier: 2.0,
  
  // Advanced stats added for enhancements
  critDamageBonus: 0.0, // added to critMultiplier (e.g. +0.25)
  chainLightningChance: 0.0, // chance to chain hit (e.g. 0.10 for 10%)
  burnChance: 0.0, // chance to ignite enemy
  freezeChance: 0.0, // chance to freeze enemy
  poisonChance: 0.0, // chance to poison enemy
  projGlow: null, // glow style: 'blue', 'orange', etc.
  
  // New mechanics
  luck: 0,
  frenzyDuration: 10,
  frenzyChargeRateMult: 1.0,
  frenzyDamageMult: 1.5,
  frenzyExplosion: false
};

export const ENEMY_TYPES = {
  BASIC: {
    type: 'basic',
    spriteKey: 'enemy',
    hp: 20,
    damage: 5,
    speed: 120,
    xp: 1,
    size: 26, // hit radius
    separationWeight: 1.2
  },
  MID: {
    type: 'mid',
    spriteKey: 'enemy1',
    hp: 40,
    damage: 10,
    speed: 90,
    xp: 2,
    size: 32,
    separationWeight: 1.4
  },
  TANK: {
    type: 'tank',
    spriteKey: 'enemy2',
    hp: 100,
    damage: 15,
    speed: 60,
    xp: 5,
    size: 40,
    separationWeight: 1.8
  },
  HUNTER: {
    type: 'hunter',
    spriteKey: 'enemy1',
    hp: 12,
    damage: 4,
    speed: 230, // very fast
    xp: 2,
    size: 20,
    separationWeight: 0.8
  },
  BRUTE: {
    type: 'brute',
    spriteKey: 'enemy2',
    hp: 260, // extremely high hp
    damage: 20,
    speed: 50, // slow
    xp: 10,
    size: 44,
    separationWeight: 2.0
  },
  RANGED: {
    type: 'ranged',
    spriteKey: 'enemy1',
    hp: 30,
    damage: 6,
    speed: 80,
    xp: 3,
    size: 28,
    separationWeight: 1.2
  },
  SUMMONER: {
    type: 'summoner',
    spriteKey: 'enemy',
    hp: 60,
    damage: 8,
    speed: 70,
    xp: 5,
    size: 34,
    separationWeight: 1.5
  },
  EXPLODER: {
    type: 'exploder',
    spriteKey: 'enemy',
    hp: 15,
    damage: 25, // explosive suicide contact damage
    speed: 170, // fast
    xp: 3,
    size: 22,
    separationWeight: 1.0
  },
  CRAWLER: {
    type: 'crawler',
    spriteKey: 'enemy',
    hp: 10,
    damage: 3,
    speed: 80,
    xp: 1,
    size: 16,
    separationWeight: 0.5
  },
  BOSS: {
    type: 'boss',
    spriteKey: 'boss',
    hp: 1200,
    damage: 30,
    speed: 85,
    xp: 100,
    size: 64,
    separationWeight: 3.0,
    isBoss: true
  },
  TORCH: {
    type: 'torch',
    spriteKey: 'gem',
    hp: 1,
    damage: 0,
    speed: 0,
    xp: 0,
    size: 16,
    separationWeight: 0.0,
    isTorch: true
  }
};

// Difficulty Scaling Rules (per minute)
export const SCALING_RULES = {
  hp: 0.12,      // +12% enemy hp per minute
  damage: 0.06,  // +6% enemy damage per minute
  spawnRate: 0.12, // +12% spawn frequency per minute
  speed: 0.03    // +3% enemy movement speed per minute
};

export const BOSS_CADENCE_SECS = 300; // 5 minutes

export const UPGRADES = [
  {
    id: 'DAMAGE_UP',
    name: 'Heavy Strikes',
    desc: 'Increases all attack damage by 20%.',
    icon: '⚔️',
    value: 0.20
  },
  {
    id: 'ATTACK_SPEED',
    name: 'Wind Swiftness',
    desc: 'Reduces weapon attack cooldown by 10%.',
    icon: '⚡',
    value: 0.10
  },
  {
    id: 'MOVE_SPEED',
    name: 'Fleetfoot Boots',
    desc: 'Increases movement speed by 10%.',
    icon: '🥾',
    value: 0.10
  },
  {
    id: 'PROJECTILE_SPEED',
    name: 'Fierce Velocity',
    desc: 'Increases projectile velocity by 15%.',
    icon: '🏹',
    value: 0.15
  },
  {
    id: 'MAX_HEALTH',
    name: 'Elixir of Vitality',
    desc: 'Increases Max Health by 25 and heals you for 25.',
    icon: '❤️',
    value: 25
  },
  {
    id: 'MAGNET',
    name: 'Attraction Core',
    desc: 'Increases pickup radius by 50 range.',
    icon: '🧲',
    value: 50
  },
  {
    id: 'ARMOR',
    name: 'Reinforced Plate',
    desc: 'Reduces all damage taken by 5%.',
    icon: '🛡️',
    value: 0.05
  },
  {
    id: 'REGEN',
    name: 'Regrowth Spores',
    desc: 'Regenerates 1 HP every second.',
    icon: '🌱',
    value: 1
  },
  
  // Advanced upgrades from prompt
  {
    id: 'MULTI_SHOT',
    name: 'Duplicator Matrix',
    desc: 'Fires +1 projectile (Spread mode). Maximum of 8.',
    icon: '🔮',
    value: 1
  },
  {
    id: 'PIERCING_SHOTS',
    name: 'Piercing Shells',
    desc: 'Projectiles pass through 1 additional enemy.',
    icon: '🎯',
    value: 1
  },
  {
    id: 'CRIT_CHANCE',
    name: 'Precision Scope',
    desc: 'Increases critical hit chance by 5%. Critical hits deal double damage.',
    icon: '🔍',
    value: 0.05
  },
  {
    id: 'CRIT_DAMAGE',
    name: 'Shattering Impact',
    desc: 'Increases critical damage multiplier by +25%.',
    icon: '💥',
    value: 0.25
  },
  {
    id: 'PROJECTILE_SIZE',
    name: 'Gigantism Rune',
    desc: 'Increases projectile size by 20% for better hit consistency.',
    icon: '🧿',
    value: 0.20
  },
  {
    id: 'AREA_DAMAGE',
    name: 'Ember Burst',
    desc: 'Projectiles explode in a small radius on hit. Unlocks explosions!',
    icon: '🔥',
    value: 40 // explosion radius (starts at 40, increases by 20)
  },
  {
    id: 'CHAIN_LIGHTNING',
    name: 'Tesla Core',
    desc: 'Projectiles have +10% chance to jump damage between up to 3 nearby targets.',
    icon: '⚡',
    value: 0.10
  },
  {
    id: 'BURN_EFFECT',
    name: 'Napalm Core',
    desc: 'Projectiles have +15% chance to burn enemies (dealing 5 DPS for 3 seconds).',
    icon: '🌋',
    value: 0.15
  },
  {
    id: 'FREEZE_EFFECT',
    name: 'Glacial Core',
    desc: 'Projectiles have +10% chance to freeze enemies for 1.5s, halting them.',
    icon: '❄️',
    value: 0.10
  },
  {
    id: 'POISON_EFFECT',
    name: 'Venom Core',
    desc: 'Projectiles have +15% chance to apply stacking poison (3 damage/sec).',
    icon: '🧪',
    value: 0.15
  },
  {
    id: 'GARLIC',
    name: 'Garlic Aura',
    desc: 'Unlocks/upgrades a garlic aura that damages and slows nearby enemies.',
    icon: '🧄',
    value: 1
  },
  {
    id: 'SHIELD',
    name: 'Orbiting Shields',
    desc: 'Unlocks/upgrades rotating shield plates that damage and knock back enemies.',
    icon: '🛡️',
    value: 1
  },
  {
    id: 'FLAME_TRAIL',
    name: 'Napalm Trail',
    desc: 'Unlocks/upgrades a fire trail behind you that burns enemies.',
    icon: '🔥',
    value: 1
  },
  {
    id: 'SPORES',
    name: 'Toxic Spores',
    desc: 'Unlocks/upgrades expanding toxic spore clouds that damage enemies.',
    icon: '🍄',
    value: 1
  },
  {
    id: 'LASER',
    name: 'Aether Laser',
    desc: 'Unlocks/upgrades an automatic sniper laser that pierces enemies in a line.',
    icon: '⚡',
    value: 1
  }
];

// Weapon Evolution Milestones
export const EVOLUTION_MILESTONES = {
  5: {
    name: 'Evolution 1: Azure Blast',
    desc: 'Projectiles are 30% larger, glow blue, and deal +50% damage!',
    requires: 'DAMAGE_UP',
    check: (player) => (player.upgradesCount['DAMAGE_UP'] || 0) > 0,
    apply: (player) => {
      player.stats.projSize += 0.3;
      player.stats.baseDamage = Math.round(player.stats.baseDamage * 1.5);
      player.stats.projGlow = 'blue';
    }
  },
  10: {
    name: 'Evolution 2: Gatling Pierce',
    requires: 'MULTI_SHOT',
    desc: 'Projectiles gain +1 Pierce and attack rate increases by 20%!',
    check: (player) => (player.upgradesCount['MULTI_SHOT'] || 0) > 0,
    apply: (player) => {
      player.stats.projPierce += 1;
      player.stats.attackCooldown = Math.max(120, Math.round(player.stats.attackCooldown * 0.8));
    }
  },
  15: {
    name: 'Evolution 3: Blast Shockwave',
    requires: 'CRIT_CHANCE',
    desc: 'Projectiles explode on hit (or explosion radius is boosted by +50px)!',
    check: (player) => (player.upgradesCount['CRIT_CHANCE'] || 0) > 0,
    apply: (player) => {
      player.stats.projExplosionRadius = Math.max(50, player.stats.projExplosionRadius + 50);
    }
  },
  20: {
    name: 'Evolution 4: Cosmic Devastation',
    requires: null,
    desc: 'Defeated enemies cause projectiles to split into 2 and blast in massive explosions!',
    check: (player) => true,
    apply: (player) => {
      player.stats.projSplitCount = 2;
      player.stats.projExplosionRadius = Math.max(90, player.stats.projExplosionRadius + 40);
    }
  }
};

// Calculate XP needed for next level-up
export function getXPNeeded(level) {
  if (level === 1) return 10;
  if (level === 2) return 20;
  if (level === 3) return 35;
  if (level === 4) return 55;
  
  // Exponential scaling for Level 5+
  return 55 + (level - 4) * 30 + Math.floor(level * 8);
}

// ----------------------------------------------------
// New Inventory & Upgrade System Definitions
// ----------------------------------------------------

export const WEAPON_DEFS = {
  BASE_PROJECTILE: { id: 'BASE_PROJECTILE', name: 'Pulse Shot', icon: '🔫', desc: 'Fires magic projectiles.', maxLevel: 5, isBase: true, evolutionName: 'Piercing Cannon', evolutionDesc: 'Piercing lasers.', evolutionRequires: 'PIERCE_MOD' },
  COMPANION_DRONE: { id: 'COMPANION_DRONE', name: 'Companion Drones', icon: '🛸', desc: 'Orbiting drones that shoot enemies.', maxLevel: 5, evolutionName: 'Thunder Drone', evolutionDesc: 'Drones fire chain lightning.', evolutionRequires: 'CHAIN_LIGHTNING' },
  ORBITAL_BLADES: { id: 'ORBITAL_BLADES', name: 'Orbital Blades', icon: '⚔️', desc: 'Rotating blades that damage on contact.', maxLevel: 5, evolutionName: 'Death Ring', evolutionDesc: 'Permanent damaging aura.', evolutionRequires: 'EXPLOSION_MOD' },
  MISSILE_POD: { id: 'MISSILE_POD', name: 'Missile Pod', icon: '🚀', desc: 'Fires homing missiles.', maxLevel: 5, evolutionName: 'Cluster Storm', evolutionDesc: 'Missiles split into cluster bombs.', evolutionRequires: 'REACTOR_CORE' },
  LASER_SATELLITE: { id: 'LASER_SATELLITE', name: 'Laser Satellite', icon: '🛰️', desc: 'Orbital satellite with sweeping laser.', maxLevel: 5, evolutionName: 'Death Ray', evolutionDesc: 'Continuous concentrated beam.', evolutionRequires: 'ENERGY_CELL' },
  ELECTRIC_ORB: { id: 'ELECTRIC_ORB', name: 'Electric Orb', icon: '⚡', desc: 'Periodically zaps nearby enemies.', maxLevel: 5, evolutionName: 'Lightning Network', evolutionDesc: 'Continuously zaps all enemies.', evolutionRequires: 'MULTI_SHOT_MOD' },
  GARLIC_AURA: { id: 'GARLIC_AURA', name: 'Garlic Aura', icon: '🧄', desc: 'Damaging aura around the player.', maxLevel: 5, evolutionName: 'Toxic Nova', evolutionDesc: 'Huge toxic poison burst.', evolutionRequires: 'NANO_REPAIR' },
  SHIELD_ORBIT: { id: 'SHIELD_ORBIT', name: 'Orbiting Shields', icon: '🛡️', desc: 'Orbiting shields that block and damage.', maxLevel: 5, evolutionName: 'Force Barrier', evolutionDesc: 'Permanent protective ring.', evolutionRequires: 'ARMOR_PLATING' },
  FLAME_TRAIL: { id: 'FLAME_TRAIL', name: 'Napalm Trail', icon: '🔥', desc: 'Leaves a trail of fire as you move.', maxLevel: 5, evolutionName: 'Inferno Wake', evolutionDesc: 'Massive fire trail.', evolutionRequires: 'REACTOR_CORE' },
  SPORE_CLOUD: { id: 'SPORE_CLOUD', name: 'Toxic Spores', icon: '🍄', desc: 'Pops toxic clouds randomly.', maxLevel: 5, evolutionName: 'Plague Storm', evolutionDesc: 'Huge persistent poison clouds.', evolutionRequires: 'NANO_REPAIR' },
  LASER_SNIPER: { id: 'LASER_SNIPER', name: 'Aether Laser', icon: '💎', desc: 'Fires piercing sniper beam.', maxLevel: 5, evolutionName: 'Prismatic Beam', evolutionDesc: 'Multi-directional laser blasts.', evolutionRequires: 'TARGETING_COMPUTER' },
};

export const PASSIVE_DEFS = {
  REACTOR_CORE: { id: 'REACTOR_CORE', name: 'Reactor Core', icon: '⚡', desc: '+8% attack speed per level.', maxLevel: 5, perLevel: { attackSpeedMult: 0.08 } },
  ENERGY_CELL: { id: 'ENERGY_CELL', name: 'Energy Cell', icon: '💥', desc: '+12% damage per level.', maxLevel: 5, perLevel: { damageMult: 0.12 } },
  MAGNET_MODULE: { id: 'MAGNET_MODULE', name: 'Magnet Module', icon: '🧲', desc: '+40 pickup radius per level.', maxLevel: 5, perLevel: { pickupRadius: 40 } },
  NANO_REPAIR: { id: 'NANO_REPAIR', name: 'Nano Repair', icon: '💚', desc: '+1 HP/s regen & +10 Max HP per level.', maxLevel: 5, perLevel: { regen: 1, maxHp: 10 } },
  ARMOR_PLATING: { id: 'ARMOR_PLATING', name: 'Armor Plating', icon: '🛡️', desc: '+4% damage reduction per level.', maxLevel: 5, perLevel: { armor: 0.04 } },
  TARGETING_COMPUTER: { id: 'TARGETING_COMPUTER', name: 'Targeting Computer', icon: '🎯', desc: '+5% crit chance, +15% crit dmg per level.', maxLevel: 5, perLevel: { critChance: 0.05, critDamageBonus: 0.15 } },
  MULTI_SHOT_MOD: { id: 'MULTI_SHOT_MOD', name: 'Duplicator', icon: '🔮', desc: '+1 projectile per level.', maxLevel: 11, perLevel: { projCount: 1 } },
  PIERCE_MOD: { id: 'PIERCE_MOD', name: 'Piercing Shells', icon: '🪡', desc: 'Projectiles pierce +1 enemy per level.', maxLevel: 5, perLevel: { projPierce: 1 } },
  SPLIT_MOD: { id: 'SPLIT_MOD', name: 'Fracture Core', icon: '✨', desc: 'Projectiles split into 2 smaller ones on hit.', maxLevel: 3, perLevel: { projSplitCount: 1 } },
  EXPLOSION_MOD: { id: 'EXPLOSION_MOD', name: 'Ember Burst', icon: '🔥', desc: 'Projectiles explode on hit (larger radius per level).', maxLevel: 5, perLevel: { projExplosionRadius: 20 } },
  CHAIN_LIGHTNING: { id: 'CHAIN_LIGHTNING', name: 'Tesla Core', icon: '🌩️', desc: 'Adds chain lightning to projectiles.', maxLevel: 5, perLevel: { chainLightningChance: 0.10 } },
  RICOCHET_MOD: { id: 'RICOCHET_MOD', name: 'Bouncing Core', icon: '🪃', desc: 'Projectiles bounce to nearby enemies.', maxLevel: 3, perLevel: { ricochetCount: 1 } },
  HOMING_MOD: { id: 'HOMING_MOD', name: 'Seeker Module', icon: '👁️', desc: 'Projectiles gradually turn toward enemies.', maxLevel: 3, perLevel: { homingPower: 1 } },
  LUCK_UPGRADE: { id: 'LUCK_UPGRADE', name: 'Four-Leaf Clover', icon: '🍀', desc: '+10 Luck per level.', maxLevel: 5, perLevel: { luck: 10 } },
  FRENZY_DURATION: { id: 'FRENZY_DURATION', name: 'Frenzy Extension', icon: '⏳', desc: '+2 sec Frenzy duration per level.', maxLevel: 5, perLevel: { frenzyDuration: 2 } },
  FRENZY_DAMAGE: { id: 'FRENZY_DAMAGE', name: 'Frenzy Power', icon: '💪', desc: '+10% Damage during Frenzy.', maxLevel: 5, perLevel: { frenzyDamageMult: 0.10 } },
  FRENZY_CHARGE: { id: 'FRENZY_CHARGE', name: 'Frenzy Charge', icon: '🔋', desc: '+20% Frenzy charge speed.', maxLevel: 5, perLevel: { frenzyChargeRateMult: 0.20 } },
  FRENZY_EXPLOSION: { id: 'FRENZY_EXPLOSION', name: 'Frenzy Explosion', icon: '🎆', desc: 'Enemies explode during Frenzy.', maxLevel: 1, perLevel: { frenzyExplosion: 1 } },
};

export const RARITY_TIERS = {
  COMMON: { label: 'Common', color: '#9e9e9e', borderColor: '#666666', glowColor: 'none', mult: 1.0, weight: 60 },
  RARE: { label: 'Rare', color: '#4fc3f7', borderColor: '#2196f3', glowColor: '#2196f3', mult: 1.25, weight: 25 },
  EPIC: { label: 'Epic', color: '#ce93d8', borderColor: '#9c27b0', glowColor: '#9c27b0', mult: 1.5, weight: 10 },
  LEGENDARY: { label: 'Legendary', color: '#ffd54f', borderColor: '#ff8f00', glowColor: '#ff8f00', mult: 2.0, weight: 4 },
  MYTHIC: { label: 'Mythic', color: '#ef5350', borderColor: '#c62828', glowColor: '#c62828', mult: 2.5, weight: 1 },
};

export function rollRarity(luckBonus = 0) {
  let totalWeight = 0;
  const tiers = Object.keys(RARITY_TIERS);
  for (const t of tiers) {
    let weight = RARITY_TIERS[t].weight;
    if (t === 'LEGENDARY' || t === 'MYTHIC') weight *= (1 + luckBonus / 50); // High impact on mythic/legendary
    else if (t === 'EPIC') weight *= (1 + luckBonus / 100);
    else if (t === 'RARE') weight *= (1 + luckBonus / 200);
    totalWeight += weight;
  }
  let roll = Math.random() * totalWeight;
  for (const t of tiers) {
    let weight = RARITY_TIERS[t].weight;
    if (t === 'LEGENDARY' || t === 'MYTHIC') weight *= (1 + luckBonus / 50);
    else if (t === 'EPIC') weight *= (1 + luckBonus / 100);
    else if (t === 'RARE') weight *= (1 + luckBonus / 200);
    if (roll < weight) return t;
    roll -= weight;
  }
  return 'COMMON';
}

export function generateUpgradeOffers(inventory, luck = 0, count = 3) {
  const offers = [];
  const weaponIds = Object.keys(WEAPON_DEFS).filter(id => !WEAPON_DEFS[id].isBase);
  const passiveIds = Object.keys(PASSIVE_DEFS);
  
  // First, check for evolutions
  if (inventory) {
    const evolutions = inventory.getAvailableEvolutions();
    if (evolutions.length > 0) {
      const id = evolutions[0]; // just offer the first one
      let evoDef = { ...WEAPON_DEFS[id] };
      if (id === 'BASE_PROJECTILE') {
        const currentEvo = inventory.getWeaponEvolutionLevel(id);
        if (currentEvo === 0) {
          evoDef.evolutionName = 'Piercing Cannon';
          evoDef.evolutionDesc = 'Fires piercing energy beams.';
        } else if (currentEvo === 1) {
          evoDef.evolutionName = 'Explosive Cannon';
          evoDef.evolutionDesc = 'Beams trigger violent explosions.';
        } else if (currentEvo === 2) {
          evoDef.evolutionName = 'Storm Cannon';
          evoDef.evolutionDesc = 'Explosions chain lightning.';
        } else if (currentEvo === 3) {
          evoDef.evolutionName = 'Apocalypse Cannon';
          evoDef.evolutionDesc = 'Massive splitting explosive lasers.';
        }
      }
      offers.push({ type: 'evolution', id, def: evoDef, rarity: 'MYTHIC', rarityTier: RARITY_TIERS['MYTHIC'] });
      count--;
    }
  }

  // Generate remaining offers
  let attempts = 0;
  while (offers.length < count && attempts < 50) {
    attempts++;
    const isWeapon = Math.random() < 0.5;
    
    if (isWeapon) {
      const available = weaponIds.filter(id => {
        if (!inventory) return true;
        if (inventory.hasWeapon(id)) return !inventory.isWeaponMaxLevel(id) && !inventory.isWeaponEvolved(id);
        return !inventory.isWeaponsFull();
      });
      if (available.length > 0) {
        const id = available[Math.floor(Math.random() * available.length)];
        // Check if already offered
        if (offers.some(o => o.id === id)) continue;
        
        const currentLevel = inventory?.getWeaponLevel(id) || 0;
        const rarity = rollRarity(luck);
        offers.push({ type: 'weapon', id, def: WEAPON_DEFS[id], currentLevel, rarity, rarityTier: RARITY_TIERS[rarity] });
      }
    } else {
      const available = passiveIds.filter(id => {
        if (!inventory) return true;
        if (inventory.hasPassive(id)) return !inventory.isPassiveMaxLevel(id);
        return !inventory.isPassivesFull();
      });
      if (available.length > 0) {
        const id = available[Math.floor(Math.random() * available.length)];
        // Check if already offered
        if (offers.some(o => o.id === id)) continue;

        const currentLevel = inventory?.getPassiveLevel(id) || 0;
        const rarity = rollRarity(luck);
        offers.push({ type: 'passive', id, def: PASSIVE_DEFS[id], currentLevel, rarity, rarityTier: RARITY_TIERS[rarity] });
      }
    }
  }
  
  // Fallback if unable to fill slots
  while (offers.length < count) {
     offers.push({ type: 'passive', id: 'MAX_HEALTH_FALLBACK', def: { name: 'Vitality Boost', desc: '+10 Health', icon: '❤️' }, currentLevel: 0, rarity: 'COMMON', rarityTier: RARITY_TIERS['COMMON'] });
  }

  return offers;
}

export const MULTI_SHOT_TIERS = [1, 2, 3, 5, 8, 12];
export const SPREAD_PATTERNS = { FAN: 'fan', CIRCULAR: 'circular', SPIRAL: 'spiral' };
