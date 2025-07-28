// OSC system for hardware control via WebSocket bridge
export class OSCSystem {
    constructor() {
        this.app = null;
        this.osc = null;
        this.connected = false;
        this.wsUrl = 'ws://localhost:8000'; // TouchOSC Bridge typically uses port 8000
        this.oscActive = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        
        // Parameter mapping for OSC addresses
        this.parameterMappings = new Map([
            // Artistic parameters - match your Arduino potentiometer setup
            ['/pot1', 'fly_speed'],
            ['/pot2', 'rotation_speed'], 
            ['/pot3', 'kaleidoscope_segments'],
            ['/pot4', 'truchet_radius'],
            ['/pot5', 'zoom_level'],
            ['/pot6', 'color_intensity'],
            ['/pot7', 'contrast'],
            ['/pot8', 'center_fill_radius']
        ]);
    }

    init(app) {
        this.app = app;
    }

    async initOSC() {
        try {
            console.log('Initializing OSC system...');
            
            // Import OSC library dynamically
            if (!window.OSC) {
                console.log('Loading OSC library...');
                await this.loadOSCLibrary();
            }
            
            console.log('OSC library available:', !!window.OSC);
            console.log('OSC WebSocketPlugin available:', !!window.OSC.WebSocketPlugin);
            
            // Initialize OSC with WebSocket configuration for TouchOSC Bridge
            const host = this.extractHost(this.wsUrl);
            const port = this.extractPort(this.wsUrl);
            console.log('Creating OSC instance for TouchOSC Bridge:', { host, port });
            
            this.osc = new window.OSC({
                plugin: new window.OSC.WebSocketPlugin({
                    host: host,
                    port: port
                })
            });
            
            console.log('OSC instance created:', !!this.osc);
            
            // Set up event handlers
            this.osc.on('open', () => {
                console.log('OSC connection opened');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.app.ui.updateStatus('🎛️ OSC connected to hardware', 'success');
            });
            
            this.osc.on('close', () => {
                console.log('OSC connection closed');
                this.connected = false;
                this.app.ui.updateStatus('🎛️ OSC disconnected', 'info');
                
                // Auto-reconnect with exponential backoff
                if (this.oscActive && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
                    setTimeout(() => this.connect(), delay);
                }
            });
            
            this.osc.on('error', (error) => {
                console.error('OSC error:', error);
                this.app.ui.updateStatus(`❌ OSC error: ${error.message}`, 'error');
            });
            
            // Handle incoming OSC messages
            this.osc.on('/', (message) => {
                this.handleOSCMessage(message);
            });
            
            console.log('OSC system initialized successfully');
            this.app.ui.updateStatus('🎛️ OSC system initialized', 'success');
            
        } catch (error) {
            console.error('OSC initialization error:', error);
            this.app.ui.updateStatus(`❌ OSC init failed: ${error.message}`, 'error');
            this.osc = null; // Ensure it's null on failure
        }
    }

