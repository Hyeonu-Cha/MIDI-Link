import React, { useState, useEffect } from 'react';
import { Profile, Action, ActionMapping, SystemCommandType, MacroStep, ScriptType } from '../types';
import { profileApi } from '../services/api';

interface ActionEditorProps {
  mappingKey: string | null;
  profile: Profile | null;
  editingMapping?: ActionMapping | null;
  onClose: () => void;
  onSave: () => void;
}

const ActionEditor: React.FC<ActionEditorProps> = ({
  mappingKey,
  profile,
  editingMapping,
  onClose,
  onSave,
}) => {
  const [actionType, setActionType] = useState<string>('KeyboardShortcut');
  const [mappingName, setMappingName] = useState('');
  
  // Keyboard Shortcut fields
  const [keys, setKeys] = useState<string[]>([]);
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [keyInput, setKeyInput] = useState('');
  
  // Application Launch fields
  const [appPath, setAppPath] = useState('');
  const [appArgs, setAppArgs] = useState('');
  
  // URL fields
  const [url, setUrl] = useState('');
  
  // Text fields
  const [text, setText] = useState('');
  
  // Mouse Click fields
  const [mouseButton, setMouseButton] = useState('left');
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  
  // System Command fields
  const [systemCommand, setSystemCommand] = useState<SystemCommandType>(SystemCommandType.VolumeUp);
  
  // Multi-step Macro fields
  const [macroSteps, setMacroSteps] = useState<MacroStep[]>([]);
  const [isMultiAction, setIsMultiAction] = useState(false);

  // Script Execution fields
  const [scriptType, setScriptType] = useState<ScriptType>(ScriptType.PowerShell);
  const [scriptContent, setScriptContent] = useState('');


  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with existing mapping data if editing
  useEffect(() => {
    if (editingMapping) {
      setMappingName(editingMapping.name);
      const action = editingMapping.action;

      if ('KeyboardShortcut' in action) {
        setActionType('KeyboardShortcut');
        setKeys(action.KeyboardShortcut.keys);
        setModifiers(action.KeyboardShortcut.modifiers);
      } else if ('LaunchApplication' in action) {
        setActionType('LaunchApplication');
        setAppPath(action.LaunchApplication.path);
        setAppArgs(action.LaunchApplication.args.join(' '));
      } else if ('OpenUrl' in action) {
        setActionType('OpenUrl');
        setUrl(action.OpenUrl.url);
      } else if ('TypeText' in action) {
        setActionType('TypeText');
        setText(action.TypeText.text);
      } else if ('MouseClick' in action) {
        setActionType('MouseClick');
        setMouseButton(action.MouseClick.button);
        setMouseX(action.MouseClick.x);
        setMouseY(action.MouseClick.y);
      } else if ('SystemCommand' in action) {
        setActionType('SystemCommand');
        setSystemCommand(action.SystemCommand.command_type);
      } else if ('MultiStepMacro' in action) {
        // For existing MultiStepMacro, enable multi-action mode and set the first step as primary action
        const steps = action.MultiStepMacro.steps;
        if (steps.length > 0) {
          const firstStep = steps[0];
          const firstAction = firstStep.action;

          // Set the action type based on the first step
          if ('KeyboardShortcut' in firstAction) {
            setActionType('KeyboardShortcut');
            setKeys(firstAction.KeyboardShortcut.keys);
            setModifiers(firstAction.KeyboardShortcut.modifiers);
          } else if ('LaunchApplication' in firstAction) {
            setActionType('LaunchApplication');
            setAppPath(firstAction.LaunchApplication.path);
            setAppArgs(firstAction.LaunchApplication.args.join(' '));
          } else if ('OpenUrl' in firstAction) {
            setActionType('OpenUrl');
            setUrl(firstAction.OpenUrl.url);
          } else if ('TypeText' in firstAction) {
            setActionType('TypeText');
            setText(firstAction.TypeText.text);
          } else if ('SystemCommand' in firstAction) {
            setActionType('SystemCommand');
            setSystemCommand(firstAction.SystemCommand.command_type);
          }

          // If there are multiple steps, enable multi-action mode
          if (steps.length > 1) {
            setIsMultiAction(true);
            setMacroSteps(steps.slice(1)); // All steps except the first one
          }
        }
      } else if ('ScriptExecution' in action) {
        setActionType('ScriptExecution');
        setScriptType(action.ScriptExecution.script_type);
        setScriptContent(action.ScriptExecution.content);
      }
    } else {
      // Reset form for new mapping
      setActionType('KeyboardShortcut');
      setMappingName('');
      setKeys([]);
      setModifiers([]);
      setAppPath('');
      setAppArgs('');
      setUrl('');
      setText('');
      setMouseButton('left');
      setMouseX(0);
      setMouseY(0);
      setSystemCommand(SystemCommandType.VolumeUp);
      setMacroSteps([]);
      setIsMultiAction(false);
      setScriptType(ScriptType.PowerShell);
      setScriptContent('');
    }
  }, [editingMapping]);

  const handleModifierToggle = (modifier: string) => {
    setModifiers(prev => 
      prev.includes(modifier) 
        ? prev.filter(m => m !== modifier)
        : [...prev, modifier]
    );
  };

  const handleAddKey = () => {
    if (keyInput && !keys.includes(keyInput.toLowerCase())) {
      setKeys(prev => [...prev, keyInput.toLowerCase()]);
      setKeyInput('');
    }
  };

  const handleRemoveKey = (key: string) => {
    setKeys(prev => prev.filter(k => k !== key));
  };

  const validateAction = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!mappingName.trim()) {
      newErrors.mappingName = 'Mapping name is required';
    }

    switch (actionType) {
      case 'KeyboardShortcut':
        if (keys.length === 0 && modifiers.length === 0) {
          newErrors.keys = 'At least one key or modifier is required';
        }
        break;
      case 'LaunchApplication':
        if (!appPath.trim()) {
          newErrors.appPath = 'Application path is required';
        }
        break;
      case 'OpenUrl':
        if (!url.trim()) {
          newErrors.url = 'URL is required';
        } else if (!url.match(/^https?:\/\/.+/)) {
          newErrors.url = 'URL must start with http:// or https://';
        }
        break;
      case 'TypeText':
        if (!text.trim()) {
          newErrors.text = 'Text to type is required';
        }
        break;
      case 'MouseClick':
        if (mouseX < 0 || mouseY < 0) {
          newErrors.mousePosition = 'Mouse coordinates must be positive';
        }
        break;
      case 'ScriptExecution':
        if (!scriptContent.trim()) {
          newErrors.scriptContent = 'Script content is required';
        }
        break;
    }

    // Validate multi-action if enabled
    if (isMultiAction) {
      if (macroSteps.length === 0) {
        newErrors.macroSteps = 'Add at least one additional action when multi-action is enabled';
      } else {
        // Validate each multi-action step
        macroSteps.forEach((step, index) => {
          const stepAction = step.action;
          const stepPrefix = `step${index}`;

          if ('OpenUrl' in stepAction) {
            if (!stepAction.OpenUrl.url.trim()) {
              newErrors[`${stepPrefix}_url`] = `Step ${index + 1}: URL is required`;
            } else if (!stepAction.OpenUrl.url.match(/^https?:\/\/.+/)) {
              newErrors[`${stepPrefix}_url`] = `Step ${index + 1}: URL must start with http:// or https://`;
            }
          } else if ('LaunchApplication' in stepAction) {
            if (!stepAction.LaunchApplication.path.trim()) {
              newErrors[`${stepPrefix}_path`] = `Step ${index + 1}: Application path is required`;
            }
          } else if ('TypeText' in stepAction) {
            if (!stepAction.TypeText.text.trim()) {
              newErrors[`${stepPrefix}_text`] = `Step ${index + 1}: Text to type is required`;
            }
          } else if ('KeyboardShortcut' in stepAction) {
            if (stepAction.KeyboardShortcut.keys.length === 0 && stepAction.KeyboardShortcut.modifiers.length === 0) {
              newErrors[`${stepPrefix}_keys`] = `Step ${index + 1}: At least one key or modifier is required`;
            }
          }
        });
      }
    }

    return newErrors;
  };

  const buildAction = (): Action => {
    // Create the primary action
    let primaryAction: Action;
    switch (actionType) {
      case 'KeyboardShortcut':
        primaryAction = { KeyboardShortcut: { keys, modifiers } };
        break;
      case 'LaunchApplication':
        primaryAction = {
          LaunchApplication: {
            path: appPath,
            args: appArgs ? appArgs.split(' ') : []
          }
        };
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

    // If multi-action is enabled, wrap in MultiStepMacro
    if (isMultiAction && macroSteps.length > 0) {
      const allSteps: MacroStep[] = [
        { action: primaryAction, delay_ms: 0 }, // Primary action with no delay
        ...macroSteps
      ];
      return { MultiStepMacro: { steps: allSteps } };
    }

    return primaryAction;
  };

  const handleSave = async () => {
    if (!mappingKey || !profile) return;

    // Validate the form
    const validationErrors = validateAction();
    setErrors(validationErrors);

    // If there are validation errors, don't proceed
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const [channel, noteOrCc] = mappingKey.split(':').map(Number);

    const mapping: ActionMapping = {
      id: editingMapping ? editingMapping.id : `${profile.id}_${mappingKey}`,
      name: mappingName || `Mapping ${mappingKey}`,
      midi_channel: channel,
      midi_note_or_cc: noteOrCc,
      action: buildAction(),
    };

    try {
      if (editingMapping) {
        // For editing, we need to delete the old mapping and add the new one
        await profileApi.deleteMapping(editingMapping.id);
      }
      await profileApi.addMappingToProfile(mapping);
      onSave();
    } catch (error) {
      console.error('Failed to save mapping:', error);
      setErrors({ general: 'Failed to save mapping. Please try again.' });
    }
  };

  const renderActionFields = () => {
    switch (actionType) {
      case 'KeyboardShortcut':
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
                  onChange={(e) => setKeyInput(e.target.value)}
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

      case 'LaunchApplication':
        return (
          <div className="action-fields">
            <div className="form-group">
              <label>Application Path:</label>
              <input
                type="text"
                value={appPath}
                onChange={(e) => {
                  setAppPath(e.target.value);
                  if (errors.appPath) {
                    setErrors(prev => ({ ...prev, appPath: '' }));
                  }
                }}
                placeholder="/path/to/application.exe"
                className={errors.appPath ? 'error' : ''}
              />
              {errors.appPath && <div className="error-message">{errors.appPath}</div>}
            </div>
            <div className="form-group">
              <label>Arguments (optional):</label>
              <input
                type="text"
                value={appArgs}
                onChange={(e) => setAppArgs(e.target.value)}
                placeholder="--arg1 value1 --arg2"
              />
            </div>
          </div>
        );

      case 'OpenUrl':
        return (
          <div className="action-fields">
            <div className="form-group">
              <label>URL:</label>
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (errors.url) {
                    setErrors(prev => ({ ...prev, url: '' }));
                  }
                }}
                placeholder="https://example.com"
                className={errors.url ? 'error' : ''}
              />
              {errors.url && <div className="error-message">{errors.url}</div>}
            </div>
          </div>
        );

      case 'TypeText':
        return (
          <div className="action-fields">
            <div className="form-group">
              <label>Text to Type:</label>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (errors.text) {
                    setErrors(prev => ({ ...prev, text: '' }));
                  }
                }}
                placeholder="Enter the text to type..."
                rows={4}
                className={errors.text ? 'error' : ''}
              />
              {errors.text && <div className="error-message">{errors.text}</div>}
            </div>
          </div>
        );

      case 'MouseClick':
        return (
          <div className="action-fields">
            <div className="form-group">
              <label>Mouse Button:</label>
              <select value={mouseButton} onChange={(e) => setMouseButton(e.target.value)}>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="middle">Middle</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>X Position:</label>
                <input
                  type="number"
                  value={mouseX}
                  onChange={(e) => {
                    setMouseX(Number(e.target.value));
                    if (errors.mousePosition) {
                      setErrors(prev => ({ ...prev, mousePosition: '' }));
                    }
                  }}
                  className={errors.mousePosition ? 'error' : ''}
                />
              </div>
              <div className="form-group">
                <label>Y Position:</label>
                <input
                  type="number"
                  value={mouseY}
                  onChange={(e) => {
                    setMouseY(Number(e.target.value));
                    if (errors.mousePosition) {
                      setErrors(prev => ({ ...prev, mousePosition: '' }));
                    }
                  }}
                  className={errors.mousePosition ? 'error' : ''}
                />
              </div>
            </div>
            {errors.mousePosition && <div className="error-message">{errors.mousePosition}</div>}
          </div>
        );

      case 'SystemCommand':
        return (
          <div className="action-fields">
            <div className="form-group">
              <label>System Command:</label>
              <select 
                value={systemCommand} 
                onChange={(e) => setSystemCommand(e.target.value as SystemCommandType)}
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
          </div>
        );

      case 'ScriptExecution':
        return (
          <div className="action-fields">
            <div className="form-group">
              <label>Script Type:</label>
              <select 
                value={scriptType} 
                onChange={(e) => setScriptType(e.target.value as ScriptType)}
              >
                <option value={ScriptType.PowerShell}>PowerShell (Windows)</option>
                <option value={ScriptType.Bash}>Bash (Linux/macOS)</option>
                <option value={ScriptType.Cmd}>Command Prompt (Windows)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Script Content:</label>
              <textarea
                value={scriptContent}
                onChange={(e) => {
                  setScriptContent(e.target.value);
                  if (errors.scriptContent) {
                    setErrors(prev => ({ ...prev, scriptContent: '' }));
                  }
                }}
                placeholder="Enter your script commands..."
                rows={8}
                style={{ fontFamily: 'monospace' }}
                className={errors.scriptContent ? 'error' : ''}
              />
              {errors.scriptContent && <div className="error-message">{errors.scriptContent}</div>}
              <div className="help-text">
                Example commands:
                <ul>
                  <li>PowerShell: Get-Process | Where-Object {'{'}$_.CPU -gt 100{'}'}</li>
                  <li>Bash: ls -la && echo "Directory listing complete"</li>
                  <li>Cmd: dir && echo Directory listing complete</li>
                </ul>
              </div>
            </div>
          </div>
        );



      default:
        return null;
    }
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
          <div className="form-group">
            <label>Mapping Name:</label>
            <input
              type="text"
              value={mappingName}
              onChange={(e) => {
                setMappingName(e.target.value);
                if (errors.mappingName) {
                  setErrors(prev => ({ ...prev, mappingName: '' }));
                }
              }}
              placeholder="Enter a name for this mapping"
              className={errors.mappingName ? 'error' : ''}
            />
            {errors.mappingName && <div className="error-message">{errors.mappingName}</div>}
          </div>

          <div className="form-group">
            <label>Action Type:</label>
            <select value={actionType} onChange={(e) => setActionType(e.target.value)}>
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
                checked={isMultiAction}
                onChange={(e) => {
                  setIsMultiAction(e.target.checked);
                  if (!e.target.checked) {
                    setMacroSteps([]);
                  }
                }}
              />
              Enable multiple actions
            </label>
            <div className="help-text">
              Check this to add additional actions that will execute alongside the main action
            </div>
          </div>

          {renderActionFields()}

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
                        onClick={() => setMacroSteps(prev => prev.filter((_, i) => i !== index))}
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
                            const newSteps = [...macroSteps];
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
                            newSteps[index] = { ...step, action: newAction };
                            setMacroSteps(newSteps);
                          }}
                        >
                          <option value="KeyboardShortcut">Keyboard Shortcut</option>
                          <option value="OpenUrl">Open URL</option>
                          <option value="TypeText">Type Text</option>
                          <option value="LaunchApplication">Launch Application</option>
                          <option value="SystemCommand">System Command</option>
                        </select>
                      </div>

                      {/* Render specific action fields based on action type */}
                      {(() => {
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
                                  const newSteps = [...macroSteps];
                                  newSteps[index] = {
                                    ...step,
                                    action: { OpenUrl: { url: e.target.value } }
                                  };
                                  setMacroSteps(newSteps);
                                  // Clear error when user types
                                  const errorKey = `step${index}_url`;
                                  if (errors[errorKey]) {
                                    setErrors(prev => ({ ...prev, [errorKey]: '' }));
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
                                  const newSteps = [...macroSteps];
                                  newSteps[index] = {
                                    ...step,
                                    action: { TypeText: { text: e.target.value } }
                                  };
                                  setMacroSteps(newSteps);
                                  // Clear error when user types
                                  const errorKey = `step${index}_text`;
                                  if (errors[errorKey]) {
                                    setErrors(prev => ({ ...prev, [errorKey]: '' }));
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
                                  const newSteps = [...macroSteps];
                                  newSteps[index] = {
                                    ...step,
                                    action: { LaunchApplication: { path: e.target.value, args: appData.args } }
                                  };
                                  setMacroSteps(newSteps);
                                  // Clear error when user types
                                  const errorKey = `step${index}_path`;
                                  if (errors[errorKey]) {
                                    setErrors(prev => ({ ...prev, [errorKey]: '' }));
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
                                  const newSteps = [...macroSteps];
                                  newSteps[index] = {
                                    ...step,
                                    action: { SystemCommand: { command_type: e.target.value as SystemCommandType } }
                                  };
                                  setMacroSteps(newSteps);
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
                                  const newSteps = [...macroSteps];
                                  newSteps[index] = {
                                    ...step,
                                    action: {
                                      KeyboardShortcut: {
                                        keys: e.target.value.split(',').map(k => k.trim()).filter(k => k),
                                        modifiers: kbData.modifiers
                                      }
                                    }
                                  };
                                  setMacroSteps(newSteps);
                                  // Clear error when user types
                                  const errorKey = `step${index}_keys`;
                                  if (errors[errorKey]) {
                                    setErrors(prev => ({ ...prev, [errorKey]: '' }));
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
                                        const newSteps = [...macroSteps];
                                        const modifiers = e.target.checked
                                          ? [...kbData.modifiers, mod]
                                          : kbData.modifiers.filter(m => m !== mod);
                                        newSteps[index] = {
                                          ...step,
                                          action: {
                                            KeyboardShortcut: {
                                              keys: kbData.keys,
                                              modifiers
                                            }
                                          }
                                        };
                                        setMacroSteps(newSteps);
                                        // Clear error when user changes modifiers
                                        const errorKey = `step${index}_keys`;
                                        if (errors[errorKey]) {
                                          setErrors(prev => ({ ...prev, [errorKey]: '' }));
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
                      })()}

                      <div className="step-delay">
                        <label>Delay after this action (ms):</label>
                        <input
                          type="number"
                          value={step.delay_ms}
                          onChange={(e) => {
                            const newSteps = [...macroSteps];
                            newSteps[index] = { ...step, delay_ms: Number(e.target.value) };
                            setMacroSteps(newSteps);
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
                        let newAction: Action;
                        switch (e.target.value) {
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
                        setMacroSteps(prev => [...prev, newStep]);
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

          {errors.general && (
            <div className="error-message general-error">
              {errors.general}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="save-btn">
              Save Mapping
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActionEditor;