// src/scenes/main/camera.js

export function initCamera(scene, playerSprite, worldW, worldH) {
  scene.cameras.main.setBounds(0, 0, worldW, worldH);
  scene.cameras.main.startFollow(playerSprite, true, 0.15, 0.15);

  // Zone "morte" : le joueur peut bouger dans une zone avant que la caméra suive
  scene.cameras.main.setDeadzone(0, worldH);

  // Offset de base (ton réglage actuel)
  scene.cameras.main.setFollowOffset(-120, 0);

  // Valeurs look-ahead (si pas déjà présentes)
  scene.lookAheadX ??= 45;
  scene.lookAheadLerp ??= 0.008;
  scene.lookAheadCurrent ??= 0;
}

export function updateCameraLookAhead(scene, playerCtl) {
  if (!scene?.cameras?.main || !playerCtl?.sprite?.body) return;

  //   const vx = playerCtl.sprite.body.velocity.x;
  //   const dir = vx > 10 ? 1 : vx < -10 ? -1 : 0;
  //   const target = dir * scene.lookAheadX;

  //   scene.lookAheadCurrent +=
  //     (target - scene.lookAheadCurrent) * scene.lookAheadLerp;

  //   scene.cameras.main.setFollowOffset(-120 + scene.lookAheadCurrent, 0);
  scene.cameras.main.setFollowOffset(-120, 0);
}
