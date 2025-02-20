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
    // Load the enemy's idle model as the base.
    loader.load(
      "https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/MonsterIdle-Dance.fbx",
      (object) => {
        this.model = object;
        this.model.scale.set(0.01, 0.01, 0.01);
        this.model.position.copy(this.position);
        scene.add(this.model);
        this.mixer = new THREE.AnimationMixer(this.model);
        // Use the idle animation from the loaded model.
        if (object.animations && object.animations.length > 0) {
          this.actions.idle = this.mixer.clipAction(object.animations[0]);
          this.actions.idle.play();
        }
        this.loadAnimations();
      }
    );
  }

  loadAnimations() {
    const loader = new THREE.FBXLoader();
    // Running animation.
    loader.load(
      "https://github.com/NoLimitNexus/Utilities/raw/refs/heads/main/MonsterRunning.fbx",
      (object) => {
        if (object.animations && object.animations.length > 0) {
          let runClip = object.animations[0];
          runClip.tracks.forEach(track => {
            if (track.name.startsWith('mixamorig:')) {
              track.name = track.name.replace('mixamorig:', '');
            }
          });
          this.actions.running = this.mixer.clipAction(runClip);
        }
      }
    );
    // Attack animation.
    loader.load(
      "https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/MonsterPunching.fbx",
      (object) => {
        if (object.animations && object.animations.length > 0) {
          let attackClip = object.animations[0];
          attackClip.tracks.forEach(track => {
            if (track.name.startsWith('mixamorig:')) {
              track.name = track.name.replace('mixamorig:', '');
            }
          });
          this.actions.attack = this.mixer.clipAction(attackClip);
        }
      }
    );
    // Death animation.
    loader.load(
      "https://github.com/NoLimitNexus/Utilities/raw/refs/heads/main/Flying%20Back%20Death.fbx",
      (object) => {
        if (object.animations && object.animations.length > 0) {
          let deathClip = object.animations[0];
          deathClip.tracks.forEach(track => {
            if (track.name.startsWith('mixamorig:')) {
              track.name = track.name.replace('mixamorig:', '');
            }
          });
          this.actions.death = this.mixer.clipAction(deathClip);
        }
      }
    );
  }

  update(delta, playerPosition) {
    if (!this.model) return;

    // Compute distance to player.
    const distance = this.model.position.distanceTo(playerPosition);

    if (this.state === "dead") return;

    if (this.state === "dying") {
      if (
        this.actions.death &&
        this.actions.death.time >= this.actions.death.getClip().duration - 0.1
      ) {
        this.state = "dead";
        scene.remove(this.model);
      }
    } else if (distance < 20) {
      if (distance > 2) {
        // If the player is within 20 units but not too close, run toward the player.
        if (this.state !== "running") {
          this.switchAction("running", 0.2);
          this.state = "running";
        }
        const direction = new THREE.Vector3()
          .subVectors(playerPosition, this.model.position)
          .normalize();
        this.model.position.add(direction.multiplyScalar(5 * delta));
      } else {
        // When very close, attack.
        if (this.state !== "attacking") {
          this.switchAction("attack", 0.2);
          this.state = "attacking";
          // (Attack effects or damage to the player would be triggered here.)
        }
      }
    } else {
      // Otherwise, remain idle.
      if (this.state !== "idle") {
        this.switchAction("idle", 0.2);
        this.state = "idle";
      }
    }

    if (this.mixer) this.mixer.update(delta);
  }

  switchAction(actionName, fadeDuration) {
    if (this.actions[actionName] && this.mixer) {
      const newAction = this.actions[actionName];
      newAction.reset().play();
      for (const key in this.actions) {
        if (key !== actionName && this.actions[key] && this.actions[key].isRunning()) {
          this.actions[key].crossFadeTo(newAction, fadeDuration, false);
        }
      }
    }
  }

  takeHit() {
    this.health--;
    if (this.health <= 0 && this.state !== "dying" && this.state !== "dead") {
      this.switchAction("death", 0.2);
      this.state = "dying";
    }
  }
}

// Utility function to spawn a given number of enemies.
window.spawnEnemies = function(count) {
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

// Update all enemies each frame.
window.updateEnemies = function(delta) {
  if (!window.enemies) return;
  window.enemies.forEach((enemy) => {
    enemy.update(delta, window.player.position);
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
