import { FC, useState, useEffect } from 'react';
import { Profile, ActionMapping, Action } from '../types';

interface MappingGridProps {
  profile: Profile | null;
  onCreateMapping: (channel: number, noteOrCc: number) => void;
  onEditMapping?: (mapping: ActionMapping) => void;
  onDeleteMapping?: (mappingId: string) => void;
  requestSelector?: boolean;
  onSelectorRequested?: () => void;
}

interface ActionInfo {
  icon: string;
  description: string;
  hoverBorder: string;
  iconColor: string;
  statusText: string;
  statusColor: string;
  barColor: string;
  barWidth: string;
}

function getActionInfo(action: Action): ActionInfo {
  if ('KeyboardShortcut' in action) {
    const { keys, modifiers } = action.KeyboardShortcut;
    return {
      icon: 'keyboard',
      description: [...modifiers, ...keys].join(' + ') || 'No keys set',
      hoverBorder: 'hover:border-primary-container/40',
      iconColor: 'group-hover:text-primary-container',
      statusText: 'Active',
      statusColor: 'text-primary-container',
      barColor: 'bg-primary-container',
      barWidth: 'w-full',
    };
  }
  if ('LaunchApplication' in action) {
    const name = action.LaunchApplication.path.split(/[/\\]/).pop() || 'app';
    return {
      icon: 'launch',
      description: `Launch ${name}`,
      hoverBorder: 'hover:border-secondary',
      iconColor: 'group-hover:text-secondary',
      statusText: 'Ready',
      statusColor: 'text-secondary',
      barColor: 'bg-secondary',
      barWidth: 'w-3/4',
    };
  }
  if ('OpenUrl' in action) {
    return {
      icon: 'open_in_browser',
      description: action.OpenUrl.url || 'No URL set',
      hoverBorder: 'hover:border-tertiary-container',
      iconColor: 'group-hover:text-tertiary-container',
      statusText: 'Standby',
      statusColor: 'text-tertiary-container',
      barColor: 'bg-tertiary-container',
      barWidth: 'w-1/2',
    };
  }
  if ('TypeText' in action) {
    const preview = action.TypeText.text.length > 24 ? action.TypeText.text.slice(0, 24) + '…' : action.TypeText.text;
    return {
      icon: 'keyboard_alt',
      description: `"${preview}"`,
      hoverBorder: 'hover:border-secondary',
      iconColor: 'group-hover:text-secondary',
      statusText: 'Ready',
      statusColor: 'text-secondary',
      barColor: 'bg-secondary',
      barWidth: 'w-2/3',
    };
  }
  if ('MouseClick' in action) {
    const { button, x, y } = action.MouseClick;
    return {
      icon: 'mouse',
      description: `${button} click at (${x}, ${y})`,
      hoverBorder: 'hover:border-primary-container/40',
      iconColor: 'group-hover:text-primary-container',
      statusText: 'Active',
      statusColor: 'text-primary-container',
      barColor: 'bg-primary-container',
      barWidth: 'w-full',
    };
  }
  if ('SystemCommand' in action) {
    const label = action.SystemCommand.command_type.replace(/([A-Z])/g, ' $1').trim();
    return {
      icon: 'bolt',
      description: label,
      hoverBorder: 'hover:border-error',
      iconColor: 'group-hover:text-error',
      statusText: 'Idle',
      statusColor: 'text-on-surface-variant',
      barColor: 'bg-error',
      barWidth: 'w-0',
    };
  }
  if ('MultiStepMacro' in action) {
    const n = action.MultiStepMacro.steps.length;
    return {
      icon: 'layers',
      description: `${n} step macro`,
      hoverBorder: 'hover:border-secondary',
      iconColor: 'group-hover:text-secondary',
      statusText: 'Ready',
      statusColor: 'text-secondary',
      barColor: 'bg-secondary',
      barWidth: 'w-1/2',
    };
  }
  if ('ScriptExecution' in action) {
    return {
      icon: 'terminal',
      description: `${action.ScriptExecution.script_type} script`,
      hoverBorder: 'hover:border-error',
      iconColor: 'group-hover:text-error',
      statusText: 'Idle',
      statusColor: 'text-on-surface-variant',
      barColor: 'bg-error',
      barWidth: 'w-0',
    };
  }
  return {
    icon: 'settings',
    description: 'Unknown action',
    hoverBorder: 'hover:border-outline-variant',
    iconColor: '',
    statusText: 'Unknown',
    statusColor: 'text-on-surface-variant',
    barColor: 'bg-outline-variant',
    barWidth: 'w-0',
  };
}

