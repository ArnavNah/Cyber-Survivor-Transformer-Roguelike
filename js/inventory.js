import { WEAPON_DEFS, PASSIVE_DEFS } from './config.js';

export class InventoryManager {
  constructor() {
    this.activeWeapons = []; // [{id, level, maxLevel, evolved}]
    this.passiveItems = []; // [{id, level, maxLevel}]
    this.MAX_WEAPONS = 6;
    this.MAX_PASSIVES = 6;
  }

  reset() {
    this.activeWeapons = [];
    this.passiveItems = [];
  }
  
  // Weapon management
  addWeapon(id) {
    if (this.hasWeapon(id)) return this.upgradeWeapon(id);
    if (this.isWeaponsFull()) return false;
    
    const def = WEAPON_DEFS[id];
    if (!def) return false;
    
    this.activeWeapons.push({ id, level: 1, maxLevel: def.maxLevel, evolutionLevel: 0 });
    return true;
  }
  
  upgradeWeapon(id) {
    const w = this.activeWeapons.find(w => w.id === id);
    if (!w || w.level >= w.maxLevel) return false;
    if (w.evolutionLevel > 0 && id !== 'BASE_PROJECTILE') return false; 
    w.level++;
    return true;
  }
  
  evolveWeapon(id) {
    const w = this.activeWeapons.find(w => w.id === id);
    if (!w || w.level < w.maxLevel) return false;
    w.evolutionLevel = (w.evolutionLevel || 0) + 1;
    return true;
  }
  
  hasWeapon(id) {
    return this.activeWeapons.some(w => w.id === id);
  }
  
  getWeaponLevel(id) {
    const w = this.activeWeapons.find(w => w.id === id);
    return w ? w.level : 0;
  }
  
  isWeaponMaxLevel(id) {
    const w = this.activeWeapons.find(w => w.id === id);
    return w ? (w.level >= w.maxLevel) : false;
  }
  
  isWeaponEvolved(id) {
    const w = this.activeWeapons.find(w => w.id === id);
    return w ? (w.evolutionLevel > 0) : false;
  }
  
  getWeaponEvolutionLevel(id) {
    const w = this.activeWeapons.find(w => w.id === id);
    return w ? (w.evolutionLevel || 0) : 0;
  }
  
  isWeaponsFull() {
    const nonBaseWeapons = this.activeWeapons.filter(w => !WEAPON_DEFS[w.id]?.isBase);
    return nonBaseWeapons.length >= this.MAX_WEAPONS;
  }
  
  // Passive management
  addPassive(id) {
    if (this.hasPassive(id)) return this.upgradePassive(id);
    if (this.isPassivesFull()) return false;
    
    const def = PASSIVE_DEFS[id];
    if (!def) return false;
    
    this.passiveItems.push({ id, level: 1, maxLevel: def.maxLevel });
    return true;
  }
  
  upgradePassive(id) {
    const p = this.passiveItems.find(p => p.id === id);
    if (!p || p.level >= p.maxLevel) return false;
    p.level++;
    return true;
  }
  
  hasPassive(id) {
    return this.passiveItems.some(p => p.id === id);
  }
  
  getPassiveLevel(id) {
    const p = this.passiveItems.find(p => p.id === id);
    return p ? p.level : 0;
  }
  
  isPassiveMaxLevel(id) {
    const p = this.passiveItems.find(p => p.id === id);
    return p ? (p.level >= p.maxLevel) : false;
  }
  
  isPassivesFull() {
    return this.passiveItems.length >= this.MAX_PASSIVES;
  }
  
  // Stat computation
  getPassiveBonuses() {
    const bonuses = {};
    for (const p of this.passiveItems) {
      const def = PASSIVE_DEFS[p.id];
      if (!def || !def.perLevel) continue;
      
      for (const stat in def.perLevel) {
        if (!bonuses[stat]) bonuses[stat] = 0;
        bonuses[stat] += def.perLevel[stat] * p.level;
      }
    }
    return bonuses;
  }
  
  // Check evolution eligibility
  getAvailableEvolutions() {
    const evolutions = [];
    for (const w of this.activeWeapons) {
      if (w.level >= w.maxLevel) {
        const currentEvo = w.evolutionLevel || 0;
        
        if (w.id === 'BASE_PROJECTILE') {
           if (currentEvo === 0 && this.hasPassive('PIERCE_MOD')) evolutions.push(w.id);
           else if (currentEvo === 1 && this.hasPassive('EXPLOSION_MOD')) evolutions.push(w.id);
           else if (currentEvo === 2 && this.hasPassive('CHAIN_LIGHTNING')) evolutions.push(w.id);
           else if (currentEvo === 3 && this.getPassiveLevel('MULTI_SHOT_MOD') >= 8) evolutions.push(w.id);
        } else if (currentEvo === 0) {
          const def = WEAPON_DEFS[w.id];
          if (def && def.evolutionRequires && this.hasPassive(def.evolutionRequires)) {
            evolutions.push(w.id);
          }
        }
      }
    }
    return evolutions;
  }
}
