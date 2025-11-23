export type UniformType = 'float' | 'vec2' | 'vec3' | 'vec4' | 'int' | 'sampler2D';
export type RenderMode = 'fullscreen' | 'instanced';

/**
 * Defines a single vertex attribute for a WebGL buffer.
 */
export interface AttributeOptions {
  /** The size of the attribute (number of components, e.g., 3 for a vec3). */
  size: 1 | 2 | 3 | 4;
  /** The data type of the attribute. Defaults to 'FLOAT'. */
  type?: 'FLOAT' | 'UNSIGNED_BYTE'; // Add more as needed
  /** Whether this attribute is instanced (advances per instance, not per vertex). Defaults to false. */
  instanced?: boolean;
}

/**
 * Configuration for the ShaderUp instance.
 */
export interface ShaderUpOptions {
  /** The rendering mode. 'fullscreen' for a simple fragment shader, 'instanced' for hardware instancing. */
  renderMode?: RenderMode;
  /** The ID of the canvas element in the DOM. */
  canvasId?: string;
  /** Direct reference to a canvas element. Takes precedence over canvasId. */
  canvas?: HTMLCanvasElement;
  /** The source code for the fragment shader. */
  fragmentShader: string;
  /** Optional source code for the vertex shader. Defaults to a shader appropriate for the renderMode. */
  vertexShader?: string;
  /** Map of uniform names to their types. */
  uniforms?: { [name: string]: UniformType };
  /**
   * For 'instanced' mode, defines the layout of the vertex buffer.
   * The order of attributes must match the interleaved buffer layout.
   */
  attributes?: { [name: string]: AttributeOptions };
  /**
   * For 'instanced' mode, the number of instances to draw.
   */
  numInstances?: number;
  /** Optional callback triggered when the canvas is resized. */
  onResize?: (width: number, height: number) => void;
}


interface UniformInfo {
  location: WebGLUniformLocation;
  type: UniformType;
  textureUnit?: number;
}

/**
 * ShaderUp: A lightweight WebGL boilerplate for fragment shader rendering.
 * Handles context management, resizing, render loops, and uniform binding.
 */
export class ShaderUp {
  // --- Constants for GLSL Conventions ---
  public static readonly UNIFORM_TIME = 'u_time';
  public static readonly UNIFORM_RESOLUTION = 'u_resolution';
  public static readonly ATTRIB_POSITION = 'a_position';

  // --- Public Readonly Properties ---
  public readonly canvas: HTMLCanvasElement;
  public readonly gl: WebGLRenderingContext | WebGL2RenderingContext;
  
  /**
   * Public object to update custom uniform values.
   * @example shader.uniforms.u_speed = 0.5;
   */
  public readonly uniforms: { [name: string]: any } = {};

  // --- Private Internal State ---
  private readonly renderMode: RenderMode;
  private readonly attributeOptions?: { [name: string]: AttributeOptions };
  private numInstances: number;

  // --- Private Internal State ---
  private program: WebGLProgram | null = null;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private isDestroyed = false;
  private uniformInfo: Map<string, UniformInfo> = new Map();
  private textures: Map<number, WebGLTexture> = new Map();
  private instanceBuffer: WebGLBuffer | null = null;
  
  // Cache locations for standard uniforms to avoid map lookups in the loop
  private timeLocation: WebGLUniformLocation | null = null;
  private resolutionLocation: WebGLUniformLocation | null = null;
  
  // Pre-bound render function to prevent garbage collection thrashing
  private readonly boundRender: (time: number) => void;

  /**
   * Creates a new ShaderUp instance.
   * @param options Configuration options.
   * @throws Error if WebGL is not supported or canvas is missing.
   */
  constructor(options: ShaderUpOptions) {
    this.renderMode = options.renderMode || 'fullscreen';
    
    // Validate options for instanced mode
    if (this.renderMode === 'instanced') {
      if (!options.numInstances) {
        throw new Error("[ShaderUp] 'numInstances' is required for 'instanced' renderMode.");
      }
      if (!options.attributes) {
        throw new Error("[ShaderUp] 'attributes' are required for 'instanced' renderMode.");
      }
      this.numInstances = options.numInstances;
      this.attributeOptions = options.attributes;
    } else {
      this.numInstances = 0;
    }

    // 1. Resolve Canvas
    if (options.canvas) {
      this.canvas = options.canvas;
    } else if (options.canvasId) {
      const el = document.getElementById(options.canvasId) as HTMLCanvasElement;
      if (!el) throw new Error(`[ShaderUp] Canvas #${options.canvasId} not found.`);
      this.canvas = el;
    } else {
      const el = document.querySelector('canvas');
      if (!el) throw new Error("[ShaderUp] No <canvas> element found on page.");
      this.canvas = el;
    }

    // 2. Initialize Context (Prefer WebGL 2, Fallback to WebGL 1)
    const contextAttributes: WebGLContextAttributes = { 
      alpha: true, // Alpha needed for overlays
      antialias: false 
    }; 
    
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null;

    if (this.renderMode === 'instanced') {
      gl = this.canvas.getContext('webgl2', contextAttributes) as WebGL2RenderingContext;
      if (!gl) throw new Error("[ShaderUp] WebGL2 is required for 'instanced' renderMode.");
    } else {
      gl = this.canvas.getContext('webgl2', contextAttributes) as WebGL2RenderingContext;
      if (!gl) {
        gl = this.canvas.getContext('webgl', contextAttributes) as WebGLRenderingContext;
      }
    }
    
    if (!gl) throw new Error("[ShaderUp] WebGL not supported in this browser.");
    this.gl = gl;


    // 3. Bind Robustness Events
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);

