"""手动修正区域选帧：去掉糊帧/放错区域的帧，补充指定时间附近（±1 秒内最清楚）的帧"""
import json, os, shutil, glob
sharp = json.load(open('frames_dense/_sharpness.json'))
import cv2
def best_near(v, t, win=1.0):
    best = None
    for f in glob.glob(f'frames_dense/{v}/*.jpg'):
        tt = (int(os.path.basename(f)[:5]) - 1) / 3
        if abs(tt - t) <= win:
            if f not in sharp:
                img = cv2.resize(cv2.imread(f, 0), (640, 360)); sharp[f] = float(cv2.Laplacian(img, cv2.CV_64F).var())
            if best is None or sharp[f] > sharp[best[0]]:
                best = (f, tt)
    return best
REMOVE = {'08_地面': ['v2_t0198.0', 'v2_t0209.0'], '01_入口楼梯区': ['v3_t0073.0']}
ADD = {
    '01_入口楼梯区': [('v2', 2.7), ('v2', 3.7), ('v2', 214)],
    '02_北墙展线': [('v1', 5.0), ('v2', 21.0), ('v2', 24.0), ('v2', 27.5), ('v2', 137.5)],
    '08_地面': [('v1', 13.7), ('v3', 232.3), ('v2', 22.0)],
    '06_中间展台区': [('v1', 16.3)],
}
for z, names in REMOVE.items():
    for n in names:
        p = f'frames_dense/zones/{z}/{n}.jpg'
        if os.path.exists(p): os.remove(p)
for z, lst in ADD.items():
    for v, t in lst:
        f, tt = best_near(v, t)
        shutil.copy(f, f'frames_dense/zones/{z}/{v}_t{tt:06.1f}.jpg')
        print(z, v, round(tt, 1))
json.dump(sharp, open('frames_dense/_sharpness.json', 'w'))
