//
// loader.js
// Manages loading of all textures/models, updates the progress bar,
// shows rotating tips, and adds them to the scene.
//

//////////////////////////
// Patch FBXLoader to Skip ShininessExponent
//////////////////////////
(function() {
  const originalParseMaterial = THREE.FBXLoader.prototype.parseMaterial;
  THREE.FBXLoader.prototype.parseMaterial = function(materialNode) {
    if (materialNode && materialNode.ShininessExponent) {
      delete materialNode.ShininessExponent;
    }
    return originalParseMaterial.call(this, materialNode);
  };
})();

const loadingTips = [
"Tip: Hold Shift to sprint once you’re in the game.",
"Tip: Collect resources to craft items.",
"Did you know? This entire world is powered by THREE.js!",
"Hint: You can dodge attacks by jumping!",
"Fun Fact: Look for hidden treasures around large rocks."
];

// We now load 10 resources total: environment, idle, run, jump, spell, trees, logs, big rocks, orb model, drone model
window.resourcesToLoad = 10;
window.resourcesLoaded = 0;

let tipInterval = null;
function updateProgress() {
let progress = (resourcesLoaded / resourcesToLoad) * 100;
window.loadingProgress = progress;
if (resourcesLoaded === resourcesToLoad) {
  if (tipInterval) { clearInterval(tipInterval); }
  setTimeout(function() {
    const loaderDiv = document.getElementById('loadingContainer');
    if (loaderDiv) loaderDiv.style.display = 'none';
  }, 500);
}
}
window.resourceLoaded = function() {
resourcesLoaded++;
updateProgress();
};
function showRandomTip() {
if (!loadingTips.length) return;
const tipElement = document.getElementById('loadingTip');
if (tipElement) {
  const randomIndex = Math.floor(Math.random() * loadingTips.length);
  tipElement.textContent = loadingTips[randomIndex];
}
}

/** Utility to center an orb model and hide any plane sub-mesh. */
function recenterAndCleanOrbModel(model) {
model.traverse(child => {
  if (child.isMesh && child.name.toLowerCase().includes("plane")) {
    child.visible = false;
  }
});
model.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(model);
const center = box.getCenter(new THREE.Vector3());
model.position.x -= center.x;
model.position.y -= center.y;
model.position.z -= center.z;
}

function loadEnvironment() {
const textureLoader = new THREE.TextureLoader();
const grassTexture = textureLoader.load(
  'https://threejs.org/examples/textures/terrain/grasslight-big.jpg',
  () => { resourceLoaded(); }
);
grassTexture.wrapS = THREE.RepeatWrapping;
grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(50, 50);
const planeMaterial = new THREE.MeshStandardMaterial({
  map: grassTexture,
  color: new THREE.Color(0x556b2f)
});
const planeGeometry = new THREE.PlaneGeometry(500, 500);
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -1;
scene.add(plane);
}