    async loadOSCLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/osc-js@2.4.0/lib/osc.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load OSC library'));
            document.head.appendChild(script);
        });
    }

    async toggleOSC() {
        if (!this.osc) {
            await this.initOSC();
        }
        
        if (this.oscActive) {
            this.disconnect();
        } else {
            // Show configuration popup before connecting
            this.showConnectionDialog();
        }
    }

    showConnectionDialog() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'oscConnectionOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Courier New', monospace;
        `;

        // Create dialog box
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #4CAF50;
            border-radius: 8px;
            padding: 25px;
            max-width: 500px;
            width: 90%;
            color: #ffffff;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        const currentHost = this.extractHost(this.wsUrl);
        const currentPort = this.extractPort(this.wsUrl);

        dialog.innerHTML = `
            <h3 style="color: #4CAF50; margin-bottom: 15px; font-size: 16px;">🎛️ OSC Connection Setup</h3>
            
            <div style="margin-bottom: 15px; font-size: 12px; line-height: 1.4; color: #cccccc;">
                Configure connection to your OSC bridge (Python script that forwards Arduino data).
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #4CAF50; font-size: 13px;">Host/IP Address:</label>
                <input type="text" id="oscHost" value="${currentHost}" 
                       style="width: 100%; padding: 8px; background: #333; border: 1px solid #555; color: #fff; border-radius: 4px; font-family: 'Courier New', monospace;">
                <div style="font-size: 10px; color: #888; margin-top: 3px;">Usually 'localhost' for local Python bridge</div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; color: #4CAF50; font-size: 13px;">Port:</label>
                <input type="number" id="oscPort" value="${currentPort}" min="1024" max="65535"
                       style="width: 100%; padding: 8px; background: #333; border: 1px solid #555; color: #fff; border-radius: 4px; font-family: 'Courier New', monospace;">
                <div style="font-size: 10px; color: #888; margin-top: 3px;">Default: 8000 (TouchOSC Bridge app port)</div>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="oscCancel" style="padding: 8px 16px; background: #666; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace;">Cancel</button>
                <button id="oscConnect" style="padding: 8px 16px; background: #4CAF50; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace;">Connect</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Handle button clicks
        const cancelButton = document.getElementById('oscCancel');
        const connectButton = document.getElementById('oscConnect');
        
        if (cancelButton) {
            cancelButton.onclick = () => {
                console.log('OSC Cancel button clicked');
                document.body.removeChild(overlay);
            };
        } else {
            console.error('OSC Cancel button not found');
        }

        if (connectButton) {
            connectButton.onclick = async () => {
                console.log('OSC Connect dialog button clicked');
                const host = document.getElementById('oscHost').value.trim();
                const port = parseInt(document.getElementById('oscPort').value);

                if (!host || !port || port < 1024 || port > 65535) {
                    alert('Please enter a valid host and port (1024-65535)');
                    return;
                }

                const url = `ws://${host}:${port}`;
                document.body.removeChild(overlay);
                await this.connect(url);
            };
        } else {
            console.error('OSC Connect button not found');
        }

        // Handle Enter key
        dialog.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                if (connectButton) connectButton.click();
            } else if (e.key === 'Escape') {
                if (cancelButton) cancelButton.click();
            }
        });

        // Focus the host input
        setTimeout(() => document.getElementById('oscHost').focus(), 100);
    }

    async connect(url = this.wsUrl) {
        try {
            console.log('Starting OSC connection to:', url);
            
            // Update URL and reinitialize OSC with new settings
            this.wsUrl = url;
            this.app.ui.updateStatus(`🎛️ Connecting to OSC bridge at ${url}...`, 'info');
            
            // Close existing connection if any
            if (this.osc) {
                console.log('Closing existing OSC connection');
                this.osc.close();
            }
            
            // Reinitialize with new URL
            console.log('Reinitializing OSC with new URL');
            await this.initOSC();
            
            // Check if initialization succeeded
            if (!this.osc) {
                throw new Error('OSC initialization failed - osc object is null');
            }
            
            if (typeof this.osc.open !== 'function') {
                throw new Error('OSC object does not have an open method');
            }
            
            // Open the connection
            console.log('Opening OSC connection');
            await this.osc.open();
            
            this.oscActive = true;
            this.app.ui.updateMenuDisplay();
            console.log('OSC connection successful');
            
        } catch (error) {
            console.error('OSC connection error:', error);
            this.app.ui.updateStatus(`❌ OSC connection failed: ${error.message}`, 'error');
            this.oscActive = false;
        }
    }

    disconnect() {
        try {
            if (this.osc) {
                this.osc.close();
            }
            
            this.oscActive = false;
            this.connected = false;
            this.reconnectAttempts = 0;
            
            // Reset OSC modifiers when disconnecting
            this.app.parameters.resetOSCModifiers();
            
            this.app.ui.updateStatus('🎛️ OSC disconnected', 'info');
            this.app.ui.updateMenuDisplay();
            
        } catch (error) {
            console.error('Error disconnecting OSC:', error);
            this.app.ui.updateStatus('❌ Error disconnecting OSC', 'error');
        }
    }

    handleOSCMessage(message) {
        if (!this.oscActive || !this.connected) return;
        
        try {
            const address = message.address;
            const value = message.args[0];
            
            // Check if this address maps to a parameter
            if (this.parameterMappings.has(address)) {
                const parameterKey = this.parameterMappings.get(address);
                this.updateParameter(parameterKey, value);
            }
            
        } catch (error) {
            console.error('Error handling OSC message:', error);
        }
    }

    handleDirectOSCMessage(data) {
        if (!this.oscActive || !this.connected) return;
        
        try {
            // Handle different TouchOSC message formats
            console.log('Received TouchOSC data:', data);
            
            if (typeof data === 'string') {
                // JSON format: {"address": "/1/fader1", "args": [0.5]}
                const message = JSON.parse(data);
                if (message.address && message.args) {
                    this.processTouchOSCMessage(message.address, message.args[0]);
                }
            } else if (data instanceof ArrayBuffer) {
                // Binary OSC format - parse OSC message
                // For now, log that we received binary data
                console.log('Received binary OSC data, length:', data.byteLength);
                // TODO: Parse binary OSC if needed
            }
            
        } catch (error) {
            console.error('Error handling direct OSC message:', error);
        }
    }

    processTouchOSCMessage(address, value) {
        console.log(`TouchOSC: ${address} = ${value}`);
        
        // Check if this address maps to a parameter
        if (this.parameterMappings.has(address)) {
            const parameterKey = this.parameterMappings.get(address);
            this.updateParameter(parameterKey, value);
        } else {
            // Try to auto-map common TouchOSC addresses
            const autoMapped = this.autoMapTouchOSCAddress(address);
            if (autoMapped) {
                this.updateParameter(autoMapped, value);
            } else {
                console.log(`Unmapped TouchOSC address: ${address}`);
            }
        }
    }

    autoMapTouchOSCAddress(address) {
        // Auto-map common TouchOSC control addresses
        const autoMappings = {
            '/1/fader1': 'fly_speed',
            '/1/fader2': 'rotation_speed',
            '/1/fader3': 'kaleidoscope_segments',
            '/1/fader4': 'truchet_radius',
            '/1/fader5': 'zoom_level',
            '/1/fader6': 'color_intensity',
            '/1/fader7': 'contrast',
            '/1/fader8': 'center_fill_radius',
            '/1/rotary1': 'fly_speed',
            '/1/rotary2': 'rotation_speed',
            '/1/rotary3': 'kaleidoscope_segments',
            '/1/rotary4': 'truchet_radius',
        };
        
        return autoMappings[address] || null;
    }

    updateParameter(parameterKey, oscValue) {
        try {
            const parameter = this.app.parameters.getParameter(parameterKey);
            if (!parameter) return;
            
            // Convert OSC value (0.0-1.0) to parameter range
            const normalizedValue = Math.max(0, Math.min(1, oscValue));
            const scaledValue = parameter.min + (normalizedValue * (parameter.max - parameter.min));
            
            // Apply to parameter system via OSC modifier
            this.app.parameters.setOSCModifier(parameterKey, scaledValue);
            
            // Update UI if parameter is currently selected
            if (this.app.parameters.getCurrentParameterKey() === parameterKey) {
                this.app.ui.updateMenuDisplay();
            }
            
        } catch (error) {
            console.error('Error updating parameter from OSC:', error);
        }
    }

    // Configuration methods
    setParameterMapping(oscAddress, parameterKey) {
        this.parameterMappings.set(oscAddress, parameterKey);
    }

    removeParameterMapping(oscAddress) {
        this.parameterMappings.delete(oscAddress);
    }

    getParameterMappings() {
        return Array.from(this.parameterMappings.entries());
    }

    setWebSocketURL(url) {
        this.wsUrl = url;
    }

    // Utility methods
    extractHost(url) {
        try {
            const wsUrl = new URL(url);
            return wsUrl.hostname;
        } catch {
            return 'localhost';
        }
    }

    extractPort(url) {
        try {
            const wsUrl = new URL(url);
            return parseInt(wsUrl.port) || 8080;
        } catch {
            return 8080;
        }
    }

    isActive() {
        return this.oscActive && this.connected;
    }

    // Status and diagnostics
    getStatus() {
        return {
            active: this.oscActive,
            connected: this.connected,
            url: this.wsUrl,
            reconnectAttempts: this.reconnectAttempts,
            mappings: this.parameterMappings.size
        };
    }
}