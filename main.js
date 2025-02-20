//
// main.js
// Core setup, scene creation, lights, camera, renderer, and the main animation loop.
//

// Global references so other files (animations.js, controls.js, etc.) can see them easily:
window.scene = null;
window.camera = null;
window.renderer = null;
window.mixer = null;
window.clock = null;
window.player = null;

// Store references to animation actions
// (the actual action objects get set in animations.js and loader.js).
window.idleAction = null;
window.runAction = null;
window.jumpAction = null;
window.spellAction = null;
window.activeAction = null;

// Create the scene, camera, renderer, and lights
function initScene() {
  // SCENE
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  // CAMERA
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  // RENDERER
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // LIGHTS
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  hemiLight.position.set(0, 200, 0);
  scene.add(hemiLight);

  const pointLight = new THREE.PointLight(0xffffff, 0.8);
  pointLight.position.set(0, 10, 0);
  scene.add(pointLight);

  // CLOCK for animation updates
  clock = new THREE.Clock();
}

// Main animation loop
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Update mixer (model animations) if loaded
  if (mixer) {
    mixer.update(delta);
  }

  // Update movement and camera each frame (see controls.js)
  updatePlayerAndCamera(delta);

  // Render the scene
  renderer.render(scene, camera);
}

// Resize handler
window.addEventListener('resize', () => {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialization entry point
function main() {
  // 1) Create scene, camera, renderer
  initScene();

  // 2) Initialize controls (attach event listeners)
  initControls();

  // 3) Load all assets and place them in the scene (loader.js)
  initLoaders();

  // 4) Start the render loop
  animate();
}

// Kick it off once the page is fully loaded
window.addEventListener('load', main);
