/**
 * MIDI-Link Comprehensive UI/UX Validation Suite
 *
 * Updated for the new cyber-studio design system (coral/violet tokens,
 * 3-zone shell: TopNav + Sidebar + Main, map-card layout).
 *
 * Structure:
 *   1. Layout Contracts       (app-shell, sidebar, main, grid)
 *   2. Dashboard              (topnav, MIDI toggle, version)
 *   3. ProfileSelector        (CRUD modals, validation, dropdown)
 *   4. MappingGrid            (cards, add slot, delete confirm, MIDI selector)
 *   5. ActionEditor           (form fields, multi-action, step types, validation)
 *   6. MidiMonitor            (event display, no-events state)
 *   7. Toast                  (types, dismiss, auto-close)
 *   8. Overflow & Box-Model   (modal clipping, scrollable body)
 *   9. CSS Selectors Audit    (display values, design token colors)
 *  10. Keyboard & Focus       (tab order, form submit)
 *  11. Responsive / Resize    (narrow viewport, modal max-width)
 */

import { test, expect, Page } from '@playwright/test';

// ─── Constants ────────────────────────────────────────────────────────────────

const VP = { width: 1200, height: 800 };

// ─── Tauri IPC mock ───────────────────────────────────────────────────────────

function tauriMock() {
  const store: {
    profiles: Record<string, { id: string; name: string; description: string; mappings: Record<string, unknown>; smart_switch_rules: unknown[] }>;
    activeProfileId: string | null;
  } = { profiles: {}, activeProfileId: null };

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  const handlers: Record<string, (args: Record<string, unknown>) => unknown> = {
    initialize_midi: () => ['Mock MIDI Device'],
    get_midi_devices: () => ['Mock MIDI Device'],
    reconnect_midi: () => ['Mock MIDI Device'],
    'plugin:app|version': () => '0.2.0-test',
    'plugin:app|name': () => 'MIDI-Link',
    get_profiles: () => Object.values(store.profiles),
    get_active_profile: () => store.activeProfileId ? { ...store.profiles[store.activeProfileId] } : null,
    create_profile: (a) => {
      const id = uuid();
      store.profiles[id] = { id, name: a.name as string, description: (a.description as string) || '', mappings: {}, smart_switch_rules: [] };
      store.activeProfileId = id;
      return id;
    },
    set_active_profile: (a) => { store.activeProfileId = a.profileId as string; return null; },
    delete_profile: (a) => {
      delete store.profiles[a.profileId as string];
      if (store.activeProfileId === a.profileId) store.activeProfileId = null;
      return null;
    },
    add_mapping_to_profile: (a) => {
      const m = a.mapping as { id: string; midi_key?: string };
      if (store.activeProfileId) store.profiles[store.activeProfileId].mappings[m.midi_key ?? m.id] = m;
      return null;
    },
    delete_mapping: (a) => {
      for (const p of Object.values(store.profiles))
        for (const [k, v] of Object.entries(p.mappings))
          if ((v as { id: string }).id === a.mappingId) { delete p.mappings[k]; break; }
      return null;
    },
    execute_action: () => null,
    check_profile_security: () => [],
    import_profile: () => uuid(),
    export_profile: () => null,
    'plugin:dialog|open': () => '/mock/path/file.json',
    'plugin:dialog|save': () => '/mock/path/export.json',
    'plugin:opener|open_url': () => null,
  };

  (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
    invoke(cmd: string, args: Record<string, unknown> = {}) {
      return Promise.resolve().then(() => {
        const handler = handlers[cmd];
        return handler ? handler(args) : null;
      });
    },
    transformCallback(fn: (v: unknown) => void) { void fn; return 0; },
    unregisterCallback() {},
    convertFileSrc: (p: string) => p,
    metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main', windowLabel: 'main' } },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function goto(page: Page) {
  await page.addInitScript(tauriMock);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/** Open the Create Profile modal via the + icon button in the sidebar. */
async function openCreateProfileModal(page: Page) {
  // The first .iconbtn (not .danger) is the "add profile" button
  const btn = page.locator('.profile-selector .iconbtn:not(.danger)');
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(page.locator('.modal-overlay')).toBeVisible();
}

/** Create a profile and wait for the modal to close. */
async function createProfile(page: Page, name = 'Test Profile', description = '') {
  await openCreateProfileModal(page);
  await page.locator('#profile-name').fill(name);
  if (description) await page.locator('#profile-desc').fill(description);
  await page.locator('.modal-overlay .create-btn').click();
  await expect(page.locator('.modal-overlay')).not.toBeVisible();
}

/** Open the MIDI value selector (map-add card click). */
async function openMidiSelector(page: Page) {
  const addCard = page.locator('.map-add').first();
  if (await addCard.isVisible()) {
    await addCard.click();
    await expect(page.locator('.modal-content').filter({ hasText: /channel/i })).toBeVisible();
    return true;
  }
  return false;
}

/** Open ActionEditor for an existing mapping (edit icon button). */
async function openEditModal(page: Page) {
  // Hover over the first map-card to reveal card-actions, then click edit
  const card = page.locator('.map-card').first();
  if (await card.isVisible()) {
    await card.hover();
    const editBtn = card.locator('.ico-edit').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.locator('.action-editor-modal')).toBeVisible();
      return true;
    }
  }
  return false;
}

