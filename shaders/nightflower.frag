// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass
uniform float u_mid;     // mids
uniform float u_high;    // highs
uniform float u_volume;  // RMS loudness

#define PI        3.14159
#define TWO_PI    6.28318
const int blades = 6;

// HSL → RGB
vec3 hsl2rgb(vec3 c){
    vec3 rgb = clamp(
        abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0),6.0) - 3.0) - 1.0,
        0.0, 1.0
    );
    return c.z + c.y*(rgb - 0.5)*(1.0 - abs(2.0*c.z - 1.0));
}

// simplified Sample() returning band values
float Sample(float u){
    if(u < 0.33)      return u_low;
    else if(u < 0.66) return u_mid;
    else              return u_high;
}

// core pattern luminance at a given uv
float patternLum(vec2 uv, float A, float B){
    float l = length(uv);
    float ang = atan(uv.x, uv.y) + u_time;
    float slice = abs(fract(float(blades)*ang/TWO_PI)*2.0 - 1.0);
    float a = slice * l;

    // three sub‐samples
    float r = Sample(mix(mix(l,0.0,A), Sample(a), B));
    float g = Sample(mix(mix(l,0.5,A), 1.0 - Sample(a), B));
    float b = Sample(mix(mix(l,1.0,A), Sample(a), B));

    return clamp((r+g+b)/3.0, 0.0, 1.0);
}

void mainImage(out vec4 fragColour, in vec2 fragCoord){
    // NDC coords centered
    vec2 uv0 = (fragCoord*2.0 - u_resolution)/u_resolution.y;

    // smooth scale from 1→SCALE as volume rises
    const float MIN_SCALE = 1.0;
    const float MAX_SCALE = 3.0;
    float s = mix(MIN_SCALE, MAX_SCALE, smoothstep(0.1, 1.0, u_volume));
    vec2 uv = uv0 * s;

    // audio-driven dispersion mix factors
    float A = u_volume * u_volume;
    float B = u_high   * u_high;

    // chromatic aberration offset direction
    vec2 dir = normalize(uv0);
    float chroma = 0.02 * u_high;  // stronger on highs

    // compute per-channel luma at offset UVs
    float lumR = patternLum(uv - dir*chroma, A, B);
    float lumG = patternLum(uv,               A, B);
    float lumB = patternLum(uv + dir*chroma, A, B);

    // base hue purely from freqs
    float hue = fract(u_low*0.7 + u_mid*0.2 + u_high*0.1);
    float sat = 1.0, lig = 0.5;
    vec3 pal = hsl2rgb(vec3(hue, sat, lig));

    // final color = palette * per-channel luma * volume
    vec3 col = pal * vec3(lumR, lumG, lumB) * u_volume;

    fragColour = vec4(col, 1.0);
}

void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
