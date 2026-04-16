# Nano Banana Prompts — FinFeed Mini-Games (12 templates)

## 🏗️ הארכיטקטורה
- **Nano Banana מייצר רק רקעים / אפקטים / סמלים — בלי אות טקסט אחד.**
- **הטקסט (עברית, מספרים, חותמות) מרונדר ב-React Native כשכבה עם `<Text>` + `SHADOW_STRONG` + Reanimated pulse.**
- **יתרונות**: חדות פיקסל־פרפקט, נגישות (VoiceOver), אנימציות טקסט, שינוי תוכן בלי לייצר תמונה חדשה. **פרסומה אחת = template + טקסט → 15 פרסומות מתוך 5 templates.**

## הנחיית סגנון גלובלית (תצרף לכל פרומפט)

> Style: modern flat digital illustration with subtle 3D shading, vibrant saturated colors, premium mobile game quality like Duolingo / Clash Royale. **ABSOLUTELY NO TEXT, NO LETTERS, NO TYPOGRAPHY, NO WATERMARKS, NO LOGOS, NO NUMBERS. Pure visual composition only.**

---

## A. Stamp Frames (2) — בסיס לחותמות

### 1. `stamp-frame-red.webp` — 768×768, רקע שקוף
📁 `assets/webp/minigames/bullshit-swipe/stamp-frame-red.webp`

```
Round grunge rubber stamp frame in deep red (#dc2626), EMPTY center (reserved for text overlay in code). A circular ring with authentic rubber-stamp texture: uneven ink distribution, rough edges, slight smudges, tiny ink blots, some fading on one side. Slightly rotated at -8 degrees. Inside the ring: completely empty, solid-clean area where text will be overlaid later. Transparent background, 768×768px. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO SYMBOLS — just the grunge ring itself.
```

### 2. `stamp-frame-green.webp` — 768×768, רקע שקוף
📁 `assets/webp/minigames/bullshit-swipe/stamp-frame-green.webp`

```
Round grunge rubber stamp frame in forest green (#16a34a), EMPTY center (reserved for text overlay in code). A circular ring with authentic rubber-stamp texture: uneven ink, rough edges, slight smudges, small ink blots, faded areas. Slightly rotated at +8 degrees. Inside the ring: completely empty solid-clean area for text overlay. Transparent background, 768×768px. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO SYMBOLS — just the grunge ring itself.
```

---

## B. Ad Background Templates — SCAM (5 templates)

**הערה:** כל template משרת 2-4 פרסומות שונות. הטקסט, ה-headline, ה-disclaimer, ה-badges — כולם יורכבו ב-React Native עם שכבות `<Text>` מעל הרקע.

### 3. `ad-bg-scam-neon.webp` — 1080×1080
📁 `assets/webp/minigames/bullshit-swipe/templates/ad-bg-scam-neon.webp`
**משרת**: הלוואת 0% ריבית, כסף מהיר, הצעות פיננסיות מפוצצות

```
Scammy Instagram-ad BACKGROUND ONLY. Aggressive gradient from hot pink (#ec4899) top-left to deep purple (#7c3aed) bottom-right. Scattered decorative elements: 4-6 stylized gold coins tumbling at various angles, 5-8 gold-and-white sparkle burst shapes (stars, not asterisks), small decorative flame or firework bursts in corners. A subtle radial glow behind center suggesting a "spotlight". Leave large clean empty zones in upper-center and lower-right for text overlay. Deliberately gaudy, over-the-top, cheap clickbait aesthetic. ABSOLUTELY NO TEXT, NO LETTERS, NO CURRENCY SYMBOLS AS TEXT, NO NUMBERS. Only decorative visual elements. 1080×1080.
```

### 4. `ad-bg-scam-crypto.webp` — 1080×1080
📁 `assets/webp/minigames/bullshit-swipe/templates/ad-bg-scam-crypto.webp`
**משרת**: Crypto 2x, NFT scam, "הכפל כספך"

```
Scammy crypto-promotion BACKGROUND ONLY. Very dark navy (#0a0e27) to black radial gradient. 5-7 glowing golden metallic coins floating at various depths with motion-blur trails suggesting speed. Subtle neon cyan and gold light rays emanating from center. A faint circuit-board pattern in the far background. Leave clean zones in upper-third and center for text overlay. Aggressive, urgent, high-stakes gambling aesthetic. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO "BITCOIN" symbols written as letters — only metallic round coins as visual shapes. 1080×1080.
```

### 5. `ad-bg-scam-aspirational.webp` — 1080×1080
📁 `assets/webp/minigames/bullshit-swipe/templates/ad-bg-scam-aspirational.webp`
**משרת**: MLM, פירמידה, "עצמאות כלכלית מהבית"

