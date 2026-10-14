-- FinPlay weekly metrics, PostHog project 176605.
-- Run with: Get-Content docs\ops\weekly-metrics.sql -Raw | claude -p --output-format text --allowedTools "mcp__claude_ai_PostHog__exec" --max-turns 30
-- Instructions to the agent: use mcp__claude_ai_PostHog__exec (call execute-sql) on
-- project 176605. Run every query in order. Print "### Wn" then raw pipe-delimited
-- rows, no commentary. Add LIMIT 200 where missing. On an error, print it, try one
-- obvious fix, continue. At the end print "### READ" with one line per query stating
-- whether the target below was met.

-- W1 — Trial funnel by source, 30 days. TARGET: trial_started / cta_ready >= 8%.
SELECT properties.source AS source,
       uniqIf(distinct_id, event='paywall_viewed') AS viewed,
       uniqIf(distinct_id, event='paywall_cta_state' AND properties.state='ready') AS cta_ready,
       uniqIf(distinct_id, event='purchase_initiated') AS initiated,
       uniqIf(distinct_id, event='trial_started') AS trial,
       uniqIf(distinct_id, event='subscription_purchased') AS purchased
FROM events WHERE timestamp >= now() - INTERVAL 30 DAY
  AND event IN ('paywall_viewed','paywall_cta_state','purchase_initiated','trial_started','subscription_purchased')
GROUP BY source ORDER BY viewed DESC;

-- W2 — Guest recovery: did resume=purchase work? TARGET: resumed > 0 and a purchase from a guest.
SELECT toDate(timestamp) AS d,
       countIf(event='paywall_purchase_resumed') AS resumed,
       countIf(event='register_cta_accepted' AND properties.source='pro_purchase') AS guest_registered,
       countIf(event='trial_started') AS trial
FROM events WHERE timestamp >= toDate('2026-10-14') GROUP BY d ORDER BY d;

-- W3 — The energy wall after 20->10. TARGET: >= 15 users/week hit it.
SELECT toStartOfWeek(timestamp) AS w,
       uniqIf(distinct_id, event='energy_depleted') AS depleted_users,
       countIf(event='energy_depleted') AS depleted_events,
       uniqIf(distinct_id, event='energy_refill_option_tapped') AS refill_tapped,
       uniqIf(distinct_id, event='energy_purchased') AS coin_refills
FROM events WHERE timestamp >= now() - INTERVAL 42 DAY GROUP BY w ORDER BY w;

-- W4 — GUARDRAIL for the energy change. Lessons per active user and sessions per
-- user must NOT drop more than 10% week over week. If they do, raise MAX_HEARTS to 14.
SELECT toStartOfWeek(timestamp) AS w,
       uniqIf(distinct_id, event='Application Opened') AS actives,
       countIf(event='lesson_started') AS lesson_starts,
       round(countIf(event='lesson_started') / nullIf(uniqIf(distinct_id, event='Application Opened'), 0), 2) AS starts_per_active,
       uniq(properties.$session_id) AS sessions,
       countIf(event='chest_opened') AS chests
FROM events WHERE timestamp >= now() - INTERVAL 70 DAY AND properties.$lib = 'posthog-react-native'
GROUP BY w ORDER BY w;

-- W5 — mod-0-1 completion. TARGET: chest/started stays >= 70% (was 50% before 11.10).
SELECT toStartOfWeek(timestamp) AS w,
       uniqIf(distinct_id, event='lesson_started') AS started,
       uniqIf(distinct_id, event='chest_opened') AS chest,
       uniqIf(distinct_id, event='lesson_completed') AS completed
FROM events WHERE timestamp >= now() - INTERVAL 56 DAY
  AND (properties.module_id = 'mod-0-1' OR properties.lesson_id = 'mod-0-1')
GROUP BY w ORDER BY w;

