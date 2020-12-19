export function getUrl(path, base) {
    return new URL(path, base || window.location.href);
}
export function getUrlHref(path, base) {
    return new URL(path, base || window.location.href).href;
}
