import http.server
import socketserver
import webbrowser
import os

PORT = 8000
DIRECTORY = os.path.dirname(__file__)

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Disable browser caching so updates reflect instantly on refresh
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

def start_server():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
        url = f"http://localhost:{PORT}/app/index.html"
        print("==================================================")
        print("   AeroCampus-AI 3D Production Web Server (No Cache)")
        print("==================================================")
        print(f"-> Serving web application at: {url}")
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped cleanly.")

if __name__ == "__main__":
    start_server()
