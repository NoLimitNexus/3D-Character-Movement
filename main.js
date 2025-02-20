//
// main.js
// Core setup, scene creation, lights, camera, renderer, and the main animation loop.
//

window.scene = null;
window.camera = null;
window.renderer = null;
window.mixer = null;
window.clock = null;
window.player = null;

window.idleAction = null;
window.runAction = null;
window.jumpAction = null;
window.spellAction = null;
window.activeAction = null;

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
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
  clock = new THREE.Clock();
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) { mixer.update(delta); }
  updatePlayerAndCamera(delta);
  // Also update small rocks spawned from big rocks.
  if (window.updateFlyingSmallRocks) { window.updateFlyingSmallRocks(delta); }
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function main() {
  initScene();
  initControls();
  initLoaders();
  animate();
}

window.addEventListener('load', main);
