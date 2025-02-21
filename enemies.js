//
// enemies.js
// Handles spawning and updating enemies that stand randomly around the map.
// Enemies will run at the player and attack if the player gets near.
// They take 2 hits before dying.

window.enemies = [];

// ----------------------------------------------------------------------
// Aggressive Enemy Class (used for most enemy spawns)
// ----------------------------------------------------------------------
class Enemy {
  constructor(position) {
    this.position = position.clone();
    this.health = 2;
    this.state = "idle"; // possible states: idle, running, attacking, dying, dead
    this.model = null;
    this.mixer = null;
    this.actions = {}; // { idle, running, attack, death }
    this.aggroTimer = 0; // timer for showing health bar (in seconds)
    this.healthBar = null; // will hold the health bar sprite
    this.loadModel();
  }

  createHealthBar() {
    // Create a canvas-based texture for the health bar.
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 16;
    const context = canvas.getContext('2d');
    // Draw a full red bar.
    context.fillStyle = 'red';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    // Scale and position the health bar above the enemy’s head.
    sprite.scale.set(2, 0.25, 1);
    sprite.position.set(0, 2, 0); // adjust Y offset as needed
    return sprite;
  }

  loadModel() {
    const loader = new THREE.FBXLoader();
    // Replace the idle animation with "Crouch Idle"
    loader.load(
      "https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/Crouch%20Idle.fbx",
      (object) => {
        console.log("[Enemy] Idle (Crouch Idle) model loaded OK.");
        this.model = object;
        // Use your preferred scale – here we keep it at 0.025
        this.model.scale.set(0.025, 0.025, 0.025);
        this.model.position.copy(this.position);
        scene.add(this.model);

        this.mixer = new THREE.AnimationMixer(this.model);

        // Set the idle action using the new Crouch Idle FBX
        if (object.animations && object.animations.length > 0) {
          this.actions.idle = this.mixer.clipAction(object.animations[0]);
          this.actions.idle.play();
        } else {
          console.warn("[Enemy] No idle animation found in Crouch Idle FBX.");
        }

        // Create and attach a health bar to the enemy; initially hidden.
        this.healthBar = this.createHealthBar();
        this.healthBar.visible = false;
        this.model.add(this.healthBar);

        this.loadAnimations();
      },
      undefined,
      (error) => {
        console.error("[Enemy] Error loading idle model:", error);
      }
    );
  }

  loadAnimations() {
    const loader = new THREE.FBXLoader();

    // Replace the running animation with "monster scary run"
    loader.load(
      "https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/monster%20scary%20run.fbx",
      (object) => {
        console.log("[Enemy] Running (monster scary run) model loaded successfully.");
        if (object.animations && object.animations.length > 0) {
          let runClip = object.animations[0];
          runClip.tracks.forEach(track => {
            if (track.name.startsWith('mixamorig:')) {
              track.name = track.name.replace('mixamorig:', '');
            }
          });
          this.actions.running = this.mixer.clipAction(runClip);
        } else {
          console.warn("[Enemy] No running animation found in monster scary run FBX");
        }
      },
      undefined,
      (error) => {
        console.error("[Enemy] Error loading running animation:", error);
      }
    );

    // Attack animation (unchanged)
    loader.load(
      "https://raw.githubusercontent.com/NoLimitNexus/Utilities/main/MonsterPunching.fbx",
      (object) => {
        console.log("[Enemy] Attack model loaded successfully.");
        if (object.animations && object.animations.length > 0) {
          let attackClip = object.animations[0];
          attackClip.tracks.forEach(track => {
            if (track.name.startsWith('mixamorig:')) {
              track.name = track.name.replace('mixamorig:', '');
            }
          });
          this.actions.attack = this.mixer.clipAction(attackClip);
        } else {
          console.warn("[Enemy] No attack animation found in MonsterPunching.fbx");
        }
      },
      undefined,
      (error) => {
        console.error("[Enemy] Error loading attack animation:", error);
      }
    );

    // Death animation (unchanged)
    loader.load(
      "https://raw.githubusercontent.com/NoLimitNexus/Utilities/main/Flying%20Back%20Death.fbx",
      (object) => {
        console.log("[Enemy] Death model loaded successfully.");
        if (object.animations && object.animations.length > 0) {
          let deathClip = object.animations[0];
          deathClip.tracks.forEach(track => {
            if (track.name.startsWith('mixamorig:')) {
              track.name = track.name.replace('mixamorig:', '');
            }
          });
          this.actions.death = this.mixer.clipAction(deathClip);
        } else {
          console.warn("[Enemy] No death animation found in Flying Back Death.fbx");
        }
      },
      undefined,
      (error) => {
        console.error("[Enemy] Error loading death animation:", error);
      }
    );
  }

