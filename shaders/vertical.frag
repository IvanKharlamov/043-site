#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass band
uniform float u_mid;     // mid band  ← replaces wave.z
uniform float u_high;    // treble band
uniform float u_volume;  // overall loudness ← replaces wave.w

// 2×2 rotation
mat2 rot(float a){
    float c = cos(a), s = sin(a);
    return mat2(c, s, -s, c);
}

// 1D triangle fractal
float tri(float x){
    return abs(fract(x) - 0.5);
}
vec2 tri2(vec2 p){
    return vec2(
      tri(p.x + tri(p.y*2.0)),
      tri(p.y + tri(p.x*2.0))
    );
}

// constant rotation matrix from original
const mat2 M2 = mat2(
    0.970,  0.242,
   -0.242,  0.970
);

// triangle‐noise function
float triangleNoise(vec2 p){
    float z=1.5, z2=1.5, rz=0.0;
    vec2 bp = p * 0.8;
    for(int i=0; i<4; i++){
        vec2 dg = tri2(bp*2.0)*0.5;
        dg = dg * rot(u_time*4.5);
        p += dg / z2;
        bp *= 1.5; z2 *= 0.6; z *= 1.7;
        p *= 1.2; p = p * M2;
        rz += tri(p.x + tri(p.y)) / z;
    }
    return rz;
}

// “segment” distance with audio‐driven wave displacement
float segm(vec2 p, vec2 a, vec2 b, float nz){
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0)
            + nz*0.017;
    // use mid band as “wave” amplitude
    float waveAmp = u_mid;
    vec2 disp = pa - waveAmp*0.015*(h - 1.0) - ba*h;
    return length(disp) * waveAmp * 7.0 * waveAmp;
}

// core render loop
vec3 render(vec2 p){
    vec2 p1 = vec2(-1.0, 0.0);
    vec3 col = vec3(0.0);
    float nz = clamp(triangleNoise(p), 0.0, 1.0);
    float wav = u_volume;  // overall loudness

    // scale & scroll
    p /= (wav*1.0 + 0.5 + u_time*0.001);

    // accumulate 100 “filament” segments
    for(int i=0; i<100; i++){
        // slowly rotate the anchor
        float a1 = 0.05 + pow(u_time*2.25,1.5)*0.0007;
        p1 = p1 * rot(a1);

        float ang = 0.04*float(i) - u_time*1.575 - wav*1.5;
        vec2 p2 = p1 * rot(ang);

        float d = segm(p, p1, p2, nz);
        // color variation
        vec3 sineMod = abs(sin(vec3(
            0.6 + sin(u_time*0.05)*0.4,
            1.5,
            2.0
        ) + float(i)*0.011 + u_time*0.8));
        col += sineMod * (0.0015 / pow(d, 1.2));
    }

    // amplify by loudness
    return col * wav;
}

void main(){
    vec2 p = (gl_FragCoord.xy / u_resolution)*2.0 - 1.0;
    p.x *= u_resolution.x / u_resolution.y * 0.9;

    vec3 c = render(p*0.75);
    gl_FragColor = vec4(c, 1.0);
}
