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

#define PI        3.14159
#define TWO_PI    6.28318
const int blades = 6;

// HSL → RGB conversion
vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(
        abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0,
        0.0, 1.0
    );
    return c.z + c.y*(rgb - 0.5)*(1.0 - abs(2.0*c.z - 1.0));
}

// Simplified Sample() returning bands
float Sample(float u, int row, int range){
    if(row == 0){
        if(u < 0.33)      return u_low;
        else if(u < 0.66) return u_mid;
        else              return u_high;
    }
    return u_volume;
}

void mainImage(out vec4 fragColour, in vec2 fragCoord){
    // NDC coords
    vec2 uv = (fragCoord * 2.0 - u_resolution) / u_resolution.y;

    // shrink central circle even more
    const float CENTER_SCALE = 1.6;
    uv *= CENTER_SCALE;

    // kaleidoscope slice
    float l = length(uv);
    float a = atan(uv.x, uv.y) + u_time;
    a = abs(fract(float(blades)*a/TWO_PI)*2.0 - 1.0)*l;

    // audio‐driven dispersion/mix
    float A = u_volume; A = A*A;
    float B = u_high;   B = B*B;

    // compute raw channels
    float r = Sample(pow(mix(mix(l,0.0,A),           Sample(a,1,1),   B),2.0), 0,20);
    float g = Sample(pow(mix(mix(l,0.5,A), (1.0-Sample(a,1,64)), B),2.0), 0, 8);
    float b = Sample(pow(mix(mix(l,1.0,A),           Sample(a,1,128), B),2.0), 0, 1);

    vec3 col = vec3(r,g,b);

    // soft contrast/glow
    col = smoothstep(
        vec3(0.3,0.2,0.4),
        vec3(0.9,1.0,0.8),
        col + 0.2*l
    );

    // ------------------------------------------------------------------------------------------------
    // **Palette mapping**: hue shifts with small audio changes
    float hue = fract(
        u_low * 0.4   + 
        u_mid * 0.3   +
        u_high * 0.3  +
        u_time * 0.1
    );
    // optional: you can mod saturation/lightness by volume
    float sat = mix(0.6, 1.0, clamp(u_volume*2.0, 0.0, 1.0));
    float lig = 0.5;
    vec3 pal = hsl2rgb(vec3(hue, sat, lig));

    // blend original brightness into palette
    float lum = dot(col, vec3(0.3,0.59,0.11));
    col = pal * lum;
    // ------------------------------------------------------------------------------------------------

    fragColour = vec4(col, 1.0);
}

void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
