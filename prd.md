# MIDI Desktop Automation App - Product Requirements Document

## 1. Executive Summary

### 1.1 Product Vision
Create a desktop application that transforms MIDI controllers into powerful automation tools, similar to Elgato Stream Deck but leveraging MIDI hardware for triggering system actions, launching applications, sending text input, and controlling computer functions.

### 1.2 Market Opportunity
- **Primary Market**: Content creators, streamers, musicians, productivity enthusiasts
- **Secondary Market**: Office workers, developers, designers who want tactile automation
- **Competitive Advantage**: 
  - **Free and Open**: No cost barrier to entry
  - **Offline First**: Works completely offline without internet dependency
  - **Hardware Agnostic**: Leverage existing MIDI hardware investment vs. purchasing dedicated Stream Deck devices
  - **Plug and Play**: No device setup required - just connect and start using

## 2. Product Overview

### 2.1 Core Concept
A "MIDI Stream Deck" - software that maps MIDI input events (notes, CC messages, program changes) to system automation actions, providing tactile control over computer functions using existing MIDI controllers.

### 2.2 Key Value Propositions
- **Completely Free**: No cost, no subscriptions, no premium tiers
- **Offline First**: Works without internet connection - privacy and reliability focused
- **Zero Setup**: Connect MIDI device and start using immediately
- **Hardware Agnostic**: Works with any MIDI controller (keyboards, pad controllers, mixers, etc.)
- **Highly Customizable**: Deep automation possibilities beyond simple shortcuts
- **Visual Feedback**: On-screen interface shows current mappings and status
- **Community Driven**: Open development with optional support via donations

## 3. Competitive Analysis

### 3.1 Direct Competitors

| Product | Platform | Price | Strengths | Weaknesses |
|---------|----------|-------|-----------|------------|
| **Elgato Stream Deck** | Windows/Mac | $149-$599 | Hardware integration, LCD keys, extensive plugins | Requires specific hardware, limited to button grid, expensive |
| **CoyoteMIDI** | Windows/Mac | Free/Pro $19 | MIDI to hotkeys, retroactive recording | Limited visual interface, pro features cost money |
| **MIDI Keyboard Macros** | Windows | $39 | Advanced scripting, application control | Windows only, complex setup, paid software |
| **MidiKey2Key** | Windows | Free | Simple setup, OBS integration | Limited features, Windows only, basic UI |
| **MIDI Mixer** | Windows | Free | Audio control focus, plugin system | Audio-centric, limited general automation |
| **Our App** | Cross-platform | **Free** | **Offline, zero setup, cross-platform, community driven** | **N/A - addressing all major pain points** |

### 3.2 Stream Deck Feature Comparison

**Core Stream Deck Features to Match/Exceed:**
- ✅ **Multi-Action Support**: Chain multiple actions per button
- ✅ **Profile System**: Different layouts per application/context
- ✅ **Folder Navigation**: Hierarchical button organization
- ✅ **Visual Feedback**: Icons and status indicators
- ✅ **Plugin Architecture**: Extensible functionality
- ✅ **Smart Profiles**: Auto-switch based on active application
- ✅ **Web Integration**: HTTP requests and webhooks
- ✅ **Timer Functions**: Countdown timers and delays

**Additional MIDI Advantages:**
- ✅ **Velocity Sensitivity**: Different actions based on how hard you press
- ✅ **Continuous Controls**: Faders and knobs for gradual adjustments
- ✅ **Hardware Diversity**: Works with various MIDI device types
- ✅ **Cost Efficiency**: No need to purchase dedicated hardware

## 4. Technical Requirements

### 4.1 Platform and Technology Stack

**Primary Platform**: Cross-platform desktop application
- **Framework**: Tauri + React (for a high-performance, secure, and lean application)

**Language Recommendation**: **TypeScript/JavaScript with React (Frontend), Rust (Backend Core)**

**Rationale for Tauri:**
- ✅ **High Performance & Low Memory**: Uses the OS's native webview and a Rust backend, resulting in a significantly smaller memory footprint and faster startup times compared to Electron
- ✅ **Tiny Bundle Size**: Produces very small application packages, making downloads faster and reducing disk space usage
- ✅ **Security-First**: The Rust backend and an explicit API bridge provide a more secure architecture by default, preventing the UI from having uncontrolled access to system APIs
- ✅ Single codebase for Windows, Mac, Linux using standard web technologies for the UI
- ✅ Rich UI capabilities with React
- ✅ **Offline-first architecture** - no internet dependency
- ✅ **Self-contained application** - no external services required
- ❌ Younger ecosystem: The ecosystem for native plugins is newer and smaller than Electron's, which may require more custom Rust development for certain integrations

