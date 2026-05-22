import { FC, useEffect, useState, useRef, useCallback } from 'react';
import { Profile, MidiEvent, ActionMapping } from '../types';
import { midiApi, profileApi } from '../services/api';
import { listen } from '@tauri-apps/api/event';
import { getVersion } from '@tauri-apps/api/app';
import MidiMonitor from './MidiMonitor';
import ProfileSelector from './ProfileSelector';
import MappingGrid from './MappingGrid';
import ActionEditor from './ActionEditor';
import ToastContainer, { useToast } from './Toast';

const Dashboard: FC = () => {
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [midiDevices, setMidiDevices] = useState<string[]>([]);
  const [midiReconnecting, setMidiReconnecting] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [appVersion, setAppVersion] = useState('');
  const [lastMidiEvent, setLastMidiEvent] = useState<MidiEvent | null>(null);
  const [showActionEditor, setShowActionEditor] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<string | null>(null);
  const [editingMapping, setEditingMapping] = useState<ActionMapping | null>(null);
  const [triggerNewMapping, setTriggerNewMapping] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();
  const lastMidiUpdateRef = useRef(0);
  const pendingMidiRef = useRef<MidiEvent | null>(null);
  const midiRafRef = useRef<number | null>(null);

  const throttledSetMidiEvent = useCallback((event: MidiEvent) => {
    const now = Date.now();
    pendingMidiRef.current = event;
    if (now - lastMidiUpdateRef.current >= 50) {
      lastMidiUpdateRef.current = now;
      setLastMidiEvent(event);
      pendingMidiRef.current = null;
    } else if (!midiRafRef.current) {
      midiRafRef.current = requestAnimationFrame(() => {
        if (pendingMidiRef.current) {
          setLastMidiEvent(pendingMidiRef.current);
          lastMidiUpdateRef.current = Date.now();
          pendingMidiRef.current = null;
        }
        midiRafRef.current = null;
      });
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    const unlisten = listen<MidiEvent>('midi-event', (event) => {
      throttledSetMidiEvent(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
      if (midiRafRef.current) cancelAnimationFrame(midiRafRef.current);
    };
  }, [throttledSetMidiEvent]);

  const initializeApp = async () => {
    try {
      const version = await getVersion();
      setAppVersion(`v${version}`);
      const devices = await midiApi.initializeMidi();
      setMidiDevices(devices);
      setMidiEnabled(devices.length > 0);
      const profileList = await profileApi.getProfiles();
      setProfiles(profileList);
      const active = await profileApi.getActiveProfile();
      setActiveProfile(active);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      addToast('Failed to initialize app. Check MIDI devices and try again.', 'error');
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
      addToast('Failed to switch profile.', 'error');
    }
  };

  const handleCreateMapping = (channel: number, noteOrCc: number) => {
    setSelectedMapping(`${channel}:${noteOrCc}`);
    setShowActionEditor(true);
  };

  const handleEditMapping = (mapping: ActionMapping) => {
    setEditingMapping(mapping);
    setSelectedMapping(`${mapping.midi_channel}:${mapping.midi_note_or_cc}`);
    setShowActionEditor(true);
  };

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      await profileApi.deleteMapping(mappingId);
      const active = await profileApi.getActiveProfile();
      setActiveProfile(active);
    } catch (error) {
      console.error('Failed to delete mapping:', error);
      addToast('Failed to delete mapping.', 'error');
    }
  };

  const handleToggleMidi = async () => {
    if (midiEnabled) {
      setMidiEnabled(false);
      setMidiDevices([]);
    } else {
      try {
        const devices = await midiApi.initializeMidi();
        setMidiDevices(devices);
        setMidiEnabled(devices.length > 0);
      } catch (error) {
        console.error('Failed to enable MIDI:', error);
        addToast('Failed to enable MIDI. No devices found.', 'error');
        setMidiEnabled(false);
      }
    }
  };

  const handleReconnectMidi = async () => {
    setMidiReconnecting(true);
    try {
      const devices = await midiApi.reconnectMidi();
      setMidiDevices(devices);
      setMidiEnabled(devices.length > 0);
    } catch (error) {
      console.error('Failed to reconnect MIDI:', error);
      addToast('Failed to reconnect MIDI devices.', 'error');
      setMidiEnabled(false);
    } finally {
      setMidiReconnecting(false);
    }
  };

  const totalMappings = activeProfile ? Object.keys(activeProfile.mappings).length : 0;
  const firstDevice = midiDevices[0] ?? null;

  return (
    <div className="app-shell">
      {/* atmospheric glow blobs */}
      <div className="atmos-cyan" />
      <div className="atmos-violet" />

      {/* ── Top Nav ─────────────────────────────────────────────── */}
      <nav className="topnav">
        <div className="left">
          <h1 className="wordmark">
            MIDI<span className="accent">-</span>Link
          </h1>
          <nav>
            <button className="navlink active">Studio</button>
          </nav>
        </div>
        <div className="right">
          {appVersion && <span className="version">{appVersion}</span>}
          <div className="divider" />
          {midiEnabled && (
            <span className="learn-pill">
              <span className="dot" />
              <span className="text">LIVE</span>
            </span>
          )}
          <button
            className="icon-btn"
            onClick={handleToggleMidi}
            title={midiEnabled ? 'Disable MIDI' : 'Enable MIDI'}
          >
            <span className="material-symbols-outlined">settings_input_component</span>
          </button>
          {midiEnabled && (
            <button
              className="icon-btn"
              onClick={handleReconnectMidi}
              disabled={midiReconnecting}
              title="Reconnect MIDI devices"
            >
              <span className={`material-symbols-outlined${midiReconnecting ? ' spin' : ''}`}>
                refresh
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="body-row">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sb-head">
            <h2>Signal Routing</h2>
            <p>{activeProfile?.name ?? 'No profile active'}</p>
          </div>

          <nav className="sb-nav">
            <button className="sb-link active">
              <span className="label">
                <span className="material-symbols-outlined">bolt</span>
                Studio Dashboard
              </span>
            </button>
            <button className="sb-link">
              <span className="label">
                <span className="material-symbols-outlined">person_search</span>
                Profile Select
              </span>
            </button>
          </nav>

          <div className="sb-foot">
            <ProfileSelector
              profiles={profiles}
              activeProfile={activeProfile}
              onProfileChange={handleProfileChange}
              onProfileDeleted={initializeApp}
            />

            <div className="sb-status">
              <div className="top">
                <span className="lbl">MIDI Status</span>
                {midiEnabled ? (
                  <span className="check material-symbols-outlined">check_circle</span>
                ) : (
                  <span className="offline-icon material-symbols-outlined">settings_input_component</span>
                )}
              </div>
              <p className="value">{midiEnabled ? (firstDevice ?? 'Connected') : 'Offline'}</p>
              <p className="meta">{midiEnabled ? 'Ready for input' : 'No device detected'}</p>
            </div>

            <MidiMonitor lastEvent={lastMidiEvent} midiEnabled={midiEnabled} />
          </div>
        </aside>

        {/* Main content */}
        <main className="main">
          <div className="main-inner">
            <header className="dash-head">
              <div>
                <div className="dash-title-row">
                  <h2 className="dash-title">Studio Dashboard</h2>
                  {activeProfile && (
                    <span className="profile-badge">{activeProfile.name}</span>
                  )}
                </div>
                <p className="dash-subtitle">
                  Orchestrate your workflow with precision MIDI routing and real-time automation control.
                </p>
              </div>
              <button
                className="btn-cta"
                disabled={!activeProfile}
                title={activeProfile ? undefined : 'Select or create a profile first'}
                onClick={() => setTriggerNewMapping(true)}
              >
                <span className="material-symbols-outlined">add</span>
                NEW MAPPING
              </button>
            </header>

            <MappingGrid
              profile={activeProfile}
              onCreateMapping={handleCreateMapping}
              onEditMapping={handleEditMapping}
              onDeleteMapping={handleDeleteMapping}
              triggerMidiSelector={triggerNewMapping}
              onTriggerHandled={() => setTriggerNewMapping(false)}
            />

            <div className="dash-footer">
              <div className="stat">
                <p className="lbl">Active Mappings</p>
                <p className="val">{totalMappings}</p>
              </div>
              <div className="stat">
                <p className="lbl">MIDI Status</p>
                <p className={`val${midiEnabled ? ' cyan' : ''}`}>
                  {midiEnabled ? 'Online' : 'Offline'}
                </p>
              </div>
              <div className="stat">
                <p className="lbl">Profiles</p>
                <p className="val violet">{profiles.length}</p>
              </div>
            </div>
          </div>
        </main>
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
            const active = await profileApi.getActiveProfile();
            setActiveProfile(active);
            setShowActionEditor(false);
            setSelectedMapping(null);
            setEditingMapping(null);
          }}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default Dashboard;
