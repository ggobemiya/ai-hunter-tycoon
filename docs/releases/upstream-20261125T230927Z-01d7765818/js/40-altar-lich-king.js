// [40-altar-lich-king] 💀 초월 환생의 제단 보스 = 리치 킹 (이미지)
// ============================================================================
// 이미지: assets/bosses/lich_king/lich_king_{idle|cast|release}.png (512px, 발끝 y≈491, 머리 꼭대기 y≈82)
//   - idle    : 평소 서 있는 모습 (살짝 떠오르며 숨쉬기)
//   - cast    : 공격 직전 (헌터와 싸우는 중이고 다음 공격까지 0.5초 이하)
//   - release : 공격 순간 (보라색 마법을 내뿜음 · 공격 후 0.45초 동안)
// 이미지를 아직 못 받았으면 기존 그림(drawRebirthSupremeBoss 원본)으로 그린다.
// ============================================================================
    const ALTAR_LICH_CFG = {
      dir: 'assets/bosses/lich_king',
      version: '20261125a',
      srcSize: 512,
      srcFootY: 491,
      srcHeadY: 82,
      cacheSize: 256,
      drawSize: 150,     // 그리는 크기(px)
      footY: 40,         // 보스 좌표 기준 발끝 높이 (제단 원 안쪽)
      castLead: 0.5,     // 공격 몇 초 전부터 '공격 직전' 모습
      releaseHold: 0.45  // 공격 후 몇 초 동안 '공격 순간' 모습
    };

    const AltarLichCache = new Map(); // pose → { state, canvas }

    function getAltarLichFrame(pose) {
      let entry = AltarLichCache.get(pose);
      if (!entry) {
        entry = { state: 'loading', canvas: null };
        AltarLichCache.set(pose, entry);
        const img = new Image();
        img.onload = () => {
          try {
            const c = document.createElement('canvas');
            c.width = c.height = ALTAR_LICH_CFG.cacheSize;
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
        img.src = `${ALTAR_LICH_CFG.dir}/lich_king_${pose}.png?v=${ALTAR_LICH_CFG.version}`;
      }
      return entry.state === 'ready' ? entry.canvas : null;
    }

    function pickAltarLichPose(boss) {
      const now = performance.now() / 1000;
      // 공격 타이머(0.35초)보다 조금 더 오래 마법을 내뿜는 모습을 보여 준다
      if ((boss.attackAnimTimer || 0) > 0) boss._lichReleaseUntil = now + Math.max(0, ALTAR_LICH_CFG.releaseHold - 0.35) + boss.attackAnimTimer;
      if ((boss._lichReleaseUntil || 0) > now) return 'release';
      const cd = boss.attackCooldown || 0;
      const fighting = typeof hunters !== 'undefined' && hunters.some(h => h.state === 'REBIRTH_ALTAR_HUNT' && h.hp > 0
        && Math.hypot(h.x - boss.x, h.y - boss.y) <= (boss.range || 64) + 42);
      // 대상이 없으면 쿨다운이 계속 줄어 음수가 되므로 -0.3 아래는 서 있는 모습
      if (fighting && cd <= ALTAR_LICH_CFG.castLead && cd > -0.3) return 'cast';
      return 'idle';
    }

    (function hookAltarLichSprite() {
      if (typeof drawRebirthSupremeBoss !== 'function') return;
      const drawAltarBossShape = drawRebirthSupremeBoss;
      ['idle', 'cast', 'release'].forEach(getAltarLichFrame); // 미리 받아 두기 (모습이 바뀔 때 깜빡임 방지)

      drawRebirthSupremeBoss = function (ctx, boss) {
        if (!boss || boss.hp <= 0) return;
        const pose = pickAltarLichPose(boss);
        const frame = getAltarLichFrame(pose) || getAltarLichFrame('idle');
        if (!frame) {
          drawAltarBossShape(ctx, boss);
          return;
        }

        const C = ALTAR_LICH_CFG;
        const t = performance.now() * 0.004;
        const floatY = Math.sin(t * 1.6) * 2.5;
        const D = C.drawSize;
        const footY = C.footY;

        ctx.save();
        ctx.translate(boss.x, boss.y);

        // 바닥 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, footY, 40, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // 바닥 윤회 마법진 (보라 · 천천히 회전)
        ctx.save();
        ctx.translate(0, footY - 2);
        ctx.scale(1, 0.34);
        ctx.rotate(t * 0.6);
        ctx.strokeStyle = pose === 'idle' ? 'rgba(192, 132, 252, 0.7)' : 'rgba(232, 121, 249, 0.95)';
        ctx.lineWidth = 2.6;
        ctx.setLineDash([9, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 공격 순간: 보라색 충격 고리가 퍼진다
        if (pose === 'release') {
          const remain = Math.max(0, (boss._lichReleaseUntil || 0) - performance.now() / 1000);
          const prog = 1 - Math.min(1, remain / C.releaseHold);
          ctx.strokeStyle = '#e879f9';
          ctx.globalAlpha = Math.max(0, 1 - prog);
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.ellipse(0, footY - 2, 36 + prog * 60, 11 + prog * 18, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // 리치 킹 본체 (살짝 떠 있음)
        const footRatio = C.srcFootY / C.srcSize;
        ctx.save();
        ctx.translate(0, footY - floatY - 2);
        if (pose === 'cast') {
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 16;
        }
        ctx.drawImage(frame, -D / 2, -D * footRatio, D, D);
        ctx.shadowBlur = 0;
        ctx.restore();

        // HP 바 & 이름표 (왕관 위)
        const headTop = footY - D * (C.srcFootY - C.srcHeadY) / C.srcSize;
        const barY = headTop - 10;
        const hpRatio = Math.max(0, boss.hp / boss.maxHp);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(-42, barY, 84, 7);
        ctx.strokeStyle = 'rgba(232, 121, 249, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-42, barY, 84, 7);
        ctx.fillStyle = '#e879f9';
        ctx.fillRect(-41, barY + 1, 82 * hpRatio, 5);

        ctx.fillStyle = '#fae8ff';
        ctx.font = 'bold 10.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(boss.name, 0, barY - 5);
        ctx.restore();
      };
    })();
