"""按区域挑帧：在每个区域对应的视频时间段里，按清晰度（拉普拉斯方差）挑最清楚的若干张。
用法：python3 tools/pick_zone_frames.py
输出：frames_dense/zones/<区域名>/<视频>_t<秒>.jpg，以及每区域一张总览图 _sheet.jpg
"""
import cv2, json, os, shutil, glob

FPS = 3
ROOT = 'frames_dense'
# 各区域在三个视频里出现的时间段（秒），来自之前逐帧浏览的结果
ZONES = {
    '01_入口楼梯区': {'v1': [(0, 4)], 'v2': [(0, 20), (85, 90), (211, 216)], 'v3': [(64, 76)]},
    '02_北墙展线': {'v1': [(4, 7)], 'v2': [(19, 30), (90, 137)], 'v3': [(76, 196)]},
    '03_东墙高柜': {'v1': [(18, 22)], 'v2': [(25, 33), (139, 170)], 'v3': [(232, 266)]},
    '04_西墙摊位区': {'v1': [(7, 11), (27, 29)], 'v2': [(48, 84), (229, 238)], 'v3': [(0, 62), (318, 330)]},
    '05_南墙与东南角': {'v1': [(10, 12), (16, 17), (20, 22), (24, 26)], 'v2': [(32, 36), (171, 190)], 'v3': [(264, 322)]},
    '06_中间展台区': {'v1': [(13, 17)], 'v2': [(36, 48), (187, 226)], 'v3': [(192, 240)]},
    '07_天花板': {'v1': [(22, 23)], 'v2': [(2, 5), (21, 25), (86, 93), (139, 146)], 'v3': [(72, 86)]},
    '08_地面': {'v1': [(15, 18)], 'v2': [(40, 48), (198, 216)], 'v3': [(214, 234)]},
}
N_PICK = 10
MIN_GAP = 2.0  # 同一视频里两张至少相隔 2 秒，避免重复

cache_path = os.path.join(ROOT, '_sharpness.json')
sharp = json.load(open(cache_path)) if os.path.exists(cache_path) else {}

def score(path):
    if path not in sharp:
        img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
        img = cv2.resize(img, (640, 360))
        sharp[path] = float(cv2.Laplacian(img, cv2.CV_64F).var())
    return sharp[path]

os.makedirs(os.path.join(ROOT, 'zones'), exist_ok=True)
for zone, spans in ZONES.items():
    cands = []
    for v, ranges in spans.items():
        for f in sorted(glob.glob(f'{ROOT}/{v}/*.jpg')):
            t = (int(os.path.basename(f)[:5]) - 1) / FPS
            if any(a <= t <= b for a, b in ranges):
                cands.append((score(f), v, t, f))
    cands.sort(reverse=True)
    picked = []
    for s, v, t, f in cands:
        if all(not (pv == v and abs(pt - t) < MIN_GAP) for _, pv, pt, _ in picked):
            picked.append((s, v, t, f))
        if len(picked) >= N_PICK:
            break
    out = os.path.join(ROOT, 'zones', zone)
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    for s, v, t, f in sorted(picked, key=lambda x: (x[1], x[2])):
        shutil.copy(f, os.path.join(out, f'{v}_t{t:06.1f}.jpg'))
    print(zone, len(cands), '候选 →', len(picked), '张')
json.dump(sharp, open(cache_path, 'w'))