```
MLM-recruitment style BACKGROUND ONLY. Soft pastel peach-to-cream gradient. A back-view silhouette of a well-dressed person (gender-neutral) standing on the left third, looking out toward a distant Tuscan-style mansion on the right with a luxury sports car in the driveway. Soft golden-hour lighting with warm bokeh. Leave clean zones on the center-left for text overlay. Suspiciously perfect aspirational lifestyle aesthetic. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO BRAND LOGOS on the car or building. 1080×1080.
```

### 6. `ad-bg-scam-tech.webp` — 1080×1080
📁 `assets/webp/minigames/bullshit-swipe/templates/ad-bg-scam-tech.webp`
**משרת**: Excel algorithm, מסחר יומי, סוחר פורקס, "אלגוריתם סודי"

```
Hacker / tech-conspiracy BACKGROUND ONLY. Very dark tech background (#050a15). Green Matrix-style vertical code streaks in the far background (blurred, abstract vertical lines — NOT readable characters). A glowing abstract grid in perspective. Subtle red and green trend-lines crisscrossing. A spotlight effect center-stage. Leave a dark solid clean zone in upper-center for text overlay. Conspiracy-theory / dark-web aesthetic. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO READABLE CODE — only abstract green streaks and light effects. 1080×1080.
```

### 7. `ad-bg-scam-realestate.webp` — 1080×1080
📁 `assets/webp/minigames/bullshit-swipe/templates/ad-bg-scam-realestate.webp`
**משרת**: תמ"א 38, נדל"ן "רווח מובטח", השקעה מזויפת

```
Fake-real-estate BACKGROUND ONLY. Photo-realistic stylized render of a modern Tel Aviv apartment building under partial reconstruction (scaffolding visible), blue-hour lighting. Gold coins raining down from the top half of the frame (8-12 coins at varied angles with motion trails). A subtle "sunburst" lens flare in one corner. Leave clean zones in upper-third for text overlay. Over-the-top "get-rich-quick" real estate aesthetic. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO PROPERTY NAMES OR SIGNS. 1080×1080.
```

---

## C. Ad Background Templates — LEGIT (2 templates)

### 8. `ad-bg-legit-corporate.webp` — 1080×1080
📁 `assets/webp/minigames/bullshit-swipe/templates/ad-bg-legit-corporate.webp`
**משרת**: ETF (S&P 500), פיקדון שקלי, אגרות חוב

```
Professional corporate financial-institution BACKGROUND ONLY. Clean navy-blue gradient from (#1e3a8a) top to (#0f1e4a) bottom. A subtle thin white grid pattern faintly visible. In the lower-right corner: a minimalist gold ascending line-chart drawn as clean abstract curves going up-right (just the shape of the line, no axis labels). A small gold geometric accent (circle or triangle) in the top-left. Leave a large completely clean empty area spanning upper two-thirds for text overlay. Premium, trustworthy, bank-quality, minimalist. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO AXIS LABELS, NO LOGOS. 1080×1080.
```

### 9. `ad-bg-legit-warm.webp` — 1080×1080
📁 `assets/webp/minigames/bullshit-swipe/templates/ad-bg-legit-warm.webp`
**משרת**: קרן השתלמות, פנסיה, חיסכון לטווח ארוך

```
Legitimate pension / retirement BACKGROUND ONLY. Warm golden-hour Mediterranean beach scene, cinematic color grade. A mature couple walking together on wet sand near the water's edge (backs to viewer, small in the frame — upper-right third). Gentle ocean waves. Soft warm light rays, lens flare, calm clouds. Leave clean zones in upper-left and center for text overlay. Reputable, mature, "long-term planning" vibes. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO BRAND LOGOS anywhere. 1080×1080.
```

---

## D. Scenario Illustrations — Higher/Lower (3 images, 1024×1024, transparent bg)

### 10. `hl-mattress-vs-sp500.webp`
📁 `assets/webp/minigames/higher-lower/hl-mattress-vs-sp500.webp`

```
Split illustration with diagonal divider from top-right to bottom-left. LEFT SIDE: massive stack of generic currency bills (shekel-style but NOT showing any readable denomination) hidden under a blue patterned mattress. Small dust particles and a cute spiderweb in the corner. Muted desaturated tones suggesting neglect. RIGHT SIDE: vibrant purple rocket launching upward along an exponential growth curve drawn as a clean gold line (no axis labels). Neon purple and cyan glow effects around rocket. Visual metaphor: dormant cash vs. compounding investment. Transparent background. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO CURRENCY SYMBOLS READABLE AS TEXT. 1024×1024.
```

