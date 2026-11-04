// An in-memory API fixture behind the real Vite proxy. No production or database access.
const { chromium } = require(process.env.REBIOMED_PLAYWRIGHT_MODULE || 'playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const out = process.env.REBIOMED_QA_OUTPUT || '/private/tmp/rebiomed-protocols-qa';
fs.mkdirSync(out, { recursive: true });
let role = 'admin', failContent = false, failSave = false;
let pendingEdits = [];
const requests = [], checks = [];
let protocols = ['ProtocolCells', 'ProtocolPCR', 'ProtocolEvaluation', 'ProtocolStaining', 'Custom', 'Hypoxia', 'HighPressure'].map((category, i) => ({
  id: i + 1, title: `QA ${category}`, category, tag: 'QA', status: 'Đã duyệt', version: '1.0', updatedAt: '2026-11-03', owner: 'QA Researcher', summary: 'Synthetic local fixture', duration: '10 phút',
  steps: [{ title: 'QA step', detail: 'QA detail', time: '10 phút', calculatorIds: ['dilution'] }], notes: ['QA note', { type: 'table', title: 'QA table', columns: ['Reagent', 'Volume'], rows: [['PBS', '1 mL']] }],
}));
const server = http.createServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith('/api/trpc/')) { res.writeHead(404); return res.end(); }
  const names = decodeURIComponent(url.pathname.split('/api/trpc/')[1]).split(',');
  const inputs = JSON.parse(body || url.searchParams.get('input') || '{}');
  const results = names.map((name, index) => {
    const input = inputs[index]?.json; requests.push({ name, input, role });
    if ((name === 'content.all' && failContent) || (failSave && ['content.createDraft', 'content.updateDraft'].includes(name))) {
      return { error: { json: { message: 'QA API unavailable', code: -32603, data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500, path: name } } } };
    }
    let value = [];
    if (name === 'auth.me') value = { id: 999, name: 'QA Researcher', username: 'qa', role, approvalStatus: 'approved' };
    if (name === 'content.all') value = { protocols, samples: [], calculators: [{ id: 1, slug: 'dilution', name: 'Pha loãng', formula: 'C1V1=C2V2', description: 'QA', category: 'Cells', active: 1, status: 'Đã duyệt', config: {} }] };
    if (name === 'content.createDraft') { protocols.push({ ...protocols[0], ...input, id: 100, summary: input.body, status: 'Bản nháp' }); value = { id: 100 }; }
    if (name === 'content.updateDraft') { protocols = protocols.map(p => p.id === input.id ? { ...p, ...input, summary: input.body } : p); value = { success: true }; }
    if (name === 'content.pendingEdits') value = pendingEdits;
    if (name === 'content.approveProtocol') { protocols = protocols.map(p => p.id === input.id ? { ...p, status: 'Đã duyệt' } : p); value = { success: true }; }
    if (['content.rejectProtocol', 'content.adminDeleteProtocol'].includes(name)) { protocols = protocols.filter(p => p.id !== input.id); value = { success: true }; }
    if (['content.approvePendingEdit', 'content.rejectPendingEdit'].includes(name)) { pendingEdits = pendingEdits.filter(p => p.id !== input.id || p.kind !== input.kind); value = { success: true }; }
    return { result: { data: { json: value } } };
  });
  res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(results));
});
(async () => {
  await new Promise(resolve => server.listen(4318, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const nav = async () => { if (await page.getByRole('button', { name: 'Mở menu', exact: true }).isVisible()) await page.getByRole('button', { name: 'Mở menu', exact: true }).click(); await page.locator('.main-nav').getByRole('button', { name: 'Quy trình', exact: true }).click(); };
    const field = name => page.getByRole('textbox', { name, exact: true });
    await page.goto('http://127.0.0.1:4173/'); await nav(); await page.locator('.protocol-card').first().waitFor();
    assert.equal(await page.locator('.protocol-card').count(), 7); checks.push('All original categories visible through the real Vite API proxy');
    const protocolSearch = page.getByRole('searchbox', { name: 'Tìm quy trình', exact: true });
    await protocolSearch.fill('QA ProtocolPCR'); assert.equal(await page.locator('.protocol-card').count(), 1);
    await protocolSearch.fill('no matching protocol'); assert(await page.getByText('Không có quy trình khớp bộ lọc', { exact: true }).isVisible());
    await protocolSearch.fill(''); assert.equal(await page.locator('.protocol-card').count(), 7);
    checks.push('Protocol search, filtered empty state and clearing the filter retain the complete library');
    await page.locator('.protocol-card').first().click();
    assert(await page.getByText('QA detail', { exact: true }).isVisible());
    assert(await page.getByRole('table').getByText('PBS', { exact: true }).isVisible());
    await page.locator('.step-linked-tools button').first().click(); assert(await page.locator('.attached-tool-panel').isVisible());
    await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    await field('Tên quy trình').fill('QA edited'); failSave = true;
    await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click(); await page.getByText('QA API unavailable', { exact: true }).waitFor();
    assert.equal(await field('Tên quy trình').inputValue(), 'QA edited'); failSave = false;
    await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
    await page.locator('.protocol-card').filter({ hasText: 'QA edited' }).waitFor();
    const edits = requests.filter(r => r.name === 'content.updateDraft'); assert.equal(edits.length, 2); assert.equal(edits[1].input.id, 1);
    checks.push('Detail, notes/table, linked calculator, edit, failed-save retention, retry preserves record ID');
    await page.getByRole('button', { name: 'Thêm quy trình', exact: true }).click();
    await field('Tên quy trình').fill('QA created'); await field('Người viết quy trình').fill('QA Writer'); await field('Tên bước').fill('QA new step');
    await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click(); await page.locator('.protocol-card').filter({ hasText: 'QA created' }).waitFor();
    assert.equal(requests.filter(r => r.name === 'content.createDraft').length, 1); checks.push('Create draft sends original API payload and refreshes library');
    // Approval controls operate only against this in-memory fixture, never a real API.
    const adminReview = () => page.locator('.main-nav').getByRole('button', { name: 'Quản trị Admin', exact: true }).click();
    const reviewRow = title => page.locator('.team-row').filter({ has: page.locator('.team-identity strong').filter({ hasText: title }) });
    await adminReview(); await reviewRow('QA created').getByRole('button', { name: 'Duyệt', exact: true }).click();
    await reviewRow('QA created').waitFor({ state: 'detached' });
    assert(requests.some(r => r.name === 'content.approveProtocol' && r.input.id === 100));
    await nav(); await page.getByRole('button', { name: /Đã duyệt/ }).filter({ hasText: 'Đã duyệt' }).first().click();
    await page.locator('.protocol-card').filter({ hasText: 'QA created' }).waitFor();
    protocols.push({ ...protocols[0], id: 101, title: 'QA rejection', status: 'Bản nháp' });
    pendingEdits = [{ id: 201, kind: 'protocol', title: 'QA pending approval', editorId: 999 }, { id: 202, kind: 'protocol', title: 'QA pending rejection', editorId: 999 }];
    await page.reload(); await adminReview();
    await reviewRow('QA pending approval').getByRole('button', { name: 'Duyệt bản chỉnh sửa', exact: true }).click();
    await reviewRow('QA pending approval').waitFor({ state: 'detached' });
    assert(requests.some(r => r.name === 'content.approvePendingEdit' && r.input.id === 201 && r.input.kind === 'protocol'));
    page.once('dialog', dialog => dialog.dismiss());
    await reviewRow('QA rejection').getByRole('button', { name: 'Không duyệt và xoá', exact: true }).click();
    assert.equal(requests.filter(r => r.name === 'content.rejectProtocol').length, 0);
    const acceptDialog = dialog => dialog.accept(); page.on('dialog', acceptDialog);
    await reviewRow('QA rejection').getByRole('button', { name: 'Không duyệt và xoá', exact: true }).click(); await reviewRow('QA rejection').waitFor({ state: 'detached' });
    await reviewRow('QA pending rejection').getByRole('button', { name: 'Không duyệt', exact: true }).click(); await reviewRow('QA pending rejection').waitFor({ state: 'detached' });
    assert(requests.some(r => r.name === 'content.rejectProtocol' && r.input.id === 101));
    assert(requests.some(r => r.name === 'content.rejectPendingEdit' && r.input.id === 202 && r.input.kind === 'protocol'));
    await nav(); await page.locator('.protocol-card').filter({ hasText: 'QA created' }).click();
    await page.getByRole('button', { name: 'Xoá quy trình QA created', exact: true }).click(); await page.locator('.protocol-card').first().waitFor();
    assert(requests.some(r => r.name === 'content.adminDeleteProtocol' && r.input.id === 100)); page.off('dialog', acceptDialog);
    checks.push('Admin approval/rejection, pending protocol edits, cancel rejection, confirmed deletion preserve IDs and mutation paths');
    for (const category of ['Hypoxia', 'HighPressure']) {
      await page.locator('.main-nav').getByRole('button', { name: 'Điều kiện nuôi cấy', exact: true }).click();
      await page.getByRole('navigation', { name: 'Điều kiện nuôi cấy' }).getByRole('button', { name: category === 'Hypoxia' ? 'Nuôi cấy Hypoxia' : 'Nuôi cấy áp suất cao', exact: true }).click();
      await page.locator('.special-item').filter({ hasText: `QA ${category}` }).click();
      assert(await page.locator('.detail-header h1').filter({ hasText: `QA ${category}` }).isVisible());
      await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
      assert.equal(await page.locator('.editor-panel > .field-label > select').first().inputValue(), category); await page.getByRole('button', { name: 'Hủy', exact: true }).click();
      await page.locator('.main-nav').getByRole('button', { name: 'Điều kiện nuôi cấy', exact: true }).click();
      await page.getByRole('navigation', { name: 'Điều kiện nuôi cấy' }).getByRole('button', { name: category === 'Hypoxia' ? 'Nuôi cấy Hypoxia' : 'Nuôi cấy áp suất cao', exact: true }).click();
      await page.getByRole('button', { name: 'Thêm quy trình', exact: true }).click(); assert.equal(await page.locator('.editor-panel > .field-label > select').first().inputValue(), category); await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    }
    checks.push('Hypoxia/HighPressure: open protocol, edit retains category, create opens correct category, cancel returns safely');
    for (const nextRole of ['user', 'supporter', 'guest']) {
      role = nextRole; await page.reload(); await nav(); await page.locator('.protocol-card').first().waitFor();
      assert.equal(await page.getByRole('button', { name: 'Thêm quy trình', exact: true }).count(), nextRole === 'guest' ? 0 : 1);
      await page.locator('.protocol-card').first().click();
      assert.equal(await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).count(), nextRole === 'guest' ? 0 : 1);
      assert.equal(await page.getByRole('button', { name: 'Xoá quy trình QA edited', exact: true }).count(), nextRole === 'supporter' ? 1 : 0);
      checks.push(`${nextRole}: original protocol actions and approved-record delete visibility`);
      if (nextRole !== 'supporter') {
        await page.getByRole('button', { name: 'Mở tài khoản', exact: true }).click();
        await page.getByRole('button', { name: 'Trang cá nhân', exact: true }).click();
        assert(await page.getByRole('textbox', { name: /^Username/ }).isDisabled());
        assert.equal(await page.getByRole('textbox', { name: 'Email', exact: true }).isDisabled(), nextRole === 'guest');
        assert.equal(await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).count(), nextRole === 'guest' ? 0 : 1);
        await nav(); await page.locator('.protocol-card').first().click();
      }
      if (nextRole === 'guest') {
        assert.equal(await page.locator('.main-nav').getByRole('button', { name: 'Quản trị Admin', exact: true }).count(), 0);
        await page.locator('.main-nav').getByRole('button', { name: 'Điều kiện nuôi cấy', exact: true }).click();
        await page.getByText('Bạn cần là thành viên của phòng thí nghiệm để tiếp tục', { exact: true }).waitFor();
        assert(await page.locator('.detail-header h1').isVisible());
      }
    }
    checks.push('User/Guest account screens retain read-only username and Guest profile restrictions; Guest special/admin access remains blocked');
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(200);
      for (const dark of [false, true]) {
        if (await page.locator('html').evaluate(x => x.classList.contains('dark')) !== dark) await page.getByRole('button', { name: dark ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng', exact: true }).click();
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), JSON.stringify(await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll("main *")].filter(x=>x.getBoundingClientRect().right>innerWidth+1).map(x=>({tag:x.tagName,class:x.className,width:x.getBoundingClientRect().width})).slice(0,12)}))));
        await page.screenshot({ path: path.join(out, `protocol-${width}-${dark ? 'dark' : 'light'}.png`), fullPage: true });
      }
    }
    checks.push('Protocol detail: desktop/mobile 1440/390/320, both themes, no page overflow');
    failContent = true; await page.reload(); await nav(); await page.locator('.content-load-error').waitFor();
    assert.equal(await page.getByText('Chưa có quy trình trong kho', { exact: true }).count(), 0);
    failContent = false; await page.getByRole('button', { name: 'Tải lại dữ liệu', exact: true }).click(); await page.locator('.protocol-card').first().waitFor();
    checks.push('API failure is distinct from empty data; retry restores list');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify({ checks, errors, mutationCount: requests.filter(r => /Draft$/.test(r.name)).length }, null, 2));
    console.log(JSON.stringify({ checks, errors, artifacts: out }, null, 2));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exit(1); });
