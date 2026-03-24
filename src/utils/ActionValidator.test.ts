import { describe, it, expect } from 'vitest';
import { ActionValidator } from './ActionValidator';
import { SystemCommandType, ScriptType } from '../types';

describe('ActionValidator', () => {
  describe('mapping name', () => {
    it('requires a mapping name', () => {
      const v = new ActionValidator();
      const errors = v.validate('KeyboardShortcut', { mappingName: '', keys: ['a'], modifiers: [] }, false, []);
      expect(errors.mappingName).toBe('Mapping name is required');
    });

    it('rejects whitespace-only name', () => {
      const v = new ActionValidator();
      const errors = v.validate('KeyboardShortcut', { mappingName: '   ', keys: ['a'], modifiers: [] }, false, []);
      expect(errors.mappingName).toBe('Mapping name is required');
    });

    it('accepts valid name', () => {
      const v = new ActionValidator();
      const errors = v.validate('KeyboardShortcut', { mappingName: 'My Mapping', keys: ['a'], modifiers: [] }, false, []);
      expect(errors.mappingName).toBeUndefined();
    });
  });

  describe('KeyboardShortcut', () => {
    it('requires at least one key or modifier', () => {
      const v = new ActionValidator();
      const errors = v.validate('KeyboardShortcut', { mappingName: 'test', keys: [], modifiers: [] }, false, []);
      expect(errors.keys).toBe('At least one key or modifier is required');
    });

    it('accepts keys only', () => {
      const v = new ActionValidator();
      const errors = v.validate('KeyboardShortcut', { mappingName: 'test', keys: ['a'], modifiers: [] }, false, []);
      expect(errors.keys).toBeUndefined();
    });

    it('accepts modifiers only', () => {
      const v = new ActionValidator();
      const errors = v.validate('KeyboardShortcut', { mappingName: 'test', keys: [], modifiers: ['ctrl'] }, false, []);
      expect(errors.keys).toBeUndefined();
    });
  });

  describe('LaunchApplication', () => {
    it('requires application path', () => {
      const v = new ActionValidator();
      const errors = v.validate('LaunchApplication', { mappingName: 'test', appPath: '' }, false, []);
      expect(errors.appPath).toBe('Application path is required');
    });

    it('accepts valid path', () => {
      const v = new ActionValidator();
      const errors = v.validate('LaunchApplication', { mappingName: 'test', appPath: 'C:\\app.exe' }, false, []);
      expect(errors.appPath).toBeUndefined();
    });
  });

  describe('OpenUrl', () => {
    it('requires URL', () => {
      const v = new ActionValidator();
      const errors = v.validate('OpenUrl', { mappingName: 'test', url: '' }, false, []);
      expect(errors.url).toBe('URL is required');
    });

    it('requires http/https prefix', () => {
      const v = new ActionValidator();
      const errors = v.validate('OpenUrl', { mappingName: 'test', url: 'example.com' }, false, []);
      expect(errors.url).toBe('URL must start with http:// or https://');
    });

    it('accepts valid http URL', () => {
      const v = new ActionValidator();
      const errors = v.validate('OpenUrl', { mappingName: 'test', url: 'https://example.com' }, false, []);
      expect(errors.url).toBeUndefined();
    });
  });

  describe('TypeText', () => {
    it('requires text content', () => {
      const v = new ActionValidator();
      const errors = v.validate('TypeText', { mappingName: 'test', text: '' }, false, []);
      expect(errors.text).toBe('Text to type is required');
    });

    it('accepts valid text', () => {
      const v = new ActionValidator();
      const errors = v.validate('TypeText', { mappingName: 'test', text: 'Hello' }, false, []);
      expect(errors.text).toBeUndefined();
    });
  });

  describe('MouseClick', () => {
    it('rejects negative X coordinate', () => {
      const v = new ActionValidator();
      const errors = v.validate('MouseClick', { mappingName: 'test', mouseX: -1, mouseY: 100 }, false, []);
      expect(errors.mousePosition).toBe('Mouse coordinates must be positive');
    });

    it('rejects negative Y coordinate', () => {
      const v = new ActionValidator();
      const errors = v.validate('MouseClick', { mappingName: 'test', mouseX: 100, mouseY: -5 }, false, []);
      expect(errors.mousePosition).toBe('Mouse coordinates must be positive');
    });

    it('accepts valid coordinates', () => {
      const v = new ActionValidator();
      const errors = v.validate('MouseClick', { mappingName: 'test', mouseX: 100, mouseY: 200 }, false, []);
      expect(errors.mousePosition).toBeUndefined();
    });

    it('accepts zero coordinates', () => {
      const v = new ActionValidator();
      const errors = v.validate('MouseClick', { mappingName: 'test', mouseX: 0, mouseY: 0 }, false, []);
      expect(errors.mousePosition).toBeUndefined();
    });
  });

  describe('ScriptExecution', () => {
    it('requires script content', () => {
      const v = new ActionValidator();
      const errors = v.validate('ScriptExecution', { mappingName: 'test', scriptContent: '' }, false, []);
      expect(errors.scriptContent).toBe('Script content is required');
    });

    it('accepts valid script', () => {
      const v = new ActionValidator();
      const errors = v.validate('ScriptExecution', { mappingName: 'test', scriptContent: 'echo hello' }, false, []);
      expect(errors.scriptContent).toBeUndefined();
    });
  });

  describe('multi-action validation', () => {
    it('requires at least one step when multi-action enabled', () => {
      const v = new ActionValidator();
      const errors = v.validate('KeyboardShortcut', { mappingName: 'test', keys: ['a'], modifiers: [] }, true, []);
      expect(errors.macroSteps).toBe('Add at least one additional action when multi-action is enabled');
    });

    it('validates OpenUrl step', () => {
      const v = new ActionValidator();
      const steps = [{ action: { OpenUrl: { url: '' } }, delay_ms: 0 }];
      const errors = v.validate('KeyboardShortcut', { mappingName: 'test', keys: ['a'], modifiers: [] }, true, steps);
      expect(errors.step0_url).toContain('URL is required');
    });

    it('validates OpenUrl step format', () => {
      const v = new ActionValidator();
      const steps = [{ action: { OpenUrl: { url: 'bad-url' } }, delay_ms: 0 }];
      const errors = v.validate('KeyboardShortcut', { mappingName: 'test', keys: ['a'], modifiers: [] }, true, steps);
      expect(errors.step0_url).toContain('http://');
    });

    it('validates TypeText step', () => {
      const v = new ActionValidator();
      const steps = [{ action: { TypeText: { text: '' } }, delay_ms: 0 }];
      const errors = v.validate('KeyboardShortcut', { mappingName: 'test', keys: ['a'], modifiers: [] }, true, steps);
      expect(errors.step0_text).toContain('Text to type is required');
    });

    it('validates LaunchApplication step', () => {
      const v = new ActionValidator();
      const steps = [{ action: { LaunchApplication: { path: '', args: [] } }, delay_ms: 0 }];
      const errors = v.validate('KeyboardShortcut', { mappingName: 'test', keys: ['a'], modifiers: [] }, true, steps);
      expect(errors.step0_path).toContain('Application path is required');
    });

    it('validates KeyboardShortcut step', () => {
      const v = new ActionValidator();
      const steps = [{ action: { KeyboardShortcut: { keys: [], modifiers: [] } }, delay_ms: 0 }];
      const errors = v.validate('KeyboardShortcut', { mappingName: 'test', keys: ['a'], modifiers: [] }, true, steps);
      expect(errors.step0_keys).toContain('At least one key or modifier');
    });

    it('validates MouseClick step', () => {
      const v = new ActionValidator();
      const steps = [{ action: { MouseClick: { button: 'left', x: -1, y: 0 } }, delay_ms: 0 }];
      const errors = v.validate('KeyboardShortcut', { mappingName: 'test', keys: ['a'], modifiers: [] }, true, steps);
      expect(errors.step0_mousePosition).toContain('Mouse coordinates must be positive');
    });

    it('validates ScriptExecution step', () => {
      const v = new ActionValidator();
      const steps = [{ action: { ScriptExecution: { script_type: ScriptType.PowerShell, content: '' } }, delay_ms: 0 }];
      const errors = v.validate('KeyboardShortcut', { mappingName: 'test', keys: ['a'], modifiers: [] }, true, steps);
      expect(errors.step0_scriptContent).toContain('Script content is required');
    });

    it('validates multiple steps independently', () => {
      const v = new ActionValidator();
      const steps = [
        { action: { OpenUrl: { url: 'https://valid.com' } }, delay_ms: 0 },
        { action: { TypeText: { text: '' } }, delay_ms: 500 },
      ];
      const errors = v.validate('KeyboardShortcut', { mappingName: 'test', keys: ['a'], modifiers: [] }, true, steps);
      expect(errors.step0_url).toBeUndefined();
      expect(errors.step1_text).toContain('Text to type is required');
    });

    it('passes with valid steps', () => {
      const v = new ActionValidator();
      const steps = [
        { action: { OpenUrl: { url: 'https://example.com' } }, delay_ms: 100 },
        { action: { TypeText: { text: 'hello' } }, delay_ms: 200 },
      ];
      const errors = v.validate('KeyboardShortcut', { mappingName: 'test', keys: ['a'], modifiers: [] }, true, steps);
      expect(v.hasErrors()).toBe(false);
    });

    it('accepts SystemCommand step without validation errors', () => {
      const v = new ActionValidator();
      const steps = [{ action: { SystemCommand: { command_type: SystemCommandType.VolumeUp } }, delay_ms: 0 }];
      const errors = v.validate('KeyboardShortcut', { mappingName: 'test', keys: ['a'], modifiers: [] }, true, steps);
      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('hasErrors / getErrors / clearError', () => {
    it('hasErrors returns false when no errors', () => {
      const v = new ActionValidator();
      v.validate('KeyboardShortcut', { mappingName: 'test', keys: ['a'], modifiers: [] }, false, []);
      expect(v.hasErrors()).toBe(false);
    });

    it('hasErrors returns true with errors', () => {
      const v = new ActionValidator();
      v.validate('KeyboardShortcut', { mappingName: '', keys: [], modifiers: [] }, false, []);
      expect(v.hasErrors()).toBe(true);
    });

    it('getErrors returns the errors object', () => {
      const v = new ActionValidator();
      v.validate('OpenUrl', { mappingName: 'test', url: '' }, false, []);
      const errors = v.getErrors();
      expect(errors.url).toBeDefined();
    });

    it('clearError removes a specific error', () => {
      const v = new ActionValidator();
      v.validate('OpenUrl', { mappingName: '', url: '' }, false, []);
      expect(v.hasErrors()).toBe(true);
      v.clearError('url');
      expect(v.getErrors().url).toBeUndefined();
      expect(v.getErrors().mappingName).toBeDefined();
    });
  });
});