### 11. `hl-crypto-vs-etf.webp`
📁 `assets/webp/minigames/higher-lower/hl-crypto-vs-etf.webp`

```
Split illustration with vertical divider. LEFT SIDE: a single large gold coin (generic metallic, no written symbol on face — just a blank gold disc with embossed wave patterns) violently spinning, surrounded by chaotic zigzag red and green arrow shapes and small lightning bolts — visual chaos. RIGHT SIDE: a clean steady upward green line chart, calm and confident, with small abstract icon shapes (not text) nearby like shield or sturdy block. Visual metaphor for speculation vs. diversification. Transparent background. ABSOLUTELY NO TEXT, NO LETTERS, NO "BTC" or "ETF" letters, NO NUMBERS. 1024×1024.
```

### 12. `hl-early-vs-late-invest.webp`
📁 `assets/webp/minigames/higher-lower/hl-early-vs-late-invest.webp`

```
Timeline comparison illustration, horizontal split. LEFT SIDE: a young adult (clearly young, cheerful) joyfully planting a small sapling growing gold-leaf coins in fertile soil with sunrise in background. The tree has many budding golden leaves above, suggesting years of growth. RIGHT SIDE: a middle-aged adult (visibly older) planting an identical sapling in similar soil, but the tree is smaller with fewer leaves, with a small sunset on the horizon suggesting less time. Warm watercolor-meets-digital illustration. Transparent background. ABSOLUTELY NO TEXT, NO LETTERS, NO AGES WRITTEN, NO NUMBERS — ages conveyed only through visible appearance. 1024×1024.
```

---

## 📂 מבנה תיקיות

```
assets/webp/minigames/
├── bullshit-swipe/
│   ├── stamp-frame-red.webp           #1
│   ├── stamp-frame-green.webp         #2
│   └── templates/
│       ├── ad-bg-scam-neon.webp       #3
│       ├── ad-bg-scam-crypto.webp     #4
│       ├── ad-bg-scam-aspirational.webp #5
│       ├── ad-bg-scam-tech.webp       #6
│       ├── ad-bg-scam-realestate.webp #7
│       ├── ad-bg-legit-corporate.webp #8
│       └── ad-bg-legit-warm.webp      #9
└── higher-lower/
    ├── hl-mattress-vs-sp500.webp      #10
    ├── hl-crypto-vs-etf.webp          #11
    └── hl-early-vs-late-invest.webp   #12
```

---

## 📋 Checklist אחרי יצירה

1. ✅ **אפס טקסט בכל התמונות.** אם Nano Banana הכניס אות אחת — שלח מחדש עם: `NO TEXT, NO WRITING, NO LETTERS OF ANY ALPHABET`.
2. ✅ חותמות (#1, #2) — רקע שקוף, **מרכז החותמת ריק**.
3. ✅ Scenario illustrations (#10-12) — רקע שקוף.
4. ✅ Ad templates (#3-9) — **ריבועיות 1080×1080 עם אזורים ריקים לטקסט**.
5. ✅ שמירה ב-[assets/webp/minigames/](assets/webp/minigames/) לפי המבנה.

## 💡 טיפים אם Nano Banana מתעקש להוסיף טקסט

- הוסף לסוף הפרומפט: `The image must be completely text-free. Remove any lettering, gibberish text, fake logos, or numbers. Only abstract visual elements.`
- נסה מחדש אם יש גם אות אחת — זה **יהרוס את המראה הפרימיום**.
- אם עדיין יש טקסט — צור תמונה עם גלגל `inpaint`/`edit` כדי למחוק את הטקסט ולהשאיר רקע.

## 🧱 איך הטקסט נבנה בקוד

דוגמה מ-BullshitSwipeCard:
```tsx
<View style={{ aspectRatio: 1, borderRadius: 20, overflow: 'hidden' }}>
  <ExpoImage
    source={require('.../ad-bg-scam-neon.webp')}
    style={StyleSheet.absoluteFill}
    contentFit="cover"
  />
  {/* Pulsing headline */}
  <Animated.Text style={[scamHeadlineStyle, pulseStyle]}>
    {ad.headline}   {/* "הלוואה 0% ריבית!" */}
  </Animated.Text>
  {/* "LIMITED TIME" badge */}
  <View style={badgeStyle}>
    <Text style={badgeText}>{ad.badge}</Text>
  </View>
  {/* Microscopic disclaimer — THE gotcha */}
  <Text style={disclaimerStyle}>{ad.disclaimer}</Text>
</View>
```
