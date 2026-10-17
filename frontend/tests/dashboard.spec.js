import { test, expect } from '@playwright/test';

test('welcome screen loads', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('.welcome-button')).toBeVisible();
});

test('dashboard opens and AI chat controls are available', async ({ page }) => {
  await page.goto('/');

  await page.locator('.welcome-button').click();

  await expect(page.locator('.side-nav')).toBeVisible();

  const aiNavigation = page.locator('.nav-item').filter({
    hasText: /AI/i,
  }).first();

  await expect(aiNavigation).toBeVisible();
  await aiNavigation.click();

  await expect(page.locator('.page-intro h2')).toBeVisible();
  await expect(page.locator('.chat-composer textarea')).toBeVisible();
  await expect(page.getByRole('button', { name: /Send/i })).toBeVisible();
});

test('AI answers which equipment has the highest downtime', async ({ page }) => {
  test.setTimeout(90000);

  await page.goto('/');
  await page.locator('.welcome-button').click();

  await page.locator('.nav-item').filter({
    hasText: /AI/i,
  }).first().click();

  const questionInput = page.locator('.chat-composer textarea');

  await questionInput.fill(
    'Which equipment has the highest downtime?'
  );

  await page.getByRole('button', { name: /Send/i }).click();

  const aiAnswer = page.locator('.chat-message.from-ai').last().locator('p');

  await expect(aiAnswer).toBeVisible({ timeout: 60000 });
  await expect(aiAnswer).toContainText(/BWE-01/i, { timeout: 60000 });
});

test('AI identifies the most common stoppage reason', async ({ page }) => {
  test.setTimeout(90000);

  await page.goto('/');
  await page.locator('.welcome-button').click();
  await page.locator('.nav-item').filter({ hasText: /AI/i }).first().click();

  await page.locator('.chat-composer textarea').fill(
    'What is the most common stoppage reason?'
  );
  await page.getByRole('button', { name: /Send/i }).click();

  const answer = page.locator('.chat-message.from-ai').last().locator('p');
  await expect(answer).toContainText(/Heavy rainfall/i, { timeout: 60000 });
});

test('AI reports the Conveyor stoppage count', async ({ page }) => {
  test.setTimeout(90000);

  await page.goto('/');
  await page.locator('.welcome-button').click();
  await page.locator('.nav-item').filter({ hasText: /AI/i }).first().click();

  await page.locator('.chat-composer textarea').fill(
    'How many Conveyor stoppages?'
  );
  await page.getByRole('button', { name: /Send/i }).click();

  const answer = page.locator('.chat-message.from-ai').last().locator('p');
  await expect(answer).toContainText(/55/, { timeout: 60000 });
});

test('AI reports Mine Area B stoppages', async ({ page }) => {
  test.setTimeout(90000);

  await page.goto('/');
  await page.locator('.welcome-button').click();
  await page.locator('.nav-item').filter({ hasText: /AI/i }).first().click();

  await page.locator('.chat-composer textarea').fill(
    'Show stoppages in Mine Area B'
  );
  await page.getByRole('button', { name: /Send/i }).click();

  const answer = page.locator('.chat-message.from-ai').last().locator('p');
  await expect(answer).toContainText(/57/, { timeout: 60000 });
});

test('AI correctly identifies the lowest-downtime equipment', async ({ page }) => {
  test.setTimeout(90000);

  await page.goto('/');
  await page.locator('.welcome-button').click();
  await page.locator('.nav-item').filter({ hasText: /AI/i }).first().click();

  await page.locator('.chat-composer textarea').fill(
    'Which equipment has the lowest downtime?'
  );
  await page.getByRole('button', { name: /Send/i }).click();

  const answer = page.locator('.chat-message.from-ai').last().locator('p');

  await expect(answer).toContainText(/DL-01/i, { timeout: 60000 });
  await expect(answer).toContainText(/DT-05/i, { timeout: 60000 });
});

