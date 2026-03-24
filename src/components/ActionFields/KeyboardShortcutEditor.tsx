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
    <div className="action-fields">
      <div className="form-group">
        <label>Modifiers:</label>
        <div className="modifier-buttons">
          {['ctrl', 'alt', 'shift', 'meta'].map(modifier => (
            <button
              key={modifier}
              type="button"
              className={`modifier-btn ${modifiers.includes(modifier) ? 'active' : ''}`}
              onClick={() => handleModifierToggle(modifier)}
            >
              {modifier.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label>Keys:</label>
        <div className="key-input-row">
          <input
            type="text"
            value={keyInput}
            onChange={(e) => onKeyInputChange(e.target.value)}
            placeholder="Enter key (e.g., a, space, enter)"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddKey();
              }
            }}
          />
          <button type="button" onClick={handleAddKey}>Add</button>
        </div>
        <div className="selected-keys">
          {keys.map(key => (
            <span key={key} className="key-tag">
              {key}
              <button
                type="button"
                onClick={() => handleRemoveKey(key)}
                className="remove-key"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {errors.keys && <div className="error-message">{errors.keys}</div>}
      </div>
    </div>
  );
};

export default KeyboardShortcutEditor;