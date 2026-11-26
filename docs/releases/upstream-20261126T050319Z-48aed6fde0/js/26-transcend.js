// [26-transcend] 🔴 5환생 헌터 초월 시스템 (🎒 인벤토리: 25-user-inventory.js)
    // ============================================================================
    // - 초월권 얻는 법
    //     · 5단계 보스 최초 처치: 2장 (1회, rewardFlags.boss5Transcend)
    //     · 5환생 Lv.99 헌터 추방: 1장 + 토벌 포인트 +50 + 헌터 최대 인원 +1 (추방 보너스 최대 +20) · Lv.98 이하는 보상 없음
    // - 초월권은 1환생 이상 헌터에게 쓴다. (인벤토리 → 사용, 또는 헌터 목록의 🔴 초월 버튼)
    // - 1초월마다 금색 환생 별 1개가 빨간 별로 바뀐다. 별(환생 수)보다 많이 초월할 수 없고 최대 5초월.
    // - 1초월마다 전체 능력(공격력 · 방어력 · 체력 · 마나) +20%, 5초월 시 +100%
    // - 이 파일은 index.html 맨 끝쪽에서 불러온다 (보스 전투 · 추방 · 저장 불러오기 함수를 감싸야 해서).
    // ============================================================================
    const TRANSCEND_CFG = {
      maxTranscend: 5,
      statBonusPerStack: 0.20,
      maxBanishBonusSlots: 20,
      ticketId: 'transcend_ticket',
      // 1~5초월 성공 확률(%) — 실패 시 초월권만 소모(단계 유지), 5초월 풀초월 기대값 50장 (2.5 + 5 + 10 + 12.5 + 20 = 50)
      successChances: [40, 20, 10, 8, 5]
    };

    function getTranscendSuccessChance(nextTierOrHunter) {
      const nextTier = typeof nextTierOrHunter === 'number'
        ? nextTierOrHunter
        : (Math.floor(Number(nextTierOrHunter?.transcendCount) || 0) + 1);
      const idx = Math.max(0, Math.min(TRANSCEND_CFG.successChances.length - 1, nextTier - 1));
      return TRANSCEND_CFG.successChances[idx];
    }

    registerUserItem({
      id: TRANSCEND_CFG.ticketId,
      name: '초월권',
      icon: '🔴',
      desc: '1환생 이상 헌터 1명의 초월을 시도합니다 (성공 확률: 1초월 40% · 2초월 20% · 3초월 10% · 4초월 8% · 5초월 5%, 실패 시 초월권만 소모). 성공 시 금색 별 1개가 빨간 별로 바뀌고 전체 능력(공격력 · 방어력 · 체력 · 마나)이 +20% 오릅니다.',
      howToGet: '🎖️ 토벌 포인트 상점(주 3장) · 5단계 보스 최초 처치 시 2장(1회) · 5환생 Lv.99 헌터 추방 1장(+ 토벌 포인트 50 · 헌터 최대 인원 +1, 최대 +20)',
      onUse: () => openTranscendPicker(null)
    });

    // ---------- 초월 규칙 ----------
    function getHunterTranscendLimit(h) {
      return Math.max(0, Math.min(TRANSCEND_CFG.maxTranscend, Math.floor(Number(h?.rebirthCount) || 0)));
    }

    function canHunterTranscend(h) {
      if (!h) return false;
      return (h.rebirthCount || 0) >= 1 && (h.transcendCount || 0) < getHunterTranscendLimit(h);
    }

    // 헌터 목록의 🔴 초월 버튼 표시 조건
    function canUseTranscendTicketOn(h) {
      return canHunterTranscend(h) && getUserItemCount(TRANSCEND_CFG.ticketId) > 0;
    }

    function getTranscendStatMult(h) {
      const tc = Math.max(0, Math.min(TRANSCEND_CFG.maxTranscend, Math.floor(Number(h?.transcendCount) || 0)));
      return 1 + tc * TRANSCEND_CFG.statBonusPerStack;
    }

    function transcendHunter(hunterId) {
      const h = hunters.find(item => item.id === hunterId);
      if (!h) return false;
      if (!canHunterTranscend(h)) {
        showToast((h.rebirthCount || 0) < 1
          ? `⚠️ '${h.name}' 헌터는 환생하지 않아 초월할 수 없습니다.`
          : `⚠️ '${h.name}' 헌터는 더 초월할 수 없습니다. (환생 별 ${getHunterTranscendLimit(h)}개 모두 초월)`);
        return false;
      }
      if (!consumeUserItem(TRANSCEND_CFG.ticketId, 1)) {
        showToast('⚠️ 초월권이 없습니다.');
        return false;
      }
      const nextTier = (h.transcendCount || 0) + 1;
      const chance = getTranscendSuccessChance(nextTier);
      if (Math.random() * 100 >= chance) {
        if (typeof interactionManager !== 'undefined') {
          interactionManager.spawnBubble(h, `💨 ${nextTier}초월 실패... (${chance}%)`, '#94a3b8');
        }
        showToast(`💨 '${h.name}' 헌터 ${nextTier}초월 실패 (${chance}%) · 초월권 1장 소모 (남은 초월권 ${getUserItemCount(TRANSCEND_CFG.ticketId)}장)`);
        refreshUserInventoryViews();
        if (typeof scheduleAutoSave === 'function') scheduleAutoSave(400);
        return true;
      }
      h.transcendCount = nextTier;
      h.recalculateVitals(false);
      const pct = Math.round((getTranscendStatMult(h) - 1) * 100);
      if (typeof interactionManager !== 'undefined') {
        interactionManager.spawnBubble(h, `🔴 ${h.transcendCount}초월 성공! 전체 능력 +${pct}%`, '#f87171');
      }
      showToast(`🔴 '${h.name}' 헌터 ${h.transcendCount}초월 성공! (${chance}%) 전체 능력 +${pct}% (남은 초월권 ${getUserItemCount(TRANSCEND_CFG.ticketId)}장)`);
      refreshUserInventoryViews();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(400);
      return true;
    }

    // ---------- 능력치 반영 (+20% / 초월) ----------
    (function hookTranscendStats() {
      const origStats = Hunter.prototype.getComputedStats;
      Hunter.prototype.getComputedStats = function () {
        const s = origStats.call(this);
        const m = getTranscendStatMult(this);
        if (m > 1) {
          s.atk = Math.round(s.atk * m);
          s.def = Math.round(s.def * m);
        }
        return s;
      };
      const origVitals = Hunter.prototype.recalculateVitals;
      Hunter.prototype.recalculateVitals = function (fillFull = false) {
        origVitals.call(this, fillFull);
        const m = getTranscendStatMult(this);
        if (m > 1) {
          // 원래 계산은 초월 전 기준이므로 최대치와 현재치를 같은 비율로 올린다
          this.maxHp = Math.round(this.maxHp * m);
          this.maxMp = Math.round(this.maxMp * m);
          this.hp = Math.min(this.maxHp, Math.round(this.hp * m));
          this.mp = Math.min(this.maxMp, Math.round(this.mp * m));
        }
      };
    })();

    // ---------- 5환생 Lv.99 헌터 추방 보상 ----------
    // 5환생 + Lv.99 헌터를 추방할 때만: 초월권 1장 · 토벌 포인트 +50 · 헌터 최대 인원 +1 (추방 보너스 최대 +20)
    // (소환권으로 뽑은 5환생 Lv.1 헌터를 바로 추방해 보상을 받는 것을 막기 위해 Lv.99 한정)
    const BANISH_REWARD_CFG = { tickets: 1, points: 50 };

    function getBanishTranscendReward(h) {
      if (!h || (h.rebirthCount || 0) < 5) return null;
      if ((h.level || 1) < LEVEL_REBIRTH_CONFIG.maxLevel) return null;
      const slotsNow = Math.max(0, Math.floor(Number(gameState.banishBonusSlots) || 0));
      return {
        tickets: BANISH_REWARD_CFG.tickets,
        points: BANISH_REWARD_CFG.points,
        slot: slotsNow < TRANSCEND_CFG.maxBanishBonusSlots ? 1 : 0,
        slotCapped: slotsNow >= TRANSCEND_CFG.maxBanishBonusSlots
      };
    }

    (function hookBanishRewards() {
      if (typeof banishHunterById !== 'function') return;
      const origBanish = banishHunterById;
      banishHunterById = function (hunterId) {
        const target = hunters.find(item => item.id === hunterId);
        const reward = getBanishTranscendReward(target);
        const name = target?.name;
        origBanish(hunterId);
        if (!reward || hunters.some(item => item.id === hunterId)) return;
        addUserItem(TRANSCEND_CFG.ticketId, reward.tickets);
        gameState.subjugationPoints = Math.max(0, Math.floor(Number(gameState.subjugationPoints) || 0)) + reward.points;
        if (reward.slot) {
          gameState.banishBonusSlots = Math.max(0, Math.floor(Number(gameState.banishBonusSlots) || 0)) + reward.slot;
        }
        updateResourceHUD();
        const slotText = reward.slot
          ? ` · 헌터 최대 인원 +1 (추방 보너스 ${gameState.banishBonusSlots}/${TRANSCEND_CFG.maxBanishBonusSlots})`
          : (reward.slotCapped ? ' · 추방 보너스 인원은 이미 최대(+20)' : '');
        showToast(`🚪 '${name}' 추방 · 🔴 초월권 +${reward.tickets}장 · 🎖️ +${reward.points}P${slotText} (정원 ${hunters.length} / ${getMaxHunterCapacity()}명)`);
        if (typeof flushSyncBackup === 'function') flushSyncBackup();
        if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
      };

      // 추방 확인창에 보상 안내 추가
      if (typeof openBanishConfirmModal === 'function') {
        const origOpen = openBanishConfirmModal;
        openBanishConfirmModal = function (hunterId) {
          origOpen(hunterId);
          const target = hunters.find(item => item.id === hunterId);
          const descEl = document.getElementById('banishConfirmDesc');
          if (!target || !descEl || (target.rebirthCount || 0) < 5) return;
          const reward = getBanishTranscendReward(target);
          if (!reward) {
            descEl.insertAdjacentHTML('beforeend', `<br/><span style="font-size:11.5px;color:#94a3b8;">• 5환생 헌터는 <b>Lv.99</b>일 때 추방해야 보상(초월권 · 토벌 포인트 · 인원 +1)을 받습니다.</span>`);
            return;
          }
          const slotText = reward.slot
            ? ' + <b>헌터 최대 인원 +1</b>'
            : (reward.slotCapped ? ' (추방 보너스 인원은 이미 최대 +20)' : '');
          descEl.insertAdjacentHTML('beforeend', `<br/><span style="font-size:12px;color:#fca5a5;font-weight:800;">🔴 5환생 Lv.99 추방 보상: 초월권 ${reward.tickets}장 + 토벌 포인트 ${reward.points}P${slotText}</span>`);
        };
      }
    })();

    // ---------- 5단계 보스 최초 처치 보상: 초월권 2장 (1회) ----------
    // 이미 5단계를 넘긴 저장을 불러온 경우에도 아직 받지 않았다면 한 번 지급한다.
    const BOSS5_TRANSCEND_REWARD = { stage: 5, tickets: 2, flag: 'boss5Transcend' };

    function grantBoss5TranscendRewardIfDue(delayToastMs = 0) {
      if (typeof BOSS_SANCTUM === 'undefined') return false;
      if (!gameState.rewardFlags || typeof gameState.rewardFlags !== 'object') gameState.rewardFlags = {};
      if (gameState.rewardFlags[BOSS5_TRANSCEND_REWARD.flag]) return false;
      const cleared = BOSS_SANCTUM.allStagesCleared || (BOSS_SANCTUM.bossStage || 1) > BOSS5_TRANSCEND_REWARD.stage;
      if (!cleared) return false;
      gameState.rewardFlags[BOSS5_TRANSCEND_REWARD.flag] = true;
      addUserItem(TRANSCEND_CFG.ticketId, BOSS5_TRANSCEND_REWARD.tickets);
      const msg = `🎁 5단계 보스 최초 처치 보상! 🔴 초월권 ${BOSS5_TRANSCEND_REWARD.tickets}장이 🎒 인벤토리에 들어왔습니다.`;
      if (delayToastMs > 0) setTimeout(() => showToast(msg), delayToastMs);
      else showToast(msg);
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(400);
      return true;
    }

    (function hookBoss5Reward() {
      if (typeof combatEffects === 'undefined' || typeof combatEffects.applyHitToBoss !== 'function') return;
      const origHit = combatEffects.applyHitToBoss;
      combatEffects.applyHitToBoss = function (...args) {
        const r = origHit.apply(this, args);
        // 보스 토벌 알림이 먼저 보이도록 조금 뒤에 안내
        grantBoss5TranscendRewardIfDue(2800);
        return r;
      };
    })();

    // ---------- 초월할 헌터 고르기 창 ----------
    function ensureTranscendPickModal() {
      if (document.getElementById('transcendPickBackdrop')) return;
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div class="tier-modal-backdrop" id="transcendPickBackdrop" style="z-index:46;">
          <div class="tier-modal" style="width:min(95vw,520px);">
            <div class="panel-header">
              <div class="panel-title"><span>🔴</span><span>초월할 헌터 고르기</span></div>
              <button class="btn-close" id="btnCloseTranscendPick">✕</button>
            </div>
            <div class="tier-modal-body" id="transcendPickBody"></div>
          </div>
        </div>
      `;
      document.body.appendChild(wrap.firstElementChild);
      const pickBackdrop = document.getElementById('transcendPickBackdrop');
      document.getElementById('btnCloseTranscendPick').addEventListener('click', () => pickBackdrop.classList.remove('open'));
      pickBackdrop.addEventListener('click', (e) => { if (e.target === pickBackdrop) pickBackdrop.classList.remove('open'); });
      document.getElementById('transcendPickBody').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-do-transcend]');
        if (!btn) return;
        const id = btn.getAttribute('data-do-transcend');
        if (transcendHunter(id)) {
          const only = document.getElementById('transcendPickBody').dataset.onlyId || '';
          renderTranscendPicker(only || null);
        }
      });
    }

    function renderTranscendPicker(onlyHunterId = null) {
      const body = document.getElementById('transcendPickBody');
      if (!body) return;
      body.dataset.onlyId = onlyHunterId || '';
      const tickets = getUserItemCount(TRANSCEND_CFG.ticketId);
      const list = onlyHunterId
        ? hunters.filter(h => h.id === onlyHunterId)
        : hunters.filter(h => (h.rebirthCount || 0) >= 1)
            .sort((a, b) => (b.rebirthCount - a.rebirthCount) || ((b.transcendCount || 0) - (a.transcendCount || 0)) || (b.level - a.level));

      const starsHtml = (h) => {
        const rb = Math.min(5, h.rebirthCount || 0);
        const tc = Math.min(rb, h.transcendCount || 0);
        return `<span style="color:#ef4444;">${'★'.repeat(tc)}</span><span style="color:#facc15;">${'★'.repeat(rb - tc)}</span>`;
      };

      const rows = list.map((h) => {
        const ok = canHunterTranscend(h);
        const nowPct = Math.round((getTranscendStatMult(h) - 1) * 100);
        const nextTier = (h.transcendCount || 0) + 1;
        const chance = getTranscendSuccessChance(nextTier);
        const reason = (h.rebirthCount || 0) < 1 ? '환생 필요' : (ok ? '' : '최대 초월');
        return `
          <div class="transcend-pick-row">
            <div>
              <div style="font-weight:800;">${h.name} <span style="color:#94a3b8;font-weight:600;">${h.currentJobName || h.job} · Lv.${h.level}</span></div>
              <div style="font-size:11px;">${starsHtml(h)} <span style="color:#fca5a5;">${h.transcendCount || 0}초월 · 능력 +${nowPct}%</span></div>
            </div>
            ${ok
              ? `<button type="button" class="btn-roster-transcend" data-do-transcend="${h.id}" ${tickets > 0 ? '' : 'disabled'}>🔴 ${nextTier}초월 (${chance}%)</button>`
              : `<span style="font-size:11px;color:#94a3b8;">${reason}</span>`}
          </div>
        `;
      }).join('');

      body.innerHTML = `
        <div style="font-size:12px;color:#cbd5e1;">
          보유 초월권 <b style="color:#fde047;">${tickets}장</b> · 성공 시 전체 능력 <b>+20%</b> (성공 확률: <b>40% → 20% → 10% → 8% → 5%</b> · 실패 시 초월권만 소모)
        </div>
        <div class="transcend-pick-list">
          ${rows || '<div style="color:#94a3b8;font-size:12px;margin-top:8px;">초월할 수 있는 헌터(1환생 이상)가 없습니다.</div>'}
        </div>
      `;
    }

    function openTranscendPicker(onlyHunterId = null) {
      ensureTranscendPickModal();
      renderTranscendPicker(onlyHunterId);
      document.getElementById('transcendPickBackdrop').classList.add('open');
    }

    // 헌터 목록의 🔴 초월 버튼 → 그 헌터만 보이는 확인창
    function openTranscendConfirm(hunterId) {
      openTranscendPicker(hunterId);
    }

    // 초월권 수가 바뀌면 고르기 창 · 헌터 목록 · 헌터 정보창도 맞춘다
    onUserInventoryChange(() => {
      if (document.getElementById('transcendPickBackdrop')?.classList.contains('open')) {
        renderTranscendPicker(document.getElementById('transcendPickBody')?.dataset.onlyId || null);
      }
      if (document.getElementById('hunterRosterBackdrop')?.classList.contains('open') && typeof renderHunterRosterModal === 'function') {
        renderHunterRosterModal(true);
      }
      if (gameState.selectedHunterId && typeof refreshHunterPanel === 'function') refreshHunterPanel();
    });

    // 저장을 불러온 뒤: 5단계 보스 보상 확인
    if (typeof applyLoadedSaveData === 'function') {
      const origApplyForTranscend = applyLoadedSaveData;
      applyLoadedSaveData = function (...args) {
        const r = origApplyForTranscend.apply(this, args);
        try { grantBoss5TranscendRewardIfDue(1500); } catch (_) {}
        return r;
      };
    }

    // 게임 시작 때 저장 불러오기가 이 파일보다 먼저 끝났을 수 있으니 한 번 더 확인한다.
    setTimeout(() => {
      try { grantBoss5TranscendRewardIfDue(0); } catch (_) {}
      try { refreshUserInventoryViews(); } catch (_) {}
    }, 2500);
