# OSC Hardware Control System

Transform your Kaldao Fractal Visualizer into a hardware-controlled instrument using Arduino, potentiometers, and Bluetooth!

## 🎛️ System Overview

This system creates a complete hardware-to-software pipeline:

```
Arduino + Potentiometers → Bluetooth → Python Bridge → WebSocket → Browser → Fractal Visualizer
```

## 🔧 Hardware Setup

### Required Components
- Arduino Uno/Nano/Mega (any compatible board)
- HC-05 or HC-06 Bluetooth module
- 8x 10kΩ potentiometers (linear taper recommended)
- Breadboard and jumper wires
- 5V power supply for Arduino

### Wiring Diagram

**Potentiometers:**
```
Pot 1: A0 → fly_speed (tunnel movement)
Pot 2: A1 → rotation_speed (pattern rotation)
Pot 3: A2 → kaleidoscope_segments (radial symmetry)
Pot 4: A3 → truchet_radius (pattern size)
Pot 5: A4 → zoom_level (camera zoom)
Pot 6: A5 → color_intensity (color saturation)
Pot 7: A6 → contrast (visual contrast)
Pot 8: A7 → center_fill_radius (center circle)
```

**Bluetooth Module (HC-05/HC-06):**
```
VCC → 5V (or 3.3V depending on module)
GND → GND
RX  → Pin 3 (Arduino TX)
TX  → Pin 2 (Arduino RX)
```

**Potentiometer Wiring (each pot):**
```
Left pin  → GND
Center pin → Analog input (A0-A7)
Right pin  → 5V
```

## 💻 Software Setup

### 1. Install Python Dependencies

```bash
cd bridge/
pip install -r requirements.txt
```

### 2. Upload Arduino Code

1. Open `arduino_example.ino` in Arduino IDE
2. Select your Arduino board and port
3. Upload the sketch
4. Open Serial Monitor (9600 baud) to verify operation

### 3. Pair Bluetooth Module

**Windows:**
1. Go to Settings → Bluetooth & devices
2. Add device → Bluetooth
3. Find HC-05/HC-06 (default PIN: 1234 or 0000)
4. Note the COM port assigned

**macOS:**
1. System Preferences → Bluetooth
2. Pair with HC-05/HC-06
3. Check /dev/tty.* entries for the device

**Linux:**
1. `bluetoothctl`
2. `scan on`
3. `pair [MAC_ADDRESS]`
4. Check /dev/rfcomm* or use `rfcomm bind`

### 4. Start the OSC Bridge

```bash
# Auto-detect Arduino port
python osc_bridge.py

# Or specify port manually
python osc_bridge.py --port /dev/ttyUSB0
python osc_bridge.py --port COM3

# Custom WebSocket port
python osc_bridge.py --websocket 8081
```

### 5. Connect Visualizer

1. Start the fractal visualizer: `python -m http.server 8000`
2. Open http://localhost:8000
3. Press `O` to connect to OSC bridge
4. Turn potentiometers to control parameters!

## 🎮 Parameter Mappings

| Pot | Parameter | Effect |
|-----|-----------|--------|
| 1 | fly_speed | How fast you move through the tunnel |
| 2 | rotation_speed | Pattern rotation speed |
| 3 | kaleidoscope_segments | Number of radial mirror segments |
| 4 | truchet_radius | Size of pattern elements |
| 5 | zoom_level | Camera zoom in/out |
| 6 | color_intensity | Color saturation |
| 7 | contrast | Visual contrast |
| 8 | center_fill_radius | Size of center circle |

## 🚀 Usage

### Basic Operation
1. Turn potentiometers slowly to see immediate visual changes
2. Multiple parameters can be adjusted simultaneously
3. Hardware control overrides audio and keyboard input
4. Press `O` again to disconnect and return to software control

### Advanced Features
- **Real-time feedback**: Changes appear instantly (20Hz update rate)
- **Smooth control**: Built-in smoothing prevents jittery movement
- **Connection status**: Visual feedback in the app shows connection state
- **Auto-reconnect**: Bridge automatically reconnects if connection drops

