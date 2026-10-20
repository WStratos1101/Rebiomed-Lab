from pathlib import Path
import zipfile
root=Path(__file__).resolve().parent.parent
out=root/'artifacts/web-for-laboratory.zip'
out.parent.mkdir(exist_ok=True)
excluded={'.git','node_modules','.wrangler','artifacts','__pycache__'}
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as archive:
 for p in sorted(root.rglob('*')):
  rel=p.relative_to(root)
  if not p.is_file() or excluded.intersection(rel.parts): continue
  if p.name.startswith(('.env','.dev.vars')) and not p.name.endswith('.example'): continue
  archive.write(p,Path('web-for-laboratory')/rel)
print(out)
