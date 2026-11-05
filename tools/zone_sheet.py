"""给每个区域文件夹拼一张带文件名的总览图（frames_dense/zones/<区域>/_sheet.jpg）"""
import glob, os, sys
from PIL import Image, ImageDraw, ImageFont
font = ImageFont.load_default(28)
for d in sorted(glob.glob('frames_dense/zones/*/')):
    files = sorted(f for f in glob.glob(d + '*.jpg') if not os.path.basename(f).startswith('_'))
    W, H, cols = 640, 360, 4
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGB', (W * cols, H * rows), 'black')
    for i, f in enumerate(files):
        im = Image.open(f).resize((W, H))
        ImageDraw.Draw(im).text((8, 6), os.path.basename(f), fill='yellow', font=font, stroke_width=3, stroke_fill='black')
        sheet.paste(im, ((i % cols) * W, (i // cols) * H))
    sheet.save(d + '_sheet.jpg', quality=82)
    print(d)
