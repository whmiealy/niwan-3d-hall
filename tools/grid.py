"""给图片叠加坐标网格（标注的是原图像素坐标），用来读取透视矫正的四个角点。
用法：python3 tools/grid.py 输入图 输出图 [网格间距=原图像素] [裁剪 x0,y0,x1,y1]"""
import sys
from PIL import Image, ImageDraw, ImageFont
src, dst = sys.argv[1], sys.argv[2]
step = int(sys.argv[3]) if len(sys.argv) > 3 else 100
im = Image.open(src).convert('RGB')
if len(sys.argv) > 4:
    x0, y0, x1, y1 = map(int, sys.argv[4].split(','))
else:
    x0, y0, x1, y1 = 0, 0, im.width, im.height
crop = im.crop((x0, y0, x1, y1))
scale = min(1.0, 1800 / crop.width)
crop = crop.resize((int(crop.width * scale), int(crop.height * scale)))
d = ImageDraw.Draw(crop)
f = ImageFont.load_default(18)
for gx in range((x0 // step) * step, x1 + 1, step):
    if gx < x0: continue
    X = (gx - x0) * scale
    d.line([(X, 0), (X, crop.height)], fill=(255, 0, 255), width=1)
    d.text((X + 2, 2), str(gx), fill='yellow', font=f, stroke_width=2, stroke_fill='black')
for gy in range((y0 // step) * step, y1 + 1, step):
    if gy < y0: continue
    Y = (gy - y0) * scale
    d.line([(0, Y), (crop.width, Y)], fill=(0, 255, 255), width=1)
    d.text((2, Y + 2), str(gy), fill='yellow', font=f, stroke_width=2, stroke_fill='black')
crop.save(dst, quality=85)
