export function createEnemies(level) {
  const defs = level.data?.enemies ?? [];

  // groupe dynamique (les ennemis bougent)
  const enemies = level.scene.physics.add.group();

  // hitboxes mêlée (activées seulement pendant "active")
  level.enemyHitboxes = level.scene.physics.add.group({
    allowGravity: false,
    immovable: true,
  });

  // projectiles ennemis (tir)
  level.enemyProjectiles = level.scene.physics.add.group({
    allowGravity: false,
    immovable: true,
  });

  defs.forEach((e) => {
    // =========================================================
    // 1) PATROL (mêlée)
    // =========================================================
    if (e.type === "patrol") {
      const body = level.scene.add.rectangle(
        e.x,
        e.y,
        e.w ?? 36,
        e.h ?? 46,
        0xff4d4d,
        0.9
      );
      level.scene.physics.add.existing(body, false);

      body.body.setSize(body.width, body.height);
      body.body.updateFromGameObject();

      // propriétés physiques
      body.body.setAllowGravity(true);
      body.body.immovable = true;
      body.body.setCollideWorldBounds(true);

      // data / IA
      body._enemyType = "patrol";
      body._minX = e.minX ?? e.x - 120;
      body._maxX = e.maxX ?? e.x + 120;
      body._speed = e.speed ?? 80;
      body._chaseRange = e.chaseRange ?? 320;
      body._giveUpRange = e.giveUpRange ?? 420;
      body._chaseSpeed = e.chaseSpeed ?? 140;
      body._state = "patrol"; // patrol | chase | windup | active | cooldown
      body._dir = 1;
      body._damage = e.damage ?? 1;
      body._hp = e.hp ?? 2; // 2 coups d'épée

      // anti double-hit par swing
      body._didHitThisSwing = false;

      // --- melee config ---
      body._attackRange = e.attackRange ?? 62;
      body._attackWindupMs = e.attackWindupMs ?? 160;
      body._attackActiveMs = e.attackActiveMs ?? 120;
      body._attackCooldownMs = e.attackCooldownMs ?? 700;

      const hb = e.attackHitbox ?? {};
      body._hbW = hb.w ?? 44;
      body._hbH = hb.h ?? 34;
      body._hbOffsetX = hb.offsetX ?? 34;
      body._hbOffsetY = hb.offsetY ?? 4;

      body._attackTimer = 0;
      body._cooldownTimer = 0;

      // --- hitbox rectangle (invisible) ---
      const hitbox = level.scene.add.rectangle(
        body.x,
        body.y,
        body._hbW,
        body._hbH,
        0x00ff00,
        0.12
      );
      level.scene.physics.add.existing(hitbox, false);

      hitbox.body.setSize(body._hbW, body._hbH);
      hitbox.body.updateFromGameObject();
      hitbox.body.setAllowGravity(false);
      hitbox.body.immovable = true;

      // désactivée par défaut
      hitbox.body.enable = false;
      hitbox.visible = false;

      // liens owner
      hitbox._owner = body;
      body._hitbox = hitbox;

      level.enemyHitboxes.add(hitbox);

      // vitesse initiale
      body.body.setVelocityX(body._speed * body._dir);

      enemies.add(body);
      return;
    }

    // =========================================================
    // 2) SHOOTER (tir à distance)
    // =========================================================
    if (e.type === "shooter") {
      const body = level.scene.add.rectangle(
        e.x,
        e.y,
        e.w ?? 36,
        e.h ?? 46,
        0x8b5bff,
        0.9
      );
      level.scene.physics.add.existing(body, false);

      body.body.setSize(body.width, body.height);
      body.body.updateFromGameObject();

      body.body.setAllowGravity(true);
      body.body.immovable = true;
      body.body.setCollideWorldBounds(true);

      body._enemyType = "shooter";
      body._aggroRange = e.aggroRange ?? 520;
      body._shootCooldownMs = e.shootCooldownMs ?? 900;
      body._shootTimer = 200; // petit délai initial

      const p = e.projectile ?? {};
      body._projSpeed = p.speed ?? 260;
      body._projW = p.w ?? 14;
      body._projH = p.h ?? 10;
      body._damage = p.damage ?? 1;
      body._hp = e.hp ?? 1; // 1 coup d'épée

      enemies.add(body);
      return;
    }
  });

  level.enemies = enemies;
  return enemies;
}
