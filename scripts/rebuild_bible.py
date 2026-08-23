#!/usr/bin/env python3
"""VPL(canon_66_vpl.txt) 보완 도구.

bskorea.or.kr(개역한글, Public Domain)에서 책을 가져와:
- 지정 책 전체를 재생성 (시편처럼 절 번호 체계가 어긋난 경우)
- 또는 누락 절만 추가 (절 번호는 맞고 일부 절이 빠진 경우)

VPL 형식: CODE CH:V 텍스트
"""
import re
import sys
import time
from pathlib import Path
from verify_bible import BOOK_CODES, fetch_chapter, parse_chapter, load_vpl, VPL_PATH

# 표준 절 수 (KJV/개역한글, 프로테스탄트 66권) — 검증용
STD = {
    'GEN':1533,'EXO':1213,'LEV':859,'NUM':1288,'DEU':959,'JOS':658,'JDG':618,'RUT':85,
    '1SA':810,'2SA':695,'1KI':816,'2KI':719,'1CH':942,'2CH':822,'EZR':280,'NEH':406,'EST':167,'JOB':1070,
    'PSA':2461,'PRO':915,'ECC':222,'SOL':117,'ISA':1292,'JER':1364,'LAM':154,'EZE':1273,'DAN':357,
    'HOS':197,'JOE':73,'AMO':146,'OBA':21,'JON':48,'MIC':105,'NAH':47,'HAB':56,'ZEP':53,'HAG':38,'ZEC':211,'MAL':55,
    'MAT':1071,'MAR':678,'LUK':1151,'JOH':879,'ACT':1007,'ROM':433,'1CO':437,'2CO':257,'GAL':149,'EPH':155,
    'PHI':104,'COL':95,'1TH':89,'2TH':47,'1TI':113,'2TI':83,'TIT':46,'PHM':25,'HEB':303,'JAM':108,
    '1PE':105,'2PE':61,'1JO':105,'2JO':13,'3JO':14,'JUD':25,'REV':404,
}


def normalize_text(t: str) -> str:
    """bskorea 텍스트를 VPL과 유사하게 정규화."""
    t = t.strip()
    # VPL은 '할지로다'가 '할찌로다'로 쓰임 — bskorea 그대로 유지(둘 다 개역한글 표기)
    return t


import json


def fetch_book(code: str):
    """책 전체를 bskorea에서 가져와 {chapter: {verse: text}} 반환."""
    bk = {v: k for k, v in BOOK_CODES.items()}.get(code)
    if not bk:
        raise ValueError(f"bskorea 코드 미상: {code}")
    # 장 수는 metadata.json 기준 (VPL에 장이 통째로 누락된 경우도 복원)
    meta = json.loads((Path(__file__).parent.parent / "data" / "bible" / "ko" / "metadata.json").read_text(encoding="utf-8"))
    meta_book = next((b for b in meta["books"] if b["code"] == code), None)
    if not meta_book:
        raise ValueError(f"metadata에 {code} 없음")
    chapters = list(range(1, meta_book["chapters"] + 1))
    book = {}
    for ch in chapters:
        html = fetch_chapter(bk, ch)
        src = parse_chapter(html)
        book[ch] = {n: normalize_text(t) for n, t in src}
        time.sleep(0.15)
    return book, bk


def write_vpl(vpl: dict):
    """VPL dict -> canon_66_vpl.txt 재작성 (정경 순서 유지)."""
    meta = json.loads((Path(__file__).parent.parent / "data" / "bible" / "ko" / "metadata.json").read_text(encoding="utf-8"))
    book_order = [b["code"] for b in meta["books"]]
    lines = []
    for code in book_order:
        if code not in vpl:
            continue
        for ch in sorted(vpl[code].keys()):
            for v in sorted(vpl[code][ch].keys()):
                text = vpl[code][ch][v]
                lines.append(f"{code} {ch}:{v} {text}")
    VPL_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def rebuild_book(code: str):
    """책 전체를 bskorea 기준으로 재생성."""
    print(f"재생성: {code}")
    book, bk = fetch_book(code)
    vpl = load_vpl()
    vpl[code] = book
    write_vpl(vpl)
    total = sum(len(book[ch]) for ch in book)
    std = STD.get(code, total)
    print(f"  {code}: {total}절 (표준 {std}, 차 {total - std})")


def fill_missing(code: str):
    """절 번호는 유지하고 누락 절만 bskorea에서 추가."""
    print(f"누락 채우기: {code}")
    book, bk = fetch_book(code)
    vpl = load_vpl()
    cur = vpl.get(code, {})
    filled = 0
    for ch in book:
        for v, text in book[ch].items():
            if ch not in cur or v not in cur[ch]:
                cur.setdefault(ch, {})[v] = text
                filled += 1
    vpl[code] = cur
    write_vpl(vpl)
    total = sum(len(cur[ch]) for ch in cur)
    std = STD.get(code, total)
    print(f"  {code}: {total}절 (표준 {std}, 차 {total - std}), 채움 {filled}절")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: rebuild_bible.py rebuild|fill CODE [CODE...]")
        sys.exit(1)
    mode = sys.argv[1]
    codes = [c.upper() for c in sys.argv[2:]]
    for code in codes:
        if mode == "rebuild":
            rebuild_book(code)
        elif mode == "fill":
            fill_missing(code)
        else:
            print(f"unknown mode: {mode}")
            sys.exit(1)
