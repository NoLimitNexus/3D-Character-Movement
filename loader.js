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
  
  // Example tips to rotate through during loading
  const loadingTips = [
      "Tip: Hold Shift to sprint once you’re in the game.",
      "Tip: Collect resources to craft items.",
      "Did you know? This entire world is powered by THREE.js!",
      "Hint: You can dodge attacks by jumping!",
      "Fun Fact: Look for hidden treasures around large rocks."
  ];
  
  // For tracking loading progress:
  // Originally: environment, idle, run, jump, spell, trees, logs = 7 resources.
  // Now we add: big rocks and small rock model = 2 more → total 9.
  window.resourcesToLoad = 9;
  window.resourcesLoaded = 0;
  
  let tipInterval = null;
  function updateProgress() {
    let progress = (resourcesLoaded / resourcesToLoad) * 100;
    // Update global loading progress for the loading animation
    window.loadingProgress = progress;
    if (resourcesLoaded === resourcesToLoad) {
      if (tipInterval) { clearInterval(tipInterval); }
      // Hide the loading container after a short delay
      setTimeout(function() {
        document.getElementById('loadingContainer').style.display = 'none';
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
   * Loads the tree model and randomly places copies around.
   */
  function loadTrees() {
    const gltfLoader = new THREE.GLTFLoader();
    if (!window.trees) window.trees = [];
    gltfLoader.load(
      'https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/Tree.glb',
      function (gltf) {
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
          treeClone.position.copy(pos);
          scene.add(treeClone);
          window.trees.push({ mesh: treeClone, position: pos.clone(), wobbleTime: 0 });
          window.treePositions.push(pos.clone());
        }
        resourceLoaded();
      },
      function (xhr) {
        console.log('Tree model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
      },
      function (error) {
        console.error('Error loading tree model:', error);
        resourceLoaded();
      }
    );
  }
  
  /**
   * Loads the log model and places logs near trees.
   */
  function loadLogs() {
    const gltfLoader = new THREE.GLTFLoader();
    gltfLoader.load(
      'https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/log.glb',
      function (gltf) {
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
      function (xhr) {
        console.log('Log model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
      },
      function (error) {
        console.error('Error loading log model:', error);
      }
    );
  }
  
  /**
   * Loads the big rock model and randomly places copies around.
   * Big rocks behave like trees (wobble when hit) but are slightly smaller.
   */
  function loadBigRocks() {
    const gltfLoader = new THREE.GLTFLoader();
    if (!window.bigRocks) window.bigRocks = [];
    gltfLoader.load(
      'https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/Big%20Rock.glb',
      function (gltf) {
        const rockModel = gltf.scene;
        // Scale slightly smaller than trees; trees are at 0.25, so use 0.20.
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
      function (xhr) {
        console.log('Big Rock model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
      },
      function (error) {
        console.error('Error loading Big Rock model:', error);
      }
    );
  }
  
  /**
   * Loads the small rock model.
   * Small rocks will be spawned from big rocks when hit and behave like logs.
   * They are now scaled a bit larger (0.04) so they are more visible.
   */
  function loadSmallRockModel() {
    const gltfLoader = new THREE.GLTFLoader();
    gltfLoader.load(
      'https://raw.githack.com/NoLimitNexus/Utilities/refs/heads/main/Small%20Rock.glb',
      function (gltf) {
        window.smallRockModel = gltf.scene;
        // Increase scale from 0.025 to 0.04.
        window.smallRockModel.scale.set(0.24, 0.24, 0.24);
        resourceLoaded();
      },
      function (xhr) {
        console.log('Small Rock model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
      },
      function (error) {
        console.error('Error loading Small Rock model:', error);
      }
    );
  }
  
  /**
   * Spawns a number of small rocks from a big rock.
   * Similar to spawnLogsFromTree but uses smallRockModel.
   */
  function spawnSmallRocksFromBigRock(rockObj, count) {
    if (!window.scene || !window.smallRockModel) return;
    if (!window.spawnedSmallRocks) window.spawnedSmallRocks = [];
    for (let i = 0; i < count; i++) {
      const rockClone = window.smallRockModel.clone();
      const spawnPos = rockObj.position.clone();
      spawnPos.y = -1 + 1.0; // about 1 unit above ground
      rockClone.position.copy(spawnPos);
      scene.add(rockClone);
      // Random horizontal angle and speed
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 4;
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      const vy = 6 + Math.random() * 2;
      window.spawnedSmallRocks.push({
        mesh: rockClone,
        velocity: new THREE.Vector3(vx, vy, vz),
        isFlyingToPlayer: false,
        hasLanded: false,
        landTimer: 0
      });
    }
  }
  
  /**
   * Main entry for loading. Called from main.js::main().
   */
  function initLoaders() {
    tipInterval = setInterval(showRandomTip, 3000);
    showRandomTip();
    loadEnvironment();
    loadPlayerAndAnimations();
    loadTrees();
    loadLogs();
    loadBigRocks();
    loadSmallRockModel();
  }
