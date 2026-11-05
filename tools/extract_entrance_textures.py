"""入口楼梯区贴图提取：从视频原帧裁剪 + 透视矫正 + 做可平铺材质。
用法：python3 tools/extract_entrance_textures.py
输入：frames_dense/src4k/*.jpg（按时间点从原视频取的高清帧）
输出：public/textures/entrance/*.jpg（单张不超过 1024/2048 像素）

角点坐标是在 tools/grid.py 生成的网格图上读出来的原图像素坐标，顺序：左上、右上、右下、左下。
"""
import os
import cv2
import numpy as np

SRC = 'frames_dense/src4k'
OUT = 'public/textures/entrance'
os.makedirs(OUT, exist_ok=True)


def load(name):
    return cv2.imread(f'{SRC}/{name}.jpg')


def warp(img, quad, w, h):
    """透视矫正：把四边形 quad 拉成 w×h 的正视图"""
    src = np.float32(quad)
    dst = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    return cv2.warpPerspective(img, cv2.getPerspectiveTransform(src, dst), (w, h), flags=cv2.INTER_CUBIC)


def save(name, img, quality=85):
    cv2.imwrite(f'{OUT}/{name}.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    print(name, img.shape[1], 'x', img.shape[0])


def even_light(img, k=0.6):
    """压平大面积明暗（筒灯光斑），保留细节：除以大尺度模糊后的亮度"""
    f = img.astype(np.float32)
    blur = cv2.GaussianBlur(f, (0, 0), sigmaX=max(img.shape[:2]) / 6)
    mean = f.reshape(-1, 3).mean(0)
    out = f / np.maximum(blur, 1) * mean
    return np.clip(f * (1 - k) + out * k, 0, 255).astype(np.uint8)


def make_seamless(img):
    """用偏移 + 十字羽化把贴图做成四方连续"""
    h, w = img.shape[:2]
    shifted = np.roll(np.roll(img, h // 2, 0), w // 2, 1).astype(np.float32)
    base = img.astype(np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    # 离原图边缘越近，越多用偏移后的图（偏移图在原边缘处是连续的）
    d = np.minimum(np.minimum(xx, w - 1 - xx) / (w / 2), np.minimum(yy, h - 1 - yy) / (h / 2))
    a = np.clip(d * 2.5, 0, 1)[..., None]
    return (base * a + shifted * (1 - a)).astype(np.uint8)


door = load('door')        # IMG_5856 第 0 秒，门墙正面（4K）
side = load('side')        # IMG_5857 第 67.7 秒，楼梯侧面 + 前言 + 王蓝田（4K）
pre = load('preface')      # IMG_5857 第 85.3 秒，前言近景（4K）
col = load('collage')      # 0G6A5533 第 7 秒，照片墙正面（1080p）
plat = load('platform')    # 0G6A5533 第 1.7 秒，平台前脸（1080p）
stair = load('stair')      # 0G6A5533 第 5 秒，楼梯 + 泥塑人像（1080p）

# ---------- 1. 制度牌 ×4（门墙两块 + 北墙两块），实际 0.6×0.85 ----------
save('notice_1', warp(door, [(751, 953), (1196, 1002), (1158, 1610), (678, 1582)], 480, 680))
save('notice_2', warp(door, [(1292, 1030), (1676, 1092), (1667, 1642), (1258, 1620)], 480, 680))
save('notice_3', warp(door, [(2623, 1382), (2904, 1414), (2960, 1898), (2691, 1887)], 480, 680))
save('notice_4', warp(door, [(2915, 1414), (3156, 1433), (3241, 1915), (2970, 1898)], 480, 680))

# ---------- 2. 竖条纹墙板（可平铺）：取正视墙面，按列求平均得到条纹剖面 ----------
wall = warp(door, [(900, 600), (1790, 690), (1790, 940), (900, 905)], 1068, 300)  # 约 2.0m 宽，12cm 一道槽
prof = np.median(wall.astype(np.float32), axis=0)            # 每一列的中值颜色（去掉光斑）
prof = prof / prof.reshape(-1, 3).mean(0) * np.float32([101, 184, 226])  # 统一到视频里的平均墙色（BGR）
# 截取恰好 4 个周期（约 48cm）做成无缝贴图
period = 1068 / (2.0 / 0.12)
n = int(round(period * 4))
tile_row = cv2.resize(prof[None, :n, :], (512, 1), interpolation=cv2.INTER_AREA)
stripe = np.repeat(tile_row, 512, axis=0)
noise = np.random.default_rng(1).normal(0, 3, stripe.shape).astype(np.float32)  # 轻微木纹噪点
save('stripe_wall', np.clip(stripe + noise, 0, 255).astype(np.uint8))      # 代表 0.48m × 0.48m

# ---------- 3. 照片墙（含红色竖标签），实际约 4.3m × 2.0m ----------
collage = warp(col, [(0, 160), (1420, 168), (1420, 800), (0, 795)], 2048, 912)
save('photo_collage', collage, 88)

# ---------- 4. 前言墙（1.6m × 3.8m）、王蓝田人物板（1.0m × 3.2m） ----------
save('preface', warp(side, [(1322, 390), (1913, 454), (1855, 1791), (1247, 1787)], 540, 1280), 88)
# 前言上半部分文字用近景帧替换，更清楚
pre_top = warp(pre, [(917, 81), (2256, 132), (2256, 2160), (917, 2160)], 540, 818)
# 近景只用于合成，不单独输出
full = cv2.imread(f'{OUT}/preface.jpg').astype(np.float32)
top = pre_top.astype(np.float32)
blend = full.copy()
blend[:818] = top
for i in range(60):                                   # 在 758~818 行之间渐变过渡
    a = i / 60
    r = 758 + i
    blend[r] = top[r] * (1 - a) + full[r] * a
save('preface', np.clip(blend, 0, 255).astype(np.uint8), 88)
save('portrait_wanglantian', warp(side, [(1945, 721), (2235, 699), (2228, 1802), (1945, 1774)], 320, 1024), 88)

# ---------- 5. 平台前脸米黄仿大理石（可平铺，代表 1.2m × 1.2m，两块砖） ----------
marble = warp(plat, [(130, 300), (650, 300), (650, 560), (130, 560)], 512, 256)
marble = even_light(marble, 0.9)
marble = cv2.resize(marble, (512, 512))
save('marble_tile', make_seamless(make_seamless(marble)))

# ---------- 6. 平台压边 / 踏步：红棕花岗岩（可平铺） ----------
rng = np.random.default_rng(3)
base = np.float32([60, 80, 118])                                   # BGR，取自踏步颜色 #765040 一带
gran = np.ones((512, 512, 3), np.float32) * base
for size, amp in ((1, 26), (2, 16), (4, 10)):                       # 三种粒径的颗粒叠加
    n = rng.normal(0, amp, (512 // size, 512 // size, 1)).astype(np.float32)
    gran += cv2.resize(n, (512, 512), interpolation=cv2.INTER_NEAREST)[..., None]
dark = rng.random((512, 512)) > 0.985                               # 零星黑色晶粒
gran[dark] *= 0.4
save('granite', np.clip(gran, 0, 255).astype(np.uint8))

# ---------- 7. 小物件正面贴图 ----------
save('fire_box', warp(plat, [(1112, 462), (1203, 470), (1195, 640), (1109, 693)], 256, 384))
fan = plat[256:352, 728:859]
save('fan_mingyue', cv2.resize(fan, (262, 192)))
save('backpack', cv2.resize(plat[683:939, 565:811], (256, 256)))

# ---------- 8. 泥塑人像的草泥质感（可平铺） ----------
straw = stair[150:250, 860:905]
straw = cv2.resize(straw, (128, 256))
save('statue_clay', make_seamless(cv2.resize(np.vstack([straw, cv2.flip(straw, 0)]), (256, 256))))

# ---------- 9. 颜色取样（打印出来写进代码） ----------
def mean_rgb(img, x0, y0, x1, y1):
    b, g, r = img[y0:y1, x0:x1].reshape(-1, 3).mean(0)
    return '#%02X%02X%02X' % (int(r), int(g), int(b))

print('门板颜色', mean_rgb(door, 1950, 1300, 2050, 1500))
print('门套颜色', mean_rgb(door, 2440, 1400, 2490, 1700))
print('平顶颜色', mean_rgb(door, 1300, 300, 1700, 500))
print('楼梯踏面', mean_rgb(plat, 1400, 330, 1450, 345))
print('地砖颜色', mean_rgb(plat, 1300, 700, 1500, 900))
print('白展台', mean_rgb(plat, 760, 450, 840, 650))
