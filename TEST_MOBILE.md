🎯 TEST VISUEL MOBILE 375×675
================================

## 🚀 Lancer le test

1. **Ouvrir le navigateur**
   ```
   http://localhost:8080/admin.html
   ```

2. **Activer DevTools** (F12 ou Cmd+Option+I)

3. **Activer Device Toolbar** (Ctrl+Shift+M ou Cmd+Shift+M)

4. **Configurer la taille**
   - Choisir "Responsive" 
   - Entrer `375` × `675`
   - OU choisir "iPhone SE" (375×667)

5. **Se connecter**
   - Code: `admin2024`

## ✅ Checklist de validation

### Layout général
- [ ] **Pas de scroll horizontal** sur toute la page
- [ ] Header bien contenu (logo + boutons)
- [ ] Stats en **2 colonnes** (Total | Disponibles, Masqués seul en dessous)
- [ ] Toolbar: boutons avec icônes uniquement, pas de débordement

### Section Produits (vue cartes)
- [ ] **Exactement 2 colonnes** de cartes
- [ ] Gap de ~10px entre les cartes
- [ ] Cartes de même largeur
- [ ] **Pas de débordement horizontal**

### Chaque carte produit
- [ ] Image: max 80px de hauteur, bien cadrée
- [ ] Titre (h3): 14px, wrap sur plusieurs lignes si long
- [ ] Tag catégorie: 11px, wrap si long
- [ ] Prix: 13px, lisible
- [ ] **Boutons en 1 colonne verticale**:
  - ✏️ Modifier (en haut)
  - 🗑️ Supprimer (en dessous)
- [ ] Chaque bouton fait 100% de largeur
- [ ] Texte bouton lisible (13px)
- [ ] Padding cartes: 10px

### Interactions
- [ ] Clic sur "Modifier" → ouvre modale
- [ ] Clic sur "Supprimer" → demande confirmation → supprime
- [ ] Modale s'affiche en plein écran (bottom sheet style)
- [ ] Tous les boutons sont cliquables (zone tactile ≥ 36px)

### Desktop (test rapide)
- [ ] Passer en 1024×768
- [ ] Vue cartes **disparaît**
- [ ] Vue tableau **apparaît**

## 🐛 Si problèmes persistent

### Débordement horizontal visible
```javascript
// Ouvrir Console DevTools et exécuter:
document.querySelectorAll('*').forEach(el => {
  if (el.scrollWidth > el.clientWidth) {
    console.log('Déborde:', el, el.scrollWidth, el.clientWidth);
  }
});
```

### Cartes pas en 2 colonnes
```javascript
// Vérifier les styles appliqués:
const cards = document.querySelector('.cards-list');
console.log(window.getComputedStyle(cards).gridTemplateColumns);
// Doit afficher: "187.5px 187.5px" (ou environ)
```

### Hard refresh
- Chrome: `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
- Ou: DevTools → Network → Cocher "Disable cache"

## 📱 Test sur vrai device

### iPhone
1. Trouver l'IP local du Mac:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
2. Sur iPhone, Safari: `http://[IP]:8080/admin.html`

### Android
1. Même IP que ci-dessus
2. Chrome: `http://[IP]:8080/admin.html`

## 🎨 Capture d'écran attendue

```
┌─────────────────────────┐
│ 🌿 CBD  👁️  🚪         │ ← Header compact
├─────────────────────────┤
│ [Total] [Disponibles]   │ ← Stats 2 col
│     [Masqués]           │
├─────────────────────────┤
│ 📂 📥 💾 ⬇️            │ ← Toolbar icônes
├─────────────────────────┤
│ 📦 Produits        [+]  │
├─────────────────────────┤
│ ┌────────┬────────┐     │
│ │ [IMG]  │ [IMG]  │     │ ← 2 colonnes
│ │ Titre1 │ Titre2 │     │
│ │ Tag    │ Tag    │     │
│ │ 19.90€ │ 25.00€ │     │
│ │┌──────┐│┌──────┐│     │
│ ││✏️Mod.│││✏️Mod.││     │ ← Boutons
│ │├──────┤│├──────┤│     │   en 1 col
│ ││🗑️Supp│││🗑️Supp││     │
│ │└──────┘│└──────┘│     │
│ └────────┴────────┘     │
│ ┌────────┬────────┐     │
│ │ ...    │ ...    │     │
│ └────────┴────────┘     │
└─────────────────────────┘
```

## ✅ C'est bon si...
- Vous pouvez scroller verticalement sans problème
- Aucun élément ne dépasse à droite ou à gauche
- Tous les boutons sont cliquables confortablement
- Les textes sont lisibles (pas trop petits)
- L'interface reste utilisable même avec titres longs

## 📅 Version
Fix appliqué: 13 novembre 2025
Testé sur: Chrome DevTools, iPhone SE viewport