-- W6 — Walkthrough after 8->3 steps. TARGET: completed/started >= 60% (was 30%).
SELECT toStartOfWeek(timestamp) AS w,
       uniqIf(distinct_id, event='walkthrough_started') AS started,
       uniqIf(distinct_id, event='walkthrough_completed') AS completed,
       uniqIf(distinct_id, event='walkthrough_skipped') AS skipped,
       uniqIf(distinct_id, event='onboarding_enter_first_module') AS entered_lesson
FROM events WHERE timestamp >= now() - INTERVAL 56 DAY GROUP BY w ORDER BY w;

-- W7 — Flashcards exits after "המשך reveals the whole card". TARGET: down 40%.
SELECT toStartOfWeek(timestamp) AS w,
       countIf(properties.phase='flashcards') AS flashcard_exits,
       uniqIf(distinct_id, properties.phase='flashcards') AS users,
       countIf(properties.phase='intro') AS intro_exits
FROM events WHERE event='lesson_exited_early' AND timestamp >= now() - INTERVAL 56 DAY GROUP BY w ORDER BY w;

-- W8 — Email deliverability. TARGET: opened/sent back above 20%, sent 60-90/day.
SELECT toDate(timestamp) AS d,
       countIf(event='retention_email_sent') AS sent,
       countIf(event='retention_email_opened') AS opened,
       countIf(event='retention_email_clicked') AS clicked,
       round(100.0 * countIf(event='retention_email_opened') / nullIf(countIf(event='retention_email_sent'), 0), 1) AS open_pct
FROM events WHERE event LIKE 'retention_email%' AND timestamp >= now() - INTERVAL 21 DAY GROUP BY d ORDER BY d;

-- W9 — iOS D1, still unexplained (was 2/42 vs android 18/103). TARGET: iOS D1 >= 10%.
SELECT platform, count() AS cohort, countIf(d1) AS d1, round(100.0 * countIf(d1) / count(), 1) AS d1_pct
FROM (SELECT p, platform, first_day, max(toDate(t) = first_day + 1) AS d1 FROM (
        SELECT e.person_id AS p, toString(e.properties.platform) AS platform, e.timestamp AS t, f.first_day AS first_day
        FROM events e JOIN (SELECT person_id, toDate(min(timestamp)) AS first_day FROM events WHERE event='Application Opened' GROUP BY person_id) f
          ON e.person_id = f.person_id
        WHERE e.event='Application Opened' AND f.first_day >= today() - 35 AND f.first_day <= today() - 2)
      GROUP BY p, platform, first_day)
GROUP BY platform ORDER BY cohort DESC;

-- W10 — mod-4-19 intro by platform after the audio-wait cap. TARGET: iOS chest/started >= 40%.
SELECT properties.platform AS p,
       uniqIf(distinct_id, event='lesson_started') AS started,
       uniqIf(distinct_id, event='intro_audio_delayed') AS audio_delayed,
       uniqIf(distinct_id, event='lesson_exited_early' AND properties.phase='intro') AS intro_exit,
       uniqIf(distinct_id, event='chest_opened') AS chest
FROM events WHERE timestamp >= toDateTime('2026-10-11 18:00:00')
  AND (properties.module_id='mod-4-19' OR properties.lesson_id='mod-4-19' OR properties.screen_name='/lesson/mod-4-19')
GROUP BY p;

-- W11 — Acquisition, the ceiling on everything else. New users per day.
SELECT first_day, count() AS new_users FROM (
  SELECT person_id, toDate(min(timestamp)) AS first_day FROM events WHERE event='Application Opened' GROUP BY person_id)
WHERE first_day >= today() - 28 GROUP BY first_day ORDER BY first_day;

-- W12 — Annual plan: is it live in the stores yet?
SELECT properties.package_type AS pkg, properties.has_trial AS has_trial, properties.price_string AS price,
       count() AS c, uniq(distinct_id) AS u
FROM events WHERE event='paywall_cta_state' AND properties.state='ready' AND timestamp >= now() - INTERVAL 14 DAY
GROUP BY pkg, has_trial, price ORDER BY c DESC;
