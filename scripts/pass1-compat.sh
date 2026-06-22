#!/usr/bin/env bash
# Pass 1 — AI-Agent Compatibility Checklist
# Each test literally executes the command and verifies exit code + output format.

set -euo pipefail
NEXUS="./bin/nexus"
PASS=0
FAIL=0

check() {
  local name="$1" expected_exit="$2" 
  shift 2
  local output
  local actual_exit=0
  output=$("$@" 2>&1) || actual_exit=$?
  
  if [ "$actual_exit" -eq "$expected_exit" ]; then
    echo "  ✅ $name (exit=$actual_exit)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $name — expected exit $expected_exit, got $actual_exit"
    echo "     output: ${output:0:200}"
    FAIL=$((FAIL + 1))
  fi
  echo "$output"
}

echo "🧪 Pass 1: AI-Agent Compatibility"
echo ""

# ─── Test 1: --version ────────────────────────────────
echo "── Test 1: nexus --version ──"
OUTPUT=$($NEXUS --version 2>&1)
EXIT=$?
if [ $EXIT -eq 0 ] && echo "$OUTPUT" | grep -qP '^nexus v\d+\.\d+\.\d+$'; then
  echo "  ✅ exit=0, prints semver, no TUI"
  PASS=$((PASS + 1))
else
  echo "  ❌ failed — exit=$EXIT output=${OUTPUT:0:100}"
  FAIL=$((FAIL + 1))
fi

# ─── Test 2: --help ───────────────────────────────────
echo "── Test 2: nexus --help ──"
OUTPUT=$($NEXUS --help 2>&1)
EXIT=$?
if [ $EXIT -eq 0 ] && echo "$OUTPUT" | grep -q "USAGE"; then
  echo "  ✅ exit=0, prints usage, no TUI"
  PASS=$((PASS + 1))
else
  echo "  ❌ failed — exit=$EXIT output=${OUTPUT:0:100}"
  FAIL=$((FAIL + 1))
fi

# ─── Test 3: --pipe --print (no TTY) ──────────────────
echo "── Test 3: echo | nexus --pipe --print ──"
OUTPUT=$(echo "what is 2+2" | $NEXUS --pipe --print 2>&1)
EXIT=$?
if [ $EXIT -eq 0 ] && echo "$OUTPUT" | grep -q '"type"'; then
  echo "  ✅ exit=0, emits JSON, no TUI"
  PASS=$((PASS + 1))
else
  echo "  ❌ failed — exit=$EXIT output=${OUTPUT:0:100}"
  FAIL=$((FAIL + 1))
fi

# ─── Test 4: --oneshot --prompt --json ─────────────────
echo "── Test 4: nexus --oneshot --prompt --json ──"
OUTPUT=$($NEXUS --oneshot --prompt "say hello" --json 2>&1)
EXIT=$?
if [ $EXIT -eq 0 ]; then
  # Validate each line is valid JSON
  VALID=true
  while IFS= read -r line; do
    echo "$line" | python3 -m json.tool > /dev/null 2>&1 || VALID=false
  done <<< "$OUTPUT"
  if $VALID; then
    echo "  ✅ exit=0, valid NDJSON"
    PASS=$((PASS + 1))
  else
    echo "  ❌ invalid JSON in output"
    FAIL=$((FAIL + 1))
  fi
else
  echo "  ❌ failed — exit=$EXIT"
  FAIL=$((FAIL + 1))
fi

# ─── Test 5: NEXUS_HEADLESS=1 ─────────────────────────
echo "── Test 5: NEXUS_HEADLESS=1 ──"
OUTPUT=$(NEXUS_HEADLESS=1 $NEXUS --prompt "test" --print 2>&1)
EXIT=$?
if [ $EXIT -eq 0 ] && echo "$OUTPUT" | grep -q '"type"'; then
  echo "  ✅ exit=0, headless mode, no TUI"
  PASS=$((PASS + 1))
else
  echo "  ❌ failed — exit=$EXIT output=${OUTPUT:0:100}"
  FAIL=$((FAIL + 1))
fi

# ─── Test 6: --no-color, zero ANSI ────────────────────
echo "── Test 6: nexus --no-color --json (zero ANSI) ──"
OUTPUT=$($NEXUS --oneshot --prompt "test" --no-color --json 2>&1)
EXIT=$?
ANSI_COUNT=$(echo "$OUTPUT" | grep -cP '\x1b\[' || true)
if [ $EXIT -eq 0 ] && [ "$ANSI_COUNT" -eq 0 ]; then
  echo "  ✅ exit=0, zero ANSI codes in stdout"
  PASS=$((PASS + 1))
else
  echo "  ❌ failed — exit=$EXIT, ANSI count=$ANSI_COUNT"
  FAIL=$((FAIL + 1))
fi

# ─── Summary ──────────────────────────────────────────
echo ""
echo "─── Results ───"
echo "$PASS passed, $FAIL failed, $((PASS + FAIL)) total"
echo ""
[ $FAIL -eq 0 ] && echo "🎉 Pass 1: ALL GREEN" || echo "💥 Pass 1: FAILURES DETECTED"
exit $FAIL