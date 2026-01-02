export function createPlatforms(level) {
  const scene = level.scene;
  const defs = level.data?.platforms ?? [];

  level.platforms = defs.map(({ x, y, w, h }) => {
    // visuel tile
    const visual = scene.add
      .tileSprite(x - w / 2, y - h / 2, w, h, "platformTile")
      .setOrigin(0, 0);

    // collider propre (invisible)
    const collider = scene.add.rectangle(x, y, w, h, 0x000000, 0);
    scene.physics.add.existing(collider, true);
    collider.body.setSize(w, h);
    collider.body.updateFromGameObject();

    return { visual, collider };
  });
}
