// [24-offline-rewards] 자리 비운 동안 보상 (게임이 꺼져 있던 시간 소급 지급)
    // ============================================================================
    // - 플레이 중 최근 약 30분 동안의 '초당 수입'을 계속 잰다.
    //     · 마을 금고 골드: 금고에 들어온 돈을 들어오는 순간 모두 센다 (같은 순간 돈을 써도 수입은 그대로 잡힘)
    //       (저장 불러오기 · 우편 보상 · 이 보상 지급처럼 '버는 돈'이 아닌 것은 제외)
    //     · 헌터별 경험치 · 헌터별 개인 골드 (늘어난 양만) · 헌터별 장비조각 (주운 양)
    // - 재어 둔 수입은 저장 데이터에 함께 저장된다 (이 기기 저장 · 저장 코드 · 클라우드).
    // - 게임을 다시 켜면 '지금 시각 - 마지막 저장 시각'만큼을 최대 12시간까지 인정하고,
    //   초당 수입 × 시간 × 80%를 한 번에 지급한 뒤 보상 창으로 알려 준다.
    // - 게임을 켜 둔 채 백그라운드에 오래 두었을 때도, 기존 10분 소급 진행을 넘는 시간은 같은 방식으로 지급한다.
    // - Lv.99에 닿은 헌터는 환생소가 있으면 환생(자동 전직)하고 남은 시간만큼 이어서 성장한다 (grantHunterOfflineExp).
    // - 보스 레이드 · 오크 토벌 · 결투장 · 장비 강화 · 헌터 위치/상태는 소급하지 않는다.
    // ============================================================================
    const OFFLINE_REWARD_CFG = {
      maxSeconds: 12 * 3600,   // 최대 인정 시간 12시간
      efficiency: 0.8,         // 실제 플레이의 80%
      minSeconds: 60,          // 1분 미만은 지급하지 않음
      minMeasuredSeconds: 60,  // 수입을 1분 이상 재야 지급
      windowSeconds: 1800      // 최근 약 30분 기준으로 수입 계산
    };

    // 수입 측정값: total(최근 가중 합계) / time(최근 가중 시간) = 초당 수입
    const OfflineIncome = {
      gold: { total: 0, time: 0 },
      hunters: new Map(),      // id → { exp: {total,time}, gold: {total,time} }
      pendingExp: new Map(),   // 다음 측정 때까지 쌓인 헌터 경험치
      lastGold: null,
      lastHunterGold: new Map(),
      lastTickAt: 0,
      suppressExp: 0,          // 보상 지급 중에는 경험치 측정 제외
      orcs: new Map(),         // 오크 id → {total,time} 초당 처치 수 (오프라인 오크 레벨업용)
      pendingOrcKills: new Map(),
      pendingGold: 0,          // 다음 측정 때까지 금고에 들어온 골드
      suppressGold: 0,         // 1 이상이면 금고 증가를 수입으로 세지 않음 (불러오기 · 우편 · 보상 지급)
      pendingFrag: new Map()   // 헌터 인벤토리 → 다음 측정 때까지 주운 장비조각
    };

    function getOfflineHunterBucket(id) {
      let b = OfflineIncome.hunters.get(id);
      if (!b) {
        b = { exp: { total: 0, time: 0 }, gold: { total: 0, time: 0 }, frag: { total: 0, time: 0 } };
        OfflineIncome.hunters.set(id, b);
      }
      return b;
    }

    function addIncomeSample(bucket, amount, dt, decay) {
      bucket.total = bucket.total * decay + Math.max(0, amount);
      bucket.time = bucket.time * decay + dt;
    }

    function getIncomeRate(bucket) {
      return bucket && bucket.time > 0 ? bucket.total / bucket.time : 0;
    }

    // 지금 값을 기준점으로 다시 잡는다 (저장 불러오기 · 보상 지급 직후 큰 변화가 수입으로 잡히지 않게)
    function resetOfflineIncomeBaselines() {
      OfflineIncome.lastGold = Number(gameState.gold) || 0;
      OfflineIncome.lastHunterGold = new Map();
      hunters.forEach(h => OfflineIncome.lastHunterGold.set(h.id, Number(h.personalGold) || 0));
      OfflineIncome.pendingGold = 0;
      OfflineIncome.pendingFrag = new Map();
      OfflineIncome.pendingExp = new Map();
      OfflineIncome.lastTickAt = Date.now();
    }

    // 헌터 경험치 획득을 가로채어 측정 (기능은 그대로)
    (function hookHunterExpGain() {
      if (typeof Hunter === 'undefined' || !Hunter.prototype.gainExp) return;
      const origGainExp = Hunter.prototype.gainExp;
      Hunter.prototype.gainExp = function (amount) {
        if (OfflineIncome.suppressExp <= 0) {
          const gain = Math.max(0, Math.round(amount || 0));
          if (gain > 0) {
            OfflineIncome.pendingExp.set(this.id, (OfflineIncome.pendingExp.get(this.id) || 0) + gain);
          }
        }
        return origGainExp.call(this, amount);
      };
    })();

    // 오크 처치 수 측정 (오프라인 동안 오크도 레벨업)
    (function hookOrcKillGain() {
      if (typeof registerOrcKill !== 'function') return;
      const origRegister = registerOrcKill;
      registerOrcKill = function (orc, ...rest) {
        if (orc && orc.id && OfflineIncome.suppressExp <= 0) {
          OfflineIncome.pendingOrcKills.set(orc.id, (OfflineIncome.pendingOrcKills.get(orc.id) || 0) + 1);
        }
        return origRegister.call(this, orc, ...rest);
      };
    })();

    // 마을 금고에 돈이 들어오는 순간을 센다 (gameState.gold 값이 커질 때마다 · 줄어드는 건 지출이라 무시)
    (function trackVillageGoldIncome() {
      let current = gameState.gold;
      Object.defineProperty(gameState, 'gold', {
        configurable: true,
        enumerable: true,
        get() { return current; },
        set(v) {
          const before = Number(current) || 0;
          const after = Number(v);
          if (Number.isFinite(after) && after > before && OfflineIncome.suppressGold <= 0) {
            OfflineIncome.pendingGold += after - before;
          }
          current = v;
        }
      });
    })();

    // 헌터가 장비조각을 주울 때마다 센다 (인벤토리별)
    (function trackFragmentPickup() {
      if (typeof HunterInventory === 'undefined' || !HunterInventory.prototype.addItem) return;
      const origAdd = HunterInventory.prototype.addItem;
      HunterInventory.prototype.addItem = function (id, qty = 1, ...rest) {
        if (id === 'equip_fragment' && OfflineIncome.suppressExp <= 0) {
          const n = Math.max(0, Math.floor(Number(qty) || 0));
          if (n > 0) OfflineIncome.pendingFrag.set(this, (OfflineIncome.pendingFrag.get(this) || 0) + n);
        }
        return origAdd.call(this, id, qty, ...rest);
      };
    })();

    // 1초마다 수입 측정
    function sampleOfflineIncome() {
      if (typeof isStorageReady !== 'undefined' && !isStorageReady) return;
      const now = Date.now();
      if (!OfflineIncome.lastTickAt || OfflineIncome.lastGold === null) {
        resetOfflineIncomeBaselines();
        return;
      }
      const dt = (now - OfflineIncome.lastTickAt) / 1000;
      if (dt <= 0) return;
      // 30분 넘게 측정이 끊겼으면(절전·잠자기 등) 기준점만 다시 잡는다
      if (dt > OFFLINE_REWARD_CFG.windowSeconds) {
        resetOfflineIncomeBaselines();
        return;
      }
      const decay = Math.exp(-dt / OFFLINE_REWARD_CFG.windowSeconds);

      addIncomeSample(OfflineIncome.gold, OfflineIncome.pendingGold, dt, decay); // 이번 1초 동안 금고에 들어온 골드
      OfflineIncome.pendingGold = 0;
      OfflineIncome.lastGold = Number(gameState.gold) || 0;

      const alive = new Set();
      hunters.forEach((h) => {
        alive.add(h.id);
        const b = getOfflineHunterBucket(h.id);
        addIncomeSample(b.exp, OfflineIncome.pendingExp.get(h.id) || 0, dt, decay);
        const pg = Number(h.personalGold) || 0;
        const prev = OfflineIncome.lastHunterGold.has(h.id) ? OfflineIncome.lastHunterGold.get(h.id) : pg;
        addIncomeSample(b.gold, pg - prev, dt, decay);
        OfflineIncome.lastHunterGold.set(h.id, pg);
        if (!b.frag) b.frag = { total: 0, time: 0 };
        addIncomeSample(b.frag, (h.inventory && OfflineIncome.pendingFrag.get(h.inventory)) || 0, dt, decay);
      });
      // 떠난(추방된) 헌터 기록 정리
      Array.from(OfflineIncome.hunters.keys()).forEach((id) => {
        if (!alive.has(id)) OfflineIncome.hunters.delete(id);
      });
      if (typeof ORC_STRONGHOLD_ZONE !== 'undefined') {
        ORC_STRONGHOLD_ZONE.orcs.forEach((o) => {
          if (!o || !o.id) return;
          let ob = OfflineIncome.orcs.get(o.id);
          if (!ob) { ob = { total: 0, time: 0 }; OfflineIncome.orcs.set(o.id, ob); }
          addIncomeSample(ob, OfflineIncome.pendingOrcKills.get(o.id) || 0, dt, decay);
        });
      }
      OfflineIncome.pendingFrag = new Map();
      OfflineIncome.pendingOrcKills = new Map();
      OfflineIncome.pendingExp = new Map();
      OfflineIncome.lastTickAt = now;
    }

    // ---------- 저장 / 불러오기 ----------
    function getOfflineRatesForSave() {
      const r2 = (v) => Math.round(v * 100) / 100;
      return {
        goldPerSec: r2(getIncomeRate(OfflineIncome.gold)),
        measuredSec: Math.round(OfflineIncome.gold.time),
        hunters: Array.from(OfflineIncome.hunters.entries()).map(([id, b]) => ({
          id,
          expPerSec: r2(getIncomeRate(b.exp)),
          goldPerSec: r2(getIncomeRate(b.gold)),
          fragPerSec: Math.round(getIncomeRate(b.frag) * 10000) / 10000
        }))
        ,orcs: Array.from(OfflineIncome.orcs.entries()).map(([id, ob]) => ({
          id,
          killsPerSec: Math.round(getIncomeRate(ob) * 10000) / 10000
        }))
      };
    }

    function restoreOfflineRates(rates) {
      OfflineIncome.gold = { total: 0, time: 0 };
      OfflineIncome.orcs = new Map();
      OfflineIncome.hunters = new Map();
      if (rates && typeof rates === 'object') {
        const t = Math.max(0, Number(rates.measuredSec) || 0);
        (Array.isArray(rates.orcs) ? rates.orcs : []).forEach((orr) => {
          if (!orr || !orr.id) return;
          OfflineIncome.orcs.set(orr.id, { total: (Number(orr.killsPerSec) || 0) * t, time: t });
        });
        OfflineIncome.gold = { total: (Number(rates.goldPerSec) || 0) * t, time: t };
        (Array.isArray(rates.hunters) ? rates.hunters : []).forEach((hr) => {
          if (!hr || hr.id === undefined) return;
          OfflineIncome.hunters.set(hr.id, {
            exp: { total: (Number(hr.expPerSec) || 0) * t, time: t },
            gold: { total: (Number(hr.goldPerSec) || 0) * t, time: t },
            frag: { total: (Number(hr.fragPerSec) || 0) * t, time: t }
          });
        });
      }
      resetOfflineIncomeBaselines();
    }

    // 저장을 불러올 때마다 수입 기록도 그 저장의 것으로 맞춘다
    (function hookSaveLoad() {
      const origApply = applyLoadedSaveData;
      applyLoadedSaveData = function (rawData, ...rest) {
        OfflineIncome.suppressGold += 1; // 불러온 금고 금액은 수입이 아님
        let result;
        try {
          result = origApply.call(this, rawData, ...rest);
        } finally {
          OfflineIncome.suppressGold -= 1;
        }
        try {
          const norm = normalizeAndMigrateSaveData(rawData);
          restoreOfflineRates(norm ? norm.offlineRates : null);
        } catch (_) {
          resetOfflineIncomeBaselines();
        }
        return result;
      };
    })();

    // ---------- 보상 계산 · 지급 ----------
    function formatAwayDuration(sec) {
      const s = Math.max(0, Math.floor(sec));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      if (h > 0) return `${h}시간 ${m}분`;
      return `${Math.max(1, m)}분`;
    }

    // ---------- 자리 비운 동안 경험치 → Lv.99를 넘으면 환생까지 ----------
    // - 헌터의 초당 경험치(rate)로 sec초만큼 준다. Lv.99에 닿으면 남은 시간을 계산하고,
    //   마을에 환생소가 있고 5환생 미만이면 환생(성격 기준 자동 전직)한 뒤 남은 시간으로 이어서 올린다.
    // - 환생하면 필요 경험치가 배수만큼 커지고(REBIRTH_REQUIRED_EXP_MULT) 실제 플레이에서도 더 좋은 사냥터로 가므로,
    //   속도를 그 비율만큼 키워 방금 마친 환생 한 바퀴와 비슷한 시간이 걸리게 한다.
    //   5환생 한 바퀴는 원래 약 하루(4환생까지의 한 바퀴의 약 5배)로 맞춰져 있어 5배 느리게 한다.
    // - 환생소가 없거나 5환생이면 예전처럼 Lv.99에서 멈춘다.
    const OFFLINE_REBIRTH_CYCLE_SLOWDOWN = { 5: 5 }; // 환생 단계별: 한 바퀴가 이전 바퀴보다 몇 배 오래 걸리는지

    function getRequiredExpFor(level, rebirthCount) {
      const base = Math.round(80 + Math.pow(level, 1.35) * 18);
      const rb = Math.max(0, Math.min(LEVEL_REBIRTH_CONFIG.maxRebirths, Number(rebirthCount) || 0));
      return Math.round(base * (REBIRTH_REQUIRED_EXP_MULT[rb] ?? 1));
    }

    function getExpToMaxLevel(h) {
      const max = LEVEL_REBIRTH_CONFIG.maxLevel;
      if (h.level >= max) return 0;
      let need = Math.max(0, h.getRequiredExp() - (h.exp || 0));
      for (let lv = h.level + 1; lv < max; lv++) need += getRequiredExpFor(lv, h.rebirthCount);
      return need;
    }

    function grantHunterOfflineExp(h, rate, sec) {
      const max = LEVEL_REBIRTH_CONFIG.maxLevel;
      const hall = village.getAllBuildings().find(b => b.type === 'rebirth_hall') || null;
      let left = sec;
      let r = rate;
      let gained = 0;
      const rebirths = [];
      for (let guard = 0; guard < 12 && left > 0.5 && r > 0; guard++) {
        if (h.level >= max) {
          if (!hall || h.rebirthCount >= LEVEL_REBIRTH_CONFIG.maxRebirths) break;
          const fromRb = h.rebirthCount;
          const oldMult = REBIRTH_REQUIRED_EXP_MULT[fromRb] ?? 1;
          const origToast = showToast;
          showToast = () => {}; // 보상 창에 한꺼번에 보여 준다
          let ok = false;
          try { ok = h.performRebirth(hall); } finally { showToast = origToast; }
          if (!ok) break;
          rebirths.push({ name: h.name, from: fromRb, to: h.rebirthCount, job: h.currentJobName || h.job });
          // 다음 환생 한 바퀴도 방금 바퀴와 비슷한 시간이 걸리도록: 필요 경험치가 커진 만큼 속도도 키운다
          // (5환생은 원래 한 바퀴가 약 하루로 맞춰져 있어 그만큼 느리게 · OFFLINE_REBIRTH_CYCLE_SLOWDOWN)
          const newMult = REBIRTH_REQUIRED_EXP_MULT[h.rebirthCount] ?? oldMult;
          r = r * (newMult / oldMult) / (OFFLINE_REBIRTH_CYCLE_SLOWDOWN[h.rebirthCount] || 1);
          continue;
        }
        const need = getExpToMaxLevel(h);
        const can = r * left;
        if (can < need) {
          h.gainExp(Math.floor(can));
          gained += can;
          left = 0;
        } else {
          h.gainExp(Math.ceil(need));
          gained += need;
          left -= need / r;
        }
      }
      return { exp: Math.floor(gained), rebirths, rateAfter: r };
    }

    // awaySec 동안의 보상을 지급하고 내역을 돌려준다 (지급할 게 없으면 null)
    function grantOfflineRewardsForSeconds(awaySec, reason = 'closed') {
      const cfg = OFFLINE_REWARD_CFG;
      if (!Number.isFinite(awaySec) || awaySec < cfg.minSeconds) return null;
      if (OfflineIncome.gold.time < cfg.minMeasuredSeconds) return null;
      const counted = Math.min(cfg.maxSeconds, awaySec);
      const factor = counted * cfg.efficiency;

      const villageGold = Math.floor(getIncomeRate(OfflineIncome.gold) * factor);
      let hunterGold = 0;
      let hunterExp = 0;
      let hunterFrag = 0;
      const levelUps = [];
      const rebirths = [];
      OfflineIncome.suppressExp += 1; // 지급하는 경험치 · 장비조각 · 골드는 수입으로 세지 않음
      OfflineIncome.suppressGold += 1;
      try {
        hunters.forEach((h) => {
          const b = OfflineIncome.hunters.get(h.id);
          if (!b) return;
          const exp = Math.floor(getIncomeRate(b.exp) * factor);
          const pg = Math.floor(getIncomeRate(b.gold) * factor);
          const frag = Math.floor(getIncomeRate(b.frag) * factor);
          if (frag > 0 && h.inventory) {
            h.inventory.addItem('equip_fragment', frag);
            hunterFrag += frag;
          }
          if (pg > 0) {
            h.personalGold = (Number(h.personalGold) || 0) + pg;
            hunterGold += pg;
          }
          if (exp > 0) {
            const lvBefore = h.level;
            const res = grantHunterOfflineExp(h, getIncomeRate(b.exp), factor); // Lv.99를 넘으면 환생까지
            hunterExp += res.exp;
            if (res.rebirths.length > 0) {
              rebirths.push(...res.rebirths);
              // 환생 뒤 경험치 속도로 측정값도 맞춘다 (다음에 자리 비울 때 기준)
              const ratio = res.rateAfter / Math.max(1e-9, getIncomeRate(b.exp));
              b.exp.total *= ratio;
            } else if (h.level > lvBefore) {
              levelUps.push({ name: h.name, from: lvBefore, to: h.level });
            }
          }
        });
        if (villageGold > 0) gameState.gold = (Number(gameState.gold) || 0) + villageGold;
      } finally {
        OfflineIncome.suppressExp -= 1;
        OfflineIncome.suppressGold -= 1;
      }
      resetOfflineIncomeBaselines();

      // 오크도 꺼져 있던 동안 사냥한 만큼(처치 수 × 80%) 레벨업 (최대 Lv.99 · 토벌전 중이면 제외)
      const orcLevelUps = [];
      let orcKills = 0;
      if (typeof ORC_STRONGHOLD_ZONE !== 'undefined' && !(typeof isOrcSubjugationInProgress === 'function' && isOrcSubjugationInProgress())) {
        ORC_STRONGHOLD_ZONE.orcs.forEach((o) => {
          const ob = o && o.id ? OfflineIncome.orcs.get(o.id) : null;
          if (!ob) return;
          const kills = Math.floor(getIncomeRate(ob) * factor);
          if (kills <= 0) return;
          ensureOrcUnitFields(o);
          const lvBefore = o.level || 1;
          o.monsterKillCount = (o.monsterKillCount || 0) + kills;
          o.totalKillCount = (o.killCount || 0) + o.monsterKillCount;
          o.level = computeOrcLevelFromTotalKills(o.totalKillCount);
          o.nextLevelKills = getOrcNextLevelKillTarget(o.level);
          o.maxHp = getOrcCombatStats(o).maxHp;
          if (!o.isDead) o.hp = o.maxHp;
          orcKills += kills;
          if (o.level > lvBefore) orcLevelUps.push({ name: o.name, from: lvBefore, to: o.level });
        });
        if (orcLevelUps.length > 0 && typeof updateBossRaidHudButton === 'function') updateBossRaidHudButton();
      }

      if (villageGold <= 0 && hunterGold <= 0 && hunterExp <= 0 && hunterFrag <= 0 && orcKills <= 0) return null;
      const result = { awaySec, counted, villageGold, hunterGold, hunterExp, hunterFrag, levelUps, rebirths, orcKills, orcLevelUps, reason };
      try {
        updateResourceHUD();
        refreshHunterPanel?.();
      } catch (_) {}
      if (typeof saveProgressToStorage === 'function') saveProgressToStorage(false);
      showOfflineRewardModal(result);
      return result;
    }

    // 저장 데이터를 불러온 직후: 그 저장 시각부터 지금까지 꺼져 있던 시간만큼 지급
    function grantOfflineRewardsForLoadedSave(saveData, reason = 'closed') {
      const savedAt = Number(saveData?.savedAt) || 0;
      if (!savedAt) return null;
      const awaySec = (Date.now() - savedAt) / 1000;
      return (window.grantOfflineRewardsForSeconds || grantOfflineRewardsForSeconds)(awaySec, reason); // 다른 파일이 덧붙인 보상(왕국 병력 경험치 등)도 함께
    }

    // ---------- 보상 창 ----------
    function showOfflineRewardModal(r) {
      const backdrop = document.getElementById('offlineRewardBackdrop');
      const body = document.getElementById('offlineRewardBody');
      if (!backdrop || !body) {
        showToast(`🌙 자리 비운 동안 +${formatGold(r.villageGold)} G`);
        return;
      }
      const capped = r.awaySec > r.counted;
      const orcText = (r.orcKills || 0) > 0
        ? `<div style="font-size:11.5px;color:#fca5a5;">👹 오크 처치 +${r.orcKills.toLocaleString()}${(r.orcLevelUps || []).length > 0 ? ` · 레벨 업: ${r.orcLevelUps.slice(0, 4).map(l => `${l.name} Lv.${l.from}→${l.to}`).join(' · ')}${r.orcLevelUps.length > 4 ? ` 외 ${r.orcLevelUps.length - 4}마리` : ''}` : ''}</div>`
        : '';
      const rbList = r.rebirths || [];
      const rbText = rbList.length > 0
        ? `<div style="font-size:11.5px;color:#f0abfc;font-weight:700;">⛩️ 환생: ${rbList.slice(0, 5).map(x => `${x.name} ${x.from}→${x.to}환생 [${x.job}]`).join(' · ')}${rbList.length > 5 ? ` 외 ${rbList.length - 5}회` : ''}</div>`
        : '';
      const lvText = r.levelUps.length > 0
        ? `<div style="font-size:11.5px;color:#fde047;">🆙 레벨 업: ${r.levelUps.slice(0, 6).map(l => `${l.name} Lv.${l.from}→${l.to}`).join(' · ')}${r.levelUps.length > 6 ? ` 외 ${r.levelUps.length - 6}명` : ''}</div>`
        : '';
      body.innerHTML = `
        <div style="font-size:12.5px;color:#cbd5e1;line-height:1.55;">
          ${r.reason === 'background' ? '게임을 켜 둔 채 자리를 비운' : '게임을 끄고 자리를 비운'} 시간:
          <b style="color:#f8fafc;">${formatAwayDuration(r.awaySec)}</b>
          ${capped ? `<br/><span style="color:#94a3b8;font-size:11.5px;">(최대 12시간까지만 인정)</span>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;background:rgba(15,23,42,0.72);padding:10px 12px;border-radius:10px;">
          <div style="font-size:13px;color:#fde047;font-weight:800;">💰 마을 금고 +${formatGold(r.villageGold)} G</div>
          <div style="font-size:12.5px;color:#86efac;font-weight:700;">⭐ 헌터 경험치 합계 +${r.hunterExp.toLocaleString()}</div>
          <div style="font-size:12.5px;color:#bae6fd;font-weight:700;">👛 헌터 개인 골드 합계 +${formatGold(r.hunterGold)} G</div>
          <div style="font-size:12.5px;color:#c4b5fd;font-weight:700;">🧩 헌터 장비조각 합계 +${(r.hunterFrag || 0).toLocaleString()}개</div>
          ${rbText}
          ${lvText}
          ${orcText}
        </div>
        <div style="font-size:11px;color:#94a3b8;line-height:1.5;">최근 플레이의 시간당 수입 × ${formatAwayDuration(r.counted)} × 80%로 계산했습니다.<br/>Lv.99에 닿은 헌터는 환생소가 있으면 환생하고 남은 시간만큼 이어서 성장합니다. 오크도 꺼져 있던 동안 사냥한 만큼 레벨이 오릅니다. 보스 · 오크 토벌 · 결투장 · 장비 강화는 소급되지 않습니다.</div>
      `;
      backdrop.classList.add('open');
    }

    (function bindOfflineRewardControls() {
      const close = () => document.getElementById('offlineRewardBackdrop')?.classList.remove('open');
      document.getElementById('btnCloseOfflineReward')?.addEventListener('click', close);
      document.getElementById('btnConfirmOfflineReward')?.addEventListener('click', close);
      document.getElementById('offlineRewardBackdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'offlineRewardBackdrop') close();
      });
      setInterval(sampleOfflineIncome, 1000);
    })();

    window.grantOfflineRewardsForLoadedSave = grantOfflineRewardsForLoadedSave;
    window.grantOfflineRewardsForSeconds = grantOfflineRewardsForSeconds;
