// =============================================================
// 粗模展厅：完全按 data/layout.js 用简单几何体搭出来
//
// 【以后换成高斯泼溅】这个文件只负责“看得见的展厅外壳”，
// 不包含展品、不参与点击、不参与碰撞。换模型时把 config.js 里的
// HALL_MODE 改成 'splat' 即可，展品层和走路逻辑完全不用动。
//
// 【手机性能】同一种材质的所有方块会合并成一个网格（mergeGeometries），
// 整个展厅只有几十次 draw call。
// =============================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  HALL, toWorld, COLORS, STAIR, SOUTH_WINDOWS, CLERESTORY, COLUMNS, PILASTERS,
  DESK_CASES, TALL_CABS, PLINTHS, TABLES, PANELS, HANGINGS, ACS,
} from '../data/layout.js';
import {
  floorTexture, bannerTexture, graphicWallTexture, worksWallTexture,
  landscapeTexture, hangingPaintingTexture, textPanelTexture,
} from './textures.js';

const std = (color, rough = 0.9, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

export function createProceduralHall() {
  const root = new THREE.Group();
  root.name = 'ProceduralHall';

  // ---------- 共享材质 ----------
  const M = {
    wall: std(COLORS.wall, 0.95),
    stairWall: std(COLORS.stairWall, 0.9),
    skirting: std(COLORS.skirting, 0.8),
    marble: std(COLORS.marble, 0.4),
    ceiling: std(COLORS.ceiling, 0.95),
    ceilingEdge: std(COLORS.ceilingEdge, 0.8),
    slat: std(COLORS.slat, 0.7),
    slatBack: std(0x2a1a14, 1),
    wood: std(COLORS.wood, 0.6),
    curtain: std(COLORS.curtain, 1),
    frame: std(COLORS.windowFrame, 0.6),
    door: std(COLORS.door, 0.5),
    doorFrame: std(COLORS.doorFrame, 0.6),
    white: std(COLORS.white, 0.5),
    cloth: std(0xffffff, 1),
    step: std(0x8d8b86, 0.8),
    metal: std(0xd8dde2, 0.25, { metalness: 0.8 }),
    clay: std(0x8b6a4a, 0.9),
    crate: std(0xa8865a, 0.9),
    // 玻璃：用普通透明材质，比物理玻璃省很多性能
    glass: new THREE.MeshStandardMaterial({
      color: 0xe6f6fa, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false,
    }),
    // 展柜灯带 / 窗外日光：不受光照影响的自发光
    led: new THREE.MeshBasicMaterial({ color: 0xdff2ff }),
    daylight: new THREE.MeshBasicMaterial({ color: 0xcfe2ee }),
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
   * side: 'N' | 'S' | 'E' | 'W' 表示贴在哪面墙上（面朝室内）
   * a0~a1: 沿墙方向的范围；at: 离原点的墙坐标（N/S 用 y，E/W 用 x）
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
  const texMat = (map, rough = 0.9) => new THREE.MeshStandardMaterial({ map, roughness: rough });

  const { W, D, H, HC, slat } = HALL;

  // ================= 地面 =================
  const floorBands = [
    { x0: 1.8, x1: 25.8, y0: 1.6, y1: 2.8 },
    { x0: 1.8, x1: 19.8, y0: 13.2, y1: 14.2 },
    { x0: 6.6, x1: 7.6, y0: 1.6, y1: 14.2 },
  ];
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({
      map: floorTexture(W, D, floorBands, COLORS), roughness: 0.18, metalness: 0, envMapIntensity: 0.9,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);

  // ================= 四面墙 =================
  const T = 0.2;
  box('wall', -T, W + T, -T, 0, 0, H); // 北
  box('wall', -T, W + T, D, D + T, 0, H); // 南
  box('wall', -T, 0, 0, D, 0, H); // 西
  box('wall', W, W + T, 0, D, 0, H); // 东
  // 踢脚线
  box('skirting', 0, W, 0, 0.02, 0, 0.12);
  box('skirting', 0, W, D - 0.02, D, 0, 0.12);
  box('skirting', 0, 0.02, 0, D, 0, 0.12);
  box('skirting', W - 0.02, W, 0, D, 0, 0.12);
  // 墙面中部腰线（视频里墙面有一道深色分隔线）
  box('skirting', 0, W, D - 0.03, D, 1.0, 1.04);
  // 楼梯间的竖条纹黄色墙板
  box('stairWall', 0, 0.03, 0, STAIR.yBottom, 0, H);
  box('stairWall', 0, STAIR.x1, 0, 0.03, 0, H);

  // ================= 南墙窗 + 窗帘 =================
  SOUTH_WINDOWS.forEach((w) => {
    facePlane(M.daylight, 'S', w.x0, w.x1, D - 0.01, w.h0, w.h1);
    box('frame', w.x0 - 0.06, w.x1 + 0.06, D - 0.06, D, w.h0 - 0.06, w.h0); // 下框
    box('frame', w.x0 - 0.06, w.x1 + 0.06, D - 0.06, D, w.h1, w.h1 + 0.06); // 上框
    box('frame', w.x0 - 0.06, w.x0, D - 0.06, D, w.h0, w.h1);
    box('frame', w.x1, w.x1 + 0.06, D - 0.06, D, w.h0, w.h1);
    const mid = (w.x0 + w.x1) / 2;
    box('frame', mid - 0.03, mid + 0.03, D - 0.06, D, w.h0, w.h1);
    box('frame', w.x0, w.x1, D - 0.06, D, 2.3, 2.35); // 横梃
    // 两侧落地窗帘
    box('curtain', w.x0 - 0.45, w.x0 + 0.1, D - 0.25, D - 0.08, 0.02, 3.35);
    box('curtain', w.x1 - 0.1, w.x1 + 0.45, D - 0.25, D - 0.08, 0.02, 3.35);
    box('metal', w.x0 - 0.6, w.x1 + 0.6, D - 0.2, D - 0.17, 3.36, 3.39); // 窗帘杆
  });

  // ================= 北墙高侧窗 =================
  facePlane(M.daylight, 'N', CLERESTORY.x0, CLERESTORY.x1, 0.01, CLERESTORY.h0, CLERESTORY.h1);
  box('white', CLERESTORY.x0, CLERESTORY.x1, 0, 0.05, CLERESTORY.h0 - 0.05, CLERESTORY.h0);
  box('white', CLERESTORY.x0, CLERESTORY.x1, 0, 0.05, CLERESTORY.h1, CLERESTORY.h1 + 0.05);
  for (let x = CLERESTORY.x0; x <= CLERESTORY.x1 + 0.01; x += (CLERESTORY.x1 - CLERESTORY.x0) / 3)
    box('white', x - 0.03, x + 0.03, 0, 0.05, CLERESTORY.h0, CLERESTORY.h1);

  // ================= 吊顶 =================
  // 周边浅黄叠级吊顶（中间留出木格栅的洞）
  box('ceiling', 0, W, 0, slat.y0, H, H + 0.1);
  box('ceiling', 0, W, slat.y1, D, H, H + 0.1);
  box('ceiling', 0, slat.x0, slat.y0, slat.y1, H, H + 0.1);
  box('ceiling', slat.x1, W, slat.y0, slat.y1, H, H + 0.1);
  // 洞口四周的立面（金黄色边线）
  box('ceilingEdge', slat.x0, slat.x1, slat.y0 - 0.04, slat.y0, H, HC);
  box('ceilingEdge', slat.x0, slat.x1, slat.y1, slat.y1 + 0.04, H, HC);
  box('ceilingEdge', slat.x0 - 0.04, slat.x0, slat.y0, slat.y1, H, HC);
  box('ceilingEdge', slat.x1, slat.x1 + 0.04, slat.y0, slat.y1, H, HC);
  // 中央深棕木格栅
  box('slatBack', slat.x0, slat.x1, slat.y0, slat.y1, HC, HC + 0.05);
  for (let x = slat.x0 + 0.1; x < slat.x1; x += 0.2) box('slat', x - 0.03, x + 0.03, slat.y0, slat.y1, HC - 0.12, HC);
  // 北侧横梁格栅（视频里沿北墙一排排的叠级梁）
  for (let x = 2; x < W; x += 2) box('ceiling', x - 0.12, x + 0.12, 0, slat.y0, H - 0.35, H);
  box('ceilingEdge', 0, W, slat.y0 - 0.3, slat.y0 - 0.26, H - 0.35, H);

  // 筒灯（实例化，一次 draw call）
  const lightsPos = [];
  for (let x = 1; x < W; x += 1.8)
    for (let y = 1; y < D; y += 1.8) {
      const inHole = x > slat.x0 && x < slat.x1 && y > slat.y0 && y < slat.y1;
      if (inHole) continue;
      if (y < slat.y0 && Math.abs(((x + 1) % 2) - 1) < 0.2) continue; // 避开横梁
      lightsPos.push([x, y, H - 0.005]);
    }
  for (let x = slat.x0 + 1; x < slat.x1; x += 2) for (let y = slat.y0 + 1; y < slat.y1; y += 2) lightsPos.push([x, y, HC - 0.125]);
  const dl = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.09, 16).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xfffbea }),
    lightsPos.length
  );
  const mtx = new THREE.Matrix4();
  lightsPos.forEach(([x, y, h], i) => {
    const p = toWorld(x, y);
    dl.setMatrixAt(i, mtx.makeTranslation(p.x, h, p.z));
  });
  root.add(dl);

  // ================= 柱 =================
  COLUMNS.forEach((c) => box('marble', c.x - c.s / 2, c.x + c.s / 2, c.y - c.s / 2, c.y + c.s / 2, 0, HC));
  PILASTERS.forEach((p) => box('marble', p.x0, p.x1, p.y0, p.y1, 0, H));

  // ================= 楼梯 + 入口门 =================
  const L = STAIR.landing;
  const nSteps = 11;
  const rise = L.h / nSteps;
  const run = (STAIR.yBottom - STAIR.yTop) / nSteps;
  for (let i = 0; i < nSteps; i++) {
    const y1 = STAIR.yBottom - i * run;
    box('step', STAIR.x0, STAIR.x1, y1 - run, y1, 0, (i + 1) * rise);
  }
  box('step', L.x0, L.x1, L.y0, L.y1, 0, L.h);
  // 不锈钢扶手：立柱 + 斜扶手
  for (let i = 0; i <= nSteps; i += 2) {
    const y = STAIR.yBottom - i * run - run / 2;
    box('metal', STAIR.x1 - 0.06, STAIR.x1 - 0.02, y - 0.02, y + 0.02, (i + 1) * rise, (i + 1) * rise + 0.9);
  }
  {
    const p0 = toWorld(STAIR.x1 - 0.04, STAIR.yBottom);
    const p1 = toWorld(STAIR.x1 - 0.04, STAIR.yTop);
    const a = new THREE.Vector3(p0.x, rise + 0.9, p0.z);
    const b = new THREE.Vector3(p1.x, L.h + 0.9, p1.z);
    const len = a.distanceTo(b);
    const g = new THREE.BoxGeometry(0.05, 0.05, len);
    const m4 = new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0)).setPosition(a.clone().add(b).multiplyScalar(0.5));
    g.applyMatrix4(m4);
    push('metal', g);
  }
  box('metal', L.x1 - 0.06, L.x1 - 0.02, L.y0, L.y1, L.h + 0.88, L.h + 0.92); // 平台护栏
  // 入口门（深红棕双开门 + 橙棕门套）
  const dr = STAIR.door;
  box('doorFrame', dr.x0 - 0.1, dr.x1 + 0.1, 0, 0.05, L.h, L.h + dr.h + 0.1);
  box('door', dr.x0, dr.x1, 0.03, 0.07, L.h, L.h + dr.h);
  box('metal', (dr.x0 + dr.x1) / 2 - 0.01, (dr.x0 + dr.x1) / 2 + 0.01, 0.06, 0.08, L.h, L.h + dr.h);

  // ================= 北墙：前言 + 人物板 + 平柜 + 横幅 =================
  box('marble', 2, 4.5, 0, 0.2, 0, 2.6);
  facePlane(texMat(textPanelTexture('前 言', 10)), 'N', 2.15, 4.35, 0.21, 0.7, 2.45);
  box('clay', 2, 4.5, 0.2, 0.55, 0, 0.45); // 下方泥塑浮雕台
  box('wood', 4.5, 5.5, 0, 0.3, 0, 2.6);
  facePlane(texMat(textPanelTexture('王蓝田', 6)), 'N', 4.55, 5.45, 0.31, 0.2, 2.5);

  facePlane(texMat(graphicWallTexture(3, 12)), 'N', 5.5, 15, 0.02, 1.05, 2.6);
  facePlane(texMat(graphicWallTexture(9, 8)), 'N', 15.6, 21.5, 0.02, 1.05, 2.6);
  facePlane(
    new THREE.MeshBasicMaterial({ map: bannerTexture('泥玩世家——王蓝田祖孙三代展', COLORS.banner, COLORS.bannerText) }),
    'N', 6, 20.5, 0.03, 2.8, 3.45
  );
  DESK_CASES.forEach((c) => {
    box('wood', c.x0 + 0.02, c.x1 - 0.02, c.y0, c.y1, 0, 0.8); // 柜体
    box('led', c.x0 + 0.1, c.x1 - 0.1, c.y0 + 0.08, c.y1 - 0.08, 0.8, 0.805); // 柜内灯光
    box('glass', c.x0 + 0.02, c.x1 - 0.02, c.y0, c.y1, 0.8, 1.05); // 玻璃罩
  });

  // ================= 东墙：高展柜 + 山水背景 =================
  facePlane(texMat(landscapeTexture()), 'E', 1, 15, W - 0.02, 2.4, H);
  TALL_CABS.forEach((c, i) => {
    box('wood', c.x0, c.x1, c.y0 + 0.02, c.y1 - 0.02, 0, 0.9); // 下柜
    box('wood', c.x0, c.x1, c.y0 + 0.02, c.y1 - 0.02, 2.3, 2.4); // 顶盖
    box('wood', c.x0, c.x1, c.y0, c.y0 + 0.06, 0.9, 2.3); // 侧板
    box('wood', c.x0, c.x1, c.y1 - 0.06, c.y1, 0.9, 2.3);
    box('led', c.x0 + 0.1, c.x1 - 0.05, c.y0 + 0.1, c.y1 - 0.1, 2.295, 2.3);
    box('glass', c.x0, c.x0 + 0.02, c.y0 + 0.06, c.y1 - 0.06, 0.9, 2.3); // 正面玻璃
    box('glass', c.x0 + 0.05, c.x1 - 0.05, c.y0 + 0.06, c.y1 - 0.06, 1.55, 1.57); // 玻璃隔板
    facePlane(texMat(graphicWallTexture(20 + i, 4)), 'E', c.y0 + 0.06, c.y1 - 0.06, c.x1 - 0.01, 0.9, 2.3);
  });
  box('marble', 25.4, W, 7.5, 8.3, 0, 2.6); // 书法竖幅柱
  facePlane(texMat(textPanelTexture('书', 6)), 'E', 7.6, 8.2, 25.39, 0.6, 2.4);
  box('wood', 25.4, W, 10.3, 11.1, 0, 2.6); // 人物展板“王宝瑞”
  facePlane(texMat(textPanelTexture('王宝瑞', 6)), 'E', 10.35, 11.05, 25.39, 0.2, 2.5);

  // ================= 西墙：作品墙 + 横幅 + 白布桌 =================
  facePlane(texMat(worksWallTexture()), 'W', 6, 15, 0.02, 0.4, 2.8);
  facePlane(
    new THREE.MeshBasicMaterial({ map: bannerTexture('保护传承非遗  赓续历史文脉', COLORS.banner, COLORS.bannerText) }),
    'W', 6.5, 14.5, 0.03, 3.0, 3.55
  );
  TABLES.forEach((t) => {
    box('cloth', t.x0, t.x1, t.y0, t.y1, 0, 0.75);
  });

  // ================= 中部：独立展台 + 玻璃罩 =================
  PLINTHS.forEach((p) => {
    const [hw, hd, base, hood] = p.big ? [0.7, 0.45, 0.4, 0.9] : [0.25, 0.25, 1.0, 0.5];
    box('white', p.x - hw, p.x + hw, p.y - hd, p.y + hd, 0, base);
    box('glass', p.x - hw + 0.02, p.x + hw - 0.02, p.y - hd + 0.02, p.y + hd - 0.02, base, base + hood);
  });

  // 双面展板
  PANELS.forEach((p, i) => {
    box('marble', p.x - p.w / 2, p.x + p.w / 2, p.y - p.d / 2, p.y + p.d / 2, 0, 2.4);
    facePlane(texMat(textPanelTexture(i ? '作品' : '人物', 5)), 'N', p.x - p.w / 2 + 0.08, p.x + p.w / 2 - 0.08, p.y + p.d / 2 + 0.01, 0.9, 2.2);
    facePlane(texMat(graphicWallTexture(40 + i, 3)), 'S', p.x - p.w / 2 + 0.08, p.x + p.w / 2 - 0.08, p.y - p.d / 2 - 0.01, 0.9, 2.2);
  });

  // 吊挂画幅（双面可见）
  HANGINGS.forEach((g, i) => {
    const m = facePlane(
      new THREE.MeshStandardMaterial({ map: hangingPaintingTexture(11 + i * 5), roughness: 0.9, side: THREE.DoubleSide }),
      'N', g.x0, g.x1, g.y, 2.7, 4.0
    );
    m.name = 'hanging';
    box('metal', g.x0 + 0.1, g.x0 + 0.12, g.y - 0.01, g.y + 0.01, 4.0, HC);
    box('metal', g.x1 - 0.12, g.x1 - 0.1, g.y - 0.01, g.y + 0.01, 4.0, HC);
    box('wood', g.x0 - 0.05, g.x1 + 0.05, g.y - 0.02, g.y + 0.02, 4.0, 4.04);
  });

  // 柜式空调
  ACS.forEach((a) => box('white', a.x - 0.25, a.x + 0.25, a.y - 0.2, a.y + 0.2, 0, 1.8));

  // 东南角道具区（简化成几个箱子，临时设施）
  box('crate', 21, 22.2, 14, 15, 0, 0.6);
  box('crate', 22.6, 23.4, 14.2, 15, 0, 0.5);
  box('crate', 23.6, 24.6, 13.6, 14.6, 0, 0.8);

  // ---------- 合并同材质几何体 ----------
  for (const [key, geos] of Object.entries(bucket)) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, M[key]);
    mesh.name = `hall_${key}`;
    if (key === 'glass') mesh.renderOrder = 2;
    root.add(mesh);
  }

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
