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

// HSL → RGB (from IQ)
vec3 hsl2rgb(vec3 c){
    vec3 rgb = clamp(
        abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0,
        0.0, 1.0
    );
    return c.z + c.y*(rgb - 0.5)*(1.0 - abs(2.0*c.z - 1.0));
}

// “Sample” replaced to return bands
float Sample(float u, int row, int range) {
    if (row == 0) {
        if (u < 0.33)      return u_low;
        else if (u < 0.66) return u_mid;
        else               return u_high;
    }
    return u_volume;
}

void mainImage(out vec4 fragColour, in vec2 fragCoord) {
    // NDC coords, center-origin
    vec2 uv = (fragCoord * 2.0 - u_resolution) / u_resolution.y;

    // shrink central hole
    const float CENTER_SCALE = 2.0;
    uv *= CENTER_SCALE;

    // kaleidoscope radial+angular
    float l = length(uv);
    float ang = atan(uv.x, uv.y) + u_time;   // keep the slow rotation
    float slice = abs(fract(float(blades) * ang / TWO_PI)*2.0 - 1.0);
    float a = slice * l;

    // dispersion & mix from audio
    float A = u_volume; A *= A;
    float B = u_high;   B *= B;

    // build three raw channels
    float R = Sample(pow(mix(mix(l, 0.0,   A), Sample(a,1,1),   B), 2.0), 0, 20);
    float G = Sample(pow(mix(mix(l, 0.5,   A), 1.0 - Sample(a,1,64), B), 2.0), 0, 8);
    float Bv= Sample(pow(mix(mix(l, 1.0,   A), Sample(a,1,128), B), 2.0), 0, 1);

    // combine into a luminance value
    float val = (R + G + Bv) / 3.0;
    val = clamp(val, 0.0, 1.0);

    // hue purely from frequencies (no time)
    float hue = fract(u_low*0.7 + u_mid*0.2 + u_high*0.1);
    vec3 pal  = hsl2rgb(vec3(hue, 1.0, val));

    // final color scaled by volume (zero volume -> black)
    vec3 col = pal * u_volume;

    fragColour = vec4(col, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
