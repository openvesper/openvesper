#!/bin/bash
# Initial setup script

set -e

echo "🌒 OpenVesper Setup"
echo "===================="

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node 18+ required. Found: $(node -v)"
    exit 1
fi
echo "✓ Node $(node -v)"

# Install pnpm if missing
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
fi
echo "✓ pnpm $(pnpm -v)"

# Install
echo "Installing dependencies..."
pnpm install

# Build
echo "Building packages..."
pnpm build

# Setup .env
if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "📝 Created .env from .env.example"
    echo "   Edit .env and add at least one LLM API key:"
    echo "   - GROQ_API_KEY (free, fast)"
    echo "   - GEMINI_API_KEY (free, 15 RPM)"
    echo "   - ANTHROPIC_API_KEY (paid, best)"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Run: pnpm dev  (for CLI)"
echo "Run: cd apps/website && npm run dev  (for web dashboard)"
