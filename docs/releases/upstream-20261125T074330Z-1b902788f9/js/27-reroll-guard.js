// [27-reroll-guard] 🛡️ 리세마라 방지 (예전 저장으로 되돌리기 막기)
    // ============================================================================
    // 저장 코드 · 저장 파일을 미리 받아 두고, 마음에 안 드는 결과(영입 · 초월 · 보상 등)가 나오면
    // 예전 코드를 다시 불러와 되돌리는 것(리세마라)을 막는다.
    //
    // - 모든 저장에 '마을 번호(villageId)'와 '저장 순번(saveSeq)'을 넣는다. 저장할 때마다 순번 +1.
    // - 이 기기는 마을별로 '지금까지 본 가장 큰 순번'을 따로 기억한다 (localStorage, 초기화해도 지우지 않음).
    // - 저장 코드 · 파일 불러오기 때:
    //     · 같은 마을인데 이 기기가 본 것보다 순번이 작으면(=예전 저장) 불러오지 않는다.
    //     · 마을 번호가 없는 예전 버전 코드는, 이 기기에 기록된 마을이 하나도 없을 때(처음 옮겨 올 때)만 허용.
    //     · 다른 기기에서 가져온 최신 저장(순번이 같거나 큰 것)은 그대로 불러올 수 있다.
    // - 구글 클라우드 동기화는 항상 더 최근 저장을 쓰므로 그대로 둔다.
    // 한계: 브라우저 데이터를 통째로 지우면 이 기기의 기록도 사라진다.
    // ============================================================================
    const REROLL_GUARD_KEY = 'aiht_reroll_guard_v1';

    function readRerollGuard() {
      try {
        const raw = JSON.parse(localStorage.getItem(REROLL_GUARD_KEY) || '{}');
        return raw && typeof raw === 'object' && raw.villages && typeof raw.villages === 'object' ? raw : { villages: {} };
      } catch (_) {
        return { villages: {} };
      }
    }

    function writeRerollGuard(guard) {
      try { localStorage.setItem(REROLL_GUARD_KEY, JSON.stringify(guard)); } catch (_) {}
    }

    function rememberVillageSeq(villageId, seq) {
      if (!villageId) return;
      const guard = readRerollGuard();
      const prev = Math.max(0, Math.floor(Number(guard.villages[villageId]) || 0));
      if (seq > prev) {
        guard.villages[villageId] = seq;
        writeRerollGuard(guard);
      }
    }

    function makeVillageId() {
      const rnd = Math.random().toString(36).slice(2, 10);
      return `v${Date.now().toString(36)}${rnd}`;
    }

    // 18-save-system.js serializeGameSaveData()에서 부른다
    function getRerollGuardVillageId() {
      if (!gameState.villageId) gameState.villageId = makeVillageId();
      return gameState.villageId;
    }

    function nextRerollGuardSaveSeq() {
      const vid = getRerollGuardVillageId();
      const known = Math.max(0, Math.floor(Number(readRerollGuard().villages[vid]) || 0));
      gameState.saveSeq = Math.max(Math.floor(Number(gameState.saveSeq) || 0), known) + 1;
      rememberVillageSeq(vid, gameState.saveSeq);
      return gameState.saveSeq;
    }

    // 불러와도 되는 저장인지 판단 → { ok, reason }
    function checkSaveLoadAllowed(data) {
      if (!data || typeof data !== 'object') return { ok: false, reason: '저장 데이터를 읽을 수 없습니다.' };
      const guard = readRerollGuard();
      const knownVillages = Object.keys(guard.villages);
      const vid = typeof data.villageId === 'string' ? data.villageId : '';
      const seq = Math.max(0, Math.floor(Number(data.saveSeq) || 0));

      if (!vid) {
        if (knownVillages.length === 0) return { ok: true };
        return { ok: false, reason: '이전 버전에서 만든 저장 코드는 이 기기에서 불러올 수 없습니다. (리세마라 방지)' };
      }
      const maxSeen = Math.max(0, Math.floor(Number(guard.villages[vid]) || 0));
      if (maxSeen > 0 && seq < maxSeen) {
        return { ok: false, reason: '이 마을은 이미 더 진행된 저장이 있어, 예전 저장으로 되돌릴 수 없습니다. (리세마라 방지)' };
      }
      return { ok: true };
    }

    // 저장 코드 · 파일 불러오기에 검사 끼우기 (19-save-code-reset.js)
    if (typeof applySaveCodeString === 'function') {
      const origApplySaveCodeString = applySaveCodeString;
      applySaveCodeString = async function (rawCode) {
        const data = await decodeSaveCodeToData(rawCode);
        const verdict = checkSaveLoadAllowed(data);
        if (!verdict.ok) {
          if (typeof setSaveCodeFeedback === 'function') setSaveCodeFeedback(`⛔ ${verdict.reason}`, true);
          showToast(`⛔ ${verdict.reason}`);
          return;
        }
        return origApplySaveCodeString(rawCode);
      };
    }

    // 불러온 저장의 순번도 이 기기 기록에 반영
    if (typeof applyLoadedSaveData === 'function') {
      const origApplyForGuard = applyLoadedSaveData;
      applyLoadedSaveData = function (...args) {
        const r = origApplyForGuard.apply(this, args);
        try { rememberVillageSeq(getRerollGuardVillageId(), Math.floor(Number(gameState.saveSeq) || 0)); } catch (_) {}
        return r;
      };
    }

    // 게임을 켠 직후 한 번 기록 (예전 버전 저장이면 이때 마을 번호가 생김)
    setTimeout(() => {
      try { rememberVillageSeq(getRerollGuardVillageId(), Math.floor(Number(gameState.saveSeq) || 0)); } catch (_) {}
    }, 2000);
