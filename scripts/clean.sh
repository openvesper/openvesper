#!/bin/bash
# Clean all build artifacts
find . -name "node_modules" -type d -prune -exec rm -rf {} +
find . -name "dist" -type d -prune -exec rm -rf {} +
find . -name ".next" -type d -prune -exec rm -rf {} +
find . -name "*.tsbuildinfo" -delete
echo "✓ Cleaned"
