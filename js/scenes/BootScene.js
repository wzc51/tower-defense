// 启动场景 - 预加载资源
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 加载地图背景
    this.load.image('map_level1', 'assets/images/map/level1.jpg');
    
    // 显示加载进度
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x333333, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);
    
    const loadingText = this.add.text(width / 2, height / 2 - 40, '加载中...', {
      font: '18px sans-serif',
      fill: '#ffffff'
    }).setOrigin(0.5);
    
    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xff6600, 1);
      progressBar.fillRect(width / 2 - 155, height / 2 - 10, 310 * value, 20);
    });
    
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  create() {
    // 生成弹道纹理（4x4 白色圆形）
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(2, 2, 2);
    gfx.generateTexture('bullet', 4, 4);
    gfx.destroy();
    
    this.scene.start('GameScene');
  }
}
