// [31-building-hp] 🏚️ 건물 체력 (HP) · 파괴
    // ============================================================================
    // - 모든 건물은 레벨마다 체력이 다르다: 최대 체력 = 1,000만 × (레벨 ÷ 10)²
    //     Lv.1 10만 · Lv.3 90만 · Lv.5 250만 · Lv.7 490만 · Lv.10 1,000만
    // - 결투장 · 천공의 섬 게이트는 Lv.1 고정 건물이라 체력 1,000만으로 고정.
    // - 체력이 0이 되면 파괴: 건물이 사라지고 빈 부지가 된다.
    //   마을 회관은 사라지지 않고 Lv.1로 내려가며 체력이 다시 가득 찬다.
    // - 업그레이드하면 체력이 새 최대치로 가득 찬다.
    // - 피해 주기: damageBuilding(건물, 피해량, '원인')  (예: 앞으로 추가될 공성 · 습격 이벤트)
    // - 저장: 18-save-system.js plots[].building.hp · 저장 코드 19-save-code-reset.js plots 4번째 값
    // ============================================================================
    const BUILDING_HP_CFG = {
      hpAtLv10: 10000000,
      fixedHpTypes: ['colosseum', 'sky_island_gate'],
      fixedHp: 10000000
    };

    function getBuildingMaxHp(b) {
      if (!b) return 0;
      if (BUILDING_HP_CFG.fixedHpTypes.includes(b.type)) return BUILDING_HP_CFG.fixedHp;
      const lv = Math.max(1, Math.floor(Number(b.level) || 1));
      return Math.round(BUILDING_HP_CFG.hpAtLv10 * Math.pow(lv / 10, 2));
    }

    // 체력 값 준비 (새 건물 · 레벨이 바뀐 건물은 가득 채움)
    function ensureBuildingHp(b) {
      if (!b) return;
      const max = getBuildingMaxHp(b);
      if (typeof b.hp !== 'number' || !Number.isFinite(b.hp) || b.hpLevel !== b.level) {
        b.hp = max;
        b.hpLevel = b.level;
      }
      b.maxHp = max;
      if (b.hp > max) b.hp = max;
    }

    function findPlotOfBuilding(b) {
      return village.plots.find(p => p.building === b) || null;
    }

    // 파괴된 건물을 목적지로 삼거나 이용 중이던 헌터 정리
    function releaseHuntersFromBuilding(type) {
      hunters.forEach((h) => {
        if (h.targetBuildingType !== type) return;
        h.targetBuildingName = '';
        h.targetBuildingType = '';
        h.facilityStuckTimer = 0;
        if (h.state === 'WALKING' || h.state === 'USING_FACILITY') {
          h.waypoints = [];
          h.state = 'IDLE';
          h.stateTimer = 0.4;
        }
      });
    }

    function destroyBuilding(b, cause = '') {
      const plot = findPlotOfBuilding(b);
      if (!plot) return;
      const causeText = cause ? ` (${cause})` : '';
      if (b.type === 'townhall') {
        b.level = 1;
        b.hpLevel = null;
        ensureBuildingHp(b);
        showToast(`💥 ${b.icon} ${b.name}이(가) 무너져 Lv.1로 내려갔습니다!${causeText}`);
      } else {
        const type = b.type;
        plot.building = null;
        releaseHuntersFromBuilding(type);
        if (gameState.selectedPlotId === plot.id && typeof closeBuildingPanel === 'function') closeBuildingPanel();
        showToast(`💥 ${b.icon} ${b.name}이(가) 파괴되었습니다!${causeText}`);
      }
      updateResourceHUD();
      if (typeof flushSyncBackup === 'function') flushSyncBackup();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
    }

    function damageBuilding(b, amount, cause = '') {
      if (!b || !(amount > 0)) return false;
      ensureBuildingHp(b);
      b.hp = Math.max(0, b.hp - amount);
      if (b.hp <= 0) {
        destroyBuilding(b, cause);
        return true;
      }
      return false;
    }

    function repairBuilding(b, amount = Infinity) {
      if (!b) return;
      ensureBuildingHp(b);
      b.hp = Math.min(b.maxHp, b.hp + amount);
    }

    // ---------- 🔧 골드로 수리 ----------
    // 건물 가치 = 설치 비용 + 현재 레벨까지의 업그레이드 비용 + 단계 해금 비용 (실제로 쓴 골드와 비교해 큰 쪽)
    // 수리 비용 = 건물 가치 × 잃은 체력 비율 × 50%  (완전 수리 = 건물 가치의 절반 · 철거 환급과 같은 비율)
    const BUILDING_REPAIR_RATE = 0.5;

    function getBuildingTotalValue(b) {
      if (!b) return 0;
      let total = b.buildCost || 0;
      const fixed = BUILDING_HP_CFG.fixedHpTypes.includes(b.type);
      if (!fixed) {
        const lv = Math.max(1, Math.floor(Number(b.level) || 1));
        for (let k = 1; k < lv; k++) total += (b.baseUpgradeCost || 0) * k;
        for (let t = 2; t <= lv; t++) total += village.getStageUnlockCost(b, t);
      }
      return Math.max(total, b.investedGold || 0);
    }

    function getBuildingRepairCost(b) {
      if (!b) return 0;
      ensureBuildingHp(b);
      const missing = Math.max(0, b.maxHp - b.hp) / b.maxHp;
      if (missing <= 0) return 0;
      return Math.max(1, Math.ceil(getBuildingTotalValue(b) * missing * BUILDING_REPAIR_RATE));
    }

    function repairBuildingWithGold(b) {
      if (!b) return false;
      const cost = getBuildingRepairCost(b);
      if (cost <= 0) { showToast('🔧 이미 체력이 가득합니다.'); return false; }
      const gold = Math.floor(Number(gameState.gold) || 0);
      if (gold <= 0) { showToast('⚠️ 수리할 골드가 없습니다.'); return false; }
      if (gold >= cost) {
        gameState.gold = gold - cost;
        b.hp = b.maxHp;
        showToast(`🔧 ${b.icon} ${b.name} 완전 수리! (-${formatGold(cost)} G)`);
      } else {
        // 가진 골드만큼만 수리
        const ratio = gold / cost;
        b.hp = Math.min(b.maxHp, b.hp + (b.maxHp - b.hp) * ratio);
        gameState.gold = 0;
        showToast(`🔧 ${b.icon} ${b.name} 일부 수리 (${Math.round(ratio * 100)}% · -${formatGold(gold)} G) · 골드를 모아 마저 수리하세요.`);
      }
      updateResourceHUD();
      renderBuildingHpBox();
      if (typeof flushSyncBackup === 'function') flushSyncBackup();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
      return true;
    }

    document.getElementById('panelHpBox')?.addEventListener('click', (e) => {
      if (!e.target.closest('#btnRepairBuilding')) return;
      const plot = village.plots.find(p => p.id === gameState.selectedPlotId);
      if (plot?.building) repairBuildingWithGold(plot.building);
    });

    // ---------- 화면: 건물 창 체력 줄 · 맵 위 체력 막대(피해 입었을 때만) ----------
    function renderBuildingHpBox() {
      const box = document.getElementById('panelHpBox');
      if (!box) return;
      const plot = village.plots.find(p => p.id === gameState.selectedPlotId);
      const b = plot?.building;
      if (!b) { box.style.display = 'none'; return; }
      ensureBuildingHp(b);
      const pct = Math.max(0, Math.min(100, (b.hp / b.maxHp) * 100));
      const color = pct > 60 ? '#4ade80' : (pct > 30 ? '#facc15' : '#f87171');
      const fixed = BUILDING_HP_CFG.fixedHpTypes.includes(b.type) ? ' (Lv.1 고정 건물)' : '';
      box.style.display = 'block';
      const html = `
        <div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:800;color:#e2e8f0;">
          <span>🏚️ 건물 체력${fixed}</span>
          <span style="color:${color};">${Math.ceil(b.hp).toLocaleString()} / ${b.maxHp.toLocaleString()}</span>
        </div>
        <div style="height:6px;border-radius:4px;background:rgba(15,23,42,0.9);margin-top:4px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${color};"></div>
        </div>
        <div style="font-size:10.5px;color:#94a3b8;margin-top:3px;">체력이 0이 되면 ${b.type === 'townhall' ? '마을 회관은 Lv.1로 내려갑니다' : '건물이 파괴됩니다'}. 업그레이드하면 가득 찹니다.</div>
        ${b.hp < b.maxHp ? (() => {
          const cost = getBuildingRepairCost(b);
          const gold = Math.floor(Number(gameState.gold) || 0);
          const label = gold >= cost ? `🔧 수리 (${formatGold(cost)} G)` : `🔧 가진 골드만큼 수리 (필요 ${formatGold(cost)} G)`;
          return `<button type="button" class="btn-upgrade" id="btnRepairBuilding" style="margin-top:6px;width:100%;background:linear-gradient(135deg,#0ea5e9,#0369a1);" ${gold <= 0 ? 'disabled' : ''}>${label}</button>`;
        })() : ''}
      `;
      // 바뀐 게 있을 때만 다시 그림 (수리 버튼을 누르는 도중 바뀌지 않게)
      if (box.dataset.lastHtml !== html) {
        box.dataset.lastHtml = html;
        box.innerHTML = html;
      }
    }

    if (typeof openPlotPanel === 'function') {
      const origOpenPlotPanel = openPlotPanel;
      openPlotPanel = function (...args) {
        const r = origOpenPlotPanel.apply(this, args);
        try { renderBuildingHpBox(); } catch (_) {}
        return r;
      };
    }

    if (typeof drawVillageGround === 'function') {
      const origDrawGroundForHp = drawVillageGround;
      drawVillageGround = function (ctx, ...rest) {
        const r = origDrawGroundForHp.call(this, ctx, ...rest);
        try {
          village.getAllBuildings().forEach((b) => {
            if (typeof b.hp !== 'number' || !b.maxHp || b.hp >= b.maxHp) return;
            const pct = Math.max(0, b.hp / b.maxHp);
            const w = Math.min(120, b.w || 120);
            const x = b.x - w / 2;
            const y = b.y - (b.h || 90) / 2 - 14;
            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fillRect(x - 1, y - 1, w + 2, 7);
            ctx.fillStyle = pct > 0.6 ? '#4ade80' : (pct > 0.3 ? '#facc15' : '#f87171');
            ctx.fillRect(x, y, w * pct, 5);
            ctx.restore();
          });
        } catch (_) {}
        return r;
      };
    }

    // 새로 지은 건물 · 업그레이드 · 저장 불러오기 후에도 체력이 맞게 주기적으로 확인
    setInterval(() => {
      try {
        village.getAllBuildings().forEach(ensureBuildingHp);
        if (gameState.selectedPlotId && document.getElementById('buildingPanel')?.classList.contains('active')) renderBuildingHpBox();
      } catch (_) {}
    }, 1000);
