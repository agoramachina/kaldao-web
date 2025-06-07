// Main application initialization and render loop
import { ParameterManager } from './modules/parameters.js';
import { AudioSystem } from './modules/audio.js';
import { ControlsManager } from './modules/controls.js';
import { Renderer } from './modules/renderer.js';
import { UIManager } from './modules/ui.js';
import { FileManager } from './modules/fileIO.js';
import { MobileControls } from './modules/mobile.js';

class KaldaoApp {
    constructor() {
        this.VERSION = "0.3.2";
        
        this.parameters = new ParameterManager();
        this.audio = new AudioSystem();
        this.controls = new ControlsManager();
        this.renderer = new Renderer();
        this.ui = new UIManager();
        this.fileManager = new FileManager();
        this.mobile = new MobileControls();
        
        // Global state
        this.animationPaused = false;
        this.currentParameterIndex = 0;
        this.currentPaletteIndex = 0;
        this.useColorPalette = false;
        this.invertColors = false;
        this.menuVisible = false;
        
        // Device detection
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Undo/Redo system
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;
    }
    
    async init() {
        try {
            // Initialize all systems
            await this.renderer.init();
            this.controls.init(this);
            this.ui.init(this);
            this.audio.init(this);
            this.fileManager.init(this);
            
            // Initialize mobile controls if on mobile device
            if (this.isMobile) {
                this.mobile.init(this);
            }
            
            // Set up window resize handler
            window.addEventListener('resize', () => {
                this.renderer.handleResize();
            });
            
            // Update version displays
            this.updateVersionDisplays();
            
            this.ui.updateStatus('✅ Kaldao loaded successfully!', 'success');
            this.ui.updateDisplay();
            this.ui.showControls();
            
            // Start render loop
            this.startRenderLoop();
            
        } catch (error) {
            this.ui.updateStatus(`❌ Error: ${error.message}`, 'error');
            console.error(error);
        }
    }
    
    updateVersionDisplays() {
        const desktopVersion = document.getElementById('desktop-version');
        if (desktopVersion) {
            desktopVersion.textContent = `Kaldao v${this.VERSION}`;
        }
        const mobileVersion = document.getElementById('mobile-version');
        if (mobileVersion) {
            mobileVersion.textContent = `Kaldao v${this.VERSION}`;
        }
    }
    
    startRenderLoop() {
        const render = () => {
            try {
                const deltaTime = 1.0 / 60.0;

                // Apply audio reactivity before updating time accumulation
                if (this.audio.isReactive()) {
                    this.audio.applyReactivity(this.parameters);
                }

                // Update time accumulation if not paused
                if (!this.animationPaused) {
                    this.parameters.updateTimeAccumulation(deltaTime);
                }

                // Render frame
                this.renderer.render(this.parameters, {
                    useColorPalette: this.useColorPalette,
                    invertColors: this.invertColors,
                    currentPaletteIndex: this.currentPaletteIndex
                });
                
                requestAnimationFrame(render);
            } catch (error) {
                this.ui.updateStatus(`Render error: ${error.message}`, 'error');
            }
        };
        
        render();
    }
    
    // Parameter control methods
    switchParameter(delta) {
        this.currentParameterIndex = (this.currentParameterIndex + delta + this.parameters.getParameterKeys().length) % this.parameters.getParameterKeys().length;
        this.ui.updateDisplay();
    }
    
    adjustParameter(delta) {
        this.saveStateForUndo();
        
        const paramKeys = this.parameters.getParameterKeys();
        const paramKey = paramKeys[this.currentParameterIndex];
        this.parameters.adjustParameter(paramKey, delta);
        
        this.ui.updateDisplay();
    }
    
    // Color control methods
    randomizeColors() {
        this.saveStateForUndo();
        this.parameters.randomizePalette(this.currentPaletteIndex);
        
        if (this.currentPaletteIndex === 0) {
            this.currentPaletteIndex = 1;
            this.useColorPalette = true;
        }
        
        this.ui.updateDisplay();
    }
    
