mod midi;
mod actions;
mod profiles;
mod app_detector;

use std::sync::{Arc, Mutex};
use tauri::{Manager, State, Emitter};
use midi::MidiHandler;
use actions::{ActionEngine, ActionMapping, Action};
use profiles::{ProfileManager, Profile, SmartSwitchRule};
use app_detector::ActiveApp;
use log::error;

type MidiHandlerState = Arc<Mutex<Option<MidiHandler>>>;
type ActionEngineState = Arc<Mutex<ActionEngine>>;
type ProfileManagerState = Arc<Mutex<Option<ProfileManager>>>;

#[tauri::command]
async fn initialize_midi(
    app_handle: tauri::AppHandle,
    midi_handler: State<'_, MidiHandlerState>,
) -> Result<Vec<String>, String> {
    let mut handler_guard = midi_handler.lock().map_err(|e| e.to_string())?;

    match MidiHandler::new() {
        Ok(mut handler) => {
            let devices = handler.scan_devices().map_err(|e| e.to_string())?;
            let event_receiver = handler.get_event_receiver();
            handler.start_listening().map_err(|e| e.to_string())?;
            *handler_guard = Some(handler);

            // Spawn a thread to forward MIDI events to the frontend
            std::thread::spawn(move || {
                if let Ok(mut guard) = event_receiver.lock() {
                    if let Some(receiver) = guard.take() {
                        drop(guard);
                        while let Ok(event) = receiver.recv() {
                            if let Err(e) = app_handle.emit("midi-event", &event) {
                                error!("Failed to emit MIDI event: {}", e);
                            }
                        }
                    }
                }
            });

            Ok(devices)
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn get_midi_devices(
    midi_handler: State<'_, MidiHandlerState>,
) -> Result<Vec<String>, String> {
    let handler_guard = midi_handler.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref handler) = *handler_guard {
        handler.scan_devices().map_err(|e| e.to_string())
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
async fn execute_action(
    action_engine: State<'_, ActionEngineState>,
    action: Action,
) -> Result<(), String> {
    let engine = action_engine.inner().clone();
    tokio::task::spawn_blocking(move || {
        let mut engine = engine.lock().map_err(|e| e.to_string())?;
        engine.execute_action(&action).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn create_profile(
    profile_manager: State<'_, ProfileManagerState>,
    name: String,
    description: Option<String>,
) -> Result<String, String> {
    let mut manager_guard = profile_manager.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref mut manager) = *manager_guard {
        let profile = Profile::new(name, description);
        let profile_id = profile.id.clone();
        manager.add_profile(profile).map_err(|e| e.to_string())?;
        Ok(profile_id)
    } else {
        Err("Profile manager not initialized".to_string())
    }
}

#[tauri::command]
async fn get_profiles(
    profile_manager: State<'_, ProfileManagerState>,
) -> Result<Vec<Profile>, String> {
    let manager_guard = profile_manager.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref manager) = *manager_guard {
        Ok(manager.list_profiles().into_iter().cloned().collect())
    } else {
        Err("Profile manager not initialized".to_string())
    }
}

#[tauri::command]
async fn set_active_profile(
    profile_manager: State<'_, ProfileManagerState>,
    profile_id: String,
) -> Result<(), String> {
    let mut manager_guard = profile_manager.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref mut manager) = *manager_guard {
        manager.set_active_profile(&profile_id).map_err(|e| e.to_string())
    } else {
        Err("Profile manager not initialized".to_string())
    }
}

#[tauri::command]
async fn add_mapping_to_profile(
    profile_manager: State<'_, ProfileManagerState>,
    mapping: ActionMapping,
) -> Result<(), String> {
    let mut manager_guard = profile_manager.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref mut manager) = *manager_guard {
        if let Some(profile) = manager.get_active_profile_mut() {
            let profile_id = profile.id.clone();
            profile.add_mapping(mapping);
            manager.save_profile(&profile_id).map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("No active profile".to_string())
        }
    } else {
        Err("Profile manager not initialized".to_string())
    }
}

#[tauri::command]
async fn get_active_profile(
    profile_manager: State<'_, ProfileManagerState>,
) -> Result<Option<Profile>, String> {
    let manager_guard = profile_manager.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref manager) = *manager_guard {
        Ok(manager.get_active_profile().cloned())
    } else {
        Err("Profile manager not initialized".to_string())
    }
}

#[tauri::command]
async fn enable_smart_switching(
    profile_manager: State<'_, ProfileManagerState>,
    enabled: bool,
) -> Result<(), String> {
    let mut manager_guard = profile_manager.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref mut manager) = *manager_guard {
        manager.enable_smart_switching(enabled);
        Ok(())
    } else {
        Err("Profile manager not initialized".to_string())
    }
}

#[tauri::command]
async fn is_smart_switching_enabled(
    profile_manager: State<'_, ProfileManagerState>,
) -> Result<bool, String> {
    let manager_guard = profile_manager.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref manager) = *manager_guard {
        Ok(manager.is_smart_switching_enabled())
    } else {
        Err("Profile manager not initialized".to_string())
    }
}

