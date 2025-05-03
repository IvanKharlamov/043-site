// https://www.shadertoy.com/view/4lcSWs
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

// 2×2 rotation
mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, s, -s, c);
}

// 1D triangle fractal
float tri(float x) {
    return abs(fract(x) - 0.5);
}
vec2 tri2(vec2 p) {
    return vec2(
        tri(p.x + tri(p.y * 2.0)),
        tri(p.y + tri(p.x * 2.0))
    );
}
const mat2 M2 = mat2(
     0.970,  0.242,
    -0.242,  0.970
);

// subtle background noise
float triangleNoise(vec2 p) {
    float z = 1.5, z2 = 1.5, rz = 0.0;
    vec2 bp = p * 0.8;
    for (int i = 0; i < 4; i++) {
        vec2 dg = tri2(bp * 2.0) * 0.5;
        dg = dg * rot(u_time * 4.5);
        p += dg / z2;
        bp *= 1.5; z2 *= 0.6; z *= 1.7;
        p = p * 1.2 * M2;
        rz += tri(p.x + tri(p.y)) / z;
    }
    return clamp(rz, 0.0, 1.0);
}

// filament segment distance
float segm(vec2 p, vec2 a, vec2 b, float nz) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0) + nz*0.017;
    float waveAmp = clamp(u_mid, 0.1, 1.0);  // mid-band for displacement, with minimum value
    vec2 disp = pa - waveAmp*0.015*(h - 1.0) - ba*h;
    return length(disp) * waveAmp * 7.0 * waveAmp;
}

// draw all filaments
vec3 renderFilaments(vec2 p) {
    float nz = triangleNoise(p);
    vec2 p1 = vec2(-1.0, 0.0);
    vec3 col = vec3(0.0);

    // scale & slow scroll
    p /= (0.5 + u_time * 0.001);

    for (int i = 0; i < 100; i++) {
        // slowly rotate the anchor
        float a1 = 0.05 + pow(u_time*2.25,1.5)*0.0007;
        p1 = rot(a1) * p1;

        // branch direction modulated by mid
        float ang = 0.04*float(i) - u_time*1.575 - max(0.1, u_mid)*1.5;
        vec2 p2 = rot(ang) * p1;

        // distance to this segment
        float d = segm(p, p1, p2, nz);

        // color modulation per branch
        vec3 tone = abs(sin(vec3(
            0.6 + sin(u_time*0.05)*0.4,
            1.5,
            2.0
        ) + float(i)*0.011 + u_time*0.8));

        // Add small base value to prevent complete darkness
        col += tone * (0.0015 / pow(max(d, 0.01), 1.2));
    }

    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // normalized coords
    vec2 uv = fragCoord.xy / u_resolution * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y * 0.9;

    // raw filament color
    vec3 c = renderFilaments(uv * 0.75);
    
    // Apply proper volume scaling
    // Ensure volume stays in a reasonable range (never goes to zero completely)
    float v = clamp(u_volume, 0.0, 1.0);
    
	c = c * 1.5;
	
    // Apply volume in a way that decreases brightness as volume decreases
    c = c * v;
    
    // Apply proper clamping AFTER volume adjustment
    c = clamp(c, vec3(0.0), vec3(1.0));

    // subtle vignette
    vec2 luv = fragCoord.xy / u_resolution;
    float vig = pow(
        16.0 * luv.x * luv.y * (1.0 - luv.x) * (1.0 - luv.y),
        0.1
    ) * 0.5 + 0.5;
    c *= vig;

    fragColor = vec4(c, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}