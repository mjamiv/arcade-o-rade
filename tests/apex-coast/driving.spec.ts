import { test, expect, type Page } from '@playwright/test';

type Telemetry = {
  phase: string;
  progress: number;
  speed: number;
  position: { x: number; y: number; z: number };
  countdown: number;
  lapTime: number;
  vehicle: string;
  input: { throttle: number; steer: number };
  valid: boolean;
  assists: boolean;
};
const telemetry = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { apexTelemetry: () => Telemetry }).apexTelemetry(),
  );
async function openGame(page: Page) {
  await page.addInitScript(() => {
    const key = 'arcade-o-rade:apex-coast:save:v1';
    if (!localStorage.getItem(key))
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, quality: 'low', volume: 0 }),
      );
  });
  await page.goto('games/apex-coast/?debug');
  await expect(page.locator('#garage')).toBeVisible({ timeout: 45000 });
}
async function start(page: Page) {
  await page.locator('#start').click();
  await expect(page.locator('#countdown')).toBeHidden({ timeout: 45000 });
}

test('choose a vehicle, drive with physical motion, pause, resume, and recover', async ({
  page,
}, info) => {
  test.skip(
    info.project.name === 'mobile-chromium',
    'Mobile input is tested with real simultaneous touch events.',
  );
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await openGame(page);
  await page.getByRole('button', { name: 'Select SUMMIT X' }).click();
  expect((await telemetry(page)).vehicle).toBe('summit');
  await page.getByRole('button', { name: 'Select RALLY RS' }).click();
  expect((await telemetry(page)).vehicle).toBe('rally');
  await page.getByRole('button', { name: 'Select VANTAGE GT' }).click();
  await start(page);
  const origin = (await telemetry(page)).position;
  await page.keyboard.down('KeyW');
  await expect
    .poll(async () => (await telemetry(page)).speed, { timeout: 20000 })
    .toBeGreaterThan(5);
  await page.keyboard.up('KeyW');
  const moved = (await telemetry(page)).position;
  expect(Math.hypot(moved.x - origin.x, moved.z - origin.z)).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Pause driving' }).click();
  const paused = (await telemetry(page)).lapTime;
  await page.waitForTimeout(300);
  expect((await telemetry(page)).lapTime).toBe(paused);
  await page.locator('#resume').click();
  expect((await telemetry(page)).phase).toBe('driving');
  await page.keyboard.press('KeyR');
  expect((await telemetry(page)).valid).toBe(false);
  await page.keyboard.press('KeyC');
  await expect(page.locator('#race-message')).toContainText('HOOD CAMERA');
  await page.getByRole('button', { name: 'Pause driving' }).click();
  await page.locator('#exit').click();
  await expect(page.locator('#garage')).toBeVisible();
  expect((await telemetry(page)).phase).toBe('garage');
  // Returning from a recovery must refresh road proximity at the garage spawn.
  // Stale track state previously hid the contact shadow after an off-road exit.
  expect((await telemetry(page)).progress).toBe(0);
  expect(errors).toEqual([]);
});

test('phone controls accelerate and steer simultaneously, release safely, and survive rotation', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'mobile-chromium', 'Touch-input scenario.');
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await openGame(page);
  await start(page);
  const gas = (await page
    .getByRole('button', { name: 'Accelerate', exact: true })
    .boundingBox())!;
  const left = (await page
    .getByRole('button', { name: 'Steer left' })
    .boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: gas.x + gas.width / 2, y: gas.y + gas.height / 2, id: 0 },
      { x: left.x + left.width / 2, y: left.y + left.height / 2, id: 1 },
    ],
  });
  await expect
    .poll(async () => (await telemetry(page)).speed, { timeout: 20000 })
    .toBeGreaterThan(3);
  const input = (await telemetry(page)).input;
  expect(input.throttle).toBe(1);
  expect(input.steer).toBe(1);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect.poll(async () => (await telemetry(page)).input.throttle).toBe(0);
  await page.getByRole('button', { name: 'Pause driving' }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#resume')).toBeVisible();
  await page.locator('#resume').click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole('button', { name: 'Accelerate', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('settings persist across reload and free drive is selectable', async ({
  page,
}) => {
  test.setTimeout(60000);
  await openGame(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#assists').uncheck();
  await page.locator('#unit-select').selectOption('kmh');
  await page.locator('#settings-close').click();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('arcade-o-rade:apex-coast:save:v1')!),
  );
  expect(stored.assists).toBe(false);
  expect(stored.units).toBe('kmh');
  await page.reload();
  await expect(page.locator('#garage')).toBeVisible({ timeout: 45000 });
  expect((await telemetry(page)).assists).toBe(false);
  await page.locator('#mode-practice').click();
  await expect(page.locator('#mode-practice')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('unsupported graphics show recovery guidance instead of a blank screen', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type === 'webgl2' || type === 'webgl') return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('games/apex-coast/');
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#error-message')).toContainText('WebGL 2');
  await expect(
    page.getByRole('link', { name: 'Back to the arcade' }),
  ).toBeVisible();
});
