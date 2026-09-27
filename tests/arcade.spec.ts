import { test, expect } from '@playwright/test';

test('arcade loads its catalog at the real Pages subpath without errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Small studio.',
  );
  await expect(page.locator('#game-count')).toContainText('GAMES ON THE SHELF');
  await page.getByRole('link', { name: 'Explore the arcade' }).click();
  await expect(page).toHaveURL(/#games$/);
  const games = await (await page.request.get('catalog.json')).json();
  if (games.length === 0)
    await expect(page.getByText('The first slot is waiting.')).toBeVisible();
  for (const game of games) {
    const link = page.getByRole('link', {
      name: `Play ${game.title} ↗`,
      exact: true,
    });
    await expect(link).toHaveAttribute(
      'href',
      `/arcade-o-rade/games/${game.slug}/`,
    );
    const response = await page.request.get(
      `/arcade-o-rade/games/${game.slug}/`,
    );
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain('id="headline"');
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('catalog failure gives a useful recovery message', async ({ page }) => {
  await page.route('**/catalog.json', (route) =>
    route.fulfill({ status: 503, body: '' }),
  );
  await page.goto('./');
  await expect(
    page.getByText(
      'The game shelf could not load. Refresh the page to try again.',
    ),
  ).toBeVisible();
});

test('skip link is keyboard accessible', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to games' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#games$/);
});
