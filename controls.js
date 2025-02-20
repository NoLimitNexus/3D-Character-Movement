//
// controls.js
// Handles all user input, storing state in global variables,
// and provides an 'updatePlayerAndCamera()' function that the main loop calls.
//

// ----- Global movement & camera-related variables -----
window.keys = {
    w: false, s: false,         // Forward/backward keys
    up: false, down: false,       // Arrow keys for forward/backward
    // A and D (and left/right arrows) are now used for turning.
    left: false, right: false,    // Arrow keys for turning
    shift: false
};

window.isLeftMouseDown = false;
window.isRightMouseDown = false;
window.previousMousePosition = { x: 0, y: 0 };

// Camera orbit and zoom
window.manualYawOffset = 0;   // This changes with mouse drag or turning keys
window.autoYaw = 0;           // Auto adjusts if you move forward/backward
window.cameraPitch = 0.3;     // Angle for the camera up/down
window.cameraDistance = 10;   // Distance from player
const cameraHeight = 5;       // Base height offset

// Increased base movement speed
const moveSpeed = 8; // increased base movement speed

/**
 * Set up all the event listeners for mouse/keyboard input.
 * We call this from main.js::main().
 */
function initControls() {
  if (!window.renderer) return;

  // Mouse Events
  renderer.domElement.addEventListener('mousedown', (event) => {
    if (event.button === 2) { // Right mouse button
      isRightMouseDown = true;
      previousMousePosition.x = event.clientX;
      previousMousePosition.y = event.clientY;
    } else if (event.button === 0) { // Left mouse button
      isLeftMouseDown = true;
    }
  });

  renderer.domElement.addEventListener('mousemove', (event) => {
    if (isRightMouseDown) {
      let deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
      };
      const sensitivity = 0.005;
      // Update manual yaw offset without affecting autoYaw
      manualYawOffset -= deltaMove.x * sensitivity;
      // Invert vertical movement for pitch
      cameraPitch += deltaMove.y * sensitivity;
      // Clamp pitch
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
      case 'KeyA': keys.a = true; break; // Now used for turning left
      case 'KeyS': keys.s = true; break;
      case 'KeyD': keys.d = true; break; // Now used for turning right
      case 'ArrowUp': keys.up = true; break;
      case 'ArrowDown': keys.down = true; break;
      case 'ArrowLeft': keys.left = true; break;
      case 'ArrowRight': keys.right = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': keys.shift = true; break;
      case 'Space':
        // Start jump (defined in animations.js)
        startJump();
        break;
      case 'KeyF':
        // Start spell cast (defined in animations.js)
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
  
  // Use A (or left arrow) to turn left and D (or right arrow) to turn right.
  // Reversed from before so that A now turns left and D turns right.
  if (keys.a || keys.left) {
    manualYawOffset += turnSpeed * delta;
  }
  if (keys.d || keys.right) {
    manualYawOffset -= turnSpeed * delta;
  }

  let finalYaw = autoYaw + manualYawOffset;

  // Calculate forward vector based on finalYaw
  const forwardVec = new THREE.Vector3(Math.sin(finalYaw), 0, Math.cos(finalYaw));

  // Build movement vector only from forward/backward input
  let movement = new THREE.Vector3();
  if (keys.w || keys.up)    movement.add(forwardVec);
  if (keys.s || keys.down)  movement.sub(forwardVec);

  // If both mouse buttons are down, also move forward
  if (isLeftMouseDown && isRightMouseDown) {
    movement.add(forwardVec);
  }

  // Auto yaw adjustment if moving forward/backward and minimal manual turn input
  if (Math.abs(manualYawOffset) < 0.001 && movement.length() > 0) {
    movement.normalize();
    let targetYaw = Math.atan2(movement.x, movement.z);
    let yawDiff = targetYaw - autoYaw;
    yawDiff = (yawDiff + Math.PI) % (2 * Math.PI) - Math.PI;
    const autoTurnSpeed = 4.0;
    let maxTurn = autoTurnSpeed * delta;
    if (Math.abs(yawDiff) < maxTurn) {
      autoYaw = targetYaw;
    } else {
      autoYaw += Math.sign(yawDiff) * maxTurn;
    }
    finalYaw = autoYaw;
  }

  // Apply rotation to the player
  player.rotation.y = finalYaw;

  // Move player forward/backward; increased sprint multiplier when shift is pressed.
  if (movement.length() > 0) {
    movement.normalize();
    const speed = keys.shift ? moveSpeed * 2.2 : moveSpeed;
    player.position.add(movement.multiplyScalar(speed * delta));
  }

  // Position the camera behind the player
  const offsetX = Math.sin(finalYaw) * cameraDistance * Math.cos(cameraPitch);
  const offsetZ = Math.cos(finalYaw) * cameraDistance * Math.cos(cameraPitch);
  const offsetY = cameraHeight + cameraDistance * Math.sin(cameraPitch);
  camera.position.set(
    player.position.x - offsetX,
    player.position.y + offsetY,
    player.position.z - offsetZ
  );
  camera.lookAt(player.position.x, player.position.y + 2, player.position.z);

  // Handle finishing jump/spell animations (from animations.js)
  updateAnimationStates(delta, movement);

  // Check for log collisions and remove collected logs
  if (window.checkLogCollisions) {
    window.checkLogCollisions(player);
  }
}
