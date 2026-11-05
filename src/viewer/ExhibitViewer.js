// =============================================================
// 展品 3D 查看器（弹出面板）
//   - 单独的小渲染器 + OrbitControls：拖动旋转、滚轮/双指缩放
//   - exhibit.model 有值（.glb/.gltf）就加载真实模型，否则显示占位模型
//   - 打开时主场景暂停渲染，手机上更省电更流畅
// =============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export class ExhibitViewer {
  constructor({ onOpen, onClose, maxPixelRatio = 2 } = {}) {
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.maxPixelRatio = maxPixelRatio;
    this.el = document.getElementById('viewer');
    this.canvasWrap = this.el.querySelector('.viewer-canvas');
    this.el.querySelector('.viewer-close').addEventListener('click', () => this.close());
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close(); // 点遮罩关闭
    });
    window.addEventListener('keydown', (e) => e.key === 'Escape' && this.isOpen && this.close());
    this.isOpen = false;
    this._loader = null;
  }

  /** 第一次打开时才创建渲染器（懒加载，减少首屏开销） */
  _init() {
    if (this.renderer) return;
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, this.maxPixelRatio));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.canvasWrap.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xfff6e5, 0x8a7a66, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2, 3, 2);
    this.scene.add(key);

    // 展台底座
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.65, 0.06, 48),
      new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.4 })
    );
    base.position.y = -0.03;
    this.scene.add(base);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.5;
    this.controls.addEventListener('start', () => (this.controls.autoRotate = false));

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.canvasWrap);
  }

  _resize() {
    const w = this.canvasWrap.clientWidth;
    const h = this.canvasWrap.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  async open(ex) {
    this._init();
    this.isOpen = true;
    this.el.classList.add('open');
    this.el.querySelector('.viewer-id').textContent = ex.id;
    this.el.querySelector('.viewer-name').textContent = ex.name;
    this.el.querySelector('.viewer-cat').textContent = ex.category;
    this.el.querySelector('.viewer-desc').textContent = ex.description || '';
    this.onOpen?.();
    this._resize();

    // 清掉上一件展品
    if (this.model) {
      this.scene.remove(this.model);
      this.model.traverse((o) => o.geometry?.dispose());
      this.model = null;
    }
    const token = (this._token = Symbol());
    const status = this.el.querySelector('.viewer-status');
    let obj;
    if (ex.model) {
      status.textContent = '模型加载中…';
      try {
        obj = await this._loadGLTF(ex.model);
        status.textContent = '';
      } catch (err) {
        console.warn('模型加载失败，改用占位模型：', ex.model, err);
        status.textContent = '模型加载失败，显示占位模型';
        obj = this._placeholder(ex);
      }
    } else {
      status.textContent = '占位模型（以后替换为真实展品）';
      obj = this._placeholder(ex);
    }
    if (token !== this._token || !this.isOpen) return;
    this._fit(obj);
    this.model = obj;
    this.scene.add(obj);
    this.controls.autoRotate = true;
    this._loop();
  }

  async _loadGLTF(url) {
    if (!this._loader) {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      this._loader = new GLTFLoader();
    }
    const gltf = await this._loader.loadAsync(url);
    return gltf.scene;
  }

  /** 占位模型：一个陶罐形状（车削几何体）+ 编号 */
  _placeholder(ex) {
    const pts = [];
    const prof = [
      [0, 0], [0.18, 0], [0.24, 0.08], [0.3, 0.3], [0.28, 0.5], [0.16, 0.66], [0.13, 0.78], [0.17, 0.86], [0.16, 0.9],
    ];
    prof.forEach(([x, y]) => pts.push(new THREE.Vector2(x, y)));
    const hue = (ex.id.charCodeAt(0) * 37 + parseInt(ex.id.slice(1) || 0, 10) * 53) % 360;
    const mesh = new THREE.Mesh(
      new THREE.LatheGeometry(pts, 48),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(`hsl(${hue},45%,55%)`), roughness: 0.55, side: THREE.DoubleSide })
    );
    const g = new THREE.Group();
    g.add(mesh);
    return g;
  }

  /** 让模型立在底座上并调整相机距离 */
  _fit(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = 1 / maxDim; // 统一缩放到约 1 米大小
    obj.scale.multiplyScalar(s);
    obj.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    const h = size.y * s;
    this.controls.target.set(0, h / 2, 0);
    this.camera.position.set(1.4, h / 2 + 0.6, 1.8);
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 6;
    this.controls.update();
  }

  _loop() {
    if (!this.isOpen) return;
    cancelAnimationFrame(this._raf);
    const tick = () => {
      if (!this.isOpen) return;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this._raf = requestAnimationFrame(tick);
    };
    tick();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    cancelAnimationFrame(this._raf);
    this.el.classList.remove('open');
    this.onClose?.();
  }
}
