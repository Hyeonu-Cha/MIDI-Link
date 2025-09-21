import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { midiService } from '../services/MidiService';
import './MidiMapper.css';

interface ActionMapping {
  id: string;
  name: string;
  midi_channel: number;
  midi_note_or_cc: number;
  action: any;
}

interface Profile {
  id: string;
  name: string;
  description?: string;
  mappings: { [key: string]: ActionMapping };
}

const MidiMapper: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [selectedMidiValue, setSelectedMidiValue] = useState<number>(60);
  const [selectedChannel, setSelectedChannel] = useState<number>(1);
  const [actionType, setActionType] = useState<string>('SystemCommand');
  const [actionDetails, setActionDetails] = useState<any>({});
  const [mappingName, setMappingName] = useState<string>('');
  const [midiDevices, setMidiDevices] = useState<string[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);

  // Load profiles and initialize MIDI on component mount
  useEffect(() => {
    loadProfiles();
    loadActiveProfile();
    initializeMidi();
  }, []);

  const initializeMidi = async () => {
    try {
      const devices = await midiService.initialize();
      setMidiDevices(devices);
      midiService.startListening();
      setIsListening(true);
    } catch (error) {
      console.error('Failed to initialize MIDI:', error);
    }
  };

  const loadProfiles = async () => {
    try {
      const profileList = await invoke<Profile[]>('get_profiles');
      setProfiles(profileList);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const loadActiveProfile = async () => {
    try {
      const profile = await invoke<Profile | null>('get_active_profile');
      setActiveProfile(profile);
    } catch (error) {
      console.error('Failed to load active profile:', error);
    }
  };

  const createNewProfile = async () => {
    const name = prompt('Enter profile name:');
    if (!name) return;

    try {
      const profileId = await invoke<string>('create_profile', {
        name,
        description: 'User created profile'
      });
      await invoke('set_active_profile', { profile_id: profileId });
      loadProfiles();
      loadActiveProfile();
    } catch (error) {
      console.error('Failed to create profile:', error);
    }
  };

  const addMidiMapping = async () => {
    if (!mappingName.trim()) {
      alert('Please enter a mapping name');
      return;
    }

    const mapping: ActionMapping = {
      id: `mapping-${Date.now()}`,
      name: mappingName,
      midi_channel: selectedChannel,
      midi_note_or_cc: selectedMidiValue,
      action: createActionFromType()
    };

    try {
      await invoke('add_mapping_to_profile', { mapping });
      setMappingName('');
      loadActiveProfile();
      alert('MIDI mapping added successfully!');
    } catch (error) {
      console.error('Failed to add mapping:', error);
      alert('Failed to add mapping: ' + error);
    }
  };

  const createActionFromType = () => {
    switch (actionType) {
      case 'SystemCommand':
        return {
          SystemCommand: {
            command_type: actionDetails.systemCommand || 'VolumeUp'
          }
        };
      case 'KeyboardShortcut':
        return {
          KeyboardShortcut: {
            keys: actionDetails.keys ? actionDetails.keys.split(',').map((k: string) => k.trim()) : ['a'],
            modifiers: actionDetails.modifiers ? actionDetails.modifiers.split(',').map((m: string) => m.trim()) : []
          }
        };
      case 'TypeText':
        return {
          TypeText: {
            text: actionDetails.text || 'Hello World'
          }
        };
      case 'LaunchApplication':
        return {
          LaunchApplication: {
            path: actionDetails.appPath || 'notepad.exe',
            args: actionDetails.appArgs ? actionDetails.appArgs.split(',').map((a: string) => a.trim()) : []
          }
        };
      case 'OpenUrl':
        return {
          OpenUrl: {
            url: actionDetails.url || 'https://example.com'
          }
        };
      case 'MouseClick':
        return {
          MouseClick: {
            button: actionDetails.mouseButton || 'left',
            x: parseInt(actionDetails.mouseX) || 0,
            y: parseInt(actionDetails.mouseY) || 0
          }
        };
      default:
        return {
          SystemCommand: {
            command_type: 'VolumeUp'
          }
        };
    }
  };

  const renderActionConfig = () => {
    switch (actionType) {
      case 'SystemCommand':
        return (
          <div className="action-config">
            <label>System Command:</label>
            <select
              value={actionDetails.systemCommand || 'VolumeUp'}
              onChange={(e) => setActionDetails({...actionDetails, systemCommand: e.target.value})}
            >
              <option value="VolumeUp">Volume Up</option>
              <option value="VolumeDown">Volume Down</option>
              <option value="Mute">Mute</option>
              <option value="PlayPause">Play/Pause</option>
              <option value="NextTrack">Next Track</option>
              <option value="PreviousTrack">Previous Track</option>
              <option value="BrightnessUp">Brightness Up</option>
              <option value="BrightnessDown">Brightness Down</option>
              <option value="Screenshot">Screenshot</option>
              <option value="ClipboardCopy">Copy</option>
              <option value="ClipboardPaste">Paste</option>
            </select>
          </div>
        );

      case 'KeyboardShortcut':
        return (
          <div className="action-config">
            <div>
              <label>Keys (comma separated):</label>
              <input
                type="text"
                placeholder="e.g., a, b, c"
                value={actionDetails.keys || ''}
                onChange={(e) => setActionDetails({...actionDetails, keys: e.target.value})}
              />
            </div>
            <div>
              <label>Modifiers (comma separated):</label>
              <input
                type="text"
                placeholder="e.g., ctrl, shift, alt"
                value={actionDetails.modifiers || ''}
                onChange={(e) => setActionDetails({...actionDetails, modifiers: e.target.value})}
              />
            </div>
          </div>
        );

      case 'TypeText':
        return (
          <div className="action-config">
            <label>Text to type:</label>
            <input
              type="text"
              value={actionDetails.text || ''}
              onChange={(e) => setActionDetails({...actionDetails, text: e.target.value})}
            />
          </div>
        );

      case 'LaunchApplication':
        return (
          <div className="action-config">
            <div>
              <label>Application Path:</label>
              <input
                type="text"
                placeholder="e.g., C:\\Program Files\\App\\app.exe"
                value={actionDetails.appPath || ''}
                onChange={(e) => setActionDetails({...actionDetails, appPath: e.target.value})}
              />
            </div>
            <div>
              <label>Arguments (comma separated):</label>
              <input
                type="text"
                placeholder="e.g., --flag, --option=value"
                value={actionDetails.appArgs || ''}
                onChange={(e) => setActionDetails({...actionDetails, appArgs: e.target.value})}
              />
            </div>
          </div>
        );

      case 'OpenUrl':
        return (
          <div className="action-config">
            <label>URL:</label>
            <input
              type="url"
              value={actionDetails.url || ''}
              onChange={(e) => setActionDetails({...actionDetails, url: e.target.value})}
            />
          </div>
        );

      case 'MouseClick':
        return (
          <div className="action-config">
            <div>
              <label>Mouse Button:</label>
              <select
                value={actionDetails.mouseButton || 'left'}
                onChange={(e) => setActionDetails({...actionDetails, mouseButton: e.target.value})}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="middle">Middle</option>
              </select>
            </div>
            <div>
              <label>X Position:</label>
              <input
                type="number"
                value={actionDetails.mouseX || 0}
                onChange={(e) => setActionDetails({...actionDetails, mouseX: e.target.value})}
              />
            </div>
            <div>
              <label>Y Position:</label>
              <input
                type="number"
                value={actionDetails.mouseY || 0}
                onChange={(e) => setActionDetails({...actionDetails, mouseY: e.target.value})}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getExistingMappings = () => {
    if (!activeProfile) return [];
    return Object.values(activeProfile.mappings);
  };

  return (
    <div className="midi-mapper">
      <div className="header">
        <h1>MIDI Action Mapper</h1>

        <div className="status-section">
          <div className="midi-status">
            <h3>MIDI Status</h3>
            <div className="status-item">
              <span className={`status-indicator ${isListening ? 'connected' : 'disconnected'}`}></span>
              <span>{isListening ? 'Listening' : 'Not listening'}</span>
            </div>
            <div className="devices-info">
              <strong>Devices:</strong> {midiDevices.length > 0 ? midiDevices.join(', ') : 'None detected'}
            </div>
          </div>
        </div>

        <div className="profile-section">
          <div>
            <label>Active Profile: </label>
            <span>{activeProfile?.name || 'No active profile'}</span>
          </div>
          <button onClick={createNewProfile}>Create New Profile</button>
        </div>
      </div>

      <div className="mapping-creator">
        <h2>Create New MIDI Mapping</h2>

        <div className="midi-config">
          <div>
            <label>MIDI Channel (1-16):</label>
            <input
              type="number"
              min="1"
              max="16"
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(Number(e.target.value))}
            />
          </div>

          <div>
            <label>MIDI Value (0-127):</label>
            <input
              type="number"
              min="0"
              max="127"
              value={selectedMidiValue}
              onChange={(e) => setSelectedMidiValue(Number(e.target.value))}
            />
            <input
              type="range"
              min="0"
              max="127"
              value={selectedMidiValue}
              onChange={(e) => setSelectedMidiValue(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="action-config-section">
          <div>
            <label>Mapping Name:</label>
            <input
              type="text"
              value={mappingName}
              onChange={(e) => setMappingName(e.target.value)}
              placeholder="e.g., Volume Control"
            />
          </div>

          <div>
            <label>Action Type:</label>
            <select
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value);
                setActionDetails({});
              }}
            >
              <option value="SystemCommand">System Command</option>
              <option value="KeyboardShortcut">Keyboard Shortcut</option>
              <option value="TypeText">Type Text</option>
              <option value="LaunchApplication">Launch Application</option>
              <option value="OpenUrl">Open URL</option>
              <option value="MouseClick">Mouse Click</option>
            </select>
          </div>

          {renderActionConfig()}
        </div>

        <button onClick={addMidiMapping} className="add-mapping-btn">
          Add MIDI Mapping: Channel {selectedChannel}, Value {selectedMidiValue} → {actionType}
        </button>
      </div>

      <div className="existing-mappings">
        <h2>Existing Mappings</h2>
        {getExistingMappings().length === 0 ? (
          <p>No mappings yet. Create one above!</p>
        ) : (
          <div className="mappings-list">
            {getExistingMappings().map((mapping) => (
              <div key={mapping.id} className="mapping-item">
                <strong>{mapping.name}</strong>
                <span>Ch: {mapping.midi_channel}, Value: {mapping.midi_note_or_cc}</span>
                <span>Action: {Object.keys(mapping.action)[0]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MidiMapper;