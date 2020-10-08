export function getCentroid(vertexes) {
	const sums = [0, 0, 0];
	for (let i = 0; i < vertexes.length; i++) sums[i % 3] += vertexes[i];
	return sums.map((s) => s / vertexes.length);
}
