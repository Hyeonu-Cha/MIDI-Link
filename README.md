# MIDI-Link

**MIDI Desktop Automation App** - Transform MIDI controllers into powerful automation tools, similar to Elgato Stream Deck but leveraging MIDI hardware for triggering system actions, launching applications, sending text input, and controlling computer functions.

## 🎯 Project Vision

Create a completely **free**, **offline-first** desktop application that transforms any MIDI controller into a powerful automation tool. No cost barriers, no internet dependency, no setup required - just plug in your MIDI device and start automating your workflow.

## ✨ Key Features

### Core Features (Implemented)
- **🎹 Plug & Play MIDI Support**: Automatic detection and listening for any MIDI device
- **⚡ Real-time Action Engine**: Execute system actions triggered by MIDI input
- **📊 Visual Dashboard**: Clean, modern interface with real-time MIDI monitoring
- **🎛️ Learning Mode**: Click to learn - capture MIDI input for easy mapping
- **💾 Profile System**: Save and switch between different mapping configurations
- **🔧 Multiple Action Types**:
  - Keyboard shortcuts (with modifier support)
  - Application launching
  - URL opening
  - Text input/typing
  - Mouse clicks
  - **🎯 Multi-step macros** with configurable delays
  - **⚙️ Script execution** (PowerShell, Bash, CMD)
  - **🖥️ Advanced system commands** (18+ actions)

### Advanced Features (Implemented)
- **🤖 Smart Profiles**: Auto-switch based on active application
- **📤 Import/Export**: Share profiles with other users
- **🔧 Advanced System Control**: Volume, brightness, window management, screenshots
- **⏱️ Macro Automation**: Chain multiple actions with precise timing
- **🖥️ Cross-Platform Scripts**: Run platform-specific automation scripts
- **🎯 Context Awareness**: Profiles adapt automatically to your workflow

### Future Features (Planned)
- **🎵 Velocity Sensitivity**: Different actions based on how hard you press
- **🎚️ Continuous Controls**: Map faders and knobs to gradual adjustments
- **🔌 Plugin System**: Extensible architecture for custom actions
- **🎮 Hardware Feedback**: Control LEDs and displays on MIDI devices

## 🛠️ Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust (Tauri framework)
- **MIDI Processing**: `midir` crate
- **System Automation**: `enigo` crate
- **Cross-platform**: Windows, macOS, Linux

## 📋 Prerequisites

Before you can build and run MIDI-Link, you need:

1. **Rust** - Install from [rustup.rs](https://rustup.rs/)
2. **Node.js** (v16 or later) - Install from [nodejs.org](https://nodejs.org/)
3. **Platform-specific dependencies**:
   - **Windows**: Microsoft C++ Build Tools or Visual Studio
   - **macOS**: Xcode command line tools
   - **Linux**: `build-essential`, `libgtk-3-dev`, `libwebkit2gtk-4.0-dev`

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/midi-link.git
cd midi-link
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run in Development Mode
```bash
npm run tauri dev
```

### 4. Build for Production
```bash
npm run tauri build
```

## 📖 Usage Guide

### First Time Setup
1. **Connect your MIDI device** - Any MIDI controller (keyboard, pad controller, mixer, etc.)
2. **Launch MIDI-Link** - The app will automatically detect your device
3. **Create a profile** - Click the "+" button to create your first profile
4. **Enable Learn Mode** - Click "Learn Mode" and press any MIDI key/pad
5. **Configure action** - Choose what happens when you press that key
6. **Test it out** - Press the MIDI key and watch your action execute!

### Creating Mappings
1. Click **"Learn Mode"** to activate learning
2. Press any **MIDI key, pad, or turn a knob** on your controller
3. Choose your **action type**:
   - **Keyboard Shortcut**: Send key combinations (Ctrl+C, Alt+Tab, etc.)
   - **Launch Application**: Open any program
   - **Open URL**: Launch websites in your browser
   - **Type Text**: Insert text snippets
   - **Mouse Click**: Click at specific screen coordinates
   - **System Command**: Control volume, media playback, etc.
4. **Save the mapping** and test it!

### Managing Profiles
- **Switch profiles** using the dropdown in the left panel
- **Create new profiles** for different workflows or applications
- **Import/Export** profiles to share with others (coming soon)

## 🎛️ Supported MIDI Controllers

MIDI-Link works with **any MIDI-capable device**, including:
- **MIDI Keyboards** (Yamaha, Roland, Casio, etc.)
- **Pad Controllers** (Akai MPC, Native Instruments Maschine, etc.)
- **DJ Controllers** (Pioneer, Denon, etc.)
- **Control Surfaces** (Behringer, Mackie, etc.)
- **Custom MIDI Devices** (Arduino-based, etc.)

No device-specific setup required - if it sends MIDI, MIDI-Link can use it!

## 🏗️ Development Status

This project has completed **Phase 1: MVP** and **Phase 2: Enhanced Features** from our [Product Requirements Document](./prd.md).

### ✅ Completed (Phase 1: MVP)
- Core infrastructure and project setup
- MIDI input handling with automatic device detection
- Basic action system with keyboard shortcuts, app launch, URL opening
- Profile and mapping system with local storage
- React frontend with dashboard, mapping grid, and action editor
- Real-time MIDI monitor and learning mode

### ✅ Completed (Phase 2: Enhanced Features)
- **Advanced Action System**: Multi-step macros, script execution, 18+ system commands
- **Smart Profile Switching**: Automatic profile switching based on active application
- **Import/Export Functionality**: Share profiles with other users
- **Enhanced UI/UX**: Comprehensive action editors and improved user experience
- **Cross-Platform Integration**: Platform-specific system commands and app detection

### 📅 Planned (Phase 3: Ecosystem)
- Plugin architecture and community extensions
- Advanced MIDI features (velocity, continuous controls)
- Hardware feedback and LED control
- Pre-built integrations (OBS, Discord, Spotify)
- Mini Mode compact overlay

See [Progress.md](./Progress.md) for detailed development tracking.

## 🤝 Contributing

We welcome contributions! This is an open-source project built for the community.

### How to Contribute
1. **Report Issues**: Found a bug? [Open an issue](https://github.com/your-username/midi-link/issues)
2. **Suggest Features**: Have an idea? Start a discussion
3. **Submit Code**: Fork, develop, and submit a pull request
4. **Share Profiles**: Create and share useful profile templates
5. **Write Documentation**: Help improve guides and tutorials

### Development Guidelines
- Follow Rust and TypeScript best practices
- Write clear commit messages
- Test your changes with real MIDI devices
- Update documentation for new features

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 💖 Support the Project

MIDI-Link is completely free and always will be. If you find it useful, consider:

- ⭐ **Starring** the repository
- 🐛 **Reporting bugs** or suggesting features
- 📢 **Sharing** with others who might benefit
- ☕ **[Buy me a coffee](https://buymeacoffee.com/midi-link)** (optional donation)

## 🙏 Acknowledgments

- **MIDI Community**: For inspiring this project
- **Tauri Team**: For the amazing cross-platform framework
- **midir Contributors**: For excellent MIDI handling in Rust
- **All Contributors**: Who help make this project better

## 📞 Contact & Community

- **GitHub Issues**: [Report bugs or request features](https://github.com/your-username/midi-link/issues)
- **Discussions**: [Join the community](https://github.com/your-username/midi-link/discussions)
- **Email**: [midi-link@example.com](mailto:midi-link@example.com)

---

**Made with ❤️ for the MIDI community**

*Transform your MIDI controller into the ultimate productivity tool!*