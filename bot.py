# filepath: /Users/niwa/PycharmProjects/telegram-mini-app-bot/bot.py
import os
import logging
import re
import json

# Chargement optionnel d'un fichier .env pour faciliter la configuration locale
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, Application, ContextTypes, CommandHandler, MessageHandler, filters

# -----------------------------
# Configuration
# -----------------------------
# 1) Renseignez le token de votre bot (via @BotFather)
#    soit en variable d'environnement BOT_TOKEN, soit remplacez la lecture ci-dessous.
# 2) Renseignez l'URL publique (HTTPS) où est hébergée votre mini‑app index.html
#    en variable d'environnement MINI_APP_URL (recommandé) ou modifiez la valeur par défaut.

BOT_TOKEN = os.getenv("BOT_TOKEN")
MINI_APP_URL = os.getenv("MINI_APP_URL", "https://votre-site-unique.netlify.app")  # À remplacer après l'hébergement
CLIENT_SLUG = os.getenv("CLIENT_SLUG")  # optionnel: ouvre la webapp pré-configurée pour un client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Helper: redaction des numéros de téléphone et des clés sensibles
PHONE_RE = re.compile(r"\+?[0-9][0-9()\-\s]{5,}[0-9]")

def redact_value(v):
    """Redacte une valeur si elle ressemble à un numéro de téléphone."""
    if isinstance(v, str):
        if PHONE_RE.search(v):
            return "[NUM_TEL_REDACTED]"
    return v

def sanitize_obj(o):
    """Parcours récursif d'un objet (dict/list) et redacte les clés/valeurs sensibles.
    - Si une clé contient 'phone' ou 'tel' on remplace la valeur par un jeton.
    - Si une valeur ressemble à un numéro on la remplace aussi.
    Retourne une copie sécurisée.
    """
    if isinstance(o, dict):
        out = {}
        for k, v in o.items():
            lk = k.lower() if isinstance(k, str) else ''
            if 'phone' in lk or 'tel' in lk or 'telephone' in lk:
                out[k] = '[NUM_TEL_REDACTED]'
            else:
                out[k] = sanitize_obj(v)
        return out
    if isinstance(o, list):
        return [sanitize_obj(x) for x in o]
    # primitive
    return redact_value(o)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Commande /start: envoie un bouton qui ouvre la mini‑app Telegram."""
    user = update.effective_user
    name = user.first_name if user and user.first_name else "là"

    # Construire l'URL finale avec ?client=slug si fourni
    url = MINI_APP_URL
    if CLIENT_SLUG:
        from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
        parts = urlparse(url)
        q = dict(parse_qsl(parts.query))
        q["client"] = CLIENT_SLUG
        parts = parts._replace(query=urlencode(q))
        url = urlunparse(parts)

    keyboard = [
        [InlineKeyboardButton(text="Ouvrir la mini‑app", web_app=WebAppInfo(url=url))]
    ]

    await update.message.reply_text(
        f"Salut {name} 👋\nVoici la mini‑application. Clique pour l'ouvrir :",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("Commandes disponibles:\n/start - ouvrir la mini‑app\n/help - aide")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Réception de messages généraux, dont les données WebApp (tg.sendData)."""
    msg = update.message
    if not msg:
        return

    # Si l'utilisateur envoie un contact (partage de numéro), on l'ignore volontairement
    # pour respecter la confidentialité : on ne collecte pas et on ne logge pas le numéro.
    if getattr(msg, 'contact', None):
        # Répondre poliment sans stocker ni afficher le numéro
        try:
            await msg.reply_text("Je ne collecte pas les numéros de téléphone. Si vous souhaitez nous contacter, utilisez la mini‑app ou envoyez un message sans partager votre contact.")
        except Exception:
            pass
        # Ne pas traiter plus loin
        return

    # Données WebApp: msg.web_app_data.data contient la chaîne envoyée par tg.sendData
    if msg.web_app_data and msg.web_app_data.data:
        data_text = msg.web_app_data.data
        # essayer de parser JSON et sanitiser les numéros avant logging/réponse
        try:
            parsed = json.loads(data_text)
            safe_parsed = sanitize_obj(parsed)
            pretty = json.dumps(safe_parsed, ensure_ascii=False, indent=2)
            logger.info("WebApp data reçue (sanitisée): %s", pretty)

            # Si c'est une demande de message produit, renvoyer un texte prêt à répondre
            if isinstance(parsed, dict) and parsed.get("action") == "message":
                p = parsed.get("product") or {}
                # sanitiser produit avant affichage
                safe_p = sanitize_obj(p) if isinstance(p, dict) else p
                reply = (
                    "Nouveau message depuis la mini‑app:\n"
                    f"Produit: {safe_p.get('name','?')} ({safe_p.get('id','')})\n"
                    f"Prix: {safe_p.get('price','?')} EUR\n"
                    f"Texte: {sanitize_obj(parsed).get('text','')}\n"
                )
                await msg.reply_text(reply)
                return
        except Exception:
            # si ce n'est pas JSON, on log une version sanitisée si possible
            redacted = PHONE_RE.sub('[NUM_TEL_REDACTED]', data_text)
            logger.info("WebApp data reçue (non JSON) : %s", redacted)
            await msg.reply_text("Merci, j'ai bien reçu les données de la mini‑app:\n" + redacted)
            return

        await msg.reply_text("Merci, j'ai bien reçu les données de la mini‑app:\n" + pretty)
        return

    # Autres messages texte: aide minimale
    if msg.text:
        await msg.reply_text(
            "Je suis un bot mini‑app. Utilisez /start pour ouvrir la mini‑application."
        )


def main() -> None:
    token = BOT_TOKEN
    if not token:
        raise RuntimeError(
            "BOT_TOKEN n'est pas défini. Exportez BOT_TOKEN dans votre environnement, mettez-le dans un fichier .env (BOT_TOKEN=...), ou modifiez bot.py."
        )

    application: Application = ApplicationBuilder().token(token).build()

    # Handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_cmd))
    application.add_handler(MessageHandler(filters.ALL, handle_message))

    logger.info("Bot en démarrage (polling)…")
    # Autoriser tous les types d'updates par simplicité lors des tests
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
