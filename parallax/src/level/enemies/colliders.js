export function addEnemyColliders(level) {
  if (!level.enemies) return;

  // Ennemis -> sol
  level.scene.physics.add.collider(level.enemies, level.groundCollider);

  // Ennemis -> plateformes
  level.platforms.forEach(({ collider }) => {
    level.scene.physics.add.collider(level.enemies, collider);
  });

  // Projectiles -> sol/plateformes (ils disparaissent)
  if (level.enemyProjectiles) {
    level.scene.physics.add.collider(
      level.enemyProjectiles,
      level.groundCollider,
      (proj) => proj.destroy()
    );

    level.platforms.forEach(({ collider }) => {
      level.scene.physics.add.collider(
        level.enemyProjectiles,
        collider,
        (proj) => proj.destroy()
      );
    });
  }
}
