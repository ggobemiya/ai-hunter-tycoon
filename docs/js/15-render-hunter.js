// [15-render-hunter] 렌더링: 헌터 캐릭터 · 장비 · 무기 이펙트
    // 헌터 캐릭터, 장비(갑옷/투구), 무기 강화 이펙트 렌더링
    function drawHunterWithWeapon(ctx, hunter) {
      const t = performance.now() * 0.003;
      const isSelected = hunter.id === gameState.selectedHunterId;
      const bobY = hunter.state === 'WALKING' ? Math.abs(Math.sin(hunter.walkCycle)) * 3 : 0;

      // 0. 무기 입자(스파크/불꽃): 헌터 기준 위치에 그려 헌터를 따라다님
      hunter.particles.forEach((pt) => {
        const alpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = hunter.weaponEnhance >= 15
          ? `rgba(251, 191, 36, ${alpha})`
          : `rgba(56, 189, 248, ${alpha})`;
        ctx.beginPath();
        ctx.arc(hunter.x + pt.x, hunter.y + pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.save();
      ctx.translate(hunter.x, hunter.y);

      // [환생 차수(1~5환생)별 전용 외형 오라 이펙트]
      const rebirthTier = Math.max(0, Math.min(LEVEL_REBIRTH_CONFIG.maxRebirths, hunter.rebirthCount || 0));
      if (rebirthTier > 0) {
        const rebirthAuraPalettes = {
          1: {
            coreRgba: 'rgba(52, 211, 153, 0.34)',
            edgeRgba: 'rgba(16, 185, 129, 0)',
            ringStroke: 'rgba(110, 231, 183, 0.85)',
            sparkRgb: '110, 231, 183',
            haloStroke: 'rgba(52, 211, 153, 0.28)'
          },
          2: {
            coreRgba: 'rgba(56, 189, 248, 0.38)',
            edgeRgba: 'rgba(2, 132, 199, 0)',
            ringStroke: 'rgba(125, 211, 252, 0.88)',
            sparkRgb: '125, 211, 252',
            haloStroke: 'rgba(56, 189, 248, 0.32)'
          },
          3: {
            coreRgba: 'rgba(192, 132, 252, 0.42)',
            edgeRgba: 'rgba(126, 34, 206, 0)',
            ringStroke: 'rgba(216, 180, 254, 0.92)',
            sparkRgb: '232, 121, 249',
            haloStroke: 'rgba(192, 132, 252, 0.36)'
          },
          4: {
            coreRgba: 'rgba(251, 146, 60, 0.45)',
            edgeRgba: 'rgba(220, 38, 38, 0)',
            ringStroke: 'rgba(253, 224, 71, 0.94)',
            sparkRgb: '251, 191, 36',
            haloStroke: 'rgba(251, 146, 60, 0.4)'
          },
          5: {
            coreRgba: 'rgba(244, 114, 182, 0.48)',
            edgeRgba: 'rgba(250, 204, 21, 0)',
            ringStroke: 'rgba(254, 240, 138, 0.98)',
            sparkRgb: '254, 240, 138',
            haloStroke: 'rgba(240, 171, 252, 0.46)'
          }
        };
        const rPal = rebirthAuraPalettes[rebirthTier] || rebirthAuraPalettes[5];
        const auraRadius = 18 + rebirthTier * 2.4 + Math.sin(t * (2.2 + rebirthTier * 0.35)) * 1.6;

        // 발밑 환생 윤회 마법진 & 방사형 그라데이션 오라
        ctx.save();
        ctx.translate(0, 14);
        ctx.scale(1, 0.44);

        const grad = ctx.createRadialGradient(0, 0, 3, 0, 0, auraRadius + 6);
        grad.addColorStop(0, rPal.coreRgba);
        grad.addColorStop(0.7, rPal.coreRgba);
        grad.addColorStop(1, rPal.edgeRgba);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, auraRadius + 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.rotate(t * (1.1 + rebirthTier * 0.25));
        ctx.strokeStyle = rPal.ringStroke;
        ctx.lineWidth = 1.6 + rebirthTier * 0.22;
        ctx.setLineDash([6 + rebirthTier, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 3환생 이상부터 이중 역회전 윤회 링 추가
        if (rebirthTier >= 3) {
          ctx.save();
          ctx.rotate(-t * (1.6 + rebirthTier * 0.2));
          ctx.strokeStyle = rPal.ringStroke;
          ctx.globalAlpha = 0.72;
          ctx.lineWidth = 1.3 + (rebirthTier - 3) * 0.2;
          ctx.setLineDash([4, 5]);
          ctx.beginPath();
          ctx.arc(0, 0, auraRadius + 5.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();

        // 상체 윤회 후광 & 상승 영혼 오라 입자 (환생 차수만큼 입자 수 증가)
        ctx.save();
        if (rebirthTier >= 2) {
          ctx.strokeStyle = rPal.haloStroke;
          ctx.lineWidth = 1.4 + (rebirthTier - 2) * 0.25;
          ctx.beginPath();
          ctx.arc(0, -4 - bobY, 15 + rebirthTier * 1.2 + Math.sin(t * 2.5) * 1.2, 0, Math.PI * 2);
          ctx.stroke();
        }

        const moteCount = rebirthTier + 1;
        for (let m = 0; m < moteCount; m++) {
          const cycle = (t * (0.65 + rebirthTier * 0.08) + m / moteCount) % 1;
          const angle = m * ((Math.PI * 2) / moteCount) + t * 1.4;
          const mx = Math.cos(angle) * (11 + rebirthTier * 1.5);
          const my = 12 - cycle * (28 + rebirthTier * 3) - bobY;
          ctx.fillStyle = `rgba(${rPal.sparkRgb}, ${(1 - cycle) * 0.85})`;
          ctx.beginPath();
          ctx.arc(mx, my, 1.6 + (rebirthTier >= 4 ? 0.5 : 0), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 선택된 헌터 황금 타겟 링
      if (isSelected) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 14, 18, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 고강화 무기 발밑 마법진 오라
      if (hunter.weaponEnhance >= 15) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 14, 15 + Math.sin(t * 3) * 2, 6.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (hunter.weaponEnhance >= 10) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(0, 14, 14 + Math.sin(t * 2.5) * 1.5, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 중간 보스 인장 착용자 전용 발밑 수호왕 오라 (지역별 고유 오라 색상 마법진)
      const equippedIns = hunter.getEquippedInsignia ? hunter.getEquippedInsignia() : null;
      if (equippedIns) {
        ctx.save();
        ctx.translate(0, 14);
        ctx.scale(1, 0.44);
        ctx.rotate(t * 1.8);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.88)';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([7, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 21 + Math.sin(t * 4) * 1.8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.rotate(-t * 3.4);
        ctx.strokeStyle = equippedIns.auraColor || '#34d399';
        ctx.lineWidth = 1.9;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 15.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // 바닥 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 14, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 보행 바운스 오프셋 적용
      ctx.translate(0, -bobY);

      // 0.5. 착용 날개 아이템 렌더링 (천공의 성역 날개)
      //      옆모습 캐릭터 이미지에 맞춰, 등 위쪽에서 뒤로 펼쳐지는 깃털 날개 2장(뒤쪽 날개는 조금 작고 어둡게)
      const equippedWing = hunter.getEquippedWing ? hunter.getEquippedWing() : null;
      if (equippedWing) {
        drawHunterFeatherWings(ctx, hunter, t);
      }

      // 1~3. 직업·환생 단계별 몸체 외형 (다리 · 갑옷/로브 · 망토 · 머리 · 투구/모자)
      //      파츠 라이브러리와 외형 표는 js/15a-hunter-looks.js 참고
      const legSwing = hunter.state === 'WALKING' ? Math.sin(hunter.walkCycle) * 3 : 0;
      // 헌터 이미지(js/15b-hunter-sprites.js)가 준비돼 있으면 이미지로, 아니면 기존 그림으로
      if (typeof drawHunterSpriteBody !== 'function' || !drawHunterSpriteBody(ctx, hunter, t)) {
        drawHunterBodyLook(ctx, hunter, t, legSwing);
      }


      // 4. 직업별 전용 무기 & 강화 단계별 이펙트 (+10강 / +15강)
      const weaponTier = hunter.equipment?.weapon?.tier || 1;
      const rebirthWeaponThemes = {
        1: {
          blade: '#a7f3d0',
          trim: '#34d399',
          glow: '#10b981',
          crest: 'crescent'
        },
        2: {
          blade: '#bae6fd',
          trim: '#38bdf8',
          glow: '#0284c7',
          crest: 'wings'
        },
        3: {
          blade: '#f3e8ff',
          trim: '#c084fc',
          glow: '#9333ea',
          crest: 'crown'
        },
        4: {
          blade: '#ffedd5',
          trim: '#fb923c',
          glow: '#ea580c',
          crest: 'fangs'
        },
        5: {
          blade: '#fef9c3',
          trim: '#f472b6',
          glow: '#facc15',
          crest: 'celestial'
        }
      };
      const rWeapon = rebirthTier > 0 ? (rebirthWeaponThemes[rebirthTier] || rebirthWeaponThemes[5]) : null;

      const bladeColor = rWeapon
        ? rWeapon.blade
        : (hunter.weaponEnhance >= 15 || weaponTier >= 10
            ? '#fffbeb'
            : (hunter.weaponEnhance >= 10 || weaponTier >= 8 ? '#e0f2fe' : (weaponTier >= 6 ? '#f0abfc' : (weaponTier >= 4 ? '#fca5a5' : (weaponTier >= 3 ? '#7dd3fc' : '#cbd5e1')))));
      const trimColor = rWeapon
        ? rWeapon.trim
        : (hunter.weaponEnhance >= 15 || weaponTier >= 8 ? '#fbbf24' : (weaponTier >= 6 ? '#c084fc' : (weaponTier >= 3 ? '#38bdf8' : '#94a3b8')));

      ctx.save();
      ctx.translate(hunter.facing * 10, 2);
      const swingAngle = hunter.state === 'WALKING'
        ? Math.sin(hunter.walkCycle) * 0.14
        : Math.sin(t * 1.5) * 0.06;

      // 직업별 공격 모션 각도 및 전진 오프셋 계산
      let attackAngleOffset = 0;
      let attackReachOffset = 0;
      if (hunter.attackAnimTimer > 0) {
        const prog = 1 - (hunter.attackAnimTimer / 0.34); // 0(시작) -> 1(종료)
        if (hunter.job === '버서커') {
          // 머리 위로 크게 치켜들었다가 전방으로 내려찍는 호쾌한 스윙
          attackAngleOffset = prog < 0.3 ? -0.85 : (-0.85 + ((prog - 0.3) / 0.7) * 2.15);
          attackReachOffset = prog >= 0.3 ? 5 : -2;
        } else if (hunter.job === '팔라딘') {
          // 전방으로 검을 묵직하게 찌르며 성광 방출
          attackAngleOffset = Math.sin(prog * Math.PI) * 0.95;
          attackReachOffset = Math.sin(prog * Math.PI) * 9;
        } else if (hunter.job === '레인저') {
          // 활시위를 당겼다 놓는 반동 모션
          attackAngleOffset = -Math.sin(prog * Math.PI) * 0.18;
          attackReachOffset = prog < 0.4 ? -3 : 2;
        } else if (hunter.job === '소서러') {
          // 지팡이를 높이 들어 마력을 방출하는 캐스팅 모션
          attackAngleOffset = -Math.sin(prog * Math.PI) * 0.48;
          attackReachOffset = Math.sin(prog * Math.PI) * 4;
        }
      }

      ctx.translate(hunter.facing * attackReachOffset, 0);
      const baseAngle = hunter.job === '레인저' ? 0.15 : (hunter.job === '소서러' ? 0.28 : 0.42);
      ctx.rotate(hunter.facing * (baseAngle + swingAngle + attackAngleOffset));

      const bladeLen = hunter.weaponEnhance >= 15
        ? 28 + rebirthTier * 0.8
        : (hunter.weaponEnhance >= 10 ? 25 + rebirthTier * 0.8 : 22 + rebirthTier * 0.8);

      // [환생 차수(1~5환생) 무기 윤회 문양 오라]
      const isBowWeapon = hunter.job === '레인저'; // 활은 아래 레인저 무기 그리기에서 활 모양을 따라 빛나게 처리
      // 무기 이미지(js/15f-weapon-sprites.js)가 있으면 이미지 자체에 환생 장식이 있으므로 윤회 문양 오라는 생략
      const weaponImgReady = typeof isHunterWeaponSpriteReady === 'function' && isHunterWeaponSpriteReady(hunter);
      if (rWeapon && !isBowWeapon && !weaponImgReady) {
        const wPulse = 1 + Math.sin(t * (3 + rebirthTier * 0.5)) * 0.12;
        ctx.save();
        ctx.shadowColor = rWeapon.glow;
        ctx.shadowBlur = 10 + rebirthTier * 2.5;
        ctx.strokeStyle = trimColor;
        ctx.lineWidth = 1.2 + rebirthTier * 0.18;
        ctx.beginPath();
        ctx.ellipse(0, -bladeLen * 0.5, (5 + rebirthTier * 0.7) * wPulse, bladeLen * 0.58, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 가드(코어) 윤회 보석 장식
        ctx.fillStyle = trimColor;
        ctx.beginPath();
        ctx.arc(0, -1, 2.4 + rebirthTier * 0.35, 0, Math.PI * 2);
        ctx.fill();

        if (rebirthTier >= 2) {
          ctx.beginPath();
          ctx.moveTo(-4 - rebirthTier * 0.5, -bladeLen * 0.35);
          ctx.lineTo(0, -bladeLen * 0.35 - 3);
          ctx.lineTo(4 + rebirthTier * 0.5, -bladeLen * 0.35);
          ctx.stroke();
        }
        if (rebirthTier >= 4) {
          ctx.strokeStyle = bladeColor;
          ctx.beginPath();
          ctx.arc(0, -bladeLen * 0.78, 3.8 + (rebirthTier - 4) * 1.4, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // [무기 강화 이펙트 레이어 (+10강 / +15강 공통 적용)]
      if (isBowWeapon) {
        // 레인저: 칼날 모양 빛 대신 활 모양을 따라 빛남 (아래 레인저 무기 그리기)
      } else if (hunter.weaponEnhance >= 15) {
        const pulse = 1 + Math.sin(t * 5) * 0.15;
        ctx.save();
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 18;

        ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, -bladeLen * 0.55, 9 * pulse, bladeLen * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
        ctx.beginPath();
        ctx.ellipse(0, -bladeLen * 0.55, 5.2 * pulse, bladeLen * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.8;
        const starR = 7 + Math.sin(t * 6) * 2.5;
        ctx.beginPath();
        ctx.moveTo(-starR, -bladeLen);
        ctx.lineTo(starR, -bladeLen);
        ctx.moveTo(0, -bladeLen - starR);
        ctx.lineTo(0, -bladeLen + starR);
        ctx.stroke();
        ctx.restore();
      } else if (hunter.weaponEnhance >= 10) {
        const pulse = 1 + Math.sin(t * 4) * 0.12;
        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;

        ctx.fillStyle = 'rgba(56, 189, 248, 0.48)';
        ctx.beginPath();
        ctx.ellipse(0, -bladeLen * 0.52, 6.8 * pulse, bladeLen * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-4, -6);
        ctx.quadraticCurveTo(5, -bladeLen * 0.5, -3, -bladeLen + 2);
        ctx.stroke();
        ctx.restore();
      }

      // [직업별 무기 형태 렌더링] 무기 이미지가 있으면 이미지로, 없으면 아래 기존 그림으로
      if (weaponImgReady && drawHunterWeaponSprite(ctx, hunter, bladeLen, t)) {
        // 이미지로 그림 (js/15f-weapon-sprites.js)
      } else if (hunter.job === '버서커') {
        // 🪓 버서커: 나무 자루 + 수염형 외날 전투 도끼 (환생할수록 날이 커지고 뒷날·뿔이 추가)
        const fx = hunter.facing || 1;
        const axS = 1 + Math.min(5, rebirthTier) * 0.08;
        const headY = -bladeLen + 4;
        // 자루 (가죽 손잡이 감개 포함)
        ctx.fillStyle = '#7c2d12';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.fillRect(-1.6, -bladeLen - 2, 3.2, bladeLen + 9);
        ctx.strokeRect(-1.6, -bladeLen - 2, 3.2, bladeLen + 9);
        ctx.fillStyle = '#451a03';
        for (let g = 0; g < 3; g++) ctx.fillRect(-1.8, 1 + g * 2, 3.6, 1);
        // 자루 끝 쇠 마개 & 꼭대기 창끝
        ctx.fillStyle = trimColor;
        ctx.fillRect(-2.2, 6, 4.4, 2);
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(-1.6, -bladeLen - 2);
        ctx.lineTo(0, -bladeLen - 6 - rebirthTier * 0.6);
        ctx.lineTo(1.6, -bladeLen - 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 뒷날 (1~2환생: 가시, 3환생 이상: 작은 초승달 날)
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        if (rebirthTier >= 3) {
          ctx.moveTo(-fx * 1.5, headY - 2);
          ctx.quadraticCurveTo(-fx * 8 * axS, headY - 5, -fx * 9 * axS, headY + 2);
          ctx.quadraticCurveTo(-fx * 8 * axS, headY + 8, -fx * 1.5, headY + 6);
        } else if (rebirthTier >= 1) {
          ctx.moveTo(-fx * 1.5, headY);
          ctx.lineTo(-fx * 7, headY + 2);
          ctx.lineTo(-fx * 1.5, headY + 4.5);
        }
        ctx.closePath();
        ctx.fill();
        if (rebirthTier >= 1) ctx.stroke();

        // 앞날: 어두운 강철 몸체 (위쪽 뿔 + 아래로 늘어진 수염)
        ctx.fillStyle = '#475569';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(fx * 1.5, headY - 2.5);
        ctx.lineTo(fx * 10 * axS, headY - 7 * axS);
        ctx.quadraticCurveTo(fx * 15 * axS, headY + 3, fx * 10 * axS, headY + 14 * axS);
        ctx.quadraticCurveTo(fx * 6, headY + 9, fx * 1.5, headY + 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 번뜩이는 날 끝 (강화·환생 색)
        ctx.strokeStyle = bladeColor;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(fx * 10 * axS, headY - 6 * axS);
        ctx.quadraticCurveTo(fx * 14.2 * axS, headY + 3, fx * 10 * axS, headY + 13 * axS);
        ctx.stroke();
        // 도끼머리 고정 띠 & 리벳
        ctx.fillStyle = trimColor;
        ctx.fillRect(-2.2, headY - 3, 4.4, 2);
        ctx.fillRect(-2.2, headY + 6, 4.4, 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(fx * 5, headY + 2, 1, 0, Math.PI * 2);
        ctx.fill();
      } else if (hunter.job === '레인저') {
        // 🏹 레인저: 환생 단계별 장궁 & 화살촉 실루엣 (1~5환생)
        const dir = hunter.facing;
        const bowReach = rebirthTier >= 4 ? 12.5 : (rebirthTier >= 2 ? 10.8 : 9);
        const traceBow = () => {
          ctx.beginPath();
          if (rebirthTier >= 4) {
            // 4~5환생: 이중 리커브 윙 보우
            ctx.moveTo(-dir * 3.5, -bladeLen * 0.9);
            ctx.bezierCurveTo(dir * (bowReach + 3), -bladeLen * 0.65, dir * (bowReach - 2), -bladeLen * 0.35, dir * (bowReach + 2), -bladeLen * 0.15);
            ctx.quadraticCurveTo(dir * bowReach, 1, -dir * 3.5, 5.5);
          } else {
            ctx.moveTo(-dir * 3, -bladeLen * 0.85);
            ctx.quadraticCurveTo(dir * bowReach, -bladeLen * 0.35, -dir * 3, 5);
          }
        };

        // 강화 · 환생 빛: 활 몸체를 따라 은은하게 번지는 빛 (+10 하늘색 · +15 금색 · 환생 오라 색)
        const bowGlowColor = hunter.weaponEnhance >= 15
          ? '#fbbf24'
          : (hunter.weaponEnhance >= 10 ? '#38bdf8' : (rWeapon ? rWeapon.glow : null));
        if (bowGlowColor) {
          const glowPulse = 0.55 + Math.sin(t * (hunter.weaponEnhance >= 15 ? 5 : 4)) * 0.2;
          ctx.save();
          ctx.globalAlpha = glowPulse;
          ctx.shadowColor = bowGlowColor;
          ctx.shadowBlur = hunter.weaponEnhance >= 15 ? 16 : 11;
          ctx.strokeStyle = bowGlowColor;
          ctx.lineWidth = (2.6 + rebirthTier * 0.25) + (hunter.weaponEnhance >= 15 ? 3.2 : 2.2);
          traceBow();
          ctx.stroke();
          ctx.restore();
        }

        ctx.strokeStyle = weaponTier >= 3 || rebirthTier > 0 ? trimColor : '#92400e';
        ctx.lineWidth = 2.6 + rebirthTier * 0.25;
        traceBow();
        ctx.stroke();

        // 활시위
        ctx.strokeStyle = rebirthTier >= 3 ? trimColor : '#e2e8f0';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-dir * 3, -bladeLen * 0.85);
        ctx.lineTo(-dir * 3, 5);
        ctx.stroke();

        // 장전된 화살 & 단계별 화살촉
        const arrowY = -bladeLen * 0.4;
        ctx.strokeStyle = rebirthTier >= 2 ? trimColor : '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-dir * 5, arrowY);
        ctx.lineTo(dir * 11, arrowY);
        ctx.stroke();

        ctx.fillStyle = bladeColor;
        ctx.beginPath();
        if (rebirthTier >= 3) {
          // 3~5환생: 날개형 창날 화살촉
          ctx.moveTo(dir * 16.5, arrowY);
          ctx.lineTo(dir * 11.5, arrowY - 4.2);
          ctx.lineTo(dir * 13, arrowY);
          ctx.lineTo(dir * 11.5, arrowY + 4.2);
        } else {
          ctx.moveTo(dir * 14.5, arrowY);
          ctx.lineTo(dir * 10, arrowY - 2.8);
          ctx.lineTo(dir * 10, arrowY + 2.8);
        }
        ctx.closePath();
        ctx.fill();
      } else if (hunter.job === '소서러') {
        // 🔮 소서러: 환생 단계별 지팡이 헤드 장식 & 마력 오브 실루엣 (1~5환생)
        ctx.fillStyle = rebirthTier >= 3 ? '#3b0764' : '#581c87';
        ctx.fillRect(-1.5, -bladeLen + 4, 3, bladeLen + 2);
        ctx.strokeStyle = trimColor;
        ctx.lineWidth = 1.8 + rebirthTier * 0.2;
        ctx.beginPath();
        if (rebirthTier >= 4) {
          // 4~5환생: 왕관/초승달 포크 스태프 헤드
          ctx.moveTo(-7.5, -bladeLen - 4);
          ctx.quadraticCurveTo(-7.5, -bladeLen + 5, 0, -bladeLen + 5);
          ctx.quadraticCurveTo(7.5, -bladeLen + 5, 7.5, -bladeLen - 4);
        } else {
          ctx.arc(0, -bladeLen + 1, 5.5 + rebirthTier * 0.5, 0.2 * Math.PI, 0.8 * Math.PI, true);
        }
        ctx.stroke();

        // 상단 회전 마력 구슬 & 위성 구체
        const orbPulse = 3.8 + rebirthTier * 0.45 + Math.sin(t * 6) * 0.7;
        ctx.fillStyle = hunter.weaponEnhance >= 15 ? '#fde047' : (rWeapon ? trimColor : '#c084fc');
        ctx.shadowColor = rWeapon ? rWeapon.glow : '#a855f7';
        ctx.shadowBlur = 10 + rebirthTier * 2;
        ctx.beginPath();
        ctx.arc(0, -bladeLen - 1, orbPulse, 0, Math.PI * 2);
        ctx.fill();

        if (rebirthTier >= 2) {
          const satCount = Math.min(3, rebirthTier - 1);
          for (let s = 0; s < satCount; s++) {
            const sAng = t * 4.2 + (s * Math.PI * 2) / satCount;
            const sx = Math.cos(sAng) * 8.5;
            const sy = -bladeLen - 1 + Math.sin(sAng) * 4.5;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.shadowBlur = 0;
      } else {
        // 🛡️ 팔라딘 (및 기본 검사): 환생 단계별 가드 날개 & 검신 실루엣 (1~5환생)
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-1.5, 0, 3, 6);

        const guardHalfW = 5.5 + rebirthTier * 1.1;
        ctx.fillStyle = trimColor;
        ctx.beginPath();
        if (rebirthTier >= 3) {
          // 3~5환생: 위로 치솟은 날개형 크로스 가드
          ctx.moveTo(-guardHalfW, -5.5);
          ctx.lineTo(-2.5, -2);
          ctx.lineTo(2.5, -2);
          ctx.lineTo(guardHalfW, -5.5);
          ctx.lineTo(guardHalfW - 1.5, 0.5);
          ctx.lineTo(-guardHalfW + 1.5, 0.5);
        } else {
          ctx.rect(-guardHalfW, -2.2, guardHalfW * 2, 3);
        }
        ctx.closePath();
        ctx.fill();

        const bladeHalfW = 2.5 + (rebirthTier >= 4 ? 1.1 : (rebirthTier >= 2 ? 0.5 : 0));
        ctx.fillStyle = bladeColor;
        ctx.beginPath();
        ctx.moveTo(-bladeHalfW, -2);
        ctx.lineTo(-bladeHalfW * 0.85, -bladeLen + 5);
        ctx.lineTo(0, -bladeLen - (rebirthTier >= 2 ? 2.5 : 0));
        ctx.lineTo(bladeHalfW * 0.85, -bladeLen + 5);
        ctx.lineTo(bladeHalfW, -2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 결투장 관람처럼 이름표를 따로 그리는 곳에서는 몸체만 그린다
      if (hunter.hideNameTag) {
        ctx.restore();
        return;
      }

      // 5. 헌터 이름 & 무기 강화 수치 태그
      const tagText = hunter.weaponEnhance > 0
        ? `[+${hunter.weaponEnhance}] ${hunter.name}`
        : hunter.name;
      ctx.font = 'bold 10px sans-serif';
      const tw = ctx.measureText(tagText).width;

      // 환생(rebirthTier > 0) 헌터 이름표 위에 금색 별(최대 5개) 표시
      if (rebirthTier > 0) {
        const starCount = Math.min(LEVEL_REBIRTH_CONFIG.maxRebirths, rebirthTier);
        const outerR = 3.9;
        const innerR = 1.75;
        const starSpacing = 8.4;
        const starsCenterY = -52;

        ctx.save();
        const startX = -((starCount - 1) * starSpacing) / 2;
        for (let i = 0; i < starCount; i++) {
          const sx = startX + i * starSpacing;
          const sy = starsCenterY + Math.sin(t * 3.2 + i * 0.7) * 0.5;
          const starGrad = ctx.createRadialGradient(sx - 0.8, sy - 0.8, 0.3, sx, sy, outerR + 0.5);
          if (i < (hunter.transcendCount || 0)) {
            // 초월한 별은 빨간색 (js/26-transcend.js)
            starGrad.addColorStop(0, '#fca5a5');
            starGrad.addColorStop(0.55, '#dc2626');
            starGrad.addColorStop(1, '#7f1d1d');
          } else {
            starGrad.addColorStop(0, '#fef9c3');
            starGrad.addColorStop(0.65, '#facc15');
            starGrad.addColorStop(1, '#eab308');
          }

          ctx.fillStyle = starGrad;
          ctx.beginPath();
          for (let p = 0; p < 10; p++) {
            const rad = p % 2 === 0 ? outerR : innerR;
            const ang = -Math.PI / 2 + (p * Math.PI) / 5;
            const vx = sx + Math.cos(ang) * rad;
            const vy = sy + Math.sin(ang) * rad;
            if (p === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.beginPath();
      ctx.roundRect(-tw / 2 - 5, -44, tw + 10, 15, 4);
      ctx.fill();

      const weaponTierColors = {
        1: '#cbd5e1',
        2: '#86efac',
        3: '#7dd3fc',
        4: '#fca5a5',
        5: '#fde047',
        6: '#d8b4fe',
        7: '#a5b4fc',
        8: '#fef08a',
        9: '#f9a8d4',
        10: '#ffffff'
      };
      const clampedWeaponTier = Math.max(1, Math.min(MAX_EQUIP_TIER, weaponTier));
      const tierBadgeColor = weaponTierColors[clampedWeaponTier] || '#fde047';

      const rebirthNameColors = {
        1: '#6ee7b7',
        2: '#7dd3fc',
        3: '#d8b4fe',
        4: '#fdba74',
        5: '#fde047'
      };
      const defaultNameColor = rebirthTier > 0
        ? (rebirthNameColors[rebirthTier] || '#fde047')
        : '#f8fafc';

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const drawStartX = -tw / 2;

      if (hunter.weaponEnhance > 0) {
        const enhPrefix = `[+${hunter.weaponEnhance}] `;
        const enhWidth = ctx.measureText(enhPrefix).width;
        if (clampedWeaponTier >= MAX_EQUIP_TIER) {
          const rainbowGrad = ctx.createLinearGradient(drawStartX, 0, drawStartX + enhWidth, 0);
          rainbowGrad.addColorStop(0.00, '#ff4d4d');
          rainbowGrad.addColorStop(0.18, '#ff9f1c');
          rainbowGrad.addColorStop(0.36, '#ffe66d');
          rainbowGrad.addColorStop(0.54, '#4ade80');
          rainbowGrad.addColorStop(0.72, '#38bdf8');
          rainbowGrad.addColorStop(0.88, '#818cf8');
          rainbowGrad.addColorStop(1.00, '#e879f9');
          ctx.fillStyle = rainbowGrad;
        } else {
          ctx.fillStyle = tierBadgeColor;
        }
        ctx.fillText(enhPrefix, drawStartX, -36.5);
        ctx.fillStyle = defaultNameColor;
        ctx.fillText(hunter.name, drawStartX + enhWidth, -36.5);
      } else {
        ctx.fillStyle = defaultNameColor;
        ctx.fillText(hunter.name, drawStartX, -36.5);
      }

      ctx.restore();
    }

    // 천공의 성역 날개: 깃털을 층층이 겹친 천사 날개 (옆모습)
    //  - 강화 0~9: 흰색 → 하늘색 깃털
    //  - 강화 10~14: 깃털 끝이 금빛
    //  - 강화 15: 금빛 깃털 + 은은한 빛
    function drawHunterFeatherWings(ctx, hunter, t) {
      const facing = hunter.facing || 1;
      const back = -facing; // 날개는 몸 뒤쪽으로 펼쳐짐
      const wEnh = Math.max(0, hunter.wingEnhance || 0);
      const flap = Math.sin(t * 3.2 + (hunter.x || 0) * 0.04) * 0.1;
      const grow = 1 + Math.min(0.22, wEnh * 0.015);

      const palette = wEnh >= 15
        ? { base: '#fffbeb', mid: '#fde68a', tip: '#f59e0b', line: '#b45309', glow: 'rgba(253, 224, 71, 0.75)' }
        : wEnh >= 10
          ? { base: '#ffffff', mid: '#e0f2fe', tip: '#fbbf24', line: '#0369a1', glow: 'rgba(250, 204, 21, 0.35)' }
          : { base: '#ffffff', mid: '#e0f2fe', tip: '#7dd3fc', line: '#0c4a6e', glow: null };

      // 깃털 한 장: (0,0)에서 시작해 길이 len, 각도 ang 방향으로 뻗는 둥근 깃털
      const feather = (ang, len, wid) => {
        ctx.save();
        ctx.rotate(ang);
        const g = ctx.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, palette.base);
        g.addColorStop(0.6, palette.mid);
        g.addColorStop(1, palette.tip);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -wid * 0.35);
        ctx.quadraticCurveTo(len * 0.55, -wid, len, 0);
        ctx.quadraticCurveTo(len * 0.55, wid, 0, wid * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };

      // 날개 한 장: 아래쪽 긴 깃털부터 위쪽·안쪽 짧은 깃털 순으로 겹쳐 그림
      const wing = (isFar) => {
        ctx.save();
        ctx.translate(back * (isFar ? 1.5 : 4.5), isFar ? -15.5 : -13);
        ctx.scale(back * grow * (isFar ? 0.82 : 1), grow * (isFar ? 0.82 : 1));
        ctx.rotate(-0.35 - flap * (isFar ? 0.7 : 1)); // 위쪽으로 들어 올린 각도 + 펄럭임
        if (isFar) ctx.globalAlpha *= 0.78;
        ctx.strokeStyle = palette.line;
        ctx.lineWidth = 0.7;
        ctx.lineJoin = 'round';
        if (palette.glow) {
          ctx.shadowColor = palette.glow;
          ctx.shadowBlur = wEnh >= 15 ? 9 : 5;
        }
        // 긴 바깥 깃털 (5장, 위→아래로 부채꼴)
        const primaries = [
          { a: -0.55, l: 22, w: 3.6 },
          { a: -0.25, l: 21, w: 3.6 },
          { a: 0.05, l: 19, w: 3.4 },
          { a: 0.33, l: 16.5, w: 3.2 },
          { a: 0.6, l: 13.5, w: 3 }
        ];
        primaries.forEach(p => feather(p.a, p.l, p.w));
        ctx.shadowBlur = 0;
        // 짧은 안쪽 깃털 (덮깃 3장)
        [
          { a: -0.45, l: 12, w: 3.4 },
          { a: -0.1, l: 11, w: 3.2 },
          { a: 0.25, l: 9.5, w: 3 }
        ].forEach(p => feather(p.a, p.l, p.w));
        // 날개 뿌리 (어깨 쪽 둥근 깃)
        ctx.fillStyle = palette.base;
        ctx.beginPath();
        ctx.ellipse(1.5, -1.5, 4.2, 3.2, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };

      ctx.save();
      wing(true);   // 뒤쪽 날개
      wing(false);  // 앞쪽 날개
      ctx.restore();
    }
