# Lumen — Design System (néobanque futuriste)

Guide complet pour recréer le front « Lumen » : dark UI, verre dépoli (glassmorphism), accents néon violet/cyan. Copie-colle les tokens et les recettes ci-dessous.

---

## 1. Principes

1. **Fond sombre quasi-noir** légèrement teinté bleu, jamais #000 pur.
2. **Profondeur par la lumière** : halos radiaux flous + ombres colorées, pas de bordures lourdes.
3. **Verre dépoli** pour les surfaces flottantes (`backdrop-filter: blur`).
4. **Néon parcimonieux** : le dégradé violet→cyan ne sert qu'aux éléments clés (solde, CTA, actif de nav, bouton scan).
5. **Données en monospace**, titres et chiffres en grotesk serré (`letter-spacing` négatif).
6. **Hiérarchie par la couleur du texte**, pas par la taille seule (primaire / atténué / muted).

---

## 2. Couleurs (tokens)

```css
:root {
  /* Fonds */
  --bg:            #06070D;   /* page / app */
  --surface-1:     #0C0E1A;   /* haut d'écran (dégradé vers #08090F) */
  --surface-2:     #08090F;   /* bas d'écran */

  /* Verre dépoli */
  --glass:         rgba(255,255,255,.06);
  --glass-strong:  rgba(18,20,32,.72);   /* nav flottante */
  --hairline:      rgba(255,255,255,.12); /* bordure 1px */
  --hairline-soft: rgba(255,255,255,.08);

  /* Texte */
  --text:          #ECEDF5;   /* primaire */
  --text-2:        #C4C7D6;   /* secondaire */
  --text-muted:    #8A8FA6;   /* labels / méta */
  --text-dim:      #6E7392;   /* nav inactive */

  /* Accents néon */
  --violet:        #7C5CFF;
  --violet-deep:   #5B3FE0;
  --cyan:          #3FD0F0;
  --grad:          linear-gradient(135deg, #7C5CFF, #5B3FE0);
  --grad-neon:     linear-gradient(135deg, #7C5CFF, #3FD0F0);

  /* Sémantique */
  --positive:      #4ADE9B;   /* crédits, succès */
}
```

**Dégradé « texte lumineux »** (solde, gros montants) :
```css
background: linear-gradient(120deg, #FFFFFF, #B9A8FF 60%, #6FE3FF);
-webkit-background-clip: text; background-clip: text; color: transparent;
```

> ⚠️ N'augmente pas la saturation des fonds. Les accents partagent la même intensité ; on ne fait varier que la teinte (violet ↔ cyan).

---

## 3. Typographie

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

| Usage | Police | Détails |
|---|---|---|
| Titres / chiffres | **Space Grotesk** 700 | `letter-spacing: -1px à -2px` sur les gros nombres |
| UI / corps | Space Grotesk 400–600 | 13–19px |
| Labels, montants, méta, refs | **Space Mono** | `letter-spacing: 2px`, `text-transform: uppercase` pour les labels |

Échelle type : solde 42px · montant saisi 60px · titre écran 18px · ligne tx 14px · label mono 10–11px.

---

## 4. Rayons, ombres, effets

```css
/* Rayons */
--r-phone: 39px;   /* écran intérieur */
--r-card:  22px;   /* carte bancaire / blocs */
--r-tile:  18px;   /* tuiles, blocs verre */
--r-btn:   16-18px;
--r-pill:  20-30px;

/* Ombres colorées */
--shadow-phone: 0 30px 60px -20px rgba(124,92,255,.45), 0 0 0 1px rgba(255,255,255,.04);
--shadow-cta:   0 12px 26px -8px rgba(124,92,255,.8);
--shadow-card:  0 22px 44px -16px rgba(124,92,255,.7);
```

**Halo d'ambiance** (à placer en absolute derrière le contenu) :
```css
.glow {
  position:absolute; border-radius:50%; filter:blur(40px); pointer-events:none;
  background: radial-gradient(circle, rgba(124,92,255,.40), transparent 65%);
}
```

