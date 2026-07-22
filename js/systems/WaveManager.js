// 波次管理器
class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this.currentWaveIndex = 0;
    this.waveActive = false;
    this.waveComplete = false;
    this.totalWaves = 0;
    this.spawnTimer = null;
    this.enemiesRemaining = 0;
    this.waves = [];
  }

  start(waves) {
    this.waves = waves;
    this.totalWaves = waves.length;
    this.currentWaveIndex = 0;
    this.waveActive = false;
    this.waveComplete = false;
    this.startNextWave();
  }

  startNextWave() {
    if (this.currentWaveIndex >= this.totalWaves) {
      this.waveComplete = true;
      this.scene.events.emit('allWavesComplete');
      return;
    }

    this.waveActive = true;
    const wave = this.waves[this.currentWaveIndex];
    
    this.scene.events.emit('waveStart', this.currentWaveIndex + 1, this.totalWaves);

    let delay = 1500; // 波次开始前延迟
    let enemyCount = 0;

    wave.enemies.forEach((group) => {
      for (let i = 0; i < group.count; i++) {
        enemyCount++;
        this.scene.time.delayedCall(delay, () => {
          this.spawnEnemy(group.type);
        });
        delay += group.interval;
      }
    });

    this.enemiesRemaining = enemyCount;
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

    // 清理已死亡的敌人，更新存活计数
    this.scene.enemies = this.scene.enemies.filter(e => !e.dead);
    
    // 检查当前波次所有敌人是否已处理完毕
    const aliveEnemies = this.scene.enemies.filter(e => e.active && !e.dead && !e.reachedEnd);
    if (aliveEnemies.length === 0 && this.currentWaveIndex >= this.totalWaves - 1) {
      // 最后一波清完后不自动进下一波
    } else if (aliveEnemies.length === 0 && !this.waveActive) {
      this.scene.time.delayedCall(2000, () => {
        this.startNextWave();
      });
    }
  }

  isAllComplete() {
    return this.waveComplete;
  }
}
