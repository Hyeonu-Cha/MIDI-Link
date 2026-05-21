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
  const [midiReconnecting, setMidiReconnecting] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [appVersion, setAppVersion] = useState('');
  const [lastMidiEvent, setLastMidiEvent] = useState<MidiEvent | null>(null);
  const [showActionEditor, setShowActionEditor] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<string | null>(null);
  const [editingMapping, setEditingMapping] = useState<ActionMapping | null>(null);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [triggerMidiSelector, setTriggerMidiSelector] = useState(false);
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

  useEffect(() => { initializeApp(); }, []);

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
    } else {
      try {
        const devices = await midiApi.initializeMidi();
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

  return (
    <div data-testid="dashboard" className="bg-surface-container-lowest text-on-surface font-body overflow-hidden h-screen flex flex-col">

      {/* ── Top Navigation Bar ── */}
      <header data-testid="dashboard-header" className="flex justify-between items-center w-full px-6 h-16 bg-[#131315] shadow-[0_0_24px_rgba(0,242,255,0.12)] z-50 flex-shrink-0">
        <div className="flex items-center gap-8">
          <h1 data-testid="app-title" className="text-xl font-black tracking-tighter text-[#e1fdff]">MIDI-Link</h1>
          <nav className="hidden md:flex items-center gap-6">
            <span className="font-label tracking-tight text-sm uppercase font-medium text-[#e1fdff] border-b-2 border-[#00f2ff] pb-1">Studio</span>
            <span className="font-label tracking-tight text-sm uppercase font-medium text-[#b9cacb] px-2 py-1 rounded">Devices</span>
            <span className="font-label tracking-tight text-sm uppercase font-medium text-[#b9cacb] px-2 py-1 rounded">Logs</span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {midiEnabled && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-container/10 border border-primary-container/20 pulse-glow">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary-container">Learn Mode Active</span>
            </div>
          )}
          <div className="h-6 w-px bg-outline-variant/30" />
          <span data-testid="version-display" className="text-xs text-on-surface-variant font-mono">{appVersion}</span>
          <button
            data-testid="midi-toggle"
            data-midi-enabled={midiEnabled ? 'true' : 'false'}
            className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors duration-150"
            onClick={handleToggleMidi}
            title={midiEnabled ? 'Disable MIDI' : 'Enable MIDI'}
          >
            {midiEnabled ? 'settings_input_component' : 'settings_input_component'}
          </button>
        </div>
      </header>

      <div data-testid="dashboard-content" className="flex flex-1 overflow-hidden">

        {/* ── Side Navigation ── */}
        <aside data-testid="left-panel" className="hidden md:flex flex-col h-full w-64 bg-[#1b1b1d] py-8 gap-4 border-r border-outline-variant/10 flex-shrink-0">
          <div className="px-6 mb-4">
            <h2 className="font-label text-xs font-bold uppercase tracking-widest text-[#e1fdff]">Pro Studio</h2>
            <p className="text-[10px] text-on-surface-variant font-mono">{appVersion}</p>
          </div>

          <nav className="flex flex-col gap-1">
            {/* Profile Select — toggles selector */}
            <button
              className={`flex items-center justify-between gap-3 px-6 py-3 w-full text-left transition-all duration-200 ${showProfileSelector ? 'bg-[#00f2ff]/10 text-[#00f2ff] border-r-4 border-[#00f2ff]' : 'text-[#b9cacb] hover:bg-[#201f21] hover:text-[#e1fdff]'}`}
              onClick={() => setShowProfileSelector(p => !p)}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">person_search</span>
                <span className="font-label text-xs font-bold uppercase tracking-widest">Profile Select</span>
              </div>
              <span className="material-symbols-outlined text-sm">{showProfileSelector ? 'expand_less' : 'expand_more'}</span>
            </button>

            {/* Inline ProfileSelector */}
            {showProfileSelector && (
              <div className="px-4 py-3 bg-surface-container-lowest border-b border-outline-variant/10">
                <ProfileSelector
                  profiles={profiles}
                  activeProfile={activeProfile}
                  onProfileChange={handleProfileChange}
                  onProfileDeleted={initializeApp}
                />
              </div>
            )}

            <div className="flex items-center gap-3 px-6 py-3 bg-[#00f2ff]/10 text-[#00f2ff] border-r-4 border-[#00f2ff] cursor-default">
              <span className="material-symbols-outlined text-lg">settings_input_component</span>
              <span className="font-label text-xs font-bold uppercase tracking-widest">MIDI Devices</span>
            </div>
            <button
              data-testid="reconnect-btn"
              className="flex items-center gap-3 px-6 py-3 text-[#b9cacb] hover:bg-[#201f21] hover:text-[#e1fdff] transition-all duration-200 cursor-pointer w-full text-left"
              onClick={handleReconnectMidi}
              disabled={midiReconnecting}
            >
              <span className={`material-symbols-outlined text-lg ${midiReconnecting ? 'animate-spin' : ''}`}>refresh</span>
              <span className="font-label text-xs font-bold uppercase tracking-widest">
                {midiReconnecting ? 'Reconnecting…' : 'Reconnect'}
              </span>
            </button>
            <div className="flex items-center gap-3 px-6 py-3 text-[#b9cacb] cursor-default">
              <span className="material-symbols-outlined text-lg">bolt</span>
              <span className="font-label text-xs font-bold uppercase tracking-widest">Automation</span>
            </div>
          </nav>

          <div className="mt-auto px-4 space-y-4">
            {/* Device Status */}
            {midiEnabled && (
              <div className="bg-surface-container rounded-xl p-4 border-l-2 border-primary-container">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] uppercase tracking-tighter text-on-surface-variant font-bold">MIDI Status</span>
                  <span className="material-symbols-outlined text-primary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <p className="text-sm font-bold text-primary">Connected</p>
                <p className="text-[10px] text-on-surface-variant">{totalMappings} mapping{totalMappings !== 1 ? 's' : ''} active</p>
              </div>
            )}

            {/* MIDI Monitor */}
            <div data-testid="midi-monitor" className="glass-panel rounded-xl p-4 border border-outline-variant/20">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] uppercase tracking-tighter text-on-surface-variant font-bold">MIDI Monitor</span>
                <span className={`w-1.5 h-1.5 rounded-full ${lastMidiEvent ? 'bg-primary-container pulse-glow animate-pulse' : 'bg-outline-variant'}`} />
              </div>
              <MidiMonitor lastEvent={lastMidiEvent} />
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main data-testid="main-panel" className="flex-1 overflow-y-auto bg-surface-container-lowest p-8 lg:p-12 no-scrollbar">
          <div className="max-w-6xl mx-auto">

            {/* Dashboard header */}
            <header className="mb-10 flex justify-between items-end">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-black tracking-tighter text-on-surface">Studio Dashboard</h2>
                  {activeProfile && (
                    <div className="bg-secondary-container/20 px-2 py-0.5 rounded text-[10px] font-bold text-secondary uppercase tracking-widest">
                      {activeProfile.name}
                    </div>
                  )}
                </div>
                <p className="text-on-surface-variant max-w-md text-sm">
                  Orchestrate your workflow with precision MIDI routing and real-time automation control.
                </p>
              </div>
              <button
                data-testid="new-mapping-btn"
                disabled={!activeProfile}
                title={activeProfile ? undefined : 'Select or create a profile first'}
                className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_4px_20px_rgba(0,242,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                onClick={() => { setEditingMapping(null); setTriggerMidiSelector(true); }}
              >
                <span className="material-symbols-outlined text-lg">add</span>
                NEW MAPPING
              </button>
            </header>

            {/* Mapping Grid */}
            <MappingGrid
              profile={activeProfile}
              onCreateMapping={handleCreateMapping}
              onEditMapping={handleEditMapping}
              onDeleteMapping={handleDeleteMapping}
              requestSelector={triggerMidiSelector}
              onSelectorRequested={() => setTriggerMidiSelector(false)}
            />

            {/* Footer Stats */}
            <div className="mt-12 flex flex-wrap gap-8 items-center justify-between border-t border-outline-variant/10 pt-8">
              <div className="flex gap-12">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Active Mappings</p>
                  <p className="text-2xl font-black text-on-surface">{totalMappings}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">MIDI Status</p>
                  <p className={`text-2xl font-black ${midiEnabled ? 'text-primary-container' : 'text-on-surface-variant'}`}>
                    {midiEnabled ? 'Online' : 'Offline'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Profiles</p>
                  <p className="text-2xl font-black text-secondary">{profiles.length}</p>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Action Editor Modal */}
      {showActionEditor && (
        <ActionEditor
          mappingKey={selectedMapping}
          profile={activeProfile}
          editingMapping={editingMapping}
          onClose={() => { setShowActionEditor(false); setSelectedMapping(null); setEditingMapping(null); }}
          onSave={async () => {
            const active = await profileApi.getActiveProfile();
            setActiveProfile(active);
            setShowActionEditor(false);
            setSelectedMapping(null);
            setEditingMapping(null);
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Background decorative glows */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary-container/5 rounded-full blur-[120px] -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-secondary-container/10 rounded-full blur-[100px] -z-10 pointer-events-none -translate-x-1/2 translate-y-1/2" />
    </div>
  );
};

export default Dashboard;
