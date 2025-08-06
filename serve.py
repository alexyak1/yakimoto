# serve.py
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer

PORT = 80

Handler = SimpleHTTPRequestHandler
httpd = TCPServer(("", PORT), Handler)
print(f"Serving at http://0.0.0.0:{PORT}")
httpd.serve_forever()
