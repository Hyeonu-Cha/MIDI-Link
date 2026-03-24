import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActionForm } from './useActionForm';
import { SystemCommandType, ScriptType } from '../types';
import type { ActionMapping } from '../types';

describe('useActionForm', () => {
  describe('initial state', () => {
    it('returns default state when no editing mapping', () => {
      const { result } = renderHook(() => useActionForm());
      const { formState } = result.current;

      expect(formState.actionType).toBe('KeyboardShortcut');
      expect(formState.mappingName).toBe('');
      expect(formState.keys).toEqual([]);
      expect(formState.modifiers).toEqual([]);
      expect(formState.appPath).toBe('');
      expect(formState.appArgs).toBe('');
      expect(formState.url).toBe('');
      expect(formState.text).toBe('');
      expect(formState.mouseButton).toBe('left');
      expect(formState.mouseX).toBe(0);
      expect(formState.mouseY).toBe(0);
      expect(formState.isSelectingPoint).toBe(false);
      expect(formState.systemCommand).toBe(SystemCommandType.VolumeUp);
      expect(formState.macroSteps).toEqual([]);
      expect(formState.isMultiAction).toBe(false);
      expect(formState.scriptType).toBe(ScriptType.PowerShell);
      expect(formState.scriptContent).toBe('');
      expect(formState.errors).toEqual({});
    });
  });

  describe('editing existing mappings', () => {
    it('populates KeyboardShortcut mapping', () => {
      const mapping: ActionMapping = {
        id: 'test-1',
        name: 'Ctrl+A',
        midi_channel: 0,
        midi_note_or_cc: 60,
        action: { KeyboardShortcut: { keys: ['a'], modifiers: ['ctrl'] } },
      };
      const { result } = renderHook(() => useActionForm(mapping));
      expect(result.current.formState.actionType).toBe('KeyboardShortcut');
      expect(result.current.formState.mappingName).toBe('Ctrl+A');
      expect(result.current.formState.keys).toEqual(['a']);
      expect(result.current.formState.modifiers).toEqual(['ctrl']);
    });

    it('populates LaunchApplication mapping', () => {
      const mapping: ActionMapping = {
        id: 'test-2',
        name: 'Launch Notepad',
        midi_channel: 0,
        midi_note_or_cc: 61,
        action: { LaunchApplication: { path: 'C:\\notepad.exe', args: ['--new', 'file.txt'] } },
      };
      const { result } = renderHook(() => useActionForm(mapping));
      expect(result.current.formState.actionType).toBe('LaunchApplication');
      expect(result.current.formState.appPath).toBe('C:\\notepad.exe');
      expect(result.current.formState.appArgs).toBe('--new file.txt');
    });

    it('populates OpenUrl mapping', () => {
      const mapping: ActionMapping = {
        id: 'test-3',
        name: 'Open Google',
        midi_channel: 0,
        midi_note_or_cc: 62,
        action: { OpenUrl: { url: 'https://google.com' } },
      };
      const { result } = renderHook(() => useActionForm(mapping));
      expect(result.current.formState.actionType).toBe('OpenUrl');
      expect(result.current.formState.url).toBe('https://google.com');
    });

    it('populates TypeText mapping', () => {
      const mapping: ActionMapping = {
        id: 'test-4',
        name: 'Type Hello',
        midi_channel: 0,
        midi_note_or_cc: 63,
        action: { TypeText: { text: 'Hello World' } },
      };
      const { result } = renderHook(() => useActionForm(mapping));
      expect(result.current.formState.actionType).toBe('TypeText');
      expect(result.current.formState.text).toBe('Hello World');
    });

    it('populates MouseClick mapping', () => {
      const mapping: ActionMapping = {
        id: 'test-5',
        name: 'Click Center',
        midi_channel: 0,
        midi_note_or_cc: 64,
        action: { MouseClick: { button: 'right', x: 500, y: 300 } },
      };
      const { result } = renderHook(() => useActionForm(mapping));
      expect(result.current.formState.actionType).toBe('MouseClick');
      expect(result.current.formState.mouseButton).toBe('right');
      expect(result.current.formState.mouseX).toBe(500);
      expect(result.current.formState.mouseY).toBe(300);
    });

    it('populates SystemCommand mapping', () => {
      const mapping: ActionMapping = {
        id: 'test-6',
        name: 'Mute',
        midi_channel: 0,
        midi_note_or_cc: 65,
        action: { SystemCommand: { command_type: SystemCommandType.Mute } },
      };
      const { result } = renderHook(() => useActionForm(mapping));
      expect(result.current.formState.actionType).toBe('SystemCommand');
      expect(result.current.formState.systemCommand).toBe(SystemCommandType.Mute);
    });

    it('populates ScriptExecution mapping', () => {
      const mapping: ActionMapping = {
        id: 'test-7',
        name: 'Run Script',
        midi_channel: 0,
        midi_note_or_cc: 66,
        action: { ScriptExecution: { script_type: ScriptType.Bash, content: 'echo hi' } },
      };
      const { result } = renderHook(() => useActionForm(mapping));
      expect(result.current.formState.actionType).toBe('ScriptExecution');
      expect(result.current.formState.scriptType).toBe(ScriptType.Bash);
      expect(result.current.formState.scriptContent).toBe('echo hi');
    });

    it('populates MultiStepMacro — first step as primary, rest as macroSteps', () => {
      const mapping: ActionMapping = {
        id: 'test-8',
        name: 'Macro',
        midi_channel: 0,
        midi_note_or_cc: 67,
        action: {
          MultiStepMacro: {
            steps: [
              { action: { TypeText: { text: 'first' } }, delay_ms: 0 },
              { action: { OpenUrl: { url: 'https://example.com' } }, delay_ms: 500 },
              { action: { TypeText: { text: 'third' } }, delay_ms: 100 },
            ],
          },
        },
      };
      const { result } = renderHook(() => useActionForm(mapping));
      expect(result.current.formState.actionType).toBe('TypeText');
      expect(result.current.formState.text).toBe('first');
      expect(result.current.formState.isMultiAction).toBe(true);
      expect(result.current.formState.macroSteps).toHaveLength(2);
    });

    it('handles single-step MultiStepMacro without enabling multi-action', () => {
      const mapping: ActionMapping = {
        id: 'test-9',
        name: 'Single Macro',
        midi_channel: 0,
        midi_note_or_cc: 68,
        action: {
          MultiStepMacro: {
            steps: [
              { action: { TypeText: { text: 'only step' } }, delay_ms: 0 },
            ],
          },
        },
      };
      const { result } = renderHook(() => useActionForm(mapping));
      expect(result.current.formState.isMultiAction).toBe(false);
      expect(result.current.formState.macroSteps).toEqual([]);
    });
  });

  describe('updateField', () => {
    it('updates a single field', () => {
      const { result } = renderHook(() => useActionForm());
      act(() => {
        result.current.updateField('mappingName', 'New Name');
      });
      expect(result.current.formState.mappingName).toBe('New Name');
    });

    it('preserves other fields when updating one', () => {
      const { result } = renderHook(() => useActionForm());
      act(() => {
        result.current.updateField('url', 'https://test.com');
      });
      expect(result.current.formState.url).toBe('https://test.com');
      expect(result.current.formState.actionType).toBe('KeyboardShortcut');
    });
  });

  describe('setErrors / clearError', () => {
    it('sets errors object', () => {
      const { result } = renderHook(() => useActionForm());
      act(() => {
        result.current.setErrors({ url: 'URL required', mappingName: 'Name required' });
      });
      expect(result.current.formState.errors.url).toBe('URL required');
      expect(result.current.formState.errors.mappingName).toBe('Name required');
    });

    it('clearError removes the key entirely', () => {
      const { result } = renderHook(() => useActionForm());
      act(() => {
        result.current.setErrors({ url: 'URL required', mappingName: 'Name required' });
      });
      act(() => {
        result.current.clearError('url');
      });
      expect(result.current.formState.errors.url).toBeUndefined();
      expect('url' in result.current.formState.errors).toBe(false);
      expect(result.current.formState.errors.mappingName).toBe('Name required');
    });

    it('clearError on non-existent key is safe', () => {
      const { result } = renderHook(() => useActionForm());
      act(() => {
        result.current.clearError('nonexistent');
      });
      expect(result.current.formState.errors).toEqual({});
    });
  });

  describe('reset on null editingMapping', () => {
    it('resets form when editingMapping changes to null', () => {
      const mapping: ActionMapping = {
        id: 'test-1',
        name: 'Existing',
        midi_channel: 0,
        midi_note_or_cc: 60,
        action: { OpenUrl: { url: 'https://existing.com' } },
      };

      const { result, rerender } = renderHook(
        ({ editing }) => useActionForm(editing),
        { initialProps: { editing: mapping as ActionMapping | null } }
      );

      expect(result.current.formState.url).toBe('https://existing.com');

      rerender({ editing: null });

      expect(result.current.formState.url).toBe('');
      expect(result.current.formState.actionType).toBe('KeyboardShortcut');
      expect(result.current.formState.mappingName).toBe('');
    });
  });
});
