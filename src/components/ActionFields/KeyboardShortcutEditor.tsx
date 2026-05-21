import React from 'react';

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
  const handleModifierToggle = (modifier: string) => {
    const newModifiers = modifiers.includes(modifier)
      ? modifiers.filter(m => m !== modifier)
      : [...modifiers, modifier];
    onModifiersChange(newModifiers);
    if (errors.keys) onErrorClear('keys');
  };

  const handleAddKey = () => {
    if (keyInput && !keys.includes(keyInput.toLowerCase())) {
      onKeysChange([...keys, keyInput.toLowerCase()]);
      onKeyInputChange('');
      if (errors.keys) onErrorClear('keys');
    }
  };

  const handleRemoveKey = (key: string) => {
    onKeysChange(keys.filter(k => k !== key));
  };

  return (
    <div className="space-y-4">
      {/* Modifiers */}
      <div className="space-y-2">
        <label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Modifiers</label>
        <div data-testid="modifier-checkboxes" className="flex flex-wrap gap-2">
          {['ctrl', 'alt', 'shift', 'meta'].map(modifier => (
            <button
              key={modifier}
              type="button"
              onClick={() => handleModifierToggle(modifier)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase tracking-widest border transition-all ${
                modifiers.includes(modifier)
                  ? 'bg-primary-container/20 border-primary-container text-primary-container'
                  : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:border-primary-container/40 hover:text-on-surface'
              }`}
            >
              {modifier}
            </button>
          ))}
        </div>
      </div>

      {/* Keys */}
      <div className="space-y-2">
        <label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Keys</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={keyInput}
            onChange={(e) => onKeyInputChange(e.target.value)}
            placeholder="e.g. a, space, enter"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddKey();
              }
            }}
            className="flex-1 min-w-0 bg-surface-container-high border border-outline-variant/30 focus:border-primary-container text-on-surface text-sm px-3 py-1.5 rounded-lg outline-none placeholder:text-on-surface-variant/40"
          />
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
