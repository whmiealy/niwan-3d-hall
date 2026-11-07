// =============================================================
// 粗模展厅（第二版：按新视频补全细节）：完全按 data/layout.js 用几何体搭出来
//
// 【以后换成高斯泼溅】这个文件只负责“看得见的展厅外壳”，
// 不包含展品占位、不参与点击、不参与碰撞。换模型时把 config.js 里的
// HALL_MODE 改成 'splat' 即可，展品层和走路逻辑完全不用动。
//
// 【手机性能】同一种材质的所有方块/圆柱合并成一个网格（mergeGeometries），
// 小泥塑用 InstancedMesh，整个展厅 draw call 控制在一百左右。
// =============================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  HALL, toWorld, COLORS, PLATFORM, DOOR, FLIGHT, PHOTO_COLLAGE, CLERESTORY, SOUTH_WINDOWS,
  COLUMNS, PILASTERS, PREFACE, PORTRAITS, DESK_CASES, TALL_CABS, CALLIGRAPHY_E, PLINTHS,
  WORKS_WALL, PROMO_BOARD, TABLES, WORKSHOP, PANELS, HANGINGS, ACS, PROPS_AREA,
} from '../data/layout.js';
import {
  floorTexture, bannerTexture, worksWallTexture, landscapeTexture, textPanelTexture,
  exhibitWallTexture, photoCollageTexture, calligraphyTexture, inkPaintingTexture,
  riverSoulTexture, promoBoardTexture, standeeTexture, posterTexture, graphicWallTexture,
} from './textures.js';
import { createFigurines, rod, wheel, scatter, rowOfBottles } from './details.js';

