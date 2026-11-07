// =============================================================
// 展品层：根据 exhibits.json 在场景里放“半透明占位方块 + 编号牌”
//
// 【关键设计】点击检测只针对这里的占位物体（独立的 hitMeshes），
// 完全不依赖展厅模型。以后展厅换成高斯泼溅，点击照常可用。
// =============================================================
import * as THREE from 'three';
import { labelTexture } from '../hall/textures.js';
import { hallModelUrl, fullModelUrl, thumbUrl } from '../data/linkedItems.js';

const LOAD_RADIUS = 13; // 离人这么近才加载模型（米）
const MAX_LOADING = 3; // 同时加载几件

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

      ex._group = g; // 摆上真实物品时用来隐藏占位方块
      ex._hit = hit;
      this.root.add(g);
    }
    this.placed = [];
    this._loading = 0;
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

  /** 把资源库物品摆到展位上，取代占位方块。placements 见 data/linkedItems.js */
  placeItems(placements) {
    const hitGeo = new THREE.BoxGeometry(1, 1, 1);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    for (const { exhibit, items } of placements) {
      exhibit._group.visible = false;
      this.hitMeshes.splice(this.hitMeshes.indexOf(exhibit._hit), 1);
      for (const entry of items) {
        const spot = slot(exhibit, entry);
        const g = new THREE.Group();
        g.position.copy(spot.position);
        this.root.add(g);
        // 手工书等没有三维模型的物品平放成卡片
        const flat = !entry.item.model;
        const size = flat ? [entry.height, 0.04, entry.height] : [entry.height * 1.2, entry.height * 1.2, entry.height * 1.2];
        const hit = new THREE.Mesh(hitGeo, hitMat);
        hit.scale.set(Math.max(size[0], 0.16), Math.max(size[1], 0.16), Math.max(size[2], 0.16));
        hit.position.y = hit.scale.y / 2;
        hit.userData.exhibit = {
          id: entry.item.id,
          itemId: entry.item.id,
          name: entry.item.name,
          category: entry.item.category,
          description: entry.item.description,
          model: entry.item.model ? fullModelUrl(entry.item) : '',
        };
        hit.userData.box = { material: null };
        g.add(hit);
        this.hitMeshes.push(hit);
        this.placed.push({ entry, group: g, yaw: spot.yaw + entry.yaw, state: 'wait', stand: spot.stand });
      }
    }
    this._addFlatCards();
  }

  /** 手工书：缩略图卡片，一次性创建，不占加载名额 */
  _addFlatCards() {
    const loader = new THREE.TextureLoader();
    for (const p of this.placed) {
      if (p.entry.item.model || !p.entry.item.thumb) continue;
      p.state = 'done';
      const tex = loader.load(thumbUrl(p.entry.item));
      tex.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(p.entry.height, 0.012, p.entry.height),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })
      );
      mesh.position.y = 0.006;
      p.group.add(mesh);
    }
  }

  /** 由近到远加载轻量模型 */
  _streamModels(cameraPos) {
    if (this._loading >= MAX_LOADING) return;
    let next = null;
    let best = LOAD_RADIUS;
    for (const p of this.placed) {
      if (p.state !== 'wait' || !p.entry.item.model) continue;
      const d = p.group.position.distanceTo(cameraPos);
      if (d < best) {
        best = d;
        next = p;
      }
    }
    if (next) this._loadModel(next);
  }

  async _loadModel(p) {
    p.state = 'loading';
    this._loading++;
    try {
      if (!this._loader) {
        this._loader = (async () => {
          const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
            import('three/addons/loaders/GLTFLoader.js'),
            import('three/addons/libs/meshopt_decoder.module.js'),
          ]);
          return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
        })();
      }
      const gltf = await (await this._loader).loadAsync(hallModelUrl(p.entry.item));
      const obj = gltf.scene;
      obj.rotation.y = p.yaw;
      obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      // 按高度定大小；趴着的物品按长度算，别比同组的大太多
      const scale = p.entry.height / Math.max(size.y, Math.max(size.x, size.z) * 0.75);
      obj.scale.setScalar(scale);
      obj.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
      p.group.add(obj);
      p.state = 'done';
    } catch (err) {
      console.warn('展厅模型加载失败：', p.entry.item.id, err);
      p.state = 'failed';
    }
    this._loading--;
  }

  /** 物品在展厅里的位置，用于从资源库直达 */
  locate(itemId) {
    const p = this.placed.find((x) => x.entry.item.id === itemId);
    return p && { stand: p.stand, target: p.group.position };
  }

  /** 轻微呼吸闪烁，提示“可以点”；顺便加载附近的模型 */
  update(dt, cameraPos) {
    this._time += dt;
    this.boxMat.opacity = 0.45 + Math.sin(this._time * 2.5) * 0.12;
    if (cameraPos && this.placed.length) this._streamModels(cameraPos);
  }
}

/**
 * 物品在展位里的位置。柜子尺寸见 data/layout.js 和 hall/ProceduralHall.js。
 * row 0 是前排；东墙高柜后排站在小台阶上。
 */
function slot(exhibit, { row, col, cols }) {
  const [x, , z] = exhibit.position;
  const t = (col + 0.5) / cols - 0.5; // -0.5 ~ 0.5，同一行均匀排开
  const kind = exhibit.id[0];
  if (kind === 'C') {
    // 北墙平柜：柜长 1.9，柜面高 0.805，人从南边看
    return { position: new THREE.Vector3(x + t * 1.6, 0.805, -7.27 - row * 0.3), yaw: 0, stand: new THREE.Vector3(x, 0, -5.4) };
  }
  if (kind === 'D') {
    // 东墙高柜：柜深 0.6，人从西边看
    return {
      position: new THREE.Vector3(row ? 12.78 : 12.5, row ? 1.0 : 0.905, z + t * 1.75),
      yaw: -Math.PI / 2,
      stand: new THREE.Vector3(10.6, 0, z),
    };
  }
  if (kind === 'I') {
    // 西墙摊位桌：桌长 2.3，人从东边看
    return { position: new THREE.Vector3(-12.15, 0.775, z + t * 1.9), yaw: Math.PI / 2, stand: new THREE.Vector3(-10.2, 0, z) };
  }
  return { position: new THREE.Vector3(x + t * 0.4, exhibit.position[1] - exhibit.size[1] / 2, z), yaw: 0, stand: new THREE.Vector3(x, 0, z + 1.5) };
}
