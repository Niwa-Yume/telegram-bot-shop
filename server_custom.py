#!/usr/bin/env python3
"""
Simple HTTP server with proper routing for the CBD Shop mini-app.
Handles routes like /admin -> admin.html
Ajout: /client -> client-settings.html et endpoint POST /api/config
"""

import http.server
import socketserver
import os
import json
from urllib.parse import urlparse, unquote, parse_qs

PORT = 8080
CATALOG_FILE = 'catalog.json'
CONFIG_ROOT_FILE = 'config.json'
CLIENTS_DIR = 'clients'

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler with route rewrites and API endpoints."""

    def do_GET(self):
        # Parse the URL
        parsed_path = urlparse(self.path)
        path = unquote(parsed_path.path)

        # Route mappings
        route_map = {
            '/': '/index.html',
            '/admin': '/admin.html',
            '/client': '/client-settings.html',  # nouvelle page de paramétrage client
        }

        # Check if path needs rewriting
        if path in route_map:
            # Rewrite the path
            self.path = route_map[path]
            if parsed_path.query:
                self.path += '?' + parsed_path.query

        # Serve the file
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        """Handle POST requests for saving catalog."""
        parsed_path = urlparse(self.path)
        path = unquote(parsed_path.path)

        if path == '/api/catalog':
            self._handle_catalog_post()
            return
        if path == '/api/config':
            self._handle_config_post(parsed_path)
            return
        self.send_error(404, "API endpoint not found")

    # --- Catalog handler inchangé ---
    def _handle_catalog_post(self):
        try:
            # Read the content length
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length)

            # Parse JSON
            data = json.loads(raw.decode('utf-8'))

            # Validate the data structure
            if 'products' not in data or not isinstance(data['products'], list):
                self.send_error(400, "Invalid catalog format: 'products' array required")
                return

            # Save to file
            with open(CATALOG_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            # Send success response
            self._send_json({"success": True, "message": "Catalog saved", "count": len(data['products'])})
            print(f"✅ Catalog saved: {len(data['products'])} products")
        except json.JSONDecodeError as e:
            self.send_error(400, f"Invalid JSON: {e}")
        except Exception as e:
            self.send_error(500, f"Server error: {e}")

    # --- New config handler ---
    def _handle_config_post(self, parsed_path):
        try:
            # Read the content length
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length)

            # Parse JSON
            cfg = json.loads(raw.decode('utf-8'))

            # Validation minimale
            if not isinstance(cfg, dict):
                self.send_error(400, 'Config must be an object')
                return

            # Extract slug if provided (?client=slug)
            params = parse_qs(parsed_path.query or '')
            slug = (params.get('client', [''])[0] or '').strip().lower()
            target_path = CONFIG_ROOT_FILE
            if slug:
                # Créer dossier clients/<slug>/ si multi-client demandé
                os.makedirs(os.path.join(CLIENTS_DIR, slug), exist_ok=True)
                target_path = os.path.join(CLIENTS_DIR, slug, 'config.json')

            # Save to file
            with open(target_path, 'w', encoding='utf-8') as f:
                json.dump(cfg, f, indent=2, ensure_ascii=False)

            # Send success response
            self._send_json({"success": True, "message": "Config saved", "path": target_path})
            print(f"📝 Config saved at {target_path}")
        except json.JSONDecodeError as e:
            self.send_error(400, f"Invalid JSON: {e}")
        except Exception as e:
            self.send_error(500, f"Server error: {e}")

    def _send_json(self, obj, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(obj).encode('utf-8'))

    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS preflight."""
        self.send_response(200)
        self.end_headers()

    def end_headers(self):
        # Add CORS headers for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # Cache control
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        http.server.SimpleHTTPRequestHandler.end_headers(self)

def run_server():
    """Start the HTTP server."""
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    # Permettre la réutilisation du port
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"🌿 CBD Shop Server")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"🚀 Server running on http://localhost:{PORT}")
        print(f"")
        print(f"📱 Shop:  http://localhost:{PORT}/")
        print(f"⚙️  Admin: http://localhost:{PORT}/admin")
        print(f"")
        print(f"Press Ctrl+C to stop the server")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Server stopped")

if __name__ == "__main__":
    run_server()
