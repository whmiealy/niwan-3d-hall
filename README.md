# 泥玩世家 · 3D 展厅

Three.js + Vite 做的展馆网页 3D 场景（粗模版，后续替换为高精度 / 高斯泼溅模型）。

- 在线访问（电脑、手机通用）：https://whmiealy.github.io/niwan-3d-hall/
- 推送到 `main` 后 GitHub Actions 自动构建发布，公网地址同步更新

## 本地运行
```bash
npm install
npm run dev
```

## 目录
- `src/data/layout.js` 展厅布局与碰撞数据（与展厅模型无关）
- `src/data/exhibits.json` 展品信息（编号、名称、分类、模型路径）
- `src/hall/` 展厅外壳：`ProceduralHall.js` 粗模，`SplatHall.js` 预留高斯泼溅
- `src/exhibits/` 展品占位与点击，`src/controls/` 漫游控制，`src/viewer/` 展品 3D 查看器
- `docs/` 布局说明和平面草图
