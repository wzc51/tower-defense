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
    
    // 波次显示 + 准备阶段控制
    this.waveText = this.add.text(600, 25, '准备中...', {
      font: '16px sans-serif', fill: '#ffffff'
    }).setDepth(301).setOrigin(0.5, 0);

    // 准备阶段：立即开始按钮
    this.waveStartBtn = this.add.text(760, 25, '', {
      font: '13px sans-serif', fill: '#44ff44', fontStyle: 'bold',
      backgroundColor: '#1a3a1a', padding: { x: 8, y: 4 }
    }).setDepth(301).setOrigin(0.5, 0).setInteractive({ useHandCursor: true }).setVisible(false);

    this.waveStartBtn.on('pointerdown', () => {
      if (this.gameScene.waveManager && this.gameScene.waveManager.preparePhase) {
        this.gameScene.waveManager.forceStartNextWave();
      }
    });
    
    // 当前选中塔类型
    this.selectedText = this.add.text(1150, 25, '', {
      font: '14px sans-serif', fill: '#ffcc00'
    }).setDepth(301).setOrigin(0.5, 0);
    
    // 暂停按钮（右上角）
    this.pauseBtn = this.add.text(1300, 25, '⏸', {
      font: '18px sans-serif', fill: '#ffffff',
      backgroundColor: '#333355', padding: { x: 8, y: 2 }
    }).setDepth(301).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

    this.pauseBtn.on('pointerdown', () => {
      this.togglePause();
    });

    // ESC 键切换暂停
    this.input.keyboard.on('keydown-ESC', () => {
      this.togglePause();
    });
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
      this.waveStartBtn.setVisible(false);
    });

    // 准备阶段事件
    this.gameScene.events.on('prepareStart', (data) => {
      this.waveText.setText(`第 ${data.wave}/${data.total} 波 - 准备中`);
      this.waveText.setFill('#ffcc66');
      this.waveStartBtn.setVisible(true);
      this.waveStartBtn.setText(`立即开始 (+${Math.floor(data.duration / 1000 * 2)}金)`);
    });

    // 提前召唤奖励提示
    this.gameScene.events.on('earlySummon', (bonus) => {
      // 短暂显示奖励文字
      const bonusTxt = this.add.text(760, 50, `+${bonus}金!`, {
        font: 'bold 14px sans-serif', fill: '#44ff44'
      }).setDepth(302).setOrigin(0.5, 0);

      this.tweens.add({
        targets: bonusTxt,
        y: 35,
        alpha: 0,
        duration: 1200,
        onComplete: () => { if (bonusTxt.active) bonusTxt.destroy(); }
      });
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

    // 准备阶段倒计时
    const wm = this.gameScene.waveManager;
    if (wm && wm.preparePhase) {
      const remainSec = (wm.getPrepareRemaining() / 1000).toFixed(1);
      this.waveText.setText(`第 ${wm.currentWaveIndex + 1}/${wm.totalWaves} 波 - ${remainSec}s`);
      // 更新奖励显示
      const bonus = Math.floor(wm.getPrepareRemaining() / 1000 * wm.earlyBonusRate);
      this.waveStartBtn.setText(`立即开始 (+${bonus}金)`);
    } else {
      this.waveStartBtn.setVisible(false);
    }
  }

  // ========== 暂停功能 ==========
  togglePause() {
    const gs = this.gameScene;
    if (!gs) return;

    if (gs.isPaused) {
      // 恢复
      gs.isPaused = false;
      this.game.scene.resume('GameScene');
      if (this.pauseOverlay && this.pauseOverlay.active) {
        this.pauseOverlay.destroy();
        this.pauseOverlay = null;
      }
      this.pauseBtn.setText('⏸');
    } else {
      // 暂停
      gs.isPaused = true;
      this.game.scene.pause('GameScene');
      this.showPauseOverlay();
      this.pauseBtn.setText('▶');
    }
  }

  showPauseOverlay() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    this.pauseOverlay = this.add.container(0, 0).setDepth(500);

    // 半透明遮罩
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55);
    this.pauseOverlay.add(bg);

    // 暂停文字
    const txt = this.add.text(W / 2, H / 2 - 30, '⏸ 游戏已暂停', {
      font: 'bold 36px sans-serif', fill: '#ffffff'
    }).setOrigin(0.5);
    this.pauseOverlay.add(txt);

    // 提示文字
    const hint = this.add.text(W / 2, H / 2 + 20, '点击任意位置或按 ESC 继续', {
      font: '16px sans-serif', fill: '#aaaaaa'
    }).setOrigin(0.5);
    this.pauseOverlay.add(hint);

    // 点击遮罩恢复
    bg.setInteractive();
    bg.on('pointerdown', () => this.togglePause());
  }
}