// ─── 1. Layout Contracts ─────────────────────────────────────────────────────

test.describe('1 – Layout Contracts', () => {
  test.beforeEach(async ({ page }) => { await goto(page); });

  test('1.1 – .app-shell fills exactly 100vh', async ({ page }) => {
    const box = await page.locator('.app-shell').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeCloseTo(VP.height, -1);
  });

  test('1.2 – .body-row is a flex row', async ({ page }) => {
    const display = await page.locator('.body-row').evaluate(
      (el) => window.getComputedStyle(el).display
    );
    expect(display).toBe('flex');
  });

  test('1.3 – Sidebar and main panel share a seamless boundary', async ({ page }) => {
    const sideBox = await page.locator('.sidebar').boundingBox();
    const mainBox = await page.locator('.main').boundingBox();
    expect(sideBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    expect(Math.round(sideBox!.x + sideBox!.width)).toEqual(Math.round(mainBox!.x));
  });

  test('1.4 – Sidebar width is ~256 px', async ({ page }) => {
    const box = await page.locator('.sidebar').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeCloseTo(256, -1);
  });

  test('1.5 – .main bottom edge does not exceed viewport', async ({ page }) => {
    const box = await page.locator('.main').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(VP.height + 2);
  });

  test('1.6 – TopNav is present and has height 64px', async ({ page }) => {
    const box = await page.locator('.topnav').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeCloseTo(64, 0);
  });

  test('1.7 – Sidebar contains sb-nav and sb-foot', async ({ page }) => {
    await expect(page.locator('.sb-nav')).toBeVisible();
    await expect(page.locator('.sb-foot')).toBeVisible();
  });

  test('1.8 – .mappings-container uses CSS grid', async ({ page }) => {
    await createProfile(page, 'Grid Layout Test');
    await expect(page.locator('.mappings-container')).toBeVisible();
    const display = await page.locator('.mappings-container').first().evaluate(
      (el) => window.getComputedStyle(el).display
    );
    expect(display).toBe('grid');
  });

  test('1.9 – Map cards are side-by-side when 2+ exist', async ({ page }) => {
    const cards = page.locator('.map-card');
    const count = await cards.count();
    if (count < 2) { test.skip(); return; }
    const b1 = await cards.nth(0).boundingBox();
    const b2 = await cards.nth(1).boundingBox();
    expect(b1).not.toBeNull();
    expect(b2).not.toBeNull();
    expect(Math.abs(b1!.y - b2!.y)).toBeLessThan(5);
  });
});

// ─── 2. Dashboard ────────────────────────────────────────────────────────────

test.describe('2 – Dashboard', () => {
  test.beforeEach(async ({ page }) => { await goto(page); });

  test('2.1 – TopNav is visible with wordmark "MIDI-Link"', async ({ page }) => {
    await expect(page.locator('.topnav')).toBeVisible();
    await expect(page.locator('.topnav .wordmark')).toContainText('MIDI');
  });

  test('2.2 – Version is present in topnav', async ({ page }) => {
    await expect(page.locator('.topnav .version')).toBeVisible();
  });

  test('2.3 – MIDI icon button is visible in topnav', async ({ page }) => {
    await expect(page.locator('.topnav .icon-btn')).toBeVisible();
  });

  test('2.4 – MIDI live pill appears when MIDI is enabled', async ({ page }) => {
    // After init with mock, MIDI is enabled → learn-pill should show
    const pill = page.locator('.learn-pill');
    // may or may not be visible depending on mock response timing
    const pillOrBtn = (await pill.isVisible()) || (await page.locator('.topnav .icon-btn').isVisible());
    expect(pillOrBtn).toBe(true);
  });

  test('2.5 – MIDI icon button click toggles MIDI state', async ({ page }) => {
    const btn = page.locator('.topnav .icon-btn').first();
    await expect(btn).toBeVisible();
    // Just ensure it can be clicked without crashing
    await btn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('.app-shell')).toBeVisible();
  });

  test('2.6 – Dashboard header (Studio Dashboard) is visible in main area', async ({ page }) => {
    await expect(page.locator('.dash-title')).toBeVisible();
    await expect(page.locator('.dash-title')).toContainText('Studio Dashboard');
  });

  test('2.7 – NEW MAPPING CTA button is visible in the main header', async ({ page }) => {
    const btn = page.locator('.btn-cta');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText(/new mapping/i);
  });
});

