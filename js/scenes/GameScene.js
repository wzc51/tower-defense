// 核心游戏场景
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    // 从主菜单传入的关卡编号（默认第1关）
    this.selectedLevel = data && data.level ? data.level : 1;
  }

  create() {
    // 清理可能残留的旧事件监听器（防止 restart 累积）
    this.events.off('enemyKilled');
    this.events.off('enemyReachedEnd');
    this.events.off('waveStart');
    this.events.off('allWavesComplete');

    // 当前关卡
    this.currentLevel = LEVELS[this.selectedLevel] || LEVELS[1];
    
    // 游戏状态
    this.gold = this.currentLevel.startingGold;
    this.lives = this.currentLevel.startingLives;
    this.selectedTowerType = null;
    this.gameOver = false;
    this.gameWon = false;
    this.isPaused = false;  // 暂停标志（由UIScene控制）
    
    // 绘制地图背景
    this.mapBg = this.add.image(0, 0, 'map_level1').setOrigin(0, 0);
    
    // ========== 动态效果 ==========
    this.createWaterEffect();
    this.createFireEffect();

    // 绘制塔位
    this.drawTowerSpots();

    // 实体组
    this.towers = this.add.group();
    this.enemies = [];
    
    // 开始波次管理器（进入第一波前的准备阶段）
    this.waveManager = new WaveManager(this);

    // 建造菜单状态
    this.activeBuildMenu = null;
    this.scene.launch('UIScene', { gameScene: this });

    // 集合点点击处理：选中石垒后，点地图空地(范围内)设置集合点
    this.input.on('pointerdown', this.handleGlobalPointerDown, this);
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', this.handleGlobalPointerDown, this);
    });

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

    // 延迟启动波次（先进入准备阶段）
    this.time.delayedCall(1500, () => {
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

  // ========== 绘制塔位 ==========
  drawTowerSpots() {
    this.towerSpotZones = [];
    
    this.currentLevel.towerSpots.forEach((spot, index) => {
      // 半透明光圈表示可建造位置
      const circle = this.add.circle(spot.x, spot.y, 28, 0xffff00, 0.15);
      circle.setStrokeStyle(1.5, 0xffff00, 0.4);
      circle.setInteractive({ useHandCursor: true });
      circle.setDepth(2);
      circle.setData('isSpot', true); // 供集合点点击处理识别塔位
      
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

    // 检查是否已有塔 → 弹出信息面板（升级/出售）
    const existing = this.getTowerAt(spot.x, spot.y);
    if (existing) {
      this.showTowerInfo(existing, spot, circle);
      return;
    }

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
    // 先关闭任何已打开的菜单
    this.closeBuildMenu();
    
    // 全屏透明背景（点击此处关闭菜单）
    const backdrop = this.add.rectangle(672, 585, 1344, 1170, 0x000000, 0.01)
      .setInteractive()
      .setDepth(98);
    
    // 菜单背景
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
      this.closeBuildMenu();
      this.handleSpotClick(spot, circle);
    });

    // 石垒按钮
    const btnStone = this.add.rectangle(spot.x + 60, spot.y - 60, 100, 50, 0x8B7355, 0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(101);
    const txtStone = this.add.text(spot.x + 60, spot.y - 60, `石垒\n${stoneCost}金`, { ...style, align: 'center', fontSize: '11px' }).setOrigin(0.5).setDepth(102);
    
    btnStone.on('pointerdown', () => {
      this.selectedTowerType = 'stone_wall';
      this.closeBuildMenu();
      this.handleSpotClick(spot, circle);
    });
    
    // 取消按钮
    const cancelBtn = this.add.rectangle(spot.x, spot.y - 60, 40, 20, 0x666666, 0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(101);
    const cancelTxt = this.add.text(spot.x, spot.y - 60, 'X', { ...style, fontSize: '12px' }).setOrigin(0.5).setDepth(102);
    
    cancelBtn.on('pointerdown', () => {
      this.closeBuildMenu();
    });
    
    // 点击背景关闭菜单
    backdrop.on('pointerdown', () => {
      this.closeBuildMenu();
    });
    
    // 存储当前菜单引用
    this.activeBuildMenu = { backdrop, menuBg, btnFire, txtFire, btnStone, txtStone, cancelBtn, cancelTxt };
  }

  closeBuildMenu() {
    if (!this.activeBuildMenu) return;
    const m = this.activeBuildMenu;
    if (m.backdrop && m.backdrop.active) m.backdrop.destroy();
    if (m.menuBg && m.menuBg.active) m.menuBg.destroy();
    if (m.btnFire && m.btnFire.active) m.btnFire.destroy();
    if (m.txtFire && m.txtFire.active) m.txtFire.destroy();
    if (m.btnStone && m.btnStone.active) m.btnStone.destroy();
    if (m.txtStone && m.txtStone.active) m.txtStone.destroy();
    if (m.cancelBtn && m.cancelBtn.active) m.cancelBtn.destroy();
    if (m.cancelTxt && m.cancelTxt.active) m.cancelTxt.destroy();
    this.activeBuildMenu = null;
  }

  // ========== 塔信息面板（升级 / 出售）==========
  showTowerInfo(tower, spot, circle) {
    this.closeBuildMenu();
    this.closeTowerInfo();

    const cfg = tower.towerConfig;
    const canUpgrade = tower.level < tower.maxLevel && this.gold >= tower.upgradeCost;
    const sellValue = Math.floor(tower.totalInvested * tower.sellRatio);

    // 全屏透明背景（点击关闭）
    const backdrop = this.add.rectangle(672, 585, 1344, 1170, 0x000000, 0.01)
      .setInteractive().setDepth(98);

    // 面板背景
    const panel = this.add.rectangle(spot.x, spot.y - 90, 300, 200, 0x1a1a2e, 0.92)
      .setStrokeStyle(2, 0xffcc00).setDepth(100);

    const titleStyle = { font: 'bold 16px sans-serif', fill: '#ffd700' };
    const style = { font: '14px sans-serif', fill: '#ffffff' };
    const dimStyle = { font: '13px sans-serif', fill: '#aaaaaa' };

    // 标题
    const txtName = this.add.text(spot.x, spot.y - 170, `${cfg.name}  Lv.${tower.level}/${tower.maxLevel}`, titleStyle)
      .setOrigin(0.5).setDepth(101);

    // 属性
    const txtDmg = this.add.text(spot.x, spot.y - 145, `伤害: ${tower.damage}`, style).setOrigin(0.5).setDepth(101);
    const txtRange = this.add.text(spot.x, spot.y - 125, `射程: ${tower.range}`, style).setOrigin(0.5).setDepth(101);
    const txtSpd = this.add.text(spot.x, spot.y - 105, `攻速: ${(1000 / tower.attackSpeed).toFixed(1)}/s`, style).setOrigin(0.5).setDepth(101);
    const txtInvested = this.add.text(spot.x, spot.y - 85, `已投入: ${tower.totalInvested}金`, dimStyle).setOrigin(0.5).setDepth(101);

    // 升级按钮
    const btnUp = this.add.rectangle(spot.x - 65, spot.y - 45, 110, 40,
      canUpgrade ? 0x448844 : 0x333333, canUpgrade ? 0.9 : 0.5)
      .setStrokeStyle(1, canUpgrade ? 0x66cc66 : 0x555555)
      .setInteractive({ useHandCursor: canUpgrade }).setDepth(101);

    const txtUp = this.add.text(spot.x - 65, spot.y - 45,
      canUpgrade ? `升级\n${tower.upgradeCost}金` : `已满级`,
      { ...style, fontSize: '12px', fill: canUpgrade ? '#ffffff' : '#666666', align: 'center' }
    ).setOrigin(0.5).setDepth(102);

    btnUp.on('pointerdown', () => {
      this.upgradeTower(tower);
      this.closeTowerInfo();
    });

    // 出售按钮
    const btnSell = this.add.rectangle(spot.x + 65, spot.y - 45, 110, 40, 0x884422, 0.8)
      .setStrokeStyle(1, 0xcc7733).setInteractive({ useHandCursor: true }).setDepth(101);

    const txtSell = this.add.text(spot.x + 65, spot.y - 45, `出售\n+${sellValue}金`,
      { ...style, fontSize: '12px', align: 'center' }
    ).setOrigin(0.5).setDepth(102);

    btnSell.on('pointerdown', () => {
      this.sellTower(tower, spot, circle);
      this.closeTowerInfo();
    });

    // 关闭按钮
    const btnClose = this.add.rectangle(spot.x, spot.y + 10, 50, 24, 0x444444, 0.8)
      .setInteractive({ useHandCursor: true }).setDepth(101);
    const txtClose = this.add.text(spot.x, spot.y + 10, '关闭', { ...style, fontSize: '12px' })
      .setOrigin(0.5).setDepth(102);

    btnClose.on('pointerdown', () => this.closeTowerInfo());

    backdrop.on('pointerdown', () => this.closeTowerInfo());

    // 同时显示攻击范围圈
    tower.rangePinned = true;
    tower.showRange(true);

    this.activeTowerInfo = {
      backdrop, panel, txtName, txtDmg, txtRange, txtSpd, txtInvested,
      btnUp, txtUp, btnSell, txtSell, btnClose, txtClose
    };
  }

  closeTowerInfo() {
    if (!this.activeTowerInfo) return;
    const m = this.activeTowerInfo;
    Object.values(m).forEach(obj => {
      if (obj && obj.active) obj.destroy();
    });
    this.activeTowerInfo = null;

    // 取消所有塔的固定范围圈
    this.towers.getChildren().forEach(t => {
      t.rangePinned = false;
      t.hideRange();
    });
  }

  upgradeTower(tower) {
    if (tower.level >= tower.maxLevel) return;
    if (this.gold < tower.upgradeCost) return;
    if (!tower.upgrade()) return; // upgrade() 内部处理等级上限

    this.gold -= tower.upgradeCost;
    // 升级成功视觉反馈
    if (tower.towerSprite) {
      tower.towerSprite.setTint(0x88ff88);
      this.time.delayedCall(200, () => {
        if (tower.towerSprite && tower.towerSprite.active) tower.towerSprite.clearTint();
      });
    }
  }

  sellTower(tower, spot, circle) {
    const refund = Math.floor(tower.totalInvested * tower.sellRatio);
    this.gold += refund;

    // 移除塔
    this.towers.remove(tower, true); // 从组中移除并销毁

    // 恢复塔位标记
    circle.setFillStyle(0xffff00, 0.15);
    circle.setStrokeStyle(1.5, 0xffff00, 0.4);
    circle.setInteractive({ useHandCursor: true });
  }

  buildTower(x, y, config, circle) {
    // 建造完成，扣除金币并创建塔
    // 取消其他塔的范围圈固定显示（避免多个范围圈重叠）
    this.towers.getChildren().forEach(t => {
      if (t.rangePinned) { t.rangePinned = false; if (t.hideRange) t.hideRange(); }
    });
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
    
    // 每次造完清空选择，下次点击其他塔位重新弹出菜单
    this.selectedTowerType = null;
    
    // 金币扣除
    this.gold -= config.cost;
  }

  getTowerAt(x, y) {
    return this.towers.getChildren().find(t =>
      Phaser.Math.Distance.Between(t.x, t.y, x, y) < 25
    );
  }

  // ========== 集合点点击处理 ==========
  // 当某个石垒被选中(pinned)时，点击地图空地(在集合点范围内)即可设置集合点
  handleGlobalPointerDown(pointer, currentlyOver) {
    if (this.gameOver || this.gameWon) return;
    // 点在了塔/塔位/菜单等可交互对象上 → 交给它们处理，不设置集合点
    if (currentlyOver && currentlyOver.length > 0) return;

    const selected = this.towers.getChildren().find(t =>
      t.towerConfig && t.towerConfig.id === 'stone_wall' && t.rangePinned
    );
    if (!selected) return;

    const wx = pointer.worldX, wy = pointer.worldY;
    if (Phaser.Math.Distance.Between(selected.x, selected.y, wx, wy) <= selected.rallyRange) {
      selected.setRallyPoint(wx, wy);
    }
  }

  // ========== 游戏结束 ==========
  handleGameOver() {
    if (this.gameOver || this.gameWon) return; // 胜负互斥，避免竞态
    this.gameOver = true;
    const overlay = this.add.rectangle(672, 585, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setDepth(200);
    const text = this.add.text(672, 500, '防守失败', {
      font: 'bold 40px sans-serif', fill: '#ff4444'
    }).setOrigin(0.5).setDepth(201);

    const retryBtn = this.add.text(672, 570, '🔄 重新挑战', {
      font: '18px sans-serif', fill: '#ffffff',
      backgroundColor: '#442222', padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
    retryBtn.on('pointerdown', () => {
      this.scene.restart();
      this.scene.stop('UIScene');
    });

    const menuBtn = this.add.text(672, 620, '返回主菜单', {
      font: '16px sans-serif', fill: '#aaaaaa'
    }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => {
      this.scene.stop('UIScene');
      this.scene.start('MenuScene');
    });
  }

  checkWin() {
    this.time.delayedCall(1000, () => {
      if (this.gameOver) return; // 已失败则不再判胜
      if (this.waveManager.isAllComplete() && this.lives > 0) {
        this.gameWon = true;
        const overlay = this.add.rectangle(672, 585, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setDepth(200);
        const text = this.add.text(672, 480, '🎉 胜利！', {
          font: 'bold 40px sans-serif', fill: '#44ff44'
        }).setOrigin(0.5).setDepth(201);

        // 判断是否有下一关
        const nextLevel = this.selectedLevel + 1;
        const hasNextLevel = LEVELS[nextLevel] !== undefined;

        if (hasNextLevel) {
          const subtext = this.add.text(672, 550, `第 ${this.selectedLevel} 关通关！`, {
            font: '20px sans-serif', fill: '#ffffff'
          }).setOrigin(0.5).setDepth(201);

          const nextBtn = this.add.text(672, 620, '▶ 进入下一关 ▶', {
            font: 'bold 22px sans-serif', fill: '#ffcc00',
            backgroundColor: '#334422', padding: { x: 16, y: 10 }
          }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });

          nextBtn.on('pointerover', () => nextBtn.setFill('#ffee55'));
          nextBtn.on('pointerout', () => nextBtn.setFill('#ffcc00'));
          nextBtn.on('pointerdown', () => {
            this.scene.stop('UIScene');
            this.scene.restart({ level: nextLevel });
          });

          const menuBtn = this.add.text(672, 680, '返回主菜单', {
            font: '16px sans-serif', fill: '#aaaaaa'
          }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
          menuBtn.on('pointerdown', () => {
            this.scene.stop('UIScene');
            this.scene.start('MenuScene');
          });
        } else {
          // 全部通关
          const subtext = this.add.text(672, 540, '恭喜通关全部关卡！', {
            font: '22px sans-serif', fill: '#ffd700'
          }).setOrigin(0.5).setDepth(201);

          const menuBtn = this.add.text(672, 610, '返回主菜单', {
            font: '18px sans-serif', fill: '#ffffff',
            backgroundColor: '#333355', padding: { x: 12, y: 8 }
          }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
          menuBtn.on('pointerdown', () => {
            this.scene.stop('UIScene');
            this.scene.start('MenuScene');
          });
        }
      }
    });
  }

  // ========== 更新循环 ==========
  update(time, delta) {
    if (this.gameOver || this.gameWon || this.isPaused) return;
    
    // 更新敌人
    this.enemies.forEach(enemy => {
      if (enemy.active) {
        enemy.update(delta);
      }
    });
    
    // 清理死亡敌人
    this.enemies = this.enemies.filter(e => !e.dead);

    // 更新塔（石垒需要delta驱动石头人状态机）
    this.towers.getChildren().forEach(tower => {
      if (tower.active) {
        tower.update(time, this.enemies, delta);
      }
    });
    
    // 更新波次
    if (this.waveManager) {
      this.waveManager.update();
    }
  }
}
