// 塔配置
const TOWER_CONFIG = {
  ember_spirit: {
    id: 'ember_spirit',
    name: '灰烬之灵',
    description: '发射火流星沿路径飞行，命中敌人造成范围火焰伤害',
    imageKey: 'tower_ember_spirit',
    cost: 100,
    range: 220,
    damage: 20,            // 火流星伤害
    attackSpeed: 2000,     // 攻击间隔(ms)
    hitsPerAttack: 1,      // 每次发射1颗火流星
    bulletSpeed: 400,      // 火流星飞行速度(px/s)
    color: 0xff6600,
    buildTime: 1,
    upgradeCost: 120,      // 每次升级固定费用
    maxLevel: 3,          // 最高等级
    sellRatio: 0.7        // 出售返还比例（已投入的70%）
  },
  stone_wall: {
    id: 'stone_wall',
    name: '石垒',
    description: '召唤小石头人拦截路径上的敌人，近战攻击',
    imageKey: 'tower_stone_wall',
    cost: 70,
    range: 180,            // 召唤/仇恨范围
    damage: 5,             // 石头人每次攻击伤害
    attackSpeed: 1500,     // 石头人攻击间隔(ms)
    soldierHP: 60,         // 石头人血量
    soldierCount: 3,       // 初始召唤数量（每个石垒独立生成）
    soldierRespawn: 10000,  // 单个石头人被击杀后独立重生时间(ms)
    rallyRange: 200,        // 集合点可设置范围(兵营式)
    soldierLifetime: 0,     // 0=永久存活(被击杀后按 soldierRespawn 重生)
    bulletSpeed: 0,
    color: 0x8B7355,
    buildTime: 1,
    upgradeCost: 80,       // 每次升级固定费用
    maxLevel: 3,          // 最高等级
    sellRatio: 0.7        // 出售返还比例（已投入的70%）
  }
};