**Grille de fond** (faible, masquée en fondu) :
```css
background-image:
  linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
background-size: 48px 48px;
mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%);
```

---

## 5. Le châssis téléphone (phone shell)

Bordure dégradée → écran intérieur sombre. Dimensions de référence : **308 × 648**.

```html
<div style="width:308px; height:648px; border-radius:46px; padding:8px;
     background:linear-gradient(160deg, rgba(124,92,255,.5), rgba(255,255,255,.06) 30%, rgba(63,208,240,.35));
     box-shadow:0 30px 60px -20px rgba(124,92,255,.45), 0 0 0 1px rgba(255,255,255,.04);">
  <div style="width:100%; height:100%; border-radius:39px;
       background:linear-gradient(180deg,#0C0E1A,#08090F);
       overflow:hidden; position:relative; display:flex; flex-direction:column;">
    <!-- barre d'état -->
    <div style="display:flex; justify-content:space-between; padding:16px 22px 6px;
         font-family:'Space Mono',monospace; font-size:11px; color:#8A8FA6;">
      <span>9:41</span><span style="letter-spacing:1px;">5G ▮▮▮ 86%</span>
    </div>
    <!-- contenu écran -->
  </div>
</div>
```

---

## 6. Recettes de composants

### Solde (hero)
```html
<div style="font-family:'Space Mono',monospace; font-size:11px; letter-spacing:2px; color:#8A8FA6;">SOLDE DISPONIBLE</div>
<div style="font-size:42px; font-weight:700; letter-spacing:-1.5px;
     background:linear-gradient(120deg,#FFFFFF,#B9A8FF 60%,#6FE3FF);
     -webkit-background-clip:text; background-clip:text; color:transparent;">12 480,50 €</div>
<span style="font-family:'Space Mono',monospace; font-size:11px; color:#4ADE9B;
     background:rgba(74,222,155,.12); border:1px solid rgba(74,222,155,.3);
     border-radius:20px; padding:3px 10px;">↑ 2,4% ce mois</span>
```

### Bouton d'action rapide
Le bouton **primaire** est plein dégradé + ombre néon ; les autres sont en verre.
```html
<!-- primaire -->
<div style="width:52px;height:52px;border-radius:18px;background:linear-gradient(135deg,#7C5CFF,#5B3FE0);
     display:flex;align-items:center;justify-content:center;font-size:21px;
     box-shadow:0 8px 18px -6px rgba(124,92,255,.7);">↗</div>
<!-- secondaire (verre) -->
<div style="width:52px;height:52px;border-radius:18px;background:rgba(255,255,255,.06);
     border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;">↙</div>
```

### Ligne de transaction
Icône colorée par catégorie · libellé/méta · montant mono (vert si crédit).
```html
<div style="display:flex; align-items:center; gap:12px;">
  <div style="width:42px;height:42px;border-radius:14px;background:rgba(124,92,255,.16);
       border:1px solid rgba(124,92,255,.3);display:flex;align-items:center;justify-content:center;">⌁</div>
  <div style="flex:1;">
    <div style="font-size:14px;font-weight:500;">Spotify</div>
    <div style="font-size:11px;color:#8A8FA6;">Abonnement · 21:04</div>
  </div>
  <div style="font-family:'Space Mono',monospace;font-size:14px;">−9,99 €</div>
</div>
```

### Carte bancaire holographique
```html
<div style="height:196px; border-radius:22px; padding:20px; position:relative; overflow:hidden;
     background:linear-gradient(135deg,#7C5CFF 0%,#4B2FC9 45%,#16182B 100%);
     box-shadow:0 22px 44px -16px rgba(124,92,255,.7);">
  <div style="position:absolute; top:-40px; right:-30px; width:180px; height:180px; border-radius:50%;
       background:radial-gradient(circle, rgba(63,208,240,.5), transparent 60%); filter:blur(10px);"></div>
  <!-- puce -->
  <div style="width:42px;height:32px;border-radius:7px;background:linear-gradient(135deg,#E7D9A0,#B9962E);"></div>
  <div style="font-family:'Space Mono',monospace; letter-spacing:3px; margin-top:18px;">5412 ···· ···· 7723</div>
</div>
```

