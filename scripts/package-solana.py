"""Build an allowlisted Solana source archive. Never includes runtime state."""
from pathlib import Path
import hashlib, json, zipfile
from datetime import datetime, timezone
root=Path(__file__).resolve().parent.parent
fixed=['docs/DEMO-EN.md','docs/JUDGE-GUIDE.md','README.md','LICENSE','package.json','package-lock.json','.gitignore','groq-model.env.example','solana.env.example','scripts/start-groq.ps1','scripts/start-solana.mjs','scripts/check-solana-setup.mjs','scripts/configure-solana.mjs','scripts/configure-solana.ps1','scripts/parse-model-json.mjs','scripts/parse-model-json.test.mjs','scripts/package-solana.py']
paths=[root/p for p in fixed]+sorted(p for p in (root/'src').rglob('*') if p.is_file())
secrets=[]
for env in (root/'work').glob('*.env'):
 for line in env.read_text(encoding='utf-8-sig').splitlines():
  key,sep,value=line.partition('=');value=value.strip().strip(chr(34)+chr(39))
  if sep and any(x in key.upper() for x in ['KEY','SECRET','TOKEN','PASSWORD']) and len(value)>=16:
   secrets.append(value.encode())
files={}
for p in paths:
 if p.is_symlink():raise RuntimeError('Symlink blocked')
 rel=p.relative_to(root).as_posix();content=p.read_bytes()
 if any(value in content for value in secrets):raise RuntimeError('Credential match; archive blocked')
 if p.suffix=='.env' or any(part in ['work','node_modules','evidence'] for part in p.relative_to(root).parts):raise RuntimeError('Private path blocked')
 files[rel]=content
manifest={'privateStateIncluded':False,'files':[{'path':name,'sha256':hashlib.sha256(data).hexdigest()} for name,data in sorted(files.items())]}
files['MANIFEST.json']=json.dumps(manifest,indent=2).encode()
output=root/'releases';output.mkdir(exist_ok=True)
archive=output/('chat-to-invoice-solana-source-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')+'.zip')
with zipfile.ZipFile(archive,'x',zipfile.ZIP_DEFLATED) as z:
 for name,data in sorted(files.items()):z.writestr('chat-to-invoice-solana/'+name,data)
with zipfile.ZipFile(archive) as z:
 if z.testzip():raise RuntimeError('Archive integrity failed')
 for item in manifest['files']:
  if hashlib.sha256(z.read('chat-to-invoice-solana/'+item['path'])).hexdigest()!=item['sha256']:raise RuntimeError('Manifest mismatch')
print(json.dumps({'archive':str(archive),'files':len(files),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'privateStateIncluded':False}))
