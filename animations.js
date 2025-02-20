//
// animations.js
// Handles jump/spell actions, projectile updates, and
// collisions that spawn logs from trees and small rocks from big rocks.
//

//////////////////////
// GLOBAL STATE
//////////////////////

window.isJumping = false;
window.jumpSwitchTriggered = false;
window.isSpellCasting = false;
window.castSwitchTriggered = false;
window.activeAction = null;

// Spell #1 projectiles
window.activeProjectiles = [];

// Logs that fly out of trees
window.spawnedTreeLogs = [];

// Small rocks that fly out of big rocks
window.spawnedSmallRocks = [];

//////////////////////
// ACTION SWITCHING
//////////////////////

/** Switch from the currently active action to a new action, with optional fading. */
window.switchAction = function(newAction, fadeDuration = 0) {
  if (!newAction) return;
  if (window.activeAction === newAction) return;
  newAction.reset().play();
  if (window.activeAction) {
    window.activeAction.crossFadeTo(newAction, fadeDuration, false);
  }
  window.activeAction = newAction;
};

/** Called when the user presses SPACE. */
window.startJump = function() {
  if (!isJumping && window.jumpAction) {
    isJumping = true;
    jumpSwitchTriggered = false;
    switchAction(window.jumpAction, 0);
  }
};

/** Called when the user presses F (spell #1). */
window.startSpellCast = function() {
  if (!isSpellCasting && window.spellAction) {
    isSpellCasting = true;
    castSwitchTriggered = false;
    switchAction(window.spellAction, 0);
  }
};

//////////////////////
// SPELL PROJECTILE (Using the Orb Model)
//////////////////////

function spawnSpellProjectile() {
  // Use the preloaded orb model for the projectile (instead of the old sphere).
  if (!window.player || !window.scene || !window.orbModel) return;
  
  // Create a group to hold the orb so we can position it easily.
  const projectileGroup = new THREE.Group();

  // Clone the orb model (already centered/had any plane hidden in loader.js).
  const orbClone = window.orbModel.clone();
  projectileGroup.add(orbClone);

  // Position near 3/4 of player's height, same as old projectile
  const playerPos = window.player.position.clone();
  const forward = new THREE.Vector3(
    Math.sin(window.player.rotation.y),
    0,
    Math.cos(window.player.rotation.y)
  );
  const spawnOffsetForward = 1.0;
  projectileGroup.position.set(
    playerPos.x + forward.x * spawnOffsetForward,
    playerPos.y + 0.75,
    playerPos.z + forward.z * spawnOffsetForward
  );
  projectileGroup.lookAt(projectileGroup.position.clone().add(forward));

  window.scene.add(projectileGroup);

  // Projectile data
  const speed = 25;
  const life = 2.5;
  const velocity = forward.clone().multiplyScalar(speed);

  window.activeProjectiles.push({
    mesh: projectileGroup,
    velocity,
    life,
    initialLife: life
  });
}

window.updateSpellProjectiles = function(delta) {
  for (let i = window.activeProjectiles.length - 1; i >= 0; i--) {
    const p = window.activeProjectiles[i];

    // Move forward
    p.mesh.position.addScaledVector(p.velocity, delta);

    // Collisions
    checkProjectileTreeCollision(p);
    checkProjectileBigRockCollision(p);

    // Fade & remove over time
    p.life -= delta;
    const fadeRatio = p.life / p.initialLife;
    p.mesh.traverse(child => {
      if (child.material) {
        child.material.opacity = fadeRatio;
        child.material.transparent = true;
      }
    });
    if (p.life <= 0) {
      window.scene.remove(p.mesh);
      window.activeProjectiles.splice(i, 1);
    }
  }
};

//////////////////////
// TREE COLLISION & WOBBLE
//////////////////////

function checkProjectileTreeCollision(projectile) {
  if (!window.trees) return;

  const projPos = projectile.mesh.position;
  const projectileRadius = 0.1;
  const treeRadius = 1.5;
  const combined = projectileRadius + treeRadius;

  for (let i = 0; i < window.trees.length; i++) {
    const treeObj = window.trees[i];
    const dist = projPos.distanceTo(treeObj.position);
    if (dist < combined) {
      // Collision: remove projectile
      window.scene.remove(projectile.mesh);
      const idx = window.activeProjectiles.indexOf(projectile);
      if (idx > -1) {
        window.activeProjectiles.splice(idx, 1);
      }
      treeObj.wobbleTime = 1.0;
      treeObj.hitCount = (treeObj.hitCount || 0) + 1;
      if (treeObj.hitCount < 3) {
         spawnLogsFromTree(treeObj, 2);
      } else if (treeObj.hitCount === 3) {
         // On 3rd hit, trigger falling and fading.
         treeObj.isFalling = true;
         spawnLogsFromTree(treeObj, 2);
      }
      break;
    }
  }
}

