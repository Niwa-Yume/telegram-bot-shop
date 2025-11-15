#!/bin/bash
# Script pour démarrer le serveur proprement

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 Nettoyage des anciens processus...${NC}"
# Tuer tous les processus sur le port 8080
lsof -ti:8080 | xargs kill -9 2>/dev/null
sleep 2

echo -e "${GREEN}🚀 Démarrage du serveur...${NC}"
cd "$(dirname "$0")"
python3 server_custom.py &

sleep 3

# Vérifier que le serveur fonctionne
if lsof -i:8080 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Serveur démarré avec succès !${NC}"
    echo -e "${GREEN}📱 Shop:  http://localhost:8080/${NC}"
    echo -e "${GREEN}⚙️  Admin: http://localhost:8080/admin${NC}"
else
    echo -e "${RED}❌ Échec du démarrage du serveur${NC}"
    exit 1
fi

