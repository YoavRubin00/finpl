# FinPlay runbook — one command per job

Last updated 2026-10-14. Every command assumes PowerShell from the project root
(`C:\Users\yrubi\OneDrive\Desktop\.claude\projects\finpl-current`) unless a
`Set-Location` is shown.

---

## 1. OTA to production

**Local `eas update` does not work on this machine.** Windows Smart App Control
(enforce mode) blocks `node_modules/hermes-compiler/hermesc/win64-bin/hermesc.exe`,
so the Hermes step dies with `spawn UNKNOWN`. The bundle is built on EAS servers
instead. One paste, start to finish:

```powershell
cd "C:\Users\yrubi\OneDrive\Desktop\.claude\projects\finpl-current"
git checkout master; git pull
$A="$env:TEMP\finpl-ota-src"; if (Test-Path $A) { Remove-Item -Recurse -Force $A }
New-Item -ItemType Directory $A | Out-Null
git archive --format=zip -o "$env:TEMP\finpl-ota.zip" master
Expand-Archive "$env:TEMP\finpl-ota.zip" -DestinationPath $A -Force
cd $A; git init -q; git add -A; git -c user.email="yrubin00@gmail.com" -c user.name="YoavRubin00" commit -q -m "OTA snapshot"
$env:NODE_OPTIONS="--dns-result-order=ipv4first"
eas workflow:run .eas/workflows/ota-production.yml --non-interactive --wait -F message="<what changed>"
```

Why the snapshot: `eas workflow:run` uploads the whole local folder, and a
parallel session keeps uncommitted work in `src/features/*/simulations/**`. The
archive ships exactly what is on `master`, nothing else. It also needs a git
repo in that folder, hence `git init`.

Verify afterwards:

```powershell
eas update:list --branch production --limit 2
```

Two groups, one `android` and one `ios`, with today's message. Users get it on
the next cold start. Same runtime version = no store build needed.

**If it fails with "Unable to resolve module":** a required file is missing from
the archive. Check `.gitattributes` for an `export-ignore` line that is too
broad (this bit us twice: unanchored `db/` swallowed `src/db`, and
`assets/infographics/` is required at bundle time), and check `.gitignore` for a
required asset (the two Daisy webps were ignored). Then:

```powershell
cd $env:TEMP\finpl-ota-src
python -c "import re,pathlib;root=pathlib.Path('.');pat=re.compile(r'''require\(\s*['\"]([^'\"]+\.(?:png|jpg|jpeg|webp|gif|json|mp3|mp4|wav|ttf|otf))['\"]\s*\)''');miss=set()
for d in ('src','app'):
    for f in root.joinpath(d).rglob('*'):
        if f.suffix in ('.ts','.tsx'):
            for m in pat.finditer(f.read_text(encoding='utf-8',errors='ignore')):
                r=m.group(1)
                if r.startswith('.') and not (f.parent/r).resolve().exists(): miss.add(r)
print(len(miss));[print(' ',x) for x in sorted(miss)]"
```

## 2. Store build (only for native changes)

OTA covers JS, assets and copy. A build is needed for native modules, SDK
upgrades, permissions, icons and version bumps.

```powershell
$env:NODE_OPTIONS="--dns-result-order=ipv4first"
eas build --platform all --profile production
```

Then iOS submission, after the build finishes (the `--auto-submit` flag races on
iOS and fails with "Could not find build"):

```powershell
eas submit --platform ios --latest
```

Apple's release steps (export compliance, version, build selection, what's new,
submit for review) stay manual in App Store Connect.

## 3. Resend — why email opens collapsed on 3.10

Opens went from ~35% to ~2% on one day across every variant while volume rose
to 270/day. Send volume is now capped in code (active within 45 days, drip stops
after 6 unanswered sends, RFC 8058 one-click unsubscribe). What remains is
reputation, and that needs the provider's own data:

```powershell
$key = ((Get-Content .env.local | Select-String "^\s*RESEND_API_KEY\s*=") -split "=",2)[1].Trim().Trim('"')
curl.exe -s -H "Authorization: Bearer $key" "https://api.resend.com/emails?limit=100" | python -c "import sys,json,collections;d=json.load(sys.stdin);print(collections.Counter(e.get('last_event') for e in d.get('data',[])))"
```

A high `bounced` or `complained` count confirms it. Then: Resend dashboard →
Domains → check DKIM/SPF/DMARC are all green, and Google Postmaster Tools
(`postmaster.google.com`) → Domain reputation for `finplay.me`. If reputation is
Low or Bad, keep volume low for two to three weeks; it recovers on engagement,
not on sending more.

## 4. RevenueCat — the App Store Connect API key

RevenueCat cannot read Apple's catalog for this app
(`app_store_connect_api_key_configured=false`), which is why the annual product
could not be created from the API and why prices do not sync.

No command. App Store Connect → Users and Access → Integrations → App Store
Connect API → generate a key with the **App Manager** role, download the `.p8`
once, then RevenueCat → Project FinPlay → Apps → FinPlay (App Store) → paste the
issuer ID, key ID and `.p8`, plus the vendor number from Payments and Financial
Reports.

## 5. The annual plan

Code is ready: the monthly/annual picker appears by itself once the offering
carries both packages, so no OTA is needed when the products go live.
RevenueCat already holds `finplay_pro_yearly` (App Store), `finplay_pro_yearly:yearly`
(Play) and package `$rc_annual`. What is missing is the products in the two
stores. The full brief is in `docs/ops/ANNUAL-PLAN-STORE-SETUP.md`.

Check whether a store has caught up:

```powershell
"Read-only: list offering ofrng0753c167b9 of RevenueCat project projbe6d1148 with its packages and each package's products per platform, and get-product-store-state for prode9cfcbc52a (App Store) and prod06346e584f (Play). Print facts only." | claude -p --output-format text --allowedTools "mcp__plugin_revenuecat_RevenueCat__*,ToolSearch" --max-turns 15
```

## 6. Weekly measurement

PostHog project `176605`. The MCP connector is authorized but a session that
started before the authorization cannot see it, so queries run in a fresh
process:

```powershell
Get-Content docs\ops\weekly-metrics.sql -Raw | claude -p --output-format text --allowedTools "mcp__claude_ai_PostHog__exec" --max-turns 30
```

`docs/ops/weekly-metrics.sql` holds the queries that matter right now: the trial
funnel by source, `energy_depleted` after the 20→10 change, the lessons-per-user
and session-length guardrail, mod-0-1 completion, the walkthrough, email opens,
and iOS D1.

If the connector ever shows "Needs authentication":

```powershell
claude mcp list | Select-String "posthog|revenuecat|neon"
```

Then `claude`, `/mcp`, pick the server, Authenticate.

## 7. Housekeeping: the git worktree warning

Every git command prints `failed to delete '.git/worktrees/finpl-yam-fixes': Permission denied`
and `git pull` asks a y/n question. Harmless, and fixable once:

```powershell
Remove-Item -Recurse -Force .git\worktrees\finpl-yam-fixes; git worktree prune
```
