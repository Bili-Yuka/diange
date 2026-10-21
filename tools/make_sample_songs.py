# -*- coding: utf-8 -*-
"""生成示例歌单 data/songs.xlsx 与 data/songs.json（同一份数据，两处一致）"""
import json
import os
import unicodedata

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

SONGS = [
    {"name": "阿拉斯加海湾", "artist": "蓝心羽", "lang": "国语", "sc": "50", "tags": ["流行", "抒情"], "cut": "无", "note": ""},
    {"name": "爱的回归线", "artist": "陈韵若", "lang": "国语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "爱的双重魔力", "artist": "刘瑞琦", "lang": "国语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "爱情讯息", "artist": "一明", "lang": "国语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "爱如火", "artist": "那艺娜", "lang": "国语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "春の风", "artist": "米津玄师", "lang": "日语", "sc": "免费", "tags": ["V家", "ACG"], "cut": "无", "note": ""},
    {"name": "凑热闹", "artist": "BY2", "lang": "国语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "大眠", "artist": "王心凌", "lang": "国语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "大鱼", "artist": "周深", "lang": "国语", "sc": "免费", "tags": ["古风"], "cut": "有", "note": "高音"},
    {"name": "冻结", "artist": "王心凌", "lang": "国语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "多远都要在一起", "artist": "G.E.M.邓紫棋", "lang": "国语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "浮光", "artist": "周深", "lang": "国语", "sc": "免费", "tags": ["古风"], "cut": "有", "note": ""},
    {"name": "浮生未歇", "artist": "音频怪物", "lang": "国语", "sc": "免费", "tags": ["古风"], "cut": "无", "note": ""},
    {"name": "干物女", "artist": "洛天依", "lang": "国语", "sc": "免费", "tags": ["V家"], "cut": "无", "note": ""},
    {"name": "给我一个理由忘记", "artist": "A-Lin", "lang": "国语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "兰亭序", "artist": "周杰伦", "lang": "国语", "sc": "免费", "tags": ["古风", "流行"], "cut": "无", "note": ""},
    {"name": "青花瓷", "artist": "周杰伦", "lang": "国语", "sc": "免费", "tags": ["古风"], "cut": "无", "note": ""},
    {"name": "平凡之路", "artist": "朴树", "lang": "国语", "sc": "免费", "tags": ["摇滚", "流行"], "cut": "无", "note": ""},
    {"name": "海阔天空", "artist": "Beyond", "lang": "粤语", "sc": "免费", "tags": ["摇滚"], "cut": "无", "note": "经典"},
    {"name": "富士山下", "artist": "陈奕迅", "lang": "粤语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "千本樱", "artist": "初音未来", "lang": "日语", "sc": "免费", "tags": ["V家"], "cut": "有", "note": "节奏快"},
    {"name": "极乐净土", "artist": "GARNiDELiA", "lang": "日语", "sc": "免费", "tags": ["ACG"], "cut": "有", "note": "宅舞"},
    {"name": "打上花火", "artist": "DAOKO×米津玄师", "lang": "日语", "sc": "免费", "tags": ["ACG"], "cut": "无", "note": ""},
    {"name": "夜的第七章", "artist": "周杰伦", "lang": "国语", "sc": "免费", "tags": ["RAP", "流行"], "cut": "无", "note": ""},
    {"name": "以父之名", "artist": "周杰伦", "lang": "国语", "sc": "免费", "tags": ["RAP", "流行"], "cut": "无", "note": ""},
    {"name": "曹操", "artist": "林俊杰", "lang": "国语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "修炼爱情", "artist": "林俊杰", "lang": "国语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "我的天空", "artist": "南征北战NZBZ", "lang": "国语", "sc": "免费", "tags": ["RAP"], "cut": "无", "note": ""},
    {"name": "追梦赤子心", "artist": "GALA", "lang": "国语", "sc": "免费", "tags": ["摇滚"], "cut": "无", "note": ""},
    {"name": "起风了", "artist": "买辣椒也用券", "lang": "国语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "阿刁", "artist": "张韶涵", "lang": "国语", "sc": "免费", "tags": ["流行", "民族"], "cut": "有", "note": "高音"},
    {"name": "青藏高原", "artist": "李娜", "lang": "国语", "sc": "免费", "tags": ["民族"], "cut": "有", "note": "高音"},
    {"name": "九儿", "artist": "韩红", "lang": "国语", "sc": "免费", "tags": ["民族"], "cut": "有", "note": ""},
    {"name": "左手指月", "artist": "萨顶顶", "lang": "国语", "sc": "免费", "tags": ["古风"], "cut": "有", "note": "高音"},
    {"name": "探窗", "artist": "国风新语", "lang": "国语", "sc": "免费", "tags": ["古风", "东方"], "cut": "无", "note": ""},
    {"name": "出山", "artist": "花粥", "lang": "国语", "sc": "免费", "tags": ["流行", "古风"], "cut": "无", "note": ""},
    {"name": "心如刀割", "artist": "张学友", "lang": "国语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "月半小夜曲", "artist": "李克勤", "lang": "粤语", "sc": "免费", "tags": ["流行"], "cut": "无", "note": ""},
    {"name": "歌剧魅影", "artist": "群星", "lang": "外语", "sc": "30", "tags": ["美声"], "cut": "有", "note": ""},
    {"name": "今夜无人入睡", "artist": "群星", "lang": "外语", "sc": "20", "tags": ["美声"], "cut": "有", "note": "歌剧"},
]

HEADERS = ["曲名", "原唱", "语种", "SC点歌", "标签", "歌切", "备注"]
KEY_TO_COL = ["name", "artist", "lang", "sc", "tags", "cut", "note"]


def display_width(value):
    return sum(2 if unicodedata.east_asian_width(ch) in ("F", "W") else 1 for ch in str(value or ""))


def fit_one_column(ws, col, min_row, max_row, min_w=8, max_w=50):
    values = [ws.cell(row, col).value for row in range(min_row, max_row + 1)]
    values = [v for v in values if v is not None]
    ws.column_dimensions[get_column_letter(col)].width = max(
        min_w, min(max((display_width(v) for v in values), default=0) + 3, max_w))


def make_xlsx():
    wb = Workbook()
    ws = wb.active
    ws.title = "歌单"
    for i, h in enumerate(HEADERS, start=1):
        ws.cell(row=1, column=i, value=h)
    for r, song in enumerate(SONGS, start=2):
        for c, key in enumerate(KEY_TO_COL, start=1):
            value = song[key]
            if key == "tags":
                value = "|".join(song["tags"])
            ws.cell(row=r, column=c, value=value)

    header_fill = PatternFill("solid", fgColor="F2F2F2")
    for c in range(1, len(HEADERS) + 1):
        cell = ws.cell(row=1, column=c)
        cell.font = Font(bold=True)
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.fill = header_fill
    for r in range(2, len(SONGS) + 2):
        for c in range(1, len(HEADERS) + 1):
            cell = ws.cell(row=r, column=c)
            cell.alignment = Alignment(horizontal="left", vertical="center")
    for c in range(1, len(HEADERS) + 1):
        fit_one_column(ws, c, 1, len(SONGS) + 1)
    ws.freeze_panes = "A2"

    xlsx_path = os.path.join(DATA_DIR, "songs.xlsx")
    wb.save(xlsx_path)

    json_path = os.path.join(DATA_DIR, "songs.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"songs": SONGS}, f, ensure_ascii=False, indent=2)
    print("xlsx ->", xlsx_path, "| rows:", len(SONGS))
    print("json ->", json_path)


if __name__ == "__main__":
    make_xlsx()
