// 塔配置
const TOWER_CONFIG = {
  ember_spirit: {
    id: 'ember_spirit',
    name: '灰烬之灵',
    description: '无影拳式攻击：对范围内所有敌人依次快速连击',
    imageKey: 'tower_ember_spirit',
    cost: 100,
    range: 120,
    damage: 15,
    attackSpeed: 2000,
    hitsPerAttack: 5,
    bulletSpeed: 400,
    color: 0xff6600,
    buildTime: 1
  },
  stone_wall: {
    id: 'stone_wall',
    name: '石垒',
    description: '召唤土兵在路径上拦截敌人',
    imageKey: 'tower_stone_wall',
    cost: 70,
    range: 100,
    damage: 5,
    attackSpeed: 1500,
    soldierHP: 100,
    soldierCount: 1,
    soldierLifetime: 8000,
    bulletSpeed: 0,
    color: 0x8B7355,
    buildTime: 1
  }
};
