from PIL import Image
import os

img = Image.open(r"C:\Users\Administrator\.workbuddy\clipboard-images\clipboard-2026-07-22T10-18-17-620Z-c7adfb75.jpg")
img = img.convert("RGBA")
pixels = img.load()
w, h = img.size
print(f"Original: {w}x{h}")

# 去背景 - 浅桔色/米色
bg_r, bg_g, bg_b = 185, 170, 130
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if abs(r - bg_r) < 50 and abs(g - bg_g) < 50 and abs(b - bg_b) < 50:
            pixels[x, y] = (0, 0, 0, 0)

# 找下面4个小图区域：从上往下扫，找大段空白行
row_alphas = []
for y in range(h):
    total = sum(pixels[x, y][3] for x in range(w))
    row_alphas.append(total)

# 找最长连续空白区间作为大图和小图的分割
best_start, best_len = 0, 0
cur_start = None
for y in range(h//4, 3*h//4):
    if row_alphas[y] < 2000:
        if cur_start is None:
            cur_start = y
    else:
        if cur_start is not None:
            length = y - cur_start
            if length > best_len:
                best_len = length
                best_start = cur_start
            cur_start = None

split_y = best_start + best_len // 2
print(f"Split y={split_y}, gap={best_len}px")

# 裁剪下面4小图
bottom = img.crop((0, split_y + 10, w, h))
bb = bottom.getbbox()
if bb:
    bottom = bottom.crop(bb)
bw, bh = bottom.size
print(f"Bottom cropped: {bw}x{bh}")

# 4个小图水平排列，找垂直分割线
col_alphas = []
for x in range(bw):
    total = sum(bottom.getpixel((x, y))[3] for y in range(bh))
    col_alphas.append(total)

# 找3条分割线（白线/空白列）
gaps = []
in_gap = False
gap_start = 0
for x in range(1, bw-1):
    if col_alphas[x] < 1000 and col_alphas[x-1] > 2000:
        in_gap = True
        gap_start = x
    if in_gap and col_alphas[x] > 2000:
        gaps.append((gap_start + x) // 2)
        in_gap = False

print(f"Vertical gaps: {gaps}")

# 可能找到的分割线数量不准确，用简单方式：均分4等份
frame_w = bw // 4
print(f"Frame width (auto): {frame_w}")

# 手动裁剪4帧
frames = []
for i in range(4):
    x1 = i * frame_w
    x2 = x1 + frame_w
    # 在每个区域内找精确的非透明边界
    region = bottom.crop((x1, 0, x2, bh))
    fbb = region.getbbox()
    if fbb:
        # 裁剪到内容，但保持居中
        frame = region.crop((fbb[0], 0, fbb[2], region.size[1]))
        # 统一帧大小
        frame = frame.resize((frame_w, bh), Image.LANCZOS)
    else:
        frame = region
    frames.append(frame)

# 保持每帧宽高一致
frame_h = min(f.size[1] for f in frames)
for i, f in enumerate(frames):
    f = f.resize((frame_w, frame_h), Image.LANCZOS)
    # 确保等比
    ratio = min(frame_w / f.size[0], frame_h / f.size[1])
    new_w = int(f.size[0] * ratio * 0.9)
    new_h = int(f.size[1] * ratio * 0.9)
    f = f.resize((new_w, new_h), Image.LANCZOS)
    frames[i] = f

# 4帧方向: 左/正/右/背
# 创建横向精灵表，统一尺寸
max_h = max(f.size[1] for f in frames)
max_w = max(f.size[0] for f in frames)

spritesheet = Image.new("RGBA", (max_w * 4, max_h), (0, 0, 0, 0))
for i, f in enumerate(frames):
    ox = i * max_w + (max_w - f.size[0]) // 2
    oy = (max_h - f.size[1]) // 2
    spritesheet.paste(f, (ox, oy), f)

out_path = r"G:\游戏开发\tower-defense\assets\images\enemies\enemy_spritesheet.png"
spritesheet.save(out_path)
print(f"Spritesheet saved: {spritesheet.size} -> {out_path}")
