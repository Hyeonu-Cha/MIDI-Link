import React from 'react';
import { MacroStep, Action, SystemCommandType } from '../types';

interface MacroEditorProps {
  macroSteps: MacroStep[];
  isMultiAction: boolean;
  errors: Record<string, string>;
  onMacroStepsChange: (steps: MacroStep[]) => void;
  onMultiActionToggle: (enabled: boolean) => void;
  onErrorClear: (field: string) => void;
}

const MacroEditor: React.FC<MacroEditorProps> = ({
  macroSteps,
  isMultiAction,
  errors,
  onMacroStepsChange,
  onMultiActionToggle,
  onErrorClear,
}) => {
  const updateMacroStep = (index: number, updates: Partial<MacroStep>) => {
    const newSteps = [...macroSteps];
    newSteps[index] = { ...newSteps[index], ...updates };
    onMacroStepsChange(newSteps);
  };

  const removeMacroStep = (index: number) => {
    const newSteps = macroSteps.filter((_, i) => i !== index);
    onMacroStepsChange(newSteps);
  };

  const addMacroStep = (actionType: string) => {
    let newAction: Action;
    switch (actionType) {
      case 'OpenUrl':
        newAction = { OpenUrl: { url: '' } };
        break;
      case 'LaunchApplication':
        newAction = { LaunchApplication: { path: '', args: [] } };
        break;
      case 'KeyboardShortcut':
        newAction = { KeyboardShortcut: { keys: [], modifiers: [] } };
        break;
      case 'TypeText':
        newAction = { TypeText: { text: '' } };
        break;
      case 'SystemCommand':
        newAction = { SystemCommand: { command_type: SystemCommandType.VolumeUp } };
        break;
      default:
        newAction = { OpenUrl: { url: '' } };
    }
    const newStep: MacroStep = {
      action: newAction,
      delay_ms: 500
    };
    onMacroStepsChange([...macroSteps, newStep]);
  };

  const renderStepAction = (step: MacroStep, index: number) => {
    const actionType = Object.keys(step.action)[0];
    const actionData = step.action[actionType as keyof Action];

    if (actionType === 'OpenUrl') {
      const urlData = actionData as { url: string };
      return (
        <div className="step-fields">
          <label>URL:</label>
          <input
            type="url"
            value={urlData.url}
            onChange={(e) => {
              updateMacroStep(index, {
                action: { OpenUrl: { url: e.target.value } }
              });
              const errorKey = `step${index}_url`;
              if (errors[errorKey]) {
                onErrorClear(errorKey);
              }
            }}
            placeholder="https://example.com"
            className={errors[`step${index}_url`] ? 'error' : ''}
          />
          {errors[`step${index}_url`] && <div className="error-message">{errors[`step${index}_url`]}</div>}
        </div>
      );
    }

    if (actionType === 'TypeText') {
      const textData = actionData as { text: string };
      return (
        <div className="step-fields">
          <label>Text:</label>
          <input
            type="text"
            value={textData.text}
            onChange={(e) => {
              updateMacroStep(index, {
                action: { TypeText: { text: e.target.value } }
              });
              const errorKey = `step${index}_text`;
              if (errors[errorKey]) {
                onErrorClear(errorKey);
              }
            }}
            placeholder="Text to type"
            className={errors[`step${index}_text`] ? 'error' : ''}
          />
          {errors[`step${index}_text`] && <div className="error-message">{errors[`step${index}_text`]}</div>}
        </div>
      );
    }

    if (actionType === 'LaunchApplication') {
      const appData = actionData as { path: string; args: string[] };
      return (
        <div className="step-fields">
          <label>Application Path:</label>
          <input
            type="text"
            value={appData.path}
            onChange={(e) => {
              updateMacroStep(index, {
                action: { LaunchApplication: { path: e.target.value, args: appData.args } }
              });
              const errorKey = `step${index}_path`;
              if (errors[errorKey]) {
                onErrorClear(errorKey);
              }
            }}
            placeholder="/path/to/application"
            className={errors[`step${index}_path`] ? 'error' : ''}
          />
          {errors[`step${index}_path`] && <div className="error-message">{errors[`step${index}_path`]}</div>}
        </div>
      );
    }

    if (actionType === 'SystemCommand') {
      const sysData = actionData as { command_type: SystemCommandType };
      return (
        <div className="step-fields">
          <label>System Command:</label>
          <select
            value={sysData.command_type}
            onChange={(e) => {
              updateMacroStep(index, {
                action: { SystemCommand: { command_type: e.target.value as SystemCommandType } }
              });
            }}
          >
            <option value={SystemCommandType.VolumeUp}>Volume Up</option>
            <option value={SystemCommandType.VolumeDown}>Volume Down</option>
            <option value={SystemCommandType.Mute}>Mute</option>
            <option value={SystemCommandType.PlayPause}>Play/Pause</option>
            <option value={SystemCommandType.Screenshot}>Screenshot</option>
          </select>
        </div>
      );
    }

    if (actionType === 'KeyboardShortcut') {
      const kbData = actionData as { keys: string[]; modifiers: string[] };
      return (
        <div className="step-fields">
          <label>Keys (comma-separated):</label>
          <input
            type="text"
            value={kbData.keys.join(', ')}
            onChange={(e) => {
              updateMacroStep(index, {
                action: {
                  KeyboardShortcut: {
                    keys: e.target.value.split(',').map(k => k.trim()).filter(k => k),
                    modifiers: kbData.modifiers
                  }
                }
              });
              const errorKey = `step${index}_keys`;
              if (errors[errorKey]) {
                onErrorClear(errorKey);
              }
            }}
            placeholder="a, b, enter"
            className={errors[`step${index}_keys`] ? 'error' : ''}
          />
          {errors[`step${index}_keys`] && <div className="error-message">{errors[`step${index}_keys`]}</div>}
          <label>Modifiers:</label>
          <div className="modifier-checkboxes">
            {['ctrl', 'alt', 'shift', 'meta'].map(mod => (
              <label key={mod} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={kbData.modifiers.includes(mod)}
                  onChange={(e) => {
                    const modifiers = e.target.checked
                      ? [...kbData.modifiers, mod]
                      : kbData.modifiers.filter(m => m !== mod);
                    updateMacroStep(index, {
                      action: {
                        KeyboardShortcut: {
                          keys: kbData.keys,
                          modifiers
                        }
                      }
                    });
                    const errorKey = `step${index}_keys`;
                    if (errors[errorKey]) {
                      onErrorClear(errorKey);
                    }
                  }}
                />
                {mod}
              </label>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isMultiAction}
            onChange={(e) => {
              onMultiActionToggle(e.target.checked);
              if (!e.target.checked) {
                onMacroStepsChange([]);
              }
            }}
          />
          Enable multiple actions
        </label>
        <div className="help-text">
          Check this to add additional actions that will execute alongside the main action
        </div>
      </div>

      {isMultiAction && (
        <div className="form-group">
          <label>Additional Actions:</label>
          <div className="macro-steps">
            {macroSteps.map((step, index) => (
              <div key={index} className="macro-step">
                <div className="step-header">
                  <span>Additional Action {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeMacroStep(index)}
                    className="remove-step"
                  >
                    Remove
                  </button>
                </div>
                <div className="step-content">
                  <div className="step-action-selector">
                    <label>Action Type:</label>
                    <select
                      value={Object.keys(step.action)[0]}
                      onChange={(e) => {
                        let newAction: Action;
                        switch (e.target.value) {
                          case 'KeyboardShortcut':
                            newAction = { KeyboardShortcut: { keys: [], modifiers: [] } };
                            break;
                          case 'OpenUrl':
                            newAction = { OpenUrl: { url: '' } };
                            break;
                          case 'TypeText':
                            newAction = { TypeText: { text: '' } };
                            break;
                          case 'LaunchApplication':
                            newAction = { LaunchApplication: { path: '', args: [] } };
                            break;
                          case 'SystemCommand':
                            newAction = { SystemCommand: { command_type: SystemCommandType.VolumeUp } };
                            break;
                          default:
                            newAction = { OpenUrl: { url: '' } };
                        }
                        updateMacroStep(index, { action: newAction });
                      }}
                    >
                      <option value="KeyboardShortcut">Keyboard Shortcut</option>
                      <option value="OpenUrl">Open URL</option>
                      <option value="TypeText">Type Text</option>
                      <option value="LaunchApplication">Launch Application</option>
                      <option value="SystemCommand">System Command</option>
                    </select>
                  </div>

                  {renderStepAction(step, index)}

                  <div className="step-delay">
                    <label>Delay after this action (ms):</label>
                    <input
                      type="number"
                      value={step.delay_ms}
                      onChange={(e) => {
                        updateMacroStep(index, { delay_ms: Number(e.target.value) });
                      }}
                      min="0"
                      step="100"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="add-action-dropdown">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addMacroStep(e.target.value);
                    e.target.value = ''; // Reset dropdown
                  }
                }}
                value=""
                className="add-action-select"
              >
                <option value="">+ Add additional action</option>
                <option value="OpenUrl">Open URL</option>
                <option value="LaunchApplication">Launch Application</option>
                <option value="KeyboardShortcut">Keyboard Shortcut</option>
                <option value="TypeText">Type Text</option>
                <option value="SystemCommand">System Command</option>
              </select>
            </div>
          </div>
          {errors.macroSteps && <div className="error-message">{errors.macroSteps}</div>}
          <div className="help-text">
            Additional actions will execute after the main action with optional delays.
            Perfect for combining actions like opening a URL and launching an app!
          </div>
        </div>
      )}
    </>
  );
};

export default MacroEditor;