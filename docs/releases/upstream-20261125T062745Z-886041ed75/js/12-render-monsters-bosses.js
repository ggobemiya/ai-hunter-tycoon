// [12-render-monsters-bosses] 렌더링: 필드 몬스터 · 보스
    /**
     * ============================================================================
     * 사냥터 몬스터 명칭별 전용 외형 렌더러
     * ============================================================================
     */
    function drawFieldMonster(ctx, m) {
      const t = performance.now() * 0.004;
      const bounce = Math.abs(Math.sin(t + m.spawnX * 0.05)) * 2.2;
      const kind = m.kind || 'slime';
      const isSkyIslandUnit = SKY_ISLAND_GROUND.monsters.includes(m);

      ctx.save();
      ctx.translate(m.x, m.y);

      if (isSkyIslandUnit) {
        // [천공의 섬 전용 외형] 헌터 실루엣 기반의 백색 천사 몬스터 + 등에 커다란 날개
        const facing = m.facing || -1;
        const walkPhase = m.walkCycle || (t * 4.2 + m.spawnX * 0.05);
        const wingFlap = Math.sin(t * 3.4 + m.spawnX * 0.03) * 0.24;
        const hoverBob = Math.abs(Math.sin(walkPhase)) * 2.4 + Math.sin(t * 2.1) * 1.4;
        const isLargeSeraph = kind === 'kingslime' || kind === 'irongolem';
        const bodyScale = isLargeSeraph ? 1.18 : 1.02;

        // 발밑 천공 성광 마법진 & 그림자
        ctx.save();
        ctx.translate(0, 14);
        ctx.scale(1, 0.44);
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.72)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, 17 * bodyScale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 12 * bodyScale, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(0, -hoverBob);
        ctx.scale(bodyScale, bodyScale);

        // 1. 등에 달린 커다란 백색 천사 날개 (좌·우 깃털 날개)
        const drawLargeAngelWing = (side) => {
          ctx.save();
          ctx.translate(-facing * 4, -4);
          ctx.rotate(side * (0.48 + wingFlap));

          const wingGrad = ctx.createLinearGradient(0, -4, -side * 24, -18);
          wingGrad.addColorStop(0, '#ffffff');
          wingGrad.addColorStop(0.65, '#f1f5f9');
          wingGrad.addColorStop(1, '#e0f2fe');

          ctx.fillStyle = wingGrad;
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.4;

          // 주 날개 외곽 실루엣
          ctx.beginPath();
          ctx.moveTo(0, -2);
          ctx.quadraticCurveTo(side * 12, -22, side * 25, -16);
          ctx.quadraticCurveTo(side * 22, -4, side * 26, 5);
          ctx.quadraticCurveTo(side * 13, 9, 0, 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 날개 깃털 결 라인
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
          ctx.lineWidth = 1.1;
          for (let f = 0; f < 3; f++) {
            const fy = -12 + f * 6;
            ctx.beginPath();
            ctx.moveTo(side * 4, -1 + f * 1.5);
            ctx.lineTo(side * (20 - f * 1.5), fy);
            ctx.stroke();
          }
          ctx.restore();
        };
        drawLargeAngelWing(-1);
        drawLargeAngelWing(1);

        // 2. 백색 천사 다리 & 부츠
        const legSwing = Math.sin(walkPhase) * 2.8;
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.fillRect(-5.5, 9 + legSwing * 0.35, 4.2, 6.5);
        ctx.strokeRect(-5.5, 9 + legSwing * 0.35, 4.2, 6.5);
        ctx.fillRect(1.3, 9 - legSwing * 0.35, 4.2, 6.5);
        ctx.strokeRect(1.3, 9 - legSwing * 0.35, 4.2, 6.5);

        // 3. 백색 천사 망토 & 갑옷 몸통 (헌터 체형 실루엣)
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.moveTo(-6.5, -3);
        ctx.lineTo(-facing * 12, 12.5);
        ctx.lineTo(facing * 5.5, 12.5);
        ctx.lineTo(6.5, -3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(-8.5, -4.5, 17, 15.5, 4.5);
        ctx.fill();
        ctx.stroke();

        // 성스러운 금빛·은빛 흉갑 문양 & 허리띠
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-5.2, -2.2, 10.4, 6.8);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(-8, 6.2, 16, 2.2);

        // 천사 어깨 견갑
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        [-9.5, 9.5].forEach((sx) => {
          ctx.beginPath();
          ctx.arc(sx, -2.5, 3.8, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });

        // 4. 백색 천사 머리 · 은백색 머리카락 · 천사 링(헤일로) · 백은 투구
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, -21.5, 6.5, 2.2, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fffbeb';
        ctx.beginPath();
        ctx.arc(0, -10.5, 6.8, 0, Math.PI * 2);
        ctx.fill();

        // 순백/은백색 머리카락
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -11.8, 7.1, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(-7, -11.8, 2.2, 8.5);
        ctx.fillRect(4.8, -11.8, 2.2, 8.5);

        // 백색 투구 & 날개 장식
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(0, -12.5, 7.2, Math.PI * 1.05, -0.05 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(-5.5, -15.5);
        ctx.lineTo(-10, -20.5);
        ctx.lineTo(-3, -17);
        ctx.moveTo(5.5, -15.5);
        ctx.lineTo(10, -20.5);
        ctx.lineTo(3, -17);
        ctx.fill();

        // 천사 안광 (황금·하늘빛)
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(facing * 2.4, -10.2, 1.45, 0, Math.PI * 2);
        ctx.fill();

        // 5. 천사 몬스터별 고유 무기 모양 & 색상
        const swingAngle = Math.sin(walkPhase) * 0.14;
        if (kind === 'shadowwolf') {
          // 성광의 심판천사: 진홍·황금빛 심판대검
          ctx.save();
          ctx.translate(facing * 10, 1);
          ctx.rotate(facing * (0.42 + swingAngle));
          ctx.fillStyle = '#991b1b';
          ctx.fillRect(-1.6, 0, 3.2, 6);
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(-7, -3.5);
          ctx.lineTo(0, -1);
          ctx.lineTo(7, -3.5);
          ctx.lineTo(5.5, 1.2);
          ctx.lineTo(-5.5, 1.2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#fda4af';
          ctx.strokeStyle = '#be123c';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-3.2, -1);
          ctx.lineTo(-2.6, -24);
          ctx.lineTo(0, -30);
          ctx.lineTo(2.6, -24);
          ctx.lineTo(3.2, -1);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fde047';
          ctx.fillRect(-0.8, -23, 1.6, 19);
          ctx.restore();
        } else if (kind === 'manaorc') {
          // 천공의 성가대천사: 자수정빛 고리 지팡이 & 마력 오브
          ctx.save();
          ctx.translate(facing * 10, 1);
          ctx.rotate(facing * (0.28 + swingAngle));
          ctx.fillStyle = '#581c87';
          ctx.fillRect(-1.4, -22, 2.8, 28);
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 1.9;
          ctx.beginPath();
          ctx.arc(0, -23, 5.8, 0.22 * Math.PI, 0.78 * Math.PI, true);
          ctx.stroke();
          ctx.fillStyle = '#e879f9';
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, -25, 3.8 + Math.sin(t * 6) * 0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.restore();
        } else if (kind === 'kingslime') {
          // 대천사 세라핌: 에메랄드·황금빛 삼지 성창
          ctx.save();
          ctx.translate(facing * 10.5, 1);
          ctx.rotate(facing * (0.34 + swingAngle));
          ctx.fillStyle = '#b45309';
          ctx.fillRect(-1.7, -23, 3.4, 30);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-6.5, -21, 13, 2.6);
          ctx.fillStyle = '#34d399';
          ctx.strokeStyle = '#047857';
          ctx.lineWidth = 1.1;
          // 중앙 창날
          ctx.beginPath();
          ctx.moveTo(-2.6, -21);
          ctx.lineTo(0, -33);
          ctx.lineTo(2.6, -21);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // 좌·우 보조 창날
          [-5.2, 5.2].forEach((px) => {
            ctx.beginPath();
            ctx.moveTo(px - 1.6, -21);
            ctx.lineTo(px, -28.5);
            ctx.lineTo(px + 1.6, -21);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          });
          ctx.restore();
        } else {
          // 백익의 수호천사: 빙청색 성광 장창 + 좌측 성광 방패
          ctx.save();
          ctx.translate(-facing * 8, 2);
          ctx.fillStyle = '#0284c7';
          ctx.strokeStyle = '#bae6fd';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(-4.5, -6);
          ctx.lineTo(4.5, -6);
          ctx.lineTo(4, 3);
          ctx.lineTo(0, 7.5);
          ctx.lineTo(-4, 3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.translate(facing * 10, 1);
          ctx.rotate(facing * (0.36 + swingAngle));
          ctx.fillStyle = '#0369a1';
          ctx.fillRect(-1.5, -22, 3, 28);
          ctx.fillStyle = '#7dd3fc';
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-4, -18);
          ctx.lineTo(0, -28);
          ctx.lineTo(4, -18);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore();

        // HP 바 & 이름표
        const hpRatio = Math.max(0, m.hp / m.maxHp);
        const barY = isLargeSeraph ? -38 : -34;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(-22, barY, 44, 5);
        ctx.fillStyle = m.provoked ? '#f87171' : '#e0f2fe';
        ctx.fillRect(-21, barY + 1, 42 * hpRatio, 3);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`👼 ${m.name}`, 0, barY - 4);
        ctx.restore();
        return;
      }

      if (m.isFieldMiniBoss || kind === 'field_miniboss') {
        const theme = m.bossTheme || 'meadow_slime';
        const auraColor = theme === 'gray_doppelganger_king'
          ? 'rgba(209, 213, 219, 0.58)'
          : (theme === 'volcano_overlord'
              ? 'rgba(249, 115, 22, 0.58)'
              : (theme === 'canyon_golem' ? 'rgba(56, 189, 248, 0.52)' : 'rgba(74, 222, 128, 0.52)'));

        // 중간 보스 전용 필드 테마 오라
        ctx.strokeStyle = auraColor;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, 18, 28 + Math.sin(t * 2) * 3, 11, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
        ctx.beginPath();
        ctx.ellipse(0, 18, 24, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(0, -bounce * 0.8);

        if (theme === 'gray_doppelganger_king') {
          // 0) 윤회의 성역 중간 보스: 👑 회색 도플갱어 군주 (거대화 헌터 실루엣 + 은회색 망토/왕관/대검)
          ctx.scale(1.42, 1.42);
          const facing = m.facing || -1;

          // 다리
          ctx.fillStyle = '#1f2937';
          ctx.fillRect(-5.5, 10, 4, 6);
          ctx.fillRect(1.5, 10, 4, 6);

          // 회색 군주 망토
          ctx.fillStyle = '#374151';
          ctx.beginPath();
          ctx.moveTo(-7, -2);
          ctx.lineTo(-facing * 14, 14);
          ctx.lineTo(facing * 6, 14);
          ctx.lineTo(7, -2);
          ctx.closePath();
          ctx.fill();

          // 중갑 갑옷 & 견갑
          ctx.fillStyle = '#6b7280';
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.roundRect(-9.5, -4.5, 19, 16.5, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#9ca3af';
          ctx.fillRect(-6, -2.5, 12, 7.5);
          [-10.5, 10.5].forEach((sx) => {
            ctx.beginPath();
            ctx.arc(sx, -2, 4.4, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          });

          // 머리 & 회색 머리카락
          ctx.fillStyle = '#d1d5db';
          ctx.beginPath();
          ctx.arc(0, -10, 6.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#4b5563';
          ctx.beginPath();
          ctx.arc(0, -11.5, 7.1, Math.PI, 0);
          ctx.fill();

          // 안광
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(facing * 2.3 - 1.2, -10.3, 2.4, 2.1);

          // 은회색 투구 & 왕관
          ctx.fillStyle = '#9ca3af';
          ctx.strokeStyle = '#f3f4f6';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.arc(0, -12, 7.3, Math.PI * 1.05, -0.05 * Math.PI);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#e5e7eb';
          ctx.beginPath();
          ctx.moveTo(-7, -15);
          ctx.lineTo(-8, -22);
          ctx.lineTo(-3, -18);
          ctx.lineTo(0, -24);
          ctx.lineTo(3, -18);
          ctx.lineTo(8, -22);
          ctx.lineTo(7, -15);
          ctx.closePath();
          ctx.fill();

          // 회색 대검
          ctx.save();
          ctx.translate(facing * 10, 2);
          ctx.rotate(facing * 0.42);
          ctx.fillStyle = '#374151';
          ctx.fillRect(-1.5, 0, 3, 6);
          ctx.fillStyle = '#d1d5db';
          ctx.fillRect(-6, -2.2, 12, 3);
          ctx.fillStyle = '#f3f4f6';
          ctx.beginPath();
          ctx.moveTo(-2.8, -2);
          ctx.lineTo(-2.3, -24);
          ctx.lineTo(0, -28);
          ctx.lineTo(2.3, -24);
          ctx.lineTo(2.8, -2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (theme === 'meadow_slime') {
          ctx.lineTo(-26, 6);
          ctx.moveTo(18, -16);
          ctx.lineTo(32, -28);
          ctx.lineTo(26, 6);
          ctx.fill();

          // 흑요석 몸체
          ctx.fillStyle = '#27272a';
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.roundRect(-20, -22, 40, 36, 10);
          ctx.fill();
          ctx.stroke();

          // 흉부 용암 심장석 코어
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(0, -2, 7.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(0, -2, 3.6, 0, Math.PI * 2);
          ctx.fill();

          // 쌍뿔 & 화염 패왕관
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#991b1b';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-15, -21);
          ctx.lineTo(-24, -36);
          ctx.lineTo(-8, -24);
          ctx.lineTo(0, -37);
          ctx.lineTo(8, -24);
          ctx.lineTo(24, -36);
          ctx.lineTo(15, -21);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 작열하는 안광
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(-7, -13, 2.6, 0, Math.PI * 2);
          ctx.arc(7, -13, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        const hpRatio = Math.max(0, m.hp / m.maxHp);
        const barY = -44;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(-32, barY, 64, 6);
        ctx.fillStyle = theme === 'gray_doppelganger_king'
          ? '#d1d5db'
          : (theme === 'volcano_overlord' ? '#f97316' : (theme === 'canyon_golem' ? '#38bdf8' : '#22c55e'));
        ctx.fillRect(-31, barY + 1, 62 * hpRatio, 4);

        ctx.fillStyle = theme === 'gray_doppelganger_king' ? '#e5e7eb' : '#fde047';
        ctx.font = 'bold 10.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.name, 0, barY - 5);
        ctx.restore();
        return;
      }

      if (kind === 'doppelganger') {
        // 윤회의 성역 전용: 헌터와 똑같이 생긴 회색 도플갱어 렌더링
        const facing = m.facing || -1;
        const walkPhase = m.walkCycle || (t * 4 + m.spawnX * 0.05);
        const stepBob = Math.abs(Math.sin(walkPhase)) * 2.6;
        const isFemale = m.doppelGender === 'F';
        const dJob = m.doppelJob || '팔라딘';

        // 발밑 은회색 환영 잔상 링
        ctx.strokeStyle = 'rgba(209, 213, 219, 0.45)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(0, 14, 14 + Math.sin(t * 2.6) * 1.4, 6, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 바닥 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 11, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(0, -stepBob);

        // 1. 다리 (헌터와 동일한 보행 스윙)
        const legSwing = Math.sin(walkPhase) * 3;
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(-5.5, 10 + legSwing * 0.4, 4, 6);
        ctx.fillRect(1.5, 10 - legSwing * 0.4, 4, 6);

        // 2. 회색 망토
        ctx.fillStyle = '#4b5563';
        ctx.beginPath();
        ctx.moveTo(-6, -2);
        ctx.lineTo(-facing * 12, 13);
        ctx.lineTo(facing * 5, 13);
        ctx.lineTo(6, -2);
        ctx.closePath();
        ctx.fill();

        // 3. 여성형 긴 회색 뒷머리 레이어
        if (isFemale) {
          ctx.fillStyle = '#6b7280';
          ctx.beginPath();
          ctx.roundRect(-8.5, -13, 17, 23, [8, 8, 5, 5]);
          ctx.fill();
          ctx.strokeStyle = 'rgba(17, 24, 39, 0.6)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // 4. 회색 갑옷 몸통 (여성: 슬림 흉갑 + 플레어 스커트 / 남성: 역삼각형 중갑)
        if (isFemale) {
          ctx.fillStyle = '#9ca3af';
          ctx.beginPath();
          ctx.roundRect(-7.5, -4, 15, 11, 4);
          ctx.fill();
          ctx.strokeStyle = '#1f2937';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#d1d5db';
          ctx.beginPath();
          ctx.moveTo(-7.5, 6);
          ctx.lineTo(7.5, 6);
          ctx.lineTo(10.5, 13.5);
          ctx.lineTo(-10.5, 13.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#e5e7eb';
          ctx.fillRect(-4.2, -2, 8.4, 5.5);
          ctx.fillStyle = '#374151';
          ctx.fillRect(-7.5, 5.5, 15, 2.2);
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(-2, 5, 4, 3.2);
        } else {
          ctx.fillStyle = '#9ca3af';
          ctx.beginPath();
          ctx.roundRect(-9.5, -4.5, 19, 16.5, 4);
          ctx.fill();
          ctx.strokeStyle = '#1f2937';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#d1d5db';
          ctx.fillRect(-6, -2.5, 12, 7.5);
          ctx.fillStyle = '#374151';
          ctx.fillRect(-9, 7, 18, 2.8);
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(-2.5, 6.5, 5, 3.8);
        }

        // 어깨 견갑
        ctx.fillStyle = '#d1d5db';
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 1.2;
        const shoulderOffset = isFemale ? 8.5 : 10.5;
        [-shoulderOffset, shoulderOffset].forEach((sx) => {
          ctx.beginPath();
          ctx.arc(sx, -2, 4.1, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });

        // 5. 회색빛 피부 얼굴 & 머리카락 & 투구
        ctx.fillStyle = '#d1d5db';
        ctx.beginPath();
        ctx.arc(0, -10, 6.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#6b7280';
        ctx.beginPath();
        ctx.arc(0, -11.5, 7.1, Math.PI, 0);
        ctx.fill();

        if (isFemale) {
          ctx.fillRect(-7.2, -11.5, 2.4, 9.5);
          ctx.fillRect(4.8, -11.5, 2.4, 9.5);
          ctx.beginPath();
          ctx.arc(-8.2, -6, 2.3, 0, Math.PI * 2);
          ctx.arc(8.2, -6, 2.3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-6.8, -11.5, 2, 4.5);
          ctx.fillRect(4.8, -11.5, 2, 4.5);
        }

        // 도플갱어 눈 (서늘한 은백색 안광)
        const eyeX = facing * 2.3;
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(eyeX, -9.8, 1.4, 0, Math.PI * 2);
        ctx.fill();

        // 회색 투구 & 뿔 장식
        ctx.fillStyle = '#9ca3af';
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(0, -12, 7.3, Math.PI * 1.05, -0.05 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath();
        ctx.moveTo(-6, -15);
        ctx.lineTo(-9, -20);
        ctx.lineTo(-3, -17);
        ctx.moveTo(6, -15);
        ctx.lineTo(9, -20);
        ctx.lineTo(3, -17);
        ctx.fill();

        // 6. 직업별 회색 무기 렌더링 (헌터 무기 모형 동일)
        ctx.save();
        ctx.translate(facing * 10, 2);
        const swingAngle = Math.sin(walkPhase) * 0.14;
        const baseAngle = dJob === '레인저' ? 0.15 : (dJob === '소서러' ? 0.28 : 0.42);
        ctx.rotate(facing * (baseAngle + swingAngle));
        const bladeLen = 23;

        if (dJob === '버서커') {
          ctx.fillStyle = '#374151';
          ctx.fillRect(-1.8, -bladeLen, 3.6, bladeLen + 6);
          ctx.fillStyle = '#e5e7eb';
          ctx.strokeStyle = '#1f2937';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(-2, -bladeLen + 2);
          ctx.quadraticCurveTo(-12, -bladeLen + 1, -13, -bladeLen + 8);
          ctx.quadraticCurveTo(-12, -bladeLen + 15, -2, -bladeLen + 13);
          ctx.lineTo(2, -bladeLen + 13);
          ctx.quadraticCurveTo(12, -bladeLen + 15, 13, -bladeLen + 8);
          ctx.quadraticCurveTo(12, -bladeLen + 1, 2, -bladeLen + 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (dJob === '레인저') {
          ctx.strokeStyle = '#d1d5db';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(-facing * 3, -bladeLen * 0.85);
          ctx.quadraticCurveTo(facing * 9.5, -bladeLen * 0.35, -facing * 3, 5);
          ctx.stroke();

          ctx.strokeStyle = '#9ca3af';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(-facing * 3, -bladeLen * 0.85);
          ctx.lineTo(-facing * 3, 5);
          ctx.stroke();

          const arrowY = -bladeLen * 0.4;
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-facing * 5, arrowY);
          ctx.lineTo(facing * 11, arrowY);
          ctx.stroke();

          ctx.fillStyle = '#f3f4f6';
          ctx.beginPath();
          ctx.moveTo(facing * 14.5, arrowY);
          ctx.lineTo(facing * 10, arrowY - 2.8);
          ctx.lineTo(facing * 10, arrowY + 2.8);
          ctx.closePath();
          ctx.fill();
        } else if (dJob === '소서러') {
          ctx.fillStyle = '#374151';
          ctx.fillRect(-1.5, -bladeLen + 4, 3, bladeLen + 2);
          ctx.strokeStyle = '#d1d5db';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(0, -bladeLen + 1, 5.5, 0.2 * Math.PI, 0.8 * Math.PI, true);
          ctx.stroke();

          ctx.fillStyle = '#f3f4f6';
          ctx.beginPath();
          ctx.arc(0, -bladeLen - 1, 4 + Math.sin(t * 6) * 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#374151';
          ctx.fillRect(-1.5, 0, 3, 6);
          ctx.fillStyle = '#9ca3af';
          ctx.fillRect(-6, -2.2, 12, 3);
          ctx.fillStyle = '#e5e7eb';
          ctx.beginPath();
          ctx.moveTo(-2.6, -2);
          ctx.lineTo(-2.1, -bladeLen + 5);
          ctx.lineTo(0, -bladeLen);
          ctx.lineTo(2.1, -bladeLen + 5);
          ctx.lineTo(2.6, -2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.restore();

        // HP 바 & 이름표 (헌터 이름표와 동일한 위치)
        const hpRatio = Math.max(0, m.hp / m.maxHp);
        const barY = -36;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(-20, barY, 40, 5);
        ctx.fillStyle = m.provoked ? '#e5e7eb' : '#9ca3af';
        ctx.fillRect(-19, barY + 1, 38 * hpRatio, 3);

        ctx.fillStyle = '#e5e7eb';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.name, 0, barY - 4);
        ctx.restore();
        return;
      }

      // 공통 바닥 그림자
      const shadowRx = kind === 'kingslime' ? 17 : 12;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.beginPath();
      ctx.ellipse(0, 12, shadowRx, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(0, -bounce);

      if (kind === 'slime' || kind === 'kingslime') {
        const r = kind === 'kingslime' ? 19 : 13;
        ctx.fillStyle = m.color;
        ctx.strokeStyle = m.stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 2, r, Math.PI, 0);
        ctx.quadraticCurveTo(r, r * 0.85, 0, r * 0.85);
        ctx.quadraticCurveTo(-r, r * 0.85, -r, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 젤리 광택 & 눈
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.36, -r * 0.32, r * 0.24, r * 0.14, -0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-4.5, 2, 1.8, 0, Math.PI * 2);
        ctx.arc(4.5, 2, 1.8, 0, Math.PI * 2);
        ctx.fill();

        if (kind === 'kingslime') {
          // 킹 슬라임 황금 왕관
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#854d0e';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(-9, -r + 2);
          ctx.lineTo(-11, -r - 8);
          ctx.lineTo(-4, -r - 3);
          ctx.lineTo(0, -r - 10);
          ctx.lineTo(4, -r - 3);
          ctx.lineTo(11, -r - 8);
          ctx.lineTo(9, -r + 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else if (kind === 'hornrabbit') {
        // 뿔 토끼
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(0, 3, 12, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 긴 토끼 귀
        ctx.beginPath();
        ctx.ellipse(-5, -11, 3.2, 8, -0.15, 0, Math.PI * 2);
        ctx.ellipse(5, -11, 3.2, 8, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 황금 단일 뿔 & 붉은 눈
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(-2.5, -5);
        ctx.lineTo(0, -17);
        ctx.lineTo(2.5, -5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(-4, 2, 1.7, 0, Math.PI * 2);
        ctx.arc(4, 2, 1.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'irongolem') {
        // 철갑 골렘
        ctx.fillStyle = m.color;
        ctx.strokeStyle = m.stroke;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(-14, -12, 28, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.arc(-5, -2, 2.2, 0, Math.PI * 2);
        ctx.arc(5, -2, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'shadowwolf') {
        // 그림자 늑대
        ctx.fillStyle = m.color;
        ctx.strokeStyle = m.stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 2, 15, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-10, -4); ctx.lineTo(-14, -14); ctx.lineTo(-4, -7);
        ctx.moveTo(4, -5);  ctx.lineTo(10, -15);  ctx.lineTo(11, -4);
        ctx.fill();

        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(5, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 숲 고블린궁수 / 마력 오크사수 (원거리 활 소지)
        ctx.fillStyle = m.color;
        ctx.strokeStyle = m.stroke;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 1, 11.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 뾰족한 고블린 귀
        ctx.beginPath();
        ctx.moveTo(-10, 0); ctx.lineTo(-17, -4); ctx.lineTo(-10, 4);
        ctx.moveTo(10, 0); ctx.lineTo(17, -4); ctx.lineTo(10, 4);
        ctx.fill();

        // 원거리 단궁
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(11, 1, 10, -1.15, 1.15);
        ctx.stroke();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(11 + Math.cos(-1.15) * 10, 1 + Math.sin(-1.15) * 10);
        ctx.lineTo(11 + Math.cos(1.15) * 10, 1 + Math.sin(1.15) * 10);
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(-4, 0, 1.7, 0, Math.PI * 2);
        ctx.arc(4, 0, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // HP 바 & 몬스터 이름
      const hpRatio = Math.max(0, m.hp / m.maxHp);
      const barY = kind === 'kingslime' ? -33 : -24;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(-20, barY, 40, 5);
      ctx.fillStyle = m.provoked ? '#f97316' : '#4ade80';
      ctx.fillRect(-19, barY + 1, 38 * hpRatio, 3);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.name, 0, barY - 4);
      ctx.restore();
    }

    // 환생 제단 최상급 중간보스 렌더러 (예전 그림 · 이미지가 없을 때만 씀 · 지금은 js/40-altar-lich-king.js 리치 킹 이미지)
    function drawRebirthSupremeBoss(ctx, boss) {
      if (!boss || boss.hp <= 0) return;
      const t = performance.now() * 0.004;
      const floatY = Math.sin(t * 1.8) * 3;
      const isSwinging = (boss.attackAnimTimer || 0) > 0;

      ctx.save();
      ctx.translate(boss.x, boss.y);

      // 바닥 윤회 마법진 오라
      ctx.save();
      ctx.translate(0, 16);
      ctx.scale(1, 0.45);
      ctx.rotate(t * 0.9);
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.78)';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 16, 26, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(0, -floatY);

      // 윤회 광배 링
      ctx.strokeStyle = '#f0abfc';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, -14, 24, 0, Math.PI * 2);
      ctx.stroke();

      // 갑주 몸체
      ctx.fillStyle = '#4c1d95';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(-20, -24, 40, 38, 11);
      ctx.fill();
      ctx.stroke();

      // 흉부 초월 윤회 코어
      ctx.fillStyle = '#f472b6';
      ctx.shadowColor = '#e879f9';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, -4, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, -4, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 황금 왕관 & 쌍뿔
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(-16, -23);
      ctx.lineTo(-22, -38);
      ctx.lineTo(-7, -26);
      ctx.lineTo(0, -41);
      ctx.lineTo(7, -26);
      ctx.lineTo(22, -38);
      ctx.lineTo(16, -23);
      ctx.closePath();
      ctx.fill();

      // 양팔 참격 모션
      const armOffset = isSwinging ? 8 : 0;
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(-28 - armOffset, -14, 10, 22);
      ctx.fillRect(18 + armOffset, -14, 10, 22);

      // 안광
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-7, -14, 2.8, 0, Math.PI * 2);
      ctx.arc(7, -14, 2.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      const hpRatio = Math.max(0, boss.hp / boss.maxHp);
      const barY = -54;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(-38, barY, 76, 7);
      ctx.fillStyle = '#e879f9';
      ctx.fillRect(-37, barY + 1, 74 * hpRatio, 5);

      ctx.fillStyle = '#fae8ff';
      ctx.font = 'bold 10.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(boss.name, 0, barY - 6);
      ctx.restore();
    }

    // 대형 보스 전용 렌더러 (1~10단계별 고유 색상·왕관/광배·룬 오라 + 양팔 내려찍기 모션)
    function drawBossGuardian(ctx, boss) {
      if (!boss || boss.hp <= 0) return;
      const stageCfg = getBossStageConfig(boss.stage || BOSS_SANCTUM.bossStage);
      const theme = stageCfg.theme;
      const scaleSize = 1 + (stageCfg.stage - 1) * 0.032; // 상위 단계일수록 위압감 증가

      const bt = performance.now() * 0.0035;
      const breathe = Math.sin(bt * 1.4) * 3.2;
      const isSwinging = (boss.attackAnimTimer || 0) > 0;
      const swingProg = isSwinging ? (1 - boss.attackAnimTimer / 0.45) : 0;
      const armSwing = isSwinging ? Math.sin(swingProg * Math.PI) * 18 : Math.sin(bt) * 3;

      ctx.save();
      ctx.translate(boss.x, boss.y);

      ctx.save();
      ctx.scale(scaleSize, scaleSize);

      // 바닥 거대 그림자 & 지진 충격파 링
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 44, 54, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isSwinging) {
        ctx.strokeStyle = theme.stroke;
        ctx.globalAlpha = Math.max(0, 1 - swingProg);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 38, 45 + swingProg * 75, 16 + swingProg * 26, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 회전하는 고대 룬 외곽 오라 (9~10단계는 이중 차원 링)
      ctx.save();
      ctx.translate(0, -6 + breathe * 0.4);
      ctx.rotate(bt * 0.45);
      ctx.strokeStyle = theme.aura;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 52, 0, Math.PI * 2);
      ctx.stroke();
      if (stageCfg.stage >= 8) {
        ctx.rotate(-bt * 0.9);
        ctx.beginPath();
        ctx.arc(0, 0, 62, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // 거신 다리 기둥
      ctx.fillStyle = theme.limb;
      ctx.strokeStyle = theme.stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-26, 16, 18, 26, 6);
      ctx.roundRect(8, 16, 18, 26, 6);
      ctx.fill();
      ctx.stroke();

      // 거대 양팔 (공격 시 내려찍기 모션)
      [-44, 44].forEach((ax, idx) => {
        const dir = idx === 0 ? -1 : 1;
        ctx.save();
        ctx.translate(ax, -10 + breathe * 0.5);
        ctx.rotate(dir * (isSwinging ? -0.45 + swingProg * 1.1 : Math.sin(bt) * 0.08));
        ctx.fillStyle = theme.limb;
        ctx.strokeStyle = theme.stroke;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.roundRect(-11, -6, 22, 46 + armSwing * 0.35, 9);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = theme.horn;
        ctx.beginPath();
        ctx.arc(0, 38 + armSwing * 0.35, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 거대 몸통 갑주
      ctx.save();
      ctx.translate(0, breathe * 0.5);
      ctx.fillStyle = theme.body;
      ctx.strokeStyle = theme.stroke;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.roundRect(-36, -40, 72, 66, 18);
      ctx.fill();
      ctx.stroke();

      // 어깨 거석 견갑
      ctx.fillStyle = theme.limb;
      ctx.strokeStyle = theme.horn;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(-48, -42, 22, 24, 8);
      ctx.roundRect(26, -42, 22, 24, 8);
      ctx.fill();
      ctx.stroke();

      // 단계별 투구/왕관/광배 장식 차별화
      ctx.fillStyle = theme.horn;
      ctx.strokeStyle = theme.limb;
      ctx.lineWidth = 2;
      if (theme.crownStyle === 'fortress') {
        // 2보스 강철 성채 흉벽 투구
        ctx.fillRect(-30, -50, 14, 12);
        ctx.fillRect(-7, -54, 14, 16);
        ctx.fillRect(16, -50, 14, 12);
      } else if (theme.crownStyle === 'crystal') {
        // 3·5보스 삼중 수정 첨탑
        ctx.beginPath();
        ctx.moveTo(-24, -38); ctx.lineTo(-20, -62); ctx.lineTo(-10, -39);
        ctx.moveTo(-8, -40);  ctx.lineTo(0, -70);   ctx.lineTo(8, -40);
        ctx.moveTo(10, -39);  ctx.lineTo(20, -62);  ctx.lineTo(24, -38);
        ctx.fill();
        ctx.stroke();
      } else if (theme.crownStyle === 'halo' || theme.crownStyle === 'transcendent') {
        // 6·8·10보스 천상 광배 + 삼중 성관
        ctx.strokeStyle = theme.horn;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -46, 26, Math.PI * 1.1, -0.1 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-22, -38); ctx.lineTo(-26, -58); ctx.lineTo(-10, -42);
        ctx.lineTo(0, -66);   ctx.lineTo(10, -42);  ctx.lineTo(26, -58); ctx.lineTo(22, -38);
        ctx.closePath();
        ctx.fill();
      } else if (theme.crownStyle === 'dragon' || theme.crownStyle === 'chaos') {
        // 4·7·9보스 거대 용뿔 + 날개 장식
        ctx.beginPath();
        ctx.moveTo(-26, -38); ctx.lineTo(-52, -68); ctx.lineTo(-34, -44); ctx.lineTo(-42, -72); ctx.lineTo(-12, -40);
        ctx.moveTo(26, -38);  ctx.lineTo(52, -68);  ctx.lineTo(34, -44);  ctx.lineTo(42, -72);  ctx.lineTo(12, -40);
        ctx.fill();
        ctx.stroke();
      } else {
        // 1보스 황금 거신 쌍뿔
        ctx.beginPath();
        ctx.moveTo(-28, -38); ctx.lineTo(-46, -66); ctx.lineTo(-12, -40);
        ctx.moveTo(28, -38);  ctx.lineTo(46, -66);  ctx.lineTo(12, -40);
        ctx.fill();
        ctx.stroke();
      }

      // 분노의 안광 3안
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = theme.core;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(-13, -24, 4, 0, Math.PI * 2);
      ctx.arc(13, -24, 4, 0, Math.PI * 2);
      ctx.arc(0, -31, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 흉부 맥동하는 코어
      const coreR = 13 + Math.sin(bt * 3) * 2.5;
      ctx.fillStyle = theme.core;
      ctx.shadowColor = theme.stroke;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 2, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 2, coreR * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
      ctx.restore(); // scaleSize 종료

      // 대형 보스 HP 바 & 이름표 (상단 배너와 겹치지 않도록 배치)
      const hpRatio = Math.max(0, boss.hp / boss.maxHp);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(-66, -78, 132, 9);
      ctx.strokeStyle = theme.stroke;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-66, -78, 132, 9);
      ctx.fillStyle = theme.core;
      ctx.fillRect(-65, -77, 130 * hpRatio, 7);

      ctx.fillStyle = '#fecdd3';
      ctx.font = 'bold 11.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🔥 ${boss.name} (${Math.ceil(boss.hp).toLocaleString()} / ${boss.maxHp.toLocaleString()})`, 0, -84);
      ctx.restore();
    }
