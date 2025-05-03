// https://www.shadertoy.com/view/4ssfzM
#extension GL_OES_standard_derivatives : enable
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass
uniform float u_mid;     // mids
uniform float u_high;    // highs
uniform float u_volume;  // overall RMS loudness

#define TAU 6.28318530718

// Soft mask for filling inside a ring
float asFilled(float d) {
    return 1.0 - smoothstep(0.0, 0.01, d);
}

// “oEye” ring SDF: radius + audio bump per slice
float oEye(vec2 xy, float radius, float audioRange, float slices) {
    // polar angle in [0,1)
    float angle = atan(xy.x, xy.y) / TAU + 0.5;
    // quantize into slices
    float idx = floor(angle * slices) / slices;
    // approximate a continuous audio lookup by mixing low→high across idx
    float audioLevel = mix(u_low, u_high, idx);
    return length(xy) - (radius + audioLevel * audioRange);
}

void main(){
    // normalized, centered coords
    vec2 uv = gl_FragCoord.xy / u_resolution.xy * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    // first ring (50 slices), neon magenta→cyan
    float d1   = oEye(uv, 0.5, 0.5, 50.0);
    float m1   = clamp(1.0 + d1, 0.0, 1.0);
    vec3 col1  = mix(vec3(1.0,0.0,1.0), vec3(0.0,1.0,1.0), m1);

    // second ring (100 slices), cyan→yellow
    float d2   = oEye(uv, 0.5, 0.5, 100.0);
    float m2   = clamp(1.0 + d2, 0.0, 1.0);
    vec3 col2  = mix(vec3(0.0,1.0,1.0), vec3(1.0,1.0,0.0), m2);

    // combined color
    vec3 col = col1 + col2;

    // alpha from overall volume, mask inside the first ring
    float alpha = u_volume * asFilled(d1);

    gl_FragColor = vec4(col, alpha);
}
