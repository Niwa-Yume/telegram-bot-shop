import http.server
import socketserver
import json
import os

PORT = 8000


class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        # On définit l'URL qui déclenche la sauvegarde
        if self.path == '/api/save':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                # On vérifie que c'est bien du JSON valide
                data = json.loads(post_data)

                # On écrit les données dans le fichier catalog.json
                with open('catalog.json', 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)

                # On répond au navigateur que tout est OK
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "message": "Sauvegardé !"}).encode('utf-8'))
                print("✅ Catalogue mis à jour avec succès via l'interface Admin.")

            except Exception as e:
                # En cas d'erreur
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
                print(f"❌ Erreur lors de la sauvegarde : {e}")
        else:
            # Si l'URL n'est pas reconnue
            self.send_response(404)
            self.end_headers()


print(f"🌍 Serveur lancé ! Ouvrez votre navigateur sur : http://localhost:{PORT}")
print("Pour arrêter le serveur, faites Ctrl+C dans ce terminal.")

# Lancement du serveur (autorise le re-lancement rapide avec allow_reuse_address)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    httpd.serve_forever()
