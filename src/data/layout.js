// =============================================================
// 展厅布局数据（与 docs/layout.md、docs/floorplan.svg 一一对应）
//
// 平面坐标（单位 米）：原点 = 西北角地面，x 向东，y 向南
// 3D 世界坐标：原点 = 展厅中心地面，X 向东，Z 向南，Y 向上
//   世界 X = x - 13，世界 Z = y - 8
//
// 这份数据同时被两处使用：
//   1. ProceduralHall（代码搭的粗模展厅）用它画几何体
//   2. 碰撞/可行走区域（obstacles）——与展厅模型无关，
//      以后换成高斯泼溅模型时，走路和碰撞仍然用这份数据
// =============================================================

export const HALL = {
  W: 26, // 东西长
  D: 16, // 南北宽
  H: 4.2, // 周边吊顶高
  HC: 4.8, // 中央木格栅吊顶高
  slat: { x0: 6, x1: 22, y0: 4, y1: 13 }, // 中央木格栅范围
};

/** 平面坐标 → 世界坐标 */
export const toWorld = (x, y) => ({ x: x - HALL.W / 2, z: y - HALL.D / 2 });

// 颜色（取自视频）
export const COLORS = {
  wall: 0xebd9a0,
  stairWall: 0xe2be6e,
  skirting: 0x5a4636,
  marble: 0xe9dfc8,
  floor: '#E6DDD0',
  floorBand: '#B9BEC6',
  ceiling: 0xf1e2b0,
  ceilingEdge: 0xd9b65a,
  slat: 0x6b3a2a,
  wood: 0xd9b8a0,
  curtain: 0x7d6b5d,
  windowFrame: 0x2f4a3a,
  door: 0x5a2420,
  doorFrame: 0xb5652f,
  white: 0xf6f6f2,
  banner: '#C8201C',
  bannerText: '#FFD84A',
};

// 楼梯（靠西墙北段，往北上楼，顶部平台 + 入口门）
export const STAIR = {
  x0: 0,
  x1: 1.8,
  yBottom: 6, // 楼梯最低一级所在 y
  yTop: 1.6, // 楼梯最高一级所在 y
  landing: { x0: 0, x1: 1.8, y0: 0, y1: 1.6, h: 1.8 },
  door: { x0: 0.3, x1: 1.5, h: 2.0 },
};

// 南墙窗（中心 x），宽 2.4，窗台 0.9，窗顶 2.9
export const SOUTH_WINDOWS = [4, 10, 17, 23].map((c) => ({ x0: c - 1.2, x1: c + 1.2, h0: 0.9, h1: 2.9 }));
// 北墙西段高侧窗
export const CLERESTORY = { x0: 1.8, x1: 5, h0: 3.2, h1: 3.8 };

// 独立柱、壁柱
export const COLUMNS = [
  { x: 9, y: 8.5, s: 0.7 },
  { x: 17.5, y: 8.5, s: 0.7 },
];
export const PILASTERS = [
  { x0: 6.7, x1: 7.3, y0: 15.6, y1: 16 },
  { x0: 13.2, x1: 13.8, y0: 15.6, y1: 16 },
  { x0: 20, x1: 20.6, y0: 15.6, y1: 16 },
  { x0: 15, x1: 15.6, y0: 0, y1: 0.4 },
];

// C：北墙平柜（每节 1.9 × 0.8，柜体高 0.8 + 玻璃 0.25）
export const DESK_CASES = [];
[5.5, 7.4, 9.3, 11.2, 13.1, 15.6, 17.5].forEach((x0, i) =>
  DESK_CASES.push({ id: `C${i + 1}`, x0, x1: x0 + 1.9, y0: 0.2, y1: 1.0 })
);

// D：东墙高展柜（每节 2.0 × 0.6，高 2.4）
export const TALL_CABS = [
  [1.5, 3.5],
  [3.5, 5.5],
  [5.5, 7.5],
  [8.3, 10.3],
  [11.1, 13.1],
].map(([y0, y1], i) => ({ id: `D${i + 1}`, x0: 25.4, x1: 26, y0, y1 }));

// E：独立展台 + 玻璃罩（big = 大号玻璃柜）
export const PLINTHS = [
  [10.5, 4.6],
  [13.8, 4.8],
  [16.2, 4.6],
  [19.5, 5.6],
  [21.5, 9.5, true],
  [14, 10.2],
  [18.6, 11.6, true],
  [11, 12],
  [8.2, 11.6],
  [6.2, 7.6],
].map(([x, y, big], i) => ({ id: `E${i + 1}`, x, y, big: !!big }));

// I：西墙前白布长桌
export const TABLES = [6.5, 9.2, 11.9].map((y0, i) => ({ id: `I${i + 1}`, x0: 0.5, x1: 1.3, y0, y1: y0 + 2.4 }));

// F：双面独立展板
export const PANELS = [
  { x: 7.5, y: 5.5, w: 1.2, d: 0.3 },
  { x: 12, y: 5.5, w: 1.2, d: 0.3 },
];
// G：吊挂画幅
export const HANGINGS = [
  { x0: 9.2, x1: 11.0, y: 6.7 },
  { x0: 11.8, x1: 13.6, y: 6.7 },
];
// 柜式空调
export const ACS = [
  { x: 7.8, y: 15.4 },
  { x: 19.6, y: 15.4 },
  { x: 0.4, y: 15.1 },
];

// =============================================================
// 碰撞区域（平面坐标的矩形，与展厅模型无关）
// =============================================================
const rects = [];
const add = (x0, x1, y0, y1) => rects.push({ x0, x1, y0, y1 });
add(STAIR.x0, STAIR.x1 + 0.1, 0, STAIR.yBottom + 0.1); // 楼梯整体不可进入（粗版不做上楼）
add(2, 5.5, 0, 0.35); // 前言墙 + 人物板
DESK_CASES.forEach((c) => add(c.x0, c.x1, 0, c.y1));
add(15, 15.6, 0, 0.4);
TALL_CABS.forEach((c) => add(c.x0, c.x1, c.y0, c.y1));
add(25.4, 26, 7.5, 8.3);
add(25.4, 26, 10.3, 11.1);
COLUMNS.forEach((c) => add(c.x - c.s / 2, c.x + c.s / 2, c.y - c.s / 2, c.y + c.s / 2));
PILASTERS.forEach((p) => add(p.x0, p.x1, p.y0, p.y1));
PLINTHS.forEach((p) => {
  const h = p.big ? [0.7, 0.45] : [0.25, 0.25];
  add(p.x - h[0], p.x + h[0], p.y - h[1], p.y + h[1]);
});
TABLES.forEach((t) => add(0, t.x1, t.y0, t.y1));
PANELS.forEach((p) => add(p.x - p.w / 2, p.x + p.w / 2, p.y - p.d / 2, p.y + p.d / 2));
ACS.forEach((a) => add(a.x - 0.25, a.x + 0.25, a.y - 0.2, a.y + 0.2));
add(20.5, 25, 13.2, 15.5); // 东南角道具区

/** 世界坐标的碰撞盒列表 {minX,maxX,minZ,maxZ} */
export const OBSTACLES = rects.map((r) => {
  const a = toWorld(r.x0, r.y0);
  const b = toWorld(r.x1, r.y1);
  return { minX: a.x, maxX: b.x, minZ: a.z, maxZ: b.z };
});

/** 可行走的外边界（世界坐标） */
export const BOUNDS = { minX: -HALL.W / 2, maxX: HALL.W / 2, minZ: -HALL.D / 2, maxZ: HALL.D / 2 };
