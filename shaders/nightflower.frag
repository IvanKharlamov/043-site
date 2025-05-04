// https://www.shadertoy.com/view/Xtfcz4


#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass band
uniform float u_mid;     // mid band
uniform float u_high;    // treble band
uniform float u_volume;  // overall RMS loudness

#define PI 3.14159265359

// simple clamp
#define saturate(x) clamp(x,0.,1.)

// rotate 2D vector by angle (radians)
void pR(inout vec2 p, float a) {
    float c = cos(a), s = sin(a);
    p = vec2(c*p.x + s*p.y, -s*p.x + c*p.y);
}

// polar repetition fold
float pModPolar(inout vec2 p, float reps){
    float ang = 2.0*PI/reps;
    float a = atan(p.y,p.x) + ang/2.0;
    float r = length(p);
    float c = floor(a/ang);
    a = mod(a,ang) - ang/2.0;
    p = vec2(cos(a), sin(a)) * r;
    return c;
}

// map [0,1]→band: bass(0–.33), mid(.33–.66), high(.66–1)
float sampleVol(float x) {
    if(x < 0.33)      return u_low;
    else if(x < 0.66) return u_mid;
    else              return u_high;
}

// scope bar generator
vec3 scopeGen(vec2 p, float width, float height){
    // normalized x [0,1]
    float xPos = (p.x + width*0.5)/width;
    float blk  = clamp(xPos, 0.0, 1.0);

    // smooth three‐point sampling
    float s0 = sampleVol(clamp(blk - 1.0/width, 0.0, 1.0));
    float s1 = sampleVol(blk);
    float s2 = sampleVol(clamp(blk + 1.0/width, 0.0, 1.0));
    float sv = (s0 + s1 + s2)/3.0;

    float amp   = sv*sv;
    float bH    = amp * height;
    float fade  = 1.0 - step(0.5, abs(xPos-0.5));
    float bar   = 1.0 - step(bH, abs(p.y));
    float o    = fade * bar;

    // color ramp L→R: blue→red→yellow
    vec3 minC = vec3(0.0,0.0,1.0);
    vec3 maxC = mix(vec3(1.0,0.0,0.0), vec3(1.0,1.0,0.0), saturate(xPos));
    // interpolate by overall volume for a bit of extra motion
    vec3 col = mix(minC, maxC, pow(u_volume, 0.5));

    return col * o;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uvRes = fragCoord - 0.5*u_resolution;
    float mult = u_resolution.x / 1000.0;

    // circle pulse by bass²
    float circleAmt  = u_low*u_low;
    float circleMax = 100.0 * mult;
    float cPos      = circleAmt * circleMax;
    float distC     = abs(length(uvRes) - cPos);
    float circle   = saturate(1.0 - distC/(800.0*mult));
    // color gradient blue→magenta by treble
    vec3 cCol = mix(vec3(0.1,0.1,1.0), vec3(1.0,0.1,1.0), u_high*u_high);
    vec3 circleColor = cCol * pow(circle, 99.0);

    // rotate the plane
    vec2 p = uvRes;
    pR(p, radians(u_time)*30.0);

    // polar repeat & offset
    p /= 0.8;
    pModPolar(p, 6.0);
    // offset by mids for swirl
    float brightness = u_mid*u_mid;
    float offset     = (200.0 + 150.0*(brightness - 0.5)) * mult;
    p.x -= offset;
    pR(p, radians(90.0));
    p.x += offset;

    // draw scope bars
    vec3 bars = scopeGen(p - vec2(150.0*mult,0.0), 300.0*mult, 300.0*mult);

    // combine
    vec3 col = saturate(bars*0.5 + circleColor);

    fragColor = vec4(col, 1.0);
}

// entrypoint for glslCanvas
void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}