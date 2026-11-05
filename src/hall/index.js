// =============================================================
// 展厅外壳的统一入口
//
// 不管是粗模还是高斯泼溅，都返回同一个结构：
//   { root: THREE.Object3D, dispose(): void }
// 主程序只把 root 加进场景，其他什么都不依赖它（不点击、不碰撞），
// 所以换模型只需要改 config.js 里的 HALL_MODE。
// =============================================================
import { CONFIG } from '../config.js';
import { createProceduralHall } from './ProceduralHall.js';

export async function createHall(renderer) {
  if (CONFIG.HALL_MODE === 'splat') {
    const { createSplatHall } = await import('./SplatHall.js');
    return createSplatHall(CONFIG.SPLAT, renderer);
  }
  return createProceduralHall();
}