### 4.2 Core Architecture

The core architecture remains layered, but the technology and communication between layers are different. The System Interface Layer is now a secure Rust backend.

```
┌─────────────────────────────────────────────────────────────┐
│           User Interface Layer (React in WebView)            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │  Main Dashboard │ │ Mapping Editor  │ │ Profile Manager ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                         ▲ │ (Secure API Bridge)
┌─────────────────────────────────────────────────────────────┐
│                 Application Logic Layer (Rust)               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ Action Engine   │ │ Profile System  │ │ Plugin Manager  ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                         ▲ │ (Rust Crates)
┌─────────────────────────────────────────────────────────────┐
│                System Interface Layer (Rust)                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │  MIDI Handler   │ │ OS Integration  │ │ Web Services    ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Key Libraries and Dependencies

**MIDI Processing (Rust backend):**
- `midir` - A cross-platform, real-time MIDI I/O library in Rust
- Custom MIDI message parsing and routing logic in Rust

**System Integration (Rust backend):**
- `enigo` or `rdev` for cross-platform keyboard/mouse simulation
- `tauri` internal API for system notifications, file dialogs, and other OS integrations
- Platform-specific APIs for advanced features

**Optional Web Integration (Rust backend):**
- `reqwest` - A powerful and ergonomic HTTP client for making requests (when user explicitly enables web features)
- **Note**: Web features are optional, disabled by default, and executed securely from the Rust backend, not the WebView

**UI Framework (Frontend):**
- `react` + `@tauri-apps/api` - Core React framework with Tauri's frontend API for communicating with the Rust backend
- `styled-components` or similar for styling
- `react-dnd` for drag-and-drop interface

## 5. Feature Specification

### 5.1 Core Features (MVP)

#### 5.1.1 MIDI Input Handling
- **Plug and Play**: Automatically listens for MIDI input on app startup
- **No Device Setup**: App waits for any MIDI input without requiring device configuration
- **Multi-Device Support**: Automatically handles multiple MIDI controllers simultaneously
- **Message Types**: Support for Note On/Off, Control Change, Program Change
- **Learning Mode**: Click to learn - capture MIDI input for easy mapping
- **Real-time Monitoring**: Live MIDI input display for debugging
- **Auto-Detection**: When MIDI input is received, automatically detect and display device info

#### 5.1.2 Action System
**Basic Actions:**
- Keyboard shortcuts (single key, combinations, sequences)
- Mouse actions (click, drag, scroll)
- Text input/typing
- Application launch
- File/folder opening
- URL opening in browser
- System commands (volume, brightness, etc.)

**Advanced Actions:**
- Multi-step macros with delays
- Conditional actions based on system state
- Script execution (shell commands, custom scripts)
- Clipboard operations

**Optional Web Actions** (disabled by default):
- HTTP requests (GET/POST with custom headers) - user must explicitly enable
- Webhook triggers - opt-in feature with security warnings

#### 5.1.3 Visual Interface
- **Device Overview**: Show active MIDI inputs when they send data
- **Mapping Grid**: Visual representation of current mappings
- **Action Editor**: Drag-and-drop interface for creating actions
- **Live Status**: Real-time feedback on triggered actions
- **Mini Mode**: Compact overlay for minimal screen usage
- **Settings Panel**: Includes small "☕ Buy me a coffee" button for optional donations

#### 5.1.4 Profile System
- **Profile Creation**: Save different mapping configurations locally
- **Quick Switch**: Hotkeys or GUI controls to change profiles
- **Auto-Switch**: Change profiles based on active application
- **Import/Export**: Share profiles with other users via file export
- **Profile Templates**: Pre-built profiles for common use cases
- **Local Storage**: All data stored locally, no cloud dependency

### 5.2 Advanced Features (Post-MVP)

#### 5.2.1 Smart Features
- **Velocity Sensitivity**: Different actions based on note velocity
- **Long Press**: Different actions for press vs. hold
- **Combination Triggers**: Actions requiring multiple simultaneous inputs
- **Contextual Actions**: Actions that change based on system state
- **Sequence Recognition**: Detect patterns of MIDI input

#### 5.2.2 Integration Features
- **OBS Studio**: Scene switching, source control, recording controls (local API)
- **Discord**: Mute/unmute, push-to-talk, status changes (local API)
- **Spotify/Music**: Play/pause, track navigation, playlist control (local API)
- **Zoom/Teams**: Mute, camera toggle, screen sharing (local shortcuts)
- **Optional Web Integrations**: Smart Home, IFTTT (user must explicitly enable)
- **Time Tracking**: Local shortcuts for Toggl, Harvest (via keyboard shortcuts)

#### 5.2.3 Plugin Architecture
- **Plugin SDK**: JavaScript/TypeScript API for custom actions
- **Local Plugins**: File-based plugin system, no internet required
- **Community Plugins**: Shareable plugin files (not marketplace)
- **Custom Scripts**: Support for Python, PowerShell, or other scripts
- **No External Dependencies**: Plugins work offline

#### 5.2.4 Advanced UI Features
- **Custom Icons**: Upload and assign custom icons to actions
- **Color Coding**: Visual organization with colors and themes
- **Gestures**: Touch screen support for tablet use
- **Multiple Windows**: Detachable windows for multi-monitor setups
- **Dark/Light Themes**: Customizable appearance

### 5.3 MIDI-Specific Advantages

#### 5.3.1 Continuous Controls
- **Faders/Knobs**: Map to volume controls, parameter adjustments
- **Relative Mode**: Incremental changes rather than absolute values
- **Curve Mapping**: Custom response curves for natural feel
- **Deadband**: Ignore small movements to prevent jitter

#### 5.3.2 Velocity and Pressure
- **Velocity Zones**: Different actions for soft/medium/hard presses
- **Aftertouch**: Continuous pressure for real-time control
- **Polyphonic Aftertouch**: Per-key pressure sensitivity

#### 5.3.3 Hardware Feedback
- **LED Control**: Light up pads/keys to show status
- **Display Updates**: Send text to controllers with displays
- **Motor Faders**: Motorized fader synchronization (high-end controllers)

## 6. User Experience Design

### 6.1 Target User Personas

**Primary Persona: Content Creator "Alex"**
- Uses OBS for streaming
- Has a MIDI controller from music production
- Wants tactile control over scenes, sources, and effects
- Values customization and efficiency

**Secondary Persona: Productivity Expert "Morgan"**
- Remote worker with complex workflows
- Wants to automate repetitive tasks
- Uses multiple applications throughout the day
- Values reliability and quick setup

**Tertiary Persona: Musician "Taylor"**
- Primarily uses MIDI for music but wants expanded functionality
- Interested in controlling DAW and system functions
- Values integration with existing music workflow
- Needs quick access to recording and playback controls

### 6.2 User Journey

#### 6.2.1 First-Time Setup
1. **Welcome Screen**: Introduction and quick tour
2. **Plug and Play**: "Connect your MIDI device and start pressing keys/pads"
3. **Template Selection**: Choose from pre-built profiles
4. **First Mapping**: Guided creation of first action mapping (using detected MIDI input)
5. **Test and Confirm**: Verify setup works correctly

#### 6.2.2 Daily Usage
1. **Launch App**: Quick startup with last used profile
2. **Profile Switch**: Easy switching between contexts
3. **Action Execution**: Reliable, fast response to MIDI input
4. **Visual Feedback**: Clear indication of triggered actions
5. **Adjustments**: Quick tweaking of mappings as needed

### 6.3 UI/UX Principles
- **Discoverability**: Features should be easy to find and understand
- **Feedback**: Always provide visual/audio confirmation of actions
- **Forgiveness**: Easy undo/redo for configuration changes
- **Efficiency**: Minimize clicks and complexity for common tasks
- **Consistency**: Similar actions should work similarly across the app

## 7. Implementation Roadmap

### 7.1 Phase 1: MVP
**Core Infrastructure:**
- MIDI device detection and input handling
- Basic action system (keyboard shortcuts, app launch)
- Simple mapping interface
- Profile save/load functionality
- Basic visual feedback

**Deliverables:**
- Working prototype with essential features
- Support for 2-3 popular MIDI controllers
- Documentation and basic user guide

### 7.2 Phase 2: Enhanced Features
**Advanced Actions:**
- Multi-step macros and delays
- HTTP requests and web integration
- System integration (volume, notifications)
- Smart profile switching
- Improved UI with visual polish

**Deliverables:**
- Feature-complete application
- Expanded controller support
- Performance optimizations

### 7.3 Phase 3: Ecosystem
**Plugin System:**
- Plugin architecture and SDK
- Community plugin marketplace
- Integration with popular applications
- Advanced MIDI features (velocity, aftertouch)
- Mobile companion app (optional)

**Deliverables:**
- Extensible platform
- Third-party integrations
- Community tools and resources

### 7.4 Phase 4: Polish and Scale (Ongoing)
**Optimization:**
- Performance improvements
- Bug fixes and stability
- User feedback integration
- Additional platform support (mobile, web)
- Enterprise features

## 8. Technical Considerations

### 8.1 Performance Requirements
- **Latency**: < 20ms from MIDI input to action execution
- **Memory Usage**: < 50MB RAM for typical usage (significantly improved with Tauri)
- **CPU Usage**: < 5% during idle, < 15% during heavy use
- **Startup Time**: < 1.5 seconds to fully functional state (faster than Electron)

### 8.2 Reliability Requirements
- **Uptime**: 99.9% stability during normal operation
- **Error Handling**: Graceful degradation when devices disconnect
- **Data Safety**: Automatic backup of user configurations
- **Recovery**: Ability to restore from crashes without data loss

### 8.3 Security Considerations
- **System Access**: Tauri's API provides explicit, permission-based access to system resources, enhancing security. All required permissions must be clearly defined
- **Network Security**: All HTTP requests and webhooks are handled by the secure Rust backend, isolating the webview from direct network access
- **User Data**: All data stored locally with optional manual backup
- **Plugin Security**: Plugin execution will be managed within the Rust backend, providing a more controlled environment
- **Privacy First**: No telemetry, analytics, or data collection

### 8.4 Platform-Specific Features

**Windows:**
- Integration via Rust crates utilizing the Win32 API
- Windows API integration for system control
- MSI packaging for easy installation

**macOS:**
- Integration via Rust crates utilizing Core MIDI and other native frameworks
- macOS automation via system APIs
- DMG packaging with notarization for security compliance

**Linux:**
- ALSA/JACK MIDI support via the `midir` crate
- DBus integration for desktop environment control
- AppImage packaging for easy distribution

## 9. Monetization Strategy

### 9.1 Funding Model
**Free and Open Source:**
- **Completely Free**: No cost, no subscriptions, no premium features
- **Optional Donations**: Small "☕ Buy me a coffee" button in settings
- **Community Driven**: Development supported by user donations and contributions
- **No Ads**: Clean, ad-free experience

### 9.2 Sustainability
1. **Donation-Based**: Optional support from users who find value in the app
2. **Community Contributions**: Open-source development with community involvement
3. **Consulting Services**: Optional paid support for enterprise/custom implementations
4. **Hardware Partnerships**: Potential affiliate links (non-intrusive, optional)

### 9.3 Go-to-Market Strategy
1. **Open Source Release**: Free download from GitHub and website
2. **Content Creator Outreach**: Partner with streamers and YouTubers
3. **Music Production Forums**: Engage with existing MIDI user communities
4. **Developer Community**: Open development encourages community contributions

## 10. Success Metrics

### 10.1 Product Metrics
- **User Adoption**: 10K+ downloads in first 6 months
- **Engagement**: Average 2+ hours daily usage
- **Retention**: 70%+ monthly active users
- **Community Health**: Active GitHub issues/discussions

### 10.2 Technical Metrics
- **Performance**: Sub-20ms latency maintained
- **Reliability**: < 0.1% crash rate
- **Support**: Community-driven support via forums/GitHub
- **Compatibility**: Support for any MIDI-capable device

### 10.3 Community Metrics
- **Contributions**: Active community contributions to codebase
- **Donations**: Sustainable donation levels for ongoing development
- **Ecosystem**: 20+ community-created plugins/profiles
- **Documentation**: Comprehensive user and developer guides

## 11. Conclusion

This MIDI Desktop Automation App represents a unique opportunity to create a completely free, offline-first automation tool that leverages existing MIDI hardware. By removing cost barriers and internet dependencies, we can reach a much broader audience while maintaining user privacy and reliability.

The key to success will be focusing on simplicity (plug-and-play MIDI input), reliable performance, and building a strong open-source community. The technical approach using Tauri ensures high performance, low resource usage, and excellent cross-platform compatibility, providing a superior user experience while maintaining strong security. The donation-based model keeps the software free for everyone while allowing for sustainable development.

**Unique Value Proposition:**
- **Zero barriers**: Free, offline, no setup required
- **High Performance**: Tauri's Rust backend provides excellent performance with minimal resource usage
- **Security-First**: Explicit permission model and secure API bridge
- **Privacy focused**: No data collection or internet dependency  
- **Community driven**: Open development with optional support
- **Universal compatibility**: Works with any MIDI device without configuration

**Next Steps:**
1. Validate assumptions with potential users
2. Create technical proof-of-concept with Tauri, Rust, and React
3. Design minimal UI mockups focusing on simplicity
4. Begin development of core MIDI handling in Rust using `midir`
5. Establish GitHub repository and community channels