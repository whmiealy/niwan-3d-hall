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

// ================= 第二版新增的细节贴图 =================
const rng = (seed) => {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
};
/** 画一张“照片”：随机色调的人物剪影 */
function photo(g, x, y, w, h, r, bw) {
  const v = 40 + r() * 80;
  const base = bw ? `rgb(${v},${v},${v})` : `hsl(${(r() * 50) | 0},${30 + r() * 30}%,${25 + r() * 25}%)`;
  g.fillStyle = '#fff';
  g.fillRect(x - 3, y - 3, w + 6, h + 6);
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  for (let k = 0; k < 3; k++) {
    g.fillStyle = bw ? `rgba(230,230,230,${0.3 + r() * 0.4})` : `hsla(${(r() * 360) | 0},50%,${50 + r() * 30}%,0.8)`;
    const px = x + w * (0.15 + r() * 0.6);
    g.beginPath();
    g.ellipse(px, y + h * 0.42, w * 0.08, h * 0.12, 0, 0, Math.PI * 2);
    g.fill();
    g.fillRect(px - w * 0.11, y + h * 0.55, w * 0.22, h * 0.45);
  }
}
/** 一组文字行 */
function textLines(g, x, y, w, n, color = 'rgba(70,55,40,0.55)', gap = 14) {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) g.fillRect(x, y + i * gap, i === n - 1 ? w * 0.6 : w, 5);
}

