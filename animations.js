//
// animations.js
// Handles jump/spell actions, the whispy projectile for Spell #1, and
// tree collisions that spawn logs (same model as existing logs).
// The spawned logs sit on the ground, then fly to the player and despawn.
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

// Logs that fly out of a tree
window.spawnedTreeLogs = [];


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
// WHISPY PROJECTILE (HALF SIZE)
//////////////////////

/**
 * Create a whispy tail: multiple small planes swirling behind the sphere,
 * but half the size of the previous example (0.3 x 1.0 planes).
 */
function createWhispyTail() {
  const tailGroup = new THREE.Group();
  const planeCount = 6; // how many swirling planes
  for (let i = 0; i < planeCount; i++) {
    const planeGeo = new THREE.PlaneGeometry(0.3, 1.0);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);

    // Random rotation & offset
    planeMesh.position.z = -0.5;
    planeMesh.rotation.z = Math.random() * Math.PI * 2;
    planeMesh.userData.rotSpeed = (Math.random() - 0.5) * 2; 
    tailGroup.add(planeMesh);
  }
  return tailGroup;
}

/**
 * Spawns the projectile for Spell #1 at about 3/4 player height,
 * half the size of previous sphere (radius = 0.1 instead of 0.2).
 */
function spawnSpellProjectile() {
  if (!window.player || !window.scene) return;

  // Create group for sphere + tail
  const projectileGroup = new THREE.Group();

  // Glowing sphere: radius = 0.1
  const sphereGeo = new THREE.SphereGeometry(0.1, 16, 16);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  projectileGroup.add(sphereMesh);

  // Whispy tail
  const tailGroup = createWhispyTail();
  projectileGroup.add(tailGroup);

  // Position near 3/4 of player's height
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
  // Orient forward
  projectileGroup.lookAt(projectileGroup.position.clone().add(forward));

  window.scene.add(projectileGroup);

  // Projectile data
  const speed = 25;
  const life = 2.5; // seconds
  const velocity = forward.clone().multiplyScalar(speed);

  window.activeProjectiles.push({
    mesh: projectileGroup,
    sphereMat,
    tailGroup,
    velocity,
    life,
    initialLife: life
  });
}

/**
 * Update all active Spell #1 projectiles each frame:
 *  - Move forward
 *  - Animate whispy tail
 *  - Check collisions with trees
 *  - Fade out over time
 */
window.updateSpellProjectiles = function(delta) {
  for (let i = window.activeProjectiles.length - 1; i >= 0; i--) {
    const p = window.activeProjectiles[i];

    // Move
    p.mesh.position.addScaledVector(p.velocity, delta);

    // Whispy tail swirl
    p.tailGroup.children.forEach((planeMesh) => {
      planeMesh.rotation.z += planeMesh.userData.rotSpeed * delta * 2;
    });

    // Collision check with trees
    checkProjectileTreeCollision(p);

    // Fade & remove
    p.life -= delta;
    const fadeRatio = p.life / p.initialLife;
    p.sphereMat.opacity = fadeRatio;
    p.tailGroup.children.forEach((planeMesh) => {
      planeMesh.material.opacity = 0.5 * fadeRatio;
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
      // Collision => remove projectile
      window.scene.remove(projectile.mesh);
      const idx = window.activeProjectiles.indexOf(projectile);
      if (idx > -1) {
        window.activeProjectiles.splice(idx, 1);
      }
      // Start wobble
      treeObj.wobbleTime = 1.0; // 1 second
      // Spawn logs
      spawnLogsFromTree(treeObj, 2);
      break;
    }
  }
}

/** 
 * Wobble the tree if wobbleTime > 0. Called each frame in updateAnimationStates().
 */
function updateTreeWobble(delta) {
  if (!window.trees) return;
  window.trees.forEach((treeObj) => {
    if (treeObj.wobbleTime > 0) {
      treeObj.wobbleTime -= delta;
      const wobbleRatio = Math.max(treeObj.wobbleTime, 0);
      const wobble = Math.sin((1 - wobbleRatio) * 20) * 0.05;
      treeObj.mesh.rotation.x = wobble;
      treeObj.mesh.rotation.z = wobble;
      if (treeObj.wobbleTime <= 0) {
        // done
        treeObj.mesh.rotation.x = 0;
        treeObj.mesh.rotation.z = 0;
      }
    }
  });
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

    // If it's not yet flying to player:
    if (!logObj.isFlyingToPlayer) {
      if (!logObj.hasLanded) {
        // Gravity
        logObj.velocity.y -= 9.8 * delta;
        m.position.addScaledVector(logObj.velocity, delta);

        // Bounce or land
        if (m.position.y < groundY) {
          m.position.y = groundY;
          if (Math.abs(logObj.velocity.y) > 2.0) {
            // bounce once
            logObj.velocity.y = -logObj.velocity.y * 0.5;
          } else {
            logObj.hasLanded = true;
            logObj.velocity.set(0, 0, 0);
          }
        }
      } else {
        // Already landed => increment landTimer
        logObj.landTimer += delta;
        if (logObj.landTimer >= 5) {
          logObj.isFlyingToPlayer = true;
        }
      }
    } else {
      // Flying to player
      const distVec = window.player.position.clone().sub(m.position);
      const dist = distVec.length();
      if (dist < 0.5) {
        // Reached the player => remove
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
// MAIN UPDATE
//////////////////////

/**
 * Called each frame in controls.js::updatePlayerAndCamera().
 * Checks if jump/spell animations are done, spawns the projectile halfway,
 * wobbles trees, etc.
 */
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

  // If not jumping or casting, choose run/strafe/idle
  if (!isJumping && !isSpellCasting && runAction && idleAction && leftStrafeAction && rightStrafeAction) {
    // Decompose movement into forward vs sideways
    const playerForward = new THREE.Vector3(
      Math.sin(window.player.rotation.y), 0, Math.cos(window.player.rotation.y)
    ).normalize();
    const rightVec = new THREE.Vector3().crossVectors(playerForward, new THREE.Vector3(0,1,0)).normalize();

    const forwardComponent = movement.dot(playerForward);
    const rightComponent = movement.dot(rightVec);

    // If sideways dominates, use strafe
    if (Math.abs(rightComponent) > Math.abs(forwardComponent) && Math.abs(rightComponent) > 0.1) {
      if (rightComponent > 0) {
        if (activeAction !== rightStrafeAction) {
          switchAction(rightStrafeAction, 0.1);
        }
      } else {
        if (activeAction !== leftStrafeAction) {
          switchAction(leftStrafeAction, 0.1);
        }
      }
    } else if (movement.length() > 0) {
      // Running forward/back
      if (activeAction !== runAction) {
        switchAction(runAction, 0);
      }
    } else {
      // Idle
      if (activeAction !== idleAction) {
        switchAction(idleAction, 0.1);
      }
    }
  }

  // Update any tree wobbles
  updateTreeWobble(delta);
};