/** Wobble the tree if wobbleTime > 0 or animate falling. */
function updateTreeWobble(delta) {
  if (!window.trees) return;
  for (let i = window.trees.length - 1; i >= 0; i--) {
    const treeObj = window.trees[i];
    if (treeObj.isFalling) {
      if (treeObj.fallTime === undefined) {
         treeObj.fallTime = 1.0; // duration for falling animation
      }
      treeObj.fallTime -= delta;
      treeObj.mesh.rotation.z = -Math.PI/4 * (1 - treeObj.fallTime);
      treeObj.mesh.traverse(child => {
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = treeObj.fallTime;
        }
      });
      if (treeObj.fallTime <= 0) {
        window.scene.remove(treeObj.mesh);
        window.trees.splice(i, 1);
      }
    } else if (treeObj.wobbleTime > 0) {
      treeObj.wobbleTime -= delta;
      const wobbleRatio = Math.max(treeObj.wobbleTime, 0);
      const wobble = Math.sin((1 - wobbleRatio) * 20) * 0.05;
      treeObj.mesh.rotation.x = wobble;
      treeObj.mesh.rotation.z = wobble;
      if (treeObj.wobbleTime <= 0) {
        treeObj.mesh.rotation.x = 0;
        treeObj.mesh.rotation.z = 0;
      }
    }
  }
}

//////////////////////
// SPAWNING & UPDATING LOGS (FROM TREE)
//////////////////////

function spawnLogsFromTree(treeObj, count) {
  if (!window.scene || !window.logModel) return;

  for (let i = 0; i < count; i++) {
    const logClone = window.logModel.clone();
    const spawnPos = treeObj.position.clone();
    spawnPos.y = -1 + 1.0; 
    logClone.position.copy(spawnPos);

    window.scene.add(logClone);

    const angle = Math.random() * Math.PI * 2;
    const speed = 5 + Math.random() * 4; 
    const vx = Math.cos(angle) * speed;
    const vz = Math.sin(angle) * speed;
    const vy = 6 + Math.random() * 2;

    window.spawnedTreeLogs.push({
      mesh: logClone,
      velocity: new THREE.Vector3(vx, vy, vz),
      isFlyingToPlayer: false,
      hasLanded: false,
      landTimer: 0
    });
  }
}

window.updateFlyingLogs = function(delta) {
  if (!window.spawnedTreeLogs || !window.player) return;
  const groundY = -1;
  for (let i = window.spawnedTreeLogs.length - 1; i >= 0; i--) {
    const logObj = window.spawnedTreeLogs[i];
    const m = logObj.mesh;
    if (!m) {
      window.spawnedTreeLogs.splice(i, 1);
      continue;
    }

    if (!logObj.isFlyingToPlayer) {
      if (!logObj.hasLanded) {
        logObj.velocity.y -= 9.8 * delta;
        m.position.addScaledVector(logObj.velocity, delta);
        if (m.position.y < groundY) {
          m.position.y = groundY;
          if (Math.abs(logObj.velocity.y) > 2.0) {
            logObj.velocity.y = -logObj.velocity.y * 0.5;
          } else {
            logObj.hasLanded = true;
            logObj.velocity.set(0, 0, 0);
          }
        }
      } else {
        logObj.landTimer += delta;
        if (logObj.landTimer >= 5) {
          logObj.isFlyingToPlayer = true;
        }
      }
    } else {
      const distVec = window.player.position.clone().sub(m.position);
      const dist = distVec.length();
      if (dist < 0.5) {
        window.scene.remove(m);
        window.spawnedTreeLogs.splice(i, 1);
        continue;
      }
      distVec.normalize();
      const flySpeed = 10;
      m.position.addScaledVector(distVec, flySpeed * delta);
    }
  }
};

//////////////////////
// BIG ROCK COLLISION & WOBBLE
//////////////////////

function checkProjectileBigRockCollision(projectile) {
  if (!window.bigRocks) return;

  const projPos = projectile.mesh.position;
  const projectileRadius = 0.1;
  const rockRadius = 1.5;
  const combined = projectileRadius + rockRadius;

  for (let i = 0; i < window.bigRocks.length; i++) {
    const rockObj = window.bigRocks[i];
    const dist = projPos.distanceTo(rockObj.position);
    if (dist < combined) {
      window.scene.remove(projectile.mesh);
      const idx = window.activeProjectiles.indexOf(projectile);
      if (idx > -1) {
        window.activeProjectiles.splice(idx, 1);
      }
      rockObj.wobbleTime = 1.0;
      rockObj.hitCount = (rockObj.hitCount || 0) + 1;
      if (rockObj.hitCount < 3) {
         spawnSmallRocksFromBigRock(rockObj, 1);
      } else if (rockObj.hitCount === 3) {
         rockObj.toDespawn = true;
      }
      break;
    }
  }
}

