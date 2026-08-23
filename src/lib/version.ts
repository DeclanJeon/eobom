/** 앱 표기용 버전. package.json / CI release-note가 단일 소스. */
export const APP_VERSION = "1.17.1";

export function appVersionLabel(prefix = "v") {
  return `${prefix}${APP_VERSION}`;
}
