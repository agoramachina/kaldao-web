# Kaldao Fractal Visualizer

A powerful, interactive fractal visualization application that creates stunning kaleidoscopic patterns with real-time audio reactivity. Built with WebGL for high-performance rendering.

## Features

- **Real-time fractal rendering** with GPU acceleration
- **16 adjustable parameters** affecting movement, visuals, camera, and colors
- **Audio-reactive visuals** supporting file upload and live microphone input
- **7 built-in color palettes** with custom palette support
- **Save/Load system** for parameter configurations
- **Undo/Redo functionality** with 50-step history
- **Keyboard controls** for real-time parameter adjustment
- **Auto-hiding UI** for immersive viewing experience

## Quick Start

1. **Local Development**: Serve the files from a local web server (due to CORS restrictions for shader loading)
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

2. **Open in browser**: Navigate to `http://localhost:8000`

3. **Start exploring**: Use arrow keys to navigate parameters, or press `ESC` for full parameter menu

## File Structure

```
kaldao-fractal/
├── index.html              # Main HTML page
├── css/                    # Stylesheets
│   ├── main.css           # Core styles and layout
│   ├── ui.css             # UI component styles  
│   └── menu.css           # Menu and overlay styles
├── js/                     # JavaScript modules
│   ├── main.js            # Application initialization
│   └── modules/           # Core modules
│       ├── parameters.js  # Parameter management
│       ├── audio.js       # Audio system and reactivity
│       ├── controls.js    # Input handling
│       ├── renderer.js    # WebGL rendering
│       ├── ui.js          # UI management
│       └── fileIO.js      # Save/load functionality
├── shaders/               # GLSL shaders
│   ├── vertex.glsl        # Vertex shader
│   └── fragment.glsl      # Fragment shader
├── assets/                # Assets and presets
│   └── presets/           # Parameter preset files
└── README.md              # This file
```

## Controls

### Navigation
- **↑/↓** - Switch between parameters
- **←/→** - Adjust current parameter value
- **ESC** - Toggle full parameter menu

### Randomization & Reset
- **C** - Randomize colors
- **Shift+C** - Reset to black & white
- **R** - Reset current parameter to default
- **Shift+R** - Reset all parameters (with confirmation)
- **.** (Period) - Randomize all parameters

### Audio
- **A** - Upload audio file / toggle playback
- **M** - Toggle microphone input for live audio reactivity

### File Operations
- **S** - Save current parameters to JSON file
- **L** - Load parameters from JSON file

### Other
- **I** - Invert colors
- **Space** - Pause/resume animation
- **Ctrl+Z** - Undo last change
- **Ctrl+Y** - Redo last undone change

## Parameters

### Movement & Animation
- **Fly Speed** - Camera movement speed through the fractal
- **Rotation Speed** - Speed of pattern rotation
- **Plane Rotation Speed** - Speed of layer rotation
- **Zoom Level** - Fractal zoom/scale factor

### Pattern & Visual
- **Kaleidoscope Segments** - Number of symmetrical segments (4-80)
- **Truchet Radius** - Size of truchet pattern elements
- **Center Fill Radius** - Radius of center fill effect
- **Layer Count** - Number of rendered layers (1-10)
- **Contrast** - Visual contrast intensity
- **Color Intensity** - Overall color brightness

### Camera & Path
- **Camera Tilt X/Y** - Camera angle adjustments
- **Camera Roll** - Camera rotation around view axis
- **Path Stability** - Smoothness of camera path (curved to straight)
- **Path Scale** - Scale of camera movement path

### Color & Effects
- **Color Speed** - Speed of color animation
- **Color Palettes** - 7 built-in palettes (B&W, Rainbow, Fire, Ocean, Purple, Neon, Sunset)
- **Color Inversion** - Invert all colors

## Audio Reactivity

The visualizer can respond to audio in real-time:

### File Upload
1. Press **A** to upload an audio file
2. Supports common formats: MP3, WAV, OGG, M4A, AAC
3. Audio will loop and parameters will react to frequency bands

### Microphone Input
1. Press **M** to activate microphone
2. Grant microphone permissions when prompted
3. Live audio will drive parameter changes

### Audio Mapping
- **Bass frequencies** → Truchet radius, Zoom level
- **Mid frequencies** → Rotation speed  
- **Treble frequencies** → Kaleidoscope segments, Color intensity
- **Overall volume** → Fly speed

## Development

### Adding New Parameters
1. Define parameter in `js/modules/parameters.js`
2. Add uniform to shaders if needed
3. Update UI categories in `js/modules/ui.js`
4. Add controls handling in `js/modules/controls.js`

### Shader Development
- Edit shaders in `shaders/` directory
- Fallback shaders included in `renderer.js` for development
- Use browser developer tools for debugging

### Browser Compatibility
- Requires WebGL support (WebGL 2.0 preferred)
- Modern browsers recommended (Chrome, Firefox, Safari, Edge)
- Audio features require secure context (HTTPS or localhost)

## Troubleshooting

### Shaders Not Loading
- Ensure running from web server (not `file://`)
- Check browser console for CORS errors
- Fallback shaders will load if external files fail

### Audio Issues
- Grant microphone permissions when prompted
- Ensure secure context for audio features
- Check supported audio formats for file upload

### Performance
- Reduce layer count for better performance
- Lower kaleidoscope segments on slower devices
- Close unnecessary browser tabs

## License

This project is open source. See original Kaldao implementation for specific licensing terms.

## Contributing

1. Fork the repository
2. Create feature branch
3. Follow existing code style
4. Test thoroughly
5. Submit pull request

## Credits

Based on the original Kaldao fractal visualizer, refactored into a modular architecture for better maintainability and extensibility.