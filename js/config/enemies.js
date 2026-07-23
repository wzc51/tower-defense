// 敌人配置
const ENEMY_TYPES = {
  imp: {
    id: 'imp',
    name: '小妖',
    hp: 80,
    speed: 55,           // 移动速度（已调慢）
    reward: 10,
    damage: 10,          // 对石头人的伤害
    attackInterval: 1800, // 攻击石头人的间隔(ms，已调慢)
    leakDamage: 1,       // 漏到终点时玩家只扣1滴血
    color: 0xff4444,
    size: 16
  },
  brute: {
    id: 'brute',
    name: '山魈',
    hp: 200,
    speed: 38,           // 移动速度（已调慢）
    reward: 25,
    damage: 10,
    attackInterval: 2000,
    leakDamage: 1,
    color: 0x8844ff,
    size: 20
  },
  spirit: {
    id: 'spirit',
    name: '鬼火',
    hp: 50,
    speed: 85,           // 移动速度（已调慢）
    reward: 15,
    damage: 10,
    attackInterval: 1500,
    leakDamage: 1,
    color: 0x44ff44,
    size: 14
  }
};
