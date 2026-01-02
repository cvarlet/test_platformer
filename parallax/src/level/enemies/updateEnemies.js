// src/level/enemies/updateEnemies.js

export function updateEnemies(level, playerSprite, delta) {
  if (!level.enemies || !playerSprite) return;

  const px = playerSprite.x;

  level.enemies.getChildren().forEach((enemy) => {
    if (!enemy.body) return;

    // ✅ STUN (tous types d'ennemis)
    if ((enemy._stunTimer ?? 0) > 0) {
      enemy._stunTimer = Math.max(0, enemy._stunTimer - delta);
      enemy.body.setVelocityX(0);

      // si patrol : désactive hitbox pendant stun
      if (enemy._hitbox) {
        enemy._hitbox.body.enable = false;
        enemy._hitbox.visible = false;
      }

      // quand stun fini, retour à un état cohérent
      if (enemy._stunTimer <= 0) {
        if (enemy._enemyType === "patrol") enemy._state = "chase";
      }
      return;
    }

    // =========================================================
    // SHOOTER (tir)
    // =========================================================
    if (enemy._enemyType === "shooter") {
      enemy._shootTimer = Math.max(0, (enemy._shootTimer ?? 0) - delta);

      const dist = Math.abs(enemy.x - px);
      const dir = px > enemy.x ? 1 : -1;

      // feedback couleur
      enemy.fillColor = dist <= enemy._aggroRange ? 0xb28dff : 0x8b5bff;

      if (dist <= enemy._aggroRange && enemy._shootTimer <= 0) {
        const proj = level.scene.add.rectangle(
          enemy.x + dir * 26,
          enemy.y - 6,
          enemy._projW,
          enemy._projH,
          0xffffff,
          0.95
        );
        level.scene.physics.add.existing(proj, false);

        proj.body.setAllowGravity(false);
        level.enemyProjectiles.add(proj);
        proj.body.moves = true;
        proj.body.setVelocityX(dir * enemy._projSpeed);
        proj.body.setVelocityY(0);

        proj._team = "enemy";
        proj._damage = enemy._damage ?? 1;

        // multipliers (parry)
        proj._damageMult = 1;
        proj._perfect = false;

        proj._owner = enemy;

        enemy._shootTimer = enemy._shootCooldownMs;
      }

      return;
    }

    // =========================================================
    // PATROL (mêlée + chase + punch)
    // =========================================================
    if (enemy._enemyType !== "patrol") return;

    // timers
    enemy._cooldownTimer = Math.max(0, (enemy._cooldownTimer ?? 0) - delta);
    enemy._attackTimer = Math.max(0, (enemy._attackTimer ?? 0) - delta);

    const dist = Math.abs(enemy.x - px);

    // helpers hitbox
    const setHitboxPosition = () => {
      if (!enemy._hitbox) return;
      const dir = enemy._dir ?? 1;
      enemy._hitbox.x = enemy.x + dir * enemy._hbOffsetX;
      enemy._hitbox.y = enemy.y + enemy._hbOffsetY;
      enemy._hitbox.body.updateFromGameObject();
    };

    const disableHitbox = () => {
      if (!enemy._hitbox) return;
      enemy._hitbox.body.enable = false;
      enemy._hitbox.visible = false;
    };

    const enableHitbox = () => {
      if (!enemy._hitbox) return;
      enemy._hitbox.body.enable = true;
      enemy._hitbox.visible = true; // true si debug
    };

    const facePlayer = () => {
      enemy._dir = px > enemy.x ? 1 : -1;
    };

    // transitions aggro (patrol <-> chase)
    if (enemy._state === "patrol" && dist <= enemy._chaseRange)
      enemy._state = "chase";
    if (enemy._state === "chase" && dist >= enemy._giveUpRange)
      enemy._state = "patrol";

    switch (enemy._state) {
      case "patrol": {
        disableHitbox();

        if (enemy.x <= enemy._minX) enemy._dir = 1;
        if (enemy.x >= enemy._maxX) enemy._dir = -1;

        enemy.body.setVelocityX(enemy._speed * enemy._dir);
        enemy.fillColor = 0xff4d4d;

        setHitboxPosition();
        break;
      }

      case "chase": {
        disableHitbox();
        facePlayer();

        const grounded = enemy.body.blocked.down || enemy.body.touching.down;

        // attaque seulement si au sol
        if (
          grounded &&
          dist <= enemy._attackRange &&
          enemy._cooldownTimer <= 0
        ) {
          enemy._state = "windup";
          enemy._attackTimer = enemy._attackWindupMs;
          enemy.body.setVelocityX(0);
          enemy.fillColor = 0xffd24d;
          setHitboxPosition();
          break;
        }

        enemy.body.setVelocityX(enemy._chaseSpeed * enemy._dir);
        enemy.fillColor = 0xffa24d;
        setHitboxPosition();
        break;
      }

      case "windup": {
        disableHitbox();
        facePlayer();
        enemy.body.setVelocityX(0);
        enemy.fillColor = 0xffd24d;

        setHitboxPosition();

        if (enemy._attackTimer <= 0) {
          enemy._state = "active";
          enemy._attackTimer = enemy._attackActiveMs;
          enemy._didHitThisSwing = false; // reset swing
          enableHitbox();
        }
        break;
      }

      case "active": {
        facePlayer();
        enemy.body.setVelocityX(0);
        enemy.fillColor = 0xff5bd6;

        setHitboxPosition();

        if (enemy._attackTimer <= 0) {
          disableHitbox();
          enemy._state = "cooldown";
          enemy._cooldownTimer = enemy._attackCooldownMs;
        }
        break;
      }

      case "cooldown": {
        disableHitbox();
        facePlayer();
        enemy.body.setVelocityX(0);
        enemy.fillColor = 0xff7a7a;

        setHitboxPosition();

        if (enemy._cooldownTimer <= 0) {
          enemy._state = dist <= enemy._chaseRange ? "chase" : "patrol";
        }
        break;
      }

      default: {
        enemy._state = "patrol";
        break;
      }
    }
  });
}
