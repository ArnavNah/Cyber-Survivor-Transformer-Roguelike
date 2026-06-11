# Vampire Survivors-Style Roguelike Prototype Prompt

Create a **2D top-down roguelike survival prototype** inspired by the core gameplay loop of *Vampire Survivors*.

This is a **prototype clone** for learning and testing. Preserve the feel of the genre: automatic attacks, escalating enemy pressure, XP gems, level-up choices, and satisfying power growth. Keep the implementation modular so the game can later be expanded with more weapons, enemies, maps, and progression systems.

---

## 1) Core Design Goal

Build a game with this loop:

1. The player enters an endless arena.
2. Enemies spawn continuously and move toward the player.
3. The player attacks automatically.
4. Defeated enemies drop XP gems.
5. Collecting XP fills a level bar.
6. Leveling up pauses the game and offers random upgrades.
7. The player becomes stronger over time, but enemy pressure increases faster and faster.
8. Bosses appear at milestone intervals and drop better rewards.

The final feel should be:
- easy to start
- chaotic in the midgame
- power-fantasy driven
- escalating in difficulty
- replayable and endless

---

## 2) Required Assets and Their Usage

Use these assets exactly as provided.

| Asset | Use |
|---|---|
| `bg.png` | Background floor/arena tile. Repeat it infinitely across the map. |
| `hero.png` | The player character. Use for the controllable hero sprite. |
| `enemy.png` | Basic weak chaser enemy. |
| `enemy1.png` | Mid-tier enemy with more health and damage. |
| `enemy2.png` | Heavy/tank enemy with slower movement and higher health. |
| `boss.png` | Boss enemy used for milestone spawns and rewards. |
| `projectile.png` | Auto-firing weapon projectile. |
| `gem.png` | XP pickup dropped by defeated enemies. |

### Suggested visual roles
- `hero.png`: player facing/idle/move animation placeholder
- `enemy.png`: common swarm unit
- `enemy1.png`: tougher variant, introduced later
- `enemy2.png`: slow tank unit, introduced even later
- `boss.png`: large elite/boss unit with a dramatic health bar
- `projectile.png`: glowing shot, laser bolt, or energy projectile
- `gem.png`: collectible XP orb with pickup magnet behavior
- `bg.png`: seamless floor texture, repeated under the camera

---

## 3) Game World and Camera

- Use a **top-down 2D arena**.
- The world should feel effectively infinite.
- The camera follows the player smoothly.
- `bg.png` should tile seamlessly to cover the entire visible world.
- There should be no hard boundaries in the prototype.
- Keep the map visually simple so the action stays readable.

---

## 4) Player Controls and Feel

### Controls
- `WASD` or arrow keys for movement.
- No mouse aiming required.
- No manual shooting required.

### Player behavior
- The hero moves freely in all directions.
- The hero always attacks automatically.
- The hero should visually face the nearest enemy or the direction of movement.
- Add a short hit cooldown so the player cannot be instantly deleted by contact damage.

### Starting player stats
- Health: `100`
- Move speed: `250`
- Pickup radius: `50`
- Base damage: `10`
- Attack cooldown: `1.0s`
- Projectile speed: `700`
- Projectile lifetime: `2.0s`
- Projectile count: `1`

---

## 5) Automatic Attack System

The player uses `projectile.png` for an auto-firing weapon.

### Weapon rules
- Fire automatically at the nearest enemy in range.
- If no enemy is nearby, fire in the player’s forward direction or toward the last known direction.
- Attack timing must be cooldown-based.
- Projectiles should travel quickly and feel responsive.
- Projectiles should despawn after a lifetime or on impact.

### Weapon behavior
- Each projectile deals damage on hit.
- Damage should scale with player upgrades.
- Later upgrades can add:
  - more projectiles
  - faster fire rate
  - piercing
  - bounce
  - explosive impacts
  - larger projectile size

### Important
Keep the weapon system data-driven so new weapons can be added later without rewriting the combat architecture.

---

## 6) Enemy Types

The game should scale through multiple enemy tiers.

### Basic Enemy
Use `enemy.png`

- Role: common swarm enemy
- Movement: fast enough to stay threatening, but weak
- Behavior: directly chases the player
- Suggested stats:
  - Health: `20`
  - Damage: `5`
  - Speed: `120`
  - XP drop: `1`

