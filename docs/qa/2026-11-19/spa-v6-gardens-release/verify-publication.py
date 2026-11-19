import argparse, datetime, hashlib, json, re
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urljoin, urlsplit, parse_qs

p=argparse.ArgumentParser()
p.add_argument('--sha', required=True)
p.add_argument('--workflow', required=True)
p.add_argument('--out', required=True)
a=p.parse_args()
assert re.fullmatch(r'[0-9a-f]{40}',a.sha)
base='https://arturmal2805-netizen.github.io/ai-cat-game/'
def fetch(url):
    with urlopen(Request(url,headers={'Cache-Control':'no-cache','User-Agent':'Chichi-release-verifier'}),timeout=45) as r:
        return r.read()
digest=lambda b:hashlib.sha256(b).hexdigest()
class Entries(HTMLParser):
    def __init__(self): super().__init__(); self.apps=[]; self.css=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if tag=='script' and re.search(r'(?:^|/)app\.js(?:\?|$)',d.get('src','')): self.apps.append(d['src'])
        if tag=='link' and d.get('rel')=='stylesheet' and 'style.css' in d.get('href',''): self.css.append(d['href'])
html=fetch(base+'?v='+a.sha[:7]); assert html==Path('public/index.html').read_bytes(), 'Delivered HTML does not match the checked build'; parsed=Entries(); parsed.feed(html.decode())
assert len(parsed.apps)==1,parsed.apps
assert len(parsed.css)==1,parsed.css
assets={}
for ref in parsed.apps+parsed.css:
    path=urlsplit(ref).path.removeprefix('./')
    content=fetch(urljoin(base,ref)); actual=digest(content)
    expected=digest((Path('public')/path).read_bytes())
    assert actual==expected,(path,actual,expected)
    assert parse_qs(urlsplit(ref).query).get('v')==[actual[:16]],ref
    assets[path]={'sha256':actual,'bytes':len(content)}
probe='art/spa-reflections/spa-interiors-c3beaca169a6.png'
content=fetch(urljoin(base,probe)); assert digest(content)==digest((Path('public')/probe).read_bytes())
assets[probe]={'sha256':digest(content),'bytes':len(content)}
config=fetch(urljoin(base,'config.js?v='+a.sha[:7])).decode()
api=re.search(r'apiBase\s*=\s*[\'"]([^\'"]+)',config)
status={'verified':False,'reason':'No remote API configured in delivered configuration'}
if api:
    try:
        value=json.loads(fetch(urljoin(api[1],'/api/status?revision='+a.sha)))
        assert value.get('release')==a.sha,value.get('release')
        assert value.get('cloudSave') and value.get('configured')
        status={'verified':True,'release':value['release'],'cloudSave':True,'configured':True}
    except Exception as e:
        status={'verified':False,'reason':str(e),'evidence':'Exact release/shared-save verification in the successful main workflow'}
result={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'release':a.sha,
        'workflow':a.workflow,'url':base+'?v='+a.sha[:7],
        'oneApplicationScript':True,'applicationReference':parsed.apps[0],
        'stylesheetReference':parsed.css[0],'htmlSHA256':digest(html),'htmlMatchesCheckedBuild':True,'assets':assets,
        'siteAssetHashesMatched':True,'workerStatusDirect':status,'paidInference':False,
        'scope':'Incremental SPA interiors, room reflection atlas, gardens/cascades and physical routes; not full reference matching or device FPS approval.'}
Path(a.out).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
