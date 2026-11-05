// 用 Canvas 现画的贴图（不依赖外部图片，加载快，手机友好）
import * as THREE from 'three';

const FONT = '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';

function canvasTex(w, h, draw, { repeat } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/** 地砖：0.8m 一块的米白抛光砖 + 灰蓝通道带（整张贴在 26×16 的地面上） */
export function floorTexture(W, D, bands, colors) {
  const ppm = 40; // 每米像素
  return canvasTex(W * ppm, D * ppm, (g, w, h) => {
    g.fillStyle = colors.floor;
    g.fillRect(0, 0, w, h);
    // 灰蓝通道带
    g.fillStyle = colors.floorBand;
    bands.forEach((b) => g.fillRect(b.x0 * ppm, b.y0 * ppm, (b.x1 - b.x0) * ppm, (b.y1 - b.y0) * ppm));
    // 砖缝
    g.strokeStyle = 'rgba(120,110,95,0.18)';
    g.lineWidth = 1;
    for (let x = 0; x <= W; x += 0.8) {
      g.beginPath();
      g.moveTo(x * ppm, 0);
      g.lineTo(x * ppm, h);
      g.stroke();
    }
    for (let y = 0; y <= D; y += 0.8) {
      g.beginPath();
      g.moveTo(0, y * ppm);
      g.lineTo(w, y * ppm);
      g.stroke();
    }
  });
}

/** 红色横幅（黄字） */
export function bannerTexture(text, bg, color) {
  return canvasTex(2048, 160, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = color;
    g.font = `bold 104px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  });
}

/** 图文墙板：米色底 + 若干“照片”色块（示意） */
export function graphicWallTexture(seed = 1, cols = 10) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#EFE6D2';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < cols; i++) {
      const x = (i / cols) * w + 10 + rnd() * 20;
      const y = 30 + rnd() * 80;
      const ww = 40 + rnd() * 50;
      const hh = 40 + rnd() * 60;
      const v = 60 + rnd() * 120;
      g.fillStyle = rnd() > 0.5 ? `rgb(${v},${v},${v})` : `rgb(${v + 60},${v},${v - 30})`;
      g.fillRect(x, y, ww, hh);
      g.fillStyle = 'rgba(80,70,60,0.35)';
      for (let k = 0; k < 4; k++) g.fillRect(x, y + hh + 10 + k * 8, ww, 3);
    }
  });
}

/** 西墙作品墙：密密麻麻的彩色小作品 */
export function worksWallTexture() {
  let s = 7;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const pal = ['#2b2b2b', '#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad', '#ecf0f1', '#6d4c41'];
  return canvasTex(2048, 512, (g, w, h) => {
    g.fillStyle = '#E8DCC4';
    g.fillRect(0, 0, w, h);
    // 顶部一排书法
    for (let i = 0; i < 28; i++) {
      g.fillStyle = '#fbf8f0';
      g.fillRect(20 + i * 72, 12, 56, 80);
      g.fillStyle = '#222';
      g.fillRect(40 + i * 72, 26, 14, 52);
    }
    for (let i = 0; i < 700; i++) {
      g.fillStyle = pal[(rnd() * pal.length) | 0];
      const x = rnd() * w;
      const y = 110 + rnd() * (h - 120);
      g.beginPath();
      g.ellipse(x, y, 6 + rnd() * 12, 6 + rnd() * 14, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** 东墙高展柜后方的青绿山水背景 */
export function landscapeTexture() {
  return canvasTex(1024, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#E6DCC0');
    grd.addColorStop(1, '#D8CBA8');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    const layer = (col, base, amp, seed) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) {
        const y = base - Math.abs(Math.sin(x * 0.011 + seed) * amp) - Math.sin(x * 0.037 + seed * 2) * amp * 0.3;
        g.lineTo(x, y);
      }
      g.lineTo(w, h);
      g.fill();
    };
    layer('rgba(110,150,160,0.55)', 170, 110, 1);
    layer('rgba(70,120,120,0.6)', 210, 80, 3);
    layer('rgba(60,90,100,0.6)', 250, 50, 5);
  });
}

/** 剪纸风格吊挂画（示意） */
export function hangingPaintingTexture(seed) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return canvasTex(512, 360, (g, w, h) => {
    g.fillStyle = '#F2E6CC';
    g.fillRect(0, 0, w, h);
    const pal = ['#5b4636', '#c0392b', '#e6b33a', '#3f7f6f', '#d98c5f'];
    for (let i = 0; i < 9; i++) {
      g.fillStyle = pal[i % pal.length];
      g.beginPath();
      g.ellipse(60 + rnd() * 400, 60 + rnd() * 240, 30 + rnd() * 40, 40 + rnd() * 60, rnd(), 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** 前言墙 / 人物展板上的竖排文字板 */
export function textPanelTexture(title, lines = 8) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#F4EEDF';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a4636';
    g.font = `bold 56px ${FONT}`;
    g.textAlign = 'center';
    g.fillText(title, w / 2, 90);
    g.fillStyle = 'rgba(90,70,54,0.45)';
    for (let i = 0; i < lines; i++) g.fillRect(60, 140 + i * 34, w - 120 - (i % 3) * 30, 8);
  });
}

/** 数字编号标签（圆角牌子） */
export function labelTexture(text) {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = 'rgba(20,40,60,0.85)';
    const r = 40;
    g.beginPath();
    g.roundRect(8, 8, w - 16, h - 16, r);
    g.fill();
    g.strokeStyle = '#7fd6ff';
    g.lineWidth = 6;
    g.stroke();
    g.fillStyle = '#fff';
    g.font = `bold 64px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}