/** 北墙平柜后的图文墙：米色斑驳底 + 标题 + 照片 + 证书 + 正文 */
export function exhibitWallTexture(seed, title) {
  const r = rng(seed);
  return canvasTex(2048, 320, (g, w, h) => {
    g.fillStyle = '#E9E0CC';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(150,135,110,${r() * 0.12})`;
      g.fillRect(r() * w, r() * h, 3 + r() * 14, 3 + r() * 10);
    }
    let x = 30;
    if (title) {
      g.fillStyle = '#7a1d18';
      g.fillRect(x, 24, 300, 34);
      g.fillStyle = '#ffe9b0';
      g.font = `bold 24px ${FONT}`;
      g.fillText(title, x + 14, 49);
    }
    while (x < w - 200) {
      const kind = r();
      if (kind < 0.45) {
        const pw = 120 + r() * 140;
        photo(g, x, 80 + r() * 40, pw, pw * 0.72, r, r() < 0.5);
        x += pw + 30;
      } else if (kind < 0.6) {
        g.fillStyle = '#f7f3ea';
        g.fillRect(x, 110, 130, 90);
        g.strokeStyle = '#b08a3a';
        g.lineWidth = 4;
        g.strokeRect(x + 6, 116, 118, 78);
        textLines(g, x + 20, 140, 90, 3);
        x += 160;
      } else {
        textLines(g, x, 90, 200, 9);
        x += 230;
      }
    }
  });
}

/** 楼梯上方照片墙（大量彩色照片 + 红色竖标签） */
export function photoCollageTexture() {
  const r = rng(77);
  return canvasTex(1024, 330, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#8c1c1c';
    for (let i = 0; i < 3; i++) g.fillRect(20 + i * 34, 30 + i * 40, 28, 120);
    g.fillStyle = '#ffe9b0';
    g.font = `bold 20px ${FONT}`;
    ['黄', '河', '泥'].forEach((t, i) => g.fillText(t, 24 + i * 34, 60 + i * 40));
    for (let i = 0; i < 48; i++) {
      const col = i % 12;
      const row = (i / 12) | 0;
      const pw = 56 + r() * 20;
      photo(g, 140 + col * 72 + r() * 8, 20 + row * 72 + r() * 10 + Math.abs(col - 6) * 4, pw, pw * 0.7, r, false);
    }
  });
}

/** 书法竖幅（白底黑字，上下天地杆） */
export function calligraphyTexture(text) {
  return canvasTex(160, 640, (g, w, h) => {
    g.fillStyle = '#d9cfb8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#fbf8f0';
    g.fillRect(14, 30, w - 28, h - 60);
    g.fillStyle = '#5a3b22';
    g.fillRect(0, 0, w, 14);
    g.fillRect(0, h - 14, w, 14);
    g.fillStyle = '#1a1a1a';
    g.font = `bold 64px "Kaiti SC","STKaiti","KaiTi",${FONT}`;
    g.textAlign = 'center';
    [...text].forEach((c, i) => g.fillText(c, w / 2, 110 + i * 120));
    g.fillStyle = '#c0392b';
    g.fillRect(w / 2 - 10, h - 90, 20, 20);
  });
}

/** 水墨画（落地画框 / 柱上画框） */
export function inkPaintingTexture(seed) {
  const r = rng(seed);
  return canvasTex(400, 560, (g, w, h) => {
    g.fillStyle = '#5a4030';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f5f0e2';
    g.fillRect(24, 24, w - 48, h - 48);
    for (let i = 0; i < 14; i++) {
      g.fillStyle = `rgba(20,20,20,${0.25 + r() * 0.6})`;
      g.beginPath();
      g.ellipse(60 + r() * 280, 80 + r() * 380, 10 + r() * 40, 8 + r() * 30, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = 'rgba(30,30,30,0.7)';
    g.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(80 + r() * 240, 120 + r() * 300);
      g.quadraticCurveTo(100 + r() * 200, 100 + r() * 300, 80 + r() * 240, 120 + r() * 300);
      g.stroke();
    }
    g.fillStyle = '#c0392b';
    g.fillRect(w - 80, h - 110, 18, 18);
  });
}

/** “大河之魂”吊挂长卷：米黄底 + 书法标题 + 彩色泥玩剪影 */
export function riverSoulTexture(i) {
  const r = rng(101 + i * 13);
  const pal = ['#2b2b2b', '#b8322a', '#e3a33b', '#2f6f5f', '#d97a4a', '#6b4a8a'];
  return canvasTex(360, 1040, (g, w, h) => {
    g.fillStyle = '#EFE3C8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#6b4a2a';
    g.fillRect(0, 0, w, 18);
    g.fillRect(0, h - 18, w, 18);
    if (i % 2 === 0) {
      g.fillStyle = '#222';
      g.font = `bold 70px "Kaiti SC","STKaiti","KaiTi",${FONT}`;
      g.textAlign = 'center';
      ['大', '河', '之', '魂'].forEach((c, k) => g.fillText(c, 90, 120 + k * 86));
    }
    for (let k = 0; k < 7; k++) {
      const cx = 60 + r() * 240;
      const cy = (i % 2 === 0 ? 480 : 140) + r() * 480;
      g.fillStyle = pal[k % pal.length];
      g.beginPath();
      g.ellipse(cx, cy, 30 + r() * 40, 50 + r() * 60, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = pal[(k + 2) % pal.length];
      g.beginPath();
      g.arc(cx, cy - 60 - r() * 20, 22 + r() * 10, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.fillRect(cx - 8, cy - 70, 5, 5);
      g.fillRect(cx + 4, cy - 70, 5, 5);
    }
  });
}

/** 西墙南段宣传板“黄河泥咕咕玩具”（照片 + 证书 + 文字） */
export function promoBoardTexture() {
  const r = rng(55);
  return canvasTex(1024, 640, (g, w, h) => {
    g.fillStyle = '#F3EBDD';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a7a3a';
    g.font = `bold 46px ${FONT}`;
    g.fillText('“黄河流域泥玩具”校本课程', 300, 90);
    for (let i = 0; i < 6; i++) photo(g, 330 + (i % 3) * 220, 130 + ((i / 3) | 0) * 170, 190, 140, r, false);
    for (let i = 0; i < 10; i++) {
      g.fillStyle = '#fbf8f0';
      g.fillRect(30 + (i % 5) * 56, 120 + ((i / 5) | 0) * 90, 46, 74);
      textLines(g, 36 + (i % 5) * 56, 136 + ((i / 5) | 0) * 90, 34, 4, 'rgba(30,30,30,0.6)', 12);
    }
    textLines(g, 330, 490, 600, 6);
  });
}

/** 卡通人物 / 大娃娃立牌（透明底剪影） */
export function standeeTexture(kind) {
  return canvasTex(256, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    if (kind === 'doll') {
      g.fillStyle = '#f2c9d2';
      g.beginPath();
      g.ellipse(128, 300, 110, 200, 0, 0, Math.PI * 2);
      g.fill();
      ['#e74c3c', '#27ae60', '#f1c40f', '#3498db', '#9b59b6'].forEach((c, i) => {
        g.fillStyle = c;
        for (let k = 0; k < 4; k++) {
          g.beginPath();
          g.arc(50 + k * 50 + (i % 2) * 20, 260 + i * 45, 16, 0, Math.PI * 2);
          g.fill();
        }
      });
      g.fillStyle = '#222';
      g.beginPath();
      g.arc(128, 110, 70, Math.PI, 0);
      g.fill();
      g.fillStyle = '#fbe3d3';
      g.beginPath();
      g.arc(128, 130, 52, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#c0392b';
      g.beginPath();
      g.arc(110, 140, 8, 0, Math.PI * 2);
      g.arc(146, 140, 8, 0, Math.PI * 2);
      g.fill();
    } else {
      // 坐着捏泥人的卡通男孩
      g.fillStyle = '#ffffff';
      g.fillRect(70, 170, 120, 150);
      g.fillStyle = '#c0392b';
      g.fillRect(70, 190, 120, 8);
      g.fillStyle = '#3d3d3d';
      g.fillRect(60, 320, 140, 120);
      g.fillStyle = '#f5d0b0';
      g.beginPath();
      g.arc(130, 110, 62, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#222';
      g.beginPath();
      g.arc(130, 92, 64, Math.PI, 0);
      g.fill();
      g.fillStyle = '#c0392b';
      g.beginPath();
      g.arc(130, 140, 16, 0, Math.PI);
      g.fill();
    }
  });
}

/** 白底蓝边制度牌 / 海报 */
export function posterTexture(seed) {
  const r = rng(seed);
  return canvasTex(256, 360, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#3fb4d6';
    g.fillRect(0, 0, w, 40);
    g.fillRect(0, h - 24, w, 24);
    for (let i = 0; i < 14; i++) textLines(g, 24, 70 + i * 18, 200 - r() * 40, 1, 'rgba(40,60,80,0.5)');
  });
}
