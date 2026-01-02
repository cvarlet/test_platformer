import { updateEnemies as updateEnemiesImpl } from "./enemies/updateEnemies";
import { createEnemies as createEnemiesImpl } from "./enemies/enemyFactory";
import { addEnemyColliders as addEnemyCollidersImpl } from "./enemies/colliders";
import { createCoins as createCoinsImpl } from "./items/coins";

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
    return createCoinsImpl(this, onCollect);
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
    addEnemyCollidersImpl(this);
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
    return createEnemiesImpl(this);
  }

  getEnemyHitboxes() {
    return this.enemyHitboxes;
  }

  getEnemyProjectiles() {
    return this.enemyProjectiles;
  }

  updateEnemies(playerSprite, delta) {
    updateEnemiesImpl(this, playerSprite, delta);
  }
}
