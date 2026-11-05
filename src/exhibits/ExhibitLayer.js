// =============================================================
// 展品层：根据 exhibits.json 在场景里放“半透明占位方块 + 编号牌”
//
// 【关键设计】点击检测只针对这里的占位物体（独立的 hitMeshes），
// 完全不依赖展厅模型。以后展厅换成高斯泼溅，点击照常可用。
// =============================================================
import * as THREE from 'three';
import { labelTexture } from '../hall/textures.js';

export class ExhibitLayer {
  constructor(exhibits) {
    this.exhibits = exhibits;
    this.root = new THREE.Group();
    this.root.name = 'ExhibitLayer';
    /** 用于射线检测的网格（每件展品一个） */
    this.hitMeshes = [];
    this._time = 0;

    // 所有占位方块共用一个几何体和材质，省内存
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.boxMat = new THREE.MeshStandardMaterial({
      color: 0x47b8e0, emissive: 0x1a6f95, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.55, roughness: 0.3, depthWrite: false,
    });
    this.hoverMat = this.boxMat.clone();
    this.hoverMat.color.set(0xffc94a);
    this.hoverMat.emissive.set(0xb07a10);
    this.edgeMat = new THREE.LineBasicMaterial({ color: 0xbff0ff, transparent: true, opacity: 0.9 });
    const edges = new THREE.EdgesGeometry(geo);

    for (const ex of exhibits) {
      const g = new THREE.Group();
      g.position.fromArray(ex.position);

      const box = new THREE.Mesh(geo, this.boxMat);
      box.scale.fromArray(ex.size);
      box.renderOrder = 3;
      box.userData.exhibit = ex; // 点击时通过它找到展品数据
      g.add(box);

      const line = new THREE.LineSegments(edges, this.edgeMat);
      line.scale.fromArray(ex.size);
      g.add(line);

      // 编号牌（始终面向镜头）
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(ex.id), depthWrite: false }));
      sp.scale.set(0.36, 0.18, 1);
      sp.position.y = ex.size[1] / 2 + 0.22;
      sp.renderOrder = 4;
      g.add(sp);

      // 点击范围比方块稍大一点，手机上更好点中
      const hit = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false }));
      hit.scale.set(Math.max(ex.size[0], 0.5), ex.size[1] + 0.5, Math.max(ex.size[2], 0.5));
      hit.position.y = 0.2;
      hit.userData.exhibit = ex;
      hit.userData.box = box;
      g.add(hit);
      this.hitMeshes.push(hit);

      this.root.add(g);
    }
  }

  /** 射线检测：返回被点中的展品数据（没有则 null） */
  pick(raycaster) {
    const hits = raycaster.intersectObjects(this.hitMeshes, false);
    return hits.length ? hits[0].object : null;
  }

  setHover(hitMesh) {
    if (this._hover === hitMesh) return;
    if (this._hover) this._hover.userData.box.material = this.boxMat;
    this._hover = hitMesh;
    if (hitMesh) hitMesh.userData.box.material = this.hoverMat;
  }

  /** 轻微呼吸闪烁，提示“可以点” */
  update(dt) {
    this._time += dt;
    this.boxMat.opacity = 0.45 + Math.sin(this._time * 2.5) * 0.12;
  }
}
