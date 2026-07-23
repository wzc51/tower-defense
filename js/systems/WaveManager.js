// 波次管理器（支持准备阶段 / 手动开波 / 提前召唤奖励）
class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this.currentWaveIndex = 0;
    this.waveActive = false;
    this.waveComplete = false;
    this.totalWaves = 0;
    this.allSpawned = false;
    this.enemyCounter = 0;

    // 准备阶段状态
    this.preparePhase = true;          // 是否处于准备阶段
    this.prepareDuration = 8000;       // 准备阶段时长(ms)，默认8秒
    this.prepareStartTime = 0;         // 准备开始时间戳
    this.prepareTimerEvent = null;     // 准备倒计时事件
    this.earlyBonusRate = 2;           // 提前召唤奖励：每秒×2金
  }

  start(waves) {
    this.waves = waves;
    this.totalWaves = waves.length;
    this.currentWaveIndex = 0;
    this.waveActive = false;
    this.waveComplete = false;
    this.allSpawned = false;

    // 进入第一波前的准备阶段
    this.enterPreparePhase();
  }

  // ========== 准备阶段 ==========
  enterPreparePhase() {
    if (this.currentWaveIndex >= this.totalWaves) {
      // 全部波次完成
      this.waveActive = false;
      this.waveComplete = true;
      this.scene.events.emit('allWavesComplete');
      return;
    }

    this.preparePhase = true;
    this.prepareStartTime = this.scene.time.now;

    const isLastWave = this.currentWaveIndex >= this.totalWaves - 1;
    const waveNum = this.currentWaveIndex + 1;

    // 通知UI显示准备界面
    this.scene.events.emit('prepareStart', {
      wave: waveNum,
      total: this.totalWaves,
      duration: this.prepareDuration,
      isLast: isLastWave
    });

    // 倒计时结束后自动开始下一波（除非玩家已手动触发）
    this.prepareTimerEvent = this.scene.time.delayedCall(this.prepareDuration, () => {
      if (this.preparePhase) { // 还在准备阶段才自动开波
        this.startNextWave();
      }
    });
  }

  // 手动提前召唤下一波（给奖励金）
  forceStartNextWave() {
    if (!this.preparePhase) return false; // 不在准备阶段

    // 计算提前召唤奖励
    const elapsed = this.scene.time.now - this.prepareStartTime;
    const remaining = Math.max(0, this.prepareDuration - elapsed);
    const bonus = Math.floor(remaining / 1000 * this.earlyBonusRate);

    if (bonus > 0 && this.scene.gold !== undefined) {
      this.scene.gold += bonus;
      this.scene.events.emit('earlySummon', bonus);
    }

    // 取消自动倒计时
    if (this.prepareTimerEvent) {
      this.prepareTimerEvent.remove(false);
      this.prepareTimerEvent = null;
    }

    this.startNextWave();
    return true;
  }

  startNextWave() {
    this.preparePhase = false;

    if (this.currentWaveIndex >= this.totalWaves) {
      this.waveActive = false;
      this.waveComplete = true;
      this.scene.events.emit('allWavesComplete');
      return;
    }

    this.waveActive = true;
    this.allSpawned = false;
    const wave = this.waves[this.currentWaveIndex];

    this.scene.events.emit('waveStart', this.currentWaveIndex + 1, this.totalWaves);

    let delay = 1500;
    let totalCount = 0;

    wave.enemies.forEach((group) => {
      for (let i = 0; i < group.count; i++) {
        totalCount++;
        this.scene.time.delayedCall(delay, () => {
          this.spawnEnemy(group.type);
        });
        delay += group.interval;
      }
    });

    // 所有敌人生成完毕后标记
    this.scene.time.delayedCall(delay, () => {
      this.allSpawned = true;
    });
  }

  spawnEnemy(typeId) {
    const config = ENEMY_TYPES[typeId];
    if (!config) return;

    const spawnPoint = this.scene.currentLevel.path[0];
    const enemy = new Enemy(this.scene, spawnPoint.x, spawnPoint.y, { ...config });
    enemy.setPath(this.scene.currentLevel.path);
    this.scene.enemies.push(enemy);
  }

  update() {
    // 准备阶段不处理敌人更新
    if (this.preparePhase) return;

    if (!this.waveActive || this.waveComplete) return;

    // 清理已死亡敌人
    this.scene.enemies = this.scene.enemies.filter(e => !e.dead);

    // 统计存活的敌人
    const aliveEnemies = this.scene.enemies.filter(e => e.active && !e.dead && !e.reachedEnd);

    // 全部生成完毕 + 没有存活敌人 → 波次结束 → 进入准备阶段
    if (this.allSpawned && aliveEnemies.length === 0) {
      if (this.currentWaveIndex >= this.totalWaves - 1) {
        // 最后一波 → 游戏胜利
        this.waveActive = false;
        this.waveComplete = true;
        this.scene.events.emit('allWavesComplete');
      } else {
        // 进入下一波准备阶段
        this.waveActive = false;
        this.currentWaveIndex++;
        this.enterPreparePhase();
      }
    }
  }

  // 获取当前准备剩余时间(ms)
  getPrepareRemaining() {
    if (!this.preparePhase) return 0;
    const elapsed = this.scene.time.now - this.prepareStartTime;
    return Math.max(0, this.prepareDuration - elapsed);
  }

  isAllComplete() {
    return this.waveComplete;
  }
}
