// 塔类
class Tower extends Phaser.GameObjects.Container {
  constructor(scene, x, y, config) {
    super(scene, x, y);
    scene.add.existing(this);

    this.towerConfig = config;
    this.level = 1;
    this.range = config.range;
    this.damage = config.damage;
    this.attackSpeed = config.attackSpeed;
    this.hitsPerAttack = config.hitsPerAttack || 1;
    this.bulletSpeed = config.bulletSpeed;
    this.color = config.color;

    this.lastAttackTime = 0;
    this.isAttacking = false;
    this.golems = []; // 石垒召唤的小石头人

    // 塔本体：使用 PNG 素材
    this.towerSprite = scene.add.sprite(0, 0, config.imageKey);
    this.towerSprite.setScale(0.16);
    this.add(this.towerSprite);

    // 攻击范围圈
    this.rangeCircle = scene.add.graphics();
    this.rangeCircle.lineStyle(1.5, this.color, 0.2);
    this.rangeCircle.strokeCircle(0, 0, this.range);
    this.rangeCircle.setVisible(false);
    this.add(this.rangeCircle);

    // 可交互
    this.setSize(48, 48);
    this.setInteractive();
    this.on('pointerover', () => this.rangeCircle.setVisible(true));
    this.on('pointerout', () => this.rangeCircle.setVisible(false));

    // 如果是石垒，立即召唤3个小石头人
    if (config.id === 'stone_wall') {
      this.scene.time.delayedCall(500, () => this.spawnGolems());
    }
  }

  upgrade() {
    this.level++;
    this.damage = Math.floor(this.damage * 1.5);
    this.range = Math.floor(this.range * 1.1);
    this.attackSpeed = Math.floor(this.attackSpeed * 0.85);

    this.towerSprite.setScale(0.18);

    this.rangeCircle.clear();
    this.rangeCircle.lineStyle(1.5, this.color, 0.2);
    this.rangeCircle.strokeCircle(0, 0, this.range);
  }

  findTarget(enemies) {
    return enemies.find(e => {
      if (!e || !e.active || e.dead || e.reachedEnd) return false;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      return dist <= this.range;
    });
  }

  // ========== 灰烬之灵：无影拳式连击 ==========
  attackEmberSpirit(enemies) {
    if (this.isAttacking) return;

    const targets = enemies.filter(e => {
      if (!e || !e.active || e.dead || e.reachedEnd) return false;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      return dist <= this.range;
    });

    if (targets.length === 0) return;

    this.isAttacking = true;

    // 无影拳：依次攻击范围内所有敌人
    const hitsToPerform = Math.min(targets.length, this.hitsPerAttack);
    const shuffled = Phaser.Utils.Array.Shuffle([...targets]).slice(0, hitsToPerform);

    let delay = 0;
    shuffled.forEach((target) => {
      this.scene.time.delayedCall(delay, () => {
        if (!this.active || !target || !target.active) return;

        // 残影闪到敌人位置
        const ghostGfx = this.scene.add.graphics();
        ghostGfx.fillStyle(this.color, 0.4);
        ghostGfx.fillCircle(target.x, target.y, 10);

        // 伤害
        target.takeDamage(this.damage);

        // 闪回动画
        this.scene.tweens.add({
          targets: ghostGfx,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: 300,
          onComplete: () => ghostGfx.destroy()
        });

        // 连线效果
        const lineGfx = this.scene.add.graphics();
        lineGfx.lineStyle(2, this.color, 0.5);
        lineGfx.lineBetween(this.x, this.y, target.x, target.y);
        this.scene.tweens.add({
          targets: lineGfx,
          alpha: 0,
          duration: 200,
          onComplete: () => lineGfx.destroy()
        });
      });

      delay += 120; // 每次连击间隔120ms
    });

    this.scene.time.delayedCall(delay, () => {
      this.isAttacking = false;
    });
  }

