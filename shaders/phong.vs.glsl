attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec2 a_texcoord;
attribute vec4 a_color;

uniform mat4 u_perspection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform vec3 u_viewWorldPosition;

varying vec3 v_normal;
varying vec3 v_surfaceToView;
varying vec2 v_texcoord;
varying vec4 v_color;

void main() {
    vec4 worldPosition = u_world * a_position;
    gl_Position = u_perspection * u_view * worldPosition;
    v_surfaceToView = normalize(u_viewWorldPosition - worldPosition.xyz);

    v_normal = normalize(mat3(u_world) * a_normal);
    // Pass the texcoord to the fragment shader.
    v_texcoord = a_texcoord;
    v_color = a_color;
}