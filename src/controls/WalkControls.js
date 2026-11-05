// =============================================================
// 第一人称漫游控制
//   电脑：鼠标拖动转视角，WASD / 方向键移动，点击地面走过去
//   手机：单指拖动看四周，左下角虚拟摇杆移动，轻点地面走过去
//
// 碰撞使用 data/layout.js 里的 OBSTACLES（纯数据），与展厅模型无关。
// 点地面时用的是数学平面 y=0，同样不依赖展厅模型。
// =============================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { OBSTACLES, BOUNDS } from '../data/layout.js';

const TAP_MOVE_PX = 8; // 移动小于这个像素算“点击”而不是“拖动”
const TAP_MS = 350;

export class WalkControls {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} el 接收指针事件的元素（canvas）
   * @param {object} opts { onTap(ndc) -> boolean 返回 true 表示已处理（比如点中展品）, onHover(ndc) }
   */
  constructor(camera, el, opts = {}) {
    this.camera = camera;
    this.el = el;
    this.opts = opts;
    this.enabled = true;

    this.yaw = CONFIG.SPAWN.yaw;
    this.pitch = -0.05;
    this.pos = new THREE.Vector3(CONFIG.SPAWN.x, CONFIG.EYE_HEIGHT, CONFIG.SPAWN.z);
    camera.rotation.order = 'YXZ';

    this.keys = new Set();
    this.joy = new THREE.Vector2(); // 摇杆输入 (-1~1)
    this.target = null; // 点地面后的目标点
    this._ptr = null; // 当前用于转视角的指针
    this._ray = new THREE.Raycaster();
    this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // 点地面的目标标记（一个圆环）
    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.26, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x47b8e0, transparent: true, opacity: 0.9, depthWrite: false })
    );
    this.marker.visible = false;
    this.marker.renderOrder = 5;

    this._bind();
    this._apply();
  }

  _bind() {
    const el = this.el;
    el.style.touchAction = 'none';

    el.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      if (this._ptr !== null) return; // 只认第一根手指
      this._ptr = e.pointerId;
      this._start = { x: e.clientX, y: e.clientY, t: performance.now() };
      this._last = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
      if (!this.enabled) return;
      if (e.pointerId !== this._ptr) {
        // 鼠标悬停：高亮展品
        if (e.pointerType === 'mouse' && this.opts.onHover) this.opts.onHover(this._ndc(e));
        return;
      }
      const dx = e.clientX - this._last.x;
      const dy = e.clientY - this._last.y;
      this._last = { x: e.clientX, y: e.clientY };
      // 拖动转视角：手机灵敏度稍高
      const k = e.pointerType === 'touch' ? 0.006 : 0.004;
      this.yaw += dx * k;
      this.pitch = THREE.MathUtils.clamp(this.pitch + dy * k, -1.2, 1.2);
    });

    const end = (e) => {
      if (e.pointerId !== this._ptr) return;
      this._ptr = null;
      const moved = Math.hypot(e.clientX - this._start.x, e.clientY - this._start.y);
      const quick = performance.now() - this._start.t < TAP_MS;
      if (e.type === 'pointerup' && moved < TAP_MOVE_PX && quick) this._tap(this._ndc(e));
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  _ndc(e) {
    const r = this.el.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  /** 轻点：先交给外部判断是否点中展品，否则当作点地面走过去 */
  _tap(ndc) {
    if (this.opts.onTap && this.opts.onTap(ndc)) return;
    this._ray.setFromCamera(ndc, this.camera);
    const p = new THREE.Vector3();
    if (!this._ray.ray.intersectPlane(this._plane, p)) return;
    if (p.distanceTo(this.pos) > 30) return;
    const t = this._resolve(p.x, p.z);
    this.target = new THREE.Vector2(t.x, t.z);
    this.marker.position.set(t.x, 0.01, t.z);
    this.marker.visible = true;
  }

  /** 把位置推出所有障碍物和墙（圆 vs 矩形） */
  _resolve(x, z) {
    const r = CONFIG.PLAYER_RADIUS;
    x = THREE.MathUtils.clamp(x, BOUNDS.minX + r, BOUNDS.maxX - r);
    z = THREE.MathUtils.clamp(z, BOUNDS.minZ + r, BOUNDS.maxZ - r);
    for (let pass = 0; pass < 2; pass++) {
      for (const o of OBSTACLES) {
        if (x > o.minX - r && x < o.maxX + r && z > o.minZ - r && z < o.maxZ + r) {
          // 从穿透最浅的一边推出去
          const push = [
            [o.minX - r - x, 0],
            [o.maxX + r - x, 0],
            [0, o.minZ - r - z],
            [0, o.maxZ + r - z],
          ].sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]))[0];
          x += push[0];
          z += push[1];
        }
      }
    }
    return { x, z };
  }

  update(dt) {
    if (!this.enabled) return this._apply();
    // 键盘 + 摇杆 → 本地方向（前 = -Z）
    let f = 0;
    let s = 0;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) s += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) s -= 1;
    f += -this.joy.y;
    s += this.joy.x;

    const speed = CONFIG.WALK_SPEED * (k.has('ShiftLeft') ? 1.8 : 1);
    let mx = 0;
    let mz = 0;
    if (f || s) {
      this.target = null;
      this.marker.visible = false;
      const len = Math.min(1, Math.hypot(f, s));
      const a = Math.atan2(s, f);
      // 相机朝向 yaw：前方向量 = (-sin yaw, -cos yaw)
      const dirYaw = this.yaw - a;
      mx = -Math.sin(dirYaw) * speed * len * dt;
      mz = -Math.cos(dirYaw) * speed * len * dt;
    } else if (this.target) {
      const dx = this.target.x - this.pos.x;
      const dz = this.target.y - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.08) {
        this.target = null;
        this.marker.visible = false;
      } else {
        const step = Math.min(d, speed * dt);
        mx = (dx / d) * step;
        mz = (dz / d) * step;
      }
    }
    if (mx || mz) {
      const prev = { x: this.pos.x, z: this.pos.z };
      const r = this._resolve(this.pos.x + mx, this.pos.z + mz);
      this.pos.x = r.x;
      this.pos.z = r.z;
      // 走向目标时被挡住就停下
      if (this.target && Math.hypot(r.x - prev.x, r.z - prev.z) < 1e-4) {
        this.target = null;
        this.marker.visible = false;
      }
    }
    this._apply();
  }

  _apply() {
    this.camera.position.copy(this.pos);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}

/** 手机虚拟摇杆（只在触屏设备上显示） */
export function createJoystick(container, controls) {
  const base = document.createElement('div');
  base.className = 'joystick';
  const knob = document.createElement('div');
  knob.className = 'joystick-knob';
  base.appendChild(knob);
  container.appendChild(base);

  const R = 50;
  let id = null;
  let cx = 0;
  let cy = 0;
  const set = (x, y) => {
    const d = Math.hypot(x, y);
    if (d > R) {
      x = (x / d) * R;
      y = (y / d) * R;
    }
    knob.style.transform = `translate(${x}px, ${y}px)`;
    controls.joy.set(x / R, y / R);
  };
  base.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    id = e.pointerId;
    const r = base.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    base.setPointerCapture(id);
    set(e.clientX - cx, e.clientY - cy);
  });
  base.addEventListener('pointermove', (e) => {
    if (e.pointerId === id) set(e.clientX - cx, e.clientY - cy);
  });
  const up = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    set(0, 0);
  };
  base.addEventListener('pointerup', up);
  base.addEventListener('pointercancel', up);
  return base;
}
