precision mediump float;

varying vec3 v_normal;
varying vec3 v_surfaceToView;
varying vec2 v_texcoord;
varying vec4 v_color;
 
uniform sampler2D diffuseMap;
uniform sampler2D specularMap;
uniform vec3 Kd;
uniform vec3 Ka;
uniform vec3 Ks;
uniform float n;
uniform vec3 Ia;
uniform vec3 Is;
uniform vec3 L; 

void main() {
  vec4 diffuseMapColor = texture2D(diffuseMap, v_texcoord);
  vec4 specularMapColor = texture2D(specularMap, v_texcoord);

  // Iambient
  vec3 result = Ka * Ia;

  // Lambert's cosine law
  float lambertian = max(dot(v_normal, L), 0.0);
  if(lambertian > 0.0)
    // add Idiffuse and Ispecular
    result += Kd * lambertian * diffuseMapColor.rgb * v_color.rgb
              + Ks * pow(max(dot(reflect(-L, v_normal), v_surfaceToView), 0.0), n) * specularMapColor.rgb;
              // Ispecular = Ks * max(R.V, 0.0)^n * color where R = __reflect L by N__

  gl_FragColor = vec4(result, 1.0);
}