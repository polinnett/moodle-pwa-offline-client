import json
import hashlib
from pydantic import BaseModel
from fastapi import Request

def get_user_hash(request: Request) -> str:
    token = request.headers.get("Authorization", "")
    return hashlib.sha256(token.encode()).hexdigest()

class SnapshotItem(BaseModel):
    id: int
    name: str
    timemodified: int = 0

def compute_hash(modules: list[SnapshotItem]) -> str:
    data = json.dumps([{"id": m.id, "name": m.name, "timemodified": m.timemodified} for m in modules], sort_keys=True)
    return hashlib.md5(data.encode()).hexdigest()

def diff_modules(old: list, new: list[SnapshotItem]) -> list[str]:
    old_map = {m["id"]: m for m in old}
    new_map = {m.id: m for m in new}
    changes = []

    for mid, item in new_map.items():
        if mid not in old_map:
            changes.append(f"Добавлен новый урок: «{item.name}»")
        elif old_map[mid]["name"] != item.name:
            changes.append(f"Переименован урок: «{old_map[mid]['name']}» в «{item.name}»")
        elif old_map[mid].get("timemodified", 0) != item.timemodified:
            changes.append(f"Обновлено содержимое урока: «{item.name}»")

    for mid, item in old_map.items():
        if mid not in new_map:
            changes.append(f"Удален урок: «{item['name']}»")

    return changes