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

/** The old FBX-based spell cast for the character's arms/body. */
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

/** Load the magical orb for the player's projectile. */
function loadOrbModel() {
  const gltfLoader = new THREE.GLTFLoader();
  gltfLoader.load(
    'https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/magical_orb.glb',
    function(gltf) {
      window.orbModel = gltf.scene;
      recenterAndCleanOrbModel(window.orbModel);
      resourceLoaded();
    },
    function(xhr) {
      console.log('Orb model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      console.error('Error loading orb model:', error);
    }
  );
}

/** Load the small rock "drone" model, scaled down 10x. */
function loadDroneModel() {
  const gltfLoader = new THREE.GLTFLoader();
  gltfLoader.load(
    'https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/Small%20Rock.glb',
    function(gltf) {
      // This is the new DRONE model
      window.droneModel = gltf.scene;
      // The original "small rock" was around 0.425 scale. 
      // Now we scale it 10× smaller => 0.0425
      window.droneModel.scale.set(0.0425, 0.0425, 0.0425);
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

/** Load the tree model. */
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
        // Unique materials so that only the fallen tree fades
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

/** Load the log model. */
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

/** Load big rocks. */
function loadBigRocks() {
  const gltfLoader = new THREE.GLTFLoader();
  if (!window.bigRocks) window.bigRocks = [];
  gltfLoader.load(
    'https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/Big%20Rock.glb',
    function(gltf) {
      const rockModel = gltf.scene;
      rockModel.scale.set(0.20, 0.20, 0.20);
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
        scene.add(rockClone);
        window.bigRocks.push({ mesh: rockClone, position: pos.clone(), wobbleTime: 0 });
        window.bigRockPositions.push(pos.clone());
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

/**
 * Example of how you might spawn a drone in the world.
 * This is just an example. You can remove or change it.
 */
function spawnDroneExample() {
  if (!window.droneModel) return;
  // For example, spawn one drone near the origin:
  spawnDrone(new THREE.Vector3(0, 1, 0));
}

/** Called once all loaders are set up. */
function initLoaders() {
  tipInterval = setInterval(showRandomTip, 3000);
  showRandomTip();

  loadEnvironment();
  loadPlayerAndAnimations();
  loadTrees();
  loadLogs();
  loadBigRocks();
  loadOrbModel();
  loadDroneModel();

  // Wait a moment, then spawn an example drone
  setTimeout(spawnDroneExample, 5000);
}
