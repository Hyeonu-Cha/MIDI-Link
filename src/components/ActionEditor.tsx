import { FC } from 'react';
import { Profile, Action, ActionMapping, SystemCommandType, MacroStep } from '../types';
import { profileApi } from '../services/api';
import { useActionForm } from '../hooks/useActionForm';
import { ActionValidator } from '../utils/ActionValidator';
import ActionFieldsRenderer from './ActionFields/ActionFieldsRenderer';

/** Extract the type key and payload from a discriminated union Action. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getActionData(action: Action): { type: string; data: Record<string, any> } {
  const type = Object.keys(action)[0];
  // The Action union's inner objects have heterogeneous value types (string, number, string[]),
  // so we use `any` here rather than scattering casts at every usage site.
  const data = Object.values(action)[0];
  return { type, data };
}

interface ActionEditorProps {
  mappingKey: string | null;
  profile: Profile | null;
  editingMapping?: ActionMapping | null;
  onClose: () => void;
  onSave: () => void;
}

const ActionEditor: FC<ActionEditorProps> = ({
  mappingKey,
  profile,
  editingMapping,
  onClose,
  onSave,
}) => {
  const { formState, updateField, setErrors, clearError } = useActionForm(editingMapping);

  const buildAction = (): Action => {
    const {
      actionType, keys, modifiers, appPath, appArgs, url, text,
      mouseButton, mouseX, mouseY, systemCommand, scriptType, scriptContent,
      isMultiAction, macroSteps,
    } = formState;

    let primaryAction: Action;
    switch (actionType) {
      case 'KeyboardShortcut':
        primaryAction = { KeyboardShortcut: { keys, modifiers } };
        break;
      case 'LaunchApplication':
        primaryAction = { LaunchApplication: { path: appPath, args: appArgs ? appArgs.split(' ') : [] } };
        break;
      case 'OpenUrl':
        primaryAction = { OpenUrl: { url } };
        break;
      case 'TypeText':
        primaryAction = { TypeText: { text } };
        break;
      case 'MouseClick':
        primaryAction = { MouseClick: { button: mouseButton, x: mouseX, y: mouseY } };
        break;
      case 'SystemCommand':
        primaryAction = { SystemCommand: { command_type: systemCommand } };
        break;
      case 'ScriptExecution':
        primaryAction = { ScriptExecution: { script_type: scriptType, content: scriptContent } };
        break;
      default:
        primaryAction = { KeyboardShortcut: { keys: [], modifiers: [] } };
    }

    if (isMultiAction && macroSteps.length > 0) {
      const allSteps: MacroStep[] = [{ action: primaryAction, delay_ms: 0 }, ...macroSteps];
      return { MultiStepMacro: { steps: allSteps } };
    }

    return primaryAction;
  };

  const handleSave = async () => {
    if (!mappingKey || !profile) return;

    const validator = new ActionValidator();
    const validationErrors = validator.validate(
      formState.actionType, formState, formState.isMultiAction, formState.macroSteps
    );
    setErrors(validationErrors);
    if (validator.hasErrors()) return;

    const [channel, noteOrCc] = mappingKey.split(':').map(Number);
    const mapping: ActionMapping = {
      id: editingMapping ? editingMapping.id : `${profile.id}_${mappingKey}`,
      name: formState.mappingName || `Mapping ${mappingKey}`,
      midi_channel: channel,
      midi_note_or_cc: noteOrCc,
      action: buildAction(),
    };

    try {
      if (editingMapping) {
        await profileApi.deleteMapping(editingMapping.id);
        try {
          await profileApi.addMappingToProfile(mapping);
        } catch {
          // Rollback: re-add the original mapping
          await profileApi.addMappingToProfile(editingMapping);
          setErrors({ general: 'Failed to save mapping. Original mapping restored.' });
          return;
        }
      } else {
        await profileApi.addMappingToProfile(mapping);
      }
      onSave();
    } catch {
      setErrors({ general: 'Failed to save mapping. Please try again.' });
    }
  };

  const updateStep = (index: number, updated: MacroStep) => {
    const newSteps = [...formState.macroSteps];
    newSteps[index] = updated;
    updateField('macroSteps', newSteps);
  };

  const removeStep = (index: number) => {
    updateField('macroSteps', formState.macroSteps.filter((_, i) => i !== index));
  };

  const addStep = (actionType: string) => {
    let newAction: Action;
    switch (actionType) {
      case 'OpenUrl':          newAction = { OpenUrl: { url: '' } }; break;
      case 'LaunchApplication': newAction = { LaunchApplication: { path: '', args: [] } }; break;
      case 'KeyboardShortcut':  newAction = { KeyboardShortcut: { keys: [], modifiers: [] } }; break;
      case 'TypeText':          newAction = { TypeText: { text: '' } }; break;
      case 'SystemCommand':     newAction = { SystemCommand: { command_type: SystemCommandType.VolumeUp } }; break;
      default:                  newAction = { OpenUrl: { url: '' } };
    }
    updateField('macroSteps', [...formState.macroSteps, { action: newAction, delay_ms: 500 }]);
  };

  return (
    <div className="action-editor-modal">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content">
        <div className="modal-header">
          <h3>{editingMapping ? 'Edit Action Mapping' : 'Create Action Mapping'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="modal-body">

            <div className="form-group">
              <label>Mapping Name:</label>
              <input
                type="text"
                value={formState.mappingName}
                onChange={(e) => { updateField('mappingName', e.target.value); clearError('mappingName'); }}
                placeholder="Enter a name for this mapping"
                className={formState.errors.mappingName ? 'error' : ''}
              />
              {formState.errors.mappingName && <div className="error-message">{formState.errors.mappingName}</div>}
            </div>

            <div className="form-group">
              <label>Action Type:</label>
              <select value={formState.actionType} onChange={(e) => updateField('actionType', e.target.value)}>
                <option value="KeyboardShortcut">Keyboard Shortcut</option>
                <option value="LaunchApplication">Launch Application</option>
                <option value="OpenUrl">Open URL</option>
                <option value="TypeText">Type Text</option>
                <option value="MouseClick">Mouse Click</option>
                <option value="SystemCommand">System Command</option>
                <option value="ScriptExecution">Script Execution</option>
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formState.isMultiAction}
                  onChange={(e) => {
                    updateField('isMultiAction', e.target.checked);
                    if (!e.target.checked) updateField('macroSteps', []);
                  }}
                />
                Enable multiple actions
              </label>
              <div className="help-text">
                Check this to add additional actions that will execute alongside the main action
              </div>
            </div>

            <ActionFieldsRenderer
              actionType={formState.actionType}
              formData={formState}
              errors={formState.errors}
              onUpdateField={(field, value) => updateField(field as keyof typeof formState, value)}
              onErrorClear={clearError}
            />

            {formState.isMultiAction && (
              <div className="form-group">
                <label>Additional Actions:</label>
                <div className="macro-steps">
                  {formState.macroSteps.map((step, index) => {
                    const { type: stepActionType, data: actionData } = getActionData(step.action);
                    const errPrefix = `step${index}`;

                    return (
                      <div key={index} className="macro-step">
                        <div className="step-header">
                          <span>Additional Action {index + 1}</span>
                          <button type="button" onClick={() => removeStep(index)} className="remove-step">
                            Remove
                          </button>
                        </div>
                        <div className="step-content">
                          <div className="step-action-selector">
                            <label>Action Type:</label>
                            <select
                              value={stepActionType}
                              onChange={(e) => {
                                let newAction: Action;
                                switch (e.target.value) {
                                  case 'KeyboardShortcut':  newAction = { KeyboardShortcut: { keys: [], modifiers: [] } }; break;
                                  case 'OpenUrl':           newAction = { OpenUrl: { url: '' } }; break;
                                  case 'TypeText':          newAction = { TypeText: { text: '' } }; break;
                                  case 'LaunchApplication': newAction = { LaunchApplication: { path: '', args: [] } }; break;
                                  case 'SystemCommand':     newAction = { SystemCommand: { command_type: SystemCommandType.VolumeUp } }; break;
                                  default:                  newAction = { OpenUrl: { url: '' } };
                                }
                                updateStep(index, { ...step, action: newAction });
                              }}
                            >
                              <option value="KeyboardShortcut">Keyboard Shortcut</option>
                              <option value="OpenUrl">Open URL</option>
                              <option value="TypeText">Type Text</option>
                              <option value="LaunchApplication">Launch Application</option>
                              <option value="SystemCommand">System Command</option>
                            </select>
                          </div>

                          {stepActionType === 'OpenUrl' && (
                            <div className="step-fields">
                              <label>URL:</label>
                              <input
                                type="url"
                                value={actionData.url}
                                onChange={(e) => { updateStep(index, { ...step, action: { OpenUrl: { url: e.target.value } } }); clearError(`${errPrefix}_url`); }}
                                placeholder="https://example.com"
                                className={formState.errors[`${errPrefix}_url`] ? 'error' : ''}
                              />
                              {formState.errors[`${errPrefix}_url`] && <div className="error-message">{formState.errors[`${errPrefix}_url`]}</div>}
                            </div>
                          )}

                          {stepActionType === 'TypeText' && (
                            <div className="step-fields">
                              <label>Text:</label>
                              <input
                                type="text"
                                value={actionData.text}
                                onChange={(e) => { updateStep(index, { ...step, action: { TypeText: { text: e.target.value } } }); clearError(`${errPrefix}_text`); }}
                                placeholder="Text to type"
                                className={formState.errors[`${errPrefix}_text`] ? 'error' : ''}
                              />
                              {formState.errors[`${errPrefix}_text`] && <div className="error-message">{formState.errors[`${errPrefix}_text`]}</div>}
                            </div>
                          )}

                          {stepActionType === 'LaunchApplication' && (
                            <div className="step-fields">
                              <label>Application Path:</label>
                              <input
                                type="text"
                                value={actionData.path}
                                onChange={(e) => { updateStep(index, { ...step, action: { LaunchApplication: { path: e.target.value, args: actionData.args } } }); clearError(`${errPrefix}_path`); }}
                                placeholder="C:\Program Files\App\app.exe"
                                className={formState.errors[`${errPrefix}_path`] ? 'error' : ''}
                              />
                              {formState.errors[`${errPrefix}_path`] && <div className="error-message">{formState.errors[`${errPrefix}_path`]}</div>}
                            </div>
                          )}

                          {stepActionType === 'SystemCommand' && (
                            <div className="step-fields">
                              <label>System Command:</label>
                              <select
                                value={actionData.command_type}
                                onChange={(e) => updateStep(index, { ...step, action: { SystemCommand: { command_type: e.target.value as SystemCommandType } } })}
                              >
                                <optgroup label="Media Controls">
                                  <option value={SystemCommandType.VolumeUp}>Volume Up</option>
                                  <option value={SystemCommandType.VolumeDown}>Volume Down</option>
                                  <option value={SystemCommandType.Mute}>Mute</option>
                                  <option value={SystemCommandType.PlayPause}>Play/Pause</option>
                                  <option value={SystemCommandType.NextTrack}>Next Track</option>
                                  <option value={SystemCommandType.PreviousTrack}>Previous Track</option>
                                </optgroup>
                                <optgroup label="System Controls">
                                  <option value={SystemCommandType.BrightnessUp}>Brightness Up</option>
                                  <option value={SystemCommandType.BrightnessDown}>Brightness Down</option>
                                  <option value={SystemCommandType.Sleep}>Sleep</option>
                                  <option value={SystemCommandType.Lock}>Lock Screen</option>
                                  <option value={SystemCommandType.Shutdown}>Shutdown</option>
                                  <option value={SystemCommandType.Restart}>Restart</option>
                                </optgroup>
                                <optgroup label="Window Controls">
                                  <option value={SystemCommandType.MinimizeWindow}>Minimize Window</option>
                                  <option value={SystemCommandType.MaximizeWindow}>Maximize Window</option>
                                  <option value={SystemCommandType.CloseWindow}>Close Window</option>
                                  <option value={SystemCommandType.SwitchDesktop}>Switch Desktop</option>
                                  <option value={SystemCommandType.TaskView}>Task View</option>
                                </optgroup>
                                <optgroup label="Utilities">
                                  <option value={SystemCommandType.Screenshot}>Screenshot</option>
                                  <option value={SystemCommandType.ClipboardCopy}>Copy</option>
                                  <option value={SystemCommandType.ClipboardPaste}>Paste</option>
                                </optgroup>
                              </select>
                            </div>
                          )}

                          {stepActionType === 'KeyboardShortcut' && (
                            <div className="step-fields">
                              <label>Keys (comma-separated):</label>
                              <input
                                type="text"
                                value={actionData.keys.join(', ')}
                                onChange={(e) => {
                                  updateStep(index, { ...step, action: { KeyboardShortcut: { keys: e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean), modifiers: actionData.modifiers } } });
                                  clearError(`${errPrefix}_keys`);
                                }}
                                placeholder="a, b, enter"
                                className={formState.errors[`${errPrefix}_keys`] ? 'error' : ''}
                              />
                              {formState.errors[`${errPrefix}_keys`] && <div className="error-message">{formState.errors[`${errPrefix}_keys`]}</div>}
                              <label>Modifiers:</label>
                              <div className="modifier-checkboxes">
                                {['ctrl', 'alt', 'shift', 'meta'].map(mod => (
                                  <label key={mod} className="checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={actionData.modifiers.includes(mod)}
                                      onChange={(e) => {
                                        const modifiers = e.target.checked
                                          ? [...actionData.modifiers, mod]
                                          : actionData.modifiers.filter((m: string) => m !== mod);
                                        updateStep(index, { ...step, action: { KeyboardShortcut: { keys: actionData.keys, modifiers } } });
                                        clearError(`${errPrefix}_keys`);
                                      }}
                                    />
                                    {mod}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="step-delay">
                            <label>Delay after this action (ms):</label>
                            <input
                              type="number"
                              value={step.delay_ms}
                              onChange={(e) => updateStep(index, { ...step, delay_ms: Number(e.target.value) })}
                              min="0"
                              step="100"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="add-action-dropdown">
                    <select
                      value=""
                      className="add-action-select"
                      onChange={(e) => { if (e.target.value) { addStep(e.target.value); e.target.value = ''; } }}
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
                {formState.errors.macroSteps && <div className="error-message">{formState.errors.macroSteps}</div>}
                <div className="help-text">
                  Additional actions will execute after the main action with optional delays.
                </div>
              </div>
            )}

            {formState.errors.general && (
              <div className="error-message general-error">{formState.errors.general}</div>
            )}
          </div>

          <div className="modal-actions">
            <button type="submit" className="save-btn">Save</button>
            <button type="button" onClick={onClose} className="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActionEditor;
