"""Import a developer HTML release without changing game code or save keys."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',required=True,help='Path to developer HTML')
    parser.add_argument('--version',type=int,required=True)
    parser.add_argument('--publish',action='store_true',help='Commit and push this release to origin/main')
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]
    source=Path(args.source)
    data=source.read_bytes()
    text=data.decode('utf-8-sig')
    if args.version<1 or '<html' not in text.lower() or '</html>' not in text.lower():
        raise SystemExit('Valid UTF-8 HTML and positive version required')
    archive=root/'docs'/'releases'/('v'+str(args.version))/'index.html'
    if archive.exists() and archive.read_bytes()!=data:
        raise SystemExit('This version already exists with different content; use a new version number')
    if args.publish:
        branch=subprocess.check_output(['git','branch','--show-current'],cwd=root,text=True).strip()
        if branch!='main':raise SystemExit('Publish from main only')
        if subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip():
            raise SystemExit('Working tree must be clean before --publish')
        subprocess.run(['git','pull','--ff-only'],cwd=root,check=True)
        if archive.exists() and archive.read_bytes()!=data:raise SystemExit('Version changed on origin; choose another number')
    archive.parent.mkdir(parents=True,exist_ok=True)
    archive.write_bytes(data)
    (root/'docs/index.html').write_bytes(data)
    manifest={'version':args.version,'original_filename':source.name,'sha256':hashlib.sha256(data).hexdigest(),
              'bytes':len(data),'published_at':datetime.now(timezone.utc).isoformat(),'archive':'releases/v'+str(args.version)+'/'}
    (root/'docs/version.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if args.publish:
        subprocess.run(['git','add','docs/index.html','docs/version.json',str(archive.relative_to(root))],cwd=root,check=True)
        subprocess.run(['git','commit','-m','Publish developer HTML v'+str(args.version)],cwd=root,check=True)
        subprocess.run(['git','push','origin','main'],cwd=root,check=True)
    print('Imported v'+str(args.version)+': '+manifest['sha256'])

if __name__=='__main__':main()
