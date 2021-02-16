precision mediump float;

varying vec3 v_normal;
varying vec3 v_tangent;
varying vec3 v_surfaceToView;
varying vec2 v_texcoord;
varying vec4 v_color;
varying vec3 v_vertPos;
 
uniform sampler2D diffuseMap;
uniform sampler2D specularMap;
uniform sampler2D normalMap;
uniform vec3 Kd;
uniform vec3 Ka;
uniform vec3 Ks;
uniform float n;
uniform vec3 Ia;
uniform vec3 Is;
uniform vec3 lightPosition; 

void main() {
    vec3 N = normalize(v_normal);
    vec3 L = normalize(lightPosition - v_vertPos);
    // vec3 L = normalize(lightDirection); // use light position instead
    vec3 tangent = normalize(v_tangent);
    vec3 bitangent = normalize(cross(N, tangent));

    vec4 diffuseMapColor = texture2D(diffuseMap, v_texcoord);
    vec4 specularMapColor = texture2D(specularMap, v_texcoord);

    mat3 tbn = mat3(tangent, bitangent, N);
    N = texture2D(normalMap, v_texcoord).rgb * 2. - 1.;
    N = normalize(tbn * N);

    // Iambient
    vec3 result = Ka * Ia;

    // Lambert's cosine law
    float lambertian = max(dot(N, L), 0.0);
    // add Idiffuse
    // TODO possibility to show transparent texture
    // result += ((1.0-diffuseMapColor.a) * Kd + (diffuseMapColor.rgb * diffuseMapColor.a)) * lambertian * v_color.rgb;
    result += Kd * lambertian * diffuseMapColor.rgb * v_color.rgb;
    if(lambertian > 0.0)
              result += Ks * pow(max(dot(reflect(-L, N), v_surfaceToView), 0.0), n) * specularMapColor.rgb;
              // Ispecular = Ks * max(R.V, 0.0)^n * color where R = ~~reflect L by N (L becames incident)~~
              // I calculate cos(alpha) and not cos(alpha/2), so it follows the Phong model

    gl_FragColor = vec4(result, 1.0);
}