  update(delta, playerPosition) {
    if (!this.model) return;

    const distance = this.model.position.distanceTo(playerPosition);

    // Aggro logic: if player gets close, reset aggro timer (10 seconds)
    if (distance < 40) {
      this.aggroTimer = 10;
    }

    if (this.state === "dead") {
      // do nothing; the global updateEnemies function will remove us
      return;
    }

    if (this.state === "dying") {
      // Once death animation finishes, switch to "dead" and remove the model
      if (this.actions.death &&
          this.actions.death.time >= this.actions.death.getClip().duration - 0.1) {
        this.state = "dead";
        scene.remove(this.model);
        // We keep the object around for the global updateEnemies loop to remove from the array
        return;
      }
    } else if (distance < 40) {
      // If close enough, chase or attack
      if (distance > 2) {
        if (this.state !== "running") {
          console.log(`[Enemy] Switching to RUN (dist=${distance.toFixed(2)})`);
          this.switchAction("running", 0.2);
          this.state = "running";
        }
        const direction = new THREE.Vector3().subVectors(playerPosition, this.model.position).normalize();
        const angle = Math.atan2(direction.x, direction.z);
        this.model.rotation.y = angle;
        this.model.position.add(direction.multiplyScalar(5 * delta));
      } else {
        if (this.state !== "attacking") {
          console.log(`[Enemy] Switching to ATTACK (dist=${distance.toFixed(2)})`);
          this.switchAction("attack", 0.2);
          this.state = "attacking";
        } else {
          if (this.actions.attack &&
              this.actions.attack.time >= this.actions.attack.getClip().duration - 0.1) {
            this.actions.attack.reset().play();
          }
        }
      }
    } else {
      // Otherwise, idle
      if (this.state !== "idle") {
        console.log(`[Enemy] Switching to IDLE (dist=${distance.toFixed(2)})`);
        this.switchAction("idle", 0.2);
        this.state = "idle";
      }
    }
    if (this.mixer) this.mixer.update(delta);

    // Update health bar visibility (always visible)
    if (this.healthBar) {
      this.healthBar.visible = true;
      this.healthBar.material.opacity = 1;
    }
  }

  switchAction(actionName, fadeDuration) {
    const newAction = this.actions[actionName];
    if (!newAction) {
      console.warn(`[Enemy] No ${actionName} action found; cannot switch animation.`);
      return;
    }
    newAction.enabled = true;
    newAction.setEffectiveTimeScale(1.0);
    newAction.setEffectiveWeight(1.0);
    newAction.reset().play();
    for (const key in this.actions) {
      if (key !== actionName && this.actions[key] && this.actions[key].isRunning()) {
        this.actions[key].crossFadeTo(newAction, fadeDuration, false);
      }
    }
  }

  takeHit() {
    this.health--;
    console.log("[Enemy] Took a hit; health =", this.health);
    if (this.health <= 0 && this.state !== "dying" && this.state !== "dead") {
      console.log("[Enemy] Switching to DEATH.");
      this.switchAction("death", 0.2);
      this.state = "dying";
    }
  }
}

// ----------------------------------------------------------------------
// Zombie Class (extends Enemy)
// The first enemy spawned will be a zombie that, when the player is far,
// will occasionally wander around using its running animation.
// ----------------------------------------------------------------------
class Zombie extends Enemy {
  constructor(position) {
    super(position);
    this.isWandering = false;
    this.wanderTimer = 0;
    this.wanderDirection = new THREE.Vector3(0, 0, 0);
  }

  // Override createHealthBar to increase the scale for Zombie
  createHealthBar() {
    // Call the parent method to create the health bar sprite.
    const sprite = super.createHealthBar();
    // Because the model scale is 0.025, increase the sprite's scale so it’s visible.
    sprite.scale.set(80, 10, 1); // adjust values as needed
    return sprite;
  }

