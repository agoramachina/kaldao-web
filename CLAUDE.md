# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start local development server (required - no direct file:// access due to CORS)
python -m http.server 8000
# or
npx serve .
# or  
php -S localhost:8000

# Access application
open http://localhost:8000

# No build/compile step required - vanilla JavaScript ES6 modules
```

## Architecture Overview

This is a **dual-personality** fractal visualizer serving both artists (intuitive controls) and mathematicians (deep parameter access). The application switches between two operational modes using context-sensitive key routing.

### Core Application Flow
1. **Main Entry**: `js/main.js` - KaldaoApp class orchestrates all modules
2. **Mode Switching**: `;` toggles debug mode, `ESC` shows appropriate menu  
3. **Parameter Flow**: JavaScript parameters → GPU shader uniforms via automatic mapping
4. **State Management**: Comprehensive undo/redo with 50-step history across both modes

### Key Modules (`js/modules/`)

**ParameterManager** (`parameters.js`)
- Manages 16 artistic parameters + 50+ debug mathematical constants
- Automatic JavaScript-to-shader uniform mapping (`u_${parameterName}`)
- Categories: Movement, Pattern, Camera, Color with validation ranges

**ControlsManager** (`controls.js`) 
- Context-sensitive input routing based on `app.debugMode` state
- Same physical keys control different logical functions per mode
- Handles accelerated parameter adjustment for rapid key presses

**DebugUIManager** (`debug-ui.js`)
- Mathematical exploration interface with inline parameter editing
- Mouse interaction: click to select, double-click to edit values
- Safe parameter randomization with validation

**Renderer** (`renderer.js`)
- WebGL fractal mathematics with real-time uniform updates  
- Shader management: `shaders/vertex.glsl` + `shaders/fragment.glsl`
- 60 FPS target with performance monitoring

**AudioSystem** (`audio.js`)
- Frequency analysis → parameter modulation mapping
- Real-time parameter modification without affecting base values
- Dual input: file upload + live microphone

## Key Operational Patterns

### Dual-Mode System
- **Normal Mode**: `app.debugMode = false` - artistic parameter control
- **Debug Mode**: `app.debugMode = true` - mathematical parameter exploration
- Mode switching handled by `ControlsManager.toggleDebugMode()`

### Parameter-to-Shader Bridge
```javascript
// Automatic uniform mapping pattern used throughout renderer
const uniformName = `u_${parameterKey}`;
if (this.uniforms[uniformName] !== undefined) {
    this.gl.uniform1f(this.uniforms[uniformName], parameters.getValue(parameterKey));
}
```

### State Persistence
- **Undo/Redo**: `app.saveStateForUndo()` before parameter changes
- **File I/O**: JSON export/import of complete application state
- **URL Sharing**: Parameter encoding in URL hash for distribution

### Audio-Reactive Modulation
```javascript
// Pattern: base parameter + audio multiplier (non-destructive)
const audioModifiedValue = baseValue + (audioAnalysis.bass * multiplier);
```

## Mobile Architecture

**MobileControls** (`mobile.js`) provides:
- Touch gesture recognition (swipe, pinch, tap patterns)
- DeviceMotion API integration for tilt-to-control-camera
- Shake detection for parameter randomization
- Responsive UI adaptation

## Parameter System Architecture

### Artistic Parameters (16 total)
Organized by visual function:
- **Movement**: `fly_speed`, `rotation_speed`, `plane_rotation_speed`, `zoom_level`
- **Pattern**: `kaleidoscope_segments`, `truchet_radius`, `center_fill_radius`, `layer_count`
- **Camera**: `camera_tilt_x`, `camera_tilt_y`, `camera_roll`, `path_stability`, `path_scale`
- **Visual**: `contrast`, `color_intensity`, `color_speed`

### Debug Parameters (50+ total)
Mathematical constants exposed from shader:
- **Layer System**: Multi-layer rendering mathematics
- **Camera Path**: Tunnel movement generation functions  
- **Kaleidoscope**: Radial symmetry mathematics
- **Pattern Generation**: Truchet pattern probability
- **Random Seeds**: Hash function multipliers

## WebGL Shader Architecture

**Fragment Shader** (`shaders/fragment.glsl`):
- 50+ uniform parameters for real-time mathematical control
- Kaleidoscope transformation with configurable segment count
- Multi-layer depth rendering with transparency blending
- Truchet pattern generation with probabilistic placement

**Uniform Naming Convention**: 
- JavaScript parameter `fly_speed` → Shader uniform `u_fly_speed`
- Automatic mapping eliminates manual synchronization

## Development Workflow

1. **Edit Code**: Modify JS modules or shaders directly
2. **Refresh Browser**: No build step required  
3. **Test Modes**: Use `;` to toggle debug mode, `ESC` for menus
4. **Parameter Testing**: Use inline editing (click on values) or keyboard controls
5. **Audio Testing**: Upload file or enable microphone, verify reactive parameters
6. **Mobile Testing**: Test on actual devices for gesture/orientation features

## Common Debugging

- **Console Access**: `window.kaldaoDebug` for runtime diagnostics
- **Performance Monitoring**: Built-in FPS tracking and metrics
- **Parameter Validation**: Range checking with user feedback
- **Error Handling**: Graceful degradation with status messages
- **WebGL Debugging**: Check browser console for shader compilation errors