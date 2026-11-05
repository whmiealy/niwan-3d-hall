"""本地保存服务：让浏览器里的网页把截图 / 导出的模型直接存到项目目录（仅本机 127.0.0.1）。
用法：python3 tools/save_server.py   然后网页里 fetch('http://127.0.0.1:8765/save?path=compare_raw/a.jpg', {method:'POST', body: blob})
只允许写入项目下的 exports/、compare/、compare_raw/ 目录。
"""
import os, http.server, urllib.parse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALLOWED = ('exports/', 'compare/', 'compare_raw/')
class H(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        rel = os.path.normpath(q.get('path', [''])[0])
        if not rel.startswith(ALLOWED) or '..' in rel:
            self.send_response(403); self._cors(); self.end_headers(); return
        data = self.rfile.read(int(self.headers['Content-Length']))
        dst = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'wb').write(data)
        self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(b'ok')
        print('saved', rel, len(data))
http.server.HTTPServer(('127.0.0.1', 8765), H).serve_forever()
