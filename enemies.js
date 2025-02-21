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
    const enemy = new Enemy(pos);
    window.enemies.push(enemy);
  }
};

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
