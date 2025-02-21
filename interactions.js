//
// interactions.js
// Handles interactions such as collecting logs when the player walks over them.
//

console.log('interactions.js loaded.');

// Function to check for collisions between the player and logs
window.checkLogCollisions = function(player) {
  if (!window.logObjects) return;
  // Iterate backwards so removals don't affect the loop index
  for (let i = window.logObjects.length - 1; i >= 0; i--) {
    const log = window.logObjects[i];
    // Simple collision detection: if the distance between the player and the log is less than 3 units
    if (player.position.distanceTo(log.position) < 3) {
      // Remove the log from the scene and from the logObjects array
      scene.remove(log);
      window.logObjects.splice(i, 1);
      console.log("Log collected!");
    }
  }
};

// --- Targeting System Implementation ---

window.currentTarget = null;
window.targetOutline = null;

/**
 * Helper to climb up the parent chain so we get the top-level group.
 * For example, if intersects[0].object is a sub-mesh of an enemy,
 * we climb up until object.parent === scene or there's no parent.
 */
function findRootGroup(obj) {
  if (!obj) return null;
  while (obj.parent && obj.parent !== window.scene) {
    obj = obj.parent;
  }
  return obj;
}

// Creates a glowing ring on the ground
function createTargetOutline() {
  const geometry = new THREE.RingGeometry(1, 1.2, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

// Called each frame by main.js to update the ring’s position
window.updateTargetOutline = function() {
  if (window.currentTarget && window.targetOutline) {
    // Position the ring at the currentTarget's position
    window.targetOutline.position.copy(window.currentTarget.position);
    window.targetOutline.position.y = -0.99;
  }
};

// Called once after renderer is available; sets up left-click targeting
window.initTargeting = function() {
  if (window.renderer && window.renderer.domElement) {
    window.renderer.domElement.addEventListener('click', function(event) {
      // Calculate normalized device coordinates
      const rect = window.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, window.camera);
      
      // Build a list of selectable objects (enemies, trees, and big rocks)
      const selectable = [];
      if (window.enemies) {
        window.enemies.forEach(enemy => {
          if (enemy.model) {
            selectable.push(enemy.model);
          }
        });
      }
      if (window.trees) {
        window.trees.forEach(tree => {
          if (tree.mesh) {
            selectable.push(tree.mesh);
          }
        });
      }
      if (window.bigRocks) {
        window.bigRocks.forEach(rock => {
          if (rock.mesh) {
            selectable.push(rock.mesh);
          }
        });
      }
      
      const intersects = raycaster.intersectObjects(selectable, true);
      
      if (intersects.length > 0) {
        // Climb up to the root group
        const root = findRootGroup(intersects[0].object);
        window.currentTarget = root;
        
        // If we have no ring yet, create it
        if (!window.targetOutline) {
          window.targetOutline = createTargetOutline();
          scene.add(window.targetOutline);
        }
      } else {
        // Clear the target if no selectable object was clicked
        window.currentTarget = null;
        if (window.targetOutline) {
          scene.remove(window.targetOutline);
          window.targetOutline = null;
        }
      }
    });
  } else {
    console.warn("Renderer not available for targeting.");
  }
};

/**
 * Return true if an enemy is in a "running" or "attacking" state, meaning it's aggroed.
 */
function isEnemyAggroed(enemy) {
  return enemy.state === "running" || enemy.state === "attacking";
}

/**
 * Pressing Tab calls this to target the nearest:
 *  1) If any enemy is aggroed, pick the nearest aggroed enemy.
 *  2) Otherwise, pick the nearest enemy or resource.
 *  3) If no objects found, clear target.
 */
window.targetNearest = function() {
  if (!window.player) return;

  // 1) Find the nearest aggroed enemy
  let nearestAggro = null;
  let nearestAggroDist = Infinity;
  if (window.enemies) {
    window.enemies.forEach(enemy => {
      if (enemy.model && isEnemyAggroed(enemy)) {
        const dist = enemy.model.position.distanceTo(window.player.position);
        if (dist < nearestAggroDist) {
          nearestAggroDist = dist;
          nearestAggro = enemy.model;
        }
      }
    });
  }

  // If we found an aggroed enemy, target it
  if (nearestAggro) {
    window.currentTarget = findRootGroup(nearestAggro);
    if (!window.targetOutline) {
      window.targetOutline = createTargetOutline();
      scene.add(window.targetOutline);
    }
    return;
  }

  // 2) Otherwise, find the nearest among all enemies/trees/big rocks
  let bestObject = null;
  let bestDist = Infinity;

  // Enemies
  if (window.enemies) {
    window.enemies.forEach(enemy => {
      if (enemy.model) {
        const dist = enemy.model.position.distanceTo(window.player.position);
        if (dist < bestDist) {
          bestDist = dist;
          bestObject = enemy.model;
        }
      }
    });
  }
  // Trees
  if (window.trees) {
    window.trees.forEach(tree => {
      if (tree.mesh) {
        const dist = tree.position.distanceTo(window.player.position);
        if (dist < bestDist) {
          bestDist = dist;
          bestObject = tree.mesh;
        }
      }
    });
  }
  // Big rocks
  if (window.bigRocks) {
    window.bigRocks.forEach(rock => {
      if (rock.mesh) {
        const dist = rock.position.distanceTo(window.player.position);
        if (dist < bestDist) {
          bestDist = dist;
          bestObject = rock.mesh;
        }
      }
    });
  }

  if (bestObject) {
    window.currentTarget = findRootGroup(bestObject);
    if (!window.targetOutline) {
      window.targetOutline = createTargetOutline();
      scene.add(window.targetOutline);
    }
  } else {
    // 3) If no objects found, clear target
    window.currentTarget = null;
    if (window.targetOutline) {
      scene.remove(window.targetOutline);
      window.targetOutline = null;
    }
  }
};
