/**
 * Tauri v2 IPC mock for Playwright / Vite-only environments.
 *
 * Injected as a page init script before the app loads. Implements
 * window.__TAURI_INTERNALS__ with an in-memory state store so that all
 * invoke() calls resolve correctly without a running Rust backend.
 */
(function () {
  const callbacks = {};
  let nextId = 1;

  const store = {
    profiles: {},
    activeProfileId: null,
  };

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function activeProfile() {
    return store.activeProfileId ? store.profiles[store.activeProfileId] : null;
  }

  const handlers = {
    // ── MIDI ────────────────────────────────────────────────────────────────
    initialize_midi: () => ['Mock MIDI Device'],
    get_midi_devices: () => ['Mock MIDI Device'],
    reconnect_midi: () => ['Mock MIDI Device'],

    // ── App info ─────────────────────────────────────────────────────────────
    'plugin:app|version': () => '0.2.0-test',
    'plugin:app|name': () => 'MIDI-Link',

    // ── Profiles ─────────────────────────────────────────────────────────────
    get_profiles: () => Object.values(store.profiles),

    get_active_profile: () => {
      const p = activeProfile();
      if (!p) return null;
      return { ...p, mappings: { ...p.mappings } };
    },

    create_profile: ({ name, description }) => {
      const id = uuid();
      store.profiles[id] = {
        id,
        name,
        description: description || '',
        mappings: {},
        smart_switch_rules: [],
      };
      store.activeProfileId = id;
      return id;
    },

    set_active_profile: ({ profileId }) => {
      if (store.profiles[profileId]) store.activeProfileId = profileId;
      return null;
    },

    delete_profile: ({ profileId }) => {
      delete store.profiles[profileId];
      if (store.activeProfileId === profileId) {
        const remaining = Object.keys(store.profiles);
        store.activeProfileId = remaining.length ? remaining[0] : null;
      }
      return null;
    },

    // ── Mappings ─────────────────────────────────────────────────────────────
    add_mapping_to_profile: ({ mapping }) => {
      const p = activeProfile();
      if (p) {
        const key = mapping.midi_key || `${mapping.channel}:${mapping.note ?? mapping.cc}`;
        p.mappings[key] = mapping;
      }
      return null;
    },

    delete_mapping: ({ mappingId }) => {
      for (const p of Object.values(store.profiles)) {
        for (const [key, m] of Object.entries(p.mappings)) {
          if (m.id === mappingId) {
            delete p.mappings[key];
            break;
          }
        }
      }
      return null;
    },

    // ── Actions ──────────────────────────────────────────────────────────────
    execute_action: () => null,

    // ── Import / Export ──────────────────────────────────────────────────────
    check_profile_security: () => [],
    import_profile: () => uuid(),
    export_profile: () => null,

    // ── Dialog plugin ────────────────────────────────────────────────────────
    'plugin:dialog|open': () => '/mock/path/file.json',
    'plugin:dialog|save': () => '/mock/path/export.json',
    'plugin:dialog|ask': () => true,
    'plugin:dialog|confirm': () => true,
    'plugin:dialog|message': () => null,

    // ── Opener plugin ────────────────────────────────────────────────────────
    'plugin:opener|open_url': () => null,
    'plugin:opener|open_path': () => null,
    'plugin:shell|open': () => null,
  };

  function resolveCallback(id, value) {
    const entry = callbacks[id];
    if (entry) {
      entry.callback(value);
      if (entry.once) delete callbacks[id];
    }
  }

  window.__TAURI_INTERNALS__ = {
    transformCallback: function (callback, once) {
      const id = nextId++;
      callbacks[id] = { callback, once: !!once };
      return id;
    },

    ipc: function ({ cmd, callback: cbId, error: errId, payload }) {
      const handler = handlers[cmd];
      if (handler) {
        try {
          const result = handler(payload || {});
          // Microtask delay mirrors real async IPC behaviour
          Promise.resolve(result).then((r) => resolveCallback(cbId, r));
        } catch (e) {
          Promise.resolve().then(() => resolveCallback(errId, String(e)));
        }
      } else {
        // Unknown command — resolve with null so UI doesn't hang
        Promise.resolve().then(() => resolveCallback(cbId, null));
      }
    },

    metadata: {
      currentWindow: { label: 'main' },
      currentWebview: { label: 'main', windowLabel: 'main' },
    },
  };
})();
