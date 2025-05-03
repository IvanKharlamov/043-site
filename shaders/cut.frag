#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;      // bass
uniform float u_mid;      // mids
uniform float u_high;     // highs
uniform float u_volume;   // overall loudness

void main(){
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    // Visualize each uniform directly:
    // Red = low, Green = mid, Blue = high, Alpha = volume
    gl_FragColor = vec4(u_low, u_mid, u_high, u_volume);
}
