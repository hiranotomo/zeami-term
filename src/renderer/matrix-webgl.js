/**
 * Matrix WebGL - Advanced visual effects and load testing for ZeamiTerm
 * Uses WebGL for high-performance rendering with various effects
 */

class MatrixWebGL {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.program = null;
    this.animationId = null;
    this.startTime = Date.now();
    
    // Effect parameters
    this.params = {
      dropSpeed: 0.02,
      dropDensity: 0.1,
      glowIntensity: 1.0,
      blurAmount: 0.0,
      perspective: 0.0,
      rainbowMode: false,
      particleCount: 1000,
      textureMode: false
    };
    
    // Performance metrics
    this.metrics = {
      fps: 0,
      frameCount: 0,
      lastTime: Date.now(),
      drawCalls: 0
    };
    
    this.init();
  }
  
  init() {
    // Get WebGL context
    this.gl = this.canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    
    if (!this.gl) {
      console.error('WebGL2 not supported');
      return false;
    }
    
    // Set canvas size
    this.resize();
    
    // Create shaders
    this.createShaders();
    
    // Setup buffers
    this.setupBuffers();
    
    // Setup event listeners
    window.addEventListener('resize', () => this.resize());
    
    return true;
  }
  
  createShaders() {
    const vertexShaderSource = `#version 300 es
      in vec2 a_position;
      in vec2 a_texCoord;
      
      uniform mat4 u_projection;
      uniform float u_time;
      uniform float u_perspective;
      
      out vec2 v_texCoord;
      out float v_depth;
      
      void main() {
        vec4 position = vec4(a_position, 0.0, 1.0);
        
        // Apply perspective distortion
        if (u_perspective > 0.0) {
          float z = sin(a_position.y * 3.14159) * u_perspective;
          position.z = z;
          position.xy *= 1.0 - z * 0.5;
        }
        
        gl_Position = u_projection * position;
        v_texCoord = a_texCoord;
        v_depth = position.z;
      }
    `;
    
    const fragmentShaderSource = `#version 300 es
      precision highp float;
      
      in vec2 v_texCoord;
      in float v_depth;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_dropSpeed;
      uniform float u_dropDensity;
      uniform float u_glowIntensity;
      uniform float u_blurAmount;
      uniform bool u_rainbowMode;
      
      out vec4 fragColor;
      
      // Random function
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      // Character rendering
      float character(vec2 uv, float seed) {
        float char = random(vec2(floor(seed * 10.0), 0.0));
        vec2 charUV = fract(uv * 20.0);
        
        // Simple character pattern
        float pattern = step(0.2, charUV.x) * step(charUV.x, 0.8) *
                       step(0.1, charUV.y) * step(charUV.y, 0.9);
        
        return pattern * char;
      }
      
      // Matrix rain effect
      vec3 matrixRain(vec2 uv) {
        vec2 pos = uv * vec2(50.0, 30.0);
        vec2 cell = floor(pos);
        vec2 cellUV = fract(pos);
        
        float column = cell.x;
        float speed = random(vec2(column, 0.0)) * 0.5 + u_dropSpeed;
        float offset = random(vec2(column, 1.0)) * 10.0;
        
        float y = fract((u_time * speed + offset) * 0.1);
        float trail = smoothstep(0.0, 0.5, y) * smoothstep(1.0, 0.5, y);
        
        // Character at current position
        float char = character(cellUV, u_time + column);
        
        // Glow effect
        float glow = trail * char;
        
        // Color
        vec3 color;
        if (u_rainbowMode) {
          float hue = fract(u_time * 0.1 + column * 0.02);
          color = vec3(
            sin(hue * 6.28318 + 0.0) * 0.5 + 0.5,
            sin(hue * 6.28318 + 2.094) * 0.5 + 0.5,
            sin(hue * 6.28318 + 4.189) * 0.5 + 0.5
          );
        } else {
          color = vec3(0.0, 1.0, 0.0);
        }
        
        return color * glow * u_glowIntensity;
      }
      
      // Blur effect
      vec3 blur(vec2 uv, float amount) {
        vec3 result = vec3(0.0);
        float total = 0.0;
        
        for (float x = -2.0; x <= 2.0; x += 1.0) {
          for (float y = -2.0; y <= 2.0; y += 1.0) {
            vec2 offset = vec2(x, y) * amount / u_resolution;
            float weight = exp(-(x*x + y*y) * 0.5);
            result += matrixRain(uv + offset) * weight;
            total += weight;
          }
        }
        
        return result / total;
      }
      
      void main() {
        vec2 uv = v_texCoord;
        
        // Apply matrix effect
        vec3 color;
        if (u_blurAmount > 0.0) {
          color = blur(uv, u_blurAmount);
        } else {
          color = matrixRain(uv);
        }
        
        // Apply depth fog for 3D effect
        if (u_perspective > 0.0) {
          float fog = 1.0 - v_depth * 2.0;
          color *= fog;
        }
        
        // Add some noise for realism
        color += (random(uv + u_time) - 0.5) * 0.05;
        
        fragColor = vec4(color, 1.0);
      }
    `;
    
    // Create and compile shaders
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) {
      console.error('Failed to create shaders');
      return;
    }
    
    // Create program
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);
    
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Failed to link program:', this.gl.getProgramInfoLog(this.program));
      return;
    }
    
    // Get uniform locations
    this.uniforms = {
      time: this.gl.getUniformLocation(this.program, 'u_time'),
      resolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
      projection: this.gl.getUniformLocation(this.program, 'u_projection'),
      dropSpeed: this.gl.getUniformLocation(this.program, 'u_dropSpeed'),
      dropDensity: this.gl.getUniformLocation(this.program, 'u_dropDensity'),
      glowIntensity: this.gl.getUniformLocation(this.program, 'u_glowIntensity'),
      blurAmount: this.gl.getUniformLocation(this.program, 'u_blurAmount'),
      perspective: this.gl.getUniformLocation(this.program, 'u_perspective'),
      rainbowMode: this.gl.getUniformLocation(this.program, 'u_rainbowMode')
    };
  }
  
  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Failed to compile shader:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }
  
  setupBuffers() {
    // Create a full-screen quad
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);
    
    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0
    ]);
    
    // Position buffer
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
    
    // Texture coordinate buffer
    this.texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
    
    // Create VAO
    this.vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(this.vao);
    
    // Setup attributes
    const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    
    const texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
  }
  
  resize() {
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;
    
    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      this.gl.viewport(0, 0, displayWidth, displayHeight);
    }
  }
  
  render() {
    // Update FPS
    this.updateMetrics();
    
    // Clear
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    
    // Use program
    this.gl.useProgram(this.program);
    this.gl.bindVertexArray(this.vao);
    
    // Update uniforms
    const time = (Date.now() - this.startTime) / 1000;
    this.gl.uniform1f(this.uniforms.time, time);
    this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    
    // Projection matrix (orthographic)
    const projection = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
    this.gl.uniformMatrix4fv(this.uniforms.projection, false, projection);
    
    // Effect parameters
    this.gl.uniform1f(this.uniforms.dropSpeed, this.params.dropSpeed);
    this.gl.uniform1f(this.uniforms.dropDensity, this.params.dropDensity);
    this.gl.uniform1f(this.uniforms.glowIntensity, this.params.glowIntensity);
    this.gl.uniform1f(this.uniforms.blurAmount, this.params.blurAmount);
    this.gl.uniform1f(this.uniforms.perspective, this.params.perspective);
    this.gl.uniform1i(this.uniforms.rainbowMode, this.params.rainbowMode);
    
    // Draw
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.metrics.drawCalls++;
    
    // Continue animation
    this.animationId = requestAnimationFrame(() => this.render());
  }
  
  updateMetrics() {
    this.metrics.frameCount++;
    const currentTime = Date.now();
    const elapsed = currentTime - this.metrics.lastTime;
    
    if (elapsed >= 1000) {
      this.metrics.fps = Math.round(this.metrics.frameCount * 1000 / elapsed);
      this.metrics.frameCount = 0;
      this.metrics.lastTime = currentTime;
    }
  }
  
  // Public methods for controlling effects
  start() {
    if (!this.animationId) {
      this.render();
    }
  }
  
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  setEffect(effect, value) {
    if (this.params.hasOwnProperty(effect)) {
      this.params[effect] = value;
    }
  }
  
  getMetrics() {
    return {
      fps: this.metrics.fps,
      drawCalls: this.metrics.drawCalls
    };
  }
  
  // Stress test modes
  enableStressTest(level = 1) {
    switch (level) {
      case 1: // Light
        this.params.dropSpeed = 0.05;
        this.params.dropDensity = 0.2;
        this.params.blurAmount = 0;
        break;
      case 2: // Medium
        this.params.dropSpeed = 0.1;
        this.params.dropDensity = 0.5;
        this.params.blurAmount = 2;
        this.params.glowIntensity = 2;
        break;
      case 3: // Heavy
        this.params.dropSpeed = 0.2;
        this.params.dropDensity = 1.0;
        this.params.blurAmount = 5;
        this.params.glowIntensity = 3;
        this.params.perspective = 0.5;
        this.params.rainbowMode = true;
        break;
      case 4: // Extreme
        this.params.dropSpeed = 0.5;
        this.params.dropDensity = 2.0;
        this.params.blurAmount = 10;
        this.params.glowIntensity = 5;
        this.params.perspective = 1.0;
        this.params.rainbowMode = true;
        // Add particle effects
        this.addParticleEffect();
        break;
    }
  }
  
  addParticleEffect() {
    // TODO: Implement additional particle system for extreme stress test
    console.log('Extreme stress test activated with particle effects');
  }
  
  destroy() {
    this.stop();
    
    // Clean up WebGL resources
    if (this.gl) {
      this.gl.deleteBuffer(this.positionBuffer);
      this.gl.deleteBuffer(this.texCoordBuffer);
      this.gl.deleteVertexArray(this.vao);
      this.gl.deleteProgram(this.program);
    }
  }
}

// Export for use
window.MatrixWebGL = MatrixWebGL;