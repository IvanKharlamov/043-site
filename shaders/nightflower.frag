// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass band
uniform float u_mid;     // mid band
uniform float u_high;    // treble band
uniform float u_volume;  // overall RMS loudness

#define PI     3.14159
#define TWO_PI 6.28318
const int blades = 6;

// Sample() now just returns one of the bands
float Sample(float u, int row, int range){
    if(row == 0){
        // pick bass, mid or high
        if(u < 0.33)      return u_low;
        else if(u < 0.66) return u_mid;
        else              return u_high;
    }
    // row==1 → just volume
    return u_volume;
}

void mainImage(out vec4 fragColour, in vec2 fragCoord){
    // normalized, center at 0
    vec2 uv = (fragCoord * 2.0 - u_resolution) / u_resolution.y;

    // === shrink central circle by scaling UV ===
    const float CENTER_SCALE = 1.2;
    uv *= CENTER_SCALE;

    // radial distance & kaleidoscope slice
    float l = length(uv) / length(u_resolution.xy / u_resolution.y);
    float a = atan(uv.x, uv.y) + u_time;
    a = abs(fract(float(blades) * a / TWO_PI) * 2.0 - 1.0) * l;

    // replace mouse‐driven A/B with audio‐driven factors
    float A = u_volume;    // dispersion
    float B = u_high;      // waveform blend
    A = A*A; B = B*B;

    // compute the raw   R/G/B  components
    float r = Sample(
        pow( mix( mix(l, 0.0,   A),
                  Sample(a,1,1), B
                ), 2.0
        ), 0, 20
    );
    float g = Sample(
        pow( mix( mix(l, 0.5,   A),
                 (1.0 - Sample(a,1,64)), B
                ), 2.0
        ), 0, 8
    );
    float b = Sample(
        pow( mix( mix(l, 1.0,   A),
                  Sample(a,1,128),      B
                ), 2.0
        ), 0, 1
    );

    vec3 col = vec3(r, g, b);

    // contrast & glow
    col = smoothstep(
        vec3(0.3,0.2,0.4),
        vec3(0.9,1.0,0.8),
        col + 0.2*l
    );

    // === tint each channel by its band strength ===
    // bass boosts red, mids boost green, highs boost blue
    col.r *= mix(1.0, 1.5, u_low);
    col.g *= mix(1.0, 1.5, u_mid);
    col.b *= mix(1.0, 1.5, u_high);

    fragColour = vec4(col, 1.0);
}

void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
