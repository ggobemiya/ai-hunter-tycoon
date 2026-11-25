// [20-wake-lock] 화면 꺼짐 방지 (Wake Lock)
    // 모바일 웹 화면이 오래 켜져 있어도 꺼지지 않도록 Screen Wake Lock 유지
    let screenWakeLock = null;
    let wakeLockRetryTimer = null;

    async function requestKeepScreenAwake() {
      try {
        if (document.visibilityState !== 'visible') return;
        if (screenWakeLock && !screenWakeLock.released) return;
        if (navigator.wakeLock && typeof navigator.wakeLock.request === 'function') {
          const sentinel = await navigator.wakeLock.request('screen');
          screenWakeLock = sentinel;
          sentinel.addEventListener('release', () => {
            if (screenWakeLock === sentinel) {
              screenWakeLock = null;
            }
          });
        }
      } catch (_) {
        // 브라우저 권한/절전 정책 또는 비-HTTPS 환경에서 거부될 수 있으므로 무시
      }
    }

    (function bindKeepScreenAwake() {
      requestKeepScreenAwake();

      const triggerWakeLockOnInteraction = () => {
        if (!screenWakeLock || screenWakeLock.released) {
          requestKeepScreenAwake();
        }
      };

      window.addEventListener('pointerdown', triggerWakeLockOnInteraction, { passive: true });
      window.addEventListener('touchstart', triggerWakeLockOnInteraction, { passive: true });
      window.addEventListener('focus', () => {
        requestKeepScreenAwake();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          requestKeepScreenAwake();
        } else if (screenWakeLock && !screenWakeLock.released) {
          screenWakeLock.release().catch(() => {});
          screenWakeLock = null;
        }
      });

      wakeLockRetryTimer = setInterval(() => {
        if (document.visibilityState === 'visible' && (!screenWakeLock || screenWakeLock.released)) {
          requestKeepScreenAwake();
        }
      }, 15000);
    })();
