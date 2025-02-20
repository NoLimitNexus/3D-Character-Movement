// enemies.js
// Handles spawning and updating enemies that stand randomly around the map.
// Enemies will run at the player and attack if the player gets near.
// They take 2 hits before dying.

window.enemies = [];

// Enemy class definition.
class Enemy {
  constructor(position) {
    this.position = position.clone();
    this.health = 2;
    this.state = "idle"; // possible states: idle, running, attacking, dying, dead
    this.model = null;
    this.mixer = null;
    this.actions = {}; // { idle, running, attack, death }
    this.loadModel();
  }

  loadModel() {
    const loader = new THREE.FBXLoader();

    // 1) Load the enemy's idle model as the base.
    loader.load(
      // Make sure this URL is correct for your repo/file path:
      "https://raw.githubusercontent.com/NoLimitNexus/Utilities/main/MonsterIdle-Dance.fbx",
      (object) => {
        console.log("[Enemy] Idle model loaded OK.");
        this.model = object;
        this.model.scale.set(0.01, 0.01, 0.01);
        this.model.position.copy(this.position);
        scene.add(this.model);

        this.mixer = new THREE.AnimationMixer(this.model);

        // Use the idle animation from the loaded model.
        if (object.animations && object.animations.length > 0) {
          this.actions.idle = this.mixer.clipAction(object.animations[0]);
          this.actions.idle.play(); // Start in idle
        } else {
          console.warn("[Enemy] No idle animation found in idle FBX.");
        }

        // Now load the other animations.
        this.loadAnimations();
      },
      (xhr) => {
        // Progress logging for the idle model.
        console.log(
          `Idle model: ${(xhr.loaded / xhr.total * 100).toFixed(3)}% loaded`
        );
      },
      (error) => {
        console.error("[Enemy] Error loading idle model:", error);
      }
    );
  }

  loadAnimations() {
    const loader = new THREE.FBXLoader();

    // 2) Running animation
    loader.load(
      // Updated link to raw.githubusercontent.com
      "https://raw.githubusercontent.com/NoLimitNexus/Utilities/main/MonsterRunning.fbx",
      (object) => {
        console.log("[Enemy] Running model loaded successfully.");
        if (object.animations && object.animations.length > 0) {
          let runClip = object.animations[0];
          console.log(
            "[Enemy] Running animation tracks found:",
            runClip.tracks.map((t) => t.name)
          );
          // Rename tracks if they start with 'mixamorig:'
          runClip.tracks.forEach((track) => {
            if (track.name.startsWith("mixamorig:")) {
              track.name = track.name.replace("mixamorig:", "");
            }
          });
          this.actions.running = this.mixer.clipAction(runClip);
        } else {
          console.warn("[Enemy] No running animation found in MonsterRunning.fbx");
        }
      },
      null,
      (error) => {
        console.error("[Enemy] Error loading running animation:", error);
      }
    );

    // 3) Attack animation
    loader.load(
      "https://raw.githubusercontent.com/NoLimitNexus/Utilities/main/MonsterPunching.fbx",
      (object) => {
        console.log("[Enemy] Attack model loaded successfully.");
        if (object.animations && object.animations.length > 0) {
          let attackClip = object.animations[0];
          attackClip.tracks.forEach((track) => {
            if (track.name.startsWith("mixamorig:")) {
              track.name = track.name.replace("mixamorig:", "");
            }
          });
          this.actions.attack = this.mixer.clipAction(attackClip);
        } else {
          console.warn("[Enemy] No attack animation found in MonsterPunching.fbx");
        }
      },
      null,
      (error) => {
        console.error("[Enemy] Error loading attack animation:", error);
      }
    );

    // 4) Death animation
    loader.load(
      "https://raw.githubusercontent.com/NoLimitNexus/Utilities/main/Flying%20Back%20Death.fbx",
      (object) => {
        console.log("[Enemy] Death model loaded successfully.");
        if (object.animations && object.animations.length > 0) {
          let deathClip = object.animations[0];
          deathClip.tracks.forEach((track) => {
            if (track.name.startsWith("mixamorig:")) {
              track.name = track.name.replace("mixamorig:", "");
            }
          });
          this.actions.death = this.mixer.clipAction(deathClip);
        } else {
          console.warn("[Enemy] No death animation found in Flying Back Death.fbx");
        }
      },
      null,
      (error) => {
        console.error("[Enemy] Error loading death animation:", error);
      }
    );
  }

