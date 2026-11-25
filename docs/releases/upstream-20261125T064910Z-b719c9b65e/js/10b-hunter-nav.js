// [10b-hunter-nav] 헌터 정보창 넘겨 보기 (◀ 이전 · 다음 ▶ · 📋 목록)
    // ============================================================================
    // - 헌터 정보창 맨 위 줄에서 이전/다음 헌터로 바로 넘긴다 (헌터 목록 순서 · 끝에서 처음으로 돌아감).
    // - 넘겨도 카메라는 움직이지 않는다 (정보창 내용만 바뀜).
    // - 📋 목록: 마을 전체 헌터 목록을 연다.
    // - 키보드: 정보창이 열려 있을 때 ← / → 키로도 넘길 수 있다.
    // ============================================================================
    function getSelectedHunterIndex() {
      return hunters.findIndex(h => h && h.id === gameState.selectedHunterId);
    }

    function showHunterByOffset(offset) {
      if (!hunters.length) return;
      const cur = getSelectedHunterIndex();
      const next = cur < 0 ? 0 : (cur + offset + hunters.length) % hunters.length;
      const h = hunters[next];
      if (!h) return;
      openHunterPanel(h);
    }

    function updateHunterNavCount() {
      const el = document.getElementById('hunterNavCount');
      if (!el) return;
      const idx = getSelectedHunterIndex();
      el.textContent = `${idx >= 0 ? idx + 1 : '-'} / ${hunters.length}`;
      const single = hunters.length <= 1;
      ['btnPrevHunter', 'btnNextHunter'].forEach((id) => {
        const b = document.getElementById(id);
        if (b) b.disabled = single;
      });
    }

    (function bindHunterNav() {
      document.getElementById('btnPrevHunter')?.addEventListener('click', () => showHunterByOffset(-1));
      document.getElementById('btnNextHunter')?.addEventListener('click', () => showHunterByOffset(1));
      document.getElementById('btnHunterNavList')?.addEventListener('click', () => {
        document.getElementById('btnOpenHunterRoster')?.click();
      });
      document.addEventListener('keydown', (e) => {
        const panel = document.getElementById('hunterPanel');
        if (!panel || !panel.classList.contains('active')) return;
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (e.key === 'ArrowLeft') { showHunterByOffset(-1); e.preventDefault(); }
        if (e.key === 'ArrowRight') { showHunterByOffset(1); e.preventDefault(); }
      });

      if (typeof refreshHunterPanel === 'function') {
        const origRefresh = refreshHunterPanel;
        refreshHunterPanel = function (...args) {
          const r = origRefresh.apply(this, args);
          try { updateHunterNavCount(); } catch (_) {}
          return r;
        };
      }
    })();
