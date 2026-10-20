"""Generate the D1 adaptation from shared application sources; never read .env."""
from pathlib import Path
import re
r=Path(__file__).resolve().parent.parent
o=r/'cloudflare/generated';o.mkdir(parents=True,exist_ok=True)
s=(r/'drizzle/schema.ts').read_text()
s=s.replace('import { decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";', 'import { index, integer, text, sqliteTable } from "drizzle-orm/sqlite-core";\nimport { sql } from "drizzle-orm";')
s=s.replace('mysqlTable(', 'sqliteTable(')
s=re.sub(r'int\("([^"]+)"\)\.autoincrement\(\)\.primaryKey\(\)',r'integer("\1").primaryKey({ autoIncrement: true })',s)
s=re.sub(r'\bint\(', 'integer(',s)
s=re.sub(r'varchar\("([^"]+)", \{ length: \d+ \}\)', r'text("\1")',s)
s=re.sub(r'decimal\("([^"]+)", \{ precision: \d+, scale: \d+ \}\)', r'text("\1")',s)
s=re.sub(r'mysqlEnum\("([^"]+)", (\[[^\]]+\])\)', r'text("\1", { enum: \2 })',s)
s=re.sub(r'json\("([^"]+)"\)',r'text("\1", { mode: "json" })',s)
s=re.sub(r'timestamp\("([^"]+)"\)',r'integer("\1", { mode: "timestamp_ms" })',s)
s=s.replace('.defaultNow()', '.default(sql`(unixepoch() * 1000)`)').replace('.onUpdateNow()', '.$onUpdate(() => new Date())')
(o/'schema.ts').write_text(''+s)
                                                                             
s=(r/'server/db.ts').read_text()
s=s.replace('import { drizzle } from "drizzle-orm/mysql2";', 'import { drizzle } from "drizzle-orm/d1";\nimport { runtime } from "../runtime";')
s=s.replace('"../drizzle/schema"','"./schema"').replace('"./_core/env"','"../env"').replace('"./_core/passwordVault"','"./passwordVault"').replace('"./_core/password"','"./password"')
a=s.index('let _db:');b=s.index('export function isSupporterAccount',a)
s=s[:a]+'''// D1 schema and default content are installed through explicit migrations.
async function ensurePendingEditColumns(_db: unknown) {}
async function ensureExperimentLogsTable(_db: unknown) {}
async function ensureFeedbackTable(_db: unknown) {}
async function ensureSupporterIdentity(_db: unknown) {}
'''+s[b:]
a=s.index('async function ensureSupporterIdentity', s.index('function normalizeSupporterUser'));b=s.index('export async function upsertUser',a)
s=s[:a]+'''export async function getDb() { return drizzle(runtime().DB); }
'''+s[b:]
a=s.index('export const seedProtocols');b=s.index('export async function getLabContent',a);s=s[:a]+'export async function ensureLabSeed() {}\n\n'+s[b:]
a=s.index('async function ensureChemicalSeed');b=s.index('function slugifyChemicalName',a);s=s[:a]+s[b:]
s=s.replace('  await ensureChemicalSeed();\n','').replace('  await ensureAdditionalChemicalSeeds();\n','')
s=s.replace('.onDuplicateKeyUpdate({ set: updateSet })','.onConflictDoUpdate({ target: users.openId, set: updateSet })')
s=s.replace('result[0].affectedRows','result.meta.changes')
                                                                                         
