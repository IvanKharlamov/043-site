// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;    // bass band
uniform float u_mid;    // mid band
uniform float u_high;   // treble band

#define NUM_PARTICLES   100
#define STEPS_PER_PART    5
#define PI 3.14159265359

// — 3-component hash for pseudo-random seeds —
vec3 hash3(vec3 p){
    p = fract(p * vec3(443.8975,397.2973,491.1871));
    p += dot(p.zxy, p.yxz + 19.1);
    return fract(vec3(
        p.x * p.y,
        p.z * p.x,
        p.y * p.z
    )) - 0.5;
}

// — 4th-order “pill” field for soft particles —
float field(vec2 p, vec2 center, float r){
    float d  = length(p - center) / r;
    float t  = d*d;
    float tt = t*d;
    float ttt= tt*d;
    float v = (-10.0/9.0)*ttt 
            + (17.0/9.0)*tt 
            + (-22.0/9.0)*t 
            + 1.0;
    return clamp(v, 0.0, 1.0);
}

// — position-dependent velocity update, adapted from “Buf A” —
vec3 updateVel(vec3 vel, vec2 pos, float id){
    // time & Lissajous base
    float t = u_time*2.0 + id*8.0;
    float R = 1.5, r = 0.5, d = 5.0;
    float x = ( (R-r)*cos(t - u_time*0.1)
              + d*cos((R-r)/r*t) );
    float y = ( (R-r)*sin(t)
              - d*sin((R-r)/r*t) );
    // modulate Z by bass (u_low)
    float z = sin(u_time*12.6 + id*50.0 + u_low*10.0)*7.0;
    // mix in noise on velocity
    vec3 target = vec3(x*1.2, y, z)*5.0
                + hash3(vel*10.0 + u_time*0.2)*7.0;
    return target;
}

void main(){
    vec2 fc = gl_FragCoord.xy;
    // normalized, centered coords
    vec2 uv = (fc * 2.0 - u_resolution) 
            / min(u_resolution.x, u_resolution.y);

    vec3 accumCol = vec3(0.0);
    float accumDen = 0.0;

    // — particle loop (“Buf B” logic) —
    for(int i = 0; i < NUM_PARTICLES; i++){
        float id = float(i);
        // initial seed for pos & vel
        vec3 seed = hash3(vec3(id, id*1.17, id*1.31));
        vec2 pos  = seed.xy*2.0 - 1.0;
        vec3 vel  = seed*2.0;

        // simulate a few substeps
        for(int j = 0; j < STEPS_PER_PART; j++){
            vel = updateVel(vel, pos, id);
            // movement speed also reacts to mids
            pos += vel.xy * (0.002 + u_mid*0.005);
            // wrap in [-1,1]
            pos = mod(pos + 1.0, 2.0) - 1.0;
        }

        // radius scales with treble (u_high)
        float radius = 0.01 + u_high*0.05;
        float dens   = field(uv, pos, radius);

        // color per-particle from another hash
        vec3 col = hash3(vec3(id*2.2, id*3.3, id*4.4));
        accumDen += dens;
        accumCol += dens * col;
    }

    // tone-map density
    accumDen = clamp(accumDen - 0.1, 0.0, 1.0);
    accumDen = pow(accumDen, 3.0);
    accumCol *= accumDen;

    // — scanlines (“post” effect) —
    accumCol *= (sin(fc.y*350.0 + u_time)*0.04 + 1.0);
    accumCol *= (sin(fc.x*350.0 + u_time)*0.04 + 1.0);

    // — vignette —
    vec2 luv = fc / u_resolution;
    float vig = pow(16.0 * luv.x * luv.y * (1.0 - luv.x) * (1.0 - luv.y), 0.1) 
              * 0.35 + 0.65;
    accumCol *= vig;

    gl_FragColor = vec4(accumCol, 1.0);
}
