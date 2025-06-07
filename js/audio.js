// Audio system and reactivity module
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
        this.baseParameterValues = {};
        
        // Microphone system
        this.microphoneStream = null;
        this.microphoneSource = null;
        this.microphoneActive = false;
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
                this.restoreBaseParameters();
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
                    this.storeBaseParameters();
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
                    this.storeBaseParameters();
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
            await this.startMicrophone();
        }
    }

    async startMicrophone() {
        try {
            this.app.ui.updateStatus('🎤 Requesting microphone access...', 'info');
            
            // Request microphone access
            this.microphoneStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            
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
            this.storeBaseParameters();
            
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
            this.restoreBaseParameters();
            
            this.app.ui.updateStatus('🎤 Microphone stopped', 'info');
            this.app.ui.updateMenuDisplay();
            
        } catch (error) {
            console.error('Error stopping microphone:', error);
            this.app.ui.updateStatus('❌ Error stopping microphone', 'error');
        }
    }

    storeBaseParameters() {
        // Store current parameter values as base values for audio reactivity
        this.baseParameterValues = this.app.parameters.getState();
    }

    restoreBaseParameters() {
        // Restore parameters to their base values
        this.app.parameters.setState(this.baseParameterValues);
        this.app.ui.updateDisplay();
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
        
        return { bass, mid, treble, overall };
    }

    applyReactivity(parameters) {
        if (!this.audioReactive || (!this.audioPlaying && !this.microphoneActive)) return;
        
        const audioLevels = this.analyzeAudio();
        
        // Apply audio modulation to parameters (relative to base values)
        const bassInfluence = audioLevels.bass * 2.0;
        const midInfluence = audioLevels.mid * 1.5;
        const trebleInfluence = audioLevels.treble * 1.0;
        
        // Bass affects truchet radius and zoom
        if (this.baseParameterValues.truchet_radius !== undefined) {
            const baseRadius = this.baseParameterValues.truchet_radius;
            const newValue = baseRadius + (bassInfluence * 0.3);
            parameters.setValue('truchet_radius', newValue);
        }
        
        if (this.baseParameterValues.zoom_level !== undefined) {
            const baseZoom = this.baseParameterValues.zoom_level;
            const newValue = baseZoom + (bassInfluence * 0.5);
            parameters.setValue('zoom_level', newValue);
        }
        
        // Mid frequencies affect rotation speed
        if (this.baseParameterValues.rotation_speed !== undefined) {
            const baseRotation = this.baseParameterValues.rotation_speed;
            const newValue = baseRotation + (midInfluence * 0.1);
            parameters.setValue('rotation_speed', newValue);
        }
        
        // Treble affects kaleidoscope segments and color intensity
        if (this.baseParameterValues.kaleidoscope_segments !== undefined) {
            const baseSegments = this.baseParameterValues.kaleidoscope_segments;
            let newSegments = baseSegments + (trebleInfluence * 20.0);
            newSegments = Math.round(newSegments / 2) * 2; // Keep even
            parameters.setValue('kaleidoscope_segments', newSegments);
        }
        
        if (this.baseParameterValues.color_intensity !== undefined) {
            const baseIntensity = this.baseParameterValues.color_intensity;
            const newValue = baseIntensity + (trebleInfluence * 0.8);
            parameters.setValue('color_intensity', newValue);
        }
        
        // Overall volume affects fly speed
        if (this.baseParameterValues.fly_speed !== undefined) {
            const baseSpeed = this.baseParameterValues.fly_speed;
            const newValue = baseSpeed + (audioLevels.overall * 1.0);
            parameters.setValue('fly_speed', newValue);
        }
    }

    isReactive() {
        return this.audioReactive && (this.audioPlaying || this.microphoneActive);
    }
}