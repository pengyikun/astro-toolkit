#!/usr/bin/env bash
#
# setup.sh — One-command project setup for astro-toolkit
#
# Usage:
#   ./scripts/setup.sh          # interactive setup
#   ./scripts/setup.sh --ci     # non-interactive (CI/CD mode, skips prompts)
#
set -euo pipefail

# ── Constants ───────────────────────────────────────────────────────────────

REQUIRED_NODE_MAJOR=18
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"
DB_DIR="db"
STORAGE_DIR="storage"
UPLOAD_DIR="storage/uploads"
CERTS_DIR="storage/uploads/certs"

# ── Helpers ─────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { printf "${BLUE}▸${RESET} %s\n" "$*"; }
success() { printf "${GREEN}✓${RESET} %s\n" "$*"; }
warn()    { printf "${YELLOW}⚠${RESET} %s\n" "$*"; }
error()   { printf "${RED}✗${RESET} %s\n" "$*" >&2; }
header()  { printf "\n${BOLD}%s${RESET}\n" "$*"; }

CI_MODE=false
if [[ "${1:-}" == "--ci" ]]; then
  CI_MODE=true
fi

# ── Preflight checks ───────────────────────────────────────────────────────

header "1/5  Preflight checks"

# Ensure we're in the project root
if [[ ! -f "package.json" ]]; then
  error "Run this script from the project root directory."
  exit 1
fi

# Check Node.js
if ! command -v node &>/dev/null; then
  error "Node.js is not installed. Install Node.js >= ${REQUIRED_NODE_MAJOR} and try again."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if (( NODE_VERSION < REQUIRED_NODE_MAJOR )); then
  error "Node.js >= ${REQUIRED_NODE_MAJOR} required (found v$(node -v | sed 's/v//'))"
  exit 1
fi
success "Node.js $(node -v)"

# Check npm
if ! command -v npm &>/dev/null; then
  error "npm is not installed."
  exit 1
fi
success "npm $(npm -v)"

# ── Install dependencies ───────────────────────────────────────────────────

header "2/5  Dependencies"

if [[ -d "node_modules" ]]; then
  info "node_modules exists — running npm install to sync…"
else
  info "Installing dependencies…"
fi

npm install --no-audit --no-fund
success "Dependencies installed"

# ── Environment file ───────────────────────────────────────────────────────

header "3/5  Environment"

if [[ -f "$ENV_FILE" ]]; then
  success ".env already exists — skipping"
else
  if [[ ! -f "$ENV_EXAMPLE" ]]; then
    error ".env.example not found. Cannot generate .env."
    exit 1
  fi

  cp "$ENV_EXAMPLE" "$ENV_FILE"

  # Auto-generate VAULT_ENCRYPTION_KEY
  VAULT_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "s/^VAULT_ENCRYPTION_KEY=$/VAULT_ENCRYPTION_KEY=${VAULT_KEY}/" "$ENV_FILE"
  else
    sed -i "s/^VAULT_ENCRYPTION_KEY=$/VAULT_ENCRYPTION_KEY=${VAULT_KEY}/" "$ENV_FILE"
  fi

  # Auto-generate AUTH_SECRET
  AUTH_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "s/^AUTH_SECRET=$/AUTH_SECRET=${AUTH_KEY}/" "$ENV_FILE"
  else
    sed -i "s/^AUTH_SECRET=$/AUTH_SECRET=${AUTH_KEY}/" "$ENV_FILE"
  fi

  success ".env created with auto-generated secrets"
  warn "Review .env and adjust values if needed"
fi

# ── Directory structure ─────────────────────────────────────────────────────

header "4/5  Directory structure"

mkdir -p "$DB_DIR" "$STORAGE_DIR" "$UPLOAD_DIR" "$CERTS_DIR"

# Ensure .gitkeep exists for tracked empty dirs
[[ -f "${CERTS_DIR}/.gitkeep" ]] || touch "${CERTS_DIR}/.gitkeep"

success "Storage directories ready"

# ── Database ────────────────────────────────────────────────────────────────

header "5/5  Database"

info "Running migrations…"
npm run migrate
success "Database migrated"

# Run seeds only if seeds directory has files
SEEDS_DIR="db/seeds"
if [[ -d "$SEEDS_DIR" ]] && ls "$SEEDS_DIR"/*.ts "$SEEDS_DIR"/*.js 2>/dev/null | head -1 &>/dev/null; then
  if [[ "$CI_MODE" == true ]]; then
    info "Skipping seeds in CI mode"
  else
    printf "\n${YELLOW}?${RESET} Run database seeds (inserts sample data)? [y/N] "
    read -r SEED_ANSWER
    if [[ "$SEED_ANSWER" =~ ^[Yy]$ ]]; then
      npm run seed
      success "Seeds applied"
    else
      info "Skipped seeds"
    fi
  fi
fi

# ── Done ────────────────────────────────────────────────────────────────────

printf "\n${GREEN}${BOLD}Setup complete!${RESET}\n\n"
printf "  Start dev server:   ${BOLD}npm run dev${RESET}\n"
printf "  Run tests:          ${BOLD}npm test${RESET}\n"
printf "  Type-check:         ${BOLD}npm run typecheck${RESET}\n\n"
