import urllib.request
import json
import re

url = 'https://server2.vais.co.in/maqam/api/docs/swagger-ui-init.js'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
js = urllib.request.urlopen(req).read().decode('utf-8')

start_idx = js.find('"swaggerDoc":')
if start_idx != -1:
    brace_start = js.find('{', start_idx)
    # Find matching closing brace
    depth = 0
    end_idx = -1
    in_string = False
    escape = False
    for i in range(brace_start, len(js)):
        c = js[i]
        if escape:
            escape = False
            continue
        if c == '\\':
            escape = True
            continue
        if c == '"':
            in_string = not in_string
            continue
        if not in_string:
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    end_idx = i + 1
                    break
    if end_idx != -1:
        doc = json.loads(js[brace_start:end_idx])
        with open('swagger_doc.json', 'w', encoding='utf-8') as f:
            json.dump(doc, f, indent=2)
        print('Saved swagger_doc.json. Total paths:', len(doc.get('paths', {})))
        for p in sorted(doc.get('paths', {}).keys()):
            if any(w in p.lower() for w in ['hotel', 'srdv', 'traveler', 'traveller', 'book']):
                print(p)
    else:
        print('Could not find closing brace')
else:
    print('Could not find swaggerDoc')
