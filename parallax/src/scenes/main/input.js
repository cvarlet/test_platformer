import Phaser from "phaser";

export function initInput(scene) {
  scene.cursors = scene.input.keyboard.createCursorKeys();

  scene.keyShield = scene.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.E
  );

  scene.keyAttack = scene.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.J
  );

  scene.keyShoot = scene.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.S
  );

  return {
    cursors: scene.cursors,
    keyShield: scene.keyShield,
    keyAttack: scene.keyAttack,
    keyShoot: scene.keyShoot,
  };
}
