// [15d-boss-sprites] 보스 성소 골렘 보스 이미지 (1~10단계 · 서있기/공격 직전/공격 후)
    // ============================================================================
    // 이미지: assets/bosses/tNN/boss_tNN_{idle|windup|attack}.png (512px, 발끝 y≈488)
    //   - idle   : 평소 서 있는 모습
    //   - windup : 공격 직전 (다음 공격까지 0.5초 이하 남았고 싸우는 중)
    //   - attack : 공격 직후 (내려찍기 0.45초 동안)
    // 지금 단계의 이미지 3장만 그때그때 불러오고, 256px로 줄여 둔 복사본을 그린다.
    // 이미지를 아직 못 받았으면 기존 그림(drawBossGuardian 원본)으로 그린다.
    // ============================================================================
    const BOSS_SPRITE_CFG = {
      dir: 'assets/bosses',
      version: '20261124h',
      srcSize: 512,
      srcFootY: 488,
      cacheSize: 256,
      drawSize: 155,        // 1단계 기준 그리는 크기(px) · 단계마다 조금씩 커짐
      footY: 56,            // 보스 좌표 기준 발끝 높이 (성소 안쪽에 맞춤)
      windupLead: 0.5       // 공격 몇 초 전부터 '공격 직전' 모습
    };

    const BossSpriteCache = new Map(); // key → { state, canvas }

    function getBossSpriteFrame(stage, pose) {
      const nn = String(Math.max(1, Math.min(10, stage | 0))).padStart(2, '0');
      const key = `t${nn}_${pose}`;
      let entry = BossSpriteCache.get(key);
      if (!entry) {
        entry = { state: 'loading', canvas: null };
        BossSpriteCache.set(key, entry);
        const img = new Image();
        img.onload = () => {
          try {
            const c = document.createElement('canvas');
            c.width = c.height = BOSS_SPRITE_CFG.cacheSize;
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
        img.src = `${BOSS_SPRITE_CFG.dir}/t${nn}/boss_t${nn}_${pose}.png?v=${BOSS_SPRITE_CFG.version}`;
      }
      return entry.state === 'ready' ? entry.canvas : null;
    }

    // 지금 단계 3장을 미리 받아 둔다 (공격 모습으로 바뀔 때 깜빡임 방지)
    function preloadBossSprites(stage) {
      ['idle', 'windup', 'attack'].forEach(p => getBossSpriteFrame(stage, p));
    }

    function pickBossPose(boss) {
      if ((boss.attackAnimTimer || 0) > 0) return 'attack';
      const cd = boss.attackCooldown || 0;
      const fighting = typeof BOSS_SANCTUM !== 'undefined' && BOSS_SANCTUM.status === 'ACTIVE';
      // 대상이 없으면 쿨다운이 계속 줄어 음수로 내려가므로 -0.3 아래는 서 있는 모습
      if (fighting && cd <= BOSS_SPRITE_CFG.windupLead && cd > -0.3) return 'windup';
      return 'idle';
    }

    (function hookBossGuardianSprite() {
      if (typeof drawBossGuardian !== 'function') return;
      const drawBossGuardianShape = drawBossGuardian;

      drawBossGuardian = function (ctx, boss) {
        if (!boss || boss.hp <= 0) return;
        const stageCfg = getBossStageConfig(boss.stage || BOSS_SANCTUM.bossStage);
        const stage = stageCfg.stage;
        preloadBossSprites(stage);
        const pose = pickBossPose(boss);
        const frame = getBossSpriteFrame(stage, pose) || getBossSpriteFrame(stage, 'idle');
        if (!frame) {
          drawBossGuardianShape(ctx, boss);
          return;
        }

        const theme = stageCfg.theme;
        const scaleSize = 1 + (stage - 1) * 0.032;
        const bt = performance.now() * 0.0035;
        const isSwinging = (boss.attackAnimTimer || 0) > 0;
        const swingProg = isSwinging ? (1 - boss.attackAnimTimer / 0.45) : 0;
        const footY = BOSS_SPRITE_CFG.footY;

        ctx.save();
        ctx.translate(boss.x, boss.y);

        ctx.save();
        ctx.scale(scaleSize, scaleSize);

        // 바닥 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, footY, 50, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // 단계 색 룬 오라 (바닥 원)
        ctx.save();
        ctx.translate(0, footY - 4);
        ctx.scale(1, 0.34);
        ctx.rotate(bt * 0.45);
        ctx.strokeStyle = theme.aura;
        ctx.lineWidth = 3.4;
        ctx.setLineDash([14, 9]);
        ctx.beginPath();
        ctx.arc(0, 0, 64, 0, Math.PI * 2);
        ctx.stroke();
        if (stage >= 8) {
          ctx.rotate(-bt * 0.9);
          ctx.beginPath();
          ctx.arc(0, 0, 76, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();

        // 내려찍기 충격파
        if (isSwinging) {
          ctx.strokeStyle = theme.stroke;
          ctx.globalAlpha = Math.max(0, 1 - swingProg);
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(0, footY - 4, 45 + swingProg * 75, 16 + swingProg * 26, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // 골렘 본체 이미지 (서 있을 땐 살짝 숨쉬기, 공격 직후엔 살짝 눌림)
        const D = BOSS_SPRITE_CFG.drawSize;
        let sx = 1, sy = 1;
        if (pose === 'idle') {
          sy = 1 + Math.sin(bt * 1.4) * 0.012;
        } else if (pose === 'attack') {
          const squash = Math.sin(swingProg * Math.PI) * 0.04;
          sx = 1 + squash;
          sy = 1 - squash;
        }
        const footRatio = BOSS_SPRITE_CFG.srcFootY / BOSS_SPRITE_CFG.srcSize;
        ctx.save();
        ctx.translate(0, footY);
        ctx.scale(sx, sy);
        // 공격 직전엔 코어 빛이 차오르는 느낌
        if (pose === 'windup') {
          ctx.shadowColor = theme.core;
          ctx.shadowBlur = 18;
        }
        ctx.drawImage(frame, -D / 2, -D * footRatio, D, D);
        ctx.shadowBlur = 0;
        ctx.restore();

        ctx.restore(); // scaleSize 종료

        // HP 바 & 이름표 (이미지 머리 위)
        const barTop = -(D * (BOSS_SPRITE_CFG.srcFootY - 84) / BOSS_SPRITE_CFG.srcSize - footY) * scaleSize - 12;
        const hpRatio = Math.max(0, boss.hp / boss.maxHp);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(-66, barTop, 132, 9);
        ctx.strokeStyle = theme.stroke;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-66, barTop, 132, 9);
        ctx.fillStyle = theme.core;
        ctx.fillRect(-65, barTop + 1, 130 * hpRatio, 7);

        ctx.fillStyle = '#fecdd3';
        ctx.font = 'bold 11.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`🔥 ${boss.name} (${Math.ceil(boss.hp).toLocaleString()} / ${boss.maxHp.toLocaleString()})`, 0, barTop - 6);
        ctx.restore();
      };
    })();
