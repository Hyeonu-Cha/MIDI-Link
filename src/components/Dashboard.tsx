import React, { useEffect, useState } from 'react';
import { Profile, MidiEvent } from '../types';
import { midiApi, profileApi } from '../services/api';
import MidiMonitor from './MidiMonitor';
import ProfileSelector from './ProfileSelector';
import MappingGrid from './MappingGrid';
import ActionEditor from './ActionEditor';

const Dashboard: React.FC = () => {
  const [midiDevices, setMidiDevices] = useState<string[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [appVersion] = useState('v0.1.0');
  const [lastMidiEvent, setLastMidiEvent] = useState<MidiEvent | null>(null);
  const [showActionEditor, setShowActionEditor] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<string | null>(null);
  const [editingMapping, setEditingMapping] = useState<any>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize MIDI
      const devices = await midiApi.initializeMidi();
      setMidiDevices(devices);

      // Load profiles
      const profileList = await profileApi.getProfiles();
      setProfiles(profileList);

      // Get active profile
      const active = await profileApi.getActiveProfile();
      setActiveProfile(active);
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  };

  const handleProfileChange = async (profileId: string) => {
    try {
      await profileApi.setActiveProfile(profileId);
      const active = await profileApi.getActiveProfile();
      setActiveProfile(active);
    } catch (error) {
      console.error('Failed to set active profile:', error);
    }
  };

  const handleCreateMapping = (channel: number, noteOrCc: number) => {
    setSelectedMapping(`${channel}:${noteOrCc}`);
    setShowActionEditor(true);
  };

  const handleMidiEvent = (event: MidiEvent) => {
    setLastMidiEvent(event);
  };

  const handleEditMapping = (mapping: any) => {
    setEditingMapping(mapping);
    setSelectedMapping(`${mapping.midi_channel}:${mapping.midi_note_or_cc}`);
    setShowActionEditor(true);
  };

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      // Call a new API to delete mapping
      await profileApi.deleteMapping(mappingId);
      // Refresh active profile
      const active = await profileApi.getActiveProfile();
      setActiveProfile(active);
    } catch (error) {
      console.error('Failed to delete mapping:', error);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-title">
          <img src="/MIDI-Link.png" alt="MIDI-Link" className="logo" />
          <h1>MIDI-Link</h1>
        </div>
        <div className="header-controls">
          <div className="version-display">
            {appVersion}
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="left-panel">
          <div className="section">
            <h3>MIDI Devices</h3>
            <div className="device-list">
              {midiDevices.length > 0 ? (
                midiDevices.map((device, index) => (
                  <div key={index} className="device-item">
                    <span className="status-indicator connected"></span>
                    {device}
                  </div>
                ))
              ) : (
                <div className="no-devices">No MIDI devices detected</div>
              )}
            </div>
          </div>

          <div className="section">
            <h3>Profile</h3>
            <ProfileSelector
              profiles={profiles}
              activeProfile={activeProfile}
              onProfileChange={handleProfileChange}
            />
          </div>

          <div className="section">
            <h3>MIDI Monitor</h3>
            <MidiMonitor 
              lastEvent={lastMidiEvent}
              onMidiEvent={handleMidiEvent}
            />
          </div>
        </div>

        <div className="main-panel">
          <div className="section">
            <h3>Mappings</h3>
            <MappingGrid
              profile={activeProfile}
              onCreateMapping={handleCreateMapping}
              onEditMapping={handleEditMapping}
              onDeleteMapping={handleDeleteMapping}
            />
          </div>
        </div>
      </div>

      {showActionEditor && (
        <ActionEditor
          mappingKey={selectedMapping}
          profile={activeProfile}
          editingMapping={editingMapping}
          onClose={() => {
            setShowActionEditor(false);
            setSelectedMapping(null);
            setEditingMapping(null);
          }}
          onSave={async () => {
            // Refresh active profile
            const active = await profileApi.getActiveProfile();
            setActiveProfile(active);
            setShowActionEditor(false);
            setSelectedMapping(null);
            setEditingMapping(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;