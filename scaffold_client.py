#!/usr/bin/env python3
"""
Scaffold d'un nouveau client pour la mini‑app.
Usage:
  python scaffold_client.py nouveau_slug
Crée le dossier clients/<slug>/ avec config.json et catalog.json de base.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
CLIENTS = ROOT / 'clients'

def sanitize(slug: str) -> str:
    s = slug.strip().lower()
    s = re.sub(r"[^a-z0-9_-]", "-", s)
    s = re.sub(r"-+", "-", s).strip('-')
    if not s:
        raise SystemExit("Slug invalide")
    return s

BASE_CONFIG = {
    "title": "Boutique · Client",
    "subtitle": "Mini‑app Telegram personnalisée",
    "accent": "#79c3ff",
    "contact": {"telegram": "VotreCompte"},
    "buttonText": "Préparer message",
    "messageTemplate": "Bonjour, je suis intéressé par {{name}} (ID {{id}}) au prix de {{price}}."
}

BASE_CATALOG = {"products": []}

def main():
    if len(sys.argv) < 2:
        print("Usage: python scaffold_client.py <slug>")
        sys.exit(1)
    slug = sanitize(sys.argv[1])
    dest = CLIENTS / slug
    dest.mkdir(parents=True, exist_ok=True)
    cfg = dest / 'config.json'
    cat = dest / 'catalog.json'

    if not cfg.exists():
        cfg.write_text(json.dumps(BASE_CONFIG, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f"Créé {cfg}")
    else:
        print(f"Existant {cfg}")

    if not cat.exists():
        cat.write_text(json.dumps(BASE_CATALOG, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f"Créé {cat}")
    else:
        print(f"Existant {cat}")

    print("Done. Personnalisez config.json et catalog.json, puis déployez.")

if __name__ == '__main__':
    main()

