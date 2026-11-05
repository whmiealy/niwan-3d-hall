// =============================================================
// 全局配置
// =============================================================
export const CONFIG = {
  /**
   * 展厅外壳用哪种模型：
   *  'procedural' —— 现在的粗模（代码搭的几何体）
   *  'splat'      —— 以后换成高斯泼溅（.ply / .spz），见 src/hall/SplatHall.js
   */
  HALL_MODE: 'procedural',

  /** 高斯泼溅模型的参数（HALL_MODE = 'splat' 时生效） */
  SPLAT: {
    url: '/splats/hall.spz', // 放在 public/splats/ 下
    // 扫描模型的坐标通常和我们的布局坐标不一致，用这三个参数对齐：
    // 对齐目标：展厅中心地面 = (0,0,0)，X 向东，Z 向南，单位米
    position: [0, 0, 0],
    rotation: [0, 0, 0], // 弧度
    scale: 1,
  },

  /** 人眼高度（米） */
  EYE_HEIGHT: 1.6,
  /** 走路速度（米/秒） */
  WALK_SPEED: 2.2,
  /** 人的碰撞半径（米） */
  PLAYER_RADIUS: 0.3,
  /** 出生点（世界坐标）和初始朝向（弧度，0 = 朝北，-π/2 = 朝东） */
  SPAWN: { x: -9.4, z: -4.3, yaw: -1.75 },

  /** 手机上的最大像素比（越大越清晰也越卡） */
  MAX_PIXEL_RATIO_MOBILE: 1.5,
  MAX_PIXEL_RATIO_DESKTOP: 2,
};
