import Phaser from "phaser";

export function initInput(scene) {
  scene.cursors = scene.input.keyboard.createCursorKeys();

  scene.keyShield = scene.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.E
  );

  scene.keyAttack = scene.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.J
  );

  return {
    cursors: scene.cursors,
    keyShield: scene.keyShield,
    keyAttack: scene.keyAttack,
  };
}
