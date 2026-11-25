// [39-orc-reinforce] 👹 Lv.99 오크 증원
//   - [👹 오크 토벌] 버튼이 켜진 동안(모든 오크 Lv.99 · 토벌전이 열리지 않은 상태) 10분마다
//     오크 군락지에 Lv.99 오크 2마리(종류 무작위)가 새로 나타난다.
//   - 게임을 꺼 둔 동안에도 같은 규칙으로 쌓인다 (자리 비운 보상과 같이 최대 12시간까지 소급).
//   - 토벌전이 끝나면(승리 · 패배 모두) 증원 오크는 사라지고 시간도 처음부터 다시 잰다.
//   - 저장: gameState.orcReinforce = { timer: 쌓인 초, seq: 번호, extras: [증원 오크 기록] }

    const ORC_REINFORCE_CFG = {
      intervalSec: 600, // 10분마다
      perWave: 2,       // 한 번에 2마리
      maxExtra: 40      // 증원 오크 최대 수 (40마리 = 3시간 20분). 이보다 많으면 오크 군락지를 볼 때 화면이 느려진다. 바꾸려면 이 숫자만 고치면 된다.
    };

    function getOrcReinforceState() {
      if (!gameState.orcReinforce || typeof gameState.orcReinforce !== 'object') {
        gameState.orcReinforce = { timer: 0, seq: 0, extras: [] };
      }
      const s = gameState.orcReinforce;
      s.timer = Math.max(0, Number(s.timer) || 0);
      s.seq = Math.max(0, Math.floor(Number(s.seq) || 0));
      if (!Array.isArray(s.extras)) s.extras = [];
      return s;
    }

    function isOrcReinforceUnit(o) {
      return !!(o && o.isReinforcement);
    }
    function getOrcReinforceUnits() {
      return (ORC_STRONGHOLD_ZONE.orcs || []).filter(isOrcReinforceUnit);
    }

    // 토벌 버튼이 켜지는 조건과 같다
    function isOrcReinforceActive() {
      return ORC_SUBJUGATION.status === 'CLOSED' && areAllOrcsLevel99();
    }

    // 저장된 기록 1개 → 실제 오크
    function buildOrcReinforceUnit(rec) {
      const templates = ORC_STRONGHOLD_ZONE.reinforcementTemplates;
      const tpl = templates[Math.max(0, Math.min(templates.length - 1, rec.tpl || 0))];
      const orc = {
        id: rec.id,
        name: tpl.name,
        role: tpl.role,
        size: tpl.size,
        color: tpl.color,
        horn: tpl.horn,
        isReinforcement: true,
        reinforceTpl: rec.tpl || 0,
        x: rec.x,
        y: rec.y,
        homeX: rec.homeX ?? rec.x,
        homeY: rec.homeY ?? rec.y,
        level: ORC_MAX_LEVEL,
        killCount: Math.max(0, Math.floor(Number(rec.killCount) || 0)),
        monsterKillCount: 0,
        isDead: !!rec.isDead,
        respawnRemainingMs: rec.respawnRemainingMs || 0
      };
      if (typeof rec.hp === 'number' && rec.hp > 0) orc.hp = rec.hp;
      return ensureOrcUnitFields(orc, (ORC_STRONGHOLD_ZONE.orcs || []).length);
    }

    function pickOrcReinforceSpot() {
      const b = ORC_STRONGHOLD_ZONE.bounds;
      return {
        x: Math.round(b.x + 70 + Math.random() * (b.w - 140)),
        y: Math.round(b.y + 90 + Math.random() * (b.h - 150))
      };
    }

    // 증원 오크 n마리 추가 (최대 수까지). 반환: 실제로 늘어난 수
    function spawnOrcReinforcements(n) {
      const st = getOrcReinforceState();
      const room = Math.max(0, ORC_REINFORCE_CFG.maxExtra - getOrcReinforceUnits().length);
      const count = Math.min(room, Math.max(0, Math.floor(n)));
      const templates = ORC_STRONGHOLD_ZONE.reinforcementTemplates;
      for (let i = 0; i < count; i++) {
        st.seq += 1;
        const spot = pickOrcReinforceSpot();
        const orc = buildOrcReinforceUnit({
          id: `orc_rf_${st.seq}`,
          tpl: Math.floor(Math.random() * templates.length),
          x: spot.x, y: spot.y, homeX: spot.x, homeY: spot.y
        });
        ORC_STRONGHOLD_ZONE.orcs.push(orc);
      }
      return count;
    }

    function clearOrcReinforcements() {
      ORC_STRONGHOLD_ZONE.orcs = (ORC_STRONGHOLD_ZONE.orcs || []).filter(o => !isOrcReinforceUnit(o));
      const st = getOrcReinforceState();
      st.timer = 0;
      st.extras = [];
    }

    // 실제 오크 → 저장 기록
    function snapshotOrcReinforcements() {
      const st = getOrcReinforceState();
      st.extras = getOrcReinforceUnits().map(o => ({
        id: o.id,
        tpl: o.reinforceTpl || 0,
        x: Math.round(o.x), y: Math.round(o.y),
        homeX: Math.round(o.homeX ?? o.x), homeY: Math.round(o.homeY ?? o.y),
        hp: Math.round(o.hp || 0),
        isDead: !!o.isDead,
        respawnRemainingMs: Math.round(o.respawnRemainingMs || 0),
        killCount: o.killCount || 0
      }));
      return st;
    }

    // 저장 기록 → 실제 오크 (불러오기 후)
    function restoreOrcReinforcements() {
      ORC_STRONGHOLD_ZONE.orcs = (ORC_STRONGHOLD_ZONE.orcs || []).filter(o => !isOrcReinforceUnit(o));
      const st = getOrcReinforceState();
      st.extras.slice(0, ORC_REINFORCE_CFG.maxExtra).forEach((rec) => {
        if (rec && rec.id) ORC_STRONGHOLD_ZONE.orcs.push(buildOrcReinforceUnit(rec));
      });
    }

    // 시간이 흐른 만큼 증원 (sec: 지난 초). 반환: 늘어난 오크 수
    function advanceOrcReinforceTimer(sec) {
      if (!(sec > 0)) return 0;
      const st = getOrcReinforceState();
      if (!isOrcReinforceActive()) {
        st.timer = 0;
        return 0;
      }
      st.timer += sec;
      let added = 0;
      while (st.timer >= ORC_REINFORCE_CFG.intervalSec) {
        st.timer -= ORC_REINFORCE_CFG.intervalSec;
        added += spawnOrcReinforcements(ORC_REINFORCE_CFG.perWave);
      }
      if (getOrcReinforceUnits().length >= ORC_REINFORCE_CFG.maxExtra) st.timer = 0;
      return added;
    }

    // ---------- 연결 ----------
    // 매 프레임: 시간 재기
    if (typeof stepSimulation === 'function') {
      const origStepForOrcReinforce = stepSimulation;
      stepSimulation = function (dt, ...rest) {
        const r = origStepForOrcReinforce.call(this, dt, ...rest);
        try {
          const added = advanceOrcReinforceTimer(dt);
          if (added > 0) {
            showToast(`👹 오크 군락지에 Lv.99 오크 ${added}마리가 증원되었습니다! (증원 ${getOrcReinforceUnits().length}/${ORC_REINFORCE_CFG.maxExtra}마리)`);
            if (typeof scheduleAutoSave === 'function') scheduleAutoSave(800);
          }
        } catch (_) {}
        return r;
      };
    }

    // 인구 정리(일반 오크 수 맞추기)가 증원 오크를 지우지 않게: 빼 두었다가 다시 붙인다
    if (typeof syncOrcStrongholdPopulation === 'function') {
      const origSyncOrcPop = syncOrcStrongholdPopulation;
      syncOrcStrongholdPopulation = function (...args) {
        const extras = getOrcReinforceUnits();
        ORC_STRONGHOLD_ZONE.orcs = ORC_STRONGHOLD_ZONE.orcs.filter(o => !isOrcReinforceUnit(o));
        const r = origSyncOrcPop.apply(this, args);
        ORC_STRONGHOLD_ZONE.orcs.push(...extras);
        return r;
      };
    }

    // 토벌전이 끝나면 증원 오크는 사라진다
    if (typeof endOrcSubjugationRaid === 'function') {
      const origEndOrcRaid = endOrcSubjugationRaid;
      endOrcSubjugationRaid = function (...args) {
        const r = origEndOrcRaid.apply(this, args);
        try { clearOrcReinforcements(); } catch (_) {}
        return r;
      };
    }

    // 저장: 증원 오크는 일반 오크 목록(orcUnits)에서 빼고 따로 저장
    if (typeof serializeGameSaveData === 'function') {
      const origSerializeForOrcRf = serializeGameSaveData;
      serializeGameSaveData = function (...args) {
        const extras = getOrcReinforceUnits();
        snapshotOrcReinforcements();
        ORC_STRONGHOLD_ZONE.orcs = ORC_STRONGHOLD_ZONE.orcs.filter(o => !isOrcReinforceUnit(o));
        try {
          return origSerializeForOrcRf.apply(this, args);
        } finally {
          ORC_STRONGHOLD_ZONE.orcs.push(...extras);
        }
      };
    }

    // 불러오기: 증원 오크를 다시 세운다
    if (typeof applyLoadedSaveData === 'function') {
      const origApplyForOrcRf = applyLoadedSaveData;
      applyLoadedSaveData = function (...args) {
        ORC_STRONGHOLD_ZONE.orcs = (ORC_STRONGHOLD_ZONE.orcs || []).filter(o => !isOrcReinforceUnit(o));
        const r = origApplyForOrcRf.apply(this, args);
        try { restoreOrcReinforcements(); } catch (_) {}
        return r;
      };
    }

    // 전체 초기화: 증원 오크도 지운다
    if (typeof resetAllGameProgress === 'function') {
      const origResetForOrcRf = resetAllGameProgress;
      resetAllGameProgress = async function (...args) {
        try { clearOrcReinforcements(); } catch (_) {}
        return origResetForOrcRf.apply(this, args);
      };
    }

    // 게임을 꺼 둔 동안: 최대 12시간까지 소급해서 증원
    (function hookOrcReinforceOffline() {
      const orig = window.grantOfflineRewardsForSeconds;
      if (typeof orig !== 'function') return;
      window.grantOfflineRewardsForSeconds = function (awaySec, ...rest) {
        const wasActive = (() => { try { return isOrcReinforceActive(); } catch (_) { return false; } })();
        const result = orig.call(this, awaySec, ...rest);
        try {
          const cfg = typeof OFFLINE_REWARD_CFG !== 'undefined' ? OFFLINE_REWARD_CFG : { minSeconds: 60, maxSeconds: 12 * 3600 };
          const sec = Math.max(0, Number(awaySec) || 0);
          // 꺼 두기 전부터 토벌 버튼이 켜져 있었을 때만 그 시간 전체를 센다
          if (wasActive && sec >= cfg.minSeconds) {
            const added = advanceOrcReinforceTimer(Math.min(cfg.maxSeconds, sec));
            if (added > 0) {
              setTimeout(() => showToast(`👹 자리를 비운 동안 오크 군락지에 Lv.99 오크 ${added}마리가 증원되었습니다! (증원 ${getOrcReinforceUnits().length}/${ORC_REINFORCE_CFG.maxExtra}마리)`), 2500);
            }
          }
        } catch (_) {}
        return result;
      };
    })();

    getOrcReinforceState();
