// src/entities/Player/combat.js
import Phaser from "phaser";

export function updateCombat(player, delta, keyShield, keyAttack) {
  // ----------------------------
  // Cooldowns
  // ----------------------------
  player.shieldCooldown = Math.max(0, player.shieldCooldown - delta);
  player.attackCooldown = Math.max(0, player.attackCooldown - delta);

  // ----------------------------
  // Bouclier / Parry
  // ----------------------------
  player.shieldHeld = !!keyShield?.isDown;

  if (keyShield && Phaser.Input.Keyboard.JustDown(keyShield)) {
    console.log("SHIELD!");

    if (player.shieldCooldown <= 0) {
      player.parryActive = true;
      player.parryTimer = player.parryWindowMs;
      player.perfectParryTimer = player.perfectParryMs;
      player.shieldCooldown = player.shieldCooldownMs;

      if (player.shieldFx) {
        player.shieldFx.setVisible(true);
        player.shieldFx.setScale(1);
        player.scene.tweens.add({
          targets: player.shieldFx,
          scale: 1.25,
          duration: 70,
          yoyo: true,
        });
      }
    }
  }

  if (player.parryActive) {
    player.parryTimer -= delta;
    player.perfectParryTimer = Math.max(0, player.perfectParryTimer - delta);

    if (player.parryTimer <= 0) {
      player.parryActive = false;
      player.perfectParryTimer = 0;
    }
  }

  // ----------------------------
  // Attaque épée (J)
  // ----------------------------
  if (keyAttack && Phaser.Input.Keyboard.JustDown(keyAttack)) {
    console.log("ATTACK!");

    if (player.attackCooldown <= 0 && !player.attackActive) {
      player.attackActive = true;
      player.attackTimer = player.attackActiveMs;
      player.attackCooldown = player.attackCooldownMs;
      player.attackId += 1;

      if (player.swordFx) {
        player.swordFx.setAlpha(0.6);
        player.swordFx.setScale(1);
        player.scene.tweens.add({
          targets: player.swordFx,
          alpha: 0,
          scale: 1.35,
          duration: 120,
        });
      }
    }
  }

  if (player.attackActive) {
    player.attackTimer -= delta;
    if (player.attackTimer <= 0) player.attackActive = false;
  }

  // ----------------------------
  // Visuel bouclier
  // ----------------------------
  if (player.shieldFx && player.sprite) {
    const sx = player.sprite.x + player.facingDir * 26;
    const sy = player.sprite.y - 6;

    player.shieldFx.x = sx;
    player.shieldFx.y = sy;

    const visible = player.shieldHeld || player.parryActive;
    player.shieldFx.setVisible(visible);

    if (player.isPerfectParryActive()) player.shieldFx.fillAlpha = 0.75;
    else player.shieldFx.fillAlpha = player.parryActive ? 0.45 : 0.22;
  }

  // ----------------------------
  // Hitbox + FX épée (position + enable)
  // ----------------------------
  if (player.swordHitbox && player.sprite) {
    const dir = player.facingDir;
    player.swordHitbox.x = player.sprite.x + dir * 34;
    player.swordHitbox.y = player.sprite.y - 6;
    player.swordHitbox.body.updateFromGameObject();

    player.swordHitbox.body.enable = player.attackActive;
    player.swordHitbox.setVisible(player.attackActive); // debug visuel
  }

  if (player.swordFx && player.sprite) {
    const dir = player.facingDir;
    player.swordFx.x = player.sprite.x + dir * 34;
    player.swordFx.y = player.sprite.y - 6;
    player.swordFx.rotation = dir === 1 ? 0.15 : -0.15;
  }
}
