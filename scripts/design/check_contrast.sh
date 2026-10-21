#!/bin/sh
# Run replica-design's contrast.py once per theme (it reads a single "color" set).
set -eu
T=replica/design/tokens.json
TMP=$(mktemp -d)
python3 -c "import json,sys;t=json.load(open('$T'));t['color']=t['color-dark'];json.dump(t,open('$TMP/dark.json','w'))"
echo "== light"; python3 "$HOME/.claude/skills/replica-design/contrast.py" "$T"; L=$?
echo "== dark";  python3 "$HOME/.claude/skills/replica-design/contrast.py" "$TMP/dark.json"; D=$?
rm -r "$TMP"
exit $((L + D))
