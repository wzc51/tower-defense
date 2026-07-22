// HUD场景 - 显示金币、生命值、波次信息
class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  init(data) {
    this.gameScene = data.gameScene;
  }

  create() {
    // 顶部HUD背景
    this.hudBg = this.add.rectangle(672, 20, 1344, 50, 0x1a1a2e, 0.85)
      .setDepth(300)
      .setOrigin(0.5, 0);
    
    // 金币显示
    this.goldIcon = this.add.circle(50, 35, 10, 0xffd700).setDepth(301);
    this.goldText = this.add.text(70, 25, '200', {
      font: '18px sans-serif', fill: '#ffd700', fontStyle: 'bold'
    }).setDepth(301);
    
    // 生命值显示
    this.livesIcon = this.add.circle(200, 35, 10, 0xff4444).setDepth(301);
    this.livesText = this.add.text(220, 25, '20', {
      font: '18px sans-serif', fill: '#ff4444', fontStyle: 'bold'
    }).setDepth(301);
    
    // 波次显示
    this.waveText = this.add.text(600, 25, '准备中...', {
      font: '16px sans-serif', fill: '#ffffff'
    }).setDepth(301).setOrigin(0.5, 0);
    
    // 当前选中塔类型
    this.selectedText = this.add.text(1150, 25, '', {
      font: '14px sans-serif', fill: '#ffcc00'
    }).setDepth(301).setOrigin(0.5, 0);
    
    // "取消选择" 按钮
    this.cancelBtn = this.add.text(1280, 25, '[取消]', {
      font: '13px sans-serif', fill: '#888888'
    }).setDepth(301).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    
    this.cancelBtn.on('pointerdown', () => {
      this.gameScene.selectedTowerType = null;
    });
    
    // 监听波次事件
    this.gameScene.events.on('waveStart', (current, total) => {
      this.waveText.setText(`第 ${current}/${total} 波`);
      this.waveText.setFill('#ffcc00');
      
      // 闪烁效果
      this.tweens.add({
        targets: this.waveText,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 200,
        yoyo: true
      });
    });
    
    this.gameScene.events.on('allWavesComplete', () => {
      this.waveText.setText('全部波次完成！');
      this.waveText.setFill('#44ff44');
    });
  }

  update() {
    if (!this.gameScene) return;
    
    // 实时更新金币和生命值
    this.goldText.setText(this.gameScene.gold.toString());
    this.livesText.setText(this.gameScene.lives.toString());
    
    // 低血量警告
    if (this.gameScene.lives <= 5) {
      this.livesText.setFill('#ff0000');
    }
    
    // 显示当前选中的塔
    const towerType = this.gameScene.selectedTowerType;
    if (towerType) {
      const config = TOWER_CONFIG[towerType];
      this.selectedText.setText(`已选: ${config.name} (${config.cost}金)`);
      this.cancelBtn.setVisible(true);
    } else {
      this.selectedText.setText('');
      this.cancelBtn.setVisible(false);
    }
  }
}