  update(delta, playerPosition) {
    if (!this.model) return;
    const distance = this.model.position.distanceTo(playerPosition);
    // If player is near, behave aggressively.
    if (distance < 30) {
      super.update(delta, playerPosition);
      this.isWandering = false;
      this.wanderTimer = 0;
    } else {
      // Otherwise, wander occasionally.
      if (!this.isWandering) {
        // 1% chance per frame to start wandering.
        if (Math.random() < 0.01) {
          this.isWandering = true;
          const angle = Math.random() * Math.PI * 2;
          this.wanderDirection.set(Math.sin(angle), 0, Math.cos(angle));
          this.wanderTimer = 3 + Math.random() * 3;
          // Switch to running animation when wandering.
          this.switchAction("running", 0.2);
        } else {
          if (this.state !== "idle") {
            this.switchAction("idle", 0.2);
            this.state = "idle";
          }
        }
      } else {
        // Wander in the chosen direction using running animation.
        const speed = 5; // zombies wander at normal run speed.
        this.model.position.add(this.wanderDirection.clone().multiplyScalar(speed * delta));
        if (this.wanderDirection.lengthSq() > 0.0001) {
          const desiredAngle = Math.atan2(this.wanderDirection.x, this.wanderDirection.z);
          this.model.rotation.y = desiredAngle;
        }
        this.wanderTimer -= delta;
        if (this.wanderTimer <= 0) {
          this.isWandering = false;
          this.switchAction("idle", 0.2);
        }
      }
      if (this.mixer) this.mixer.update(delta);
    }
    
    // Always show the health bar at full opacity.
    if (this.healthBar) {
      this.healthBar.visible = true;
      this.healthBar.material.opacity = 1;
    }
  }
}

// ----------------------------------------------------------------------
// WanderingMonster Class for Wood and Rock Golems
// ----------------------------------------------------------------------
class WanderingMonster {
  constructor(position, type) {
    this.position = position.clone();
    this.type = type; // "wood" or "rock"
    this.state = "wandering";
    this.model = null;
    this.mixer = null;
    this.changeDirectionTimer = 0;
    this.walkDirection = new THREE.Vector3(0, 0, 0);
    this.loadModel();
  }

  loadModel() {
    const loader = new THREE.FBXLoader();
    if (this.type === "wood") {
      loader.load(
        "https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/WoodCreatureWalking.fbx",
        (object) => {
          console.log("[WanderingMonster] Wood Golem model loaded (walking).");
          this.model = object;
          // Wood golem is now 4x bigger: scale from 0.025 to 0.1.
          this.model.scale.set(0.1, 0.1, 0.1);
          this.model.position.copy(this.position);
          scene.add(this.model);
          this.mixer = new THREE.AnimationMixer(this.model);
          if (object.animations && object.animations.length > 0) {
            this.action = this.mixer.clipAction(object.animations[0]);
            this.action.play();
          } else {
            console.warn("[WanderingMonster] No walking animation found for Wood Golem.");
          }
        },
        undefined,
        (error) => {
          console.error("[WanderingMonster] Error loading Wood Golem model:", error);
        }
      );
    } else if (this.type === "rock") {
      // This link is intentionally the same as the "Crouch Idle" file,
      // but we are treating it as the Rock Golem's walking animation.
      loader.load(
        "https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/rockgolemwalking1.fbx",
        (object) => {
          console.log("[WanderingMonster] Rock Golem model loaded (walking).");
          this.model = object;
          // Increase scale for better visibility.
          this.model.scale.set(0.1, 0.1, 0.1);
          this.model.position.copy(this.position);
          scene.add(this.model);
          this.mixer = new THREE.AnimationMixer(this.model);
          if (object.animations && object.animations.length > 0) {
            this.action = this.mixer.clipAction(object.animations[0]);
            this.action.play();
          } else {
            console.warn("[WanderingMonster] No walking animation found for Rock Golem.");
          }
        },
        undefined,
        (error) => {
          console.error("[WanderingMonster] Error loading Rock Golem model:", error);
        }
      );
    }
  }

