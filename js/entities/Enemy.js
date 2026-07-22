// 敌人类
class Enemy {
  constructor(scene, x, y, config) {
    this.scene = scene;
    
    this.enemyConfig = config;
    this.maxHP = config.hp;
    this.hp = config.hp;
    this.speed = config.speed;
    this.reward = config.reward;
    this.damage = config.damage;
    this.color = config.color;
    this.size = config.size;
    
    this.pathIndex = 0;
    this.path = null;
    this.reachedEnd = false;
    this.dead = false;
    this.active = true;
    
    // 绘制敌人身体
    this.body_gfx = scene.add.graphics();
    this.refreshGraphics();
    
    // 血条背景
    this.hpBarBg = scene.add.graphics();
    this.hpBarBg.setDepth(10);
    
    // 血条
    this.hpBar = scene.add.graphics();
    this.hpBar.setDepth(11);
    
    // 位置
    this.x = x;
    this.y = y;
    
    this.updateGraphicsPosition();
  }

  refreshGraphics() {
    this.body_gfx.clear();
    this.body_gfx.fillStyle(this.color, 1);
    this.body_gfx.fillCircle(this.x, this.y, this.size);
  }

  updateGraphicsPosition() {
    this.body_gfx.setPosition(0, 0);
    this.body_gfx.clear();
    this.body_gfx.fillStyle(this.color, 1);
    this.body_gfx.fillCircle(this.x, this.y, this.size);
    
    this.hpBarBg.clear();
    this.hpBarBg.fillStyle(0x333333, 0.8);
    this.hpBarBg.fillRect(this.x - this.size, this.y - this.size - 10, this.size * 2, 4);
    
    this.updateHPBar();
  }

  updateHPBar() {
    if (this.dead) return;
    this.hpBar.clear();
    const ratio = this.hp / this.maxHP;
    const barColor = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444;
    this.hpBar.fillStyle(barColor, 1);
    this.hpBar.fillRect(this.x - this.size, this.y - this.size - 10, this.size * 2 * ratio, 4);
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
    
    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.active = false;
    
    // 金币奖励
    if (this.scene && this.scene.events) {
      this.scene.events.emit('enemyKilled', this.reward);
    }
    
    // 清理图形
    this.scene.tweens.add({
      targets: [this.body_gfx, this.hpBarBg, this.hpBar],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.body_gfx.destroy();
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
      targets: [this.body_gfx, this.hpBarBg, this.hpBar],
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.body_gfx.destroy();
        this.hpBarBg.destroy();
        this.hpBar.destroy();
      }
    });
  }

  destroy() {
    if (this.body_gfx && this.body_gfx.active) this.body_gfx.destroy();
    if (this.hpBarBg && this.hpBarBg.active) this.hpBarBg.destroy();
    if (this.hpBar && this.hpBar.active) this.hpBar.destroy();
    this.active = false;
    this.dead = true;
  }

  moveAlongPath(delta) {
    if (!this.path || this.dead || this.reachedEnd) return;
    
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
    }
    
    this.updateGraphicsPosition();
  }

  update(delta) {
    if (this.active && !this.dead && !this.reachedEnd) {
      this.moveAlongPath(delta);
    }
  }
}
