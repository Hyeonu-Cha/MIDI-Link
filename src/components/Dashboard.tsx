import React, { useEffect, useState } from 'react';
import { Profile, MidiEvent } from '../types';
import { midiApi, profileApi } from '../services/api';
import MidiMonitor from './MidiMonitor';
import ProfileSelector from './ProfileSelector';
import MappingGrid from './MappingGrid';
import ActionEditor from './ActionEditor';

const Dashboard: React.FC = () => {
  const [midiDevices, setMidiDevices] = useState<string[]>([]);
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
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
      setMidiEnabled(devices.length > 0);

      // Load profiles
      const profileList = await profileApi.getProfiles();
      setProfiles(profileList);

      // Get active profile
      const active = await profileApi.getActiveProfile();
      setActiveProfile(active);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setMidiEnabled(false);
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

  const handleEnableMidi = async () => {
    try {
      console.log('Calling midiApi.initializeMidi()...');
      const devices = await midiApi.initializeMidi();
      console.log('MIDI devices found:', devices);
      setMidiDevices(devices);
      const newState = devices.length > 0;
      console.log('Setting midiEnabled to:', newState);
      setMidiEnabled(newState);
    } catch (error) {
      console.error('Failed to enable MIDI:', error);
      setMidiEnabled(false);
    }
  };

  const handleToggleMidi = async () => {
    console.log('Toggle clicked, current state:', midiEnabled);
    if (midiEnabled) {
      // Disable MIDI
      console.log('Disabling MIDI');
      setMidiEnabled(false);
      setMidiDevices([]);
    } else {
      // Enable MIDI
      console.log('Enabling MIDI');
      try {
        await handleEnableMidi();
        // Force enable for testing if no devices found
        if (midiDevices.length === 0) {
          console.log('No devices found, but enabling toggle anyway for testing');
          setMidiEnabled(true);
        }
      } catch (error) {
        console.error('Error in toggle:', error);
        // For testing purposes, enable anyway
        setMidiEnabled(true);
      }
    }
  };

  const toggleLeftPanel = () => {
    setLeftPanelVisible(!leftPanelVisible);
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
        {leftPanelVisible && (
          <div className="left-panel">
            <div className="section">
              <div className="section-header-with-toggle">
                <h3>MIDI</h3>
                <button
                  className={`panel-toggle-btn left-panel-open`}
                  onClick={toggleLeftPanel}
                  title="Hide panel"
                >
                  {'<<'}
                </button>
              </div>
              <div className="midi-toggle-container">
                <div className="midi-toggle" onClick={handleToggleMidi}>
                  <input
                    type="checkbox"
                    checked={midiEnabled}
                    readOnly
                    className="midi-toggle-input"
                  />
                  <span className={`midi-toggle-slider ${midiEnabled ? 'enabled' : 'disabled'}`}>
                    <span className="midi-toggle-button"></span>
                  </span>
                  <span className="midi-toggle-label">
                    {midiEnabled ? 'MIDI Enabled' : 'MIDI Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="section">
              <h3>Profile</h3>
              <ProfileSelector
                profiles={profiles}
                activeProfile={activeProfile}
                onProfileChange={handleProfileChange}
                onProfileDeleted={initializeApp}
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
        )}

        <div className="main-panel">
          <div className={`section ${!leftPanelVisible ? 'with-toggle' : ''}`} style={{ position: 'relative' }}>
            {!leftPanelVisible && (
              <button
                className={`panel-toggle-btn left-panel-closed`}
                onClick={toggleLeftPanel}
                title="Show panel"
              >
                {'>>'}
              </button>
            )}
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