// shaders/simple_debug.frag
#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D iChannel0;
uniform vec2      u_resolution;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / u_resolution;
    float spec = texture2D(iChannel0, vec2(uv.x, 0.25)).r;
    float wave = texture2D(iChannel0, vec2(uv.x, 0.75)).r;

    // top half: spectrum in red
    // bottom half: waveform in green
    fragColor = uv.y > 0.5
      ? vec4(spec, 0.0, 0.0, 1.0)
      : vec4(0.0, wave, 0.0, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
