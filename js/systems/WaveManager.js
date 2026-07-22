// 波次管理器
class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this.currentWaveIndex = 0;
    this.waveActive = false;
    this.waveComplete = false;
    this.totalWaves = 0;
    this.allSpawned = false;
    this.enemyCounter = 0;
  }

  start(waves) {
    this.waves = waves;
    this.totalWaves = waves.length;
    this.currentWaveIndex = 0;
    this.waveActive = false;
    this.waveComplete = false;
    this.allSpawned = false;
    this.startNextWave();
  }

  startNextWave() {
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
    if (!this.waveActive || this.waveComplete) return;

    // 清理已死亡敌人
    this.scene.enemies = this.scene.enemies.filter(e => !e.dead);
    
    // 统计存活的敌人
    const aliveEnemies = this.scene.enemies.filter(e => e.active && !e.dead && !e.reachedEnd);
    
    // 全部生成完毕 + 没有存活敌人 → 波次结束
    if (this.allSpawned && aliveEnemies.length === 0) {
      if (this.currentWaveIndex >= this.totalWaves - 1) {
        // 最后一波 → 游戏胜利
        this.waveActive = false;
        this.waveComplete = true;
        this.scene.events.emit('allWavesComplete');
      } else {
        // 进入下一波
        this.waveActive = false;
        this.currentWaveIndex++;
        this.scene.time.delayedCall(2000, () => {
          this.startNextWave();
        });
      }
    }
  }

  isAllComplete() {
    return this.waveComplete;
  }
}
