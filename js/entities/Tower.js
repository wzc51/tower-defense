// 塔类
class Tower extends Phaser.GameObjects.Container {
  constructor(scene, x, y, config) {
    super(scene, x, y);
    scene.add.existing(this);

    this.towerConfig = config;
    this.level = 1;
    this.maxLevel = config.maxLevel || 3;
    this.upgradeCost = config.upgradeCost || 100;
    this.sellRatio = config.sellRatio || 0.7;
    this.totalInvested = config.cost; // 累计投入（用于出售返还计算）
    this.range = config.range;
    this.damage = config.damage;
    this.attackSpeed = config.attackSpeed;
    this.hitsPerAttack = config.hitsPerAttack || 1;
    this.bulletSpeed = config.bulletSpeed;
    this.color = config.color;
    this.rangePinned = false;

    this.lastAttackTime = 0;
    this.isAttacking = false;
    this.golems = [];           // 本塔独立维护的小石头人（各石垒互不影响）
    this.respawnTimers = [];    // 石头人独立重生计时器

    // ========== 塔本体 ==========
    if (config.id === 'stone_wall') {
      // 石垒：模型上移一点（不再压在塔位正中心），缩小到合适大小
      this.towerSprite = scene.add.sprite(0, -20, config.imageKey);
      this.towerSprite.setScale(0.20);
      this.add(this.towerSprite);
    } else if (config.id === 'ember_spirit') {
      // 灰烬之灵：整张图（含平台）待机时只有极轻微浮动，无闪烁
      this.towerSprite = scene.add.sprite(0, -15, config.imageKey);
      this.towerSprite.setScale(0.16);
      this.add(this.towerSprite);
      this.startIdleAnimation();
    } else {
      this.towerSprite = scene.add.sprite(0, -15, config.imageKey);
      this.towerSprite.setScale(0.16);
      this.add(this.towerSprite);
    }

    // 攻击范围圈（初始隐藏，悬停/点击时显示）
    this.rangeCircle = scene.add.graphics();
    this.add(this.rangeCircle);

    // 石垒：集合点（兵营式）相关
    this.rallyPoint = null;          // 集合点坐标（spawn 时默认取最近路径点）
    this.rallyRange = config.rallyRange || 200;
    this.rallyCircle = null;         // 集合点范围圈（青色）
    this.rallyMarker = null;         // 集合点标记

    // 可交互：悬停显示淡圈，点击固定显示明显圈
    this.setSize(48, 48);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => { if (!this.rangePinned) this.showRange(false); });
    this.on('pointerout', () => { if (!this.rangePinned) this.hideRange(); });
    this.on('pointerdown', () => {
      this.rangePinned = !this.rangePinned;
      if (this.rangePinned) {
        this.showRange(true);
        if (this.towerConfig.id === 'stone_wall') this.showRally(true);
      } else {
        this.hideRange();
        if (this.towerConfig.id === 'stone_wall') this.showRally(false);
      }
    });

