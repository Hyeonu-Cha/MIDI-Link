use serde::{Deserialize, Serialize};
use std::process::Command;
use enigo::{Enigo, Key, Button, Direction, Settings, Coordinate, Keyboard, Mouse};
use log::{warn, error, info};

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
        info!("Executing script: type={:?}, content length={}", script_type, content.len());

        let result = match script_type {
            ScriptType::PowerShell => {
                #[cfg(target_os = "windows")]
                {
                    Command::new("powershell")
                        .args(&["-Command", content])
                        .spawn()
                }
                #[cfg(not(target_os = "windows"))]
                {
                    return Err("PowerShell is only available on Windows".into());
                }
            }
            ScriptType::Bash => {
                #[cfg(not(target_os = "windows"))]
                {
                    Command::new("bash")
                        .args(&["-c", content])
                        .spawn()
                }
                #[cfg(target_os = "windows")]
                {
                    return Err("Bash is not available on Windows. Use PowerShell or Cmd instead.".into());
                }
            }
            ScriptType::Cmd => {
                #[cfg(target_os = "windows")]
                {
                    Command::new("cmd")
                        .args(&["/c", content])
                        .spawn()
                }
                #[cfg(not(target_os = "windows"))]
                {
                    return Err("Command Prompt is only available on Windows".into());
                }
            }
        };

        match result {
            Ok(_) => {
                info!("Successfully started script execution");
                Ok(())
            }
            Err(e) => {
                error!("Failed to execute script: {}", e);
                Err(format!("Failed to execute script: {}", e).into())
            }
        }
    }

    fn execute_keyboard_shortcut(
        &mut self,
        keys: &[String],
        modifiers: &[String],
    ) -> Result<(), Box<dyn std::error::Error>> {
        info!("Executing keyboard shortcut: keys={:?}, modifiers={:?}", keys, modifiers);

        // Press modifiers
        for modifier in modifiers {
            match modifier.as_str() {
                "ctrl" | "control" => {
                    if let Err(e) = self.enigo.key(Key::Control, Direction::Press) {
                        warn!("Failed to press Control key: {}", e);
                    }
                },
                "alt" => {
                    if let Err(e) = self.enigo.key(Key::Alt, Direction::Press) {
                        warn!("Failed to press Alt key: {}", e);
                    }
                },
                "shift" => {
                    if let Err(e) = self.enigo.key(Key::Shift, Direction::Press) {
                        warn!("Failed to press Shift key: {}", e);
                    }
                },
                "meta" | "super" | "cmd" => {
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Press) {
                        warn!("Failed to press Meta key: {}", e);
                    }
                },
                _ => warn!("Unknown modifier: {}", modifier),
            }
        }

        // Press keys
        for key in keys {
            if let Some(enigo_key) = string_to_key(key) {
                if let Err(e) = self.enigo.key(enigo_key, Direction::Click) {
                    warn!("Failed to press key '{}': {}", key, e);
                }
            } else {
                warn!("Unknown key: {}", key);
            }
        }

        // Release modifiers
        for modifier in modifiers {
            match modifier.as_str() {
                "ctrl" | "control" => {
                    if let Err(e) = self.enigo.key(Key::Control, Direction::Release) {
                        warn!("Failed to release Control key: {}", e);
                    }
                },
                "alt" => {
                    if let Err(e) = self.enigo.key(Key::Alt, Direction::Release) {
                        warn!("Failed to release Alt key: {}", e);
                    }
                },
                "shift" => {
                    if let Err(e) = self.enigo.key(Key::Shift, Direction::Release) {
                        warn!("Failed to release Shift key: {}", e);
                    }
                },
                "meta" | "super" | "cmd" => {
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Release) {
                        warn!("Failed to release Meta key: {}", e);
                    }
                },
                _ => {},
            }
        }

        Ok(())
    }

    fn execute_launch_application(
        &mut self,
        path: &str,
        args: &[String],
    ) -> Result<(), Box<dyn std::error::Error>> {
        info!("Launching application: {} with args: {:?}", path, args);
        match Command::new(path).args(args).spawn() {
            Ok(_) => {
                info!("Successfully launched application: {}", path);
                Ok(())
            }
            Err(e) => {
                error!("Failed to launch application '{}': {}", path, e);
                Err(format!("Failed to launch application '{}': {}", path, e).into())
            }
        }
    }

    fn execute_open_url(&mut self, url: &str) -> Result<(), Box<dyn std::error::Error>> {
        info!("Opening URL: {}", url);

        let result = {
            #[cfg(target_os = "windows")]
            {
                Command::new("cmd").args(&["/c", "start", url]).spawn()
            }

            #[cfg(target_os = "macos")]
            {
                Command::new("open").arg(url).spawn()
            }

            #[cfg(target_os = "linux")]
            {
                Command::new("xdg-open").arg(url).spawn()
            }
        };

        match result {
            Ok(_) => {
                info!("Successfully opened URL: {}", url);
                Ok(())
            }
            Err(e) => {
                error!("Failed to open URL '{}': {}", url, e);
                Err(format!("Failed to open URL '{}': {}", url, e).into())
            }
        }
    }

    fn execute_type_text(&mut self, text: &str) -> Result<(), Box<dyn std::error::Error>> {
        info!("Typing text: '{}'", text);
        if let Err(e) = self.enigo.text(text) {
            warn!("Failed to type text '{}': {}", text, e);
        } else {
            info!("Successfully typed text");
        }
        Ok(())
    }

    fn execute_mouse_click(
        &mut self,
        button: &str,
        x: i32,
        y: i32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        info!("Executing mouse click: button={}, x={}, y={}", button, x, y);

        if let Err(e) = self.enigo.move_mouse(x, y, Coordinate::Abs) {
            warn!("Failed to move mouse to ({}, {}): {}", x, y, e);
        }

        let click_result = match button {
            "left" => self.enigo.button(Button::Left, Direction::Click),
            "right" => self.enigo.button(Button::Right, Direction::Click),
            "middle" => self.enigo.button(Button::Middle, Direction::Click),
            _ => return Err("Invalid mouse button".into()),
        };

        if let Err(e) = click_result {
            warn!("Failed to click {} mouse button: {}", button, e);
        } else {
            info!("Successfully clicked {} mouse button at ({}, {})", button, x, y);
        }

        Ok(())
    }

    fn execute_system_command(
        &mut self,
        command_type: &SystemCommandType,
    ) -> Result<(), Box<dyn std::error::Error>> {
        info!("Executing system command: {:?}", command_type);

        match command_type {
            SystemCommandType::VolumeUp => {
                if let Err(e) = self.enigo.key(Key::VolumeUp, Direction::Click) {
                    warn!("Failed to execute VolumeUp: {}", e);
                } else {
                    info!("Successfully executed VolumeUp");
                }
            }
            SystemCommandType::VolumeDown => {
                if let Err(e) = self.enigo.key(Key::VolumeDown, Direction::Click) {
                    warn!("Failed to execute VolumeDown: {}", e);
                } else {
                    info!("Successfully executed VolumeDown");
                }
            }
            SystemCommandType::Mute => {
                if let Err(e) = self.enigo.key(Key::VolumeMute, Direction::Click) {
                    warn!("Failed to execute Mute: {}", e);
                } else {
                    info!("Successfully executed Mute");
                }
            }
            SystemCommandType::PlayPause => {
                if let Err(e) = self.enigo.key(Key::MediaPlayPause, Direction::Click) {
                    warn!("Failed to execute PlayPause: {}", e);
                } else {
                    info!("Successfully executed PlayPause");
                }
            }
            SystemCommandType::NextTrack => {
                if let Err(e) = self.enigo.key(Key::MediaNextTrack, Direction::Click) {
                    warn!("Failed to execute NextTrack: {}", e);
                } else {
                    info!("Successfully executed NextTrack");
                }
            }
            SystemCommandType::PreviousTrack => {
                if let Err(e) = self.enigo.key(Key::MediaPrevTrack, Direction::Click) {
                    warn!("Failed to execute PreviousTrack: {}", e);
                } else {
                    info!("Successfully executed PreviousTrack");
                }
            }
            SystemCommandType::BrightnessUp => {
                // Platform-specific brightness control
                #[cfg(target_os = "windows")]
                {
                    if let Err(e) = self.enigo.key(Key::Alt, Direction::Press) {
                        warn!("Failed to press Alt for BrightnessUp: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::F15, Direction::Click) {
                        warn!("Failed to press F15 for BrightnessUp: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Alt, Direction::Release) {
                        warn!("Failed to release Alt for BrightnessUp: {}", e);
                    }
                }
                #[cfg(target_os = "macos")]
                {
                    if let Err(e) = self.enigo.key(Key::F2, Direction::Click) {
                        warn!("Failed to execute BrightnessUp: {}", e);
                    }
                }
                info!("Executed BrightnessUp command");
            }
            SystemCommandType::BrightnessDown => {
                #[cfg(target_os = "windows")]
                {
                    if let Err(e) = self.enigo.key(Key::Alt, Direction::Press) {
                        warn!("Failed to press Alt for BrightnessDown: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::F14, Direction::Click) {
                        warn!("Failed to press F14 for BrightnessDown: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Alt, Direction::Release) {
                        warn!("Failed to release Alt for BrightnessDown: {}", e);
                    }
                }
                #[cfg(target_os = "macos")]
                {
                    if let Err(e) = self.enigo.key(Key::F1, Direction::Click) {
                        warn!("Failed to execute BrightnessDown: {}", e);
                    }
                }
                info!("Executed BrightnessDown command");
            }
            SystemCommandType::Sleep => {
                info!("Attempting to put system to sleep");
                let result = {
                    #[cfg(target_os = "windows")]
                    {
                        Command::new("rundll32.exe")
                            .args(&["powrprof.dll,SetSuspendState", "0,1,0"])
                            .spawn()
                    }
                    #[cfg(target_os = "macos")]
                    {
                        Command::new("pmset").args(&["sleepnow"]).spawn()
                    }
                    #[cfg(target_os = "linux")]
                    {
                        Command::new("systemctl").args(&["suspend"]).spawn()
                    }
                };

                if let Err(e) = result {
                    error!("Failed to put system to sleep: {}", e);
                    return Err(format!("Failed to put system to sleep: {}", e).into());
                }
                info!("Successfully initiated system sleep");
            }
            SystemCommandType::Lock => {
                info!("Attempting to lock system");
                let result = {
                    #[cfg(target_os = "windows")]
                    {
                        Command::new("rundll32.exe")
                            .args(&["user32.dll,LockWorkStation"])
                            .spawn()
                    }
                    #[cfg(target_os = "macos")]
                    {
                        Command::new("pmset").args(&["displaysleepnow"]).spawn()
                    }
                    #[cfg(target_os = "linux")]
                    {
                        Command::new("xdg-screensaver").args(&["lock"]).spawn()
                    }
                };

                if let Err(e) = result {
                    error!("Failed to lock system: {}", e);
                    return Err(format!("Failed to lock system: {}", e).into());
                }
                info!("Successfully initiated system lock");
            }
            SystemCommandType::Shutdown => {
                error!("CRITICAL: System shutdown requested via MIDI trigger");
                let result = {
                    #[cfg(target_os = "windows")]
                    {
                        Command::new("shutdown").args(&["/s", "/t", "0"]).spawn()
                    }
                    #[cfg(target_os = "macos")]
                    {
                        Command::new("sudo").args(&["shutdown", "-h", "now"]).spawn()
                    }
                    #[cfg(target_os = "linux")]
                    {
                        Command::new("systemctl").args(&["poweroff"]).spawn()
                    }
                };

                if let Err(e) = result {
                    error!("CRITICAL: Failed to shutdown system: {}", e);
                    return Err(format!("CRITICAL: Failed to shutdown system: {}", e).into());
                }
                error!("CRITICAL: System shutdown initiated successfully");
            }
            SystemCommandType::Restart => {
                error!("CRITICAL: System restart requested via MIDI trigger");
                let result = {
                    #[cfg(target_os = "windows")]
                    {
                        Command::new("shutdown").args(&["/r", "/t", "0"]).spawn()
                    }
                    #[cfg(target_os = "macos")]
                    {
                        Command::new("sudo").args(&["shutdown", "-r", "now"]).spawn()
                    }
                    #[cfg(target_os = "linux")]
                    {
                        Command::new("systemctl").args(&["reboot"]).spawn()
                    }
                };

                if let Err(e) = result {
                    error!("CRITICAL: Failed to restart system: {}", e);
                    return Err(format!("CRITICAL: Failed to restart system: {}", e).into());
                }
                error!("CRITICAL: System restart initiated successfully");
            }
            SystemCommandType::MinimizeWindow => {
                #[cfg(target_os = "windows")]
                {
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Press) {
                        warn!("Failed to press Meta for MinimizeWindow: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::DownArrow, Direction::Click) {
                        warn!("Failed to press DownArrow for MinimizeWindow: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Release) {
                        warn!("Failed to release Meta for MinimizeWindow: {}", e);
                    }
                }
                #[cfg(target_os = "macos")]
                {
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Press) {
                        warn!("Failed to press Meta for MinimizeWindow: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Unicode('m'), Direction::Click) {
                        warn!("Failed to press 'm' for MinimizeWindow: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Release) {
                        warn!("Failed to release Meta for MinimizeWindow: {}", e);
                    }
                }
                info!("Executed MinimizeWindow command");
            }
            SystemCommandType::MaximizeWindow => {
                #[cfg(target_os = "windows")]
                {
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Press) {
                        warn!("Failed to press Meta for MaximizeWindow: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::UpArrow, Direction::Click) {
                        warn!("Failed to press UpArrow for MaximizeWindow: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Release) {
                        warn!("Failed to release Meta for MaximizeWindow: {}", e);
                    }
                }
                #[cfg(target_os = "macos")]
                {
                    if let Err(e) = self.enigo.key(Key::Control, Direction::Press) {
                        warn!("Failed to press Control for MaximizeWindow: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Press) {
                        warn!("Failed to press Meta for MaximizeWindow: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Unicode('f'), Direction::Click) {
                        warn!("Failed to press 'f' for MaximizeWindow: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Release) {
                        warn!("Failed to release Meta for MaximizeWindow: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Control, Direction::Release) {
                        warn!("Failed to release Control for MaximizeWindow: {}", e);
                    }
                }
                info!("Executed MaximizeWindow command");
            }
            SystemCommandType::CloseWindow => {
                #[cfg(target_os = "windows")]
                {
                    if let Err(e) = self.enigo.key(Key::Alt, Direction::Press) {
                        warn!("Failed to press Alt for CloseWindow: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::F4, Direction::Click) {
                        warn!("Failed to press F4 for CloseWindow: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Alt, Direction::Release) {
                        warn!("Failed to release Alt for CloseWindow: {}", e);
                    }
                }
                #[cfg(target_os = "macos")]
                {
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Press) {
                        warn!("Failed to press Meta for CloseWindow: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Unicode('w'), Direction::Click) {
                        warn!("Failed to press 'w' for CloseWindow: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Release) {
                        warn!("Failed to release Meta for CloseWindow: {}", e);
                    }
                }
                info!("Executed CloseWindow command");
            }
            SystemCommandType::SwitchDesktop => {
                #[cfg(target_os = "windows")]
                {
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Press) {
                        warn!("Failed to press Meta for SwitchDesktop: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Control, Direction::Press) {
                        warn!("Failed to press Control for SwitchDesktop: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::RightArrow, Direction::Click) {
                        warn!("Failed to press RightArrow for SwitchDesktop: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Control, Direction::Release) {
                        warn!("Failed to release Control for SwitchDesktop: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Release) {
                        warn!("Failed to release Meta for SwitchDesktop: {}", e);
                    }
                }
                #[cfg(target_os = "macos")]
                {
                    if let Err(e) = self.enigo.key(Key::Control, Direction::Press) {
                        warn!("Failed to press Control for SwitchDesktop: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::RightArrow, Direction::Click) {
                        warn!("Failed to press RightArrow for SwitchDesktop: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Control, Direction::Release) {
                        warn!("Failed to release Control for SwitchDesktop: {}", e);
                    }
                }
                info!("Executed SwitchDesktop command");
            }
            SystemCommandType::TaskView => {
                #[cfg(target_os = "windows")]
                {
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Press) {
                        warn!("Failed to press Meta for TaskView: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Tab, Direction::Click) {
                        warn!("Failed to press Tab for TaskView: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Release) {
                        warn!("Failed to release Meta for TaskView: {}", e);
                    }
                }
                #[cfg(target_os = "macos")]
                {
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Press) {
                        warn!("Failed to press Meta for TaskView: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Tab, Direction::Click) {
                        warn!("Failed to press Tab for TaskView: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Release) {
                        warn!("Failed to release Meta for TaskView: {}", e);
                    }
                }
                info!("Executed TaskView command");
            }
            SystemCommandType::Screenshot => {
                #[cfg(target_os = "windows")]
                {
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Press) {
                        warn!("Failed to press Meta for Screenshot: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Shift, Direction::Press) {
                        warn!("Failed to press Shift for Screenshot: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Unicode('s'), Direction::Click) {
                        warn!("Failed to press 's' for Screenshot: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Shift, Direction::Release) {
                        warn!("Failed to release Shift for Screenshot: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Release) {
                        warn!("Failed to release Meta for Screenshot: {}", e);
                    }
                }
                #[cfg(target_os = "macos")]
                {
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Press) {
                        warn!("Failed to press Meta for Screenshot: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Shift, Direction::Press) {
                        warn!("Failed to press Shift for Screenshot: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Unicode('4'), Direction::Click) {
                        warn!("Failed to press '4' for Screenshot: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Shift, Direction::Release) {
                        warn!("Failed to release Shift for Screenshot: {}", e);
                    }
                    if let Err(e) = self.enigo.key(Key::Meta, Direction::Release) {
                        warn!("Failed to release Meta for Screenshot: {}", e);
                    }
                }
                info!("Executed Screenshot command");
            }
            SystemCommandType::ClipboardCopy => {
                if let Err(e) = self.enigo.key(Key::Control, Direction::Press) {
                    warn!("Failed to press Control for ClipboardCopy: {}", e);
                }
                if let Err(e) = self.enigo.key(Key::Unicode('c'), Direction::Click) {
                    warn!("Failed to press 'c' for ClipboardCopy: {}", e);
                }
                if let Err(e) = self.enigo.key(Key::Control, Direction::Release) {
                    warn!("Failed to release Control for ClipboardCopy: {}", e);
                }
                info!("Executed ClipboardCopy command");
            }
            SystemCommandType::ClipboardPaste => {
                if let Err(e) = self.enigo.key(Key::Control, Direction::Press) {
                    warn!("Failed to press Control for ClipboardPaste: {}", e);
                }
                if let Err(e) = self.enigo.key(Key::Unicode('v'), Direction::Click) {
                    warn!("Failed to press 'v' for ClipboardPaste: {}", e);
                }
                if let Err(e) = self.enigo.key(Key::Control, Direction::Release) {
                    warn!("Failed to release Control for ClipboardPaste: {}", e);
                }
                info!("Executed ClipboardPaste command");
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
