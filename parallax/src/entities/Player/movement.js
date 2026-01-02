import Phaser from "phaser";

export function updateMovement(player, input, delta) {
  const accel = 1100;

  // ----------------------------
  // Déplacement horizontal + facing
  // ----------------------------
  if (input.left.isDown) {
    player.facingDir = -1;
    player.sprite.setAccelerationX(-accel);
    player.sprite.setFlipX(true);
  } else if (input.right.isDown) {
    player.facingDir = 1;
    player.sprite.setAccelerationX(accel);
    player.sprite.setFlipX(false);
  } else {
    player.sprite.setAccelerationX(0);
  }

  const onGroundNow = player.onGround;

  // ----------------------------
  // Coyote time
  // ----------------------------
  if (onGroundNow) player.coyoteTimer = player.coyoteTimeMs;
  else player.coyoteTimer = Math.max(0, player.coyoteTimer - delta);

  // ----------------------------
  // Jump
  // ----------------------------
  const canJump = onGroundNow || player.coyoteTimer > 0;
  if (Phaser.Input.Keyboard.JustDown(input.space) && canJump) {
    player.sprite.setVelocityY(player.jumpVelocity);
    player.coyoteTimer = 0;
  }

  // ----------------------------
  // Jump cut (relâcher SPACE)
  // ----------------------------
  if (
    Phaser.Input.Keyboard.JustUp(input.space) &&
    player.sprite.body.velocity.y < 0
  ) {
    player.sprite.setVelocityY(
      player.sprite.body.velocity.y * player.jumpCutMultiplier
    );
  }

  // ----------------------------
  // Landing dust
  // ----------------------------
  if (!player.wasOnGround && onGroundNow) player.spawnDust();
  player.wasOnGround = onGroundNow;

  // ----------------------------
  // Anim
  // ----------------------------
  if (!onGroundNow) {
    player.sprite.anims.stop();
    if (player.sprite.body.velocity.y < 0) player.sprite.setFrame(0);
    else player.sprite.setFrame(2);
  } else {
    const moving = Math.abs(player.sprite.body.velocity.x) > 10;
    if (moving) player.sprite.anims.play("walk", true);
    else {
      player.sprite.anims.stop();
      player.sprite.setFrame(1);
    }
  }
}
