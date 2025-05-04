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

#define PI        3.14159
#define TWO_PI    6.28318
const int blades = 6;

// Replacement Sample() using our 4 uniforms:
float Sample(float u, int row, int range){
    if(row == 0){
        // frequency row: interpolate bass→mid→high
        if(u < 0.33)      return u_low;
        else if(u < 0.66) return u_mid;
        else              return u_high;
    } else {
        // waveform row → overall volume
        return u_volume;
    }
}

void mainImage(out vec4 fragColour, in vec2 fragCoord){
    // normalized coords centered at 0
    vec2 uv = (fragCoord * 2.0 - u_resolution) / u_resolution.y;

    // radial distance & kaleido angle
    float l = length(uv) / length(u_resolution.xy / u_resolution.y);
    float a = atan(uv.x, uv.y) + u_time;
    a = abs(fract(float(blades) * a / TWO_PI) * 2.0 - 1.0) * l;

    // replace mouse‐based A/B with audio controls
    float A = u_volume;  // “dispersion strength”
    float B = u_high;    // “waveform strength”
    A = A*A; B = B*B;

    // three color channels
    fragColour.r = Sample(
        pow( mix( mix(l, 0.0,   A),
                  Sample(a,1,1), B
                ), 2.0
        ), 0, 20
    );
    fragColour.g = Sample(
        pow( mix( mix(l, 0.5,   A),
                 (1.0 - Sample(a,1,64)), B
                ), 2.0
        ), 0, 8
    );
    fragColour.b = Sample(
        pow( mix( mix(l, 1.0,   A),
                  Sample(a,1,128),      B
                ), 2.0
        ), 0, 1
    );

    // contrast & soft glow
    fragColour.rgb = smoothstep(
        vec3(0.3,0.2,0.4),
        vec3(0.9,1.0,0.8),
        fragColour.rgb + 0.2*l
    );

    fragColour.a = 1.0;
}

void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