s=re.sub(r'await db.transaction\(async tx => \{\s*await tx.update\((calculators|protocols)\).set\(\{ (.*?) \}\).where\(eq\(\1.id, id\)\);\s*await tx.update\(\1\).set\(\{ pendingEdit: null, pendingEditBy: null, pendingEditAt: null \}\).where\(eq\(\1.id, id\)\);\s*\}\);',r'await db.update(\1).set({ \2, pendingEdit: null, pendingEditBy: null, pendingEditAt: null }).where(eq(\1.id, id));',s,flags=re.S)
assert '.transaction(' not in s
(o/'db.ts').write_text(''+s)
s=(r/'server/routers.ts').read_text().replace('"./_core/systemRouter"','"../systemRouter"').replace('"./_core/trpc"','"./trpc"').replace('"./_core/password"','"./password"').replace('"./_core/passwordVault"','"./passwordVault"').replace('"./_core/cookies"','"../cookies"').replace('"./_core/sdk"','"../sdk"')
s='import { runtime } from "../runtime";\n'+s.replace('process.env.REBIOMED_PASSWORD_VAULT_KEY','runtime().REBIOMED_PASSWORD_VAULT_KEY')
s=s.replace('error.code === "ER_DUP_ENTRY"','["ER_DUP_ENTRY", "SQLITE_CONSTRAINT_UNIQUE"].includes(String(error.code))')
(o/'routers.ts').write_text(''+s)
s=(r/'server/_core/trpc.ts').read_text().replace('"./context"','"../context"');(o/'trpc.ts').write_text(s)
s=(r/'server/_core/passwordVault.ts').read_text().replace('process.env[KEY_NAME]', 'runtime().REBIOMED_PASSWORD_VAULT_KEY');(o/'passwordVault.ts').write_text('import { runtime } from "../runtime";\n'+s)
s=(r/'server/_core/password.ts').read_text().replace('scryptSync, ', '').replace('import { randomBytes, timingSafeEqual }', 'import { randomBytes, timingSafeEqual }')
s='import { scrypt } from "@noble/hashes/scrypt";\n'+s
s=s.replace('scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P }).toString("hex")','Buffer.from(scrypt(password, salt, { N, r: R, p: P, dkLen: KEY_LENGTH })).toString("hex")')
s=s.replace('scryptSync(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p) })','Buffer.from(scrypt(password, salt, { N: Number(n), r: Number(r), p: Number(p), dkLen: expected.length }))')
(o/'password.ts').write_text(s)
                                                           
cols=[]; tables=[]; table=None
for line in (o/'schema.ts').read_text().splitlines():
 m=re.search(r'sqliteTable\("([^"]+)"',line)
 if m: table=m[1];cols=[];continue
 if table and line.startswith('  ') and ': ' in line:
  m=re.match(r'  (\w+): (integer|text)\("([^"]+)"',line)
  if not m:continue
  name,kind=m[3],m[2];c=f'"{name}" {"INTEGER" if kind=="integer" else "TEXT"}'
  if '.primaryKey(' in line:c+=' PRIMARY KEY AUTOINCREMENT'
  if '.notNull()' in line:c+=' NOT NULL'
  if '.unique()' in line:c+=' UNIQUE'
  if '.default(sql`' in line:c+=' DEFAULT (unixepoch() * 1000)'
  else:
   d=re.search(r'\.default\(("[^"]*"|\d+)\)',line)
   if d:c+=' DEFAULT '+("'"+d[1][1:-1]+"'" if d[1].startswith('"') else d[1])
  if 'enum:' in line:
   enums=re.search(r'enum: (\[[^\]]+\])',line)[1];import json
   c+=' CHECK ("'+name+'" IN ('+', '.join("'"+v+"'" for v in json.loads(enums))+'))'
  cols.append(c)
 elif table and line.startswith('}'):
  tables.append(f'CREATE TABLE "{table}" (\n  '+',\n  '.join(cols)+'\n);');table=None
sql='-- Generated SQLite schema. Apply with wrangler d1 migrations apply.\n'+ '\n\n'.join(tables)+'\nCREATE INDEX experimentLogs_owner_date_idx ON experimentLogs(ownerId, workDate, id);\nCREATE UNIQUE INDEX users_email_unique ON users(email COLLATE NOCASE);\nCREATE UNIQUE INDEX users_username_nocase ON users(username COLLATE NOCASE);\n'
(r/'cloudflare/migrations/0001_schema.sql').write_text(sql)
