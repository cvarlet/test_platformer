export function createGround(level) {
  const scene = level.scene;

  const y = level.data?.ground?.y ?? 440;
  const h = level.data?.ground?.height ?? 60;

  // visuel sol
  scene.add.tileSprite(0, y, level.worldWidth, h, "ground").setOrigin(0, 0);

  // collider sol (invisible)
  const groundCollider = scene.add.rectangle(
    level.worldWidth / 2,
    y + h / 2,
    level.worldWidth,
    h,
    0x000000,
    0
  );

  scene.physics.add.existing(groundCollider, true);
  groundCollider.body.setSize(level.worldWidth, h);
  groundCollider.body.updateFromGameObject();

  level.groundCollider = groundCollider;
}
