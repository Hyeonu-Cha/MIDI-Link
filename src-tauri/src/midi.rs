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
        let sender = self.event_sender.take().unwrap();

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