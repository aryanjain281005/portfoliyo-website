"""Aryan, lit by the Kage night.

The photograph was taken at noon on a hazy mountain lookout. To stand in the
temple he has to be relit, not filtered:
  * the subject is cut out (Vision mask), the sky fringe decontaminated
  * the daylight is taken down to moonlight: lower exposure, cooler, less colour
  * the vermilion moon sits behind him, upper right, so it draws a rim along
    the edges that face it — hair, shoulder, the right arm
  * the lanterns on the steps are low and to his left: a faint warm lift
  * his lower body falls off into shadow, where the foreground wall takes over
"""
import numpy as np, sys
from PIL import Image, ImageFilter
from scipy import ndimage as nd

W = 1600
up = np.asarray(Image.open('up2.png').convert('RGB'), np.float32) / 255
lz = np.asarray(Image.open('src.png').convert('RGB').resize((W, W), Image.LANCZOS), np.float32) / 255
img = up * .72 + lz * .28                         # keep a little real texture under the upscale
a = np.asarray(Image.open('mask2.png').convert('L'), np.float32) / 255

# ---- edges: tighten a pixel, feather, and pull interior colour into the fringe
a = nd.grey_erosion(a, size=(3, 3))
a = nd.gaussian_filter(a, 1.1)
wsum = nd.gaussian_filter(a, 6)[..., None] + 1e-4
decon = np.stack([nd.gaussian_filter(img[..., c] * a, 6) for c in range(3)], -1) / wsum
edge = np.clip((1 - a) * 4, 0, 1)[..., None] * (a > .02)[..., None]
img = img * (1 - edge) + decon * edge

# ---- to linear, then moonlight
lin = img ** 2.2
L = (lin * [.2126, .7152, .0722]).sum(-1, keepdims=True)
sat = .46
lin = L + (lin - L) * sat
lin *= np.array([.80, .88, 1.0])                  # cold
lin *= .30                                        # exposure down to night
# the lower body sinks into shadow toward the foreground
yy, xx = np.mgrid[0:W, 0:W].astype(np.float32) / W
fall = np.clip(1 - (yy - .42) / .5, .35, 1)[..., None]
lin *= fall

# ---- rim from the moon (behind, upper right)
inside = nd.distance_transform_edt(a > .5)
ab = nd.gaussian_filter(a, 4)
gy, gx = np.gradient(ab)
n = np.stack([-gx, -gy], -1); n /= (np.linalg.norm(n, axis=-1, keepdims=True) + 1e-6)
moon = np.array([.62, -.78]); moon /= np.linalg.norm(moon)
face = np.clip((n * moon).sum(-1), 0, 1) ** 1.3
rim = np.exp(-inside / 3.2) * face ** 1.6 * (a > .05)
rim = nd.gaussian_filter(rim, 1.2)[..., None]
lin += rim * np.array([1.0, .34, .26]) * .85
# a thin cold edge all round, so the silhouette separates from the dark
cold = np.exp(-inside / 3.0)[..., None] * (a > .05)[..., None]
lin += cold * np.array([.10, .14, .20]) * .12

# ---- the lanterns: low, warm, from his left
warm = np.clip(1 - np.hypot(xx - .05, yy - 1.05) / .95, 0, 1) ** 2
lin += (warm * L[..., 0] * .35)[..., None] * np.array([1.0, .52, .2])

# ---- gentle filmic shoulder, back to display
lin = lin / (1 + lin * .35)
out = np.clip(lin, 0, 1) ** (1 / 2.2)
# a touch of contrast in the mids
out = np.clip((out - .5) * 1.08 + .5, 0, 1)

# the night air between him and the lens
haze = np.array([.045, .07, .095])
out = out * .9 + haze * .1
# the photograph ends at his waist: let that edge dissolve rather than cut
fade = np.clip((1 - yy) / .16, 0, 1)
a = a * fade
rgba = np.dstack([out, a])
im = Image.fromarray((rgba * 255).astype(np.uint8), 'RGBA')
bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
im = im.crop(bb)
im.save('aryan-night.png')
print('saved', im.size, bb)