function loadPlayerAndAnimations() {
const fbxLoader = new THREE.FBXLoader();
// 1) IDLE
fbxLoader.load(
  'https://raw.githubusercontent.com/NoLimitNexus/Utilities/main/Idle.fbx',
  function(object) {
    player = object;
    player.scale.set(0.01, 0.01, 0.01);
    player.position.set(0, -1, 0);
    scene.add(player);
    mixer = new THREE.AnimationMixer(player);
    if (object.animations && object.animations.length > 0) {
      idleAction = mixer.clipAction(object.animations[0]);
      idleAction.play();
      activeAction = idleAction;
    } else {
      console.log('No idle animations found');
    }
    resourceLoaded();
    loadRunAnimation(fbxLoader);
    loadJumpAnimation(fbxLoader);
    loadSpellAnimation(fbxLoader);
  },
  function(xhr) {
    console.log('Idle model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
  },
  function(error) {
    console.error('Error loading idle model:', error);
  }
);
}

function loadRunAnimation(fbxLoader) {
fbxLoader.load(
  'https://raw.githubusercontent.com/NoLimitNexus/Utilities/main/Running.fbx',
  function(runObject) {
    if (runObject.animations && runObject.animations.length > 0) {
      let runClip = runObject.animations[0];
      runClip.tracks.forEach(track => {
        if (track.name.startsWith('mixamorig:')) {
          track.name = track.name.replace('mixamorig:', '');
        }
      });
      runAction = mixer.clipAction(runClip);
      runAction.setLoop(THREE.LoopRepeat);
    } else {
      console.log('No running animations found');
    }
    resourceLoaded();
  },
  function(xhr) {
    console.log('Running animation: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
  },
  function(error) {
    console.error('Error loading running animation:', error);
  }
);
}

function loadJumpAnimation(fbxLoader) {
fbxLoader.load(
  'https://raw.githubusercontent.com/NoLimitNexus/Utilities/main/Jump.fbx',
  function(jumpObject) {
    if (jumpObject.animations && jumpObject.animations.length > 0) {
      let jumpClip = jumpObject.animations[0];
      jumpClip.tracks.forEach(track => {
        if (track.name.startsWith('mixamorig:')) {
          track.name = track.name.replace('mixamorig:', '');
        }
      });
      jumpAction = mixer.clipAction(jumpClip);
      jumpAction.setLoop(THREE.LoopOnce);
      jumpAction.clampWhenFinished = false;
    } else {
      console.log('No jump animations found');
    }
    resourceLoaded();
  },
  function(xhr) {
    console.log('Jump animation: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
  },
  function(error) {
    console.error('Error loading jump animation:', error);
  }
);
}

function loadSpellAnimation(fbxLoader) {
fbxLoader.load(
  'https://raw.githubusercontent.com/NoLimitNexus/Utilities/main/spell1.fbx',
  function(spellObject) {
    if (spellObject.animations && spellObject.animations.length > 0) {
      let spellClip = spellObject.animations[0];
      spellClip.tracks.forEach(track => {
        if (track.name.startsWith('mixamorig:')) {
          track.name = track.name.replace('mixamorig:', '');
        }
      });
      spellAction = mixer.clipAction(spellClip);
      // Set spell animation to play at 2x speed
      spellAction.setEffectiveTimeScale(2.0);
      spellAction.setLoop(THREE.LoopOnce);
      spellAction.clampWhenFinished = false;
    } else {
      console.log('No spell animations found');
    }
    resourceLoaded();
  },
  function(xhr) {
    console.log('Spell animation: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
  },
  function(error) {
    console.error('Error loading spell animation:', error);
  }
);
}

// Revised orb model: bright orange, glowing, with a particle effect.
function loadOrbModel() {
// Create a group to hold the orb and its particle system
const orbGroup = new THREE.Group();

// Create the core orb mesh (the magic core)
const orbGeometry = new THREE.SphereGeometry(0.3, 16, 16);
const orbMaterial = new THREE.MeshPhongMaterial({
  color: 0xff6600,           // Bright orange color
  emissive: 0xff6600,        // Emissive glow
  emissiveIntensity: 1.0,
  transparent: true,
  opacity: 1.0,
  shininess: 200,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});
const orbMesh = new THREE.Mesh(orbGeometry, orbMaterial);
orbGroup.add(orbMesh);

// Create a particle system for the magical effect.
const particleCount = 100;
const particlesGeometry = new THREE.BufferGeometry();
const positions = [];
const velocities = [];
for (let i = 0; i < particleCount; i++) {
  // Start each particle at the center of the orb
  positions.push(0, 0, 0);
  // Generate a random velocity direction and speed for each particle
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const speed = 1 + Math.random() * 1.5;
  const vx = speed * Math.sin(phi) * Math.cos(theta);
  const vy = speed * Math.sin(phi) * Math.sin(theta);
  const vz = speed * Math.cos(phi);
  velocities.push(vx, vy, vz);
}
particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
// Store velocities for later updating
particlesGeometry.userData = { velocities: velocities };

const particlesMaterial = new THREE.PointsMaterial({
  color: 0xff6600,
  size: 0.1,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
orbGroup.add(particleSystem);

window.orbModel = orbGroup;
resourceLoaded();
}

function loadDroneModel() {
const gltfLoader = new THREE.GLTFLoader();
gltfLoader.load(
  'https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/Small%20Rock.glb',
  function(gltf) {
    window.droneModel = gltf.scene;
    window.droneModel.scale.set(0.4, 0.4, 0.4);
    resourceLoaded();
  },
  function(xhr) {
    console.log('Drone model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
  },
  function(error) {
    console.error('Error loading drone model:', error);
  }
);
}

function loadTrees() {
const gltfLoader = new THREE.GLTFLoader();
if (!window.trees) window.trees = [];
gltfLoader.load(
  'https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/Tree.glb',
  function(gltf) {
    const treeModel = gltf.scene;
    treeModel.scale.set(0.25, 0.25, 0.25);
    const numTrees = 50;
    window.treePositions = [];
    for (let i = 0; i < numTrees; i++) {
      let pos;
      do {
        pos = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(500),
          -1,
          THREE.MathUtils.randFloatSpread(500)
        );
      } while (pos.distanceTo(new THREE.Vector3(0, -1, 0)) < 50);
      const treeClone = treeModel.clone();
      treeClone.traverse(child => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
      treeClone.position.copy(pos);
      scene.add(treeClone);
      window.trees.push({ mesh: treeClone, position: pos.clone(), wobbleTime: 0 });
      window.treePositions.push(pos.clone());
    }
    resourceLoaded();
  },
  function(xhr) {
    console.log('Tree model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
  },
  function(error) {
    console.error('Error loading tree model:', error);
    resourceLoaded();
  }
);
}

function loadLogs() {
const gltfLoader = new THREE.GLTFLoader();
gltfLoader.load(
  'https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/log.glb',
  function(gltf) {
    window.logModel = gltf.scene;
    window.logModel.scale.set(0.032, 0.032, 0.032);
    window.logObjects = [];
    window.treePositions.forEach((treePos) => {
      const logsPerTree = THREE.MathUtils.randInt(1, 3);
      for (let i = 0; i < logsPerTree; i++) {
        const offset = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(10),
          0,
          THREE.MathUtils.randFloatSpread(10)
        );
        const logPos = treePos.clone().add(offset);
        const logClone = window.logModel.clone();
        logClone.position.copy(logPos);
        scene.add(logClone);
        window.logObjects.push(logClone);
      }
    });
    resourceLoaded();
  },
  function(xhr) {
    console.log('Log model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
  },
  function(error) {
    console.error('Error loading log model:', error);
  }
);
}

function loadBigRocks() {
  const gltfLoader = new THREE.GLTFLoader();
  if (!window.bigRocks) window.bigRocks = [];
  gltfLoader.load(
    'https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/glowing_rock.glb',
    function(gltf) {
      const rockModel = gltf.scene;
      rockModel.scale.set(0.10, 0.10, 0.10);
      const numRocks = 20;
      window.bigRockPositions = [];
      for (let i = 0; i < numRocks; i++) {
        let pos;
        do {
          pos = new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(500),
            -1,
            THREE.MathUtils.randFloatSpread(500)
          );
        } while (pos.distanceTo(new THREE.Vector3(0, -1, 0)) < 50);
        const rockClone = rockModel.clone();
        rockClone.position.copy(pos);
        // Adjust rockClone's y so that its bottom touches the ground (which is at y = -1)
        rockClone.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(rockClone);
        const rockHeight = bbox.max.y - bbox.min.y;
        rockClone.position.y = -1 + rockHeight / 2;
        scene.add(rockClone);
        window.bigRocks.push({ mesh: rockClone, position: rockClone.position.clone(), wobbleTime: 0 });
        window.bigRockPositions.push(rockClone.position.clone());
      }
      resourceLoaded();
    },
    function(xhr) {
      console.log('Big Rock model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      console.error('Error loading Big Rock model:', error);
    }
  );
}


function initLoaders() {
tipInterval = setInterval(showRandomTip, 3000);
showRandomTip();

loadEnvironment();
loadPlayerAndAnimations();
loadTrees();
loadLogs();
loadBigRocks();
loadOrbModel();

}