const std = (color, rough = 0.9, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

export function createProceduralHall() {
  const root = new THREE.Group();
  root.name = 'ProceduralHall';

  // ---------- 共享材质 ----------
  const M = {
    wall: std(COLORS.wall, 0.95),
    stairWall: std(COLORS.stairWall, 0.9),
    skirting: std(COLORS.skirting, 0.8),
    marble: std(COLORS.marble, 0.35),
    ceiling: std(COLORS.ceiling, 0.95),
    ceilingEdge: std(COLORS.ceilingEdge, 0.8),
    slat: std(COLORS.slat, 0.7),
    slatBack: std(0x2a1a14, 1),
    wood: std(COLORS.wood, 0.6),
    darkWood: std(0x5a4030, 0.6),
    oldWood: std(0xb08a55, 0.95),
    curtain: std(COLORS.curtain, 1),
    frame: std(COLORS.windowFrame, 0.6),
    door: std(COLORS.door, 0.5),
    doorFrame: std(COLORS.doorFrame, 0.6),
    white: std(COLORS.white, 0.5),
    cloth: std(0xffffff, 1),
    burlap: std(0xcdb48c, 1),
    step: std(0x7d7a74, 0.8),
    stepNose: std(0x5a3a2a, 0.7),
    metal: std(0xd8dde2, 0.25, { metalness: 0.85 }),
    darkMetal: std(0x3a3f44, 0.5, { metalness: 0.6 }),
    clay: std(0x8b6a4a, 0.9),
    statue: std(0xa0743e, 0.95),
    crate: std(0xa8865a, 0.9),
    cardboard: std(0xc29a62, 1),
    black: std(0x1c1c1c, 0.8),
    red: std(0xc0281f, 0.6),
    green: std(0x7bbf3a, 0.7),
    orange: std(0xf08a24, 0.7),
    blueMat: std(0x3fa9e0, 0.8),
    tricycle: std(0x4a6b8a, 0.7),
    // 玻璃：用普通透明材质，比物理玻璃省很多性能
    glass: new THREE.MeshStandardMaterial({
      color: 0xe6f6fa, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false,
    }),
    // 自发光：展柜灯带 / 窗外天光 / 柜内白底
    led: new THREE.MeshBasicMaterial({ color: 0xdff2ff }),
    caseFloor: new THREE.MeshBasicMaterial({ color: 0xf3f1ec }),
    daylight: new THREE.MeshBasicMaterial({ color: 0x9fb8cc }),
    exitSign: new THREE.MeshBasicMaterial({ color: 0x29d36a }),
  };

  // ---------- 几何体收集器：同材质合并 ----------
  const bucket = {};
  const push = (key, geo) => (bucket[key] ||= []).push(geo);

  /** 按平面坐标范围加一个方块：x0~x1（东西）, y0~y1（南北）, h0~h1（高度） */
  function box(key, x0, x1, y0, y1, h0, h1) {
    const g = new THREE.BoxGeometry(x1 - x0, h1 - h0, y1 - y0);
    const c = toWorld((x0 + x1) / 2, (y0 + y1) / 2);
    g.translate(c.x, (h0 + h1) / 2, c.z);
    push(key, g);
  }

  /**
   * 贴在墙上的面片（带独立贴图，不合并）
   * side: 'N' | 'S' | 'E' | 'W' 表示面朝哪面墙的反方向（即贴在哪面墙上，面朝室内）
   * a0~a1: 沿墙方向范围；at: 墙坐标（N/S 用 y，E/W 用 x）
   */
  function facePlane(mat, side, a0, a1, at, h0, h1) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(a1 - a0, h1 - h0), mat);
    const mid = (a0 + a1) / 2;
    const p = side === 'N' || side === 'S' ? toWorld(mid, at) : toWorld(at, mid);
    m.position.set(p.x, (h0 + h1) / 2, p.z);
    m.rotation.y = { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 }[side];
    root.add(m);
    return m;
  }
  const texMat = (map, opts = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...opts });
  const cutout = (map) => texMat(map, { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  const basicTex = (map) => new THREE.MeshBasicMaterial({ map });

  const fig = createFigurines();
  const { W, D, H, HC, slat } = HALL;

  // ================= 地面 =================
  const floorBands = [
    { x0: 3.4, x1: 25.4, y0: 2.0, y1: 3.0 },
    { x0: 3.4, x1: 20.4, y0: 13.6, y1: 14.5 },
    { x0: 6.6, x1: 7.5, y0: 2.0, y1: 14.5 },
    { x0: 15.0, x1: 15.9, y0: 3.0, y1: 13.6 },
  ];
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ map: floorTexture(W, D, floorBands, COLORS), roughness: 0.16, envMapIntensity: 1.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);
  // 地上的蓝色泡沫垫（视频里随处可见）
  box('blueMat', 12.4, 13.6, 7.6, 8.3, 0, 0.012);
  box('blueMat', 20.2, 21.0, 12.0, 12.9, 0, 0.012);

  // ================= 四面墙 =================
  const T = 0.2;
  box('wall', -T, W + T, -T, 0, 0, HC);
  box('wall', -T, W + T, D, D + T, 0, H);
  box('wall', -T, 0, 0, D, 0, H);
  box('wall', W, W + T, 0, D, 0, H);
  // 踢脚线 + 南墙腰线
  box('skirting', 0, W, 0, 0.02, 0, 0.12);
  box('skirting', 0, W, D - 0.02, D, 0, 0.12);
  box('skirting', 0, 0.02, 0, D, 0, 0.12);
  box('skirting', W - 0.02, W, 0, D, 0, 0.12);
  box('skirting', 0, W, D - 0.03, D, 1.0, 1.04);
  box('skirting', 0.02, 0.05, 0, D, 1.0, 1.04);
  // 楼梯间墙面：竖条纹暖黄墙板（北墙西段 + 西墙北段），中部深色腰线
  box('stairWall', 0, 7.0, 0, 0.03, 0, H);
  box('stairWall', 0, 0.03, 0, PLATFORM.y1 + 0.4, 0, H);
  for (let x = 0.1; x < 7.0; x += 0.12) box('stairWall', x, x + 0.03, 0.03, 0.045, PLATFORM.h, H - 0.4);
  box('skirting', 0, 7.0, 0.03, 0.05, 2.95, 2.98);

  // ================= 窗 =================
  SOUTH_WINDOWS.forEach((w) => {
    facePlane(M.daylight, 'S', w.x0, w.x1, D - 0.01, w.h0, w.h1);
    box('frame', w.x0 - 0.06, w.x1 + 0.06, D - 0.06, D, w.h0 - 0.06, w.h0);
    box('frame', w.x0 - 0.06, w.x1 + 0.06, D - 0.06, D, w.h1, w.h1 + 0.06);
    box('frame', w.x0 - 0.06, w.x0, D - 0.06, D, w.h0, w.h1);
    box('frame', w.x1, w.x1 + 0.06, D - 0.06, D, w.h0, w.h1);
    const mid = (w.x0 + w.x1) / 2;
    box('frame', mid - 0.03, mid + 0.03, D - 0.06, D, w.h0, w.h1);
    box('frame', w.x0, w.x1, D - 0.06, D, 2.3, 2.35);
    // 两侧落地窗帘：做成几道褶
    for (const [a, b] of [[w.x0 - 0.5, w.x0 + 0.15], [w.x1 - 0.15, w.x1 + 0.5]])
      for (let k = 0; k < 4; k++) {
        const x = a + ((b - a) / 4) * k;
        box('curtain', x, x + (b - a) / 4 - 0.01, D - 0.26 + (k % 2) * 0.05, D - 0.12 + (k % 2) * 0.05, 0.02, 3.35);
      }
    box('metal', w.x0 - 0.6, w.x1 + 0.6, D - 0.2, D - 0.17, 3.36, 3.39);
  });
  // 北墙高侧窗（白色铝框，三扇）
  facePlane(M.daylight, 'N', CLERESTORY.x0, CLERESTORY.x1, 0.06, CLERESTORY.h0, CLERESTORY.h1);
  box('white', CLERESTORY.x0 - 0.1, CLERESTORY.x1 + 0.1, 0, 0.12, CLERESTORY.h0 - 0.1, CLERESTORY.h0);
  box('white', CLERESTORY.x0 - 0.1, CLERESTORY.x1 + 0.1, 0, 0.1, CLERESTORY.h1, CLERESTORY.h1 + 0.1);
  for (let i = 0; i <= 3; i++) {
    const x = CLERESTORY.x0 + ((CLERESTORY.x1 - CLERESTORY.x0) / 3) * i;
    box('white', x - 0.04, x + 0.04, 0, 0.1, CLERESTORY.h0, CLERESTORY.h1);
  }

  // ================= 吊顶 =================
  box('ceiling', 0, W, 0, slat.y0, H, H + 0.1);
  box('ceiling', 0, W, slat.y1, D, H, H + 0.1);
  box('ceiling', 0, slat.x0, slat.y0, slat.y1, H, H + 0.1);
  box('ceiling', slat.x1, W, slat.y0, slat.y1, H, H + 0.1);
  box('ceilingEdge', slat.x0, slat.x1, slat.y0 - 0.04, slat.y0, H, HC);
  box('ceilingEdge', slat.x0, slat.x1, slat.y1, slat.y1 + 0.04, H, HC);
  box('ceilingEdge', slat.x0 - 0.04, slat.x0, slat.y0, slat.y1, H, HC);
  box('ceilingEdge', slat.x1, slat.x1 + 0.04, slat.y0, slat.y1, H, HC);
  box('slatBack', slat.x0, slat.x1, slat.y0, slat.y1, HC, HC + 0.05);
  for (let x = slat.x0 + 0.1; x < slat.x1; x += 0.2) box('slat', x - 0.03, x + 0.03, slat.y0, slat.y1, HC - 0.12, HC);
  // 北侧叠级横梁：一道道垂直北墙的梁，梁底金色收边
  for (let x = 1.6; x < W; x += 1.6) {
    box('ceiling', x - 0.14, x + 0.14, 0, slat.y0, H - 0.4, H);
    box('ceilingEdge', x - 0.14, x + 0.14, 0, slat.y0, H - 0.42, H - 0.4);
  }
  box('ceilingEdge', 0, W, slat.y0 - 0.3, slat.y0 - 0.26, H - 0.4, H);

  // 筒灯（实例化，一次 draw call）
  const lightsPos = [];
  for (let x = 0.8; x < W; x += 1.6) for (let y = 1.0; y < slat.y0 - 0.3; y += 1.3) lightsPos.push([x, y, H - 0.005]);
  for (let x = 1; x < W; x += 1.8)
    for (let y = slat.y1 + 0.8; y < D; y += 1.5) lightsPos.push([x, y, H - 0.005]);
  for (let y = slat.y0 + 0.8; y < slat.y1; y += 1.8) {
    for (let x = 1; x < slat.x0; x += 1.8) lightsPos.push([x, y, H - 0.005]);
    for (let x = slat.x1 + 0.8; x < W; x += 1.8) lightsPos.push([x, y, H - 0.005]);
  }
  for (let x = slat.x0 + 0.9; x < slat.x1; x += 1.8) for (let y = slat.y0 + 0.9; y < slat.y1; y += 1.8) lightsPos.push([x, y, HC - 0.125]);
  const dl = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.08, 14).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xfff6dc }),
    lightsPos.length
  );
  const mtx = new THREE.Matrix4();
  lightsPos.forEach(([x, y, h], i) => {
    const p = toWorld(x, y);
    dl.setMatrixAt(i, mtx.makeTranslation(p.x, h, p.z));
  });
  root.add(dl);

  // ================= 柱 + 柱上书法 / 画框 =================
  const couplets = ['春意盈门', '祥瑞满堂', '往者不可谏', '来者犹可追'];
  COLUMNS.forEach((c, i) => {
    const h = c.y > slat.y0 && c.y < slat.y1 ? HC : H;
    box('marble', c.x - c.s / 2, c.x + c.s / 2, c.y - c.s / 2, c.y + c.s / 2, 0, h);
    box('darkWood', c.x - c.s / 2 - 0.02, c.x + c.s / 2 + 0.02, c.y - c.s / 2 - 0.02, c.y + c.s / 2 + 0.02, 0, 0.1);
    const s = c.s / 2 + 0.012;
    if (i === 0) {
      facePlane(texMat(inkPaintingTexture(5)), 'N', c.x - 0.3, c.x + 0.3, c.y + s, 1.0, 1.85);
    } else {
      facePlane(texMat(calligraphyTexture(couplets[(i - 1) * 2])), 'N', c.x - 0.18, c.x + 0.18, c.y + s, 0.7, 2.1);
      facePlane(texMat(calligraphyTexture(couplets[(i - 1) * 2 + 1])), 'S', c.x - 0.18, c.x + 0.18, c.y - s, 0.7, 2.1);
      facePlane(texMat(inkPaintingTexture(9 + i)), 'E', c.y - 0.28, c.y + 0.28, c.x - s, 1.0, 1.8);
    }
  });
  PILASTERS.forEach((p) => box('marble', p.x0, p.x1, p.y0, p.y1, 0, H));

  // ================= 西北角：平台、楼梯、入口门 =================
  const P = PLATFORM;
  box('marble', P.x0, P.x1, P.y0, P.y1, 0, P.h - 0.05); // 平台（前脸米黄石材）
  box('step', P.x0, P.x1, P.y0, P.y1, P.h - 0.05, P.h);
  // 楼梯：沿北墙，最高一级在西
  const nS = FLIGHT.steps;
  const rise = P.h / nS;
  const run = (FLIGHT.x1 - FLIGHT.x0) / nS;
  for (let i = 0; i < nS; i++) {
    const x0 = FLIGHT.x1 - (i + 1) * run;
    box('marble', x0, x0 + run, FLIGHT.y0, FLIGHT.y1, 0, (i + 1) * rise - 0.03);
    box('step', x0, x0 + run, FLIGHT.y0, FLIGHT.y1, (i + 1) * rise - 0.03, (i + 1) * rise);
    box('stepNose', x0 - 0.01, x0 + 0.04, FLIGHT.y0, FLIGHT.y1, (i + 1) * rise - 0.04, (i + 1) * rise + 0.002);
  }
  // 不锈钢栏杆：楼梯外侧斜扶手 + 平台前沿护栏（竖杆）
  const railH = 0.95;
  push('metal', rod([FLIGHT.x1, FLIGHT.y1 - 0.05, rise + railH], [FLIGHT.x0, FLIGHT.y1 - 0.05, P.h + railH], 0.025));
  push('metal', rod([FLIGHT.x1, FLIGHT.y1 - 0.05, rise + railH * 0.5], [FLIGHT.x0, FLIGHT.y1 - 0.05, P.h + railH * 0.5], 0.012));
  for (let i = 0; i <= nS; i += 1) {
    const x = FLIGHT.x1 - i * run - run / 2;
    const base = Math.min(i + 1, nS) * rise;
    push('metal', rod([x, FLIGHT.y1 - 0.05, base], [x, FLIGHT.y1 - 0.05, base + railH], 0.012));
  }
  push('metal', rod([P.x0 + 0.05, P.y1 - 0.05, P.h + railH], [P.x1, P.y1 - 0.05, P.h + railH], 0.025));
  push('metal', rod([P.x1 - 0.05, FLIGHT.y1, P.h + railH], [P.x1 - 0.05, P.y1, P.h + railH], 0.025));
  for (let x = 0.15; x < P.x1; x += 0.13) push('metal', rod([x, P.y1 - 0.05, P.h], [x, P.y1 - 0.05, P.h + railH], 0.01));
  for (let y = FLIGHT.y1 + 0.1; y < P.y1; y += 0.13) push('metal', rod([P.x1 - 0.05, y, P.h], [P.x1 - 0.05, y, P.h + railH], 0.01));
  // 平台上的红地毯
  box('red', 0.1, 1.2, 0.6, 2.0, P.h, P.h + 0.012);
  // 入口门（西墙，深红棕双开门 + 橙棕门套）+ 两侧蓝白制度牌
  box('doorFrame', 0, 0.06, DOOR.y0 - 0.1, DOOR.y1 + 0.1, P.h, P.h + DOOR.h + 0.1);
  box('door', 0.04, 0.09, DOOR.y0, DOOR.y1, P.h, P.h + DOOR.h);
  box('metal', 0.08, 0.11, (DOOR.y0 + DOOR.y1) / 2 - 0.25, (DOOR.y0 + DOOR.y1) / 2 - 0.12, P.h + 1.0, P.h + 1.04);
  box('metal', 0.08, 0.11, (DOOR.y0 + DOOR.y1) / 2 + 0.12, (DOOR.y0 + DOOR.y1) / 2 + 0.25, P.h + 1.0, P.h + 1.04);
  facePlane(texMat(posterTexture(3)), 'W', 0.1, 0.6, 0.04, P.h + 1.3, P.h + 2.1);
  facePlane(texMat(posterTexture(8)), 'W', 2.0, 2.5, 0.04, P.h + 1.3, P.h + 2.1);
  facePlane(texMat(posterTexture(13)), 'N', 0.3, 0.8, 0.05, P.h + 1.4, P.h + 2.2);
  facePlane(texMat(posterTexture(21)), 'N', 0.9, 1.4, 0.05, P.h + 1.4, P.h + 2.2);
  // 楼梯上方照片墙
  facePlane(cutout(photoCollageTexture()), 'N', PHOTO_COLLAGE.x0, PHOTO_COLLAGE.x1, 0.06, PHOTO_COLLAGE.h0, PHOTO_COLLAGE.h1);
  // 平台顶上真人大小的泥塑人像（展品 K1 的“实物”，占位方块另在展品层）
  {
    const sx = 2.85;
    const sy = 1.95;
    const p = toWorld(sx, sy);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.9, 4, 8), M.statue);
    body.position.set(p.x, P.h + 0.75, p.z);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), M.statue);
    head.position.set(p.x, P.h + 1.5, p.z);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.08, 10), M.statue);
    hat.position.set(p.x, P.h + 1.64, p.z);
    root.add(body, head, hat);
    push('statue', rod([sx, sy, P.h + 1.2], [sx + 0.45, sy + 0.25, P.h + 1.15], 0.05)); // 伸出的手臂
  }
  // 平台下：堆放的白色展台、红色消防箱
  box('white', 0.6, 1.1, P.y1 + 0.02, P.y1 + 0.5, 0, 1.2);
  box('white', 1.15, 1.65, P.y1 + 0.02, P.y1 + 0.5, 0, 1.0);
  box('white', 1.7, 2.2, P.y1 + 0.02, P.y1 + 0.5, 0, 0.8);
  box('red', 2.3, 2.6, P.y1 + 0.02, P.y1 + 0.25, 0, 0.6);

  // ================= 北墙：前言 + 人物板 + 平柜 + 图文墙 + 横幅 =================
  box('marble', PREFACE.x0, PREFACE.x1, 0, 0.18, 0, 2.9);
  facePlane(texMat(textPanelTexture('前 言', 12)), 'N', PREFACE.x0 + 0.15, PREFACE.x1 - 0.15, 0.19, 1.0, 2.75);
  box('clay', PREFACE.x0, PREFACE.x1, 0.18, 0.55, 0, 0.35); // 下方泥塑浮雕台
  box('clay', PREFACE.x0 + 0.2, PREFACE.x1 - 0.4, 0.2, 0.45, 0.35, 0.6);
  scatter(fig, 3, PREFACE.x0 + 0.1, PREFACE.x1 - 0.1, 0.25, 0.5, 0.35, 70, { size: [0.05, 0.1] });
  PORTRAITS.forEach((p, i) => {
    if (p.side === 'N') {
      box('marble', p.a0, p.a1, 0, 0.28, 0, 3.0);
      facePlane(texMat(textPanelTexture(p.name, 4)), 'N', p.a0 + 0.04, p.a1 - 0.04, 0.29, 1.6, 2.9);
      facePlane(texMat(graphicWallTexture(60 + i, 1)), 'N', p.a0 + 0.04, p.a1 - 0.04, 0.29, 0.05, 1.55);
    } else {
      box('wood', 25.4, W, p.a0, p.a1, 0, 2.6);
      facePlane(texMat(textPanelTexture(p.name, 6)), 'E', p.a0 + 0.04, p.a1 - 0.04, 25.39, 0.2, 2.5);
    }
  });
  facePlane(texMat(exhibitWallTexture(3, '王蓝田 · 泥咕咕')), 'N', 9.9, 19.5, 0.02, 1.05, 2.65);
  facePlane(texMat(exhibitWallTexture(9, '王学锋 · 传承')), 'N', 20.1, 25.4, 0.02, 1.05, 2.65);
  facePlane(basicTex(bannerTexture('泥玩世家——王蓝田祖孙三代展', COLORS.banner, COLORS.bannerText)), 'N', 10.4, 24.6, 0.03, 2.8, 3.45);
  DESK_CASES.forEach((c, i) => {
    box('wood', c.x0 + 0.02, c.x1 - 0.02, c.y0, c.y1, 0, 0.8);
    for (const sx of [c.x0 + 0.65, c.x1 - 0.65]) box('darkWood', sx - 0.005, sx + 0.005, c.y1 - 0.01, c.y1 + 0.005, 0.05, 0.75); // 柜门缝
    box('caseFloor', c.x0 + 0.06, c.x1 - 0.06, c.y0 + 0.04, c.y1 - 0.04, 0.8, 0.805);
    box('led', c.x0 + 0.06, c.x1 - 0.06, c.y0 + 0.02, c.y0 + 0.05, 0.8, 1.04);
    box('glass', c.x0 + 0.02, c.x1 - 0.02, c.y0, c.y1, 0.805, 1.05);
    box('metal', c.x0 + 0.02, c.x1 - 0.02, c.y1 - 0.015, c.y1, 1.03, 1.05);
    // 柜内泥塑由 ExhibitLayer 摆真实模型；这里只留白色说明卡
    for (let k = 0; k < 3; k++) fig.add('card', c.x0 + 0.35 + k * 0.6, c.y1 - 0.12, 0.805, [0.08, 0.06, 0.08], 0xffffff);
  });

  // ================= 东墙：高展柜 + 山水背景 =================
  facePlane(texMat(landscapeTexture()), 'E', 1, 15, W - 0.02, 2.4, H);
  TALL_CABS.forEach((c, i) => {
    box('wood', c.x0, c.x1, c.y0 + 0.02, c.y1 - 0.02, 0, 0.9);
    for (let k = 0; k < 2; k++) {
      const ym = c.y0 + 0.02 + ((c.y1 - c.y0 - 0.04) / 2) * k;
      box('darkWood', c.x0 - 0.005, c.x0 + 0.002, ym + 0.02, ym + 0.03, 0.05, 0.85); // 柜门缝
      box('metal', c.x0 - 0.02, c.x0, ym + 0.08, ym + 0.14, 0.75, 0.77);
    }
    box('wood', c.x0, c.x1, c.y0 + 0.02, c.y1 - 0.02, 2.3, 2.4);
    box('wood', c.x0, c.x1, c.y0, c.y0 + 0.06, 0.9, 2.3);
    box('wood', c.x0, c.x1, c.y1 - 0.06, c.y1, 0.9, 2.3);
    box('led', c.x0 + 0.1, c.x1 - 0.05, c.y0 + 0.1, c.y1 - 0.1, 2.295, 2.3);
    box('caseFloor', c.x0 + 0.02, c.x1 - 0.02, c.y0 + 0.06, c.y1 - 0.06, 0.9, 0.905);
    box('glass', c.x0, c.x0 + 0.02, c.y0 + 0.06, c.y1 - 0.06, 0.9, 2.3);
    box('glass', c.x0 + 0.05, c.x1 - 0.05, c.y0 + 0.06, c.y1 - 0.06, 1.55, 1.57);
    box('white', c.x0 + 0.25, c.x1 - 0.08, c.y0 + 0.12, c.y1 - 0.12, 0.905, 1.0); // 底层小台阶（后排物品站在上面）
    facePlane(texMat(exhibitWallTexture(20 + i)), 'E', c.y0 + 0.06, c.y1 - 0.06, c.x1 - 0.01, 1.57, 2.3);
    facePlane(texMat(graphicWallTexture(30 + i, 3)), 'E', c.y0 + 0.06, c.y1 - 0.06, c.x1 - 0.01, 0.9, 1.55);
    // 柜内泥塑由 ExhibitLayer 摆真实模型
  });
  box('marble', 25.4, W, CALLIGRAPHY_E.y0, CALLIGRAPHY_E.y1, 0, 2.6);
  facePlane(texMat(calligraphyTexture('王宝瑞')), 'E', CALLIGRAPHY_E.y0 + 0.2, CALLIGRAPHY_E.y1 - 0.2, 25.39, 0.6, 2.4);

  // ================= 西墙：作品墙 + 横幅 + 摊位桌 + 宣传板 =================
  facePlane(texMat(worksWallTexture()), 'W', WORKS_WALL.y0, WORKS_WALL.y1, 0.02, 0.8, 3.0);
  facePlane(basicTex(bannerTexture('保护传承非遗  赓续历史文脉', COLORS.banner, COLORS.bannerText)), 'W', 4.5, 13.5, 0.03, 3.1, 3.65);
  TABLES.forEach((t, i) => {
    box('cloth', t.x0, t.x1, t.y0, t.y1, 0, 0.75);
    box('burlap', t.x0 + 0.05, t.x1 + 0.02, t.y0 + 0.1, t.y1 - 0.1, 0.75, 0.758); // 麻布桌旗
    box('wood', t.x0 + 0.05, t.x0 + 0.3, t.y0 + 0.3, t.y1 - 0.3, 0.758, 0.95); // 后排木质小阶梯架
    box('wood', t.x0 + 0.05, t.x0 + 0.18, t.y0 + 0.3, t.y1 - 0.3, 0.95, 1.12);
    // 黑色小相框（摆在桌面上一排排）
    for (let k = 0; k < 6; k++) box('black', t.x0 + 0.42, t.x0 + 0.58, t.y0 + 0.2 + k * 0.33, t.y0 + 0.36 + k * 0.33, 0.758, 0.775);
    scatter(fig, 200 + i, t.x0 + 0.35, t.x1 - 0.05, t.y0 + 0.1, t.y1 - 0.1, 0.758, 70);
    scatter(fig, 220 + i, t.x0 + 0.08, t.x0 + 0.28, t.y0 + 0.3, t.y1 - 0.3, 0.95, 14, { size: [0.05, 0.09] });
    scatter(fig, 240 + i, t.x0 + 0.07, t.x0 + 0.16, t.y0 + 0.3, t.y1 - 0.3, 1.12, 10, { size: [0.05, 0.08] });
  });
  // 南段宣传板 + 卡通男孩立牌
  box('darkWood', 0, 0.06, PROMO_BOARD.y0, PROMO_BOARD.y1, 0.7, 2.9);
  facePlane(texMat(promoBoardTexture()), 'W', PROMO_BOARD.y0 + 0.05, PROMO_BOARD.y1 - 0.05, 0.065, 0.75, 2.85);
  facePlane(cutout(standeeTexture('boy')), 'W', PROMO_BOARD.y0 + 0.2, PROMO_BOARD.y0 + 1.0, 0.5, 0.5, 2.1);

  // ================= 工作区：木桌、白椅、黑色摄影棚、柔光箱 =================
  const J = WORKSHOP;
  box('darkWood', J.x0 + 0.6, J.x1 - 0.6, J.y0 + 1.0, J.y0 + 1.8, 0.72, 0.76);
  for (const [lx, ly] of [[J.x0 + 0.65, J.y0 + 1.05], [J.x1 - 0.65, J.y0 + 1.05], [J.x0 + 0.65, J.y0 + 1.75], [J.x1 - 0.65, J.y0 + 1.75]])
    box('darkWood', lx - 0.03, lx + 0.03, ly - 0.03, ly + 0.03, 0, 0.72);
  box('black', J.x0 + 1.0, J.x0 + 1.9, J.y0 + 0.4, J.y0 + 1.0, 0.76, 1.6); // 黑色摄影棚
  box('white', J.x0 + 2.0, J.x0 + 2.7, J.y0 + 0.6, J.y0 + 0.62, 1.0, 1.9); // 柔光箱
  push('darkMetal', rod([J.x0 + 2.35, J.y0 + 0.65, 0], [J.x0 + 2.35, J.y0 + 0.65, 1.0], 0.012));
  scatter(fig, 300, J.x0 + 0.7, J.x1 - 0.7, J.y0 + 1.1, J.y0 + 1.7, 0.76, 18, { size: [0.04, 0.09] });
  const chairs = [[J.x0 + 0.9, J.y0 + 2.3, 'green'], [J.x0 + 1.8, J.y0 + 2.4, 'orange'], [J.x0 + 2.7, J.y0 + 2.3, 'green'], [J.x0 + 0.2, J.y0 + 1.4, 'green'], [J.x1 - 0.1, J.y0 + 1.4, 'orange']];
  chairs.forEach(([cx, cy, col]) => {
    box(col, cx - 0.22, cx + 0.22, cy - 0.22, cy + 0.22, 0.44, 0.48);
    box('white', cx - 0.22, cx + 0.22, cy + 0.18, cy + 0.24, 0.48, 0.95);
    for (const [dx, dy] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]])
      push('metal', rod([cx + dx, cy + dy, 0], [cx + dx, cy + dy, 0.44], 0.01));
  });

  // ================= 中部：独立展台 + 玻璃罩 + 罩内泥塑 =================
  PLINTHS.forEach((p, i) => {
    const [hw, hd, base, hood] = p.big ? [0.7, 0.45, 0.4, 0.9] : [0.25, 0.25, 1.0, 0.5];
    box('white', p.x - hw, p.x + hw, p.y - hd, p.y + hd, 0, base);
    box('red', p.x - 0.02, p.x + 0.02, p.y + hd, p.y + hd + 0.005, base - 0.15, base - 0.11); // 红色指示灯
    box('glass', p.x - hw + 0.02, p.x + hw - 0.02, p.y - hd + 0.02, p.y + hd - 0.02, base, base + hood);
    box('metal', p.x - hw + 0.02, p.x + hw - 0.02, p.y - hd + 0.02, p.y + hd - 0.02, base + hood - 0.01, base + hood);
    scatter(fig, 400 + i, p.x - hw + 0.12, p.x + hw - 0.12, p.y - hd + 0.12, p.y + hd - 0.12, base, p.big ? 7 : 3, {
      shapes: ['animal', 'bottle'], size: p.big ? [0.1, 0.2] : [0.08, 0.14],
    });
  });

  // 落地画框（深棕边框水墨画，带支脚）
  PANELS.forEach((p, i) => {
    box('darkWood', p.x - p.w / 2, p.x + p.w / 2, p.y - p.d / 2, p.y + p.d / 2, 0.3, 2.0);
    facePlane(texMat(inkPaintingTexture(30 + i)), 'N', p.x - p.w / 2 + 0.05, p.x + p.w / 2 - 0.05, p.y + p.d / 2 + 0.005, 0.35, 1.95);
    facePlane(texMat(calligraphyTexture('翰墨')), 'S', p.x - 0.2, p.x + 0.2, p.y - p.d / 2 - 0.005, 0.6, 1.8);
    box('darkWood', p.x - p.w / 2, p.x - p.w / 2 + 0.06, p.y - 0.25, p.y + 0.25, 0, 0.3);
    box('darkWood', p.x + p.w / 2 - 0.06, p.x + p.w / 2, p.y - 0.25, p.y + 0.25, 0, 0.3);
  });

  // 吊挂长卷“大河之魂”（双面可见），顶端木杆 + 吊线
  HANGINGS.forEach((g) => {
    facePlane(texMat(riverSoulTexture(g.i), { side: THREE.DoubleSide }), 'N', g.x0, g.x1, g.y, 1.5, 4.0);
    box('darkWood', g.x0 - 0.05, g.x1 + 0.05, g.y - 0.025, g.y + 0.025, 4.0, 4.05);
    box('darkWood', g.x0 - 0.03, g.x1 + 0.03, g.y - 0.02, g.y + 0.02, 1.47, 1.5);
    push('metal', rod([g.x0 + 0.1, g.y, 4.05], [g.x0 + 0.1, g.y, H - 0.4], 0.004, 3));
    push('metal', rod([g.x1 - 0.1, g.y, 4.05], [g.x1 - 0.1, g.y, H - 0.4], 0.004, 3));
  });

  // 柜式空调（白色，带出风口格栅）
  ACS.forEach((a) => {
    box('white', a.x - 0.25, a.x + 0.25, a.y - 0.18, a.y + 0.18, 0, 1.8);
    box('skirting', a.x - 0.18, a.x + 0.18, a.y - 0.185, a.y + 0.185, 1.3, 1.6);
  });
  // 绿色安全出口指示灯
  box('exitSign', 0.03, 0.06, 13.0, 13.35, 0.35, 0.5);
  box('exitSign', 25.94, 25.97, 14.6, 14.95, 0.35, 0.5);

  // ================= 东南角道具区：三轮车、自行车、旧木柜、大娃娃立牌、纸箱 =================
  const L = PROPS_AREA;
  // 三轮板车：车斗木箱里摆满黑色泥塑
  const tx = 22.4;
  const ty = 14.3;
  box('oldWood', tx - 0.7, tx + 0.7, ty - 0.45, ty + 0.45, 0.5, 0.56);
  box('oldWood', tx - 0.7, tx + 0.7, ty - 0.45, ty - 0.41, 0.56, 0.75);
  box('oldWood', tx - 0.7, tx + 0.7, ty + 0.41, ty + 0.45, 0.56, 0.75);
  box('oldWood', tx - 0.7, tx - 0.66, ty - 0.45, ty + 0.45, 0.56, 0.75);
  box('oldWood', tx + 0.66, tx + 0.7, ty - 0.45, ty + 0.45, 0.56, 0.75);
  box('tricycle', tx - 0.75, tx + 0.75, ty - 0.48, ty + 0.48, 0.44, 0.5);
  push('darkMetal', wheel(tx + 0.2, ty - 0.55, 0.3, true));
  push('darkMetal', wheel(tx + 0.2, ty + 0.55, 0.3, true));
  push('darkMetal', wheel(tx - 1.6, ty, 0.3, true));
  push('tricycle', rod([tx - 0.75, ty, 0.5], [tx - 1.6, ty, 0.3], 0.025));
  push('tricycle', rod([tx - 1.35, ty, 0.42], [tx - 1.35, ty, 0.85], 0.02));
  push('black', rod([tx - 1.45, ty - 0.1, 0.88], [tx - 1.25, ty + 0.1, 0.88], 0.04));
  push('tricycle', rod([tx - 1.6, ty, 0.3], [tx - 1.55, ty, 1.0], 0.02));
  push('darkMetal', rod([tx - 1.55, ty - 0.3, 1.0], [tx - 1.55, ty + 0.3, 1.0], 0.015));
  scatter(fig, 500, tx - 0.6, tx + 0.6, ty - 0.35, ty + 0.35, 0.56, 55, { shapes: ['bottle', 'animal'], size: [0.08, 0.14], colors: [0x1c1c1c, 0x222222, 0x1c1c1c, 0xb8322a, 0xe0a83a] });
  box('white', tx + 0.3, tx + 0.65, ty - 0.4, ty - 0.38, 0.75, 1.0); // 车上说明牌
  // 老式自行车
  const bx = 21.4;
  const by = 15.3;
  push('darkMetal', wheel(bx - 0.5, by, 0.33, true));
  push('darkMetal', wheel(bx + 0.5, by, 0.33, true));
  push('darkMetal', rod([bx - 0.5, by, 0.33], [bx, by, 0.35], 0.018));
  push('darkMetal', rod([bx, by, 0.35], [bx + 0.5, by, 0.33], 0.018));
  push('darkMetal', rod([bx - 0.25, by, 0.8], [bx + 0.35, by, 0.82], 0.018));
  push('darkMetal', rod([bx, by, 0.35], [bx - 0.25, by, 0.8], 0.018));
  push('darkMetal', rod([bx + 0.5, by, 0.33], [bx + 0.4, by, 0.95], 0.018));
  push('darkMetal', rod([bx + 0.4, by - 0.25, 0.97], [bx + 0.4, by + 0.25, 0.97], 0.014));
  push('black', rod([bx - 0.32, by, 0.84], [bx - 0.18, by, 0.84], 0.05));
  // 旧木柜（摆着泥坯圆片）
  box('oldWood', 24.2, 25.1, 13.2, 13.9, 0, 0.75);
  box('darkWood', 24.25, 25.05, 13.9, 13.92, 0.4, 0.42);
  scatter(fig, 520, 24.3, 25.0, 13.3, 13.8, 0.75, 30, { shapes: ['flat'], size: [0.05, 0.08], colors: [0xcbb48a, 0xd8c39c, 0xbfa57a] });
  scatter(fig, 530, 23.2, 24.2, 13.3, 14.0, 0, 50, { shapes: ['flat'], size: [0.05, 0.08], colors: [0xcbb48a, 0xd8c39c, 0xbfa57a, 0x2a2a2a, 0xb8322a] });
  // 大娃娃立牌 + 纸箱
  facePlane(cutout(standeeTexture('doll')), 'N', 23.6, 24.6, 15.3, 0, 1.9);
  box('cardboard', 20.7, 21.3, 13.3, 13.8, 0, 0.45);
  box('cardboard', 20.8, 21.2, 13.4, 13.7, 0.45, 0.75);
  box('crate', 25.2, 25.8, 14.0, 14.6, 0, 0.5);
  void L;
  // 三轮车上：戴金帽的老虎泥塑（金帽）、获奖证书板、小鼓
  scatter(fig, 510, tx - 0.55, tx + 0.55, ty - 0.3, ty + 0.3, 0.7, 20, { shapes: ['flat'], size: [0.05, 0.07], colors: [0xd4a017, 0xe0b52a] });
  box('white', tx - 0.65, tx - 0.15, ty - 0.42, ty - 0.4, 0.75, 1.15);
  box('red', tx - 0.63, tx - 0.17, ty - 0.425, ty - 0.42, 0.77, 1.13);
  push('oldWood', rod([tx + 0.45, ty + 0.2, 0.62], [tx + 0.45, ty + 0.2, 0.72], 0.14, 12));

  // ================= 第三段视频补充的细节 =================
  // C3 平柜里的旧木托盘（泥塑工具：竹签、刻刀）
  {
    const c = DESK_CASES[2];
    box('oldWood', c.x0 + 0.5, c.x1 - 0.5, c.y0 + 0.15, c.y1 - 0.15, 0.805, 0.86);
    for (let k = 0; k < 9; k++) {
      const x = c.x0 + 0.62 + k * 0.07;
      push(k % 3 ? 'oldWood' : 'tricycle', rod([x, c.y0 + 0.25, 0.87], [x, c.y1 - 0.25, 0.87], 0.008, 4));
    }
  }
  // C1、C2 平柜里竖着的手写证书
  box('white', DESK_CASES[0].x0 + 1.2, DESK_CASES[0].x0 + 1.55, 0.35, 0.37, 0.805, 1.0);
  box('white', DESK_CASES[1].x0 + 0.2, DESK_CASES[1].x0 + 0.55, 0.35, 0.37, 0.805, 1.0);
  // 大号玻璃柜 E5 里：5 个白瓷碗装着泥料（原料展示）
  {
    const p = PLINTHS[4];
    const bowl = new THREE.LatheGeometry([[0, 0], [0.09, 0], [0.15, 0.06], [0.17, 0.07]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
    [[-0.4, -0.15], [0, -0.2], [0.4, -0.15], [-0.2, 0.18], [0.25, 0.18]].forEach(([dx, dy], k) => {
      const g = bowl.clone();
      const w = toWorld(p.x + dx, p.y + dy);
      g.translate(w.x, 0.4, w.z);
      push('white', g);
      scatter(fig, 600 + k, p.x + dx - 0.08, p.x + dx + 0.08, p.y + dy - 0.08, p.y + dy + 0.08, 0.42, 6, {
        shapes: ['flat', 'animal'], size: [0.04, 0.07], colors: [0x9c7a55, 0xb08a60, 0x8a6a48, 0xc9b08a],
      });
    });
  }
  // “薪火相传”大幅书法画框（挂在西侧柱的西面，正对摊位桌）
  {
    const c = COLUMNS[1];
    facePlane(texMat(calligraphyTexture('薪火相传')), 'W', c.y - 0.3, c.y + 0.3, c.x - c.s / 2 - 0.012, 0.6, 2.6);
  }
  // 东南窗边的曲线木博古架，摆着纸扎龙头、小泥塑、葫芦
  {
    const x0 = 18.4;
    const x1 = 19.2;
    const y0 = 15.2;
    const y1 = 15.75;
    box('oldWood', x0, x0 + 0.04, y0, y1, 0, 1.9);
    box('oldWood', x1 - 0.04, x1, y0, y1, 0, 1.9);
    [0.05, 0.55, 1.05, 1.5, 1.88].forEach((h) => box('oldWood', x0, x1, y0, y1, h, h + 0.03));
    scatter(fig, 700, x0 + 0.1, x1 - 0.1, y0 + 0.1, y1 - 0.1, 0.58, 4, { size: [0.06, 0.1] });
    scatter(fig, 710, x0 + 0.1, x1 - 0.1, y0 + 0.1, y1 - 0.1, 1.08, 4, { size: [0.06, 0.1] });
    // 纸扎龙头（红蓝彩色，简化成几块彩色体）
    box('red', x0 + 0.15, x0 + 0.6, y0 + 0.1, y0 + 0.4, 1.53, 1.75);
    box('blueMat', x0 + 0.5, x0 + 0.7, y0 + 0.12, y0 + 0.38, 1.6, 1.82);
    push('oldWood', rod([x0 + 0.35, y0 + 0.25, 0.58], [x0 + 0.35, y0 + 0.25, 0.75], 0.07, 10)); // 葫芦
  }
  // 南窗台上的立体纸雕山水
  facePlane(cutout(landscapeTexture()), 'S', 21.9, 23.1, D - 0.15, 0.92, 1.35);
  facePlane(cutout(landscapeTexture()), 'S', 22.3, 23.6, D - 0.08, 0.92, 1.25);
  box('white', 21.8, 23.7, D - 0.25, D - 0.02, 0.9, 0.92);

  // ---------- 合并同材质几何体 ----------
  for (const [key, geos] of Object.entries(bucket)) {
    const merged = mergeGeometries(
      geos.map((g) => (g.index ? g.toNonIndexed() : g)),
      false
    );
    geos.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, M[key]);
    mesh.name = `hall_${key}`;
    if (key === 'glass') mesh.renderOrder = 2;
    root.add(mesh);
  }
  fig.build(root);

  // 展厅外壳是静态的，关掉自动矩阵更新省一点 CPU
  root.updateMatrixWorld(true);
  root.traverse((o) => (o.matrixAutoUpdate = false));

  return {
    root,
    dispose() {
      root.traverse((o) => {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          m?.map?.dispose();
          m?.dispose();
        });
      });
    },
  };
}
