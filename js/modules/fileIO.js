// File I/O module for save/load functionality
export class FileManager {
    constructor() {
        this.app = null;
    }

    init(app) {
        this.app = app;
    }

    saveParameters() {
        try {
            const saveData = {
                parameters: this.app.parameters.getState(),
                palette: {
                    currentPaletteIndex: this.app.currentPaletteIndex,
                    useColorPalette: this.app.useColorPalette,
                    invertColors: this.app.invertColors,
                    palettes: this.app.parameters.getPalettesState()
                },
                timeAccumulation: { ...this.app.parameters.timeAccumulation },
                version: "1.0",
                timestamp: new Date().toISOString(),
                description: "Kaldao Fractal Visualizer Parameters"
            };
            
            const jsonString = JSON.stringify(saveData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `kaldao-fractal-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.app.ui.updateStatus('✅ Parameters saved to file!', 'success');
            
        } catch (error) {
            this.app.ui.updateStatus(`❌ Save failed: ${error.message}`, 'error');
        }
    }

    loadParameters() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const saveData = JSON.parse(e.target.result);
                        
                        // Validate the save data
                        if (!saveData.parameters || !saveData.palette) {
                            throw new Error('Invalid save file format');
                        }
                        
                        // Save current state for undo
                        this.app.saveStateForUndo();
                        
                        // Load parameters
                        this.app.parameters.setState(saveData.parameters);
                        
                        // Load palette settings
                        if (saveData.palette.currentPaletteIndex !== undefined) {
                            this.app.currentPaletteIndex = saveData.palette.currentPaletteIndex;
                        }
                        if (saveData.palette.useColorPalette !== undefined) {
                            this.app.useColorPalette = saveData.palette.useColorPalette;
                        }
                        if (saveData.palette.invertColors !== undefined) {
                            this.app.invertColors = saveData.palette.invertColors;
                        }
                        if (saveData.palette.palettes) {
                            this.app.parameters.setPalettesState(saveData.palette.palettes);
                        }
                        
                        // Load time accumulation if present
                        if (saveData.timeAccumulation) {
                            Object.assign(this.app.parameters.timeAccumulation, saveData.timeAccumulation);
                        }
                        
                        this.app.ui.updateDisplay();
                        this.app.ui.updateMenuDisplay();
                        
                        const timestamp = saveData.timestamp ? 
                            new Date(saveData.timestamp).toLocaleString() : 'Unknown';
                        this.app.ui.updateStatus(`✅ Parameters loaded! (Saved: ${timestamp})`, 'success');
                        
                    } catch (error) {
                        this.app.ui.updateStatus(`❌ Load failed: ${error.message}`, 'error');
                    }
                };
                
                reader.readAsText(file);
            };
            
            input.click();
            
        } catch (error) {
            this.app.ui.updateStatus(`❌ Load failed: ${error.message}`, 'error');
        }
    }

    // Method to create and download preset files
    createPreset(name, description) {
        const presetData = {
            name: name,
            description: description,
            parameters: this.app.parameters.getState(),
            palette: {
                currentPaletteIndex: this.app.currentPaletteIndex,
                useColorPalette: this.app.useColorPalette,
                invertColors: this.app.invertColors,
                palettes: this.app.parameters.getPalettesState()
            },
            version: "1.0",
            timestamp: new Date().toISOString(),
            type: "preset"
        };
        
        const jsonString = JSON.stringify(presetData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `kaldao-preset-${name.toLowerCase().replace(/\s+/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return presetData;
    }

    // Method to load a preset
    loadPreset(presetData) {
        try {
            // Save current state for undo
            this.app.saveStateForUndo();
            
            // Load preset data
            if (presetData.parameters) {
                this.app.parameters.setState(presetData.parameters);
            }
            
            if (presetData.palette) {
                if (presetData.palette.currentPaletteIndex !== undefined) {
                    this.app.currentPaletteIndex = presetData.palette.currentPaletteIndex;
                }
                if (presetData.palette.useColorPalette !== undefined) {
                    this.app.useColorPalette = presetData.palette.useColorPalette;
                }
                if (presetData.palette.invertColors !== undefined) {
                    this.app.invertColors = presetData.palette.invertColors;
                }
                if (presetData.palette.palettes) {
                    this.app.parameters.setPalettesState(presetData.palette.palettes);
                }
            }
            
            this.app.ui.updateDisplay();
            this.app.ui.updateMenuDisplay();
            
            return true;
        } catch (error) {
            console.error('Failed to load preset:', error);
            return false;
        }
    }
}