const MappingGrid: FC<MappingGridProps> = ({
  profile,
  onCreateMapping,
  onEditMapping,
  onDeleteMapping,
  requestSelector,
  onSelectorRequested,
}) => {
  const [showMidiSelector, setShowMidiSelector] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(1);
  const [selectedMidiValue, setSelectedMidiValue] = useState(60);
  const [midiError, setMidiError] = useState('');

  useEffect(() => {
    if (requestSelector) {
      setShowMidiSelector(true);
      setMidiError('');
      onSelectorRequested?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestSelector]);
  const [confirmDelete, setConfirmDelete] = useState<ActionMapping | null>(null);

  const handleManualMapping = () => {
    const key = `${selectedChannel - 1}:${selectedMidiValue}`;
    if (profile && profile.mappings[key]) {
      setMidiError(`Ch ${selectedChannel}, Value ${selectedMidiValue} is already used by "${profile.mappings[key].name}".`);
      return;
    }
    onCreateMapping(selectedChannel - 1, selectedMidiValue);
    setShowMidiSelector(false);
    setMidiError('');
  };

  if (!profile) {
    return (
      <div data-testid="no-profile" className="flex flex-col items-center justify-center py-24 text-center">
        <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">settings_input_component</span>
        <p className="text-on-surface font-bold text-lg mb-1">No profile selected</p>
        <p className="text-on-surface-variant text-sm">Select or create a profile to start mapping</p>
      </div>
    );
  }

  const mappings = Object.values(profile.mappings).sort((a, b) =>
    a.midi_channel !== b.midi_channel
      ? a.midi_channel - b.midi_channel
      : a.midi_note_or_cc - b.midi_note_or_cc
  );
  const emptySlots = 1;

  return (
    <>
      <div data-testid="mapping-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Filled mapping cards */}
        {mappings.map((mapping) => {
          const info = getActionInfo(mapping.action);
          return (
            <div
              data-testid="mapping-card"
              key={mapping.id}
              className={`group relative bg-surface-container-low rounded-xl p-6 transition-all duration-300 hover:bg-surface-container-high border-b-4 border-transparent ${info.hoverBorder} cursor-pointer`}
              onClick={() => onEditMapping?.(mapping)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg bg-surface-container-highest transition-colors ${info.iconColor}`}>
                  <span className="material-symbols-outlined">{info.icon}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container-lowest px-2 py-1 rounded">
                    CH {String(mapping.midi_channel + 1).padStart(2, '0')} : CC {String(mapping.midi_note_or_cc).padStart(2, '0')}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      data-testid="mapping-edit-btn"
                      className="p-1 hover:text-primary transition-colors"
                      onClick={(e) => { e.stopPropagation(); onEditMapping?.(mapping); }}
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-sm text-on-surface-variant hover:text-primary">edit</span>
                    </button>
                    <button
                      data-testid="mapping-delete-btn"
                      className="p-1 hover:text-error transition-colors"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(mapping); }}
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-sm text-on-surface-variant hover:text-error">delete</span>
                    </button>
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-1">{mapping.name}</h3>
              <p className="text-xs text-on-surface-variant mb-6 truncate">{info.description}</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-1 bg-surface-container-lowest rounded-full overflow-hidden">
                  <div className={`${info.barWidth} h-full ${info.barColor} transition-all`} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${info.statusColor}`}>{info.statusText}</span>
              </div>
            </div>
          );
        })}

        {/* Empty "Add Mapping" slots */}
        {Array.from({ length: emptySlots }, (_, i) => (
          <div
            data-testid="mapping-slot-empty"
            key={`empty-${i}`}
            className="border-2 border-dashed border-outline-variant/30 rounded-xl p-6 flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-primary-container/40 hover:bg-primary-container/5 transition-all"
            onClick={() => { setShowMidiSelector(true); setMidiError(''); }}
          >
            <div className="w-12 h-12 rounded-full border border-outline-variant/30 flex items-center justify-center group-hover:bg-primary-container group-hover:border-primary-container group-hover:text-on-primary-container transition-all">
              <span className="material-symbols-outlined">add</span>
            </div>
            <div className="text-center">
              <p className="font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">Add Mapping</p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60">New MIDI Interaction</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {confirmDelete && (
        <div data-testid="mapping-delete-modal-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div data-testid="mapping-delete-modal" className="w-full max-w-sm cyber-panel rounded-xl border border-outline-variant/20 overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container">
              <h3 className="font-bold text-on-surface">Delete Mapping</h3>
              <button className="text-on-surface-variant hover:text-on-surface" onClick={() => setConfirmDelete(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-on-surface-variant mb-1">Are you sure you want to delete</p>
              <p className="font-bold text-on-surface mb-4">"{confirmDelete.name}"?</p>
              <p className="text-xs text-on-surface-variant mb-6">This cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button
                  data-testid="mapping-delete-cancel"
                  className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
                  onClick={() => setConfirmDelete(null)}
                >Cancel</button>
                <button
                  data-testid="mapping-delete-confirm"
                  className="px-4 py-2 text-sm font-bold bg-error/20 text-error border border-error/30 rounded-lg hover:bg-error/30 transition-colors"
                  onClick={() => { onDeleteMapping?.(confirmDelete.id); setConfirmDelete(null); }}
                >Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MIDI Value Selector Modal ── */}
      {showMidiSelector && (
        <div data-testid="midi-selector-modal-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div data-testid="midi-selector-modal" className="w-full max-w-sm cyber-panel rounded-xl border border-primary/20 overflow-hidden">
            <div className="px-6 py-5 border-b border-primary/10 flex justify-between items-center bg-black/40">
              <div>
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-primary/60 block mb-1">Signal Routing</span>
                <h3 className="font-bold text-on-surface">Assign MIDI Source</h3>
              </div>
              <button className="text-on-surface-variant hover:text-on-surface" onClick={() => setShowMidiSelector(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary/60">MIDI Channel (1–16)</label>
                <input
                  data-testid="midi-channel-input"
                  type="number" min="1" max="16" value={selectedChannel}
                  onChange={(e) => { setSelectedChannel(Number(e.target.value)); setMidiError(''); }}
                  className="w-full bg-surface-container-high border border-outline-variant/30 focus:border-primary-container text-on-surface text-sm px-3 py-1.5 rounded-lg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary/60">MIDI Value (0–127)</label>
                <input
                  data-testid="midi-value-input"
                  type="number" min="0" max="127" value={selectedMidiValue}
                  onChange={(e) => { setSelectedMidiValue(Number(e.target.value)); setMidiError(''); }}
                  className="w-full bg-surface-container-high border border-outline-variant/30 focus:border-primary-container text-on-surface text-sm px-3 py-1.5 rounded-lg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <input
                  data-testid="midi-value-slider"
                  type="range" min="0" max="127" value={selectedMidiValue}
                  onChange={(e) => { setSelectedMidiValue(Number(e.target.value)); setMidiError(''); }}
                  className="w-full accent-primary-container mt-1"
                />
                <p className="font-mono text-[10px] text-on-surface-variant">
                  Channel {selectedChannel} · Value {selectedMidiValue}
                </p>
              </div>
              {midiError && <p data-testid="midi-selector-error" className="text-xs text-error">{midiError}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  data-testid="midi-selector-cancel"
                  className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
                  onClick={() => setShowMidiSelector(false)}
                >Cancel</button>
                <button
                  data-testid="midi-selector-assign"
                  className="glow-button px-6 py-2 rounded-lg bg-gradient-to-r from-primary-container to-surface-tint text-on-primary-container font-bold text-sm hover:scale-105 active:scale-95 transition-all"
                  onClick={handleManualMapping}
                >Assign</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MappingGrid;
