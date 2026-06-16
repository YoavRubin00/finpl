# Prompts log — Captain Shark in Tel Aviv (Friday Reels)

## REFERENCE IMAGE (canonical)
- **קובץ**: `ASSETS/finplay/CAPTAIN SHARK/image.webp`
- **Higgsfield media_id** (start_image): `61ff36c4-6a0d-4a62-8d0e-079fa9489c83`
- מקור: המשתמש העלה ידנית (ערוך/משופר חיצונית מהאופציות שיוצרו)

### תהליך יצירת רפרנס — לקחים
| ניסיון | מודל | job_id | תוצאה |
|---|---|---|---|
| v1 | nano_banana_2 | `0ebe9c3c…` | FAILED — פרומפט עמוס + "NOT" בקפסלוק, ככל הנראה מודרציה |
| v2 (cute generic) | nano_banana_2 | `33d10e1d…` | OK אבל "לא מספיק כריש" |
| v3 (great-white scary) | nano_banana_2 | `37fc090f…` | נדחה — לא חמוד מספיק |
| v4 (A, cute royal-blue) | nano_banana_2 | `044e7ddb…` | "הכי טוב עד עכשיו" — בסיס |
| v5 (B, captain coat) | nano_banana_2 | `c7209005…` | אופציה — לא נבחר |
| v6 (C, sky-blue taller fin) | nano_banana_2 | `6de17e1b…` | אופציה — לא נבחר |
| FINAL | (manual edit by user) | uploaded as `image.webp` | ✅ הרפרנס הקנוני |

**למידת prompt**: להימנע מ"NOT" בקפסלוק, מ"marketing stunt"/"brand activation" שמטריגרים מודרציה. עבד טוב: "costumed performer at a fun outdoor event".

---

## VIDEOS — Kling 3.0 (kling3_0, std, sound off, 9:16, 10s)

כל 3 הסרטונים משתמשים ב-`start_image: 61ff36c4-6a0d-4a62-8d0e-079fa9489c83` לעקביות דמות.

### Shot 1 — Carmel Market
- **job_id**: `08c81401-93e5-45dc-af87-03a1b19e05ec`
- **prompt**:
```
The blue shark mascot walks through bustling Tel Aviv Carmel Market alley between colorful spice and fruit stalls, vendors and shoppers around. Slow handheld tracking shot following from behind-side at hip level, gentle camera bounce. Mascot waves friendly to a vendor, cheerful rhythmic walk. Warm afternoon market light, dust motes in shafts of sun. Photoreal costumed performer look.
```

### Shot 2 — Tayelet (promenade)
- **job_id**: `65e16f37-89dd-4645-a9e9-96e635c4c065`
- **prompt**:
```
The blue shark mascot strolls along Tel Aviv beach promenade tayelet at golden hour. Mediterranean sea on his right, joggers and cyclists passing, palm trees lining the path. Slow steady tracking shot from his left at mid-distance, gentle bounce in step, ocean breeze ruffling the captain hat. Warm orange sunset light, soft cinematic photoreal costumed performer look.
```

### Shot 3 — Friday-vibes finale (beach sunset dance)
- **job_id**: `cdb87164-7d80-4528-9b8c-a83371225e85`
- **prompt**:
```
The blue shark mascot dances joyfully on Tel Aviv beach sand at Friday golden-hour sunset, arms raised, hips swaying, kicking up sand. Mediterranean sea and orange sun horizon behind. Wide shot, camera slowly orbits halfway around him. Silhouettes of celebrating beachgoers in background. Warm cinematic glow, soft volumetric light, photoreal costumed performer look.
```

---

### Shot 4 — Kids photo (brand activation feel)
- **job_id**: `d8a31b35-aa66-4067-84ce-181c5d9aec54`
- **prompt**:
```
The blue shark mascot stands cheerfully on a sunny Tel Aviv sidewalk while three excited kids run up to him for photos. One kid hugs the mascot's belly, two others pose for selfies on either side, a parent takes a phone photo. The mascot waves and gives a thumbs up. Palm trees and white Bauhaus buildings behind. Slow handheld medium shot. Warm afternoon light. Photoreal costumed performer look at a brand activation.
```

### Shot 5 — Viral TikTok shuffle dance
- **job_id**: `9be0f27a-2764-47b5-84d6-d6596c2cede5`
- **prompt**:
```
The blue shark mascot performs an energetic TikTok-style shuffle dance on a sunny Tel Aviv sidewalk, hips swaying side to side, fin-arms popping up-and-down to the beat, doing the classic point-up plus side-shuffle move combo, gentle bounce in rhythm. Locked-off static medium shot from front, a few locals filming with phones in the blurred background. Sunny daylight, palm trees. Photoreal costumed performer look, viral TikTok dance energy.
```

### Shot 6 — Viral run-to-pose ("Wait for it" trend)
- **job_id**: `65346990-3771-4689-bbef-9260e303a315`
- **prompt**:
```
The blue shark mascot runs comically toward the camera on Tel Aviv sidewalk with exaggerated arms swinging and big bouncy mascot steps, then skids to a sudden stop right in front of camera and strikes a confident heart-hands pose over his chest, slight head tilt, big grin. Background motion-blurred behind him. Daylight, palm trees and white buildings. Photoreal costumed performer look, viral run-then-pose trend energy.
```

