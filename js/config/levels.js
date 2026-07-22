// 关卡配置
const LEVELS = {
  1: {
    name: '第一关 · 初入妖山',
    // 敌人路径拐点 (像素坐标)
    path: [
      { x: 100, y: 230 },
      { x: 340, y: 230 },
      { x: 340, y: 420 },
      { x: 230, y: 420 },
      { x: 230, y: 700 },
      { x: 340, y: 700 },
      { x: 340, y: 860 },
      { x: 1000, y: 860 },
      { x: 1150, y: 860 }
    ],
    // 塔位中心坐标
    towerSpots: [
      { x: 200, y: 120 },   // 1
      { x: 450, y: 220 },   // 2 (根据地图上方调整)
      { x: 430, y: 360 },   // 4
      { x: 430, y: 560 },   // 5
      { x: 680, y: 580 },   // 6
      { x: 680, y: 780 },   // 7
      { x: 280, y: 650 },   // 8
      { x: 280, y: 820 },   // 9
      { x: 650, y: 820 },   // 10
      { x: 900, y: 820 }    // 11
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
