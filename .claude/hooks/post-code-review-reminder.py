# -*- coding: utf-8 -*-
"""
PostToolUse hook — fires after Write/Edit/NotebookEdit.
Injects a Hebrew reminder asking Claude to run three review agents:
יפיופי (UX/RTL/design), וארן (financial accuracy), ארכיטקט (architecture).
"""
import json
import sys

REMINDER = (
    "\U0001f3af סקירה פוסט-קוד: אחרי שינויי קוד שבוצעו, הפעל שלושה סוכנים לסקירה "
    "(במקביל כשאפשר, דרך Agent subagent_type=Explore, או ברצף דרך Skill): "
    "(1) \u05d9\u05e4\u05d9\u05d5\u05e4\u05d9 — UX, RTL, עיצוב, נגישות. "
    "(2) \u05d5\u05d0\u05e8\u05df — דיוק תוכן פיננסי. "
    "(3) \u05d0\u05e8\u05db\u05d9\u05d8\u05e7\u05d8 — ארכיטקטורה, ביצועים, חוב טכני. "
    "אם השינוי טריוויאלי (טיפו/עיצוב קל) אפשר לדלג — אבל הזכר למשתמש שדילגת."
)

payload = {
    "hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "additionalContext": REMINDER,
    }
}

sys.stdout.write(json.dumps(payload, ensure_ascii=False))
sys.stdout.flush()
