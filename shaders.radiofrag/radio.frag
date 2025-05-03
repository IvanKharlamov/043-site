#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;
uniform float u_mid;
uniform float u_high;

// — example “Homecomputer”-style hash from Nimitz 2016 —
vec3 hash3(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p.zxy, p.yxz + 19.1);
    return fract(vec3(
        p.x * p.y,
        p.z * p.x,
        p.y * p.z
    )) - 0.5;
}

void main(){
    // normalized coords centered at 0
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time;

    // simple evolving pattern using low/mid bands + hash for noise
    float wave = sin(uv.x * 8.0 + t + u_low * 5.0)
               + cos(uv.y * 8.0 + t * 0.6 + u_mid * 3.0)
               + hash3(vec3(uv, t)).x * 0.4;

    // color shift by high band
    vec3 col = 0.5 + 0.5 * cos(vec3(wave, wave + 2.0, wave + 4.0) + u_high * 4.0);

    gl_FragColor = vec4(col, 1.0);
}
