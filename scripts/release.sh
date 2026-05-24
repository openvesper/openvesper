#!/bin/bash
# Release script - bumps version, creates git tag, pushes

set -e

VERSION=$1
if [ -z "$VERSION" ]; then
    echo "Usage: ./scripts/release.sh <version>"
    echo "Example: ./scripts/release.sh 2.9.0"
    exit 1
fi

echo "Releasing v$VERSION..."

# Update root package.json
node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('package.json')); pkg.version = '$VERSION'; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');"

# Update each workspace package
for pkg_json in packages/*/package.json packages/plugins/*/package.json apps/*/package.json; do
    node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('$pkg_json')); pkg.version = '$VERSION'; fs.writeFileSync('$pkg_json', JSON.stringify(pkg, null, 2) + '\n');"
done

git add .
git commit -m "chore: release v$VERSION"
git tag "v$VERSION"
git push origin main --tags

echo "✅ Released v$VERSION"
