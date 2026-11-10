"""Offline periodic wind-wave slopes and refracted-light focusing, never runtime.
The PNG is technical linear RGBA data: slope X/Y, caustics, height/crest mask.
"""
import hashlib
import pathlib
import numpy as np
from PIL import Image
root = pathlib.Path(__file__).resolve().parents[1]
size = 1024
rng = np.random.default_rng(731940)
freq = np.fft.fftfreq(size) * size
kx, ky = np.meshgrid(freq, freq)
k = np.sqrt(kx*kx + ky*ky)
safe = np.maximum(k, 1.)
wind = (kx*.91 + ky*.414) / safe
spectrum = np.exp(-((2.5/safe)**2)) * (.13 + wind**4) / safe**4.2
spectrum *= np.exp(-(safe/80.)**2)
spectrum[0, 0] = 0
height_fft = np.fft.fft2(rng.normal(size=(size, size))) * np.sqrt(spectrum)
height = np.fft.ifft2(height_fft).real
height /= np.std(height)
gx = np.fft.ifft2(height_fft * (kx*1j)).real
gy = np.fft.ifft2(height_fft * (ky*1j)).real
scale = np.quantile(np.sqrt(gx*gx + gy*gy), .995)
gx, gy = gx / scale, gy / scale
# A static downward ray sheet is refracted by the wave normal. Bilinear splats
# make natural focusing filaments; the game only advects two shared samples.
y, x = np.mgrid[:size, :size]
px, py = (x+gx*22) % size, (y+gy*22) % size
ix, iy = px.astype(int), py.astype(int)
a, b = px-ix, py-iy
light = np.zeros((size, size))
for dx, dy, weight in [(0,0,(1-a)*(1-b)),(1,0,a*(1-b)),(0,1,(1-a)*b),(1,1,a*b)]:
    np.add.at(light, ((iy+dy)%size, (ix+dx)%size), weight)
light = (light*4+np.roll(light,1,0)+np.roll(light,-1,0)+np.roll(light,1,1)+np.roll(light,-1,1))/8
caustic = np.clip((light-.55)*.45, 0, 1)
rgba = np.stack([np.clip(.5+gx*.48,0,1),np.clip(.5+gy*.48,0,1),caustic,np.clip(.5+height*.16,0,1)],axis=-1)
image = Image.fromarray(np.round(rgba*255).astype(np.uint8))
folder = root/'public/art/ocean-water'
folder.mkdir(exist_ok=True, parents=True)
path = folder/'wind-field.png'
image.save(path, optimize=True)
content = path.read_bytes()
name = 'wind-field-'+hashlib.sha256(content).hexdigest()[:12]+'.png'
path.rename(folder/name)
for old in folder.glob('wind-field-*.png'):
    if old.name != name:
        old.unlink()
(root/'public/mosasaur-water-field-assets.js').write_text('// Offline linear wind slopes, focused light and crests.\nexport const MOSA_WATER_FIELD="./art/ocean-water/'+name+'";\nexport const MOSA_WATER_FIELD_BYTES='+str(len(content))+';\n')
print(name, len(content), 'bytes; 5,592,404 mipmapped RGBA GPU bytes')