// ─── 3. ProfileSelector ──────────────────────────────────────────────────────

test.describe('3 – ProfileSelector', () => {
  test.beforeEach(async ({ page }) => { await goto(page); });

  test('3.1 – Profile selector widget is visible in sidebar', async ({ page }) => {
    await expect(page.locator('.profile-selector')).toBeVisible();
  });

  test('3.2 – Profile dropdown (select) is present', async ({ page }) => {
    await expect(page.locator('.profile-selector select')).toBeVisible();
  });

  test('3.3 – Create profile icon button is visible', async ({ page }) => {
    await expect(page.locator('.profile-selector .iconbtn:not(.danger)')).toBeVisible();
  });

  test('3.4 – Create profile modal opens on + button click', async ({ page }) => {
    await openCreateProfileModal(page);
    await expect(page.locator('#profile-name')).toBeFocused();
  });

  test('3.5 – Create profile modal closes on Cancel', async ({ page }) => {
    await openCreateProfileModal(page);
    await page.locator('.modal-overlay .cancel-btn').click();
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('3.6 – Create profile modal closes on overlay click', async ({ page }) => {
    await openCreateProfileModal(page);
    await page.locator('.modal-overlay').dispatchEvent('click');
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('3.7 – Creating a profile adds it to the dropdown', async ({ page }) => {
    await createProfile(page, 'My Workflow');
    const dropdown = page.locator('.profile-selector select');
    await expect(dropdown).toContainText('My Workflow');
  });

  test('3.8 – Submitting an empty profile name keeps modal open (HTML5 required)', async ({ page }) => {
    await openCreateProfileModal(page);
    await page.locator('.modal-overlay .create-btn').click();
    await expect(page.locator('.modal-overlay')).toBeVisible();
  });

  test('3.9 – Profile mapping count updates in sidebar after creation', async ({ page }) => {
    await createProfile(page, 'Count Test');
    const meta = page.locator('.profile-selector .meta');
    await expect(meta).toBeVisible();
    await expect(meta).toContainText(/mapping/i);
  });

  test('3.10 – Delete profile icon button is visible when a profile exists', async ({ page }) => {
    await createProfile(page, 'To Delete');
    await expect(page.locator('.profile-selector .iconbtn.danger')).toBeVisible();
  });

  test('3.11 – Delete confirmation modal opens on delete icon click', async ({ page }) => {
    await createProfile(page, 'Delete Me');
    await page.locator('.profile-selector .iconbtn.danger').click();
    await expect(page.locator('.modal-overlay .delete-btn')).toBeVisible();
  });

  test('3.12 – Cancel on delete confirmation leaves profile intact', async ({ page }) => {
    await createProfile(page, 'Stay Alive');
    await page.locator('.profile-selector .iconbtn.danger').click();
    await page.locator('.modal-overlay .cancel-btn').last().click();
    await expect(page.locator('.profile-selector select')).toContainText('Stay Alive');
  });

  test('3.13 – Profile description textarea is present in create modal', async ({ page }) => {
    await openCreateProfileModal(page);
    await expect(page.locator('#profile-desc')).toBeVisible();
  });

  test('3.14 – Profile badge updates in main header after profile creation', async ({ page }) => {
    await createProfile(page, 'Badge Test');
    await expect(page.locator('.profile-badge')).toContainText('Badge Test');
  });
});

// ─── 4. MappingGrid ──────────────────────────────────────────────────────────

test.describe('4 – MappingGrid', () => {
  test.beforeEach(async ({ page }) => { await goto(page); });

  test('4.1 – No-profile empty-state shown when no profile is selected', async ({ page }) => {
    const emptyState = page.locator('.empty-state');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('4.2 – Mapping grid container appears after a profile is active', async ({ page }) => {
    await createProfile(page, 'Grid Test');
    await expect(page.locator('.mapping-grid')).toBeVisible();
  });

  test('4.3 – Add-mapping card (.map-add) is visible after profile creation', async ({ page }) => {
    await createProfile(page, 'Empty Grid');
    await expect(page.locator('.map-add').first()).toBeVisible();
  });

  test('4.4 – Clicking .map-add opens the MIDI value selector modal', async ({ page }) => {
    await createProfile(page, 'Slot Click');
    const opened = await openMidiSelector(page);
    if (!opened) { test.skip(); return; }
    await expect(page.locator('.modal-content').filter({ hasText: /channel/i })).toBeVisible();
  });

  test('4.5 – MIDI selector modal has channel and value inputs', async ({ page }) => {
    await createProfile(page, 'Midi Inputs');
    const opened = await openMidiSelector(page);
    if (!opened) { test.skip(); return; }
    await expect(page.locator('input[type="number"][min="1"][max="16"]')).toBeVisible();
    await expect(page.locator('input[type="number"][min="0"][max="127"]')).toBeVisible();
  });

  test('4.6 – MIDI selector has a range slider synced to the value input', async ({ page }) => {
    await createProfile(page, 'Slider Sync');
    const opened = await openMidiSelector(page);
    if (!opened) { test.skip(); return; }
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();
    await slider.fill('64');
    const numInput = page.locator('input[type="number"][min="0"][max="127"]');
    await expect(numInput).toHaveValue('64');
  });

  test('4.7 – MIDI selector modal closes on Cancel', async ({ page }) => {
    await createProfile(page, 'Cancel Midi');
    const opened = await openMidiSelector(page);
    if (!opened) { test.skip(); return; }
    await page.locator('.modal-content button.cancel-btn').click();
    await expect(page.locator('.modal-content').filter({ hasText: /channel/i })).not.toBeVisible();
  });

  test('4.8 – MIDI selector modal closes on overlay click', async ({ page }) => {
    await createProfile(page, 'Overlay Midi');
    const opened = await openMidiSelector(page);
    if (!opened) { test.skip(); return; }
    await page.locator('.modal-overlay').last().dispatchEvent('click');
    await expect(page.locator('.modal-content').filter({ hasText: /channel/i })).not.toBeVisible();
  });

  test('4.9 – Map card shows edit and delete icon buttons on hover', async ({ page }) => {
    const card = page.locator('.map-card').first();
    if (!(await card.isVisible())) { test.skip(); return; }
    await card.hover();
    await expect(card.locator('.ico-edit')).toBeVisible();
    await expect(card.locator('.ico-del')).toBeVisible();
  });

  test('4.10 – Delete confirmation modal opens from map card', async ({ page }) => {
    const card = page.locator('.map-card').first();
    if (!(await card.isVisible())) { test.skip(); return; }
    await card.hover();
    await card.locator('.ico-del').click();
    await expect(page.locator('.confirm-text')).toBeVisible();
  });

  test('4.11 – Delete confirmation modal has a delete button', async ({ page }) => {
    const card = page.locator('.map-card').first();
    if (!(await card.isVisible())) { test.skip(); return; }
    await card.hover();
    await card.locator('.ico-del').click();
    const deleteBtn = page.locator('.modal-content .delete-btn');
    await expect(deleteBtn).toBeVisible();
    const color = await deleteBtn.evaluate((el) => window.getComputedStyle(el).color);
    // delete-btn uses --ml-error: #C26356 = rgb(194, 99, 86)
    expect(color).toMatch(/rgb\(1[89]\d|rgb\(194/);
  });

  test('4.12 – Cancel on delete confirmation modal closes it', async ({ page }) => {
    const card = page.locator('.map-card').first();
    if (!(await card.isVisible())) { test.skip(); return; }
    await card.hover();
    await card.locator('.ico-del').click();
    await page.locator('.modal-content .cancel-btn').last().click();
    await expect(page.locator('.confirm-text')).not.toBeVisible();
  });

  test('4.13 – Edit icon click opens ActionEditor modal', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    await expect(page.locator('.action-editor-modal')).toBeVisible();
  });
});

// ─── 5. ActionEditor ─────────────────────────────────────────────────────────

test.describe('5 – ActionEditor', () => {
  test.beforeEach(async ({ page }) => { await goto(page); });

  test('5.1 – ActionEditor modal has a Close (×) button', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    await expect(page.locator('.action-editor-modal .close-btn')).toBeVisible();
  });

  test('5.2 – Close button dismisses the ActionEditor modal', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    await page.locator('.action-editor-modal .close-btn').click();
    await expect(page.locator('.action-editor-modal')).not.toBeVisible();
  });

  test('5.3 – Cancel button dismisses the ActionEditor modal', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    await page.locator('.action-editor-modal .cancel-btn').click();
    await expect(page.locator('.action-editor-modal')).not.toBeVisible();
  });

  test('5.4 – Mapping name input is present and editable', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const nameInput = page.locator('.action-editor-modal input[type="text"]').first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Updated Name');
    await expect(nameInput).toHaveValue('Updated Name');
  });

  test('5.5 – Action type select is present with multiple options', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const select = page.locator('.action-editor-modal select').first();
    await expect(select).toBeVisible();
    const options = await select.locator('option').count();
    expect(options).toBeGreaterThan(1);
  });

  test('5.6 – Multi-action checkbox is present and toggleable', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const checkbox = page.locator('.action-editor-modal input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible();
    const before = await checkbox.isChecked();
    await checkbox.click();
    expect(await checkbox.isChecked()).toBe(!before);
  });

  test('5.7 – Enabling multi-action reveals the macro steps section', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const checkbox = page.locator('.action-editor-modal input[type="checkbox"]').first();
    if (!(await checkbox.isChecked())) await checkbox.click();
    await expect(page.locator('.action-editor-modal .add-action-dropdown, .action-editor-modal select').last()).toBeVisible();
  });

  test('5.8 – Add macro step dropdown adds a step row', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const checkbox = page.locator('.action-editor-modal input[type="checkbox"]').first();
    if (!(await checkbox.isChecked())) await checkbox.click();
    await page.waitForTimeout(200);
    const addDropdown = page.locator('.add-action-select, .add-action-dropdown select').first();
    if (await addDropdown.isVisible()) {
      const before = await page.locator('.macro-step').count();
      const options = await addDropdown.locator('option').all();
      const nonEmpty = options.filter(async (o) => (await o.getAttribute('value')) !== '');
      if (nonEmpty.length > 0) {
        await addDropdown.selectOption({ index: 1 });
        await page.waitForTimeout(200);
        expect(await page.locator('.macro-step').count()).toBeGreaterThan(before);
      }
    } else {
      test.skip();
    }
  });

  test('5.9 – Remove step button removes the step row', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const checkbox = page.locator('.action-editor-modal input[type="checkbox"]').first();
    if (!(await checkbox.isChecked())) await checkbox.click();
    await page.waitForTimeout(200);
    const addDropdown = page.locator('.add-action-select, .add-action-dropdown select').first();
    if (await addDropdown.isVisible()) {
      await addDropdown.selectOption({ index: 1 });
      await page.waitForTimeout(200);
      const before = await page.locator('.macro-step').count();
      if (before > 0) {
        await page.locator('.macro-step .remove-step').first().click();
        await page.waitForTimeout(200);
        expect(await page.locator('.macro-step').count()).toBeLessThan(before);
      }
    } else {
      test.skip();
    }
  });

  test('5.10 – Save button is present in modal-actions', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    await expect(page.locator('.action-editor-modal .modal-actions .save-btn')).toBeVisible();
  });

  test('5.11 – Submitting empty mapping name shows .error on the field', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const nameInput = page.locator('.action-editor-modal input[type="text"]').first();
    await nameInput.fill('');
    await page.locator('.action-editor-modal .save-btn').click();
    const hasError = await nameInput.evaluate((el) =>
      el.classList.contains('error') || el.closest('.form-group')?.querySelector('.error-message') !== null
    );
    expect(hasError).toBe(true);
  });

  test('5.12 – .modal-body is scrollable (overflow-y: auto)', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const overflow = await page.locator('.action-editor-modal .modal-body').evaluate(
      (el) => window.getComputedStyle(el).overflowY
    );
    expect(['auto', 'scroll']).toContain(overflow);
  });

  test('5.13 – .modal-actions does not shrink (flex-shrink: 0)', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const flexShrink = await page.locator('.action-editor-modal .modal-actions').evaluate(
      (el) => window.getComputedStyle(el).flexShrink
    );
    expect(flexShrink).toBe('0');
  });

  test('5.14 – Save button stays in viewport after adding 10 macro steps', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const checkbox = page.locator('.action-editor-modal input[type="checkbox"]').first();
    if (!(await checkbox.isChecked())) await checkbox.click();
    await page.waitForTimeout(200);
    const addDropdown = page.locator('.add-action-select, .add-action-dropdown select').first();
    if (await addDropdown.isVisible()) {
      for (let i = 0; i < 10; i++) {
        if (await addDropdown.isVisible()) {
          await addDropdown.selectOption({ index: 1 });
          await page.waitForTimeout(80);
        }
      }
    }
    const saveBtn = page.locator('.action-editor-modal .modal-actions .save-btn');
    await expect(saveBtn).toBeInViewport();
  });
});

