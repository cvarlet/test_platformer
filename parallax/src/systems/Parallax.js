export default class Parallax {
  constructor(scene) {
    this.scene = scene;
    this.sky = null;
    this.mountains = null;
    this.cloudsFG = null;
  }

  create() {
    // Collés à l'écran (scrollFactor = 0)
    this.sky = this.scene.add
      .tileSprite(0, 0, 1100, 500, "sky")
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.mountains = this.scene.add
      .tileSprite(0, 180, 1100, 260, "mountains")
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.cloudsFG = this.scene.add
      .tileSprite(0, 40, 1100, 220, "cloudsFG")
      .setOrigin(0, 0)
      .setScrollFactor(0);
  }

  update(camX) {
    this.sky.tilePositionX = camX * 0.2;
    this.mountains.tilePositionX = camX * 0.45;
    this.cloudsFG.tilePositionX = camX * 0.75;
  }
}
