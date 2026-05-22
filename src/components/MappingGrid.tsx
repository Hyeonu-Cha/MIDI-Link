import React, { useEffect, useState } from 'react';
import { Profile, ActionMapping } from '../types';

interface MappingGridProps {
  profile: Profile | null;
  onCreateMapping: (channel: number, noteOrCc: number) => void;
  onEditMapping?: (mapping: ActionMapping) => void;
  onDeleteMapping?: (mappingId: string) => void;
  triggerMidiSelector?: boolean;
  onTriggerHandled?: () => void;
}

interface ActionMeta {
  icon: string;
  tileClass: string;
  actionClass: string;
  barColor: string;
  status: string;
}

function getActionMeta(mapping: ActionMapping): ActionMeta {
  const a = mapping.action;
  if ('KeyboardShortcut' in a) return { icon: 'keyboard',        tileClass: 'tile-cyan',   actionClass: 'action-keyboard', barColor: 'var(--ml-cyan)',        status: 'ACTIVE' };
  if ('LaunchApplication' in a) return { icon: 'launch',         tileClass: 'tile-violet', actionClass: 'action-app',     barColor: 'var(--ml-violet-soft)', status: 'READY' };
  if ('OpenUrl' in a)           return { icon: 'open_in_browser',tileClass: 'tile-amber',  actionClass: 'action-url',     barColor: 'var(--ml-amber)',       status: 'STANDBY' };
  if ('TypeText' in a)          return { icon: 'keyboard_alt',   tileClass: 'tile-violet', actionClass: 'action-text',    barColor: 'var(--ml-violet-soft)', status: 'READY' };
  if ('MouseClick' in a)        return { icon: 'mouse',          tileClass: 'tile-cyan',   actionClass: 'action-mouse',   barColor: 'var(--ml-cyan)',        status: 'ACTIVE' };
  if ('SystemCommand' in a)     return { icon: 'bolt',           tileClass: 'tile-error',  actionClass: 'action-system',  barColor: 'var(--ml-error)',       status: 'IDLE' };
  if ('MultiStepMacro' in a)    return { icon: 'layers',         tileClass: 'tile-violet', actionClass: 'action-macro',   barColor: 'var(--ml-violet-soft)', status: 'READY' };
  if ('ScriptExecution' in a)   return { icon: 'terminal',       tileClass: 'tile-error',  actionClass: 'action-script',  barColor: 'var(--ml-error)',       status: 'IDLE' };
  return { icon: 'bolt', tileClass: 'tile-cyan', actionClass: 'action-keyboard', barColor: 'var(--ml-cyan)', status: 'ACTIVE' };
}

function renderActionSummary(mapping: ActionMapping): string {
  const action = mapping.action;
  if ('KeyboardShortcut' in action) {
    const { keys, modifiers } = action.KeyboardShortcut;
    return `Keyboard: ${[...modifiers, ...keys].join(' + ')}`;
  }
  if ('LaunchApplication' in action) {
    const appName = action.LaunchApplication.path.split(/[/\\]/).pop() || action.LaunchApplication.path;
    return `Launch: ${appName}`;
  }
  if ('OpenUrl' in action) return `Open URL: ${action.OpenUrl.url}`;
  if ('TypeText' in action) {
    const t = action.TypeText.text;
    return `Type: "${t.length > 20 ? t.slice(0, 20) + '…' : t}"`;
  }
  if ('MouseClick' in action) {
    const { button, x, y } = action.MouseClick;
    return `Click ${button} at (${x}, ${y})`;
  }
  if ('SystemCommand' in action) {
    return `System: ${action.SystemCommand.command_type.replace(/([A-Z])/g, ' $1').trim()}`;
  }
  if ('MultiStepMacro' in action) {
    const n = action.MultiStepMacro.steps.length;
    return `Macro: ${n} step${n !== 1 ? 's' : ''}`;
  }
  if ('ScriptExecution' in action) return `Script: ${action.ScriptExecution.script_type}`;
  return 'Unknown action';
}

