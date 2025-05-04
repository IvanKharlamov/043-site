// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass band (0–1)
uniform float u_mid;     // mids band (0–1)
uniform float u_high;    // treble band (0–1)
uniform float u_volume;  // RMS loudness (0–1)

#define PI     3.14159
#define TWO_PI 6.28318
const int blades = 6;

// HSL → RGB (IQ’s method)
vec3 hsl2rgb(vec3 c){
    vec3 p = abs(mod(c.x*6.0 + vec3(0,4,2), 6.0) - 3.0) - 1.0;
    return c.z + c.y * (p - 0.5) * (1.0 - abs(2.0*c.z - 1.0));
}

void mainImage(out vec4 fragColour, in vec2 fragCoord){
    // normalized coords centered at 0, aspect‐correct
    vec2 uv0 = (fragCoord*2.0 - u_resolution) / u_resolution.y;

    // --- bass controls smoothness: lower bass = rough waves, higher bass = smoother ---
    float freq = mix(25.0,  3.0, u_low);    // bass=0 → freq=25 (sharp); bass=1 → freq=3 (smooth)
    float t    = u_time * 2.0;

    // compute a base circular wave
    float r0 = length(uv0);
    float wave0 = sin(r0 * freq + t);

    // treble controls glow threshold and CA strength
    float glow    = smoothstep(0.8, 1.0, abs(wave0)) * u_high * 2.0;
    float brightness0 = wave0 * 0.5 + 0.5 + glow;
    float caOff    = 0.01 * u_high;  // CA amplitude

    // mid controls hue
    float hueBase = fract(u_mid);

    // --- chromatic aberration: offset uv per channel along radial ---
    vec2 dir = normalize(uv0);
    vec2 uvR = uv0 + dir * caOff;
    vec2 uvG = uv0;
    vec2 uvB = uv0 - dir * caOff;

    // recalc wave+glow per channel
    float wR = sin(length(uvR)*freq + t);
    float gR = smoothstep(0.8, 1.0, abs(wR)) * u_high * 2.0;
    float bR = wR*0.5 + 0.5 + gR;

    float wG = wave0;
    float gG = glow;
    float bG = brightness0;

    float wB = sin(length(uvB)*freq + t);
    float gB = smoothstep(0.8, 1.0, abs(wB)) * u_high * 2.0;
    float bB = wB*0.5 + 0.5 + gB;

    // palette color for each channel
    vec3 colR = hsl2rgb(vec3(fract(hueBase + 0.02), 1.0, bR * 0.5 + 0.25));
    vec3 colG = hsl2rgb(vec3(hueBase,           1.0, bG * 0.5 + 0.25));
    vec3 colB = hsl2rgb(vec3(fract(hueBase - 0.02), 1.0, bB * 0.5 + 0.25));

    // assemble final color & scale by volume
    vec3 col = vec3(colR.r, colG.g, colB.b) * u_volume;

    fragColour = vec4(col, 1.0);
}

void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
