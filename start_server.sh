#!/usr/bin/env bash
# Script pour démarrer le serveur ET le bot Telegram proprement
set -euo pipefail

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Nettoyage des anciens processus...${NC}";
# Tuer tous les processus sur le port 8080 (serveur) et anciens bot.py
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
pgrep -f bot.py | xargs kill -9 2>/dev/null || true
sleep 1

# Aller dans le dossier du script
cd "$(dirname "$0")"

# Activer l'environnement virtuel si présent
if [ -d ".venv" ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
  echo -e "${GREEN}✅ .venv activé${NC}"
fi

LOGDIR=logs
mkdir -p "$LOGDIR"

echo -e "${GREEN}🚀 Démarrage du serveur...${NC}"
nohup python3 server_custom.py > "$LOGDIR/server.log" 2>&1 &
SERVER_PID=$!

echo -e "${GREEN}🤖 Démarrage du bot Telegram...${NC}"
nohup python3 bot.py > "$LOGDIR/bot.log" 2>&1 &
BOT_PID=$!

printf "%s\n%s\n" "$SERVER_PID" "$BOT_PID" > "$LOGDIR/pids.txt"

echo -e "${YELLOW}⏳ Vérifications en cours...${NC}"
sleep 3

if lsof -i:8080 >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Serveur opérationnel: http://localhost:8080${NC}"
  echo -e "${GREEN}⚙️  Admin: http://localhost:8080/admin${NC}"
else
  echo -e "${RED}❌ Échec du démarrage du serveur (voir $LOGDIR/server.log)${NC}"
  kill "$SERVER_PID" "$BOT_PID" 2>/dev/null || true
  exit 1
fi

if ps -p "$BOT_PID" >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Bot lancé (PID=$BOT_PID)${NC}"
else
  echo -e "${RED}❌ Bot non lancé (voir $LOGDIR/bot.log)${NC}"
fi

echo -e "${YELLOW}ℹ️  Pour arrêter: Ctrl+C${NC}"

echo -e "${YELLOW}📝 Logs: ${NC}$LOGDIR/server.log | $LOGDIR/bot.log"

echo -e "${YELLOW}📌 PIDs enregistrés dans $LOGDIR/pids.txt${NC}"

cleanup(){
  echo -e "${YELLOW}🛑 Arrêt en cours...${NC}"
  kill "$SERVER_PID" "$BOT_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  wait "$BOT_PID" 2>/dev/null || true
  echo -e "${GREEN}✔ Terminé.${NC}"
  exit 0
}
trap cleanup INT TERM

# Attendre les processus (bloquant pour garder le script en vie)
wait
