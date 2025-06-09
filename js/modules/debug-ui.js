// Debug UI Manager - Handles the low-level parameter debug interface
// This module provides deep mathematical control over the fractal visualization
// by exposing shader internals as adjustable parameters

export class DebugUIManager {
    constructor() {
        this.app = null;
        this.currentDebugParameterIndex = 0;
        this.allDebugKeys = []; // Flattened list of all debug parameter keys for navigation
        this.parameterModificationCount = 0; // Track how many debug params have been modified
        
        // ENHANCEMENT: Better interaction state management
        this.isKeyboardNavigating = false;    // Track if user is currently using keyboard navigation
        this.keyboardNavigationTimeout = null; // Timeout to reset keyboard navigation state
        this.performanceMetrics = {           // Track performance for FPS display
            frameCount: 0,
            lastFrameTime: performance.now(),
            fps: 60
        };
    }

    init(app) {
        this.app = app;
        this.buildDebugParameterList();
        console.log('Debug UI Manager initialized with', this.allDebugKeys.length, 'debug parameters');
    }

    // Build a flat list of debug parameter keys for navigation
    // This creates a single array we can navigate through with arrow keys
    buildDebugParameterList() {
        const categories = this.app.parameters.getDebugParameterCategories();
        this.allDebugKeys = [];
        
        // Flatten all debug parameters while maintaining category order
        // This gives us predictable navigation through related parameters
        Object.keys(categories).forEach(categoryName => {
            this.allDebugKeys.push(...categories[categoryName]);
        });

        console.log('Debug parameter navigation order:', this.allDebugKeys);
    }

    // Toggle debug menu visibility
    // This switches between normal operation and debug mode
    toggleDebugMenu() {
        this.app.debugMenuVisible = !this.app.debugMenuVisible;
        const debugMenu = document.getElementById('debugMenu');
        const ui = document.getElementById('ui');
        const controls = document.getElementById('controls');
        const menu = document.getElementById('menu');
        
        if (this.app.debugMenuVisible) {
            // Entering debug mode - hide everything else and show debug interface
            debugMenu.classList.remove('hidden');
            ui.classList.add('hidden');
            controls.classList.add('hidden');
            menu.classList.add('hidden');
            this.app.menuVisible = false; // Close main menu if open
            
            // Update the debug display with current parameter values
            this.updateDebugMenuDisplay();
            
            // Provide user feedback about entering debug mode
            this.app.ui.updateStatus('DEBUG MODE: Use ↑/↓ to navigate, ←/→ to adjust', 'info');
        } else {
            // Exiting debug mode - restore normal interface
            debugMenu.classList.add('hidden');
            ui.classList.remove('hidden');
            controls.classList.remove('hidden');
            
            // Update normal UI to reflect any changes made in debug mode
            this.app.ui.updateDisplay();
            this.app.ui.updateStatus('Debug mode closed', 'success');
        }
    }

    // Navigate through debug parameters
    // ENHANCED: Better state management to prevent hover conflicts during keyboard navigation
    switchDebugParameter(delta) {
        if (this.allDebugKeys.length === 0) return;
        
        // ENHANCEMENT: Mark that we're currently using keyboard navigation
        // This prevents hover animations from interfering with keyboard selection
        this.isKeyboardNavigating = true;
        
        // Clear any existing timeout and set a new one
        if (this.keyboardNavigationTimeout) {
            clearTimeout(this.keyboardNavigationTimeout);
        }
        
        // Reset keyboard navigation state after a brief delay
        this.keyboardNavigationTimeout = setTimeout(() => {
            this.isKeyboardNavigating = false;
        }, 200); // 200ms delay before allowing hover animations again
        
        // Wrap around at the ends of the list for continuous navigation
        this.currentDebugParameterIndex = (this.currentDebugParameterIndex + delta + this.allDebugKeys.length) % this.allDebugKeys.length;
        this.updateDebugMenuDisplay();
        
        // Provide immediate feedback about which parameter is now selected
        const currentKey = this.allDebugKeys[this.currentDebugParameterIndex];
        const currentParam = this.app.parameters.getParameter(currentKey);
        this.app.ui.updateStatus(`Selected: ${currentParam.name}`, 'info');
    }

