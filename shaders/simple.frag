// shaders/simple.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass
uniform float u_mid;     // mids
uniform float u_high;    // highs
uniform float u_volume;  // overall loudness

void main() {
    // Direct mapping of the three bands to R/G/B
    vec3 bandColor = vec3(u_low, u_mid, u_high);

    // Modulate brightness by volume
    vec3 col = bandColor * u_volume;

    gl_FragColor = vec4(col, 1.0);
}
