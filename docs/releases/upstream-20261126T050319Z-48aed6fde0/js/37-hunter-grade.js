// [37-hunter-grade] 🎖️ 헌터 태생 등급 (F ~ EX+)
//   - 헌터가 태어날 때(처음 능력치를 계산할 때) 등급이 정해지고, 평생 바뀌지 않는다. (기존 헌터도 처음 불러올 때 1번 정해짐)
//   - 등급 효과(공격력 · 방어력 · 최대 HP · 최대 MP)는 태어날 때부터 적용되지만,
//     등급 표시는 5환생 Lv.1 이상이 되어야 보인다. (마을 전체 헌터 목록 "A 환생" · 헌터 정보창 초상 왼쪽 위)
//   - 기준(C등급) = 직업 기본 능력치 그대로.

    // 확률(%)의 합 = 100 · bonus = 능력치 증감 비율
    const HUNTER_GRADES = [
      { id: 'EX+',  chance: 0.005, bonus: 0.55, cls: 'grade-rainbow' },
      { id: 'EX',   chance: 0.01,  bonus: 0.45, cls: 'grade-red' },
      { id: 'SSS+', chance: 1,    bonus: 0.40, cls: 'grade-gold' },
      { id: 'SSS',  chance: 2.5,  bonus: 0.35, cls: 'grade-gold' },
      { id: 'SS',   chance: 4,    bonus: 0.30, cls: 'grade-gold' },
      { id: 'S',    chance: 7,    bonus: 0.25, cls: 'grade-gold' },
      { id: 'A',    chance: 10,   bonus: 0.20, cls: 'grade-sky' },
      { id: 'B',    chance: 14,   bonus: 0.15, cls: 'grade-sky' },
      { id: 'C',    chance: 26.485, bonus: 0,   cls: 'grade-green' },
      { id: 'D',    chance: 15,   bonus: -0.05, cls: 'grade-gray' },
      { id: 'E',    chance: 12,   bonus: -0.10, cls: 'grade-gray' },
      { id: 'F',    chance: 8,    bonus: -0.20, cls: 'grade-gray' }
    ];
    const HUNTER_GRADE_BY_ID = Object.fromEntries(HUNTER_GRADES.map(g => [g.id, g]));
    const HUNTER_GRADE_SHOW_REBIRTH = 5; // 이 환생 횟수부터 등급이 보인다

    function rollHunterGrade() {
      const total = HUNTER_GRADES.reduce((s, g) => s + g.chance, 0);
      let r = Math.random() * total;
      for (const g of HUNTER_GRADES) {
        r -= g.chance;
        if (r < 0) return g.id;
      }
      return 'C';
    }

    // 헌터의 등급 정보 (없으면 지금 정함)
    function getHunterGrade(h) {
      if (!h) return HUNTER_GRADE_BY_ID.C;
      if (!HUNTER_GRADE_BY_ID[h.birthGrade]) h.birthGrade = rollHunterGrade();
      return HUNTER_GRADE_BY_ID[h.birthGrade];
    }
    function isHunterGradeVisible(h) {
      return !!h && (Number(h.rebirthCount) || 0) >= HUNTER_GRADE_SHOW_REBIRTH;
    }
    // 화면에 넣을 등급 글자 (5환생 전에는 빈 글자)
    function getHunterGradeHtml(h, extraClass = '') {
      if (!isHunterGradeVisible(h)) return '';
      const g = getHunterGrade(h);
      return `<span class="hunter-grade ${g.cls} ${extraClass}">${g.id}</span>`;
    }

    // ---------- 능력치에 등급 효과 ----------
    (function hookHunterGradeStats() {
      if (typeof Hunter === 'undefined') return;
      const origStats = Hunter.prototype.getComputedStats;
      Hunter.prototype.getComputedStats = function (...args) {
        const s = origStats.apply(this, args);
        const f = 1 + getHunterGrade(this).bonus;
        if (s && f !== 1) {
          s.atk = Math.max(10, Math.round(s.atk * f));
          s.def = Math.max(5, Math.round(s.def * f));
        }
        return s;
      };
      const origVitals = Hunter.prototype.recalculateVitals;
      Hunter.prototype.recalculateVitals = function (...args) {
        const result = origVitals.apply(this, args);
        const f = 1 + getHunterGrade(this).bonus;
        if (f !== 1) {
          // 원래 계산이 현재 HP 비율을 지켜 주므로, 최대치와 현재치를 같은 비율로 맞춘다
          this.maxHp = Math.max(1, Math.round(this.maxHp * f));
          this.maxMp = Math.max(1, Math.round(this.maxMp * f));
          this.hp = Math.min(this.maxHp, Math.round(this.hp * f));
          this.mp = Math.min(this.maxMp, Math.round(this.mp * f));
        }
        return result;
      };
    })();

    // ---------- 헌터 정보창 초상 왼쪽 위 등급 배지 ----------
    function updateHunterPortraitGrade(hunter) {
      const box = document.getElementById('hunterPortrait');
      if (!box) return;
      let badge = document.getElementById('hunterPortraitGrade');
      if (!badge) {
        badge = document.createElement('span');
        badge.id = 'hunterPortraitGrade';
        box.appendChild(badge);
      }
      if (!isHunterGradeVisible(hunter)) {
        if (!badge.hidden) badge.hidden = true;
        return;
      }
      const g = getHunterGrade(hunter);
      if (badge.hidden) badge.hidden = false;
      const cls = `hunter-grade hunter-portrait-grade ${g.cls}`;
      if (badge.className !== cls) badge.className = cls;
      if (badge.textContent !== g.id) badge.textContent = g.id;
    }
    (function hookHunterPanelGrade() {
      if (typeof refreshHunterPanel !== 'function') return;
      const origRefresh = refreshHunterPanel;
      refreshHunterPanel = function (...args) {
        const result = origRefresh.apply(this, args);
        try {
          const id = gameState.selectedHunterId;
          updateHunterPortraitGrade(id ? hunters.find(h => h.id === id) : null);
        } catch (_) {}
        return result;
      };
    })();

