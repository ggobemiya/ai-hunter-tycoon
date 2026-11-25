// [15b-hunter-sprites] 헌터 이미지(스프라이트) 불러오기 · 그리기
    // ============================================================================
    // 제미나이로 만든 헌터 이미지를 헌터 몸체 그림 대신 사용한다.
    //   - 0~4환생: assets/hunters/base/{직업}/{직업}_r{0~4}_{m|f}.png
    //   - 5환생 최종 직업: assets/hunters/final/{직업}/{직업}_f{01~32}_{m|f}.png (번호 = 5차 전직 순서 + 1)
    //     최종 직업 이미지가 없으면 4환생 이미지를 쓴다.
    // 성능 · 로딩
    //   - 게임 시작 때 전부 받지 않고, 지금 헌터가 쓰는 이미지만 그때그때 불러온다.
    //   - 불러온 이미지는 한 번만 작은 크기(128px)로 줄여 두고 그 복사본을 그린다. (마을 화면 부담·메모리 절약)
    //   - 아직 못 받은 이미지는 기존 그림(15a-hunter-looks.js)으로 잠깐 대신 그린다.
    // 무기 · 강화 효과 · 환생 오라 · 날개 · 이름표는 지금처럼 15-render-hunter.js가 그린다.
    // ============================================================================
    const HUNTER_SPRITE_CFG = {
      enabled: true,
      baseDir: 'assets/hunters/base',
      finalDir: 'assets/hunters/final',
      finalJobsReady: true,      // 5환생 최종 직업 이미지 사용 (없으면 4환생 이미지)
      version: '20261124e',      // 이미지 교체 시 바꾸면 브라우저가 새로 받음
      srcSize: 256,              // 원본 캔버스 크기
      srcFootY: 244,             // 원본에서 발끝 위치
      srcHeadY: 42,              // 원본에서 머리 꼭대기 위치
      cacheSize: 128,            // 줄여 둔 복사본 크기
      drawHeight: 48,            // 마을에서 캐릭터 키(px, 확대 1배 기준)
      footY: 16.5                // 헌터 좌표 기준 발끝 높이 (기존 그림과 맞춤)
    };

    const HUNTER_SPRITE_JOB_KEYS = {
      '버서커': 'berserker',
      '팔라딘': 'paladin',
      '레인저': 'ranger',
      '소서러': 'sorcerer'
    };

    // key → { state: 'loading'|'ready'|'missing', canvas, fallbackKey }
    const HunterSpriteCache = new Map();

    function getHunterSpritePath(key) {
      // key 예: berserker_r2_m / berserker_f07_f
      const job = key.split('_')[0];
      const dir = /_f\d{2}_/.test(key) ? HUNTER_SPRITE_CFG.finalDir : HUNTER_SPRITE_CFG.baseDir;
      return `${dir}/${job}/${key}.png?v=${HUNTER_SPRITE_CFG.version}`;
    }

    // 헌터의 지금 모습에 맞는 이미지 이름 (최종 직업 이미지가 없으면 4환생으로)
    function getHunterSpriteKeys(hunter) {
      const job = HUNTER_SPRITE_JOB_KEYS[hunter.baseJob || hunter.job];
      if (!job) return [];
      const g = hunter.gender === 'F' ? 'f' : 'm';
      const rb = Math.max(0, Math.floor(hunter.rebirthCount || 0));
      const stageKey = `${job}_r${Math.min(4, rb)}_${g}`;
      if (rb >= 5 && HUNTER_SPRITE_CFG.finalJobsReady) {
        const path = Array.isArray(hunter.advancementPath) ? hunter.advancementPath : [];
        const finalId = path.find(id => /_t5_\d+$/.test(id));
        if (finalId) {
          const idx = Number(finalId.split('_t5_')[1]);
          if (Number.isFinite(idx)) {
            return [`${job}_f${String(idx + 1).padStart(2, '0')}_${g}`, stageKey];
          }
        }
      }
      return [stageKey];
    }

    function loadHunterSprite(key) {
      if (HunterSpriteCache.has(key)) return;
      const entry = { state: 'loading', canvas: null };
      HunterSpriteCache.set(key, entry);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        try {
          // 한 번만 작은 크기로 줄여 두기
          const c = document.createElement('canvas');
          c.width = HUNTER_SPRITE_CFG.cacheSize;
          c.height = HUNTER_SPRITE_CFG.cacheSize;
          const cx = c.getContext('2d');
          cx.imageSmoothingEnabled = true;
          cx.imageSmoothingQuality = 'high';
          cx.drawImage(img, 0, 0, c.width, c.height);
          entry.canvas = c;
          entry.state = 'ready';
        } catch (_) {
          entry.state = 'missing';
        }
      };
      img.onerror = () => { entry.state = 'missing'; };
      img.src = getHunterSpritePath(key);
    }

    // 지금 그릴 수 있는 이미지 (없으면 불러오기를 시작하고 null)
    function getReadyHunterSprite(hunter) {
      if (!HUNTER_SPRITE_CFG.enabled) return null;
      const keys = getHunterSpriteKeys(hunter);
      for (const key of keys) {
        const entry = HunterSpriteCache.get(key);
        if (!entry) {
          loadHunterSprite(key);
          return null; // 받는 동안은 기존 그림
        }
        if (entry.state === 'ready') return entry.canvas;
        if (entry.state === 'loading') return null;
        // missing → 다음 후보(4환생 이미지)로
      }
      return null;
    }

    // 헌터 몸체를 이미지로 그린다. (그렸으면 true, 아직 없으면 false → 기존 그림 사용)
    // ctx는 헌터 위치로 옮겨진 상태 (15-render-hunter.js)
    function drawHunterSpriteBody(ctx, hunter, t) {
      const sprite = getReadyHunterSprite(hunter);
      if (!sprite) return false;
      const cfg = HUNTER_SPRITE_CFG;
      const scale = cfg.drawHeight / (cfg.srcFootY - cfg.srcHeadY);
      const size = cfg.srcSize * scale;
      const top = cfg.footY - cfg.srcFootY * scale;
      const facing = hunter.facing || 1;

      // 걷기: 살짝 통통 튀는 느낌 · 공격: 앞으로 기울기
      const walking = hunter.state === 'WALKING';
      const squash = walking ? 1 + Math.sin((hunter.walkCycle || 0) * 2) * 0.025 : 1 + Math.sin(t * 2) * 0.012;
      const attacking = (hunter.attackAnimTimer || 0) > 0;
      const lean = attacking ? 0.08 * facing : 0;

      ctx.save();
      ctx.translate(0, cfg.footY);
      ctx.rotate(lean);
      ctx.scale(facing, squash);
      ctx.translate(0, -cfg.footY);
      ctx.drawImage(sprite, -size / 2, top, size, size);
      ctx.restore();
      return true;
    }

    // ---------- 헌터 정보창 초상 ----------
    const HUNTER_PORTRAIT_RING = {
      0: { ring: 'rgba(148, 163, 184, 0.45)', glow: 'rgba(148, 163, 184, 0.18)' },
      1: { ring: 'rgba(52, 211, 153, 0.75)', glow: 'rgba(52, 211, 153, 0.28)' },
      2: { ring: 'rgba(56, 189, 248, 0.75)', glow: 'rgba(56, 189, 248, 0.28)' },
      3: { ring: 'rgba(192, 132, 252, 0.8)', glow: 'rgba(192, 132, 252, 0.3)' },
      4: { ring: 'rgba(251, 146, 60, 0.85)', glow: 'rgba(251, 191, 36, 0.32)' },
      5: { ring: 'rgba(244, 114, 182, 0.9)', glow: 'rgba(253, 224, 71, 0.36)' }
    };

    // 헌터 정보창 왼쪽 액자에 그 헌터의 모습을 보여 준다 (원본 256px 이미지로 선명하게)
    function updateHunterPortrait(hunter) {
      const box = document.getElementById('hunterPortrait');
      const img = document.getElementById('hunterPortraitImg');
      if (!box || !img || !hunter) return;

      const tier = Math.max(0, Math.min(5, Math.floor(hunter.rebirthCount || 0)));
      const ring = HUNTER_PORTRAIT_RING[tier] || HUNTER_PORTRAIT_RING[0];
      box.style.setProperty('--portrait-ring', ring.ring);
      box.style.setProperty('--portrait-glow', ring.glow);
      const fallback = document.getElementById('hunterPortraitFallback');
      if (fallback) fallback.textContent = document.getElementById('hunterAvatarIcon')?.textContent || '⚔️';

      // 최종 직업 이미지 → 4환생 이미지 순서로, 없는 이미지는 건너뜀
      const keys = getHunterSpriteKeys(hunter).filter(k => HunterSpriteCache.get(k)?.state !== 'missing');
      const wantKey = keys[0] || '';
      if (img.dataset.key === wantKey && img.dataset.hunterId === String(hunter.id)) return;
      img.dataset.key = wantKey;
      img.dataset.hunterId = String(hunter.id);
      if (!wantKey || !HUNTER_SPRITE_CFG.enabled) {
        img.hidden = true;
        box.classList.add('no-image');
        return;
      }
      img.onload = () => {
        img.hidden = false;
        box.classList.remove('no-image');
        if (typeof drawHunterPortraitWings === 'function') drawHunterPortraitWings(hunter);
      };
      img.onerror = () => {
        // 이 이미지는 없음 → 다음 후보로 다시 시도
        HunterSpriteCache.set(wantKey, { state: 'missing', canvas: null });
        img.dataset.key = '';
        updateHunterPortrait(hunter);
      };
      img.hidden = true;
      box.classList.add('no-image');
      img.src = getHunterSpritePath(wantKey);
    }

    // 헌터 정보창이 갱신될 때마다 초상도 맞춘다
    (function hookHunterPanelPortrait() {
      if (typeof refreshHunterPanel !== 'function') return;
      const origRefresh = refreshHunterPanel;
      refreshHunterPanel = function (...args) {
        const result = origRefresh.apply(this, args);
        try {
          const id = gameState.selectedHunterId;
          const hunter = id ? hunters.find(h => h.id === id) : null;
          if (hunter) updateHunterPortrait(hunter);
        } catch (_) {}
        return result;
      };
    })();

    // ---------- 헌터 정보창 초상: 날개 ----------
    // 날개를 착용 중이면 초상 이미지 뒤에 마을과 같은 깃털 날개를 그리고, 오른쪽 위에 날개 강화 수치를 표시한다.
    function drawHunterPortraitWings(hunter) {
      const box = document.getElementById('hunterPortrait');
      const canvas = document.getElementById('hunterPortraitWings');
      const img = document.getElementById('hunterPortraitImg');
      const badge = document.getElementById('hunterPortraitWingBadge');
      if (!box || !canvas || !img) return;

      const wing = hunter && hunter.getEquippedWing ? hunter.getEquippedWing() : null;
      const w = box.clientWidth;
      const h = box.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (badge) {
        badge.hidden = !wing;
        if (wing) badge.textContent = `🪽 +${Math.max(0, hunter.wingEnhance || 0)}`;
      }
      if (!wing || img.hidden || typeof drawHunterFeatherWings !== 'function') return;

      // 초상 이미지의 실제 크기·위치에서 마을 그림 1칸이 몇 px인지 계산해 날개 위치를 맞춘다
      const cfg = HUNTER_SPRITE_CFG;
      const imgScale = img.clientWidth / cfg.srcSize;
      const worldToPx = ((cfg.srcFootY - cfg.srcHeadY) * imgScale) / cfg.drawHeight;
      const footPx = img.offsetTop + cfg.srcFootY * imgScale;
      const originX = img.offsetLeft + img.clientWidth / 2;
      const originY = footPx - cfg.footY * worldToPx;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(originX, originY);
      ctx.scale(worldToPx, worldToPx);
      const proxy = Object.create(hunter);
      proxy.facing = 1;
      proxy.x = 0;
      drawHunterFeatherWings(ctx, proxy, 0);
    }

    (function hookHunterPanelWings() {
      if (typeof refreshHunterPanel !== 'function') return;
      const origRefresh = refreshHunterPanel;
      refreshHunterPanel = function (...args) {
        const result = origRefresh.apply(this, args);
        try {
          const id = gameState.selectedHunterId;
          const hunter = id ? hunters.find(hh => hh.id === id) : null;
          if (hunter) drawHunterPortraitWings(hunter);
        } catch (_) {}
        return result;
      };
    })();
