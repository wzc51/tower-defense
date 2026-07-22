// 关卡配置
const LEVELS = {
  1: {
    name: '第一关 · 初入妖山',
    // 敌人路径拐点 (像素坐标) — 沿道路正中心线
    path: [
      { x: 165, y: 280 },   // 起点
      { x: 430, y: 280 },   // 拐1: 横向结束，开始向下
      { x: 430, y: 470 },   // 拐2: 向下到底，开始向右
      { x: 600, y: 470 },   // 拐3: 向右后开始向下
      { x: 600, y: 590 },   // 拐4: 向下后开始向左
      { x: 470, y: 590 },   // 拐5: 向左后继续向下
      { x: 470, y: 900 },   // 拐6: 到达底部，开始向右
      { x: 1190, y: 900 },  // 拐7
      { x: 1190, y: 900 }   // 终点
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
