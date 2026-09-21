// prisma/seed/media-url.ts
// 미디어 URL 공용 빌더.
//
// MEDIA_CDN_BASE_URL(예: https://dxxxxxxxx.cloudfront.net)이 설정되어 있으면
// 절대 CDN URL을 생성하고, 설정되어 있지 않으면 상대 경로를 그대로 반환해
// 로컬 정적 서빙(/test/audio/, /test/photos/, /topik-data/)으로 동작한다.
//
// 모든 시드 스크립트는 DB에 저장할 미디어 URL을 이 함수로만 생성해야 한다.

export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function cdnBaseUrl(): string {
  return (process.env.MEDIA_CDN_BASE_URL ?? '').trim().replace(/\/+$/, '');
}

export function hasMediaCdnBase(): boolean {
  return cdnBaseUrl().length > 0;
}

/**
 * 상대 경로(예: /test/audio/listening/q01.mp3)를 DB에 저장할 미디어 URL로 변환한다.
 * - 외부 URL은 그대로 반환한다.
 * - MEDIA_CDN_BASE_URL 미설정 시 상대 경로를 그대로 반환한다(로컬 개발).
 * - 설정 시 `{MEDIA_CDN_BASE_URL}{path}` 절대 URL을 반환한다.
 */
export function buildMediaUrl(pathOrUrl: string): string {
  if (!pathOrUrl || isExternalUrl(pathOrUrl) || !hasMediaCdnBase()) {
    return pathOrUrl;
  }
  return pathOrUrl.startsWith('/')
    ? `${cdnBaseUrl()}${pathOrUrl}`
    : `${cdnBaseUrl()}/${pathOrUrl}`;
}
