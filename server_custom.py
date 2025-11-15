#!/usr/bin/env python3
"""
Simple HTTP server with proper routing for the CBD Shop mini-app.
Handles routes like /admin -> admin.html
"""

import http.server
import socketserver
import os
import json
from urllib.parse import urlparse, unquote

PORT = 8080
CATALOG_FILE = 'catalog.json'

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
            try:
                # Read the content length
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)

                # Parse JSON
                catalog_data = json.loads(post_data.decode('utf-8'))

                # Validate the data structure
                if 'products' not in catalog_data or not isinstance(catalog_data['products'], list):
                    self.send_error(400, "Invalid catalog format: 'products' array required")
                    return

                # Save to file
                with open(CATALOG_FILE, 'w', encoding='utf-8') as f:
                    json.dump(catalog_data, f, indent=2, ensure_ascii=False)

                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = json.dumps({'success': True, 'message': 'Catalog saved successfully'})
                self.wfile.write(response.encode('utf-8'))

                print(f"✅ Catalog saved: {len(catalog_data['products'])} products")

            except json.JSONDecodeError as e:
                self.send_error(400, f"Invalid JSON: {str(e)}")
            except Exception as e:
                self.send_error(500, f"Server error: {str(e)}")
        else:
            self.send_error(404, "API endpoint not found")

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

