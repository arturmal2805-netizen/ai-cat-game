"""Original offline material charts and crisp signed-distance text. Runtime has
no Python/font dependency, texture generation, or additional rendering pass."""
from pathlib import Path
import json,hashlib,subprocess,os
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from scipy.ndimage import gaussian_filter,distance_transform_edt,zoom
out=Path('public/art/mall');out.mkdir(parents=True,exist_ok=True)
assets={};rng=np.random.default_rng(112026)
def save(data,role):
    image=Image.fromarray(np.uint8(np.clip(data,0,255)));temp=out/(role+'.png');image.save(temp,optimize=True)
    digest=hashlib.sha256(temp.read_bytes()).hexdigest()[:12];path=out/(role+'-'+digest+'.png');temp.rename(path)
    return './art/mall/'+path.name
n=512;y,x=np.mgrid[0:n,0:n];u=x/n;v=y/n
raw=rng.standard_normal((n,n))
def noise(scale):
    a=gaussian_filter(raw,scale,mode='wrap');return a/(a.std()+1e-8)
coarse=noise(48);medium=noise(12);fine=noise(2);grain=rng.standard_normal((n,n))
for kind in ['metal']:
    if kind=='marble':
        phase=u*3+coarse*.72+medium*.12
        vein=np.exp(-np.abs(np.sin(phase*np.pi*2))*55)
        cloud=np.clip(coarse*.8+medium*.3,-2,2)
        rgb=np.array([237,232,219])[None,None,:]+cloud[...,None]*3-vein[...,None]*np.array([42,34,22])[None,None,:]+grain[...,None]*.7
        height=-vein*.012+fine*.001;rough=np.clip(.23+vein*.055+fine*.012,.17,.36)
    elif kind=='metal':
        brushed=gaussian_filter(grain,(.3,12),mode='wrap')
        brushed/=brushed.std();rgb=np.full((n,n,3),195.)+brushed[...,None]*3+fine[...,None]*1.5
        height=brushed*.004;rough=np.clip(.36+brushed*.025,.25,.46)
    elif kind=='warm':
        warp=u+coarse*.018+medium*.002;grainLines=np.sin(warp*2*np.pi*32)+.45*np.sin(warp*2*np.pi*67)
        pores=np.maximum(0,fine-1)*2;rgb=np.array([161,111,67])[None,None,:]+grainLines[...,None]*np.array([13,9,5])+coarse[...,None]*3-pores[...,None]*3
        height=grainLines*.004+fine*.001;rough=np.clip(.42+fine*.025,.3,.56)
    else:
        weave=np.cos(u*2*np.pi*128)*np.cos(v*2*np.pi*128);rgb=np.full((n,n,3),221.)+weave[...,None]*10+grain[...,None]*2
        height=weave*.003;rough=np.clip(.78+weave*.04,.65,.86)
    dx=(np.roll(height,-1,1)-np.roll(height,1,1))*n*.5;dy=(np.roll(height,-1,0)-np.roll(height,1,0))*n*.5
    normal=np.stack([-dx,-dy,np.ones_like(dx)],axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
    assets[kind]={'color':save(rgb,kind+'-color'),'normal':save((normal[::2,::2]*.5+.5)*255,kind+'-normal'),'roughness':save(rough[::4,::4]*255,kind+'-roughness')}
# Licensed CC0 photographic microstructure replaces only the new mall charts.
# Offline authoring inputs are never downloaded by the game or build.
source_dir=Path(os.environ.get('CHICHI_MALL_MATERIALS','/tmp/chichi-mall-pbr'))
provenance=[]
for kind,asset in [('marble','marble_01'),('warm','natural_walnut_veneer'),('fabric','velour_velvet'),('leather','brown_leather')]:
    maps={}
    for role,size in [('color',512),('normal',256),('roughness',128)]:
        files=list(source_dir.glob(asset+'-'+role+'.*'))
        if not files:raise FileNotFoundError('Run scripts/fetch-mall-materials.py first, or set CHICHI_MALL_MATERIALS')
        raw_file=files[0];im=Image.open(raw_file)
        if role=='roughness':
            pixels=np.asarray(im).astype(float)
            if np.asarray(im).dtype==np.uint16:pixels*=255/65535
            im=Image.fromarray(np.uint8(np.clip(pixels,0,255)))
        im=im.convert('RGB' if role!='roughness' else 'L').resize((size,size),Image.Resampling.LANCZOS)
        pixels=np.asarray(im).astype(float)
        if kind=='fabric' and role=='color':
            luminance=pixels[...,0]*.2126+pixels[...,1]*.7152+pixels[...,2]*.0722
            pixels=np.repeat(np.clip(luminance/max(1,luminance.mean())*218,0,255)[...,None],3,axis=2)
        if role=='normal':
            normal=pixels/127.5-1;normal/=np.maximum(.001,np.linalg.norm(normal,axis=2,keepdims=True));pixels=(normal*.5+.5)*255
        maps[role]=save(pixels,kind+'-'+role)
        provenance.append({'asset':asset,'role':role,'sourceSha256':hashlib.sha256(raw_file.read_bytes()).hexdigest()})
    assets[kind]=maps
Path('docs/reviews/mall-material-sources-2026-11-11.json').write_text(json.dumps({'license':'CC0-1.0','licenseUrl':'https://polyhaven.com/license','sources':provenance},indent=2)+'\n')
labels=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{mallSignTexts}from'./public/mall-data.js';console.log(JSON.stringify([...new Set([...mallSignTexts(),...mallSignTexts(true)])]));"],text=True))
if len(labels)>128:raise ValueError('Mall sign atlas is full')
atlas=np.zeros((4096,2048),np.uint8);metadata={}
for i,text in enumerate(labels):
    col=i%4;row=i//4;tile=Image.new('L',(512,128),0);draw=ImageDraw.Draw(tile);size=64
    while True:
        font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',size)
        box=draw.textbbox((0,0),text,font=font);width=box[2]-box[0]
        if width<=470:break
        size-=1
    draw.text((256-width/2,64-(box[3]-box[1])/2-box[1]),text,font=font,fill=255,stroke_width=0)
    mask=np.asarray(tile)>127;sdf=distance_transform_edt(mask)-distance_transform_edt(~mask);sdf=np.uint8(np.clip(128+sdf*12,0,255))
    atlas[row*128:(row+1)*128,col*512:(col+1)*512]=sdf
    metadata[text]={'u0':(col*512+256-width/2-12)/2048,'u1':(col*512+256+width/2+12)/2048,'v0':1-(row*128+64+(box[3]-box[1]+16)/2)/4096,'v1':1-(row*128+64-(box[3]-box[1]+16)/2)/4096,'aspect':(width+24)/(box[3]-box[1]+16)}
url=save(atlas,'mall-signs-sdf');source=hashlib.sha256(json.dumps(labels,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
Path('public/mall-art-assets.js').write_text('// Offline CC0-derived surface charts and original distance-field labels. See docs/reviews/mall-material-sources-2026-11-11.json.\nexport const MALL_SURFACES='+json.dumps(assets,separators=(',',':'))+';\nexport const MALL_SIGNS_URL='+json.dumps(url)+';\nexport const MALL_SIGN_RECTS='+json.dumps(metadata,ensure_ascii=False,separators=(',',':'))+';\nexport const MALL_LABEL_SOURCE='+json.dumps(source)+';\n')
print(json.dumps({'labels':len(labels),'pngs':len(list(out.glob('*.png'))),'bytes':sum(p.stat().st_size for p in out.glob('*.png'))}))
