import "./style.css";
import Phaser from "phaser";
import MainScene from "./scenes/MainScene";

new Phaser.Game({
  type: Phaser.AUTO,
  width: 1100,
  height: 500,
  backgroundColor: "#000000",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 900 },
      debug: true,
    },
  },
  scene: MainScene,
});
