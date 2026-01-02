export function createHud(scene) {
  const scoreText = scene.add
    .text(20, 20, "Score: 0", {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#ffffff",
    })
    .setScrollFactor(0);

  const bestText = scene.add
    .text(20, 76, "Best: 0", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#ffffff",
    })
    .setScrollFactor(0);

  const hintText = scene.add
    .text(20, 48, "← → bouger | SPACE sauter", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#ffffff",
    })
    .setScrollFactor(0);

  return { scoreText, bestText, hintText };
}

export function setBestText(scene, value) {
  if (scene.bestText?.setText) scene.bestText.setText(`Best: ${value}`);
}

export function setScoreText(scene, value) {
  if (scene.scoreText?.setText) scene.scoreText.setText(`Score: ${value}`);
}

export function renderHearts(scene, playerCtl) {
  // détruit l’ancien HUD si présent
  if (scene.heartsUI) scene.heartsUI.forEach((h) => h.destroy());
  scene.heartsUI = [];

  const hearts = Math.ceil(playerCtl.maxHp / 2);
  const hp = playerCtl.hp;

  const x0 = 20;
  const y0 = 20;
  const gap = 26;

  for (let i = 0; i < hearts; i++) {
    const heartHp = hp - i * 2; // 2,1,0...
    const key =
      heartHp >= 2 ? "heartFull" : heartHp === 1 ? "heartHalf" : "heartEmpty";

    const img = scene.add
      .image(x0 + i * gap, y0, key)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    scene.heartsUI.push(img);
  }
}
