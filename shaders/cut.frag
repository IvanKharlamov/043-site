#extension GL_OES_standard_derivatives : enable
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;      // bass band
uniform float u_mid;      // mid band
uniform float u_high;     // treble band
uniform float u_volume;   // overall loudness

#define TAU 6.28318530718

// Soft fill inside ring
float asFilled(float d) {
    return 1.0 - smoothstep(0.0, 0.01, d);
}

// Pick one of our three bands based on normalized freq ∈ [0,1]
float sampleFreq(float f) {
    if (f < 1.0/3.0)      return u_low;
    else if (f < 2.0/3.0) return u_mid;
    else                  return u_high;
}

// Ring signed‐distance: radius + audio bump per slice
float oEye(vec2 xy, float radius, float range, float slices) {
    float angle = atan(xy.x, xy.y)/TAU + 0.5;
    float idx   = floor(angle * slices);
    float norm  = idx / slices;
    float lvl   = sampleFreq(norm);
    return length(xy) - (radius + lvl * range);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // UV in [-1,1], aspect‐corrected
    vec2 uv = fragCoord.xy / u_resolution.xy * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    // First ring: 50 slices, neon magenta→cyan
    float d1 = oEye(uv, 0.5, 0.5, 50.0);
    float t1 = clamp(1.0 + d1, 0.0, 1.0);
    vec3 col1 = mix(
        vec3(1.0, 0.0, 1.0),   // magenta
        vec3(0.0, 1.0, 1.0),   // cyan
        t1
    );

    // Second ring: 100 slices, cyan→yellow
    float d2 = oEye(uv, 0.5, 0.5, 100.0);
    float t2 = clamp(1.0 + d2, 0.0, 1.0);
    vec3 col2 = mix(
        vec3(0.0, 1.0, 1.0),   // cyan
        vec3(1.0, 1.0, 0.0),   // yellow
        t2
    );

    // Combine & mask inside first ring
    float mask = asFilled(d1);

    // Volume drives overall brightness (squared for smoothness)
    float v = u_volume * u_volume;

    vec3 col = (col1 + col2) * mask * v;

    // subtle vignette
    vec2 luv = fragCoord.xy / u_resolution;
    float vig = pow(
      16.0 * luv.x * luv.y * (1.0 - luv.x) * (1.0 - luv.y),
      0.1
    ) * 0.5 + 0.5;
    col *= vig;

    fragColor = vec4(col, 1.0);
}

void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
