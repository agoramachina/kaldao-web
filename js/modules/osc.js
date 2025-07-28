// OSC system for hardware control via WebSocket bridge
export class OSCSystem {
    constructor() {
        this.app = null;
        this.osc = null;
        this.connected = false;
        this.wsUrl = 'ws://localhost:8080';
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
            // Import OSC library dynamically
            if (!window.OSC) {
                await this.loadOSCLibrary();
            }
            
            this.osc = new window.OSC();
            
            // Set up event handlers
            this.osc.on('open', () => {
                this.connected = true;
                this.reconnectAttempts = 0;
                this.app.ui.updateStatus('🎛️ OSC connected to hardware', 'success');
            });
            
            this.osc.on('close', () => {
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
            
            this.app.ui.updateStatus('🎛️ OSC system initialized', 'success');
            
        } catch (error) {
            console.error('OSC initialization error:', error);
            this.app.ui.updateStatus(`❌ OSC init failed: ${error.message}`, 'error');
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
            await this.connect();
        }
    }

    async connect(url = this.wsUrl) {
        try {
            this.wsUrl = url;
            this.app.ui.updateStatus(`🎛️ Connecting to OSC bridge at ${url}...`, 'info');
            
            await this.osc.open({
                host: this.extractHost(url),
                port: this.extractPort(url)
            });
            
            this.oscActive = true;
            this.app.ui.updateMenuDisplay();
            
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