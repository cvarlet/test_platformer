import Phaser from "phaser";
import Parallax from "../systems/Parallax";
import Player from "../entities/Player";
import Level from "../level/Level";
import { loadProgress, saveProgress, clearProgress } from "./main/progress";
import { createHud, renderHearts, setScoreText, setBestText } from "./main/ui";

const WORLD_WIDTH = 6000;
const WORLD_HEIGHT = 500;

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.parallax = null;
    this.playerCtl = null;
    this.level = null;

    this.cursors = null;

    this.score = 0;
    this.scoreText = null;

    this.finished = false;

    this.lookAheadX = 45; // combien la caméra regarde devant
    this.lookAheadLerp = 0.008; // douceur du décalage (0.05–0.15)
    this.lookAheadCurrent = 0; // interne

    this.levelKey = "level1";
  }

  preload() {
    this.load.image("sky", "/assets/sky.png");
    this.load.image("mountains", "/assets/mountains.png");
    this.load.image("cloudsFG", "/assets/clouds_fg.png");
    this.load.image("ground", "/assets/ground.png");

    this.load.spritesheet("player", "/assets/player_walk.png", {
      frameWidth: 40,
      frameHeight: 60,
    });

    this.load.spritesheet("coin", "/assets/coin_spin.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image("flag", "/assets/flag.png");
    this.load.image("platformTile", "/assets/platform_tile.png");
    this.load.image("heartFull", "/assets/heart_full.png");
    this.load.image("heartHalf", "/assets/heart_half.png");
    this.load.image("heartEmpty", "/assets/heart_empty.png");

    this.load.audio("sfxCoin", "/assets/sfx_coin.wav");
    this.load.audio("sfxWin", "/assets/sfx_win.wav");

    this.load.json("level1", "/assets/levels/level1.json");
    this.load.json("level2", "/assets/levels/level2.json");
  }

  create() {
    // TEST
    clearProgress();

    // --- Progression sauvegardée ---
    const progress = loadProgress();
    if (progress?.lastLevelKey) this.levelKey = progress.lastLevelKey;
    if (progress?.bestByLevel) this.bestByLevel = progress.bestByLevel;

    if (typeof this.bestByLevel !== "object" || this.bestByLevel === null) {
      this.bestByLevel = {};
    }

    const levelData = this.cache.json.get(this.levelKey);

    // Sauve le dernier niveau joué dès qu'on le charge
    saveProgress({
      lastLevelKey: this.levelKey,
      bestByLevel: this.bestByLevel,
    });

    const worldW = levelData?.world?.width ?? 6000;
    const worldH = levelData?.world?.height ?? 500;

    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    this.finished = false;
    this.score = 0;

    // Parallax
    this.parallax = new Parallax(this);
    this.parallax.create();

    // Level
    this.level = new Level(this, levelData);
    this.level.createGround();
    this.level.createPlatforms();

    // Player
    this.playerCtl = new Player(this);
    const startX = levelData?.playerStart?.x ?? 200;
    const startY = levelData?.playerStart?.y ?? 200;

    const playerSprite = this.playerCtl.create(startX, startY);
    this.playerSprite = playerSprite; // ✅ important : maintenant il existe

    this.playerCtl.hp = this.playerCtl.maxHp;
    renderHearts(this, this.playerCtl);

    this.level.addPlayerColliders(playerSprite);

    // Enemies
    const enemies = this.level.createEnemies();
    this.level.addEnemyColliders();

    // ✅ Overlap épée joueur -> ennemis
    const swordHb = this.playerCtl.getSwordHitbox();

    this.physics.add.overlap(swordHb, this.level.enemies, (hb, enemy) => {
      if (this.finished) return;
      if (!hb.body.enable) return; // sécurité

      // ✅ 1 hit par swing
      const swingId = this.playerCtl.getAttackId();
      if (enemy._lastHitSwingId === swingId) return;
      enemy._lastHitSwingId = swingId;

      // dégâts épée
      const dmg = 1;
      enemy._hp = (enemy._hp ?? 1) - dmg;

      // feedback visuel
      enemy.fillAlpha = 1;
      enemy.fillColor = 0xffffff;
      this.tweens.add({
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

        this.cameras.main.shake(70, 0.004);
        this.score += 1;
        setScoreText(this, this.score);
      }
    });

    // ✅ Overlap HITBOXES (maintenant playerSprite existe)
    const enemyHitboxes = this.level.getEnemyHitboxes();
    this.physics.add.overlap(playerSprite, enemyHitboxes, (_, hb) => {
      if (this.finished) return;

      const enemy = hb._owner;
      const dmg = enemy?._damage ?? 1;

      // ✅ Si parry actif : pas de dégâts => stun ennemi
      if (this.playerCtl.isParryActive()) {
        const perfect = this.playerCtl.isPerfectParryActive();

        // ✅ stun l'ennemi mêlée
        enemy._stunTimer = perfect ? 900 : 600;
        enemy._state = "stun";
        enemy.fillColor = perfect ? 0x7dffea : 0xb5ff7a;

        // feedback
        if (perfect) {
          this.hitStop(60, 0.08);
          this.cameras.main.shake(80, 0.004);

          this.score += 1;
          setScoreText(this, this.score);
          this.sound.play("sfxCoin", { volume: 0.25 });
        }

        // évite le double-hit de la même swing
        enemy._didHitThisSwing = true;

        return;
      }

      // (optionnel mais conseillé : 1 hit max par swing)
      if (enemy?._didHitThisSwing) return;

      const didHit = this.playerCtl.applyDamage(enemy?.x ?? hb.x, dmg);
      if (didHit) {
        enemy._didHitThisSwing = true;
        renderHearts(this, this.playerCtl);

        if (this.playerCtl.hp <= 0) {
          this.finished = true;
          this.showGameOver();
        }
      }
    });

    // ✅ Overlap PROJECTILES (ennemi tireur)
    const enemyProjectiles = this.level.getEnemyProjectiles();

    this.physics.add.overlap(playerSprite, enemyProjectiles, (_, proj) => {
      if (this.finished) return;

      // Si projectile déjà "joueur", on ignore (il ne doit pas re-toucher le héros)
      if (proj._team === "player") return;

      // Bouclier actif ?
      if (this.playerCtl.isShieldHeld()) {
        // Parry actif ? => on renvoie
        if (this.playerCtl.isParryActive()) {
          const perfect = this.playerCtl.isPerfectParryActive();

          // Passe en team joueur
          proj._team = "player";

          // ✅ Par défaut (parry normal)
          proj._damageMult = 1;
          proj._perfect = false;

          const dir = this.playerCtl.getFacingDir();

          // ✅ perfect = plus rapide
          const speed = perfect ? 520 : 380;
          proj.body.setVelocityX(dir * speed);

          // Petite poussée pour éviter de rester collé au joueur
          proj.x += dir * 8;
          proj.body.updateFromGameObject();

          // ✅ Perfect parry => dégâts x2 + effet visuel
          if (perfect) {
            proj._damageMult = 2;
            proj._perfect = true;

            // marque visuelle simple (sans assets)
            proj.setScale(1.35);
            proj.fillAlpha = 1;

            this.tweens.add({
              targets: proj,
              scale: 1.55,
              duration: 80,
              yoyo: true,
            });

            // feedback
            this.hitStop(60, 0.08);
            this.cameras.main.shake(80, 0.004);
            this.sound.play("sfxCoin", { volume: 0.25 });

            // bonus score (optionnel)
            this.score += 1;
            setScoreText(this, this.score);
          }

          return;
        }

        // Bouclier normal => on détruit le projectile, pas de dégâts
        proj.destroy();
        return;
      }

      // Sinon => dégâts normaux
      proj.destroy();

      const dmg = proj._damage ?? 1;
      const didHit = this.playerCtl.applyDamage(proj.x, dmg);

      if (didHit) {
        renderHearts(this, this.playerCtl);
        if (this.playerCtl.hp <= 0) {
          this.finished = true;
          this.showGameOver();
        }
      }
    });

    // ✅ Projectiles renvoyés -> ennemis
    this.physics.add.overlap(
      this.level.enemies,
      enemyProjectiles,
      (enemy, proj) => {
        if (proj._team !== "player") return;

        const base = proj._damage ?? 1;
        const mult = proj._damageMult ?? 1;
        const dmg = base * mult;

        proj.destroy();

        // ✅ dmg >= 2 => kill direct (perfect)
        if (dmg >= 2) {
          if (enemy._hitbox) enemy._hitbox.destroy();
          enemy.destroy();

          this.cameras.main.shake(90, 0.006);

          this.score += 2;
          setScoreText(this, this.score);
          return;
        }

        // ✅ dmg 1 => stun
        enemy._stunTimer = 600;
        enemy._state = "stun";
        enemy.fillColor = 0xb5ff7a; // vert clair "touché"
      }
    );

    const attachDamageZones = this.level.createDamageZones((zone) => {
      if (this.finished) return;

      const didHit = this.playerCtl.applyDamage(zone.x, 1);
      if (didHit) {
        renderHearts(this, this.playerCtl);

        // mort => game over simple
        if (this.playerCtl.hp <= 0) {
          this.finished = true;
          this.showGameOver();
        }
      }
    });
    attachDamageZones(playerSprite);

    this.cameras.main.startFollow(playerSprite, true, 0.15, 0.15);

    // Zone "morte" : le joueur peut bouger dans une zone avant que la caméra suive
    this.cameras.main.setDeadzone(0, worldH);

    // Optionnel : place le joueur un peu plus vers la gauche (pour voir plus devant)
    this.cameras.main.setFollowOffset(-0, 0);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    // Bouclier / Parry
    this.keyShield = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.E
    );
    this.keyAttack = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.J
    );

    // UI
    const hud = createHud(this);
    this.scoreText = hud.scoreText;
    this.bestText = hud.bestText;

    // Best initial
    const best = this.bestByLevel[this.levelKey] ?? 0;
    setBestText(this, best);

    // Coins
    const attachCoinOverlap = this.level.createCoins((coin) => {
      if (this.finished) return;

      coin.destroy();
      this.sound.play("sfxCoin", { volume: 0.5 });

      this.score += 1;
      this.scoreText.setText(`Score: ${this.score}`);

      // ✅ BEST SCORE (au bon endroit)
      const currentBest = this.bestByLevel[this.levelKey] ?? 0;
      if (this.score > currentBest) {
        this.bestByLevel[this.levelKey] = this.score;
        this.bestText.setText(`Best: ${this.score}`);

        saveProgress({
          lastLevelKey: this.levelKey,
          bestByLevel: this.bestByLevel,
        });
      }
    });
    attachCoinOverlap(playerSprite);

    // Finish
    const attachFinishOverlap = this.level.createFinish(() => {
      if (this.finished) return;
      this.finishLevel();
    });
    attachFinishOverlap(playerSprite);
  }

  finishLevel() {
    this.finished = true;
    this.sound.play("sfxWin", { volume: 0.65 });
    this.playerCtl.freeze();

    const overlay = this.add
      .rectangle(550, 250, 1100, 500, 0x000000, 0.45)
      .setScrollFactor(0);
    const panel = this.add
      .rectangle(550, 250, 520, 260, 0x0b1020, 0.9)
      .setScrollFactor(0);

    const title = this.add
      .text(550, 200, "Bravo !", {
        fontFamily: "Arial",
        fontSize: "44px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const info = this.add
      .text(550, 250, `Score: ${this.score}`, {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const btn = this.add
      .text(550, 310, "Rejouer", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: "#2e8b57",
        padding: { left: 18, right: 18, top: 10, bottom: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerdown", () => this.scene.restart());

    const btnNext = this.add
      .text(550, 450, "Niveau suivant", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: "#2e8b57",
        padding: { left: 18, right: 18, top: 10, bottom: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    btnNext.on("pointerdown", () => {
      // passe au niveau suivant
      this.levelKey = this.levelKey === "level1" ? "level2" : "level1";

      // sauvegarde le dernier niveau choisi
      saveProgress({
        lastLevelKey: this.levelKey,
        bestByLevel: this.bestByLevel,
      });

      this.scene.restart();
    });

    [panel, title, info, btn].forEach((o) => (o.scale = 0.95));
    this.tweens.add({
      targets: [panel, title, info, btn],
      scale: 1,
      duration: 140,
      ease: "Back.Out",
    });

    // (optionnel) garder une ref si tu veux les détruire
    this.endUI = [overlay, panel, title, info, btn];
  }

  isPerfectParryActive() {
    return this.parryActive && this.perfectParryTimer > 0;
  }

  showGameOver() {
    this.playerCtl.freeze();

    const overlay = this.add
      .rectangle(550, 250, 1100, 500, 0x000000, 0.55)
      .setScrollFactor(0);
    const panel = this.add
      .rectangle(550, 250, 520, 260, 0x0b1020, 0.9)
      .setScrollFactor(0);

    const title = this.add
      .text(550, 210, "Game Over", {
        fontFamily: "Arial",
        fontSize: "44px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const btn = this.add
      .text(550, 300, "Recommencer", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: "#a33a3a",
        padding: { left: 18, right: 18, top: 10, bottom: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerdown", () => this.scene.restart());

    this.endUI = [overlay, panel, title, btn];
  }

  hitStop(ms = 60, scale = 0.08) {
    const oldTime = this.time.timeScale;
    const oldPhys = this.physics.world.timeScale;

    this.time.timeScale = scale;
    this.physics.world.timeScale = scale;

    this.time.delayedCall(ms, () => {
      this.time.timeScale = oldTime;
      this.physics.world.timeScale = oldPhys;
    });
  }

  update(_, delta) {
    const camX = this.cameras.main.scrollX;
    this.parallax.update(camX);
    this.level.updateEnemies(this.playerSprite, delta);

    this.playerCtl.update(
      this.cursors,
      delta,
      this.finished,
      this.keyShield,
      this.keyAttack
    );

    // Look-ahead caméra (regarde devant le joueur)
    const vx = this.playerCtl.sprite.body.velocity.x;
    const dir = vx > 10 ? 1 : vx < -10 ? -1 : 0;
    const target = dir * this.lookAheadX;

    // interpolation douce vers la cible
    this.lookAheadCurrent +=
      (target - this.lookAheadCurrent) * this.lookAheadLerp;

    // applique le décalage
    this.cameras.main.setFollowOffset(-120, 0);
  }
}
