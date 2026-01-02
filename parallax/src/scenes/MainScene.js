import Phaser from "phaser";
import Parallax from "../systems/Parallax";
import Player from "../entities/Player";
import Level from "../level/Level";
import { loadProgress, saveProgress, clearProgress } from "./main/progress";
import { createHud, renderHearts, setScoreText, setBestText } from "./main/ui";
import { initCamera, updateCameraLookAhead } from "./main/camera";
import { setupOverlaps } from "./main/overlaps";
import { initInput } from "./main/input";

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

    this.levelKey = "level2";
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
    this.playerSprite = playerSprite;

    // Colliders solides d'abord (sol/plateformes)
    this.level.addPlayerColliders(playerSprite);

    // Enemies
    this.level.createEnemies();
    this.level.addEnemyColliders();

    // Projectiles du joueur
    this.playerProjectiles = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    // Input (avant setupOverlaps)
    initInput(this);

    // UI (avant renderHearts)
    const hud = createHud(this);
    this.scoreText = hud.scoreText;
    this.bestText = hud.bestText;

    const best = this.bestByLevel[this.levelKey] ?? 0;
    setBestText(this, best);

    // HP + Hearts
    this.playerCtl.hp = this.playerCtl.maxHp;
    renderHearts(this, this.playerCtl);

    // petite fonction utilitaire pour overlaps.js (best score)
    this.saveProgress = () => {
      saveProgress({
        lastLevelKey: this.levelKey,
        bestByLevel: this.bestByLevel,
      });
    };

    // Tous les overlaps au même endroit
    setupOverlaps(this, playerSprite);

    // Caméra
    initCamera(this, playerSprite, worldW, worldH);
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
      this.keyAttack,
      this.keyShoot
    );

    updateCameraLookAhead(this, this.playerCtl);
  }
}
