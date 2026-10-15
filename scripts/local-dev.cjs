const { randomBytes } = require('node:crypto');
const { homedir } = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createBridge } = require('./bridge.cjs');

const token = randomBytes(32).toString('hex');
const directory = path.join(homedir(), '.local/share/remnote-study-insights');
const server = createBridge({ token, directory });
let child;

server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(7789, '127.0.0.1', () => {
  console.log(`Local snapshot destination: ${path.join(directory, 'latest-snapshot.json')}`);
  child = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit', env: { ...process.env, REMNOTE_INSIGHTS_TOKEN: token },
  });
  child.on('exit', code => { server.close(); process.exitCode = code || 0; });
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  child?.kill(signal); server.close();
});
