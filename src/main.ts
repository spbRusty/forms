import AudioSystem from './systems/AudioSystem.js';

// Совместимый слой на время постепенного разделения сцен.
(window as Window & { AudioSystem: typeof AudioSystem }).AudioSystem = AudioSystem;

if (!(window as Window & { Phaser?: unknown }).Phaser) {
  throw new Error('Phaser не загружен. Проверьте public/phaser.min.js');
}

void import('./game.js');
