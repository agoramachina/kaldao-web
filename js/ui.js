// UI management and display updates
export class UIManager {
    constructor() {
        this.app = null;
        this.controlsVisible = true;
        this.controlsFadeTimeout = null;
        this.CONTROLS_FADE_DELAY = 3000; // 3 seconds
    }

    init(app) {
        this.app = app;
    }

    updateStatus(message, type = 'info') {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.className = type;
            statusDiv.textContent = message;
        }
    }

    updateDisplay() {
        const paramKeys = this.app.parameters.getParameterKeys();
        const paramKey = paramKeys[this.app.currentParameterIndex];
        const param = this.app.parameters.getParameter(paramKey);
        const palette = this.app.parameters.getPalette(this.app.currentPaletteIndex);
        
        const paramDiv = document.getElementById('currentParam');
        if (paramDiv) {
            paramDiv.textContent = `${param.name}: ${param.value.toFixed(3)} | ${palette.name}${this.app.invertColors ? ' (Inverted)' : ''}`;
        }
        
        // Update menu if visible
        this.updateMenuDisplay();
    }

    showControls() {
        const controls = document.getElementById('controls');
        const ui = document.getElementById('ui');
        
        if (controls && !this.app.menuVisible) {
            controls.classList.remove('hidden');
            ui.classList.remove('hidden');
            this.controlsVisible = true;
            
            // Clear existing timeout
            if (this.controlsFadeTimeout) {
                clearTimeout(this.controlsFadeTimeout);
            }
            
            // Set new timeout to hide controls
            this.controlsFadeTimeout = setTimeout(() => {
                this.hideControls();
            }, this.CONTROLS_FADE_DELAY);
        }
    }
    
    hideControls() {
        const controls = document.getElementById('controls');
        const ui = document.getElementById('ui');
        
        if (controls && !this.app.menuVisible) {
            controls.classList.add('hidden');
            ui.classList.add('hidden');
            this.controlsVisible = false;
        }
    }
    
    resetControlsFadeTimer() {
        if (!this.app.menuVisible) {
            this.showControls();
        }
    }

    toggleMenu() {
        this.app.menuVisible = !this.app.menuVisible;
        const menu = document.getElementById('menu');
        const ui = document.getElementById('ui');
        const controls = document.getElementById('controls');
        
        if (this.app.menuVisible) {
            menu.classList.remove('hidden');
            ui.classList.add('hidden');
            controls.classList.add('hidden');
            this.updateMenuDisplay();
        } else {
            menu.classList.add('hidden');
            ui.classList.remove('hidden');
            controls.classList.remove('hidden');
        }
    }

    updateMenuDisplay() {
        if (!this.app.menuVisible) return;
        
        // Update ALL parameters list with organized categories
        const allParamsList = document.getElementById('allParametersList');
        if (allParamsList) {
            let paramsHTML = '';
            
            // Movement & Animation
            paramsHTML += '<div style="color: #4CAF50; font-weight: bold; margin-bottom: 5px;">MOVEMENT & ANIMATION</div>';
            const movementParams = ['fly_speed', 'rotation_speed', 'plane_rotation_speed', 'zoom_level'];
            movementParams.forEach(key => {
                const param = this.app.parameters.getParameter(key);
                const index = this.app.parameters.getParameterKeys().indexOf(key);
                const isCurrent = index === this.app.currentParameterIndex;
                const style = isCurrent ? 'color: #4CAF50; font-weight: bold;' : 'color: #ffffff;';
                paramsHTML += `<div style="${style}">${param.name}: ${param.value.toFixed(3)}</div>`;
            });
            
            paramsHTML += '<br>';
            
            // Pattern & Visual
            paramsHTML += '<div style="color: #FFC107; font-weight: bold; margin-bottom: 5px;">PATTERN & VISUAL</div>';
            const patternParams = ['kaleidoscope_segments', 'truchet_radius', 'center_fill_radius', 'layer_count', 'contrast', 'color_intensity'];
            patternParams.forEach(key => {
                const param = this.app.parameters.getParameter(key);
                const index = this.app.parameters.getParameterKeys().indexOf(key);
                const isCurrent = index === this.app.currentParameterIndex;
                const style = isCurrent ? 'color: #4CAF50; font-weight: bold;' : 'color: #ffffff;';
                const value = key === 'kaleidoscope_segments' || key === 'layer_count' ? 
                    param.value.toFixed(0) : param.value.toFixed(3);
                paramsHTML += `<div style="${style}">${param.name}: ${value}</div>`;
            });
            
            paramsHTML += '<br>';
            
            // Camera & Path
            paramsHTML += '<div style="color: #9C27B0; font-weight: bold; margin-bottom: 5px;">CAMERA & PATH</div>';
            const cameraParams = ['camera_tilt_x', 'camera_tilt_y', 'camera_roll', 'path_stability', 'path_scale'];
            cameraParams.forEach(key => {
                const param = this.app.parameters.getParameter(key);
                const index = this.app.parameters.getParameterKeys().indexOf(key);
                const isCurrent = index === this.app.currentParameterIndex;
                const style = isCurrent ? 'color: #4CAF50; font-weight: bold;' : 'color: #ffffff;';
                paramsHTML += `<div style="${style}">${param.name}: ${param.value.toFixed(3)}</div>`;
            });
            
            paramsHTML += '<br>';
            
            // Color & Animation Speed
            paramsHTML += '<div style="color: #FF5722; font-weight: bold; margin-bottom: 5px;">COLOR & SPEED</div>';
            const colorParams = ['color_speed'];
            colorParams.forEach(key => {
                const param = this.app.parameters.getParameter(key);
                const index = this.app.parameters.getParameterKeys().indexOf(key);
                const isCurrent = index === this.app.currentParameterIndex;
                const style = isCurrent ? 'color: #4CAF50; font-weight: bold;' : 'color: #ffffff;';
                paramsHTML += `<div style="${style}">${param.name}: ${param.value.toFixed(3)}</div>`;
            });
            
            allParamsList.innerHTML = paramsHTML;
        }
        
        // Update palettes list
        const allPalettesList = document.getElementById('allPalettesList');
        if (allPalettesList) {
            let palettesHTML = '';
            const palettes = this.app.parameters.getColorPalettes();
            palettes.forEach((palette, index) => {
                const isCurrent = index === this.app.currentPaletteIndex;
                const style = isCurrent ? 'color: #4CAF50; font-weight: bold;' : 'color: #ffffff;';
                const inverted = isCurrent && this.app.invertColors ? ' (Inverted)' : '';
                const active = isCurrent && this.app.useColorPalette ? ' ●' : (isCurrent ? ' ○' : '');
                palettesHTML += `<div style="${style}">${palette.name}${inverted}${active}</div>`;
            });
            allPalettesList.innerHTML = palettesHTML;
        }
        
        // Update audio status
        const allAudioStatus = document.getElementById('allAudioStatus');
        if (allAudioStatus) {
            if (this.app.audio.microphoneActive) {
                allAudioStatus.innerHTML = '🎤 <span style="color: #4CAF50;">Microphone Active</span><br>🔊 Audio Reactive: ON<br><em>Press M to stop</em>';
            } else if (!this.app.audio.audioElement) {
                allAudioStatus.innerHTML = '🎵 No audio file loaded<br>🎤 Microphone: OFF<br>🔊 Audio Reactive: OFF<br><em>Press A for file, M for mic</em>';
            } else {
                const playStatus = this.app.audio.audioPlaying ? '<span style="color: #4CAF50;">Playing</span>' : '<span style="color: #FF9800;">Paused</span>';
                const reactiveStatus = this.app.audio.audioReactive ? '<span style="color: #4CAF50;">ON</span>' : '<span style="color: #FF9800;">OFF</span>';
                allAudioStatus.innerHTML = `🎵 File: ${playStatus}<br>🎤 Microphone: OFF<br>🔊 Audio Reactive: ${reactiveStatus}<br><em>Press A to toggle, M for mic</em>`;
            }
        }
    }
}