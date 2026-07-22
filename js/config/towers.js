// 塔配置
const TOWER_CONFIG = {
  ember_spirit: {
    id: 'ember_spirit',
    name: '灰烬之灵',
    description: '无影拳式攻击：对范围内所有敌人依次快速连击',
    cost: 100,
    range: 120,
    damage: 15,
    attackSpeed: 2000,       // 攻击间隔(ms)，无影拳是一次连击算一次攻击
    hitsPerAttack: 5,        // 每次攻击连击次数
    bulletSpeed: 400,
    color: 0xff6600,
    buildTime: 1             // 建造时间(秒)
  },
  stone_wall: {
    id: 'stone_wall',
    name: '石垒',
    description: '召唤土兵在路径上拦截敌人',
    cost: 80,
    range: 100,
    damage: 5,
    attackSpeed: 1500,
    soldierHP: 100,          // 召唤土兵的血量
    soldierCount: 1,         // 每次召唤数量
    soldierLifetime: 8000,   // 土兵存活时间(ms)
    bulletSpeed: 0,
    color: 0x8B7355,
    buildTime: 1
  }
};
