/**
 * WebGL Background with OGL
 * Lightweight shader-based animated background
 * Uses OGL instead of Three.js for minimal bundle size
 */

import { Renderer, Program, Mesh, Triangle } from 'ogl';

const vertexShader = `
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  
  varying vec2 vUv;
  
  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                     + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                           dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  // Fractal Brownian Motion
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    
    return value;
  }
  
  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 p = (uv * 2.0 - 1.0) * aspect;
    
    // Mouse influence
    vec2 mouse = (uMouse * 2.0 - 1.0) * aspect;
    float mouseDist = length(p - mouse);
    float mouseInfluence = smoothstep(1.0, 0.0, mouseDist);
    
    // Time-based animation
    float time = uTime * 0.15;
    
    // Create flowing noise pattern
    float n1 = fbm(p * 0.8 + time * 0.5);
    float n2 = fbm(p * 1.5 - time * 0.3 + vec2(5.0, 3.0));
    float n3 = fbm(p * 2.5 + time * 0.2 + n1 * 0.5);
    
    // Combine noise layers
    float noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    noise = noise * 0.5 + 0.5; // Normalize to 0-1
    
    // Add mouse interaction
    noise += mouseInfluence * 0.15;
    
    // Create color palette (Claude-inspired colors)
    vec3 color1 = vec3(0.04, 0.04, 0.06);  // Dark background
    vec3 color2 = vec3(0.8, 0.4, 0.2);      // Primary (warm orange)
    vec3 color3 = vec3(0.3, 0.8, 0.6);      // Accent (teal)
    vec3 color4 = vec3(0.5, 0.3, 0.8);      // Secondary (purple)
    
    // Mix colors based on noise
    vec3 color = color1;
    color = mix(color, color2, smoothstep(0.4, 0.6, noise) * 0.15);
    color = mix(color, color3, smoothstep(0.5, 0.7, n2 * 0.5 + 0.5) * 0.1);
    color = mix(color, color4, smoothstep(0.6, 0.8, n3 * 0.5 + 0.5) * 0.08);
    
    // Add subtle gradient from center
    float centerDist = length(p);
    color = mix(color, color1 * 0.5, smoothstep(0.0, 2.0, centerDist) * 0.5);
    
    // Vignette effect
    float vignette = 1.0 - smoothstep(0.5, 1.5, centerDist);
    color *= 0.7 + vignette * 0.3;
    
    // Add subtle grid pattern
    vec2 grid = fract(p * 10.0);
    float gridLine = smoothstep(0.02, 0.0, min(grid.x, grid.y)) * 0.03;
    color += vec3(gridLine);
    
    // Output with transparency
    float alpha = 0.9;
    gl_FragColor = vec4(color, alpha);
  }
`;

interface WebGLState {
  renderer: Renderer;
  mesh: Mesh;
  program: Program;
  animationId: number;
  mouse: { x: number; y: number };
}

let state: WebGLState | null = null;

export function initWebGL(canvas: HTMLCanvasElement): void {
  // Cleanup previous instance
  if (state) {
    cancelAnimationFrame(state.animationId);
    state.renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  // Check for WebGL support
  if (!canvas.getContext('webgl') && !canvas.getContext('webgl2')) {
    console.warn('WebGL not supported, using CSS fallback');
    canvas.style.background = 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 100%)';
    return;
  }

  try {
    const renderer = new Renderer({
      canvas,
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    });

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    // Resize handler
    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resize);
    resize();

    // Create fullscreen triangle (more efficient than quad)
    const geometry = new Triangle(gl);

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [window.innerWidth, window.innerHeight] },
        uMouse: { value: [0.5, 0.5] },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    // Mouse tracking
    const mouse = { x: 0.5, y: 0.5 };
    
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = 1.0 - e.clientY / window.innerHeight;
    };
    
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Animation loop
    let startTime = performance.now();
    
    const animate = () => {
      const time = (performance.now() - startTime) * 0.001;
      
      program.uniforms.uTime.value = time;
      program.uniforms.uMouse.value = [mouse.x, mouse.y];
      program.uniforms.uResolution.value = [
        renderer.width,
        renderer.height,
      ];

      renderer.render({ scene: mesh });
      
      state!.animationId = requestAnimationFrame(animate);
    };

    state = {
      renderer,
      mesh,
      program,
      animationId: requestAnimationFrame(animate),
      mouse,
    };

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (state) {
        cancelAnimationFrame(state.animationId);
      }
    });

  } catch (error) {
    console.error('WebGL initialization failed:', error);
    canvas.style.background = 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 100%)';
  }
}

export function destroyWebGL(): void {
  if (state) {
    cancelAnimationFrame(state.animationId);
    state.renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
    state = null;
  }
}
