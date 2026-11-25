// [01-core-utils] 공통 유틸 · 기본 상수 (골드 표기, 물약/도시락 정원, 인성 등급)
    // 스크립트 초기 진입 시 안전 폴백 타이머 등록 (어떤 환경에서도 로딩 화면 정지 방지)
    setTimeout(() => {
      const screenEl = document.getElementById('loadingScreen');
      if (screenEl && !screenEl.classList.contains('fade-out')) {
        if (typeof window.finishGameLoading === 'function') {
          window.finishGameLoading('마을에 입장합니다...');
        } else {
          screenEl.classList.add('fade-out');
        }
      }
    }, 1500);

    // 구형 브라우저 및 WebView 호환을 위한 Canvas roundRect 폴리필
    if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
        const r = Array.isArray(radii) ? (radii[0] || 0) : (radii || 0);
        const radius = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + w, y, x + w, y + h, radius);
        this.arcTo(x + w, y + h, x, y + h, radius);
        this.arcTo(x, y + h, x, y, radius);
        this.arcTo(x, y, x + w, y, radius);
        this.closePath();
        return this;
      };
    }

    // 10만(100,000) 단위 이상부터 한글 단위(만, 억, 조, 경, 해)로 표기하는 포매터
    function formatGold(rawValue) {
      const num = Number(rawValue);
      if (!Number.isFinite(num)) return '0';
      const sign = num < 0 ? '-' : '';
      const abs = Math.floor(Math.abs(num));
      if (abs < 100000) {
        return sign + abs.toLocaleString();
      }

      const units = [
        { val: 1e20, label: '해' },
        { val: 1e16, label: '경' },
        { val: 1e12, label: '조' },
        { val: 1e8,  label: '억' },
        { val: 1e4,  label: '만' }
      ];

      let rem = abs;
      const parts = [];
      for (const u of units) {
        if (rem >= u.val) {
          const q = Math.floor(rem / u.val);
          rem %= u.val;
          parts.push(`${q.toLocaleString()}${u.label}`);
          if (parts.length === 2) break;
        }
      }
      return sign + parts.join(' ');
    }

    /**
     * ============================================================================
     * 성장·환생 & 확장형 스킬 숙련도 시스템 상수 (추후 전직 시스템 연계)
     * ============================================================================
     */
    const LEVEL_REBIRTH_CONFIG = {
      maxLevel: 99,
      maxRebirths: 5,
      // 환생 1회당 영구 능력치 상승 계수
      rebirthStatBonusPerStack: 0.25, // 1환생당 기본 HP/MP/공격력/방어력 +25%
      rebirthCritBonusPerStack: 3     // 1환생당 치명타 +3%
    };

    // 환생 단계별 필요 경험치 배율 (헌터 Lv.1~99 경험치 곡선에 곱함 · 08-hunter-class.js getRequiredExp)
    // 실제 게임 속도를 시뮬레이션으로 재서 맞춘 값 (단계별 무난한 장비 · 번영도 보너스 제외 기준):
    //   0환생 Lv.1→99 약 4.6시간 · 1~4환생 각 약 4.0 / 4.6 / 5.1 / 5.8시간
    //   → Lv.1부터 4환생 Lv.99까지 약 24시간 · 5환생 Lv.1→99도 약 24시간
    const REBIRTH_REQUIRED_EXP_MULT = [1, 5.5, 11, 22, 31, 169];

    // ============================================================================
    // ⭐ 경험치 배율 (모든 종족 공통) — 이벤트 등으로 경험치를 올릴 때는 아래 EXP_RATE 한 줄만 바꾸면 된다.
    //   예) 1 = 평소 · 2 = 경험치 2배 · 1.5 = 1.5배
    //   적용 대상: 헌터(사냥 · 던전 · 투기장 · 보스 · 자리 비운 동안 등 모든 경험치) · 왕실 병사(근위병 · 근위대장 …)
    //             · 오크(처치할 때마다 쌓이는 성장 수치) · 앞으로 추가될 종족도 applyExpRate(양, '종족')으로 받으면 같이 적용
    //   종족마다 따로 조절해야 할 때만 EXP_RATE_BY_RACE를 바꾼다 (보통은 모두 1).
    //   (마을 경비병은 골드로 레벨을 올리므로 경험치가 없다)
    // ============================================================================
    const EXP_RATE = 1;
    const EXP_RATE_BY_RACE = { hunter: 1, kingdom: 1, orc: 1 };
    function getExpRate(race) {
      const r = Number(EXP_RATE_BY_RACE[race]);
      return Math.max(0, Number(EXP_RATE) || 0) * (Number.isFinite(r) ? r : 1);
    }
    function applyExpRate(amount, race) {
      return (Number(amount) || 0) * getExpRate(race);
    }

    const POTION_MAX_STACK = 5;
    const MP_POTION_MAX_STACK = 3;
    const REBORN_HP_POTION_MAX_STACK = 10;
    const REBORN_MP_POTION_MAX_STACK = 5;
    const EQUIP_FRAGMENT_MAX_STACK = 100000;
    const MAX_BUILDING_LEVEL = 10;
    const MAX_EQUIP_TIER = 10;

    // 헌터 최대 체력 물약 소지 개수 계산
    // 미환생: Lv.40부터 20레벨 간격(Lv.40: 6개, Lv.60: 7개, Lv.80: 8개)으로 증가
    // 환생 헌터(1환생↑): 레벨에 따른 증가 영향을 받지 않고 최대 10개 고정
    function getMaxHpPotionCapacity(level = 1, rebirthCount = 0) {
      const rb = Math.max(0, Math.floor(Number(rebirthCount) || 0));
      if (rb >= 1) return REBORN_HP_POTION_MAX_STACK;
      const lv = Math.max(1, Number(level) || 1);
      if (lv < 40) return POTION_MAX_STACK;
      return POTION_MAX_STACK + 1 + Math.floor((lv - 40) / 20);
    }

    // 헌터 최대 MP 물약 소지 개수 계산
    // 미환생: 기본 3개 / 환생 헌터(1환생↑): 레벨에 따른 증가 영향을 받지 않고 최대 5개 고정
    function getMaxMpPotionCapacity(level = 1, rebirthCount = 0) {
      const rb = Math.max(0, Math.floor(Number(rebirthCount) || 0));
      if (rb >= 1) return REBORN_MP_POTION_MAX_STACK;
      return MP_POTION_MAX_STACK;
    }

    // 헌터 인성(-100 카오스 ~ 0 중립 ~ +100 선인) 등급 및 배지 정보 계산
    function getAlignmentInfo(rawAlignment = 0) {
      const val = Math.max(-100, Math.min(100, Math.round(Number(rawAlignment) || 0)));
      if (val >= 60) {
        return { value: val, label: '성인(선인)', badgeClass: 'align-badge-saint', color: '#86efac' };
      }
      if (val >= 20) {
        return { value: val, label: '선인', badgeClass: 'align-badge-good', color: '#7dd3fc' };
      }
      if (val > -20) {
        return { value: val, label: '중립', badgeClass: 'align-badge-neutral', color: '#cbd5e1' };
      }
      if (val > -60) {
        return { value: val, label: '악인', badgeClass: 'align-badge-chaotic', color: '#fca5a5' };
      }
      return { value: val, label: '카오스', badgeClass: 'align-badge-chaos', color: '#f0abfc' };
    }
    // 20레벨 이상 또는 1환생 이상 헌터 도시락 최대 소지 개수 계산
    // 미환생: Lv.20부터 3개 시작, 20레벨당 +1개 (Lv.99 기준 최대 5개)
    // 환생 헌터(1환생↑): 현재 레벨과 무관하게 Lv.99 기준(5개) + 환생 1회당 +1개씩 증가 (1환생 6개 ~ 5환생 10개)
    function getMaxBentoCapacity(level = 1, rebirthCount = 0) {
      const rb = Math.max(0, Math.floor(Number(rebirthCount) || 0));
      const lv99BaseCap = Math.min(5, 3 + Math.floor((LEVEL_REBIRTH_CONFIG.maxLevel - 20) / 20));
      if (rb >= 1) {
        return lv99BaseCap + rb;
      }
      const lv = Math.max(1, Number(level) || 1);
      return lv < 20 ? 0 : Math.min(5, 3 + Math.floor((lv - 20) / 20));
    }

    // 마을 회관 레벨별 최대 헌터 정원 (Lv.1: 4명, Lv.2: 6명, Lv.3~Lv.10: 9명 ~ 최대 30명)
    function getTownHallCapacity(lv = 1) {
      const clampedLv = Math.max(1, Math.min(MAX_BUILDING_LEVEL, lv));
      if (clampedLv === 1) return 4;
      return Math.min(30, clampedLv * 3);
    }

    // ============================================================================
    // 🖥️ 화면에 보이는 곳만 그리기 (성능)
    //   - 매 화면(프레임) 시작 때 17-game-loop.js가 updateWorldViewRect(camera)로 지금 보이는 월드 범위를 기록한다.
    //   - 그리는 함수들은 isWorldPointVisible / isWorldRectVisible로 화면 밖이면 그리기를 건너뛴다.
    //   - 아직 기록이 없거나(시작 직후) 메인 캔버스가 아닌 곳에 그릴 때는 항상 '보임'으로 처리한다.
    // ============================================================================
    let WORLD_VIEW_RECT = null;
    function updateWorldViewRect(cam) {
      try {
        const a = cam.screenToWorld(0, 0);
        const b = cam.screenToWorld(cam.viewportWidth, cam.viewportHeight);
        WORLD_VIEW_RECT = {
          x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y),
          x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y),
          ctx: cam.ctx
        };
      } catch (_) {
        WORLD_VIEW_RECT = null;
      }
    }
    function isWorldPointVisible(x, y, pad = 120, ctx = null) {
      const v = WORLD_VIEW_RECT;
      if (!v || (ctx && ctx !== v.ctx)) return true;
      return x >= v.x0 - pad && x <= v.x1 + pad && y >= v.y0 - pad && y <= v.y1 + pad;
    }
    function isWorldRectVisible(x, y, w, h, pad = 60, ctx = null) {
      const v = WORLD_VIEW_RECT;
      if (!v || (ctx && ctx !== v.ctx)) return true;
      return x + w >= v.x0 - pad && x <= v.x1 + pad && y + h >= v.y0 - pad && y <= v.y1 + pad;
    }

    // ============================================================================
    // 📱 화면 글자는 바뀐 경우에만 다시 쓴다 (같은 글자를 계속 다시 쓰면 휴대폰이 매번 화면 배치를 다시 계산해 느려지고 뜨거워진다)
    // ============================================================================
    function setTextIfChanged(el, text) {
      if (!el) return;
      const s = String(text);
      if (el.textContent !== s) el.textContent = s;
    }
    function setTitleIfChanged(el, text) {
      if (el && el.title !== text) el.title = text;
    }
    function setDisabledIfChanged(el, disabled) {
      if (el && el.disabled !== !!disabled) el.disabled = !!disabled;
    }
