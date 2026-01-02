export function updateRanged(player, delta, keyShoot) {
  player.shootCooldown = Math.max(0, player.shootCooldown - delta);
  if (!keyShoot) return;

  if (Phaser.Input.Keyboard.JustDown(keyShoot)) {
    if (player.shootCooldown > 0) return;

    const scene = player.scene;
    if (!scene.playerProjectiles) return;

    const dir = player.facingDir;
    const x = player.sprite.x + dir * 26;
    const y = player.sprite.y - 6;

    const proj = scene.add.rectangle(
      x,
      y,
      14,
      10,
      player.projectileColor,
      0.95
    );

    scene.physics.add.existing(proj, false);

    scene.playerProjectiles.add(proj); // UNE SEULE FOIS

    const body = proj.body;
    body.setAllowGravity(false);
    body.setVelocity(dir * player.projectileSpeed, 0);

    proj._team = "player";
    proj._damage = player.projectileDamage;

    player.shootCooldown = player.shootCooldownMs;

    // debug utile : vérifie au prochain tick que ça n'a pas été reset
    scene.time.delayedCall(0, () => {
      console.log(
        "next tick vx",
        proj.body.velocity.x,
        "moves",
        proj.body.moves
      );
    });
  }
}