### Shot 7 — Viral pose-drops montage
- **job_id**: `8b163ee2-4c34-47f6-b3dc-a269dd3541c1`
- **prompt**:
```
The blue shark mascot performs a quick sequence of iconic TikTok pose drops on a sunny Tel Aviv sidewalk: first hands on hips with confident head tilt, then arms crossed cool pose, then peace sign by the cheek with a head bob, then double finger-guns pointing at camera. Each pose held briefly with a tiny bounce in between. Locked-off static medium shot from front. Sunny daylight, palm trees behind. Photoreal costumed performer look, viral pose-drop trend energy.
```

### Shot 8 — Rothschild money rain
- **job_id**: `21d9d303-d994-4939-a7c4-24fbafcb2ef2`
- **prompt**:
```
The blue shark mascot walks confidently down the leafy pedestrian center strip of Tel Aviv's Rothschild Boulevard. Israeli shekel bills of cash continuously fall and flutter from inside his costume onto the pavement as he walks. A growing crowd of people behind him excitedly scrambles, bending down and picking up the cash from the ground, some running to keep up. Slow tracking shot from his side at hip level, gentle bounce. Warm afternoon dappled light through ficus trees. Photoreal, realistic crowd reaction.
```

### Shot 10 — Rothschild money throw (active version of Shot 8)
- **job_id**: `bcdce6b9-b354-4560-b78a-18371e34acdd`
- **prompt**:
```
The blue shark mascot walks confidently down Tel Aviv's Rothschild Boulevard, holding a thick stack of Israeli shekel bills in his fin-hands. He throws handfuls of cash high into the air with each step, bills fluttering and raining down behind him onto the pavement. A growing crowd of excited people follows behind, bending down and grabbing the cash from the ground, some running to keep up. Slow tracking shot from his side at hip level, gentle bounce. Warm afternoon dappled light through ficus trees. Photoreal, realistic crowd reaction.
```

### Shot 9 — Rothschild pile-on (continuation of Shot 8)
- **job_id**: `d7d244bd-7e93-405d-b189-8de15e878d07`
- **prompt**:
```
The blue shark mascot is surrounded by a laughing crowd of adults and kids on Tel Aviv's Rothschild Boulevard who playfully pile onto him in a celebratory group hug, like an Israeli soccer celebration. The mascot is half-buried under the joyful pile, fin-arms sticking out, everyone laughing and smiling. Wide medium low-angle shot, slow handheld camera, gentle bounce. Sunny afternoon dappled light through ficus trees. Photoreal costumed performer look, joyful realistic crowd.
```

---

## SEEDANCE 2.0 (1080p, std, 9:16) — אישור חד-פעמי מהמשתמש

> **רישום ב-memory**: אחרי הסט הזה המשתמש ביקש "לא להכין יותר בסידנס". ראה [feedback_no_seedance_default.md](../../../../../.claude/projects/c--Users-yrubi-OneDrive-Desktop--claude-projects-higgsfield-marketing-studio/memory/feedback_no_seedance_default.md). חזרה ל-Kling 3.0 כברירת מחדל.

### Shot 11 — Seedance: Rothschild money-throw (1080p, 10s)
- **job_id**: `facd9ae4-9dcf-4f9f-b200-8612a73d205f`
- **prompt**: זהה ל-Shot 10 (Kling), ב-Seedance 1080p.

### Shot 12 — Seedance: Rothschild pile-on (1080p, 10s)
- **job_id**: `607a5303-24d7-458e-9ead-4d5193fec021`
- **prompt**: זהה ל-Shot 9 (Kling), ב-Seedance 1080p.

### Shot 13 — Seedance: Azrieli rooftop trio dance (1080p, **12s**)
- **job_id**: `1da43934-fcfb-4d16-93a8-1ba657bba112`
- **prompt**:
```
Three identical blue shark mascot characters in matching captain hat costumes dance a synchronized viral TikTok dance on the rooftop helipad of Tel Aviv's iconic Azrieli Towers, the Mediterranean skyline and city spread out behind them at golden hour. Tight choreography — hip sways, fin-arm pops, jumps and turns in perfect unison. Wide cinematic tracking shot slowly orbiting halfway around them. Warm sunset glow, lens flare, slight wind. Photoreal costumed performer look, viral music-video energy.
```

---

## ⚠️ קרדיטים שבוזבזו — תיעוד
3 סרטוני Kling 3.0 נוצרו תחילה עם הרפרנס הלא נכון (אופציה C, `6de17e1b`) לפני שהמשתמש העלה את הרפרנס הנכון. ה-job_ids של ההרצה הראשונה (לא לשימוש): `52e9b5b7…`, `41e7bcbd…`, `2d580cc4…`.

**שורש הטעות**: לא היה לי דרך לגשת לקובץ שהמשתמש העלה לצ'אט (רק לראות את הפיקסלים). הנחתי שזה אופציה C על סמך דמיון ויזואלי. **כלל לעתיד**: לא להריץ video generation על סמך השערה ויזואלית — לבקש שמירה לקובץ ו-`media_upload` במפורש.