    resetToBlackWhite() {
        this.saveStateForUndo();
        
        this.currentPaletteIndex = 0;
        this.useColorPalette = false;
        this.invertColors = false;
        this.ui.updateDisplay();
    }
    
    toggleInvertColors() {
        this.saveStateForUndo();
        
        this.invertColors = !this.invertColors;
        this.ui.updateDisplay();
    }
    
    // Parameter reset methods
    randomizeParameters() {
        this.saveStateForUndo();
        this.parameters.randomizeParameters();
        this.ui.updateDisplay();
    }
    
    resetCurrentParameter() {
        this.saveStateForUndo();
        
        const paramKeys = this.parameters.getParameterKeys();
        const paramKey = paramKeys[this.currentParameterIndex];
        this.parameters.resetParameter(paramKey);
        
        this.ui.updateDisplay();
    }
    
    resetAllParameters() {
        if (!this.isMobile && !confirm('Reset all parameters?')) {
            return;
        }
        
        this.saveStateForUndo();
        
        this.parameters.resetAllParameters();
        this.currentPaletteIndex = 0;
        this.useColorPalette = false;
        this.invertColors = false;
        
        this.ui.updateDisplay();
        this.ui.updateMenuDisplay();
    }
    
    // Animation control
    togglePause() {
        this.animationPaused = !this.animationPaused;
        this.ui.updateStatus(`Animation: ${this.animationPaused ? 'PAUSED' : 'RUNNING'}`, 'info');
    }
    
    // State management for undo/redo
    saveStateForUndo() {
        const state = {
            parameters: this.parameters.getState(),
            currentPaletteIndex: this.currentPaletteIndex,
            useColorPalette: this.useColorPalette,
            invertColors: this.invertColors,
            palettes: this.parameters.getPalettesState()
        };
        
        this.undoStack.push(state);
        
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        
        this.redoStack = [];
    }
    
    undo() {
        if (this.undoStack.length === 0) {
            this.ui.updateStatus('Nothing to undo', 'info');
            return;
        }
        
        // Save current state to redo stack
        const currentState = {
            parameters: this.parameters.getState(),
            currentPaletteIndex: this.currentPaletteIndex,
            useColorPalette: this.useColorPalette,
            invertColors: this.invertColors,
            palettes: this.parameters.getPalettesState()
        };
        
        this.redoStack.push(currentState);
        
        // Restore previous state
        const previousState = this.undoStack.pop();
        this.restoreState(previousState);
        
        this.ui.updateStatus(`⟲ Undone (${this.undoStack.length} steps remaining)`, 'success');
    }
    
    redo() {
        if (this.redoStack.length === 0) {
            this.ui.updateStatus('Nothing to redo', 'info');
            return;
        }
        
        // Save current state to undo stack
        const currentState = {
            parameters: this.parameters.getState(),
            currentPaletteIndex: this.currentPaletteIndex,
            useColorPalette: this.useColorPalette,
            invertColors: this.invertColors,
            palettes: this.parameters.getPalettesState()
        };
        
        this.undoStack.push(currentState);
        
        // Restore next state
        const nextState = this.redoStack.pop();
        this.restoreState(nextState);
        
        this.ui.updateStatus(`⟳ Redone (${this.redoStack.length} steps available)`, 'success');
    }
    
    restoreState(state) {
        this.parameters.setState(state.parameters);
        this.currentPaletteIndex = state.currentPaletteIndex;
        this.useColorPalette = state.useColorPalette;
        this.invertColors = state.invertColors;
        
        if (state.palettes) {
            this.parameters.setPalettesState(state.palettes);
        }
        
        this.ui.updateDisplay();
        this.ui.updateMenuDisplay();
    }
}

// Initialize the application
const app = new KaldaoApp();
window.addEventListener('load', () => app.init());