#!/usr/bin/env python3
"""bskorea 개역한글 본문 파서 + 절 수 비교 도구.

용도: 현재 VPL(canon_66_vpl.txt)의 절 누락을 bskorea.or.kr(개역한글, Public Domain)
기준으로 진단하고 보완한다.
"""
import re
import html as H
import sys
import urllib.request
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VPL_PATH = ROOT / "data" / "bible" / "ko" / "canon_66_vpl.txt"

# bskorea 책 코드 -> VPL 3자리 코드
BOOK_CODES = {
    "gen": "GEN", "exo": "EXO", "lev": "LEV", "num": "NUM", "deu": "DEU",
    "jos": "JOS", "jdg": "JDG", "rut": "RUT", "1sa": "1SA", "2sa": "2SA",
    "1ki": "1KI", "2ki": "2KI", "1ch": "1CH", "2ch": "2CH", "ezr": "EZR",
    "neh": "NEH", "est": "EST", "job": "JOB", "psa": "PSA", "pro": "PRO",
    "ecc": "ECC", "sng": "SOL", "isa": "ISA", "jer": "JER", "lam": "LAM",
    "ezk": "EZE", "dan": "DAN", "hos": "HOS", "jol": "JOE", "amo": "AMO",
    "oba": "OBA", "jnh": "JON", "mic": "MIC", "nam": "NAH", "hab": "HAB",
    "zep": "ZEP", "hag": "HAG", "zec": "ZEC", "mal": "MAL",
    "mat": "MAT", "mrk": "MAR", "luk": "LUK", "jhn": "JOH", "act": "ACT",
    "rom": "ROM", "1co": "1CO", "2co": "2CO", "gal": "GAL", "eph": "EPH",
    "php": "PHI", "col": "COL", "1th": "1TH", "2th": "2TH", "1ti": "1TI",
    "2ti": "2TI", "tit": "TIT", "phm": "PHM", "heb": "HEB", "jas": "JAM",
    "1pe": "1PE", "2pe": "2PE", "1jo": "1JO", "2jo": "2JO", "3jo": "3JO",
    "jud": "JUD", "rev": "REV",
}


def clean(t: str) -> str:
    # 각주 div 제거 (페이지 하단에 별도로 있는 각주 본문)
    t = re.sub(r"<div id=['\"]D_\d+_['\"][^>]*>.*?</div>", "", t, flags=re.S)
    # 각주 인라인 마커 제거 (<a class=comment ...><font>1)</font></a>)
    t = re.sub(r"<a[^>]*clickPopUp[^>]*>.*?</a>", "", t, flags=re.S)
    t = re.sub(r"<[^>]+>", "", t)
    t = H.unescape(t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def parse_chapter(html: str):
    """bskorea chapter HTML -> [(verse:int, text:str), ...]"""
    verses = []
    for part in html.split('<span class="number">')[1:]:
        m = re.match(r"(\d+)", part)
        if not m:
            continue
        n = int(m.group(1))
        after = part[m.end():]
        after = re.sub(r"^[^<]*</span>", "", after)
        body = re.split(r"</font></span>|</span><br", after)[0]
        text = clean(body)
        if text:
            verses.append((n, text))
    return verses


def fetch_chapter(code: str, chap: int, version: str = "HAN", retries: int = 3):
    url = f"https://www.bskorea.or.kr/bible/korbibReadpage.php?version={version}&book={code}&chap={chap}"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (bible-data-verify)"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", errors="replace")
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(1 + attempt)
    return ""


def load_vpl():
    """VPL -> dict[code] = dict[chapter] = {verse: text}"""
    data = {}
    for line in VPL_PATH.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^([0-9A-Z]{3})\s+(\d+):(\d+)\s+(.*)$", line)
        if not m:
            continue
        code, ch, v, text = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4)
        data.setdefault(code, {}).setdefault(ch, {})[v] = text
    return data


def main():
    vpl = load_vpl()
    if len(sys.argv) < 2:
        print("usage: verify_bible.py CODE [CODE...]")
        print("  CODE = VPL 3자리 코드 (예: PSA, 1PE)")
        sys.exit(1)

    codes = [c.upper() for c in sys.argv[1:]]
    # VPL 코드 -> bskorea 코드
    inv = {v: k for k, v in BOOK_CODES.items()}

    for code in codes:
        bk = inv.get(code)
        if not bk:
            print(f"{code}: bskorea 코드 미상, skip")
            continue
        cur = vpl.get(code, {})
        chapters = sorted(cur.keys())
        print(f"=== {code} (bskorea={bk}) — {len(chapters)}장 ===")
        total_cur = sum(len(cur[c]) for c in chapters)
        total_src = 0
        diffs = []
        for ch in chapters:
            html = fetch_chapter(bk, ch)
            src = parse_chapter(html)
            total_src += len(src)
            src_map = {n: t for n, t in src}
            cur_map = cur.get(ch, {})
            missing = [n for n in src_map if n not in cur_map]
            extra = [n for n in cur_map if n not in src_map]
            if missing or extra:
                diffs.append((ch, missing, extra))
            time.sleep(0.15)
        print(f"  현재 절 수: {total_cur}, bskorea 절 수: {total_src}, 차: {total_src - total_cur}")
        for ch, missing, extra in diffs:
            print(f"  장 {ch}: 누락 {missing} / 초과 {extra}")


if __name__ == "__main__":
    main()
