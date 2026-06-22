#!/usr/bin/env bash
# Auto-commit script for Nexus project
# Run this in the background to auto-commit changes every 3 files
# Usage: bash scripts/auto-commit.sh &

PROJECT_DIR="/home/oplaptop/SecondBrain/projects/nexus"
DEBOUNCE_SECONDS=30
LAST_COMMIT=0

cd "$PROJECT_DIR"

# Ensure we're on main branch
git checkout main 2>/dev/null

echo "🔍 Watching for changes in $PROJECT_DIR..."

while true; do
    # Check if there are any changes
    if ! git diff --quiet HEAD 2>/dev/null || [ -n "$(git status --porcelain)" ]; then
        NOW=$(date +%s)
        
        # Debounce: wait at least 30 seconds between commits
        if [ $((NOW - LAST_COMMIT)) -lt $DEBOUNCE_SECONDS ]; then
            sleep 5
            continue
        fi
        
        # Count changed files
        CHANGED=$(git status --porcelain | wc -l)
        
        if [ "$CHANGED" -ge 1 ]; then
            # Stage all changes
            git add -A
            
            # Generate commit message based on what changed
            TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
            FILES=$(git diff --cached --name-only | head -5 | tr '\n' ', ' | sed 's/,$//')
            
            if [ "$CHANGED" -eq 1 ]; then
                MSG="feat: update $FILES [$TIMESTAMP]"
            else
                MSG="feat: update $CHANGED files ($FILES) [$TIMESTAMP]"
            fi
            
            # Commit
            git commit -m "$MSG" --quiet
            
            # Push to GitHub
            git push origin main --quiet 2>/dev/null
            
            if [ $? -eq 0 ]; then
                echo "✅ Committed and pushed: $MSG"
            else
                echo "⚠️ Committed locally (push failed): $MSG"
            fi
            
            LAST_COMMIT=$NOW
        fi
    fi
    
    sleep 10
done