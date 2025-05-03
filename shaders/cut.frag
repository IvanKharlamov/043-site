#extension GL_OES_standard_derivatives : enable
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass band
uniform float u_mid;     // mid band
uniform float u_high;    // treble band
uniform float u_volume;  // overall RMS loudness

#define TAU 6.28318530718

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    // Normalized, centered coords with aspect correction
    vec2 uv = fragCoord.xy / u_resolution * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    vec3 col = vec3(0.0);
    const int L = 64; // number of filaments

    // Two neon endpoint colors
    vec3 neonA = vec3(1.0, 0.2, 0.8); // hot pink
    vec3 neonB = vec3(0.2, 1.0, 0.5); // neon green

    // Loop over each filament
    for(int i = 0; i < L; i++){
        float fi = float(i) / float(L);
        // angle for this filament, rotating over time
        float angle = fi * TAU + u_time * 0.2;
        vec2 dir = vec2(cos(angle), sin(angle));

        // amplitude along this filament mixes low→high by fi
        float amp = mix(u_low, u_high, fi);

        // base radius controlled by mids
        float baseR = mix(0.2, 0.6, u_mid);
        float r = baseR + amp * 0.3;

        // distance from point to this radial line at radius r
        float d = abs(dot(uv, dir) - r);

        // filament thickness in screen‐space
        float thickness = 0.0015;
        // anti‐aliased line
        float line = smoothstep(thickness, 0.0, d);

        // color for this filament
        vec3 cI = mix(neonA, neonB, fi);

        // accumulate
        col += cI * line;
    }

    // overall brightness from volume (soft squared falloff)
    float v = u_volume * u_volume;
    col *= v;

    // optional vignette to darken edges
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
