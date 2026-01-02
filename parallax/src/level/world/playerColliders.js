export function addPlayerColliders(level, playerSprite) {
  level.scene.physics.add.collider(playerSprite, level.groundCollider);

  level.platforms.forEach(({ collider }) => {
    level.scene.physics.add.collider(playerSprite, collider);
  });
}
