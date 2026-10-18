"""
Достаёт из макетов дизайнера (FACEIT_A5_<имя>.pdf) статичный «арт» шаблонов плашки.

Каждый макет — две страницы (7 и 9 уровень) с одинаковым порядком объектов:
фон и декор → ник, подпись, буквы FACEIT, звезда, «I», стрелка, цифра, кольцо.
Ник, подпись, звезда, цифра и кольцо зависят от игрока — их рисует renderPlaqueSvg,
всё остальное попадает в арт.

На выходе для каждого шаблона два SVG в assets/plaques:
  <id>.svg          — для печати, растр в исходном разрешении (JPEG q92)
  <id>.preview.svg  — для превью в приложении, растр в половину размера (WebP q75):
                      JPEG не сжимается gzip'ом, а превью — самая крупная картинка экрана (LCP)
  <id>.front.svg    — только буквы FACEIT и стрелка (вектор): их кладут поверх картинки клиента,
                      чтобы она не закрыла фирменные элементы

Запуск (нужны poppler — pdftocairo — и Pillow):
  python3 packages/shared/scripts/extract_plaque_art.py ~/Downloads
"""

import base64
import io
import re
import subprocess
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image

SVG_NS = 'http://www.w3.org/2000/svg'
XLINK_NS = 'http://www.w3.org/1999/xlink'
ET.register_namespace('', SVG_NS)
ET.register_namespace('xlink', XLINK_NS)

# id шаблона → файл макета
TEMPLATES = {
    'graphite': 'FACEIT_A5_final.pdf',
    'dead_silence': 'FACEIT_A5_DeadSilence.pdf',
    'blue_skin': 'FACEIT_A5_BlueSkin.pdf',
    'bloodsport': 'FACEIT_A5_Bloodsport_japanese.pdf',
    'tech': 'FACEIT_A5_tech.pdf',
    'orange': 'FACEIT_A5_orange.pdf',
}

# Объекты игрока: рамка (pt), в которой лежит объект, и его минимальная ширина.
# Порядок объектов на страницах разный, поэтому ищем по рамке; каждый должен найтись ровно один раз
DYNAMIC = {
    'ник': ((165, 415, 255, 437), 20),
    'подпись': ((110, 438, 310, 458), 100),
    'звезда': ((238, 513, 256, 528), 10),
    'цифра': ((195, 348, 225, 384), 10),
    'кольцо': ((160, 318, 258, 406), 80),
}

# Фирменные элементы для верхнего слоя: рамка (pt), минимальная ширина и сколько объектов ждём.
# Буквы F, A, C, E, T и ножка «I» под звездой — шесть объектов
FRONT = {
    'буквы FACEIT': ((130, 518, 290, 539), 5, 6),
    'стрелка': ((80, 50, 335, 250), 150, 1),
}

OUT_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'plaques'


def path_bbox(element):
    numbers = [float(value) for value in re.findall(r'-?\d+\.?\d*', element.get('d') or '')]
    if len(numbers) < 2:
        return None
    xs, ys = numbers[0::2], numbers[1::2]
    return min(xs), min(ys), max(xs), max(ys)


def check_match(bbox, frame, min_width):
    if not bbox or bbox[2] - bbox[0] < min_width:
        return False
    return bbox[0] >= frame[0] and bbox[1] >= frame[1] and bbox[2] <= frame[2] and bbox[3] <= frame[3]


def pdf_page_to_svg(pdf, page):
    result = subprocess.run(
        ['pdftocairo', '-svg', '-f', str(page), '-l', str(page), str(pdf), '-'],
        check=True,
        capture_output=True,
    )
    return ET.fromstring(result.stdout)


def encode_image(data_uri, scale, quality, is_webp):
    """PNG из pdftocairo → JPEG (если нет прозрачности) или PNG поменьше (маски); для превью — WebP"""
    raw = base64.b64decode(data_uri.split(',', 1)[1])
    image = Image.open(io.BytesIO(raw))
    if scale != 1:
        image = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    buffer = io.BytesIO()
    if is_webp:
        # WebP держит альфу; маску (L) кладём как RGB — яркость, которую читает <mask>, та же
        image.convert('RGBA' if image.mode in ('LA', 'RGBA', 'P') else 'RGB').save(buffer, 'WEBP', quality=quality, method=6)
        mime = 'image/webp'
    elif image.mode in ('L', 'LA', 'RGBA', 'P'):
        image.save(buffer, 'PNG', optimize=True)
        mime = 'image/png'
    else:
        image.convert('RGB').save(buffer, 'JPEG', quality=quality, optimize=True)
        mime = 'image/jpeg'
    return f'data:{mime};base64,' + base64.b64encode(buffer.getvalue()).decode()


def build_art(root, template_id, scale, quality, is_webp):
    defs = root.find(f'{{{SVG_NS}}}defs')
    body = [child for child in root if child is not defs]

    dynamic = set()
    for name, (frame, min_width) in DYNAMIC.items():
        found = [index for index, element in enumerate(body) if check_match(path_bbox(element), frame, min_width)]
        if len(found) != 1:
            raise SystemExit(f'{template_id}: «{name}» найден {len(found)} раз — макет изменил структуру')
        dynamic.add(found[0])
    art = ET.Element(f'{{{SVG_NS}}}svg', {'viewBox': '0 0 419.5276 595.2756', 'width': '419.5276', 'height': '595.2756'})
    if defs is not None:
        art.append(defs)
    for index, element in enumerate(body):
        if index not in dynamic:
            art.append(element)

    # Картинка тянется на свои width/height, поэтому уменьшенный растр встаёт на то же место
    href = f'{{{XLINK_NS}}}href'
    for image in art.iter(f'{{{SVG_NS}}}image'):
        image.set(href, encode_image(image.get(href), scale, quality, is_webp))

    text = ET.tostring(art, encoding='unicode')
    # id внутри арта уникальны на странице: превью разных шаблонов стоят рядом
    return re.sub(r'(id="|url\(#|href="#)([\w-]+)', lambda m: f'{m.group(1)}{template_id}-{m.group(2)}', text)


def build_front(root, template_id):
    defs = root.find(f'{{{SVG_NS}}}defs')
    body = [child for child in root if child is not defs]

    front = ET.Element(f'{{{SVG_NS}}}svg', {'viewBox': '0 0 419.5276 595.2756', 'width': '419.5276', 'height': '595.2756'})
    for name, (frame, min_width, count) in FRONT.items():
        found = [element for element in body if check_match(path_bbox(element), frame, min_width)]
        if len(found) != count:
            raise SystemExit(f'{template_id}: «{name}» найдено {len(found)} вместо {count} — макет изменил структуру')
        front.extend(found)
    return ET.tostring(front, encoding='unicode')


def main():
    source_dir = Path(sys.argv[1] if len(sys.argv) > 1 else '.').expanduser()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for template_id, file_name in TEMPLATES.items():
        for suffix, scale, quality, is_webp in (('', 1, 92, False), ('.preview', 0.5, 75, True)):
            root = pdf_page_to_svg(source_dir / file_name, 2)
            out = OUT_DIR / f'{template_id}{suffix}.svg'
            out.write_text(build_art(root, template_id, scale, quality, is_webp), encoding='utf-8')
            print(f'✓ {out.name}: {out.stat().st_size // 1024} КБ')
        out = OUT_DIR / f'{template_id}.front.svg'
        out.write_text(build_front(pdf_page_to_svg(source_dir / file_name, 2), template_id), encoding='utf-8')
        print(f'✓ {out.name}: {out.stat().st_size // 1024} КБ')


if __name__ == '__main__':
    main()
