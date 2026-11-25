// AI 헌터 타이쿤 서비스 워커 (앱 설치 · 오프라인 실행용)
// - 게임 화면·코드(html/js/css): 인터넷이 되면 항상 최신 파일을 받고, 안 되면 저장해 둔 파일로 실행
// - 이미지: 한 번 받은 것은 저장해 두고 바로 사용 (파일 주소의 ?v= 가 바뀌면 새로 받음)
// - 다른 사이트 요청(구글 로그인·클라우드 저장 등)은 건드리지 않음
const CACHE_NAME = 'ai-hunter-tycoon-v1';
const CORE_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_FILES))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 다른 사이트 요청은 브라우저 기본 동작
  if (url.pathname.includes('/test/')) return;

  const isImage = /\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname);
  if (isImage) {
    // 이미지: 저장본 우선
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(req).then(hit => hit || fetch(req).then(res => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }))
      )
    );
    return;
  }

  // 화면·코드: 최신 우선, 실패하면 저장본
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
