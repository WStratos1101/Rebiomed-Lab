import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist/public');
let files = 0;
function visit(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, item.name);
        if (item.isDirectory())
            visit(file);
        else
            files++;
    }
}
visit(root);
if (!fs.existsSync(path.join(root, 'index.html')))
    throw new Error('Missing frontend build');
console.log(`Public build verified: ${files} files.`);