  update(delta, playerPosition) {
    // If the model isn't loaded yet, skip.
    if (!this.model) return;

    // If there's no valid player position, skip to avoid errors.
    if (!playerPosition) return;

    // Compute distance to the player.
    const distance = this.model.position.distanceTo(playerPosition);

    // If enemy is already "dead," skip all logic.
    if (this.state === "dead") return;

    // If enemy is in "dying" state, wait for the death animation to finish.
    if (this.state === "dying") {
      if (
        this.actions.death &&
        this.actions.death.time >= this.actions.death.getClip().duration - 0.1
      ) {
        this.state = "dead";
        scene.remove(this.model);
      }
      if (this.mixer) this.mixer.update(delta);
      return;
    }

    // If the player is within the 40-unit aggro range:
    if (distance < 40) {
      // If the player is more than 2 units away, chase (run).
      if (distance > 2) {
        // Switch to running if not already running.
        if (this.state !== "running") {
          console.log(`[Enemy] Switching to RUN (dist=${distance.toFixed(2)})`);
          this.switchAction("running", 0.2);
          this.state = "running";
        }
        // Rotate to face the player, then move forward.
        const direction = new THREE.Vector3().subVectors(playerPosition, this.model.position);
        const angle = Math.atan2(direction.x, direction.z);
        this.model.rotation.y = angle;
        direction.normalize();
        // Move enemy toward the player
        this.model.position.add(direction.multiplyScalar(5 * delta));
      }
      // If within 2 units, attack.
      else {
        if (this.state !== "attacking") {
          console.log(`[Enemy] Switching to ATTACK (dist=${distance.toFixed(2)})`);
          this.switchAction("attack", 0.2);
          this.state = "attacking";
        } else {
          // Continue punching; if the animation finishes, reset it.
          if (
            this.actions.attack &&
            this.actions.attack.time >= this.actions.attack.getClip().duration - 0.1
          ) {
            this.actions.attack.reset().play();
          }
        }
      }
    }
    // If the player is outside the 40-unit aggro radius, idle.
    else {
      if (this.state !== "idle") {
        console.log(`[Enemy] Switching to IDLE (dist=${distance.toFixed(2)})`);
        this.switchAction("idle", 0.2);
        this.state = "idle";
      }
    }

    // Finally, update the mixer each frame.
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }

  switchAction(actionName, fadeDuration) {
    // If the desired animation is actually loaded, cross-fade to it.
    const newAction = this.actions[actionName];
    if (!newAction) {
      console.warn(`[Enemy] No ${actionName} action found; cannot switch animation.`);
      return;
    }
    // Force it to be fully active in case weight/timeScale are off
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

// Utility function to spawn a given number of enemies.
window.spawnEnemies = function(count = 10) {
  window.enemies = window.enemies || [];
  for (let i = 0; i < count; i++) {
    let pos;
    // Keep enemies out of a 50-unit radius around (0, -1, 0)
    do {
      pos = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(500),
        -1,
        THREE.MathUtils.randFloatSpread(500)
      );
    } while (pos.distanceTo(new THREE.Vector3(0, -1, 0)) < 50);

    const enemy = new Enemy(pos);
    window.enemies.push(enemy);
  }
};

// Update all enemies each frame.
window.updateEnemies = function(delta) {
  if (!window.enemies || !window.player) return;
  // Pass in the player's position
  const playerPos = window.player.position.clone();
  window.enemies.forEach((enemy) => {
    enemy.update(delta, playerPos);
  });
};

// Check for collisions between player projectiles and enemies.
window.checkEnemyHits = function() {
  if (!window.activeProjectiles || !window.enemies) return;
  window.activeProjectiles.forEach((projectile) => {
    window.enemies.forEach((enemy) => {
      if (
        enemy.model &&
        projectile.mesh.position.distanceTo(enemy.model.position) < 1.5
      ) {
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
