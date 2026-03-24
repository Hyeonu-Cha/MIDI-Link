import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { midiApi, actionApi, profileApi } from './api';
import { SystemCommandType } from '../types';

vi.mocked(invoke);

describe('midiApi', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it('initializeMidi calls correct command', async () => {
    vi.mocked(invoke).mockResolvedValue(['Device 1', 'Device 2']);
    const result = await midiApi.initializeMidi();
    expect(invoke).toHaveBeenCalledWith('initialize_midi');
    expect(result).toEqual(['Device 1', 'Device 2']);
  });

  it('getMidiDevices calls correct command', async () => {
    vi.mocked(invoke).mockResolvedValue(['Device 1']);
    const result = await midiApi.getMidiDevices();
    expect(invoke).toHaveBeenCalledWith('get_midi_devices');
    expect(result).toEqual(['Device 1']);
  });
});

describe('actionApi', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it('executeAction sends action payload', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const action = { SystemCommand: { command_type: SystemCommandType.VolumeUp } };
    await actionApi.executeAction(action);
    expect(invoke).toHaveBeenCalledWith('execute_action', { action });
  });
});

describe('profileApi', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it('createProfile sends name and description', async () => {
    vi.mocked(invoke).mockResolvedValue('profile-123');
    const result = await profileApi.createProfile('Test', 'A test profile');
    expect(invoke).toHaveBeenCalledWith('create_profile', { name: 'Test', description: 'A test profile' });
    expect(result).toBe('profile-123');
  });

  it('createProfile sends undefined description when omitted', async () => {
    vi.mocked(invoke).mockResolvedValue('profile-456');
    await profileApi.createProfile('Test');
    expect(invoke).toHaveBeenCalledWith('create_profile', { name: 'Test', description: undefined });
  });

  it('getProfiles calls correct command', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    const result = await profileApi.getProfiles();
    expect(invoke).toHaveBeenCalledWith('get_profiles');
    expect(result).toEqual([]);
  });

  it('setActiveProfile sends profileId', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    await profileApi.setActiveProfile('abc-123');
    expect(invoke).toHaveBeenCalledWith('set_active_profile', { profileId: 'abc-123' });
  });

  it('getActiveProfile calls correct command', async () => {
    vi.mocked(invoke).mockResolvedValue(null);
    const result = await profileApi.getActiveProfile();
    expect(invoke).toHaveBeenCalledWith('get_active_profile');
    expect(result).toBeNull();
  });

  it('addMappingToProfile sends mapping', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const mapping = {
      id: 'm-1',
      name: 'Test Mapping',
      midi_channel: 0,
      midi_note_or_cc: 60,
      action: { TypeText: { text: 'hello' } },
    };
    await profileApi.addMappingToProfile(mapping);
    expect(invoke).toHaveBeenCalledWith('add_mapping_to_profile', { mapping });
  });

  it('deleteMapping sends mappingId', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    await profileApi.deleteMapping('m-1');
    expect(invoke).toHaveBeenCalledWith('delete_mapping', { mappingId: 'm-1' });
  });

  it('deleteProfile sends profileId', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    await profileApi.deleteProfile('p-1');
    expect(invoke).toHaveBeenCalledWith('delete_profile', { profileId: 'p-1' });
  });

  it('exportProfile sends profileId and exportPath', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    await profileApi.exportProfile('p-1', 'C:\\export.json');
    expect(invoke).toHaveBeenCalledWith('export_profile', { profileId: 'p-1', exportPath: 'C:\\export.json' });
  });

  it('importProfile sends importPath', async () => {
    vi.mocked(invoke).mockResolvedValue('new-profile-id');
    const result = await profileApi.importProfile('C:\\import.json');
    expect(invoke).toHaveBeenCalledWith('import_profile', { importPath: 'C:\\import.json' });
    expect(result).toBe('new-profile-id');
  });

  it('checkProfileSecurity sends importPath', async () => {
    vi.mocked(invoke).mockResolvedValue(['Warning: script found']);
    const result = await profileApi.checkProfileSecurity('C:\\profile.json');
    expect(invoke).toHaveBeenCalledWith('check_profile_security', { importPath: 'C:\\profile.json' });
    expect(result).toEqual(['Warning: script found']);
  });
});
