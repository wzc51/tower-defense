// 关卡配置
const LEVELS = {
  1: {
    name: '第一关 · 初入妖山',
    // 敌人路径拐点 (像素坐标)
    // 起点 → 右 → 下 → 右 → 下 → 左 → 下 → 右 → 终点
    path: [
      { x: 145, y: 250 },   // P0 起点入口
      { x: 350, y: 250 },   // P1 第一段横道
      { x: 350, y: 445 },   // P2 向下转弯
      { x: 650, y: 445 },   // P3 向右转折
      { x: 650, y: 700 },   // P4 向下转折
      { x: 450, y: 700 },   // P5 向左回折
      { x: 450, y: 940 },   // P6 再次向下
      { x: 1050, y: 940 },  // P7 最后直线
      { x: 1200, y: 940 }   // P8 终点入口
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