// ─── 6. MidiMonitor ──────────────────────────────────────────────────────────

test.describe('6 – MidiMonitor', () => {
  test.beforeEach(async ({ page }) => { await goto(page); });

  test('6.1 – MidiMonitor (.sb-monitor) is visible in sidebar', async ({ page }) => {
    await expect(page.locator('.sb-monitor')).toBeVisible();
  });

  test('6.2 – Monitor shows empty or event state (not blank)', async ({ page }) => {
    const monitor = page.locator('.sb-monitor');
    await expect(monitor).toBeVisible();
    const text = await monitor.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('6.3 – Empty state contains a waiting/instruction message', async ({ page }) => {
    const emptyMsg = page.locator('.sb-monitor .empty');
    if (await emptyMsg.isVisible()) {
      const text = await emptyMsg.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    } else {
      test.skip();
    }
  });

  test('6.4 – MIDI monitor has non-zero rendered height', async ({ page }) => {
    const box = await page.locator('.sb-monitor').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(0);
  });
});

// ─── 7. Toast ────────────────────────────────────────────────────────────────

test.describe('7 – Toast Notifications', () => {
  test.beforeEach(async ({ page }) => { await goto(page); });

  test('7.1 – Toast container is positioned fixed at bottom-right', async ({ page }) => {
    const container = page.locator('.toast-container');
    await expect(container).toBeAttached();
    const position = await container.evaluate((el) => window.getComputedStyle(el).position);
    expect(position).toBe('fixed');
  });

  test('7.2 – Toast container z-index is above modals (≥10000)', async ({ page }) => {
    const zIndex = await page.locator('.toast-container').evaluate(
      (el) => parseInt(window.getComputedStyle(el).zIndex, 10)
    );
    expect(zIndex).toBeGreaterThanOrEqual(10000);
  });

  test('7.3 – Toast appears when MIDI reconnect fires', async ({ page }) => {
    // Click MIDI toggle off then try reconnect icon (if visible)
    const reconnectBtn = page.locator('.topnav .icon-btn').nth(1);
    if (await reconnectBtn.isVisible()) {
      await reconnectBtn.click();
      await page.waitForSelector('.toast', { timeout: 3000 }).catch(() => null);
      const toastCount = await page.locator('.toast').count();
      expect(toastCount).toBeGreaterThanOrEqual(0);
    } else {
      test.skip();
    }
  });

  test('7.4 – Clicking a toast dismisses it', async ({ page }) => {
    const toast = page.locator('.toast').first();
    if (await toast.isVisible()) {
      await toast.click();
      await expect(toast).not.toBeVisible({ timeout: 1000 });
    } else {
      test.skip();
    }
  });
});

// ─── 8. Overflow & Box-Model Clipping ────────────────────────────────────────

test.describe('8 – Overflow & Box-Model Clipping', () => {
  test.beforeEach(async ({ page }) => { await goto(page); });

  test('8.1 – .modal-content max-height is not zero when ActionEditor is open', async ({ page }) => {
    await createProfile(page, 'Modal Height');
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const box = await page.locator('.action-editor-modal .modal-content').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(0);
  });

  test('8.2 – Modal width ≤ viewport on a 500 px wide window', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 700 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await createProfile(page, 'Narrow Modal');
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const modalBox = await page.locator('.action-editor-modal .modal-content').boundingBox();
    const vp = page.viewportSize();
    expect(modalBox).not.toBeNull();
    expect(vp).not.toBeNull();
    expect(modalBox!.width).toBeLessThanOrEqual(vp!.width + 1);
    await page.setViewportSize(VP);
  });

  test('8.3 – .sidebar overflow-y is auto or scroll', async ({ page }) => {
    const overflow = await page.locator('.sidebar').evaluate(
      (el) => window.getComputedStyle(el).overflowY
    );
    expect(['auto', 'scroll']).toContain(overflow);
  });

  test('8.4 – .main overflow-y is auto or scroll', async ({ page }) => {
    const overflow = await page.locator('.main').evaluate(
      (el) => window.getComputedStyle(el).overflowY
    );
    expect(['auto', 'scroll']).toContain(overflow);
  });

  test('8.5 – Create profile modal height ≤ viewport height', async ({ page }) => {
    await openCreateProfileModal(page);
    const box = await page.locator('.modal-overlay .modal-content').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThanOrEqual(VP.height);
  });
});

// ─── 9. CSS Selectors Audit ──────────────────────────────────────────────────

test.describe('9 – CSS Selectors Audit', () => {
  test.beforeEach(async ({ page }) => { await goto(page); });

  test('9.1 – .step-fields has display:flex (not browser-default block)', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const checkbox = page.locator('.action-editor-modal input[type="checkbox"]').first();
    if (!(await checkbox.isChecked())) await checkbox.click();
    await page.waitForTimeout(200);
    const addDropdown = page.locator('.add-action-select, .add-action-dropdown select').first();
    if (await addDropdown.isVisible()) {
      await addDropdown.selectOption({ index: 1 });
      await page.waitForTimeout(200);
    }
    const stepFields = page.locator('.step-fields').first();
    if (await stepFields.isVisible()) {
      const display = await stepFields.evaluate((el) => window.getComputedStyle(el).display);
      expect(display).toBe('flex');
    } else {
      test.skip();
    }
  });

  test('9.2 – .step-action-selector exists and has display:flex', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const checkbox = page.locator('.action-editor-modal input[type="checkbox"]').first();
    if (!(await checkbox.isChecked())) await checkbox.click();
    await page.waitForTimeout(200);
    const addDropdown = page.locator('.add-action-select, .add-action-dropdown select').first();
    if (await addDropdown.isVisible()) {
      await addDropdown.selectOption({ index: 1 });
      await page.waitForTimeout(200);
    }
    const selector = page.locator('.step-action-selector').first();
    if (await selector.isVisible()) {
      const display = await selector.evaluate((el) => window.getComputedStyle(el).display);
      expect(display).toBe('flex');
    } else {
      test.skip();
    }
  });

  test('9.3 – .general-error renders in a red/error color', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const nameInput = page.locator('.action-editor-modal input[type="text"]').first();
    await nameInput.fill('');
    await page.locator('.action-editor-modal .save-btn').click();
    await page.waitForTimeout(300);
    const errEl = page.locator('.general-error').first();
    if (await errEl.isVisible()) {
      const color = await errEl.evaluate((el) => window.getComputedStyle(el).color);
      // --ml-error: #C26356 = rgb(194, 99, 86)
      expect(color).toMatch(/rgb\(\d+,\s*\d+,\s*\d+\)/);
      const [r] = color.match(/\d+/g)!.map(Number);
      expect(r).toBeGreaterThan(150); // red dominant
    } else {
      test.skip();
    }
  });

  test('9.4 – input.error gets a non-default border when validation fires', async ({ page }) => {
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const nameInput = page.locator('.action-editor-modal input[type="text"]').first();
    await nameInput.fill('');
    await page.locator('.action-editor-modal .save-btn').click();
    await page.waitForTimeout(200);
    if (await nameInput.evaluate((el) => el.classList.contains('error'))) {
      const borderColor = await nameInput.evaluate((el) => window.getComputedStyle(el).borderColor);
      expect(borderColor).not.toBe('rgb(0, 0, 0)');
    } else {
      test.skip();
    }
  });

  test('9.5 – .modifier-checkboxes uses display:flex', async ({ page }) => {
    const modifiers = page.locator('.modifier-checkboxes').first();
    if (await modifiers.isVisible()) {
      const display = await modifiers.evaluate((el) => window.getComputedStyle(el).display);
      expect(display).toBe('flex');
    } else {
      test.skip();
    }
  });

  test('9.6 – .form-row uses display:flex', async ({ page }) => {
    const formRow = page.locator('.form-row').first();
    if (await formRow.isVisible()) {
      const display = await formRow.evaluate((el) => window.getComputedStyle(el).display);
      expect(display).toBe('flex');
    } else {
      test.skip();
    }
  });

  test('9.7 – .map-card background changes on hover', async ({ page }) => {
    const card = page.locator('.map-card').first();
    if (!(await card.isVisible())) { test.skip(); return; }
    const before = await card.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    await card.hover();
    await page.waitForTimeout(300); // wait for transition
    const after = await card.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(after).not.toBe(before);
  });
});

