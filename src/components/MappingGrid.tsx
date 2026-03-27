import React, { useState } from 'react';
import { Profile, ActionMapping } from '../types';

interface MappingGridProps {
  profile: Profile | null;
  onCreateMapping: (channel: number, noteOrCc: number) => void;
  onEditMapping?: (mapping: ActionMapping) => void;
  onDeleteMapping?: (mappingId: string) => void;
}

const MappingGrid: React.FC<MappingGridProps> = ({
  profile,
  onCreateMapping,
  onEditMapping,
  onDeleteMapping,
}) => {
  const [showMidiSelector, setShowMidiSelector] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(1);
  const [selectedMidiValue, setSelectedMidiValue] = useState(60);
  const [midiError, setMidiError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ActionMapping | null>(null);
  const renderActionSummary = (mapping: ActionMapping): string => {
    const action = mapping.action;
    
    if ('KeyboardShortcut' in action) {
      const { keys, modifiers } = action.KeyboardShortcut;
      const combo = [...modifiers, ...keys].join(' + ');
      return `Keyboard: ${combo}`;
    }
    
    if ('LaunchApplication' in action) {
      const { path } = action.LaunchApplication;
      const appName = path.split(/[/\\]/).pop() || path;
      return `Launch: ${appName}`;
    }
    
    if ('OpenUrl' in action) {
      const { url } = action.OpenUrl;
      return `Open URL: ${url}`;
    }
    
    if ('TypeText' in action) {
      const { text } = action.TypeText;
      const preview = text.length > 20 ? `${text.substring(0, 20)}...` : text;
      return `Type: "${preview}"`;
    }
    
    if ('MouseClick' in action) {
      const { button, x, y } = action.MouseClick;
      return `Click ${button} at (${x}, ${y})`;
    }
    
    if ('SystemCommand' in action) {
      const { command_type } = action.SystemCommand;
      return `System: ${command_type.replace(/([A-Z])/g, ' $1').trim()}`;
    }
    
    if ('MultiStepMacro' in action) {
      const { steps } = action.MultiStepMacro;
      return `Macro: ${steps.length} step${steps.length !== 1 ? 's' : ''}`;
    }
    
    if ('ScriptExecution' in action) {
      const { script_type } = action.ScriptExecution;
      return `Script: ${script_type}`;
    }

    return 'Unknown action';
  };

  const getMappingKey = (channel: number, noteOrCc: number): string => {
    return `${channel}:${noteOrCc}`;
  };

  const renderMappingCard = (mapping: ActionMapping, key: string) => (
    <div key={key} className="mapping-card">
      <div className="mapping-header">
        <div className="mapping-info">
          <div className="mapping-name">{mapping.name}</div>
          <div className="mapping-midi">
            Ch {mapping.midi_channel + 1}, Note/CC {mapping.midi_note_or_cc}
          </div>
        </div>
        <div className="mapping-controls">
          <button
            className="edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEditMapping?.(mapping);
            }}
            title="Edit mapping"
          >
            ✏️
          </button>
          <button
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(mapping);
            }}
            title="Delete mapping"
          >
            🗑️
          </button>
        </div>
      </div>
      <div className="mapping-action">
        {renderActionSummary(mapping)}
      </div>
    </div>
  );

  const handleManualMapping = () => {
    const key = getMappingKey(selectedChannel - 1, selectedMidiValue);
    if (profile && profile.mappings[key]) {
      setMidiError(`Channel ${selectedChannel}, Value ${selectedMidiValue} is already used by "${profile.mappings[key].name}". Choose a different note or channel.`);
      return;
    }
    onCreateMapping(selectedChannel - 1, selectedMidiValue);
    setShowMidiSelector(false);
    setMidiError('');
  };

  const renderEmptySlot = (index: number) => (
    <div
      key={`empty-${index}`}
      className="mapping-slot empty"
      onClick={() => { setShowMidiSelector(true); setMidiError(''); }}
    >
      <div className="empty-content">
        <div className="plus-icon">+</div>
        <div className="empty-text">Add mapping</div>
      </div>
    </div>
  );

  if (!profile) {
    return (
      <div className="mapping-grid">
        <div className="no-profile">
          <div className="message">No profile selected</div>
          <div className="instruction">Select or create a profile to start mapping</div>
        </div>
      </div>
    );
  }

  // Sort mappings by channel first, then by MIDI value
  const mappings = Object.values(profile.mappings).sort((a, b) => {
    if (a.midi_channel !== b.midi_channel) {
      return a.midi_channel - b.midi_channel;
    }
    return a.midi_note_or_cc - b.midi_note_or_cc;
  });
  // Show 3 empty "Add" slots, or at least enough to fill a minimum of 4 total
  const minSlots = 4;
  const emptySlots = Math.max(3, minSlots - mappings.length);

  return (
    <div className="mapping-grid">
      <div className="grid-header">
        <h4>{profile.name} Mappings</h4>
      </div>
      
      <div className="mappings-container">
        {mappings.map((mapping) => {
          const key = getMappingKey(mapping.midi_channel, mapping.midi_note_or_cc);
          return renderMappingCard(mapping, key);
        })}
        
        {Array.from({ length: emptySlots }, (_, index) => renderEmptySlot(index))}
      </div>

      {mappings.length === 0 && (
        <div className="no-mappings">
          <div className="message">No mappings in this profile</div>
          <div className="instruction">
            Click "Add mapping" to manually assign MIDI values to actions
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="create-profile-modal">
          <div className="modal-overlay" onClick={() => setConfirmDelete(null)} />
          <div className="modal-content">
            <div className="modal-header">
              <h3>Delete Mapping</h3>
              <button className="close-btn" onClick={() => setConfirmDelete(null)}>×</button>
            </div>
            <p className="confirm-text">
              Are you sure you want to delete <strong>"{confirmDelete.name}"</strong>? This cannot be undone.
            </p>
            <div className="form-actions">
              <button
                className="delete-btn"
                onClick={() => {
                  onDeleteMapping?.(confirmDelete.id);
                  setConfirmDelete(null);
                }}
              >
                Delete
              </button>
              <button className="cancel-btn" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MIDI Value Selector Modal */}
      {showMidiSelector && (
        <div className="create-profile-modal">
          <div className="modal-overlay" onClick={() => setShowMidiSelector(false)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Choose MIDI Values</h3>
              <button
                className="close-btn"
                onClick={() => setShowMidiSelector(false)}
              >
                ×
              </button>
            </div>

            <div className="form-group">
              <label>MIDI Channel (1-16):</label>
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
              <label>MIDI Value (0-127):</label>
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
                className="midi-slider"
              />
              <div className="midi-value-preview">
                Channel {selectedChannel}, Value {selectedMidiValue}
              </div>
              {midiError && <div className="error-message">{midiError}</div>}
            </div>

            <div className="modal-actions">
              <button
                className="create-btn"
                onClick={handleManualMapping}
              >
                Create
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowMidiSelector(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MappingGrid;