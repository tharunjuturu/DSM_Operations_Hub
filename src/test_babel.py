import urllib.request
import re
import sys

URL = "http://localhost:8000"

try:
    response = urllib.request.urlopen(URL)
    html = response.read().decode('utf-8')
    scripts = re.findall(r'src="([^"]+)"', html)
    
    # Read the actual content of the scripts to look for obvious syntax issues that might crash babel
    for src in scripts:
        if src.startswith('http'): continue
        try:
            res = urllib.request.urlopen(f"{URL}/{src}")
            content = res.read().decode('utf-8')
            # Look for common issues like export/import which babel standalone doesn't support
            if 'import ' in content or 'export ' in content:
                print(f"WARNING: {src} contains import/export statements which break Babel standalone.")
        except Exception as e:
            pass
            
except Exception as e:
    pass
