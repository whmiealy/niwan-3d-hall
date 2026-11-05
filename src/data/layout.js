// =============================================================
// 展厅布局数据（第二版：按新视频 0G6A5533.MP4 校正并补全细节）
// 与 docs/layout.md、docs/floorplan.svg 一一对应
//
// 平面坐标（单位 米）：原点 = 西北角地面，x 向东，y 向南
// 3D 世界坐标：原点 = 展厅中心地面，X 向东，Z 向南，Y 向上
//   世界 X = x - 13，世界 Z = y - 8
//
// 这份数据同时被两处使用：
//   1. ProceduralHall（代码搭的粗模展厅）用它画几何体
//   2. 碰撞/可行走区域（OBSTACLES）——与展厅模型无关，
//      以后换成高斯泼溅模型时，走路和碰撞仍然用这份数据
// =============================================================

export const HALL = {
  W: 26, // 东西长
  D: 16, // 南北宽
  H: 4.2, // 周边吊顶高
  HC: 4.8, // 中央木格栅吊顶高
  slat: { x0: 6.5, x1: 22, y0: 4.6, y1: 13 }, // 中央木格栅范围
};

/** 平面坐标 → 世界坐标 */
export const toWorld = (x, y) => ({ x: x - HALL.W / 2, z: y - HALL.D / 2 });

// 颜色（取自视频）
export const COLORS = {
  wall: 0xe9d49a,
  stairWall: 0xe0bc68,
  skirting: 0x5a4636,
  marble: 0xe8dcc2,
  floor: '#E4DACB',
  floorBand: '#B4B9C2',
  ceiling: 0xf0dfa8,
  ceilingEdge: 0xd6b055,
  slat: 0x6b3a2a,
  wood: 0xdcbfa6,
  curtain: 0x7a685a,
  windowFrame: 0x2f4a3a,
  door: 0x4e1f1b,
  doorFrame: 0xa85a2c,
  white: 0xf6f6f2,
  banner: '#C8201C',
  bannerText: '#FFD84A',
};

// ---------------- 西北角：入口平台 + 沿北墙的楼梯 ----------------
// 平台高约 1.35m，入口门开在西墙；楼梯沿北墙从平台往东下到大厅
export const PLATFORM = { x0: 0, x1: 3.2, y0: 0, y1: 2.6, h: 1.35 };
export const DOOR = { y0: 0.7, y1: 1.9, h: 2.1 }; // 西墙上，平台高度起算
export const FLIGHT = { x0: 3.2, x1: 6.4, y0: 0, y1: 1.4, steps: 8 }; // 最高一级在西
export const PHOTO_COLLAGE = { x0: 3.0, x1: 7.0, h0: 1.6, h1: 2.9 }; // 楼梯上方北墙照片墙
export const CLERESTORY = { x0: 2.0, x1: 6.6, h0: 3.0, h1: 3.6 }; // 北墙高侧窗

// 南墙窗（中心 x），宽 2.4，窗台 0.9，窗顶 2.9
export const SOUTH_WINDOWS = [4, 10, 17, 23].map((c) => ({ x0: c - 1.2, x1: c + 1.2, h0: 0.9, h1: 2.9 }));

// 独立柱（米黄仿大理石，柱身挂书法条幅 / 水墨画框）
export const COLUMNS = [
  { x: 14.5, y: 4.4, s: 0.7 },
  { x: 9.5, y: 9.0, s: 0.7 },
  { x: 17.5, y: 9.0, s: 0.7 },
];
export const PILASTERS = [
  { x0: 6.7, x1: 7.3, y0: 15.6, y1: 16 },
  { x0: 13.2, x1: 13.8, y0: 15.6, y1: 16 },
  { x0: 20, x1: 20.6, y0: 15.6, y1: 16 },
];

// ---------------- 北墙展线 ----------------
export const PREFACE = { x0: 6.6, x1: 9.0 }; // 前言墙（下方泥塑浮雕台）
export const PORTRAITS = [
  { name: '王蓝田', side: 'N', a0: 9.0, a1: 9.9 },
  { name: '王学锋', side: 'N', a0: 19.5, a1: 20.1 },
  { name: '王宝瑞', side: 'E', a0: 10.3, a1: 11.1 },
];
// C：北墙平柜（每节 1.9 × 0.8，柜体高 0.8 + 玻璃 0.25）
export const DESK_CASES = [10.0, 11.9, 13.8, 15.7, 17.6, 20.1, 22.0].map((x0, i) => ({
  id: `C${i + 1}`, x0, x1: x0 + 1.9, y0: 0.2, y1: 1.0,
}));

// D：东墙高展柜（每节 2.0 × 0.6，高 2.4）
export const TALL_CABS = [
  [1.5, 3.5],
  [3.5, 5.5],
  [5.5, 7.5],
  [8.3, 10.3],
  [11.1, 13.1],
].map(([y0, y1], i) => ({ id: `D${i + 1}`, x0: 25.4, x1: 26, y0, y1 }));
export const CALLIGRAPHY_E = { y0: 7.5, y1: 8.3 };

