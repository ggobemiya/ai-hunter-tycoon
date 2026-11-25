// [15e-celestial-monsters] 🌌 성운의 천궁 몬스터 외형 (날개 천사 4종)
    // ============================================================================
    // 성운의 천궁_몬스터.html 렌더러를 게임에 옮긴 것.
    //   irongolem  → 🛡️ 성운의 수호대천사 (4익 · 대방패 + 장창)
    //   shadowwolf → ⚔️ 별빛 심판 세라핌 (6익 · 별빛 대검)
    //   manaorc    → 🎼 천궁의 성가 지휘자 (원거리 · 지휘봉 + 공전 룬)
    //   kingslime  → 👑 성운왕좌의 수호신 (초월 6익 · 이중 광배 + 삼지창)
    // 크기: 몸은 사냥터 monsterScale(1.5배)로 키우고, 체력바·이름표 글자는 보통 크기.
    // 공격 모션: 몬스터 공격 쿨다운이 다시 채워지는 순간(=방금 공격함)을 보고 0.45초 휘두르기.
    // ============================================================================
    const CELESTIAL_ANGEL_KIND = {
      irongolem: 'nebula_archangel',
      shadowwolf: 'starlight_seraphim',
      manaorc: 'celestial_choir_conductor',
      kingslime: 'nebula_throne_guardian'
    };

    function drawNebulaWings(ctx, facing, flapAngle, wingConfig) {
      const {
        pairs = 2, spanX = 28, spanY = 20,
        innerColor = '#ffffff', midColor = '#bae6fd', outerColor = '#6366f1',
        strokeColor = '#e0e7ff', starSpark = true
      } = wingConfig;

      for (let p = pairs - 1; p >= 0; p--) {
        const tierRatio = pairs === 1 ? 1 : p / (pairs - 1);
        const scale = 1 - tierRatio * 0.22;
        const yOffset = -4 + p * 4.5;
        const baseSpread = 0.36 + p * 0.26;

        [-1, 1].forEach((side) => {
          ctx.save();
          ctx.translate(-facing * 3.5, yOffset);
          ctx.scale(scale, scale);
          ctx.rotate(side * (baseSpread + flapAngle * (1 - p * 0.14)));

          const grad = ctx.createLinearGradient(0, -4, side * spanX, -spanY);
          grad.addColorStop(0, innerColor);
          grad.addColorStop(0.55, midColor);
          grad.addColorStop(1, outerColor);

          ctx.fillStyle = grad;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(0, -2);
          ctx.quadraticCurveTo(side * (spanX * 0.52), -spanY * 1.15, side * spanX, -spanY * 0.72);
          ctx.quadraticCurveTo(side * (spanX * 0.88), -spanY * 0.08, side * (spanX * 1.04), spanY * 0.32);
          ctx.quadraticCurveTo(side * (spanX * 0.5), spanY * 0.48, 0, 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 깃털 결
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
          ctx.lineWidth = 1;
          for (let f = 0; f < 3; f++) {
            ctx.beginPath();
            ctx.moveTo(side * 4, -1 + f * 1.6);
            ctx.lineTo(side * (spanX * (0.78 - f * 0.07)), -spanY * (0.55 - f * 0.26));
            ctx.stroke();
          }

          // 날개 끝 별빛
          if (starSpark && p === 0) {
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(side * (spanX * 0.82), -spanY * 0.52, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        });
      }
    }

    // 방금 공격했는지(쿨다운이 다시 채워졌는지) 보고 휘두르기 타이머를 만든다
    function getCelestialAttackAnim(m) {
      const now = performance.now();
      const cd = m.attackCooldown || 0;
      if (typeof m._celPrevCd === 'number' && cd > m._celPrevCd + 0.4) m._celAtkAt = now;
      m._celPrevCd = cd;
      if (!m._celAtkAt) return 0;
      const left = 0.45 - (now - m._celAtkAt) / 1000;
      return left > 0 ? left : 0;
    }

    function drawNebulaAngelMonster(ctx, m, S = 1.5) {
      const t = performance.now() * 0.004;
      const kind = CELESTIAL_ANGEL_KIND[m.kind] || 'nebula_archangel';
      const facing = m.facing || -1;
      const flap = Math.sin(t * 3.5 + (m.x || 0) * 0.03) * 0.22;
      const hoverBob = Math.sin(t * 2.4 + (m.x || 0) * 0.02) * 3.2;
      const animLeft = getCelestialAttackAnim(m);
      const atkSwing = animLeft > 0 ? Math.sin((1 - animLeft / 0.45) * Math.PI) * 0.75 : 0;

      const isThroneBoss = kind === 'nebula_throne_guardian';
      const bodyScale = (isThroneBoss ? 1.32 : (kind === 'starlight_seraphim' ? 1.12 : 1.06)) * S;

      ctx.save();
      ctx.translate(m.x, m.y);

      // 1. 발밑 성운 마법진 & 그림자
      ctx.save();
      ctx.translate(0, 18 * bodyScale);
      ctx.scale(1, 0.42);
      ctx.rotate(t * (isThroneBoss ? 0.9 : 0.6));
      ctx.strokeStyle = isThroneBoss
        ? 'rgba(253, 224, 71, 0.78)'
        : (kind === 'celestial_choir_conductor'
            ? 'rgba(192, 132, 252, 0.75)'
            : (kind === 'starlight_seraphim' ? 'rgba(251, 113, 133, 0.75)' : 'rgba(56, 189, 248, 0.75)'));
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, 22 * bodyScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.fillStyle = 'rgba(2, 6, 23, 0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 18 * bodyScale, 15 * bodyScale, 6 * S, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(0, -hoverBob * S);
      ctx.scale(bodyScale, bodyScale);

      // 2. 날개
      if (kind === 'nebula_archangel') {
        drawNebulaWings(ctx, facing, flap, { pairs: 2, spanX: 27, spanY: 19, innerColor: '#ffffff', midColor: '#7dd3fc', outerColor: '#0284c7', strokeColor: '#bae6fd' });
      } else if (kind === 'starlight_seraphim') {
        drawNebulaWings(ctx, facing, flap, { pairs: 3, spanX: 30, spanY: 22, innerColor: '#fffbeb', midColor: '#fda4af', outerColor: '#be123c', strokeColor: '#fde047' });
      } else if (kind === 'celestial_choir_conductor') {
        drawNebulaWings(ctx, facing, flap * 1.15, { pairs: 2, spanX: 28, spanY: 21, innerColor: '#faf5ff', midColor: '#d8b4fe', outerColor: '#6d28d9', strokeColor: '#f0abfc' });
      } else {
        drawNebulaWings(ctx, facing, flap * 0.9, { pairs: 3, spanX: 35, spanY: 25, innerColor: '#ffffff', midColor: '#fde047', outerColor: '#4f46e5', strokeColor: '#fef08a' });
      }

      // 3. 로브/갑옷 & 망토
      const capeCol = isThroneBoss ? '#312e81'
        : (kind === 'starlight_seraphim' ? '#881337'
        : (kind === 'celestial_choir_conductor' ? '#4c1d95' : '#0c4a6e'));
      const armorCol = isThroneBoss ? '#f8fafc'
        : (kind === 'starlight_seraphim' ? '#fff1f2'
        : (kind === 'celestial_choir_conductor' ? '#f3e8ff' : '#f0f9ff'));
      const trimCol = isThroneBoss ? '#facc15'
        : (kind === 'starlight_seraphim' ? '#fb7185'
        : (kind === 'celestial_choir_conductor' ? '#c084fc' : '#38bdf8'));

      ctx.fillStyle = capeCol;
      ctx.beginPath();
      ctx.moveTo(-7, -3);
      ctx.lineTo(-facing * 13, 14);
      ctx.lineTo(facing * 6, 14);
      ctx.lineTo(7, -3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-5.2, 9.5, 4, 6);
      ctx.fillRect(1.2, 9.5, 4, 6);

      ctx.fillStyle = armorCol;
      ctx.strokeStyle = trimCol;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-8.5, -4.5, 17, 15.5, 4.5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = trimCol;
      ctx.beginPath();
      ctx.arc(0, 1.5, 2.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = armorCol;
      ctx.strokeStyle = trimCol;
      [-9.8, 9.8].forEach((sx) => {
        ctx.beginPath();
        ctx.arc(sx, -2.5, 4, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      // 4. 광배 · 머리 · 성관
      if (isThroneBoss) {
        ctx.save();
        ctx.translate(0, -14);
        ctx.rotate(t * 0.7);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.ellipse(0, -21.5, isThroneBoss ? 8.5 : 6.8, 2.3, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(0, -10.5, 6.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = kind === 'starlight_seraphim' ? '#fde68a'
        : (kind === 'celestial_choir_conductor' ? '#e9d5ff' : '#f8fafc');
      ctx.beginPath();
      ctx.arc(0, -11.8, 7.1, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-7, -11.8, 2.2, 8.5);
      ctx.fillRect(4.8, -11.8, 2.2, 8.5);

      ctx.fillStyle = trimCol;
      ctx.beginPath();
      ctx.moveTo(-6, -15.5);
      ctx.lineTo(-9, -21);
      ctx.lineTo(-2.5, -17);
      ctx.lineTo(0, -23.5);
      ctx.lineTo(2.5, -17);
      ctx.lineTo(9, -21);
      ctx.lineTo(6, -15.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isThroneBoss ? '#facc15' : trimCol;
      ctx.beginPath();
      ctx.arc(facing * 2.4, -10.2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 5. 무기
      if (kind === 'nebula_archangel') {
        ctx.save();
        ctx.translate(-facing * 8.5, 2);
        ctx.fillStyle = '#0369a1';
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-5.5, -7);
        ctx.lineTo(5.5, -7);
        ctx.lineTo(5, 4);
        ctx.lineTo(0, 9.5);
        ctx.lineTo(-5, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.translate(facing * 10.5, 1);
        ctx.rotate(facing * (0.35 + atkSwing));
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-1.6, -24, 3.2, 31);
        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.moveTo(-4.5, -20);
        ctx.lineTo(0, -31);
        ctx.lineTo(4.5, -20);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (kind === 'starlight_seraphim') {
        ctx.save();
        ctx.translate(facing * 10.5, 1);
        ctx.rotate(facing * (0.4 + atkSwing));
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-6.5, -2.5, 13, 3);
        ctx.fillStyle = '#fda4af';
        ctx.strokeStyle = '#be123c';
        ctx.lineWidth = 1.3;
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(-3.4, -2);
        ctx.lineTo(-2.6, -26);
        ctx.lineTo(0, -33);
        ctx.lineTo(2.6, -26);
        ctx.lineTo(3.4, -2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      } else if (kind === 'celestial_choir_conductor') {
        ctx.save();
        ctx.translate(facing * 10, 1);
        ctx.rotate(facing * (0.25 - atkSwing * 0.6));
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.lineTo(0, -22);
        ctx.stroke();
        ctx.fillStyle = '#e879f9';
        ctx.beginPath();
        ctx.arc(0, -24, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        for (let i = 0; i < 3; i++) {
          const ang = t * 2.8 + (i * Math.PI * 2) / 3;
          ctx.fillStyle = i % 2 === 0 ? '#f0abfc' : '#fde047';
          ctx.beginPath();
          ctx.arc(Math.cos(ang) * 18, -8 + Math.sin(ang) * 7, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.save();
        ctx.translate(facing * 11, 1);
        ctx.rotate(facing * (0.34 + atkSwing));
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-1.8, -26, 3.6, 34);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(-7.5, -24, 15, 3);
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(-3, -24);
        ctx.lineTo(0, -37);
        ctx.lineTo(3, -24);
        ctx.moveTo(-6.2, -24);
        ctx.lineTo(-5.5, -32);
        ctx.lineTo(-4, -24);
        ctx.moveTo(6.2, -24);
        ctx.lineTo(5.5, -32);
        ctx.lineTo(4, -24);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      ctx.restore(); // 몸 크기 종료

      // 6. 체력바 & 이름표 (글자는 보통 크기)
      const hpRatio = Math.max(0, m.hp / m.maxHp);
      const barY = (isThroneBoss ? -46 : -38) * (bodyScale / (isThroneBoss ? 1.32 : 1.06)) - 4;
      const barW = isThroneBoss ? 64 : 52;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(-barW / 2, barY, barW, 5.5);
      ctx.fillStyle = isThroneBoss ? '#fde047' : (m.isRanged ? '#d8b4fe' : '#7dd3fc');
      ctx.fillRect(-barW / 2 + 1, barY + 1, (barW - 2) * hpRatio, 3.5);

      ctx.fillStyle = isThroneBoss ? '#fef08a' : '#f8fafc';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const crown = isThroneBoss && !String(m.name || '').startsWith('👑') ? '👑 ' : '';
      ctx.fillText(`${crown}${m.name}${m.isRanged ? ' [원거리]' : ''}`, 0, barY - 5);

      ctx.restore();
    }