### Barre de navigation flottante (verre)
```html
<div style="position:absolute; bottom:14px; left:18px; right:18px; height:58px; border-radius:24px;
     background:rgba(18,20,32,.72); backdrop-filter:blur(18px); border:1px solid rgba(255,255,255,.1);
     display:flex; align-items:center; justify-content:space-around; padding:0 8px;">
  <!-- ... items ... bouton central scan surélevé : -->
  <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#7C5CFF,#5B3FE0);
       display:flex;align-items:center;justify-content:center;font-size:22px;margin-top:-22px;
       box-shadow:0 10px 22px -6px rgba(124,92,255,.8);border:3px solid #0A0B14;">▣</div>
</div>
```

### CTA principal
```html
<div style="height:54px; border-radius:18px; background:linear-gradient(135deg,#7C5CFF,#5B3FE0);
     display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:600;
     box-shadow:0 12px 26px -8px rgba(124,92,255,.8);">Continuer →</div>
```

### Pavé numérique
Touches sans fond (texte seul), grille 3 colonnes, gap 8px, hauteur 44px, `font-size:22px`. `,` et `⌫` en `#8A8FA6`.

### Bloc reçu (verre dépoli)
```html
<div style="border-radius:18px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
     backdrop-filter:blur(14px); padding:14px 16px;">
  <div style="display:flex; justify-content:space-between; font-size:13px;">
    <span style="color:#8A8FA6;">Statut</span><span style="color:#4ADE9B;">Instantané ✓</span>
  </div>
</div>
```

---

## 7. Animations

```css
@keyframes hf-pop  { 0%{transform:scale(.5);opacity:0} 65%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
@keyframes hf-scan { 0%{top:14%} 100%{top:82%} }     /* ligne du scanner QR */
@keyframes hf-float{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
```
- **Succès** : coche dans un cercle dégradé `box-shadow:0 0 50px rgba(124,92,255,.8)` + `animation: hf-pop .6s ease-out`.
- **Scanner** : ligne `linear-gradient(90deg,transparent,#3FD0F0,transparent)` + `box-shadow:0 0 14px #3FD0F0`, `animation: hf-scan 2.2s ease-in-out infinite alternate`.

---

## 8. Écrans de référence

1. **Accueil** — barre d'état · entête (bonsoir + avatar à anneau dégradé) · solde hero · 4 actions rapides · transactions · nav flottante.
2. **Carte** — carte holographique · 3 contrôles verre (Geler / Réglages / Limites) · graphe de dépenses (1 barre néon active).
3. **Scanner QR** — viseur à 4 coins (violet/cyan) · ligne de scan animée · contrôles bas (flash / mon QR / galerie).
4. **Envoyer** — chip destinataire · montant géant dégradé · note · pavé numérique · CTA.
5. **Succès** — fond radial violet · coche lumineuse animée · bloc reçu · actions (Partager / Terminé).

---

## 9. Checklist anti-fausse-note

- [ ] Fond jamais #000 pur ; toujours teinté (#06070D).
- [ ] Le dégradé néon ne touche **que** les éléments clés.
- [ ] Surfaces flottantes = `backdrop-filter: blur` + hairline 1px.
- [ ] Chiffres/labels en Space Mono ; titres en Space Grotesk serré.
- [ ] Ombres **colorées** (violet), pas noires.
- [ ] Icônes = glyphes simples / formes géométriques, pas de SVG complexes faits main.
- [ ] Crédits & succès en vert `--positive` ; le reste en blanc.
