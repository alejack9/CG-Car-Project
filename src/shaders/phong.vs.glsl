attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec3 a_tangent;
attribute vec4 a_color;
attribute vec2 a_texcoord;

uniform mat4 u_perspective;
uniform mat4 u_view;
uniform mat4 u_world;
uniform vec3 u_viewWorldPosition;
// uniform vec3 lightPosition; 

varying vec3 v_normal;
varying vec3 v_tangent;
varying vec3 v_surfaceToView;
varying vec2 v_texcoord;
varying vec4 v_color;
varying vec3 v_vertPos;


void main() {
    vec4 worldPosition = u_world * a_position;
    v_vertPos = worldPosition.xyz; // / worldPosition.w; w is always 1
    gl_Position = u_perspective * u_view * worldPosition;
    v_surfaceToView = normalize(u_viewWorldPosition - v_vertPos);

    // v_normal = normalize(mat3(u_world) * a_normal);
    mat3 normalMat = mat3(u_world);
    v_normal = normalMat * a_normal;
    v_tangent = normalMat * a_tangent;

    // Pass the texcoord to the fragment shader.
    v_texcoord = a_texcoord;
    v_color = a_color;
}