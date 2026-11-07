// =============================================================
// 把资源库的真实物品摆进展厅
//
// 展馆发布在资源库网站的 hall/ 下。data/catalog.json 里的 exhibitLinks
// （来源 museum3d/library/exhibit_links.yaml）写明每个展位放哪些物品。
// exhibits.json 本身不改；没写到的展位继续显示发光方块。
// 单独运行时读不到 catalog.json，整个展厅保持原样。
// =============================================================
const CATALOG_URL = '../data/catalog.json';
export const LIBRARY_URL = '../';

/** 返回 null（不在资源库网站里）或 [{ exhibit, items: [{ item, row, col, cols, height, yaw }] }] */
export async function loadPlacements(exhibits) {
  let catalog;
  try {
    const res = await fetch(`${CATALOG_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    catalog = await res.json();
  } catch {
    return null;
  }
  const links = catalog.exhibitLinks || {};
  const items = new Map((catalog.items || []).map((item) => [item.id, item]));
  const placements = [];
  for (const exhibit of exhibits) {
    const spot = links[exhibit.id];
    if (!spot) continue;
    const placed = [];
    (spot.rows || []).forEach((row, r) => {
      row.forEach((id, c) => {
        const item = items.get(id);
        if (!item) return;
        placed.push({
          item,
          row: r,
          col: c,
          cols: row.length,
          height: (spot.heights && spot.heights[id]) || spot.height || 0.15,
          yaw: ((spot.yaw && spot.yaw[id]) || 0) * (Math.PI / 180),
        });
      });
    });
    if (placed.length) placements.push({ exhibit, items: placed });
  }
  return placements;
}

const base = (item) => `../items/${encodeURIComponent(item.id)}`;
export const hallModelUrl = (item) => `${base(item)}/hall.glb?v=${item.v}`;
export const fullModelUrl = (item) => `${base(item)}/model.glb?v=${item.v}`;
export const thumbUrl = (item) => `${base(item)}/thumb.webp?v=${item.v}`;
