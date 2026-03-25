import { invoke } from '@tauri-apps/api/core';
import { Profile, ActionMapping, Action } from '../types';

export const midiApi = {
  async initializeMidi(): Promise<string[]> {
    return await invoke('initialize_midi');
  },

  async getMidiDevices(): Promise<string[]> {
    return await invoke('get_midi_devices');
  },

  async reconnectMidi(): Promise<string[]> {
    return await invoke('reconnect_midi');
  },
};

export const actionApi = {
  async executeAction(action: Action): Promise<void> {
    return await invoke('execute_action', { action });
  },
};

export const profileApi = {
  async createProfile(name: string, description?: string): Promise<string> {
    return await invoke('create_profile', { name, description });
  },

  async getProfiles(): Promise<Profile[]> {
    return await invoke('get_profiles');
  },

  async setActiveProfile(profileId: string): Promise<void> {
    return await invoke('set_active_profile', { profileId });
  },

  async addMappingToProfile(mapping: ActionMapping): Promise<void> {
    return await invoke('add_mapping_to_profile', { mapping });
  },

  async getActiveProfile(): Promise<Profile | null> {
    return await invoke('get_active_profile');
  },

  async deleteMapping(mappingId: string): Promise<void> {
    return await invoke('delete_mapping', { mappingId });
  },

  async deleteProfile(profileId: string): Promise<void> {
    return await invoke('delete_profile', { profileId });
  },

  async checkProfileSecurity(importPath: string): Promise<string[]> {
    return await invoke('check_profile_security', { importPath });
  },

  async importProfile(importPath: string): Promise<string> {
    return await invoke('import_profile', { importPath });
  },

  async exportProfile(profileId: string, exportPath: string): Promise<void> {
    return await invoke('export_profile', { profileId, exportPath });
  },
};