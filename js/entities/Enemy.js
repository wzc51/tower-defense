// 敌人类
class Enemy {
  constructor(scene, x, y, config) {
    this.scene = scene;
    this.enemyConfig = config;
    this.maxHP = config.hp;
    this.hp = config.hp;
    this.speed = config.speed;
    this.baseSpeed = config.speed;
    this.reward = config.reward;
    this.damage = config.damage;
    this.color = config.color;
    this.size = config.size;
    this.pathIndex = 0;
    this.path = null;
    this.reachedEnd = false;
    this.dead = false;
    this.active = true;
    this.blockedBy = null;
    this.facing = 'right'; // 当前朝向
    this.walkTimer = 0;    // 行走动画计时器
    this.bobOffset = 0;    // 上下弹跳偏移

    // 使用精灵表素材
    this.sprite = scene.add.sprite(x, y, 'enemy_mage');
    this.sprite.setScale(0.35);
    this.sprite.setDepth(5);

    // 血条背景
    this.hpBarBg = scene.add.graphics();
    this.hpBarBg.setDepth(10);
    this.hpBar = scene.add.graphics();
    this.hpBar.setDepth(11);

    this.x = x;
    this.y = y;
    this.updateGraphicsPosition();
  }

  updateGraphicsPosition() {
    this.sprite.setPosition(this.x, this.y + this.bobOffset);
    this.hpBarBg.clear();
    this.hpBarBg.fillStyle(0x333333, 0.8);
    const barW = this.size * 2.5;
    this.hpBarBg.fillRect(this.x - barW/2, this.y - this.size - 22, barW, 5);
    this.updateHPBar();
  }

  updateHPBar() {
    if (this.dead) return;
    this.hpBar.clear();
    const ratio = Math.max(0, this.hp / this.maxHP);
    const barColor = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444;
    const barW = this.size * 2.5 * ratio;
    const totalW = this.size * 2.5;
    this.hpBar.fillStyle(barColor, 1);
    this.hpBar.fillRect(this.x - totalW/2, this.y - this.size - 22, barW, 5);
  }

  setPath(pathPoints) {
    this.path = pathPoints;
    this.pathIndex = 1;
    this.x = pathPoints[0].x;
    this.y = pathPoints[0].y;
    this.updateGraphicsPosition();
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    this.updateHPBar();
    // 受击闪烁
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite && this.sprite.active) this.sprite.clearTint();
    });
    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.active = false;
    if (this.scene && this.scene.events) {
      this.scene.events.emit('enemyKilled', this.reward);
    }
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 300,
      onComplete: () => {
        this.sprite.destroy();
        this.hpBarBg.destroy();
        this.hpBar.destroy();
      }
    });
  }

  reachEnd() {
    if (this.reachedEnd || this.dead) return;
    this.reachedEnd = true;
    this.active = false;
    if (this.scene && this.scene.events) {
      this.scene.events.emit('enemyReachedEnd', this.damage);
    }
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.sprite.destroy();
        this.hpBarBg.destroy();
        this.hpBar.destroy();
      }
    });
  }

  destroy() {
    if (this.sprite && this.sprite.active) this.sprite.destroy();
    if (this.hpBarBg && this.hpBarBg.active) this.hpBarBg.destroy();
    if (this.hpBar && this.hpBar.active) this.hpBar.destroy();
    this.active = false;
    this.dead = true;
  }

  checkBlockedByGolem() {
    if (!this.scene.golems || this.scene.golems.length === 0) {
      this.blockedBy = null;
      return false;
    }
    for (const golem of this.scene.golems) {
      if (!golem.active) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, golem.x, golem.y);
      if (dist < 25) {
        this.blockedBy = golem;
        return true;
      }
    }
    this.blockedBy = null;
    return false;
  }

  // 根据移动方向更新朝向和帧
  updateFacing(dx, dy) {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy) {
      // 水平移动
      if (dx > 0) {
        this.facing = 'right';
        this.sprite.setFrame(2);
        this.sprite.setFlipX(false);
      } else {
        this.facing = 'left';
        this.sprite.setFrame(0);
        this.sprite.setFlipX(false);
      }
    } else {
      // 垂直移动
      if (dy > 0) {
        this.facing = 'down';
        this.sprite.setFrame(1);
      } else {
        this.facing = 'up';
        this.sprite.setFrame(3);
      }
    }
  }

  moveAlongPath(delta) {
    if (!this.path || this.dead || this.reachedEnd) return;

    if (this.checkBlockedByGolem()) {
      return;
    }

    const target = this.path[this.pathIndex];
    if (!target) return;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 3) {
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) {
        this.reachEnd();
        return;
      }
    } else {
      const moveAmount = this.speed * delta / 1000;
      this.x += (dx / dist) * moveAmount;
      this.y += (dy / dist) * moveAmount;

      // 更新朝向
      this.updateFacing(dx, dy);

      // 行走弹跳效果（模拟迈步）
      this.walkTimer += delta;
      this.bobOffset = Math.sin(this.walkTimer * 0.012) * 3;
    }
    this.updateGraphicsPosition();
  }

  update(delta) {
    if (this.active && !this.dead && !this.reachedEnd) {
      this.moveAlongPath(delta);
    }
  }
}
