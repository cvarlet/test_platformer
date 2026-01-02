import Phaser from "phaser";
import { updateCombat } from "./Player/combat";
import { updateMovement } from "./Player/movement";
import { applyDamage as applyDamageImpl } from "./Player/health";

export default class Player {
  constructor(scene) {
    this.scene = scene;

    // feel
    this.coyoteTimeMs = 120;
    this.coyoteTimer = 0;
    this.jumpVelocity = -650;
    this.jumpCutMultiplier = 0.45;
    this.wasOnGround = false;

    this.sprite = null;

    this.maxHp = 6; // 6 = 3 cœurs (demi-cœurs)
    this.hp = this.maxHp;

    this.invincible = false;
    this.invincibleMs = 700;

    this.hitStunMs = 180;
    this.hitStunTimer = 0;

    this.knockbackX = 260;
    this.knockbackY = 220;

    this.shieldHeld = false;
    this.parryActive = false;
    this.parryTimer = 0;
    this.parryWindowMs = 160;
    this.perfectParryMs = 90; // fenêtre parfaite (ms)
    this.perfectParryTimer = 0; // timer interne
    this.shieldCooldownMs = 250;
    this.shieldCooldown = 0;
    this.shieldFx = null;

    this.facingDir = 1; // 1 = droite, -1 = gauche

    // ----------------------------
    // Attaque épée (mêlée)
    // ----------------------------
    this.attackActive = false;
    this.attackTimer = 0;
    this.attackActiveMs = 90; // durée où la hitbox touche
    this.attackCooldownMs = 280; // délai entre attaques
    this.attackCooldown = 0;

    this.attackId = 0; // id de swing pour éviter multi-hit

    this.swordHitbox = null; // hitbox physique
    this.swordFx = null; // visuel simple
  }

  create(x, y) {
    // anim walk (si pas déjà créée)
    if (!this.scene.anims.exists("walk")) {
      this.scene.anims.create({
        key: "walk",
        frames: this.scene.anims.generateFrameNumbers("player", {
          start: 0,
          end: 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    const p = this.scene.physics.add.sprite(x, y, "player", 1);
    p.setCollideWorldBounds(true);
    p.setDragX(1400);
    p.setMaxVelocity(260, 2000);

    // Effet bouclier (rectangle simple)
    this.shieldFx = this.scene.add.rectangle(p.x, p.y, 34, 34, 0x7ad7ff, 0.25);
    this.shieldFx.setVisible(false);

    this.sprite = p;

    // --- hitbox épée (ZONE invisible) ---
    this.swordHitbox = this.scene.add.zone(p.x, p.y, 42, 26);
    this.scene.physics.add.existing(this.swordHitbox);

    const hb = this.swordHitbox.body;
    hb.setAllowGravity(false);
    hb.setImmovable(true);
    hb.moves = false; // on la téléporte à la main
    hb.enable = false; // désactivée par défaut

    // --- debug visuel (facultatif) ---
    this.swordDebug = this.scene.add.rectangle(
      p.x,
      p.y,
      42,
      26,
      0x00ffff,
      0.15
    );
    this.swordDebug.setDepth(999);
    this.swordDebug.setVisible(false);

    this.scene.physics.add.existing(this.swordHitbox, false);

    this.swordHitbox.body.setAllowGravity(false);
    this.swordHitbox.body.immovable = true;
    this.swordHitbox.body.enable = false;

    // (optionnel) visuel "slash" simple (rectangle cyan transparent)
    this.swordFx = this.scene.add.rectangle(p.x, p.y, 46, 30, 0x7ad7ff, 0.0);
    this.swordFx.setDepth(999);

    return p;
  }

  get onGround() {
    const b = this.sprite.body;
    return b.blocked.down || b.touching.down;
  }

  spawnDust() {
    const puff = this.scene.add.circle(
      this.sprite.x,
      this.sprite.y + 28,
      10,
      0xffffff,
      0.55
    );
    puff.setDepth(999);
    this.scene.tweens.add({
      targets: puff,
      alpha: 0,
      scale: 2.2,
      duration: 160,
      onComplete: () => puff.destroy(),
    });
  }

  update(input, delta, finished, keyShield, keyAttack) {
    if (finished) return;

    if (this.hitStunTimer > 0) {
      this.hitStunTimer = Math.max(0, this.hitStunTimer - delta);
      return;
    }

    // ----------------------------
    // combat
    // ----------------------------
    updateCombat(this, delta, keyShield, keyAttack);

    // ----------------------------
    // Movement
    // ----------------------------
    updateMovement(this, input, delta);
  }

  freeze() {
    this.sprite.setAccelerationX(0);
    this.sprite.setVelocity(0, 0);
    this.sprite.anims.stop();
    this.sprite.setFrame(1);
  }

  applyDamage(sourceX, amount = 1) {
    return applyDamageImpl(this, sourceX, amount);
  }

  isShieldHeld() {
    return this.shieldHeld;
  }

  isParryActive() {
    return this.parryActive;
  }

  isPerfectParryActive() {
    return this.parryActive && this.perfectParryTimer > 0;
  }

  getFacingDir() {
    return this.facingDir;
  }

  getSwordHitbox() {
    return this.swordHitbox;
  }

  getAttackId() {
    return this.attackId;
  }
}