// ============================================================================
// 👑 왕국 병력(황실 근위병 · 근위대장 · 앞으로 추가될 계급 모두) 등급
//   - 헌터와 같은 등급표를 쓰되 B등급 이상만 나온다 (B 아래 확률은 빼고, 남은 확률을 같은 비율로 나눔).
//   - 영입할 때 정해지고 바뀌지 않는다 (기존 병력도 처음 불러올 때 1번 정해짐).
//   - 공격력 · 방어력 · 체력 · 전투력에 등급 효과가 붙는다 (34-kingdom.js getKingdomUnitStats).
//   - 병력 정보창 · 왕국 병력 목록에 항상 표시 · 등급은 gameState.kingdom.units[].grade 로 함께 저장된다.
// ============================================================================
    const KINGDOM_MIN_GRADE = 'B';
    const KINGDOM_GRADES = HUNTER_GRADES.slice(0, HUNTER_GRADES.findIndex(g => g.id === KINGDOM_MIN_GRADE) + 1);

    function rollKingdomGrade() {
      const total = KINGDOM_GRADES.reduce((s, g) => s + g.chance, 0);
      let r = Math.random() * total;
      for (const g of KINGDOM_GRADES) {
        r -= g.chance;
        if (r < 0) return g.id;
      }
      return KINGDOM_MIN_GRADE;
    }
    function getKingdomUnitGrade(u) {
      if (!u) return HUNTER_GRADE_BY_ID[KINGDOM_MIN_GRADE];
      if (!KINGDOM_GRADES.some(g => g.id === u.grade)) u.grade = rollKingdomGrade();
      return HUNTER_GRADE_BY_ID[u.grade];
    }
    function getKingdomGradeHtml(u) {
      const g = getKingdomUnitGrade(u);
      return `<span class="hunter-grade ${g.cls}">${g.id}</span>`;
    }

    // 37 로드 이전에 생성된 초기 헌터도 즉시 태생 등급 확정 및 체력/마력 반영
    if (typeof hunters !== 'undefined' && Array.isArray(hunters)) {
      hunters.forEach((h) => {
        if (h && !HUNTER_GRADE_BY_ID[h.birthGrade]) {
          getHunterGrade(h);
          if (typeof h.recalculateVitals === 'function') h.recalculateVitals(true);
        }
      });
    }
