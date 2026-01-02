export function createDamageZones(level, onDamage) {
  const scene = level.scene;
  const zones = level.data?.damageZones ?? [];
  const group = scene.physics.add.staticGroup();

  zones.forEach(({ x, y, w, h }) => {
    // visuel léger (rouge transparent)
    scene.add.rectangle(x, y, w, h, 0xff3b3b, 0.25);

    // collider invisible (statique)
    const z = scene.add.rectangle(x, y, w, h, 0x000000, 0);
    scene.physics.add.existing(z, true);
    z.body.setSize(w, h);
    z.body.updateFromGameObject();

    group.add(z);
  });

  return (playerSprite) => {
    scene.physics.add.overlap(playerSprite, group, (_, zone) => {
      onDamage(zone);
    });
  };
}
