use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use crate::actions::ActionMapping;
use crate::app_detector::{AppDetector, ActiveApp};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub mappings: HashMap<String, ActionMapping>, // Key: "channel:note" or "channel:cc:value"
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub smart_switch_rules: Vec<SmartSwitchRule>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartSwitchRule {
    pub app_name: String,
    pub window_title_contains: Option<String>,
    pub executable_path_contains: Option<String>,
    pub priority: i32, // Higher priority rules are checked first
}

impl Profile {
    pub fn new(name: String, description: Option<String>) -> Self {
        let now = chrono::Utc::now();
        Profile {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            description,
            mappings: HashMap::new(),
            created_at: now,
            updated_at: now,
            smart_switch_rules: Vec::new(),
        }
    }

    pub fn add_mapping(&mut self, mapping: ActionMapping) {
        let key = format!("{}:{}", mapping.midi_channel, mapping.midi_note_or_cc);
        self.mappings.insert(key, mapping);
        self.updated_at = chrono::Utc::now();
    }

    pub fn remove_mapping(&mut self, channel: u8, note_or_cc: u8) {
        let key = format!("{}:{}", channel, note_or_cc);
        self.mappings.remove(&key);
        self.updated_at = chrono::Utc::now();
    }

    pub fn remove_mapping_by_id(&mut self, mapping_id: &str) {
        self.mappings.retain(|_, mapping| mapping.id != mapping_id);
        self.updated_at = chrono::Utc::now();
    }

    pub fn get_mapping(&self, channel: u8, note_or_cc: u8) -> Option<&ActionMapping> {
        let key = format!("{}:{}", channel, note_or_cc);
        self.mappings.get(&key)
    }
}

pub struct ProfileManager {
    profiles: HashMap<String, Profile>,
    active_profile_id: Option<String>,
    app_data_dir: PathBuf,
    app_detector: AppDetector,
    smart_switching_enabled: bool,
}

