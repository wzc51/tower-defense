// 游戏入口
// ============ 全局错误捕获（显示在屏幕上，避免静默黑屏）============
window.addEventListener('error', (e) => {
  const msg = `[ERROR] ${e.message}\n${e.filename}:${e.lineno}`;
  console.error(msg);
  let box = document.getElementById('error-overlay');
  if (!box) {
    box = document.createElement('div');
    box.id = 'error-overlay';
    box.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff4444;color:#fff;font:13px monospace;padding:10px;z-index:99999;white-space:pre-wrap;max-height:50vh;overflow:auto;';
    document.body.appendChild(box);
  }
  box.textContent += msg + '\n';
});

const GAME_WIDTH = 1344;
const GAME_HEIGHT = 1170;

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [BootScene, MenuScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);
