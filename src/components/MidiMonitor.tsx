import React from 'react';
import { MidiEvent, MidiMessageType } from '../types';

interface MidiMonitorProps {
  lastEvent: MidiEvent | null;
  onMidiEvent: (event: MidiEvent) => void;
}

const MidiMonitor: React.FC<MidiMonitorProps> = ({ lastEvent }) => {
  const formatMessageType = (type: MidiMessageType): string => {
    switch (type) {
      case MidiMessageType.NoteOn:
        return 'Note On';
      case MidiMessageType.NoteOff:
        return 'Note Off';
      case MidiMessageType.ControlChange:
        return 'CC';
      case MidiMessageType.ProgramChange:
        return 'PC';
      default:
        return 'Unknown';
    }
  };

  const getMidiNoteName = (note: number): string => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(note / 12) - 1;
    const noteName = noteNames[note % 12];
    return `${noteName}${octave}`;
  };

  return (
    <div className="midi-monitor">
      {lastEvent ? (
        <div className="midi-event">
          <div className="event-header">
            <span className="device-name">{lastEvent.device_name}</span>
            <span className="message-type">{formatMessageType(lastEvent.message_type)}</span>
          </div>
          <div className="event-details">
            <div className="detail-row">
              <span className="label">Channel:</span>
              <span className="value">{lastEvent.channel + 1}</span>
            </div>
            {lastEvent.message_type === MidiMessageType.NoteOn || lastEvent.message_type === MidiMessageType.NoteOff ? (
              <>
                <div className="detail-row">
                  <span className="label">Note:</span>
                  <span className="value">{getMidiNoteName(lastEvent.data1)} ({lastEvent.data1})</span>
                </div>
                <div className="detail-row">
                  <span className="label">Velocity:</span>
                  <span className="value">{lastEvent.velocity}</span>
                </div>
              </>
            ) : lastEvent.message_type === MidiMessageType.ControlChange ? (
              <>
                <div className="detail-row">
                  <span className="label">CC:</span>
                  <span className="value">{lastEvent.data1}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Value:</span>
                  <span className="value">{lastEvent.data2}</span>
                </div>
              </>
            ) : (
              <div className="detail-row">
                <span className="label">Data:</span>
                <span className="value">{lastEvent.data1}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="no-events">
          <div className="waiting-message">Waiting for MIDI input...</div>
          <div className="instruction">Press a key or turn a knob on your MIDI device</div>
        </div>
      )}
    </div>
  );
};

export default MidiMonitor;