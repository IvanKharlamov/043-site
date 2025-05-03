// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;
uniform float u_mid;
uniform float u_high;

// toggle/params
const float USE_KALEIDOSCOPE  = 1.0;
const float NUM_SIDES         = 8.0;
const float MIN_SIZE          = 0.01;
const float REACT_INTENSITY   = 0.3;
const float BASS_INTENSITY    = 1.1;
const float ZOOM_FACTOR       = 0.5;

const float PI = 3.14159265359;

// 4th‐order “pill” field
float field(vec2 p, vec2 c, float r) {
    float d = length(p - c) / r;
    float t = d*d;
    float tt = t*d;
    float ttt = tt*d;
    float v =
        (-10.0/9.0)*ttt +
        (17.0/9.0)*tt  +
        (-22.0/9.0)*t   +
        1.0;
    return clamp(v, 0.0, 1.0);
}

// standard kaleidoscope fold
vec2 Kaleidoscope(vec2 uv, float n) {
    float ang = PI / n;
    float r = length(uv * 0.5);
    float a = atan(uv.y, uv.x) / ang;
    a = mix(fract(a), 1.0 - fract(a), mod(floor(a), 2.0)) * ang;
    return vec2(cos(a), sin(a)) * r;
}

// 3-component hash for “noise”
vec3 hash3(vec3 p) {
    p = fract(p * vec3(443.8975,397.2973,491.1871));
    p += dot(p.zxy, p.yxz + 19.1);
    return fract(vec3(
      p.x * p.y,
      p.z * p.x,
      p.y * p.z
    )) - 0.5;
}

void main(){
    // normalize coords centered at 0, aspect‐correct
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy)
            / min(u_resolution.x, u_resolution.y);
    // kaleidoscope
    uv = mix(uv, Kaleidoscope(uv, NUM_SIDES), USE_KALEIDOSCOPE);
    // zoom by bass
    uv *= ZOOM_FACTOR + BASS_INTENSITY * u_low;

    vec3  final_color   = vec3(0.0);
    float final_density = 0.0;

    const int ITER = 128;
    for(int i = 0; i < ITER; i++){
        float id = float(i);

        // generate two noise seeds
        vec3 n  = hash3(vec3(id, id*1.37, id*2.73));
        vec3 n2 = hash3(vec3(id*3.14, id*4.15, id*5.92));

        // derive a velocity “intensity” from mid/high
        float velInt = mix(u_mid, u_high, fract(n.x + uv.x));

        // velocity vector
        vec2 vel = -abs(n.xy)*3.0 + vec2(-velInt*0.02);

        // particle position, looping
        vec2 pos = fract(n.xy + u_time * vel * 0.2);
        pos = mix(fract(pos), fract(pos), mod(floor(pos.x+pos.y),2.0));

        // intensity (how loud at that “y”): blend mid/high by pos.y
        float intensity = mix(u_mid, u_high, pos.y);

        // map to screen‐space
        vec2 p = (pos * 2.0 - 1.0) 
               * (u_resolution.xy / min(u_resolution.x, u_resolution.y));

        // radius based on noise + intensity
        float radius = clamp(n.z*0.5 + MIN_SIZE, MIN_SIZE, REACT_INTENSITY)
                     * pow(intensity, 2.0);

        // particle color from second hash
        vec3 color = n2.xyz;

        // compute field contribution
        float d = field(uv, p, radius);
        final_density   += d;
        final_color     += d * color;
    }

    // tone‐mapping
    final_density = clamp(final_density - 0.1, 0.0, 1.0);
    final_density = pow(final_density, 3.0);

    gl_FragColor = vec4(final_color * final_density, final_density);
}
