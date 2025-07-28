// Audio system and reactivity module with modifier-based system
export class AudioSystem {
    constructor() {
        this.app = null;
        this.audioContext = null;
        this.audioSource = null;
        this.analyser = null;
        this.audioData = null;
        this.audioElement = null;
        this.audioReactive = false;
        this.audioPlaying = false;
        
        // Microphone system
        this.microphoneStream = null;
        this.microphoneSource = null;
        this.microphoneActive = false;
        this.selectedMicrophoneId = null;
        this.availableDevices = [];
    }

    init(app) {
        this.app = app;
    }

    async initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume context if suspended (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            this.audioData = new Uint8Array(this.analyser.frequencyBinCount);
            
            this.app.ui.updateStatus('🎵 Audio system initialized', 'success');
        } catch (error) {
            this.app.ui.updateStatus(`❌ Audio init failed: ${error.message}`, 'error');
        }
    }

    async toggleAudio() {
        if (!this.audioContext) {
            await this.initAudioContext();
        }
        
        if (!this.audioElement) {
            // Prompt user to upload audio file
            this.uploadAudioFile();
        } else {
            // Toggle audio playback and reactivity
            if (this.audioPlaying) {
                this.audioElement.pause();
                this.audioPlaying = false;
                this.audioReactive = false;
                this.app.parameters.resetAudioModifiers();
                this.app.ui.updateStatus('🎵 Audio paused', 'info');
            } else {
                try {
                    // Resume audio context if needed
                    if (this.audioContext.state === 'suspended') {
                        await this.audioContext.resume();
                    }
                    
                    await this.audioElement.play();
                    this.audioPlaying = true;
                    this.audioReactive = true;
                    this.app.ui.updateStatus('🎵 Audio playing with reactivity!', 'success');
                } catch (error) {
                    this.app.ui.updateStatus(`❌ Audio playback failed: ${error.message}`, 'error');
                }
            }
            this.app.ui.updateMenuDisplay();
        }
    }

    uploadAudioFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*,.wav,.mp3,.ogg,.m4a,.aac';
        
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            this.app.ui.updateStatus(`🎵 Loading audio: ${file.name}...`, 'info');
            
            try {
                // Clean up previous audio
                if (this.audioElement) {
                    this.audioElement.pause();
                    this.audioElement.src = '';
                    this.audioElement = null;
                }
                
                if (this.audioSource) {
                    this.audioSource.disconnect();
                    this.audioSource = null;
                }
                
                // Create new audio element
                this.audioElement = new Audio();
                this.audioElement.preload = 'auto';
                this.audioElement.loop = true;
                
                // Create object URL
                const audioURL = URL.createObjectURL(file);
                this.audioElement.src = audioURL;
                
                // Wait for audio to load
                await new Promise((resolve, reject) => {
                    this.audioElement.oncanplaythrough = resolve;
                    this.audioElement.onerror = () => reject(new Error('Failed to decode audio file'));
                    this.audioElement.onabort = () => reject(new Error('Audio loading aborted'));
                    
                    // Timeout after 10 seconds
                    setTimeout(() => reject(new Error('Audio loading timeout')), 10000);
                });
                
                // Resume audio context if needed
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                
                // Connect audio to analyser
                this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
                this.audioSource.connect(this.analyser);
                this.audioSource.connect(this.audioContext.destination);
                
                this.app.ui.updateStatus(`🎵 Audio loaded: ${file.name}`, 'success');
                this.app.ui.updateMenuDisplay();
                
                // Auto-start playback with reactivity
                try {
                    await this.audioElement.play();
                    this.audioPlaying = true;
                    this.audioReactive = true;
                    this.app.ui.updateStatus(`🎵 Playing: ${file.name} (Reactive mode)`, 'success');
                } catch (playError) {
                    this.app.ui.updateStatus(`⚠️ Audio loaded but autoplay blocked. Press A to play.`, 'info');
                }
                
            } catch (error) {
                console.error('Audio loading error:', error);
                this.app.ui.updateStatus(`❌ Failed to load audio: ${error.message}`, 'error');
                
                // Clean up on error
                if (this.audioElement) {
                    this.audioElement.src = '';
                    this.audioElement = null;
                }
                if (this.audioSource) {
                    this.audioSource.disconnect();
                    this.audioSource = null;
                }
            }
        };
        
        input.click();
    }

    async toggleMicrophone() {
        if (!this.audioContext) {
            await this.initAudioContext();
        }
        
        if (this.microphoneActive) {
            this.stopMicrophone();
        } else {
            // Show microphone selection popup
            await this.showMicrophoneSelectionPopup();
        }
    }

    async showMicrophoneSelectionPopup() {
        // Get available devices first
        const devices = await this.getAvailableDevices();
        
        if (devices.length === 0) {
            this.app.ui.updateStatus('No microphones found', 'error');
            return;
        }

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'microphoneSelectionOverlay';
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
            border: 2px solid #9C27B0;
            border-radius: 8px;
            padding: 25px;
            max-width: 500px;
            width: 90%;
            color: #ffffff;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        dialog.innerHTML = `
            <h3 style="color: #9C27B0; margin-bottom: 15px; font-size: 16px;">🎤 Select Microphone</h3>
            
            <div style="margin-bottom: 15px; font-size: 12px; line-height: 1.4; color: #cccccc;">
                Choose which microphone to use for audio reactivity.
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #9C27B0; font-size: 13px;">Available Microphones:</label>
                <select id="micPopupSelect" style="width: 100%; padding: 8px; background: #333; border: 1px solid #555; color: #fff; border-radius: 4px; font-family: 'Courier New', monospace;">
                    <option value="">Select microphone...</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="micPopupCancel" style="padding: 8px 16px; background: #666; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace;">Cancel</button>
                <button id="micPopupConnect" style="padding: 8px 16px; background: #9C27B0; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace;">Connect</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Populate device list
        const select = document.getElementById('micPopupSelect');
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Microphone ${device.deviceId.substring(0, 8)}`;
            select.appendChild(option);
        });

        // Set default selection if we have a previously selected device
        if (this.selectedMicrophoneId) {
            select.value = this.selectedMicrophoneId;
        }

        // Handle button clicks
        const cancelButton = document.getElementById('micPopupCancel');
        const connectButton = document.getElementById('micPopupConnect');
        
        if (cancelButton) {
            cancelButton.onclick = () => {
                document.body.removeChild(overlay);
            };
        }

        if (connectButton) {
            connectButton.onclick = async () => {
                const selectedDeviceId = select.value;
                if (!selectedDeviceId) {
                    alert('Please select a microphone');
                    return;
                }

                document.body.removeChild(overlay);
                
                // Set selected device and start
                this.selectedMicrophoneId = selectedDeviceId;
                await this.startMicrophone(selectedDeviceId);
            };
        }

        // Handle Enter/Escape keys
        dialog.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                if (connectButton) connectButton.click();
            } else if (e.key === 'Escape') {
                if (cancelButton) cancelButton.click();
            }
        });

        // Focus the select
        setTimeout(() => select.focus(), 100);
    }

    async getAvailableDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableDevices = devices.filter(device => device.kind === 'audioinput');
            return this.availableDevices;
        } catch (error) {
            console.error('Could not enumerate devices:', error);
            return [];
        }
    }

    async startMicrophone(deviceId = null) {
        try {
            this.app.ui.updateStatus('🎤 Requesting microphone access...', 'info');
            
            // Use specified device or the selected one
            const targetDeviceId = deviceId || this.selectedMicrophoneId;
            
            // Create audio constraints
            const audioConstraints = {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            };
            
            // Add device ID if specified
            if (targetDeviceId) {
                audioConstraints.deviceId = { exact: targetDeviceId };
                console.log('🎤 Requesting specific device:', targetDeviceId);
            } else {
                console.log('🎤 Requesting default microphone');
            }
            
            // Request microphone access
            this.microphoneStream = await navigator.mediaDevices.getUserMedia({ 
                audio: audioConstraints
            });
            
            // Log details about the audio stream we got
            console.log('🎤 Audio stream details:');
            const audioTracks = this.microphoneStream.getAudioTracks();
            if (audioTracks.length > 0) {
                const track = audioTracks[0];
                console.log('  - Track label:', track.label || 'Unknown device');
                console.log('  - Track enabled:', track.enabled);
                console.log('  - Track ready state:', track.readyState);
                console.log('  - Track settings:', track.getSettings());
                console.log('  - Track constraints:', track.getConstraints());
            }
            
            // Resume audio context if needed
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Stop any playing audio file
            if (this.audioElement && this.audioPlaying) {
                this.audioElement.pause();
                this.audioPlaying = false;
            }
            
            // Connect microphone to analyzer
            this.microphoneSource = this.audioContext.createMediaStreamSource(this.microphoneStream);
            this.microphoneSource.connect(this.analyser);
            
            this.microphoneActive = true;
            this.audioReactive = true;
            
            // Debug: Log audio context and analyser settings (controlled by debug settings)
            if (this.app && this.app.debugUI && this.app.debugUI.shouldLog('microphoneSetup')) {
                console.log('🎤 Microphone setup complete:');
                console.log('  - Audio context state:', this.audioContext.state);
                console.log('  - Audio context sample rate:', this.audioContext.sampleRate);
                console.log('  - Analyser FFT size:', this.analyser.fftSize);
                console.log('  - Analyser frequency bin count:', this.analyser.frequencyBinCount);
                console.log('  - Analyser smoothing:', this.analyser.smoothingTimeConstant);
                console.log('  - Audio data array length:', this.audioData.length);
                
                // Test immediate data capture
                setTimeout(() => {
                    this.analyser.getByteFrequencyData(this.audioData);
                    const maxValue = Math.max(...this.audioData);
                    const avgValue = this.audioData.reduce((a, b) => a + b, 0) / this.audioData.length;
                    console.log(`🎤 Initial audio check: Max=${maxValue}, Avg=${avgValue.toFixed(2)}`);
                    if (maxValue === 0) {
                        console.log('⚠️ No audio signal detected - try speaking/making noise');
                    }
                }, 1000);
            }
            
            this.app.ui.updateStatus('🎤 Microphone active with reactivity!', 'success');
            this.app.ui.updateMenuDisplay();
            
        } catch (error) {
            console.error('Microphone access error:', error);
            let errorMessage = 'Failed to access microphone';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No microphone found. Please connect a microphone and try again.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Microphone is busy or not available.';
            }
            
            this.app.ui.updateStatus(`❌ ${errorMessage}`, 'error');
            this.microphoneActive = false;
        }
    }

    stopMicrophone() {
        try {
            // Stop microphone stream
            if (this.microphoneStream) {
                this.microphoneStream.getTracks().forEach(track => track.stop());
                this.microphoneStream = null;
            }
            
            // Disconnect microphone source
            if (this.microphoneSource) {
                this.microphoneSource.disconnect();
                this.microphoneSource = null;
            }
            
            this.microphoneActive = false;
            this.audioReactive = false;
            this.app.parameters.resetAudioModifiers();
            
            this.app.ui.updateStatus('🎤 Microphone stopped', 'info');
            this.app.ui.updateMenuDisplay();
            
        } catch (error) {
            console.error('Error stopping microphone:', error);
            this.app.ui.updateStatus('❌ Error stopping microphone', 'error');
        }
    }

    analyzeAudio() {
        if (!this.analyser || !this.audioData || !this.audioReactive || (!this.audioPlaying && !this.microphoneActive)) {
            return { bass: 0, mid: 0, treble: 0, overall: 0 };
        }
        
        this.analyser.getByteFrequencyData(this.audioData);
        
        // Frequency ranges (approximate for 44.1kHz sample rate)
        const bassRange = { start: 0, end: 32 };      // ~20-250Hz
        const midRange = { start: 32, end: 128 };     // ~250-2000Hz  
        const trebleRange = { start: 128, end: 256 }; // ~2000-8000Hz
        
        function getAverageVolume(range) {
            let sum = 0;
            for (let i = range.start; i < range.end && i < this.audioData.length; i++) {
                sum += this.audioData[i];
            }
            return sum / (range.end - range.start) / 255.0;
        }
        
        const bass = getAverageVolume.call(this, bassRange);
        const mid = getAverageVolume.call(this, midRange);
        const treble = getAverageVolume.call(this, trebleRange);
        const overall = (bass + mid + treble) / 3.0;
        
        // Debug logging when microphone is active (controlled by debug settings)
        if (this.microphoneActive && this.app && this.app.debugUI) {
            // Log every second instead of every 2 seconds for better feedback
            if (Math.floor(Date.now() / 1000) % 1 === 0) {
                const maxValue = Math.max(...this.audioData);
                const avgValue = this.audioData.reduce((a, b) => a + b, 0) / this.audioData.length;
                
                if (this.app.debugUI.shouldLog('audioLevels')) {
                    console.log(`🎤 LIVE: Bass=${bass.toFixed(3)}, Mid=${mid.toFixed(3)}, Treble=${treble.toFixed(3)}, Overall=${overall.toFixed(3)}`);
                }
                
                if (this.app.debugUI.shouldLog('audioRawData')) {
                    console.log(`🎤 RAW: Max=${maxValue}/255 (${(maxValue/255*100).toFixed(1)}%), Avg=${avgValue.toFixed(1)}`);
                }
                
                // Show which parameters would be affected
                if (this.app.debugUI.shouldLog('audioEffects')) {
                    if (overall > 0.01) {
                        console.log(`🎨 Would affect: center_fill_radius×${(1.0 + bass * 0.8 * 1.5).toFixed(2)}, rotation_speed×${(1.0 + mid * 0.4).toFixed(2)}`);
                    } else if (maxValue > 0) {
                        console.log('⚠️ Audio detected but levels very low - try louder input');
                    } else {
                        console.log('❌ No audio signal - check microphone settings/volume');
                    }
                }
            }
        }
        
        return { bass, mid, treble, overall };
    }

    // Get current volume level for UI display (0-1 range)
    getCurrentVolumeLevel() {
        if (!this.microphoneActive || !this.analyser || !this.audioData) {
            return 0;
        }
        
        // Get fresh audio data
        this.analyser.getByteFrequencyData(this.audioData);
        
        // Calculate overall volume level
        const maxValue = Math.max(...this.audioData);
        const avgValue = this.audioData.reduce((a, b) => a + b, 0) / this.audioData.length;
        
        // Use a combination of max and average for more responsive display
        const volumeLevel = (maxValue * 0.7 + avgValue * 0.3) / 255.0;
        
        return Math.min(1.0, volumeLevel);
    }

    applyReactivity(parameters) {
        if (!this.audioReactive || (!this.audioPlaying && !this.microphoneActive)) {
            // Reset all modifiers when not reactive
            parameters.resetAudioModifiers();
            return;
        }
        
        const audioLevels = this.analyzeAudio();
        
        // Create dynamic multipliers based on audio - matching old implementation exactly
        const bassMultiplier = 1.0 + (audioLevels.bass * 0.8);      // 1.0 to 1.8x
        const midMultiplier = 1.0 + (audioLevels.mid * 0.4);        // 1.0 to 1.4x
        const trebleMultiplier = 1.0 + (audioLevels.treble * 0.3);  // 1.0 to 1.3x
        const overallMultiplier = 1.0 + (audioLevels.overall * 0.5); // 1.0 to 1.5x
        
        // Bass effects - make the center circle really pulse!
        parameters.setAudioModifier('center_fill_radius', parameters.getBaseValue('center_fill_radius') * bassMultiplier * 1.5); // Extra bass sensitivity for center
        parameters.setAudioModifier('truchet_radius', parameters.getBaseValue('truchet_radius') * bassMultiplier);
        parameters.setAudioModifier('zoom_level', parameters.getBaseValue('zoom_level') * (1.0 + (audioLevels.bass * 0.3))); // Slight zoom pulse
        
        // Mid frequencies affect rotation and movement
        parameters.setAudioModifier('rotation_speed', parameters.getBaseValue('rotation_speed') * midMultiplier);
        parameters.setAudioModifier('plane_rotation_speed', parameters.getBaseValue('plane_rotation_speed') * midMultiplier);
        parameters.setAudioModifier('fly_speed', parameters.getBaseValue('fly_speed') * (1.0 + (audioLevels.mid * 0.6)));
        
        // Treble affects visual complexity and color
        const kaleidoscopeValue = parameters.getBaseValue('kaleidoscope_segments') * trebleMultiplier;
        // Ensure kaleidoscope segments remain even (required for proper symmetry)
        parameters.setAudioModifier('kaleidoscope_segments', Math.round(kaleidoscopeValue / 2) * 2);
        parameters.setAudioModifier('color_intensity', parameters.getBaseValue('color_intensity') * trebleMultiplier);
        parameters.setAudioModifier('color_speed', parameters.getBaseValue('color_speed') * trebleMultiplier);
        
        // Overall volume affects contrast and layer count
        parameters.setAudioModifier('contrast', parameters.getBaseValue('contrast') * overallMultiplier);
        parameters.setAudioModifier('layer_count', parameters.getBaseValue('layer_count') * (1.0 + (audioLevels.overall * 0.3)));
        
        // Path effects for more dynamic movement
        parameters.setAudioModifier('path_scale', parameters.getBaseValue('path_scale') * (1.0 + (audioLevels.overall * 0.4)));
        
        // Camera parameters - pass through unchanged but set as modifiers to ensure consistency
        parameters.setAudioModifier('camera_tilt_x', parameters.getBaseValue('camera_tilt_x'));
        parameters.setAudioModifier('camera_tilt_y', parameters.getBaseValue('camera_tilt_y'));
        parameters.setAudioModifier('camera_roll', parameters.getBaseValue('camera_roll'));
        parameters.setAudioModifier('path_stability', parameters.getBaseValue('path_stability'));
    }

    isReactive() {
        return this.audioReactive && (this.audioPlaying || this.microphoneActive);
    }
}