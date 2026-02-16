import Phaser from 'phaser'
import { AVATARS } from '../characters/avatarConfig'

/**
 * Cree les animations (idle, run, sit) pour tous les avatars du registre.
 * Chaque avatar utilise le meme layout de spritesheet (52 frames, 32x48).
 */
export const createCharacterAnims = (anims: Phaser.Animations.AnimationManager) => {
  const animsFrameRate = 15

  for (const avatar of AVATARS) {
    const name = avatar.name

    // --- Idle (6 frames par direction, boucle infinie, vitesse reduite) ---
    anims.create({
      key: `${name}_idle_right`,
      frames: anims.generateFrameNames(name, { start: 0, end: 5 }),
      repeat: -1,
      frameRate: animsFrameRate * 0.6,
    })
    anims.create({
      key: `${name}_idle_up`,
      frames: anims.generateFrameNames(name, { start: 6, end: 11 }),
      repeat: -1,
      frameRate: animsFrameRate * 0.6,
    })
    anims.create({
      key: `${name}_idle_left`,
      frames: anims.generateFrameNames(name, { start: 12, end: 17 }),
      repeat: -1,
      frameRate: animsFrameRate * 0.6,
    })
    anims.create({
      key: `${name}_idle_down`,
      frames: anims.generateFrameNames(name, { start: 18, end: 23 }),
      repeat: -1,
      frameRate: animsFrameRate * 0.6,
    })

    // --- Run (6 frames par direction, boucle infinie) ---
    anims.create({
      key: `${name}_run_right`,
      frames: anims.generateFrameNames(name, { start: 24, end: 29 }),
      repeat: -1,
      frameRate: animsFrameRate,
    })
    anims.create({
      key: `${name}_run_up`,
      frames: anims.generateFrameNames(name, { start: 30, end: 35 }),
      repeat: -1,
      frameRate: animsFrameRate,
    })
    anims.create({
      key: `${name}_run_left`,
      frames: anims.generateFrameNames(name, { start: 36, end: 41 }),
      repeat: -1,
      frameRate: animsFrameRate,
    })
    anims.create({
      key: `${name}_run_down`,
      frames: anims.generateFrameNames(name, { start: 42, end: 47 }),
      repeat: -1,
      frameRate: animsFrameRate,
    })

    // --- Sit (1 frame par direction) ---
    anims.create({
      key: `${name}_sit_down`,
      frames: anims.generateFrameNames(name, { start: 48, end: 48 }),
      repeat: 0,
      frameRate: animsFrameRate,
    })
    anims.create({
      key: `${name}_sit_left`,
      frames: anims.generateFrameNames(name, { start: 49, end: 49 }),
      repeat: 0,
      frameRate: animsFrameRate,
    })
    anims.create({
      key: `${name}_sit_right`,
      frames: anims.generateFrameNames(name, { start: 50, end: 50 }),
      repeat: 0,
      frameRate: animsFrameRate,
    })
    anims.create({
      key: `${name}_sit_up`,
      frames: anims.generateFrameNames(name, { start: 51, end: 51 }),
      repeat: 0,
      frameRate: animsFrameRate,
    })
  }
}
