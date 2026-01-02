export function createCoins(level, onCollect) {
  const scene = level.scene;

  // anim coin si pas déjà créée
  if (!scene.anims.exists("coinSpin")) {
    scene.anims.create({
      key: "coinSpin",
      frames: scene.anims.generateFrameNumbers("coin", { start: 0, end: 5 }),
      frameRate: 14,
      repeat: -1,
    });
  }

  level.coins = scene.physics.add.group({
    allowGravity: false,
    immovable: true,
  });

  const positions = level.data?.coins ?? [];
  positions.forEach((pos) => {
    const c = level.coins.create(pos.x, pos.y, "coin");
    c.play("coinSpin");
    c.body.setImmovable(true);
    c.body.setAllowGravity(false);
  });

  return (playerSprite) => {
    scene.physics.add.overlap(playerSprite, level.coins, (_, coin) =>
      onCollect(coin)
    );
  };
}
