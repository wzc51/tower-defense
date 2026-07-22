// 关卡配置
const LEVELS = {
  1: {
    name: '第一关 · 初入妖山',
    // 敌人路径拐点 (像素坐标) — 沿道路正中心线
    path: [
      { x: 210, y: 260 },
      { x: 360, y: 260 },
      { x: 360, y: 470 },
      { x: 650, y: 470 },
      { x: 650, y: 500 },
      { x: 650, y: 700 },
      { x: 610, y: 700 },
      { x: 610, y: 840 },
      { x: 490, y: 840 },
      { x: 490, y: 1000 },
      { x: 550, y: 1000 },
      { x: 550, y: 1060 },
      { x: 1150, y: 1060 },
      { x: 1180, y: 1060 }
    ],
    // 塔位中心坐标（以地图左上角为原点）
    towerSpots: [
      { x: 258, y: 134 },   // 1
      { x: 536, y: 402 },   // 4
      { x: 545, y: 618 },   // 5
      { x: 815, y: 636 },   // 6
      { x: 367, y: 718 },   // 8
      { x: 360, y: 916 },   // 9
      { x: 790, y: 917 },   // 10
      { x: 1057, y: 919 }   // 11
    ],
    // 波次定义
    waves: [
      {
        enemies: [
          { type: 'imp', count: 5, interval: 1000 },
          { type: 'imp', count: 3, interval: 800 }
        ]
      },
      {
        enemies: [
          { type: 'imp', count: 5, interval: 900 },
          { type: 'brute', count: 2, interval: 1500 }
        ]
      },
      {
        enemies: [
          { type: 'imp', count: 5, interval: 800 },
          { type: 'spirit', count: 3, interval: 700 },
          { type: 'brute', count: 2, interval: 1500 }
        ]
      }
    ],
    // 初始资源
    startingGold: 200,
    startingLives: 20
  }
};
