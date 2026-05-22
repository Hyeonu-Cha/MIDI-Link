import React from 'react';
import { MidiEvent, MidiMessageType } from '../types';

interface MidiMonitorProps {
  lastEvent: MidiEvent | null;
  midiEnabled?: boolean;
}

function formatType(type: MidiMessageType): string {
  switch (type) {
    case MidiMessageType.NoteOn:          return 'NoteOn';
    case MidiMessageType.NoteOff:         return 'NoteOff';
    case MidiMessageType.ControlChange:   return 'CC';
    case MidiMessageType.ProgramChange:   return 'PC';
    default:                              return 'MSG';
  }
}

function noteName(note: number): string {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return `${names[note % 12]}${Math.floor(note / 12) - 1}`;
}

const MidiMonitor: React.FC<MidiMonitorProps> = ({ lastEvent, midiEnabled = false }) => {
  const ledOff = !midiEnabled || !lastEvent;

  return (
    <div className="sb-monitor">
      <div className="top">
        <span className="lbl">MIDI Monitor</span>
        <span className={`led${ledOff ? ' off' : ''}`} />
      </div>

      {lastEvent ? (
        <>
          <div className="row">
            <span>TYPE</span>
            <span className="v">{formatType(lastEvent.message_type)}</span>
          </div>
          <div className="row">
            <span>CH</span>
            <span className="v">{String(lastEvent.channel + 1).padStart(2, '0')}</span>
          </div>
          {lastEvent.message_type === MidiMessageType.ControlChange ? (
            <>
              <div className="row">
                <span>CC</span>
                <span className="v">{String(lastEvent.data1).padStart(3, '0')}</span>
              </div>
              <div className="row">
                <span>VAL</span>
                <span className="v">{lastEvent.data2}</span>
              </div>
            </>
          ) : (
            <>
              <div className="row">
                <span>NOTE</span>
                <span className="v">{noteName(lastEvent.data1)} · {lastEvent.data1}</span>
              </div>
              <div className="row">
                <span>VEL</span>
                <span className="v">{lastEvent.velocity}</span>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <p className="empty">Waiting for MIDI input...</p>
          <p className="empty fade">Press a key or turn a knob</p>
        </>
      )}
    </div>
  );
};

export default MidiMonitor;
