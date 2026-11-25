// [33-user-code] 🔑 유저 고유 코드 · 접속 현황 기록 (운영자용 user-stats.html에서 확인)
    // ============================================================================
    // ■ 유저 고유 코드
    //   - 마을마다 영어 대문자 + 숫자 섞인 8글자 코드 (예: K7M2Q9XA). 헷갈리는 글자(O·0·I·1)는 쓰지 않는다.
    //   - 저장 데이터에 함께 들어가므로 클라우드 · 저장 코드로 다른 기기에서 불러와도 같은 코드를 쓴다.
    //   - ☁️ 구글 계정 · 클라우드 저장 창 맨 위에서 유저도 확인 · 복사할 수 있다.
    // ■ 접속 현황 기록 (Firestore presence/{유저코드})
    //   - 게임을 켜 둔 동안 10분마다 "지금 플레이 중" 시각을 남긴다 (화면을 내리면 멈춤).
    //   - 남기는 정보: 유저 코드 · 마지막 접속 시각 · 처음 시작 시각 · 게임 버전 · 구글 로그인 여부 · 헌터 수 · 보스 단계 · 앱/웹
    //     (이름 · 이메일 같은 개인 정보는 남기지 않는다)
    //   - 새 기기에서 켠 직후 예전 데이터를 불러오면 코드가 바뀌므로, 켠 뒤 20초가 지나서 처음 기록한다.
    //   - Firestore 보안 규칙에 presence 쓰기 허용이 있어야 기록된다 (없으면 조용히 건너뜀).
    // ============================================================================
    const USER_CODE_CFG = {
      chars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // O · 0 · I · 1 제외
      length: 8,
      localKey: 'aiht_user_code_v1',
      firstReportDelayMs: 20000,
      reportEveryMs: 10 * 60000 // 10분마다 기록
    };

    function makeUserCode() {
      const { chars, length } = USER_CODE_CFG;
      const pick = () => chars[Math.floor(Math.random() * chars.length)];
      for (;;) {
        let code = '';
        for (let i = 0; i < length; i++) code += pick();
        // 영어와 숫자가 둘 다 들어간 코드만 사용
        if (/[A-Z]/.test(code) && /[0-9]/.test(code)) return code;
      }
    }

    function isValidUserCode(code) {
      return typeof code === 'string' && /^[A-Z0-9]{8}$/.test(code);
    }

    // 지금 마을의 유저 코드 (없으면 만들어서 저장 데이터와 이 기기에 기억)
    function getUserCode() {
      if (!isValidUserCode(gameState.userCode)) {
        let code = '';
        try { code = localStorage.getItem(USER_CODE_CFG.localKey) || ''; } catch (_) {}
        if (!isValidUserCode(code)) code = makeUserCode();
        gameState.userCode = code;
        if (!gameState.userCodeCreatedAt) gameState.userCodeCreatedAt = Date.now();
      }
      try { localStorage.setItem(USER_CODE_CFG.localKey, gameState.userCode); } catch (_) {}
      return gameState.userCode;
    }

    // ---------- ☁️ 창에 유저 코드 표시 ----------
    function renderUserCodeBox() {
      const box = document.getElementById('userCodeBox');
      if (!box) return;
      const code = getUserCode();
      const html = `
        <div class="user-code-box">
          <div class="user-code-label">🔑 내 유저 코드</div>
          <div class="user-code-row">
            <span class="user-code-value">${code}</span>
            <button type="button" class="dock-btn" id="btnCopyUserCode">복사</button>
          </div>
          <div class="user-code-note">문의할 때 이 코드를 알려 주세요. 마을 데이터와 함께 저장되어 다른 기기에서도 같습니다.</div>
        </div>
      `;
      if (box.dataset.code !== code) {
        box.innerHTML = html;
        box.dataset.code = code;
      }
    }

    (function bindUserCodeBox() {
      document.getElementById('btnCloudAccount')?.addEventListener('click', () => setTimeout(renderUserCodeBox, 0));
      document.getElementById('userCodeBox')?.addEventListener('click', async (e) => {
        if (!e.target.closest('#btnCopyUserCode')) return;
        const code = getUserCode();
        let ok = false;
        try { await navigator.clipboard.writeText(code); ok = true; } catch (_) {}
        showToast(ok ? `🔑 유저 코드 ${code} 를 복사했습니다.` : `🔑 유저 코드: ${code}`);
      });
    })();

    // 저장을 불러오면 그 저장의 코드로 바뀐다 → 화면 · 이 기기 기억 맞추기
    if (typeof applyLoadedSaveData === 'function') {
      const origApplyForUserCode = applyLoadedSaveData;
      applyLoadedSaveData = function (...args) {
        const r = origApplyForUserCode.apply(this, args);
        try { getUserCode(); renderUserCodeBox(); } catch (_) {}
        return r;
      };
    }

    // ---------- 접속 현황 기록 ----------
    const UserPresence = { lastOkAt: 0, lastError: '', started: false };

    function getGameVersionTag() {
      const s = document.querySelector('script[src*="?v="]');
      const m = s ? String(s.getAttribute('src')).match(/\?v=([0-9a-z]+)/) : null;
      return m ? m[1] : '';
    }

    function isInstalledApp() {
      try {
        return window.matchMedia('(display-mode: standalone)').matches || document.referrer.startsWith('android-app://');
      } catch (_) {
        return false;
      }
    }

    async function reportUserPresence() {
      if (document.visibilityState === 'hidden') return false;
      if (typeof CloudSave === 'undefined' || !CloudSave.ready || !CloudSave.db || !CloudSave.fsMod) return false;
      const fs = CloudSave.fsMod;
      const code = getUserCode();
      try {
        await fs.setDoc(fs.doc(CloudSave.db, 'presence', code), {
          code,
          lastSeen: fs.serverTimestamp(),
          lastSeenMs: Date.now(),
          firstSeenMs: Number(gameState.userCodeCreatedAt) || Date.now(),
          ver: getGameVersionTag(),
          loggedIn: Boolean(CloudSave.user),
          hunters: Array.isArray(hunters) ? hunters.length : 0,
          bossStage: typeof BOSS_SANCTUM !== 'undefined' ? (BOSS_SANCTUM.bossStage || 1) : 1,
          app: isInstalledApp()
        }, { merge: true });
        UserPresence.lastOkAt = Date.now();
        UserPresence.lastError = '';
        return true;
      } catch (err) {
        UserPresence.lastError = String(err && err.code || err);
        return false;
      }
    }

    function startUserPresence() {
      if (UserPresence.started) return;
      UserPresence.started = true;
      setTimeout(reportUserPresence, USER_CODE_CFG.firstReportDelayMs);
      setInterval(reportUserPresence, USER_CODE_CFG.reportEveryMs);
      document.addEventListener('visibilitychange', () => {
        // 다시 화면으로 돌아오면 바로 한 번 (마지막 기록이 10분 넘게 지났을 때만)
        if (document.visibilityState === 'visible' && Date.now() - UserPresence.lastOkAt > USER_CODE_CFG.reportEveryMs) reportUserPresence();
      });
    }

    getUserCode();
    startUserPresence();