test('AI does not invent records for nonexistent equipment', async ({ page }) => {
  test.setTimeout(90000);

  await page.goto('/');
  await page.locator('.welcome-button').click();
  await page.locator('.nav-item').filter({ hasText: /AI/i }).first().click();

  await page.locator('.chat-composer textarea').fill(
    'Show all stoppages for BWE-03'
  );
  await page.getByRole('button', { name: /Send/i }).click();

  const answer = page.locator('.chat-message.from-ai').last().locator('p');

  await expect(answer).toContainText(
    /no valid (stoppage )?records|no records found|no stoppages found|not found/i,
    { timeout: 60000 }
  );
});


test('all six main navigation sections open correctly', async ({ page }) => {
  await page.goto('/');
  await page.locator('.welcome-button').click();

  const sections = [
    { label: 'Overview', heading: 'Overview' },
    { label: 'Analytics', heading: 'Analytics' },
    { label: 'Equipment & Records', heading: 'Equipment & Records' },
    { label: 'Downloads', heading: 'Downloads' },
    { label: 'Data Management', heading: 'Data Management' },
    { label: 'MINE AI', heading: 'MINE AI' },
  ];

  for (const section of sections) {
    await page.locator('.nav-item').filter({
      hasText: section.label,
    }).first().click();

    await expect(page.locator('.topbar h1')).toHaveText(section.heading);
    await expect(page.locator('.page-content')).toBeVisible();
  }
});

test('overview displays KPI cards and analytics charts', async ({ page }) => {
  await page.goto('/');
  await page.locator('.welcome-button').click();

  await expect(page.locator('.kpi-grid')).toBeVisible();
  await expect(page.locator('.kpi-card')).toHaveCount(4);

  await expect(
    page.getByRole('heading', { name: 'Equipment performance snapshot' })
  ).toBeVisible();

  await page.locator('.nav-item').filter({
    hasText: 'Analytics',
  }).click();

  await expect(
    page.getByRole('heading', { name: 'Operational dataset' })
  ).toBeVisible();
});

test('records search and clear-filters controls work', async ({ page }) => {
  await page.goto('/');
  await page.locator('.welcome-button').click();

  await page.locator('.nav-item').filter({
    hasText: 'Equipment & Records',
  }).click();

  await expect(page.locator('.data-table')).toBeVisible();
  await expect(page.locator('.filter-grid input')).toBeVisible();
  await expect(page.locator('.filter-grid select')).toHaveCount(3);

  await page.locator('.filter-grid input').fill(
    'NO_SUCH_EQUIPMENT_98765'
  );

  await expect(
    page.getByText('No matching stoppage records found.')
  ).toBeVisible();

  await page.getByRole('button', { name: /Clear filters/i }).click();

  await expect(
    page.getByText('No matching stoppage records found.')
  ).toHaveCount(0);
});

test('data management displays Excel upload controls', async ({ page }) => {
  await page.goto('/');
  await page.locator('.welcome-button').click();

  await page.locator('.nav-item').filter({
    hasText: 'Data Management',
  }).click();

  await expect(
    page.getByRole('heading', { name: 'Add stoppage records' })
  ).toBeVisible();

  await expect(page.locator('#excel-upload')).toBeAttached();

  await expect(
    page.getByRole('button', { name: /Upload dataset/i })
  ).toBeDisabled();

  await expect(
    page.getByRole('heading', { name: 'Dataset overview' })
  ).toBeVisible();
});

test('downloads page displays CSV export controls', async ({ page }) => {
  await page.goto('/');
  await page.locator('.welcome-button').click();

  await page.locator('.nav-item').filter({
    hasText: 'Downloads',
  }).click();

  await expect(
    page.getByRole('heading', { name: 'Download your records' })
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: /Download all records/i })
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: /Download filtered records/i })
  ).toBeVisible();
});

test('frontend does not throw uncaught JavaScript errors', async ({ page }) => {
  const pageErrors = [];

  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  await page.goto('/');
  await page.locator('.welcome-button').click();

  for (const label of [
    'Overview',
    'Analytics',
    'Equipment & Records',
    'Downloads',
    'Data Management',
    'MINE AI',
  ]) {
    await page.locator('.nav-item').filter({
      hasText: label,
    }).first().click();

    await expect(page.locator('.page-content')).toBeVisible();
  }

  expect(pageErrors).toEqual([]);
});
