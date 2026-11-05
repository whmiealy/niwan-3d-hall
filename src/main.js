// =============================================================
// 主程序：组装 渲染器 / 展厅外壳 / 展品层 / 漫游控制 / 查看器
//
//   场景结构
//   ├─ hall.root        展厅外壳（粗模 或 高斯泼溅，可整体替换）
//   ├─ exhibits.root    展品占位物体（独立，负责点击）
//   └─ controls.marker  点地面时的目标圆环
// =============================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG } from './config.js';
import { createHall } from './hall/index.js';
import { ExhibitLayer } from './exhibits/ExhibitLayer.js';
import { WalkControls, createJoystick } from './controls/WalkControls.js';
import { ExhibitViewer } from './viewer/ExhibitViewer.js';
import exhibitData from './data/exhibits.json';
import './style.css';

const isTouch = matchMedia('(pointer: coarse)').matches;
const maxPR = isTouch ? CONFIG.MAX_PIXEL_RATIO_MOBILE : CONFIG.MAX_PIXEL_RATIO_DESKTOP;

// ---------- 渲染器 ----------
const renderer = new THREE.WebGLRenderer({ antialias: !isTouch || devicePixelRatio < 2, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, maxPR));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd9cfb8);
const camera = new THREE.PerspectiveCamera(isTouch ? 70 : 62, innerWidth / innerHeight, 0.05, 80);

// ---------- 灯光：柔和、均匀，接近视频里明亮的展厅 ----------
// 环境贴图提供柔和的漫反射和地砖反光（一次性生成，不占每帧开销）
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.4;
pmrem.dispose();
// 天光/地面反射光：顶上偏暖白，下面偏米黄
scene.add(new THREE.HemisphereLight(0xfff4dc, 0x9c8c70, 1.15));
// 从南窗进来的偏冷日光（不开阴影，省性能）
const sun = new THREE.DirectionalLight(0xe6f0ff, 0.6);
sun.position.set(-3, 6, 10);
scene.add(sun);
// 顶部筒灯的整体暖光
const top = new THREE.DirectionalLight(0xfff0d6, 0.55);
top.position.set(2, 10, -3);
scene.add(top);

// ---------- 展品层 ----------
const exhibits = new ExhibitLayer(exhibitData.exhibits);
scene.add(exhibits.root);

// ---------- 查看器 ----------
let paused = false;
const viewer = new ExhibitViewer({
  maxPixelRatio: maxPR,
  onOpen: () => {
    paused = true;
    controls.enabled = false;
    controls.keys.clear();
    controls.joy.set(0, 0);
  },
  onClose: () => {
    paused = false;
    controls.enabled = true;
  },
});

// ---------- 漫游控制 ----------
const raycaster = new THREE.Raycaster();
const controls = new WalkControls(camera, renderer.domElement, {
  // 轻点/单击：优先判断是否点中展品
  onTap(ndc) {
    raycaster.setFromCamera(ndc, camera);
    const hit = exhibits.pick(raycaster);
    if (hit) {
      viewer.open(hit.userData.exhibit);
      return true;
    }
    return false;
  },
  // 鼠标悬停高亮（只在电脑上）
  onHover(ndc) {
    raycaster.setFromCamera(ndc, camera);
    const hit = exhibits.pick(raycaster);
    exhibits.setHover(hit);
    renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
  },
});
scene.add(controls.marker);
if (isTouch) createJoystick(document.getElementById('app'), controls);
document.body.classList.toggle('touch', isTouch);

// ---------- 加载展厅外壳 ----------
const loading = document.getElementById('loading');
createHall(renderer)
  .then((hall) => {
    scene.add(hall.root);
    loading.classList.add('hide');
  })
  .catch((err) => {
    console.error(err);
    loading.textContent = '展厅加载失败：' + err.message;
  });

// 右下角版本号：确认看到的是不是最新部署
document.getElementById('version').textContent = __BUILD_INFO__;

// 提示条几秒后淡出
setTimeout(() => document.getElementById('hint')?.classList.add('fade'), 6000);

// ---------- 自适应窗口 ----------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- 主循环 ----------
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (paused) return; // 查看器打开时主场景不渲染
  controls.update(dt);
  exhibits.update(dt);
  renderer.render(scene, camera);
});

// 调试用：在控制台里可以访问 window.__app
window.__app = { scene, camera, controls, exhibits, viewer };
