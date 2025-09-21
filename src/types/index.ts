export interface MidiEvent {
  device_name: string;
  timestamp: number;
  message_type: MidiMessageType;
  channel: number;
  data1: number;
  data2: number;
  velocity: number;
}

export enum MidiMessageType {
  NoteOn = "NoteOn",
  NoteOff = "NoteOff",
  ControlChange = "ControlChange",
  ProgramChange = "ProgramChange",
  Unknown = "Unknown",
}

export interface ActionMapping {
  id: string;
  name: string;
  midi_channel: number;
  midi_note_or_cc: number;
  action: Action;
}

export type Action =
  | { KeyboardShortcut: { keys: string[]; modifiers: string[] } }
  | { LaunchApplication: { path: string; args: string[] } }
  | { OpenUrl: { url: string } }
  | { TypeText: { text: string } }
  | { MouseClick: { button: string; x: number; y: number } }
  | { SystemCommand: { command_type: SystemCommandType } }
  | { MultiStepMacro: { steps: MacroStep[] } }
  | { ScriptExecution: { script_type: ScriptType; content: string } };

export interface MacroStep {
  action: Action;
  delay_ms: number;
}

export enum ScriptType {
  PowerShell = "PowerShell",
  Bash = "Bash",
  Cmd = "Cmd",
}

export enum SystemCommandType {
  VolumeUp = "VolumeUp",
  VolumeDown = "VolumeDown",
  Mute = "Mute",
  PlayPause = "PlayPause",
  NextTrack = "NextTrack",
  PreviousTrack = "PreviousTrack",
  BrightnessUp = "BrightnessUp",
  BrightnessDown = "BrightnessDown",
  Sleep = "Sleep",
  Lock = "Lock",
  Shutdown = "Shutdown",
  Restart = "Restart",
  MinimizeWindow = "MinimizeWindow",
  MaximizeWindow = "MaximizeWindow",
  CloseWindow = "CloseWindow",
  SwitchDesktop = "SwitchDesktop",
  TaskView = "TaskView",
  Screenshot = "Screenshot",
  ClipboardCopy = "ClipboardCopy",
  ClipboardPaste = "ClipboardPaste",
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  mappings: Record<string, ActionMapping>;
  created_at: string;
  updated_at: string;
}

export interface AppState {
  midiDevices: string[];
  activeProfile?: Profile;
  profiles: Profile[];
  isLearningMode: boolean;
  lastMidiEvent?: MidiEvent;
}