const MappingGrid: React.FC<MappingGridProps> = ({
  profile,
  onCreateMapping,
  onEditMapping,
  onDeleteMapping,
  triggerMidiSelector,
  onTriggerHandled,
}) => {
  const [showMidiSelector, setShowMidiSelector] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(1);
  const [selectedMidiValue, setSelectedMidiValue] = useState(60);
  const [midiError, setMidiError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ActionMapping | null>(null);

  useEffect(() => {
    if (triggerMidiSelector) {
      setShowMidiSelector(true);
      setMidiError('');
      onTriggerHandled?.();
    }
  }, [triggerMidiSelector, onTriggerHandled]);

  const handleManualMapping = () => {
    const key = `${selectedChannel - 1}:${selectedMidiValue}`;
    if (profile?.mappings[key]) {
      setMidiError(
        `Channel ${selectedChannel}, Value ${selectedMidiValue} is already used by "${profile.mappings[key].name}". Choose a different note or channel.`
      );
      return;
    }
    onCreateMapping(selectedChannel - 1, selectedMidiValue);
    setShowMidiSelector(false);
    setMidiError('');
  };

  if (!profile) {
    return (
      <div className="mapping-grid">
        <div className="mappings-container">
          <div className="empty-state">
            <span className="material-symbols-outlined">settings_input_component</span>
            <h4>No Profile Selected</h4>
            <p>Select or create a profile to start mapping</p>
          </div>
        </div>
      </div>
    );
  }

  const mappings = Object.values(profile.mappings).sort((a, b) => {
    if (a.midi_channel !== b.midi_channel) return a.midi_channel - b.midi_channel;
    return a.midi_note_or_cc - b.midi_note_or_cc;
  });

  return (
    <div className="mapping-grid">
      {mappings.length > 0 && (
        <p className="grid-eyebrow">{profile.name} — {mappings.length} mapping{mappings.length !== 1 ? 's' : ''}</p>
      )}

      <div className="mappings-container">
        {mappings.length === 0 && (
          <div className="empty-state">
            <span className="material-symbols-outlined">add_circle</span>
            <h4>No Mappings Yet</h4>
            <p>Add a mapping to start automating your MIDI controller</p>
          </div>
        )}

        {mappings.map((mapping) => {
          const key = `${mapping.midi_channel}:${mapping.midi_note_or_cc}`;
          const { icon, tileClass, actionClass, barColor, status } = getActionMeta(mapping);
          const ch  = String(mapping.midi_channel + 1).padStart(2, '0');
          const cc  = String(mapping.midi_note_or_cc).padStart(3, '0');
          return (
            <div key={key} className={`map-card ${actionClass}`}>
              <div className="head">
                <div className={`icon-tile ${tileClass}`}>
                  <span className="material-symbols-outlined">{icon}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="ch-chip">CH {ch} · {cc}</span>
                  <div className="card-actions">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditMapping?.(mapping); }}
                      title="Edit"
                    >
                      <span className="material-symbols-outlined ico-edit">edit</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(mapping); }}
                      title="Delete"
                    >
                      <span className="material-symbols-outlined ico-del">delete</span>
                    </button>
                  </div>
                </div>
              </div>
              <h3 className="title">{mapping.name}</h3>
              <p className="desc">{renderActionSummary(mapping)}</p>
              <div className="bar-row">
                <div className="bar">
                  <div style={{ width: '70%', background: barColor }} />
                </div>
                <span className="status-word" style={{ color: barColor }}>{status}</span>
              </div>
            </div>
          );
        })}

        {/* Add mapping card */}
        <button
          className="map-add"
          onClick={() => { setShowMidiSelector(true); setMidiError(''); }}
        >
          <div className="circle">
            <span className="material-symbols-outlined">add</span>
          </div>
          <p className="add-title">New Mapping</p>
          <p className="add-sub">Click to assign</p>
        </button>
      </div>

      {/* ── Confirm delete modal ─────────────────────────────────── */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content danger" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Mapping</h3>
              <button className="close-btn" onClick={() => setConfirmDelete(null)}>×</button>
            </div>
            <div className="modal-body">
              <p className="confirm-text">
                Delete <strong>"{confirmDelete.name}"</strong>? This cannot be undone.
              </p>
              <div className="form-actions">
                <button className="cancel-btn" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button
                  className="delete-btn"
                  onClick={() => {
                    onDeleteMapping?.(confirmDelete.id);
                    setConfirmDelete(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MIDI selector modal ──────────────────────────────────── */}
      {showMidiSelector && (
        <div className="modal-overlay" onClick={() => setShowMidiSelector(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">Assign MIDI Source</span>
                <h3>Choose MIDI Values</h3>
              </div>
              <button className="close-btn" onClick={() => setShowMidiSelector(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>MIDI Channel (1–16)</label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={selectedChannel}
                  onChange={(e) => { setSelectedChannel(Number(e.target.value)); setMidiError(''); }}
                  className={midiError ? 'error' : ''}
                />
              </div>
              <div className="form-group">
                <label>MIDI Value (0–127)</label>
                <input
                  type="number"
                  min="0"
                  max="127"
                  value={selectedMidiValue}
                  onChange={(e) => { setSelectedMidiValue(Number(e.target.value)); setMidiError(''); }}
                  className={midiError ? 'error' : ''}
                />
                <input
                  type="range"
                  min="0"
                  max="127"
                  value={selectedMidiValue}
                  onChange={(e) => { setSelectedMidiValue(Number(e.target.value)); setMidiError(''); }}
                />
                <p className="midi-value-preview">CH {String(selectedChannel).padStart(2,'0')} · CC {String(selectedMidiValue).padStart(3,'0')}</p>
                {midiError && <div className="error-message">{midiError}</div>}
              </div>
              <div className="form-actions">
                <button className="cancel-btn" onClick={() => setShowMidiSelector(false)}>Cancel</button>
                <button className="create-btn" onClick={handleManualMapping}>Assign</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MappingGrid;
