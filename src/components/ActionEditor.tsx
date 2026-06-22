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
  const data = Object.values(action)[0];
  return { type, data };
}

function getStepIcon(actionType: string): string {
  switch (actionType) {
    case 'KeyboardShortcut': return 'keyboard';
    case 'LaunchApplication': return 'launch';
    case 'OpenUrl': return 'open_in_browser';
    case 'TypeText': return 'keyboard_alt';
    case 'MouseClick': return 'mouse';
    case 'SystemCommand': return 'bolt';
    case 'ScriptExecution': return 'terminal';
    default: return 'settings';
  }
}

interface ActionEditorProps {
  mappingKey: string | null;
  profile: Profile | null;
  editingMapping?: ActionMapping | null;
  onClose: () => void;
  onSave: () => void;
}

const ActionEditor: FC<ActionEditorProps> = ({ mappingKey, profile, editingMapping, onClose, onSave }) => {
  const { formState, updateField, setErrors, clearError } = useActionForm(editingMapping);

  const buildAction = (): Action => {
    const { actionType, keys, modifiers, appPath, appArgs, url, text,
      mouseButton, mouseX, mouseY, systemCommand, scriptType, scriptContent,
      isMultiAction, macroSteps } = formState;

    let primaryAction: Action;
    switch (actionType) {
      case 'KeyboardShortcut': primaryAction = { KeyboardShortcut: { keys, modifiers } }; break;
      case 'LaunchApplication': primaryAction = { LaunchApplication: { path: appPath, args: appArgs ? appArgs.split(' ') : [] } }; break;
      case 'OpenUrl': primaryAction = { OpenUrl: { url } }; break;
      case 'TypeText': primaryAction = { TypeText: { text } }; break;
      case 'MouseClick': primaryAction = { MouseClick: { button: mouseButton, x: mouseX, y: mouseY } }; break;
      case 'SystemCommand': primaryAction = { SystemCommand: { command_type: systemCommand } }; break;
      case 'ScriptExecution': primaryAction = { ScriptExecution: { script_type: scriptType, content: scriptContent } }; break;
      default: primaryAction = { KeyboardShortcut: { keys: [], modifiers: [] } };
    }
    if (isMultiAction && macroSteps.length > 0) {
      return { MultiStepMacro: { steps: [{ action: primaryAction, delay_ms: 0 }, ...macroSteps] } };
    }
    return primaryAction;
  };

  const handleSave = async () => {
    if (!mappingKey || !profile) return;
    const validator = new ActionValidator();
    const validationErrors = validator.validate(formState.actionType, formState, formState.isMultiAction, formState.macroSteps);
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

  const midiLabel = mappingKey
    ? (() => { const [ch, val] = mappingKey.split(':'); return `CH ${String(Number(ch) + 1).padStart(2,'0')} : CC ${String(val).padStart(2,'0')}`; })()
    : 'New Mapping';

  return (
    <div data-testid="action-editor-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-lg">
      <div data-testid="action-editor-modal-content" className="w-full max-w-2xl cyber-panel rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-primary/20 overflow-hidden">

        {/* ── Modal Header ── */}
        <div data-testid="action-editor-modal-header" className="px-10 py-8 border-b border-primary/10 flex justify-between items-start bg-black/40">
          <div>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.4em] text-primary/80 block mb-2">
              SIGNAL ENGINE // MAPPING_v2.0
            </span>
            <h2 className="text-2xl font-headline font-black text-on-surface tracking-tight">
              {editingMapping ? 'Edit Mapping: ' : 'New Mapping: '}
              <span className="text-primary-container text-glow">{midiLabel}</span>
            </h2>
          </div>
          <button data-testid="action-editor-close-btn" className="text-on-surface-variant hover:text-primary transition-all p-1 hover:bg-primary/10 rounded" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* ── Modal Content ── */}
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div data-testid="action-editor-modal-body" className="p-10 space-y-8 max-h-[580px] overflow-y-auto no-scrollbar">

            {/* Name + Type row */}
            <div data-testid="form-row" className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div data-testid="form-group-name" className="space-y-3">
                <label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Mapping Name</label>
                <input
                  data-testid="mapping-name-input"
                  data-error={formState.errors.mappingName ? 'true' : 'false'}
                  type="text"
                  value={formState.mappingName}
                  onChange={(e) => { updateField('mappingName', e.target.value); clearError('mappingName'); }}
                  placeholder="Enter mapping name"
                  className={`w-full bg-transparent border-b-2 ${formState.errors.mappingName ? 'border-error' : 'border-primary/20 focus:border-primary-container'} text-on-surface font-headline text-lg px-0 py-1 outline-none placeholder:text-on-surface-variant/40`}
                />
                {formState.errors.mappingName && <p data-testid="mapping-name-error" className="text-xs text-error">{formState.errors.mappingName}</p>}
              </div>
              <div data-testid="form-group-type" className="space-y-3">
                <label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Action Type</label>
                <div className="relative">
                  <select
                    data-testid="action-type-select"
                    value={formState.actionType}
                    onChange={(e) => updateField('actionType', e.target.value)}
                    className="w-full bg-transparent border-b-2 border-primary/20 focus:border-primary-container text-on-surface font-headline text-lg px-0 py-1 outline-none appearance-none cursor-pointer"
                  >
                    <option value="KeyboardShortcut">Keyboard Shortcut</option>
                    <option value="LaunchApplication">Launch Application</option>
                    <option value="OpenUrl">Open URL</option>
                    <option value="TypeText">Type Text</option>
                    <option value="MouseClick">Mouse Click</option>
                    <option value="SystemCommand">System Command</option>
                    <option value="ScriptExecution">Script Execution</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-0 top-2 pointer-events-none text-primary/60 text-sm">arrow_drop_down</span>
                </div>
              </div>
            </div>

            {/* Multi-action toggle */}
            <div className="flex items-center gap-3 py-2 border-b border-primary/10">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  data-testid="multi-action-toggle"
                  type="checkbox"
                  checked={formState.isMultiAction}
                  onChange={(e) => { updateField('isMultiAction', e.target.checked); if (!e.target.checked) updateField('macroSteps', []); }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-outline-variant peer-checked:bg-primary-container rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
              </label>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Enable Macro Sequence</span>
            </div>

            {/* Primary action fields */}
            <div className="space-y-4">
              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80 block border-b border-primary/10 pb-2">
                {formState.isMultiAction ? 'Primary Action' : 'Action Config'}
              </label>
              <ActionFieldsRenderer
                actionType={formState.actionType}
                formData={formState}
                errors={formState.errors}
                onUpdateField={(field, value) => updateField(field as keyof typeof formState, value)}
                onErrorClear={clearError}
              />
            </div>

            {/* Macro steps */}
            {formState.isMultiAction && (
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-primary/10 pb-2">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">Additional Steps</label>
                  <div className="relative">
                    <select
                      data-testid="add-step-select"
                      value=""
                      onChange={(e) => { if (e.target.value) { addStep(e.target.value); (e.target as HTMLSelectElement).value = ''; } }}
                      className="text-[10px] font-black uppercase tracking-widest text-primary bg-transparent border border-primary/30 rounded px-3 py-1 outline-none cursor-pointer appearance-none pr-6"
                    >
                      <option value="">+ Push Step</option>
                      <option value="OpenUrl">Open URL</option>
                      <option value="LaunchApplication">Launch App</option>
                      <option value="KeyboardShortcut">Keyboard</option>
                      <option value="TypeText">Type Text</option>
                      <option value="SystemCommand">System Command</option>
                    </select>
                  </div>
                </div>

                <div className="relative pl-8 space-y-3">
                  {/* Vertical rack line */}
                  {formState.macroSteps.length > 0 && (
                    <div className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-primary/40" />
                  )}

                  {formState.macroSteps.map((step, index) => {
                    const { type: stepActionType, data: actionData } = getActionData(step.action);
                    const errPrefix = `step${index}`;
                    const isLast = index === formState.macroSteps.length - 1;

                    return (
                      <div data-testid="macro-step" key={index} className="relative group">
                        {/* Rack node */}
                        <div className={`absolute -left-[27px] top-5 w-4 h-4 rounded-full flex items-center justify-center z-10 border-2 ${isLast ? 'bg-primary border-primary-container shadow-[0_0_10px_#d97757]' : 'bg-surface-container-highest border-primary/60'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isLast ? 'bg-white' : 'bg-primary animate-pulse'}`} />
                        </div>

                        <div className={`flex flex-col gap-3 p-4 rounded-xl transition-all group-hover:translate-x-1 ${isLast ? 'bg-primary/10 border-l-4 border-l-primary border-y border-r border-primary/20' : 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-primary/30'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className={`font-mono text-[10px] font-bold w-4 ${isLast ? 'text-primary' : 'text-primary/40'}`}>
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isLast ? 'bg-primary/20 border-primary/30' : 'bg-black/40 border-primary/10'}`}>
                                <span className={`material-symbols-outlined text-base ${isLast ? 'text-primary-container' : 'text-primary'}`}>
                                  {getStepIcon(stepActionType)}
                                </span>
                              </div>
                              <div data-testid="step-action-selector">
                                <select
                                  data-testid="step-action-type-select"
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
                                  className={`text-sm font-headline font-bold bg-transparent outline-none cursor-pointer ${isLast ? 'text-primary-container' : 'text-on-surface'}`}
                                >
                                  <option value="KeyboardShortcut">Keyboard Shortcut</option>
                                  <option value="OpenUrl">Open URL</option>
                                  <option value="TypeText">Type Text</option>
                                  <option value="LaunchApplication">Launch Application</option>
                                  <option value="SystemCommand">System Command</option>
                                </select>
                                <p className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest">
                                  TYPE: {stepActionType.replace(/([A-Z])/g, '_$1').toUpperCase().slice(1)}
                                </p>
                              </div>
                            </div>
                            <button data-testid="macro-step-remove" type="button" onClick={() => removeStep(index)} className="p-1 hover:text-error transition-colors opacity-0 group-hover:opacity-100">
                              <span className="material-symbols-outlined text-sm text-on-surface-variant hover:text-error">delete_sweep</span>
                            </button>
                          </div>

                          {/* Step-specific fields */}
                          <div data-testid="step-fields" className="ml-16 space-y-2">
                            {stepActionType === 'OpenUrl' && (
                              <input
                                type="url" value={actionData.url} placeholder="https://example.com"
                                onChange={(e) => { updateStep(index, { ...step, action: { OpenUrl: { url: e.target.value } } }); clearError(`${errPrefix}_url`); }}
                                className="w-full bg-transparent border-b border-primary/20 focus:border-primary-container text-on-surface text-sm px-0 py-1 outline-none placeholder:text-on-surface-variant/40"
                              />
                            )}
                            {stepActionType === 'TypeText' && (
                              <input
                                type="text" value={actionData.text} placeholder="Text to type"
                                onChange={(e) => { updateStep(index, { ...step, action: { TypeText: { text: e.target.value } } }); clearError(`${errPrefix}_text`); }}
                                className="w-full bg-transparent border-b border-primary/20 focus:border-primary-container text-on-surface text-sm px-0 py-1 outline-none placeholder:text-on-surface-variant/40"
                              />
                            )}
                            {stepActionType === 'LaunchApplication' && (
                              <input
                                type="text" value={actionData.path} placeholder="C:\Program Files\app.exe"
                                onChange={(e) => { updateStep(index, { ...step, action: { LaunchApplication: { path: e.target.value, args: actionData.args } } }); clearError(`${errPrefix}_path`); }}
                                className="w-full bg-transparent border-b border-primary/20 focus:border-primary-container text-on-surface text-sm px-0 py-1 outline-none placeholder:text-on-surface-variant/40"
                              />
                            )}
                            {stepActionType === 'SystemCommand' && (
                              <select
                                value={actionData.command_type}
                                onChange={(e) => updateStep(index, { ...step, action: { SystemCommand: { command_type: e.target.value as SystemCommandType } } })}
                                className="bg-surface-container text-on-surface text-sm rounded px-2 py-1 outline-none border border-primary/20"
                              >
                                <optgroup label="Media"><option value={SystemCommandType.VolumeUp}>Volume Up</option><option value={SystemCommandType.VolumeDown}>Volume Down</option><option value={SystemCommandType.Mute}>Mute</option><option value={SystemCommandType.PlayPause}>Play/Pause</option><option value={SystemCommandType.NextTrack}>Next Track</option><option value={SystemCommandType.PreviousTrack}>Prev Track</option></optgroup>
                                <optgroup label="System"><option value={SystemCommandType.Sleep}>Sleep</option><option value={SystemCommandType.Lock}>Lock Screen</option><option value={SystemCommandType.Shutdown}>Shutdown</option><option value={SystemCommandType.Restart}>Restart</option></optgroup>
                                <optgroup label="Window"><option value={SystemCommandType.MinimizeWindow}>Minimize</option><option value={SystemCommandType.MaximizeWindow}>Maximize</option><option value={SystemCommandType.CloseWindow}>Close Window</option></optgroup>
                                <optgroup label="Utilities"><option value={SystemCommandType.Screenshot}>Screenshot</option><option value={SystemCommandType.ClipboardCopy}>Copy</option><option value={SystemCommandType.ClipboardPaste}>Paste</option></optgroup>
                              </select>
                            )}
                            {stepActionType === 'KeyboardShortcut' && (
                              <div className="space-y-1">
                                <input
                                  type="text" value={actionData.keys.join(', ')} placeholder="a, b, enter"
                                  onChange={(e) => { updateStep(index, { ...step, action: { KeyboardShortcut: { keys: e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean), modifiers: actionData.modifiers } } }); clearError(`${errPrefix}_keys`); }}
                                  className="w-full bg-transparent border-b border-primary/20 text-on-surface text-sm px-0 py-1 outline-none placeholder:text-on-surface-variant/40"
                                />
                                <div data-testid="modifier-checkboxes" className="flex gap-3">
                                  {['ctrl', 'alt', 'shift', 'meta'].map(mod => (
                                    <label key={mod} className="flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={actionData.modifiers.includes(mod)}
                                        onChange={(e) => {
                                          const modifiers = e.target.checked ? [...actionData.modifiers, mod] : actionData.modifiers.filter((m: string) => m !== mod);
                                          updateStep(index, { ...step, action: { KeyboardShortcut: { keys: actionData.keys, modifiers } } });
                                        }}
                                        className="accent-primary-container"
                                      />
                                      <span className="text-[10px] text-on-surface-variant uppercase">{mod}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-[9px] text-on-surface-variant uppercase">Delay</span>
                              <input
                                type="number" value={step.delay_ms} min="0" step="100"
                                onChange={(e) => updateStep(index, { ...step, delay_ms: Number(e.target.value) })}
                                className="w-20 bg-transparent border-b border-primary/20 text-on-surface text-xs px-0 py-0.5 outline-none text-right"
                              />
                              <span className="font-mono text-[9px] text-on-surface-variant">ms</span>
                            </div>
                            {formState.errors[`${errPrefix}_url`] && <p className="text-xs text-error">{formState.errors[`${errPrefix}_url`]}</p>}
                            {formState.errors[`${errPrefix}_keys`] && <p className="text-xs text-error">{formState.errors[`${errPrefix}_keys`]}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {formState.macroSteps.length === 0 && (
                    <p className="text-xs text-on-surface-variant/60 italic ml-2">No additional steps yet. Click "+ Push Step" to add one.</p>
                  )}
                </div>
                {formState.errors.macroSteps && <p className="text-xs text-error">{formState.errors.macroSteps}</p>}
              </div>
            )}

            {formState.errors.general && (
              <div data-testid="general-error" className="p-3 rounded-lg bg-error/10 border border-error/30 text-sm text-error">
                {formState.errors.general}
              </div>
            )}

            {/* Waveform decoration */}
            <div className="flex items-center justify-center gap-1.5 opacity-20 h-8 overflow-hidden">
              {[2,5,3,8,4,6,1,4,9,2,7].map((h, i) => (
                <div key={i} className="w-1 bg-primary rounded-full" style={{ height: `${h * 4}px` }} />
              ))}
            </div>
          </div>

          {/* ── Modal Footer ── */}
          <div data-testid="action-editor-modal-footer" className="px-10 py-6 bg-black/60 border-t border-primary/10 flex items-center justify-between flex-shrink-0">
            {editingMapping ? (
              <button
                type="button"
                className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-error/60 hover:text-error transition-all group"
                onClick={async () => {
                  try {
                    await profileApi.deleteMapping(editingMapping.id);
                    onSave();
                  } catch {
                    setErrors({ general: 'Failed to delete mapping.' });
                  }
                }}
              >
                <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">delete_forever</span>
                PURGE_MAPPING
              </button>
            ) : <div />}
            <div className="flex gap-3 items-center">
              <button
                data-testid="action-editor-save-btn"
                type="submit"
                className="glow-button px-8 py-2.5 rounded-lg bg-gradient-to-r from-primary-container to-surface-tint text-on-primary-container font-bold text-sm hover:scale-105 active:scale-95 transition-all"
              >Save</button>
              <button
                data-testid="action-editor-cancel-btn"
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-outline-variant/60 font-bold text-sm transition-all"
              >Cancel</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActionEditor;
