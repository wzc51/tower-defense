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
    this.soldiers = [];  // 石垒召唤的土兵
    
    // 绘制塔基（光圈）
    this.rangeCircle = scene.add.graphics();
    this.rangeCircle.lineStyle(1, this.color, 0.2);
    this.rangeCircle.strokeCircle(0, 0, this.range);
    this.rangeCircle.setVisible(false);
    this.add(this.rangeCircle);
    
    // 绘制塔本体
    this.tower_gfx = scene.add.graphics();
    this.drawTower();
    this.add(this.tower_gfx);
    
    // 攻击动画状态
    this.attackEmitter = null;
    
    // 可交互
    this.setSize(40, 40);
    this.setInteractive();
    this.on('pointerover', () => this.rangeCircle.setVisible(true));
    this.on('pointerout', () => this.rangeCircle.setVisible(false));
  }

  drawTower() {
    this.tower_gfx.clear();
    const size = this.level === 1 ? 16 : 20;
    
    // 底座
    this.tower_gfx.fillStyle(0x666666, 1);
    this.tower_gfx.fillCircle(0, 0, size + 4);
    
    // 塔身
    this.tower_gfx.fillStyle(this.color, 1);
    this.tower_gfx.fillCircle(0, 0, size);
    
    // 装饰环
    this.tower_gfx.lineStyle(2, 0xffffff, 0.3);
    this.tower_gfx.strokeCircle(0, 0, size - 2);
    
    // 塔类型标记
    if (this.towerConfig.id === 'stone_wall') {
      this.tower_gfx.fillStyle(0x8B7355, 1);
      this.tower_gfx.fillRect(-4, -4, 8, 8);
    }
  }

  upgrade() {
    this.level++;
    this.damage = Math.floor(this.damage * 1.5);
    this.range = Math.floor(this.range * 1.1);
    this.attackSpeed = Math.floor(this.attackSpeed * 0.85);
    
    this.rangeCircle.clear();
    this.rangeCircle.lineStyle(1, this.color, 0.2);
    this.rangeCircle.strokeCircle(0, 0, this.range);
    
    this.drawTower();
  }

  findTarget(enemies) {
    return enemies.find(e => {
      if (!e || !e.active || e.dead || e.reachedEnd) return false;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      return dist <= this.range;
    });
  }

  // 灰烬之灵：无影拳式连击
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

  // 石垒：召唤土兵拦截
  attackStoneWall(enemies) {
    const pathPoints = this.scene.currentLevel.path;
    
    // 找到最近的路径点
    let closestDist = Infinity;
    let closestIdx = 0;
    pathPoints.forEach((p, i) => {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
      if (dist < closestDist && dist <= this.range) {
        closestDist = dist;
        closestIdx = i;
      }
    });
    
    if (closestDist === Infinity) return;
    
    // 清理已死亡的土兵
    this.soldiers = this.soldiers.filter(s => s && s.active);
    
    if (this.soldiers.length >= 2) return; // 最多2个土兵
    
    const spawnPoint = pathPoints[closestIdx];
    const soldier = this.scene.add.graphics();
    soldier.fillStyle(0x8B7355, 1);
    soldier.fillRect(-8, -8, 16, 16);
    soldier.x = spawnPoint.x;
    soldier.y = spawnPoint.y;
    
    // 让土兵沿路径移动一段距离作为巡逻
    const soldierPath = pathPoints.slice(closestIdx, Math.min(closestIdx + 3, pathPoints.length));
    let patrolIdx = 0;
    
    const moveEvent = this.scene.time.addEvent({
      delay: 50,
      callback: () => {
        if (!soldier || !soldier.active) {
          moveEvent.remove();
          return;
        }
        patrolIdx++;
        if (patrolIdx >= soldierPath.length) {
          moveEvent.remove();
          // 到达巡逻终点后消失
          this.scene.tweens.add({
            targets: soldier,
            alpha: 0,
            duration: 500,
            onComplete: () => soldier.destroy()
          });
          return;
        }
        soldier.x = soldierPath[patrolIdx].x;
        soldier.y = soldierPath[patrolIdx].y;
        
        // 检查碰撞：土兵与敌人
        const nearbyEnemies = enemies.filter(e => {
          if (!e || !e.active || e.dead || e.reachedEnd) return false;
          return Phaser.Math.Distance.Between(soldier.x, soldier.y, e.x, e.y) < 20;
        });
        
        if (nearbyEnemies.length > 0) {
          nearbyEnemies.forEach(e => e.takeDamage(this.damage));
          this.scene.tweens.add({
            targets: soldier,
            alpha: 0,
            duration: 300,
            onComplete: () => soldier.destroy()
          });
          moveEvent.remove();
        }
      },
      repeat: soldierPath.length
    });
    
    this.soldiers.push(soldier);
    
    // 土兵存活时间
    this.scene.time.delayedCall(this.towerConfig.soldierLifetime, () => {
      if (soldier && soldier.active) {
        this.scene.tweens.add({
          targets: soldier,
          alpha: 0,
          duration: 500,
          onComplete: () => soldier.destroy()
        });
      }
    });
  }

  update(time, enemies) {
    if (time - this.lastAttackTime < this.attackSpeed) return;
    
    const hasTarget = this.findTarget(enemies);
    if (!hasTarget) return;
    
    this.lastAttackTime = time;
    
    if (this.towerConfig.id === 'ember_spirit') {
      this.attackEmberSpirit(enemies);
    } else if (this.towerConfig.id === 'stone_wall') {
      this.attackStoneWall(enemies);
    }
  }
}
