//
// animations.js
// Defines the logic for switching actions (idle, run, jump, spell),
// and tracking whether the player is mid-jump/spell.
//
// We'll rely on these global references from main.js and loader.js:
//   mixer, idleAction, runAction, jumpAction, spellAction, activeAction
//

// Tracking states
window.isJumping = false;
window.jumpSwitchTriggered = false;
window.isSpellCasting = false;
window.castSwitchTriggered = false;

/**
 * Switch from the currently active action to a new action, with optional fading.
 * @param {THREE.AnimationAction} newAction
 * @param {number} [fadeDuration=0]
 */
window.switchAction = function(newAction, fadeDuration = 0) {
  if (!newAction) return;
  if (activeAction === newAction) return;
  newAction.reset().play();
  if (activeAction) {
    activeAction.crossFadeTo(newAction, fadeDuration, false);
  }
  activeAction = newAction;
};

/**
 * Called when the user presses space.
 */
window.startJump = function() {
  if (!isJumping && jumpAction) {
    isJumping = true;
    jumpSwitchTriggered = false;
    switchAction(jumpAction, 0);
  }
};

/**
 * Called when the user presses F.
 */
window.startSpellCast = function() {
  if (!isSpellCasting && spellAction) {
    isSpellCasting = true;
    castSwitchTriggered = false;
    switchAction(spellAction, 0);
  }
};

/**
 * Called each frame in controls.js::updatePlayerAndCamera() after movement.
 * This checks if jump or spell animation has finished, and reverts to idle/run.
 */
window.updateAnimationStates = function(delta, movement) {
  // Jump finishing
  if (isJumping && activeAction === jumpAction && jumpAction.getClip()) {
    const jumpDuration = jumpAction.getClip().duration;
    if (!jumpSwitchTriggered && jumpAction.time >= jumpDuration - 0.1) {
      jumpSwitchTriggered = true;
      isJumping = false;
      switchAction((movement.length() > 0 ? runAction : idleAction), 0.1);
    }
  }

  // Spell finishing
  if (isSpellCasting && activeAction === spellAction && spellAction.getClip()) {
    const spellDuration = spellAction.getClip().duration;
    if (!castSwitchTriggered && spellAction.time >= spellDuration - 0.1) {
      castSwitchTriggered = true;
      isSpellCasting = false;
      switchAction((movement.length() > 0 ? runAction : idleAction), 0.1);
    }
  }

  // If not jumping or casting, switch between run/idle
  if (!isJumping && !isSpellCasting && runAction && idleAction) {
    // movement.length() > 0 => run
    if (movement.length() > 0 && activeAction !== runAction) {
      switchAction(runAction, 0);
    } else if (movement.length() === 0 && activeAction !== idleAction) {
      switchAction(idleAction, 0);
    }
  }
};