  update(delta) {
    if (!this.model) return;
    if (this.mixer) this.mixer.update(delta);

    // Change direction at random intervals.
    this.changeDirectionTimer -= delta;
    if (this.changeDirectionTimer <= 0) {
      const angle = Math.random() * Math.PI * 2;
      this.walkDirection.set(Math.sin(angle), 0, Math.cos(angle));
      this.changeDirectionTimer = 2 + Math.random() * 3;
    }

    // Determine speed based on type.
    let speed = 2; // default speed
    if (this.type === "wood") {
      speed = 1; // wood golem moves slower
    } else if (this.type === "rock") {
      speed = 7; // rock golem moves faster
    }
    // Move in the chosen direction.
    this.model.position.add(this.walkDirection.clone().multiplyScalar(speed * delta));

    // Update model rotation to face movement direction.
    if (this.walkDirection.lengthSq() > 0.0001) {
      const desiredAngle = Math.atan2(this.walkDirection.x, this.walkDirection.z);
      this.model.rotation.y = desiredAngle;
    }

    // Enforce map boundaries (-250 to 250 for x and z).
    const boundary = 250;
    if (this.model.position.x > boundary) {
      this.model.position.x = boundary;
      this.walkDirection.x = -Math.abs(this.walkDirection.x);
    }
    if (this.model.position.x < -boundary) {
      this.model.position.x = -boundary;
      this.walkDirection.x = Math.abs(this.walkDirection.x);
    }
    if (this.model.position.z > boundary) {
      this.model.position.z = boundary;
      this.walkDirection.z = -Math.abs(this.walkDirection.z);
    }
    if (this.model.position.z < -boundary) {
      this.model.position.z = -boundary;
      this.walkDirection.z = Math.abs(this.walkDirection.z);
    }
  }
}

window.wanderingMonsters = [];

// Spawn 5 Wood Golems and 5 Rock Golems.
window.spawnWanderingMonsters = function() {
  for (let i = 0; i < 5; i++) {
    let posWood = new THREE.Vector3(
      THREE.MathUtils.randFloat(-200, 200),
      -1,
      THREE.MathUtils.randFloat(-200, 200)
    );
    let posRock = new THREE.Vector3(
      THREE.MathUtils.randFloat(-200, 200),
      -1,
      THREE.MathUtils.randFloat(-200, 200)
    );
    const woodGolem = new WanderingMonster(posWood, "wood");
    const rockGolem = new WanderingMonster(posRock, "rock");
    window.wanderingMonsters.push(woodGolem, rockGolem);
  }
};

// ----------------------------------------------------------------------
// Global update functions
// ----------------------------------------------------------------------

/**
 * Updates all enemies and removes any that have fully died.
 */
window.updateEnemies = function(delta) {
  if (!window.enemies || !window.player) return;
  const playerPos = window.player.position.clone();

  // Iterate backwards so removal doesn't break indexing
  for (let i = window.enemies.length - 1; i >= 0; i--) {
    const enemy = window.enemies[i];

    // If the enemy is fully dead, remove from array
    if (enemy.state === "dead") {
      window.enemies.splice(i, 1);
      continue;
    }

    // Otherwise, update it
    enemy.update(delta, playerPos);
  }
};

window.checkEnemyHits = function() {
  if (!window.activeProjectiles || !window.enemies) return;
  window.activeProjectiles.forEach((projectile) => {
    window.enemies.forEach((enemy) => {
      if (enemy.model &&
          projectile.mesh.position.distanceTo(enemy.model.position) < 1.5) {
        enemy.takeHit();
        window.scene.remove(projectile.mesh);
        const idx = window.activeProjectiles.indexOf(projectile);
        if (idx > -1) {
          window.activeProjectiles.splice(idx, 1);
        }
      }
    });
  });
};

window.spawnEnemies = function(count = 10) {
  window.enemies = window.enemies || [];
  for (let i = 0; i < count; i++) {
    let pos;
    do {
      pos = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(500),
        -1,
        THREE.MathUtils.randFloatSpread(500)
      );
    } while (pos.distanceTo(new THREE.Vector3(0, -1, 0)) < 50);
    let enemy;
    if (i === 0) {
      // The first enemy is a Zombie.
      enemy = new Zombie(pos);
    } else {
      enemy = new Enemy(pos);
    }
    window.enemies.push(enemy);
  }
};
