# Usage: python3 tools/sheet.py out.png cols scale file1 file2 ...
import sys
from PIL import Image
out, cols, scale = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
fs = sys.argv[4:]
ims = [Image.open(f).convert('RGB') for f in fs]
w = max(i.size[0] for i in ims); h = max(i.size[1] for i in ims)
tw, th = int(w * scale), int(h * scale)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw + (cols - 1) * 6, rows * th + (rows - 1) * 6), (120, 120, 120))
for i, im in enumerate(ims):
    im2 = im.resize((int(im.size[0] * scale), int(im.size[1] * scale)))
    sheet.paste(im2, ((i % cols) * (tw + 6), (i // cols) * (th + 6)))
sheet.save(out)
print(out, sheet.size)
