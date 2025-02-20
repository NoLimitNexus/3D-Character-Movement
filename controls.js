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
    shift: false
  };
  
  window.isLeftMouseDown = false;
  window.isRightMouseDown = false;
  window.previousMousePosition = { x: 0, y: 0 };
  
  // The character’s facing (yaw) in radians.
  window.characterYaw = 0;
  // The camera's anchored orientation – this is updated only via right mouse drag.
  window.cameraFixedAngle = 0;
  // The camera offset remains fixed behind the character.
  window.cameraOffsetDir = -1;
  
  // Camera parameters – fixed distance and vertical offset.
  window.cameraDistance = 10;
  window.cameraPitch = 0.3; // vertical angle offset
  const cameraHeight = 5;
  
  // Movement speed
  const moveSpeed = 8;
  
  /**
   * Set up all the event listeners for mouse/keyboard input.
   */
  function initControls() {
    if (!window.renderer) return;
  
    // Mouse events
    renderer.domElement.addEventListener('mousedown', (event) => {
      if (event.button === 2) {
        // Right mouse button: start rotating the camera (and character) via drag.
        isRightMouseDown = true;
        previousMousePosition.x = event.clientX;
        previousMousePosition.y = event.clientY;
      } else if (event.button === 0) {
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
        // Update the anchored camera angle (and character yaw) via right mouse drag.
        window.cameraFixedAngle -= deltaMove.x * sensitivity;
        window.characterYaw = window.cameraFixedAngle;
        // Optionally adjust cameraPitch with vertical drag.
        window.cameraPitch += deltaMove.y * sensitivity;
        window.cameraPitch = Math.max(-0.5, Math.min(0.8, window.cameraPitch));
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
  
    // Disable context menu on right-click.
    document.addEventListener('contextmenu', (evt) => {
      evt.preventDefault();
    });
  
    // Camera zoom via mouse wheel.
    window.addEventListener('wheel', (event) => {
      window.cameraDistance += event.deltaY * 0.01;
      window.cameraDistance = Math.max(5, Math.min(20, window.cameraDistance));
    });
  
    // Keyboard input.
    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'KeyW': keys.w = true; break;
        case 'KeyA': keys.a = true; break;
        case 'KeyS': keys.s = true; break;
        case 'KeyD': keys.d = true; break;
        case 'ArrowUp': keys.up = true; break;
        case 'ArrowDown': keys.down = true; break;
        case 'ArrowLeft': keys.left = true; break;
        case 'ArrowRight': keys.right = true; break;
        case 'ShiftLeft':
        case 'ShiftRight': keys.shift = true; break;
        case 'Space': startJump(); break;
        case 'KeyF': startSpellCast(); break;
      }
    });
  
    document.addEventListener('keyup', (event) => {
      switch (event.code) {
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
   * Updates the character's position/rotation and positions the camera.
   */
  function updatePlayerAndCamera(delta) {
    if (!window.player) return;
  
    // Build a 2D input vector from WASD/arrow keys.
    let inputVector = new THREE.Vector2(0, 0);
    if (keys.w || keys.up)    inputVector.y -= 1;
    if (keys.s || keys.down)  inputVector.y += 1;
    if (keys.a || keys.left)  inputVector.x -= 1;
    if (keys.d || keys.right) inputVector.x += 1;
  
    // If there's movement input, update the character's facing relative to the anchored camera angle.
    if (inputVector.length() > 0) {
      inputVector.normalize();
      const relativeAngle = -Math.atan2(inputVector.x, -inputVector.y);
      const desiredAngle = window.cameraFixedAngle + relativeAngle;
  
      // We normally smooth turning, but if the user flips from forward to back or left to right,
      // we skip smoothing and instantly face the new direction.
      // Use a faster smoothing factor when jumping:
      const turnSmoothing = window.isJumping ? 20 : 10;
      const smoothing = turnSmoothing * delta;
  
      let angleDiff = desiredAngle - window.characterYaw;
      // Normalize angleDiff to [-PI, PI]
      angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
  
      // Detect direct 90° (±π/2) or 180° (±π) changes
      const angleAbs = Math.abs(angleDiff);
      const nearHalfPi = Math.abs(angleAbs - Math.PI * 0.5) < 0.01; // near ±90°
      const nearPi = Math.abs(angleAbs - Math.PI) < 0.01;           // near ±180°
  
      if (nearHalfPi || nearPi) {
        // No smoothing; snap instantly to the new direction
        window.characterYaw = desiredAngle;
      } else {
        // Otherwise, continue smoothing
        window.characterYaw += angleDiff * smoothing;
      }
  
      // Move the character in its facing direction.
      const moveDir = new THREE.Vector3(
        Math.sin(window.characterYaw),
        0,
        Math.cos(window.characterYaw)
      );
      const speed = keys.shift ? moveSpeed * 2.2 : moveSpeed;
      window.player.position.add(moveDir.multiplyScalar(speed * delta));
    }
    // If there's no movement input, the character and camera remain unchanged.
  
    // Apply characterYaw to the player's rotation.
    window.player.rotation.y = window.characterYaw;
  
    // Compute the camera's offset using the anchored camera angle.
    const offsetX = Math.sin(window.cameraFixedAngle) * cameraDistance * Math.cos(cameraPitch);
    const offsetZ = Math.cos(window.cameraFixedAngle) * cameraDistance * Math.cos(cameraPitch);
    const offsetY = cameraHeight + cameraDistance * Math.sin(cameraPitch);
  
    // The camera always stays behind the character.
    camera.position.set(
      window.player.position.x + window.cameraOffsetDir * offsetX,
      window.player.position.y + offsetY,
      window.player.position.z + window.cameraOffsetDir * offsetZ
    );
    camera.lookAt(
      window.player.position.x,
      window.player.position.y + 2,
      window.player.position.z
    );
  
    // Update animations, spells, logs, interactions, etc.
    updateAnimationStates(delta, inputVector);
    if (window.updateSpellProjectiles) { window.updateSpellProjectiles(delta); }
    if (window.updateFlyingLogs) { window.updateFlyingLogs(delta); }
    if (window.checkLogCollisions) { window.checkLogCollisions(window.player); }
  }
  
  window.initControls = initControls;
  window.updatePlayerAndCamera = updatePlayerAndCamera;
  