// Test-only loopback TLS for production next start. Do not weaken Secure cookies
// just to accommodate HTTP localhost in a browser compatibility test.
import { createServer } from 'node:https';
import { request } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

if (process.env.SW_ROLE_TEST_TLS !== '1' || process.env.DATABASE_URL || process.env.VERCEL) {
  throw new Error('Only the disposable local role test may start this TLS server.');
}
if (!/^\.data\/e2e(?:\/|-)/.test(process.env.PGLITE_DIR ?? '')) throw new Error('An isolated e2e database is required.');
const front = 3443;
const back = 3100;
const host = `127.0.0.1:${front}`;
const temp = mkdtempSync(join(tmpdir(), 'sawwiq-role-tls-'));
const keyPath = join(temp, 'key.pem');
const certPath = join(temp, 'cert.pem');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost', '-keyout', keyPath, '-out', certPath], { stdio: 'ignore' });
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(back)], { stdio: 'inherit', env: process.env });
const server = createServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, (incoming, outgoing) => {
  if (incoming.headers.host !== host) { outgoing.writeHead(421); outgoing.end(); return; }
  const upstream = request({ hostname: '127.0.0.1', port: back, path: incoming.url, method: incoming.method,
    headers: { ...incoming.headers, host, 'x-forwarded-host': host, 'x-forwarded-proto': 'https', 'x-forwarded-for': '127.0.0.1' } }, (response) => {
    outgoing.writeHead(response.statusCode ?? 502, response.headers);
    response.pipe(outgoing);
  });
  upstream.on('error', () => { if (!outgoing.headersSent) outgoing.writeHead(503); outgoing.end(); });
  incoming.on('aborted', () => upstream.destroy());
  incoming.pipe(upstream);
});
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  child.kill('SIGTERM');
  server.close();
  rmSync(temp, { force: true, recursive: true });
  setTimeout(() => process.exit(code), 200).unref();
}
child.on('error', () => stop(1));
child.on('exit', (code) => { if (!stopping) stop(code ?? 1); });
server.on('error', () => stop(1));
process.on('SIGTERM', () => stop());
process.on('SIGINT', () => stop());
process.on('exit', () => rmSync(temp, { force: true, recursive: true }));
server.listen(front, '127.0.0.1', () => console.log('Disposable role-test HTTPS server listening on loopback.'));
