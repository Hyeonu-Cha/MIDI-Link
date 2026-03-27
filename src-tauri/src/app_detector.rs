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
            // Fallback: try using wmctrl + xprop
            // Get active window ID from xprop
            let xprop_output = Command::new("xprop")
                .args(&["-root", "_NET_ACTIVE_WINDOW"])
                .output()
                .unwrap_or_else(|_| std::process::Output {
                    status: std::process::ExitStatus::default(),
                    stdout: Vec::new(),
                    stderr: Vec::new(),
                });
            let xprop_str = String::from_utf8_lossy(&xprop_output.stdout);

            // Parse active window id (format: "_NET_ACTIVE_WINDOW(WINDOW): window id # 0x...")
            let active_wid = xprop_str
                .split("# ")
                .nth(1)
                .map(|s| s.trim())
                .unwrap_or("0x0");

            // Get window list from wmctrl
            let output = Command::new("wmctrl")
                .args(&["-l", "-p"])
                .output()?;

            let output_str = String::from_utf8_lossy(&output.stdout);

            // Find the matching line by window ID
            // wmctrl format: "0x04200003  0 12345 hostname Window Title"
            for line in output_str.lines() {
                let parts: Vec<&str> = line.splitn(5, char::is_whitespace).collect();
                if parts.is_empty() { continue; }
                // Compare window IDs (normalize hex)
                let line_wid = parts[0].trim();
                if line_wid == active_wid || u64::from_str_radix(line_wid.trim_start_matches("0x"), 16).unwrap_or(0)
                    == u64::from_str_radix(active_wid.trim_start_matches("0x"), 16).unwrap_or(1) {
                    let window_title = parts.get(4).unwrap_or(&"Unknown").trim().to_string();
                    // Try to get PID-based process name
                    let pid = parts.get(2).unwrap_or(&"0").trim();
                    let process_name = std::fs::read_to_string(format!("/proc/{}/comm", pid))
                        .unwrap_or_else(|_| "Unknown".to_string())
                        .trim()
                        .to_string();
                    return Ok(ActiveApp {
                        name: process_name.clone(),
                        executable: process_name,
                        window_title,
                    });
                }
            }

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