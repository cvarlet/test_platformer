import { updateEnemies as updateEnemiesImpl } from "./enemies/updateEnemies";
import { createEnemies as createEnemiesImpl } from "./enemies/enemyFactory";
import { addEnemyColliders as addEnemyCollidersImpl } from "./enemies/colliders";
import { createCoins as createCoinsImpl } from "./items/coins";
import { createFinish as createFinishImpl } from "./items/finish";
import { createDamageZones as createDamageZonesImpl } from "./hazards/damageZones";
import { createGround as createGroundImpl } from "./world/ground";
import { createPlatforms as createPlatformsImpl } from "./world/platforms";
import { addPlayerColliders as addPlayerCollidersImpl } from "./world/playerColliders";

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
    createGroundImpl(this);
  }

  createPlatforms() {
    createPlatformsImpl(this);
  }

  createCoins(onCollect) {
    return createCoinsImpl(this, onCollect);
  }

  createFinish(onFinish) {
    return createFinishImpl(this, onFinish);
  }

  addPlayerColliders(playerSprite) {
    addPlayerCollidersImpl(this, playerSprite);
  }

  addEnemyColliders() {
    addEnemyCollidersImpl(this);
  }

  createDamageZones(onDamage) {
    return createDamageZonesImpl(this, onDamage);
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
