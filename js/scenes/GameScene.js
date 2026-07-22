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
    this.golems = [];  // 石垒召唤的小石头人
    
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
    // 水域1：右上角蓝色河流 (x:1000-1250, y:0-350)
    const riverZones = [
      { x: 1080, y: 60,  w: 60, h: 40 },
      { x: 1120, y: 170, w: 50, h: 35 },
      { x: 1180, y: 260, w: 50, h: 40 },
      { x: 1120, y: 360, w: 40, h: 30 },
    ];
    
    riverZones.forEach(zone => {
      for (let i = 0; i < 4; i++) {
        const ripple = this.add.ellipse(
          zone.x + Phaser.Math.Between(-15, 15),
          zone.y + Phaser.Math.Between(-8, 8),
          Phaser.Math.Between(18, 35),
          Phaser.Math.Between(4, 12),
          0x3388cc,
          0.18
        );
        this.tweens.add({
          targets: ripple,
          alpha: 0.04,
          scaleX: 1.6,
          scaleY: 1.6,
          duration: Phaser.Math.Between(1800, 3200),
          yoyo: true,
          repeat: -1,
          delay: Phaser.Math.Between(0, 2000)
        });
      }
    });

    // 水域2：右中水潭 (x:930-1170, y:330-520)
    for (let i = 0; i < 6; i++) {
      const ripple = this.add.ellipse(
        1050 + Phaser.Math.Between(-60, 60),
        420 + Phaser.Math.Between(-40, 40),
        Phaser.Math.Between(25, 50),
        Phaser.Math.Between(6, 16),
        0x4499cc,
        0.15
      );
      this.tweens.add({
        targets: ripple,
        alpha: 0.04,
        scaleX: 1.8,
        scaleY: 1.8,
        duration: Phaser.Math.Between(2200, 3800),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2500)
      });
    }
  }

  // ========== 火焰燃烧效果 ==========
  createFireEffect() {
    // 左下角火堆 (170, 710)，范围 x:120-230, y:650-770
    const fireSpots = [
      { x: 170, y: 710 },
    ];
    
    fireSpots.forEach(spot => {
      for (let i = 0; i < 6; i++) {
        const flame = this.add.ellipse(
          spot.x + Phaser.Math.Between(-10, 10),
          spot.y + Phaser.Math.Between(-5, 2),
          Phaser.Math.Between(6, 16),
          Phaser.Math.Between(10, 24),
          0xff6600,
          0.55
        );
        
        const flameTop = this.add.ellipse(
          spot.x + Phaser.Math.Between(-6, 6),
          spot.y - Phaser.Math.Between(6, 12),
          Phaser.Math.Between(4, 10),
          Phaser.Math.Between(6, 14),
          0xffaa00,
          0.45
        );
        
        const flickerSpeed = Phaser.Math.Between(300, 600);
        
        this.tweens.add({
          targets: [flame, flameTop],
          scaleX: 0.5,
          scaleY: 0.3,
          alpha: 0.15,
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
    
    // 读取塔价格
    const fireCost = TOWER_CONFIG.ember_spirit.cost;
    const stoneCost = TOWER_CONFIG.stone_wall.cost;

    // 灰烬之灵按钮
    const btnFire = this.add.rectangle(spot.x - 60, spot.y - 60, 100, 50, 0xff6600, 0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(101);
    const txtFire = this.add.text(spot.x - 60, spot.y - 60, `灰烬之灵\n${fireCost}金`, { ...style, align: 'center', fontSize: '11px' }).setOrigin(0.5).setDepth(102);

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
    const txtStone = this.add.text(spot.x + 60, spot.y - 60, `石垒\n${stoneCost}金`, { ...style, align: 'center', fontSize: '11px' }).setOrigin(0.5).setDepth(102);
    
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
    
    // 点击其他地方关闭菜单（延迟防止同一点击事件误关）
    this.time.delayedCall(100, () => {
      this.input.once('pointerdown', () => {
        if (menuBg.active) {
          menuBg.destroy(); btnFire.destroy(); txtFire.destroy();
          btnStone.destroy(); txtStone.destroy();
          cancelBtn.destroy(); cancelTxt.destroy();
        }
      });
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

    // 清理死亡小石头人
    if (this.golems) {
      this.golems = this.golems.filter(g => g.active);
    }
    
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