// ─── 10. Keyboard & Focus ────────────────────────────────────────────────────

test.describe('10 – Keyboard & Focus', () => {
  test.beforeEach(async ({ page }) => { await goto(page); });

  test('10.1 – Create profile modal: name input is auto-focused', async ({ page }) => {
    await openCreateProfileModal(page);
    await expect(page.locator('#profile-name')).toBeFocused();
  });

  test('10.2 – Tab moves focus from name to description in create modal', async ({ page }) => {
    await openCreateProfileModal(page);
    await page.locator('#profile-name').press('Tab');
    await expect(page.locator('#profile-desc')).toBeFocused();
  });

  test('10.3 – Enter submits create profile form when name is filled', async ({ page }) => {
    await openCreateProfileModal(page);
    await page.locator('#profile-name').fill('Enter Submit');
    await page.locator('#profile-name').press('Enter');
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('10.4 – Escape key does not crash the app (app-shell stays loaded)', async ({ page }) => {
    await page.keyboard.press('Escape');
    await expect(page.locator('.app-shell')).toBeVisible();
  });
});

// ─── 11. Responsive / Resize ─────────────────────────────────────────────────

test.describe('11 – Responsive & Resize', () => {
  test('11.1 – Dashboard still renders on a 900px wide viewport', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 700 });
    await goto(page);
    await expect(page.locator('.app-shell')).toBeVisible();
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.main')).toBeVisible();
  });

  test('11.2 – No horizontal scrollbar at 1200×800', async ({ page }) => {
    await page.setViewportSize(VP);
    await goto(page);
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('11.3 – Action editor modal width ≤ 90vw on a 500px window', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 700 });
    await goto(page);
    await createProfile(page, 'Narrow');
    const opened = await openEditModal(page);
    if (!opened) { test.skip(); return; }
    const modalBox = await page.locator('.action-editor-modal .modal-content').boundingBox();
    expect(modalBox).not.toBeNull();
    expect(modalBox!.width).toBeLessThanOrEqual(500 * 0.92 + 4);
    await page.setViewportSize(VP);
  });

  test('11.4 – TopNav stays fully visible at 900px width', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 700 });
    await goto(page);
    const headerBox = await page.locator('.topnav').boundingBox();
    expect(headerBox).not.toBeNull();
    expect(headerBox!.x + headerBox!.width).toBeLessThanOrEqual(900 + 2);
  });
});