// E：独立展台 + 玻璃罩（big = 大号玻璃柜）
export const PLINTHS = [
  [11.2, 6.2],
  [13.6, 6.6],
  [16.2, 6.0],
  [19.5, 6.4],
  [21.5, 9.6, true],
  [13.8, 10.4],
  [18.8, 11.6, true],
  [11.5, 12.0],
  [8.0, 12.2],
  [7.8, 7.4],
].map(([x, y, big], i) => ({ id: `E${i + 1}`, x, y, big: !!big }));

// ---------------- 西墙：作品墙 + 摊位桌 + 宣传板 ----------------
export const WORKS_WALL = { y0: 3.2, y1: 11.0 };
export const PROMO_BOARD = { y0: 11.4, y1: 15.2 }; // “黄河泥咕咕玩具”宣传板 + 卡通人物立牌
// I：白布长桌（铺麻布桌旗，摆满小作品）
export const TABLES = [3.4, 5.9, 8.4, 11.6].map((y0, i) => ({ id: `I${i + 1}`, x0: 0.4, x1: 1.3, y0, y1: y0 + 2.3 }));
// J：工作区（木桌、白椅、黑色摄影棚）
export const WORKSHOP = { x0: 2.6, x1: 6.0, y0: 9.6, y1: 13.2 };

// F：落地画框（深棕边框的水墨画）
export const PANELS = [
  { x: 8.2, y: 5.2, w: 1.0, d: 0.12 },
  { x: 16.0, y: 12.6, w: 1.0, d: 0.12 },
];
// G：吊挂长卷“大河之魂”（从顶上垂下）
export const HANGINGS = [9.6, 10.7, 11.8, 12.9].map((x, i) => ({ x0: x - 0.45, x1: x + 0.45, y: 4.2, i }));

// 柜式空调
export const ACS = [
  { x: 7.8, y: 15.5 },
  { x: 19.4, y: 15.5 },
  { x: 2.8, y: 3.0 },
];
// L：东南角道具区（三轮车、自行车、旧木柜、大娃娃立牌、纸箱）
export const PROPS_AREA = { x0: 20.6, x1: 25.2, y0: 13.0, y1: 15.6 };

// =============================================================
// 碰撞区域（平面坐标的矩形，与展厅模型无关）
// =============================================================
const rects = [];
const add = (x0, x1, y0, y1) => rects.push({ x0, x1, y0, y1 });
add(PLATFORM.x0, PLATFORM.x1, PLATFORM.y0, PLATFORM.y1 + 0.6); // 平台 + 下方堆放的展台（粗版不做上楼）
add(FLIGHT.x0, FLIGHT.x1, FLIGHT.y0, FLIGHT.y1);
add(PREFACE.x0, 9.9, 0, 0.6);
DESK_CASES.forEach((c) => add(c.x0, c.x1, 0, c.y1));
add(19.5, 20.1, 0, 0.4);
TALL_CABS.forEach((c) => add(c.x0, c.x1, c.y0, c.y1));
add(25.4, 26, CALLIGRAPHY_E.y0, CALLIGRAPHY_E.y1);
add(25.4, 26, 10.3, 11.1);
COLUMNS.forEach((c) => add(c.x - c.s / 2, c.x + c.s / 2, c.y - c.s / 2, c.y + c.s / 2));
PILASTERS.forEach((p) => add(p.x0, p.x1, p.y0, p.y1));
PLINTHS.forEach((p) => {
  const h = p.big ? [0.7, 0.45] : [0.25, 0.25];
  add(p.x - h[0], p.x + h[0], p.y - h[1], p.y + h[1]);
});
TABLES.forEach((t) => add(0, t.x1, t.y0, t.y1));
add(0, 0.5, PROMO_BOARD.y0, PROMO_BOARD.y1);
add(WORKSHOP.x0 + 0.4, WORKSHOP.x1 - 0.4, WORKSHOP.y0 + 0.5, WORKSHOP.y1 - 0.4);
PANELS.forEach((p) => add(p.x - p.w / 2, p.x + p.w / 2, p.y - 0.25, p.y + 0.25));
ACS.forEach((a) => add(a.x - 0.25, a.x + 0.25, a.y - 0.2, a.y + 0.2));
add(PROPS_AREA.x0, PROPS_AREA.x1, PROPS_AREA.y0, PROPS_AREA.y1);

/** 世界坐标的碰撞盒列表 {minX,maxX,minZ,maxZ} */
export const OBSTACLES = rects.map((r) => {
  const a = toWorld(r.x0, r.y0);
  const b = toWorld(r.x1, r.y1);
  return { minX: a.x, maxX: b.x, minZ: a.z, maxZ: b.z };
});

/** 可行走的外边界（世界坐标） */
export const BOUNDS = { minX: -HALL.W / 2, maxX: HALL.W / 2, minZ: -HALL.D / 2, maxZ: HALL.D / 2 };
