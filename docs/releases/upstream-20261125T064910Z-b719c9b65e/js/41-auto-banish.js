// [41-auto-banish] 🤖 헌터 자동 추방
//   - 마을 전체 헌터 목록의 [🤖 자동 추방] 버튼을 누르면 슬롯 칸이 열린다.
//   - 슬롯 수 = 최대 10칸, 마을 헌터 수보다 많을 수 없다.
//   - 슬롯에 넣은 헌터가 5환생 Lv.99가 되면 자동으로 추방(5환생 Lv.99 추방 보상 그대로)하고,
//     새 헌터를 영입해 같은 슬롯에 넣는다 (영입 비용 200G).
//   - 슬롯 맨 위 [보호 등급]: 그 등급 이상인 헌터는 추방하지 않는다.
//     슬롯 헌터의 등급이 보이게 되었을 때(5환생) 보호 등급 이상이면 그 슬롯은 자동으로 잠긴다.
//     잠긴 슬롯은 유저가 직접 [빼기] 하거나 [🚪 추방] 해야 한다.
//   - 🔒 잠금(js/38-hunter-lock.js)한 헌터는 슬롯에 넣을 수 없고, 잠긴 채라면 추방하지 않는다.
//   - 저장: gameState.autoBanish = { minGrade: 'S', slots: [{ id, locked }] }

    const AUTO_BANISH_CFG = {
      maxSlots: 10,
      defaultMinGrade: 'S', // 처음 보호 등급 (S 이상은 추방 안 함)
      checkEverySec: 1
    };

    function getAutoBanishState() {
      if (!gameState.autoBanish || typeof gameState.autoBanish !== 'object') {
        gameState.autoBanish = { minGrade: AUTO_BANISH_CFG.defaultMinGrade, slots: [] };
      }
      const s = gameState.autoBanish;
      if (typeof s.minGrade !== 'string' || (s.minGrade && !HUNTER_GRADE_BY_ID[s.minGrade])) s.minGrade = AUTO_BANISH_CFG.defaultMinGrade;
      if (!Array.isArray(s.slots)) s.slots = [];
      // 슬롯 객체는 새로 만들지 않고 그 자리에서 정리한다 (다른 곳이 들고 있는 슬롯과 같은 것이어야 함)
      for (let i = 0; i < s.slots.length; i++) {
        const x = s.slots[i];
        if (!x || typeof x !== 'object') { s.slots[i] = { id: null, locked: false }; continue; }
        if (typeof x.id !== 'string' || !x.id) x.id = null;
        x.locked = !!x.locked;
      }
      return s;
    }

    function getAutoBanishSlotCount() {
      return Math.max(0, Math.min(AUTO_BANISH_CFG.maxSlots, hunters.length));
    }

    // 슬롯 수를 지금 헌터 수에 맞추고, 떠난 헌터는 슬롯에서 뺀다
    function normalizeAutoBanishSlots() {
      const st = getAutoBanishState();
      const n = getAutoBanishSlotCount();
      while (st.slots.length < n) st.slots.push({ id: null, locked: false });
      if (st.slots.length > n) st.slots.length = n;
      const seen = new Set();
      st.slots.forEach((slot) => {
        const h = slot.id ? hunters.find(x => x.id === slot.id) : null;
        if (!h || seen.has(slot.id)) { slot.id = null; slot.locked = false; }
        else seen.add(slot.id);
      });
      return st;
    }

    function getGradeIndex(id) {
      const i = HUNTER_GRADES.findIndex(g => g.id === id);
      return i < 0 ? 999 : i; // 0 = EX+ (가장 높음)
    }

    // 보호 등급 이상인가? (등급이 보일 때만 판단)
    function isAutoBanishProtected(h) {
      const st = getAutoBanishState();
      if (!st.minGrade || !h || !isHunterGradeVisible(h)) return false;
      return getGradeIndex(getHunterGrade(h).id) <= getGradeIndex(st.minGrade);
    }

    function isBigBattleRunning() {
      try {
        return (typeof isOrcSubjugationInProgress === 'function' && isOrcSubjugationInProgress())
          || (typeof BOSS_SANCTUM !== 'undefined' && BOSS_SANCTUM.status !== 'CLOSED');
      } catch (_) { return false; }
    }

    // 1초마다: 등급 보호 잠금 · 자동 추방 + 영입
    function processAutoBanish() {
      const st = normalizeAutoBanishSlots();
      let changed = false;
      for (let i = 0; i < st.slots.length; i++) {
        const slot = st.slots[i];
        if (!slot.id || slot.locked) continue;
        const h = hunters.find(x => x.id === slot.id);
        if (!h) continue;

        // 등급이 보이게 되었고 보호 등급 이상 → 슬롯 잠금
        if (isAutoBanishProtected(h)) {
          slot.locked = true;
          changed = true;
          showToast(`🔒 자동 추방 ${i + 1}번 슬롯: '${h.name}' 헌터는 ${getHunterGrade(h).id}등급이라 추방하지 않고 슬롯을 잠갔습니다.`);
          continue;
        }

        if ((h.rebirthCount || 0) < LEVEL_REBIRTH_CONFIG.maxRebirths || (h.level || 1) < LEVEL_REBIRTH_CONFIG.maxLevel) continue;
        if (h.locked) continue;              // 🔒 잠긴 헌터는 추방 안 함
        if (isBigBattleRunning()) continue;  // 보스 레이드 · 오크 토벌 중에는 끝난 뒤에

        const name = h.name;
        const before = new Set(hunters.map(x => x.id));
        banishHunterById(h.id);
        if (hunters.some(x => x.id === slot.id)) continue; // 추방이 막혔으면 그대로 둔다
        slot.id = null;
        slot.locked = false;
        changed = true;
        recruitNewHunter();
        const newcomer = hunters.find(x => !before.has(x.id));
        if (newcomer) slot.id = newcomer.id;
        showToast(`🤖 자동 추방: '${name}' (5환생 Lv.99) 추방${newcomer ? ` → '${newcomer.name}' 영입, ${i + 1}번 슬롯에 넣었습니다` : ' · 새 헌터는 영입하지 못했습니다 (골드 또는 정원 부족)'}`);
      }
      if (changed) {
        renderAutoBanishPanel(true);
        if (typeof scheduleAutoSave === 'function') scheduleAutoSave(400);
      }
    }

    // ---------- 화면 ----------
    let autoBanishPanelKey = '';

    function getAutoBanishSlotStateText(h, slot) {
      if (!h) return '비어 있음';
      const gradeTag = isHunterGradeVisible(h) ? `${getHunterGrade(h).id}등급 · ` : '';
      if (slot.locked) return `🔒 ${gradeTag}보호 등급이라 자동 추방 안 함`;
      if (h.locked) return `🔒 잠긴 헌터라 추방 안 함`;
      const rb = h.rebirthCount || 0;
      if (rb >= LEVEL_REBIRTH_CONFIG.maxRebirths && h.level >= LEVEL_REBIRTH_CONFIG.maxLevel) {
        return isBigBattleRunning() ? `${gradeTag}5환생 Lv.99 · 전투가 끝나면 추방` : `${gradeTag}5환생 Lv.99 · 곧 추방`;
      }
      return `${gradeTag}${rb}환생 Lv.${h.level} → 5환생 Lv.99에 추방`;
    }

    function renderAutoBanishPanel(force = false) {
      const box = document.getElementById('autoBanishPanel');
      if (!box || box.hidden) return;
      const st = normalizeAutoBanishSlots();
      const key = JSON.stringify([st.minGrade, st.slots, hunters.map(h => `${h.id}:${h.name}:${h.locked ? 1 : 0}`)]);

      if (!force && key === autoBanishPanelKey) {
        // 구성은 그대로 → 상태 글자만 바꾼다 (펼쳐 둔 선택 상자가 닫히지 않게)
        st.slots.forEach((slot, i) => {
          const el = box.querySelector(`[data-ab-state="${i}"]`);
          if (!el) return;
          const text = getAutoBanishSlotStateText(slot.id ? hunters.find(x => x.id === slot.id) : null, slot);
          if (el.textContent !== text) el.textContent = text;
        });
        return;
      }
      autoBanishPanelKey = key;

      const used = new Set(st.slots.map(s => s.id).filter(Boolean));
      const gradeOptions = [`<option value="" ${!st.minGrade ? 'selected' : ''}>보호 안 함 (모두 추방)</option>`]
        .concat(HUNTER_GRADES.map(g => `<option value="${g.id}" ${st.minGrade === g.id ? 'selected' : ''}>${g.id} 이상 보호</option>`))
        .join('');

      const slotRows = st.slots.map((slot, i) => {
        const h = slot.id ? hunters.find(x => x.id === slot.id) : null;
        const stateText = getAutoBanishSlotStateText(h, slot);
        let picker;
        if (slot.locked && h) {
          picker = `<span class="ab-slot-name">${getHunterGradeHtml(h)} ${h.name}</span>`;
        } else {
          const opts = hunters
            .filter(x => x.id === slot.id || (!used.has(x.id) && !x.locked))
            .map(x => `<option value="${x.id}" ${x.id === slot.id ? 'selected' : ''}>${x.name} · ${x.rebirthCount || 0}환생 Lv.${x.level}</option>`)
            .join('');
          picker = `<select class="ab-slot-select" data-ab-slot="${i}"><option value="">— 헌터 선택 —</option>${opts}</select>`;
        }
        return `<div class="ab-slot${slot.locked ? ' locked' : ''}${h ? '' : ' empty'}">
          <span class="ab-slot-no">${i + 1}</span>
          <div class="ab-slot-main">
            ${picker}
            <span class="ab-slot-state" data-ab-state="${i}">${stateText}</span>
          </div>
          <div class="ab-slot-actions">
            ${h ? `<button type="button" class="ab-btn" data-ab-remove="${i}" title="슬롯에서 빼기">빼기</button>` : ''}
            ${h && slot.locked ? `<button type="button" class="ab-btn danger" data-ab-banish="${i}" ${h.locked ? 'disabled' : ''} title="직접 추방">🚪 추방</button>` : ''}
          </div>
        </div>`;
      }).join('');

      box.innerHTML = `
        <div class="ab-head">
          <div class="ab-title">🤖 자동 추방 <span class="ab-sub">5환생 Lv.99가 되면 추방하고 새 헌터를 영입 (200G)</span></div>
          <label class="ab-grade">보호 등급
            <select id="abMinGradeSelect">${gradeOptions}</select>
          </label>
          <div class="ab-note">보호 등급 이상인 헌터는 등급이 보이면(5환생) 슬롯이 잠기고 추방하지 않습니다. 잠긴 슬롯은 직접 빼거나 추방하세요.</div>
        </div>
        <div class="ab-slots">${slotRows || '<div class="ab-note">헌터가 없습니다.</div>'}</div>`;
    }

    function toggleAutoBanishPanel() {
      const box = document.getElementById('autoBanishPanel');
      const btn = document.getElementById('btnAutoBanishToggle');
      if (!box) return;
      box.hidden = !box.hidden;
      if (btn) btn.classList.toggle('active', !box.hidden);
      if (!box.hidden) renderAutoBanishPanel(true);
    }

    (function bindAutoBanishUi() {
      document.getElementById('btnAutoBanishToggle')?.addEventListener('click', toggleAutoBanishPanel);
      const box = document.getElementById('autoBanishPanel');
      if (!box) return;
      box.addEventListener('change', (e) => {
        const st = normalizeAutoBanishSlots();
        if (e.target.id === 'abMinGradeSelect') {
          st.minGrade = e.target.value || '';
          processAutoBanish(); // 바뀐 보호 등급으로 바로 다시 확인 (이미 잠긴 슬롯은 그대로)
          renderAutoBanishPanel(true);
          if (typeof scheduleAutoSave === 'function') scheduleAutoSave(400);
          return;
        }
        const sel = e.target.closest('[data-ab-slot]');
        if (sel) {
          const i = Number(sel.getAttribute('data-ab-slot'));
          const id = sel.value || null;
          if (st.slots[i]) {
            st.slots.forEach((s, j) => { if (j !== i && s.id === id) { s.id = null; s.locked = false; } });
            st.slots[i].id = id;
            st.slots[i].locked = false;
          }
          processAutoBanish();
          renderAutoBanishPanel(true);
          if (typeof scheduleAutoSave === 'function') scheduleAutoSave(400);
        }
      });
      box.addEventListener('click', (e) => {
        const st = normalizeAutoBanishSlots();
        const rm = e.target.closest('[data-ab-remove]');
        if (rm) {
          const slot = st.slots[Number(rm.getAttribute('data-ab-remove'))];
          if (slot) { slot.id = null; slot.locked = false; }
          renderAutoBanishPanel(true);
          if (typeof scheduleAutoSave === 'function') scheduleAutoSave(400);
          return;
        }
        const bn = e.target.closest('[data-ab-banish]');
        if (bn && !bn.disabled) {
          const slot = st.slots[Number(bn.getAttribute('data-ab-banish'))];
          if (slot && slot.id) openBanishConfirmModal(slot.id);
        }
      });
    })();

    // 헌터 목록이 다시 그려질 때 슬롯 상태도 맞춘다
    if (typeof renderHunterRosterModal === 'function') {
      const origRenderRosterForAb = renderHunterRosterModal;
      renderHunterRosterModal = function (...args) {
        const r = origRenderRosterForAb.apply(this, args);
        try { renderAutoBanishPanel(false); } catch (_) {}
        return r;
      };
    }

    // 1초마다 확인 (게임을 꺼 둔 동안 5환생 Lv.99가 된 헌터도 켜면 바로 처리)
    if (typeof stepSimulation === 'function') {
      const origStepForAb = stepSimulation;
      let abTimer = 0;
      stepSimulation = function (dt, ...rest) {
        const r = origStepForAb.call(this, dt, ...rest);
        abTimer += dt;
        if (abTimer >= AUTO_BANISH_CFG.checkEverySec) {
          abTimer = 0;
          try { processAutoBanish(); } catch (_) {}
        }
        return r;
      };
    }

    getAutoBanishState();