    // 石垒：建造后延迟召唤石头人
    if (config.id === 'stone_wall') {
      this.scene.time.delayedCall(600, () => {
        try { this.spawnGolems(); } catch (e) { console.error('spawnGolems error:', e); }
      });
    }
  }

  // ========== 灰烬之灵待机动画（整张图极轻微浮动，无闪烁）==========
  startIdleAnimation() {
    // 极轻微的缩放呼吸（±0.003，屏上约0.5px，几乎看不出在动）
    this.idleBob = this.scene.tweens.add({
      targets: this.towerSprite,
      scaleX: 0.163,
      scaleY: 0.157,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // 显示攻击范围圈（pinned=true 时更明显：粗描边+填充）
  showRange(pinned) {
    this.rangeCircle.clear();
    if (pinned) {
      this.rangeCircle.fillStyle(this.color, 0.12);
      this.rangeCircle.fillCircle(0, 0, this.range);
      this.rangeCircle.lineStyle(3, this.color, 0.9);
      this.rangeCircle.strokeCircle(0, 0, this.range);
    } else {
      this.rangeCircle.fillStyle(this.color, 0.06);
      this.rangeCircle.fillCircle(0, 0, this.range);
      this.rangeCircle.lineStyle(2, this.color, 0.5);
      this.rangeCircle.strokeCircle(0, 0, this.range);
    }
    this.rangeCircle.setVisible(true);
  }

  hideRange() {
    this.rangeCircle.clear();
    this.rangeCircle.setVisible(false);
  }

  upgrade() {
    if (this.level >= this.maxLevel) return false; // 已满级

    this.level++;
    this.damage = Math.floor(this.damage * 1.5);
    this.range = Math.floor(this.range * 1.1);
    this.attackSpeed = Math.floor(this.attackSpeed * 0.85);
    this.totalInvested += this.upgradeCost;

    if (this.towerConfig.id === 'stone_wall') {
      this.towerSprite.setScale(0.24);
    } else if (this.towerConfig.id === 'ember_spirit') {
      this.towerSprite.setScale(0.18);
    }

    if (this.rangePinned) this.showRange(true);
    return true;
  }

  findTarget(enemies) {
    return enemies.find(e => {
      if (!e || !e.active || e.dead || e.reachedEnd) return false;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      return dist <= this.range;
    });
  }

  // ================================================================
  //  灰烬之灵：无影拳（范围AOE + 残影闪现）
  //  打击范围内所有敌人，每个敌人1次连击伤害
  //  残影使用 ember_char 纹理（仅角色，无平台底座）
  // ================================================================
  attackEmberSpirit(enemies) {
    if (this.isAttacking) return;

    // 找到范围内所有敌人（无数量限制——范围AOE）
    const targets = enemies.filter(e => {
      if (!e || !e.active || e.dead || e.reachedEnd) return false;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      return dist <= this.range;
    });

    if (targets.length === 0) return;

    this.isAttacking = true;

    // 攻击期间暂停待机呼吸（便于显示红色出拳闪烁）
    if (this.idleBob) this.idleBob.pause();

    // 残影纹理：优先使用仅角色纹理（ember_char），回退到塔本体
    const ghostTex = this.scene.textures.exists('ember_char')
      ? 'ember_char' : this.towerConfig.imageKey;

    let delay = 0;
    const punchInterval = 65; // 每个目标间隔65ms（快速连打感）

    targets.forEach((target) => {
      this.scene.time.delayedCall(delay, () => {
        if (!this.active || !target || !target.active || target.dead) return;

        // === 残影闪现：角色瞬移到敌人位置 ===
        const ghost = this.scene.add.sprite(this.x, this.y - 15, ghostTex);
        ghost.setScale(0.18).setAlpha(0.6).setDepth(9).setTint(0xffaa55);

        // 闪现飞行：塔位 → 敌人位置
        this.scene.tweens.add({
          targets: ghost,
          x: target.x,
          y: target.y - 12,
          duration: 60,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (!ghost.active) return;

            // 出拳下压
            this.scene.tweens.add({
              targets: ghost,
              scaleX: 0.24,
              scaleY: 0.12,
              y: target.y - 2,
              duration: 45,
              yoyo: true,
              onComplete: () => {
                if (ghost.active) {
                  this.scene.tweens.add({
                    targets: ghost,
                    alpha: 0,
                    scaleX: 0.32,
                    scaleY: 0.32,
                    duration: 200,
                    onComplete: () => ghost.destroy()
                  });
                }
              }
            });

            // 结算伤害（每个目标都受打击）
            try { target.takeDamage(this.damage); } catch (e) {}

            // 命中星芒爆炸
            const burst = this.scene.add.sprite(target.x, target.y, 'burst_star');
            burst.setScale(0.4).setDepth(10).setAlpha(0.95).setTint(0xffaa33);
            this.scene.tweens.add({
              targets: burst, scaleX: 1.8, scaleY: 1.8, alpha: 0,
              duration: 260, ease: 'Cubic.easeOut',
              onComplete: () => burst.destroy()
            });

            // 火星四溅
            for (let i = 0; i < 5; i++) {
              const ang = Math.random() * Math.PI * 2;
              const sp = this.scene.add.sprite(target.x, target.y, 'spark')
                .setDepth(9.5).setScale(0.7).setAlpha(0.95);
              this.scene.tweens.add({
                targets: sp,
                x: target.x + Math.cos(ang) * (28 + Math.random() * 22),
                y: target.y + Math.sin(ang) * (28 + Math.random() * 22),
                alpha: 0, scaleX: 0.08, scaleY: 0.08, duration: 300,
                onComplete: () => sp.destroy()
              });
            }
          }
        });

        // === 发光连线：塔 → 敌人 ===
        const lineGfx = this.scene.add.graphics().setDepth(8);
        lineGfx.lineStyle(7, this.color, 0.12);
        lineGfx.lineBetween(this.x, this.y - 15, target.x, target.y);
        lineGfx.lineStyle(2, 0xffddaa, 0.75);
        lineGfx.lineBetween(this.x, this.y - 15, target.x, target.y);
        this.scene.tweens.add({
          targets: lineGfx, alpha: 0, duration: 180,
          onComplete: () => lineGfx.destroy()
        });

        // 塔本体出拳闪烁
        this.towerSprite.setTint(0xff8844);
        this.scene.time.delayedCall(80, () => {
          if (this.towerSprite && this.towerSprite.active) this.towerSprite.clearTint();
        });
      });

      delay += punchInterval; // 下一个目标稍后触发，形成"连续打击多个目标"的视觉效果
    });

    // 攻击结束解锁并恢复待机呼吸
    this.scene.time.delayedCall(delay + 120, () => {
      this.isAttacking = false;
      if (this.idleBob) this.idleBob.resume();
    });
  }

  // ================================================================
  //  石垒：召唤小石头人 + 王国保卫战兵营式仇恨逻辑 + 集合点
  // ================================================================

  spawnGolems() {
    if (!this.scene.currentLevel || !this.scene.currentLevel.path) {
      console.warn('spawnGolems: no path data');
      return;
    }

    const pathPoints = this.scene.currentLevel.path;

    // 默认集合点：距离塔最近的路径点（玩家可后续拖动修改）
    if (!this.rallyPoint) {
      let closestIdx = 0;
      let closestDist = Infinity;
      pathPoints.forEach((p, i) => {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      });
      const cp = pathPoints[closestIdx];
      this.rallyPoint = { x: cp.x, y: cp.y };
    }

    const count = this.towerConfig.soldierCount || 3;

    // 紧凑站位：以集合点为中心小幅散开
    for (let idx = 0; idx < count; idx++) {
      const off = (idx - (count - 1) / 2);
      const gx = this.rallyPoint.x + off * 12;
      const gy = this.rallyPoint.y + (idx === 1 ? 0 : (idx === 0 ? -6 : 6));
      const golem = this.createGolem(gx, gy, idx);
      this.golems.push(golem);
    }
  }

  createGolem(x, y, slotIndex = 0) {
    // 使用待机帧作为默认纹理（已抠图去背景，无文字）
    let textureKey = 'golem_idle';
    if (!this.scene.textures.exists(textureKey)) {
      textureKey = this.scene.textures.exists('golem_ref') ? 'golem_ref' : 'stone_golem';
    }

    const golem = {
      x: x,
      y: y,
      hp: this.towerConfig.soldierHP || 60,
      maxHp: this.towerConfig.soldierHP || 60,
      active: false,
      dead: false,
      damage: this.towerConfig.damage || 5,
      attackCooldown: 0,
      state: 'spawning',
      stateTimer: 0,
      target: null,
      engagedEnemy: null,   // 当前锁定的敌人（1:1）
      slotIndex: slotIndex, // 重生槽位（独立计时）
      aggroRange: 70,       // 仇恨/拦截范围（小于塔整体范围）
      sprite: null,
      hpBar: null,
      hpBarBg: null,
      homeX: x,
      homeY: y
    };
    // 供敌人调用：对石头人造成伤害
    golem.takeDamage = (amount) => this.damageGolem(golem, amount);

    golem.sprite = this.scene.add.sprite(x, y + 25, textureKey);
    golem.sprite.setScale(0.22);
    golem.sprite.setDepth(4);
    golem.sprite.setAlpha(0);

    golem.hpBarBg = this.scene.add.graphics().setDepth(10).setVisible(false);
    golem.hpBar = this.scene.add.graphics().setDepth(11).setVisible(false);

    // ========== 从土里爬出的动画 ==========
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = 40 + Math.random() * 50;
      const dirt = this.scene.add.ellipse(x, y, 3 + Math.random() * 3, 3 + Math.random() * 2, 0x8B7355, 0.9).setDepth(3);

      this.scene.tweens.add({
        targets: dirt,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed - 20,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 450 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => { if (dirt.active) dirt.destroy(); }
      });
    }

    this.scene.tweens.add({
      targets: golem.sprite,
      y: y,
      alpha: 1,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        golem.active = true;
        golem.state = 'idle';
        this.updateGolemHPBar(golem);
        if (golem.hpBarBg) golem.hpBarBg.setVisible(true);
        if (golem.hpBar) golem.hpBar.setVisible(true);
      }
    });

    golem.sprite.setScale(0);
    this.scene.tweens.add({
      targets: golem.sprite,
      scaleX: 0.22,
      scaleY: 0.22,
      duration: 550,
      ease: 'Back.easeOut',
      delay: 100
    });

    return golem;
  }

  setGolemFrame(golem, state) {
    if (!golem || !golem.sprite || !golem.sprite.active) return;
    const frameMap = {
      'idle': 'golem_idle',
      'chasing': 'golem_idle',
      'charging': 'golem_charge',
      'slamming': 'golem_slam'
    };
    const key = frameMap[state];
    if (key && this.scene.textures.exists(key)) {
      golem.sprite.setTexture(key);
    }
  }

  updateGolemHPBar(golem) {
    if (!golem.hpBarBg || !golem.hpBar || !golem.sprite) return;
    golem.hpBarBg.clear();
    golem.hpBarBg.fillStyle(0x333333, 0.8);
    golem.hpBarBg.fillRect(golem.x - 16, golem.y - 28, 32, 4);

    golem.hpBar.clear();
    const ratio = Math.max(0, golem.hp / golem.maxHp);
    const barColor = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444;
    golem.hpBar.fillStyle(barColor, 1);
    golem.hpBar.fillRect(golem.x - 16, golem.y - 28, 32 * ratio, 4);
  }

  damageGolem(golem, amount) {
    if (!golem.active || golem.dead) return;
    golem.hp -= amount;
    this.updateGolemHPBar(golem);

    golem.sprite.setTint(0xff4444);
    this.scene.time.delayedCall(120, () => {
      if (golem.sprite && golem.sprite.active) golem.sprite.clearTint();
    });

    if (golem.hp <= 0) {
      this.destroyGolem(golem);
    }
  }

  destroyGolem(golem) {
    if (golem.dead) return;
    golem.dead = true;
    golem.active = false;

    // 解除与敌人的互相锁定
    if (golem.engagedEnemy && !golem.engagedEnemy.dead) {
      golem.engagedEnemy.blockedBy = null;
    }
    golem.engagedEnemy = null;

    // 死亡碎裂粒子
    for (let i = 0; i < 6; i++) {
      const ang = Math.random() * Math.PI * 2;
      const shard = this.scene.add.rectangle(golem.x, golem.y, 4, 4, 0x9a8b6f, 0.9).setDepth(5);
      this.scene.tweens.add({
        targets: shard,
        x: golem.x + Math.cos(ang) * (20 + Math.random() * 20),
        y: golem.y + Math.sin(ang) * (20 + Math.random() * 20),
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: 400,
        onComplete: () => { if (shard.active) shard.destroy(); }
      });
    }

    this.scene.tweens.add({
      targets: golem.sprite,
      alpha: 0,
      scaleX: 0.05,
      scaleY: 0.05,
      duration: 350,
      onComplete: () => {
        if (golem.sprite && golem.sprite.active) golem.sprite.destroy();
        if (golem.hpBar && golem.hpBar.active) golem.hpBar.destroy();
        if (golem.hpBarBg && golem.hpBarBg.active) golem.hpBarBg.destroy();
      }
    });

    // 仅从本塔的石头人数组移除（各石垒独立）
    this.golems = this.golems.filter(g => g !== golem);

    // 独立重生计时（每个石头人各自 soldierRespawn ms，互不影响）
    const respawnMs = this.towerConfig.soldierRespawn || 10000;
    const slot = golem.slotIndex;
    const homeX = golem.homeX, homeY = golem.homeY;
    const timer = this.scene.time.delayedCall(respawnMs, () => {
      if (!this.active) return; // 塔已销毁则取消重生
      const ng = this.createGolem(homeX, homeY, slot);
      this.golems.push(ng);
    });
    this.respawnTimers.push(timer);
  }

  // ========== 石头人仇恨与攻击状态机（每帧驱动）==========
  updateStoneWall(enemies, delta) {
    const now = this.scene.time.now;

    this.golems.forEach(golem => {
      if (!golem.active || golem.dead) return;

      this.updateGolemHPBar(golem);

      switch (golem.state) {

        case 'spawning':
          break;

        case 'idle':
          // 攻击冷却中：原地待命，不参与锁敌（让攻击节奏变慢）
          if (golem.attackCooldown > 0) {
            golem.target = null;
            const wobble = Math.sin(now * 0.002 + golem.homeX) * 2;
            golem.sprite.setX(golem.homeX + wobble);
            golem.x = golem.homeX + wobble;
            break;
          }

          golem.target = null;
          let nearestDist = golem.aggroRange;
          let bestEnemy = null;
          enemies.forEach(e => {
            if (!e.active || e.dead || e.reachedEnd) return;
            if (e.blockedBy && e.blockedBy !== golem) return; // 已被其他石头人锁定
            const d = Phaser.Math.Distance.Between(golem.x, golem.y, e.x, e.y);
            if (d < nearestDist) {
              nearestDist = d;
              bestEnemy = e;
            }
          });

          if (bestEnemy) {
            // 锁定敌人：强制其停下（王国保卫战兵营式仇恨）
            golem.target = bestEnemy;
            golem.engagedEnemy = bestEnemy;
            bestEnemy.blockedBy = golem;
            golem.state = 'chasing';
            this.setGolemFrame(golem, 'chasing');
          } else {
            const wobble = Math.sin(now * 0.002 + golem.homeX) * 2;
            golem.sprite.setX(golem.homeX + wobble);
            golem.x = golem.homeX + wobble;
          }
          break;

        case 'chasing':
          if (!golem.target || !golem.target.active || golem.target.dead || golem.target.reachedEnd) {
            if (golem.engagedEnemy) golem.engagedEnemy.blockedBy = null;
            golem.engagedEnemy = null;
            golem.target = null;
            golem.state = 'idle';
            this.setGolemFrame(golem, 'idle');
            this.scene.tweens.add({
              targets: golem.sprite,
              x: golem.homeX,
              y: golem.homeY,
              duration: 300,
              ease: 'Quad.easeOut'
            });
            golem.x = golem.homeX;
            golem.y = golem.homeY;
            break;
          }

          const dx = golem.target.x - golem.x;
          const dy = golem.target.y - golem.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 22) {
            golem.state = 'charging';
            golem.stateTimer = 0;
            this.setGolemFrame(golem, 'charging');
          } else {
            const moveSpeed = 90 * delta / 1000; // 追击速度（锁定后敌人已停下，无需追赶自由速度）
            golem.x += (dx / dist) * moveSpeed;
            golem.y += (dy / dist) * moveSpeed;
            golem.sprite.setPosition(golem.x, golem.y);
          }
          break;

        case 'charging':
          if (!golem.target || !golem.target.active || golem.target.dead || golem.target.reachedEnd) {
            if (golem.engagedEnemy) golem.engagedEnemy.blockedBy = null;
            golem.engagedEnemy = null;
            golem.target = null;
            golem.state = 'idle';
            this.setGolemFrame(golem, 'idle');
            break;
          }

          golem.stateTimer += delta;
          const chargeProgress = Math.min(golem.stateTimer / 500, 1); // 蓄力放慢
          golem.sprite.setY(golem.homeY - chargeProgress * 6);
          golem.sprite.setScale(0.22 + chargeProgress * 0.04);

          if (golem.stateTimer >= 500) {
            golem.state = 'slamming';
            golem.stateTimer = 0;
            this.setGolemFrame(golem, 'slamming');
          }
          break;

        case 'slamming':
          golem.stateTimer += delta;

          const slamProgress = Math.min(golem.stateTimer / 250, 1); // 砸击放慢
          golem.sprite.setY(golem.homeY + slamProgress * 4);
          golem.sprite.setScale(0.26 - slamProgress * 0.04);

          if (golem.stateTimer >= 100 && golem.stateTimer < 120 && !golem.hasDealtDamage) {
            golem.hasDealtDamage = true;
            if (golem.target && golem.target.active && !golem.target.dead) {
              golem.target.takeDamage(golem.damage);

              const shockwave = this.scene.add.ellipse(
                golem.x, golem.y + 12, 8, 4, 0xffaa00, 0.7
              ).setDepth(5);
              this.scene.tweens.add({
                targets: shockwave,
                scaleX: 3.5,
                scaleY: 2.0,
                alpha: 0,
                duration: 300,
                onComplete: () => { if (shockwave.active) shockwave.destroy(); }
              });
            }
          }

          if (golem.stateTimer >= 250) {
            golem.state = 'idle';
            golem.stateTimer = 0;
            golem.attackCooldown = 1500; // 攻击间隔放慢（原800）
            golem.hasDealtDamage = false;
            golem.sprite.setY(golem.homeY);
            golem.sprite.setScale(0.22);
            this.setGolemFrame(golem, 'idle');
          }
          break;
      }

      if (golem.attackCooldown > 0) {
        golem.attackCooldown -= delta;
      }
    });
  }

  attackStoneWall(enemies, delta) {
    this.updateStoneWall(enemies, delta);
  }

  // ================================================================
  //  集合点（兵营式）：点击选中石垒后显示范围，点地图空地设置
  // ================================================================
  showRally(show) {
    if (show) {
      if (!this.rallyCircle) this.rallyCircle = this.scene.add.graphics().setDepth(1);
      if (!this.rallyMarker) this.rallyMarker = this.scene.add.graphics().setDepth(3);
      this.drawRallyRange();
      this.drawRallyMarker();
    } else {
      if (this.rallyCircle) this.rallyCircle.clear();
      if (this.rallyMarker) this.rallyMarker.clear();
    }
  }

  drawRallyRange() {
    if (!this.rallyCircle || !this.rallyPoint) return;
    this.rallyCircle.clear();
    this.rallyCircle.fillStyle(0x33ccff, 0.05);
    this.rallyCircle.fillCircle(this.x, this.y, this.rallyRange);
    this.rallyCircle.lineStyle(2, 0x33ccff, 0.5);
    this.rallyCircle.strokeCircle(this.x, this.y, this.rallyRange);
  }

  drawRallyMarker() {
    if (!this.rallyMarker || !this.rallyPoint) return;
    this.rallyMarker.clear();
    const rx = this.rallyPoint.x, ry = this.rallyPoint.y;
    this.rallyMarker.fillStyle(0x33ccff, 0.6);
    this.rallyMarker.fillCircle(rx, ry, 6);
    this.rallyMarker.lineStyle(2, 0x33ccff, 0.9);
    this.rallyMarker.strokeCircle(rx, ry, 12);
  }

  // 玩家在集合点范围内点击空地 → 移动集合点
  setRallyPoint(x, y) {
    if (!this.rallyPoint) this.rallyPoint = { x: x, y: y };
    this.rallyPoint.x = x;
    this.rallyPoint.y = y;

    const n = this.golems.length;
    this.golems.forEach((g, i) => {
      if (!g.active || g.dead) return;
      const off = (i - (n - 1) / 2);
      g.homeX = x + off * 12;
      g.homeY = y + (i === 1 ? 0 : (i === 0 ? -6 : 6));
      // 空闲中的石头人平滑移动到新集合点
      if (g.state === 'idle') {
        this.scene.tweens.add({
          targets: g.sprite,
          x: g.homeX,
          y: g.homeY,
          duration: 400,
          ease: 'Quad.easeOut'
        });
        g.x = g.homeX;
        g.y = g.homeY;
      }
    });
    this.drawRallyMarker();
  }

  // ================================================================
  //  主更新循环（每帧调用）
  //  石垒状态机每帧驱动；灰烬之灵受攻击间隔控制
  // ================================================================
  update(time, enemies, delta) {
    if (this.towerConfig.id === 'stone_wall') {
      this.updateStoneWall(enemies, delta || 16.67);
      return;
    }

    if (time - this.lastAttackTime < this.attackSpeed) return;

    const hasTarget = this.findTarget(enemies);
    if (!hasTarget) return;

    this.lastAttackTime = time;

    if (this.towerConfig.id === 'ember_spirit') {
      this.attackEmberSpirit(enemies);
    }
  }
}
