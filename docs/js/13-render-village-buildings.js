// [13-render-village-buildings] 렌더링: 마을 지면 · 부지 · 건물 · 소품
    /**
     * ============================================================================
     * 마을 월드 렌더링 함수들 (동적 도로 연결 및 부지/건물 렌더링)
     * ============================================================================
     */
    function drawVillageGround(ctx) {
      // 1. 전체 외곽 잔디 배경
      ctx.fillStyle = '#2d4c3e';
      ctx.fillRect(-1100, -800, 1650, 2300);

      // 동쪽 사냥터 구역 바닥
      ctx.fillStyle = '#292524';
      ctx.fillRect(550, -800, 1850, 2300);

      // [오픈된 사냥터 필드 렌더링]
      HUNTING_GROUNDS.forEach((hg) => {
        const b = hg.bounds;
        if (!isWorldRectVisible(b.x, b.y, b.w, b.h, 80, ctx)) return; // 화면 밖 사냥터는 그리지 않음 (성능)
        const isMid = hg.id === 'mid_field_20_40';
        const isHigh = hg.id === 'high_field_40_70';
        const isTop = hg.id === 'top_field_70_99';
        const isRebirthField = hg.id === 'rebirth_sanctuary_field';
        ctx.fillStyle = isRebirthField ? '#251338' : (isTop ? '#132a1c' : (isHigh ? '#2a1215' : (isMid ? '#1e293b' : '#365314')));
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 24);
        ctx.fill();

        // 오크의 숲(top_field_70_99): 깊은 숲 이끼·잔디 블록 타일 및 낙엽/풀숲 포인트
        if (isTop) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.w, b.h, 24);
          ctx.clip();

          const tileW = 54;
          const tileH = 46;
          const startCol = Math.floor(b.x / tileW);
          const endCol = Math.ceil((b.x + b.w) / tileW);
          const startRow = Math.floor(b.y / tileH);
          const endRow = Math.ceil((b.y + b.h) / tileH);

          for (let r = startRow; r <= endRow; r++) {
            const rowOffset = (Math.abs(r) % 2) * (tileW * 0.5);
            for (let c = startCol; c <= endCol; c++) {
              const tx = c * tileW - rowOffset;
              const ty = r * tileH;
              const hash = Math.abs(Math.sin(r * 19.37 + c * 67.89));

              ctx.fillStyle = hash > 0.62 ? '#1a3824' : (hash > 0.3 ? '#152f1e' : '#102517');
              ctx.beginPath();
              ctx.roundRect(tx + 2, ty + 2, tileW - 4, tileH - 4, 8);
              ctx.fill();

              ctx.strokeStyle = 'rgba(74, 222, 128, 0.14)';
              ctx.lineWidth = 1.1;
              ctx.stroke();

              const cx = tx + tileW * 0.5;
              const cy = ty + tileH * 0.5;
              if (hash > 0.78) {
                // 이끼 풀숲 패치
                ctx.fillStyle = 'rgba(34, 197, 94, 0.24)';
                ctx.beginPath();
                ctx.arc(cx - 5, cy + 2, 6, 0, Math.PI * 2);
                ctx.arc(cx + 5, cy + 1, 5, 0, Math.PI * 2);
                ctx.fill();
              } else if (hash < 0.2) {
                // 숲속 낙엽/도토리 포인트
                ctx.fillStyle = 'rgba(217, 119, 6, 0.28)';
                ctx.beginPath();
                ctx.ellipse(cx, cy, 4.2, 2.2, 0.5, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
          ctx.restore();
        }

        // 환생 전용 사냥터(윤회의 성역) 별빛/룬 타일 배경
        if (isRebirthField) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.w, b.h, 24);
          ctx.clip();

          const starCols = 14;
          const starRows = 8;
          const cellW = b.w / starCols;
          const cellH = b.h / starRows;
          for (let r = 0; r < starRows; r++) {
            for (let c = 0; c < starCols; c++) {
              const sx = b.x + c * cellW + cellW * 0.5;
              const sy = b.y + r * cellH + cellH * 0.5;
              const hash = Math.abs(Math.sin(r * 31.7 + c * 91.3));
              if (hash > 0.62) {
                ctx.fillStyle = hash > 0.86 ? 'rgba(250, 204, 21, 0.36)' : 'rgba(232, 121, 249, 0.34)';
                ctx.beginPath();
                ctx.arc(sx, sy, hash > 0.86 ? 2.4 : 1.6, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
          ctx.strokeStyle = 'rgba(232, 121, 249, 0.22)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(b.x + b.w * 0.5, b.y + b.h * 0.55, 86, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // 상급 사냥터(용암 화산지대) 바닥 타일 패턴 및 용암 균열 타일 렌더링
        if (isHigh) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.w, b.h, 24);
          ctx.clip();

          const tileW = 52;
          const tileH = 44;
          const startCol = Math.floor(b.x / tileW);
          const endCol = Math.ceil((b.x + b.w) / tileW);
          const startRow = Math.floor(b.y / tileH);
          const endRow = Math.ceil((b.y + b.h) / tileH);

          for (let r = startRow; r <= endRow; r++) {
            const rowOffset = (Math.abs(r) % 2) * (tileW * 0.5);
            for (let c = startCol; c <= endCol; c++) {
              const tx = c * tileW - rowOffset;
              const ty = r * tileH;
              const hash = Math.abs(Math.sin(r * 12.9898 + c * 78.233));

              ctx.fillStyle = hash > 0.5 ? '#230e12' : '#2f1419';
              ctx.beginPath();
              ctx.roundRect(tx + 2, ty + 2, tileW - 4, tileH - 4, 6);
              ctx.fill();

              ctx.strokeStyle = 'rgba(251, 146, 60, 0.24)';
              ctx.lineWidth = 1.2;
              ctx.stroke();

              // 일부 타일 중앙에 은은한 발광 용암 문양 타일 포인트 배치
              if (hash > 0.82) {
                ctx.fillStyle = 'rgba(249, 115, 22, 0.28)';
                ctx.beginPath();
                ctx.arc(tx + tileW * 0.5, ty + tileH * 0.5, 6, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
          ctx.restore();
        }

        // 상급 사냥터 외곽 테두리를 타일 경로와 분리해 정확히 닫힌 사각형으로 렌더링
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 24);
        ctx.strokeStyle = isRebirthField ? '#e879f9' : (isTop ? '#22c55e' : (isHigh ? '#f97316' : (isMid ? '#38bdf8' : '#84cc16')));
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 6]);
        ctx.stroke();
        ctx.restore();

        // 사냥터 구역 안내 표지판
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(b.x + 18, b.y + 16, 430, 44, 10);
        ctx.fill();
        ctx.strokeStyle = isRebirthField ? '#e879f9' : (isTop ? '#22c55e' : (isHigh ? '#f97316' : (isMid ? '#38bdf8' : '#84cc16')));
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = isRebirthField ? '#f5d0fe' : (isTop ? '#86efac' : (isHigh ? '#fdba74' : (isMid ? '#7dd3fc' : '#bef264')));
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const isTopSubjugationOnly = isTop && typeof isOrcStrongholdPassageOpen === 'function' && isOrcStrongholdPassageOpen();
        const levelBracketText = isRebirthField
          ? `[1환생 이상 전용 · Lv.1~99]`
          : (isTopSubjugationOnly ? '' : `[적정 Lv.${hg.minRecLv}~${hg.maxRecLv}]`);
        ctx.fillText(
          levelBracketText ? `${hg.icon} ${hg.name} ${levelBracketText}` : `${hg.icon} ${hg.name}`,
          b.x + 30,
          b.y + 30
        );

        ctx.fillStyle = '#fde68a';
        ctx.font = '11px sans-serif';
        ctx.fillText(
          isRebirthField
            ? '🔒 1환생↑ 헌터 전용 · 전 구간 기본 EXP 적용 · 윤회 성역의 영혼결정 드랍'
            : (isTop
                ? (isTopSubjugationOnly
                    ? '🚫 5티어 보스 처치 후 헌터 출입 불가 · 오크 군단 토벌 전용 필드'
                    : 'Lv.70~99 기본 EXP 적용 · 선공 몬스터 · 심연 성좌의 별결정 드랍')
                : (isHigh
                    ? 'Lv.40~99 기본 EXP · ⚔️ 헌터간 PvP 허용 무법지대 · 선공 몬스터'
                    : (isMid
                        ? 'Lv.20~40 기본 EXP 적용 · 고보상 전리품 드랍'
                        : 'Lv.1~10 EXP +50% · Lv.11~20 기본 EXP · Lv.21 이상 EXP -90% 패널티'))),
          b.x + 30,
          b.y + 47
        );

        // 사냥터 스폰 몬스터 렌더링 (명칭별 전용 외형)
        hg.monsters.forEach((m) => {
          if (m.hp <= 0) return;
          drawFieldMonster(ctx, m);
        });
      });

      // [최상급 사냥터 오른쪽 옆: 👹 오크 군락지 렌더링 · 헌터 진입 불가]
      if (typeof ORC_STRONGHOLD_ZONE !== 'undefined' && isWorldRectVisible(ORC_STRONGHOLD_ZONE.bounds.x - 200, ORC_STRONGHOLD_ZONE.bounds.y - 200, ORC_STRONGHOLD_ZONE.bounds.w + 400, ORC_STRONGHOLD_ZONE.bounds.h + 400, 60, ctx)) { // 화면 밖이면 생략
        const ob = ORC_STRONGHOLD_ZONE.bounds;
        const tOrc = performance.now() * 0.0035;

        // 붉은 황토·화산재 군락지 대지
        ctx.save();
        ctx.fillStyle = '#2b1311';
        ctx.beginPath();
        ctx.roundRect(ob.x, ob.y, ob.w, ob.h, 24);
        ctx.fill();

        // 내부 균열 & 야영지 구역 음영
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(ob.x, ob.y, ob.w, ob.h, 24);
        ctx.clip();

        ctx.fillStyle = 'rgba(127, 29, 29, 0.24)';
        ctx.beginPath();
        ctx.arc(ob.x + ob.w * 0.52, ob.y + ob.h * 0.5, 190, 0, Math.PI * 2);
        ctx.fill();

        // 오크 대족장 막사 & 전쟁 토템 기둥
        const tentX = ob.x + ob.w * 0.52;
        const tentY = ob.y + ob.h * 0.42;

        // [오크 군락지 중앙: 👹 오크 야영지 본진 건물]
        const campX = ob.x + ob.w * 0.5;
        const campY = ob.y + ob.h * 0.52;
        const campW = 196;
        const campH = 128;
        const campLeft = campX - campW / 2;
        const campTop = campY - campH / 2;

        // 야영지 바닥 다져진 흙마당 & 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(campX, campY + 34, 118, 42, 0, 0, Math.PI * 2);
        ctx.fill();

        // 야영지 외곽 목책 방벽 (좌·우 원목 기둥)
        for (let px = campLeft - 14; px <= campLeft + campW + 14; px += 14) {
          if (px > campX - 28 && px < campX + 28) continue;
          ctx.fillStyle = '#451a03';
          ctx.strokeStyle = '#1c1917';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(px - 4, campTop + campH + 14);
          ctx.lineTo(px - 4, campTop + campH - 12);
          ctx.lineTo(px, campTop + campH - 20);
          ctx.lineTo(px + 4, campTop + campH - 12);
          ctx.lineTo(px + 4, campTop + campH + 14);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // 좌·우 보조 막사 2동
        [-68, 68].forEach((sideX) => {
          const sx = campX + sideX;
          const sy = campY + 8;
          ctx.fillStyle = '#57534e';
          ctx.strokeStyle = '#1c1917';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(sx - 30, sy + 24);
          ctx.lineTo(sx, sy - 22);
          ctx.lineTo(sx + 30, sy + 24);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#7f1d1d';
          ctx.beginPath();
          ctx.moveTo(sx - 20, sy + 24);
          ctx.lineTo(sx, sy - 10);
          ctx.lineTo(sx + 20, sy + 24);
          ctx.closePath();
          ctx.fill();
        });

        // 중앙 대족장 본진 건물 (거대 가죽·철갑 지붕 요새 막사)
        ctx.fillStyle = '#292524';
        ctx.strokeStyle = '#0c0a09';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.roundRect(campX - 54, campTop + 34, 108, 62, 8);
        ctx.fill();
        ctx.stroke();

        // 붉은 가죽 & 강철 리브 대지붕
        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(campX - 66, campTop + 42);
        ctx.lineTo(campX - 36, campTop - 16);
        ctx.lineTo(campX + 36, campTop - 16);
        ctx.lineTo(campX + 66, campTop + 42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 지붕 위 교차 거대 엄니(상아) 장식
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(campX - 24, campTop - 4);
        ctx.quadraticCurveTo(campX - 42, campTop - 28, campX - 18, campTop - 38);
        ctx.moveTo(campX + 24, campTop - 4);
        ctx.quadraticCurveTo(campX + 42, campTop - 28, campX + 18, campTop - 38);
        ctx.stroke();

        // 본진 아치형 출입구
        ctx.fillStyle = '#0c0a09';
        ctx.beginPath();
        ctx.roundRect(campX - 18, campTop + 54, 36, 42, [16, 16, 0, 0]);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // 출입구 상단 오크 해골 문장
        ctx.fillStyle = '#e7e5e4';
        ctx.beginPath();
        ctx.arc(campX, campTop + 34, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(campX - 3.2, campTop + 33, 1.8, 0, Math.PI * 2);
        ctx.arc(campX + 3.2, campTop + 33, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // 야영지 앞 이글거리는 전쟁 화로 2기 & 붉은 깃발
        [-38, 38].forEach((fx) => {
          const bx = campX + fx;
          const by = campTop + 88;
          ctx.fillStyle = '#44403c';
          ctx.beginPath();
          ctx.arc(bx, by, 8, 0, Math.PI);
          ctx.fill();

          const flameR = 5.5 + Math.sin(tOrc * 3.5 + fx) * 1.4;
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(bx, by - 3, flameR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(bx, by - 3, flameR * 0.5, 0, Math.PI * 2);
          ctx.fill();
        });

        // 야영지 중앙 건물 명판
        const campLabel = '👹 오크 야영지 본진';
        ctx.font = 'bold 11.5px sans-serif';
        const campTw = ctx.measureText(campLabel).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.beginPath();
        ctx.roundRect(campX - campTw / 2 - 10, campTop + campH - 18, campTw + 20, 20, 6);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#fca5a5';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(campLabel, campX, campTop + campH - 8);

        // 중앙 전쟁 토템 2기
        [-135, 135].forEach((ox) => {
          const tx = tentX + ox;
          const ty = tentY + 18;
          ctx.fillStyle = '#57534e';
          ctx.fillRect(tx - 8, ty - 28, 16, 48);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(tx, ty - 16, 4.5 + Math.sin(tOrc * 2 + ox) * 1.1, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // 외곽 진홍빛 봉쇄 결계 테두리
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3.2;
        ctx.setLineDash([12, 6]);
        ctx.beginPath();
        ctx.roundRect(ob.x, ob.y, ob.w, ob.h, 24);
        ctx.stroke();
        ctx.setLineDash([]);

        // 최상급 사냥터와의 경계선(서쪽 면): 5티어 보스 처치 시 연결 길 개방, 그 외에는 가시 방책으로 봉쇄
        const passageOpen = isOrcStrongholdPassageOpen();
        const psg = ORC_STRONGHOLD_PASSAGE;

        if (passageOpen) {
          // 5티어 보스 처치 후 개방된 연결 길 바닥 & 횃불 기둥 렌더링
          ctx.fillStyle = '#78350f';
          ctx.fillRect(psg.xMin - 8, psg.yMin, (psg.xMax - psg.xMin) + 16, psg.yMax - psg.yMin);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(psg.xMin - 4, psg.centerY);
          ctx.lineTo(psg.xMax + 4, psg.centerY);
          ctx.stroke();
          ctx.setLineDash([]);

          // 통로 상·하 문주 횃불
          [psg.yMin, psg.yMax].forEach((py) => {
            ctx.fillStyle = '#292524';
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(ob.x - 14, py, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });
        }

        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 4;
        ctx.beginPath();
        if (passageOpen) {
          ctx.moveTo(ob.x - 14, ob.y + 18);
          ctx.lineTo(ob.x - 14, psg.yMin - 4);
          ctx.moveTo(ob.x - 14, psg.yMax + 4);
          ctx.lineTo(ob.x - 14, ob.y + ob.h - 18);
        } else {
          ctx.moveTo(ob.x - 14, ob.y + 18);
          ctx.lineTo(ob.x - 14, ob.y + ob.h - 18);
        }
        ctx.stroke();

        for (let sy = ob.y + 30; sy <= ob.y + ob.h - 30; sy += 34) {
          if (passageOpen && sy >= psg.yMin - 10 && sy <= psg.yMax + 10) continue;
          ctx.fillStyle = '#78350f';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(ob.x - 22, sy + 7);
          ctx.lineTo(ob.x - 6, sy);
          ctx.lineTo(ob.x - 22, sy - 7);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // 오크 군락지 상단 안내 표지판 (3줄: 이름 · 주둔/증원 · 현재 총 병력)
        const allOrcs = ORC_STRONGHOLD_ZONE.orcs.filter(Boolean);
        const regularOrcCount = allOrcs.filter(o => !o.isGreatWarrior && !o.isReinforcement).length;
        const reinforceCount = allOrcs.filter(o => o.isReinforcement).length; // 👹 Lv.99 증원 (js/39-orc-reinforce.js)
        const reinforceNote = reinforceCount > 0 ? ` · 🔺 증원 ${reinforceCount}마리` : "";
        const hasGreatWarrior = allOrcs.some(o => o.isGreatWarrior);
        const passageStatusNote = passageOpen ? '🛤️ 연결 길 개방됨 (통로 전용 출입)' : '🔒 5티어 보스 처치 시 연결 길 개방';
        const totalOrcCount = allOrcs.length;
        const deadOrcCount = allOrcs.filter(o => o.isDead || o.hp <= 0).length;
        const signTitle = '👹 오크 군락지 (붉은 철혈 분지) [헌터 진입 불가 구역]';
        const signLine2 = hasGreatWarrior
          ? `${passageStatusNote} · 주둔 ${regularOrcCount}/${ORC_STRONGHOLD_ZONE.maxCount}마리 + 👑 오크 대전사 강림!${reinforceNote}`
          : `${passageStatusNote} · 주둔 병력 ${regularOrcCount} / ${ORC_STRONGHOLD_ZONE.maxCount}마리 (티어 보스 클리어당 +2마리)${reinforceNote}`;
        const signLine3 = `⚔️ 현재 오크 병력 총 ${totalOrcCount}마리 (활동 ${totalOrcCount - deadOrcCount} · 부활 대기 ${deadOrcCount})`;

        ctx.font = 'bold 13px sans-serif';
        let signW = ctx.measureText(signTitle).width;
        ctx.font = '11px sans-serif';
        signW = Math.max(signW, ctx.measureText(signLine2).width);
        ctx.font = 'bold 12px sans-serif';
        signW = Math.max(signW, ctx.measureText(signLine3).width);
        signW = Math.max(460, Math.ceil(signW) + 24);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(ob.x + 18, ob.y + 16, signW, 62, 10);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(signTitle, ob.x + 30, ob.y + 30);

        ctx.fillStyle = '#fde68a';
        ctx.font = '11px sans-serif';
        ctx.fillText(signLine2, ob.x + 30, ob.y + 47);

        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(signLine3, ob.x + 30, ob.y + 64);

        // 군락지 내부 상주 오크 병력 렌더링 (근육질 체형 · 하악 엄니 · 강철 견갑 · 병종별 무기 · 10티어 오크 대전사)
        ORC_STRONGHOLD_ZONE.orcs.forEach((orc, idx) => {
          if (!isWorldPointVisible(orc.x, orc.y, 140, ctx)) return; // 화면 밖 오크는 생략
          // 사망 후 군락지에서 1분(60초) 부활 대기 중인 오크 카운트다운 표시 (토벌전 중에는 Lv.1 초기화 대기 표시)
          if (orc.isDead) {
            const remSec = Math.max(1, Math.ceil((orc.respawnRemainingMs || 0) / 1000));
            const ghostX = (ob.x + ob.w * 0.5) + ((idx % 5) - 2) * 54;
            const ghostY = (ob.y + ob.h * 0.52 + 64) + Math.floor(idx / 5) * 20;
            const deadLabel = isOrcSubjugationInProgress()
              ? `🏳️ ${orc.name} Lv.1 (토벌 종료까지 대기)`
              : `⏳ ${orc.name} Lv.${orc.level} (${remSec}s)`;
            ctx.save();
            ctx.font = 'bold 10px sans-serif';
            const dtw = ctx.measureText(deadLabel).width;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.beginPath();
            ctx.roundRect(ghostX - dtw / 2 - 6, ghostY - 8, dtw + 12, 16, 5);
            ctx.fill();
            ctx.strokeStyle = 'rgba(248, 113, 113, 0.7)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.fillStyle = '#fca5a5';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(deadLabel, ghostX, ghostY);
            ctx.restore();
            return;
          }

          const breathe = Math.sin(tOrc * 1.6 + idx * 1.3) * 1.4;
          const isGreatWarrior = Boolean(orc.isGreatWarrior) || orc.role === '오크 대전사';
          // 오크 로드: 토벌 중 일반 오크가 쓰러질수록 커짐 (최대 3배 · js/29-orc-growth.js)
          const sc = ((orc.size || (isGreatWarrior ? 27 : 16)) / 16) * (typeof getOrcGrowthScale === 'function' ? getOrcGrowthScale(orc) : 1);
          const isChief = orc.role === '군락지 지배자';
          const isShaman = orc.role === '토템 주술진';
          const isHeavy = orc.role === '후방 수비대';
          const skinBase = isGreatWarrior ? '#7f1d1d' : (orc.color || '#4d7c0f');
          const skinHighlight = isGreatWarrior ? '#dc2626' : (isChief ? '#b91c1c' : (isShaman ? '#9333ea' : '#65a30d'));
          const skinShadow = '#1c1917';
          const orcFacing = (orc.facing || -1) >= 0 ? 1 : -1;
          const isAttacking = (orc.attackAnimTimer || 0) > 0;
          const atkProg = isAttacking ? Math.max(0, Math.min(1, 1 - (orc.attackAnimTimer / 0.36))) : 0;
          const lungeX = isAttacking
            ? orcFacing * (atkProg < 0.32 ? -(atkProg / 0.32) * 3.5 : Math.sin(((atkProg - 0.32) / 0.68) * Math.PI) * 8.5)
            : 0;
          const bodyTilt = isAttacking
            ? orcFacing * (atkProg < 0.32 ? -0.14 : Math.sin(((atkProg - 0.32) / 0.68) * Math.PI) * 0.24)
            : 0;
          const walkBob = orc.aiMode === 'SORTIE' ? Math.abs(Math.sin(orc.walkCycle || 0)) * 2.2 : 0;

          ctx.save();
          ctx.translate(orc.x, orc.y);

          // 10티어 오크 대전사 전용 이중 회전 진홍·황금 패기 오라 (대족장 단일 오라와 구별)
          if (isGreatWarrior) {
            ctx.save();
            ctx.translate(0, 18 * sc);
            ctx.scale(1, 0.44);

            // 외곽 황금 룬 링 (정방향 회전)
            ctx.save();
            ctx.rotate(tOrc * 1.15);
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
            ctx.lineWidth = 2.6;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.arc(0, 0, 36 * sc, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // 내곽 진홍빛 패기 링 (역방향 회전)
            ctx.save();
            ctx.rotate(-tOrc * 1.55);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.92)';
            ctx.lineWidth = 2.4;
            ctx.setLineDash([7, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, 26 * sc, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            ctx.restore();
          } else if (isChief) {
            ctx.save();
            ctx.translate(0, 18 * sc);
            ctx.scale(1, 0.42);
            ctx.rotate(tOrc * 0.9);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.72)';
            ctx.lineWidth = 2.4;
            ctx.setLineDash([8, 5]);
            ctx.beginPath();
            ctx.arc(0, 0, 32 * sc, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }

          // 바닥 접지 그림자
          ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
          ctx.beginPath();
          ctx.ellipse(lungeX * 0.5, 18 * sc, 18 * sc, 6.5 * sc, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.save();
          ctx.scale(sc, sc);
          ctx.translate(lungeX, -breathe * 0.6 - walkBob);
          ctx.rotate(bodyTilt);
          ctx.scale(orcFacing, 1);

          // 1. 굵은 다리 & 징 박힌 가죽/황금 전투화
          ctx.fillStyle = skinShadow;
          ctx.fillRect(-10, 8, 7.5, 10);
          ctx.fillRect(2.5, 8, 7.5, 10);
          ctx.fillStyle = isGreatWarrior ? '#7f1d1d' : '#44403c';
          ctx.strokeStyle = isGreatWarrior ? '#facc15' : '#0c0a09';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.roundRect(-11.5, 13, 9.5, 6, 2);
          ctx.roundRect(2, 13, 9.5, 6, 2);
          ctx.fill();
          ctx.stroke();

          // 2. 오크 대전사 / 대족장 전장 망토
          if (isGreatWarrior || isChief) {
            ctx.fillStyle = isGreatWarrior ? '#270505' : '#450a0a';
            ctx.strokeStyle = isGreatWarrior ? '#facc15' : '#7f1d1d';
            ctx.lineWidth = isGreatWarrior ? 2 : 1.6;
            ctx.beginPath();
            ctx.moveTo(-15, -8);
            ctx.lineTo(-24, 17);
            ctx.lineTo(24, 17);
            ctx.lineTo(15, -8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }

          // 3. 근육질 역삼각형 상체 & 대흉근·복근 음영
          ctx.fillStyle = skinBase;
          ctx.strokeStyle = isGreatWarrior ? '#facc15' : skinShadow;
          ctx.lineWidth = isGreatWarrior ? 2.2 : 2;
          ctx.beginPath();
          ctx.moveTo(-16, -9);
          ctx.lineTo(16, -9);
          ctx.lineTo(11, 9);
          ctx.lineTo(-11, 9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 대흉근 & 복근 하이라이트 (오크 대전사는 황금 흉갑 테두리 포함)
          ctx.fillStyle = skinHighlight;
          ctx.beginPath();
          ctx.roundRect(-12, -7.5, 10.5, 6.5, 2.5);
          ctx.roundRect(1.5, -7.5, 10.5, 6.5, 2.5);
          ctx.fill();

          if (isGreatWarrior) {
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(-9, -6);
            ctx.lineTo(0, 1);
            ctx.lineTo(9, -6);
            ctx.stroke();
          }

          ctx.strokeStyle = 'rgba(12, 10, 9, 0.55)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, -7);
          ctx.lineTo(0, 5);
          ctx.moveTo(-6, 1.5);
          ctx.lineTo(6, 1.5);
          ctx.stroke();

          // 가죽 전쟁 벨트 & 해골/황금 버클
          ctx.fillStyle = '#292524';
          ctx.fillRect(-11.5, 5.5, 23, 4.5);
          ctx.fillStyle = (isGreatWarrior || isChief) ? '#facc15' : '#94a3b8';
          ctx.beginPath();
          ctx.arc(0, 7.8, isGreatWarrior ? 3.8 : 3.2, 0, Math.PI * 2);
          ctx.fill();

          // 4. 굵은 팔뚝 & 손목 완갑
          [-1, 1].forEach((side) => {
            ctx.fillStyle = skinBase;
            ctx.strokeStyle = skinShadow;
            ctx.lineWidth = 1.7;
            ctx.beginPath();
            ctx.roundRect(side > 0 ? 13 : -20, -6, 7, 15, 3.5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isGreatWarrior ? '#f59e0b' : '#57534e';
            ctx.fillRect(side > 0 ? 13 : -20, 4, 7, 4);
          });

          // 5. 어깨 강철/진홍-황금 가시 견갑
          [-15.5, 15.5].forEach((sx, sIdx) => {
            const dir = sIdx === 0 ? -1 : 1;
            const regTier = orc.equipTier || 0;
            const tierShoulderColor = regTier >= 9
              ? '#e879f9'
              : (regTier >= 7
                  ? '#a855f7'
                  : (regTier >= 5
                      ? '#f59e0b'
                      : (regTier >= 3 ? '#38bdf8' : '#57534e')));
            ctx.fillStyle = isGreatWarrior ? '#991b1b' : (isShaman ? '#581c87' : (isChief ? '#7f1d1d' : tierShoulderColor));
            ctx.strokeStyle = (isGreatWarrior || isChief || regTier >= 6) ? '#facc15' : '#1c1917';
            ctx.lineWidth = isGreatWarrior ? 2 : 1.6;
            ctx.beginPath();
            ctx.arc(sx, -8, isGreatWarrior ? 7.6 : (isHeavy || isChief ? 6.8 : 5.6), Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 견갑 위 솟은 강철/황금 가시
            ctx.fillStyle = isGreatWarrior ? '#fde047' : '#e2e8f0';
            ctx.beginPath();
            ctx.moveTo(sx + dir * 2, -12);
            ctx.lineTo(sx + dir * 7.8, -19.5);
            ctx.lineTo(sx + dir * 5.8, -10.5);
            ctx.closePath();
            ctx.fill();
          });

          // 6. 우락부락한 오크 두상 · 뾰족한 귀 · 찌푸린 눈썹뼈 · 하악 엄니(송곳니)
          ctx.fillStyle = skinBase;
          ctx.strokeStyle = skinShadow;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.roundRect(-8.5, -22, 17, 15, 5.5);
          ctx.fill();
          ctx.stroke();

          // 양옆 뾰족한 오크 귀
          ctx.fillStyle = skinHighlight;
          ctx.beginPath();
          ctx.moveTo(-8.5, -16);
          ctx.lineTo(-15.5, -19.5);
          ctx.lineTo(-8.5, -12.5);
          ctx.moveTo(8.5, -16);
          ctx.lineTo(15.5, -19.5);
          ctx.lineTo(8.5, -12.5);
          ctx.fill();
          ctx.stroke();

          // 두꺼운 눈썹뼈 & 붉은/황금 야수 안광
          ctx.fillStyle = skinShadow;
          ctx.beginPath();
          ctx.moveTo(-7, -17.5);
          ctx.lineTo(-1.5, -15.5);
          ctx.lineTo(-1.5, -14);
          ctx.lineTo(-7, -15.5);
          ctx.moveTo(7, -17.5);
          ctx.lineTo(1.5, -15.5);
          ctx.lineTo(1.5, -14);
          ctx.lineTo(7, -15.5);
          ctx.fill();

          ctx.fillStyle = isGreatWarrior ? '#fde047' : (isShaman ? '#f0abfc' : '#ef4444');
          ctx.beginPath();
          ctx.arc(-4, -14.2, isGreatWarrior ? 1.8 : 1.5, 0, Math.PI * 2);
          ctx.arc(4, -14.2, isGreatWarrior ? 1.8 : 1.5, 0, Math.PI * 2);
          ctx.fill();

          // 튀어나온 아래턱 & 위로 솟은 하악 엄니(송곳니) 한 쌍 (오크 대전사는 대형 엄니)
          ctx.fillStyle = skinHighlight;
          ctx.fillRect(-6.5, -11.5, 13, 4.5);
          ctx.strokeStyle = skinShadow;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-5, -9.5);
          ctx.lineTo(5, -9.5);
          ctx.stroke();

          const tuskTipY = isGreatWarrior ? -17.2 : -14.8;
          const tuskOutX = isGreatWarrior ? 8.2 : 7.2;
          ctx.fillStyle = '#fefce8';
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-6, -9.5);
          ctx.lineTo(-tuskOutX, tuskTipY);
          ctx.lineTo(-3.4, -10.2);
          ctx.moveTo(6, -9.5);
          ctx.lineTo(tuskOutX, tuskTipY);
          ctx.lineTo(3.4, -10.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 병종별 투구 / 상투 / 오크 대전사 삼중 뿔 투구
          if (isGreatWarrior) {
            ctx.fillStyle = '#450a0a';
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1.9;
            ctx.beginPath();
            ctx.arc(0, -19.5, 9.5, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 삼중 황금 뿔 투구 장식
            ctx.fillStyle = '#fde047';
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-8, -20);
            ctx.lineTo(-16.5, -32.5);
            ctx.lineTo(-4.5, -22.5);
            ctx.moveTo(8, -20);
            ctx.lineTo(16.5, -32.5);
            ctx.lineTo(4.5, -22.5);
            ctx.moveTo(-2.6, -24);
            ctx.lineTo(0, -34.5);
            ctx.lineTo(2.6, -24);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else if (isChief) {
            ctx.fillStyle = '#292524';
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(0, -19.5, 9, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 대족장 쌍뿔 장식
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.moveTo(-7.5, -20);
            ctx.lineTo(-14.5, -30);
            ctx.lineTo(-4.5, -22.5);
            ctx.moveTo(7.5, -20);
            ctx.lineTo(14.5, -30);
            ctx.lineTo(4.5, -22.5);
            ctx.fill();
          } else if (isShaman) {
            // 주술사 깃털 & 해골 장식 머리띠
            ctx.fillStyle = '#ec4899';
            ctx.beginPath();
            ctx.moveTo(-2, -22);
            ctx.lineTo(-5, -31);
            ctx.lineTo(0, -24);
            ctx.lineTo(4, -31);
            ctx.lineTo(3, -22);
            ctx.fill();
          } else {
            // 전사 상투 머리
            ctx.fillStyle = '#1c1917';
            ctx.beginPath();
            ctx.arc(0, -24.5, 3.6, 0, Math.PI * 2);
            ctx.fill();
          }

          // 7. 병종별 리얼 무기 (오크 대전사 거대 양날 진홍-황금 전장대부 / 대족장 쌍날 대부 / 주술사 해골 주술봉)
          ctx.save();
          ctx.translate(18, 2);
          let orcWeaponAngle = 0.28 + Math.sin(tOrc * 1.5 + idx) * 0.06;
          if (isAttacking) {
            if (isShaman) {
              // 혈투주술사: 지팡이를 높이 들어 올려 보랏빛 주술 파동 시전
              orcWeaponAngle = -0.35 - Math.sin(atkProg * Math.PI) * 0.65;
            } else {
              // 전사/중갑병/대족장/오크 대전사: 머리 위로 치켜들었다가 전방으로 내려찍기 스윙
              orcWeaponAngle = atkProg < 0.32
                ? (0.28 - (atkProg / 0.32) * 1.35)
                : (-1.07 + ((atkProg - 0.32) / 0.68) * 2.45);
            }
          }
          ctx.rotate(orcWeaponAngle);
          if (isGreatWarrior) {
            // 오크 대전사 거대 양날 진홍-황금 전장대부
            ctx.fillStyle = '#292524';
            ctx.fillRect(-2.2, -32, 4.4, 42);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(-2.6, -34, 5.2, 3);

            ctx.fillStyle = '#991b1b';
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(2, -31);
            ctx.quadraticCurveTo(18.5, -34, 19.5, -21);
            ctx.quadraticCurveTo(18.5, -9, 2, -12);
            ctx.moveTo(-2, -31);
            ctx.quadraticCurveTo(-18.5, -34, -19.5, -21);
            ctx.quadraticCurveTo(-18.5, -9, -2, -12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else if (isShaman) {
            // 해골 주술 지팡이
            ctx.fillStyle = '#451a03';
            ctx.fillRect(-1.6, -26, 3.2, 34);
            ctx.fillStyle = '#f5f5f4';
            ctx.beginPath();
            ctx.arc(0, -27, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#e879f9';
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = isAttacking ? 16 : 9;
            ctx.beginPath();
            ctx.arc(0, -33, (isAttacking ? 4.8 : 3.2) + Math.sin(tOrc * 3) * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (isHeavy) {
            // 중갑 가시 철퇴
            ctx.fillStyle = '#292524';
            ctx.fillRect(-1.8, -24, 3.6, 32);
            ctx.fillStyle = '#64748b';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(0, -26, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else {
            // 오크 강철 전투도끼 (대족장은 대형 쌍날 도끼)
            ctx.fillStyle = '#451a03';
            ctx.fillRect(-1.8, -26, 3.6, 34);
            ctx.fillStyle = isChief ? '#e2e8f0' : '#94a3b8';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(1.5, -25);
            ctx.quadraticCurveTo(14, -27, 15, -18);
            ctx.quadraticCurveTo(14, -10, 1.5, -12);
            if (isChief) {
              ctx.moveTo(-1.5, -25);
              ctx.quadraticCurveTo(-14, -27, -15, -18);
              ctx.quadraticCurveTo(-14, -10, -1.5, -12);
            }
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();

          // 공격 타격 순간 무기 참격 호 / 주술 파동 이펙트
          if (isAttacking && atkProg >= 0.3) {
            const slashFade = Math.max(0, 1 - ((atkProg - 0.3) / 0.7));
            ctx.save();
            ctx.globalAlpha = slashFade;
            if (isShaman) {
              ctx.strokeStyle = '#e879f9';
              ctx.lineWidth = 2.4;
              ctx.beginPath();
              ctx.arc(22, -16, 8 + (1 - slashFade) * 14, 0, Math.PI * 2);
              ctx.stroke();
            } else {
              ctx.strokeStyle = isGreatWarrior ? '#fde047' : '#ef4444';
              ctx.lineWidth = isGreatWarrior ? 4.2 : 3.2;
              ctx.beginPath();
              ctx.arc(16, -2, isGreatWarrior ? 26 : 20, -Math.PI * 0.45, Math.PI * 0.48);
              ctx.stroke();
            }
            ctx.restore();
          }

          ctx.restore(); // scale & breathe 종료
          // 체력 바 & 이름·레벨 명판 (오크 대전사는 황금 테두리 진홍 명판)
          const labelY = -36 * sc;
          const hpRatio = Math.max(0, Math.min(1, (orc.hp || 0) / Math.max(1, orc.maxHp || 1)));
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fillRect(-20, labelY - 16, 40, 4.5);
          ctx.fillStyle = isGreatWarrior ? '#facc15' : '#ef4444';
          ctx.fillRect(-19, labelY - 15, 38 * hpRatio, 2.5);

          const orcDisplayLabel = `${orc.name} · Lv.${orc.level || 1}`;
          ctx.font = isGreatWarrior ? 'bold 11.5px sans-serif' : 'bold 10.5px sans-serif';
          const tw = ctx.measureText(orcDisplayLabel).width;
          ctx.fillStyle = isGreatWarrior ? 'rgba(69, 10, 10, 0.94)' : 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.roundRect(-tw / 2 - 7, labelY - 9, tw + 14, isGreatWarrior ? 17 : 15, 5);
          ctx.fill();
          if (isGreatWarrior) {
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1.6;
            ctx.stroke();
          }

          ctx.fillStyle = (isGreatWarrior || isChief) ? '#fde047' : '#fecaca';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(orcDisplayLabel, 0, labelY - 0.5);
          ctx.restore();
        });

        ctx.restore();
      }

      // [최상급 사냥터 위쪽 3환생 이상 전용 구역: ☁️ 천공의 섬 · 도보 이동 불가 · 포탈 전용]
      if (isWorldRectVisible(SKY_ISLAND_GROUND.bounds.x - 120, SKY_ISLAND_GROUND.bounds.y - 120, SKY_ISLAND_GROUND.bounds.w + 240, SKY_ISLAND_GROUND.bounds.h + 240, 60, ctx)) { // 화면 밖이면 생략
        const sbSky = SKY_ISLAND_GROUND.bounds;
        const tCloud = performance.now() * 0.0012;
        const padX = 24;
        const padY = 20;
        const outerX = sbSky.x - padX;
        const outerY = sbSky.y - padY;
        const outerW = sbSky.w + padX * 2;
        const outerH = sbSky.h + padY * 2;

        // 구름 외곽 퍼프(원형 군집) 생성 헬퍼: 천공의 섬 경계 전체를 뭉게구름 형태로 감쌈
        const traceCloudPerimeter = (x0, y0, w0, h0, puffStep = 34, puffR = 22) => {
          const puffs = [];
          const cols = Math.max(4, Math.round(w0 / puffStep));
          const rows = Math.max(2, Math.round(h0 / puffStep));
          const dx = w0 / cols;
          const dy = h0 / rows;

          for (let c = 0; c <= cols; c++) {
            const px = x0 + c * dx;
            const rTop = puffR * (0.86 + 0.22 * Math.sin(c * 1.7 + tCloud));
            puffs.push({ x: px, y: y0, r: rTop });
            const rBot = puffR * (0.88 + 0.22 * Math.cos(c * 1.9 - tCloud));
            puffs.push({ x: px, y: y0 + h0, r: rBot });
          }
          for (let r = 1; r < rows; r++) {
            const py = y0 + r * dy;
            const rLeft = puffR * (0.85 + 0.2 * Math.cos(r * 2.1 + tCloud));
            puffs.push({ x: x0, y: py, r: rLeft });
            const rRight = puffR * (0.85 + 0.2 * Math.sin(r * 2.3 - tCloud));
            puffs.push({ x: x0 + w0, y: py, r: rRight });
          }
          return puffs;
        };

        const cloudPuffs = traceCloudPerimeter(outerX, outerY, outerW, outerH, 34, 23);

        // 구름 그림자 (공중에 떠 있는 입체감)
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.beginPath();
        ctx.roundRect(sbSky.x + 8, sbSky.y + 14, sbSky.w, sbSky.h, 36);
        ctx.fill();
        ctx.restore();

        // 외곽 뭉게구름 실루엣 채우기 & 외곽선
        ctx.save();
        ctx.fillStyle = '#e0f2fe';
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.92)';
        ctx.lineWidth = 2.5;
        cloudPuffs.forEach((pf) => {
          ctx.beginPath();
          ctx.arc(pf.x, pf.y, pf.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
        ctx.restore();

        // 천공의 섬 내부 성역 본체 (구름 클리핑 적용)
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(sbSky.x, sbSky.y, sbSky.w, sbSky.h, 28);
        cloudPuffs.forEach((pf) => {
          ctx.moveTo(pf.x + pf.r * 0.85, pf.y);
          ctx.arc(pf.x, pf.y, pf.r * 0.85, 0, Math.PI * 2);
        });
        ctx.clip();

        ctx.fillStyle = '#13263d';
        ctx.fillRect(outerX - 24, outerY - 24, outerW + 48, outerH + 48);

        const skyCols = 14;
        const skyRows = 6;
        const cw = sbSky.w / skyCols;
        const ch = sbSky.h / skyRows;
        for (let r = 0; r < skyRows; r++) {
          for (let c = 0; c < skyCols; c++) {
            const cx = sbSky.x + c * cw + cw * 0.5;
            const cy = sbSky.y + r * ch + ch * 0.5;
            const hash = Math.abs(Math.sin(r * 41.3 + c * 73.9));
            if (hash > 0.58) {
              ctx.fillStyle = hash > 0.84
                ? 'rgba(253, 224, 71, 0.34)'
                : 'rgba(125, 211, 252, 0.32)';
              ctx.beginPath();
              ctx.arc(cx, cy, hash > 0.84 ? 2.5 : 1.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        ctx.restore();

        // 구름 테두리 하이라이트 (구름 군도 경계 강조)
        ctx.save();
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.82)';
        ctx.lineWidth = 2;
        cloudPuffs.forEach((pf, idx) => {
          if (idx % 2 === 0) {
            ctx.beginPath();
            ctx.arc(pf.x, pf.y - 2, pf.r * 0.92, Math.PI * 0.9, Math.PI * 2.1);
            ctx.stroke();
          }
        });
        ctx.restore();

        // 주변 떠다니는 작은 구름 조각 장식
        const miniClouds = [
          { x: sbSky.x - 42, y: sbSky.y + 42 + Math.sin(tCloud * 1.4) * 5, s: 0.68 },
          { x: sbSky.x + sbSky.w + 42, y: sbSky.y + 78 + Math.cos(tCloud * 1.2) * 5, s: 0.74 },
          { x: sbSky.x + sbSky.w * 0.5, y: sbSky.y - 36 + Math.sin(tCloud * 1.6) * 4, s: 0.65 }
        ];
        miniClouds.forEach((mc) => {
          ctx.save();
          ctx.translate(mc.x, mc.y);
          ctx.scale(mc.s, mc.s);
          ctx.fillStyle = 'rgba(224, 242, 254, 0.86)';
          ctx.beginPath();
          ctx.arc(-12, 2, 11, 0, Math.PI * 2);
          ctx.arc(0, -3, 14, 0, Math.PI * 2);
          ctx.arc(13, 2, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        ctx.roundRect(sbSky.x + 18, sbSky.y + 14, 470, 44, 10);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#bae6fd';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('☁️ 천공의 섬 (성역 구름군도) [3환생 이상 전용 · 도보 이동 불가]', sbSky.x + 30, sbSky.y + 28);

        ctx.fillStyle = '#fde68a';
        ctx.font = '11px sans-serif';
        ctx.fillText('🔒 도보 진입 불가 · [천공의 섬 게이트] 포탈 전용 입장 · 2,650 EXP · 별결정 드랍', sbSky.x + 30, sbSky.y + 45);

        SKY_ISLAND_GROUND.monsters.forEach((m) => {
          if (m.hp <= 0) return;
          drawFieldMonster(ctx, m);
        });
      }

      // [초보 사냥터 북쪽 보스 레이드 전용 구역: 고대 수호자의 성소]
      const sb = BOSS_SANCTUM.bounds;
      ctx.fillStyle = BOSS_SANCTUM.status === 'ACTIVE' ? 'rgba(159, 18, 57, 0.34)' : 'rgba(76, 29, 149, 0.28)';
      ctx.beginPath();
      ctx.roundRect(sb.x, sb.y, sb.w, sb.h, 24);
      ctx.fill();

      ctx.strokeStyle = BOSS_SANCTUM.status === 'ACTIVE' ? '#fb7185' : '#c084fc';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 고대 제단 마법진
      ctx.strokeStyle = BOSS_SANCTUM.status === 'ACTIVE' ? 'rgba(251, 113, 133, 0.55)' : 'rgba(192, 132, 252, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sb.x + sb.w / 2, sb.y + 114, 58, 0, Math.PI * 2);
      ctx.stroke();

      // 성소 필드 안내 명판 (보스 이름표와 겹치지 않도록 성소 상단 경계 바깥쪽에 분리 배치)
      const bossCfg = getBossStageConfig(BOSS_SANCTUM.bossStage);
      const sanctumHeaderText = `🔥 고대 수호자의 성소 [권장: ${bossCfg.reqLabel}]`;
      ctx.save();
      ctx.font = 'bold 12px sans-serif';
      const headerBoxW = Math.max(320, ctx.measureText(sanctumHeaderText).width + 28);
      const headerBoxX = sb.x + (sb.w - headerBoxW) / 2;
      const headerBoxY = sb.y - 34;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(headerBoxX, headerBoxY, headerBoxW, 24, 8);
      ctx.fill();
      ctx.strokeStyle = BOSS_SANCTUM.status === 'ACTIVE' ? '#fb7185' : '#c084fc';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fda4af';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sanctumHeaderText, sb.x + sb.w / 2, headerBoxY + 12);
      ctx.restore();

      // 보스 몬스터 렌더링 (대형화 + 룬 오라 + 공격 스윙 모션)
      drawBossGuardian(ctx, BOSS_SANCTUM.boss);

      // 성소 남쪽 결계 게이트 (CLOSED 또는 PREPARING 시 입구 봉인)
      if (BOSS_SANCTUM.status !== 'ACTIVE') {
        ctx.strokeStyle = BOSS_SANCTUM.status === 'PREPARING' ? '#fbbf24' : '#f43f5e';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(sb.x + 24, sb.y + sb.h);
        ctx.lineTo(sb.x + sb.w - 24, sb.y + sb.h);
        ctx.stroke();

        ctx.fillStyle = BOSS_SANCTUM.status === 'PREPARING' ? '#fde047' : '#fecdd3';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        const lockLabel = BOSS_SANCTUM.status === 'PREPARING'
          ? `⏳ 레이드 정비 중 (${Math.ceil(BOSS_SANCTUM.prepTimer)}초 후 입장 개방)`
          : '🔒 마법 결계 봉인됨 (상단 [보스 필드 오픈] 버튼으로 개방)';
        ctx.fillText(lockLabel, sb.x + sb.w / 2, sb.y + sb.h - 10);
      }

      // [환생 헌터(1환생↑) 전용 소형 최상급 중간보스 구역: ✨ 초월 환생의 제단]
      const rb = REBIRTH_ALTAR.bounds;
      ctx.fillStyle = 'rgba(88, 28, 135, 0.34)';
      ctx.beginPath();
      ctx.roundRect(rb.x, rb.y, rb.w, rb.h, 20);
      ctx.fill();

      ctx.strokeStyle = '#f0abfc';
      ctx.lineWidth = 2.6;
      ctx.setLineDash([7, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(rb.x + rb.w / 2, rb.y + 114, 42, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.font = 'bold 11px sans-serif';
      const altarBadgeW = rb.w;
      const altarBadgeY = rb.y - 34;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.beginPath();
      ctx.roundRect(rb.x, altarBadgeY, altarBadgeW, 24, 8);
      ctx.fill();
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#f5d0fe';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✨ 초월 환생의 제단 [1환생↑]', rb.x + altarBadgeW / 2, altarBadgeY + 12);
      ctx.restore();

      drawRebirthSupremeBoss(ctx, REBIRTH_ALTAR.boss);

      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔒 1환생 이상 전용 · ✨제단출정 지시', rb.x + rb.w / 2, rb.y + rb.h - 9);

      // 2. 마을 안전 구역 (확장 부지까지 수용 가능한 넉넉한 크기)
      ctx.fillStyle = '#3f624d';
      ctx.beginPath();
      ctx.roundRect(-560, -450, 1090, 1050, 28);
      ctx.fill();

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 8;
      ctx.stroke();

      // 3. 마을 중앙 광장 및 메인 간선 도로
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-90, -70, 180, 160, 16);
      ctx.fill();

      // 동서 메인 도로 (관문 길을 통해 초보 사냥터 입구까지 연결)
      ctx.fillRect(-460, -8, 1072, 52);

      // 초보 사냥터 남쪽 경계를 지나 중급 사냥터(y: 365)로 이어지는 연결 길
      ctx.fillStyle = '#78716c';
      ctx.fillRect(942, 332, 36, 44);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(960, 336);
      ctx.lineTo(960, 372);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8';

      // 중급 사냥터 남쪽 경계를 지나 상급 사냥터(y: 815)로 이어지는 연결 길
      ctx.fillStyle = '#78716c';
      ctx.fillRect(942, 778, 36, 44);
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(960, 782);
      ctx.lineTo(960, 818);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8';

      // 초보 사냥터 동쪽 경계(x: 1390)를 지나 최상급 사냥터(x: 1430)로 이어지는 연결 길
      ctx.fillStyle = '#78716c';
      ctx.fillRect(1384, 0, 52, 36);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(1388, 18);
      ctx.lineTo(1432, 18);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8';

      // 중급 사냥터 동쪽 경계(x: 1390)를 지나 환생 전용 사냥터 윤회의 성역(x: 1430)으로 이어지는 연결 길
      ctx.fillStyle = '#78716c';
      ctx.fillRect(1384, 557, 52, 36);
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(1388, 575);
      ctx.lineTo(1432, 575);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8';
      // 모든 등록된 부지(건물) 입구에서 메인 도로(y=18)까지 지선 도로 자동 연결
      village.plots.forEach((p) => {
        const doorY = p.building ? (p.y + p.building.h / 2) : (p.y + 35);
        const startY = Math.min(doorY, 18);
        const height = Math.abs(doorY - 18) + 12;
        ctx.fillRect(p.x - 14, startY, 28, height);
      });

      // 돌길 블록 디테일
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      for (let rx = -440; rx < 595; rx += 38) {
        ctx.fillRect(rx, 2, 22, 32);
      }

      // 4. 마을-사냥터 경계 석조 성벽 (길이 아닌 구역은 모두 견고한 벽으로 차단)
      const wallLeft = TOWN_EAST_GATE.wallX - TOWN_EAST_GATE.wallHalfThick;
      const wallW = TOWN_EAST_GATE.wallHalfThick * 2;
      const wallTopLimit = -470;
      const wallBottomLimit = 620;

      // 상단 성벽 구간 (wallTopLimit ~ gateTopY)
      const topSegH = TOWN_EAST_GATE.gateTopY - wallTopLimit;
      // 하단 성벽 구간 (gateBottomY ~ wallBottomLimit)
      const botSegH = wallBottomLimit - TOWN_EAST_GATE.gateBottomY;

      [
        { y: wallTopLimit, h: topSegH },
        { y: TOWN_EAST_GATE.gateBottomY, h: botSegH }
      ].forEach((seg) => {
        // 성벽 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(wallLeft + 5, seg.y + 4, wallW, seg.h);

        // 석조 성벽 본체
        ctx.fillStyle = '#475569';
        ctx.fillRect(wallLeft, seg.y, wallW, seg.h);

        // 성벽 돌 블록 줄눈 & 성가퀴(흉벽) 디테일
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(wallLeft, seg.y, wallW, seg.h);

        ctx.fillStyle = '#64748b';
        for (let wy = seg.y + 6; wy < seg.y + seg.h - 14; wy += 24) {
          ctx.fillRect(wallLeft + 4, wy, wallW - 8, 16);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(wallLeft + 4, wy, wallW - 8, 16);
        }
      });

      // 관문 양옆 석조 망루 기둥 (통로 경계 강조)
      [TOWN_EAST_GATE.gateTopY - 12, TOWN_EAST_GATE.gateBottomY - 12].forEach((py) => {
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(wallLeft - 4, py, wallW + 8, 24, 6);
        ctx.fill();
        ctx.stroke();

        // 관문 횃불
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(TOWN_EAST_GATE.wallX, py + 12, 5 + Math.sin(performance.now() * 0.01 + py) * 1.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // 관문 길 안내 표지판
      ctx.fillStyle = '#86efac';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🌿 초보 사냥터 길 →', 618, 18);

      ctx.fillStyle = '#d8b4fe';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      const topSignLabel = (typeof isOrcStrongholdPassageOpen === 'function' && isOrcStrongholdPassageOpen())
        ? '🚫 오크의 숲 (토벌 전용 · 출입불가)'
        : '🌲 오크의 숲 →';
      ctx.fillText(topSignLabel, 1376, -10);
      ctx.textAlign = 'right';
      ctx.fillText('🌠 윤회의 성역 (1환생↑) →', 1376, 548);
    }

    // 빈 건설 부지(Plot) 렌더링
    function drawEmptyPlot(ctx, plot, isSelected) {
      const w = 124;
      const h = 88;
      const left = plot.x - w / 2;
      const top = plot.y - h / 2;

      ctx.save();
      ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.22)' : 'rgba(15, 23, 42, 0.28)';
      ctx.beginPath();
      ctx.roundRect(left, top, w, h, 12);
      ctx.fill();

      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(226, 232, 240, 0.55)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // 건설 팻말 아이콘 & 텍스트
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔨', plot.x, plot.y - 10);

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('+ 건물 건설', plot.x, plot.y + 16);
      ctx.restore();
    }

    function drawBuilding(ctx, bld, isSelected) {
      const left = bld.x - bld.w / 2;
      const top = bld.y - bld.h / 2;

      // 선택 테두리
      if (isSelected) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(left - 10, top - 30, bld.w + 20, bld.h + 38, 16);
        ctx.stroke();
      }

      // 건물 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.roundRect(left + 6, top + 10, bld.w, bld.h, 12);
      ctx.fill();

      // [특수 외형] 지하 던전 입구: 고대 석조 아치 게이트 스타일
      if (bld.type === 'dungeon') {
        drawDungeonGate(ctx, bld, left, top);
        drawBuildingLabel(ctx, bld, top);
        return;
      }

      // 1. 굴뚝 및 연기 (카탈로그의 hasChimney 속성 기반 자동 적용)
      if (bld.hasChimney) {
        const chimX = left + bld.w - 32;
        const chimY = top - 26;
        ctx.fillStyle = '#57534e';
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 2;
        ctx.fillRect(chimX, chimY, 16, 30);
        ctx.strokeRect(chimX, chimY, 16, 30);
        ctx.fillStyle = '#44403c';
        ctx.fillRect(chimX - 2, chimY - 3, 20, 5);

        const t = performance.now() * 0.002;
        for (let i = 0; i < 3; i++) {
          const offset = (t + i * 0.8) % 2.4;
          const smokeY = chimY - 8 - offset * 16;
          const smokeX = chimX + 8 + Math.sin(t * 2 + i) * 5;
          const alpha = Math.max(0, 0.45 - offset * 0.18);
          ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
          ctx.beginPath();
          ctx.arc(smokeX, smokeY, 4 + offset * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. 건물 외벽 (중세 회반죽 벽면)
      const wallTop = top + 24;
      const wallH = bld.h - 24;
      ctx.fillStyle = bld.wallColor;
      ctx.beginPath();
      ctx.roundRect(left, wallTop, bld.w, wallH, [0, 0, 8, 8]);
      ctx.fill();

      // 3. 하단 석조 기초 (돌벽 디테일)
      const stoneH = 20;
      ctx.fillStyle = '#64748b';
      ctx.fillRect(left + 1, top + bld.h - stoneH, bld.w - 2, stoneH - 1);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.2;
      for (let sx = left + 16; sx < left + bld.w - 8; sx += 22) {
        ctx.beginPath();
        ctx.moveTo(sx, top + bld.h - stoneH);
        ctx.lineTo(sx, top + bld.h - 1);
        ctx.stroke();
      }

      // 4. 중세 반목조(Half-Timbered) 참나무 대들보 골조
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(left + 2, wallTop + 1, bld.w - 4, wallH - stoneH);

      // 5. 건물 타입별 지붕 실루엣 차별화 (roofStyle 속성 기반 확장 지원)
      if (bld.roofStyle === 'spire') {
        // [뾰족한 마법사/연금술사 원뿔형 첨탑 지붕]
        ctx.fillStyle = bld.roofColor;
        ctx.beginPath();
        ctx.moveTo(left - 14, top + 28);
        ctx.quadraticCurveTo(bld.x - 16, top - 14, bld.x + 6, top - 44);
        ctx.quadraticCurveTo(bld.x + 22, top - 10, left + bld.w + 14, top + 28);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 마법 지붕 금테 장식
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(left - 4, top + 14);
        ctx.lineTo(left + bld.w + 4, top + 14);
        ctx.stroke();
      } else if (bld.roofStyle === 'fortress') {
        // [요새형 평지붕 + 성가퀴(Battlement) 성벽 흉벽]
        ctx.fillStyle = '#475569';
        ctx.fillRect(left - 6, top + 6, bld.w + 12, 22);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(left - 6, top + 6, bld.w + 12, 22);

        // 성가퀴 요철 블록
        const merlonW = 18;
        for (let mx = left - 6; mx < left + bld.w; mx += 28) {
          ctx.fillStyle = '#64748b';
          ctx.fillRect(mx, top - 6, merlonW, 12);
          ctx.strokeRect(mx, top - 6, merlonW, 12);
        }
      } else {
        // [일반 중세 박공/기와 지붕]
        ctx.fillStyle = bld.roofColor;
        ctx.beginPath();
        ctx.moveTo(left - 12, top + 28);
        ctx.lineTo(left + 18, top - 20);
        ctx.lineTo(left + bld.w - 18, top - 20);
        ctx.lineTo(left + bld.w + 12, top + 28);
        ctx.closePath();
        ctx.fill();

        // 지붕 기와 줄무늬
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.lineWidth = 2;
        for (let ry = top - 8; ry < top + 24; ry += 10) {
          const ratio = (ry - (top - 20)) / 48;
          const inset = (1 - ratio) * 26;
          ctx.beginPath();
          ctx.moveTo(left - 8 + inset, ry);
          ctx.lineTo(left + bld.w + 8 - inset, ry);
          ctx.stroke();
        }

        ctx.strokeStyle = '#291509';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(left - 12, top + 28);
        ctx.lineTo(left + 18, top - 20);
        ctx.lineTo(left + bld.w - 18, top - 20);
        ctx.lineTo(left + bld.w + 12, top + 28);
        ctx.stroke();

        ctx.fillStyle = '#451a03';
        ctx.fillRect(left - 13, top + 25, bld.w + 26, 6);
      }

      // 6. 아치형 중세 원목 출입문 (금고는 철제 금고문, 회관은 쌍여닫이 대문)
      const doorW = bld.type === 'townhall' ? 36 : 26;
      const doorH = 36;
      const doorLeft = bld.x - doorW / 2;
      const doorTop = top + bld.h - doorH;

      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(doorLeft - 4, doorTop - 4, doorW + 8, doorH + 4, [14, 14, 0, 0]);
      ctx.fill();

      ctx.fillStyle = bld.type === 'guildbank' ? '#334155' : '#5c2d16';
      ctx.beginPath();
      ctx.roundRect(doorLeft, doorTop, doorW, doorH, [12, 12, 0, 0]);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (bld.type === 'guildbank') {
        // 금고 원형 핸들 휠
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(bld.x, doorTop + 19, 7, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(bld.x, doorTop + 2);
        ctx.lineTo(bld.x, doorTop + doorH);
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(bld.x + 5, doorTop + 20, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. 건물별 고유 외형 & 테마 소품 렌더링 (레지스트리 조회 + 안전 폴백)
      try {
        const detailRenderer = BUILDING_DETAIL_RENDERERS[bld.type] || BUILDING_DETAIL_RENDERERS.default;
        detailRenderer(ctx, bld, left, top, wallTop);
      } catch (err) {
        // 개별 건물 장식 렌더링 오류가 발생해도 게임 루프 전체가 멈추지 않도록 보호
      }

      // 8. 상단 간판 배지 (아이콘 3배 확대 적용: 18px -> 54px)
      const badgeY = bld.roofStyle === 'spire' ? top - 8 : top - 10;
      ctx.fillStyle = 'rgba(41, 21, 9, 0.92)';
      ctx.beginPath();
      ctx.roundRect(bld.x - 42, badgeY - 38, 84, 76, 16);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.stroke();

      if (bld.type === 'sky_smithy') {
        // 🪽 날개 이모지는 기기(글꼴)에 따라 X 박스로 보여서, 천공 대장간 간판은 날개 그림을 직접 그린다
        const wingIcon = getSkySmithyWingIcon();
        ctx.drawImage(wingIcon, bld.x - 30, badgeY + 2 - 30, 60, 60);
      } else {
        ctx.font = '54px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bld.icon, bld.x, badgeY + 2);
      }

      drawBuildingLabel(ctx, bld, top);
    }

    // 천공 대장간 간판용 날개 그림 (한 번 그려 두고 계속 씀 · 글꼴과 상관없이 모든 기기에서 같은 모양)
    let skySmithyWingIconCanvas = null;
    function getSkySmithyWingIcon() {
      if (skySmithyWingIconCanvas) return skySmithyWingIconCanvas;
      const S = 128;
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d');
      g.scale(S / 100, S / 100);
      g.lineJoin = 'round';
      // 깃털 5장 (아래쪽 긴 깃털부터 부채꼴로)
      const feathers = [
        { deg: -14, len: 50 }, { deg: -31, len: 58 }, { deg: -48, len: 64 },
        { deg: -65, len: 66 }
      ];
      feathers.forEach((f, i) => {
        g.save();
        g.translate(24, 78);
        g.rotate(f.deg * Math.PI / 180);
        const grad = g.createLinearGradient(0, 0, f.len, 0);
        grad.addColorStop(0, '#e0f2fe');
        grad.addColorStop(1, '#ffffff');
        g.fillStyle = grad;
        g.strokeStyle = '#38bdf8';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(0, -8);
        g.quadraticCurveTo(f.len * 0.5, -15, f.len, -3);
        g.quadraticCurveTo(f.len * 1.02, 4, f.len * 0.82, 8);
        g.quadraticCurveTo(f.len * 0.4, 13, 0, 9);
        g.closePath();
        g.fill();
        g.stroke();
        // 깃대
        g.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(4, 0);
        g.lineTo(f.len * 0.85, -2);
        g.stroke();
        g.restore();
      });
      // 날개 위쪽 덮깃 (둥근 어깨)
      g.save();
      g.translate(28, 66);
      g.rotate(-50 * Math.PI / 180);
      g.fillStyle = "#ffffff";
      g.strokeStyle = "#38bdf8";
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(16, 0, 26, 16, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.restore();
      // 반짝임
      g.fillStyle = 'rgba(255, 255, 255, 0.9)';
      g.beginPath();
      g.arc(78, 18, 3.2, 0, Math.PI * 2);
      g.fill();
      skySmithyWingIconCanvas = c;
      return c;
    }

    // 건물별 고유 건축 디테일 레지스트리 (신규 건물 추가 시 여기에 등록 가능, 미등록 시 default 폴백)
    const BUILDING_DETAIL_RENDERERS = {
      default(ctx, bld, left, top, wallTop) {
        // 신규 확장 건물을 위한 기본 중세 격자 창문 & 꽃상자 장식
        [-38, 38].forEach((ox) => {
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(bld.x + ox - 9, wallTop + 14, 18, 18);
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 2;
          ctx.strokeRect(bld.x + ox - 9, wallTop + 14, 18, 18);
          ctx.beginPath();
          ctx.moveTo(bld.x + ox, wallTop + 14);
          ctx.lineTo(bld.x + ox, wallTop + 32);
          ctx.moveTo(bld.x + ox - 9, wallTop + 23);
          ctx.lineTo(bld.x + ox + 9, wallTop + 23);
          ctx.stroke();
        });
      },

      townhall(ctx, bld, left, top, wallTop) {
        // 🏛️ 마을 회관: 대리석 기둥 4개 + 지붕 위 황금 시계탑 & 왕실 깃발
        [-56, -26, 26, 56].forEach((ox) => {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(bld.x + ox - 4, wallTop + 6, 8, bld.h - 32);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bld.x + ox - 4, wallTop + 6, 8, bld.h - 32);
        });
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(bld.x - 16, top - 38, 32, 20);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(bld.x, top - 28, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(bld.x, top - 52);
        ctx.lineTo(bld.x + 20, top - 46);
        ctx.lineTo(bld.x, top - 40);
        ctx.fill();
      },

      inn(ctx, bld, left, top, wallTop) {
        // 🛏️ 여관: 2층 다락방 창문 + 목재 발코니 난간 + 매달린 여관 간판
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(bld.x - 12, top - 12, 24, 16);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.strokeRect(bld.x - 12, top - 12, 24, 16);

        ctx.fillStyle = '#78350f';
        ctx.fillRect(left + 12, wallTop + 26, bld.w - 24, 6);
        for (let bx = left + 16; bx <= left + bld.w - 16; bx += 12) {
          ctx.fillRect(bx, wallTop + 16, 3, 10);
        }
        ctx.strokeStyle = '#291509';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(left, wallTop + 14);
        ctx.lineTo(left - 18, wallTop + 14);
        ctx.stroke();
        ctx.fillStyle = '#10b981';
        ctx.fillRect(left - 18, wallTop + 16, 14, 14);
      },

      tavern(ctx, bld, left, top, wallTop) {
        // 🍖 주점 & 식당: 줄무늬 차양막 + 야외 오크 맥주통 + 원목 식탁
        const stripeW = 16;
        for (let i = 0; i < 7; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#fef3c7';
          ctx.fillRect(left + 14 + i * stripeW, wallTop + 4, stripeW, 12);
        }
        [left + 12, left + 26].forEach((bx) => {
          ctx.fillStyle = '#92400e';
          ctx.beginPath();
          ctx.roundRect(bx, top + bld.h - 18, 12, 16, 4);
          ctx.fill();
          ctx.strokeStyle = '#1c1917';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
        ctx.fillStyle = '#78350f';
        ctx.fillRect(left + bld.w - 34, top + bld.h - 12, 24, 5);
        ctx.fillRect(left + bld.w - 24, top + bld.h - 7, 4, 7);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(left + bld.w - 28, top + bld.h - 17, 5, 5);
      },

      smithy(ctx, bld, left, top, wallTop) {
        // ⚒️ 대장간: 이글거리는 석조 용광로 화로 + 쇠모루
        const t = performance.now() * 0.003;
        ctx.fillStyle = '#334155';
        ctx.fillRect(left + 8, wallTop + 18, 32, bld.h - 44);
        const glow = 0.75 + Math.sin(t * 4) * 0.25;
        ctx.fillStyle = `rgba(239, 68, 68, ${glow})`;
        ctx.beginPath();
        ctx.arc(left + 24, top + bld.h - 18, 10, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(left + 24, top + bld.h - 18, 5, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(left + bld.w - 34, top + bld.h - 14);
        ctx.lineTo(left + bld.w - 10, top + bld.h - 14);
        ctx.lineTo(left + bld.w - 14, top + bld.h - 6);
        ctx.lineTo(left + bld.w - 28, top + bld.h - 6);
        ctx.closePath();
        ctx.fill();
      },

      potion(ctx, bld, left, top, wallTop) {
        // 🧪 물약 상점: 진열된 형형색색 포션 병 + 보글거리는 연금술 가마솥
        const t = performance.now() * 0.003;
        const potionColors = ['#ef4444', '#3b82f6', '#22c55e'];
        potionColors.forEach((col, idx) => {
          const px = left + 14 + idx * 11;
          const py = wallTop + 20;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(px - 1.5, py - 7, 3, 3);
        });

        const cx = left + bld.w - 24;
        const cy = top + bld.h - 12;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(cx + Math.sin(t * 2) * 3, cy - 5 - (t % 1) * 8, 3, 0, Math.PI * 2);
        ctx.fill();
      },

      training(ctx, bld, left, top) {
        // 🎯 훈련소: 야외 과녁 표적판 + 목검 거치대
        const tx = left + 22;
        const ty = top + bld.h - 18;
        ctx.fillStyle = '#78350f';
        ctx.fillRect(tx - 2, ty, 4, 16);
        ['#ef4444', '#ffffff', '#ef4444'].forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(tx, ty - 4, 11 - i * 3.5, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(left + bld.w - 34, top + bld.h - 24, 22, 18);
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(left + bld.w - 28, top + bld.h - 28);
        ctx.lineTo(left + bld.w - 28, top + bld.h - 8);
        ctx.moveTo(left + bld.w - 18, top + bld.h - 28);
        ctx.lineTo(left + bld.w - 18, top + bld.h - 8);
        ctx.stroke();
      },

      enchanter(ctx, bld, left, top, wallTop) {
        // 🔮 마법 강화소: 첨탑 위 공중 부유 & 회전하는 마력 수정구 + 스테인드글라스 창문
        const t = performance.now() * 0.003;
        const floatY = top - 56 + Math.sin(t * 2) * 4;
        ctx.save();
        ctx.translate(bld.x + 6, floatY);
        ctx.rotate(t * 0.8);
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.fillRect(-7, -7, 14, 14);
        ctx.restore();

        [-38, 38].forEach((ox) => {
          ctx.fillStyle = '#818cf8';
          ctx.beginPath();
          ctx.roundRect(bld.x + ox - 7, wallTop + 14, 14, 22, [7, 7, 0, 0]);
          ctx.fill();
          ctx.strokeStyle = '#312e81';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      },

      guildbank(ctx, bld, left, top, wallTop) {
        // 🏦 모험가 길드 금고: 황금 방패 문장 + 좌우 황금 보물상자
        [-42, 42].forEach((ox) => {
          ctx.fillStyle = '#b45309';
          ctx.fillRect(bld.x + ox - 10, top + bld.h - 14, 20, 12);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bld.x + ox - 10, top + bld.h - 14, 20, 12);
        });
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(left + 24, wallTop + 22, 10, 0, Math.PI * 2);
        ctx.arc(left + bld.w - 24, wallTop + 22, 10, 0, Math.PI * 2);
        ctx.fill();
      },

      generalstore(ctx, bld, left, top, wallTop) {
        // 🛍️ 잡화상점: 청록/아이보리 차양 + 목재 보급 상자 + 전리품 자루
        const stripeW = 16;
        for (let i = 0; i < 7; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#0d9488' : '#f0fdfa';
          ctx.fillRect(left + 16 + i * stripeW, wallTop + 4, stripeW, 11);
        }
        ctx.fillStyle = '#b45309';
        ctx.fillRect(left + 10, top + bld.h - 15, 16, 14);
        ctx.fillRect(left + 26, top + bld.h - 15, 14, 14);
        ctx.fillRect(left + 16, top + bld.h - 27, 15, 12);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(left + 10, top + bld.h - 15, 16, 14);
        ctx.strokeRect(left + 26, top + bld.h - 15, 14, 14);
        ctx.strokeRect(left + 16, top + bld.h - 27, 15, 12);

        ctx.fillStyle = '#d6d3d1';
        ctx.beginPath();
        ctx.arc(left + bld.w - 22, top + bld.h - 9, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#57534e';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(left + bld.w - 34, top + bld.h - 6, 4.5, 0, Math.PI * 2);
        ctx.fill();
      },

      temple(ctx, bld, left, top, wallTop) {
        // ⛪ 치유의 신전: 황금 십자가 첨탑 + 대리석 성당 기둥 + 빛나는 성수 분수
        const t = performance.now() * 0.003;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(bld.x - 2.5, top - 44, 5, 24);
        ctx.fillRect(bld.x - 9, top - 37, 18, 4.5);

        [-52, 52].forEach((ox) => {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bld.x + ox - 5, wallTop + 4, 10, bld.h - 28);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bld.x + ox - 5, wallTop + 4, 10, bld.h - 28);
        });

        const fx = left + 22;
        const fy = top + bld.h - 10;
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.ellipse(fx, fy, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(fx, fy - 1, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        const healY = fy - 8 - ((t * 10) % 16);
        ctx.fillStyle = 'rgba(253, 224, 71, 0.85)';
        ctx.beginPath();
        ctx.arc(fx + Math.sin(t * 3) * 4, healY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      },

      rebirth_hall(ctx, bld, left, top, wallTop) {
        // ⛩️ 환생소: 보랏빛 윤회 마법진 + 자수정 기둥 + 부유하는 영혼 구슬
        const t = performance.now() * 0.003;
        [-50, 50].forEach((ox) => {
          ctx.fillStyle = '#9333ea';
          ctx.fillRect(bld.x + ox - 5, wallTop + 4, 10, bld.h - 28);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bld.x + ox - 5, wallTop + 4, 10, bld.h - 28);
        });

        // 공중 부유 영혼의 윤회 링
        const orbY = top - 52 + Math.sin(t * 2.2) * 3.5;
        ctx.save();
        ctx.translate(bld.x + 6, orbY);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#e879f9';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(Math.cos(t * 3) * 8, Math.sin(t * 3) * 8, 3.2, 0, Math.PI * 2);
        ctx.arc(Math.cos(t * 3 + Math.PI) * 8, Math.sin(t * 3 + Math.PI) * 8, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },

      purification_sanctuary(ctx, bld, left, top, wallTop) {
        // 🕊️ 정화의 성소: 에메랄드 성수 연못 + 청록 수정 크리스탈 + 정화 빛기둥
        const t = performance.now() * 0.003;
        [-48, 48].forEach((ox) => {
          ctx.fillStyle = '#99f6e4';
          ctx.fillRect(bld.x + ox - 5, wallTop + 4, 10, bld.h - 28);
          ctx.strokeStyle = '#0f766e';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bld.x + ox - 5, wallTop + 4, 10, bld.h - 28);
        });

        const crystalY = top - 52 + Math.sin(t * 2.4) * 3;
        ctx.save();
        ctx.translate(bld.x + 6, crystalY);
        ctx.fillStyle = '#5eead4';
        ctx.shadowColor = '#2dd4bf';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(7, 0);
        ctx.lineTo(0, 10);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        const px = left + 22;
        const py = top + bld.h - 10;
        ctx.fillStyle = '#ccfbf1';
        ctx.beginPath();
        ctx.ellipse(px, py, 11, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2dd4bf';
        ctx.beginPath();
        ctx.ellipse(px, py - 1, 8, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
      },

      sky_island_gate(ctx, bld, left, top, wallTop) {
        // 🌀 천공의 섬 게이트: 하늘빛/금빛 고리 포탈 + 부유하는 천공 크리스탈
        const t = performance.now() * 0.003;
        [-48, 48].forEach((ox) => {
          ctx.fillStyle = '#bae6fd';
          ctx.fillRect(bld.x + ox - 5, wallTop + 4, 10, bld.h - 28);
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bld.x + ox - 5, wallTop + 4, 10, bld.h - 28);
        });

        // 포탈 입구 회전 마력 링
        const portalX = bld.x;
        const portalY = top + bld.h - 22;
        ctx.save();
        ctx.translate(portalX, portalY);
        ctx.rotate(t * 1.4);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 상단 부유 천공 크리스탈
        const floatY = top - 52 + Math.sin(t * 2.2) * 3.5;
        ctx.save();
        ctx.translate(bld.x + 6, floatY);
        ctx.fillStyle = '#7dd3fc';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(7, 0);
        ctx.lineTo(0, 10);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      },

      sky_smithy(ctx, bld, left, top, wallTop) {
        // 🪽 천공 대장간: 백은·하늘빛 대리석 기둥 + 공중 부유 성광 날개 문장 & 제련 모루
        const t = performance.now() * 0.0032;
        [-48, 48].forEach((ox) => {
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(bld.x + ox - 5, wallTop + 4, 10, bld.h - 28);
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bld.x + ox - 5, wallTop + 4, 10, bld.h - 28);
        });

        const floatY = top - 52 + Math.sin(t * 2.4) * 3.5;
        ctx.save();
        ctx.translate(bld.x + 6, floatY);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.quadraticCurveTo(-12, -10, -18, -4);
        ctx.quadraticCurveTo(-10, 4, 0, 5);
        ctx.moveTo(0, 2);
        ctx.quadraticCurveTo(12, -10, 18, -4);
        ctx.quadraticCurveTo(10, 4, 0, 5);
        ctx.fill();
        ctx.restore();

        const ax = left + bld.w - 24;
        const ay = top + bld.h - 10;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(ax - 11, ay - 6);
        ctx.lineTo(ax + 11, ay - 6);
        ctx.lineTo(ax + 7, ay);
        ctx.lineTo(ax - 7, ay);
        ctx.closePath();
        ctx.fill();
      }
    };

    // [전용 렌더러] 고대 석조 아치 형태의 지하 던전 입구
    function drawDungeonGate(ctx, bld, left, top) {
      // 거친 암석 외벽 마운드
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(left, top - 6, bld.w, bld.h + 6, [28, 28, 8, 8]);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 고대 석조 아치 기둥
      const archW = 64;
      const archH = 66;
      const archLeft = bld.x - archW / 2;
      const archTop = top + bld.h - archH;

      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.roundRect(archLeft - 10, archTop - 10, archW + 20, archH + 10, [36, 36, 4, 4]);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 어두운 심연 던전 입구 내부
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.roundRect(archLeft, archTop, archW, archH, [30, 30, 0, 0]);
      ctx.fill();

      // 보라빛 마력 오라 이펙트
      const pulse = 0.25 + Math.sin(performance.now() * 0.004) * 0.1;
      ctx.fillStyle = `rgba(139, 92, 246, ${pulse})`;
      ctx.beginPath();
      ctx.roundRect(archLeft + 6, archTop + 8, archW - 12, archH - 8, [24, 24, 0, 0]);
      ctx.fill();

      // 양옆 횃불 브라켓
      [-46, 46].forEach((ox) => {
        const tx = bld.x + ox;
        const ty = top + bld.h - 38;
        ctx.fillStyle = '#451a03';
        ctx.fillRect(tx - 2, ty, 4, 16);
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(tx, ty - 3, 5 + Math.sin(performance.now() * 0.01 + ox) * 1.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // 상단 룬 문장 배지 (아이콘 3배 확대 적용: 20px -> 60px)
      ctx.font = '60px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bld.icon, bld.x, top + 6);

      // 현재 지하 던전에 입장해 있는 헌터 표시 (월드 캔버스 오버레이)
      const explorers = hunters.filter(h => h.state === 'IN_DUNGEON');
      if (explorers.length > 0) {
        // 포털 내부 반짝이는 탐험 이펙트 강화
        ctx.fillStyle = 'rgba(167, 139, 250, 0.35)';
        ctx.beginPath();
        ctx.arc(bld.x, archTop + archH * 0.55, 16 + Math.sin(performance.now() * 0.008) * 4, 0, Math.PI * 2);
        ctx.fill();

        // 던전 입구 상단에 입장 중인 헌터 인원수만 표시 (개별 이름 미출력)
        const tagText = `⚔️ 던전 탐험 중: ${explorers.length}명`;
        ctx.font = 'bold 11px sans-serif';
        const tw = ctx.measureText(tagText).width;
        const boxW = tw + 18;
        const boxY = top - 52;

        ctx.fillStyle = 'rgba(30, 27, 75, 0.92)';
        ctx.beginPath();
        ctx.roundRect(bld.x - boxW / 2, boxY, boxW, 24, 999);
        ctx.fill();

        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = '#ede9fe';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, bld.x, boxY + 12);
      }
    }

    // 건물 하단 중세 양피지/명판 스타일 이름표
    function drawBuildingLabel(ctx, bld, top) {
      const label = `Lv.${bld.level} ${bld.name}`;
      ctx.font = 'bold 12px sans-serif';
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = 'rgba(28, 25, 23, 0.9)';
      ctx.beginPath();
      ctx.roundRect(bld.x - textWidth / 2 - 10, top + bld.h + 6, textWidth + 20, 22, 6);
      ctx.fill();

      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fef3c7';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bld.x, top + bld.h + 17);
    }

    // 마을 장식 소품 (나무 & 가로등) 렌더링
    function drawProps(ctx) {
      props.forEach((p) => {
        if (p.type === 'tree') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
          ctx.beginPath();
          ctx.ellipse(p.x + 4, p.y + 18, 22, 10, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#5c2d16';
          ctx.fillRect(p.x - 5, p.y - 4, 10, 22);

          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(p.x, p.y - 14, 24, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(p.x - 6, p.y - 20, 15, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'lamp') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(p.x - 2.5, p.y - 24, 5, 26);

          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 27, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    }
