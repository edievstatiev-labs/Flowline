import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../out/', import.meta.url)));
const port = Number(process.env.PORT || 3000);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.csv':'text/csv; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.woff2':'font/woff2', '.ttf':'font/ttf', '.txt':'text/plain; charset=utf-8', '.pdf':'application/pdf' };
try { await stat(resolve(root,'index.html')); } catch { console.error('Static build missing. Run npm run build first.'); process.exit(1); }
const server = createServer(async (req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let target = resolve(root,'.'+pathname);
    if (target !== root && !target.startsWith(root+sep)) { res.writeHead(403); res.end('Forbidden'); return; }
    if ((await stat(target)).isDirectory()) target = resolve(target,'index.html');
    const data = await readFile(target);
    res.writeHead(200,{'Content-Type':types[extname(target)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404,{'Content-Type':'text/plain'}); res.end('Not found'); }
});
server.listen(port,'127.0.0.1',() => console.log(`Workflow Frequency Review: http://localhost:${port}`));
