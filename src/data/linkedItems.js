// =============================================================
// 展位 ↔ 资源库真实物品
//
// 展馆发布在资源库网站的 hall/ 下。资源库的 data/catalog.json 里有
// exhibitLinks（展位 → 物品编号，来源 museum3d/library/exhibit_links.yaml）。
// 这里在内存里把物品的名称和模型合并到展品上；exhibits.json 本身不改。
// 单独运行时读不到 catalog.json，展品保持占位，其他功能不受影响。
// =============================================================
const CATALOG_URL = '../data/catalog.json';
export const LIBRARY_URL = '../';

/** 返回是否在资源库网站里运行 */
export async function applyLinkedItems(exhibits) {
  let catalog;
  try {
    const res = await fetch(`${CATALOG_URL}?t=${Date.now()}`);
    if (!res.ok) return false;
    catalog = await res.json();
  } catch {
    return false;
  }
  const links = catalog.exhibitLinks || {};
  const items = new Map((catalog.items || []).map((item) => [item.id, item]));
  for (const ex of exhibits) {
    const item = items.get(links[ex.id]);
    if (!item) continue;
    ex.itemId = item.id;
    ex.name = item.name;
    ex.category = item.category;
    ex.description = item.description;
    ex.model = item.model ? `../items/${encodeURIComponent(item.id)}/model.glb?v=${item.v}` : '';
  }
  return true;
}
