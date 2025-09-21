use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveApp {
    pub name: String,
    pub executable: String,
    pub window_title: String,
}

pub struct AppDetector;

impl AppDetector {
    pub fn new() -> Self {
        AppDetector
    }

    pub fn get_active_application(&self) -> Result<ActiveApp, Box<dyn std::error::Error>> {
        #[cfg(target_os = "windows")]
        {
            self.get_active_app_windows()
        }

        #[cfg(target_os = "macos")]
        {
            self.get_active_app_macos()
        }

        #[cfg(target_os = "linux")]
        {
            self.get_active_app_linux()
        }
    }

    #[cfg(target_os = "windows")]
    fn get_active_app_windows(&self) -> Result<ActiveApp, Box<dyn std::error::Error>> {
        let output = Command::new("powershell")
            .args(&[
                "-Command",
                r#"
                Add-Type @"
                    using System;
                    using System.Runtime.InteropServices;
                    using System.Text;
                    public class Win32 {
                        [DllImport("user32.dll")]
                        public static extern IntPtr GetForegroundWindow();
                        
                        [DllImport("user32.dll")]
                        public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
                        
                        [DllImport("user32.dll", SetLastError = true)]
                        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
                    }
"@
                $hwnd = [Win32]::GetForegroundWindow()
                $title = New-Object System.Text.StringBuilder 256
                [Win32]::GetWindowText($hwnd, $title, $title.Capacity)
                
                $processId = 0
                [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId)
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                
                if ($process) {
                    Write-Output "$($process.ProcessName)|$($process.MainModule.FileName)|$($title.ToString())"
                } else {
                    Write-Output "Unknown|Unknown|$($title.ToString())"
                }
                "#,
            ])
            .output()?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        let parts: Vec<&str> = output_str.trim().split('|').collect();

        if parts.len() >= 3 {
            Ok(ActiveApp {
                name: parts[0].to_string(),
                executable: parts[1].to_string(),
                window_title: parts[2].to_string(),
            })
        } else {
            Err("Failed to parse active application info".into())
        }
    }

    #[cfg(target_os = "macos")]
    fn get_active_app_macos(&self) -> Result<ActiveApp, Box<dyn std::error::Error>> {
        let output = Command::new("osascript")
            .args(&[
                "-e",
                r#"
                tell application "System Events"
                    set frontApp to first application process whose frontmost is true
                    set appName to name of frontApp
                    set appPath to POSIX path of (file of frontApp as string)
                end tell
                
                tell application "System Events"
                    tell process appName
                        set windowTitle to name of front window
                    end tell
                end tell
                
                return appName & "|" & appPath & "|" & windowTitle
                "#,
            ])
            .output()?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        let parts: Vec<&str> = output_str.trim().split('|').collect();

        if parts.len() >= 3 {
            Ok(ActiveApp {
                name: parts[0].to_string(),
                executable: parts[1].to_string(),
                window_title: parts[2].to_string(),
            })
        } else {
            Err("Failed to parse active application info".into())
        }
    }

    #[cfg(target_os = "linux")]
    fn get_active_app_linux(&self) -> Result<ActiveApp, Box<dyn std::error::Error>> {
        // Try to get window info using xdotool (if available)
        let window_id_output = Command::new("xdotool")
            .args(&["getactivewindow"])
            .output();

        if let Ok(window_output) = window_id_output {
            let window_id = String::from_utf8_lossy(&window_output.stdout).trim().to_string();
            
            // Get window title
            let title_output = Command::new("xdotool")
                .args(&["getwindowname", &window_id])
                .output()?;
            let window_title = String::from_utf8_lossy(&title_output.stdout).trim().to_string();

            // Get process info
            let pid_output = Command::new("xdotool")
                .args(&["getwindowpid", &window_id])
                .output()?;
            let pid = String::from_utf8_lossy(&pid_output.stdout).trim().to_string();

            // Get process name
            let ps_output = Command::new("ps")
                .args(&["-p", &pid, "-o", "comm="])
                .output()?;
            let process_name = String::from_utf8_lossy(&ps_output.stdout).trim().to_string();

            // Get executable path
            let exe_path = format!("/proc/{}/exe", pid);
            let exe_output = Command::new("readlink")
                .args(&["-f", &exe_path])
                .output()
                .unwrap_or_else(|_| std::process::Output {
                    status: std::process::ExitStatus::from_raw(1),
                    stdout: process_name.as_bytes().to_vec(),
                    stderr: Vec::new(),
                });
            let executable = String::from_utf8_lossy(&exe_output.stdout).trim().to_string();

            Ok(ActiveApp {
                name: process_name,
                executable,
                window_title,
            })
        } else {
            // Fallback: try using wmctrl
            let output = Command::new("wmctrl")
                .args(&["-l", "-p"])
                .output()?;

            let output_str = String::from_utf8_lossy(&output.stdout);
            // Parse wmctrl output and find active window
            // This is a simplified version - in practice you'd need more sophisticated parsing
            
            Ok(ActiveApp {
                name: "Unknown".to_string(),
                executable: "Unknown".to_string(),
                window_title: "Unknown".to_string(),
            })
        }
    }

    pub fn normalize_app_name(&self, app_name: &str) -> String {
        // Normalize application names for consistent matching
        app_name
            .to_lowercase()
            .replace(".exe", "")
            .replace(" ", "")
            .trim()
            .to_string()
    }
}