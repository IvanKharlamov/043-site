#extension GL_OES_standard_derivatives : enable
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass
uniform float u_mid;     // mids
uniform float u_high;    // highs
uniform float u_volume;  // overall loudness

#define TAU 6.28318530718

void main() {
    // normalize coords to [-1,1], aspect-corrected
    vec2 uv = (gl_FragCoord.xy / u_resolution)*2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    // compute angle and radius
    float ang = atan(uv.y, uv.x)/TAU + 0.5;
    float dist = length(uv);

    // ring parameters
    float baseR  = 0.3;
    float range1 = 0.2;
    float range2 = 0.2;
    float thick  = 0.01;

    // first ring: 50 slices, uses bass→mid
    float idx1 = floor(ang * 50.0) / 50.0;
    float lvl1 = mix(u_low, u_mid, idx1);
    float r1   = baseR + lvl1 * range1;
    float d1   = abs(dist - r1);
    float ring1= smoothstep(thick, 0.0, d1);

    // second ring: 100 slices, uses mid→high
    float idx2 = floor(ang * 100.0) / 100.0;
    float lvl2 = mix(u_mid, u_high, idx2);
    float r2   = baseR + lvl2 * range2;
    float d2   = abs(dist - r2);
    float ring2= smoothstep(thick, 0.0, d2);

    // neon colors
    vec3 neon1 = vec3(1.0, 0.0, 1.0);  // magenta
    vec3 neon2 = vec3(0.0, 1.0, 1.0);  // cyan

    // combine rings, each scaled by volume
    float v = u_volume * u_volume;  // square for smoother fade
    vec3 col = neon1 * ring1 * v + neon2 * ring2 * v;

    // subtle vignette
    vec2 luv = gl_FragCoord.xy / u_resolution;
    float vig = pow(16.0 * luv.x * luv.y * (1.0-luv.x) * (1.0-luv.y), 0.1);
    col *= vig;

    gl_FragColor = vec4(col, 1.0);
}
