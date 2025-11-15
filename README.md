# telegram-mini-app-bot

Projet minimal pour un bot Telegram qui ouvre une mini‑application Web (Telegram WebApp).

## Structure

```
telegram-mini-app-bot/
├── bot.py            # cerveau du bot (Python)
├── index.html        # mini‑app (front web à héberger)
├── app.js            # logique front (multi‑client)
├── clients/
│   └── demo/
│       ├── config.json    # titres, couleurs, contact, template message
│       └── catalog.json   # produits (id, name, category, price, description, media[])
├── requirements.txt
├── .env.example
└── .gitignore
```

## Prérequis
- Python 3.10+
- Un bot Telegram (Token via @BotFather)
- Une URL HTTPS publique pour `index.html` (ex: Netlify)

## Installation

```bash
pip install -r requirements.txt
```

## Configuration

Vous pouvez configurer via variables d’environnement ou via un fichier `.env` (copiez `.env.example`).

Variables principales:
- BOT_TOKEN: Token obtenu via @BotFather
- MINI_APP_URL: URL publique complète de votre `index.html`
- CLIENT_SLUG: slug par défaut du client (correspond à `clients/<slug>/`)

Exemple (.env):
```
BOT_TOKEN="123456:ABC-DEF..."
MINI_APP_URL="https://votre-site-unique.netlify.app/index.html"
CLIENT_SLUG="demo"
```

Le bot ajoutera automatiquement `?client=<slug>` à l’URL de la WebApp pour charger la bonne configuration.

### Déclarer le domaine chez BotFather
- @BotFather → /mybots → Edit Bot → Web Apps / Menu Button → Set URL/Domain
- Déclarez le domaine exact servant votre `index.html`.

## Lancer le bot

```bash
python bot.py
```

Envoyez `/start` à votre bot dans Telegram, puis ouvrez la mini‑app.

## Multi‑client: dupliquer et personnaliser

Le front charge dynamiquement les fichiers selon `?client=<slug>`:
- `clients/<slug>/config.json`
- `clients/<slug>/catalog.json`

Créez un nouveau client:
```bash
python scaffold_client.py monclient
```
Puis éditez `clients/monclient/config.json` et `clients/monclient/catalog.json`. 
Définissez `CLIENT_SLUG=monclient` dans votre `.env` pour ouvrir ce client depuis le bouton `/start`.

Schéma minimal:
- catalog.json
```json
{
  "products": [
    {"id": "p1", "name": "Nom", "category": "Cat", "price": 12.5, "description": "Texte", "media": [{"type":"image","src":"https://...","thumb":"https://..."}]}
  ]
}
```
- config.json
```json
{
  "title": "Boutique X",
  "subtitle": "Slogan",
  "accent": "#79c3ff",
  "contact": {"telegram": "MonCompte"},
  "buttonText": "Préparer message",
  "messageTemplate": "Bonjour, je suis intéressé par {{name}} (ID {{id}}) au prix de {{price}}."
}
```

## Déployer la mini‑app

Hébergez à plat (Netlify, Vercel Static, Cloudflare Pages). Uploadez:
- `index.html`, `app.js`, le dossier `clients/` et vos assets éventuels.
Mettez à jour `MINI_APP_URL` avec l’URL complète de votre `index.html`.

## Dépannage
- BOT_TOKEN manquant → remplissez `.env` ou vos variables d’environnement.
- La mini‑app ne s’ouvre pas → vérifiez le domaine déclaré chez BotFather.
- Le bon client ne se charge pas → assurez‑vous que `CLIENT_SLUG` correspond à un dossier dans `clients/`.
