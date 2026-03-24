import urllib.request
import re

URL = "http://localhost:8000"

try:
    response = urllib.request.urlopen(URL)
    html = response.read().decode('utf-8')
    print("HTML Loaded. Length:", len(html))
    
    # We can't execute JS without a full browser, but we can check if the files exist.
    scripts = re.findall(r'src="([^"]+)"', html)
    for src in scripts:
        if src.startswith('http'): continue
        try:
            res = urllib.request.urlopen(f"{URL}/{src}")
            print(f"OK: {src}")
        except Exception as e:
            print(f"FAILED: {src} - {e}")
            
except Exception as e:
    print(f"Failed to load: {e}")
