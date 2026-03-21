import { useState, useEffect } from 'react';
import { ActionMapping, SystemCommandType, ScriptType, MacroStep } from '../types';

interface ActionFormState {
  actionType: string;
  mappingName: string;
  // Keyboard Shortcut fields
  keys: string[];
  modifiers: string[];
  keyInput: string;
  // Application Launch fields
  appPath: string;
  appArgs: string;
  // URL fields
  url: string;
  // Text fields
  text: string;
  // Mouse Click fields
  mouseButton: string;
  mouseX: number;
  mouseY: number;
  isSelectingPoint: boolean;
  // System Command fields
  systemCommand: SystemCommandType;
  // Multi-step Macro fields
  macroSteps: MacroStep[];
  isMultiAction: boolean;
  // Script Execution fields
  scriptType: ScriptType;
  scriptContent: string;
  // Validation state
  errors: Record<string, string>;
}

export const useActionForm = (editingMapping?: ActionMapping | null) => {
  const [formState, setFormState] = useState<ActionFormState>({
    actionType: 'KeyboardShortcut',
    mappingName: '',
    keys: [],
    modifiers: [],
    keyInput: '',
    appPath: '',
    appArgs: '',
    url: '',
    text: '',
    mouseButton: 'left',
    mouseX: 0,
    mouseY: 0,
    isSelectingPoint: false,
    systemCommand: SystemCommandType.VolumeUp,
    macroSteps: [],
    isMultiAction: false,
    scriptType: ScriptType.PowerShell,
    scriptContent: '',
    errors: {},
  });

  // Initialize form with existing mapping data if editing
  useEffect(() => {
    if (editingMapping) {
      const action = editingMapping.action;
      const newState: Partial<ActionFormState> = {
        mappingName: editingMapping.name,
        macroSteps: [],
        isMultiAction: false,
      };

      if ('KeyboardShortcut' in action) {
        newState.actionType = 'KeyboardShortcut';
        newState.keys = action.KeyboardShortcut.keys;
        newState.modifiers = action.KeyboardShortcut.modifiers;
      } else if ('LaunchApplication' in action) {
        newState.actionType = 'LaunchApplication';
        newState.appPath = action.LaunchApplication.path;
        newState.appArgs = action.LaunchApplication.args.join(' ');
      } else if ('OpenUrl' in action) {
        newState.actionType = 'OpenUrl';
        newState.url = action.OpenUrl.url;
      } else if ('TypeText' in action) {
        newState.actionType = 'TypeText';
        newState.text = action.TypeText.text;
      } else if ('MouseClick' in action) {
        newState.actionType = 'MouseClick';
        newState.mouseButton = action.MouseClick.button;
        newState.mouseX = action.MouseClick.x;
        newState.mouseY = action.MouseClick.y;
      } else if ('SystemCommand' in action) {
        newState.actionType = 'SystemCommand';
        newState.systemCommand = action.SystemCommand.command_type;
      } else if ('MultiStepMacro' in action) {
        const steps = action.MultiStepMacro.steps;
        if (steps.length > 0) {
          const firstStep = steps[0];
          const firstAction = firstStep.action;

          // Set the action type based on the first step
          if ('KeyboardShortcut' in firstAction) {
            newState.actionType = 'KeyboardShortcut';
            newState.keys = firstAction.KeyboardShortcut.keys;
            newState.modifiers = firstAction.KeyboardShortcut.modifiers;
          } else if ('LaunchApplication' in firstAction) {
            newState.actionType = 'LaunchApplication';
            newState.appPath = firstAction.LaunchApplication.path;
            newState.appArgs = firstAction.LaunchApplication.args.join(' ');
          } else if ('OpenUrl' in firstAction) {
            newState.actionType = 'OpenUrl';
            newState.url = firstAction.OpenUrl.url;
          } else if ('TypeText' in firstAction) {
            newState.actionType = 'TypeText';
            newState.text = firstAction.TypeText.text;
          } else if ('SystemCommand' in firstAction) {
            newState.actionType = 'SystemCommand';
            newState.systemCommand = firstAction.SystemCommand.command_type;
          }

          // If there are multiple steps, enable multi-action mode
          if (steps.length > 1) {
            newState.isMultiAction = true;
            newState.macroSteps = steps.slice(1); // All steps except the first one
          }
        }
      } else if ('ScriptExecution' in action) {
        newState.actionType = 'ScriptExecution';
        newState.scriptType = action.ScriptExecution.script_type;
        newState.scriptContent = action.ScriptExecution.content;
      }

      setFormState(prevState => ({ ...prevState, ...newState }));
    } else {
      // Reset form for new mapping
      setFormState({
        actionType: 'KeyboardShortcut',
        mappingName: '',
        keys: [],
        modifiers: [],
        keyInput: '',
        appPath: '',
        appArgs: '',
        url: '',
        text: '',
        mouseButton: 'left',
        mouseX: 0,
        mouseY: 0,
        isSelectingPoint: false,
        systemCommand: SystemCommandType.VolumeUp,
        macroSteps: [],
        isMultiAction: false,
        scriptType: ScriptType.PowerShell,
        scriptContent: '',
        errors: {},
      });
    }
  }, [editingMapping]);

  const updateField = <K extends keyof ActionFormState>(
    field: K,
    value: ActionFormState[K]
  ) => {
    setFormState(prevState => ({ ...prevState, [field]: value }));
  };

  const setErrors = (errors: Record<string, string>) => {
    setFormState(prevState => ({ ...prevState, errors }));
  };

  const clearError = (field: string) => {
    setFormState(prevState => {
      const { [field]: _, ...rest } = prevState.errors;
      return { ...prevState, errors: rest };
    });
  };

  return {
    formState,
    updateField,
    setErrors,
    clearError,
  };
};