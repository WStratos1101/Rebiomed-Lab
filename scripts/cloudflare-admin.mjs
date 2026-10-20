import { randomBytes, scryptSync, createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const target = process.argv[2];
if (!['--local', '--remote'].includes(target))
    throw new Error('Specify --local or --remote');
const password = process.env.BOOTSTRAP_PASSWORD;
const username = process.env.BOOTSTRAP_USERNAME || 'admin';
const email = process.env.BOOTSTRAP_EMAIL || null;
if (!password || password.length < 12)
    throw new Error('Set BOOTSTRAP_PASSWORD securely (12+ characters). Never pass it as a command argument.');
if (!/^[A-Za-z0-9_.-]{3,80}$/.test(username))
    throw new Error('Invalid username');
const salt = randomBytes(16).toString('hex');
const hash = `scrypt$16384$8$1$${salt}$${scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex')}`;
const openId = createHash('sha256').update(`${username}:${email || username}`).digest('hex');
const quote = v => v === null ? 'NULL' : "'" + String(v).replaceAll("'", "''") + "'";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebiomed-admin-'));
const file = path.join(dir, 'admin.sql');
fs.writeFileSync(file, `INSERT INTO users(openId,username,email,name,loginMethod,role,approvalStatus,passwordHash) VALUES (${[openId, username, email, username, 'email', 'admin', 'approved', hash].map(quote).join(',')});`, { mode: 0o600 });
try {
    const childEnv = { ...process.env };
    delete childEnv.BOOTSTRAP_PASSWORD;
    const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', target, '--file', file], { encoding: 'utf8', env: childEnv });
    if (result.status !== 0)
        throw new Error('Admin creation failed. Check database binding, migrations, authentication and whether the username/email already exists.');
    console.log('Admin account created. No password vault entry is created for this bootstrap account.');
}
finally {
    fs.rmSync(dir, { recursive: true, force: true });
}