function updateBigRockWobble(delta) {
  if (!window.bigRocks) return;
  for (let i = window.bigRocks.length - 1; i >= 0; i--) {
    const rockObj = window.bigRocks[i];
    if (rockObj.wobbleTime > 0) {
      rockObj.wobbleTime -= delta;
      const wobbleRatio = Math.max(rockObj.wobbleTime, 0);
      const wobble = Math.sin((1 - wobbleRatio) * 20) * 0.05;
      rockObj.mesh.rotation.x = wobble;
      rockObj.mesh.rotation.z = wobble;
      if (rockObj.wobbleTime <= 0) {
        rockObj.mesh.rotation.x = 0;
        rockObj.mesh.rotation.z = 0;
      }
    }
    if (rockObj.toDespawn && rockObj.wobbleTime <= 0) {
      spawnSmallRocksFromBigRock(rockObj, 5);
      window.scene.remove(rockObj.mesh);
      window.bigRocks.splice(i, 1);
    }
  }
}

//////////////////////
// SPAWNING & UPDATING SMALL ROCKS
//////////////////////

function spawnSmallRocksFromBigRock(rockObj, count) {
  if (!window.scene || !window.smallRockModel) return;
  if (!window.spawnedSmallRocks) window.spawnedSmallRocks = [];
  for (let i = 0; i < count; i++) {
    const rockClone = window.smallRockModel.clone();
    const spawnPos = rockObj.position.clone();
    const smallRockOffset = 0.2125; // half the small rock's height
    spawnPos.y = -1 + smallRockOffset;
    rockClone.position.copy(spawnPos);
    window.scene.add(rockClone);
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 2;
    const vx = Math.cos(angle) * speed;
    const vz = Math.sin(angle) * speed;
    const vy = 3 + Math.random() * 1;
    window.spawnedSmallRocks.push({
      mesh: rockClone,
      velocity: new THREE.Vector3(vx, vy, vz),
      isFlyingToPlayer: false,
      hasLanded: false,
      landTimer: 0
    });
  }
}

window.updateFlyingSmallRocks = function(delta) {
  if (!window.spawnedSmallRocks || !window.player) return;
  const groundY = -1;
  const smallRockOffset = 0.2125;
  for (let i = window.spawnedSmallRocks.length - 1; i >= 0; i--) {
    const rockObj = window.spawnedSmallRocks[i];
    const m = rockObj.mesh;
    if (!m) {
      window.spawnedSmallRocks.splice(i, 1);
      continue;
    }
    if (!rockObj.isFlyingToPlayer) {
      if (!rockObj.hasLanded) {
        rockObj.velocity.y -= 9.8 * delta;
        m.position.addScaledVector(rockObj.velocity, delta);
        if (m.position.y < groundY + smallRockOffset) {
          m.position.y = groundY + smallRockOffset;
          if (Math.abs(rockObj.velocity.y) > 2.0) {
            rockObj.velocity.y = -rockObj.velocity.y * 0.5;
          } else {
            rockObj.hasLanded = true;
            rockObj.velocity.set(0, 0, 0);
          }
        }
      } else {
        rockObj.landTimer += delta;
        if (rockObj.landTimer >= 2) {
          rockObj.isFlyingToPlayer = true;
        }
      }
    } else {
      const distVec = window.player.position.clone().sub(m.position);
      const dist = distVec.length();
      if (dist < 0.5) {
        window.scene.remove(m);
        window.spawnedSmallRocks.splice(i, 1);
        continue;
      }
      distVec.normalize();
      const flySpeed = 10;
      m.position.addScaledVector(distVec, flySpeed * delta);
    }
  }
};

//////////////////////
// MAIN UPDATE
//////////////////////

window.updateAnimationStates = function(delta, movement) {
  // Jump finishing
  if (isJumping && activeAction === jumpAction && jumpAction.getClip()) {
    const jumpDuration = jumpAction.getClip().duration;
    if (!jumpSwitchTriggered && jumpAction.time >= jumpDuration - 0.1) {
      jumpSwitchTriggered = true;
      isJumping = false;
      switchAction((movement.length() > 0 ? runAction : idleAction), 0.1);
    }
  }
  // Spell finishing
  if (isSpellCasting && activeAction === spellAction && spellAction.getClip()) {
    const spellDuration = spellAction.getClip().duration;
    const halfTime = spellDuration * 0.5;
    if (!castSwitchTriggered && spellAction.time >= halfTime) {
      castSwitchTriggered = true;
      spawnSpellProjectile();
    }
    if (spellAction.time >= spellDuration - 0.1) {
      isSpellCasting = false;
      switchAction((movement.length() > 0 ? runAction : idleAction), 0.1);
    }
  }
  // If not jumping or casting, pick run or idle
  if (!isJumping && !isSpellCasting && runAction && idleAction) {
    if (movement.length() > 0 && activeAction !== runAction) {
      switchAction(runAction, 0);
    } else if (movement.length() === 0 && activeAction !== idleAction) {
      switchAction(idleAction, 0.1);
    }
  }
  // Wobble trees & big rocks
  updateTreeWobble(delta);
  updateBigRockWobble(delta);
};
