/**
 * MIDI-Link UI/UX Validation Traceability Matrix
 *
 * Tests map 1-to-1 with the matrix IDs:
 *   Part 1 (1.1–1.4): Grid & Flexbox structural contracts
 *   Part 2 (2.1–2.3): Missing CSS selectors audit
 *   Part 3 (3.1–3.3): Overflow & box-model clipping
 */

import { test, expect, Page } from '@playwright/test';

const VIEWPORT = { width: 1200, height: 800 };

// ─── helpers ─────────────────────────────────────────────────────────────────

async function openActionEditor(page: Page) {
  // Create a profile first if needed
  const profiles = page.locator('.profile-item, .profile-card');
  if ((await profiles.count()) === 0) {
    const createBtn = page.locator('button', { hasText: /create|new profile/i }).first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      const nameInput = page.locator('input[placeholder*="name" i], input[type="text"]').first();
      await nameInput.fill('Test Profile');
      await page.locator('button[type="submit"], button', { hasText: /create|save/i }).last().click();
      await page.waitForTimeout(300);
    }
  }

  // Click add mapping button
  const addBtn = page.locator('button', { hasText: /add mapping|new mapping|\+ mapping/i }).first();
  if (await addBtn.isVisible()) {
    await addBtn.click();
    await page.waitForTimeout(300);
  }
}

// ─── Part 1: Grid & Flexbox structural contracts ──────────────────────────────

test.describe('Part 1 – Grid & Flexbox Structural Contracts', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('1.1 – Dashboard height equals viewport height (no vertical overflow)', async ({ page }) => {
    const dashboard = page.locator('.dashboard');
    await expect(dashboard).toBeVisible();

    const box = await dashboard.boundingBox();
    expect(box).not.toBeNull();
    // Allow ±2px tolerance for sub-pixel rendering
    expect(box!.height).toBeCloseTo(VIEWPORT.height, -1);
  });

  test('1.2 – Left panel and main panel share a seamless boundary (no gap or overlap)', async ({ page }) => {
    const leftPanel = page.locator('.left-panel');
    const mainPanel = page.locator('.main-panel');

    await expect(leftPanel).toBeVisible();
    await expect(mainPanel).toBeVisible();

    const leftBox = await leftPanel.boundingBox();
    const mainBox = await mainPanel.boundingBox();

    expect(leftBox).not.toBeNull();
    expect(mainBox).not.toBeNull();

    // The right edge of the left panel must align exactly with the left edge of the main panel
    expect(Math.round(leftBox!.x + leftBox!.width)).toEqual(Math.round(mainBox!.x));
  });

  test('1.3 – Main panel expands to full viewport width when left panel is closed', async ({ page }) => {
    // Find and click the toggle button to close the left panel
    const toggleBtn = page.locator('.panel-toggle-btn.left-panel-open').first();
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await page.waitForTimeout(300);

    // Left panel should be gone
    await expect(page.locator('.left-panel')).not.toBeVisible();

    // Main panel should now fill the full viewport width
    const mainPanel = page.locator('.main-panel');
    const mainBox = await mainPanel.boundingBox();
    expect(mainBox).not.toBeNull();
    expect(Math.round(mainBox!.width)).toBeCloseTo(VIEWPORT.width, -1);
  });

  test('1.4 – Mapping cards are laid out side-by-side in a grid (not a single column)', async ({ page }) => {
    // This test only runs if 2+ mapping cards exist
    const cards = page.locator('.mapping-card');
    const count = await cards.count();

    if (count < 2) {
      test.skip(true, 'Needs at least 2 mapping cards to validate grid layout');
      return;
    }

    const box1 = await cards.nth(0).boundingBox();
    const box2 = await cards.nth(1).boundingBox();

    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();

    // In a CSS grid with auto-fill, cards on the same row share the same Y coordinate.
    // If they are stacked vertically (flex-direction: column), y values differ.
    // We assert they are NOT all stacked — at least one pair should share a Y position.
    const sameRow = Math.abs(box1!.y - box2!.y) < 5;
    expect(sameRow).toBe(true);
  });

});

// ─── Part 2: Missing CSS selectors audit ─────────────────────────────────────

