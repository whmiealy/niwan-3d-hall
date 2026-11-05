// =============================================================
// 展厅细节：小泥塑、桌面小作品、三轮车、自行车、椅子、摄影棚等
//
// 【手机性能】成百上千的小泥塑全部用 InstancedMesh（同形状一次 draw call），
// 每个实例单独上色；其余道具的几何体并入 ProceduralHall 的同材质合并桶。
// =============================================================
import * as THREE from 'three';
import { toWorld } from '../data/layout.js';

const rng = (seed) => {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
};

// 泥塑常见配色（黑底彩绘、红绿黄为主）
const CLAY = [0x1f1f1f, 0x2a2a2a, 0xb8322a, 0x2f7f4f, 0xe0a83a, 0xf2efe6, 0x3b6fb0, 0xd9704a, 0x7a4a2a];

/**
 * 小泥塑实例收集器：add(shape, x, y, h, size, color, rotY)
 *   shape: 'bottle' 泥咕咕瓶形 | 'animal' 小动物 | 'flat' 扁平小件 | 'card' 白色说明卡
 */
export function createFigurines() {
  const shapes = {
    bottle: new THREE.LatheGeometry(
      [[0, 0], [0.45, 0], [0.5, 0.3], [0.42, 0.62], [0.34, 0.72], [0.4, 0.86], [0.3, 1], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y)),
      7
    ),
    animal: new THREE.IcosahedronGeometry(0.5, 0).scale(1.4, 0.8, 0.7).translate(0, 0.4, 0),
    flat: new THREE.CylinderGeometry(0.5, 0.5, 0.25, 7).translate(0, 0.125, 0),
    card: new THREE.BoxGeometry(1, 0.6, 0.08).rotateX(-0.6).translate(0, 0.3, 0),
  };
  const list = { bottle: [], animal: [], flat: [], card: [] };
  return {
    add(shape, x, y, h, size, color, rotY = 0) {
      list[shape].push({ x, y, h, size, color, rotY });
    },
    build(root) {
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0 });
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const col = new THREE.Color();
      for (const [k, items] of Object.entries(list)) {
        if (!items.length) continue;
        const im = new THREE.InstancedMesh(shapes[k], mat, items.length);
        items.forEach((it, i) => {
          const p = toWorld(it.x, it.y);
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.rotY);
          const s = Array.isArray(it.size) ? new THREE.Vector3(...it.size) : new THREE.Vector3(it.size, it.size, it.size);
          m4.compose(new THREE.Vector3(p.x, it.h, p.z), q, s);
          im.setMatrixAt(i, m4);
          im.setColorAt(i, col.set(it.color));
        });
        im.name = `figurines_${k}`;
        root.add(im);
      }
    },
  };
}

/** 两点之间的圆柱（用于车架、扶手、椅腿等），返回已摆好位置的几何体 */
export function rod(a, b, r, seg = 6) {
  const pa = toWorld(a[0], a[1]);
  const pb = toWorld(b[0], b[1]);
  const va = new THREE.Vector3(pa.x, a[2], pa.z);
  const vb = new THREE.Vector3(pb.x, b[2], pb.z);
  const len = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return g;
}

/** 车轮：竖直圆环，axisAlongX=true 表示轮轴沿东西方向 */
export function wheel(x, y, r, axisAlongX) {
  const p = toWorld(x, y);
  const g = new THREE.TorusGeometry(r, 0.025, 6, 20);
  if (axisAlongX) g.rotateY(Math.PI / 2);
  g.translate(p.x, r, p.z);
  return g;
}

/** 在区域里随机撒小作品（桌面、柜内） */
export function scatter(fig, seed, x0, x1, y0, y1, h, n, opts = {}) {
  const r = rng(seed);
  const shapes = opts.shapes || ['flat', 'animal', 'bottle'];
  const [smin, smax] = opts.size || [0.03, 0.07];
  const colors = opts.colors || CLAY;
  for (let i = 0; i < n; i++) {
    const shape = shapes[(r() * shapes.length) | 0];
    const s = smin + r() * (smax - smin);
    fig.add(shape, x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), h, s, colors[(r() * colors.length) | 0], r() * 6.28);
  }
}

/** 一排泥咕咕（高柜层板、展台上） */
export function rowOfBottles(fig, seed, xa, ya, xb, yb, h, n, size = 0.16) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const c = CLAY[(r() * CLAY.length) | 0];
    fig.add('bottle', xa + (xb - xa) * t, ya + (yb - ya) * t, h, [size * 0.6, size, size * 0.6], c, r() * 0.6 - 0.3);
  }
}
