// Controls and input handling module
export class ControlsManager {
    constructor() {
        this.app = null;
    }

    init(app) {
        this.app = app;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Mouse and touch events for showing controls
        document.addEventListener('mousemove', () => this.app.ui.resetControlsFadeTimer());
        document.addEventListener('touchstart', () => this.app.ui.resetControlsFadeTimer());
        document.addEventListener('click', () => this.app.ui.resetControlsFadeTimer());
    }

    handleKeydown(e) {
        try {
            // Reset controls fade timer on any keypress
            this.app.ui.resetControlsFadeTimer();
            
            switch(e.code) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.switchParameter(-1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.switchParameter(1);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.adjustParameter(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.adjustParameter(1);
                    break;
                case 'Space':
                    e.preventDefault();
                    this.togglePause();
                    break;
                case 'KeyC':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.resetToBlackWhite();
                    } else {
                        this.randomizeColors();
                    }
                    break;
                case 'KeyR':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.resetAllParameters();
                    } else {
                        this.resetCurrentParameter();
                    }
                    break;
                case 'Period':
                    e.preventDefault();
                    this.randomizeParameters();
                    break;
                case 'KeyI':
                    e.preventDefault();
                    this.toggleInvertColors();
                    break;
                case 'KeyS':
                    e.preventDefault();
                    this.app.fileManager.saveParameters();
                    break;
                case 'KeyL':
                    e.preventDefault();
                    this.app.fileManager.loadParameters();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.app.ui.toggleMenu();
                    break;
                case 'KeyA':
                    e.preventDefault();
                    this.app.audio.toggleAudio();
                    break;
                case 'KeyZ':
                    e.preventDefault();
                    if (e.ctrlKey || e.metaKey) {
                        this.app.undo();
                    }
                    break;
                case 'KeyY':
                    e.preventDefault();
                    if (e.ctrlKey || e.metaKey) {
                        this.app.redo();
                    }
                    break;
                case 'KeyM':
                    e.preventDefault();
                    this.app.audio.toggleMicrophone();
                    break;
            }
        } catch (error) {
            this.app.ui.updateStatus(`Input error: ${error.message}`, 'error');
        }
    }

    switchParameter(delta) {
        const paramKeys = this.app.parameters.getParameterKeys();
        this.app.currentParameterIndex = (this.app.currentParameterIndex + delta + paramKeys.length) % paramKeys.length;
        this.app.ui.updateDisplay();
    }

    adjustParameter(delta) {
        // Save current state before making changes
        this.app.saveStateForUndo();
        
        const paramKeys = this.app.parameters.getParameterKeys();
        const paramKey = paramKeys[this.app.currentParameterIndex];
        this.app.parameters.adjustParameter(paramKey, delta);
        
        this.app.ui.updateDisplay();
    }

    togglePause() {
        this.app.animationPaused = !this.app.animationPaused;
        this.app.ui.updateStatus(`Animation: ${this.app.animationPaused ? 'PAUSED' : 'RUNNING'}`, 'info');
    }

    randomizeColors() {
        // Save current state before making changes
        this.app.saveStateForUndo();
        
        this.app.parameters.randomizePalette(this.app.currentPaletteIndex);
        
        if (this.app.currentPaletteIndex === 0) {
            this.app.currentPaletteIndex = 1;
            this.app.useColorPalette = true;
        }
        
        this.app.ui.updateDisplay();
    }

    resetToBlackWhite() {
        // Save current state before making changes
        this.app.saveStateForUndo();
        
        this.app.currentPaletteIndex = 0;
        this.app.useColorPalette = false;
        this.app.invertColors = false;
        this.app.ui.updateDisplay();
    }

    toggleInvertColors() {
        // Save current state before making changes
        this.app.saveStateForUndo();
        
        this.app.invertColors = !this.app.invertColors;
        this.app.ui.updateDisplay();
    }

    randomizeParameters() {
        // Save current state before making changes
        this.app.saveStateForUndo();
        
        this.app.parameters.randomizeParameters();
        this.app.ui.updateDisplay();
    }

    resetCurrentParameter() {
        // Save current state before making changes
        this.app.saveStateForUndo();
        
        const paramKeys = this.app.parameters.getParameterKeys();
        const paramKey = paramKeys[this.app.currentParameterIndex];
        this.app.parameters.resetParameter(paramKey);
        
        this.app.ui.updateDisplay();
    }

    resetAllParameters() {
        if (confirm('Reset all parameters?')) {
            // Save current state before making changes
            this.app.saveStateForUndo();
            
            this.app.parameters.resetAllParameters();
            this.app.currentPaletteIndex = 0;
            this.app.useColorPalette = false;
            this.app.invertColors = false;
            
            this.app.ui.updateDisplay();
            this.app.ui.updateMenuDisplay();
        }
    }
}