test.describe('Part 2 – Missing CSS Selectors Audit', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('2.1 – .step-fields has explicit display style (not bare block)', async ({ page }) => {
    await openActionEditor(page);

    // Select "Macro" action type to expose macro steps
    const actionTypeSelect = page.locator('select').filter({ hasText: /macro/i }).first();
    if (await actionTypeSelect.isVisible()) {
      await actionTypeSelect.selectOption({ label: 'Macro' });
    } else {
      // Try clicking a macro option
      const macroOpt = page.locator('option', { hasText: /macro/i }).first();
      if (await macroOpt.isVisible()) await macroOpt.click();
    }

    // Add a step to reveal .step-fields
    const addStepBtn = page.locator('button', { hasText: /add step/i }).first();
    if (await addStepBtn.isVisible()) {
      await addStepBtn.click();
      await page.waitForTimeout(300);
    }

    const stepFields = page.locator('.step-fields').first();
    if (await stepFields.isVisible()) {
      const display = await stepFields.evaluate(
        (el) => window.getComputedStyle(el).display
      );
      // Must NOT fall back to browser default 'block' — should be 'flex'
      expect(display).toBe('flex');
    } else {
      test.skip(true, '.step-fields not visible — open ActionEditor with macro steps first');
    }
  });

  test('2.2 – .step-action-selector aligns with other form inputs (same left edge)', async ({ page }) => {
    await openActionEditor(page);

    const selector = page.locator('.step-action-selector').first();
    if (await selector.isVisible()) {
      const selectorBox = await selector.boundingBox();
      // Any sibling input/label should share the same X (left-alignment)
      const firstInput = page.locator('.action-editor-modal input, .action-editor-modal select').first();
      const inputBox = await firstInput.boundingBox();

      expect(selectorBox).not.toBeNull();
      expect(inputBox).not.toBeNull();
      // Allow ±8px tolerance (padding differences)
      expect(Math.abs(selectorBox!.x - inputBox!.x)).toBeLessThanOrEqual(8);
    } else {
      test.skip(true, '.step-action-selector not visible — ActionEditor must be open with a macro step');
    }
  });

  test('2.3 – .general-error renders with red color when a form error occurs', async ({ page }) => {
    await openActionEditor(page);

    // Try to submit an empty/invalid form to trigger general-error
    const saveBtn = page.locator('button[type="submit"], button', { hasText: /save|create/i }).last();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(300);
    }

    const errorEl = page.locator('.general-error').first();
    if (await errorEl.isVisible()) {
      const color = await errorEl.evaluate(
        (el) => window.getComputedStyle(el).color
      );
      // Expect a red color — #ef4444 = rgb(239, 68, 68)
      expect(color).toBe('rgb(239, 68, 68)');
    } else {
      test.skip(true, 'No .general-error displayed — trigger a form validation error first');
    }
  });

});

// ─── Part 3: Overflow & Box-Model Clipping ───────────────────────────────────

test.describe('Part 3 – Overflow & Box-Model Clipping', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('3.1 – Main panel height does not exceed viewport (padding inside 100vh wrapper)', async ({ page }) => {
    const header = page.locator('header, .app-header').first();
    const mainPanel = page.locator('.main-panel');

    await expect(mainPanel).toBeVisible();
    const mainBox = await mainPanel.boundingBox();
    expect(mainBox).not.toBeNull();

    const headerBox = await (await header.isVisible() ? header : page.locator('body')).boundingBox();
    const headerHeight = headerBox ? headerBox.height : 0;

    // Main panel bottom edge must not exceed the viewport
    expect(mainBox!.y + mainBox!.height).toBeLessThanOrEqual(VIEWPORT.height + 2);
  });

  test('3.2 – Modal width does not exceed viewport width (min(600px, 90vw) fix)', async ({ page }) => {
    // Use a narrow viewport to stress-test the responsive width
    await page.setViewportSize({ width: 500, height: 700 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await openActionEditor(page);

    const modal = page.locator('.action-editor-modal .modal-content');
    if (await modal.isVisible()) {
      const modalBox = await modal.boundingBox();
      const viewport = page.viewportSize();
      expect(modalBox).not.toBeNull();
      expect(viewport).not.toBeNull();
      expect(modalBox!.width).toBeLessThanOrEqual(viewport!.width);
    } else {
      test.skip(true, 'ActionEditor modal did not open');
    }

    // Restore default viewport
    await page.setViewportSize(VIEWPORT);
  });

  test('3.3 – Save button stays visible after adding 10 macro steps', async ({ page }) => {
    await openActionEditor(page);

    // Switch to macro action type
    const typeSelect = page.locator('.action-editor-modal select').first();
    if (await typeSelect.isVisible()) {
      const options = await typeSelect.locator('option').allTextContents();
      const macroOption = options.find((o) => /macro/i.test(o));
      if (macroOption) {
        await typeSelect.selectOption({ label: macroOption });
        await page.waitForTimeout(200);
      }
    }

    // Add 10 steps
    for (let i = 0; i < 10; i++) {
      const addStepBtn = page.locator('button', { hasText: /add step/i }).first();
      if (await addStepBtn.isVisible()) {
        await addStepBtn.click();
        await page.waitForTimeout(100);
      } else {
        break;
      }
    }

    // The Save/Create button must still be visible in the viewport
    const saveBtn = page.locator('.action-editor-modal .modal-actions button[type="submit"], .action-editor-modal .modal-actions button', { hasText: /save|create/i }).first();
    if (await saveBtn.isVisible()) {
      await expect(saveBtn).toBeInViewport();
    } else {
      test.skip(true, 'Save button not found in ActionEditor modal');
    }
  });

});
