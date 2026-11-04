// Presentation fixtures are isolated to browser interception; no database writes.
const { chromium } = require(process.env.REBIOMED_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const out = process.env.REBIOMED_QA_OUTPUT || '/private/tmp/rebiomed-approval-badges';
fs.mkdirSync(out, { recursive: true });
const baseURL = process.env.REBIOMED_QA_BASE_URL || 'http://127.0.0.1:4173/';
if (!['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname)) throw new Error('Local frontend only.');
const titles = ['PBS', 'Quy trình phân tách tế bào gan và nuôi cấy trong điều kiện đặc trưng', 'Quy trình phân tách tế bào gan, chuẩn bị dung dịch, kiểm tra các điều kiện nuôi cấy và ghi nhận kết quả thí nghiệm theo từng bước'];
const protocols = titles.map((title, i) => ({ id: i + 1, title, category: 'ProtocolCells', tag: 'QA', status: i === 1 ? 'Bản nháp' : 'Đã duyệt', version: '2.1', updatedAt: '2026-11-03', owner: 'Người phụ trách phòng thí nghiệm', summary: 'Kiểm tra tiêu đề dài với nhiều metadata.', duration: '45 phút', steps: [], notes: [] }));
const samples = titles.map((name, i) => ({ id: i + 1, name, code: `QA${i}`, groupName: 'Cells', status: ['Đã duyệt', 'Bản nháp', 'Chờ duyệt'][i], updatedAt: '2026-11-03', description: 'Mẫu kiểm thử trình bày', properties: [], theory: '' }));
const recipes = titles.map((name, i) => ({ id: ['pbs', 'qa-long', 'qa-no-status'][i], dbId: i + 1, name, group: 'QA', baseVolume: 100, baseUnit: 'mL', stock: 'Nồng độ và metadata dài để kiểm tra căn chỉnh', note: 'Chỉ dùng trong kiểm thử', ingredients: [{ name: 'PBS', quantity: 100, unit: 'mL', form: 'Lỏng' }], steps: ['Trộn đều'], ...(i < 2 ? { status: i === 0 ? 'Đã duyệt' : 'Bản nháp' } : {}) }));
(async () => {
 const browser = await chromium.launch({ headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], checks = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/trpc/**', route => {
   const names = decodeURIComponent(new URL(route.request().url()).pathname.split('/api/trpc/')[1]).split(',');
   const results = names.map(name => ({ result: { data: { json: name === 'auth.me' ? { id: 999, name: 'QA', username: 'qa', role: 'admin', approvalStatus: 'approved' } : name === 'content.all' ? { protocols, samples, calculators: [] } : name === 'chemicals.list' ? recipes : [] } } }));
   return route.fulfill({ contentType: 'application/json', body: JSON.stringify(results) });
  });
  const nav = async name => { if (await page.getByRole('button', { name: 'Mở menu', exact: true }).isVisible()) await page.getByRole('button', { name: 'Mở menu', exact: true }).click(); await page.locator('.main-nav').getByRole('button', { name, exact: true }).click(); await page.waitForTimeout(230); };
  const measure = async (selector, name) => {
   await page.evaluate(() => document.fonts.ready);
   const values = await page.locator(selector).evaluateAll(headers => headers.map(header => {
    const badge = header.querySelector(':scope > .approval-status');
    const title = header.querySelector('h1,h2');
    const h = header.getBoundingClientRect(), b = badge?.getBoundingClientRect(), t = title?.getBoundingClientRect();
    const css = badge && getComputedStyle(badge);
    return { status: badge?.textContent, top: b && b.top - h.top, right: b && h.right - b.right, overlap: !!(b && t && t.right > b.left && t.left < b.right && t.top < b.bottom && t.bottom > b.top), clipped: badge && (badge.scrollWidth > badge.clientWidth + 1 || badge.scrollHeight > badge.clientHeight + 1), font: css?.fontFamily, size: css?.fontSize, weight: css?.fontWeight, height: b?.height, titleHeight: t?.height, titleLine: title && parseFloat(getComputedStyle(title).lineHeight) };
   }));
   assert(values.length, `${name}: missing header`);
   for (const v of values.filter(x => x.status)) { assert(Math.abs(v.top) < 1, `${name} badge top ${v.top}`); assert(Math.abs(v.right) < 1, `${name} badge right ${v.right}`); assert(!v.overlap && !v.clipped, `${name}: overlap/clipping`); assert.equal(v.size, '12px'); assert(v.font.includes('Be Vietnam Pro')); assert.equal(v.weight, '600'); assert.equal(v.height, 26); }
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: page overflow`);
   checks.push({ name, values }); return values;
  };
  await page.goto(baseURL); await page.locator('.toolbox-row').first().waitFor();
  assert.equal(await page.locator('.toolbox-row .approval-status').count(), 0);
  for (const width of [1440, 768, 390, 320]) {
   await page.setViewportSize({ width, height: 1000 }); await page.waitForTimeout(180);
   for (const dark of [false, true]) {
    if (await page.locator('html').evaluate(x => x.classList.contains('dark')) !== dark) await page.getByRole('button', { name: dark ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng', exact: true }).click();
    const variant = `${width}-${dark ? 'dark' : 'light'}`;
    await nav('Quy trình'); await page.locator('.protocol-card-header').first().waitFor();
    const cardPositions = await measure('.protocol-card-header', `protocol-cards-${variant}`);
    assert.equal(new Set(cardPositions.map(x => x.top)).size, 1);
    if (width === 320) assert(cardPositions[2].titleHeight / cardPositions[2].titleLine >= 3, 'Long title did not exercise three lines');
    if (width === 390) await page.screenshot({ path: `${out}/protocol-cards-${variant}.png`, fullPage: true });
    await page.locator('.protocol-card').nth(1).click(); await measure('.detail-header.approval-header', `protocol-detail-${variant}`);
    assert.equal(await page.locator('.detail-header > .approval-status').innerText(), 'Bản nháp');
    await nav('Mẫu & lý thuyết'); await page.locator('.sample-card').first().waitFor();
    assert.equal(await page.locator('.sample-card .approval-status').count(), 0);
    await page.locator('.sample-card').nth(2).click(); await measure('.sample-detail-header', `sample-pending-${variant}`);
    assert.equal(await page.locator('.sample-detail-header > .approval-status').innerText(), 'Chờ duyệt');
    await nav('Pha hoá chất'); await page.locator('.chemical-heading').waitFor();
    for (const recipe of recipes) {
     if (width <= 900) await page.locator('.chemical-mobile-recipe select').selectOption(recipe.id);
     else await page.locator('.chemical-recipe-row').filter({ hasText: recipe.name }).first().locator('button').first().click();
     const result = await measure('.chemical-heading.approval-header', `chemical-${recipe.id}-${variant}`);
     assert.equal(result[0].status, recipe.status);
    }
    if (width === 390) await page.screenshot({ path: `${out}/chemical-no-status-${variant}.png`, fullPage: true });
    await page.keyboard.press('Meta+k'); await page.getByRole('searchbox', { name: 'Tìm công cụ hoặc quy trình' }).waitFor();
    await page.getByRole('button', { name: 'Mở Hoá chất stock', exact: true }).click(); await page.locator('.stock-table').waitFor();
    const cells = await page.locator('.stock-table tbody .approval-status-cell').evaluateAll(nodes => nodes.map(cell => { const badge = cell.querySelector('.approval-status'); const c = cell.getBoundingClientRect(), b = badge?.getBoundingClientRect(), css = getComputedStyle(cell); return { status: badge?.textContent, top: b && b.top - c.top - parseFloat(css.paddingTop), right: b && c.right - b.right - parseFloat(css.paddingRight) }; }));
    assert.equal(cells.filter(x => x.status).length, 2); assert.equal(cells[2].status, undefined);
    for (const cell of cells.filter(x => x.status)) { assert(Math.abs(cell.top) < 1); assert(Math.abs(cell.right) < 1); }
    checks.push({ name: `stock-status-column-${variant}`, values: cells });

   }
  }
  assert.deepEqual(errors, []); fs.writeFileSync(`${out}/checks.json`, JSON.stringify({ checks, errors, usedFixtures: true }, null, 2));
  console.log(JSON.stringify({ cases: checks.length, errors, artifacts: out }));
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
