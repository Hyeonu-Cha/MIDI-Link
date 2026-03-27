use serde::{Deserialize, Serialize};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};
use midir::{MidiInput, MidiInputConnection, Ignore};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MidiEvent {
    pub device_name: String,
    pub timestamp: u64,
    pub message_type: MidiMessageType,
    pub channel: u8,
    pub data1: u8,
    pub data2: u8,
    pub velocity: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MidiMessageType {
    NoteOn,
    NoteOff,
    ControlChange,
    ProgramChange,
    Unknown,
}

pub struct MidiHandler {
    input: MidiInput,
    connections: Vec<MidiInputConnection<()>>,
    event_sender: Option<Sender<MidiEvent>>,
    event_receiver: Arc<Mutex<Option<Receiver<MidiEvent>>>>,
}

impl MidiHandler {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let mut midi_in = MidiInput::new("MIDI-Link Input")?;
        midi_in.ignore(Ignore::None);

        let (sender, receiver) = mpsc::channel();

        Ok(MidiHandler {
            input: midi_in,
            connections: Vec::new(),
            event_sender: Some(sender),
            event_receiver: Arc::new(Mutex::new(Some(receiver))),
        })
    }

    pub fn scan_devices(&self) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let ports = self.input.ports();
        let mut device_names = Vec::new();

        for port in &ports {
            if let Ok(name) = self.input.port_name(port) {
                device_names.push(name);
            }
        }

        Ok(device_names)
    }

    pub fn start_listening(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let ports = self.input.ports();
        let sender = self.event_sender.take()
            .ok_or("MIDI listener already started — cannot start listening twice")?;

        for (i, port) in ports.iter().enumerate() {
            let port_name = self.input.port_name(port)?;
            let sender_clone = sender.clone();
            let device_name = port_name.clone();

            // Create a new MidiInput for each connection
            let mut midi_in = MidiInput::new(&format!("MIDI-Link Input {}", i))?;
            midi_in.ignore(Ignore::None);

            let conn = midi_in.connect(
                port,
                &format!("midi-link-input-{}", i),
                move |timestamp, message, _| {
                    if let Some(midi_event) = parse_midi_message(&device_name, timestamp, message) {
                        let _ = sender_clone.send(midi_event);
                    }
                },
                (),
            )?;

            self.connections.push(conn);
        }

        Ok(())
    }

    pub fn get_event_receiver(&self) -> Arc<Mutex<Option<Receiver<MidiEvent>>>> {
        self.event_receiver.clone()
    }
}

fn parse_midi_message(device_name: &str, timestamp: u64, message: &[u8]) -> Option<MidiEvent> {
    if message.is_empty() {
        return None;
    }

    let status = message[0];
    let channel = status & 0x0F;
    let command = status & 0xF0;

    let (data1, data2) = match message.len() {
        1 => (0, 0),
        2 => (message[1], 0),
        _ => (message[1], message[2]),
    };

    let message_type = match command {
        0x90 if data2 > 0 => MidiMessageType::NoteOn,
        0x80 | 0x90 => MidiMessageType::NoteOff, // Note on with velocity 0 is note off
        0xB0 => MidiMessageType::ControlChange,
        0xC0 => MidiMessageType::ProgramChange,
        _ => MidiMessageType::Unknown,
    };

    Some(MidiEvent {
        device_name: device_name.to_string(),
        timestamp,
        message_type,
        channel,
        data1,
        data2,
        velocity: data2,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_empty_message_returns_none() {
        assert!(parse_midi_message("device", 0, &[]).is_none());
    }

    #[test]
    fn parse_note_on() {
        // 0x90 = NoteOn channel 0, note 60, velocity 100
        let event = parse_midi_message("keys", 1000, &[0x90, 60, 100]).unwrap();
        assert!(matches!(event.message_type, MidiMessageType::NoteOn));
        assert_eq!(event.channel, 0);
        assert_eq!(event.data1, 60);
        assert_eq!(event.data2, 100);
        assert_eq!(event.velocity, 100);
        assert_eq!(event.device_name, "keys");
        assert_eq!(event.timestamp, 1000);
    }

    #[test]
    fn parse_note_on_channel_5() {
        // 0x95 = NoteOn channel 5
        let event = parse_midi_message("pad", 0, &[0x95, 48, 80]).unwrap();
        assert!(matches!(event.message_type, MidiMessageType::NoteOn));
        assert_eq!(event.channel, 5);
        assert_eq!(event.data1, 48);
    }

    #[test]
    fn parse_note_on_velocity_zero_is_note_off() {
        // NoteOn with velocity 0 should be interpreted as NoteOff
        let event = parse_midi_message("keys", 0, &[0x90, 60, 0]).unwrap();
        assert!(matches!(event.message_type, MidiMessageType::NoteOff));
    }

    #[test]
    fn parse_note_off() {
        // 0x80 = NoteOff channel 0
        let event = parse_midi_message("keys", 0, &[0x80, 60, 64]).unwrap();
        assert!(matches!(event.message_type, MidiMessageType::NoteOff));
        assert_eq!(event.data1, 60);
    }

    #[test]
    fn parse_control_change() {
        // 0xB0 = ControlChange channel 0, CC 1 (mod wheel), value 127
        let event = parse_midi_message("knobs", 0, &[0xB0, 1, 127]).unwrap();
        assert!(matches!(event.message_type, MidiMessageType::ControlChange));
        assert_eq!(event.data1, 1);
        assert_eq!(event.data2, 127);
    }

    #[test]
    fn parse_program_change() {
        // 0xC0 = ProgramChange channel 0, program 5
        let event = parse_midi_message("synth", 0, &[0xC0, 5]).unwrap();
        assert!(matches!(event.message_type, MidiMessageType::ProgramChange));
        assert_eq!(event.data1, 5);
        assert_eq!(event.data2, 0); // program change has no data2
    }

    #[test]
    fn parse_unknown_status() {
        // 0xF0 = SysEx (not handled)
        let event = parse_midi_message("device", 0, &[0xF0, 0x7E, 0x7F]).unwrap();
        assert!(matches!(event.message_type, MidiMessageType::Unknown));
    }

    #[test]
    fn parse_single_byte_message() {
        let event = parse_midi_message("device", 0, &[0xF8]).unwrap();
        assert_eq!(event.data1, 0);
        assert_eq!(event.data2, 0);
    }

    #[test]
    fn parse_two_byte_message() {
        // Program Change is 2 bytes
        let event = parse_midi_message("device", 0, &[0xC0, 42]).unwrap();
        assert_eq!(event.data1, 42);
        assert_eq!(event.data2, 0);
    }

    #[test]
    fn parse_all_channels() {
        for ch in 0u8..16 {
            let event = parse_midi_message("dev", 0, &[0x90 | ch, 60, 100]).unwrap();
            assert_eq!(event.channel, ch);
        }
    }
}