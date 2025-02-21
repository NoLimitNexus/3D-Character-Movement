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

// Added for double jump support.
window.jumpCount = 0;

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

/** Called when the user presses SPACE.
 *  Modified to allow a double jump.
 */
window.startJump = function() {
  window.jumpCount = window.jumpCount || 0;
  if (window.jumpAction && window.jumpCount < 2) {
    jumpSwitchTriggered = false;
    switchAction(window.jumpAction, 0);
    window.jumpCount++;
    isJumping = true;
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
// SPELL PROJECTILE (Using the Orb Model and Particle System)
//////////////////////

function spawnSpellProjectile() {
  // Use the preloaded orb model for the projectile
  if (!window.player || !window.scene || !window.orbModel) return;
  
  // Create a group to hold the projectile
  const projectileGroup = new THREE.Group();
  
  // Deep-clone the orb model so that particle geometry isn't shared.
  // We traverse the clone and, for any Points, clone its geometry and velocities.
  const orbClone = window.orbModel.clone(true);
  orbClone.traverse(child => {
    if (child instanceof THREE.Points) {
      child.geometry = child.geometry.clone();
      if (child.geometry.userData && child.geometry.userData.velocities) {
        // Clone the velocities array so that each projectile has its own set.
        child.geometry.userData.velocities = child.geometry.userData.velocities.slice();
      }
    }
  });
  projectileGroup.add(orbClone);
  
  // Position near 3/4 of player's height, similar to previous implementation.
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
  
    // Move the projectile forward
    p.mesh.position.addScaledVector(p.velocity, delta);
  
    // Update particle positions for the magical effect.
    p.mesh.traverse(child => {
      if (child instanceof THREE.Points) {
        const geometry = child.geometry;
        const positions = geometry.attributes.position.array;
        const velocities = geometry.userData.velocities;
        for (let j = 0; j < positions.length; j += 3) {
          positions[j]     += velocities[j] * delta;
          positions[j + 1] += velocities[j + 1] * delta;
          positions[j + 2] += velocities[j + 2] * delta;
        }
        geometry.attributes.position.needsUpdate = true;
      }
      // Fade materials over time for both the orb and particles.
      if (child.material) {
        child.material.opacity = p.life / p.initialLife;
        child.material.transparent = true;
      }
    });
  
    // Collisions
    checkProjectileTreeCollision(p);
    checkProjectileBigRockCollision(p);
  
    // Update life and remove projectile if expired.
    p.life -= delta;
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
         treeObj.isFalling = true;
         spawnLogsFromTree(treeObj, 2);
      }
      break;
    }
  }
}
  
function updateTreeWobble(delta) {
  if (!window.trees) return;
  for (let i = window.trees.length - 1; i >= 0; i--) {
    const treeObj = window.trees[i];
    if (treeObj.isFalling) {
      if (treeObj.fallTime === undefined) {
         treeObj.fallTime = 1.0;
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
  
function spawnSmallRocksFromBigRock(rockObj, count) {
  if (!window.scene || !window.smallRockModel) return;
  if (!window.spawnedSmallRocks) window.spawnedSmallRocks = [];
  for (let i = 0; i < count; i++) {
    const rockClone = window.smallRockModel.clone();
    const spawnPos = rockObj.position.clone();
    const smallRockOffset = 0.2125;
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
  
window.updateAnimationStates = function(delta, movement) {
  // Jump finishing and double jump reset.
  if (isJumping && activeAction === jumpAction && jumpAction.getClip()) {
    const jumpDuration = jumpAction.getClip().duration;
    if (!jumpSwitchTriggered && jumpAction.time >= jumpDuration - 0.1) {
      jumpSwitchTriggered = true;
      isJumping = false;
      window.jumpCount = 0;
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
  
// Function to check for collisions between the player and logs
window.checkLogCollisions = function(player) {
  if (!window.logObjects) return;
  for (let i = window.logObjects.length - 1; i >= 0; i--) {
    const log = window.logObjects[i];
    if (player.position.distanceTo(log.position) < 3) {
      scene.remove(log);
      window.logObjects.splice(i, 1);
      console.log("Log collected!");
    }
  }
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
