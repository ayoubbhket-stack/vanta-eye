import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html' };

export function serve(port, rootDir = process.cwd()) {
  const root = path.resolve(rootDir);
  return new Promise((r) => {
    const s = http.createServer((req, res) => {
      const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    }).listen(port, () => r(s));
  });
}
