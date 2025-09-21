import { invoke } from '@tauri-apps/api/core';

interface MidiEvent {
  device_name: string;
  timestamp: number;
  message_type: string;
  channel: number;
  data1: number;
  data2: number;
  velocity: number;
}

interface ActionMapping {
  id: string;
  name: string;
  midi_channel: number;
  midi_note_or_cc: number;
  action: any;
}

class MidiService {
  private isListening = false;
  private listeners: ((event: MidiEvent) => void)[] = [];

  async initialize(): Promise<string[]> {
    try {
      const devices = await invoke<string[]>('initialize_midi');
      console.log('MIDI initialized. Available devices:', devices);
      return devices;
    } catch (error) {
      console.error('Failed to initialize MIDI:', error);
      throw error;
    }
  }

  async getDevices(): Promise<string[]> {
    try {
      return await invoke<string[]>('get_midi_devices');
    } catch (error) {
      console.error('Failed to get MIDI devices:', error);
      return [];
    }
  }

  async executeAction(action: any): Promise<void> {
    try {
      await invoke('execute_action', { action });
    } catch (error) {
      console.error('Failed to execute action:', error);
      throw error;
    }
  }

  startListening() {
    if (this.isListening) return;

    this.isListening = true;
    console.log('Started MIDI listening service');

    // Note: In a real implementation, you would set up a proper event listener
    // from the Rust backend. For now, this is a placeholder structure.
    // The actual MIDI event receiving would need to be implemented in the Rust backend
    // with proper event streaming to the frontend.
  }

  stopListening() {
    this.isListening = false;
    console.log('Stopped MIDI listening service');
  }

  addListener(callback: (event: MidiEvent) => void) {
    this.listeners.push(callback);
  }

  removeListener(callback: (event: MidiEvent) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private notifyListeners(event: MidiEvent) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in MIDI event listener:', error);
      }
    });
  }

  // This method would be called when a MIDI event is received
  // In a real implementation, this would be triggered by the Rust backend
  private handleMidiEvent(event: MidiEvent) {
    console.log('MIDI Event received:', event);
    this.notifyListeners(event);
  }

  // Helper method to match MIDI events to actions
  static async findAndExecuteAction(
    event: MidiEvent,
    mappings: ActionMapping[]
  ): Promise<boolean> {
    // Find matching mapping based on channel and MIDI value (note/CC)
    const matching = mappings.find(mapping =>
      mapping.midi_channel === event.channel &&
      mapping.midi_note_or_cc === event.data1
    );

    if (matching) {
      try {
        await invoke('execute_action', { action: matching.action });
        console.log(`Executed action "${matching.name}" for MIDI Ch:${event.channel} Value:${event.data1}`);
        return true;
      } catch (error) {
        console.error(`Failed to execute action "${matching.name}":`, error);
        return false;
      }
    }

    return false;
  }
}

export const midiService = new MidiService();
export type { MidiEvent, ActionMapping };