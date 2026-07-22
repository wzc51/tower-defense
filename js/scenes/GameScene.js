// 核心游戏场景
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // 当前关卡
    this.currentLevel = LEVELS[1];
    
    // 游戏状态
    this.gold = this.currentLevel.startingGold;
    this.lives = this.currentLevel.startingLives;
    this.selectedTowerType = null;
    this.gameOver = false;
    this.gameWon = false;
    
    // 绘制地图背景
    this.mapBg = this.add.image(0, 0, 'map_level1').setOrigin(0, 0);
    
    // ========== 动态效果 ==========
    this.createWaterEffect();
    this.createFireEffect();
    
    // 绘制路径（调试用，可以关掉）
    this.drawPath();
    
    // 绘制塔位
    this.drawTowerSpots();
    
    // 实体组
    this.towers = this.add.group();
    this.enemies = [];
    this.projectiles = this.add.group();
    
    // 波次管理器
    this.waveManager = new WaveManager(this);
    
    // 启动HUD场景
    this.scene.launch('UIScene', { gameScene: this });
    
    // 事件监听
    this.events.on('enemyKilled', (reward) => {
      this.gold += reward;
    });
    
    this.events.on('enemyReachedEnd', (damage) => {
      this.lives -= damage;
      if (this.lives <= 0) {
        this.lives = 0;
        this.handleGameOver();
      }
    });
    
    this.events.on('waveStart', (current, total) => {
      // 由UI处理
    });
    
    this.events.on('allWavesComplete', () => {
      this.checkWin();
    });
    
    // 开始第一波
    this.time.delayedCall(2000, () => {
      this.waveManager.start(this.currentLevel.waves);
    });
  }

  // ========== 水流动效果 ==========
  createWaterEffect() {
    // 在水域位置（地图中部的蓝色水域）叠加流动效果
    // 多个水域波纹点
    const waterZones = [
      { x: 960, y: 460, w: 120, h: 80 },
      { x: 960, y: 600, w: 120, h: 80 },
      { x: 840, y: 560, w: 80, h: 50 }
    ];
    
    waterZones.forEach(zone => {
      for (let i = 0; i < 3; i++) {
        const ripple = this.add.ellipse(
          zone.x + Phaser.Math.Between(-20, 20),
          zone.y + Phaser.Math.Between(-10, 10),
          Phaser.Math.Between(20, 40),
          Phaser.Math.Between(5, 15),
          0x4488ff,
          0.15
        );
        
        this.tweens.add({
          targets: ripple,
          alpha: 0.05,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: Phaser.Math.Between(2000, 3500),
          yoyo: true,
          repeat: -1,
          delay: Phaser.Math.Between(0, 2000)
        });
      }
    });
  }

  // ========== 火焰燃烧效果 ==========
  createFireEffect() {
    // 在地图中篝火/火把位置叠加火焰粒子效果
    const fireSpots = [
      { x: 1090, y: 280 }, // 火把/篝火位置1
      { x: 1160, y: 280 }, // 火把/篝火位置2
      { x: 1090, y: 720 }, // 火把/篝火位置3
      { x: 1160, y: 720 }, // 火把/篝火位置4
    ];
    
    fireSpots.forEach(spot => {
      for (let i = 0; i < 4; i++) {
        const flame = this.add.ellipse(
          spot.x + Phaser.Math.Between(-5, 5),
          spot.y - 5,
          Phaser.Math.Between(6, 14),
          Phaser.Math.Between(10, 20),
          0xff6600,
          0.5
        );
        
        const flickerSpeed = Phaser.Math.Between(300, 700);
        
        this.tweens.add({
          targets: flame,
          scaleX: 0.6,
          scaleY: 0.3,
          alpha: 0.2,
          duration: flickerSpeed,
          yoyo: true,
          repeat: -1,
          delay: Phaser.Math.Between(0, flickerSpeed)
        });
      }
    });
  }

  // ========== 绘制路径 ==========
  drawPath() {
    const path = this.currentLevel.path;
    const g = this.add.graphics();
    g.lineStyle(3, 0xff0000, 0.15);
    g.beginPath();
    g.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      g.lineTo(path[i].x, path[i].y);
    }
    g.strokePath();
  }

  // ========== 绘制塔位 ==========
  drawTowerSpots() {
    this.towerSpotZones = [];
    
    this.currentLevel.towerSpots.forEach((spot, index) => {
      // 半透明光圈表示可建造位置
      const circle = this.add.circle(spot.x, spot.y, 28, 0xffff00, 0.15);
      circle.setStrokeStyle(1.5, 0xffff00, 0.4);
      circle.setInteractive({ useHandCursor: true });
      
      // 悬停高亮
      circle.on('pointerover', () => {
        if (!this.getTowerAt(spot.x, spot.y)) {
          circle.setFillStyle(0xffff00, 0.4);
        }
      });
      circle.on('pointerout', () => {
        if (!this.getTowerAt(spot.x, spot.y)) {
          circle.setFillStyle(0xffff00, 0.15);
        }
      });
      
      // 点击建造
      circle.on('pointerdown', () => {
        this.handleSpotClick(spot, circle);
      });
      
      this.towerSpotZones.push({ spot, circle });
    });
  }

  handleSpotClick(spot, circle) {
    if (this.gameOver || this.gameWon) return;
    
    // 检查是否已有塔
    if (this.getTowerAt(spot.x, spot.y)) return;
    
    // 检查是否选择了塔类型
    if (!this.selectedTowerType) {
      this.showBuildMenu(spot, circle);
      return;
    }
    
    const config = TOWER_CONFIG[this.selectedTowerType];
    if (this.gold >= config.cost) {
      this.buildTower(spot.x, spot.y, config, circle);
    }
  }

  showBuildMenu(spot, circle) {
    // 弹出建造菜单
    const menuBg = this.add.rectangle(spot.x, spot.y - 60, 280, 70, 0x1a1a2e, 0.9)
      .setStrokeStyle(1, 0xffcc00)
      .setDepth(100);
    
    const style = { font: '14px sans-serif', fill: '#ffffff' };
    
    // 灰烬之灵按钮
    const btnFire = this.add.rectangle(spot.x - 60, spot.y - 60, 100, 50, 0xff6600, 0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(101);
    const txtFire = this.add.text(spot.x - 60, spot.y - 60, '灰烬之灵\n100金', { ...style, align: 'center', fontSize: '11px' }).setOrigin(0.5).setDepth(102);
    
    btnFire.on('pointerdown', () => {
      this.selectedTowerType = 'ember_spirit';
      menuBg.destroy(); btnFire.destroy(); txtFire.destroy();
      btnStone.destroy(); txtStone.destroy();
      cancelBtn.destroy(); cancelTxt.destroy();
      this.handleSpotClick(spot, circle);
    });
    
    // 石垒按钮
    const btnStone = this.add.rectangle(spot.x + 60, spot.y - 60, 100, 50, 0x8B7355, 0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(101);
    const txtStone = this.add.text(spot.x + 60, spot.y - 60, '石垒\n80金', { ...style, align: 'center', fontSize: '11px' }).setOrigin(0.5).setDepth(102);
    
    btnStone.on('pointerdown', () => {
      this.selectedTowerType = 'stone_wall';
      menuBg.destroy(); btnFire.destroy(); txtFire.destroy();
      btnStone.destroy(); txtStone.destroy();
      cancelBtn.destroy(); cancelTxt.destroy();
      this.handleSpotClick(spot, circle);
    });
    
    // 取消按钮
    const cancelBtn = this.add.rectangle(spot.x, spot.y - 60, 40, 20, 0x666666, 0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(101);
    const cancelTxt = this.add.text(spot.x, spot.y - 60, 'X', { ...style, fontSize: '12px' }).setOrigin(0.5).setDepth(102);
    
    cancelBtn.on('pointerdown', () => {
      menuBg.destroy(); btnFire.destroy(); txtFire.destroy();
      btnStone.destroy(); txtStone.destroy();
      cancelBtn.destroy(); cancelTxt.destroy();
    });
    
    // 点击其他地方关闭菜单
    this.input.once('pointerdown', () => {
      if (menuBg.active) {
        menuBg.destroy(); btnFire.destroy(); txtFire.destroy();
        btnStone.destroy(); txtStone.destroy();
        cancelBtn.destroy(); cancelTxt.destroy();
      }
    });
  }

  buildTower(x, y, config, circle) {
    // 建造完成，扣除金币并创建塔
    const tower = new Tower(this, x, y, config);
    this.towers.add(tower);
    
    // 建造动画
    tower.setScale(0);
    this.tweens.add({
      targets: tower,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
    
    // 隐藏塔位标记
    circle.setFillStyle(0xffff00, 0.05);
    circle.setStrokeStyle(1, 0xffff00, 0.1);
    circle.disableInteractive();
    
    // 更新所选塔类型（继续建造同类型）
    // this.selectedTowerType = null; // 取消注释则每次造完需要重新选择
    
    // 金币扣除
    this.gold -= config.cost;
  }

  getTowerAt(x, y) {
    return this.towers.getChildren().find(t => 
      Phaser.Math.Distance.Between(t.x, t.y, x, y) < 25
    );
  }

  // ========== 游戏结束 ==========
  handleGameOver() {
    this.gameOver = true;
    const overlay = this.add.rectangle(672, 585, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setDepth(200);
    const text = this.add.text(672, 500, '防守失败', {
      font: '40px sans-serif', fill: '#ff4444'
    }).setOrigin(0.5).setDepth(201);
    const subtext = this.add.text(672, 560, '点击重新开始', {
      font: '18px sans-serif', fill: '#ffffff'
    }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
    
    subtext.on('pointerdown', () => {
      this.scene.restart();
      this.scene.stop('UIScene');
    });
  }

  checkWin() {
    this.time.delayedCall(1000, () => {
      if (this.waveManager.isAllComplete() && this.lives > 0) {
        this.gameWon = true;
        const overlay = this.add.rectangle(672, 585, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setDepth(200);
        const text = this.add.text(672, 500, '胜利！', {
          font: '40px sans-serif', fill: '#44ff44'
        }).setOrigin(0.5).setDepth(201);
        const subtext = this.add.text(672, 560, '点击重新开始', {
          font: '18px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
        
        subtext.on('pointerdown', () => {
          this.scene.restart();
          this.scene.stop('UIScene');
        });
      }
    });
  }

  // ========== 更新循环 ==========
  update(time, delta) {
    if (this.gameOver || this.gameWon) return;
    
    // 更新敌人
    this.enemies.forEach(enemy => {
      if (enemy.active) {
        enemy.update(delta);
      }
    });
    
    // 清理死亡敌人
    this.enemies = this.enemies.filter(e => !e.dead);
    
    // 更新塔
    this.towers.getChildren().forEach(tower => {
      if (tower.active) {
        tower.update(time, this.enemies);
      }
    });
    
    // 更新波次
    if (this.waveManager) {
      this.waveManager.update();
    }
  }
}
