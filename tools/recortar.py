# Trata a arte bruta do Grok (assets/brutos/<id>.jpg) para o jogo (src/arte/ginasios/<id>.webp):
# recorte 16:9, curvas por canal leves, desfoque de profundidade (o fundo distante e
# intencionalmente macio: a nitidez vem do codigo) e WebP q 0,78 (o reencode tira os metadados).
# Uso: python3 -I tools/recortar.py <id> [desfoque] [saturacao] [--contato]
import sys
from PIL import Image, ImageFilter, ImageEnhance

def tratar(id_, desfoque=1.2, saturacao=0.92):
    im = Image.open(f'assets/brutos/{id_}.jpg').convert('RGB')
    w, h = im.size
    alvo = 16 / 9
    if w / h > alvo:
        nw = int(h * alvo); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    elif w / h < alvo:
        nh = int(w / alvo); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    im = im.resize((1280, 720), Image.LANCZOS)
    # curvas: um pouco menos de contraste e saturacao (distancia), o claro levemente quente
    im = ImageEnhance.Color(im).enhance(saturacao)
    im = ImageEnhance.Contrast(im).enhance(0.94)
    r, g, b = im.split()
    r = r.point(lambda v: min(255, int(v * 1.015 + 2)))
    b = b.point(lambda v: int(v * 0.99))
    im = Image.merge('RGB', (r, g, b))
    if desfoque > 0:
        im = im.filter(ImageFilter.GaussianBlur(desfoque))
    saida = f'src/arte/ginasios/{id_}.webp'
    im.save(saida, 'WEBP', quality=78, method=6)
    return saida

if __name__ == '__main__':
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    s = tratar(a[0], float(a[1]) if len(a) > 1 else 1.2, float(a[2]) if len(a) > 2 else 0.92)
    import os
    print(s, os.path.getsize(s) // 1024, 'KB')