#[tauri::command]
async fn check_and_switch_profile(
    profile_manager: State<'_, ProfileManagerState>,
) -> Result<Option<String>, String> {
    let mut manager_guard = profile_manager.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref mut manager) = *manager_guard {
        manager.check_and_switch_profile().map_err(|e| e.to_string())
    } else {
        Err("Profile manager not initialized".to_string())
    }
}

#[tauri::command]
async fn get_current_active_app(
    profile_manager: State<'_, ProfileManagerState>,
) -> Result<ActiveApp, String> {
    let manager_guard = profile_manager.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref manager) = *manager_guard {
        manager.get_current_active_app().map_err(|e| e.to_string())
    } else {
        Err("Profile manager not initialized".to_string())
    }
}

#[tauri::command]
async fn add_smart_switch_rule(
    profile_manager: State<'_, ProfileManagerState>,
    profile_id: String,
    rule: SmartSwitchRule,
) -> Result<(), String> {
    let mut manager_guard = profile_manager.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref mut manager) = *manager_guard {
        manager.add_smart_switch_rule(&profile_id, rule).map_err(|e| e.to_string())
    } else {
        Err("Profile manager not initialized".to_string())
    }
}

#[tauri::command]
async fn export_profile(
    profile_manager: State<'_, ProfileManagerState>,
    profile_id: String,
    export_path: String,
) -> Result<(), String> {
    let manager_guard = profile_manager.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref manager) = *manager_guard {
        let path = std::path::PathBuf::from(export_path);
        manager.export_profile(&profile_id, &path).map_err(|e| e.to_string())
    } else {
        Err("Profile manager not initialized".to_string())
    }
}

#[tauri::command]
async fn check_profile_security(
    import_path: String,
) -> Result<Vec<String>, String> {
    let path = std::path::PathBuf::from(&import_path);
    let json = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let profile: Profile = serde_json::from_str(&json).map_err(|e| e.to_string())?;

    let mut warnings: Vec<String> = Vec::new();

    for (key, mapping) in &profile.mappings {
        match &mapping.action {
            Action::ScriptExecution { script_type, content } => {
                warnings.push(format!(
                    "Mapping \"{}\" ({}): contains a {:?} script ({} chars)",
                    mapping.name, key, script_type, content.len()
                ));
            }
            Action::MultiStepMacro { steps } => {
                for (i, step) in steps.iter().enumerate() {
                    if let Action::ScriptExecution { script_type, content } = &*step.action {
                        warnings.push(format!(
                            "Mapping \"{}\" ({}) step {}: contains a {:?} script ({} chars)",
                            mapping.name, key, i + 1, script_type, content.len()
                        ));
                    }
                }
            }
            _ => {}
        }
    }

    Ok(warnings)
}

#[tauri::command]
async fn import_profile(
    profile_manager: State<'_, ProfileManagerState>,
    import_path: String,
) -> Result<String, String> {
    let mut manager_guard = profile_manager.lock().map_err(|e| e.to_string())?;

    if let Some(ref mut manager) = *manager_guard {
        let path = std::path::PathBuf::from(import_path);
        manager.import_profile(&path).map_err(|e| e.to_string())
    } else {
        Err("Profile manager not initialized".to_string())
    }
}

#[tauri::command]
async fn delete_mapping(
    profile_manager: State<'_, ProfileManagerState>,
    mapping_id: String,
) -> Result<(), String> {
    let mut manager_guard = profile_manager.lock().map_err(|e| e.to_string())?;

    if let Some(ref mut manager) = *manager_guard {
        manager.delete_mapping(&mapping_id).map_err(|e| e.to_string())
    } else {
        Err("Profile manager not initialized".to_string())
    }
}

#[tauri::command]
async fn delete_profile(
    profile_manager: State<'_, ProfileManagerState>,
    profile_id: String,
) -> Result<(), String> {
    let mut manager_guard = profile_manager.lock().map_err(|e| e.to_string())?;

    if let Some(ref mut manager) = *manager_guard {
        manager.delete_profile(&profile_id).map_err(|e| e.to_string())
    } else {
        Err("Profile manager not initialized".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(MidiHandlerState::new(Mutex::new(None)))
        .manage(ActionEngineState::new(Mutex::new(ActionEngine::new().unwrap())))
        .manage(ProfileManagerState::new(Mutex::new(None)))
        .setup(|app| {
            // Initialize profile manager
            let profile_manager_state: State<ProfileManagerState> = app.state();
            match ProfileManager::new(app.handle()) {
                Ok(manager) => {
                    *profile_manager_state.lock().unwrap() = Some(manager);
                }
                Err(e) => {
                    eprintln!("Failed to initialize profile manager: {}", e);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            initialize_midi,
            get_midi_devices,
            execute_action,
            create_profile,
            get_profiles,
            set_active_profile,
            add_mapping_to_profile,
            get_active_profile,
            enable_smart_switching,
            is_smart_switching_enabled,
            check_and_switch_profile,
            get_current_active_app,
            add_smart_switch_rule,
            export_profile,
            check_profile_security,
            import_profile,
            delete_mapping,
            delete_profile
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
