import * as webglUtils from './js/libs/webgl-utils.js';
import { Scene } from './js/scene.js';

(async function boot() {
	const canvas = document.getElementById('gl-surface');

	const gl = webglUtils.getWebGLContext(canvas);

	const scene = new Scene(gl);
	await scene.load();
	scene.begin();
})();