    // Adjust current debug parameter
    // This is where the mathematical magic happens - we're directly modifying shader behavior
    adjustDebugParameter(delta) {
        if (this.allDebugKeys.length === 0) return;
        
        // Save state for undo before making any changes
        // This is crucial because debug parameter changes can have dramatic effects
        this.app.saveStateForUndo();
        
        const paramKey = this.allDebugKeys[this.currentDebugParameterIndex];
        const oldValue = this.app.parameters.getValue(paramKey);
        
        // Apply the adjustment using the parameter's defined step size
        this.app.parameters.adjustParameter(paramKey, delta);
        
        const newValue = this.app.parameters.getValue(paramKey);
        
        // Track modifications for user awareness
        if (oldValue !== newValue) {
            this.parameterModificationCount++;
        }
        
        // Update the display to show the new value
        this.updateDebugMenuDisplay();
        
        // Provide detailed feedback about the change
        const param = this.app.parameters.getParameter(paramKey);
        this.app.ui.updateStatus(`${param.name}: ${newValue.toFixed(3)} (${this.parameterModificationCount} total changes)`, 'success');
    }

    // ENHANCEMENT: Set up mouse interaction for parameter selection and editing
    // IMPROVED: Better event handling to prevent menu closure and enhance user experience
    setupMouseInteraction() {
        const parameterLines = document.querySelectorAll('.debug-param-line[data-param-key]');
        
        parameterLines.forEach(line => {
            const paramKey = line.getAttribute('data-param-key');
            const paramType = line.getAttribute('data-param-type');
            
            // ENHANCEMENT: Prevent hover effects during keyboard navigation
            line.addEventListener('mouseenter', (e) => {
                if (this.isKeyboardNavigating) {
                    e.preventDefault();
                    return;
                }
                // Allow normal hover effects when not keyboard navigating
            });
            
            // ENHANCEMENT: Click to select parameter (improved event handling)
            line.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // FIXED: Prevent event bubbling that was closing the menu
                this.selectParameterByKey(paramKey, paramType);
            });
            
            // ENHANCEMENT: Double-click to edit parameter value with visual feedback
            line.addEventListener('dblclick', (e) => {
                e.preventDefault();
                e.stopPropagation(); // FIXED: Prevent event bubbling
                this.editParameterValue(paramKey, line);
            });
        });
        
        // ENHANCEMENT: Add click handler to the main debug menu to prevent accidental closure
        const debugMenu = document.getElementById('debugMenu');
        if (debugMenu) {
            debugMenu.addEventListener('click', (e) => {
                // Only allow menu closure from specific elements, not general clicks
                if (e.target === debugMenu) {
                    // Clicked on the background - could close menu here if desired
                    // For now, we prevent accidental closure
                    e.stopPropagation();
                }
            });
        }
    }
    
    // ENHANCEMENT: Select a parameter by its key (for mouse interaction)
    selectParameterByKey(paramKey, paramType) {
        if (paramType === 'artistic') {
            // Switch to normal mode and select artistic parameter
            if (this.app.debugMenuVisible) {
                this.app.debugUI.toggleDebugMenu(); // Exit debug mode
            }
            const index = this.app.parameters.parameterKeys.indexOf(paramKey);
            if (index !== -1) {
                this.app.currentParameterIndex = index;
                this.app.ui.updateDisplay();
            }
        } else {
            // Select debug parameter
            const index = this.allDebugKeys.indexOf(paramKey);
            if (index !== -1) {
                this.currentDebugParameterIndex = index;
                this.updateDebugMenuDisplay();
                
                const param = this.app.parameters.getParameter(paramKey);
                this.app.ui.updateStatus(`Selected: ${param.name}`, 'info');
            }
        }
    }
    
    // ENHANCEMENT: Direct editing of parameter values with improved visual feedback
    // IMPROVED: Better user experience with clear visual indication of editable state
    editParameterValue(paramKey, lineElement) {
        const param = this.app.parameters.getParameter(paramKey);
        if (!param) return;
        
        const currentValue = param.value;
        
        // Create enhanced inline editor with clear visual feedback
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = `
            display: inline-flex;
            align-items: center;
            background: linear-gradient(90deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%);
            border: 2px solid #4CAF50;
            border-radius: 4px;
            padding: 2px 6px;
            margin-left: 10px;
            animation: editHighlight 0.3s ease;
        `;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentValue;
        input.min = param.min;
        input.max = param.max;
        input.step = param.step;
        input.style.cssText = `
            background: transparent;
            border: none;
            color: #ffffff;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            font-weight: bold;
            width: 80px;
            outline: none;
        `;
        
        // Add visual indicator that this is editable
        const indicator = document.createElement('span');
        indicator.textContent = '✎';
        indicator.style.cssText = `
            color: #4CAF50;
            margin-left: 4px;
            font-size: 10px;
            animation: editBlink 1s infinite;
        `;
        
        inputContainer.appendChild(input);
        inputContainer.appendChild(indicator);
        
        // Save reference to original content
        const originalContent = lineElement.innerHTML;
        
        // Replace line content with enhanced editor
        const paramName = param.name.padEnd(26);
        lineElement.innerHTML = `${paramName}: `;
        lineElement.appendChild(inputContainer);
        
        // Focus and select all text
        input.focus();
        input.select();
        
        // Enhanced completion handling with better feedback
        const finishEdit = () => {
            const newValue = parseFloat(input.value);
            
            if (!isNaN(newValue) && newValue >= param.min && newValue <= param.max) {
                // Save state for undo
                this.app.saveStateForUndo();
                
                // Update parameter value
                this.app.parameters.setValue(paramKey, newValue);
                
                // Update displays
                this.updateDebugMenuDisplay();
                this.app.ui.updateDisplay();
                
                // Enhanced success feedback
                this.app.ui.updateStatus(`${param.name} set to ${newValue.toFixed(3)} ✓`, 'success');
                
                // Brief highlight animation for the updated parameter
                setTimeout(() => {
                    const updatedLine = document.querySelector(`[data-param-key="${paramKey}"]`);
                    if (updatedLine) {
                        updatedLine.style.animation = 'parameter-highlight 0.5s ease';
                    }
                }, 100);
                
            } else {
                // Enhanced error feedback with specific guidance
                lineElement.innerHTML = originalContent;
                const rangeInfo = `(range: ${param.min} to ${param.max})`;
                this.app.ui.updateStatus(`Invalid value for ${param.name} ${rangeInfo}`, 'error');
            }
        };
        
        // Enhanced keyboard event handling
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                lineElement.innerHTML = originalContent;
                this.app.ui.updateStatus('Edit cancelled', 'info');
            } else if (e.key === 'Tab') {
                e.preventDefault();
                finishEdit();
                // Could implement tab navigation to next parameter here
            }
        });
        
        // Handle focus loss with delay to allow for proper interaction
        input.addEventListener('blur', () => {
            setTimeout(finishEdit, 100);
        });
    }
    
    // ENHANCEMENT: Get currently selected parameter key (works for both artistic and debug)
    getCurrentSelectedParameterKey() {
        if (this.app.debugMenuVisible) {
            // In debug mode, return current debug parameter
            return this.allDebugKeys[this.currentDebugParameterIndex] || null;
        } else {
            // In normal mode, return current artistic parameter
            const paramKeys = this.app.parameters.getParameterKeys();
            return paramKeys[this.app.currentParameterIndex] || null;
        }
    }

    // Update the debug menu display
    // This rebuilds the entire debug interface to reflect current parameter values and includes ALL parameters
    updateDebugMenuDisplay() {
        if (!this.app.debugMenuVisible) return;

        const debugParamsList = document.getElementById('debugParametersList');
        if (!debugParamsList) return;

        const categories = this.app.parameters.getDebugParameterCategories();
        let debugHTML = '';

        // ENHANCEMENT: Include all artistic parameters in debug view for comprehensive control
        debugHTML += '<div class="debug-category-header" style="color: #4CAF50; font-weight: bold; margin: 15px 0 8px 0; font-size: 14px;">ARTISTIC PARAMETERS</div>';
        
        // Add all regular artistic parameters to debug view
        this.app.parameters.parameterKeys.forEach(key => {
            const param = this.app.parameters.getParameter(key);
            if (!param) return;
            
            const index = this.app.parameters.parameterKeys.indexOf(key);
            const isCurrent = key === this.getCurrentSelectedParameterKey();
            
            let displayValue;
            if (param.step >= 1.0) {
                displayValue = param.value.toFixed(0);
            } else if (param.step >= 0.1) {
                displayValue = param.value.toFixed(1);
            } else if (param.step >= 0.01) {
                displayValue = param.value.toFixed(2);
            } else if (param.step >= 0.001) {
                displayValue = param.value.toFixed(3);
            } else {
                displayValue = param.value.toFixed(4);
            }
            
            const textColor = isCurrent ? '#4CAF50' : '#ffffff';
            const fontWeight = isCurrent ? 'bold' : 'normal';
            const backgroundColor = isCurrent ? 'rgba(76, 175, 80, 0.1)' : 'transparent';
            
            debugHTML += `<div class="debug-param-line" data-param-key="${key}" data-param-type="artistic" style="color: ${textColor}; font-weight: ${fontWeight}; background: ${backgroundColor}; margin: 2px 0; font-size: 11px; padding: 1px 3px; border-radius: 2px;">`;
            debugHTML += `${param.name.padEnd(26)}: ${displayValue.padStart(8)}`;
            debugHTML += `</div>`;
        });

        // Build the display category by category for debug parameters
        Object.keys(categories).forEach(categoryName => {
            // Category header with consistent styling
            debugHTML += `<div class="debug-category-header" style="color: #00BCD4; font-weight: bold; margin: 15px 0 8px 0; font-size: 14px;">${categoryName}</div>`;
            
            // Parameters in this category
            categories[categoryName].forEach(key => {
                const param = this.app.parameters.getParameter(key);
                if (!param) return;
                
                const index = this.allDebugKeys.indexOf(key);
                const isCurrent = key === this.getCurrentSelectedParameterKey();
                
                // Determine appropriate precision for display based on parameter step size
                let displayValue;
                if (param.step >= 1.0) {
                    displayValue = param.value.toFixed(0);
                } else if (param.step >= 0.1) {
                    displayValue = param.value.toFixed(1);
                } else if (param.step >= 0.01) {
                    displayValue = param.value.toFixed(2);
                } else if (param.step >= 0.001) {
                    displayValue = param.value.toFixed(3);
                } else {
                    displayValue = param.value.toFixed(4);
                }
                
                // Style the current parameter differently for clear visual feedback
                const textColor = isCurrent ? '#4CAF50' : '#ffffff';
                const fontWeight = isCurrent ? 'bold' : 'normal';
                const backgroundColor = isCurrent ? 'rgba(76, 175, 80, 0.1)' : 'transparent';
                
                // ENHANCEMENT: Add click handlers for mouse interaction
                debugHTML += `<div class="debug-param-line" data-param-key="${key}" data-param-type="debug" style="color: ${textColor}; font-weight: ${fontWeight}; background: ${backgroundColor}; margin: 2px 0; font-size: 11px; padding: 1px 3px; border-radius: 2px;">`;
                debugHTML += `${param.name.padEnd(26)}: ${displayValue.padStart(8)}`;
                debugHTML += `</div>`;
            });
        });

        debugParamsList.innerHTML = debugHTML;
        
        // ENHANCEMENT: Add click event listeners for mouse interaction
        this.setupMouseInteraction();
        
        // Update the current parameter info panel
        this.updateCurrentParameterInfo();
    }

    // Update the side panel with detailed information about the current parameter
    updateCurrentParameterInfo() {
        const currentParamInfo = document.getElementById('debugCurrentParamInfo');
        if (!currentParamInfo || this.allDebugKeys.length === 0) return;
        
        const currentKey = this.allDebugKeys[this.currentDebugParameterIndex];
        const currentParam = this.app.parameters.getParameter(currentKey);
        
        if (!currentParam) return;
        
        // Build detailed parameter information
        let infoHTML = `<div style="color: #4CAF50; font-weight: bold; margin-bottom: 5px;">${currentParam.name}</div>`;
        infoHTML += `<div style="margin-bottom: 3px;">Value: ${currentParam.value.toFixed(4)}</div>`;
        infoHTML += `<div style="margin-bottom: 3px;">Range: ${currentParam.min} to ${currentParam.max}</div>`;
        infoHTML += `<div style="margin-bottom: 3px;">Step: ${currentParam.step}</div>`;
        
        // Add parameter-specific descriptions to help understand what each parameter does
        const descriptions = this.getParameterDescriptions();
        if (descriptions[currentKey]) {
            infoHTML += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #444; color: #cccccc; font-size: 9px; line-height: 1.3;">`;
            infoHTML += descriptions[currentKey];
            infoHTML += `</div>`;
        }
        
        currentParamInfo.innerHTML = infoHTML;
    }

    // Get human-readable descriptions for debug parameters
    // These help users understand what each mathematical parameter actually controls
    getParameterDescriptions() {
        return {
            // Layer system descriptions
            'layer_distance': 'Distance between rendered layers. Lower values create tighter, more dense layering.',
            'layer_fade_start': 'Distance at which layers begin fading. Higher values show more distant layers.',
            'layer_fade_near': 'Near fade distance. Controls how quickly close layers fade in.',
            'layer_alpha_base': 'Base transparency for layers. Lower values make layers more see-through.',
            'layer_alpha_range': 'Transparency variation range. Controls transparency contrast between layers.',
            'layer_cutoff': 'Rendering cutoff threshold. Higher values render more layers (slower).',
            
            // Camera path descriptions
            'path_freq_primary': 'Primary frequency for curved path generation. √2 (1.414) creates organic, non-repeating curves.',
            'path_freq_secondary': 'Secondary frequency harmonic. √0.75 (0.866) adds complexity to path curves.',
            'path_freq_tertiary': 'Tertiary frequency harmonic. √0.5 (0.707) creates fine detail in path movement.',
            'path_amplitude': 'Overall amplitude of path curvature. Higher values create wider, more dramatic curves.',
            
            // Kaleidoscope descriptions
            'kaleidoscope_smoothing': 'Smoothing factor for kaleidoscope edges. Lower values create sharper mirror lines.',
            'kaleidoscope_smooth_scale': 'Scale factor for smoothing calculation. Affects how smoothing interacts with segment count.',
            
            // Pattern generation descriptions
            'pattern_threshold_full': 'Threshold for full truchet patterns (circle + both diagonals). Lower = more complex patterns.',
            'pattern_threshold_partial_a': 'Threshold for first partial pattern type. Controls pattern variety distribution.',
            'pattern_threshold_partial_b': 'Threshold for second partial pattern type. Affects visual density.',
            'pattern_offset_scale': 'Scale for random pattern offsets. Higher values create more pattern variation.',
            'pattern_base_offset': 'Base offset for pattern positioning. Affects overall pattern alignment.',
            
            // Random seed descriptions
            'hash_seed_rotation': 'Seed for rotation randomization. Different values create different rotation patterns.',
            'hash_seed_offset': 'Seed for position randomization. Controls how patterns are distributed spatially.',
            'hash_seed_speed': 'Seed for speed randomization. Affects how layers rotate at different rates.',
            
            // Field of view descriptions
            'fov_base': 'Base field of view. Higher values create wider perspective, like a wide-angle lens.',
            'fov_distortion': 'Perspective distortion amount. Controls barrel/fisheye distortion at screen edges.',
            'perspective_curve': 'Curvature factor for perspective calculation. Affects depth perception.',
            
            // Rendering descriptions
            'aa_multiplier': 'Anti-aliasing intensity multiplier. Higher values create smoother edges (slower).',
            'line_width_base': 'Base line width for pattern edges. Thicker lines create bolder patterns.',
            'detail_frequency': 'Frequency for fine detail generation. Higher values create more intricate edge details.',
            'truchet_diagonal_threshold': 'Threshold for diagonal pattern elements. √0.5 (0.707) is mathematically optimal.'
        };
    }

    // Reset current debug parameter to default
    resetCurrentDebugParameter() {
        if (this.allDebugKeys.length === 0) return;
        
        this.app.saveStateForUndo();
        const paramKey = this.allDebugKeys[this.currentDebugParameterIndex];
        this.app.parameters.resetParameter(paramKey);
        this.updateDebugMenuDisplay();
        
        const param = this.app.parameters.getParameter(paramKey);
        this.app.ui.updateStatus(`Reset: ${param.name} to default`, 'success');
    }

    // Randomize debug parameters (use with caution!)
    // Only randomizes mathematically safe parameters to avoid breaking the visualization
    randomizeDebugParameters() {
        this.app.saveStateForUndo();
        
        // Only randomize parameters that are safe to adjust without breaking the visualization
        // Avoid randomizing rendering quality and critical mathematical constants
        const safeToRandomize = [
            'path_freq_primary', 'path_freq_secondary', 'path_freq_tertiary',
            'kaleidoscope_smoothing', 'pattern_threshold_full', 
            'pattern_threshold_partial_a', 'pattern_threshold_partial_b',
            'fov_distortion', 'perspective_curve', 'layer_fade_start'
        ];
        
        let randomizedCount = 0;
        safeToRandomize.forEach(key => {
            const param = this.app.parameters.getParameter(key);
            if (param) {
                const range = param.max - param.min;
                const newValue = param.min + Math.random() * range;
                this.app.parameters.setValue(key, newValue);
                randomizedCount++;
            }
        });
        
        this.parameterModificationCount += randomizedCount;
        this.updateDebugMenuDisplay();
        this.app.ui.updateStatus(`${randomizedCount} debug parameters randomized safely`, 'success');
    }

    // Export current debug parameter state for sharing
    // This creates a snapshot of all debug parameter values that can be shared or saved
    exportDebugState() {
        const debugState = {};
        this.allDebugKeys.forEach(key => {
            debugState[key] = this.app.parameters.getValue(key);
        });
        
        const stateString = JSON.stringify(debugState, null, 2);
        
        // Try to copy to clipboard, fall back to console logging
        if (navigator.clipboard) {
            navigator.clipboard.writeText(stateString).then(() => {
                this.app.ui.updateStatus('Debug state copied to clipboard', 'success');
            }).catch(() => {
                console.log('Debug state:', stateString);
                this.app.ui.updateStatus('Debug state logged to console', 'info');
            });
        } else {
            console.log('Debug state:', stateString);
            this.app.ui.updateStatus('Debug state logged to console', 'info');
        }
    }

    // Import debug state from clipboard or object
    // This allows loading previously saved debug configurations
    importDebugState(stateObject) {
        if (typeof stateObject === 'string') {
            try {
                stateObject = JSON.parse(stateObject);
            } catch (error) {
                this.app.ui.updateStatus('Invalid debug state format', 'error');
                return false;
            }
        }
        
        this.app.saveStateForUndo();
        
        let importedCount = 0;
        Object.keys(stateObject).forEach(key => {
            if (this.allDebugKeys.includes(key)) {
                this.app.parameters.setValue(key, stateObject[key]);
                importedCount++;
            }
        });
        
        this.updateDebugMenuDisplay();
        this.app.ui.updateStatus(`Imported ${importedCount} debug parameters`, 'success');
        return true;
    }

    // ENHANCEMENT: Update system status with real-time performance monitoring
    updateSystemStatus() {
        const systemStatusDiv = document.getElementById('debugSystemStatus');
        if (!systemStatusDiv) return;
        
        // Calculate current FPS based on recent frame timings
        const currentTime = performance.now();
        const deltaTime = currentTime - this.performanceMetrics.lastFrameTime;
        this.performanceMetrics.lastFrameTime = currentTime;
        this.performanceMetrics.frameCount++;
        
        // Calculate rolling average FPS for smooth display
        if (deltaTime > 0) {
            const instantFPS = 1000 / deltaTime;
            this.performanceMetrics.fps = this.performanceMetrics.fps * 0.9 + instantFPS * 0.1; // Smooth rolling average
        }
        
        // Get system information
        const systemInfo = this.app.getSystemStatus();
        const fps = Math.round(this.performanceMetrics.fps);
        
        // Determine performance status
        let performanceStatus = '';
        let performanceColor = '#4CAF50';
        if (fps >= 55) {
            performanceStatus = 'Excellent';
            performanceColor = '#4CAF50';
        } else if (fps >= 45) {
            performanceStatus = 'Good';
            performanceColor = '#FFC107';
        } else if (fps >= 30) {
            performanceStatus = 'Fair';
            performanceColor = '#FF9800';
        } else {
            performanceStatus = 'Poor';
            performanceColor = '#f44336';
        }
        
        // Update the system status display with comprehensive information
        systemStatusDiv.innerHTML = `
            <div style="margin-bottom: 8px;">
                <strong style="color: ${performanceColor};">FPS: ${fps}</strong> 
                <span style="color: #cccccc;">(${performanceStatus})</span>
            </div>
            <div style="font-size: 10px; color: #999999;">
                <div>Parameters: ${systemInfo.totalParameters} total</div>
                <div>Debug Changes: ${this.parameterModificationCount}</div>
                <div>Audio: ${systemInfo.audioReactive ? 'Reactive' : 'Static'}</div>
                <div>Frames: ${this.performanceMetrics.frameCount}</div>
            </div>
        `;
    }
    
    // ENHANCEMENT: Call this method regularly to update FPS display
    startPerformanceMonitoring() {
        // Update system status every 100ms for responsive feedback
        setInterval(() => {
            if (this.app.debugMenuVisible) {
                this.updateSystemStatus();
            }
        }, 100);
    }
}