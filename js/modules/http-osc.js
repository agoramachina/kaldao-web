// HTTP-based OSC alternative for TouchOSC
// Uses Service Worker to create an HTTP server that TouchOSC can send to

export class HTTPOSCReceiver {
    constructor() {
        this.app = null;
        this.active = false;
        this.port = 8088; // Different from WebSocket port
        
        // Parameter mapping for HTTP endpoints
        this.parameterMappings = new Map([
            ['/pot1', 'fly_speed'],
            ['/pot2', 'rotation_speed'], 
            ['/pot3', 'kaleidoscope_segments'],
            ['/pot4', 'truchet_radius'],
            ['/pot5', 'zoom_level'],
            ['/pot6', 'color_intensity'],
            ['/pot7', 'contrast'],
            ['/pot8', 'center_fill_radius'],
            // TouchOSC default addresses
            ['/1/fader1', 'fly_speed'],
            ['/1/fader2', 'rotation_speed'],
            ['/1/fader3', 'kaleidoscope_segments'],
            ['/1/fader4', 'truchet_radius'],
            ['/1/fader5', 'zoom_level'],
            ['/1/fader6', 'color_intensity'],
            ['/1/fader7', 'contrast'],
            ['/1/fader8', 'center_fill_radius'],
        ]);
    }

    init(app) {
        this.app = app;
        this.setupServiceWorker();
    }

    async setupServiceWorker() {
        // Register service worker to intercept HTTP requests
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/osc-service-worker.js');
                
                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data.type === 'osc-message') {
                        this.handleOSCMessage(event.data.address, event.data.value);
                    }
                });
                
                console.log('HTTP OSC Service Worker registered');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    handleOSCMessage(address, value) {
        if (!this.active) return;

        console.log(`HTTP OSC: ${address} = ${value}`);

        // Check if this address maps to a parameter
        if (this.parameterMappings.has(address)) {
            const parameterKey = this.parameterMappings.get(address);
            
            // Convert to parameter range and apply
            const parameter = this.app.parameters.getParameter(parameterKey);
            if (parameter) {
                // Normalize value (TouchOSC sends 0.0-1.0)
                const normalizedValue = Math.max(0, Math.min(1, parseFloat(value)));
                const scaledValue = parameter.min + (normalizedValue * (parameter.max - parameter.min));
                
                this.app.parameters.setOSCModifier(parameterKey, scaledValue);
                
                // Update UI if needed
                if (this.app.parameters.getCurrentParameterKey() === parameterKey) {
                    this.app.ui.updateMenuDisplay();
                }
            }
        }
    }

    start() {
        this.active = true;
        this.app.ui.updateStatus(`🌐 HTTP OSC listening on port ${this.port}`, 'success');
        
        // Show setup instructions
        const localIP = this.getLocalIP();
        console.log(`TouchOSC HTTP Setup:
1. In TouchOSC, set connection type to 'HTTP'
2. Set Host to: ${localIP}
3. Set Port to: ${this.port}
4. Send HTTP POST requests to: http://${localIP}:${this.port}/osc
5. Format: {"address": "/1/fader1", "value": 0.5}`);
    }

    stop() {
        this.active = false;
        this.app.ui.updateStatus('HTTP OSC stopped', 'info');
    }

    getLocalIP() {
        // This is approximate - actual IP detection requires network access
        return window.location.hostname || 'localhost';
    }

    isActive() {
        return this.active;
    }

    getStatus() {
        return {
            active: this.active,
            port: this.port,
            mappings: this.parameterMappings.size,
            type: 'HTTP'
        };
    }
}