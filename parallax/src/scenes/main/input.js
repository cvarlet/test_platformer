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

  scene.keyColor1 = scene.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.ONE
  );
  scene.keyColor2 = scene.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.TWO
  );
  scene.keyColor3 = scene.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.THREE
  );
  scene.keyColor4 = scene.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.FOUR
  );

  return {
    cursors: scene.cursors,
    keyShield: scene.keyShield,
    keyAttack: scene.keyAttack,
    keyShoot: scene.keyShoot,
  };
}
