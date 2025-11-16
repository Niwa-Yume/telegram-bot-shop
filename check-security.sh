#!/usr/bin/env bash
# Script de vérification de sécurité avant commit
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔒 Vérification de sécurité..."
echo ""

ISSUES=0

# 1. Vérifier que .env n'est pas tracké
if git ls-files --error-unmatch .env 2>/dev/null; then
    echo -e "${RED}❌ CRITIQUE: .env est tracké par Git !${NC}"
    echo "   Solution: git rm --cached .env"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✓${NC} .env non tracké"
fi

# 2. Vérifier que logs/ n'est pas tracké
if git ls-files logs/ 2>/dev/null | grep -q .; then
    echo -e "${RED}❌ CRITIQUE: Des fichiers de logs/ sont trackés !${NC}"
    echo "   Solution: git rm --cached -r logs/"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✓${NC} logs/ non tracké"
fi

# 3. Rechercher des tokens hardcodés
echo ""
echo "🔍 Recherche de tokens hardcodés..."
if grep -rn --include="*.py" --include="*.js" --exclude-dir=".venv" --exclude-dir="node_modules" -E "[0-9]{9,}:[A-Za-z0-9_-]{35}" . 2>/dev/null; then
    echo -e "${RED}❌ CRITIQUE: Token Telegram potentiel détecté !${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✓${NC} Aucun token hardcodé détecté"
fi

# 4. Vérifier que BOT_TOKEN n'est pas hardcodé
if grep -rn --include="*.py" --exclude-dir=".venv" 'BOT_TOKEN\s*=\s*["\'][0-9]' . 2>/dev/null; then
    echo -e "${RED}❌ WARNING: BOT_TOKEN semble hardcodé${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✓${NC} BOT_TOKEN utilise os.getenv()"
fi

# 5. Vérifier .gitignore
echo ""
echo "📋 Vérification .gitignore..."
for pattern in ".env" "logs/" "*.log"; do
    if grep -q "^${pattern}" .gitignore 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $pattern dans .gitignore"
    else
        echo -e "${YELLOW}⚠${NC}  $pattern manquant dans .gitignore"
        ISSUES=$((ISSUES + 1))
    fi
done

# 6. Vérifier que les logs existants ne contiennent pas de tokens
echo ""
echo "📝 Vérification des logs existants..."
if [ -d "logs" ]; then
    if grep -r --include="*.log" -E "bot[0-9]{9,}:[A-Za-z0-9_-]+" logs/ 2>/dev/null; then
        echo -e "${RED}❌ CRITIQUE: API key trouvée dans les logs !${NC}"
        echo "   Solution: rm -rf logs/*.log"
        ISSUES=$((ISSUES + 1))
    else
        echo -e "${GREEN}✓${NC} Logs propres"
    fi
else
    echo -e "${GREEN}✓${NC} Pas de dossier logs/"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les tests de sécurité passent !${NC}"
    exit 0
else
    echo -e "${RED}❌ $ISSUES problème(s) de sécurité détecté(s)${NC}"
    echo ""
    echo "Voir SECURITY.md pour plus d'informations"
    exit 1
fi

