export default class Level {
  constructor(scene, levelData) {
    this.scene = scene;
    this.data = levelData;

    this.worldWidth = levelData?.world?.width ?? 6000;

    this.groundCollider = null;
    this.platforms = []; // [{ visual, collider }]

    this.coins = null;
    this.finishZone = null;

    this.enemyProjectiles = null;
  }

  createGround() {
    const y = this.data?.ground?.y ?? 440;
    const h = this.data?.ground?.height ?? 60;

    // visuel sol
    this.scene.add
      .tileSprite(0, y, this.worldWidth, h, "ground")
      .setOrigin(0, 0);

    // collider sol (invisible)
    const groundCollider = this.scene.add.rectangle(
      this.worldWidth / 2,
      y + h / 2,
      this.worldWidth,
      h,
      0x000000,
      0
    );

    this.scene.physics.add.existing(groundCollider, true);
    groundCollider.body.setSize(this.worldWidth, h);
    groundCollider.body.updateFromGameObject();

    this.groundCollider = groundCollider;
  }

  createPlatforms() {
    const defs = this.data?.platforms ?? [];

    this.platforms = defs.map(({ x, y, w, h }) => {
      // visuel tile
      const visual = this.scene.add
        .tileSprite(x - w / 2, y - h / 2, w, h, "platformTile")
        .setOrigin(0, 0);

      // collider propre (invisible)
      const collider = this.scene.add.rectangle(x, y, w, h, 0x000000, 0);
      this.scene.physics.add.existing(collider, true);
      collider.body.setSize(w, h);
      collider.body.updateFromGameObject();

      return { visual, collider };
    });
  }

  createCoins(onCollect) {
    // anim coin si pas déjà créée
    if (!this.scene.anims.exists("coinSpin")) {
      this.scene.anims.create({
        key: "coinSpin",
        frames: this.scene.anims.generateFrameNumbers("coin", {
          start: 0,
          end: 5,
        }),
        frameRate: 14,
        repeat: -1,
      });
    }

    this.coins = this.scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    const positions = this.data?.coins ?? [];
    positions.forEach((pos) => {
      const c = this.coins.create(pos.x, pos.y, "coin");
      c.play("coinSpin");
      c.body.setImmovable(true);
      c.body.setAllowGravity(false);
    });

    return (playerSprite) => {
      this.scene.physics.add.overlap(playerSprite, this.coins, (_, coin) =>
        onCollect(coin)
      );
    };
  }

  createFinish(onFinish) {
    const poleX = this.data?.finish?.poleX ?? this.worldWidth - 220;

    // poteau
    this.scene.add.rectangle(poleX, 330, 10, 180, 0xffffff, 0.9);

    // drapeau
    this.scene.add.image(poleX + 35, 270, "flag").setOrigin(0.5, 0.5);

    // zone de fin
    const finishZone = this.scene.add.rectangle(
      poleX + 20,
      380,
      180,
      220,
      0x000000,
      0
    );
    this.scene.physics.add.existing(finishZone, true);

    this.finishZone = finishZone;

    return (playerSprite) => {
      this.scene.physics.add.overlap(playerSprite, finishZone, () =>
        onFinish()
      );
    };
  }

  addPlayerColliders(playerSprite) {
    this.scene.physics.add.collider(playerSprite, this.groundCollider);
    this.platforms.forEach(({ collider }) => {
      this.scene.physics.add.collider(playerSprite, collider);
    });
  }

  addEnemyColliders() {
    if (!this.enemies) return;

    // Ennemis -> sol
    this.scene.physics.add.collider(this.enemies, this.groundCollider);

    // Ennemis -> plateformes
    this.platforms.forEach(({ collider }) => {
      this.scene.physics.add.collider(this.enemies, collider);
    });

    // Projectiles -> sol/plateformes (ils disparaissent)
    if (this.enemyProjectiles) {
      this.scene.physics.add.collider(
        this.enemyProjectiles,
        this.groundCollider,
        (proj) => {
          proj.destroy();
        }
      );

      this.platforms.forEach(({ collider }) => {
        this.scene.physics.add.collider(
          this.enemyProjectiles,
          collider,
          (proj) => {
            proj.destroy();
          }
        );
      });
    }
  }

  createDamageZones(onDamage) {
    const zones = this.data?.damageZones ?? [];
    const group = this.scene.physics.add.staticGroup();

    zones.forEach(({ x, y, w, h }) => {
      // visuel léger (rouge transparent)
      this.scene.add.rectangle(x, y, w, h, 0xff3b3b, 0.25);

      // collider invisible (statique)
      const z = this.scene.add.rectangle(x, y, w, h, 0x000000, 0);
      this.scene.physics.add.existing(z, true);
      z.body.setSize(w, h);
      z.body.updateFromGameObject();

      group.add(z);
    });

    return (playerSprite) => {
      this.scene.physics.add.overlap(playerSprite, group, (_, zone) => {
        onDamage(zone);
      });
    };
  }

  createEnemies() {
    const defs = this.data?.enemies ?? [];

    // groupe dynamique (les ennemis bougent)
    const enemies = this.scene.physics.add.group();

    // hitboxes mêlée (activées seulement pendant "active")
    this.enemyHitboxes = this.scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    // projectiles ennemis (tir)
    this.enemyProjectiles = this.scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    defs.forEach((e) => {
      // =========================================================
      // 1) PATROL (mêlée)
      // =========================================================
      if (e.type === "patrol") {
        const body = this.scene.add.rectangle(
          e.x,
          e.y,
          e.w ?? 36,
          e.h ?? 46,
          0xff4d4d,
          0.9
        );
        this.scene.physics.add.existing(body, false);

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
        const hitbox = this.scene.add.rectangle(
          body.x,
          body.y,
          body._hbW,
          body._hbH,
          0x00ff00,
          0.12
        );
        this.scene.physics.add.existing(hitbox, false);

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

        this.enemyHitboxes.add(hitbox);

        // vitesse initiale
        body.body.setVelocityX(body._speed * body._dir);

        enemies.add(body);
        return;
      }

      // =========================================================
      // 2) SHOOTER (tir à distance)
      // =========================================================
      if (e.type === "shooter") {
        const body = this.scene.add.rectangle(
          e.x,
          e.y,
          e.w ?? 36,
          e.h ?? 46,
          0x8b5bff,
          0.9
        );
        this.scene.physics.add.existing(body, false);

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

    this.enemies = enemies;
    return enemies;
  }

  getEnemyHitboxes() {
    return this.enemyHitboxes;
  }

  getEnemyProjectiles() {
    return this.enemyProjectiles;
  }

  updateEnemies(playerSprite, delta) {
    if (!this.enemies || !playerSprite) return;

    const px = playerSprite.x;

    this.enemies.getChildren().forEach((enemy) => {
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
          // shooter n'a pas de state machine : rien à faire
        }

        return; // on skip l'IA pendant le stun
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
          const proj = this.scene.add.rectangle(
            enemy.x + dir * 26,
            enemy.y - 6,
            enemy._projW,
            enemy._projH,
            0xffffff,
            0.95
          );
          this.scene.physics.add.existing(proj, false);

          proj.body.setAllowGravity(false);
          this.enemyProjectiles.add(proj);
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
        enemy._hitbox.visible = false; // passe à true si tu veux debug
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
            enemy._didHitThisSwing = false; // ✅ reset swing
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
}
