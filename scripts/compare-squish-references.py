"""Actual-game evidence board. Concept-art is never a pixel regression target."""
import argparse,json,hashlib,html
from pathlib import Path
from PIL import Image,ImageChops,ImageStat,ImageFilter
p=argparse.ArgumentParser();p.add_argument('directory',type=Path);p.add_argument('--review',type=Path);a=p.parse_args();d=a.directory
review=json.loads(a.review.read_text()) if a.review else {'stage':'one-squish','findings':[],'ratings':{},'referenceImage':None}
rows=[];baselines={}
for path in sorted(d.glob('*.png')):
 if path.stem.endswith('-difference') or not path.with_suffix('.json').exists():continue
 meta=json.loads(path.with_suffix('.json').read_text());image=Image.open(path).convert('RGB');stats=ImageStat.Stat(image);record={'image':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'size':image.size,'meanRGB':stats.mean,'metadata':meta}
 record['group']='-'.join(path.stem.split('-')[:2]) if path.stem.startswith('material-') else 'one-squish'
 if path.stem.endswith('rest'):baselines[record['group']]=(image,meta)
 rows.append(record)
# Rendered frames are comparable only if exact camera/settings agree. Timing
# differs deliberately to show a physical action, not an artwork similarity %.
for row in rows:
 image=Image.open(d/row['image']).convert('RGB');meta=row['metadata'];baseline,baseline_meta=baselines.get(row['group'],(None,None));same=bool(baseline is not None and baseline.size==image.size and meta['camera']==baseline_meta['camera'] and all(meta['renderer'][k]==baseline_meta['renderer'][k] for k in ['dpr','shadow','toneMapping']))
 row['sameCameraAndRenderSettings']=same
 if same:
  diff=ImageChops.difference(baseline,image);edgeDiff=ImageChops.difference(baseline.filter(ImageFilter.FIND_EDGES),image.filter(ImageFilter.FIND_EDGES));row['edgeMeanAbsoluteDifference']=sum(ImageStat.Stat(edgeDiff).mean)/3;row['meanAbsolutePixelDifference']=sum(ImageStat.Stat(diff).mean)/3;mask=diff.convert('L').point(lambda v:255 if v>12 else 0);row['changedPixelFraction']=sum(ImageStat.Stat(mask).mean)/255
  red=Image.new('RGB',image.size,'#ff2222');overlay=Image.composite(red,image,mask.point(lambda x:x//2));out=Path(row['image']).stem+'-difference.png';overlay.save(d/out);row['differenceImage']=out
 else:row['comparisonSkippedReason']='Reference frame camera/settings mismatch or baseline absent; no misregistered difference reported.'
manifest={'schema':17,'stage':review['stage'],'reference':'Original user reference A/interior and B/material states, immutable inline conversation images','referenceFileAvailable':bool(review.get('referenceImage')),'conceptArtPixelScore':None,'review':review,'frames':rows,'caveats':['Differences between rest and press show real state changes, not fidelity to artwork.','Software Chromium timings are not measurements of a physical user phone/Mac.']}
(d/'reference-validation-report.json').write_text(json.dumps(manifest,indent=2))
def esc(s):return html.escape(str(s))
ref='<img src="'+esc(review['referenceImage'])+'">' if review.get('referenceImage') else '<p>Original reference A/B is visible in the user conversation. Original image bytes are not mounted here. This slot is explicitly incomplete; no generated replacement is used.</p>'
sections=[]
for r in rows:sections.append('<article><h2>'+esc(Path(r['image']).stem)+'</h2><div class="grid"><section><h3>Reference</h3>'+ref+'</section><section><h3>Actual game</h3><img src="'+esc(r['image'])+'"></section><section><h3>Same-camera state difference</h3>'+('<img src="'+esc(r['differenceImage'])+'">' if 'differenceImage'in r else '<p>'+esc(r.get('comparisonSkippedReason'))+'</p>')+'</section></div><details><summary>Camera, timestep, material measurements and hash</summary><pre>'+esc(json.dumps(r,indent=2))+'</pre></details></article>')
body='<!doctype html><meta charset="utf-8"><title>Warehouse reference validation</title><style>body{font:16px system-ui;background:#181323;color:#fff0e1;margin:24px}h1,h2{color:#efc678}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}img{width:100%}section{background:#31243e;padding:12px;border-radius:12px}pre{white-space:pre-wrap}.BLOCKER{color:#ff8c89}</style><h1>'+esc(review['stage'])+' — actual game validation</h1><p>Reference → implementation → capture → comparison → correction → retest. No pixel-identity or hardware-FPS claim.</p><h2>Review findings</h2><pre>'+esc(json.dumps(review,indent=2))+'</pre>'+''.join(sections)
(d/'reference-validation-report.html').write_text(body)
print(json.dumps({'report':str(d/'reference-validation-report.html'),'frames':len(rows),'findings':len(review.get('findings',[]))}))
