// Parameter definitions and management
export class ParameterManager {
    constructor() {
        // Parameters - exact match to Godot
        this.parameters = {
            fly_speed: { value: 0.25, min: -3.0, max: 3.0, step: 0.1, name: "Fly Speed" },
            contrast: { value: 1.0, min: 0.1, max: 5.0, step: 0.1, name: "Contrast" },
            kaleidoscope_segments: { value: 10.0, min: 4.0, max: 80.0, step: 2.0, name: "Kaleidoscope Segments" },
            truchet_radius: { value: 0.35, min: -1.0, max: 1.0, step: 0.01, name: "Truchet Radius" },
            center_fill_radius: { value: 0.0, min: -2.0, max: 2.0, step: 0.01, name: "Center Fill Radius" },
            layer_count: { value: 6, min: 1, max: 10, step: 1, name: "Layer Count" },
            rotation_speed: { value: 0.025, min: -6.0, max: 6.0, step: 0.01, name: "Rotation Speed" },
            zoom_level: { value: 0.3, min: -5.0, max: 5.0, step: 0.05, name: "Zoom Level" },
            color_intensity: { value: 1.0, min: 0.1, max: 2.0, step: 0.1, name: "Color Intensity" },
            plane_rotation_speed: { value: 0.5, min: -5.0, max: 5.0, step: 0.1, name: "Plane Rotation Speed" },
            camera_tilt_x: { value: 0.0, min: -10.0, max: 10.0, step: 1.0, name: "Camera Tilt X" },
            camera_tilt_y: { value: 0.0, min: -10.0, max: 10.0, step: 1.0, name: "Camera Tilt Y" },
            camera_roll: { value: 0.0, min: -3.14, max: 3.14, step: 0.1, name: "Camera Roll" },
            path_stability: { value: 1.0, min: -1.0, max: 1.0, step: 0.05, name: "Path Stability" },
            path_scale: { value: 1.0, min: -3.0, max: 3.0, step: 0.1, name: "Path Scale" },
            color_speed: { value: 0.5, min: 0.0, max: 2.0, step: 0.1, name: "Color Speed" }
        };

        // Time accumulation
        this.timeAccumulation = {
            camera_position: 0.0,
            rotation_time: 0.0,
            plane_rotation_time: 0.0,
            color_time: 0.0
        };

        // Color palettes
        this.colorPalettes = [
            { name: "B&W", a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.0, 0.0, 0.0] },
            { name: "Rainbow", a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.0, 0.33, 0.67] },
            { name: "Fire", a: [0.5, 0.2, 0.1], b: [0.5, 0.3, 0.2], c: [2.0, 1.0, 0.5], d: [0.0, 0.25, 0.5] },
            { name: "Ocean", a: [0.2, 0.5, 0.8], b: [0.2, 0.3, 0.5], c: [1.0, 1.5, 2.0], d: [0.0, 0.2, 0.5] },
            { name: "Purple", a: [0.8, 0.5, 0.4], b: [0.2, 0.4, 0.2], c: [2.0, 1.0, 1.0], d: [0.0, 0.25, 0.25] },
            { name: "Neon", a: [0.2, 0.2, 0.2], b: [0.8, 0.8, 0.8], c: [1.0, 2.0, 1.5], d: [0.0, 0.5, 0.8] },
            { name: "Sunset", a: [0.7, 0.3, 0.2], b: [0.3, 0.2, 0.1], c: [1.5, 1.0, 0.8], d: [0.0, 0.1, 0.3] }
        ];

        // Parameter keys in the order they appear in the menu display
        this.parameterKeys = [
            // MOVEMENT & ANIMATION
            'fly_speed', 'rotation_speed', 'plane_rotation_speed', 'zoom_level',
            // PATTERN & VISUAL  
            'kaleidoscope_segments', 'truchet_radius', 'center_fill_radius', 'layer_count', 'contrast', 'color_intensity',
            // CAMERA & PATH
            'camera_tilt_x', 'camera_tilt_y', 'camera_roll', 'path_stability', 'path_scale',
            // COLOR & SPEED
            'color_speed'
        ];
    }

    // Get parameter by key
    getParameter(key) {
        return this.parameters[key];
    }

    // Get parameter value
    getValue(key) {
        return this.parameters[key]?.value ?? 0;
    }

    // Set parameter value (with bounds checking)
    setValue(key, value) {
        const param = this.parameters[key];
        if (param) {
            param.value = Math.max(param.min, Math.min(param.max, value));
            
            // Special handling for certain parameters
            if (key === 'kaleidoscope_segments') {
                param.value = Math.round(param.value / 2) * 2;
            }
        }
    }

    // Adjust parameter by delta
    adjustParameter(key, delta) {
        const param = this.parameters[key];
        if (param) {
            this.setValue(key, param.value + delta * param.step);
        }
    }

    // Get all parameter keys
    getParameterKeys() {
        return this.parameterKeys;
    }

    // Get color palettes
    getColorPalettes() {
        return this.colorPalettes;
    }

    // Get palette by index
    getPalette(index) {
        return this.colorPalettes[index];
    }

    // Update time accumulation
    updateTimeAccumulation(deltaTime) {
        this.timeAccumulation.camera_position += this.getValue('fly_speed') * deltaTime;
        this.timeAccumulation.rotation_time += this.getValue('rotation_speed') * deltaTime;
        this.timeAccumulation.plane_rotation_time += this.getValue('plane_rotation_speed') * deltaTime;
        this.timeAccumulation.color_time += this.getValue('color_speed') * deltaTime;
    }

    // Reset current parameter to default
    resetParameter(key) {
        const defaults = {
            fly_speed: 0.25, contrast: 1.0, kaleidoscope_segments: 10.0,
            truchet_radius: 0.35, center_fill_radius: 0.0, layer_count: 6,
            rotation_speed: 0.025, zoom_level: 0.3, color_intensity: 1.0,
            plane_rotation_speed: 0.5, camera_tilt_x: 0.0, camera_tilt_y: 0.0,
            camera_roll: 0.0, path_stability: 1.0, path_scale: 1.0, color_speed: 0.5
        };
        
        if (defaults[key] !== undefined) {
            this.setValue(key, defaults[key]);
        }
    }

    // Reset all parameters to defaults
    resetAllParameters() {
        this.parameterKeys.forEach(key => {
            this.resetParameter(key);
        });
    }

    // Randomize parameters with smart ranges
    randomizeParameters() {
        const excludeParams = ['color_intensity', 'color_speed'];
        
        // Define reasonable randomization ranges
        const randomRanges = {
            fly_speed: { min: -1.0, max: 2.0 },
            contrast: { min: 0.5, max: 3.0 },
            kaleidoscope_segments: { min: 6.0, max: 32.0 },
            truchet_radius: { min: 0.1, max: 0.8 },
            center_fill_radius: { min: -0.5, max: 0.5 },
            layer_count: { min: 4, max: 8 },
            rotation_speed: { min: -2.0, max: 2.0 },
            zoom_level: { min: 0.1, max: 2.0 },
            plane_rotation_speed: { min: -2.0, max: 2.0 },
            camera_tilt_x: { min: -3.0, max: 3.0 },
            camera_tilt_y: { min: -3.0, max: 3.0 },
            camera_roll: { min: -1.0, max: 1.0 },
            path_stability: { min: -0.5, max: 1.0 },
            path_scale: { min: 0.5, max: 2.0 }
        };
        
        Object.keys(this.parameters).forEach(key => {
            if (excludeParams.includes(key)) return;
            
            const param = this.parameters[key];
            const range = randomRanges[key];
            
            if (range) {
                // Use reasonable range for randomization
                param.value = Math.random() * (range.max - range.min) + range.min;
            } else {
                // Fallback to full range if not specified
                param.value = Math.random() * (param.max - param.min) + param.min;
            }
            
            param.value = Math.round(param.value / param.step) * param.step;
            
            if (key === 'kaleidoscope_segments') {
                param.value = Math.round(param.value / 2) * 2;
            }
            
            // Clamp to actual parameter bounds
            param.value = Math.max(param.min, Math.min(param.max, param.value));
        });
    }

    // State management for undo/redo
    getState() {
        const state = {};
        Object.keys(this.parameters).forEach(key => {
            state[key] = this.parameters[key].value;
        });
        return state;
    }

    setState(state) {
        Object.keys(state).forEach(key => {
            if (this.parameters[key]) {
                this.parameters[key].value = state[key];
            }
        });
    }

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

    // Randomize color palette
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
}