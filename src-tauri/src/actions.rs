use serde::{Deserialize, Serialize};
use std::process::Command;
use enigo::{Enigo, Key, Button, Direction, Settings, Coordinate, Keyboard, Mouse};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionMapping {
    pub id: String,
    pub name: String,
    pub midi_channel: u8,
    pub midi_note_or_cc: u8,
    pub action: Action,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Action {
    KeyboardShortcut {
        keys: Vec<String>,
        modifiers: Vec<String>,
    },
    LaunchApplication {
        path: String,
        args: Vec<String>,
    },
    OpenUrl {
        url: String,
    },
    TypeText {
        text: String,
    },
    MouseClick {
        button: String, // "left", "right", "middle"
        x: i32,
        y: i32,
    },
    SystemCommand {
        command_type: SystemCommandType,
    },
    MultiStepMacro {
        steps: Vec<MacroStep>,
    },
    ScriptExecution {
        script_type: ScriptType,
        content: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroStep {
    pub action: Box<Action>,
    pub delay_ms: u64, // Delay after this step in milliseconds
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ScriptType {
    PowerShell,
    Bash,
    Cmd,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SystemCommandType {
    VolumeUp,
    VolumeDown,
    Mute,
    PlayPause,
    NextTrack,
    PreviousTrack,
    BrightnessUp,
    BrightnessDown,
    Sleep,
    Lock,
    Shutdown,
    Restart,
    MinimizeWindow,
    MaximizeWindow,
    CloseWindow,
    SwitchDesktop,
    TaskView,
    Screenshot,
    ClipboardCopy,
    ClipboardPaste,
}

pub struct ActionEngine {
    enigo: Enigo,
}

impl ActionEngine {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let enigo = Enigo::new(&Settings::default())?;
        Ok(ActionEngine { enigo })
    }

    pub fn execute_action(&mut self, action: &Action) -> Result<(), Box<dyn std::error::Error>> {
        match action {
            Action::KeyboardShortcut { keys, modifiers } => {
                self.execute_keyboard_shortcut(keys, modifiers)?;
            }
            Action::LaunchApplication { path, args } => {
                self.execute_launch_application(path, args)?;
            }
            Action::OpenUrl { url } => {
                self.execute_open_url(url)?;
            }
            Action::TypeText { text } => {
                self.execute_type_text(text)?;
            }
            Action::MouseClick { button, x, y } => {
                self.execute_mouse_click(button, *x, *y)?;
            }
            Action::SystemCommand { command_type } => {
                self.execute_system_command(command_type)?;
            }
            Action::MultiStepMacro { steps } => {
                self.execute_multi_step_macro(steps)?;
            }
            Action::ScriptExecution { script_type, content } => {
                self.execute_script(script_type, content)?;
            }
        }
        Ok(())
    }

    fn execute_multi_step_macro(&mut self, steps: &[MacroStep]) -> Result<(), Box<dyn std::error::Error>> {
        for step in steps {
            self.execute_action(&step.action)?;
            if step.delay_ms > 0 {
                std::thread::sleep(std::time::Duration::from_millis(step.delay_ms));
            }
        }
        Ok(())
    }


    fn execute_script(&mut self, script_type: &ScriptType, content: &str) -> Result<(), Box<dyn std::error::Error>> {
        match script_type {
            ScriptType::PowerShell => {
                #[cfg(target_os = "windows")]
                {
                    Command::new("powershell")
                        .args(&["-Command", content])
                        .spawn()?;
                }
            }
            ScriptType::Bash => {
                #[cfg(not(target_os = "windows"))]
                {
                    Command::new("bash")
                        .args(&["-c", content])
                        .spawn()?;
                }
            }
            ScriptType::Cmd => {
                #[cfg(target_os = "windows")]
                {
                    Command::new("cmd")
                        .args(&["/c", content])
                        .spawn()?;
                }
            }
        }
        Ok(())
    }

    fn execute_keyboard_shortcut(
        &mut self,
        keys: &[String],
        modifiers: &[String],
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Press modifiers
        for modifier in modifiers {
            match modifier.as_str() {
                "ctrl" | "control" => { let _ = self.enigo.key(Key::Control, Direction::Press); },
                "alt" => { let _ = self.enigo.key(Key::Alt, Direction::Press); },
                "shift" => { let _ = self.enigo.key(Key::Shift, Direction::Press); },
                "meta" | "super" | "cmd" => { let _ = self.enigo.key(Key::Meta, Direction::Press); },
                _ => {}
            }
        }

        // Press keys
        for key in keys {
            if let Some(enigo_key) = string_to_key(key) {
                let _ = self.enigo.key(enigo_key, Direction::Click);
            }
        }

        // Release modifiers
        for modifier in modifiers {
            match modifier.as_str() {
                "ctrl" | "control" => { let _ = self.enigo.key(Key::Control, Direction::Release); },
                "alt" => { let _ = self.enigo.key(Key::Alt, Direction::Release); },
                "shift" => { let _ = self.enigo.key(Key::Shift, Direction::Release); },
                "meta" | "super" | "cmd" => { let _ = self.enigo.key(Key::Meta, Direction::Release); },
                _ => {}
            }
        }

        Ok(())
    }

    fn execute_launch_application(
        &mut self,
        path: &str,
        args: &[String],
    ) -> Result<(), Box<dyn std::error::Error>> {
        Command::new(path).args(args).spawn()?;
        Ok(())
    }

    fn execute_open_url(&mut self, url: &str) -> Result<(), Box<dyn std::error::Error>> {
        #[cfg(target_os = "windows")]
        {
            Command::new("cmd").args(&["/c", "start", url]).spawn()?;
        }

        #[cfg(target_os = "macos")]
        {
            Command::new("open").arg(url).spawn()?;
        }

        #[cfg(target_os = "linux")]
        {
            Command::new("xdg-open").arg(url).spawn()?;
        }

        Ok(())
    }

    fn execute_type_text(&mut self, text: &str) -> Result<(), Box<dyn std::error::Error>> {
        let _ = self.enigo.text(text);
        Ok(())
    }

    fn execute_mouse_click(
        &mut self,
        button: &str,
        x: i32,
        y: i32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let _ = self.enigo.move_mouse(x, y, Coordinate::Abs);

        match button {
            "left" => { let _ = self.enigo.button(Button::Left, Direction::Click); },
            "right" => { let _ = self.enigo.button(Button::Right, Direction::Click); },
            "middle" => { let _ = self.enigo.button(Button::Middle, Direction::Click); },
            _ => return Err("Invalid mouse button".into()),
        }

        Ok(())
    }

    fn execute_system_command(
        &mut self,
        command_type: &SystemCommandType,
    ) -> Result<(), Box<dyn std::error::Error>> {
        match command_type {
            SystemCommandType::VolumeUp => {
                let _ = self.enigo.key(Key::VolumeUp, Direction::Click);
            }
            SystemCommandType::VolumeDown => {
                let _ = self.enigo.key(Key::VolumeDown, Direction::Click);
            }
            SystemCommandType::Mute => {
                let _ = self.enigo.key(Key::VolumeMute, Direction::Click);
            }
            SystemCommandType::PlayPause => {
                let _ = self.enigo.key(Key::MediaPlayPause, Direction::Click);
            }
            SystemCommandType::NextTrack => {
                let _ = self.enigo.key(Key::MediaNextTrack, Direction::Click);
            }
            SystemCommandType::PreviousTrack => {
                let _ = self.enigo.key(Key::MediaPrevTrack, Direction::Click);
            }
            SystemCommandType::BrightnessUp => {
                // Platform-specific brightness control
                #[cfg(target_os = "windows")]
                {
                    let _ = self.enigo.key(Key::Alt, Direction::Press);
                    let _ = self.enigo.key(Key::F15, Direction::Click);
                    let _ = self.enigo.key(Key::Alt, Direction::Release);
                }
                #[cfg(target_os = "macos")]
                {
                    let _ = self.enigo.key(Key::F2, Direction::Click);
                }
            }
            SystemCommandType::BrightnessDown => {
                #[cfg(target_os = "windows")]
                {
                    let _ = self.enigo.key(Key::Alt, Direction::Press);
                    let _ = self.enigo.key(Key::F14, Direction::Click);
                    let _ = self.enigo.key(Key::Alt, Direction::Release);
                }
                #[cfg(target_os = "macos")]
                {
                    let _ = self.enigo.key(Key::F1, Direction::Click);
                }
            }
            SystemCommandType::Sleep => {
                #[cfg(target_os = "windows")]
                {
                    Command::new("rundll32.exe")
                        .args(&["powrprof.dll,SetSuspendState", "0,1,0"])
                        .spawn()?;
                }
                #[cfg(target_os = "macos")]
                {
                    Command::new("pmset").args(&["sleepnow"]).spawn()?;
                }
                #[cfg(target_os = "linux")]
                {
                    Command::new("systemctl").args(&["suspend"]).spawn()?;
                }
            }
            SystemCommandType::Lock => {
                #[cfg(target_os = "windows")]
                {
                    Command::new("rundll32.exe")
                        .args(&["user32.dll,LockWorkStation"])
                        .spawn()?;
                }
                #[cfg(target_os = "macos")]
                {
                    Command::new("pmset").args(&["displaysleepnow"]).spawn()?;
                }
                #[cfg(target_os = "linux")]
                {
                    Command::new("xdg-screensaver").args(&["lock"]).spawn()?;
                }
            }
            SystemCommandType::Shutdown => {
                #[cfg(target_os = "windows")]
                {
                    Command::new("shutdown").args(&["/s", "/t", "0"]).spawn()?;
                }
                #[cfg(target_os = "macos")]
                {
                    Command::new("sudo").args(&["shutdown", "-h", "now"]).spawn()?;
                }
                #[cfg(target_os = "linux")]
                {
                    Command::new("systemctl").args(&["poweroff"]).spawn()?;
                }
            }
            SystemCommandType::Restart => {
                #[cfg(target_os = "windows")]
                {
                    Command::new("shutdown").args(&["/r", "/t", "0"]).spawn()?;
                }
                #[cfg(target_os = "macos")]
                {
                    Command::new("sudo").args(&["shutdown", "-r", "now"]).spawn()?;
                }
                #[cfg(target_os = "linux")]
                {
                    Command::new("systemctl").args(&["reboot"]).spawn()?;
                }
            }
            SystemCommandType::MinimizeWindow => {
                #[cfg(target_os = "windows")]
                {
                    let _ = self.enigo.key(Key::Meta, Direction::Press);
                    let _ = self.enigo.key(Key::DownArrow, Direction::Click);
                    let _ = self.enigo.key(Key::Meta, Direction::Release);
                }
                #[cfg(target_os = "macos")]
                {
                    let _ = self.enigo.key(Key::Meta, Direction::Press);
                    let _ = self.enigo.key(Key::Unicode('m'), Direction::Click);
                    let _ = self.enigo.key(Key::Meta, Direction::Release);
                }
            }
            SystemCommandType::MaximizeWindow => {
                #[cfg(target_os = "windows")]
                {
                    let _ = self.enigo.key(Key::Meta, Direction::Press);
                    let _ = self.enigo.key(Key::UpArrow, Direction::Click);
                    let _ = self.enigo.key(Key::Meta, Direction::Release);
                }
                #[cfg(target_os = "macos")]
                {
                    let _ = self.enigo.key(Key::Control, Direction::Press);
                    let _ = self.enigo.key(Key::Meta, Direction::Press);
                    let _ = self.enigo.key(Key::Unicode('f'), Direction::Click);
                    let _ = self.enigo.key(Key::Meta, Direction::Release);
                    let _ = self.enigo.key(Key::Control, Direction::Release);
                }
            }
            SystemCommandType::CloseWindow => {
                #[cfg(target_os = "windows")]
                {
                    let _ = self.enigo.key(Key::Alt, Direction::Press);
                    let _ = self.enigo.key(Key::F4, Direction::Click);
                    let _ = self.enigo.key(Key::Alt, Direction::Release);
                }
                #[cfg(target_os = "macos")]
                {
                    let _ = self.enigo.key(Key::Meta, Direction::Press);
                    let _ = self.enigo.key(Key::Unicode('w'), Direction::Click);
                    let _ = self.enigo.key(Key::Meta, Direction::Release);
                }
            }
            SystemCommandType::SwitchDesktop => {
                #[cfg(target_os = "windows")]
                {
                    let _ = self.enigo.key(Key::Meta, Direction::Press);
                    let _ = self.enigo.key(Key::Control, Direction::Press);
                    let _ = self.enigo.key(Key::RightArrow, Direction::Click);
                    let _ = self.enigo.key(Key::Control, Direction::Release);
                    let _ = self.enigo.key(Key::Meta, Direction::Release);
                }
                #[cfg(target_os = "macos")]
                {
                    let _ = self.enigo.key(Key::Control, Direction::Press);
                    let _ = self.enigo.key(Key::RightArrow, Direction::Click);
                    let _ = self.enigo.key(Key::Control, Direction::Release);
                }
            }
            SystemCommandType::TaskView => {
                #[cfg(target_os = "windows")]
                {
                    let _ = self.enigo.key(Key::Meta, Direction::Press);
                    let _ = self.enigo.key(Key::Tab, Direction::Click);
                    let _ = self.enigo.key(Key::Meta, Direction::Release);
                }
                #[cfg(target_os = "macos")]
                {
                    let _ = self.enigo.key(Key::Meta, Direction::Press);
                    let _ = self.enigo.key(Key::Tab, Direction::Click);
                    let _ = self.enigo.key(Key::Meta, Direction::Release);
                }
            }
            SystemCommandType::Screenshot => {
                #[cfg(target_os = "windows")]
                {
                    let _ = self.enigo.key(Key::Meta, Direction::Press);
                    let _ = self.enigo.key(Key::Shift, Direction::Press);
                    let _ = self.enigo.key(Key::Unicode('s'), Direction::Click);
                    let _ = self.enigo.key(Key::Shift, Direction::Release);
                    let _ = self.enigo.key(Key::Meta, Direction::Release);
                }
                #[cfg(target_os = "macos")]
                {
                    let _ = self.enigo.key(Key::Meta, Direction::Press);
                    let _ = self.enigo.key(Key::Shift, Direction::Press);
                    let _ = self.enigo.key(Key::Unicode('4'), Direction::Click);
                    let _ = self.enigo.key(Key::Shift, Direction::Release);
                    let _ = self.enigo.key(Key::Meta, Direction::Release);
                }
            }
            SystemCommandType::ClipboardCopy => {
                let _ = self.enigo.key(Key::Control, Direction::Press);
                let _ = self.enigo.key(Key::Unicode('c'), Direction::Click);
                let _ = self.enigo.key(Key::Control, Direction::Release);
            }
            SystemCommandType::ClipboardPaste => {
                let _ = self.enigo.key(Key::Control, Direction::Press);
                let _ = self.enigo.key(Key::Unicode('v'), Direction::Click);
                let _ = self.enigo.key(Key::Control, Direction::Release);
            }
        }
        Ok(())
    }
}

fn string_to_key(key_str: &str) -> Option<Key> {
    match key_str.to_lowercase().as_str() {
        "a" => Some(Key::Unicode('a')),
        "b" => Some(Key::Unicode('b')),
        "c" => Some(Key::Unicode('c')),
        "d" => Some(Key::Unicode('d')),
        "e" => Some(Key::Unicode('e')),
        "f" => Some(Key::Unicode('f')),
        "g" => Some(Key::Unicode('g')),
        "h" => Some(Key::Unicode('h')),
        "i" => Some(Key::Unicode('i')),
        "j" => Some(Key::Unicode('j')),
        "k" => Some(Key::Unicode('k')),
        "l" => Some(Key::Unicode('l')),
        "m" => Some(Key::Unicode('m')),
        "n" => Some(Key::Unicode('n')),
        "o" => Some(Key::Unicode('o')),
        "p" => Some(Key::Unicode('p')),
        "q" => Some(Key::Unicode('q')),
        "r" => Some(Key::Unicode('r')),
        "s" => Some(Key::Unicode('s')),
        "t" => Some(Key::Unicode('t')),
        "u" => Some(Key::Unicode('u')),
        "v" => Some(Key::Unicode('v')),
        "w" => Some(Key::Unicode('w')),
        "x" => Some(Key::Unicode('x')),
        "y" => Some(Key::Unicode('y')),
        "z" => Some(Key::Unicode('z')),
        "0" => Some(Key::Unicode('0')),
        "1" => Some(Key::Unicode('1')),
        "2" => Some(Key::Unicode('2')),
        "3" => Some(Key::Unicode('3')),
        "4" => Some(Key::Unicode('4')),
        "5" => Some(Key::Unicode('5')),
        "6" => Some(Key::Unicode('6')),
        "7" => Some(Key::Unicode('7')),
        "8" => Some(Key::Unicode('8')),
        "9" => Some(Key::Unicode('9')),
        "space" => Some(Key::Space),
        "enter" | "return" => Some(Key::Return),
        "tab" => Some(Key::Tab),
        "escape" | "esc" => Some(Key::Escape),
        "backspace" => Some(Key::Backspace),
        "delete" => Some(Key::Delete),
        "f1" => Some(Key::F1),
        "f2" => Some(Key::F2),
        "f3" => Some(Key::F3),
        "f4" => Some(Key::F4),
        "f5" => Some(Key::F5),
        "f6" => Some(Key::F6),
        "f7" => Some(Key::F7),
        "f8" => Some(Key::F8),
        "f9" => Some(Key::F9),
        "f10" => Some(Key::F10),
        "f11" => Some(Key::F11),
        "f12" => Some(Key::F12),
        _ => None,
    }
}
