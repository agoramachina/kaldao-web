# TouchOSC Integration Guide

## Quick Setup

### 1. Run the TouchOSC Bridge
```bash
cd bridge/
python touchosc_bridge.py --osc-port 47803 --websocket-port 8080
```

### 2. Configure TouchOSC App
1. **Network Settings** in TouchOSC:
   - **Host**: Your computer's IP (bridge will show this)
   - **Port (outgoing)**: `47803`
   - **Protocol**: UDP

2. **Create Controls** (or use existing layout):
   - Map TouchOSC controls to these OSC addresses:

## OSC Address Mapping

| TouchOSC Control | OSC Address | Parameter | Effect |
|------------------|-------------|-----------|--------|
| Fader/Knob 1 | `/pot1` | fly_speed | Tunnel movement speed |
| Fader/Knob 2 | `/pot2` | rotation_speed | Pattern rotation |
| Fader/Knob 3 | `/pot3` | kaleidoscope_segments | Radial symmetry |
| Fader/Knob 4 | `/pot4` | truchet_radius | Pattern size |
| Fader/Knob 5 | `/pot5` | zoom_level | Camera zoom |
| Fader/Knob 6 | `/pot6` | color_intensity | Color saturation |
| Fader/Knob 7 | `/pot7` | contrast | Visual contrast |
| Fader/Knob 8 | `/pot8` | center_fill_radius | Center circle |

## Alternative: Use TouchOSC's Default Addresses

If you want to use TouchOSC's default control addresses, update the mapping in `js/modules/osc.js`:

```javascript
// Current mapping (matches Arduino setup):
this.parameterMappings = new Map([
    ['/pot1', 'fly_speed'],
    ['/pot2', 'rotation_speed'], 
    // ...
]);

// TouchOSC typical addresses:
this.parameterMappings = new Map([
    ['/1/fader1', 'fly_speed'],
    ['/1/fader2', 'rotation_speed'],
    ['/1/rotary1', 'kaleidoscope_segments'],
    ['/1/rotary2', 'truchet_radius'],
    // ... customize to your TouchOSC layout
]);
```

## Testing Steps

1. **Start Bridge**: Run `python touchosc_bridge.py`
2. **Configure TouchOSC**: Set host/port as shown by bridge
3. **Open Fractal App**: Go to http://localhost:8000
4. **Connect OSC**: Press 'O' and connect to `ws://localhost:8080`
5. **Test Controls**: Move TouchOSC faders/knobs → see fractal changes!

## Debugging

**Check Bridge Console:**
- Should show "Received OSC: /pot1 = (0.5,)" when you move controls
- Should show WebSocket client connections

**Check Browser Console:**
- Should show OSC connection success
- Should show parameter updates

**TouchOSC Settings:**
- Ensure "Bundle" is OFF (send individual messages)
- Ensure correct IP address (not 127.0.0.1)
- Test with SuperCollider first to verify OSC is working

## Custom TouchOSC Layout

You can create a custom TouchOSC layout with:
- 8 vertical faders labeled with parameter names
- XY pad for camera control
- Buttons for randomization/reset
- Multi-touch for simultaneous parameter control

The beauty of TouchOSC is you get professional hardware-style control with visual feedback!