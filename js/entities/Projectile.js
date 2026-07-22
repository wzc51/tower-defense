// 弹道类
class Projectile {
  constructor(scene) {
    this.scene = scene;
    this.damage = 0;
    this.target = null;
    this.active = false;
    this.color = 0xffffff;
    this.x = -100;
    this.y = -100;
    this.speed = 300;
    this.gfx = null;
  }

  fire(fromX, fromY, target, damage, speed, color) {
    this.x = fromX;
    this.y = fromY;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.color = color;
    this.active = true;
    
    // 绘制弹道
    if (this.gfx) this.gfx.destroy();
    this.gfx = this.scene.add.graphics();
    this.gfx.fillStyle(this.color, 1);
    this.gfx.fillCircle(this.x, this.y, 4);
  }

  update(delta) {
    if (!this.active || !this.target || this.target.dead) {
      this.deactivate();
      return;
    }
    
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 15) {
      this.target.takeDamage(this.damage);
      this.deactivate();
      return;
    }
    
    const moveAmount = this.speed * delta / 1000;
    this.x += (dx / dist) * moveAmount;
    this.y += (dy / dist) * moveAmount;
    
    // 重绘弹道
    if (this.gfx) {
      this.gfx.clear();
      this.gfx.fillStyle(this.color, 1);
      this.gfx.fillCircle(this.x, this.y, 4);
    }
  }

  deactivate() {
    this.active = false;
    this.target = null;
    if (this.gfx) {
      this.gfx.destroy();
      this.gfx = null;
    }
  }
}
