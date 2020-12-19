// https://stackoverflow.com/questions/641857/javascript-window-resize-event
// Post by user 'Alex V'

export function AddEvent(obj, type, cb) {
	if (obj === null || typeof obj === 'undefined') return;
	if (obj.addEventListener) return obj.addEventListener(type, cb, false);
	if (obj.attachEvent) return obj.attachEvent('on' + type, cb);
	else return (obj['on' + type] = cb);
}

export function RemoveEvent(obj, type, cb) {
	if (obj === null || typeof obj === 'undefined') return;
	if (obj.removeEventListener)
		return obj.removeEventListener(type, cb, false);
	if (obj.detachEvent) return obj.detachEvent('on' + type, cb);
	else return (obj['on' + type] = cb);
}
