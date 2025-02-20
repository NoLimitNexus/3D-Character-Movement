//
// controls.js
// Handles all user input, storing state in global variables,
// and provides an 'updatePlayerAndCamera()' function that the main loop calls.
//

// ----- Global movement & camera-related variables -----
window.keys = {
    w: false, s: false,         
    a: false, d: false,
    up: false, down: false,
    left: false, right: false, 
    q: false, e: false,
    shift: false
};

window.isLeftMouseDown = false;
window.isRightMouseDown = false;
window.previousMousePosition = { x: 0, y: 0 };

// We have both autoYaw (for Q/E turning) and manualYawOffset (for mouse drag).
window.autoYaw = 0;
window.manualYawOffset = 0;
window.cameraPitch = 0.3;
window.cameraDistance = 10;
const cameraHeight = 5;

// Movement speed
const moveSpeed = 8;

/**
 * Set up all the event listeners for mouse/keyboard input.
 */
function initControls() {
  if (!window.renderer) return;

  // Mouse Events
  renderer.domElement.addEventListener('mousedown', (event) => {
    if (event.button === 2) {
      // Right mouse button => rotate camera
      isRightMouseDown = true;
      previousMousePosition.x = event.clientX;
      previousMousePosition.y = event.clientY;
    } else if (event.button === 0) {
      // Left mouse button => (optional use)
      isLeftMouseDown = true;
    }
  });

  renderer.domElement.addEventListener('mousemove', (event) => {
    if (isRightMouseDown) {
      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
      };
      const sensitivity = 0.005;
      // Adjust manual yaw offset with horizontal mouse movement
      manualYawOffset -= deltaMove.x * sensitivity;
      // Adjust camera pitch with vertical mouse movement
      cameraPitch += deltaMove.y * sensitivity;
      cameraPitch = Math.max(-0.5, Math.min(0.8, cameraPitch));
      previousMousePosition.x = event.clientX;
      previousMousePosition.y = event.clientY;
    }
  });

  renderer.domElement.addEventListener('mouseup', (event) => {
    if (event.button === 2) {
      isRightMouseDown = false;
    } else if (event.button === 0) {
      isLeftMouseDown = false;
    }
  });

  // Disable context menu on right-click
  document.addEventListener('contextmenu', (evt) => {
    evt.preventDefault();
  });

  // Camera zoom with mouse wheel
  window.addEventListener('wheel', (event) => {
    cameraDistance += event.deltaY * 0.01;
    cameraDistance = Math.max(5, Math.min(20, cameraDistance));
  });

  // Keyboard input
  document.addEventListener('keydown', (event) => {
    switch(event.code) {
      case 'KeyW': keys.w = true; break;
      case 'KeyA': keys.a = true; break;
      case 'KeyS': keys.s = true; break;
      case 'KeyD': keys.d = true; break;
      case 'ArrowUp': keys.up = true; break;
      case 'ArrowDown': keys.down = true; break;
      case 'ArrowLeft': keys.left = true; break;
      case 'ArrowRight': keys.right = true; break;
      // Q/E => turn left/right
      case 'KeyQ': keys.q = true; break;
      case 'KeyE': keys.e = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': keys.shift = true; break;
      case 'Space':
        startJump();
        break;
      case 'KeyF':
        startSpellCast();
        break;
    }
  });

  document.addEventListener('keyup', (event) => {
    switch(event.code) {
      case 'KeyW': keys.w = false; break;
      case 'KeyA': keys.a = false; break;
      case 'KeyS': keys.s = false; break;
      case 'KeyD': keys.d = false; break;
      case 'ArrowUp': keys.up = false; break;
      case 'ArrowDown': keys.down = false; break;
      case 'ArrowLeft': keys.left = false; break;
      case 'ArrowRight': keys.right = false; break;
      case 'KeyQ': keys.q = false; break;
      case 'KeyE': keys.e = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': keys.shift = false; break;
    }
  });
}

/**
 * Called every frame in main.js, inside animate().
 * Updates the player's position/rotation and positions the camera.
 */
function updatePlayerAndCamera(delta) {
  if (!window.player) return;

  const turnSpeed = 2.0;

  // Q/E => autoYaw
  if (keys.q) {
    window.autoYaw += turnSpeed * delta;
  }
  if (keys.e) {
    window.autoYaw -= turnSpeed * delta;
  }

  // finalYaw is sum of autoYaw and manualYawOffset
  const finalYaw = window.autoYaw + manualYawOffset;

  // Forward vector from finalYaw
  const forwardVec = new THREE.Vector3(Math.sin(finalYaw), 0, Math.cos(finalYaw));
  // Right vector
  const rightVec = new THREE.Vector3().crossVectors(forwardVec, new THREE.Vector3(0, 1, 0)).normalize();

  // Build movement vector
  let movement = new THREE.Vector3();
  if (keys.w || keys.up)    movement.add(forwardVec);
  if (keys.s || keys.down)  movement.sub(forwardVec);
  if (keys.a || keys.left)  movement.sub(rightVec);
  if (keys.d || keys.right) movement.add(rightVec);

  // If both mouse buttons are down, also move forward
  if (isLeftMouseDown && isRightMouseDown) {
    movement.add(forwardVec);
  }

  // Normalize & move
  if (movement.length() > 0) {
    movement.normalize();
    const speed = keys.shift ? moveSpeed * 2.2 : moveSpeed;
    player.position.add(movement.multiplyScalar(speed * delta));
  }

  // Apply finalYaw to player
  player.rotation.y = finalYaw;

  // Position camera behind the player
  const offsetX = Math.sin(finalYaw) * cameraDistance * Math.cos(cameraPitch);
  const offsetZ = Math.cos(finalYaw) * cameraDistance * Math.cos(cameraPitch);
  const offsetY = cameraHeight + cameraDistance * Math.sin(cameraPitch);
  camera.position.set(
    player.position.x - offsetX,
    player.position.y + offsetY,
    player.position.z - offsetZ
  );
  camera.lookAt(player.position.x, player.position.y + 2, player.position.z);

  // Animation states
  updateAnimationStates(delta, movement);

  // Spell projectiles
  if (window.updateSpellProjectiles) {
    window.updateSpellProjectiles(delta);
  }

  // Logs from trees
  if (window.updateFlyingLogs) {
    window.updateFlyingLogs(delta);
  }

  // Interactions
  if (window.checkLogCollisions) {
    window.checkLogCollisions(player);
  }
}
