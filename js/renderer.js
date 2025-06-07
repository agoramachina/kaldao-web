// WebGL renderer module
export class Renderer {
    constructor() {
        this.gl = null;
        this.canvas = null;
        this.program = null;
        this.uniforms = {};
    }

    async init() {
        try {
            this.canvas = document.getElementById('canvas');
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            
            this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
            if (!this.gl) throw new Error('WebGL not supported');
            
            await this.setupShaders();
            this.setupGeometry();
            this.setupUniforms();
            
        } catch (error) {
            throw new Error(`Renderer initialization failed: ${error.message}`);
        }
    }

    async setupShaders() {
        const vertexShaderSource = await this.loadShader('../shaders/vertex.glsl');
        const fragmentShaderSource = await this.loadShader('../shaders/fragment.glsl');
        
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.program = this.createProgram(vertexShader, fragmentShader);
    }

    async loadShader(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load shader: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            // Fallback: provide inline shaders if external files fail to load
            console.warn(`Failed to load external shader ${url}, using fallback`);
            
            if (url.includes('vertex')) {
                return `
                    attribute vec2 a_position;
                    void main() {
                        gl_Position = vec4(a_position, 0.0, 1.0);
                    }
                `;
            } else {
                return this.getFallbackFragmentShader();
            }
        }
    }

    getFallbackFragmentShader() {
        return `
            precision highp float;
            
            uniform vec2 u_resolution;
            uniform float u_time;
            uniform float u_camera_position;
            uniform float u_rotation_time;
            uniform float u_plane_rotation_time;
            uniform float u_color_time;
            uniform float u_fly_speed;
            uniform float u_contrast;
            uniform float u_kaleidoscope_segments;
            uniform float u_layer_count;
            uniform float u_truchet_radius;
            uniform float u_center_fill_radius;
            uniform float u_rotation_speed;
            uniform float u_plane_rotation_speed;
            uniform float u_zoom_level;
            uniform float u_color_intensity;
            uniform float u_camera_tilt_x;
            uniform float u_camera_tilt_y;
            uniform float u_camera_roll;
            uniform float u_path_stability;
            uniform float u_path_scale;
            uniform float u_use_color_palette;
            uniform float u_invert_colors;
            uniform float u_color_speed;
            uniform vec3 u_palette_a;
            uniform vec3 u_palette_b;
            uniform vec3 u_palette_c;
            uniform vec3 u_palette_d;
            
            #define PI 3.14159265359
            
            mat2 ROT(float a) {
                return mat2(cos(a), sin(a), -sin(a), cos(a));
            }
            
            float hashf(float co) {
                return fract(sin(co * 12.9898) * 13758.5453);
            }
            
            float hashv(vec2 p) {
                float a = dot(p, vec2(127.1, 311.7));
                return fract(sin(a) * 43758.5453123);
            }
            
            float tanh_approx(float x) {
                float x2 = x * x;
                return clamp(x * (27.0 + x2) / (27.0 + 9.0 * x2), -1.0, 1.0);
            }
            
            float pmin(float a, float b, float k) {
                float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
                return mix(b, a, h) - k * h * (1.0 - h);
            }
            
            float pmax(float a, float b, float k) {
                return -pmin(-a, -b, k);
            }
            
            float pabs(float a, float k) {
                return pmax(a, -a, k);
            }
            
            vec2 toPolar(vec2 p) {
                return vec2(length(p), atan(p.y, p.x));
            }
            
            vec2 toRect(vec2 p) {
                return vec2(p.x * cos(p.y), p.x * sin(p.y));
            }
            
            vec3 palette(float t) {
                return u_palette_a + u_palette_b * cos(6.28318 * (u_palette_c * t + u_palette_d));
            }
            
            vec3 offset(float z) {
                float a = z;
                vec2 curved_path = -0.075 * u_path_scale * (
                    vec2(cos(a), sin(a * sqrt(2.0))) +
                    vec2(cos(a * sqrt(0.75)), sin(a * sqrt(0.5)))
                );
                
                vec2 straight_path = vec2(0.0);
                
                vec2 p;
                if (u_path_stability >= 0.0) {
                    p = mix(curved_path, straight_path, u_path_stability);
                } else {
                    p = curved_path * (1.0 + abs(u_path_stability) * 2.0);
                }
                
                p += vec2(u_camera_tilt_x, u_camera_tilt_y) * z * 0.1 * u_path_scale;
                
                return vec3(p, z);
            }
            
            vec3 doffset(float z) {
                float eps = 0.1;
                return 0.5 * (offset(z + eps) - offset(z - eps)) / eps;
            }
            
            vec3 ddoffset(float z) {
                float eps = 0.1;
                return 0.125 * (doffset(z + eps) - doffset(z - eps)) / eps;
            }
            
            float modMirror1(inout float p, float size) {
                float halfsize = size * 0.5;
                float c = floor((p + halfsize) / size);
                p = mod(p + halfsize, size) - halfsize;
                p *= mod(c, 2.0) * 2.0 - 1.0;
                return c;
            }
            
            float smoothKaleidoscope(inout vec2 p, float sm, float rep) {
                vec2 hp = p;
                vec2 hpp = toPolar(hp);
                
                float rn = modMirror1(hpp.y, 2.0 * PI / rep);
                
                float sa = PI / rep - pabs(PI / rep - abs(hpp.y), sm);
                hpp.y = sign(hpp.y) * sa;
                
                hp = toRect(hpp);
                p = hp;
                
                return rn;
            }
            
            vec3 cell_df(float r, vec2 np, vec2 mp, vec2 off) {
                vec2 n0 = normalize(vec2(1.0, 1.0));
                vec2 n1 = normalize(vec2(1.0, -1.0));
                
                np += off;
                mp -= off;
                
                float hh = hashv(np);
                float h0 = hh;
                
                vec2 p0 = mp;
                p0 = abs(p0);
                p0 -= 0.5;
                float d0 = length(p0);
                float d1 = abs(d0 - r);
                
                float dot0 = dot(n0, mp);
                float dot1 = dot(n1, mp);
                
                float d2 = abs(dot0);
                float t2 = dot1;
                d2 = abs(t2) > sqrt(0.5) ? d0 : d2;
                
                float d3 = abs(dot1);
                float t3 = dot0;
                d3 = abs(t3) > sqrt(0.5) ? d0 : d3;
                
                float d = d0;
                d = min(d, d1);
                
                if (h0 > 0.85) {
                    d = min(d, d2);
                    d = min(d, d3);
                } else if (h0 > 0.5) {
                    d = min(d, d2);
                } else if (h0 > 0.15) {
                    d = min(d, d3);
                }
                
                float center_circle_factor = length(mp) <= r ? 1.0 : 0.0;
                return vec3(d, (d0 - r), center_circle_factor);
            }
            
            vec3 truchet_df(float r, vec2 p) {
                vec2 np = floor(p + 0.5);
                vec2 mp = fract(p + 0.5) - 0.5;
                return cell_df(r, np, mp, vec2(0.0));
            }
            
            vec4 alphaBlend(vec4 back, vec4 front) {
                float w = front.w + back.w * (1.0 - front.w);
                vec3 xyz = (front.xyz * front.w + back.xyz * back.w * (1.0 - front.w)) / w;
                return w > 0.0 ? vec4(xyz, w) : vec4(0.0);
            }
            
            vec3 alphaBlend34(vec3 back, vec4 front) {
                return mix(back, front.xyz, front.w);
            }
            
            vec4 plane(vec3 ro, vec3 rd, vec3 pp, vec3 off, float aa, float n) {
                float h_ = hashf(n);
                float h0 = fract(1777.0 * h_);
                float h1 = fract(2087.0 * h_);
                float h4 = fract(3499.0 * h_);
                
                float l = length(pp - ro);
                
                vec2 p = (pp - off * vec3(1.0, 1.0, 0.0)).xy;
                vec2 original_p = p;
                
                p = ROT(u_plane_rotation_time * (h4 - 0.5)) * p;
                
                float rep = u_kaleidoscope_segments;
                float sm = 0.05 * 20.0 / rep;
                float sn = smoothKaleidoscope(p, sm, rep);
                
                p = ROT(2.0 * PI * h0 + u_rotation_time) * p;
                
                float z = u_zoom_level;
                p /= z;
                p += 0.5 + floor(h1 * 1000.0);
                
                float tl = tanh_approx(0.33 * l);
                float r = u_truchet_radius;
                vec3 d3 = truchet_df(r, p);
                d3.xy *= z;
                float d = d3.x;
                float lw = 0.025 * z;
                d -= lw;
                
                vec3 col = mix(vec3(1.0), vec3(0.0), smoothstep(aa, -aa, d));
                col = mix(col, vec3(0.0), smoothstep(mix(1.0, -0.5, tl), 1.0, sin(PI * 100.0 * d)));
                
                float center_distance = length(original_p);
                float center_edge = smoothstep(u_center_fill_radius + aa, u_center_fill_radius - aa, center_distance);
                float transparency = 0.99;
                col = mix(col, vec3(0.0), center_edge * (u_center_fill_radius > 0.01 ? 1.0 : 0.0) * transparency);
                
                float t = smoothstep(aa, -aa, -d3.y - 3.0 * lw) *
                         mix(0.5, 1.0, smoothstep(aa, -aa, -d3.y - lw));
                
                col = mix(col, vec3(0.01), d3.y <= 0.0 ? 1.0 : 0.0);
                
                return vec4(col, t);
            }
            
            vec3 skyColor(vec3 ro, vec3 rd) {
                float d = pow(max(dot(rd, vec3(0.0, 0.0, 1.0)), 0.0), 20.0);
                return vec3(d);
            }
            
            vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p) {
                float lp = length(p);
                vec2 np = p + 1.0 / (u_resolution * u_contrast);
                float rdd = (2.0 + 1.0 * tanh_approx(lp));
                
                vec3 rd = normalize(p.x * uu + p.y * vv + rdd * ww);
                vec3 nrd = normalize(np.x * uu + np.y * vv + rdd * ww);
                
                float planeDist = 1.0 - 0.25;
                float furthest = u_layer_count;
                float fadeFrom = max(furthest - 5.0, 0.0);
                
                float nz = floor(ro.z / planeDist);
                
                vec3 skyCol = skyColor(ro, rd);
                
                vec4 acol = vec4(0.0);
                float cutOff = 0.95;
                
                for (float i = 1.0; i <= 10.0; i += 1.0) {
                    if (i > furthest) break;
                    
                    float pz = planeDist * nz + planeDist * i;
                    float pd = (pz - ro.z) / rd.z;
                    
                    if (pd > 0.0 && acol.w < cutOff) {
                        vec3 pp = ro + rd * pd;
                        vec3 npp = ro + nrd * pd;
                        
                        float aa = 3.0 * length(pp - npp);
                        vec3 off = offset(pp.z);
                        
                        vec4 pcol = plane(ro, rd, pp, off, aa, nz + i);
                        
                        float nz1 = pp.z - ro.z;
                        float fadeIn = smoothstep(planeDist * furthest, planeDist * fadeFrom, nz1);
                        float fadeOut = smoothstep(0.0, planeDist * 0.1, nz1);
                        
                        pcol.xyz = mix(skyCol, pcol.xyz, fadeIn);
                        pcol.w *= fadeOut;
                        pcol = clamp(pcol, 0.0, 1.0);
                        
                        acol = alphaBlend(pcol, acol);
                    }
                }
                
                vec3 col = alphaBlend34(skyCol, acol);
                return col;
            }
            
            vec3 effect(vec2 p, vec2 q) {
                vec3 ro = offset(u_camera_position);
                vec3 dro = doffset(u_camera_position);
                vec3 ddro = ddoffset(u_camera_position);
                
                vec3 ww = normalize(dro);
                vec3 uu = normalize(cross(
                    normalize(vec3(0.0, 1.0, 0.0) + ddro),
                    ww
                ));
                vec3 vv = normalize(cross(ww, uu));
                
                if (abs(u_camera_roll) > 0.001) {
                    mat2 roll_rot = ROT(u_camera_roll);
                    p = roll_rot * p;
                }
                
                vec3 col = color(ww, uu, vv, ro, p);
                
                return col;
            }
            
            vec3 postProcess(vec3 col, vec2 q) {
                if (u_use_color_palette > 0.5) {
                    float t = length(col) + u_color_time;
                    col = palette(t) * length(col);
                }
                
                col = clamp(col, 0.0, 1.0);
                col = pow(col, vec3(1.0 / 2.2));
                col = col * 0.6 + 0.4 * col * col * (3.0 - 2.0 * col);
                col = mix(col, vec3(dot(col, vec3(0.33))), -0.4);
                
                col *= 0.5 + 0.5 * pow(19.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.7);
                col *= u_color_intensity;
                
                if (u_invert_colors > 0.5) {
                    col = vec3(1.0) - col;
                }
                
                return col;
            }
            
            void main() {
                vec2 q = gl_FragCoord.xy / u_resolution.xy;
                vec2 p = -1.0 + 2.0 * q;
                p.x *= u_resolution.x / u_resolution.y;
                
                vec3 col = effect(p, q);
                col = postProcess(col, q);
                
                gl_FragColor = vec4(col, 1.0);
            }
        `;
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const error = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${error}`);
        }
        return shader;
    }

    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const error = this.gl.getProgramInfoLog(program);
            this.gl.deleteProgram(program);
            throw new Error(`Program linking failed: ${error}`);
        }
        return program;
    }

    setupGeometry() {
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1, 1, 1
        ]), this.gl.STATIC_DRAW);
        
        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    setupUniforms() {
        const uniformNames = [
            'u_resolution', 'u_time', 'u_camera_position', 'u_rotation_time',
            'u_plane_rotation_time', 'u_color_time', 'u_fly_speed', 'u_contrast',
            'u_kaleidoscope_segments', 'u_layer_count', 'u_truchet_radius',
            'u_center_fill_radius', 'u_rotation_speed', 'u_plane_rotation_speed',
            'u_zoom_level', 'u_color_intensity', 'u_camera_tilt_x', 'u_camera_tilt_y',
            'u_camera_roll', 'u_path_stability', 'u_path_scale', 'u_use_color_palette',
            'u_invert_colors', 'u_color_speed', 'u_palette_a', 'u_palette_b',
            'u_palette_c', 'u_palette_d'
        ];
        
        uniformNames.forEach(name => {
            this.uniforms[name] = this.gl.getUniformLocation(this.program, name);
        });
    }

    handleResize() {
        if (this.canvas && this.gl) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    render(parameters, renderState) {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.program);
        
        // Set all uniforms
        this.gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.uniforms.u_time, performance.now() * 0.001);
        this.gl.uniform1f(this.uniforms.u_camera_position, parameters.timeAccumulation.camera_position);
        this.gl.uniform1f(this.uniforms.u_rotation_time, parameters.timeAccumulation.rotation_time);
        this.gl.uniform1f(this.uniforms.u_plane_rotation_time, parameters.timeAccumulation.plane_rotation_time);
        this.gl.uniform1f(this.uniforms.u_color_time, parameters.timeAccumulation.color_time);
        
        // Set parameter uniforms
        parameters.getParameterKeys().forEach(key => {
            const uniformName = `u_${key}`;
            if (this.uniforms[uniformName] !== undefined) {
                this.gl.uniform1f(this.uniforms[uniformName], parameters.getValue(key));
            }
        });
        
        // Set render state uniforms
        this.gl.uniform1f(this.uniforms.u_use_color_palette, renderState.useColorPalette ? 1.0 : 0.0);
        this.gl.uniform1f(this.uniforms.u_invert_colors, renderState.invertColors ? 1.0 : 0.0);
        
        // Set palette uniforms
        const palette = parameters.getPalette(renderState.currentPaletteIndex);
        if (palette) {
            this.gl.uniform3f(this.uniforms.u_palette_a, palette.a[0], palette.a[1], palette.a[2]);
            this.gl.uniform3f(this.uniforms.u_palette_b, palette.b[0], palette.b[1], palette.b[2]);
            this.gl.uniform3f(this.uniforms.u_palette_c, palette.c[0], palette.c[1], palette.c[2]);
            this.gl.uniform3f(this.uniforms.u_palette_d, palette.d[0], palette.d[1], palette.d[2]);
        }
        
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
}