### Keyboard Shortcuts (while OSC active)
- `O` - Toggle OSC connection
- `ESC` - Show menu with hardware status
- `;` - Debug mode (see all parameters including hardware)
- `Space` - Pause/resume animation
- `A`/`M` - Audio controls (work alongside hardware)

## 🔧 Troubleshooting

### Arduino Issues
```bash
# Check serial output for debugging
# Should see "🎛️ Kaldao OSC Controller Ready"
```

### Bluetooth Connection Problems
```bash
# Test Bluetooth manually
# Windows: Use Device Manager → Ports
# macOS: ls /dev/tty.*
# Linux: rfcomm scan
```

### Python Bridge Issues
```bash
# Run with verbose logging
python osc_bridge.py --verbose

# Check available ports
python -c "import serial.tools.list_ports; [print(p) for p in serial.tools.list_ports.comports()]"
```

### WebSocket Connection Issues
```bash
# Check if port is available
netstat -an | grep 8080

# Try different WebSocket port
python osc_bridge.py --websocket 8081
# Then connect browser to ws://localhost:8081
```

### Browser Console Errors
```javascript
// Check browser console for OSC connection messages
// Should see "🎛️ OSC connected to hardware"
```

## ⚙️ Customization

### Modify Parameter Mappings

Edit `bridge/osc_bridge.py`:
```python
self.pin_mappings = {
    0: '/pot1',    # A0 → your_parameter
    1: '/pot2',    # A1 → another_parameter
    # ... customize as needed
}
```

Edit `js/modules/osc.js`:
```javascript
this.parameterMappings = new Map([
    ['/pot1', 'your_parameter'],
    ['/pot2', 'another_parameter'],
    // ... match the Python mappings
]);
```

### Add More Potentiometers

1. Update `NUM_POTS` in Arduino code
2. Add pins to `ANALOG_PINS` array
3. Add mappings in Python bridge
4. Add mappings in JavaScript OSC module

### Change Data Format

Arduino supports both formats:
```cpp
// Simple format: "0:512"
String message = String(pin) + ":" + String(value);

// JSON format: {"pin":0,"value":512}
String message = "{\"pin\":" + String(pin) + ",\"value\":" + String(value) + "}";
```

## 🎨 Creative Tips

### Performance Setup
- Mount potentiometers in an ergonomic layout
- Use different pot values for different response curves
- Add LED indicators for visual feedback
- Consider adding buttons for preset switching

### Parameter Combinations
- **Tunnel Flying**: Combine fly_speed + zoom_level
- **Pattern Morphing**: Mix truchet_radius + kaleidoscope_segments  
- **Color Dynamics**: Blend color_intensity + contrast
- **Rhythmic Control**: Use rotation_speed + plane_rotation_speed

### Live Performance
- Practice smooth parameter transitions
- Learn which combinations create interesting effects
- Use hardware for main controls, keyboard for fine-tuning
- Record parameter automation for playback

## 📡 Technical Details

### Data Flow
1. Arduino reads 8 analog inputs (0-1023)
2. Values smoothed over 5 samples to reduce noise
3. Changes >8 counts trigger transmission
4. Data sent via Bluetooth as "pin:value" format
5. Python bridge receives and converts to OSC
6. OSC sent over WebSocket to browser
7. JavaScript maps OSC to parameter values
8. Parameters update GPU shader uniforms
9. Visual changes render at 60fps

### Performance Characteristics
- **Latency**: ~50ms Arduino → Browser
- **Update Rate**: 20Hz (50ms intervals)
- **Precision**: 10-bit (1024 steps per parameter)
- **Smoothing**: 5-sample rolling average
- **Bandwidth**: ~200 bytes/second per active pot

### Protocol Specifications
- **Bluetooth**: 9600 baud, 8N1
- **OSC**: Standard OSC 1.0 format
- **WebSocket**: Binary OSC messages
- **Parameter Range**: 0.0-1.0 normalized floats