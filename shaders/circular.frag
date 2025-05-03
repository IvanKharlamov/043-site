// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass
uniform float u_mid;     // mids
uniform float u_high;    // highs
uniform float u_volume;  // overall loudness

// constants
#define PI 3.141592
#define BLURR    0.3
#define SHARPEN  1.7

// HSV → RGB helper
vec3 hue2rgb(in float h) {
    vec3 k = mod(vec3(5., 3., 1.) + vec3(h*360.0/60.0), 6.0);
    return vec3(1.0) 
       - clamp(min(k, vec3(4.0) - k), 0.0, 1.0);
}

// pick a “signal” around the circle from our bands
float sampleSignal(float t) {
    // use low for the core radius (bass), mids for modulation
    // t∈[0,1]
    float band = mix(u_low, u_mid, smoothstep(0.0,1.0,t));
    return band;
}

// pick an overall amplitude from highs
float sampleAmpl() {
    return u_high;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // normalized [0,1]
    vec2 uv0 = fragCoord / u_resolution;
    // center & aspect‐correct
    vec2 uv = uv0*2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    // polar coords
    float r = length(uv);
    float theta = atan(uv.y, uv.x) + PI; 
    // map θ→[0,1]
    float t = theta / (2.0*PI);

    // our “signal” radius and amplitude
    float signal = sampleSignal(t);
    float ampl   = sampleAmpl();

    // build a soft ring at radius=signal
    float dist = abs(r - signal);
    float v    = 1.0 - pow(smoothstep(0.0, BLURR, dist), 0.01);

    // hue evolves with time & amplitude
    float hue = pow(fract(abs(sin(theta*0.5) * ampl)), SHARPEN)
              + u_time * 0.1;

    // final color
    vec3 col = v * hue2rgb(fract(hue));

    fragColor = vec4(col, 1.0);
}

// for glslCanvas entrypoint
void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