### Mid Enemy
Use `enemy1.png`

- Role: tougher mid-game enemy
- Behavior: chases the player
- Suggested stats:
  - Health: `40`
  - Damage: `10`
  - Speed: `90`
  - XP drop: `2`

### Tank Enemy
Use `enemy2.png`

- Role: slow, durable pressure unit
- Behavior: chases the player and forces repositioning
- Suggested stats:
  - Health: `100`
  - Damage: `15`
  - Speed: `60`
  - XP drop: `5`

### Boss Enemy
Use `boss.png`

- Role: milestone encounter
- Suggested stats:
  - Health: `1000`
  - Damage: `30`
  - Speed: `80`
  - XP drop: `50`

### Enemy behavior requirements
- Enemies should always pursue the player.
- Enemies should avoid stacking perfectly on top of each other if possible.
- Add light steering or separation so crowds look natural.
- Enemies deal contact damage.
- Defeated enemies disappear with a small death effect and drop XP gems.

---

## 7) Spawn Progression and Difficulty Scaling

Enemy pressure should increase over time in a way that feels close to *Vampire Survivors*.

### Suggested progression
**0:00–1:00**
- Only basic enemies
- Low spawn rate

**1:00–2:00**
- Increase spawn rate
- Still mostly basic enemies

**2:00–4:00**
- Introduce `enemy1.png`
- Spawn density increases

**4:00–6:00**
- Add more enemy1 units
- Begin mixing in occasional stronger waves

**6:00–10:00**
- Introduce `enemy2.png`
- Spawn rate rises sharply

**10:00+**
- Large mixed waves
- Endless scaling
- Frequent elite pressure

### Scaling rules
Every minute, increase:
- enemy health
- enemy damage
- spawn frequency
- enemy movement speed slightly

### Boss cadence
- Spawn a boss every `5 minutes`
- Bosses should be harder than normal enemies
- Bosses should create a brief spike in danger and reward

### Recommended scaling model
- Health scaling: `+10% per minute`
- Damage scaling: `+5% per minute`
- Spawn rate scaling: `+10% per minute`
- Speed scaling: `+2% per minute`

Keep the numbers tunable in a config file or constants object.

---

## 8) XP, Gems, and Collection

Defeated enemies should drop `gem.png` XP pickups.

### XP values
- `enemy.png` → `1 XP`
- `enemy1.png` → `2 XP`
- `enemy2.png` → `5 XP`
- `boss.png` → `50 XP`

### Collection behavior
- Gems stay on the ground briefly if not collected.
- Player pickup radius should allow nearby gems to be pulled in.
- Add magnet behavior so gems drift toward the player when close enough.
- Collecting a gem increases XP and gives a subtle feedback effect.

### Magnet and pickup tuning
- Base pickup radius: `50`
- Upgrades can increase this to `100`, `150`, `200`, and beyond.

---

## 9) Level-Up and Upgrade System

When XP reaches the threshold, the game should pause and offer upgrade choices.

### Level-up requirements
Use an increasing XP curve such as:
- Level 1 → 2: `10`
- Level 2 → 3: `20`
- Level 3 → 4: `35`
- Level 4 → 5: `55`
- Continue scaling upward for later levels

### Level-up behavior
- Freeze gameplay briefly.
- Show 3 random upgrades.
- Let the player choose one.
- Resume gameplay after selection.

### Upgrade categories
Make upgrades stackable where appropriate.

#### Damage Up
- Increase damage by `20%`

#### Attack Speed
- Reduce cooldown by `10%`

#### Move Speed
- Increase movement speed by `10%`

#### Projectile Speed
- Increase projectile speed by `15%`

#### Max Health
- Increase max health by `25`

#### Magnet
- Increase pickup radius by `50`

#### Multi-Shot
- Add `+1` projectile
- Slight spread between projectiles
- Cap at a reasonable maximum, such as `8`

#### Armor
- Reduce damage taken by `5%`

#### Regeneration
- Heal `1 HP/sec`

#### Critical Chance
- Increase crit chance by `5%`
- Critical hits deal `2x` damage

### Upgrade presentation
- Show upgrade name
- Show short description
- Show stat impact
- Make the UI readable during combat pauses

---

## 10) Simple Weapon Evolution / Milestone Progression

Add a lightweight evolution system to make progression feel exciting.

