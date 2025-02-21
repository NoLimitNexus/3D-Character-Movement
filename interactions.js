//
// interactions.js
// Handles interactions such as collecting logs when the player walks over them.
//

console.log('interactions.js loaded.');

// Function to check for collisions between the player and logs
window.checkLogCollisions = function(player) {
  if (!window.logObjects) return;
  // Iterate backwards so removals don't affect the loop index
  for (let i = window.logObjects.length - 1; i >= 0; i--) {
    const log = window.logObjects[i];
    // Simple collision detection: if the distance between the player and the log is less than 3 units
    if (player.position.distanceTo(log.position) < 3) {
      // Remove the log from the scene and from the logObjects array
      scene.remove(log);
      window.logObjects.splice(i, 1);
      console.log("Log collected!");
    }
  }
};

// Optionally, you could combine multiple interaction checks in a single function:
// window.checkInteractions = function(player) {
//   window.checkLogCollisions(player);
//   // Add more interaction checks here as needed.
// };
