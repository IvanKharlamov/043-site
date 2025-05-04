// shaders/simple_debug.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D iChannel0;   // your 2×FFT audio canvas
uniform vec2      u_resolution;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / u_resolution;
    
    // sample spectrum from row ≈0.25
    float spec = texture2D(iChannel0, vec2(uv.x, 0.25)).r;
    // sample waveform from row ≈0.75
    float wave = texture2D(iChannel0, vec2(uv.x, 0.75)).r;
    
    // top half: show spectrum as red ramp
    // bottom half: show waveform as green ramp
    if (uv.y > 0.5) {
        fragColor = vec4(spec, 0.0, 0.0, 1.0);
    } else {
        fragColor = vec4(0.0, wave, 0.0, 1.0);
    }
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