### Example evolution milestones
- Level 5: projectile becomes larger
- Level 10: projectile pierces 2 enemies
- Level 15: projectile gains an explosion on hit
- Level 20: projectile splits into additional shots

This does not need to mirror the original game exactly, but it should create a similar “my build is getting crazy” feeling.

---

## 11) Boss Rewards and Chests

When a boss dies, it should reward the player.

### Boss rewards
- Large XP drop
- Guaranteed chest or rare upgrade
- Optional temporary power boost

### Chest reward logic
A chest can grant:
- 1 strong upgrade
- 3 normal upgrades
- 5 smaller rewards

Suggested reward distribution:
- `70%` → 1 reward
- `25%` → 3 rewards
- `5%` → 5 rewards

The chest opening sequence should feel rewarding and distinct from normal level-ups.

---

## 12) Combat Feedback and VFX

Add simple but satisfying effects:
- hit flash on enemies
- enemy death burst
- gem pickup sparkle
- projectile impact effect
- screen shake on boss death
- small knockback on hit if it improves readability

Also include floating damage numbers for hits and critical hits.

---

## 13) Health, Damage, and Game Over

### Player health
- Start at `100`
- Enemies deal contact damage
- Add invulnerability frames after taking damage so contact does not instantly kill the player

### Game over screen
When health reaches zero:
- show `Game Over`
- display survival time
- display level reached
- display enemies killed
- provide retry/restart option

The game over screen should be clean and fast to return to gameplay.

---

## 14) UI Requirements

Keep the UI simple and readable.

### Suggested HUD elements
- Top left:
  - Health
  - Level
  - XP bar
- Top center:
  - Survival time
- Top right:
  - Kills
  - Boss timer or wave timer

### Level-up overlay
- Center screen
- Dim the background
- Show 3 upgrade cards
- Clear descriptions
- Easy to click/tap

### Boss UI
- Show a boss health bar when a boss is active

---

## 15) Performance Requirements

The prototype should be efficient enough to handle lots of enemies.

### Recommended implementation techniques
- object pooling for projectiles and enemies
- spatial partitioning or grid-based collision checks
- avoid expensive per-frame full-world searches
- separate render logic from gameplay logic

The target is to support **hundreds of active enemies** without major slowdown.

---

## 16) Code Structure

Use a modular architecture so each system is easy to expand.

### Suggested systems
- `GameManager`
- `PlayerController`
- `WeaponSystem`
- `EnemySystem`
- `SpawnManager`
- `PickupSystem`
- `LevelSystem`
- `UpgradeSystem`
- `BossSystem`
- `UIManager`
- `AudioManager`

### Architectural expectations
- Keep stats data-driven
- Separate configuration from logic
- Use clean classes, components, or ECS-style modules
- Make it easy to add:
  - new weapons
  - new enemy types
  - new upgrades
  - new bosses
  - new maps

---

## 17) Technical Expectations for the Prototype

The implementation should:
- run as a playable prototype
- use the provided sprites
- support endless gameplay
- have working leveling and upgrades
- have enemy scaling and boss spawns
- have proper pickup collection and XP gain
- have automatic combat
- be organized enough for future expansion

Do not overcomplicate with unnecessary systems. Build the core loop first, but make it stable and extensible.

---

## 18) Acceptance Criteria

The prototype is complete when:

- The player can move around the map.
- The hero automatically attacks enemies.
- Enemies spawn continuously and chase the player.
- Enemies get stronger and spawn faster over time.
- XP gems drop from enemies and can be collected.
- Leveling up pauses the game and offers random upgrades.
- Upgrades correctly change player stats.
- Bosses spawn at intervals and drop big rewards.
- The game can continue indefinitely until the player dies.
- The entire game uses the provided asset set:
  `bg.png`, `hero.png`, `enemy.png`, `enemy1.png`, `enemy2.png`, `boss.png`, `projectile.png`, `gem.png`.

---

## 19) Final Prompt Summary

Build a polished **Vampire Survivors-style roguelike prototype** using the supplied assets, with:
- auto-attacking combat
- escalating waves
- XP gem pickups
- level-up upgrades
- boss milestones
- simple evolution-like progression
- endless survival gameplay
- modular code ready for future expansion

Focus on **game feel, progression, clarity, and replayability**.
