// Enhanced Color System Manager
// This module handles all color-related functionality including:
// - Three-mode color system (B&W, Original Palette, Layer Colors)
// - Advanced color menu interface
// - Color palette management and editing
// - Color mode synchronization

export class ColorManager {
    constructor() {
        this.app = null;
        
        // Advanced color menu state
        this.advancedColorMenuVisible = false;
        this.colorPreviewUpdateInterval = null;
        this.handleAdvancedColorMenuKeydown = null;
        
        // Color palette system - mathematical coefficients for procedural color generation
        this.colorPalettes = [
            { name: "B&W", a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.0, 0.0, 0.0] },
            { name: "Rainbow", a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.0, 0.33, 0.67] },
            { name: "Fire", a: [0.5, 0.2, 0.1], b: [0.5, 0.3, 0.2], c: [2.0, 1.0, 0.5], d: [0.0, 0.25, 0.5] },
            { name: "Ocean", a: [0.2, 0.5, 0.8], b: [0.2, 0.3, 0.5], c: [1.0, 1.5, 2.0], d: [0.0, 0.2, 0.5] },
            { name: "Purple", a: [0.8, 0.5, 0.4], b: [0.2, 0.4, 0.2], c: [2.0, 1.0, 1.0], d: [0.0, 0.25, 0.25] },
            { name: "Neon", a: [0.2, 0.2, 0.2], b: [0.8, 0.8, 0.8], c: [1.0, 2.0, 1.5], d: [0.0, 0.5, 0.8] },
            { name: "Sunset", a: [0.7, 0.3, 0.2], b: [0.3, 0.2, 0.1], c: [1.5, 1.0, 0.8], d: [0.0, 0.1, 0.3] }
        ];
    }

    init(app) {
        this.app = app;
        // Initialize color mode based on app state
        this.syncColorModeFromLegacyFlags();
    }
    
    // Sync the new color mode system with legacy flags
    syncColorModeFromLegacyFlags() {
        if (!this.app) return;
        
        if (this.app.parameters.getValue('use_layer_colors') > 0.5) {
            this.app.parameters.setValue('color_mode', 2.0); // Layer Colors
        } else if (this.app.useColorPalette) {
            this.app.parameters.setValue('color_mode', 1.0); // Original Palette
        } else {
            this.app.parameters.setValue('color_mode', 0.0); // Black & White
        }
    }

    // Get color palettes for external access
    getColorPalettes() {
        return this.colorPalettes;
    }
    
    getPalette(index) {
        return this.colorPalettes[index];
    }
    
    // Color palette randomization
    randomizePalette(index) {
        const palette = this.colorPalettes[index];
        if (palette) {
            for (let i = 0; i < 3; i++) {
                palette.a[i] = Math.random();
                palette.b[i] = Math.random();
                palette.c[i] = Math.random() * 2.0;
                palette.d[i] = Math.random();
            }
        }
    }

    // Advanced color menu functionality
    showAdvancedColorMenu() {
        if (this.advancedColorMenuVisible) {
            this.hideAdvancedColorMenu();
            return;
        }
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'advancedColorOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Courier New', monospace;
        `;

        // Create main dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: rgba(26, 26, 26, 0.3);
            border: 2px solid #E91E63;
            border-radius: 8px;
            padding: 20px;
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            color: #ffffff;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
            width: 900px;
        `;

        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #E91E63; margin: 0; font-size: 18px;">🎨 Advanced Color Control</h2>
                <button id="advancedColorClose" style="background: #666; color: #fff; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer; font-family: 'Courier New', monospace;">✕ Close</button>
            </div>
            
            <!-- Two Column Layout -->
            <div style="display: flex; gap: 15px; height: 80vh;">
                
                <!-- Left Column: Color Palettes + Preview -->
                <div style="flex: 0 0 380px; display: flex; flex-direction: column; gap: 12px;">
                    
                    <!-- Palette Preview Section -->
                    <div style="background: rgba(40, 40, 40, 0.2); border-radius: 6px; padding: 12px; border: 1px solid #444;">
                        <h3 style="color: #4CAF50; margin-bottom: 12px; font-size: 14px;">🌈 Live Palette Preview</h3>
                        
                        <div id="palettePreview" style="height: 80px; margin-bottom: 12px; border: 2px solid #333; border-radius: 4px; position: relative; overflow: hidden;">
                            <!-- Live color preview will be rendered here -->
                        </div>
                        
                        <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                            <button id="previewPrevPalette" style="flex: 1; padding: 6px; background: #2196F3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">← Prev</button>
                            <span id="currentPaletteIndex" style="flex: 1; text-align: center; font-size: 12px; line-height: 28px;">Palette 1</span>
                            <button id="previewNextPalette" style="flex: 1; padding: 6px; background: #2196F3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Next →</button>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;">
                            <button id="randomizePalette" style="padding: 6px; background: #9C27B0; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">🎲 Randomize</button>
                            <button id="resetPalette" style="padding: 6px; background: #F44336; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Reset</button>
                        </div>
                    </div>
                    
                    <!-- Color Mode Controls -->
                    <div style="background: rgba(40, 40, 40, 0.2); border-radius: 6px; padding: 12px; border: 1px solid #444;">
                        <h3 style="color: #FF9800; margin-bottom: 12px; font-size: 14px;">🎛️ Color Mode</h3>
                        
                        <div style="margin-bottom: 10px;">
                            <label style="display: flex; align-items: center; font-size: 12px; margin-bottom: 6px;">
                                <input type="radio" name="colorMode" id="colorModeBlackWhite" value="0" style="margin-right: 8px;">
                                Black & White (Traditional)
                            </label>
                            
                            <label style="display: flex; align-items: center; font-size: 12px; margin-bottom: 6px;">
                                <input type="radio" name="colorMode" id="colorModeOriginal" value="1" style="margin-right: 8px;">
                                Original Palette System
                            </label>
                            
                            <label style="display: flex; align-items: center; font-size: 12px; margin-bottom: 6px;">
                                <input type="radio" name="colorMode" id="colorModeLayer" value="2" style="margin-right: 8px;">
                                Color by Layer
                            </label>
                            
                            <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #555;">
                                <label style="display: flex; align-items: center; font-size: 12px; margin-bottom: 6px;">
                                    <input type="checkbox" id="invertColors" style="margin-right: 8px;">
                                    Invert Colors
                                </label>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 10px;">
                            <label style="font-size: 11px; color: #ccc; margin-bottom: 4px; display: block;">Current Palette:</label>
                            <select id="paletteSelector" style="width: 100%; padding: 6px; background: #2a2a2a; border: 1px solid #555; color: #fff; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 11px;">
                                <!-- Options will be populated by JavaScript -->
                            </select>
                        </div>
                    </div>
                    
                    <!-- Preset Controls -->
                    <div style="background: rgba(40, 40, 40, 0.2); border-radius: 6px; padding: 12px; border: 1px solid #444;">
                        <h3 style="color: #c41b83ff; margin-bottom: 12px; font-size: 14px;">💾 Manage Colors</h3>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;">
                            <button id="loadColorPreset" style="padding: 6px; background: #2196F3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Load Preset</button>
                            <button id="saveColorPreset" style="padding: 6px; background: #4CAF50; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Save Preset</button>
                            <button id="resetAllPalettes" style="padding: 6px; background: #F44336; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Reset All</button>
                            <button id="randomizeAllPalettes" style="padding: 6px; background: #9C27B0; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Random All</button>
                        </div>
                    </div>
                    
                </div>
                
                <!-- Right Column: Individual Color Component Editing -->
                <div style="flex: 1; background: rgba(40, 40, 40, 0.2); border-radius: 6px; padding: 15px; border: 1px solid #444; overflow: hidden;">
                    <h3 style="color: #E91E63; margin-bottom: 15px; font-size: 14px;">🎨 Palette Component Editor</h3>
                    
                    <div style="font-size: 11px; color: #ccc; margin-bottom: 15px;">
                        Fine-tune individual color components using cosine-based color palette mathematics.
                    </div>
                    
                    <div id="colorComponentEditor" style="height: calc(100% - 80px); overflow-y: auto; padding-right: 5px;">
                        <!-- Color component controls will be populated here -->
                    </div>
                </div>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        this.advancedColorMenuVisible = true;
        
        // Set up event handlers
        this.setupAdvancedColorMenuHandlers(overlay);
        
        // Initialize the display
        this.updateColorPreview();
        this.populateColorComponentEditor();
        this.updateColorModeControls();
        
        // Start real-time updates
        this.startColorPreviewUpdates();
    }
    
    hideAdvancedColorMenu() {
        const overlay = document.getElementById('advancedColorOverlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
        this.advancedColorMenuVisible = false;
        this.stopColorPreviewUpdates();
    }
    
    setupAdvancedColorMenuHandlers(overlay) {
        // Close button
        const closeBtn = document.getElementById('advancedColorClose');
        if (closeBtn) {
            closeBtn.onclick = () => this.hideAdvancedColorMenu();
        }
        
        // Click outside to close
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                this.hideAdvancedColorMenu();
            }
        };
        
        // Escape key to close
        document.addEventListener('keydown', this.handleAdvancedColorMenuKeydown = (e) => {
            if (e.key === 'Escape' && this.advancedColorMenuVisible) {
                this.hideAdvancedColorMenu();
            }
        });
        
        // Set up color control handlers
        this.setupColorControlHandlers();
    }
    
    setupColorControlHandlers() {
        // Palette navigation
        const prevBtn = document.getElementById('previewPrevPalette');
        const nextBtn = document.getElementById('previewNextPalette');
        
        if (prevBtn) {
            prevBtn.onclick = () => {
                this.app.currentPaletteIndex = Math.max(0, this.app.currentPaletteIndex - 1);
                this.updateColorPreview();
                this.updateColorModeControls();
                this.populateColorComponentEditor();
            };
        }
        
        if (nextBtn) {
            nextBtn.onclick = () => {
                this.app.currentPaletteIndex = Math.min(this.colorPalettes.length - 1, this.app.currentPaletteIndex + 1);
                this.updateColorPreview();
                this.updateColorModeControls();
                this.populateColorComponentEditor();
            };
        }
        
        // Randomize current palette
        const randomizeBtn = document.getElementById('randomizePalette');
        if (randomizeBtn) {
            randomizeBtn.onclick = () => {
                this.randomizePalette(this.app.currentPaletteIndex);
                this.updateColorPreview();
                this.populateColorComponentEditor();
                this.app.ui.updateDisplay();
            };
        }
        
        // Reset current palette
        const resetBtn = document.getElementById('resetPalette');
        if (resetBtn) {
            resetBtn.onclick = () => {
                this.resetPalette(this.app.currentPaletteIndex);
                this.updateColorPreview();
                this.populateColorComponentEditor();
                this.app.ui.updateDisplay();
            };
        }
        
        // Color mode controls
        const colorModeRadios = document.querySelectorAll('input[name="colorMode"]');
        const invertCheckbox = document.getElementById('invertColors');
        const paletteSelector = document.getElementById('paletteSelector');
        
        // Handle color mode radio buttons
        colorModeRadios.forEach(radio => {
            radio.onchange = () => {
                if (radio.checked) {
                    const mode = parseInt(radio.value);
                    this.app.parameters.setValue('color_mode', mode);
                    
                    // Update legacy flags for compatibility
                    switch (mode) {
                        case 0: // Black & White
                            this.app.useColorPalette = false;
                            this.app.parameters.setValue('use_layer_colors', 0.0);
                            break;
                        case 1: // Original Palette
                            this.app.useColorPalette = true;
                            this.app.parameters.setValue('use_layer_colors', 0.0);
                            break;
                        case 2: // Layer Colors
                            this.app.useColorPalette = false;
                            this.app.parameters.setValue('use_layer_colors', 1.0);
                            break;
                    }
                    
                    this.app.ui.updateDisplay();
                    this.updateColorPreview();
                }
            };
        });
        
        if (invertCheckbox) {
            invertCheckbox.onchange = () => {
                this.app.invertColors = invertCheckbox.checked;
                this.app.ui.updateDisplay();
                this.updateColorPreview();
            };
        }
        
        if (paletteSelector) {
            paletteSelector.onchange = () => {
                this.app.currentPaletteIndex = parseInt(paletteSelector.value);
                this.updateColorPreview();
                this.populateColorComponentEditor();
                this.app.ui.updateDisplay();
            };
        }
        
        // Management buttons
        const resetAllBtn = document.getElementById('resetAllPalettes');
        if (resetAllBtn) {
            resetAllBtn.onclick = () => {
                if (confirm('Reset all color palettes to default values?')) {
                    this.resetAllPalettes();
                    this.updateColorPreview();
                    this.populateColorComponentEditor();
                    this.app.ui.updateDisplay();
                }
            };
        }
        
        const randomizeAllBtn = document.getElementById('randomizeAllPalettes');
        if (randomizeAllBtn) {
            randomizeAllBtn.onclick = () => {
                for (let i = 1; i < this.colorPalettes.length; i++) {
                    this.randomizePalette(i);
                }
                this.updateColorPreview();
                this.populateColorComponentEditor();
                this.app.ui.updateDisplay();
            };
        }
    }
    
    updateColorPreview() {
        const preview = document.getElementById('palettePreview');
        const currentIndex = document.getElementById('currentPaletteIndex');
        
        if (preview && currentIndex) {
            const colorMode = this.app.parameters.getValue('color_mode');
            
            // Update palette index display
            currentIndex.textContent = `Palette ${this.app.currentPaletteIndex + 1}`;
            
            if (colorMode < 0.5) {
                // Mode 0: Black & White
                preview.style.background = 'linear-gradient(90deg, #000000 0%, #ffffff 50%, #000000 100%)';
            } else if (colorMode < 1.5) {
                // Mode 1: Original Palette System
                const palette = this.colorPalettes[this.app.currentPaletteIndex];
                if (palette && this.app.currentPaletteIndex > 0) {
                    // Generate color samples across the palette
                    const colors = [];
                    for (let i = 0; i < 20; i++) {
                        const t = i / 19.0;
                        const r = Math.max(0, Math.min(1, palette.a[0] + palette.b[0] * Math.cos(6.28318 * (palette.c[0] * t + palette.d[0]))));
                        const g = Math.max(0, Math.min(1, palette.a[1] + palette.b[1] * Math.cos(6.28318 * (palette.c[1] * t + palette.d[1]))));
                        const b = Math.max(0, Math.min(1, palette.a[2] + palette.b[2] * Math.cos(6.28318 * (palette.c[2] * t + palette.d[2]))));
                        
                        colors.push(`rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`);
                    }
                    
                    preview.style.background = `linear-gradient(90deg, ${colors.join(', ')})`;
                } else {
                    // Fallback to B&W if no valid palette
                    preview.style.background = 'linear-gradient(90deg, #000000 0%, #ffffff 50%, #000000 100%)';
                }
            } else {
                // Mode 2: Layer Colors
                const layerColors = [
                    '#8E24AA', '#1976D2', '#00796B', '#388E3C', '#F57C00', 
                    '#E64A19', '#C62828', '#AD1457', '#6A1B9A', '#4527A0', 
                    '#D32F2F', '#455A64'
                ];
                preview.style.background = `linear-gradient(90deg, ${layerColors.join(', ')})`;
            }
        }
    }
    
    updateColorModeControls() {
        const colorModeRadios = document.querySelectorAll('input[name="colorMode"]');
        const invertCheckbox = document.getElementById('invertColors');
        const paletteSelector = document.getElementById('paletteSelector');
        
        // Set the correct radio button based on current color mode
        const currentMode = this.app.parameters.getValue('color_mode');
        colorModeRadios.forEach(radio => {
            radio.checked = (parseInt(radio.value) === currentMode);
        });
        
        if (invertCheckbox) {
            invertCheckbox.checked = this.app.invertColors;
        }
        
        if (paletteSelector) {
            // Populate palette options
            paletteSelector.innerHTML = this.colorPalettes.map((_, index) => 
                `<option value="${index}">${index === 0 ? 'Black & White' : `Color Palette ${index}`}</option>`
            ).join('');
            paletteSelector.value = this.app.currentPaletteIndex;
        }
    }
    
    populateColorComponentEditor() {
        const container = document.getElementById('colorComponentEditor');
        if (!container) return;
        
        const palette = this.colorPalettes[this.app.currentPaletteIndex];
        
        if (!palette || this.app.currentPaletteIndex === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #666; font-style: italic; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚫⚪</div>
                    <div>Black & White mode selected</div>
                    <div style="font-size: 11px; margin-top: 10px;">Switch to a color palette to edit components</div>
                </div>
            `;
            return;
        }
        
        const components = ['a', 'b', 'c', 'd'];
        const componentNames = ['Offset', 'Amplitude', 'Frequency', 'Phase'];
        const componentDescriptions = [
            'Base color level (brightness)',
            'Color variation intensity',
            'How fast colors cycle',
            'Color shift/rotation'
        ];
        
        container.innerHTML = components.map((component, compIndex) => `
            <div style="margin-bottom: 20px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 4px; border-left: 3px solid ${['#F44336', '#4CAF50', '#2196F3'][compIndex % 3]};">
                <h4 style="color: #fff; margin: 0 0 10px 0; font-size: 12px;">
                    ${componentNames[compIndex]} (${component.toUpperCase()})
                    <span style="color: #999; font-size: 10px; font-weight: normal; margin-left: 8px;">${componentDescriptions[compIndex]}</span>
                </h4>
                
                ${['Red', 'Green', 'Blue'].map((channel, channelIndex) => `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 11px;">
                        <span style="width: 30px; color: ${['#FF6B6B', '#4CAF50', '#64B5F6'][channelIndex]};">${channel}</span>
                        <input type="range" 
                               class="color-component-slider" 
                               data-component="${component}" 
                               data-channel="${channelIndex}"
                               min="${component === 'c' ? 0 : (component === 'a' || component === 'b' ? -1 : 0)}" 
                               max="${component === 'c' ? 4 : (component === 'a' || component === 'b' ? 1 : 1)}" 
                               step="0.01" 
                               value="${palette[component][channelIndex]}"
                               style="flex: 1;">
                        <span class="color-component-value" style="width: 40px; text-align: right; font-family: monospace;">
                            ${palette[component][channelIndex].toFixed(2)}
                        </span>
                    </div>
                `).join('')}
            </div>
        `).join('');
        
        // Set up component slider handlers
        container.querySelectorAll('.color-component-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const component = e.target.dataset.component;
                const channel = parseInt(e.target.dataset.channel);
                const value = parseFloat(e.target.value);
                
                palette[component][channel] = value;
                
                // Update displayed value
                const valueSpan = e.target.parentElement.querySelector('.color-component-value');
                if (valueSpan) {
                    valueSpan.textContent = value.toFixed(2);
                }
                
                // Update preview and main display
                this.updateColorPreview();
                this.app.ui.updateDisplay();
            });
        });
    }
    
    resetPalette(index) {
        if (index === 0) return; // Can't reset black & white palette
        
        const defaultPalettes = [
            null, // Black & white
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.0, 0.33, 0.67] }, // Default color
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.3, 0.2, 0.2] }, // Warm
            { a: [0.55, 0.4, 0.99], b: [0.208, 0.718, 0.10], c: [0.520, 0.20, 0.472], d: [0.0, 0.15, 0.15] }, // Cool
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [2.0, 1.0, 0.0], d: [0.50, 0.20, 0.25] }, // Sunset
            { a: [0.8, 0.5, 0.4], b: [0.2, 0.4, 0.2], c: [2.0, 1.0, 1.0], d: [0.0, 0.25, 0.25] }  // Earth
        ];
        
        if (defaultPalettes[index]) {
            this.colorPalettes[index] = JSON.parse(JSON.stringify(defaultPalettes[index]));
        }
    }
    
    resetAllPalettes() {
        const defaultPalettes = [
            null, // Black & white
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.0, 0.33, 0.67] },
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.3, 0.2, 0.2] },
            { a: [0.55, 0.4, 0.99], b: [0.208, 0.718, 0.10], c: [0.520, 0.20, 0.472], d: [0.0, 0.15, 0.15] },
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [2.0, 1.0, 0.0], d: [0.50, 0.20, 0.25] },
            { a: [0.8, 0.5, 0.4], b: [0.2, 0.4, 0.2], c: [2.0, 1.0, 1.0], d: [0.0, 0.25, 0.25] }
        ];
        
        defaultPalettes.forEach((palette, index) => {
            if (palette) {
                this.colorPalettes[index] = JSON.parse(JSON.stringify(palette));
            }
        });
    }
    
    startColorPreviewUpdates() {
        if (this.colorPreviewUpdateInterval) {
            clearInterval(this.colorPreviewUpdateInterval);
        }
        
        this.colorPreviewUpdateInterval = setInterval(() => {
            if (this.advancedColorMenuVisible) {
                this.updateColorPreview();
            }
        }, 100); // 10 FPS update rate
    }
    
    stopColorPreviewUpdates() {
        if (this.colorPreviewUpdateInterval) {
            clearInterval(this.colorPreviewUpdateInterval);
            this.colorPreviewUpdateInterval = null;
        }
        
        if (this.handleAdvancedColorMenuKeydown) {
            document.removeEventListener('keydown', this.handleAdvancedColorMenuKeydown);
            this.handleAdvancedColorMenuKeydown = null;
        }
    }

    // Color palette state management 
    getPalettesState() {
        return JSON.parse(JSON.stringify(this.colorPalettes));
    }

    setPalettesState(palettes) {
        palettes.forEach((palette, index) => {
            if (this.colorPalettes[index]) {
                this.colorPalettes[index] = { ...palette };
            }
        });
    }
}