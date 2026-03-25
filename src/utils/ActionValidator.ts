import { MacroStep } from '../types';

export interface ValidatableFormData {
  mappingName?: string;
  keys?: string[];
  modifiers?: string[];
  appPath?: string;
  url?: string;
  text?: string;
  mouseX?: number;
  mouseY?: number;
  scriptContent?: string;
}

export class ActionValidator {
  private errors: Record<string, string> = {};

  validate(actionType: string, formData: ValidatableFormData, isMultiAction: boolean, macroSteps: MacroStep[]): Record<string, string> {
    this.errors = {};

    // Validate mapping name
    if (!formData.mappingName?.trim()) {
      this.errors.mappingName = 'Mapping name is required';
    }

    // Validate primary action
    this.validatePrimaryAction(actionType, formData);

    // Validate multi-action if enabled
    if (isMultiAction) {
      this.validateMultiAction(macroSteps);
    }

    return this.errors;
  }

  private validatePrimaryAction(actionType: string, formData: ValidatableFormData) {
    switch (actionType) {
      case 'KeyboardShortcut':
        if ((formData.keys?.length ?? 0) === 0 && (formData.modifiers?.length ?? 0) === 0) {
          this.errors.keys = 'At least one key or modifier is required';
        }
        break;
      case 'LaunchApplication':
        if (!formData.appPath?.trim()) {
          this.errors.appPath = 'Application path is required';
        }
        break;
      case 'OpenUrl':
        if (!formData.url?.trim()) {
          this.errors.url = 'URL is required';
        } else if (!formData.url.match(/^https?:\/\/.+/)) {
          this.errors.url = 'URL must start with http:// or https://';
        }
        break;
      case 'TypeText':
        if (!formData.text?.trim()) {
          this.errors.text = 'Text to type is required';
        }
        break;
      case 'MouseClick':
        if ((formData.mouseX ?? 0) < 0 || (formData.mouseY ?? 0) < 0) {
          this.errors.mousePosition = 'Mouse coordinates must be positive';
        }
        break;
      case 'ScriptExecution':
        if (!formData.scriptContent?.trim()) {
          this.errors.scriptContent = 'Script content is required';
        }
        break;
    }
  }

  private validateMultiAction(macroSteps: MacroStep[]) {
    if (macroSteps.length === 0) {
      this.errors.macroSteps = 'Add at least one additional action when multi-action is enabled';
      return;
    }

    // Validate each multi-action step
    macroSteps.forEach((step, index) => {
      const stepAction = step.action;
      const stepPrefix = `step${index}`;

      if ('OpenUrl' in stepAction) {
        if (!stepAction.OpenUrl.url.trim()) {
          this.errors[`${stepPrefix}_url`] = `Step ${index + 1}: URL is required`;
        } else if (!stepAction.OpenUrl.url.match(/^https?:\/\/.+/)) {
          this.errors[`${stepPrefix}_url`] = `Step ${index + 1}: URL must start with http:// or https://`;
        }
      } else if ('LaunchApplication' in stepAction) {
        if (!stepAction.LaunchApplication.path.trim()) {
          this.errors[`${stepPrefix}_path`] = `Step ${index + 1}: Application path is required`;
        }
      } else if ('TypeText' in stepAction) {
        if (!stepAction.TypeText.text.trim()) {
          this.errors[`${stepPrefix}_text`] = `Step ${index + 1}: Text to type is required`;
        }
      } else if ('KeyboardShortcut' in stepAction) {
        if (stepAction.KeyboardShortcut.keys.length === 0 && stepAction.KeyboardShortcut.modifiers.length === 0) {
          this.errors[`${stepPrefix}_keys`] = `Step ${index + 1}: At least one key or modifier is required`;
        }
      } else if ('MouseClick' in stepAction) {
        if (stepAction.MouseClick.x < 0 || stepAction.MouseClick.y < 0) {
          this.errors[`${stepPrefix}_mousePosition`] = `Step ${index + 1}: Mouse coordinates must be positive`;
        }
      } else if ('ScriptExecution' in stepAction) {
        if (!stepAction.ScriptExecution.content.trim()) {
          this.errors[`${stepPrefix}_scriptContent`] = `Step ${index + 1}: Script content is required`;
        }
      }
    });
  }

  clearError(field: string) {
    delete this.errors[field];
  }

  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  getErrors(): Record<string, string> {
    return this.errors;
  }
}