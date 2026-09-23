import json, sys
# usage: python3 scripts/merge-messages.py patch.json  (patch = {"ar": {...}, "en": {...}})
patch = json.load(open(sys.argv[1]))
def merge(a, b):
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(a.get(k), dict):
            merge(a[k], v)
        else:
            a[k] = v
for loc in ("ar", "en"):
    p = f"messages/{loc}.json"
    d = json.load(open(p))
    merge(d, patch[loc])
    with open(p, "w") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")
