#!/bin/bash
# Double-click this file to start the Decomposition Tree V2 extension.
# Tableau connects to https://localhost:8000

set -e
cd "$(dirname "$0")"

CERT_DIR="$(pwd)/certs"
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"
TRUSTED_MARKER="$CERT_DIR/.keychain-trusted"

# ── Step 1: Generate certificate (once) ────────────────────────────────────
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  echo ""
  echo "  First-time setup: generating HTTPS certificate..."
  mkdir -p "$CERT_DIR"

  # Write an openssl config that includes Subject Alternative Names.
  # SAN is required by modern browsers/Qt WebEngine for localhost certs.
  cat > /tmp/decomp-tree-ssl.conf << 'SSLCONF'
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
x509_extensions    = v3_req

[dn]
CN = localhost

[v3_req]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment

[alt_names]
DNS.1 = localhost
IP.1  = 127.0.0.1
SSLCONF

  openssl req -x509 -newkey rsa:2048 \
    -keyout "$KEY_FILE" -out "$CERT_FILE" \
    -days 3650 -nodes \
    -config /tmp/decomp-tree-ssl.conf 2>/dev/null

  echo "  Certificate generated ✓"
fi

# ── Step 2: Trust certificate in macOS keychain (once) ─────────────────────
# Qt WebEngine (Tableau's embedded browser) uses the macOS system keychain.
# Accepting a cert in Chrome does NOT add it to the system keychain.
# This step does — so Tableau trusts the cert without any extra hoops.
if [ ! -f "$TRUSTED_MARKER" ]; then
  echo ""
  echo "  Trusting certificate in macOS keychain..."
  echo "  (You may be prompted for your login password — this is a one-time step.)"
  echo ""
  security add-trusted-cert -d -r trustRoot \
    -k "$HOME/Library/Keychains/login.keychain-db" \
    "$CERT_FILE"
  touch "$TRUSTED_MARKER"
  echo "  Certificate trusted ✓"
fi

# ── Step 3: Install dependencies (if needed) ───────────────────────────────
if [ ! -d "node_modules" ]; then
  echo ""
  echo "  Installing dependencies..."
  npm install
fi

# ── Step 4: Build and serve ────────────────────────────────────────────────
echo ""
echo "  Building extension..."
npm run build

echo ""
echo "  ============================================="
echo "  Decomposition Tree V2 running at:"
echo "  https://localhost:8000"
echo ""
echo "  In Tableau: right-click the extension → Reload"
echo "  Press Ctrl+C to stop"
echo "  ============================================="
echo ""

npm run preview
