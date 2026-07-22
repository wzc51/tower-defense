// 游戏入口
const GAME_WIDTH = 1344;
const GAME_HEIGHT = 1170;

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [BootScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);
