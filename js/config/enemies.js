// 敌人配置
const ENEMY_TYPES = {
  imp: {
    id: 'imp',
    name: '小妖',
    hp: 50,
    speed: 80,
    reward: 10,
    damage: 1,         // 到达终点对玩家造成的伤害
    color: 0xff4444,
    size: 16
  },
  brute: {
    id: 'brute',
    name: '山魈',
    hp: 120,
    speed: 50,
    reward: 25,
    damage: 2,
    color: 0x8844ff,
    size: 20
  },
  spirit: {
    id: 'spirit',
    name: '鬼火',
    hp: 30,
    speed: 120,
    reward: 15,
    damage: 1,
    color: 0x44ff44,
    size: 14
  }
};
