import re

for page in ("pin.html", "pin022.html"):
    old = open(rf"C:\GlobalWork\site\{page}", encoding="utf-8").read()
    new = open(rf"C:\Users\Дружба\AppData\Local\Temp\redesign\site-repo\{page}", encoding="utf-8").read()
    so = re.findall(r"<script[^>]*>(.*?)</script>", old, re.S)
    sn = re.findall(r"<script[^>]*>(.*?)</script>", new, re.S)
    print(page, "| old scripts:", len(so), "| new:", len(sn), "| identical:", so == sn)
    for key in ("CONTRACT", "CHAIN_ID"):
        ko = re.findall(key + r"\s*=\s*[\"'][^\"']+[\"']", old)
        kn = re.findall(key + r"\s*=\s*[\"'][^\"']+[\"']", new)
        print("   ", key, "same:", ko == kn, ko[:1])
