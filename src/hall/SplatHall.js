// =============================================================
// 【预留】高斯泼溅展厅（.ply / .spz）
//
// 现在还没装泼溅渲染库，这个文件只是接口占位。以后要用时：
//
//   1. 安装一个支持 three.js 的泼溅渲染库，例如：
//        npm i @sparkjsdotdev/spark          （Spark，支持 .spz/.ply，手机表现好）
//      或  npm i @mkkellogg/gaussian-splats-3d （GaussianSplats3D）
//   2. 把扫描好的模型放到 public/splats/hall.spz
//   3. 在下面 TODO 处创建泼溅对象，加到 root 里
//   4. config.js 里 HALL_MODE 改成 'splat'，并调整 SPLAT.position/rotation/scale，
//      让模型和 data/layout.js 的坐标对齐（展厅中心地面在原点，X 向东，Z 向南）
//
// 展品占位物体、点击、走路碰撞都不依赖这里，换完以后照常可用。
// 对齐时可以临时把 HALL_MODE 改回 'procedural' 对比位置。
// =============================================================
import * as THREE from 'three';

export async function createSplatHall(opts /* , renderer */) {
  const root = new THREE.Group();
  root.name = 'SplatHall';
  root.position.fromArray(opts.position);
  root.rotation.set(...opts.rotation);
  root.scale.setScalar(opts.scale);

  // TODO：示例（以 Spark 为例，具体以所用库的文档为准）
  // const { SplatMesh } = await import('@sparkjsdotdev/spark');
  // const splat = new SplatMesh({ url: opts.url });
  // root.add(splat);

  throw new Error('高斯泼溅展厅还没接入：请按 src/hall/SplatHall.js 顶部的说明安装渲染库');

  // eslint-disable-next-line no-unreachable
  return { root, dispose() {} };
}
