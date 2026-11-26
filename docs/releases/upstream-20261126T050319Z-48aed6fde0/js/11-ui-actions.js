// [11-ui-actions] UI 버튼 · 모달 (영입, 이름변경, 추방, 경비병, 철거, 보스 레이드, 전체화면, 캔버스 클릭)
    // ============================================================================
    // 상단·하단 UI 버튼 이벤트 바인딩
    // ============================================================================
    function isTier5BossDefeated() {
      return Boolean(BOSS_SANCTUM.allStagesCleared || (BOSS_SANCTUM.bossStage || 1) >= 6);
    }

    function recruitNewHunter() {
      const recruitCost = 200;
      const maxCap = getMaxHunterCapacity();
      if (hunters.length >= maxCap) {
        showToast(`⚠️ 마을 회관 정원(${maxCap}명)이 가득 찼습니다! 회관을 업그레이드하세요.`);
        return;
      }
      if (gameState.gold < recruitCost) {
        showToast('⚠️ 골드가 부족합니다! (200 G 필요)');
        return;
      }
      gameState.gold -= recruitCost;
      const archetype = JOB_ARCHETYPES[Math.floor(Math.random() * JOB_ARCHETYPES.length)];
      const randomName = generateRandomHunterName(hunters);
      const recruitTier = isTier5BossDefeated() ? 4 : 1;
      const newHunter = new Hunter(
        `h_${Date.now()}_${Math.floor(Math.random() * 999)}`,
        {
          ...archetype,
          name: randomName,
          level: 1,
          rebirthCount: 0,
          equipment: {
            weapon:    { tier: recruitTier, enhance: 0 },
            armor:     { tier: recruitTier, enhance: 0 },
            helmet:    { tier: recruitTier, enhance: 0 },
            accessory: { tier: recruitTier, enhance: 0 }
          }
        },
        (Math.random() - 0.5) * 60,
        22 + (Math.random() - 0.5) * 20
      );
      hunters.push(newHunter);
      updateResourceHUD();
      if (document.getElementById('hunterRosterBackdrop')?.classList.contains('open')) {
        renderHunterRosterModal(true);
      }
      showToast(`⚔️ Lv.1 ${newHunter.job} '${newHunter.name}' 합류! (전 부위 T${recruitTier} +0강)`);
    }

    document.getElementById('btnRecruitHunter')?.addEventListener('click', recruitNewHunter);
    document.getElementById('btnRosterRecruitHunter')?.addEventListener('click', recruitNewHunter);

    document.getElementById('btnSummonOneTimeT3Hunter')?.addEventListener('click', () => {
      if (gameState.oneTimeT3SummonUsed) {
        showToast('⚠️ 1회 한정 3T·Lv.1 헌터 소환은 이미 사용했습니다!');
        updateResourceHUD();
        return;
      }
      const maxCap = getMaxHunterCapacity();
      if (hunters.length >= maxCap) {
        showToast(`⚠️ 마을 회관 정원(${maxCap}명)이 가득 찼습니다! 회관을 업그레이드하세요.`);
        return;
      }

      const archetype = JOB_ARCHETYPES[Math.floor(Math.random() * JOB_ARCHETYPES.length)];
      const randomName = generateRandomHunterName(hunters);
      const summoned = new Hunter(
        `h_t3_1time_${Date.now()}_${Math.floor(Math.random() * 999)}`,
        {
          ...archetype,
          name: randomName,
          level: 1,
          rebirthCount: 0,
          personalGold: 300,
          equipment: {
            weapon:    { tier: 3, enhance: 0 },
            armor:     { tier: 3, enhance: 0 },
            helmet:    { tier: 3, enhance: 0 },
            accessory: { tier: 3, enhance: 0 }
          }
        },
        (Math.random() - 0.5) * 60,
        22 + (Math.random() - 0.5) * 20
      );

      gameState.oneTimeT3SummonUsed = true;
      hunters.push(summoned);
      const summonBtnEl = document.getElementById('btnSummonOneTimeT3Hunter');
      if (summonBtnEl) {
        summonBtnEl.style.display = 'none';
        summonBtnEl.disabled = true;
      }
      updateResourceHUD();
      if (document.getElementById('hunterRosterBackdrop')?.classList.contains('open')) {
        renderHunterRosterModal(true);
      }
      if (typeof flushSyncBackup === 'function') {
        flushSyncBackup();
      }
      showToast(`✨ [1회 한정] 3T 장비 착용 Lv.1 ${summoned.job} '${summoned.name}' 헌터 소환 완료!`);
    });

    function summonTestRebirth5Hunter() {
      const maxCap = getMaxHunterCapacity();
      if (hunters.length >= maxCap) {
        showToast(`⚠️ 마을 회관 정원(${maxCap}명)이 가득 찼습니다! 회관을 업그레이드하세요.`);
        return;
      }

      const archetype = JOB_ARCHETYPES[Math.floor(Math.random() * JOB_ARCHETYPES.length)];
      const randomName = generateRandomHunterName(hunters);
      const advPath = [];
      let curNodeId = null;

      for (let tier = 1; tier <= LEVEL_REBIRTH_CONFIG.maxRebirths; tier++) {
        let choices = [];
        if (tier === 1) {
          choices = JOB_ADVANCEMENT_TREE[archetype.job]?.tiers?.[0] || [];
        } else {
          const prevNode = curNodeId ? JOB_ADVANCEMENT_NODES_BY_ID[curNodeId] : null;
          choices = prevNode && prevNode.childrenIds?.length > 0
            ? prevNode.childrenIds.map(id => JOB_ADVANCEMENT_NODES_BY_ID[id]).filter(Boolean)
            : (JOB_ADVANCEMENT_TREE[archetype.job]?.tiers?.[tier - 1] || []);
        }
        const picked = choices[Math.floor(Math.random() * choices.length)] || null;
        if (picked) {
          advPath.push(picked.id);
          curNodeId = picked.id;
        }
      }

      const finalNode = curNodeId ? JOB_ADVANCEMENT_NODES_BY_ID[curNodeId] : null;
      const testHunter = new Hunter(
        `h_test_rb5_${Date.now()}_${Math.floor(Math.random() * 999)}`,
        {
          ...archetype,
          name: randomName,
          baseJob: archetype.job,
          job: archetype.job,
          currentJobName: finalNode ? finalNode.name : archetype.job,
          advancementPath: advPath,
          advancementTier: advPath.length,
          level: 1,
          rebirthCount: LEVEL_REBIRTH_CONFIG.maxRebirths,
          personalGold: 500000,
          bento: getMaxBentoCapacity(1, LEVEL_REBIRTH_CONFIG.maxRebirths),
          potions: {
            hp: getMaxHpPotionCapacity(1, LEVEL_REBIRTH_CONFIG.maxRebirths),
            mp: getMaxMpPotionCapacity(1, LEVEL_REBIRTH_CONFIG.maxRebirths)
          },
          equipment: {
            weapon:    { tier: 4, enhance: 10 },
            armor:     { tier: 4, enhance: 10 },
            helmet:    { tier: 4, enhance: 10 },
            accessory: { tier: 4, enhance: 10 }
          }
        },
        (Math.random() - 0.5) * 60,
        22 + (Math.random() - 0.5) * 20
      );

      testHunter.pickNextDestination();
      hunters.push(testHunter);
      updateResourceHUD();
      if (document.getElementById('hunterRosterBackdrop')?.classList.contains('open')) {
        renderHunterRosterModal(true);
      }
      if (typeof scheduleAutoSave === 'function') {
        scheduleAutoSave(400);
      }
      interactionManager.spawnBubble(testHunter, `🌟 테스트 5환생 (${testHunter.currentJobName}) 강림!`, '#fde047');
      showToast(`🌟 [테스트] 5환생 [${testHunter.currentJobName}] '${testHunter.name}' 헌터 소환 완료!`);
    }

    document.getElementById('btnCloseHunterPanel')?.addEventListener('click', closeHunterPanel);
    document.getElementById('btnClosePanel')?.addEventListener('click', closeBuildingPanel);
    document.getElementById('btnCloseMonsterPopup')?.addEventListener('click', closeMonsterPopup);

    // 건물 상세 패널 내 '📖 도움말' 토글 버튼 핸들러
    function toggleBuildingPanelHelp() {
      const helpBox = document.getElementById('panelHelpBox');
      const helpBtn = document.getElementById('btnToggleHelp');
      if (!helpBox) return;

      const isCurrentlyOpen = gameState.panelHelpOpen || helpBox.classList.contains('open');
      const nextOpen = !isCurrentlyOpen;
      gameState.panelHelpOpen = nextOpen;

      helpBox.classList.toggle('open', nextOpen);
      if (helpBtn) {
        helpBtn.classList.toggle('active', nextOpen);
        helpBtn.textContent = nextOpen ? '📖 도움말 닫기' : '📖 도움말';
      }
    }

    document.getElementById('btnToggleHelp')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleBuildingPanelHelp();
    });

    // 헌터 이름 변경 모달 제어 및 저장 로직
    let pendingRenameHunterId = null;

    function openRenameHunterModal(hunterId) {
      const target = hunters.find(item => item.id === hunterId);
      if (!target) return;
      pendingRenameHunterId = target.id;
      const curEl = document.getElementById('renameCurrentHunterName');
      const inputEl = document.getElementById('renameHunterInput');
      if (curEl) curEl.textContent = target.name;
      if (inputEl) {
        inputEl.value = target.name;
        setTimeout(() => {
          inputEl.focus();
          inputEl.select();
        }, 40);
      }
      document.getElementById('renameHunterBackdrop')?.classList.add('open');
    }

    function closeRenameHunterModal() {
      pendingRenameHunterId = null;
      document.getElementById('renameHunterBackdrop')?.classList.remove('open');
    }

    function commitRenameHunterModal() {
      const target = hunters.find(item => item.id === pendingRenameHunterId);
      const inputEl = document.getElementById('renameHunterInput');
      if (!target || !inputEl) return;

      const trimmed = inputEl.value.trim();
      if (!trimmed) {
        showToast('⚠️ 헌터 이름을 1자 이상 입력해주세요.');
        return;
      }
      if (trimmed.length > 8) {
        showToast('⚠️ 헌터 이름은 8자 이내로 입력해주세요.');
        return;
      }

      const duplicate = hunters.some(h => h.id !== target.id && h.name === trimmed);
      if (duplicate) {
        showToast(`⚠️ 이미 '${trimmed}' 이름을 사용 중인 헌터가 있습니다.`);
        return;
      }

      const oldName = target.name;
      target.name = trimmed;
      closeRenameHunterModal();
      refreshHunterPanel();
      if (document.getElementById('hunterRosterBackdrop')?.classList.contains('open')) {
        renderHunterRosterModal(true);
      }
      if (typeof scheduleAutoSave === 'function') {
        scheduleAutoSave(400);
      }
      interactionManager.spawnBubble(target, `✨ 새 이름: ${trimmed}!`, '#fde047');
      showToast(`✏️ '${oldName}' 헌터의 이름이 '${trimmed}'(으)로 변경되었습니다!`);
    }

    document.getElementById('btnOpenRenameHunter')?.addEventListener('click', () => {
      if (gameState.selectedHunterId) {
        openRenameHunterModal(gameState.selectedHunterId);
      }
    });
    document.getElementById('btnCloseRenameHunterModal')?.addEventListener('click', closeRenameHunterModal);
    document.getElementById('btnCancelRenameHunterAction')?.addEventListener('click', closeRenameHunterModal);
    document.getElementById('renameHunterBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'renameHunterBackdrop') closeRenameHunterModal();
    });
    document.getElementById('btnConfirmRenameHunterAction')?.addEventListener('click', commitRenameHunterModal);
    document.getElementById('renameHunterInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitRenameHunterModal();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeRenameHunterModal();
      }
    });

    document.getElementById('hunterRelationsBox')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-reconcile-rival[data-reconcile-target-id]');
      if (!btn || !gameState.selectedHunterId) return;
      const hA = hunters.find(item => item.id === gameState.selectedHunterId);
      const targetId = btn.getAttribute('data-reconcile-target-id');
      const hB = hunters.find(item => item.id === targetId);
      if (!hA || !hB) return;

      const reconcileCost = 300;
      if (gameState.gold < reconcileCost) {
        showToast(`⚠️ 화해 중재 비용(${reconcileCost}G)이 부족합니다!`);
        return;
      }

      const res = interactionManager.reconcileRivalPair(hA, hB, 58, 2);
      if (!res) return;

      gameState.gold -= reconcileCost;
      updateResourceHUD();
      refreshHunterPanel();
      interactionManager.spawnBubble(hA, `🕊️ ${hB.name}과(와) 화해!`, '#7dd3fc');
      interactionManager.spawnBubble(hB, `🤝 ${hA.name}과(와) 화해!`, '#86efac');
      showToast(`🕊️ '${hA.name}'과(와) '${hB.name}' 헌터가 화해하여 [${res.label}] 관계가 되었습니다! (-${reconcileCost}G)`);
    });
    function handleOutsideMonsterPopupInteraction(e) {
      if (!gameState.selectedMonsterRef) return;
      const popup = document.getElementById('monsterInfoPopup');
      if (!popup || !popup.classList.contains('active')) return;
      if (popup.contains(e.target)) return;

      // 캔버스에서 다른 몬스터나 해금보스를 직접 탭/클릭해 팝업을 전환하는 경우는 캔버스 click 핸들러에 위임
      if (e.target === canvas) {
        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        }
        if (typeof clientX === 'number' && typeof clientY === 'number') {
          const wp = camera.screenToWorld(clientX, clientY);
          if (getMonsterAt(wp.x, wp.y)) return;
        }
      }

      closeMonsterPopup();
    }

    document.addEventListener('mousedown', handleOutsideMonsterPopupInteraction, true);
    document.addEventListener('touchstart', handleOutsideMonsterPopupInteraction, { capture: true, passive: true });
    document.querySelectorAll('#hunterDonateRow .btn-donate-gold').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!gameState.selectedHunterId) return;
        const h = hunters.find(item => item.id === gameState.selectedHunterId);
        if (!h) return;
        const amount = Number(btn.getAttribute('data-donate-amount')) || 0;
        if (amount <= 0) return;
        if (gameState.gold < amount) {
          showToast(`⚠️ 마을 금고 골드가 부족합니다! (${amount.toLocaleString()} G 필요)`);
          return;
        }
        gameState.gold -= amount;
        h.personalGold += amount;
        updateResourceHUD();
        refreshHunterPanel();
        interactionManager.spawnBubble(h, `🎁 +${amount.toLocaleString()}G 기부 감사!`, '#fde047');
        showToast(`🎁 ${h.name} 헌터에게 ${amount.toLocaleString()} G를 기부했습니다!`);
      });
    });
    document.querySelectorAll('#hunterSubtabs .hunter-subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.hunterTab || 'overview';
        gameState.activeHunterTab = tab;
        document.querySelectorAll('#hunterSubtabs .hunter-subtab-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
        });
        const ov = document.getElementById('hunterTabOverview');
        const inv = document.getElementById('hunterTabInventory');
        const sk = document.getElementById('hunterTabSkills');
        const rl = document.getElementById('hunterTabRelations');
        if (ov) ov.style.display = tab === 'overview' ? 'block' : 'none';
        if (inv) inv.style.display = tab === 'inventory' ? 'block' : 'none';
        if (sk) sk.style.display = tab === 'skills' ? 'block' : 'none';
        if (rl) rl.style.display = tab === 'relations' ? 'block' : 'none';
      });
    });
    document.getElementById('btnFollowHunter')?.addEventListener('click', () => {
      gameState.followSelectedHunter = !gameState.followSelectedHunter;
      const fBtn = document.getElementById('btnFollowHunter');
      if (fBtn) {
        fBtn.classList.toggle('active', gameState.followSelectedHunter);
        fBtn.textContent = gameState.followSelectedHunter ? '🎥 추적 ON' : '🎥 추적 OFF';
      }
    });

    // 헌터 추방 모달 및 실행 로직
    let pendingBanishHunterId = null;

    function openBanishConfirmModal(hunterId) {
      const target = hunters.find(item => item.id === hunterId);
      if (!target) return;
      pendingBanishHunterId = target.id;
      const descEl = document.getElementById('banishConfirmDesc');
      if (descEl) {
        const jobLabel = target.currentJobName || target.job;
        const rebirthLabel = target.rebirthCount > 0 ? ` · ${target.rebirthCount}환생` : '';
        descEl.innerHTML = `
          <b style="color:#fde047;">[${jobLabel} · Lv.${target.level}${rebirthLabel}] ${target.name}</b> 헌터를 마을에서 추방하시겠습니까?<br/>
          <span style="font-size:11.5px;color:#94a3b8;">• 추방 시 마을 회관 정원 1칸이 즉시 확보되며, 해당 헌터의 성장·장비·관계 데이터가 영구 삭제됩니다.</span>
        `;
      }
      document.getElementById('banishConfirmBackdrop')?.classList.add('open');
    }

    function closeBanishConfirmModal() {
      pendingBanishHunterId = null;
      document.getElementById('banishConfirmBackdrop')?.classList.remove('open');
    }

    function banishHunterById(hunterId) {
      const idx = hunters.findIndex(item => item.id === hunterId);
      if (idx === -1) return;
      const [removed] = hunters.splice(idx, 1);

      interactionManager.purgeHunterData(removed.id);
      interactionManager.activeBubbles = interactionManager.activeBubbles.filter(b => b.hunterId !== removed.id);
      BOSS_SANCTUM.fallenHunterIds.delete(removed.id);

      if (gameState.selectedHunterId === removed.id) {
        closeHunterPanel();
      }

      if (hunters.length === 0 && BOSS_SANCTUM.status !== 'CLOSED') {
        failBossRaidAndReset('참가 헌터 부재');
      }

      updateResourceHUD();
      updateBossRaidHudButton();
      refreshDungeonExplorerPanel();
      if (document.getElementById('hunterRosterBackdrop')?.classList.contains('open')) {
        renderHunterRosterModal(true);
      }

      const jobLabel = removed.currentJobName || removed.job;
      showToast(`🚪 [${jobLabel}] '${removed.name}' 헌터를 추방했습니다. (${hunters.length} / ${getMaxHunterCapacity()}명)`);
    }

    document.getElementById('btnBanishHunter')?.addEventListener('click', () => {
      if (gameState.selectedHunterId) {
        openBanishConfirmModal(gameState.selectedHunterId);
      }
    });
    document.getElementById('btnCancelBanishModal')?.addEventListener('click', closeBanishConfirmModal);
    document.getElementById('btnCancelBanishAction')?.addEventListener('click', closeBanishConfirmModal);
    document.getElementById('banishConfirmBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'banishConfirmBackdrop') closeBanishConfirmModal();
    });
    document.getElementById('btnConfirmBanishAction')?.addEventListener('click', () => {
      if (pendingBanishHunterId) {
        const targetId = pendingBanishHunterId;
        closeBanishConfirmModal();
        banishHunterById(targetId);
      }
    });

    document.getElementById('btnTriggerRebirth')?.addEventListener('click', () => {
      const h = hunters.find(item => item.id === gameState.selectedHunterId);
      if (!h) return;
      const rebirthHall = village.getAllBuildings().find(b => b.type === 'rebirth_hall');
      if (!rebirthHall) {
        showToast('⛩️ 먼저 빈 부지에 [환생소]를 건설해야 환생 및 전직을 진행할 수 있습니다!');
        return;
      }
      if (h.performRebirth(rebirthHall)) {
        refreshHunterPanel();
        updateResourceHUD();
      }
    });

    document.getElementById('btnOpenHunterRoster')?.addEventListener('click', () => {
      renderHunterRosterModal(true);
      document.getElementById('hunterRosterBackdrop')?.classList.add('open');
    });
    document.getElementById('btnCloseHunterRoster')?.addEventListener('click', () => {
      document.getElementById('hunterRosterBackdrop')?.classList.remove('open');
    });
    document.getElementById('hunterRosterBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'hunterRosterBackdrop') e.currentTarget.classList.remove('open');
    });

    const MAX_GUARD_LEVEL = 99;

    function getTownGuardsList() {
      return [
        {
          id: 'supreme',
          roleLabel: '근접 지휘관 · 대검 참격',
          baseHp: 250000,
          baseAtk: 9500,
          baseSpeed: 118,
          guard: SUPREME_TOWN_GUARD
        },
        {
          id: 'arcane',
          roleLabel: '마법 수호자 · 원거리 마법탄',
          baseHp: 250000,
          baseAtk: 9500,
          baseSpeed: 112,
          guard: ARCANE_TOWN_GUARD
        }
      ];
    }

    function getGuardUpgradeCost(level) {
      const lv = Math.max(1, level || 1);
      return Math.round(200000 * Math.pow(1.22, lv - 1)); // 강화 비용 2배 (기존 100000 기준)
    }

    function syncTownGuardStats(entry, healFull = false) {
      const g = entry.guard;
      g.level = Math.max(1, Math.min(MAX_GUARD_LEVEL, g.level || 1));
      const baseHp = entry.baseHp || 250000;
      g.maxHp = Math.round(baseHp * (1 + (g.level - 1) * 0.25));
      if (healFull || typeof g.hp !== 'number' || Number.isNaN(g.hp) || g.hp <= 0) {
        g.hp = g.maxHp;
      } else {
        g.hp = Math.min(g.maxHp, g.hp);
      }
      g.atk = Math.round(entry.baseAtk * (1 + (g.level - 1) * 0.35));
      g.speed = Math.min(260, Math.round(entry.baseSpeed + (g.level - 1) * 1.5));
    }

    function upgradeTownGuardById(guardId) {
      const entry = getTownGuardsList().find(item => item.id === guardId);
      if (!entry) return;
      const g = entry.guard;
      syncTownGuardStats(entry);
      if (g.level >= MAX_GUARD_LEVEL) {
        showToast(`⚠️ ${g.name}은(는) 이미 최고 레벨(Lv.${MAX_GUARD_LEVEL})입니다.`);
        return;
      }
      const cost = getGuardUpgradeCost(g.level);
      if (gameState.gold < cost) {
        showToast(`⚠️ 경비병 강화 골드(${formatGold(cost)} G)가 부족합니다!`);
        return;
      }
      gameState.gold -= cost;
      g.level += 1;
      syncTownGuardStats(entry, true);
      updateResourceHUD();
      renderGuardRosterModal();
      showToast(`⬆️ ${g.name} Lv.${g.level} 강화 완료! (HP ${g.maxHp.toLocaleString()} · ATK ${g.atk.toLocaleString()})`);
    }

    // 경비병 카드 한 장에 들어갈 표시 값 계산
    function getGuardCardView(entry) {
      const g = entry.guard;
      const isMax = g.level >= MAX_GUARD_LEVEL;
      const cost = getGuardUpgradeCost(g.level);
      const nextHp = Math.round((entry.baseHp || 250000) * (1 + g.level * 0.25));
      const nextAtk = Math.round(entry.baseAtk * (1 + g.level * 0.35));
      const nextSpeed = Math.min(260, Math.round(entry.baseSpeed + g.level * 1.5));
      const spdDiff = nextSpeed - g.speed;
      const maxHp = g.maxHp || 250000;
      const curHp = Math.max(0, Math.round(g.hp ?? maxHp));
      return {
        level: `Lv.${g.level} / ${MAX_GUARD_LEVEL}`,
        hp: `❤️ HP ${curHp.toLocaleString()} / ${maxHp.toLocaleString()}`,
        hpBar: `${Math.max(0, Math.min(100, (curHp / Math.max(1, maxHp)) * 100))}%`,
        atk: g.atk.toLocaleString(),
        speed: String(g.speed),
        detect: `👁️ 감지 사거리: ${g.detectRange}`,
        range: `🎯 공격 사거리: ${g.attackRange}`,
        next: isMax
          ? `👑 최고 강화 단계(Lv.${MAX_GUARD_LEVEL} MAX) 도달`
          : `다음 강화 시: ❤️ ${nextHp.toLocaleString()} · ⚔️ ${nextAtk.toLocaleString()} (+35%) · 💨 ${nextSpeed}${spdDiff > 0 ? ` (+${spdDiff})` : ' (MAX)'}`,
        status: g.targetHunterId ? '⚔️ 카오스 헌터 추격·제압 중' : '🚶 마을 내부 순찰 중',
        btnText: isMax ? 'MAX' : `⬆️ 강화 (${formatGold(cost)}G)`,
        canAfford: !isMax && gameState.gold >= cost
      };
    }

    // 경비병 창 갱신
    // 화면 갱신 때마다 창 전체를 새로 그리면 강화 버튼이 계속 새 버튼으로 바뀌어
    // 빠르게 누를 때 클릭이 씹히므로, 처음 한 번만 만들고 이후에는 글자·숫자만 바꾼다.
    function renderGuardRosterModal() {
      const body = document.getElementById('guardRosterBody');
      if (!body) return;

      const entries = getTownGuardsList();
      entries.forEach(e => syncTownGuardStats(e, false));

      const cards = body.querySelectorAll('[data-guard-card-id]');
      const sameLayout = cards.length === entries.length &&
        entries.every((entry, i) => cards[i].getAttribute('data-guard-card-id') === entry.id);

      if (!sameLayout) {
        body.innerHTML = `<div class="hunter-roster-grid">${entries.map((entry) => `
          <div class="roster-card" style="cursor:default;" data-guard-card-id="${entry.id}">
            <div class="roster-card-top">
              <div class="roster-name-group">
                <span class="roster-hunter-name">${entry.guard.name}</span>
                <span class="roster-job-badge" data-gf="level"></span>
              </div>
              <span class="personality-tag-trait">마을 수호</span>
            </div>
            <div style="font-size:11.5px;color:#cbd5e1;font-weight:700;">${entry.roleLabel}</div>
            <div class="roster-mini-bar">
              <span data-gf="hp"></span>
              <div class="roster-mini-track"><div class="bar-fill-hp" data-gf="hpBar"></div></div>
            </div>
            <div class="roster-card-meta" style="color:#f8fafc;font-weight:700;">
              <span>⚔️ 공격력: <b style="color:#fde047;" data-gf="atk"></b></span>
              <span>💨 이동속도: <b style="color:#7dd3fc;" data-gf="speed"></b></span>
            </div>
            <div class="roster-card-meta">
              <span data-gf="detect"></span>
              <span data-gf="range"></span>
            </div>
            <div style="font-size:11px;color:#86efac;background:rgba(15,23,42,0.72);padding:5px 8px;border-radius:7px;" data-gf="next"></div>
            <div class="roster-card-footer">
              <span class="roster-status-text" data-gf="status"></span>
              <div style="display:inline-flex;align-items:center;gap:5px;flex-shrink:0;">
                <button type="button" class="btn-roster-focus" data-guard-focus-id="${entry.id}">📍 위치 보기</button>
                <button type="button" class="btn-roster-donate" data-guard-upgrade-id="${entry.id}" data-gf="btn"></button>
              </div>
            </div>
          </div>
        `).join('')}</div>`;
      }

      const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
      entries.forEach((entry) => {
        const card = body.querySelector(`[data-guard-card-id="${entry.id}"]`);
        if (!card) return;
        const v = getGuardCardView(entry);
        const f = (key) => card.querySelector(`[data-gf="${key}"]`);
        setText(f('level'), v.level);
        setText(f('hp'), v.hp);
        const bar = f('hpBar');
        if (bar && bar.style.width !== v.hpBar) bar.style.width = v.hpBar;
        setText(f('atk'), v.atk);
        setText(f('speed'), v.speed);
        setText(f('detect'), v.detect);
        setText(f('range'), v.range);
        setText(f('next'), v.next);
        setText(f('status'), v.status);
        const btn = f('btn');
        if (btn) {
          setText(btn, v.btnText);
          if (btn.disabled !== !v.canAfford) btn.disabled = !v.canAfford;
        }
      });
    }

    document.getElementById('btnOpenGuardRoster')?.addEventListener('click', () => {
      renderGuardRosterModal();
      document.getElementById('guardRosterBackdrop')?.classList.add('open');
    });
    document.getElementById('btnCloseGuardRoster')?.addEventListener('click', () => {
      document.getElementById('guardRosterBackdrop')?.classList.remove('open');
    });
    document.getElementById('guardRosterBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'guardRosterBackdrop') e.currentTarget.classList.remove('open');
    });
    document.getElementById('guardRosterBody')?.addEventListener('click', (e) => {
      const upBtn = e.target.closest('[data-guard-upgrade-id]');
      if (upBtn && !upBtn.disabled) {
        const id = upBtn.getAttribute('data-guard-upgrade-id');
        if (id) upgradeTownGuardById(id);
        return;
      }
      const focusBtn = e.target.closest('[data-guard-focus-id]');
      if (focusBtn) {
        const id = focusBtn.getAttribute('data-guard-focus-id');
        const entry = getTownGuardsList().find(item => item.id === id);
        if (entry) {
          document.getElementById('guardRosterBackdrop')?.classList.remove('open');
          gameState.followSelectedHunter = false;
          camera.targetX = entry.guard.x;
          camera.targetY = entry.guard.y;
          camera._clampTargetBounds();
          showToast(`📍 ${entry.guard.name} 위치로 카메라를 이동했습니다.`);
        }
      }
    });

    document.getElementById('btnUnlockBuildingStage')?.addEventListener('click', () => {
      const plot = village.plots.find(p => p.id === gameState.selectedPlotId);
      if (!plot || !plot.building) return;
      const b = plot.building;
      const buildingMaxLv = b.maxLevel || MAX_BUILDING_LEVEL;
      const unlockedMax = Math.max(b.level, b.unlockedMaxLevel || b.level);
      if (unlockedMax >= buildingMaxLv) {
        if (buildingMaxLv <= 1) showToast(`ℹ️ ${b.name}은(는) Lv.1 고정 건물로 업그레이드할 수 없습니다.`);
        return;
      }
      const nextUnlockLv = unlockedMax + 1;
      const requiredBossStage = nextUnlockLv - 1;
      const isBossClearedForUnlock = BOSS_SANCTUM.bossStage >= nextUnlockLv || BOSS_SANCTUM.allStagesCleared;
      if (!isBossClearedForUnlock) {
        const reqBossCfg = getBossStageConfig(requiredBossStage);
        showToast(`🔒 ${requiredBossStage}보스 [${reqBossCfg.theme.title}] 처치 후 Lv.${nextUnlockLv} 잠금 해제가 가능합니다!`);
        return;
      }
      const unlockCost = village.getStageUnlockCost(b, nextUnlockLv);
      const upgradeCost = b.baseUpgradeCost * b.level;
      const totalCost = unlockCost + upgradeCost;
      if (gameState.gold < totalCost) {
        showToast(`⚠️ ${b.name} Lv.${nextUnlockLv} 잠금 해제 및 업그레이드 골드(${formatGold(totalCost)}G)가 부족합니다.`);
        return;
      }
      gameState.gold -= totalCost;
      b.unlockedMaxLevel = nextUnlockLv;
      b.level = nextUnlockLv;
      b.investedGold += totalCost;
      updateResourceHUD();
      openPlotPanel(plot);
      showToast(`🔓⬆️ ${b.icon} ${b.name} Lv.${b.level} 잠금 해제 및 업그레이드 완료!`);
    });

    document.getElementById('btnUpgradeBuilding')?.addEventListener('click', () => {
      const plot = village.plots.find(p => p.id === gameState.selectedPlotId);
      if (!plot || !plot.building) return;
      const b = plot.building;
      const buildingMaxLv = b.maxLevel || MAX_BUILDING_LEVEL;
      const unlockedMax = Math.max(b.level, b.unlockedMaxLevel || b.level);
      if (b.level >= buildingMaxLv) {
        if (buildingMaxLv <= 1) showToast(`ℹ️ ${b.name}은(는) Lv.1 고정 건물로 업그레이드할 수 없습니다.`);
        return;
      }
      if (b.level >= unlockedMax) {
        showToast(`🔒 먼저 ${b.name} Lv.${b.level + 1} 단계 잠금을 해제해주세요.`);
        return;
      }
      const isBossClearedForNext = BOSS_SANCTUM.bossStage >= (b.level + 1) || BOSS_SANCTUM.allStagesCleared;
      if (!isBossClearedForNext) {
        showToast(`🔒 ${b.level}보스를 처치해야 Lv.${b.level + 1} 업그레이드가 가능합니다.`);
        return;
      }
      const cost = b.baseUpgradeCost * b.level;
      if (gameState.gold < cost) {
        showToast(`⚠️ 업그레이드 골드(${formatGold(cost)}G)가 부족합니다.`);
        return;
      }
      gameState.gold -= cost;
      b.level += 1;
      b.investedGold += cost;
      updateResourceHUD();
      openPlotPanel(plot);
      showToast(`⬆️ ${b.icon} ${b.name} Lv.${b.level} 업그레이드 완료!`);
    });

    // 건물 철거 확인 모달 제어 및 철거 실행 로직
    let pendingDemolishPlotId = null;

    function getBuildingDemolishRefund(building) {
      if (!building) return 0;
      const invested = Math.max(
        building.buildCost || 0,
        building.investedGold || 0
      );
      return Math.floor(invested * 0.5);
    }

    function openDemolishConfirmModal(plotId) {
      const plot = village.plots.find(p => p.id === plotId);
      if (!plot || !plot.building) return;
      const b = plot.building;
      if (b.type === 'townhall') {
        showToast('🏛️ 마을 회관은 철거할 수 없습니다.');
        return;
      }
      pendingDemolishPlotId = plot.id;
      const refund = getBuildingDemolishRefund(b);
      const descEl = document.getElementById('demolishConfirmDesc');
      if (descEl) {
        descEl.innerHTML = `
          <b style="color:#fde047;">[${b.icon} ${b.name} · Lv.${b.level}]</b> 건물을 철거하시겠습니까?<br/>
          <div style="margin-top:6px;padding:8px 10px;background:rgba(15,23,42,0.85);border:1px solid rgba(248,113,113,0.35);border-radius:8px;font-size:11.5px;line-height:1.5;color:#e2e8f0;">
            • 철거 시 빈 부지로 돌아가며 투자 골드의 50%인 <b style="color:#86efac;">+${refund.toLocaleString()} G</b>가 마을 금고로 환급됩니다.<br/>
            • 해당 건물로 향하거나 이용 중이던 헌터들은 대기 상태로 전환됩니다.
          </div>
        `;
      }
      document.getElementById('demolishConfirmBackdrop')?.classList.add('open');
    }

    function closeDemolishConfirmModal() {
      pendingDemolishPlotId = null;
      document.getElementById('demolishConfirmBackdrop')?.classList.remove('open');
    }

    function commitDemolishBuilding() {
      const plot = village.plots.find(p => p.id === pendingDemolishPlotId);
      closeDemolishConfirmModal();
      if (!plot || !plot.building) return;
      const b = plot.building;
      if (b.type === 'townhall') {
        showToast('🏛️ 마을 회관은 철거할 수 없습니다.');
        return;
      }

      const demolishedType = b.type;
      const demolishedIcon = b.icon;
      const demolishedName = b.name;
      const refund = getBuildingDemolishRefund(b);

      plot.building = null;
      gameState.gold += refund;

      // 철거된 시설을 목적지로 삼거나 이용 중이던 헌터 상태 정리
      hunters.forEach((h) => {
        if (h.targetBuildingType === demolishedType) {
          h.targetBuildingName = '';
          h.targetBuildingType = '';
          h.facilityStuckTimer = 0;
          if (h.state === 'WALKING' || h.state === 'USING_FACILITY') {
            h.waypoints = [];
            h.state = 'IDLE';
            h.stateTimer = 0.4;
          }
        }
      });

      updateResourceHUD();
      openPlotPanel(plot);
      if (typeof scheduleAutoSave === 'function') {
        scheduleAutoSave(400);
      }
      showToast(`🏚️ ${demolishedIcon} ${demolishedName} 철거 완료! (+${refund.toLocaleString()} G 환급)`);
    }

    document.getElementById('btnDemolishBuilding')?.addEventListener('click', () => {
      if (gameState.selectedPlotId) {
        openDemolishConfirmModal(gameState.selectedPlotId);
      }
    });
    document.getElementById('btnCloseDemolishConfirmModal')?.addEventListener('click', closeDemolishConfirmModal);
    document.getElementById('btnCancelDemolishAction')?.addEventListener('click', closeDemolishConfirmModal);
    document.getElementById('demolishConfirmBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'demolishConfirmBackdrop') closeDemolishConfirmModal();
    });
    document.getElementById('btnConfirmDemolishAction')?.addEventListener('click', commitDemolishBuilding);
    function updateBossRaidHudButton() {
      const btn = document.getElementById('btnBossRaidControl');
      const orcSubjBtn = document.getElementById('btnOrcSubjugationRaid');
      const abandonBtn = document.getElementById('btnAbandonBossRaid');
      const isBossRaidActive = BOSS_SANCTUM.status !== 'CLOSED';
      const isOrcRaidActive = ORC_SUBJUGATION.status !== 'CLOSED';
      const isEitherRaidRunning = isBossRaidActive || isOrcRaidActive;

      if (orcSubjBtn) {
        if (ORC_SUBJUGATION.status === 'PREPARING') {
          const rem = Math.max(0, Math.ceil(ORC_SUBJUGATION.prepTimer || 0));
          orcSubjBtn.disabled = true;
          orcSubjBtn.textContent = rem > 30
            ? `⏳ 토벌 정비 (${rem - 30}s+${30}s)`
            : `🛑 출격 대기 (${rem}s)`;
          orcSubjBtn.title = '마을에서 60초 정비 후 30초 대기(총 90초) 뒤 모든 헌터가 오크의 숲으로 일제히 이동합니다.';
        } else if (ORC_SUBJUGATION.status === 'ACTIVE') {
          orcSubjBtn.disabled = true;
          orcSubjBtn.textContent = '⚔️ 오크 토벌 중';
          orcSubjBtn.title = '오크의 숲에서 오크 토벌전이 진행 중입니다.';
        } else {
          const allOrcsLv99 = areAllOrcsLevel99();
          orcSubjBtn.disabled = isEitherRaidRunning || !allOrcsLv99;
          orcSubjBtn.textContent = '👹 오크 토벌';
          orcSubjBtn.title = isBossRaidActive
            ? '보스 레이드가 진행 중이므로 오크 토벌 버튼을 사용할 수 없습니다.'
            : (allOrcsLv99
                ? '모든 오크가 Lv.99에 도달했습니다! 클릭하여 60초 정비 후 오크의 숲 토벌전을 시작하세요.'
                : '모든 오크가 Lv.99에 도달해야 활성화됩니다.');
        }
      }
      if (abandonBtn) abandonBtn.style.display = 'none'; // 포기는 보스 버튼 하나로 합침
      if (!btn) return;
      const cfg = getBossStageConfig(BOSS_SANCTUM.bossStage);
      if (BOSS_SANCTUM.status === 'CLOSED') {
        btn.disabled = isEitherRaidRunning;
        btn.textContent = '🔥 보스 오픈';
        btn.title = isOrcRaidActive
          ? '오크 토벌전이 진행 중이므로 보스 오픈 버튼을 사용할 수 없습니다.'
          : '고대 수호자의 성소 보스 레이드를 개방합니다.';
        btn.classList.remove('boss-btn-abandon');
      } else if (BOSS_SANCTUM.status === 'PREPARING') {
        btn.disabled = false;
        btn.classList.add('boss-btn-abandon');
        btn.title = '누르면 보스 레이드를 포기합니다 (한 번 더 눌러 확정)';
        btn.textContent = bossAbandonArmed()
          ? '🏳️ 한 번 더 누르면 포기'
          : `⏳ 보스 정비 ${Math.ceil(BOSS_SANCTUM.prepTimer)}s · 🏳️포기`;
      } else {
        const hpPct = Math.max(0, Math.ceil((BOSS_SANCTUM.boss.hp / BOSS_SANCTUM.boss.maxHp) * 100));
        const remSec = Math.max(0, Math.ceil(BOSS_SANCTUM.raidTimer || 0));
        const mm = String(Math.floor(remSec / 60)).padStart(2, '0');
        const ss = String(remSec % 60).padStart(2, '0');
        btn.disabled = false;
        btn.classList.add('boss-btn-abandon');
        btn.title = '누르면 보스 레이드를 포기합니다 (한 번 더 눌러 확정)';
        btn.textContent = bossAbandonArmed()
          ? '🏳️ 한 번 더 누르면 포기'
          : `⚔️ T${cfg.stage} ${hpPct}% · ${mm}:${ss} · 🏳️포기`;
      }
    }

    function openBossSanctumByUser() {
      if (BOSS_SANCTUM.status !== 'CLOSED') {
        showToast('⚠️ 이미 보스 필드가 개방되어 있습니다.');
        return;
      }
      if (hunters.length === 0) {
        showToast('⚠️ 보스 레이드에 참가할 헌터가 없습니다.');
        return;
      }
      BOSS_SANCTUM.status = 'PREPARING';
      BOSS_SANCTUM.prepTimer = BOSS_SANCTUM.prepDuration;
      BOSS_SANCTUM.raidTimer = BOSS_SANCTUM.raidDuration;
      BOSS_SANCTUM.fallenHunterIds.clear();
      resetBossSanctumMonster();

      hunters.forEach((h) => {
        if (h.state === 'REBIRTH_ALTAR_HUNT') return;
        const onSky = h.activeGroundId === SKY_ISLAND_GROUND.id || h.skyIslandPortalWarp === true || (
          h.x >= SKY_ISLAND_GROUND.bounds.x - 20 &&
          h.x <= SKY_ISLAND_GROUND.bounds.x + SKY_ISLAND_GROUND.bounds.w + 20 &&
          h.y >= SKY_ISLAND_GROUND.bounds.y - 20 &&
          h.y <= SKY_ISLAND_GROUND.bounds.y + SKY_ISLAND_GROUND.bounds.h + 20
        );
        if (onSky) {
          teleportHunterFromSkyIslandToTown(h, '✨ 보스전 집결 · 천공의 섬에서 마을 순간 이동!');
        }
        h.currentTargetMonster = null;
        h.activeGroundId = null;
        interactionManager.spawnBubble(h, '📢 보스 필드 오픈! 1분간 정비 시작!', '#fde047');
        h.pickNextDestination();
      });

      updateBossRaidHudButton();
      showToast('🔥 고대 수호자의 성소 개방! 헌터들이 1분간 정비 후 전원 출격합니다!');
    }

    function failBossRaidAndReset(reason) {
      BOSS_SANCTUM.status = 'CLOSED';
      BOSS_SANCTUM.prepTimer = 0;
      BOSS_SANCTUM.raidTimer = 0;
      BOSS_SANCTUM.fallenHunterIds.clear();
      resetBossSanctumMonster();

      hunters.forEach((h) => {
        if (h.state === 'REBIRTH_ALTAR_HUNT') return;
        h.currentTargetMonster = null;
        if (h.y < -340 && h.x > 600 && h.x < 1200) {
          h.x = 840 + Math.random() * 200;
          h.y = -320;
        }
        h.state = 'IDLE';
        h.stateTimer = 0.5;
      });

      updateBossRaidHudButton();
      showToast(`💀 보스 레이드 실패 (${reason})! 보스 체력이 모두 회복되고 성소가 다시 봉인되었습니다.`);
    }

    function startOrcSubjugationRaid() {
      if (ORC_SUBJUGATION.status !== 'CLOSED') {
        showToast('⚠️ 이미 오크 토벌전이 진행 중입니다.');
        return;
      }
      if (!areAllOrcsLevel99()) {
        showToast('🔒 모든 오크가 Lv.99에 도달해야 [오크 토벌]을 시작할 수 있습니다.');
        return;
      }
      if (BOSS_SANCTUM.status !== 'CLOSED') {
        showToast('⚠️ 보스 레이드 진행 중에는 오크 토벌전을 시작할 수 없습니다.');
        return;
      }
      if (hunters.length === 0) {
        showToast('⚠️ 오크 토벌전에 참가할 헌터가 없습니다.');
        return;
      }

      ORC_SUBJUGATION.status = 'PREPARING';
      ORC_SUBJUGATION.prepTimer = ORC_SUBJUGATION.prepDuration;
      ORC_SUBJUGATION.fallenHunterIds.clear();
      ORC_SUBJUGATION.sessionScore = 0;

      hunters.forEach((h) => {
        if (!h) return;
        const onSky = h.activeGroundId === SKY_ISLAND_GROUND.id || h.skyIslandPortalWarp === true || (
          h.x >= SKY_ISLAND_GROUND.bounds.x - 20 &&
          h.x <= SKY_ISLAND_GROUND.bounds.x + SKY_ISLAND_GROUND.bounds.w + 20 &&
          h.y >= SKY_ISLAND_GROUND.bounds.y - 20 &&
          h.y <= SKY_ISLAND_GROUND.bounds.y + SKY_ISLAND_GROUND.bounds.h + 20
        );
        if (onSky) {
          teleportHunterFromSkyIslandToTown(h, '✨ 오크 토벌 집결 · 마을로 순간 이동!');
        }
        h.currentTargetMonster = null;
        h.currentTargetHunter = null;
        h.activeGroundId = null;
        h.targetGroundId = null;
        interactionManager.spawnBubble(h, '👹 오크 토벌 개시! 마을에서 1분간 정비!', '#fde047');
        h.pickNextDestination();
      });

      camera.targetX = 0;
      camera.targetY = 0;
      camera._clampTargetBounds();
      updateBossRaidHudButton();
      showToast('👹 오크 토벌 개시! 전 헌터가 마을로 일제히 이동해 1분 정비 후 30초 대기(총 1분 30초) 뒤 오크의 숲으로 진격합니다!');
    }

    function launchOrcSubjugationBattle() {
      ORC_SUBJUGATION.status = 'ACTIVE';
      clearOrcForestMonstersForRaid();
      ORC_SUBJUGATION.prepTimer = 0;
      updateBossRaidHudButton();

      const topGround = HUNTING_GROUNDS.find(g => g.id === 'top_field_70_99');
      const targetCenterX = topGround ? topGround.centerX : 1820;
      const targetCenterY = topGround ? topGround.centerY : 0;

      // 살아있는 모든 오크도 오크의 숲 전장으로 집결
      ORC_STRONGHOLD_ZONE.orcs.forEach((orc, idx) => {
        ensureOrcUnitFields(orc, idx);
        if (!orc.isDead && orc.hp > 0) {
          orc.aiMode = 'SORTIE';
          orc.sortieTimer = 0;
        }
      });

      const eligibleHunters = hunters.filter(
        h => h && h.hp > 0 && !ORC_SUBJUGATION.fallenHunterIds.has(h.id)
      );
      const marchCount = eligibleHunters.length;

      eligibleHunters.forEach((h, idx) => {
        const onSky = h.activeGroundId === SKY_ISLAND_GROUND.id || h.skyIslandPortalWarp === true || (
          h.x >= SKY_ISLAND_GROUND.bounds.x - 20 &&
          h.x <= SKY_ISLAND_GROUND.bounds.x + SKY_ISLAND_GROUND.bounds.w + 20 &&
          h.y >= SKY_ISLAND_GROUND.bounds.y - 20 &&
          h.y <= SKY_ISLAND_GROUND.bounds.y + SKY_ISLAND_GROUND.bounds.h + 20
        );
        if (onSky) {
          teleportHunterFromSkyIslandToTown(h, '✨ 오크의 숲 일제 진격! 마을로 순간 이동!');
        }
        const angle = (idx / Math.max(1, marchCount)) * Math.PI * 2;
        const spreadR = 36 + (idx % 3) * 28;
        const destX = targetCenterX + Math.cos(angle) * spreadR;
        const destY = targetCenterY + Math.sin(angle) * spreadR;

        h.activeGroundId = 'top_field_70_99';
        h.targetGroundId = 'top_field_70_99';
        h.targetBuildingName = '오크의 숲 (오크 토벌전)';
        h.targetBuildingType = 'orc_subjugation';
        h.currentTargetMonster = null;
        h.currentTargetHunter = null;
        h.state = 'ORC_SUBJUGATION_RAID';
        h.setDestinationWithGatePath(destX, destY);
        interactionManager.spawnBubble(h, '⚔️ 90초 준비 완료! 오크의 숲 일제 진격!', '#fda4af');
      });

      camera.targetX = targetCenterX;
      camera.targetY = targetCenterY;
      camera._clampTargetBounds();
      showToast(`⚔️ 1분 정비 + 30초 대기 완료! ${marchCount}명의 헌터가 오크의 숲으로 일제히 이동해 전투를 시작합니다!`);
    }

    function launchOrcSubjugationBattle() {
      ORC_SUBJUGATION.status = 'ACTIVE';
      clearOrcForestMonstersForRaid();
      ORC_SUBJUGATION.prepTimer = 0;
      updateBossRaidHudButton();

      const topGround = HUNTING_GROUNDS.find(g => g.id === 'top_field_70_99');
      const targetCenterX = topGround ? topGround.centerX : 1820;
      const targetCenterY = topGround ? topGround.centerY : 0;

      // 살아있는 모든 오크도 오크의 숲 전장으로 집결
      ORC_STRONGHOLD_ZONE.orcs.forEach((orc, idx) => {
        ensureOrcUnitFields(orc, idx);
        if (!orc.isDead && orc.hp > 0) {
          orc.aiMode = 'SORTIE';
          orc.sortieTimer = 0;
        }
      });

      hunters.forEach((h) => {
        if (!h || h.hp <= 0 || ORC_SUBJUGATION.fallenHunterIds.has(h.id)) return;
        const onSky = h.activeGroundId === SKY_ISLAND_GROUND.id || h.skyIslandPortalWarp === true || (
          h.x >= SKY_ISLAND_GROUND.bounds.x - 20 &&
          h.x <= SKY_ISLAND_GROUND.bounds.x + SKY_ISLAND_GROUND.bounds.w + 20 &&
          h.y >= SKY_ISLAND_GROUND.bounds.y - 20 &&
          h.y <= SKY_ISLAND_GROUND.bounds.y + SKY_ISLAND_GROUND.bounds.h + 20
        );
        if (onSky) {
          teleportHunterFromSkyIslandToTown(h, '✨ 오크의 숲 진격! 마을로 순간 이동!');
        }
        h.activeGroundId = 'top_field_70_99';
        h.targetGroundId = 'top_field_70_99';
        h.targetBuildingName = '오크의 숲 (오크 토벌전)';
        h.targetBuildingType = 'orc_subjugation';
        h.currentTargetMonster = null;
        h.currentTargetHunter = null;
        h.state = 'ORC_SUBJUGATION_RAID';
        const raidSlot = getRaidHunterSlot(h);
        h.setDestinationWithGatePath(raidSlot.x, raidSlot.y);
        interactionManager.spawnBubble(h, '⚔️ 정비 완료! 오크의 숲으로 진격!', '#fda4af');
      });

      camera.targetX = targetCenterX;
      camera.targetY = targetCenterY;
      camera._clampTargetBounds();
      showToast('⚔️ 1분 정비 완료! 모든 헌터가 오크의 숲으로 이동하여 오크 토벌 전투를 시작합니다!');
    }

    function abandonBossRaidByUser() {
      if (BOSS_SANCTUM.status === 'CLOSED') return;

      BOSS_SANCTUM.status = 'CLOSED';
      BOSS_SANCTUM.prepTimer = 0;
      BOSS_SANCTUM.fallenHunterIds.clear();
      resetBossSanctumMonster();

      // 보스 대상 투사체 정리
      combatEffects.projectiles = combatEffects.projectiles.filter(
        pr => !pr.isBossTarget && (!pr.isMonsterProj || pr.target?.state !== 'BOSS_RAID')
      );

      hunters.forEach((h) => {
        if (h.state === 'REBIRTH_ALTAR_HUNT') return;
        h.currentTargetMonster = null;
        h.waypoints = [];
        if (h.y < -340 && h.x > 600 && h.x < 1200) {
          h.x = 840 + Math.random() * 200;
          h.y = -320;
        }
        if (h.state === 'BOSS_RAID' || h.state === 'RAID_PREP_WAIT' || h.targetBuildingType === 'boss_standby') {
          h.state = 'IDLE';
          h.stateTimer = 0.3;
          h.targetBuildingName = '';
          h.targetBuildingType = '';
          h.targetGroundId = null;
          interactionManager.spawnBubble(h, '🏳️ 레이드 포기 · 철수 복귀!', '#fde68a');
        }
      });

      updateBossRaidHudButton();
      showToast('🏳️ 보스 레이드를 포기했습니다. 성소가 다시 봉인되고 헌터들이 철수합니다.');
    }

    // 보스 버튼 하나로: 닫혀 있으면 오픈, 진행 중이면 두 번 눌러 포기
    var bossAbandonArmedUntil = 0;
    function bossAbandonArmed() { return Date.now() < bossAbandonArmedUntil; }
    document.getElementById('btnBossRaidControl')?.addEventListener('click', () => {
      if (BOSS_SANCTUM.status === 'CLOSED') {
        openBossSanctumByUser();
        return;
      }
      if (bossAbandonArmed()) {
        bossAbandonArmedUntil = 0;
        abandonBossRaidByUser();
        return;
      }
      bossAbandonArmedUntil = Date.now() + 3000;
      updateBossRaidHudButton();
      setTimeout(updateBossRaidHudButton, 3100);
    });
    document.getElementById('btnOrcSubjugationRaid')?.addEventListener('click', () => {
      const allOrcsLv99 = Array.isArray(ORC_STRONGHOLD_ZONE?.orcs) &&
        ORC_STRONGHOLD_ZONE.orcs.length > 0 &&
        ORC_STRONGHOLD_ZONE.orcs.every(o => o && (o.level || 1) >= ORC_MAX_LEVEL);
      if (!allOrcsLv99) {
        showToast('🔒 모든 오크가 Lv.99에 도달해야 [오크 토벌] 버튼을 사용할 수 있습니다.');
        return;
      }
      startOrcSubjugationRaid();
    });
    document.getElementById('btnAbandonBossRaid')?.addEventListener('click', abandonBossRaidByUser);

    document.getElementById('btnOpenHelpModal')?.addEventListener('click', () => {
      renderHelpModalContent('start');
      document.querySelectorAll('.help-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.helpTab === 'start'));
      document.getElementById('helpModalBackdrop')?.classList.add('open');
    });
    document.getElementById('btnCloseHelpModal')?.addEventListener('click', () => {
      document.getElementById('helpModalBackdrop')?.classList.remove('open');
    });
    document.getElementById('helpModalBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'helpModalBackdrop') e.currentTarget.classList.remove('open');
    });
    document.querySelectorAll('.help-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-help-tab');
        document.querySelectorAll('.help-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderHelpModalContent(tab);
      });
    });

    document.getElementById('btnZoomIn').addEventListener('click', () => {
      camera.zoomAtPoint(camera.targetUserZoom * 1.25, camera.viewportWidth / 2, camera.viewportHeight / 2);
    });
    document.getElementById('btnZoomOut').addEventListener('click', () => {
      camera.zoomAtPoint(camera.targetUserZoom * 0.8, camera.viewportWidth / 2, camera.viewportHeight / 2);
    });
    document.getElementById('btnReset').addEventListener('click', () => {
      camera.reset();
    });

    function expandVillagePlot() {
      const expandCost = 300;
      const nextCoord = village.getNextExpansionCoord();
      if (!nextCoord) {
        showToast('⚠️ 더 이상 확장할 수 있는 부지가 없습니다!');
        updateResourceHUD();
        return;
      }
      if (gameState.gold < expandCost) {
        showToast(`⚠️ 부지 추가 골드(${expandCost}G)가 부족합니다!`);
        return;
      }
      gameState.gold -= expandCost;
      const newPlot = village.addPlot(
        `plot_exp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        nextCoord.x,
        nextCoord.y,
        null
      );
      camera.targetX = Math.max(-450, Math.min(450, newPlot.x));
      camera.targetY = Math.max(-350, Math.min(450, newPlot.y));
      updateResourceHUD();
      openPlotPanel(newPlot);
      showToast(`🏗️ 새 빈 부지가 추가되었습니다! (${expandCost}G 차감)`);
    }

    document.getElementById('btnExpandPlot')?.addEventListener('click', expandVillagePlot);

    // 전체화면 전환 토글 및 상태 동기화 (PC & 모바일 브라우저 호환)
    function updateFullscreenButtons() {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      const navBtn = document.getElementById('btnToggleFullscreen');
      const dockBtn = document.getElementById('btnDockFullscreen');
      const iconText = isFs ? '🗗' : '⛶';
      const labelTitle = isFs ? '전체화면 종료' : '전체화면 전환';
      if (navBtn) {
        navBtn.textContent = iconText;
        navBtn.title = labelTitle;
      }
      if (dockBtn) {
        dockBtn.textContent = iconText;
        dockBtn.title = labelTitle;
      }
    }

    async function toggleFullscreenMode() {
      try {
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        if (!fsEl) {
          const root = document.documentElement;
          if (root.requestFullscreen) {
            await root.requestFullscreen();
          } else if (root.webkitRequestFullscreen) {
            root.webkitRequestFullscreen();
          } else {
            showToast('⚠️ 현재 브라우저 환경에서는 전체화면 API가 지원되지 않습니다.');
            return;
          }
          showToast('⛶ 전체화면 모드로 전환되었습니다.');
        } else {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          }
          showToast('🗗 전체화면 모드를 종료했습니다.');
        }
      } catch (err) {
        showToast('⚠️ 전체화면 전환이 차단되었거나 지원되지 않는 환경입니다.');
      } finally {
        updateFullscreenButtons();
      }
    }

    document.getElementById('btnToggleFullscreen')?.addEventListener('click', toggleFullscreenMode);
    document.getElementById('btnDockFullscreen')?.addEventListener('click', toggleFullscreenMode);
    document.addEventListener('fullscreenchange', updateFullscreenButtons);
    document.addEventListener('webkitfullscreenchange', updateFullscreenButtons);

    // 캔버스 클릭/터치 시 헌터 우선 판정 후 부지/건물 히트 테스트
    canvas.addEventListener('click', (e) => {
      if (camera.hasMoved) return;

      const worldPos = camera.screenToWorld(e.clientX, e.clientY);
      const clickedHunter = getHunterAt(worldPos.x, worldPos.y);
      if (clickedHunter) {
        closeMonsterPopup();
        openHunterPanel(clickedHunter);
        return;
      }

      const clickedMonsterHit = getMonsterAt(worldPos.x, worldPos.y);
      if (clickedMonsterHit) {
        openMonsterPopup(clickedMonsterHit.monster, clickedMonsterHit.ground);
        return;
      }

      const clickedPlot = village.getPlotAt(worldPos.x, worldPos.y);
      if (clickedPlot) {
        closeMonsterPopup();
        openPlotPanel(clickedPlot);
      } else {
        closeMonsterPopup();
        closeBuildingPanel();
        closeHunterPanel();
      }
    });
