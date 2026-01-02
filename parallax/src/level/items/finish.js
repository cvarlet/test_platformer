export function createFinish(level, onFinish) {
  const scene = level.scene;
  const poleX = level.data?.finish?.poleX ?? level.worldWidth - 220;

  // poteau
  scene.add.rectangle(poleX, 330, 10, 180, 0xffffff, 0.9);

  // drapeau
  scene.add.image(poleX + 35, 270, "flag").setOrigin(0.5, 0.5);

  // zone de fin
  const finishZone = scene.add.rectangle(
    poleX + 20,
    380,
    180,
    220,
    0x000000,
    0
  );
  scene.physics.add.existing(finishZone, true);

  level.finishZone = finishZone;

  return (playerSprite) => {
    scene.physics.add.overlap(playerSprite, finishZone, () => onFinish());
  };
}
