// [30-mailbox] 📮 우편함 (운영자 → 전체 유저 보상 · 개인 우편)
    // ============================================================================
    // ■ 운영자 우편 보내는 법
    //   아래 MAILBOX_GLOBAL_MAILS 맨 위에 한 통을 추가하고 업로드하면, 게임을 켜는 모든 유저 우편함에 들어간다.
    //   {
    //     id: '2026-12-01-event',            // 겹치지 않는 고유 이름 (한 번 정하면 바꾸지 말 것)
    //     title: '이벤트 보상',
    //     body: '함께해 주셔서 감사합니다!',
    //     from: '운영자',
    //     sentAt: '2026-12-01',
    //     expiresAt: '2026-12-31',           // 선택: 이 날짜가 지나면 받을 수 없음 (없으면 무기한)
    //     rewards: [
    //       { type: 'item', itemId: 'transcend_ticket', qty: 1 },   // 🎒 인벤토리 아이템 (25-user-inventory.js 등록 id)
    //       { type: 'points', qty: 100 },                            // 🎖️ 토벌 포인트
    //       { type: 'gold', qty: 1000000 }                           // 💰 마을 금고 골드
    //     ]
    //   }
    // ■ 받은 기록: gameState.mailbox.claimed (저장 · 저장 코드 · 클라우드) + 이 기기 기록(localStorage)
    //   → 예전 저장을 불러와도 같은 우편을 두 번 받을 수 없다.
    // ■ 개인 우편: gameState.mailbox.personal (게임이 유저 한 명에게만 보내는 우편, 예: 1회성 패치 보상)
    // ============================================================================
    const MAILBOX_GLOBAL_MAILS = [
      {
        id: '2026-11-24-welcome-mailbox',
        title: '📮 우편함이 생겼습니다',
        body: '앞으로 운영자 보상과 이벤트 선물은 이 우편함으로 보내 드립니다. [받기]를 누르면 보상이 들어옵니다.',
        from: '운영자',
        sentAt: '2026-11-24',
        rewards: [{ type: 'points', qty: 500 }]
      }
    ];

    const MAIL_LEDGER_KEY = 'aiht_mail_ledger_v1';

    function getMailboxState() {
      if (!gameState.mailbox || typeof gameState.mailbox !== 'object') gameState.mailbox = { claimed: [], personal: [] };
      if (!Array.isArray(gameState.mailbox.claimed)) gameState.mailbox.claimed = [];
      if (!Array.isArray(gameState.mailbox.personal)) gameState.mailbox.personal = [];
      return gameState.mailbox;
    }

    function readMailLedger() {
      try {
        const raw = JSON.parse(localStorage.getItem(MAIL_LEDGER_KEY) || '{}');
        return raw && typeof raw === 'object' ? raw : {};
      } catch (_) {
        return {};
      }
    }

    function mailVillageKey() {
      return typeof getRerollGuardVillageId === 'function' ? getRerollGuardVillageId() : 'default';
    }

    function isMailClaimed(id) {
      if (getMailboxState().claimed.includes(id)) return true;
      const list = readMailLedger()[mailVillageKey()];
      return Array.isArray(list) && list.includes(id);
    }

    function markMailClaimed(id) {
      const st = getMailboxState();
      if (!st.claimed.includes(id)) st.claimed.push(id);
      const ledger = readMailLedger();
      const vk = mailVillageKey();
      ledger[vk] = Array.isArray(ledger[vk]) ? ledger[vk] : [];
      if (!ledger[vk].includes(id)) ledger[vk].push(id);
      try { localStorage.setItem(MAIL_LEDGER_KEY, JSON.stringify(ledger)); } catch (_) {}
    }

    function isMailExpired(mail) {
      if (!mail.expiresAt) return false;
      const end = new Date(`${mail.expiresAt}T23:59:59`);
      return Number.isFinite(end.getTime()) && Date.now() > end.getTime();
    }

    // 받을 수 있는 우편 (전체 + 개인, 최신순)
    function getPendingMails() {
      const all = [...getMailboxState().personal, ...MAILBOX_GLOBAL_MAILS];
      return all
        .filter(m => m && m.id && !isMailClaimed(m.id) && !isMailExpired(m))
        .sort((a, b) => String(b.sentAt || '').localeCompare(String(a.sentAt || '')));
    }

    function describeMailReward(r) {
      if (r.type === 'item') {
        const def = typeof USER_ITEM_CATALOG !== 'undefined' ? USER_ITEM_CATALOG[r.itemId] : null;
        return `${def?.icon || '🎁'} ${def?.name || r.itemId} x${r.qty || 1}`;
      }
      if (r.type === 'points') return `🎖️ 토벌 포인트 ${Number(r.qty || 0).toLocaleString()}P`;
      if (r.type === 'gold') return `💰 ${formatGold(Number(r.qty || 0))} G`;
      return '🎁 보상';
    }

    function grantMailReward(r) {
      const qty = Math.max(0, Math.floor(Number(r.qty) || 0));
      if (qty <= 0) return;
      if (r.type === 'item' && typeof addUserItem === 'function') addUserItem(r.itemId, qty);
      else if (r.type === 'points') gameState.subjugationPoints = Math.max(0, Math.floor(Number(gameState.subjugationPoints) || 0)) + qty;
      else if (r.type === 'gold') gameState.gold = (Number(gameState.gold) || 0) + qty;
    }

    function claimMail(id, { silent = false } = {}) {
      const mail = getPendingMails().find(m => m.id === id);
      if (!mail) return false;
      markMailClaimed(mail.id); // 보상보다 먼저 기록 (두 번 받기 방지)
      (mail.rewards || []).forEach(grantMailReward);
      updateResourceHUD();
      if (!silent) showToast(`📮 '${mail.title}' 보상을 받았습니다! ${(mail.rewards || []).map(describeMailReward).join(' · ')}`);
      if (typeof flushSyncBackup === 'function') flushSyncBackup();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
      refreshMailboxViews();
      return true;
    }

    function claimAllMails() {
      const list = getPendingMails();
      if (list.length === 0) return 0;
      list.forEach(m => claimMail(m.id, { silent: true }));
      showToast(`📮 우편 ${list.length}통의 보상을 모두 받았습니다!`);
      return list.length;
    }

    // 게임이 유저 한 명에게 보내는 우편 (같은 id는 한 번만)
    function sendPersonalMail(mail) {
      const st = getMailboxState();
      if (!mail || !mail.id) return false;
      if (st.personal.some(m => m.id === mail.id) || isMailClaimed(mail.id)) return false;
      st.personal.push({ from: '운영자', sentAt: new Date().toISOString().slice(0, 10), ...mail });
      refreshMailboxViews();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
      return true;
    }

    // ---------- 화면 ----------
    function ensureMailboxModal() {
      if (document.getElementById('mailboxBackdrop')) return;
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div class="tier-modal-backdrop" id="mailboxBackdrop" style="z-index:44;">
          <div class="tier-modal" style="width:min(95vw,560px);">
            <div class="panel-header">
              <div class="panel-title"><span>📮</span><span>우편함</span></div>
              <button class="btn-close" id="btnCloseMailbox">✕</button>
            </div>
            <div class="tier-modal-body" id="mailboxBody"></div>
          </div>
        </div>
      `;
      document.body.appendChild(wrap.firstElementChild);
      const bd = document.getElementById('mailboxBackdrop');
      document.getElementById('btnCloseMailbox').addEventListener('click', () => bd.classList.remove('open'));
      bd.addEventListener('click', (e) => { if (e.target === bd) bd.classList.remove('open'); });
      document.getElementById('mailboxBody').addEventListener('click', (e) => {
        const one = e.target.closest('[data-mail-claim]');
        if (one) { claimMail(one.getAttribute('data-mail-claim')); return; }
        if (e.target.closest('#btnClaimAllMail')) claimAllMails();
      });
    }

    function renderMailbox() {
      const body = document.getElementById('mailboxBody');
      if (!body) return;
      const list = getPendingMails();
      const cards = list.map(m => `
        <div class="mail-card">
          <div class="mail-card-head">
            <span class="mail-card-title">${m.title}</span>
            <span class="mail-card-meta">${m.from || '운영자'} · ${m.sentAt || ''}${m.expiresAt ? ` · ${m.expiresAt}까지` : ''}</span>
          </div>
          <div class="mail-card-body">${m.body || ''}</div>
          <div class="mail-card-foot">
            <span class="mail-card-rewards">${(m.rewards || []).map(describeMailReward).join(' · ') || '보상 없음'}</span>
            <button type="button" class="btn-upgrade" data-mail-claim="${m.id}">받기</button>
          </div>
        </div>
      `).join('');
      body.innerHTML = list.length > 0
        ? `
          <div class="shop-head">
            <span>받지 않은 우편 <b style="color:#fde047;">${list.length}통</b></span>
            <button type="button" class="dock-btn primary" id="btnClaimAllMail" style="padding:5px 10px;font-size:11.5px;">모두 받기</button>
          </div>
          <div class="shop-list" style="margin-top:8px;">${cards}</div>
        `
        : '<div class="user-inv-detail">받을 우편이 없습니다.</div>';
    }

    function openMailbox() {
      ensureMailboxModal();
      renderMailbox();
      document.getElementById('mailboxBackdrop').classList.add('open');
    }

    function refreshMailboxViews() {
      if (document.getElementById('mailboxBackdrop')?.classList.contains('open')) renderMailbox();
      const btn = document.getElementById('btnOpenMailbox');
      if (btn) {
        const n = getPendingMails().length;
        btn.textContent = n > 0 ? `📮 우편 (${n})` : '📮 우편';
        btn.classList.toggle('has-mail', n > 0);
      }
    }

    document.getElementById('btnOpenMailbox')?.addEventListener('click', openMailbox);

    // ============================================================================
    // 🛠️ 1회성 패치 (2026-11-24): 초월권 초기화 → 5장 지급 (이미 초월한 수만큼 차감)
    //   - 추방 보상 버그로 초월권 수가 어긋난 것을 바로잡는다.
    //   - 가진 초월권을 0장으로 만든 뒤, 5장 - (모든 헌터의 초월 횟수 합)을 우편으로 보낸다.
    //   - rewardFlags.ticketReset20261124 로 한 번만 실행.
    //   - 패치가 나온 뒤(releasedAt)에 저장된 데이터는 이미 고쳐진 버전에서 플레이한 것이므로 절대 건드리지 않는다.
    //     (새 기기에서 예전 기기 데이터를 불러올 때 초월권이 사라지고 보정 우편이 다시 오던 문제 방지 · 2026-11-25)
    // ============================================================================
    const TICKET_RESET_PATCH = {
      flag: 'ticketReset20261124',
      base: 5,
      releasedAt: Date.parse('2026-11-24T22:30:00+09:00') // 패치 업로드 시각 (한국 시간)
    };

    // 업데이트 전부터 플레이하던 마을인지: 진행 흔적이 하나라도 있으면 기존 마을
    // (새 게임은 처음 켤 때 보스 1단계 · 환생 헌터 없음 · 초월권 없음 · 저장 순번이 아주 작음)
    function isExistingVillageForPatch() {
      if (typeof BOSS_SANCTUM !== 'undefined' && (BOSS_SANCTUM.allStagesCleared || (BOSS_SANCTUM.bossStage || 1) > 1)) return true;
      if (hunters.some(h => (h.rebirthCount || 0) >= 1 || (h.transcendCount || 0) > 0 || (h.level || 1) >= 20)) return true;
      if (typeof getUserItemCount === 'function' && getUserItemCount('transcend_ticket') > 0) return true;
      if (Math.floor(Number(gameState.saveSeq) || 0) > 30) return true;
      return false;
    }

    // savedAt: 지금 마을 데이터가 마지막으로 저장된 시각 (모르면 0 → 새 게임으로 봄)
    function runTicketResetPatchIfDue(savedAt = 0) {
      if (!gameState.rewardFlags || typeof gameState.rewardFlags !== 'object') gameState.rewardFlags = {};
      if (gameState.rewardFlags[TICKET_RESET_PATCH.flag]) return false;
      gameState.rewardFlags[TICKET_RESET_PATCH.flag] = true;
      // 패치 이후에 저장된 데이터 · 저장 시각을 모르는 데이터는 보정 대상이 아님 (받은 것으로만 표시)
      const t = Number(savedAt) || 0;
      if (!(t > 1 && t < TICKET_RESET_PATCH.releasedAt)) return false;
      // 새 마을은 제외: 업데이트 전부터 플레이하던 마을만 보정
      if (!isExistingVillageForPatch()) return false;
      // 이미 5단계를 넘긴 마을은 5단계 보스 보상도 이번 보정에 포함된 것으로 처리 (뒤따라 2장이 또 들어오지 않게)
      if (typeof BOSS_SANCTUM !== 'undefined' && (BOSS_SANCTUM.allStagesCleared || (BOSS_SANCTUM.bossStage || 1) > 5)) {
        gameState.rewardFlags.boss5Transcend = true;
      }
      const usedTranscends = hunters.reduce((sum, h) => sum + Math.max(0, Math.floor(Number(h.transcendCount) || 0)), 0);
      const give = Math.max(0, TICKET_RESET_PATCH.base - usedTranscends);
      const inv = typeof getUserInventory === 'function' ? getUserInventory() : (gameState.userInventory || {});
      delete inv.transcend_ticket;
      if (typeof refreshUserInventoryViews === 'function') refreshUserInventoryViews();
      sendPersonalMail({
        id: `patch-${TICKET_RESET_PATCH.flag}-${mailVillageKey()}`,
        title: '🛠️ 초월권 보정 지급',
        body: `추방 보상 오류로 초월권 수가 어긋나 모든 마을의 초월권을 0장으로 맞추고 ${TICKET_RESET_PATCH.base}장을 지급합니다.`
          + (usedTranscends > 0 ? ` 이미 초월한 횟수(${usedTranscends}회)만큼 빼고 ${give}장을 드립니다.` : ''),
        rewards: give > 0 ? [{ type: 'item', itemId: 'transcend_ticket', qty: give }] : []
      });
      if (typeof flushSyncBackup === 'function') flushSyncBackup();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
      return true;
    }

    // ============================================================================
    // 📮 저장을 불러올 때 우편함도 함께 검토
    //   - 불러온 저장의 우편함(받은 기록 · 개인 우편)을 그대로 가져온다 (18-save-system.js).
    //   - 같은 우편이 두 번 들어 있으면 하나만 남긴다.
    //   - 저장에 '받음'으로 기록된 우편은 이 기기 기록에도 남겨, 다시 받을 수 없게 한다.
    //   - 받지 않은 우편이 있으면 알려 준다.
    // ============================================================================
    function reviewMailboxAfterLoad() {
      const st = getMailboxState();
      const seen = new Set();
      st.personal = st.personal.filter((m) => {
        if (!m || !m.id || seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      st.claimed = [...new Set(st.claimed.filter(Boolean))];
      if (st.claimed.length > 0) {
        const ledger = readMailLedger();
        const vk = mailVillageKey();
        const list = Array.isArray(ledger[vk]) ? ledger[vk] : [];
        st.claimed.forEach((id) => { if (!list.includes(id)) list.push(id); });
        ledger[vk] = list;
        try { localStorage.setItem(MAIL_LEDGER_KEY, JSON.stringify(ledger)); } catch (_) {}
      }
      const pending = getPendingMails().length;
      if (pending > 0) setTimeout(() => showToast(`📮 받지 않은 우편이 ${pending}통 있습니다. 하단 📮 우편에서 받으세요.`), 1200);
      return pending;
    }

    // 저장을 불러온 뒤: 우편함 검토 · 1회성 패치 확인 · 우편 버튼 숫자 맞추기
    let lastLoadedSaveAt = 0;
    if (typeof applyLoadedSaveData === 'function') {
      const origApplyForMail = applyLoadedSaveData;
      applyLoadedSaveData = function (...args) {
        const r = origApplyForMail.apply(this, args);
        const data = args[0];
        lastLoadedSaveAt = Number(data && data.savedAt) || 0;
        try { reviewMailboxAfterLoad(); } catch (_) {}
        try { runTicketResetPatchIfDue(lastLoadedSaveAt); } catch (_) {}
        try { refreshMailboxViews(); } catch (_) {}
        return r;
      };
    }

    // 게임 시작 때 저장 불러오기가 이 파일보다 먼저 끝났을 수 있으니 한 번 더 확인한다.
    // (이 기기에 남아 있던 마지막 저장 시각 기준 · 저장이 없던 새 기기는 0 → 보정 안 함)
    setTimeout(() => {
      const bootSavedAt = lastLoadedSaveAt || (typeof CLOUD_BOOT_LOCAL_SAVED_AT !== 'undefined' ? CLOUD_BOOT_LOCAL_SAVED_AT : 0);
      try { runTicketResetPatchIfDue(bootSavedAt); } catch (_) {}
      try { refreshMailboxViews(); } catch (_) {}
    }, 2600);

    // 우편으로 받은 골드는 '버는 돈'이 아니므로 자리 비운 동안 보상의 수입 측정에서 뺀다 (24-offline-rewards.js)
    (function excludeMailGoldFromOfflineIncome() {
      if (typeof OfflineIncome === 'undefined' || typeof claimMail !== 'function') return;
      const origClaimMail = claimMail;
      claimMail = function (...args) {
        OfflineIncome.suppressGold += 1;
        try {
          return origClaimMail.apply(this, args);
        } finally {
          OfflineIncome.suppressGold -= 1;
        }
      };
    })();
