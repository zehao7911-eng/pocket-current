from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import re

root = Path(__file__).resolve().parent

def module(name):
    text = (root/name).read_text("utf-8-sig")
    names = re.findall(r"^export (?:function|class|const) (\w+)",text,re.M)
    text = re.sub(r"^import .*;\s*","",text,flags=re.M)
    text = re.sub(r"^export ","",text,flags=re.M)
    return text,names

def block(name,binding,preamble=""):
    text,names=module(name)
    return "const "+binding+"=(()=>{\n"+preamble+"\n"+text+"\nreturn {"+",".join(names)+"};\n})();\n"

code = block("core.mjs","Core")
code += block("view.mjs","Graphics","const {tank,trays,colors}=Core;")
code += block("sdk.mjs","Host")
code += "const {View}=Graphics,{bridge}=Host;\n"+module("app.mjs")[0]
markup=(root/"index-source.html").read_text("utf-8-sig")
markup=markup.replace('<link rel="stylesheet" href="style.css">',"<style>\n"+(root/"style.css").read_text("utf-8-sig")+"\n</style>")
vendor=(root/"vendor/three.min.js").read_text("utf-8")
markup=markup.replace('<script src="vendor/three.min.js"></script>',"<script>\n"+vendor+"\n</script>")
markup=markup.replace('<script type="module" src="app.mjs"></script>',"<script>\n(()=>{\n"+code+"\n})();\n</script>")
for name in ["index.html","standalone.html"]:
    (root/name).write_text(markup,"utf-8",newline="\n")
archive=root.parent/"POCKET-CURRENT.zip"
with ZipFile(archive,"w",ZIP_DEFLATED,compresslevel=9) as output:
    for file in sorted(root.rglob("*")):
        if file.is_file():
            output.write(file,file.relative_to(root).as_posix())
with ZipFile(archive) as output:
    assert output.testzip() is None
    assert output.read("index.html")==output.read("standalone.html")
    assert all(output.read(n)==(root/n).read_bytes() for n in output.namelist())
    result={"files":len(output.namelist()),"bytes":archive.stat().st_size,
            "sha256":hashlib.sha256(archive.read_bytes()).hexdigest()}
(root.parent/"pocket-current-package.json").write_text(json.dumps(result,indent=2),"utf-8")
print(json.dumps(result))
