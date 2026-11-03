import json

with open('swagger_doc.json', 'r', encoding='utf-8') as f:
    doc = json.load(f)

endpoints = [
    '/api/v1/hotels/bookings',
    '/api/v1/hotels/recheck',
    '/api/v1/account/traveller/create',
    '/api/v1/account/traveller/getAll',
    '/api/v1/account/traveller/{travellerId}'
]

for ep in endpoints:
    print('='*60)
    print('ENDPOINT:', ep)
    info = doc.get('paths', {}).get(ep, {})
    for method, op in info.items():
        print(f"METHOD: {method.upper()}")
        print(f"Summary: {op.get('summary')}")
        print(f"Description: {op.get('description')}")
        if 'parameters' in op:
            print("Parameters:", json.dumps(op['parameters'], indent=2))
        if 'requestBody' in op:
            print("RequestBody:", json.dumps(op['requestBody'], indent=2))
        if 'responses' in op:
            print("Responses:", json.dumps(op['responses'], indent=2)[:500])
