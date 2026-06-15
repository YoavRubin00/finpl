# Prompts — Savings Transformation

> שני שלבים: (א) ג'נרציה של 4 keyframes ב-**Nano Banana 2** עם reference image של Captain Shark הקיים. (ב) i2v ב-**Kling 3.0** מכל keyframe לקליפ של 3-4s.

**Reference image לקפטן** (משותף לכל הג'נרציות): `ASSETS/finplay/CAPTAIN SHARK/icon-1024.png` או `finn-profile.png` — לעקביות ויזואלית.

---

## חלק א — Nano Banana 2: 4 keyframes

### Style guide משותף (לכל 4)

```
Style: minimalist flat vector illustration of Captain Shark character.
Deep blue (#0A4A8F) and cyan palette. Friendly cartoon shark with
big round eyes, smile, captain hat. Clean geometry, negative space,
premium fintech aesthetic. Vertical 9:16 composition, centered subject.
NO TEXT, NO LETTERS, NO NUMBERS in the image.
Studio lighting, neutral grey background.
```

### Keyframe 1 — Week 1 (skinny / starting out)

```
A minimalist flat vector illustration of Captain Shark character —
deep blue cartoon shark with captain hat, big friendly eyes.
Body posture: slumped, slightly defeated, looking down. Body shape:
thin, slim tail, no muscle definition. Expression: subtle frown,
concerned. Standing on a neutral grey gym-style floor.
Vertical 9:16 composition, centered.
Deep blue and cyan palette, clean geometry, premium fintech aesthetic.
NO TEXT, NO LETTERS, NO NUMBERS, NO LOGOS anywhere in the image.
```

### Keyframe 2 — Week 4 (small progress)

```
A minimalist flat vector illustration of Captain Shark character —
same deep blue cartoon shark with captain hat. Body posture:
standing straighter, slight confidence. Body shape: subtle muscle
definition starting in the tail, slightly more toned. Expression:
small focused smile. Standing on neutral grey gym-style floor.
Vertical 9:16 composition, centered.
Same deep blue and cyan palette as previous frame for consistency.
NO TEXT, NO LETTERS, NO NUMBERS, NO LOGOS anywhere in the image.
```

### Keyframe 3 — Week 8 (notable muscle)

```
A minimalist flat vector illustration of Captain Shark character —
same deep blue cartoon shark with captain hat. Body posture:
confident stance, chest out. Body shape: clearly defined muscles
on tail and torso, athletic build. Expression: confident smile,
alert eyes. Standing on neutral grey gym-style floor with subtle
energy lines around the body.
Vertical 9:16 composition, centered.
Same deep blue and cyan palette as previous frames for consistency.
NO TEXT, NO LETTERS, NO NUMBERS, NO LOGOS anywhere in the image.
```

### Keyframe 4 — Week 12 (full transformation, hero pose)

```
A minimalist flat vector illustration of Captain Shark character —
same deep blue cartoon shark with captain hat. Body posture:
classic bodybuilder front-double-biceps flex pose. Body shape:
fully muscular, exaggerated muscle definition on tail and arms,
heroic proportions. Expression: confident triumphant smile.
Standing in front of golden hour sunburst rays, rim lighting on
the muscles. Subtle energy particles around the body.
Vertical 9:16 composition, centered, dramatic hero shot.
Same deep blue and cyan palette as previous frames, with warm
golden accents from the sunburst.
NO TEXT, NO LETTERS, NO NUMBERS, NO LOGOS anywhere in the image.
```

---

## חלק ב — Kling 3.0 i2v: 4 קליפים

> כל קליפ 3-4 שניות. Input image = ה-keyframe המתאים מחלק א.

### Clip 1 — Week 1 (3s)

**Input image**: keyframe-1-week1.png
**Model**: `kling_3_0`
**Duration**: 3s
**Prompt**:
```
Captain Shark stands slightly slumped, then exhales a small sigh.
Subtle micro zoom-in on the face, very slow camera push (5%).
Slight tail droop. Defeated but not sad. Static neutral background.
No text appears. No camera shake. Smooth 24fps motion.
```

### Clip 2 — Week 4 (3s)

**Input image**: keyframe-2-week4.png
**Model**: `kling_3_0`
**Duration**: 3s
**Prompt**:
```
Captain Shark straightens up, lifts tail with a hint of pride.
Small confident nod. Camera locked, no zoom. Subtle energy lines
flicker around the tail for a moment then fade. Background static.
No text appears. Smooth 24fps motion.
```

### Clip 3 — Week 8 (3s)

**Input image**: keyframe-3-week8.png
**Model**: `kling_3_0`
**Duration**: 3s
**Prompt**:
```
Captain Shark performs a small "pump" gesture — tail muscles flex
visibly, chest puffs up. Camera does a subtle dolly-in (8%).
Confident grin widens. Energy lines pulse around the body briefly.
Background static, neutral grey. No text appears. Smooth 24fps motion.
```

### Clip 4 — Week 12 (3s) — hero shot

**Input image**: keyframe-4-week12.png
**Model**: `kling_3_0`
**Duration**: 3s
**Prompt**:
```
Captain Shark holds a heroic front-double-biceps flex pose. Slow-mo
feel — muscles ripple subtly with confident power. Sun rays behind
the shark intensify and rotate slowly. Golden particles drift upward.
Camera locked, slight push-in (3%). Triumphant expression unchanged.
No text appears. Smooth 24fps motion, slight slow-motion vibe.
```

---

## חוקים חוזרים מ-CLAUDE.md

1. **ברירת מחדל**: `kling_3_0` לכל קליפ. **לא** Seedance/Veo/Sora בלי אישור.
2. **אין טקסט בסרטון** — כל "Week N" / "₪amount" יתווסף ב-CapCut.
3. **אין לוגו FinPlay** — הקפטן היא המותג.
4. **לפני generation**: לרוץ `mcp__higgsfield__balance` ולוודא שיש קרדיטים.
5. **אחרי generation**: לרשום ב-Google Sheet `1Jr3tc-FE1...` דרך `gws` CLI.

---

## אימות עקביות (consistency check)

לאחר יצירת 4 ה-keyframes ב-Nano Banana 2:
- [ ] כל 4 הקפטנים נראים כמו אותה דמות (אותו עיצוב פנים, אותו כובע, אותו צבע כחול)
- [ ] רק ההבדל בין השלבים = שרירים + הבעה + תאורה
- [ ] אין טקסט/לוגו אקראי בתמונות (Nano Banana נוטה להזות אם לא אומרים מפורש)

אם משהו לא עקבי — לחזור על ה-keyframe עם seed שונה / להוסיף `same character as previous frame` יותר חזק לפרומפט.
