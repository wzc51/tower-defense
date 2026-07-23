// 启动场景 - 预加载资源
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 加载地图背景
    this.load.image('map_level1', 'assets/images/map/level1.jpg');

    // 加载主菜单背景
    this.load.image('menu_bg', 'assets/images/map/menu_bg.jpg');

    // 加载塔素材
    this.load.image('tower_ember_spirit', 'assets/images/towers/ember_spirit.png');
    this.load.image('tower_stone_wall', 'assets/images/towers/stone_wall.png');

    // 灰烬之灵：仅角色纹理（去平台底座，用于残影闪现）
    this.load.image('ember_char', 'assets/images/towers/ember_char.png');

    // 加载敌人精灵表（4帧：左/正/右/背）
    this.load.spritesheet('enemy_mage', 'assets/images/enemies/enemy_spritesheet.png', {
      frameWidth: 249,
      frameHeight: 278
    });

    // ========== 小石头人素材 ==========
    // 待机帧（默认显示）
    this.load.image('golem_idle', 'assets/images/enemies/golem_frame_1_idle.png');
    // 攻击动画4帧（作为 spritesheet 加载，或单独加载）
    this.load.image('golem_charge', 'assets/images/enemies/golem_frame_2_charge.png');
    this.load.image('golem_slam', 'assets/images/enemies/golem_frame_3_slam.png');
    this.load.image('golem_recover', 'assets/images/enemies/golem_frame_4_recover.png');

    // 旧版兼容（保留）
    this.load.image('stone_golem', 'assets/images/enemies/stone_golem.png');
    this.load.image('golem_ref', 'assets/images/enemies/golem_reference.jpg');

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
    // 生成弹道纹理（4x4 白色圆形）— 保留给未来子弹类使用
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(2, 2, 2);
    gfx.generateTexture('bullet', 4, 4);
    gfx.destroy();

    // ========== 火流星特效纹理 ==========
    // 火焰核心（渐变圆，用于火柱/火球主体）
    const flameGfx = this.add.graphics();
    flameGfx.fillStyle(0xff4400, 0.6);
    flameGfx.fillEllipse(0, 0, 24, 40);
    flameGfx.fillStyle(0xff8800, 0.8);
    flameGfx.fillEllipse(0, 0, 16, 30);
    flameGfx.fillStyle(0xffdd44, 1);
    flameGfx.fillEllipse(0, 0, 8, 18);
    flameGfx.generateTexture('flame_core', 24, 40);
    flameGfx.destroy();

    // 火星粒子（小圆点）
    const sparkGfx = this.add.graphics();
    sparkGfx.fillStyle(0xffaa00, 1);
    sparkGfx.fillCircle(3, 3, 3);
    sparkGfx.generateTexture('spark', 6, 6);
    sparkGfx.destroy();

    // 命中爆炸星芒
    const burstGfx = this.add.graphics();
    burstGfx.fillStyle(0xff2200, 0.9);
    burstGfx.beginPath();
    for (let i = 0; i < 16; i++) {
      const r = i % 2 === 0 ? 18 : 7;
      const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * r + 18;
      const y = Math.sin(angle) * r + 18;
      if (i === 0) burstGfx.moveTo(x, y); else burstGfx.lineTo(x, y);
    }
    burstGfx.closePath();
    burstGfx.fillPath();
    burstGfx.generateTexture('burst_star', 36, 36);
    burstGfx.destroy();

    // ========== 石头人攻击动画 ==========
    // 使用4帧纹理创建动画（通过手动切换纹理实现，因为每帧是独立PNG）
    // 动画切换在 Tower.js 的状态机里根据 state 切换 sprite texture
    // 这里只做标记，不创建 Phaser anim（因为帧是独立图片非spritesheet）

    // 创建敌人行走动画（上下弹跳感）
    this.anims.create({
      key: 'mage_walk',
      frames: [
        { key: 'enemy_mage', frame: 0 },
        { key: 'enemy_mage', frame: 2 },
        { key: 'enemy_mage', frame: 0 },
        { key: 'enemy_mage', frame: 2 }
      ],
      frameRate: 6,
      repeat: -1
    });

    this.scene.start('MenuScene');
  }
}
