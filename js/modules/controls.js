// Controls and input handling module with enhanced features
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
        
        // Mouse wheel controls for zoom
        document.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        
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
                    if (this.app.menuVisible) {
                        // When menu is open: up/down cycles parameters
                        this.app.switchParameter(-1);
                    } else {
                        // When menu is closed: up/down adjusts values
                        this.app.adjustParameter(1);
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (this.app.menuVisible) {
                        // When menu is open: up/down cycles parameters
                        this.app.switchParameter(1);
                    } else {
                        // When menu is closed: up/down adjusts values
                        this.app.adjustParameter(-1);
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (this.app.menuVisible) {
                        // When menu is open: left/right adjusts values
                        this.app.adjustParameter(-1);
                    } else {
                        // When menu is closed: left/right cycles parameters
                        this.app.switchParameter(-1);
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (this.app.menuVisible) {
                        // When menu is open: left/right adjusts values
                        this.app.adjustParameter(1);
                    } else {
                        // When menu is closed: left/right cycles parameters
                        this.app.switchParameter(1);
                    }
                    break;
                case 'Space':
                    e.preventDefault();
                    this.app.togglePause();
                    break;
                case 'KeyC':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.app.resetToBlackWhite();
                    } else {
                        this.app.randomizeColors();
                    }
                    break;
                case 'KeyR':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.app.resetAllParameters();
                    } else {
                        this.app.resetCurrentParameter();
                    }
                    break;
                case 'Period':
                    e.preventDefault();
                    this.app.randomizeParameters();
                    break;
                case 'KeyI':
                    e.preventDefault();
                    this.app.toggleInvertColors();
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

    handleWheel(e) {
        e.preventDefault();
        
        try {
            this.app.ui.resetControlsFadeTimer();
            
            // Calculate zoom adjustment based on wheel direction
            const wheelDelta = e.deltaY > 0 ? -1 : 1; // Invert: wheel up = zoom in
            const sensitivity = 3; // Adjust sensitivity (higher = more sensitive)
            const zoomParam = this.app.parameters.getParameter('zoom_level');
            const zoomAdjustment = wheelDelta * sensitivity * zoomParam.step;
            
            // Apply zoom adjustment
            let newZoom = this.app.parameters.getBaseValue('zoom_level') + zoomAdjustment;
            
            // Clamp to zoom bounds
            newZoom = Math.max(zoomParam.min, Math.min(zoomParam.max, newZoom));
            newZoom = Math.round(newZoom / zoomParam.step) * zoomParam.step;
            
            this.app.parameters.setValue('zoom_level', newZoom);
            this.app.ui.updateDisplay();
        } catch (error) {
            this.app.ui.updateStatus(`Wheel zoom error: ${error.message}`, 'error');
        }
    }
}