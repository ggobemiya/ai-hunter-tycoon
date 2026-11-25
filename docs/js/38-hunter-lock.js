// [38-hunter-lock] 🔒 헌터 잠금
//   - 헌터 정보창(이름 옆 🔓/🔒) 또는 마을 전체 헌터 목록(이름 옆 🔓/🔒)에서 잠그고 풉니다.
//   - 잠긴 헌터는 추방 버튼이 회색으로 꺼지고, 추방할 수 없습니다.
//   - 잠금 상태는 헌터 저장 정보(locked)에 함께 저장됩니다 (18-save-system.js · 19-save-code-reset.js lk).

    function toggleHunterLock(hunterId) {
      const h = hunters.find(item => item.id === hunterId);
      if (!h) return;
      h.locked = !h.locked;
      showToast(h.locked
        ? `🔒 '${h.name}' 헌터를 잠갔습니다. 잠금을 풀기 전에는 추방할 수 없습니다.`
        : `🔓 '${h.name}' 헌터의 잠금을 풀었습니다.`);
      updateHunterLockUi();
      if (document.getElementById('hunterRosterBackdrop')?.classList.contains('open')) {
        renderHunterRosterModal(true);
      }
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
    }

    // 헌터 정보창의 잠금 버튼 · 추방 버튼 모양 맞추기
    function updateHunterLockUi() {
      const id = gameState.selectedHunterId;
      const h = id ? hunters.find(item => item.id === id) : null;
      const locked = !!(h && h.locked);
      const lockBtn = document.getElementById('btnToggleHunterLock');
      if (lockBtn) {
        const icon = locked ? '🔒' : '🔓';
        if (lockBtn.textContent !== icon) lockBtn.textContent = icon;
        lockBtn.classList.toggle('locked', locked);
        lockBtn.title = locked ? '잠금 해제' : '잠그면 추방할 수 없습니다';
      }
      const banishBtn = document.getElementById('btnBanishHunter');
      if (banishBtn && banishBtn.disabled !== locked) {
        banishBtn.disabled = locked;
        banishBtn.title = locked ? '잠긴 헌터는 추방할 수 없습니다' : '이 헌터를 마을에서 추방';
      }
    }

    document.getElementById('btnToggleHunterLock')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (gameState.selectedHunterId) toggleHunterLock(gameState.selectedHunterId);
    });

    (function hookHunterPanelLock() {
      if (typeof refreshHunterPanel !== 'function') return;
      const origRefresh = refreshHunterPanel;
      refreshHunterPanel = function (...args) {
        const result = origRefresh.apply(this, args);
        try { updateHunterLockUi(); } catch (_) {}
        return result;
      };
    })();

    // 잠긴 헌터는 어떤 경로로도 추방되지 않게 막는다
    (function guardLockedBanish() {
      const isLocked = (id) => !!hunters.find(item => item.id === id && item.locked);
      if (typeof openBanishConfirmModal === 'function') {
        const origOpen = openBanishConfirmModal;
        openBanishConfirmModal = function (hunterId, ...rest) {
          if (isLocked(hunterId)) {
            showToast('🔒 잠긴 헌터는 추방할 수 없습니다. 먼저 잠금을 풀어 주세요.');
            return;
          }
          return origOpen.call(this, hunterId, ...rest);
        };
      }
      if (typeof banishHunterById === 'function') {
        const origBanish = banishHunterById;
        banishHunterById = function (hunterId, ...rest) {
          if (isLocked(hunterId)) {
            showToast('🔒 잠긴 헌터는 추방할 수 없습니다.');
            return;
          }
          return origBanish.call(this, hunterId, ...rest);
        };
      }
    })();
