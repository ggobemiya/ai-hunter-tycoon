// [23-mobile-layout] 세로 휴대폰 · 폴드(접은/펼친 화면) 전용 화면 배치
    // ============================================================================
    // 화면 폭이 1024px 이하이면 'compact-ui' 배치로 바꾼다.
    //  - 위쪽: 자원 표시 한 줄만
    //  - 아래쪽 버튼 바: 영입 · 부지 · 보스 · 오크 토벌 · (포기) · ☰ 메뉴
    //  - 오른쪽 지도 버튼: 확대 · 마을 중앙 · 축소
    //  - ☰ 메뉴: 저장 · 로그인 · 절전 · 가이드 · 전체화면 · 초기화
    // 기존 버튼을 그대로 옮겨 담기 때문에 버튼 기능과 글자 변경(보스 카운트다운 등)은 그대로 동작한다.
    // 화면이 넓어지면(PC, 가로로 넓은 태블릿) 원래 자리로 되돌린다.
    // ============================================================================
    (function setupMobileLayout() {
      const COMPACT_QUERY = '(max-width: 1024px)';
      const GROUPS = {
        bar: ['btnRecruitHunter', 'btnExpandPlot', 'btnOpenUserInventory', 'btnOpenMailbox', 'btnBossRaidControl', 'btnOrcSubjugationRaid', 'btnAbandonBossRaid'],
        map: ['btnZoomIn', 'btnReset', 'btnZoomOut'],
        menu: ['btnSaveCloud', 'btnCloudAccount', 'btnTogglePowerSaving', 'btnOpenHelpModal', 'btnToggleFullscreen', 'btnResetProgress']
      };
      const containers = {
        bar: document.getElementById('mobileActionBar'),
        map: document.getElementById('mapControls'),
        menu: document.getElementById('mobileMenuGrid')
      };
      const menuBtn = document.getElementById('btnMobileMenu');
      const backdrop = document.getElementById('mobileMenuBackdrop');
      if (!containers.bar || !containers.map || !containers.menu || !menuBtn || !backdrop) return;

      // 원래 자리를 기억하는 표시(주석 노드)를 각 버튼 앞에 남겨 둔다
      const markers = new Map();
      Object.values(GROUPS).flat().forEach((id) => {
        const el = document.getElementById(id);
        if (!el || !el.parentNode) return;
        const marker = document.createComment(`home:${id}`);
        el.parentNode.insertBefore(marker, el);
        markers.set(el, marker);
      });

      function openMenu() {
        backdrop.classList.add('open');
      }
      function closeMenu() {
        backdrop.classList.remove('open');
      }

      let compactNow = null;
      function applyLayout(compact) {
        if (compact === compactNow) return;
        compactNow = compact;
        document.body.classList.toggle('compact-ui', compact);
        if (compact) {
          Object.entries(GROUPS).forEach(([group, ids]) => {
            ids.forEach((id) => {
              const el = document.getElementById(id);
              if (el) containers[group].appendChild(el);
            });
          });
          containers.bar.appendChild(menuBtn);
        } else {
          markers.forEach((marker, el) => {
            if (marker.parentNode) marker.parentNode.insertBefore(el, marker);
          });
          document.body.appendChild(menuBtn);
          closeMenu();
        }
      }

      menuBtn.addEventListener('click', () => {
        if (backdrop.classList.contains('open')) closeMenu();
        else openMenu();
      });
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeMenu();
      });
      // 메뉴 안 버튼을 누르면 원래 기능을 실행한 뒤 메뉴를 닫는다
      containers.menu.addEventListener('click', (e) => {
        if (e.target.closest('button')) setTimeout(closeMenu, 0);
      });

      const mq = window.matchMedia(COMPACT_QUERY);
      applyLayout(mq.matches);
      const onChange = (e) => applyLayout(e.matches);
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    })();

    // ============================================================================
    // 하단 UI 높이 맞추기: 알림(토스트) · 건물 패널이 하단 버튼 줄을 가리지 않게
    //  - 지금 보이는 하단 줄(PC: .bottom-dock / 휴대폰·폴드: #mobileActionBar)의 실제 높이를 재서
    //    CSS 변수 --bottom-ui-gap(화면 아래 끝 ~ 하단 줄 위 끝 거리)에 넣는다.
    //  - 휴대폰 제스처 바(safe-area) · 버튼이 두 줄로 넘어가는 경우까지 자동으로 반영된다.
    // ============================================================================
    (function syncBottomUiGap() {
      const measure = () => {
        const compact = document.body.classList.contains('compact-ui');
        const bar = compact ? document.getElementById('mobileActionBar') : document.querySelector('.bottom-dock');
        if (!bar) return;
        const r = bar.getBoundingClientRect();
        if (r.height <= 0) return;
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const gap = Math.max(0, Math.round(vh - r.top));
        document.documentElement.style.setProperty('--bottom-ui-gap', `${gap}px`);
      };
      window.addEventListener('resize', measure);
      window.addEventListener('orientationchange', () => setTimeout(measure, 300));
      if (window.visualViewport) window.visualViewport.addEventListener('resize', measure);
      // 버튼 글자(인벤토리 개수 · 우편 개수 등)가 바뀌면 줄 높이가 달라질 수 있어 가볍게 주기적으로도 잰다
      setInterval(measure, 1500);
      setTimeout(measure, 300);
      measure();
    })();

    // ============================================================================
    // 위쪽 UI 여백 맞추기: 휴대폰 앱 속 브라우저(네이버 앱 등)의 주소창이 위쪽 버튼을 가리지 않게
    //  - 화면이 주소창 아래로 밀려 보이면(visualViewport.offsetTop) 그만큼 위쪽 UI를 내린다.
    //  - 네이버 앱은 주소창이 화면 위를 덮는 경우가 있어 기본 여백을 더 준다.
    //  - 페이지가 스크롤돼 위쪽이 잘려 보이면 맨 위로 되돌린다.
    // ============================================================================
    (function syncTopUiGap() {
      const ua = navigator.userAgent || '';
      const isNaverApp = /NAVER\(inapp/i.test(ua);
      const NAVER_EXTRA = 44; // 네이버 앱 주소창 높이 정도
      if (isNaverApp) document.body.classList.add('naver-inapp');
      const measure = () => {
        if (window.scrollY || document.documentElement.scrollTop) window.scrollTo(0, 0);
        const vvTop = window.visualViewport ? Math.max(0, Math.round(window.visualViewport.offsetTop)) : 0;
        const gap = vvTop + (isNaverApp ? NAVER_EXTRA : 0);
        document.documentElement.style.setProperty('--top-ui-gap', `${gap}px`);
      };
      window.addEventListener('resize', measure);
      window.addEventListener('scroll', measure, { passive: true });
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', measure);
        window.visualViewport.addEventListener('scroll', measure);
      }
      setTimeout(measure, 300);
      measure();
    })();
