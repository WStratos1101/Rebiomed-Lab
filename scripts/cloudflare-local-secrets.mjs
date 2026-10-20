import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
try {
    fs.writeFileSync('.dev.vars', `SESSION_SECRET=${randomBytes(48).toString('hex')}\nREBIOMED_PASSWORD_VAULT_KEY=${randomBytes(32).toString('base64')}\n`, { mode: 0o600, flag: 'wx' });
    console.log('Created local .dev.vars. Values are private and were not printed.');
}
catch (error) {
    if (error.code !== 'EEXIST')
        throw error;
    console.log('Existing .dev.vars preserved.');
}
