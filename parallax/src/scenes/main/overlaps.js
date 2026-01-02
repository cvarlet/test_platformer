// src/scenes/main/overlaps.js
import { renderHearts, setScoreText } from "./ui";

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

  // --- Player -> Enemy melee hitboxes ---
  const enemyHitboxes = scene.level.getEnemyHitboxes();

  scene.physics.add.overlap(playerSprite, enemyHitboxes, (_, hb) => {
    if (scene.finished) return;

    const enemy = hb._owner;
    const dmg = enemy?._damage ?? 1;

    // Parry actif : pas de dégâts => stun
    if (scene.playerCtl.isParryActive()) {
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

      enemy._didHitThisSwing = true;
      return;
    }

    if (enemy?._didHitThisSwing) return;

    const didHit = scene.playerCtl.applyDamage(enemy?.x ?? hb.x, dmg);
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
