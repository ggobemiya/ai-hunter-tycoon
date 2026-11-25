// [15f-weapon-sprites] 헌터 무기 이미지 (직업 4종 × 환생 0~5단계)
    // ============================================================================
    // 이미지: assets/weapons/{직업}/{직업}_weapon_r{0~5}.png (256px · 투명 배경)
    //   - 도끼·검: 왼쪽 아래 손잡이 → 오른쪽 위 날 끝 (대각선 45도)
    //   - 지팡이 : 왼쪽 아래 → 오른쪽 위 (조금 더 세워짐)
    //   - 활     : 세로로 선 활 (활 몸체가 앞쪽으로 휨)
    // 15-render-hunter.js의 무기 자리(손 위치·휘두르기 각도)에 그대로 그린다.
    // 이미지를 아직 못 받았으면 기존 그림 무기로 그린다.
    // 강화(+10 / +15) 빛은 그대로 15-render-hunter.js가 그린다.
    // ============================================================================
    const WEAPON_SPRITE_CFG = {
      enabled: true,
      dir: 'assets/weapons',
      version: '20261124i',
      cacheSize: 96,             // 줄여 둔 복사본 크기 (메모리·그리기 부담 절약)
      // 직업별 모양 맞춤
      //   angle   : 이미지의 손잡이→끝 방향을 '위쪽'으로 세우는 회전값
      //   lenRatio: 이미지 한 변 대비 무기 실제 길이 (대각선이면 √2에 가까움)
      //   gripAt  : 무기 길이 중 손이 잡는 위치 (아래 끝에서부터 비율)
      //   mirror  : 이미지가 뒤쪽을 보고 있으면 좌우 뒤집기
      shapes: {
        berserker: { angle: -Math.PI / 4, lenRatio: 1.18, gripAt: 0.2, mirror: false, extra: 11 },
        paladin:   { angle: -Math.PI / 4, lenRatio: 1.18, gripAt: 0.16, mirror: false, extra: 11 },
        sorcerer:  { angle: -0.5,         lenRatio: 0.95, gripAt: 0.32, mirror: false, extra: 14 },
        ranger:    { angle: 0,            lenRatio: 0.84, gripAt: 0.5,  mirror: false, extra: 9 }
      }
    };

    const WeaponSpriteCache = new Map(); // key → { state, canvas }

    function getWeaponSpriteFrame(jobKey, tier) {
      const key = `${jobKey}_r${tier}`;
      let entry = WeaponSpriteCache.get(key);
      if (!entry) {
        entry = { state: 'loading', canvas: null };
        WeaponSpriteCache.set(key, entry);
        const img = new Image();
        img.onload = () => {
          try {
            const c = document.createElement('canvas');
            c.width = c.height = WEAPON_SPRITE_CFG.cacheSize;
            const cx = c.getContext('2d');
            cx.imageSmoothingQuality = 'high';
            cx.drawImage(img, 0, 0, c.width, c.height);
            entry.canvas = c;
            entry.state = 'ready';
          } catch (_) {
            entry.state = 'missing';
          }
        };
        img.onerror = () => { entry.state = 'missing'; };
        img.src = `${WEAPON_SPRITE_CFG.dir}/${jobKey}/${jobKey}_weapon_r${tier}.png?v=${WEAPON_SPRITE_CFG.version}`;
      }
      return entry.state === 'ready' ? entry.canvas : null;
    }

    function getHunterWeaponJobKey(hunter) {
      if (typeof HUNTER_SPRITE_JOB_KEYS === 'undefined') return null;
      return HUNTER_SPRITE_JOB_KEYS[hunter.baseJob || hunter.job] || null;
    }

    // 이 헌터의 무기 이미지가 준비됐는지 (준비 전이면 받아오기 시작)
    function isHunterWeaponSpriteReady(hunter) {
      if (!WEAPON_SPRITE_CFG.enabled) return false;
      const jobKey = getHunterWeaponJobKey(hunter);
      if (!jobKey) return false;
      const tier = Math.max(0, Math.min(5, hunter.rebirthCount || 0));
      return !!getWeaponSpriteFrame(jobKey, tier);
    }

    // 무기 그리기 (15-render-hunter.js 무기 좌표계: 손 = (0,0), 무기 끝 = 위쪽(-y))
    // 그렸으면 true, 이미지가 없으면 false (기존 그림으로 그림)
    function drawHunterWeaponSprite(ctx, hunter, bladeLen, t) {
      if (!WEAPON_SPRITE_CFG.enabled) return false;
      const jobKey = getHunterWeaponJobKey(hunter);
      if (!jobKey) return false;
      const tier = Math.max(0, Math.min(5, hunter.rebirthCount || 0));
      const frame = getWeaponSpriteFrame(jobKey, tier);
      if (!frame) return false;

      const shape = WEAPON_SPRITE_CFG.shapes[jobKey];
      const facing = hunter.facing || 1;
      const len = bladeLen + shape.extra;           // 화면에 보일 무기 길이(px)
      const size = len / shape.lenRatio;            // 이미지 한 변 크기
      const centerY = -(0.5 - shape.gripAt) * len;  // 손잡이를 손 위치에 맞춤

      ctx.save();
      // 앞을 보는 방향에 맞춰 좌우 뒤집기 (활은 이미지가 반대로 휘어 있어 한 번 더 뒤집음)
      ctx.scale(shape.mirror ? -facing : facing, 1);
      ctx.translate(0, centerY);
      ctx.rotate(shape.angle);

      // 강화·환생 빛: 무기 모양 그대로 은은하게 (+10 하늘색 · +15 금색)
      const enh = hunter.weaponEnhance || 0;
      if (enh >= 10) {
        ctx.shadowColor = enh >= 15 ? '#fbbf24' : '#38bdf8';
        ctx.shadowBlur = (enh >= 15 ? 14 : 9) + Math.sin(t * (enh >= 15 ? 5 : 4)) * 3;
      }
      ctx.drawImage(frame, -size / 2, -size / 2, size, size);
      ctx.shadowBlur = 0;
      ctx.restore();

      // 레인저: 시위에 걸린 화살 (활 이미지에는 화살이 없음)
      if (jobKey === 'ranger') {
        const arrowY = centerY;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-facing * 5, arrowY);
        ctx.lineTo(facing * 11, arrowY);
        ctx.stroke();
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(facing * 14.5, arrowY);
        ctx.lineTo(facing * 10, arrowY - 2.8);
        ctx.lineTo(facing * 10, arrowY + 2.8);
        ctx.closePath();
        ctx.fill();
      }
      return true;
    }
