"""Build the standalone pitch as the lab site's default document."""
from pathlib import Path
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parent.parent
subprocess.run([sys.executable, str(root / "tools" / "build_pitch.py")], check=True)
output = root / "dist"
output.mkdir(exist_ok=True)
shutil.copyfile(root / "pitch.html", output / "index.html")
print("Ready to deploy: dist/index.html")
