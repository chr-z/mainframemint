#!/bin/bash
# MainframeMint E2E runner — boots headless Chrome, runs CDP E2E against production.
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
[ -f "$CHROME" ] || CHROME="/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
PORT=$((4200+RANDOM%500))
"$CHROME" --headless=new --remote-debugging-port=$PORT --user-data-dir="C:/Yui/AppData/Local/Temp/mm-e2e-$PORT" --no-first-run about:blank >/dev/null 2>&1 &
CPID=$!
sleep 3
cd "C:/Yui/data/saas_factory/work_mainframemint" && node scripts/mm_e2e.mjs "$PORT"
RC=$?
kill "$CPID" 2>/dev/null
echo "e2e_exit=$RC port=$PORT"
exit $RC
