const http = require('node:http');
const { timingSafeEqual } = require('node:crypto');
const { mkdir, writeFile, rename } = require('node:fs/promises');
const path = require('node:path');

function createBridge({ token, directory, maxBytes = 50 * 1024 * 1024 }) {
  const destination = path.join(directory, 'latest-snapshot.json');
  let writing = false;
  return http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
    const actual = Buffer.from(req.headers.authorization || '');
    const expected = Buffer.from(`Bearer ${token}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      res.writeHead(401).end(); return;
    }
    if (req.method !== 'POST' || req.url !== '/snapshot') { res.writeHead(404).end(); return; }
    if (writing) { res.writeHead(409).end(); return; }
    writing = true;
    try {
      let bytes = 0;
      const chunks = [];
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > maxBytes) { res.writeHead(413).end(); return; }
        chunks.push(chunk);
      }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (data?.schemaVersion !== 1 || !Array.isArray(data.cards) ||
          typeof data.collectedAt !== 'string' || typeof data.knowledgeBase?._id !== 'string') {
        res.writeHead(400).end(); return;
      }
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const temporary = `${destination}.tmp`;
      await writeFile(temporary, JSON.stringify(data, null, 2), { mode: 0o600 });
      await rename(temporary, destination);
      console.log(`Snapshot saved: ${data.cards.length} cards at ${data.collectedAt}`);
      res.writeHead(204).end();
    } catch (error) {
      console.error('Snapshot rejected:', error.message);
      if (!res.headersSent) res.writeHead(400).end();
    } finally { writing = false; }
  });
}

module.exports = { createBridge };
