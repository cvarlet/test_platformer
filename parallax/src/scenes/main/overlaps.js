// src/scenes/main/overlaps.js
import { renderHearts, setScoreText } from "./ui";

function destroyPlayerProjectile(a, b) {
  // On veut détruire l'objet qui est un projectile joueur
  const proj = a?._team === "player" ? a : b?._team === "player" ? b : null;
  if (!proj) return;

  // sécurité anti double-destroy
  if (!proj.active) return;

  proj.destroy();
}

export function setupOverlaps(scene, playerSprite) {
  // --- Sword -> Enemies ---
  const swordHb = scene.playerCtl.getSwordHitbox();

  scene.physics.add.overlap(swordHb, scene.level.enemies, (hb, enemy) => {
    if (scene.finished) return;
    if (!hb.body.enable) return;

    // 1 hit par swing
    const swingId = scene.playerCtl.getAttackId();
    if (enemy._lastHitSwingId === swingId) return;
    enemy._lastHitSwingId = swingId;

    const dmg = 1;
    enemy._hp = (enemy._hp ?? 1) - dmg;

    // feedback visuel
    enemy.fillAlpha = 1;
    enemy.fillColor = 0xffffff;
    scene.tweens.add({
      targets: enemy,
      alpha: 0.3,
      duration: 60,
      yoyo: true,
      onComplete: () => (enemy.alpha = 1),
    });

    // stun court
    enemy._stunTimer = 220;
    enemy._state = "stun";

    // mort ?
    if (enemy._hp <= 0) {
      if (enemy._hitbox) enemy._hitbox.destroy();
      enemy.destroy();

      scene.cameras.main.shake(70, 0.004);
      scene.score += 1;
      setScoreText(scene, scene.score);
    }
  });

  // --- Player projectiles -> Enemies ---
  if (scene.playerProjectiles) {
    scene.physics.add.overlap(
      scene.playerProjectiles,
      scene.level.enemies,
      (proj, enemy) => {
        if (scene.finished) return;

        // sécurité : ignore si projectile pas joueur
        if (proj._team !== "player") return;

        const dmg = proj._damage ?? 1;

        // détruire le projectile à l'impact
        proj.destroy();

        // appliquer dégâts
        enemy._hp = (enemy._hp ?? 1) - dmg;

        // feedback visuel
        enemy.fillColor = 0xffffff;
        scene.tweens.add({
          targets: enemy,
          alpha: 0.3,
          duration: 60,
          yoyo: true,
          onComplete: () => (enemy.alpha = 1),
        });

        // mort ?
        if (enemy._hp <= 0) {
          if (enemy._hitbox) enemy._hitbox.destroy(); // patrol
          enemy.destroy();

          scene.score += 1;
          setScoreText(scene, scene.score);
          scene.cameras.main.shake(70, 0.004);
        } else {
          // petit stun optionnel
          enemy._stunTimer = 200;
          enemy._state = "stun";
        }
      }
    );
  }

  if (scene.playerProjectiles) {
    // --- projectiles -> sol
    scene.physics.add.collider(
      scene.playerProjectiles,
      scene.level.groundCollider,
      (a, b) => destroyPlayerProjectile(a, b)
    );
  }

  // --- Player -> Enemy melee hitboxes ---
  const enemyHitboxes = scene.level.getEnemyHitboxes();

  scene.physics.add.overlap(playerSprite, enemyHitboxes, (_, hb) => {
    if (scene.finished) return;

    const enemy = hb._owner;
    if (!enemy) return;

    // ✅ bloque tout spam (parry inclus)
    if (enemy._didHitThisSwing) return;

    const dmg = enemy._damage ?? 1;

    if (scene.playerCtl.isParryActive()) {
      enemy._didHitThisSwing = true;

      // bonus : coupe la hitbox immédiatement
      hb.body.enable = false;
      hb.visible = false;

      const perfect = scene.playerCtl.isPerfectParryActive();
      enemy._stunTimer = perfect ? 900 : 600;
      enemy._state = "stun";
      enemy.fillColor = perfect ? 0x7dffea : 0xb5ff7a;

      if (perfect) {
        scene.hitStop(60, 0.08);
        scene.cameras.main.shake(80, 0.004);

        scene.score += 1;
        setScoreText(scene, scene.score);
        scene.sound.play("sfxCoin", { volume: 0.25 });
      }
      return;
    }

    const didHit = scene.playerCtl.applyDamage(enemy.x ?? hb.x, dmg);
    if (didHit) {
      enemy._didHitThisSwing = true;
      renderHearts(scene, scene.playerCtl);

      if (scene.playerCtl.hp <= 0) {
        scene.finished = true;
        scene.showGameOver();
      }
    }
  });

  // --- Player -> Projectiles (enemy shots) ---
  const enemyProjectiles = scene.level.getEnemyProjectiles();

  scene.physics.add.overlap(playerSprite, enemyProjectiles, (_, proj) => {
    if (scene.finished) return;

    // projectile déjà renvoyé : ignore
    if (proj._team === "player") return;

    // Bouclier ?
    if (scene.playerCtl.isShieldHeld()) {
      // Parry ? -> renvoie
      if (scene.playerCtl.isParryActive()) {
        const perfect = scene.playerCtl.isPerfectParryActive();

        proj._team = "player";
        proj._damageMult = 1;
        proj._perfect = false;

        const dir = scene.playerCtl.getFacingDir();
        const speed = perfect ? 520 : 380;
        proj.body.setVelocityX(dir * speed);

        proj.x += dir * 8;
        proj.body.updateFromGameObject();

        if (perfect) {
          proj._damageMult = 2;
          proj._perfect = true;

          proj.setScale(1.35);
          proj.fillAlpha = 1;

          scene.tweens.add({
            targets: proj,
            scale: 1.55,
            duration: 80,
            yoyo: true,
          });

          scene.hitStop(60, 0.08);
          scene.cameras.main.shake(80, 0.004);
          scene.sound.play("sfxCoin", { volume: 0.25 });

          scene.score += 1;
          setScoreText(scene, scene.score);
        }

        return;
      }

      // bouclier normal : détruit projectile
      proj.destroy();
      return;
    }

    // sinon : dégâts
    proj.destroy();
    const dmg = proj._damage ?? 1;
    const didHit = scene.playerCtl.applyDamage(proj.x, dmg);

    if (didHit) {
      renderHearts(scene, scene.playerCtl);
      if (scene.playerCtl.hp <= 0) {
        scene.finished = true;
        scene.showGameOver();
      }
    }

    // --- Player projectiles (S) ---
    const playerProjectiles = scene.playerProjectiles;

    // sécurité si pas créé
    if (playerProjectiles) {
      // projectiles joueur -> sol
      scene.physics.add.collider(
        playerProjectiles,
        scene.level.groundCollider,
        (proj) => proj.destroy()
      );

      // projectiles joueur -> plateformes
      scene.level.platforms.forEach(({ collider }) => {
        scene.physics.add.collider(playerProjectiles, collider, (proj) =>
          proj.destroy()
        );
      });

      // projectiles joueur -> ennemis
      scene.physics.add.overlap(
        scene.level.enemies,
        playerProjectiles,
        (enemy, proj) => {
          const dmg = proj._damage ?? 1;
          proj.destroy();

          enemy._hp = (enemy._hp ?? 1) - dmg;

          // feedback léger
          enemy.fillColor = 0xffffff;
          scene.tweens.add({
            targets: enemy,
            alpha: 0.3,
            duration: 60,
            yoyo: true,
            onComplete: () => (enemy.alpha = 1),
          });

          // mort ?
          if (enemy._hp <= 0) {
            if (enemy._hitbox) enemy._hitbox.destroy();
            enemy.destroy();

            scene.score += 1;
            setScoreText(scene, scene.score);
          } else {
            // petit stun optionnel
            enemy._stunTimer = 160;
            enemy._state = "stun";
          }
        }
      );
    }
  });

  // --- Projectiles renvoyés -> Ennemis ---
  scene.physics.add.overlap(
    scene.level.enemies,
    enemyProjectiles,
    (enemy, proj) => {
      if (proj._team !== "player") return;

      const base = proj._damage ?? 1;
      const mult = proj._damageMult ?? 1;
      const dmg = base * mult;

      proj.destroy();

      if (dmg >= 2) {
        if (enemy._hitbox) enemy._hitbox.destroy();
        enemy.destroy();

        scene.cameras.main.shake(90, 0.006);

        scene.score += 2;
        setScoreText(scene, scene.score);
        return;
      }

      enemy._stunTimer = 600;
      enemy._state = "stun";
      enemy.fillColor = 0xb5ff7a;
    }
  );

  // --- Damage zones ---
  const attachDamageZones = scene.level.createDamageZones((zone) => {
    if (scene.finished) return;

    const didHit = scene.playerCtl.applyDamage(zone.x, 1);
    if (didHit) {
      renderHearts(scene, scene.playerCtl);

      if (scene.playerCtl.hp <= 0) {
        scene.finished = true;
        scene.showGameOver();
      }
    }
  });
  attachDamageZones(playerSprite);

  // --- Coins ---
  const attachCoinOverlap = scene.level.createCoins((coin) => {
    if (scene.finished) return;

    coin.destroy();
    scene.sound.play("sfxCoin", { volume: 0.5 });

    scene.score += 1;
    setScoreText(scene, scene.score);

    // BEST
    const currentBest = scene.bestByLevel[scene.levelKey] ?? 0;
    if (scene.score > currentBest) {
      scene.bestByLevel[scene.levelKey] = scene.score;
      if (scene.bestText?.setText)
        scene.bestText.setText(`Best: ${scene.score}`);

      // sauvegarde progression
      scene.saveProgress?.();
    }
  });
  attachCoinOverlap(playerSprite);

  // --- Finish ---
  const attachFinishOverlap = scene.level.createFinish(() => {
    if (scene.finished) return;
    scene.finishLevel();
  });
  attachFinishOverlap(playerSprite);
}
