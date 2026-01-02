export function applyDamage(player, sourceX, amount = 1) {
  if (player.invincible) return false;

  player.hp = Math.max(0, player.hp - amount);

  // Knockback (pousse loin de la source)
  const dir = player.sprite.x < sourceX ? -1 : 1; // source à droite => pousser gauche
  player.sprite.setVelocityX(dir * player.knockbackX);
  player.sprite.setVelocityY(-player.knockbackY);

  // Hitstun (bloque le contrôle un court instant)
  player.hitStunTimer = player.hitStunMs;

  // I-frames + clignotement
  player.invincible = true;

  player.scene.tweens.add({
    targets: player.sprite,
    alpha: 0.25,
    duration: 80,
    yoyo: true,
    repeat: Math.floor(player.invincibleMs / 160),
    onComplete: () => {
      player.sprite.alpha = 1;
    },
  });

  player.scene.time.delayedCall(player.invincibleMs, () => {
    player.invincible = false;
    player.sprite.alpha = 1;
  });

  return true;
}
