//
// loader.js
// Manages loading of all textures/models, updates the progress bar,
// shows rotating tips, and adds them to the scene.
//

// Example tips to rotate through during loading
const loadingTips = [
    "Tip: Hold Shift to sprint once you’re in the game.",
    "Tip: Collect resources to craft items.",
    "Did you know? This entire world is powered by THREE.js!",
    "Hint: You can dodge attacks by jumping!",
    "Fun Fact: Look for hidden treasures around large rocks."
];

// For tracking loading progress:
window.resourcesToLoad = 7; // Grass + 4 FBX + 2 GLTF (trees + logs)
window.resourcesLoaded = 0;

// Used for rotating tips
let tipInterval = null;

// Update the progress bar in index.html
function updateProgress() {
  let progress = (resourcesLoaded / resourcesToLoad) * 100;
  const bar = document.getElementById('progressBar');
  bar.style.width = progress + '%';

  // If everything is loaded, hide the loading screen
  if (resourcesLoaded === resourcesToLoad) {
    // Clear the tip interval
    if (tipInterval) {
      clearInterval(tipInterval);
    }
    document.getElementById('loadingContainer').style.display = 'none';
  }
}

// Call this whenever a single resource finishes loading
window.resourceLoaded = function() {
  resourcesLoaded++;
  updateProgress();
};

// Picks a random tip from loadingTips and displays it
function showRandomTip() {
  if (!loadingTips.length) return;
  const tipElement = document.getElementById('loadingTip');
  if (tipElement) {
    const randomIndex = Math.floor(Math.random() * loadingTips.length);
    tipElement.textContent = loadingTips[randomIndex];
  }
}

/**
 * Loads the grass texture, creates the plane,
 * and adds it to the scene.
 */
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

/**
 * Loads the character (idle FBX) and then the run/jump/spell animations,
 * sets up the mixer, and assigns actions.
 */
function loadPlayerAndAnimations() {
  const fbxLoader = new THREE.FBXLoader();

  // 1) IDLE
  fbxLoader.load(
    'https://raw.githubusercontent.com/NoLimitNexus/Utilities/main/Idle.fbx',
    function (object) {
      player = object;
      player.scale.set(0.01, 0.01, 0.01);
      player.position.set(0, -1, 0);
      scene.add(player);

      mixer = new THREE.AnimationMixer(player);

      // If the idle FBX has animations, set up idleAction
      if (object.animations && object.animations.length > 0) {
        idleAction = mixer.clipAction(object.animations[0]);
        idleAction.play();
        activeAction = idleAction;
      } else {
        console.log('No idle animations found');
      }
      resourceLoaded();

      // After the idle is loaded, load the other animations in sequence
      loadRunAnimation(fbxLoader);
      loadJumpAnimation(fbxLoader);
      loadSpellAnimation(fbxLoader);
    },
    function (xhr) {
      console.log('Idle model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      console.error('Error loading idle model:', error);
    }
  );
}

// 2) RUN
function loadRunAnimation(fbxLoader) {
  fbxLoader.load(
    'https://raw.githubusercontent.com/NoLimitNexus/Utilities/main/Running.fbx',
    function (runObject) {
      if (runObject.animations && runObject.animations.length > 0) {
        let runClip = runObject.animations[0];
        // Fix track names if necessary
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
    function (xhr) {
      console.log('Running animation: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      console.error('Error loading running animation:', error);
    }
  );
}

// 3) JUMP
function loadJumpAnimation(fbxLoader) {
  fbxLoader.load(
    'https://raw.githubusercontent.com/NoLimitNexus/Utilities/main/Jump.fbx',
    function (jumpObject) {
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
    function (xhr) {
      console.log('Jump animation: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      console.error('Error loading jump animation:', error);
    }
  );
}

// 4) SPELL
function loadSpellAnimation(fbxLoader) {
  fbxLoader.load(
    'https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/spell1.fbx',
    function (spellObject) {
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
    function (xhr) {
      console.log('Spell animation: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      console.error('Error loading spell animation:', error);
    }
  );
}

/**
 * Load the tree model and place many copies around.
 */
function loadTrees() {
  const gltfLoader = new THREE.GLTFLoader();
  gltfLoader.load(
    'https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/Tree.glb',
    function (gltf) {
      const treeModel = gltf.scene;
      treeModel.scale.set(0.25, 0.25, 0.25);

      const numTrees = 50;
      window.treePositions = [];
      for (let i = 0; i < numTrees; i++) {
        let pos;
        // Ensure not too close to player's start (0, -1, 0)
        do {
          pos = new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(500),
            -1,
            THREE.MathUtils.randFloatSpread(500)
          );
        } while (pos.distanceTo(new THREE.Vector3(0, -1, 0)) < 50);

        const treeClone = treeModel.clone();
        treeClone.position.copy(pos);
        scene.add(treeClone);
        window.treePositions.push(pos.clone());
      }
      resourceLoaded();
    },
    function (xhr) {
      console.log('Tree model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      console.error('Error loading tree model:', error);
      resourceLoaded(); // ensure we count this even if it fails
    }
  );
}

/**
 * Load logs model and place them near trees.
 */
function loadLogs() {
  const gltfLoader = new THREE.GLTFLoader();
  gltfLoader.load(
    'https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/log.glb',
    function (gltf) {
      const logModel = gltf.scene;
      // Make logs smaller than the player
      // (player is scaled at 0.01, so 0.008 is slightly smaller)
      logModel.scale.set(0.032, 0.032, 0.032);

      window.logObjects = [];
      // For each tree, place 1 to 3 logs near it
      window.treePositions.forEach((treePos) => {
        const logsPerTree = THREE.MathUtils.randInt(1, 3);
        for (let i = 0; i < logsPerTree; i++) {
          // Random offset within a radius of 10 units
          const offset = new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(10),
            0,
            THREE.MathUtils.randFloatSpread(10)
          );
          const logPos = treePos.clone().add(offset);
          const logClone = logModel.clone();
          logClone.position.copy(logPos);
          scene.add(logClone);
          window.logObjects.push(logClone);
        }
      });
      resourceLoaded();
    },
    function (xhr) {
      console.log('Log model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      console.error('Error loading log model:', error);
    }
  );
}

/**
 * Main entry for loading. Called from main.js::main().
 */
function initLoaders() {
  // Start rotating tips while loading
  tipInterval = setInterval(showRandomTip, 3000);
  showRandomTip(); // Show one immediately, then rotate every 3s

  loadEnvironment();
  loadPlayerAndAnimations();
  loadTrees();
  loadLogs();
}
