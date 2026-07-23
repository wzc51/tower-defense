// 主菜单场景 - 标题 / 关卡选择 / 玩法说明
class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    // ========== 背景 ==========
    if (this.textures.exists('menu_bg')) {
      this.bg = this.add.image(W / 2, H / 2, 'menu_bg')
        .setDisplaySize(W, H).setDepth(0);
    } else {
      // 兜底：深蓝紫渐变
      this.bg = this.add.graphics().setDepth(0);
      this.bg.fillGradientStyle(0x1a1a3e, 0x1a1a3e, 0x0d0d1a, 0x0d0d1a, 1);
      this.bg.fillRect(0, 0, W, H);
    }

    // 暗化遮罩（让背景不抢文字）
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.45).setDepth(1);

    // ========== 标题 ==========
    const title = this.add.text(W / 2, 160, '五行封妖录', {
      font: 'bold 56px "Microsoft YaHei", "SimHei", sans-serif',
      fill: '#ffd700',
      stroke: '#aa4400',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(10);

    // 标题呼吸动画
    this.tweens.add({
      targets: title,
      alpha: 0.85,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 副标题
    this.add.text(W / 2, 230, '—— 塔防守卫妖山 ——', {
      font: '18px sans-serif', fill: '#cc9966'
    }).setOrigin(0.5).setDepth(10);

    // ========== 关卡选择 ==========
    this.add.text(W / 2, 340, '选择关卡', {
      font: 'bold 24px sans-serif', fill: '#ffffff'
    }).setOrigin(0.5).setDepth(10);

    // 关卡按钮容器
    const levelBtns = [];
    const maxLevel = Object.keys(LEVELS).length;

    for (let i = 1; i <= Math.max(maxLevel, 2); i++) {
      const unlocked = i <= maxLevel;
      const bx = W / 2 + (i - 1.5) * 160;

      const btnBg = this.add.rectangle(bx, 420, 130, 70,
        unlocked ? 0x2a2a4e : 0x222233,
        unlocked ? 0.9 : 0.6
      ).setStrokeStyle(unlocked ? 2 : 1, unlocked ? 0xffcc00 : 0x555555)
        .setInteractive({ useHandCursor: true })
        .setDepth(11);

      const btnText = this.add.text(bx, 420,
        unlocked ? `第 ${i} 关\n${LEVELS[i].name || ''}` : `???`,
        { font: '16px sans-serif', fill: unlocked ? '#ffffff' : '#666666', align: 'center' }
      ).setOrigin(0.5).setDepth(12);

      if (unlocked) {
        btnBg.on('pointerover', () => {
          btnBg.setFillStyle(0x3a3a6e, 0.95);
          btnText.setScale(1.05);
        });
        btnBg.on('pointerout', () => {
          btnBg.setFillStyle(0x2a2a4e, 0.9);
          btnText.setScale(1);
        });
        btnBg.on('pointerdown', () => {
          this.startGame(i);
        });
      }

      levelBtns.push({ bg: btnBg, text: btnText });
    }

    // ========== 玩法说明 ==========
    const instructions = [
      '【玩法说明】',
      '',
      '· 点击黄色塔位建造防御塔：灰烬之灵（远程火攻）/ 石垒（召唤石人拦截）',
      '· 点击已建塔可查看属性、升级或出售',
      '· 敌���沿道路前进，漏过扣生命，生命归零则防守失败',
      '· 每波之间有准备时间，可点「立即开始」提前召唤拿金币奖励',
      '· 击杀敌人获得金币，用来建造和升级防御塔',
      '· 守住全部波次即可通关！'
    ];

    const infoBox = this.add.rectangle(W / 2, 650, 900, 220, 0x111122, 0.75)
      .setStrokeStyle(1, 0x555577).setDepth(10);

    instructions.forEach((line, idx) => {
      this.add.text(W / 2, 555 + idx * 26, line, {
        font: '14px "Microsoft YaHei", sans-serif',
        fill: idx === 0 ? '#ffcc66' : '#ccccdd'
      }).setOrigin(0.5).setDepth(11);
    });

    // ========== 底部提示 ==========
    this.add.text(W / 2, H - 40, '按 ESC 暂停游戏  |  点击关卡开始', {
      font: '13px sans-serif', fill: '#888899'
    }).setOrigin(0.5).setDepth(10);
  }

  startGame(levelNum) {
    // 切换到游戏场景，传入关卡编号
    this.scene.start('GameScene', { level: levelNum });
  }
}
