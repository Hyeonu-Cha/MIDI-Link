import { FC } from 'react';
import { MidiEvent, MidiMessageType } from '../types';

interface MidiMonitorProps {
  lastEvent: MidiEvent | null;
}

const MidiMonitor: FC<MidiMonitorProps> = ({ lastEvent }) => {
  const formatType = (type: MidiMessageType): string => {
    switch (type) {
      case MidiMessageType.NoteOn: return 'Note On';
      case MidiMessageType.NoteOff: return 'Note Off';
      case MidiMessageType.ControlChange: return 'CC';
      case MidiMessageType.ProgramChange: return 'PC';
      default: return 'Unknown';
    }
  };

  const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const noteName = (n: number) => `${noteNames[n % 12]}${Math.floor(n / 12) - 1}`;

  if (!lastEvent) {
    return (
      <div data-testid="midi-no-events" className="space-y-1">
        <p className="text-[10px] text-on-surface-variant">Waiting for MIDI input...</p>
        <p className="text-[9px] text-on-surface-variant/50">Press a key or turn a knob</p>
      </div>
    );
  }

  const isNote = lastEvent.message_type === MidiMessageType.NoteOn || lastEvent.message_type === MidiMessageType.NoteOff;
  const isCC = lastEvent.message_type === MidiMessageType.ControlChange;

  return (
    <div data-testid="midi-event" className="space-y-2 font-mono text-[9px]">
      <div className="flex justify-between text-on-surface-variant border-b border-outline-variant/10 pb-1">
        <span className="text-[8px] truncate max-w-[100px]">{lastEvent.device_name}</span>
        <span className="text-primary-container font-bold">{formatType(lastEvent.message_type)}</span>
      </div>
      {isNote && (
        <>
          <div className="flex justify-between text-on-surface-variant border-b border-outline-variant/10 pb-1">
            <span>Note {noteName(lastEvent.data1)}</span>
            <span className="text-primary-container">{lastEvent.data1}</span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span>Vel</span>
            <span className="text-primary-container">{lastEvent.velocity}</span>
          </div>
        </>
      )}
      {isCC && (
        <>
          <div className="flex justify-between text-on-surface-variant border-b border-outline-variant/10 pb-1">
            <span>CC {lastEvent.data1}</span>
            <span className="text-primary-container">{lastEvent.data2}</span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span>Ch</span>
            <span>{lastEvent.channel + 1}</span>
          </div>
        </>
      )}
      {!isNote && !isCC && (
        <div className="flex justify-between text-on-surface-variant">
          <span>Data</span>
          <span className="text-primary-container">{lastEvent.data1}</span>
        </div>
      )}
    </div>
  );
};

export default MidiMonitor;