  // ========== 石垒：召唤3个小石头人 ==========
  spawnGolems() {
    const pathPoints = this.scene.currentLevel.path;

    // 找到塔附近最近的路径段
    let closestIdx = 0;
    let closestDist = Infinity;
    pathPoints.forEach((p, i) => {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    });

    // 在路径上生成3个小石头人，分散站位
    const offsets = [-1, 0, 1]; // 相对路径索引偏移
    offsets.forEach((offset, idx) => {
      const pathIdx = Math.max(0, Math.min(pathPoints.length - 1, closestIdx + offset));
      const pos = pathPoints[pathIdx];

      // 稍微错开位置，不要完全重叠
      const jitterX = (idx - 1) * 15;
      const jitterY = (idx - 1) * 8;

      const golem = this.createGolem(pos.x + jitterX, pos.y + jitterY);
      this.golems.push(golem);

      // 注册到场景全局管理
      if (!this.scene.golems) this.scene.golems = [];
      this.scene.golems.push(golem);
    });
  }

  createGolem(x, y) {
    const golem = {
      x: x,
      y: y,
      hp: 80,
      maxHp: 80,
      active: true,
      sprite: this.scene.add.sprite(x, y, 'stone_golem'),
      hpBar: this.scene.add.graphics(),
      hpBarBg: this.scene.add.graphics()
    };

    golem.sprite.setScale(0.22);
    golem.sprite.setDepth(4);

    // 血条
    this.updateGolemHPBar(golem);

    // 出现动画
    golem.sprite.setScale(0);
    this.scene.tweens.add({
      targets: golem.sprite,
      scaleX: 0.22,
      scaleY: 0.22,
      duration: 400,
      ease: 'Back.easeOut'
    });

    return golem;
  }

  updateGolemHPBar(golem) {
    if (!golem.active) return;
    golem.hpBarBg.clear();
    golem.hpBarBg.fillStyle(0x333333, 0.8);
    golem.hpBarBg.fillRect(golem.x - 15, golem.y - 25, 30, 4);

    golem.hpBar.clear();
    const ratio = Math.max(0, golem.hp / golem.maxHp);
    const barColor = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444;
    golem.hpBar.fillStyle(barColor, 1);
    golem.hpBar.fillRect(golem.x - 15, golem.y - 25, 30 * ratio, 4);
  }

  damageGolem(golem, amount) {
    if (!golem.active) return;
    golem.hp -= amount;
    this.updateGolemHPBar(golem);

    // 受击闪烁
    golem.sprite.setTint(0xff4444);
    this.scene.time.delayedCall(100, () => {
      if (golem.sprite && golem.sprite.active) golem.sprite.clearTint();
    });

    if (golem.hp <= 0) {
      this.destroyGolem(golem);
    }
  }

  destroyGolem(golem) {
    if (!golem.active) return;
    golem.active = false;

    this.scene.tweens.add({
      targets: golem.sprite,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 300,
      onComplete: () => {
        golem.sprite.destroy();
        golem.hpBar.destroy();
        golem.hpBarBg.destroy();
      }
    });

    // 从数组移除
    this.golems = this.golems.filter(g => g !== golem);
    if (this.scene.golems) {
      this.scene.golems = this.scene.golems.filter(g => g !== golem);
    }
  }

  // 石垒的攻击：敌人撞击石头人时扣血（由 Enemy 调用）
  attackStoneWall(enemies) {
    // 检查每个存活的石头人是否被敌人攻击
    this.golems.forEach(golem => {
      if (!golem.active) return;
      enemies.forEach(enemy => {
        if (!enemy.active || enemy.dead) return;
        const dist = Phaser.Math.Distance.Between(golem.x, golem.y, enemy.x, enemy.y);
        if (dist < 22) {
          // 敌人攻击石头人
          this.damageGolem(golem, 2); // 每次碰撞扣2血
        }
      });
    });
  }

  update(time, enemies) {
    if (time - this.lastAttackTime < this.attackSpeed) return;

    const hasTarget = this.findTarget(enemies);
    if (!hasTarget && this.towerConfig.id !== 'stone_wall') return;

    this.lastAttackTime = time;

    if (this.towerConfig.id === 'ember_spirit') {
      this.attackEmberSpirit(enemies);
    } else if (this.towerConfig.id === 'stone_wall') {
      this.attackStoneWall(enemies);
    }
  }
}