    // 4. Setup Resources
    this.initResources(options);

    // 5. Setup Resize Observer
    this.resizeObserver = new ResizeObserver(() => this.handleResize(options.onResize));
    this.resizeObserver.observe(this.canvas);
    
    // 6. Bind Loop
    this.boundRender = this.render.bind(this);
  }

  /**
   * Internal method to compile shaders and setup buffers.
   * Separated to allow re-initialization on context restoration.
   */
  private initResources(options: ShaderUpOptions): void {
    const { gl } = this;
    
    const vsSource = options.vertexShader || this.getDefaultVertexShader();
    const vertexShader = this.createShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, options.fragmentShader);
    
    this.program = this.createProgram(vertexShader, fragmentShader);

    // Clean up individual shaders as they are now linked into the program
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (this.renderMode === 'fullscreen') {
      this.initFullscreenResources();
    } else {
      this.initInstancedResources();
    }

    // Cache Standard Uniform Locations
    this.timeLocation = gl.getUniformLocation(this.program, ShaderUp.UNIFORM_TIME);
    this.resolutionLocation = gl.getUniformLocation(this.program, ShaderUp.UNIFORM_RESOLUTION);

    // Process Custom Uniforms
    if (options.uniforms) {
      let texUnitCount = 0;
      for (const [name, type] of Object.entries(options.uniforms)) {
        const location = gl.getUniformLocation(this.program, name);
        if (!location) {
          console.warn(`[ShaderUp] Uniform "${name}" not found in shader source (it may be unused and optimized out).`);
          continue;
        }

        const info: UniformInfo = { location, type };

        if (type === 'sampler2D') {
          info.textureUnit = texUnitCount++;
        }

        this.uniformInfo.set(name, info);
        this.uniforms[name] = this.getDefaultUniformValue(type);
      }
    }
    
    // Initial resize to set viewport
    this.handleResize(options.onResize);
  }

  private initFullscreenResources(): void {
    const { gl, program } = this;
    if (!program) return;

    // Setup Full-Screen Triangle Buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, ShaderUp.ATTRIB_POSITION);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  }

  private initInstancedResources(): void {
    const gl = this.gl as WebGL2RenderingContext; // Ensured by constructor check
    const { program, attributeOptions } = this;
    if (!program || !attributeOptions) return;
    
    // 1. Geometry (Quad for instancing)
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 0,1, 1,0, 1,1]), gl.STATIC_DRAW);
    
    const quadLoc = gl.getAttribLocation(program, "a_quadVertex");
    gl.enableVertexAttribArray(quadLoc);
    gl.vertexAttribPointer(quadLoc, 2, gl.FLOAT, false, 0, 0);

    // 2. Instance Buffer
    this.instanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);

    // 3. Calculate Stride and setup attributes
    let stride = 0;
    for (const name in attributeOptions) {
      const opts = attributeOptions[name];
      // Stride is in bytes. Assumes FLOAT for now.
      stride += opts.size * 4; 
    }
    
    let offset = 0;
    for (const name in attributeOptions) {
      const opts = attributeOptions[name];
      const loc = gl.getAttribLocation(program, name);
      if (loc === -1) {
        console.warn(`[ShaderUp] Attribute "${name}" not found in shader.`);
        continue;
      }
      
      gl.enableVertexAttribArray(loc);
      // Data type mapping could be extended here
      const glType = gl.FLOAT; 
      gl.vertexAttribPointer(loc, opts.size, glType, false, stride, offset);
      
      if (opts.instanced) {
        gl.vertexAttribDivisor(loc, 1);
      }

      offset += opts.size * 4;
    }
  }

  /**
   * For 'instanced' mode, sets the data for all instances.
   * @param data An array containing the interleaved attribute data for all instances.
   */
  public setData(data: Float32Array): void {
    if (this.renderMode !== 'instanced' || this.isDestroyed) return;
    const gl = this.gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  }


  /**
   * Updates a texture for a specific uniform.
   * @param name The name of the uniform (must be defined as 'sampler2D' in options).
   * @param image The source image, video, or canvas.
   */
  public setTexture(name: string, image: TexImageSource): void {
    if (this.isDestroyed) return;
    
    const info = this.uniformInfo.get(name);
    if (!info || info.type !== 'sampler2D' || info.textureUnit === undefined) {
      console.warn(`[ShaderUp] Warning: "${name}" is not a registered sampler2D uniform.`);
      return;
    }

    const gl = this.gl;
    let texture = this.textures.get(info.textureUnit);
    
    // Lazy creation of texture
    if (!texture) {
      texture = gl.createTexture()!;
      this.textures.set(info.textureUnit, texture);
    }

    gl.activeTexture(gl.TEXTURE0 + info.textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Standard parameters for non-power-of-two support
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }

  /**
   * Starts the rendering loop.
   */
  public start(): void {
    if (!this.animationFrameId && !this.isDestroyed) {
      this.animationFrameId = requestAnimationFrame(this.boundRender);
    }
  }

  /**
   * Stops the rendering loop. Resources remain valid.
   */
  public stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Completely disposes of the WebGL context resources and listeners.
   * Call this when the component is unmounted.
   */
  public dispose(): void {
    this.stop();
    this.isDestroyed = true;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

    const gl = this.gl;
    
    // Resource cleanup
    this.textures.forEach(tex => gl.deleteTexture(tex));
    this.textures.clear();

    if (this.instanceBuffer) {
      gl.deleteBuffer(this.instanceBuffer);
      this.instanceBuffer = null;
    }

    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
    
    // Note: Buffer cleanup is omitted for brevity but recommended for strict memory management
  }

  // --- Private Helpers ---

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.stop();
    console.warn("[ShaderUp] Context Lost");
  };

  private handleContextRestored = (): void => {
    console.log("[ShaderUp] Context Restored - Re-initializing...");
    // In a real implementation, you would need to re-fetch shaders or cache the options object
    // to pass it back to initResources here.
  };

  private getDefaultUniformValue(type: UniformType): any {
    switch (type) {
      case 'float': return 0.0;
      case 'vec2': return [0, 0];
      case 'vec3': return [0, 0, 0];
      case 'vec4': return [0, 0, 0, 0];
      case 'int': return 0;
      case 'sampler2D': return null;
      default: return null;
    }
  }

  private getDefaultVertexShader(): string {
    if (this.renderMode === 'instanced') {
      // This shader is a generic version of the one from the prototype.
      // It expects instance attributes for position/size and passes them on.
      // Users can replace it with a more specific one.
      return `#version 300 es
        in vec2 a_quadVertex; // (0,0) to (1,1)
        
        // Example instance attributes (users must define these in options)
        in vec4 a_instanceRect;   // xy = pos, zw = size
        
        uniform vec2 u_resolution;
        
        out vec2 v_uv;

        void main() {
            // Create a screen-space position from the instance rect and quad vertex
            vec2 finalPos = a_instanceRect.xy + (a_quadVertex * a_instanceRect.zw);
        
            // Convert from pixels to clip space
            vec2 clipSpace = (finalPos / u_resolution) * 2.0 - 1.0;
            clipSpace.y *= -1.0; // Flip Y for WebGL
        
            gl_Position = vec4(clipSpace, 0.0, 1.0);
        
            v_uv = a_quadVertex;
        }
      `;
    }
    
    // Default fullscreen shader
    return `
      attribute vec2 ${ShaderUp.ATTRIB_POSITION};
      void main() {
        gl_Position = vec4(${ShaderUp.ATTRIB_POSITION}, 0.0, 1.0);
      }
    `;
  }

  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error("[ShaderUp] Unable to create shader object.");
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const log = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`[ShaderUp] Shader compilation failed:\n${log}`);
    }
    return shader;
  }

  private createProgram(vs: WebGLShader, fs: WebGLShader): WebGLProgram {
    const program = this.gl.createProgram();
    if (!program) throw new Error("[ShaderUp] Unable to create program object.");

    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const log = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`[ShaderUp] Program linking failed:\n${log}`);
    }
    return program;
  }

  private handleResize(callback?: (w: number, h: number) => void): void {
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
      
      if (callback) callback(displayWidth, displayHeight);
    }
  }

  private render(time: number): void {
    if (this.isDestroyed || !this.program) return;

    const gl = this.gl;
    gl.useProgram(this.program);

    // Update Standard Uniforms
    if (this.timeLocation) gl.uniform1f(this.timeLocation, time * 0.001);
    if (this.resolutionLocation) gl.uniform2f(this.resolutionLocation, gl.drawingBufferWidth, gl.drawingBufferHeight);

    // Update Custom Uniforms
    for (const [name, info] of this.uniformInfo) {
      const value = this.uniforms[name];
      if (value === null || value === undefined) continue;

      switch (info.type) {
        case 'float': gl.uniform1f(info.location, value); break;
        case 'vec2': gl.uniform2f(info.location, value[0], value[1]); break;
        case 'vec3': gl.uniform3f(info.location, value[0], value[1], value[2]); break;
        case 'vec4': gl.uniform4f(info.location, value[0], value[1], value[2], value[3]); break;
        case 'int':   gl.uniform1i(info.location, value); break;
        case 'sampler2D': 
          if (info.textureUnit !== undefined) {
            gl.uniform1i(info.location, info.textureUnit);
          }
          break;
      }
    }

    // Draw the geometry
    if (this.renderMode === 'fullscreen') {
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      const gl2 = gl as WebGL2RenderingContext;
      // Primitives, start offset, vertex count, instance count
      gl2.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.numInstances);
    }

    this.animationFrameId = requestAnimationFrame(this.boundRender);
  }
}
