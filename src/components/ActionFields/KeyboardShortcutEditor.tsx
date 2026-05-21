import React, { useId, useState } from 'react';

interface KeyboardShortcutEditorProps {
  keys: string[];
  modifiers: string[];
  keyInput: string;
  errors: Record<string, string>;
  onKeysChange: (keys: string[]) => void;
  onModifiersChange: (modifiers: string[]) => void;
  onKeyInputChange: (keyInput: string) => void;
  onErrorClear: (field: string) => void;
}

const MODIFIER_KEYS = new Set(['control', 'ctrl', 'alt', 'shift', 'meta', 'os', 'super']);
const MAX_KEY_LENGTH = 16;

function normalizeKey(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (key === ' ') return 'space';
  if (key === 'escape') return 'esc';
  if (key === 'arrowup') return 'up';
  if (key === 'arrowdown') return 'down';
  if (key === 'arrowleft') return 'left';
  if (key === 'arrowright') return 'right';
  return key;
}

function isValidKey(key: string): boolean {
  if (!key || key.length > MAX_KEY_LENGTH) return false;
  if (MODIFIER_KEYS.has(key)) return false;
  return /^[a-z0-9_\-+=\[\]{};:'",.<>/?\\|`~!@#$%^&*()]+$|^(space|enter|tab|backspace|esc|delete|insert|home|end|pageup|pagedown|up|down|left|right|f[1-9]|f1[0-2]|capslock|numlock|scrolllock|printscreen|pause)$/.test(key);
}

const KeyboardShortcutEditor: React.FC<KeyboardShortcutEditorProps> = ({
  keys,
  modifiers,
  keyInput,
  errors,
  onKeysChange,
  onModifiersChange,
  onKeyInputChange,
  onErrorClear,
}) => {
  const inputId = useId();
  const [captureMode, setCaptureMode] = useState(false);

  const handleModifierToggle = (modifier: string) => {
    const newModifiers = modifiers.includes(modifier)
      ? modifiers.filter(m => m !== modifier)
      : [...modifiers, modifier];
    onModifiersChange(newModifiers);
    if (errors.keys) onErrorClear('keys');
  };

  const addKey = (raw: string) => {
    const key = normalizeKey(raw);
    if (!isValidKey(key) || keys.includes(key)) return false;
    onKeysChange([...keys, key]);
    onKeyInputChange('');
    if (errors.keys) onErrorClear('keys');
    return true;
  };

  const handleAddKey = () => {
    addKey(keyInput);
  };

  const handleRemoveKey = (key: string) => {
    onKeysChange(keys.filter(k => k !== key));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (captureMode) {
      if (MODIFIER_KEYS.has(e.key.toLowerCase())) return;
      e.preventDefault();
      addKey(e.key);
      setCaptureMode(false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKey();
    }
  };

  return (
    <div className="space-y-4">
      {/* Modifiers */}
      <div className="space-y-2">
        <label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Modifiers</label>
        <div data-testid="modifier-checkboxes" className="flex flex-wrap gap-2">
          {['ctrl', 'alt', 'shift', 'meta'].map(modifier => {
            const active = modifiers.includes(modifier);
            return (
              <button
                key={modifier}
                type="button"
                aria-pressed={active}
                onClick={() => handleModifierToggle(modifier)}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase tracking-widest border transition-all ${
                  active
                    ? 'bg-primary-container/20 border-primary-container text-primary-container'
                    : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:border-primary-container/40 hover:text-on-surface'
                }`}
              >
                {modifier}
              </button>
            );
          })}
        </div>
      </div>

      {/* Keys */}
      <div className="space-y-2">
        <label htmlFor={inputId} className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Keys</label>
        <div className="flex gap-2">
          <input
            id={inputId}
            type="text"
            value={keyInput}
            maxLength={MAX_KEY_LENGTH}
            onChange={(e) => onKeyInputChange(e.target.value)}
            onBlur={() => setCaptureMode(false)}
            placeholder={captureMode ? 'press any key…' : 'e.g. a, space, enter'}
            onKeyDown={handleInputKeyDown}
            className="flex-1 min-w-0 bg-surface-container-high border border-outline-variant/30 focus:border-primary-container text-on-surface text-sm px-3 py-1.5 rounded-lg outline-none placeholder:text-on-surface-variant/40"
          />
          <button
            type="button"
            onClick={() => setCaptureMode(c => !c)}
            aria-pressed={captureMode}
            title="Press a key to capture it"
            className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-all flex-shrink-0 ${
              captureMode
                ? 'bg-primary-container/20 border-primary-container text-primary-container'
                : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:border-primary-container/40 hover:text-on-surface'
            }`}
          >
            {captureMode ? 'Listening' : 'Capture'}
          </button>
          <button
            type="button"
            onClick={handleAddKey}
            className="px-4 py-1.5 rounded-lg bg-primary-container/10 border border-primary-container/30 text-primary-container font-bold text-xs hover:bg-primary-container/20 transition-all flex-shrink-0"
          >
            Add
          </button>
        </div>
        {keys.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {keys.map(key => (
              <span
                key={key}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-highest border border-outline-variant/20 font-mono text-xs text-on-surface"
              >
                {key}
                <button
                  type="button"
                  aria-label={`Remove key ${key}`}
                  onClick={() => handleRemoveKey(key)}
                  className="text-on-surface-variant hover:text-error transition-colors leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {errors.keys && <p className="text-xs text-error">{errors.keys}</p>}
      </div>
    </div>
  );
};

export default KeyboardShortcutEditor;
