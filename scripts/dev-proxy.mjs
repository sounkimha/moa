import http from 'node:http';
import net from 'node:net';

const port = Number(process.env.WEB_PORT || 8081);
const metroPort = Number(process.env.METRO_PORT || 8082);
const apiPort = Number(process.env.PORT || 4000);

function proxy(req, res, targetPort) {
  const upstream = http.request({
    host: '127.0.0.1',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
  }, (upstreamResponse) => {
    res.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(res);
  });
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: '개발 서버를 준비하고 있어요. 잠시 후 다시 시도해주세요.' }));
  });
  req.pipe(upstream);
}

function proxyUpgrade(req, socket, head) {
  const upstream = net.connect(metroPort, '127.0.0.1', () => {
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);
    for (const [name, value] of Object.entries(req.headers))
      upstream.write(`${name}: ${Array.isArray(value) ? value.join(', ') : value}\r\n`);
    upstream.write('\r\n');
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
}

const server = http.createServer((req, res) =>
  proxy(req, res, req.url?.startsWith('/api/') || req.url === '/health' ? apiPort : metroPort),
);
server.on('upgrade', proxyUpgrade);
server.listen(port, '0.0.0.0', () =>
  console.log(`MOA web proxy: http://localhost:${port} → Expo ${metroPort}, API ${apiPort}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
