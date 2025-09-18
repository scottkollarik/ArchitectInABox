#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/export-openapi.sh [url]
# Default URL: http://localhost:5001/swagger/v1/swagger.json

URL=${1:-http://localhost:5001/swagger/v1/swagger.json}
OUT=backend/openapi/swagger.v1.json

echo "Fetching OpenAPI from $URL"
curl -fsSL "$URL" -o "$OUT"
echo "Wrote $OUT"