impl ProfileManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;

        // Create the app data directory if it doesn't exist
        fs::create_dir_all(&app_data_dir)?;

        let mut manager = ProfileManager {
            profiles: HashMap::new(),
            active_profile_id: None,
            app_data_dir,
            app_detector: AppDetector::new(),
            smart_switching_enabled: false,
        };

        // Load existing profiles
        manager.load_profiles()?;

        // Create a default profile if none exist
        if manager.profiles.is_empty() {
            let default_profile = Profile::new(
                "Default".to_string(),
                Some("Default MIDI profile".to_string()),
            );
            manager.add_profile(default_profile.clone())?;
            manager.set_active_profile(&default_profile.id)?;
        }

        Ok(manager)
    }

    pub fn add_profile(&mut self, profile: Profile) -> Result<(), Box<dyn std::error::Error>> {
        let profile_id = profile.id.clone();
        self.profiles.insert(profile_id.clone(), profile);
        self.save_profile(&profile_id)?;
        Ok(())
    }

    pub fn get_profile(&self, profile_id: &str) -> Option<&Profile> {
        self.profiles.get(profile_id)
    }

    pub fn get_active_profile(&self) -> Option<&Profile> {
        if let Some(active_id) = &self.active_profile_id {
            self.profiles.get(active_id)
        } else {
            None
        }
    }

    pub fn get_active_profile_mut(&mut self) -> Option<&mut Profile> {
        if let Some(active_id) = &self.active_profile_id {
            let active_id = active_id.clone();
            self.profiles.get_mut(&active_id)
        } else {
            None
        }
    }

    pub fn set_active_profile(&mut self, profile_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        if self.profiles.contains_key(profile_id) {
            self.active_profile_id = Some(profile_id.to_string());
            Ok(())
        } else {
            Err("Profile not found".into())
        }
    }

    pub fn list_profiles(&self) -> Vec<&Profile> {
        self.profiles.values().collect()
    }

    pub fn delete_profile(&mut self, profile_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(active_id) = &self.active_profile_id {
            if active_id == profile_id {
                self.active_profile_id = None;
            }
        }

        self.profiles.remove(profile_id);
        
        let profile_path = self.get_profile_path(profile_id);
        if profile_path.exists() {
            fs::remove_file(profile_path)?;
        }

        Ok(())
    }

    pub fn save_profile(&self, profile_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(profile) = self.profiles.get(profile_id) {
            let profile_path = self.get_profile_path(profile_id);
            let json = serde_json::to_string_pretty(profile)?;
            fs::write(profile_path, json)?;
        }
        Ok(())
    }

    pub fn load_profiles(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let profiles_dir = self.app_data_dir.join("profiles");
        
        if !profiles_dir.exists() {
            fs::create_dir_all(&profiles_dir)?;
            return Ok(());
        }

        for entry in fs::read_dir(profiles_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(json) = fs::read_to_string(&path) {
                    if let Ok(profile) = serde_json::from_str::<Profile>(&json) {
                        self.profiles.insert(profile.id.clone(), profile);
                    }
                }
            }
        }

        Ok(())
    }

    pub fn export_profile(&self, profile_id: &str, export_path: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(profile) = self.profiles.get(profile_id) {
            let json = serde_json::to_string_pretty(profile)?;
            fs::write(export_path, json)?;
        }
        Ok(())
    }

    pub fn import_profile(&mut self, import_path: &PathBuf) -> Result<String, Box<dyn std::error::Error>> {
        let json = fs::read_to_string(import_path)?;
        let mut profile: Profile = serde_json::from_str(&json)?;
        
        // Generate new ID to avoid conflicts
        profile.id = uuid::Uuid::new_v4().to_string();
        profile.updated_at = chrono::Utc::now();
        
        let profile_id = profile.id.clone();
        self.add_profile(profile)?;
        
        Ok(profile_id)
    }

    fn get_profile_path(&self, profile_id: &str) -> PathBuf {
        self.app_data_dir
            .join("profiles")
            .join(format!("{}.json", profile_id))
    }

    // Smart Profile Switching Methods
    pub fn enable_smart_switching(&mut self, enabled: bool) {
        self.smart_switching_enabled = enabled;
    }

    pub fn is_smart_switching_enabled(&self) -> bool {
        self.smart_switching_enabled
    }

    pub fn check_and_switch_profile(&mut self) -> Result<Option<String>, Box<dyn std::error::Error>> {
        if !self.smart_switching_enabled {
            return Ok(None);
        }

        let active_app = self.app_detector.get_active_application()?;
        let matching_profile_id = self.find_matching_profile(&active_app);

        if let Some(profile_id) = matching_profile_id {
            if Some(&profile_id) != self.active_profile_id.as_ref() {
                self.active_profile_id = Some(profile_id.clone());
                return Ok(Some(profile_id));
            }
        }

        Ok(None)
    }

    fn find_matching_profile(&self, active_app: &ActiveApp) -> Option<String> {
        let mut matching_profiles: Vec<(&String, &Profile, i32)> = Vec::new();

        // Normalize the active app name for comparison
        let normalized_app_name = self.app_detector.normalize_app_name(&active_app.name);

        for (profile_id, profile) in &self.profiles {
            for rule in &profile.smart_switch_rules {
                let mut matches = false;
                let normalized_rule_app = self.app_detector.normalize_app_name(&rule.app_name);

                // Check app name match
                if normalized_app_name.contains(&normalized_rule_app) || normalized_rule_app.contains(&normalized_app_name) {
                    matches = true;
                }

                // Check window title if specified
                if let Some(ref title_contains) = rule.window_title_contains {
                    if !active_app.window_title.to_lowercase().contains(&title_contains.to_lowercase()) {
                        matches = false;
                    }
                }

                // Check executable path if specified
                if let Some(ref exe_contains) = rule.executable_path_contains {
                    if !active_app.executable.to_lowercase().contains(&exe_contains.to_lowercase()) {
                        matches = false;
                    }
                }

                if matches {
                    matching_profiles.push((profile_id, profile, rule.priority));
                }
            }
        }

        // Sort by priority (highest first) and return the first match
        matching_profiles.sort_by(|a, b| b.2.cmp(&a.2));
        matching_profiles.first().map(|(profile_id, _, _)| (*profile_id).clone())
    }

    pub fn add_smart_switch_rule(
        &mut self,
        profile_id: &str,
        rule: SmartSwitchRule,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(profile) = self.profiles.get_mut(profile_id) {
            profile.smart_switch_rules.push(rule);
            profile.updated_at = chrono::Utc::now();
            self.save_profile(profile_id)?;
        }
        Ok(())
    }

    pub fn remove_smart_switch_rule(
        &mut self,
        profile_id: &str,
        rule_index: usize,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(profile) = self.profiles.get_mut(profile_id) {
            if rule_index < profile.smart_switch_rules.len() {
                profile.smart_switch_rules.remove(rule_index);
                profile.updated_at = chrono::Utc::now();
                self.save_profile(profile_id)?;
            }
        }
        Ok(())
    }

    pub fn get_current_active_app(&self) -> Result<ActiveApp, Box<dyn std::error::Error>> {
        self.app_detector.get_active_application()
    }

    pub fn delete_mapping(&mut self, mapping_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(profile) = self.get_active_profile_mut() {
            let profile_id = profile.id.clone();
            profile.remove_mapping_by_id(mapping_id);
            self.save_profile(&profile_id)?;
            Ok(())
        } else {
            Err("No active profile".into())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::actions::{Action, ActionMapping};

    // -- Profile tests --

    #[test]
    fn profile_new_generates_unique_ids() {
        let p1 = Profile::new("Profile 1".to_string(), None);
        let p2 = Profile::new("Profile 2".to_string(), None);
        assert_ne!(p1.id, p2.id);
    }

    #[test]
    fn profile_new_sets_fields() {
        let p = Profile::new("Test".to_string(), Some("A description".to_string()));
        assert_eq!(p.name, "Test");
        assert_eq!(p.description, Some("A description".to_string()));
        assert!(p.mappings.is_empty());
        assert!(p.smart_switch_rules.is_empty());
        assert!(p.created_at <= p.updated_at);
    }

    #[test]
    fn profile_new_without_description() {
        let p = Profile::new("Minimal".to_string(), None);
        assert_eq!(p.description, None);
    }

    #[test]
    fn profile_add_mapping() {
        let mut p = Profile::new("Test".to_string(), None);
        let mapping = ActionMapping {
            id: "m-1".to_string(),
            name: "Volume Up".to_string(),
            midi_channel: 0,
            midi_note_or_cc: 60,
            action: Action::TypeText { text: "test".to_string() },
        };
        let created = p.created_at;
        p.add_mapping(mapping);

        assert_eq!(p.mappings.len(), 1);
        assert!(p.mappings.contains_key("0:60"));
        assert!(p.updated_at >= created);
    }

    #[test]
    fn profile_add_mapping_overwrites_same_key() {
        let mut p = Profile::new("Test".to_string(), None);
        let m1 = ActionMapping {
            id: "m-1".to_string(),
            name: "First".to_string(),
            midi_channel: 0,
            midi_note_or_cc: 60,
            action: Action::TypeText { text: "first".to_string() },
        };
        let m2 = ActionMapping {
            id: "m-2".to_string(),
            name: "Second".to_string(),
            midi_channel: 0,
            midi_note_or_cc: 60,
            action: Action::TypeText { text: "second".to_string() },
        };
        p.add_mapping(m1);
        p.add_mapping(m2);

        assert_eq!(p.mappings.len(), 1);
        assert_eq!(p.mappings["0:60"].name, "Second");
    }

    #[test]
    fn profile_remove_mapping() {
        let mut p = Profile::new("Test".to_string(), None);
        p.add_mapping(ActionMapping {
            id: "m-1".to_string(),
            name: "Test".to_string(),
            midi_channel: 1,
            midi_note_or_cc: 42,
            action: Action::TypeText { text: "x".to_string() },
        });
        assert_eq!(p.mappings.len(), 1);

        p.remove_mapping(1, 42);
        assert!(p.mappings.is_empty());
    }

    #[test]
    fn profile_remove_mapping_nonexistent_is_safe() {
        let mut p = Profile::new("Test".to_string(), None);
        p.remove_mapping(5, 99); // should not panic
        assert!(p.mappings.is_empty());
    }

    #[test]
    fn profile_remove_mapping_by_id() {
        let mut p = Profile::new("Test".to_string(), None);
        p.add_mapping(ActionMapping {
            id: "keep-me".to_string(),
            name: "Keep".to_string(),
            midi_channel: 0,
            midi_note_or_cc: 60,
            action: Action::TypeText { text: "a".to_string() },
        });
        p.add_mapping(ActionMapping {
            id: "delete-me".to_string(),
            name: "Delete".to_string(),
            midi_channel: 0,
            midi_note_or_cc: 61,
            action: Action::TypeText { text: "b".to_string() },
        });
        assert_eq!(p.mappings.len(), 2);

        p.remove_mapping_by_id("delete-me");
        assert_eq!(p.mappings.len(), 1);
        assert!(p.mappings.values().all(|m| m.id == "keep-me"));
    }

    #[test]
    fn profile_get_mapping() {
        let mut p = Profile::new("Test".to_string(), None);
        p.add_mapping(ActionMapping {
            id: "m-1".to_string(),
            name: "Test".to_string(),
            midi_channel: 2,
            midi_note_or_cc: 80,
            action: Action::TypeText { text: "found".to_string() },
        });

        let found = p.get_mapping(2, 80);
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "Test");

        assert!(p.get_mapping(0, 0).is_none());
    }

    // -- Profile serialization --

    #[test]
    fn profile_json_roundtrip() {
        let mut p = Profile::new("Roundtrip".to_string(), Some("desc".to_string()));
        p.add_mapping(ActionMapping {
            id: "m-1".to_string(),
            name: "Map".to_string(),
            midi_channel: 0,
            midi_note_or_cc: 60,
            action: Action::OpenUrl { url: "https://test.com".to_string() },
        });
        p.smart_switch_rules.push(SmartSwitchRule {
            app_name: "chrome".to_string(),
            window_title_contains: Some("Gmail".to_string()),
            executable_path_contains: None,
            priority: 10,
        });

        let json = serde_json::to_string_pretty(&p).unwrap();
        let deserialized: Profile = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.id, p.id);
        assert_eq!(deserialized.name, "Roundtrip");
        assert_eq!(deserialized.description, Some("desc".to_string()));
        assert_eq!(deserialized.mappings.len(), 1);
        assert_eq!(deserialized.smart_switch_rules.len(), 1);
        assert_eq!(deserialized.smart_switch_rules[0].app_name, "chrome");
        assert_eq!(deserialized.smart_switch_rules[0].priority, 10);
    }

    // -- AppDetector normalize --

    #[test]
    fn normalize_app_name() {
        use crate::app_detector::AppDetector;
        let detector = AppDetector::new();

        assert_eq!(detector.normalize_app_name("Chrome.exe"), "chrome");
        assert_eq!(detector.normalize_app_name("Visual Studio"), "visualstudio");
        assert_eq!(detector.normalize_app_name("  Notepad  "), "notepad");
    }

    // -- SmartSwitchRule serialization --

    #[test]
    fn smart_switch_rule_roundtrip() {
        let rule = SmartSwitchRule {
            app_name: "obs".to_string(),
            window_title_contains: Some("Scene".to_string()),
            executable_path_contains: Some("C:\\obs".to_string()),
            priority: 5,
        };
        let json = serde_json::to_string(&rule).unwrap();
        let deserialized: SmartSwitchRule = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.app_name, "obs");
        assert_eq!(deserialized.window_title_contains, Some("Scene".to_string()));
        assert_eq!(deserialized.executable_path_contains, Some("C:\\obs".to_string()));
        assert_eq!(deserialized.priority, 5);
    }

    #[test]
    fn smart_switch_rule_optional_fields() {
        let rule = SmartSwitchRule {
            app_name: "vscode".to_string(),
            window_title_contains: None,
            executable_path_contains: None,
            priority: 1,
        };
        let json = serde_json::to_string(&rule).unwrap();
        let deserialized: SmartSwitchRule = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.window_title_contains, None);
        assert_eq!(deserialized.executable_path_contains, None);
    }
}