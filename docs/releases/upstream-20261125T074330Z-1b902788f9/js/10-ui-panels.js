// [10-ui-panels] UI 패널 (HUD, 건물/헌터/몬스터 패널, 헌터 목록, 도움말)
    // ============================================================================
    // UI 업데이트 & 상호작용 헬퍼 함수 복구
    // ============================================================================
    let toastTimer = null;
    function showToast(msg) {
      const el = document.getElementById('toastMsg');
      if (!el) return;
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
    }

    function getMaxHunterCapacity() {
      const hall = village.getAllBuildings().find(b => b.type === 'townhall');
      const base = hall ? getTownHallCapacity(hall.level) : 4;
      // 5환생 헌터 추방으로 늘어난 정원 (최대 +20, js/26-transcend.js)
      const bonus = Math.max(0, Math.min(20, Math.floor(Number(gameState.banishBonusSlots) || 0)));
      // 토벌 포인트 상점에서 산 정원 (최대 +100, js/28-subjugation-shop.js)
      const shopBonus = Math.max(0, Math.min(100, Math.floor(Number(gameState.shopBonusSlots) || 0)));
      return base + bonus + shopBonus;
    }

    function updateResourceHUD() {
      gameState.prosperity = village.computeTotalProsperity();
      gameState.huntersCount = hunters.length;
      const maxCap = getMaxHunterCapacity();

      const goldEl = document.getElementById('goldDisplay');
      const subjEl = document.getElementById('subjugationPointsDisplay');
      const prospEl = document.getElementById('prosperityDisplay');
      const capEl = document.getElementById('capacityDisplay');
      const expandBtn = document.getElementById('btnExpandPlot');
      const rosterRecruitBtn = document.getElementById('btnRosterRecruitHunter');
      const oneTimeT3Btn = document.getElementById('btnSummonOneTimeT3Hunter');

      if (goldEl) {
        goldEl.textContent = formatGold(gameState.gold);
        const chipEl = goldEl.closest('.stat-chip');
        if (chipEl) chipEl.title = `마을 금고 보유 골드: ${Math.floor(gameState.gold).toLocaleString()} G`;
      }
      if (subjEl) {
        const subjPts = Math.max(0, Math.floor(Number(gameState.subjugationPoints) || 0));
        subjEl.textContent = subjPts.toLocaleString();
        const subjChip = subjEl.closest('.stat-chip');
        if (subjChip) subjChip.title = `보유 토벌 포인트: ${subjPts.toLocaleString()} P`;
      }
      if (prospEl) prospEl.textContent = gameState.prosperity.toLocaleString();
      if (capEl) capEl.textContent = `${hunters.length} / ${maxCap}`;

      if (rosterRecruitBtn) {
        const isFull = hunters.length >= maxCap;
        rosterRecruitBtn.disabled = isFull || gameState.gold < 200;
        rosterRecruitBtn.textContent = isFull ? `정원 가득 (${hunters.length}/${maxCap})` : '⚔️ 영입 (200G)';
      }

      if (oneTimeT3Btn) {
        const isFull = hunters.length >= maxCap;
        if (gameState.oneTimeT3SummonUsed) {
          oneTimeT3Btn.style.display = 'none';
          oneTimeT3Btn.disabled = true;
          oneTimeT3Btn.textContent = '✨ 3T·Lv.1 소환 완료';
        } else {
          oneTimeT3Btn.style.display = '';
          oneTimeT3Btn.disabled = isFull;
          oneTimeT3Btn.textContent = isFull ? `정원 가득 (${hunters.length}/${maxCap})` : '✨ 1회 한정 3T·Lv.1 소환';
        }
      }

      if (expandBtn) {
        const rem = village.getRemainingExpandableCount();
        expandBtn.textContent = rem > 0 ? `+ 부지 (300G · ${rem})` : '부지 최대';
        expandBtn.disabled = rem <= 0;
      }

      if (document.getElementById('guardRosterBackdrop')?.classList.contains('open')) {
        renderGuardRosterModal();
      }
      if (gameState.powerSavingMode) {
        refreshPowerSavingOverlay();
      }
    }

    function refreshPowerSavingOverlay() {
      const goldEl = document.getElementById('psGoldVal');
      const huntersEl = document.getElementById('psHuntersVal');
      const bossEl = document.getElementById('psBossVal');
      if (goldEl) goldEl.textContent = `${formatGold(gameState.gold)} G`;
      if (huntersEl) huntersEl.textContent = `${hunters.length} / ${getMaxHunterCapacity()}명`;
      if (bossEl) {
        const cfg = getBossStageConfig(BOSS_SANCTUM.bossStage);
        const statusText = BOSS_SANCTUM.status === 'ACTIVE'
          ? '전투 중'
          : (BOSS_SANCTUM.status === 'PREPARING' ? `정비 ${Math.ceil(BOSS_SANCTUM.prepTimer)}s` : '봉인');
        bossEl.textContent = `T${cfg.stage} (${statusText})`;
      }
    }

    function setPowerSavingMode(enabled) {
      const next = Boolean(enabled);
      gameState.powerSavingMode = next;
      const overlay = document.getElementById('powerSavingOverlay');
      const btn = document.getElementById('btnTogglePowerSaving');
      if (overlay) {
        overlay.classList.toggle('active', next);
      }
      if (btn) {
        btn.classList.toggle('active', next);
        btn.textContent = next ? '☀️ 절전 중' : '🌙 절전';
      }
      if (next) {
        refreshPowerSavingOverlay();
        showToast('🌙 절전 모드가 켜졌습니다. 화면을 누르면 즉시 해제됩니다.');
      } else {
        showToast('☀️ 절전 모드가 해제되었습니다.');
      }
    }

    document.getElementById('btnTogglePowerSaving')?.addEventListener('click', () => {
      setPowerSavingMode(!gameState.powerSavingMode);
    });
    document.getElementById('btnWakeFromPowerSaving')?.addEventListener('click', (e) => {
      e.stopPropagation();
      setPowerSavingMode(false);
    });
    document.getElementById('powerSavingOverlay')?.addEventListener('click', () => {
      setPowerSavingMode(false);
    });

    function collectFacilityTax(hunter, baseFee) {
      const bank = village.getAllBuildings().find(b => b.type === 'guildbank');
      const bonusRate = bank ? (1 + bank.level * 0.12) : 1;
      const finalTax = Math.max(1, Math.round(baseFee * bonusRate));
      gameState.gold += finalTax;
      hunter.earnedGold = (hunter.earnedGold || 0) + finalTax;
      updateResourceHUD();
      interactionManager.spawnBubble(hunter, `💰 +${finalTax}G 세금`, '#fbbf24');
    }

    function getHunterAt(wx, wy) {
      for (let i = hunters.length - 1; i >= 0; i--) {
        const h = hunters[i];
        if (h.state === 'IN_DUNGEON') continue;
        if (Math.hypot(wx - h.x, wy - h.y) <= 22) return h;
      }
      return null;
    }

    // 사냥터 및 환생 제단 내 살아있는 몬스터 히트 판정
    function getMonsterAt(wx, wy) {
      if (typeof ORC_STRONGHOLD_ZONE !== 'undefined' && Array.isArray(ORC_STRONGHOLD_ZONE.orcs)) {
        for (let oIdx = ORC_STRONGHOLD_ZONE.orcs.length - 1; oIdx >= 0; oIdx--) {
          const orc = ORC_STRONGHOLD_ZONE.orcs[oIdx];
          if (!orc || orc.isDead || orc.hp <= 0) continue;
          const hitRadius = orc.isGreatWarrior ? 32 : 24;
          if (Math.hypot(wx - orc.x, wy - orc.y) <= hitRadius) {
            ensureOrcUnitFields(orc, oIdx);
            const oStats = getOrcCombatStats(orc);
            return {
              monster: {
                ...orc,
                isOrcUnit: true,
                orcRef: orc,
                atk: oStats.atk,
                def: oStats.def
              },
              ground: {
                id: ORC_STRONGHOLD_ZONE.id,
                name: `${ORC_STRONGHOLD_ZONE.name} · ${orc.role}`,
                icon: '👹',
                baseExp: 0,
                baseGold: 0
              }
            };
          }
        }
      }

      const sanctumBoss = BOSS_SANCTUM.boss;
      if (sanctumBoss && sanctumBoss.hp > 0 && Math.hypot(wx - sanctumBoss.x, wy - sanctumBoss.y) <= 58) {
        const cfg = getBossStageConfig(BOSS_SANCTUM.bossStage);
        return {
          monster: sanctumBoss,
          ground: {
            id: BOSS_SANCTUM.id,
            name: `${BOSS_SANCTUM.name} (${cfg.reqLabel})`,
            icon: '🔥',
            baseExp: cfg.rewardExp,
            baseGold: cfg.rewardHunterGold,
            rewardVillageGold: cfg.rewardVillageGold,
            rewardMats: cfg.rewardMats,
            regenPerSec: cfg.regenPerSec,
            bossStatus: BOSS_SANCTUM.status
          }
        };
      }

      const rbBoss = REBIRTH_ALTAR.boss;
      if (rbBoss && rbBoss.hp > 0 && Math.hypot(wx - rbBoss.x, wy - rbBoss.y) <= 38) {
        return {
          monster: rbBoss,
          ground: {
            id: REBIRTH_ALTAR.id,
            name: `${REBIRTH_ALTAR.name} (1환생↑ 전용)`,
            icon: '✨',
            baseExp: rbBoss.rewardExp,
            baseGold: rbBoss.rewardHunterGold
          }
        };
      }

      for (let gIdx = ALL_FIELD_GROUNDS.length - 1; gIdx >= 0; gIdx--) {
        const ground = ALL_FIELD_GROUNDS[gIdx];
        for (let mIdx = ground.monsters.length - 1; mIdx >= 0; mIdx--) {
          const m = ground.monsters[mIdx];
          if (!m || m.hp <= 0) continue;
          const hitRadius = m.isFieldMiniBoss ? 30 : (m.kind === 'kingslime' ? 25 : 20);
          if (Math.hypot(wx - m.x, wy - m.y) <= hitRadius) {
            return { monster: m, ground };
          }
        }
      }
      return null;
    }

    function closeMonsterPopup() {
      gameState.selectedMonsterRef = null;
      gameState.selectedMonsterGroundId = null;
      const popup = document.getElementById('monsterInfoPopup');
      if (popup) popup.classList.remove('active');
    }

    function refreshMonsterPopup() {
      const popup = document.getElementById('monsterInfoPopup');
      const m = gameState.selectedMonsterRef;
      let ground = null;
      if (gameState.selectedMonsterGroundId === ORC_STRONGHOLD_ZONE.id && m?.orcRef) {
        const liveOrc = m.orcRef;
        if (!liveOrc || liveOrc.isDead || liveOrc.hp <= 0 || !ORC_STRONGHOLD_ZONE.orcs.includes(liveOrc)) {
          closeMonsterPopup();
          return;
        }
        ensureOrcUnitFields(liveOrc);
        const oStats = getOrcCombatStats(liveOrc);
        const nameEl = document.getElementById('monsterPopupName');
        const zoneEl = document.getElementById('monsterPopupZone');
        const atkEl = document.getElementById('monsterPopupAtk');
        const expEl = document.getElementById('monsterPopupExp');
        const goldEl = document.getElementById('monsterPopupGold');
        const healHoldSec = Math.ceil(liveOrc.fullHealReadyTimer || 0);
        const modeTag = (liveOrc.level || 1) >= ORC_MAX_LEVEL
          ? '👑 Lv.99 달성 · 오크 군락지 주둔 대기'
          : (liveOrc.aiMode === 'SORTIE'
              ? '⚔️ 최상급 사냥터 출정 중'
              : (!isOrcStrongholdPassageOpen()
                  ? '🔒 군락지 수비 (5티어 보스 처치 시 길 개방)'
                  : (healHoldSec > 0
                      ? `⏳ 회복 완료 · ${healHoldSec}초 후 출정 가능`
                      : '✅ 출정 대기 완료')));
        const statLabels = popup?.querySelectorAll('.monster-stat-label');
        if (statLabels && statLabels.length >= 3) {
          statLabels[0].textContent = '⚔️ 공격/방어';
          statLabels[1].textContent = '💀 헌터 킬';
          statLabels[2].textContent = '🎯 레벨 진행';
        }

        const skillSet = getOrcDedicatedSkillSet(liveOrc);
        const skillSummaryText = `패시브 ${skillSet.passives.length}개(${skillSet.passives.map(p => `${p.icon}${p.name}`).join(', ')}) · 액티브 ${skillSet.actives.length}개(${skillSet.actives.map(a => `${a.icon}${a.name}`).join(', ')})`;
        const gearBadgeText = (oStats.equipTier && oStats.equipTier >= 2) ? ` · 🛡️ ${oStats.equipTier}T 장비` : '';

        if (nameEl) nameEl.textContent = `${liveOrc.name} (Lv.${liveOrc.level} · ${skillSet.tierLabel}${gearBadgeText})`;
        if (zoneEl) {
          zoneEl.textContent = `👹 ${liveOrc.role} · ${modeTag} · HP ${Math.max(0, Math.ceil(liveOrc.hp)).toLocaleString()} / ${liveOrc.maxHp.toLocaleString()} | ${skillSummaryText}`;
        }
        if (atkEl) atkEl.textContent = `${oStats.atk.toLocaleString()} / ${oStats.def.toLocaleString()}`;
        if (expEl) {
          expEl.textContent = `헌터 ${(liveOrc.killCount || 0).toLocaleString()}킬`;
        }
        if (goldEl) {
          goldEl.textContent = liveOrc.level >= ORC_MAX_LEVEL
            ? `Lv.${ORC_MAX_LEVEL} 달성`
            : `Lv.${liveOrc.level} → Lv.${liveOrc.level + 1}`;
        }
        return;
      }
      if (gameState.selectedMonsterGroundId === BOSS_SANCTUM.id) {
        const cfg = getBossStageConfig(BOSS_SANCTUM.bossStage);
        ground = {
          id: BOSS_SANCTUM.id,
          name: `${BOSS_SANCTUM.name} (${cfg.reqLabel})`,
          icon: '🔥',
          baseExp: cfg.rewardExp,
          baseGold: cfg.rewardHunterGold,
          rewardVillageGold: cfg.rewardVillageGold,
          rewardMats: cfg.rewardMats,
          regenPerSec: cfg.regenPerSec,
          bossStatus: BOSS_SANCTUM.status,
          monsters: [BOSS_SANCTUM.boss]
        };
      } else if (gameState.selectedMonsterGroundId === REBIRTH_ALTAR.id) {
        ground = {
          id: REBIRTH_ALTAR.id,
          name: `${REBIRTH_ALTAR.name} (1환생↑ 전용)`,
          icon: '✨',
          baseExp: REBIRTH_ALTAR.boss.rewardExp,
          baseGold: REBIRTH_ALTAR.boss.rewardHunterGold,
          monsters: [REBIRTH_ALTAR.boss]
        };
      } else {
        ground = ALL_FIELD_GROUNDS.find(g => g.id === gameState.selectedMonsterGroundId);
      }

      if (!m || !ground || m.hp <= 0 || !ground.monsters.includes(m)) {
        closeMonsterPopup();
        return;
      }

      const nameEl = document.getElementById('monsterPopupName');
      const zoneEl = document.getElementById('monsterPopupZone');
      const atkEl = document.getElementById('monsterPopupAtk');
      const expEl = document.getElementById('monsterPopupExp');
      const goldEl = document.getElementById('monsterPopupGold');

      const isSanctumBoss = gameState.selectedMonsterGroundId === BOSS_SANCTUM.id;
      const goldText = isSanctumBoss
        ? `${formatGold(ground.baseGold || 0)} G (+마을 ${formatGold(ground.rewardVillageGold || 0)}G)`
        : (m.isRebirthSupremeBoss
            ? `${formatGold(m.rewardHunterGold)} G (+마을 ${formatGold(m.rewardVillageGold)}G)`
            : (m.isFieldMiniBoss
                ? `${formatGold((ground.goldDropRange ? ground.goldDropRange.max : ground.baseGold) * 4)} G`
                : (ground.goldDropRange
                    ? `${formatGold(ground.goldDropRange.min)}~${formatGold(ground.goldDropRange.max)} G`
                    : `${formatGold(ground.baseGold)} G`)));

      const statLabels = popup?.querySelectorAll('.monster-stat-label');
      if (statLabels && statLabels.length >= 3) {
        statLabels[0].textContent = '⚔️ 공격력';
        statLabels[1].textContent = '✨ 경험치';
        statLabels[2].textContent = '💰 골드';
      }

      if (nameEl) nameEl.textContent = m.name;
      if (zoneEl) {
        const statusText = BOSS_SANCTUM.status === 'ACTIVE'
          ? '전투 진행 중'
          : (BOSS_SANCTUM.status === 'PREPARING' ? `정비 중 (${Math.ceil(BOSS_SANCTUM.prepTimer)}s)` : '봉인 대기 중');
        const aggroLabel = isSanctumBoss
          ? ` · ${statusText} · 초당 재생 +${(ground.regenPerSec || 0).toLocaleString()} · 룬핵 ${ground.rewardMats || 0}개`
          : (m.isRebirthSupremeBoss
              ? ' · 1환생↑ 전용 · ✨초월 윤회의 인장(+150%)'
              : (m.isFieldMiniBoss
                  ? ' · 고대 수호자 1/5 위력'
                  : ((ground.id !== 'beginner_field' || m.provoked) ? ' · 선공/교전' : ' · 일반')));
        zoneEl.textContent = `${ground.icon} ${ground.name}${aggroLabel} · HP ${Math.max(0, Math.ceil(m.hp)).toLocaleString()} / ${m.maxHp.toLocaleString()}`;
      }
      if (atkEl) atkEl.textContent = `${(m.atk || 0).toLocaleString()}`;
      if (expEl) expEl.textContent = `${((ground.baseExp || 0) * (m.isFieldMiniBoss ? 5 : 1)).toLocaleString()} EXP`;
      if (goldEl) goldEl.textContent = goldText;
    }

    function openMonsterPopup(monster, ground) {
      closeBuildingPanel();
      closeHunterPanel();
      gameState.selectedMonsterRef = monster;
      gameState.selectedMonsterGroundId = ground.id;
      refreshMonsterPopup();
      const popup = document.getElementById('monsterInfoPopup');
      if (popup) popup.classList.add('active');
    }

    // 헌터 모습 안쪽 아래에 환생 별 표시 (게임 화면 헌터 머리 위 별과 같은 모양 · js/15-render-hunter.js)
    // 금색 별 = 환생, 빨간 별 = 초월 (앞에서부터). 환생 전이면 표시하지 않음.
    function renderRebirthOrbsHtml(count, transcendCount = 0) {
      const n = Math.max(0, Math.min(LEVEL_REBIRTH_CONFIG.maxRebirths, Math.floor(Number(count) || 0)));
      let html = '';
      for (let i = 0; i < n; i++) {
        const red = i < transcendCount;
        const gid = `pstar${i}`;
        html += `<svg class="portrait-star" viewBox="-5 -5 10 10" aria-hidden="true">`
          + `<defs><radialGradient id="${gid}" cx="40%" cy="40%" r="65%">`
          + (red
            ? '<stop offset="0" stop-color="#fca5a5"/><stop offset="0.55" stop-color="#dc2626"/><stop offset="1" stop-color="#7f1d1d"/>'
            : '<stop offset="0" stop-color="#fef9c3"/><stop offset="0.65" stop-color="#facc15"/><stop offset="1" stop-color="#eab308"/>')
          + `</radialGradient></defs>`
          + `<polygon points="0,-4.6 1.17,-1.62 4.37,-1.42 1.9,0.62 2.7,3.72 0,2 -2.7,3.72 -1.9,0.62 -4.37,-1.42 -1.17,-1.62" fill="url(#${gid})"/>`
          + `</svg>`;
      }
      return html;
    }

    function closeBuildingPanel() {
      gameState.selectedPlotId = null;
      const panel = document.getElementById('buildingPanel');
      if (panel) panel.classList.remove('active');
    }

    function closeHunterPanel() {
      gameState.selectedHunterId = null;
      gameState.selectedEquipSlot = null;
      gameState.followSelectedHunter = false;
      const panel = document.getElementById('hunterPanel');
      if (panel) panel.classList.remove('active');
      const fBtn = document.getElementById('btnFollowHunter');
      if (fBtn) {
        fBtn.classList.remove('active');
        fBtn.textContent = '🎥 추적 OFF';
      }
    }

    function refreshDungeonExplorerPanel() {
      const box = document.getElementById('dungeonExplorersBox');
      if (!box) return;
      const plot = village.plots.find(p => p.id === gameState.selectedPlotId);
      if (!plot || !plot.building || plot.building.type !== 'dungeon') {
        box.classList.remove('active');
        return;
      }
      box.classList.add('active');
      const explorers = hunters.filter(h => h.state === 'IN_DUNGEON');
      const countEl = document.getElementById('dungeonExplorerCount');
      const listEl = document.getElementById('dungeonExplorerList');
      if (countEl) countEl.textContent = `${explorers.length}명`;
      if (listEl) {
        listEl.innerHTML = explorers.length === 0
          ? '<div style="color:#94a3b8;padding:4px 0;">현재 탐험 중인 헌터가 없습니다.</div>'
          : explorers.map(h => `
              <div class="explorer-row">
                <span>⚔️ <b>${h.name}</b> (Lv.${h.level})</span>
                <span style="color:#c4b5fd;font-weight:700;">B${h.dungeonFloor}F · ${h.dungeonProgress}%</span>
              </div>
            `).join('');
      }
    }

    function openPlotPanel(plot) {
      if (plot && plot.building && plot.building.type === 'colosseum') {
        openColosseumModal();
        return;
      }
      closeHunterPanel();
      gameState.selectedPlotId = plot.id;
      const panel = document.getElementById('buildingPanel');
      const iconEl = document.getElementById('panelIcon');
      const nameEl = document.getElementById('panelName');
      const lvEl = document.getElementById('panelLevel');
      const descEl = document.getElementById('panelDesc');
      const helpBox = document.getElementById('panelHelpBox');
      const upSec = document.getElementById('upgradeSection');
      const buildSec = document.getElementById('buildSection');

      if (helpBox) helpBox.classList.toggle('open', gameState.panelHelpOpen);

      if (plot.building) {
        const b = plot.building;
        if (iconEl) iconEl.textContent = b.icon;
        if (nameEl) nameEl.textContent = b.name;
        if (lvEl) lvEl.textContent = `Lv.${b.level}`;
        if (descEl) descEl.textContent = b.desc;
        if (helpBox) {
          helpBox.innerHTML = `
            <div><span class="panel-help-label">📌 핵심 기능:</span> ${b.helpGuide?.role || b.desc}</div>
            <div><span class="panel-help-label">💰 누적 징수 세금:</span> 레벨 상승 시 이용료 및 번영도가 증가합니다.</div>
          `;
        }
        if (upSec) upSec.style.display = 'block';
        if (buildSec) buildSec.style.display = 'none';

        const unlockedMax = Math.max(b.level, b.unlockedMaxLevel || b.level);
        b.unlockedMaxLevel = unlockedMax;
        const buildingMaxLv = b.maxLevel || MAX_BUILDING_LEVEL;
        const isSingleLevelFixed = buildingMaxLv <= 1;
        const isMaxLv = b.level >= buildingMaxLv;
        const needsStageUnlock = !isMaxLv && b.level >= unlockedMax;
        const nextUnlockLv = unlockedMax + 1;
        const requiredBossStage = nextUnlockLv - 1;
        const isBossClearedForUnlock = BOSS_SANCTUM.bossStage >= nextUnlockLv || BOSS_SANCTUM.allStagesCleared;
        const unlockCost = village.getStageUnlockCost(b, nextUnlockLv);
        const upCost = b.baseUpgradeCost * b.level;
        const unlockAndUpgradeCost = unlockCost + upCost;

        const curStatEl = document.getElementById('panelStatCurrent');
        const nextStatEl = document.getElementById('panelStatNext');
        const unlockBtn = document.getElementById('btnUnlockBuildingStage');
        const upBtn = document.getElementById('btnUpgradeBuilding');
        const demBtn = document.getElementById('btnDemolishBuilding');

        if (curStatEl) curStatEl.textContent = `현재: ${b.getStatText(b.level)}`;
        if (nextStatEl) {
          nextStatEl.textContent = isSingleLevelFixed
            ? '업그레이드 불가 (Lv.1 고정)'
            : (isMaxLv
                ? `최고 레벨(Lv.${buildingMaxLv}) 달성`
                : (needsStageUnlock
                    ? (isBossClearedForUnlock ? `🔓 Lv.${nextUnlockLv} 해금 가능` : `🔒 ${requiredBossStage}보스 처치 필요`)
                    : `🔓 다음: ${b.getStatText(b.level + 1)}`));
        }

        if (unlockBtn && upBtn) {
          if (isMaxLv) {
            unlockBtn.style.display = 'none';
            upBtn.style.display = 'block';
            upBtn.textContent = isSingleLevelFixed ? '업그레이드 불가 (Lv.1 고정)' : `최고 레벨 (Lv.${buildingMaxLv} MAX)`;
            upBtn.disabled = true;
            upBtn.style.opacity = '0.5';
          } else if (needsStageUnlock) {
            unlockBtn.style.display = 'block';
            upBtn.style.display = 'none';
            unlockBtn.disabled = !isBossClearedForUnlock;
            const canUnlock = isBossClearedForUnlock && gameState.gold >= unlockAndUpgradeCost;
            unlockBtn.style.opacity = canUnlock ? '1' : '0.5';
            unlockBtn.textContent = isBossClearedForUnlock
              ? `🔓 Lv.${nextUnlockLv} 잠금 해제 & 업그레이드 (${unlockAndUpgradeCost.toLocaleString()} G)`
              : `🔒 ${requiredBossStage}보스 처치 후 해금 가능`;
          } else {
            unlockBtn.style.display = 'none';
            upBtn.style.display = 'block';
            upBtn.disabled = false;
            const canUp = gameState.gold >= upCost;
            upBtn.style.opacity = canUp ? '1' : '0.55';
            upBtn.textContent = `업그레이드 (${upCost.toLocaleString()} G)`;
          }
        }
        if (demBtn) {
          demBtn.disabled = b.type === 'townhall';
        }
        refreshDungeonExplorerPanel();
      } else {
        if (iconEl) iconEl.textContent = '🔨';
        if (nameEl) nameEl.textContent = '신규 시설 건설';
        if (lvEl) lvEl.textContent = '빈 부지';
        if (descEl) descEl.textContent = '이 부지에 건설할 마을 시설을 선택하세요.';
        if (helpBox) {
          helpBox.innerHTML = `<div><span class="panel-help-label">🏗️ 건설 안내:</span> 시설을 지으면 헌터들이 자동으로 방문해 능력치를 강화하고 마을 세금을 납부합니다.</div>`;
        }
        if (upSec) upSec.style.display = 'none';
        if (buildSec) buildSec.style.display = 'block';
        document.getElementById('dungeonExplorersBox')?.classList.remove('active');

        const catalogEl = document.getElementById('buildCatalogList');
        if (catalogEl) {
          const existingTypes = new Set(village.getAllBuildings().map(b => b.type));
          const isTier5BossCleared = BOSS_SANCTUM.allStagesCleared || (BOSS_SANCTUM.bossStage || 1) >= 6;
          const buildableTypes = Object.values(BUILDING_CATALOG).filter(
            c => c.type !== 'townhall' && !existingTypes.has(c.type)
          );
          if (buildableTypes.length === 0) {
            catalogEl.innerHTML = `<div style="padding:14px;text-align:center;color:#94a3b8;font-size:12.5px;">모든 마을 시설이 이미 건설되었습니다.</div>`;
          } else {
            catalogEl.innerHTML = buildableTypes.map(item => {
              const isColosseumLocked = item.type === 'colosseum' && !isTier5BossCleared;
              const canAfford = !isColosseumLocked && gameState.gold >= item.buildCost;
              const costBadgeText = isColosseumLocked
                ? '🔒 5티어 보스 처치 필요'
                : `${item.buildCost.toLocaleString()} G`;
              const subText = isColosseumLocked
                ? `🔒 5티어 보스 [${getBossStageConfig(5).theme.title}] 처치 후 건설 해금`
                : `${item.getStatText(1)} · ${item.helpGuide?.role || ''}`;
              return `
                <div class="catalog-item ${canAfford ? '' : 'disabled'}" data-build-type="${item.type}">
                  <div class="catalog-info">
                    <div class="catalog-title">${item.icon} ${item.name}</div>
                    <div class="catalog-sub">${subText}</div>
                  </div>
                  <div class="catalog-cost">${costBadgeText}</div>
                </div>
              `;
            }).join('');

            catalogEl.querySelectorAll('.catalog-item:not(.disabled)').forEach(el => {
              el.addEventListener('click', () => {
                const bType = el.getAttribute('data-build-type');
                const tpl = BUILDING_CATALOG[bType];
                if (!tpl || gameState.gold < tpl.buildCost) return;
                if (bType === 'colosseum' && !(BOSS_SANCTUM.allStagesCleared || (BOSS_SANCTUM.bossStage || 1) >= 6)) {
                  showToast('🔒 5티어 보스를 처치한 후에 [결투장]을 건설할 수 있습니다!');
                  return;
                }
                if (village.getAllBuildings().some(b => b.type === bType)) {
                  showToast('⚠️ 이미 마을에 건설된 시설입니다.');
                  openPlotPanel(plot);
                  return;
                }
                gameState.gold -= tpl.buildCost;
                plot.building = village.createBuildingInstance(bType, plot.x, plot.y, 1);
                updateResourceHUD();
                openPlotPanel(plot);
                showToast(`🏗️ ${tpl.icon} ${tpl.name} 건설 완료!`);
              });
            });
          }
        }
      }

      if (panel) panel.classList.add('active');
    }

    function openHunterPanel(hunter) {
      closeBuildingPanel();
      if (gameState.selectedHunterId !== hunter.id) {
        gameState.selectedEquipSlot = null;
      }
      gameState.selectedHunterId = hunter.id;
      refreshHunterPanel();
      const panel = document.getElementById('hunterPanel');
      if (panel) panel.classList.add('active');
    }

    const EQUIP_SLOT_META = {
      weapon:    { label: '무기',   icon: '⚔️' },
      armor:     { label: '방어구', icon: '🛡️' },
      helmet:    { label: '투구',   icon: '🪖' },
      accessory: { label: '장신구', icon: '💍' },
      insignia:  { label: '인장',   icon: '🏅' },
      wing:      { label: '날개',   icon: '🪽' }
    };

    function getEquipmentDetailInfo(hunter, slot, smithyLv) {
      if (slot === 'wing') {
        const meta = EQUIP_SLOT_META.wing;
        const equippedWing = hunter.getEquippedWing();
        const wEnh = Math.max(0, hunter.wingEnhance || 0);
        const atkPct = equippedWing ? Math.round(((equippedWing.atkBonusPct || 0) + wEnh * (equippedWing.enhanceAtkBonusPct || 0)) * 100) : 0;
        const defPct = equippedWing ? Math.round(((equippedWing.defBonusPct || 0) + wEnh * (equippedWing.enhanceDefBonusPct || 0)) * 100) : 0;
        const critVal = equippedWing ? ((equippedWing.critBonus || 0) + wEnh * (equippedWing.enhanceCritBonus || 0)) : 0;
        const spdVal = equippedWing ? ((equippedWing.speedBonus || 0) + wEnh * (equippedWing.enhanceSpeedBonus || 0)) : 0;

        const allWingsGuide = SKY_WING_ITEM_IDS.map((wId) => {
          const def = ITEM_CATALOG[wId];
          const ownedQty = hunter.inventory ? hunter.inventory.getCount(wId) : 0;
          const isEquipped = hunter.equippedWingId === wId;
          const actionHtml = isEquipped
            ? `<span style="color:#4ade80;font-weight:800;">착용 중 (+${wEnh}강)</span>`
            : (ownedQty > 0
                ? `<button type="button" class="equip-detail-close" data-equip-wing-id="${wId}" style="background:rgba(2,132,199,0.35);border-color:#38bdf8;color:#e0f2fe;">착용하기</button>`
                : `<span style="color:#64748b;">미보유</span>`);
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;padding:4px 6px;background:rgba(30,41,59,0.72);border-radius:6px;margin-top:3px;">
              <span>${def.icon} <b>${def.name}</b> <span style="color:#94a3b8;">(천공의 섬 0.1% 드랍)</span></span>
              ${actionHtml}
            </div>
          `;
        }).join('');

        const nextCost = hunter.getWingEnhanceCost();
        const enhanceNote = !equippedWing
          ? '📍 획득 방법: [천공의 섬] 몬스터 처치 시 0.01% 확률로 드랍'
          : (wEnh >= 15
              ? '🌟 최대 날개 강화(+15강 MAX) 달성'
              : `🪽 다음 날개 강화(+${wEnh + 1}강) 비용: ${formatGold(nextCost)} G (천공 대장간)`);

        return {
          meta,
          name: equippedWing ? `${equippedWing.name} (+${wEnh}강 / 최대 +15강)` : '미착용 (날개 슬롯)',
          item: { tier: equippedWing ? 10 : 0, enhance: wEnh },
          statSummary: equippedWing
            ? `⚔️ 공격력 +${atkPct}% · 🛡️ 방어력 +${defPct}% · ⚡ 치명타 +${critVal}% · 💨 이동속도 +${spdVal}`
            : '🪽 현재 착용 중인 날개가 없습니다. [천공의 섬] 몬스터를 사냥해 날개를 획득하세요.',
          auraNote: equippedWing ? '✨ 천공의 성역 백색 날개 외형 및 성광 비행 오라 활성' : '',
          nextEnhanceText: enhanceNote,
          promoteText: `<div style="margin-top:2px;"><div style="font-weight:800;color:#bae6fd;margin-bottom:2px;">🪽 천공 날개 도감 & 장착</div>${allWingsGuide}</div>`,
          isInsignia: true
        };
      }

      if (slot === 'insignia') {
        const meta = EQUIP_SLOT_META.insignia;
        const equippedIns = hunter.getEquippedInsignia();
        const dmgPct = equippedIns ? Math.round((equippedIns.monsterDmgBonusPct || 0) * 100) : 0;
        const allInsigniaGuide = REGIONAL_INSIGNIA_IDS.map((insId) => {
          const def = ITEM_CATALOG[insId];
          const ownedQty = hunter.inventory ? hunter.inventory.getCount(insId) : 0;
          const isEquipped = hunter.equippedInsigniaId === insId;
          const pct = Math.round((def.monsterDmgBonusPct || 0) * 100);
          const actionHtml = isEquipped
            ? `<span style="color:#4ade80;font-weight:800;">착용 중</span>`
            : (ownedQty > 0
                ? `<button type="button" class="equip-detail-close" data-equip-insignia-id="${insId}" style="background:rgba(2,132,199,0.35);border-color:#38bdf8;color:#e0f2fe;">착용하기</button>`
                : `<span style="color:#64748b;">미보유</span>`);
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;padding:4px 6px;background:rgba(30,41,59,0.72);border-radius:6px;margin-top:3px;">
              <span>${def.icon} <b>${def.name}</b> <span style="color:#94a3b8;">(${def.regionName} 중간보스)</span> · <span style="color:#86efac;">피해 +${pct}%</span>${ownedQty > 0 ? ` <span style="color:#fde047;">(${ownedQty}개)</span>` : ''}</span>
              ${actionHtml}
            </div>
          `;
        }).join('');

        return {
          meta,
          name: equippedIns ? equippedIns.name : '미착용 (보스 인장 슬롯)',
          item: { tier: equippedIns ? (REGIONAL_INSIGNIA_IDS.indexOf(equippedIns.id) + 1) : 0, enhance: 0 },
          statSummary: equippedIns
            ? `${equippedIns.icon} ${equippedIns.regionName} 수호 증표 · 몬스터 대상 입히는 피해 +${dmgPct}% 증가`
            : '⚔️ 현재 착용 중인 인장이 없습니다. 각 사냥터 또는 환생 제단 중간 보스를 처치해 인장을 획득하세요.',
          auraNote: equippedIns ? `✨ 발밑 수호왕 룬 오라 활성 (${equippedIns.regionName} 특화)` : '',
          nextEnhanceText: '📍 획득 방법: 초보(🌱+25%) · 중급(⛰️+50%) · 상급(🌋+75%) · 최상급(🌌+100%) 중간보스 또는 1환생↑ 전용 [초월 환생의 제단(✨+150%)] 처치 시 드랍',
          promoteText: `<div style="margin-top:2px;"><div style="font-weight:800;color:#fde68a;margin-bottom:2px;">🏅 지역별 중간 보스 인장 도감 & 교체 장착</div>${allInsigniaGuide}</div>`,
          isInsignia: true
        };
      }

      const item = hunter.equipment[slot];
      const meta = EQUIP_SLOT_META[slot] || { label: '장비', icon: '🎒' };
      const name = hunter.getEquipDisplayName(slot);
      const tScale = getEquipTierMultiplier(item.tier);
      const statLines = [];
      let auraNote = '';

      if (slot === 'weapon') {
        const atk = Math.round(tScale * 28 + item.enhance * (18 + Math.max(0, item.tier - 5) * 6));
        const crit = Math.floor(item.enhance * 0.4);
        statLines.push(`⚔️ 공격력 +${atk.toLocaleString()}`);
        if (crit > 0) statLines.push(`⚡ 치명타 +${crit}%`);
        if (item.enhance >= 15) auraNote = '✨ +15강 황금 화염 오라 & 발밑 마법진 활성';
        else if (item.enhance >= 10) auraNote = '✨ +10강 청색 마력 스파크 오라 활성';
        else if (item.tier >= 6) auraNote = `💠 T${item.tier} 초월 등급 무기 외형 활성`;
      } else if (slot === 'armor') {
        const def = Math.round(tScale * 22 + item.enhance * (12 + Math.max(0, item.tier - 5) * 4));
        statLines.push(`🛡️ 방어력 +${def.toLocaleString()}`);
        if (item.tier >= 6) auraNote = `👑 T${item.tier} 초월 성좌 망토 & 신성 갑주 활성`;
        else if (item.tier >= 3 || item.enhance >= 10) auraNote = '🧥 상급 망토 & 견갑 외형 적용';
        else if (item.tier >= 2) auraNote = '🛡️ 어깨 보호 견갑 장착';
      } else if (slot === 'helmet') {
        const def = Math.round(tScale * 14 + item.enhance * (8 + Math.max(0, item.tier - 5) * 3));
        statLines.push(`🛡️ 방어력 +${def.toLocaleString()}`);
        if (item.tier >= 6) auraNote = `✨ T${item.tier} 초월 성관 투구 적용`;
        else if (item.tier >= 4) auraNote = '👑 비룡·왕관 뿔 장식 투구 적용';
      } else if (slot === 'accessory') {
        const atk = Math.round(tScale * 10);
        const crit = Math.min(25, item.tier * 2) + Math.floor(item.enhance * 0.6);
        statLines.push(`⚔️ 공격력 +${atk.toLocaleString()}`, `⚡ 치명타 +${crit}%`);
      }

      const nextEnhanceText = item.enhance < 15
        ? `🔮 다음 강화(+${item.enhance + 1}강) 비용: ${formatGold(120 + item.enhance * 55 + (item.tier - 1) * 90)} G (마법 강화소)`
        : '🌟 최대 강화(+15강 MAX) 달성';

      let promoteText = `👑 최고 등급(T${MAX_EQUIP_TIER} 창세 절대) 장비`;
      if (item.tier < MAX_EQUIP_TIER) {
        const rule = TIER_UPGRADE_RULES[item.tier + 1];
        promoteText = `⚒️ T${item.tier + 1} 승급 조건: 대장간 Lv.${rule.reqSmithyLv} · +${rule.reqEnhance}강 · ${formatGold(rule.goldCost)}G · 재료 ${rule.matCost}개`;
      }

      return {
        meta,
        name,
        item,
        statSummary: statLines.join(' · '),
        auraNote,
        nextEnhanceText,
        promoteText
      };
    }

    let equipEventsBound = false;
    function bindHunterEquipEvents() {
      if (equipEventsBound) return;
      const box = document.getElementById('hunterEquipList');
      if (!box) return;
      equipEventsBound = true;

      let touchStartX = 0;
      let touchStartY = 0;
      let lastTouchHandledAt = 0;

      const handleEquipSelect = (targetEl) => {
        const wingEquipBtn = targetEl.closest('[data-equip-wing-id]');
        if (wingEquipBtn) {
          const wId = wingEquipBtn.getAttribute('data-equip-wing-id');
          const h = hunters.find(item => item.id === gameState.selectedHunterId);
          if (h && wId && h.equipWing(wId)) {
            const def = ITEM_CATALOG[wId];
            showToast(`🪽 ${h.name} [${def?.name || '날개'}] 장착 완료!`);
            refreshHunterPanel();
          }
          return;
        }
        const insEquipBtn = targetEl.closest('[data-equip-insignia-id]');
        if (insEquipBtn) {
          const insId = insEquipBtn.getAttribute('data-equip-insignia-id');
          const h = hunters.find(item => item.id === gameState.selectedHunterId);
          if (h && insId && h.equipInsignia(insId)) {
            const def = ITEM_CATALOG[insId];
            showToast(`🏅 ${h.name} [${def?.name || '보스 인장'}] 장착 완료!`);
            refreshHunterPanel();
          }
          return;
        }
        if (targetEl.closest('.equip-detail-close')) {
          gameState.selectedEquipSlot = null;
          refreshHunterPanel();
          return;
        }
        const row = targetEl.closest('.equip-slot-row[data-equip-slot]');
        if (!row) return;
        const slot = row.getAttribute('data-equip-slot');
        gameState.selectedEquipSlot = (gameState.selectedEquipSlot === slot) ? null : slot;
        refreshHunterPanel();
      };

      box.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      box.addEventListener('touchend', (e) => {
        if (e.changedTouches.length !== 1) return;
        const dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
        const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
        if (dx < 12 && dy < 12) {
          lastTouchHandledAt = performance.now();
          e.preventDefault();
          handleEquipSelect(e.target);
        }
      }, { passive: false });

      box.addEventListener('click', (e) => {
        if (performance.now() - lastTouchHandledAt < 450) return;
        handleEquipSelect(e.target);
      });
    }

    function refreshHunterPanel() {
      if (!gameState.selectedHunterId) return;
      const h = hunters.find(item => item.id === gameState.selectedHunterId);
      if (!h) {
        closeHunterPanel();
        return;
      }

      const jobIcons = { '버서커': '🪓', '레인저': '🏹', '팔라딘': '🛡️', '소서러': '🔮' };
      const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      const setWidth = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`; };

      const latestNode = h.advancementPath?.length > 0
        ? JOB_ADVANCEMENT_NODES_BY_ID[h.advancementPath[h.advancementPath.length - 1]]
        : null;
      const displayIcon = latestNode ? latestNode.icon : (jobIcons[h.baseJob] || '⚔️');
      const genderMark = h.gender === 'F' ? '♀ 여성' : '♂ 남성';
      const displayJobLabel = h.currentJobName !== h.baseJob
        ? `${genderMark} · ${h.currentJobName} (${h.baseJob}) · Lv.${h.level}`
        : `${genderMark} · ${h.baseJob} · Lv.${h.level}`;

      setText('hunterAvatarIcon', displayIcon);
      setText('hunterNameDisplay', h.name);
      setText('hunterJobDisplay', displayJobLabel);

      const orbEl = document.getElementById('hunterRebirthDisplay');
      if (orbEl) {
        orbEl.innerHTML = renderRebirthOrbsHtml(h.rebirthCount, h.transcendCount || 0);
        orbEl.hidden = !((h.rebirthCount || 0) > 0);
      }

      const rebirthBtn = document.getElementById('btnTriggerRebirth');
      if (rebirthBtn) {
        rebirthBtn.style.display = (h.level >= LEVEL_REBIRTH_CONFIG.maxLevel && h.rebirthCount < LEVEL_REBIRTH_CONFIG.maxRebirths) ? 'inline-block' : 'none';
      }

      const altarBtn = document.getElementById('btnCommandRebirthAltar');
      if (altarBtn) {
        altarBtn.style.display = 'none';
      }

      const reqExp = h.getRequiredExp();
      setWidth('hunterExpBar', (h.exp / reqExp) * 100);
      setText('hunterExpText', `${h.exp} / ${reqExp}`);

      setWidth('hunterHpBar', (h.hp / h.maxHp) * 100);
      setText('hunterHpText', `${Math.round(h.hp)} / ${h.maxHp}`);

      setWidth('hunterMpBar', (h.mp / h.maxMp) * 100);
      setText('hunterMpText', `${Math.round(h.mp)} / ${h.maxMp}`);

      setWidth('hunterHungerBar', h.hunger);
      setText('hunterHungerText', `${Math.round(h.hunger)}%`);

      setWidth('hunterFatigueBar', h.fatigue);
      setText('hunterFatigueText', `${Math.round(h.fatigue)}%`);

      const stats = h.getComputedStats();
      setText('hunterAtkVal', stats.atk.toLocaleString());
      setText('hunterDefVal', stats.def.toLocaleString());
      setText('hunterCritVal', `${stats.crit}%`);
      setText('hunterBestFloorVal', h.bestDungeonFloor > 0 ? `B${h.bestDungeonFloor}F` : '미기록');
      setText('hunterGoldVal', `${formatGold(h.personalGold)} G`);
      const maxBento = getMaxBentoCapacity(h.level, h.rebirthCount);
      const bentoValText = maxBento > 0
        ? `🍱${Math.min(maxBento, Math.max(0, h.bento || 0))}/${maxBento}`
        : '🍱Lv.20↑/1환생↑';
      const maxHpPot = getMaxHpPotionCapacity(h.level, h.rebirthCount);
      const maxMpPot = getMaxMpPotionCapacity(h.level, h.rebirthCount);
      const curHpPot = Math.min(maxHpPot, Math.max(0, h.potions?.hp ?? 0));
      const curMpPot = Math.min(maxMpPot, Math.max(0, h.potions?.mp ?? 0));
      setText('hunterPotionVal', `❤️${curHpPot}/${maxHpPot} · 💧${curMpPot}/${maxMpPot} · ${bentoValText}`);
      const totalInvItems = h.inventory ? h.inventory.getTotalItemCount() : h.materials;
      setText('hunterMatVal', `보관 ${totalInvItems}개`);

      const colStanding = (typeof COLOSSEUM_STATE !== 'undefined' && COLOSSEUM_STATE.standings)
        ? COLOSSEUM_STATE.standings.get(h.id)
        : null;
      const colPts = colStanding ? (colStanding.points || 0) : 0;
      const colPrize = colStanding ? (colStanding.prizeGold || 0) : 0;
      const colWins = colStanding ? (colStanding.wins || 0) : 0;
      const colRunnerUps = colStanding ? (colStanding.runnerUps || 0) : 0;
      const colParts = colStanding ? (colStanding.participations || 0) : 0;
      setText('hunterColosseumPtsVal', `${colPts.toLocaleString()}점`);
      setText('hunterColosseumRecordVal', `우승 ${colWins} · 준우승 ${colRunnerUps} · 출전 ${colParts}`);
      setText('hunterColosseumPrizeVal', `${formatGold(colPrize)} G`);

      setText('hunterStatusText', `상태: ${h.getStatusDescription()}`);

      // 인벤토리 탭 렌더링 (전리품 · 전투 소모품 · 기타/보스 재료 확장 보관함)
      const invBox = document.getElementById('hunterInventoryBox');
      if (invBox) {
        const gsBld = village.getAllBuildings().find(b => b.type === 'generalstore');
        const gsLv = gsBld ? gsBld.level : 1;
        const baseSellUnit = 45 + gsLv * 15;

        const lootIds = ['loot_beginner_crystal', 'loot_mid_ore', 'loot_high_heart', 'loot_rebirth_essence', 'loot_top_astral'];
        let totalExpectedLootGold = 0;
        const lootCardsHtml = lootIds.map(id => {
          const def = ITEM_CATALOG[id];
          const qty = h.inventory ? h.inventory.getCount(id) : 0;
          const unitVal = Math.round(baseSellUnit * (def.valueMultiplier || 1.0));
          const sumVal = qty * unitVal;
          totalExpectedLootGold += sumVal;
          return `
            <div class="inv-slot-card ${qty > 0 ? 'has-item' : ''}" title="${def.desc}">
              <div class="inv-slot-icon">${def.icon}</div>
              <div class="inv-slot-name">${def.name}</div>
              <div class="inv-slot-qty">${qty}개</div>
              <div class="inv-slot-sub">${qty > 0 ? `예상 ${formatGold(sumVal)}G` : `단가 ${formatGold(unitVal)}G`}</div>
            </div>
          `;
        }).join('');

        const hpPot = Math.min(maxHpPot, Math.max(0, h.potions?.hp ?? 0));
        const mpPot = Math.min(maxMpPot, Math.max(0, h.potions?.mp ?? 0));
        const curBento = maxBento > 0 ? Math.min(maxBento, Math.max(0, h.bento || 0)) : 0;
        const consumableCardsHtml = `
          <div class="inv-slot-card ${hpPot > 0 ? 'has-item' : ''}">
            <div class="inv-slot-icon">❤️</div>
            <div class="inv-slot-name">체력 물약</div>
            <div class="inv-slot-qty">${hpPot} / ${maxHpPot}</div>
            <div class="inv-slot-sub">HP 45% 자동회복</div>
          </div>
          <div class="inv-slot-card ${mpPot > 0 ? 'has-item' : ''}">
            <div class="inv-slot-icon">💧</div>
            <div class="inv-slot-name">마나 물약</div>
            <div class="inv-slot-qty">${mpPot} / ${maxMpPot}</div>
            <div class="inv-slot-sub">MP 50% 자동회복</div>
          </div>
          <div class="inv-slot-card ${curBento > 0 ? 'has-item' : ''}">
            <div class="inv-slot-icon">🍱</div>
            <div class="inv-slot-name">모험가 도시락</div>
            <div class="inv-slot-qty">${maxBento > 0 ? `${curBento} / ${maxBento}` : 'Lv.20↑/1환생↑'}</div>
            <div class="inv-slot-sub">포만감·피로 회복</div>
          </div>
        `;

        const extraEntries = h.inventory
          ? h.inventory.getEntriesByCategory().filter(e => !lootIds.includes(e.id) && e.id !== 'equip_fragment')
          : [];
        extraEntries.forEach(({ qty, def }) => {
          if (def.sellable) {
            totalExpectedLootGold += Math.round(qty * baseSellUnit * (def.valueMultiplier || 1.0));
          }
        });

        const fragDef = ITEM_CATALOG.equip_fragment;
        const fragQty = Math.min(EQUIP_FRAGMENT_MAX_STACK, h.inventory ? h.inventory.getCount('equip_fragment') : 0);
        const equipFragmentSectionHtml = `
          <div class="inventory-section" style="border-color:rgba(56,189,248,0.34);">
            <div class="inventory-section-head">
              <span>🧩 장비 강화·승급 전용 재화</span>
              <span style="font-size:10.5px;color:#fca5a5;font-weight:800;">최대 ${EQUIP_FRAGMENT_MAX_STACK.toLocaleString()}개 · 판매 불가</span>
            </div>
            <div class="inventory-grid" style="grid-template-columns:1fr;">
              <div class="inv-slot-card ${fragQty > 0 ? 'has-item' : ''}" style="flex-direction:row;justify-content:space-between;padding:9px 12px;text-align:left;" title="${fragDef.desc}">
                <div style="display:flex;align-items:center;gap:9px;">
                  <span class="inv-slot-icon" style="font-size:22px;">${fragDef.icon}</span>
                  <div>
                    <div class="inv-slot-name" style="font-size:12px;">${fragDef.name} <span style="font-size:10px;color:#fca5a5;">[판매 불가]</span></div>
                    <div class="inv-slot-sub">몬스터 처치 시 획득 · 최대 ${EQUIP_FRAGMENT_MAX_STACK.toLocaleString()}개 보관 가능</div>
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                  <div class="inv-slot-qty" style="font-size:13px;color:#38bdf8;">${fragQty.toLocaleString()} / ${EQUIP_FRAGMENT_MAX_STACK.toLocaleString()}개</div>
                  <div class="inv-slot-sub" style="color:#86efac;">강화/승급 사용</div>
                </div>
              </div>
            </div>
          </div>
        `;

        const miscGridHtml = extraEntries.length > 0
          ? `<div class="inventory-grid">${extraEntries.map(({ qty, def }) => {
              const unitVal = def.sellable ? Math.round(baseSellUnit * (def.valueMultiplier || 1.0)) : 0;
              return `
                <div class="inv-slot-card has-item" title="${def.desc}">
                  <div class="inv-slot-icon">${def.icon}</div>
                  <div class="inv-slot-name">${def.name}</div>
                  <div class="inv-slot-qty">${qty}개</div>
                  <div class="inv-slot-sub">${def.sellable ? `매입 ${formatGold(unitVal)}G` : '특수 보관품'}</div>
                </div>
              `;
            }).join('')}</div>`
          : `<div style="font-size:11px;color:#94a3b8;text-align:center;padding:8px 4px;background:rgba(15,23,42,0.55);border-radius:8px;">던전 마정석·보스 룬핵·기타 획득 아이템이 이곳에 자동 보관됩니다.</div>`;

        const invSig = `${h.id}|${gsLv}|${hpPot}|${mpPot}|${curBento}|${fragQty}|${JSON.stringify(h.inventory?.toJSON() || [])}`;
        if (invBox.dataset.renderedSig !== invSig) {
          invBox.dataset.renderedSig = invSig;
          invBox.innerHTML = `
            ${equipFragmentSectionHtml}
            <div class="inventory-section">
              <div class="inventory-section-head">
                <span>📦 사냥터 전리품 보관함</span>
                <span style="font-size:10.5px;color:#94a3b8;">잡화상점 Lv.${gsLv} 기준</span>
              </div>
              <div class="inventory-grid">${lootCardsHtml}</div>
              <div class="inventory-summary-bar">
                <span>💰 예상 정산 총액 (전리품·매입품)</span>
                <span style="color:#4ade80;font-weight:800;">+${formatGold(totalExpectedLootGold)} G</span>
              </div>
            </div>

            <div class="inventory-section">
              <div class="inventory-section-head">
                <span>🧪 전투 소모품 슬롯</span>
                <span style="font-size:10.5px;color:#94a3b8;">전투 중 자동 사용</span>
              </div>
              <div class="inventory-grid">${consumableCardsHtml}</div>
            </div>

            <div class="inventory-section">
              <div class="inventory-section-head">
                <span>🔮 특수 재료 & 기타 아이템</span>
                <span style="font-size:10.5px;color:#c4b5fd;">슬롯 ${h.inventory ? h.inventory.items.size : 0} / ${h.inventory ? h.inventory.maxSlots : 24}</span>
              </div>
              ${miscGridHtml}
            </div>
          `;
        }
      }

      document.querySelectorAll('#hunterDonateRow .btn-donate-gold').forEach((btn) => {
        const amt = Number(btn.getAttribute('data-donate-amount')) || 0;
        btn.disabled = amt <= 0 || gameState.gold < amt;
      });
      syncDonationKeypadButtons();

      const pBox = document.getElementById('hunterPersonalityBox');
      if (pBox && h.personality) {
        const effP = getEffectivePersonalityProfile(h.personality, h.rebirthCount);
        const isTrait = h.personality.kind === 'trait' || effP.isRebirth5InvertedPenalty;
        const alignInfo = getAlignmentInfo(h.alignment);
        const alignSign = alignInfo.value > 0 ? `+${alignInfo.value}` : `${alignInfo.value}`;
        const alignHtml = `
          <div style="margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center;font-size:11.5px;">
            <span style="color:#e2e8f0;font-weight:700;">⚖️ 인성: <b style="color:${alignInfo.color};">${alignSign}</b> <span style="color:#94a3b8;font-size:10px;">(선인 +100 ~ 카오스 -100)</span></span>
            <span class="${alignInfo.badgeClass}">${alignInfo.label}</span>
          </div>
        `;
        const equippedIns = h.getEquippedInsignia();
        const insPct = equippedIns ? Math.round((equippedIns.monsterDmgBonusPct || 0) * 100) : 0;
        const insHtml = equippedIns
          ? `<div style="margin-top:5px;padding-top:5px;border-top:1px solid rgba(250,204,21,0.22);display:flex;justify-content:space-between;align-items:center;color:${equippedIns.auraColor || '#fde047'};font-weight:800;font-size:11.5px;">
               <span>${equippedIns.icon} ${equippedIns.name} (${equippedIns.regionName})</span>
               <span style="color:#86efac;">몬스터 피해 +${insPct}%</span>
             </div>`
          : `<div style="margin-top:5px;padding-top:5px;border-top:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center;color:#94a3b8;font-size:11px;">
               <span>🏅 보스 인장 슬롯</span>
               <span>미착용 (중간보스 처치 시 획득)</span>
             </div>`;
        const badgeLabel = effP.isRebirth5InvertedPenalty
          ? '✦ 5환생 반전(x2)'
          : (h.personality.kind === 'trait' ? '▲ 고유 특성' : '▼ 성격 패널티');
        pBox.innerHTML = `
          <div class="personality-header">
            <span>${h.personality.icon} 성격: ${h.personality.name}</span>
            <span class="${isTrait ? 'personality-tag-trait' : 'personality-tag-penalty'}">${badgeLabel}</span>
          </div>
          <div style="color:${isTrait ? '#86efac' : '#fca5a5'};font-weight:700;">${effP.effectText}</div>
          ${alignHtml}
          ${insHtml}
        `;
      }

      const advBox = document.getElementById('hunterAdvancementBox');
      if (advBox) {
        const baseIcon = jobIcons[h.baseJob] || '⚔️';
        const chainPills = [
          `<span class="adv-node-pill base">${baseIcon} ${h.baseJob}</span>`,
          ...(h.advancementPath || []).map((nid, idx) => {
            const n = JOB_ADVANCEMENT_NODES_BY_ID[nid];
            return n ? `<span style="color:#94a3b8;">→</span><span class="adv-node-pill">${n.icon} ${idx + 1}차 ${n.name}</span>` : '';
          })
        ].join('');

        const nextChoices = getNextAdvancementChoices(h);
        const nextTierNum = (h.rebirthCount || 0) + 1;
        let nextHtml = '';
        if (nextChoices.length > 0) {
          nextHtml = `
            <div style="font-size:10.5px;color:#cbd5e1;margin-top:2px;">
              🔮 <b>${nextTierNum}차 전직 후보 (Lv.99 환생소에서 헌터가 자율 선택)</b>
            </div>
            <div class="adv-choices-grid">
              ${nextChoices.map(opt => `
                <div class="adv-choice-card">
                  <div style="font-weight:800;color:#f3e8ff;">${opt.icon} ${opt.name}</div>
                  <div style="font-size:10px;color:#fca5a5;">🔥 ${opt.activeSkill.name}</div>
                  <div style="font-size:10px;color:#7dd3fc;">💠 ${opt.passiveSkill.name}</div>
                </div>
              `).join('')}
            </div>
          `;
        } else {
          nextHtml = `<div style="font-size:10.5px;color:#fde047;font-weight:700;">👑 최종 5차 전직 및 5환생 계보 완성!</div>`;
        }

        advBox.innerHTML = `
          <div class="personality-header" style="color:#d8b4fe;">
            <span>🌳 트리형 전직 계보</span>
            <span style="font-size:10.5px;color:#e9d5ff;">${h.advancementTier > 0 ? `${h.advancementTier}차 전직 완료` : '기본 직업 (미전직)'}</span>
          </div>
          <div class="adv-path-chain">${chainPills}</div>
          ${nextHtml}
        `;
      }

      const skillsBox = document.getElementById('hunterSkillsBox');
      if (skillsBox) {
        const renderSkillCard = (sk, isActive) => {
          const mult = h.getSkillLevelMultiplier(sk);
          const reqUses = sk.reqUses || SKILL_SYSTEM_CONFIG.getRequiredUses(sk.lv || 1);
          const pct = sk.lv >= SKILL_SYSTEM_CONFIG.maxSkillLevel ? 100 : Math.min(100, Math.round(((sk.uses || 0) / reqUses) * 100));

          let descText = sk.desc || '';
          if (isActive) {
            const scaledPower = Math.round((sk.basePower || 100) * mult);
            descText = descText.replace('{power}', scaledPower);
          } else {
            const rawVal = sk.atkMult ? Math.round(sk.atkMult * 100 * mult)
              : (sk.defMult ? Math.round(sk.defMult * 100 * mult)
              : (sk.critBonus ? Math.round(sk.critBonus * mult)
              : (sk.mpMult ? Math.round(sk.mpMult * 100 * mult) : Math.round(25 * mult))));
            descText = descText.replace('{val}', rawVal);
          }

          const actualMpCost = isActive ? h.getSkillMpCost(sk) : 0;
          const costBadge = isActive ? `<span style="color:#38bdf8;font-size:10px;margin-left:4px;">💧${actualMpCost}</span>` : '';
          const cdRem = isActive ? (sk.cooldownRemaining || 0) : 0;
          const cdBadge = isActive
            ? (cdRem > 0
                ? `<span style="color:#fbbf24;font-size:9.5px;margin-left:4px;">⏳${cdRem.toFixed(1)}s</span>`
                : `<span style="color:#4ade80;font-size:9.5px;margin-left:4px;">⚡준비</span>`)
            : '';
          const tierOriginBadge = sk.advTier
            ? `<span style="font-size:9px;padding:1px 4px;border-radius:4px;background:rgba(168,85,247,0.28);color:#e9d5ff;margin-left:4px;">${sk.advTier}차</span>`
            : '';

          return `
            <div class="skill-card">
              <div class="skill-card-head">
                <span>${sk.icon || '⚡'} ${sk.name}${tierOriginBadge}${costBadge}${cdBadge}</span>
                <span class="${isActive ? 'skill-badge-act' : 'skill-badge-pas'}">Lv.${sk.lv || 1}</span>
              </div>
              <div class="skill-desc">${descText}</div>
              <div class="skill-prof-bar-wrap">
                <div class="skill-prof-meta">
                  <span>숙련도</span>
                  <span>${sk.lv >= SKILL_SYSTEM_CONFIG.maxSkillLevel ? 'MAX' : `${sk.uses || 0} / ${reqUses}`}</span>
                </div>
                <div class="skill-prof-track">
                  <div class="skill-prof-fill" style="width:${pct}%"></div>
                </div>
              </div>
            </div>
          `;
        };

        const activesHtml = (h.skills?.actives || []).map(sk => renderSkillCard(sk, true)).join('');
        const passivesHtml = (h.skills?.passives || []).map(sk => renderSkillCard(sk, false)).join('');

        skillsBox.innerHTML = `
          <div class="skill-group-title">
            <span>🔥 액티브 전투 스킬 (스킬 1회 사용 시 숙련도 +1 상승)</span>
            <span>최대 Lv.${SKILL_SYSTEM_CONFIG.maxSkillLevel}</span>
          </div>
          <div class="skill-list-grid">${activesHtml || '<div style="color:#94a3b8;">습득한 액티브 스킬이 없습니다.</div>'}</div>
          <div class="skill-group-title" style="margin-top:6px;">
            <span>💠 패시브 고유 스킬 (몬스터 처치 시 숙련도 +1 상승)</span>
            <span>최대 Lv.${SKILL_SYSTEM_CONFIG.maxSkillLevel}</span>
          </div>
          <div class="skill-list-grid">${passivesHtml || '<div style="color:#94a3b8;">습득한 패시브 스킬이 없습니다.</div>'}</div>
        `;
      }

      const relBox = document.getElementById('hunterRelationsBox');
      if (relBox) {
        interactionManager.pruneRelationsToCircle();
        const rivalBonus = interactionManager.getRivalPvpDefenseBonus(h, hunters);
        const reconcileCost = 300;
        const rivalBannerHtml = `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:rgba(15,23,42,0.85);border:1px solid ${rivalBonus.dmgReductionPct > 0 ? 'rgba(248,113,113,0.48)' : 'rgba(148,163,184,0.22)'};border-radius:7px;font-size:11px;">
            <span style="color:#fca5a5;font-weight:800;">💢 현재 숙적: ${rivalBonus.rivalCount}명</span>
            <span style="color:${rivalBonus.dmgReductionPct > 0 ? '#86efac' : '#94a3b8'};font-weight:800;">
              ${rivalBonus.dmgReductionPct > 0 ? `🛡️ PvP 받는 피해 -${rivalBonus.dmgReductionPct}% 감소` : '숙적 2명 이상부터 PvP 피해 감소'}
            </span>
          </div>
        `;
        const notable = interactionManager.getNotableRelations(h, hunters, 12);
        if (notable.length === 0) {
          relBox.innerHTML = `${rivalBannerHtml}<div style="color:#94a3b8;text-align:center;padding:8px 0;">아직 교류한 동료 헌터가 없습니다. 마을에서 마주치면 관계도가 형성됩니다.</div>`;
        } else {
          relBox.innerHTML = rivalBannerHtml + notable.map(({ other, rel }) => {
            const reconcileBtnHtml = rel.tier === 'rival'
              ? `<button type="button" class="btn-reconcile-rival" data-reconcile-target-id="${other.id}" ${gameState.gold < reconcileCost ? 'disabled' : ''} title="마을 골드 ${reconcileCost}G를 사용해 숙적 관계를 화해합니다">🕊️ 화해 (${reconcileCost}G)</button>`
              : '';
            return `
              <div class="relation-row">
                <span><b>${other.name}</b> <span style="color:#94a3b8;font-size:10.5px;">(${other.currentJobName || other.job} · Lv.${other.level})</span></span>
                <span style="display:inline-flex;align-items:center;gap:6px;">
                  <span style="color:#cbd5e1;font-size:10.5px;">호감 ${rel.affinity > 0 ? '+' : ''}${rel.affinity}</span>
                  <span class="${rel.badgeClass}">${rel.label}</span>
                  ${reconcileBtnHtml}
                </span>
              </div>
            `;
          }).join('');
        }
      }

      const equipBox = document.getElementById('hunterEquipList');
      if (equipBox) {
        bindHunterEquipEvents();
        const smithy = village.getAllBuildings().find(b => b.type === 'smithy');
        const smithyLv = smithy ? smithy.level : 0;
        const activeSlot = gameState.selectedEquipSlot;
        const equippedIns = h.getEquippedInsignia();
        const equippedWing = h.getEquippedWing();
        const ownedInsSig = REGIONAL_INSIGNIA_IDS.map(id => `${id}:${h.inventory ? h.inventory.getCount(id) : 0}`).join(',');
        const ownedWingSig = SKY_WING_ITEM_IDS.map(id => `${id}:${h.inventory ? h.inventory.getCount(id) : 0}`).join(',');

        const equipSig = [
          h.id,
          activeSlot || '',
          smithyLv,
          h.personalGold,
          h.materials,
          h.equippedInsigniaId || 'none',
          ownedInsSig,
          h.equippedWingId || 'none',
          h.wingEnhance || 0,
          ownedWingSig,
          ...['weapon', 'armor', 'helmet', 'accessory'].map(s => `${h.equipment[s].tier}:${h.equipment[s].enhance}`)
        ].join('|');

        if (equipBox.dataset.renderedSig !== equipSig) {
          equipBox.dataset.renderedSig = equipSig;
          const rowsHtml = ['weapon', 'armor', 'helmet', 'accessory'].map(slot => {
            const item = h.equipment[slot];
            const meta = EQUIP_SLOT_META[slot];
            const cond = h.checkTierUpgradeCondition(slot, smithyLv);
            const isSelected = activeSlot === slot;
            return `
              <div class="equip-slot-row ${isSelected ? 'active' : ''}" data-equip-slot="${slot}" title="클릭하여 장비 상세 정보 보기">
                <div>
                  <span style="margin-right:4px;">${meta.icon}</span>
                  <span class="equip-tier-tag">T${item.tier}</span>
                  <b>${h.getEquipDisplayName(slot)}</b>
                  <span style="color:#38bdf8;font-weight:800;">+${item.enhance}</span>
                </div>
                <div style="display:flex;align-items:center;gap:5px;">
                  <span class="equip-req-badge ${cond.canUpgrade ? 'ready' : 'locked'}">${cond.reason}</span>
                  <span style="color:#94a3b8;font-size:10px;">${isSelected ? '▾' : '▸'}</span>
                </div>
              </div>
            `;
          }).join('');

          const isInsSelected = activeSlot === 'insignia';
          const insBonusPct = equippedIns ? Math.round((equippedIns.monsterDmgBonusPct || 0) * 100) : 0;
          const insigniaRowHtml = `
            <div class="equip-slot-row ${isInsSelected ? 'active' : ''}" data-equip-slot="insignia" title="클릭하여 보스 인장 상세 및 획득 방법 보기">
              <div>
                <span style="margin-right:4px;">🏅</span>
                <span class="equip-tier-tag" style="background:rgba(250,204,21,0.2);color:#fde047;">인장</span>
                <b>${equippedIns ? `${equippedIns.icon} ${equippedIns.name}` : '미착용'}</b>
              </div>
              <div style="display:flex;align-items:center;gap:5px;">
                <span class="equip-req-badge ${equippedIns ? 'ready' : 'locked'}">${equippedIns ? `피해 +${insBonusPct}%` : '중간보스 드랍'}</span>
                <span style="color:#94a3b8;font-size:10px;">${isInsSelected ? '▾' : '▸'}</span>
              </div>
            </div>
          `;

          const isWingSelected = activeSlot === 'wing';
          const wEnh = Math.max(0, h.wingEnhance || 0);
          const wingAtkPct = equippedWing ? Math.round(((equippedWing.atkBonusPct || 0) + wEnh * (equippedWing.enhanceAtkBonusPct || 0)) * 100) : 0;
          const wingRowHtml = `
            <div class="equip-slot-row ${isWingSelected ? 'active' : ''}" data-equip-slot="wing" title="클릭하여 날개 상세 정보 및 천공 대장간 강화 안내 보기">
              <div>
                <span style="margin-right:4px;">🪽</span>
                <span class="equip-tier-tag" style="background:rgba(56,189,248,0.22);color:#bae6fd;">날개</span>
                <b>${equippedWing ? `${equippedWing.icon} ${equippedWing.name}` : '미착용'}</b>
                ${equippedWing ? `<span style="color:#38bdf8;font-weight:800;">+${wEnh}</span>` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:5px;">
                <span class="equip-req-badge ${equippedWing ? 'ready' : 'locked'}">${equippedWing ? `공방 +${wingAtkPct}%` : '천공 0.01%'}</span>
                <span style="color:#94a3b8;font-size:10px;">${isWingSelected ? '▾' : '▸'}</span>
              </div>
            </div>
          `;

          let detailHtml = '';
          if (activeSlot && (activeSlot === 'insignia' || activeSlot === 'wing' || h.equipment[activeSlot])) {
            const info = getEquipmentDetailInfo(h, activeSlot, smithyLv);
            if (info.isInsignia) {
              const slotBadgeTitle = activeSlot === 'wing' ? '🪽 [날개]' : '🏅 [보스 인장]';
              detailHtml = `
                <div class="equip-detail-card">
                  <div class="equip-detail-head">
                    <span>${slotBadgeTitle} ${info.name}</span>
                    <button type="button" class="equip-detail-close">닫기 ✕</button>
                  </div>
                  <div style="color:#86efac;font-weight:700;">${info.statSummary}</div>
                  ${info.auraNote ? `<div style="color:#c084fc;font-weight:700;">${info.auraNote}</div>` : ''}
                  <div style="color:#7dd3fc;">${info.nextEnhanceText}</div>
                  ${info.promoteText}
                </div>
              `;
            } else {
              detailHtml = `
                <div class="equip-detail-card">
                  <div class="equip-detail-head">
                    <span>${info.meta.icon} [${info.meta.label}] T${info.item.tier} ${info.name} (+${info.item.enhance}강 / 최대 +15강)</span>
                    <button type="button" class="equip-detail-close">닫기 ✕</button>
                  </div>
                  <div style="color:#86efac;font-weight:700;">${info.statSummary}</div>
                  ${info.auraNote ? `<div style="color:#c084fc;font-weight:700;">${info.auraNote}</div>` : ''}
                  <div style="color:#7dd3fc;">${info.nextEnhanceText}</div>
                  <div style="color:#fde68a;">${info.promoteText}</div>
                </div>
              `;
            }
          } else {
            detailHtml = `<div style="font-size:10.5px;color:#94a3b8;text-align:center;padding-top:2px;">💡 장비 또는 인장을 클릭하면 상세 능력치와 획득·승급 방법을 확인할 수 있습니다.</div>`;
          }

          equipBox.innerHTML = rowsHtml + wingRowHtml + insigniaRowHtml + detailHtml;
        }
      }
    }

    let rosterEventsBound = false;
    let pendingDonateHunterId = null;
    let pendingDonateAmountDigits = '';

    function refreshRosterDonateModalView() {
      const target = hunters.find(item => item.id === pendingDonateHunterId);
      const backdrop = document.getElementById('rosterDonateBackdrop');
      if (!target || !backdrop) return;

      const parsedAmount = Number(pendingDonateAmountDigits || '0') || 0;
      const maxGold = Math.max(0, Math.floor(gameState.gold || 0));

      const titleEl = document.getElementById('rosterDonateTitle');
      const treasuryEl = document.getElementById('rosterDonateTreasuryVal');
      const hunterGoldEl = document.getElementById('rosterDonateHunterGoldVal');
      const displayEl = document.getElementById('rosterDonateInputDisplay');
      const confirmBtn = document.getElementById('btnConfirmRosterDonateAction');

      if (titleEl) titleEl.textContent = `${target.name}에게 골드 기부`;
      if (treasuryEl) treasuryEl.textContent = `${formatGold(maxGold)} G`;
      if (hunterGoldEl) hunterGoldEl.textContent = `${formatGold(target.personalGold || 0)} G`;
      if (displayEl) {
        displayEl.textContent = `${parsedAmount.toLocaleString()} G`;
        displayEl.style.color = parsedAmount > maxGold ? '#f87171' : '#fde047';
      }
      if (confirmBtn) {
        confirmBtn.disabled = parsedAmount <= 0 || parsedAmount > maxGold;
        confirmBtn.textContent = parsedAmount > maxGold
          ? '⚠️ 금고 잔액 초과'
          : `🎁 ${parsedAmount.toLocaleString()}G 기부하기`;
      }
    }

    function openRosterDonateModal(hunterId) {
      const target = hunters.find(item => item.id === hunterId);
      if (!target) return;
      if (gameState.gold <= 0) {
        showToast('⚠️ 마을 금고에 기부할 골드가 없습니다!');
        return;
      }
      syncDonationKeypadButtons();
      const defaultUnit = getDonationKeypadUnitsByBossStage(BOSS_SANCTUM.bossStage)[0]?.amount || 1000;
      pendingDonateHunterId = target.id;
      pendingDonateAmountDigits = gameState.gold >= defaultUnit ? String(defaultUnit) : String(Math.floor(gameState.gold));
      refreshRosterDonateModalView();
      document.getElementById('rosterDonateBackdrop')?.classList.add('open');
    }

    function closeRosterDonateModal() {
      pendingDonateHunterId = null;
      pendingDonateAmountDigits = '';
      document.getElementById('rosterDonateBackdrop')?.classList.remove('open');
    }

    function commitRosterDonateModal() {
      const target = hunters.find(item => item.id === pendingDonateHunterId);
      const amount = Math.floor(Number(pendingDonateAmountDigits || '0') || 0);
      if (!target || amount <= 0) {
        showToast('⚠️ 1 G 이상의 기부 금액을 입력해주세요.');
        return;
      }
      if (gameState.gold < amount) {
        showToast(`⚠️ 마을 금고 골드가 부족합니다! (${formatGold(amount)} G 필요)`);
        return;
      }

      gameState.gold -= amount;
      target.personalGold += amount;
      closeRosterDonateModal();
      updateResourceHUD();
      renderHunterRosterModal(false);
      if (gameState.selectedHunterId === target.id) {
        refreshHunterPanel();
      }
      interactionManager.spawnBubble(target, `🎁 +${formatGold(amount)}G 기부 감사!`, '#fde047');
      showToast(`🎁 ${target.name} 헌터에게 ${formatGold(amount)} G를 기부했습니다!`);
    }

    (function bindRosterDonateModalControls() {
      document.getElementById('btnCloseRosterDonateModal')?.addEventListener('click', closeRosterDonateModal);
      document.getElementById('btnCancelRosterDonateAction')?.addEventListener('click', closeRosterDonateModal);
      document.getElementById('rosterDonateBackdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'rosterDonateBackdrop') closeRosterDonateModal();
      });
      document.getElementById('btnConfirmRosterDonateAction')?.addEventListener('click', commitRosterDonateModal);

      document.querySelectorAll('#rosterDonateBackdrop [data-keypad-digit]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const digit = btn.getAttribute('data-keypad-digit') || '';
          if (!digit) return;
          if (pendingDonateAmountDigits.length >= 12) return;
          const nextStr = pendingDonateAmountDigits === '0' ? digit : (pendingDonateAmountDigits + digit);
          pendingDonateAmountDigits = nextStr === '0' ? '' : nextStr;
          refreshRosterDonateModalView();
        });
      });

      document.querySelectorAll('#rosterDonateBackdrop [data-donate-add]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const addVal = Number(btn.getAttribute('data-donate-add')) || 0;
          const curVal = Number(pendingDonateAmountDigits || '0') || 0;
          const maxGold = Math.max(0, Math.floor(gameState.gold || 0));
          const nextVal = Math.min(maxGold, curVal + addVal);
          pendingDonateAmountDigits = nextVal > 0 ? String(nextVal) : '';
          refreshRosterDonateModalView();
        });
      });

      document.getElementById('btnDonateMaxTreasury')?.addEventListener('click', () => {
        const maxGold = Math.max(0, Math.floor(gameState.gold || 0));
        pendingDonateAmountDigits = maxGold > 0 ? String(maxGold) : '';
        refreshRosterDonateModalView();
      });

      document.getElementById('btnKeypadClear')?.addEventListener('click', () => {
        pendingDonateAmountDigits = '';
        refreshRosterDonateModalView();
      });

      document.getElementById('btnKeypadBackspace')?.addEventListener('click', () => {
        pendingDonateAmountDigits = pendingDonateAmountDigits.slice(0, -1);
        refreshRosterDonateModalView();
      });
    })();

    function bindHunterRosterEvents() {
      if (rosterEventsBound) return;
      const body = document.getElementById('hunterRosterBody');
      if (!body) return;
      rosterEventsBound = true;

      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      let lastTouchHandledAt = 0;

      const handleRosterSelect = (targetEl) => {
        const donateBtn = targetEl.closest('.btn-roster-donate');
        if (donateBtn) {
          const id = donateBtn.getAttribute('data-donate-id');
          if (id) openRosterDonateModal(id);
          return;
        }

        const transcendBtn = targetEl.closest('.btn-roster-transcend');
        if (transcendBtn) {
          const id = transcendBtn.getAttribute('data-transcend-id');
          if (id && typeof openTranscendConfirm === 'function') openTranscendConfirm(id);
          return;
        }

        const altarBtn = targetEl.closest('.btn-roster-altar');
        if (altarBtn) {
          const id = altarBtn.getAttribute('data-altar-id');
          const target = hunters.find(item => item.id === id);
          if (target) {
            if (!canCommandRebirthAltarHunt(target)) {
              showToast(`✨ '${target.name}' 헌터는 이미 [초월 윤회의 인장]을 보유하고 있습니다.`);
              return;
            }
            // 헌터 목록을 닫거나 헌터 정보창으로 넘어가지 않고, 목록에 머문 채 출정만 지시
            if (commandRebirthAltarHunt(target, false)) {
              renderHunterRosterModal(false);
            }
          }
          return;
        }

        const foldBtn = targetEl.closest(".btn-roster-fold");
        if (foldBtn) {
          const id = foldBtn.getAttribute("data-fold-id");
          if (id) setRosterCardFolded(id, !isRosterCardFolded(id));
          return;
        }

        const lockBtn = targetEl.closest(".btn-roster-lock");
        if (lockBtn) {
          const id = lockBtn.getAttribute("data-lock-id");
          if (id && typeof toggleHunterLock === "function") toggleHunterLock(id);
          return;
        }

        const banishBtn = targetEl.closest('.btn-roster-banish');
        if (banishBtn) {
          if (banishBtn.disabled) return;
          const id = banishBtn.getAttribute('data-banish-id');
          if (id) openBanishConfirmModal(id);
          return;
        }

        const focusBtn = targetEl.closest('.btn-roster-focus');
        if (focusBtn) {
          const id = focusBtn.getAttribute('data-focus-id');
          const target = hunters.find(item => item.id === id);
          if (target) {
            document.getElementById('hunterRosterBackdrop')?.classList.remove('open');
            openHunterPanel(target);
            gameState.followSelectedHunter = true;
            const fBtn = document.getElementById('btnFollowHunter');
            if (fBtn) {
              fBtn.classList.add('active');
              fBtn.textContent = '🎥 추적 ON';
            }
            if (target.state !== 'IN_DUNGEON') {
              camera.targetX = target.x;
              camera.targetY = target.y;
            }
          }
          return;
        }

        const card = targetEl.closest('.roster-card');
        if (card) {
          const id = card.getAttribute('data-roster-id');
          const target = hunters.find(item => item.id === id);
          if (target) {
            document.getElementById('hunterRosterBackdrop')?.classList.remove('open');
            openHunterPanel(target);
          }
        }
      };

      body.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchStartTime = performance.now();
        }
      }, { passive: true });

      body.addEventListener('touchend', (e) => {
        if (e.changedTouches.length !== 1) return;
        const dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
        const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
        const elapsed = performance.now() - touchStartTime;
        if (dx < 12 && dy < 12 && elapsed < 500) {
          lastTouchHandledAt = performance.now();
          e.preventDefault();
          handleRosterSelect(e.target);
        }
      }, { passive: false });

      body.addEventListener('click', (e) => {
        if (performance.now() - lastTouchHandledAt < 450) return;
        handleRosterSelect(e.target);
      });
    }

    // 헌터 목록 정렬: 영입순 · 직업(1차 직업별, 환생·레벨 높은 순) · 환생 · 등급 (기기에 기억)
    const ROSTER_SORT_KEY = 'aiht_roster_sort_v1';
    const ROSTER_JOB_ORDER = ['버서커', '레인저', '팔라딘', '소서러'];
    function getRosterSortMode() {
      try {
        const m = localStorage.getItem(ROSTER_SORT_KEY) || 'recruit';
        return m === 'level' ? 'grade' : m; // 예전 '레벨' 정렬은 '등급' 정렬로 바뀜
      } catch (_) { return 'recruit'; }
    }
    function setRosterSortMode(mode) {
      try { localStorage.setItem(ROSTER_SORT_KEY, mode); } catch (_) {}
      document.querySelectorAll('#rosterSortBar [data-roster-sort]').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-roster-sort') === mode);
      });
      renderHunterRosterModal(true);
    }
    // 헌터 카드 접기 / 펼치기 (접힌 헌터 id를 이 기기에 기억)
    //   접으면 환생 표시 아랫줄부터 현재 위치(상태)까지 숨기고, 이름 · 환생 줄과 버튼만 남긴다.
    const ROSTER_FOLD_KEY = "aiht_roster_fold_v1";
    let rosterFoldedIds = null;
    function getRosterFoldedSet() {
      if (!rosterFoldedIds) {
        try { rosterFoldedIds = new Set(JSON.parse(localStorage.getItem(ROSTER_FOLD_KEY) || "[]")); } catch (_) { rosterFoldedIds = new Set(); }
      }
      return rosterFoldedIds;
    }
    function saveRosterFoldedSet() {
      const alive = new Set(hunters.map(h => h.id));
      const list = [...getRosterFoldedSet()].filter(id => alive.has(id)); // 떠난 헌터 기록은 정리
      rosterFoldedIds = new Set(list);
      try { localStorage.setItem(ROSTER_FOLD_KEY, JSON.stringify(list)); } catch (_) {}
    }
    function isRosterCardFolded(id) {
      return getRosterFoldedSet().has(id);
    }
    // 카드 모양만 바꾼다 (목록을 다시 만들지 않음)
    function applyRosterCardFold(id) {
      const card = document.querySelector(`#hunterRosterBody .roster-card[data-roster-id="${id}"]`);
      if (!card) return;
      const folded = isRosterCardFolded(id);
      card.classList.toggle("folded", folded);
      const btn = card.querySelector(".btn-roster-fold");
      if (btn) {
        btn.textContent = folded ? "▼" : "▲";
        btn.title = folded ? "펼치기" : "접기";
        btn.setAttribute("aria-label", btn.title);
      }
    }
    function setRosterCardFolded(id, folded) {
      const set = getRosterFoldedSet();
      if (folded) set.add(id); else set.delete(id);
      saveRosterFoldedSet();
      applyRosterCardFold(id);
      updateRosterFoldToggleButton();
    }
    function areAllRosterCardsFolded() {
      return hunters.length > 0 && hunters.every(h => isRosterCardFolded(h.id));
    }
    // 전체 버튼 글자: 모두 접혀 있으면 [▼ 전체 펼치기], 아니면 [▲ 전체 접기]
    function updateRosterFoldToggleButton() {
      const btn = document.getElementById("btnRosterFoldToggle");
      if (!btn) return;
      const allFolded = areAllRosterCardsFolded();
      const label = allFolded ? "▼ 전체 펼치기" : "▲ 전체 접기";
      if (btn.textContent !== label) btn.textContent = label;
      btn.title = allFolded ? "모든 헌터 카드를 펼칩니다" : "모든 헌터 카드를 접습니다";
    }
    function setAllRosterCardsFolded(folded) {
      const set = getRosterFoldedSet();
      hunters.forEach((h) => { if (folded) set.add(h.id); else set.delete(h.id); });
      saveRosterFoldedSet();
      hunters.forEach(h => applyRosterCardFold(h.id));
      updateRosterFoldToggleButton();
    }

    function getSortedRosterHunters() {
      const mode = getRosterSortMode();
      const list = hunters.slice();
      const byGrowth = (a, b) => ((b.rebirthCount || 0) - (a.rebirthCount || 0)) || (b.level - a.level);
      if (mode === 'job') {
        const jobIdx = (h) => {
          const i = ROSTER_JOB_ORDER.indexOf(h.baseJob || h.job);
          return i < 0 ? 99 : i;
        };
        list.sort((a, b) => (jobIdx(a) - jobIdx(b)) || byGrowth(a, b));
      } else if (mode === 'rebirth') {
        list.sort(byGrowth);
      } else if (mode === 'grade') {
        // 등급이 보이는 헌터(5환생↑)를 높은 등급(EX+)부터, 등급이 아직 안 보이는 헌터는 그 뒤에 환생·레벨 순
        // (안 보이는 등급이 순서로 드러나지 않게 한다 · 등급표 js/37-hunter-grade.js)
        const gradeRank = (h) => {
          if (typeof isHunterGradeVisible !== 'function' || !isHunterGradeVisible(h)) return 999;
          const i = HUNTER_GRADES.findIndex(g => g.id === getHunterGrade(h).id);
          return i < 0 ? 998 : i;
        };
        list.sort((a, b) => (gradeRank(a) - gradeRank(b)) || byGrowth(a, b));
      }
      return list;
    }
    (function bindRosterSortBar() {
      const bar = document.getElementById('rosterSortBar');
      if (!bar) return;
      bar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-roster-sort]');
        if (btn) setRosterSortMode(btn.getAttribute('data-roster-sort'));
        // 전체 접기 · 펼치기 버튼 하나: 펼쳐진 카드가 하나라도 있으면 모두 접고, 모두 접혀 있으면 모두 펼친다
        if (e.target.closest("#btnRosterFoldToggle")) setAllRosterCardsFolded(!areAllRosterCardsFolded());
      });
      const mode = getRosterSortMode();
      bar.querySelectorAll('[data-roster-sort]').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-roster-sort') === mode);
      });
    })();

    // 헌터 목록 장비 줄 옆: 착용한 날개 그림 + 날개 강화 수치 (예: " 🪽+5" · 날개가 없으면 빈칸)
    function getRosterWingTag(h) {
      const wing = typeof h.getEquippedWing === 'function' ? h.getEquippedWing() : null;
      if (!wing) return '';
      return ` ${wing.icon || '🪽'}+${Math.max(0, Math.floor(Number(h.wingEnhance) || 0))}`;
    }

    function renderHunterRosterModal(forceRebuild = false) {
      bindHunterRosterEvents();
      updateRosterFoldToggleButton(); // 전체 접기 · 펼치기 버튼 글자
      const body = document.getElementById('hunterRosterBody');
      const badge = document.getElementById('rosterCountBadge');
      if (badge) badge.textContent = `${hunters.length} / ${getMaxHunterCapacity()}명`;
      if (!body) return;

      if (hunters.length === 0) {
        body.dataset.renderedIds = '';
        body.innerHTML = '<div style="text-align:center;padding:24px;color:#94a3b8;">영입된 헌터가 없습니다. 하단 <b>⚔️ 영입</b> 버튼을 눌러주세요.</div>';
        return;
      }

      const jobIcons = { '버서커': '🪓', '레인저': '🏹', '팔라딘': '🛡️', '소서러': '🔮' };
      const getColosseumRecord = (hunterId) => {
        if (typeof COLOSSEUM_STATE !== 'undefined' && COLOSSEUM_STATE.standings) {
          const st = COLOSSEUM_STATE.standings.get(hunterId);
          if (st) {
            const points = st.points || 0;
            const wins = st.wins || 0;
            const runnerUps = st.runnerUps || 0;
            const participations = st.participations || 0;
            const duelWins = st.duelWins || 0;
            const duelLosses = st.duelLosses || 0;
            return { points, wins, runnerUps, participations, duelWins, duelLosses };
          }
        }
        return { points: 0, wins: 0, runnerUps: 0, participations: 0, duelWins: 0, duelLosses: 0 };
      };
      const formatColosseumRosterHtml = (rec) => {
        const duelText = (rec.duelWins > 0 || rec.duelLosses > 0)
          ? `${rec.duelWins}승 ${rec.duelLosses}패`
          : `우승 ${rec.wins} · 준우승 ${rec.runnerUps}`;
        return `🏟️ 결투장: <b style="color:#4ade80;">${rec.points.toLocaleString()}점</b> (${duelText})`;
      };
      const renderRosterRebirthStars = (rebirthCount, transcendCount = 0, hunter = null) => {
        const count = Math.max(0, Math.min(LEVEL_REBIRTH_CONFIG.maxRebirths, Math.floor(Number(rebirthCount) || 0)));
        if (count <= 0) return '';
        const red = Math.max(0, Math.min(count, Math.floor(Number(transcendCount) || 0)));
        const redStars = red > 0 ? `<span style="color:#ef4444;text-shadow:0 0 6px rgba(239,68,68,0.6);">${'★'.repeat(red)}</span>` : '';
        const gradeHtml = (hunter && typeof getHunterGradeHtml === "function") ? getHunterGradeHtml(hunter) + " " : "";
        return `${gradeHtml}<span style="color:#facc15;font-weight:800;letter-spacing:1px;text-shadow:0 0 6px rgba(250,204,21,0.45);">${red > 0 ? "초월" : "환생"} ${redStars}${'★'.repeat(count - red)}</span>`;
      };
      const canTranscendHere = (h) => typeof canUseTranscendTicketOn === 'function' && canUseTranscendTicketOn(h);
      const rosterList = getSortedRosterHunters();
      const currentIds = `${getRosterSortMode()}|` + rosterList.map(h => `${h.id}:${canCommandRebirthAltarHunt(h) ? 1 : 0}:${canTranscendHere(h) ? 1 : 0}:${h.transcendCount || 0}:${h.locked ? 1 : 0}`).join(',');

      // 헌터 목록 구성이 달라진 경우에만 DOM을 새로 생성 (터치 도중 DOM 파괴 방지)
      if (forceRebuild || body.dataset.renderedIds !== currentIds) {
        body.dataset.renderedIds = currentIds;
        body.innerHTML = `<div class="hunter-roster-grid">${rosterList.map(h => {
          const stats = h.getComputedStats();
          const effP = getEffectivePersonalityProfile(h.personality, h.rebirthCount);
          const isTrait = h.personality?.kind === 'trait' || effP.isRebirth5InvertedPenalty;
          const alignInfo = getAlignmentInfo(h.alignment);
          const jIcon = jobIcons[h.baseJob || h.job] || '⚔️';
          const eq = h.equipment || {};
          const wTier = eq.weapon?.tier || 1;
          const aTier = eq.armor?.tier || 1;
          const hTier = eq.helmet?.tier || 1;
          const accTier = eq.accessory?.tier || 1;
          const avgTier = ((wTier + aTier + hTier + accTier) / 4).toFixed(1);
          const equipTierSummary = `🛡️ 장비 T${avgTier} (무T${wTier}·갑T${aTier}·투T${hTier}·장T${accTier})${getRosterWingTag(h)}`;
          const canAltar = canCommandRebirthAltarHunt(h);
          const canDonate = gameState.gold >= 500;
          const rebirthStarsHtml = renderRosterRebirthStars(h.rebirthCount, h.transcendCount || 0, h);
          const colRec = getColosseumRecord(h.id);
          return `
            <div class="roster-card ${h.id === gameState.selectedHunterId ? 'selected' : ''}${isRosterCardFolded(h.id) ? " folded" : ""}" data-roster-id="${h.id}">
              <div class="roster-card-top">
                <div class="roster-name-group">
                  <span class="roster-hunter-name">${h.name}</span>
                  <button type="button" class="btn-roster-lock${h.locked ? " locked" : ""}" data-lock-id="${h.id}" title="${h.locked ? "잠금 해제" : "잠그면 추방할 수 없습니다"}">${h.locked ? "🔒" : "🔓"}</button>
                  <span class="roster-job-badge" data-role="job-lv">${jIcon} ${h.currentJobName || h.job} · Lv.${h.level}</span>
                  <span class="${alignInfo.badgeClass}" data-role="alignment">⚖️ ${alignInfo.label}</span>
                </div>
                <span class="personality-tag-trait">${h.personality.icon} ${h.personality.name}</span>
              </div>
              <div class="roster-sub-row">
                <span data-role="rebirth">${rebirthStarsHtml}</span>
                <span class="roster-sub-right">
                  <span class="roster-personality-effect" style="color:${isTrait ? '#86efac' : '#fca5a5'};">${effP.effectText}</span>
                  <button type="button" class="btn-roster-fold" data-fold-id="${h.id}" title="${isRosterCardFolded(h.id) ? "펼치기" : "접기"}" aria-label="${isRosterCardFolded(h.id) ? "펼치기" : "접기"}">${isRosterCardFolded(h.id) ? "▼" : "▲"}</button>
                </span>
              </div>
              <div class="roster-card-meta" style="color:#fef08a;font-weight:700;">
                <span data-role="colosseum-pts">${formatColosseumRosterHtml(colRec)}</span>
                <span data-role="colosseum-sub" style="color:#94a3b8;font-size:10.5px;">출전 ${colRec.participations}회</span>
              </div>
              <div class="roster-mini-bars">
                <div class="roster-mini-bar">
                  <span data-role="hp-text">❤️ HP ${Math.round(h.hp)}/${h.maxHp}</span>
                  <div class="roster-mini-track"><div class="bar-fill-hp" data-role="hp-bar" style="width:${(h.hp / h.maxHp) * 100}%"></div></div>
                </div>
                <div class="roster-mini-bar">
                  <span data-role="mp-text">💧 MP ${Math.round(h.mp)}/${h.maxMp}</span>
                  <div class="roster-mini-track"><div class="bar-fill-mp" data-role="mp-bar" style="width:${(h.mp / h.maxMp) * 100}%"></div></div>
                </div>
              </div>
              <div class="roster-card-meta">
                <span data-role="stats">⚔️ ${stats.atk} · 🛡️ ${stats.def} · ⚡ ${stats.crit}%</span>
                <span data-role="gold" style="color:#fde047;font-weight:800;">💰 ${formatGold(h.personalGold)} G</span>
              </div>
              <div class="roster-card-meta" style="color:#fde68a;font-weight:700;">
                <span data-role="equip-tiers">${equipTierSummary}</span>
                <span data-role="weapon" style="color:#94a3b8;font-weight:600;">무기 T${h.equipment.weapon.tier} +${h.equipment.weapon.enhance}</span>
              </div>
              <div class="roster-card-footer">
                <span class="roster-status-text" data-role="status">${h.getStatusDescription()}</span>
                <div style="display:inline-flex;align-items:center;gap:4px;flex-shrink:0;">
                  <button type="button" class="btn-roster-donate" data-donate-id="${h.id}" ${canDonate ? '' : 'disabled'} title="마을 금고에서 +500G 기부">🎁 기부</button>
                  ${canAltar ? `<button type="button" class="btn-roster-altar" data-altar-id="${h.id}" title="초월 환생의 제단 출정 지시">✨ 제단출정</button>` : ''}
                  ${canTranscendHere(h) ? `<button type="button" class="btn-roster-transcend" data-transcend-id="${h.id}" title="초월권 1장을 써서 초월 (전체 능력 +20%)">🔴 초월</button>` : ''}
                  <button type="button" class="btn-roster-focus" data-focus-id="${h.id}">📍 위치 보기</button>
                  <button type="button" class="btn-roster-banish" data-banish-id="${h.id}" ${h.locked ? "disabled" : ""} title="${h.locked ? "잠긴 헌터는 추방할 수 없습니다" : "마을에서 추방"}">🚪 추방</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}</div>`;
        return;
      }

      // 기존 DOM 요소 내부 텍스트·게이지만 인플레이스 업데이트
      hunters.forEach(h => {
        const card = body.querySelector(`.roster-card[data-roster-id="${h.id}"]`);
        if (!card) return;
        card.classList.toggle('selected', h.id === gameState.selectedHunterId);
        const donateBtn = card.querySelector('.btn-roster-donate');
        if (donateBtn) donateBtn.disabled = gameState.gold < 500;
        const stats = h.getComputedStats();
        const jIcon = jobIcons[h.job] || '⚔️';
        const eq = h.equipment || {};
        const wTier = eq.weapon?.tier || 1;
        const aTier = eq.armor?.tier || 1;
        const hTier = eq.helmet?.tier || 1;
        const accTier = eq.accessory?.tier || 1;
        const avgTier = ((wTier + aTier + hTier + accTier) / 4).toFixed(1);

        const jobLvEl = card.querySelector('[data-role="job-lv"]');
        if (jobLvEl) jobLvEl.textContent = `${jIcon} ${h.currentJobName || h.job} · Lv.${h.level}`;

        const rebirthEl = card.querySelector('[data-role="rebirth"]');
        if (rebirthEl) rebirthEl.innerHTML = renderRosterRebirthStars(h.rebirthCount, h.transcendCount || 0, h);

        const alignInfo = getAlignmentInfo(h.alignment);
        const alignEl = card.querySelector('[data-role="alignment"]');
        if (alignEl) {
          alignEl.className = alignInfo.badgeClass;
          alignEl.textContent = `⚖️ ${alignInfo.label}`;
        }

        const hpText = card.querySelector('[data-role="hp-text"]');
        const hpBar = card.querySelector('[data-role="hp-bar"]');
        if (hpText) hpText.textContent = `❤️ HP ${Math.round(h.hp)}/${h.maxHp}`;
        if (hpBar) hpBar.style.width = `${Math.max(0, Math.min(100, (h.hp / h.maxHp) * 100))}%`;

        const mpText = card.querySelector('[data-role="mp-text"]');
        const mpBar = card.querySelector('[data-role="mp-bar"]');
        if (mpText) mpText.textContent = `💧 MP ${Math.round(h.mp)}/${h.maxMp}`;
        if (mpBar) mpBar.style.width = `${Math.max(0, Math.min(100, (h.mp / h.maxMp) * 100))}%`;

        const statsEl = card.querySelector('[data-role="stats"]');
        if (statsEl) statsEl.textContent = `⚔️ ${stats.atk} · 🛡️ ${stats.def} · ⚡ ${stats.crit}%`;

        const goldEl = card.querySelector('[data-role="gold"]');
        if (goldEl) goldEl.textContent = `💰 ${formatGold(h.personalGold)} G`;

        const weaponEl = card.querySelector('[data-role="weapon"]');
        if (weaponEl) weaponEl.textContent = `무기 T${h.equipment.weapon.tier} +${h.equipment.weapon.enhance}`;

        const equipTiersEl = card.querySelector('[data-role="equip-tiers"]');
        if (equipTiersEl) equipTiersEl.textContent = `🛡️ 장비 T${avgTier} (무T${wTier}·갑T${aTier}·투T${hTier}·장T${accTier})${getRosterWingTag(h)}`;

        const colPtsEl = card.querySelector('[data-role="colosseum-pts"]');
        const colSubEl = card.querySelector('[data-role="colosseum-sub"]');
        if (colPtsEl || colSubEl) {
          const colRec = getColosseumRecord(h.id);
          if (colPtsEl) colPtsEl.innerHTML = formatColosseumRosterHtml(colRec);
          if (colSubEl) colSubEl.textContent = `출전 ${colRec.participations}회`;
        }

        const statusEl = card.querySelector('[data-role="status"]');
        if (statusEl) statusEl.textContent = h.getStatusDescription();
      });
    }

    function renderHelpModalContent(tabKey) {
      const body = document.getElementById('helpModalBody');
      if (!body) return;
      const modalEl = body.closest('.tier-modal');
      const isBossTab = tabKey === 'boss';
      if (modalEl) {
        modalEl.classList.toggle('boss-guide-expanded', isBossTab);
      }
      body.classList.toggle('boss-scroll-2x', isBossTab);

      if (tabKey === 'tier') {
        body.innerHTML = `
          <div style="font-size:12px;color:#cbd5e1;">
            헌터는 <b>무기·방어구·투구·장신구</b> 4부위를 착용하며, <b>마법 강화소</b>에서 최대 <b>+15강</b>까지 강화한 뒤 <b>대장간(Lv.2~Lv.10)</b>에서 상위 티어(<b>T2~T10</b>)로 승급합니다.
          </div>
          <div class="tier-table-wrap">
            <table class="tier-table">
              <thead>
                <tr>
                  <th>장비 등급</th>
                  <th>대표 무기 / 방어구</th>
                  <th>승급 필수 조건</th>
                  <th>승급 비용</th>
                  <th>지하 던전 / 보스 권장</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span class="tier-pill tier-1">T1 일반</span></td>
                  <td>수습생 무기 / 가죽 튜닉</td>
                  <td>기본 지급 장비 (+0~+15강)</td>
                  <td>-</td>
                  <td>B1F ~ B9F (1보스: T1 +3강)</td>
                </tr>
                <tr>
                  <td><span class="tier-pill tier-2">T2 강철</span></td>
                  <td>강철 무기 / 사슬 갑옷</td>
                  <td>대장간 Lv.2 · +3강 이상</td>
                  <td>${formatGold(12000)} G · 재료 8개</td>
                  <td>B10F ~ B19F (2보스: T2 +4강)</td>
                </tr>
                <tr>
                  <td><span class="tier-pill tier-3">T3 미스릴</span></td>
                  <td>미스릴 무기 / 미스릴 플레이트</td>
                  <td>대장간 Lv.3 · +6강 이상</td>
                  <td>${formatGold(35000)} G · 재료 20개</td>
                  <td>B20F ~ B29F (3보스: T3 +5강)</td>
                </tr>
                <tr>
                  <td><span class="tier-pill tier-4">T4 용혈</span></td>
                  <td>용살자 무기 / 용린 중갑옷</td>
                  <td>대장간 Lv.4 · +9강 이상</td>
                  <td>${formatGold(90000)} G · 재료 45개</td>
                  <td>B30F ~ B49F (4보스: T4 +6강)</td>
                </tr>
                <tr>
                  <td><span class="tier-pill tier-5">T5 신화</span></td>
                  <td>신화 무기 / 성광의 성갑</td>
                  <td>대장간 Lv.5 · +12강 이상</td>
                  <td>${formatGold(220000)} G · 재료 90개</td>
                  <td>B50F 심연 (5보스: T5 +7강)</td>
                </tr>
                <tr>
                  <td><span class="tier-pill tier-6">T6 뇌전</span></td>
                  <td>뇌전 무기 / 뇌전 성좌갑옷</td>
                  <td>대장간 Lv.6 · +8강 이상</td>
                  <td>${formatGold(480000)} G · 재료 150개</td>
                  <td>B60F 권역 (6보스: T6 +8강)</td>
                </tr>
                <tr>
                  <td><span class="tier-pill tier-7">T7 심연</span></td>
                  <td>심연 무기 / 심연 암흑중갑</td>
                  <td>대장간 Lv.7 · +9강 이상</td>
                  <td>${formatGold(1050000)} G · 재료 240개</td>
                  <td>B70F 권역 (7보스: T7 +9강)</td>
                </tr>
                <tr>
                  <td><span class="tier-pill tier-8">T8 성광</span></td>
                  <td>성광 무기 / 세라핌 황금성갑</td>
                  <td>대장간 Lv.8 · +10강 이상</td>
                  <td>${formatGold(2300000)} G · 재료 360개</td>
                  <td>B80F 권역 (8보스: T8 +10강)</td>
                </tr>
                <tr>
                  <td><span class="tier-pill tier-9">T9 혼돈</span></td>
                  <td>혼돈 무기 / 혼돈 차원갑주</td>
                  <td>대장간 Lv.9 · +11강 이상</td>
                  <td>${formatGold(5000000)} G · 재료 520개</td>
                  <td>B90F 권역 (9보스: T9 +11강)</td>
                </tr>
                <tr>
                  <td><span class="tier-pill tier-10">T10 창세</span></td>
                  <td>창세 절대무기 / 창세 절대신갑</td>
                  <td>대장간 Lv.10 · +12강 이상</td>
                  <td>${formatGold(11000000)} G · 재료 750개</td>
                  <td><b>B100F 종언 (10보스: T10 +12강)</b></td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      } else if (tabKey === 'jobs') {
        const jobGuides = [
          {
            job: '버서커',
            icon: '🪓',
            style: '근접 돌진 · 광역 도끼 참격',
            summary: '전방에서 양날 대부를 휘둘러 높은 물리 피해와 폭주 화력으로 적을 제압하는 근접 딜러입니다.'
          },
          {
            job: '레인저',
            icon: '🏹',
            style: '원거리 속사 · 치명타 특화',
            summary: '적과 거리를 유지하며 고속 화살과 폭풍 화살비로 치명타 연타를 퍼붓는 원거리 명사수입니다.'
          },
          {
            job: '팔라딘',
            icon: '🛡️',
            style: '근접 성광검 · 방어 및 수호',
            summary: '방패와 성검으로 무장해 높은 방어력과 피해 감소 수호막으로 전선을 지탱하는 성기사입니다.'
          },
          {
            job: '소서러',
            icon: '🔮',
            style: '원거리 비전 마법 · 광역 폭딜',
            summary: '지팡이에서 비전 구체를 방출하고 메테오와 빙결 마법으로 적을 섬멸하는 마법사입니다.'
          }
        ];
        body.innerHTML = `
          <div style="font-size:12px;color:#cbd5e1;">
            각 직업은 고유한 <b>전투 사거리(근접/원거리)</b>와 <b>기본 액티브 2종 · 패시브 2종</b>을 보유하며, <b>Lv.99 환생소 전직(1~5차)</b>마다 트리형 2가지 선택지 중 하나로 전직해 <b>신규 액티브 1개 + 패시브 1개</b>를 추가 습득합니다.
          </div>
          <div class="facility-guide-grid">
            ${jobGuides.map(g => {
              const sData = JOB_SKILLS[g.job] || { actives: [], passives: [] };
              const skillItemsHtml = [
                ...sData.actives.map(s => `<div style="font-size:11.5px;color:#e2e8f0;margin-top:4px;"><span class="skill-badge-act">액티브</span> <b>${s.icon} ${s.name}</b>: ${s.desc.replace('{power}', s.basePower)}</div>`),
                ...sData.passives.map(s => {
                  const val = s.atkMult ? Math.round(s.atkMult * 100) : (s.defMult ? Math.round(s.defMult * 100) : (s.critBonus || (s.mpMult ? Math.round(s.mpMult * 100) : 25)));
                  return `<div style="font-size:11.5px;color:#e2e8f0;margin-top:4px;"><span class="skill-badge-pas">패시브</span> <b>${s.icon} ${s.name}</b>: ${s.desc.replace('{val}', val)}</div>`;
                })
              ].join('');
              return `
                <div class="facility-guide-card">
                  <div class="facility-guide-head">
                    <span class="facility-guide-title">${g.icon} ${g.job}</span>
                    <span class="facility-guide-cost">${g.style}</span>
                  </div>
                  <div class="facility-guide-role">${g.summary}</div>
                  <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:4px;margin-top:2px;">
                    ${skillItemsHtml}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <div style="margin-top:6px;font-size:12.5px;font-weight:800;color:#d8b4fe;">
            🌳 1~5차 환생 트리형 전직 계보도 (각 전직마다 2개 직업 분기 · 액티브 1 + 패시브 1)
          </div>
          ${Object.values(JOB_ADVANCEMENT_TREE).map(tree => `
            <div class="adv-tree-tier-row">
              <div style="font-weight:800;color:#fde047;font-size:12px;">⚔️ ${tree.baseJob} 전직 트리 (1차 2종 → 2차 4종 → 3차 8종 → 4차 16종 → 5차 32종)</div>
              ${tree.tiers.map((nodes, tIdx) => `
                <div style="margin-top:4px;">
                  <div style="font-size:11px;font-weight:800;color:#7dd3fc;margin-bottom:4px;">• ${tIdx + 1}차 전직 (${tIdx + 1}환생 · ${nodes.length}개 직업)</div>
                  <div class="adv-tree-grid">
                    ${nodes.map(n => {
                      const pName = n.parentId ? (JOB_ADVANCEMENT_NODES_BY_ID[n.parentId]?.name || tree.baseJob) : tree.baseJob;
                      return `
                        <div class="adv-choice-card">
                          <div style="font-weight:800;color:#f8fafc;">${n.icon} ${n.name} <span style="font-size:9.5px;color:#94a3b8;">(← ${pName})</span></div>
                          <div style="font-size:10px;color:#fca5a5;">🔥 ${n.activeSkill.name}</div>
                          <div style="font-size:10px;color:#86efac;">💠 ${n.passiveSkill.name}</div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}
        `;
      } else if (tabKey === 'personality') {
        body.innerHTML = `
          <div style="font-size:12px;color:#cbd5e1;">헌터 영입 시 총 <b>32종의 개성 있는 성격</b> 중 하나가 무작위로 부여되며, <b>고유 특성(18종)</b> 또는 <b>패널티(14종)</b> 중 한 가지를 지닙니다. ★패널티 성격이 꼭 나쁜게 아닙니다.★</div>
          <div class="personality-guide-grid">
            ${HUNTER_PERSONALITIES.map(p => {
              const isTrait = p.kind === 'trait';
              return `
                <div class="personality-guide-card ${isTrait ? 'trait' : 'penalty'}">
                  <div class="personality-guide-top">
                    <span>${p.icon} ${p.name}</span>
                    <span class="${isTrait ? 'personality-tag-trait' : 'personality-tag-penalty'}">${isTrait ? '특성' : '패널티'}</span>
                  </div>
                  <div class="personality-guide-desc" style="color:${isTrait ? '#86efac' : '#fca5a5'};">${p.effectText}</div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else if (tabKey === 'guards') {
        body.innerHTML = `
          <div style="font-size:12px;color:#cbd5e1;">
            마을에는 총 <b>2명의 최강 경비병</b>이 배치되어 마을 내부를 순찰하며, 마을 구역 내 인성 <b>-50 이하(카오스)</b> 헌터를 감지·제압합니다.
          </div>
          <div class="facility-guide-grid">
            <div class="facility-guide-card">
              <div class="facility-guide-head">
                <span class="facility-guide-title">${SUPREME_TOWN_GUARD.name}</span>
                <span class="facility-guide-cost">근접 수호 · ATK ${SUPREME_TOWN_GUARD.atk.toLocaleString()}</span>
              </div>
              <div class="facility-guide-stat">감지 사거리 ${SUPREME_TOWN_GUARD.detectRange} · 근접 사거리 ${SUPREME_TOWN_GUARD.attackRange}</div>
              <div class="facility-guide-role">대검 참격으로 마을 내 카오스(-50 이하) 헌터를 추적하고 제압하는 근접 지휘관입니다.</div>
            </div>
            <div class="facility-guide-card">
              <div class="facility-guide-head">
                <span class="facility-guide-title">${ARCANE_TOWN_GUARD.name}</span>
                <span class="facility-guide-cost">마법 수호 · ATK ${ARCANE_TOWN_GUARD.atk.toLocaleString()}</span>
              </div>
              <div class="facility-guide-stat">감지 사거리 ${ARCANE_TOWN_GUARD.detectRange} · 마법 사거리 ${ARCANE_TOWN_GUARD.attackRange}</div>
              <div class="facility-guide-role">마법 지팡이와 광역 마력 폭발로 원거리에서 카오스(-50 이하) 헌터를 견제·제압합니다.</div>
            </div>
          </div>
          <div class="tier-note-grid">
            <div class="tier-note-card">
              <h4>⚖️ 카오스 헌터 제압 & 인성 회복 / 반격</h4>
              마을에서 경비병에게 공격받는 카오스 헌터는 사거리 내에서 <b>반격</b>을 시도하며, 제압 시 관문 밖으로 후퇴하고 <b>인성이 +3 회복</b>됩니다.
            </div>
          </div>
        `;
      } else if (tabKey === 'boss') {
        const stageRowsHtml = Array.from({ length: BOSS_SANCTUM.maxBossStage }, (_, idx) => {
          const st = idx + 1;
          const cfg = getBossStageConfig(st);
          const isCurrent = BOSS_SANCTUM.bossStage === st;
          const isCleared = BOSS_SANCTUM.allStagesCleared || st < BOSS_SANCTUM.bossStage;
          const statusBadge = isCleared
            ? `<span style="color:#86efac;font-weight:800;">토벌 완료</span>`
            : (isCurrent
                ? `<span style="color:#fde047;font-weight:800;">현재 단계</span>`
                : `<span style="color:#94a3b8;font-weight:700;">대기</span>`);

          return `
            <tr style="${isCurrent ? 'background:rgba(244,63,94,0.14);' : ''}">
              <td><span class="tier-pill tier-${st}">${st}단계</span> ${statusBadge}</td>
              <td><b>${cfg.theme.title}</b><div style="font-size:10.5px;color:#94a3b8;">권장 ${cfg.reqLabel}</div></td>
              <td>HP <b>${cfg.maxHp.toLocaleString()}</b><div style="font-size:10.5px;color:#86efac;">재생 +${cfg.regenPerSec.toLocaleString()}/s</div></td>
              <td>ATK <b>${cfg.atk.toLocaleString()}</b> · DEF <b>${cfg.def.toLocaleString()}</b></td>
              <td>마을 <b>+${formatGold(cfg.rewardVillageGold)}G</b> · 헌터 <b>+${formatGold(cfg.rewardHunterGold)}G</b><div style="font-size:10.5px;color:#c4b5fd;">EXP +${cfg.rewardExp.toLocaleString()} · 룬핵 ${cfg.rewardMats}개</div></td>
            </tr>
          `;
        }).join('');

        const miniBossCardsHtml = [
          ...HUNTING_GROUNDS.filter(g => g.miniBossConfig).map((g) => {
            const gCfg = getBossStageConfig(g.miniBossConfig.bossStageRef || 1);
            const estHp = Math.max(2250, Math.round((gCfg.maxHp / 5) * 1.5));
            const estAtk = Math.max(30, Math.round((gCfg.atk / 5) * (g.miniBossConfig.atkMultiplier || 1)));
            const insDef = g.miniBossConfig.insigniaId ? ITEM_CATALOG[g.miniBossConfig.insigniaId] : null;
            const insPct = insDef ? Math.round((insDef.monsterDmgBonusPct || 0) * 100) : 0;
            const rewardDesc = insDef
              ? `<b>${insDef.icon} ${insDef.name} (몬스터 피해 +${insPct}%)</b> 및 고액 전리품을 지급합니다.`
              : `고액 전리품(<b>${g.lootSpec?.icon || '🌠'} ${g.lootSpec?.name || '영혼결정'}</b>) 및 대량 골드·경험치를 지급합니다.`;
            return `
              <div class="facility-guide-card">
                <div class="facility-guide-head">
                  <span class="facility-guide-title">${g.miniBossConfig.name}</span>
                  <span class="facility-guide-cost">${g.icon} ${g.name.split(' (')[0]}</span>
                </div>
                <div class="facility-guide-stat">예상 HP ${estHp.toLocaleString()} · ATK ${estAtk.toLocaleString()} · 리젠 ${g.miniBossConfig.respawnDelay}s</div>
                <div class="facility-guide-role">일반 몬스터 출현/리젠 시 <b>0.1%</b> 확률로 등장하며, 처치 시 ${rewardDesc}</div>
              </div>
            `;
          }),
          `
            <div class="facility-guide-card">
              <div class="facility-guide-head">
                <span class="facility-guide-title">${REBIRTH_ALTAR.boss.name}</span>
                <span class="facility-guide-cost">✨ 초월 환생의 제단</span>
              </div>
              <div class="facility-guide-stat">HP ${REBIRTH_ALTAR.boss.maxHp.toLocaleString()} · ATK ${REBIRTH_ALTAR.boss.atk.toLocaleString()} · DEF ${REBIRTH_ALTAR.boss.def.toLocaleString()}</div>
              <div class="facility-guide-role"><b>1환생 이상</b> 헌터 전용 최상급 중간보스입니다. 처치 시 <b>✨ 초월 윤회의 인장 (몬스터 피해 +150%)</b>, 마을 <b>+${formatGold(REBIRTH_ALTAR.boss.rewardVillageGold)}G</b>, 헌터 <b>+${formatGold(REBIRTH_ALTAR.boss.rewardHunterGold)}G</b> 및 별결정을 획득합니다.</div>
            </div>
          `
        ].join('');

        body.innerHTML = `
          <div style="font-size:12px;color:#cbd5e1;">
            상단 <b>🔥 보스 오픈</b> 버튼으로 <b>고대 수호자의 성소</b>를 개방하면 <b>60초 정비</b> 후 헌터들이 성소로 돌격합니다. 단계별 보스를 처치할 때마다 해당 레벨의 마을 시설 업그레이드 단계가 해금됩니다.
          </div>
          <div class="tier-table-wrap">
            <table class="tier-table">
              <thead>
                <tr>
                  <th>보스 단계</th>
                  <th>보스명 & 권장 스펙</th>
                  <th>체력 / 재생</th>
                  <th>공격 / 방어</th>
                  <th>토벌 보상</th>
                </tr>
              </thead>
              <tbody>
                ${stageRowsHtml}
              </tbody>
            </table>
          </div>
          <div style="font-size:12.5px;font-weight:800;color:#fde047;">
            👑 필드 희귀 중간 보스 & 초월 환생의 제단 중간보스
          </div>
          <div class="facility-guide-grid">
            ${miniBossCardsHtml}
          </div>
        `;
      } else if (tabKey === 'town') {
        body.innerHTML = `
          <div class="facility-guide-grid">
            ${Object.values(BUILDING_CATALOG).map(b => `
              <div class="facility-guide-card">
                <div class="facility-guide-head">
                  <span class="facility-guide-title">${b.icon} ${b.name}</span>
                  <span class="facility-guide-cost">${b.buildCost === 0 ? '기본 건물' : `${formatGold(b.buildCost)} G`}</span>
                </div>
                <div class="facility-guide-stat">${b.getStatText(1)}</div>
                <div class="facility-guide-role">${b.desc}</div>
              </div>
            `).join('')}
          </div>
        `;
      } else if (tabKey === 'prosperity') {
        const currentProsperity = village.computeTotalProsperity();
        const prosperityTier = Math.max(0, Math.floor(currentProsperity / 1000));
        const meleeAtkPct = prosperityTier * 2;
        const meleeHpPct = prosperityTier * 5;
        const rangedAtkPct = prosperityTier * 1;
        const rangedHpPct = prosperityTier * 2;
        const nextMilestone = (prosperityTier + 1) * 1000;
        const remToNext = Math.max(0, nextMilestone - currentProsperity);

        body.innerHTML = `
          <div style="font-size:12px;color:#cbd5e1;">
            마을 시설 건설 및 레벨업으로 <b>마을 번영도</b>를 높이면, <b>1,000 단위 상승 시마다</b> 헌터들에게 영구 능력치 보너스가 중첩 적용됩니다.
          </div>
          <div class="tier-note-grid">
            <div class="tier-note-card">
              <h4>📊 현재 번영도 & 적용 중인 보너스</h4>
              <div>• 현재 마을 번영도: <b style="color:#fde047;">${currentProsperity.toLocaleString()}</b> (${prosperityTier}단계 · 다음 1,000단위까지 <b>${remToNext.toLocaleString()}</b>)</div>
              <div style="margin-top:4px;">• 근접 헌터 현재 보너스: <b style="color:#86efac;">공격력 +${meleeAtkPct}% · 체력 +${meleeHpPct}%</b></div>
              <div>• 원거리 헌터 현재 보너스: <b style="color:#7dd3fc;">공격력 +${rangedAtkPct}% · 체력 +${rangedHpPct}%</b></div>
            </div>
            <div class="tier-note-card">
              <h4>⚔️ 근접 헌터 보너스 (1,000 상승당)</h4>
              <div>버서커·팔라딘 등 근접 전투 스타일 헌터에게 <b>공격력 +2%</b>, <b>체력 +5%</b>가 1,000 단위마다 중첩 증가합니다.</div>
            </div>
            <div class="tier-note-card">
              <h4>🏹 원거리 헌터 보너스 (1,000 상승당)</h4>
              <div>레인저·소서러 등 원거리 전투 스타일 헌터에게 <b>공격력 +1%</b>, <b>체력 +2%</b>가 1,000 단위마다 중첩 증가합니다.</div>
            </div>
            <div class="tier-note-card">
              <h4>🏗️ 마을 번영도 올리는 방법</h4>
              <div>빈 부지에 신규 시설을 짓거나 기존 건물을 업그레이드하면 건물 레벨과 시설별 번영도 계수에 비례해 번영도가 상승합니다.</div>
            </div>
          </div>
        `;
      } else if (tabKey === 'hunter') {
        body.innerHTML = `
          <div class="tier-note-grid">
            <div class="tier-note-card">
              <h4>🌿 초보 사냥터 & 🌠 윤회의 성역 (환생 전용)</h4>
              마을 동쪽 관문 밖 초보 사냥터는 <b>Lv.1~10 구간 경험치 +50% 보너스</b>, <b>Lv.11~20 구간 기본 경험치</b>를 제공하며, <b>중급 사냥터(안개 협곡) 동쪽 옆</b>에는 <b>1환생 이상 헌터만 입장 가능한 전용 사냥터 [🌠 윤회의 성역]</b>이 위치해 전 레벨(Lv.1~99) 기본 경험치와 윤회 성역의 영혼결정을 드랍합니다.
            </div>
            <div class="tier-note-card">
              <h4>🌟 Lv.99 환생 시스템 (최대 5구슬)</h4>
              헌터가 <b>Lv.99</b>에 도달하면 환생하여 <b>Lv.1로 초기화</b>되며, 영혼 구슬 1개당(최대 5개) <b>모든 기본·전투 능력치가 +25%씩(최대 +125%), 치명타가 +3%씩(최대 +15%)</b> 영구 상승합니다.
            </div>
            <div class="tier-note-card">
              <h4>✨ 초월 환생의 제단 (1환생↑ 전용 최상급 중간보스)</h4>
              고대 수호자의 성소 바로 오른쪽 옆 제단에는 <b>1환생 이상 헌터</b>만 입장할 수 있으며, <b>헌터 상세 패널(✨ 제단 출정)</b> 또는 <b>전체 헌터 목록(✨ 제단출정)</b>에서 유저가 직접 출정을 지시할 수 있습니다. 처치 시 <b>✨ 초월 윤회의 인장(몬스터 피해 +150%)</b>과 고액 골드·경험치·별결정을 획득합니다.
            </div>
            <div class="tier-note-card">
              <h4>⚡ 스킬 숙련도 & 레벨업 (최대 Lv.20)</h4>
              <div style="margin-top:4px;">
                <b style="color:#fca5a5;">🔥 액티브 스킬:</b> 사냥·보스전 등에서 <b>액티브 스킬을 1회 발동할 때마다 숙련도 +1</b>이 누적되어 <b>최대 Lv.20</b>까지 성장하며, 스킬 위력이 상승합니다.
              </div>
              <div style="margin-top:6px;">
                <b style="color:#7dd3fc;">💠 패시브 스킬:</b> 사냥터·던전·보스전에서 <b>몬스터 처치 시 또는 전투 훈련소 수련 시 숙련도 +1</b>이 누적되어 <b>최대 Lv.20</b>까지 성장하며, 공격력·방어력·치명타·마력 등 상시 효과가 강화됩니다.
              </div>
            </div>
            <div class="tier-note-card">
              <h4>💞 헌터 상호작용 & 관계도</h4>
              마을에서 마주친 헌터들은 성격에 따라 격려·후원·경쟁을 벌이며 <b>동맹~숙적</b> 관계도를 형성합니다.
            </div>
            <div class="tier-note-card">
              <h4>🍱 도시락 & 🧪 물약 소지 한도 (환생 헌터 특전)</h4>
              <b>도시락:</b> 미환생 헌터는 <b>Lv.20부터 3개 시작 후 20레벨당 +1개(Lv.99 기준 5개)</b>, <b>1환생 이상 헌터는 레벨과 무관하게 Lv.99 기준(5개) + 환생당 +1개(1환생 6개 ~ 5환생 10개)</b>를 소지합니다.<br/>
              <b>회복 물약:</b> 미환생 헌터는 체력 물약 기본 5개(Lv.40부터 20레벨당 +1개, 최대 8개)·MP 물약 3개이며, <b>1환생 이상 헌터는 레벨과 무관하게 체력 회복 물약 10개 · MP 회복 물약 5개</b>로 확장됩니다.
            </div>
          </div>
        `;
      }
    }
