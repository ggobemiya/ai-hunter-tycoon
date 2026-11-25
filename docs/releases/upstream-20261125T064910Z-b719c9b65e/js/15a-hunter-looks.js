// [15a-hunter-looks] 렌더링: 헌터 직업별 몸체 외형 (파츠 라이브러리 + 직업·환생 단계 외형 표)
    // 1단계: 기본 4직업 외형 + 1~4환생 강화 외형 16종 (5환생은 임시로 4환생 외형 사용)
    // 2단계 확장 지점: HUNTER_LOOK_OVERRIDES[5차 전직 이름] = makeHunterLook(...) 로 직업별 전용 외형 추가

    // ───────── 외형 표 생성 도우미 ─────────
    // parts: { head, torso, shoulders, cape, capeLen, capeStyle, emblem, extras[] }
    function makeHunterLook(stage, pal, parts) {
      return Object.assign({ stage, pal, extras: [] }, parts);
    }

    // ───────── 직업 × 환생 단계(0~4) 외형 표 ─────────
    const HUNTER_LOOK_TABLE = {
      // 버서커: 무쇠 중갑 + 뿔 투구 → 단계마다 뿔이 커지고 모피·붉은 띠·찢긴 망토·황금 장식
      '버서커': [
        makeHunterLook(0,
          { body: '#57534e', plate: '#78716c', trim: '#44403c', accent: '#b91c1c', helm: '#57534e', horn: '#e7e5e4', legs: '#292524', boots: '#1c1917', belt: '#292524', fur: '#78350f' },
          { head: 'hornedHelm', torso: 'plate', shoulders: 'spiked' }),
        makeHunterLook(1,
          { body: '#44403c', plate: '#78716c', trim: '#991b1b', accent: '#dc2626', helm: '#44403c', horn: '#f5f5f4', legs: '#292524', boots: '#1c1917', belt: '#1c1917', fur: '#92400e', emblem: '#f5f5f4' },
          { head: 'hornedHelm', torso: 'plate', shoulders: 'spiked', emblem: 'fang', extras: ['furCollar', 'sash'] }),
        makeHunterLook(2,
          { body: '#3f3f46', plate: '#71717a', trim: '#b91c1c', accent: '#dc2626', helm: '#3f3f46', horn: '#fafaf9', legs: '#27272a', boots: '#18181b', belt: '#18181b', fur: '#a16207', emblem: '#ef4444' },
          { head: 'hornedHelm', torso: 'plate', shoulders: 'spiked', emblem: 'fang', extras: ['furCollar', 'sash'] }),
        makeHunterLook(3,
          { body: '#27272a', plate: '#7f1d1d', trim: '#f59e0b', accent: '#dc2626', helm: '#27272a', horn: '#fde68a', legs: '#18181b', boots: '#0c0a09', belt: '#0c0a09', fur: '#b45309', emblem: '#fbbf24', cape: '#7f1d1d', capeTrim: '#f59e0b' },
          { head: 'hornedHelm', torso: 'plate', shoulders: 'spiked', cape: true, capeStyle: 'tattered', capeLen: 1, emblem: 'fang', extras: ['furCollar', 'sash'] }),
        makeHunterLook(4,
          { body: '#1c1917', plate: '#991b1b', trim: '#fbbf24', accent: '#f97316', helm: '#1c1917', horn: '#fbbf24', hornTip: '#f97316', legs: '#0c0a09', boots: '#0c0a09', belt: '#450a0a', fur: '#c2410c', emblem: '#fde047', cape: '#450a0a', capeTrim: '#f97316' },
          { head: 'hornedHelm', torso: 'plate', shoulders: 'spiked', cape: true, capeStyle: 'tattered', capeLen: 3, emblem: 'fang', extras: ['furCollar', 'sash', 'embers'] })
      ],
      // 팔라딘: 은빛 판금 + 망토 → 성기사 튜닉·깃털 장식·황금 테두리·날개 투구와 후광
      '팔라딘': [
        makeHunterLook(0,
          { body: '#cbd5e1', plate: '#e2e8f0', trim: '#64748b', helm: '#cbd5e1', legs: '#475569', boots: '#334155', belt: '#334155', cape: '#1d4ed8', capeTrim: '#1e3a8a' },
          { head: 'greatHelm', torso: 'plate', shoulders: 'round', cape: true, capeLen: 0 }),
        makeHunterLook(1,
          { body: '#cbd5e1', plate: '#e2e8f0', trim: '#3b82f6', helm: '#cbd5e1', legs: '#475569', boots: '#334155', belt: '#334155', cape: '#1d4ed8', capeTrim: '#93c5fd', tabard: '#f8fafc', emblem: '#2563eb' },
          { head: 'greatHelm', torso: 'plate', shoulders: 'round', cape: true, capeLen: 1, emblem: 'cross', extras: ['tabard'] }),
        makeHunterLook(2,
          { body: '#e2e8f0', plate: '#f1f5f9', trim: '#3b82f6', helm: '#e2e8f0', legs: '#475569', boots: '#1e3a8a', belt: '#1e3a8a', cape: '#1e40af', capeTrim: '#bfdbfe', tabard: '#f8fafc', emblem: '#2563eb', plume: '#2563eb' },
          { head: 'greatHelm', torso: 'plate', shoulders: 'round', cape: true, capeLen: 2, emblem: 'cross', extras: ['tabard'] }),
        makeHunterLook(3,
          { body: '#f1f5f9', plate: '#ffffff', trim: '#facc15', helm: '#f1f5f9', legs: '#64748b', boots: '#a16207', belt: '#a16207', cape: '#f8fafc', capeTrim: '#facc15', tabard: '#ffffff', emblem: '#eab308', plume: '#f8fafc' },
          { head: 'greatHelm', torso: 'plate', shoulders: 'round', cape: true, capeLen: 3, emblem: 'cross', extras: ['tabard'] }),
        makeHunterLook(4,
          { body: '#fef9c3', plate: '#ffffff', trim: '#eab308', helm: '#fef3c7', legs: '#a16207', boots: '#854d0e', belt: '#854d0e', cape: '#ffffff', capeTrim: '#eab308', tabard: '#fffbeb', emblem: '#f59e0b', plume: '#fde047', wing: '#ffffff', halo: '#fde047' },
          { head: 'greatHelm', torso: 'plate', shoulders: 'round', cape: true, capeLen: 4, emblem: 'cross', extras: ['tabard', 'halo'] })
      ],
      // 레인저: 정찰병 — 붉은 깃털 모자 + 짧은 어깨 망토 + 허리 주머니 + 화살통
      //   → 잎 걸쇠 · 등 망토와 두 번째 깃털 · 은빛 장식 · 에메랄드/황금 잎사귀 관
      '레인저': [
        makeHunterLook(0,
          { body: '#65a30d', plate: '#4d7c0f', trim: '#a16207', cap: '#15803d', capBand: '#92400e', feather: '#dc2626', capelet: '#a16207', capeletTrim: '#fde68a', legs: '#78350f', boots: '#451a03', belt: '#451a03', quiver: '#92400e', fletch: '#f8fafc', bracer: '#78350f', pouch: '#92400e' },
          { head: 'featherCap', torso: 'leather', shoulders: 'none', extras: ['quiver', 'capelet', 'pouches', 'bracer'] }),
        makeHunterLook(1,
          { body: '#4d7c0f', plate: '#3f6212', trim: '#a16207', cap: '#15803d', capBand: '#78350f', feather: '#ef4444', capelet: '#92400e', capeletTrim: '#fde68a', legs: '#78350f', boots: '#451a03', belt: '#451a03', quiver: '#78350f', fletch: '#86efac', bracer: '#78350f', pouch: '#78350f', emblem: '#86efac' },
          { head: 'featherCap', torso: 'leather', shoulders: 'none', emblem: 'leaf', extras: ['quiver', 'capelet', 'pouches', 'bracer'] }),
        makeHunterLook(2,
          { body: '#3f6212', plate: '#365314', trim: '#a16207', cap: '#166534', capBand: '#713f12', feather: '#ef4444', feather2: '#fbbf24', capelet: '#78350f', capeletTrim: '#bef264', legs: '#57534e', boots: '#422006', belt: '#422006', quiver: '#713f12', fletch: '#bef264', bracer: '#713f12', pouch: '#713f12', emblem: '#bef264', cape: '#166534', capeTrim: '#a3e635' },
          { head: 'featherCap', torso: 'leather', shoulders: 'none', cape: true, capeLen: 1, emblem: 'leaf', extras: ['quiver', 'capelet', 'pouches', 'bracer'] }),
        makeHunterLook(3,
          { body: '#365314', plate: '#1a2e05', trim: '#cbd5e1', cap: '#14532d', capBand: '#cbd5e1', feather: '#f8fafc', feather2: '#7dd3fc', capelet: '#14532d', capeletTrim: '#e2e8f0', legs: '#334155', boots: '#1e293b', belt: '#1c1917', quiver: '#422006', fletch: '#7dd3fc', bracer: '#334155', pouch: '#422006', emblem: '#e2e8f0', cape: '#14532d', capeTrim: '#e2e8f0' },
          { head: 'featherCap', torso: 'leather', shoulders: 'none', cape: true, capeLen: 3, emblem: 'leaf', extras: ['quiver', 'capelet', 'pouches', 'bracer'] }),
        makeHunterLook(4,
          { body: '#047857', plate: '#064e3b', trim: '#facc15', cap: '#064e3b', capBand: '#facc15', feather: '#fde047', feather2: '#f97316', crown: '#facc15', capelet: '#065f46', capeletTrim: '#facc15', legs: '#1e293b', boots: '#422006', belt: '#422006', quiver: '#064e3b', fletch: '#fde047', bracer: '#065f46', pouch: '#422006', emblem: '#fde047', cape: '#064e3b', capeTrim: '#facc15' },
          { head: 'featherCap', torso: 'leather', shoulders: 'none', cape: true, capeLen: 4, emblem: 'leaf', extras: ['quiver', 'capelet', 'pouches', 'bracer', 'leaves'] })
      ],
      // 소서러: 대마법사 — 높은 깃 + 별 모자 + 이중 띠 + 달 문양 + 떠다니는 마법서 (남자 흰 수염)
      //   → 짧은 망토 · 남색 로브와 회전 룬 · 자정빛 로브와 황금 장식 · 우주빛 로브와 별가루
      '소서러': [
        makeHunterLook(0,
          { body: '#6d28d9', plate: '#4c1d95', trim: '#fde047', hat: '#5b21b6', band: '#fde047', gem: '#38bdf8', star: '#fef08a', collar: '#312e81', legs: '#1e1b4b', boots: '#1e1b4b', belt: '#be185d', sashA: '#be185d', sashB: '#fde047', emblem: '#fde047', beard: '#e5e7eb', book: '#7f1d1d' },
          { head: 'wizardHat', torso: 'robe', shoulders: 'highCollar', emblem: 'moon', beard: true, extras: ['layerSash', 'robeStars', 'grimoire'] }),
        makeHunterLook(1,
          { body: '#5b21b6', plate: '#3b0764', trim: '#fde047', hat: '#4c1d95', band: '#fde047', gem: '#22d3ee', star: '#fef08a', collar: '#3b0764', legs: '#1e1b4b', boots: '#1e1b4b', belt: '#be185d', sashA: '#be185d', sashB: '#fde047', emblem: '#fde047', beard: '#f1f5f9', book: '#1e3a8a', cape: '#3b0764', capeTrim: '#fde047' },
          { head: 'wizardHat', torso: 'robe', shoulders: 'highCollar', cape: true, capeLen: 0, emblem: 'moon', beard: true, extras: ['layerSash', 'robeStars', 'grimoire'] }),
        makeHunterLook(2,
          { body: '#4338ca', plate: '#312e81', trim: '#fde68a', hat: '#3730a3', band: '#fde68a', gem: '#22d3ee', star: '#fef08a', collar: '#1e1b4b', legs: '#1e1b4b', boots: '#1e1b4b', belt: '#0891b2', sashA: '#0891b2', sashB: '#fde68a', emblem: '#fde68a', beard: '#f8fafc', book: '#0e7490', cape: '#1e1b4b', capeTrim: '#67e8f9', rune: '#67e8f9' },
          { head: 'wizardHat', torso: 'robe', shoulders: 'highCollar', cape: true, capeLen: 2, emblem: 'moon', beard: true, extras: ['layerSash', 'robeStars', 'grimoire', 'runes'] }),
        makeHunterLook(3,
          { body: '#312e81', plate: '#1e1b4b', trim: '#facc15', hat: '#1e1b4b', band: '#facc15', gem: '#f0abfc', star: '#fef08a', collar: '#0f172a', legs: '#0f172a', boots: '#0f172a', belt: '#a21caf', sashA: '#a21caf', sashB: '#facc15', emblem: '#facc15', beard: '#ffffff', book: '#581c87', cape: '#0f172a', capeTrim: '#facc15', rune: '#e879f9' },
          { head: 'wizardHat', torso: 'robe', shoulders: 'highCollar', cape: true, capeLen: 3, emblem: 'moon', beard: true, extras: ['layerSash', 'robeStars', 'grimoire', 'runes'] }),
        makeHunterLook(4,
          { body: '#1e1b4b', plate: '#0f172a', trim: '#fbbf24', hat: '#0f172a', band: '#fbbf24', gem: '#f472b6', star: '#fef08a', collar: '#020617', legs: '#0f172a', boots: '#0f172a', belt: '#db2777', sashA: '#db2777', sashB: '#fbbf24', emblem: '#fde047', beard: '#ffffff', book: '#b45309', cape: '#020617', capeTrim: '#f0abfc', rune: '#f0abfc', hornTip: '#fde047' },
          { head: 'wizardHat', torso: 'robe', shoulders: 'highCollar', cape: true, capeLen: 4, emblem: 'moon', beard: true, extras: ['layerSash', 'robeStars', 'grimoire', 'runes', 'embers'] })
      ]
    };

    // 2단계(5차 전직 128종) 전용 외형 표: { '5차 전직 이름': makeHunterLook(5, pal, parts) }
    const HUNTER_LOOK_OVERRIDES = {};

    // 장비 티어 표시용 작은 포인트 색 (벨트 버클 = 갑옷 티어, 투구 보석 = 투구 티어)
    const HUNTER_ARMOR_TIER_GEM = { 1: '#92400e', 2: '#94a3b8', 3: '#93c5fd', 4: '#f59e0b', 5: '#fde047', 6: '#c084fc', 7: '#52525b', 8: '#fef08a', 9: '#e879f9', 10: '#ffffff' };
    const HUNTER_HELM_TIER_GEM = { 1: '#78350f', 2: '#94a3b8', 3: '#38bdf8', 4: '#dc2626', 5: '#facc15', 6: '#9333ea', 7: '#27272a', 8: '#fef08a', 9: '#e879f9', 10: '#ffffff' };

    function getHunterLook(hunter) {
      if ((hunter.rebirthCount || 0) >= 5 && HUNTER_LOOK_OVERRIDES[hunter.currentJobName]) {
        return HUNTER_LOOK_OVERRIDES[hunter.currentJobName];
      }
      const rows = HUNTER_LOOK_TABLE[hunter.baseJob || hunter.job] || HUNTER_LOOK_TABLE['버서커'];
      const stage = Math.max(0, Math.min(rows.length - 1, hunter.rebirthCount || 0));
      return rows[stage];
    }

    // ───────── 파츠: 등 뒤 ─────────
    function hlDrawCape(ctx, f, L, t) {
      if (L.capeStyle === 'cloak') return hlDrawCloak(ctx, f, L, t);
      const P = L.pal;
      const len = L.capeLen || 0;
      const hemY = 13 + len;
      const backX = -f * (14.5 + len * 0.9) + Math.sin(t * 2) * 1.1;
      const frontX = f * 5;
      ctx.fillStyle = P.cape;
      ctx.strokeStyle = P.capeTrim || '#0f172a';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-6.5, -3.5);
      ctx.lineTo(backX, hemY);
      if (L.capeStyle === 'tattered') {
        const steps = 4;
        for (let i = 1; i <= steps; i++) {
          const x = backX + (frontX - backX) * (i / steps);
          const midX = backX + (frontX - backX) * ((i - 0.5) / steps);
          ctx.lineTo(midX, hemY - 3);
          ctx.lineTo(x, hemY);
        }
      } else {
        ctx.lineTo(frontX, hemY);
      }
      ctx.lineTo(6.5, -3.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    function hlDrawQuiver(ctx, f, L) {
      const P = L.pal;
      ctx.save();
      ctx.translate(-f * 6.5, -1);
      ctx.rotate(-f * 0.42);
      // 화살 깃
      ctx.fillStyle = P.fletch;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 1.8 - 1, -9);
        ctx.lineTo(i * 1.8, -13 - Math.abs(i));
        ctx.lineTo(i * 1.8 + 1, -9);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = P.quiver;
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-3, -9, 6, 15, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = P.trim;
      ctx.fillRect(-3, -7.5, 6, 1.4);
      ctx.restore();
    }

    // ───────── 파츠: 몸통 ─────────
    function hlDrawTorso(ctx, f, L, isF, outline, outlineW, buckle) {
      const P = L.pal;
      ctx.strokeStyle = outline;
      ctx.lineWidth = outlineW;

      if (L.torso === 'robe') {
        const top = isF ? 7.5 : 8.5;
        ctx.fillStyle = P.body;
        ctx.beginPath();
        ctx.moveTo(-top, -4.5);
        ctx.lineTo(top, -4.5);
        ctx.lineTo(11, 15.5);
        ctx.lineTo(-11, 15.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 앞 자락
        ctx.fillStyle = P.plate;
        ctx.beginPath();
        ctx.moveTo(-2.4, -3.5);
        ctx.lineTo(2.4, -3.5);
        ctx.lineTo(3.8, 15);
        ctx.lineTo(-3.8, 15);
        ctx.closePath();
        ctx.fill();
        // 밑단 테두리
        ctx.fillStyle = P.trim;
        ctx.fillRect(-10.7, 13.6, 21.4, 1.7);
        if (L.stage >= 1) {
          ctx.fillRect(-0.6, -3.5, 1.2, 17);
        }
        // 허리 띠
        ctx.fillStyle = P.belt;
        ctx.fillRect(-top - 0.4, 4.6, top * 2 + 0.8, 2.3);
        ctx.fillStyle = buckle;
        ctx.fillRect(-1.8, 4.2, 3.6, 3.1);
        if (L.extras.includes('robeStars')) {
          ctx.fillStyle = P.star;
          [[-7, 10], [6.5, 11.5], [-5, 1], [5.5, 0], [-8.5, 13], [8, 7.5]].forEach(([x, y]) => {
            ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
          });
        }
        return;
      }

      const leather = L.torso === 'leather';
      if (isF) {
        ctx.fillStyle = P.body;
        ctx.beginPath();
        ctx.roundRect(-7.5, -4, 15, 11, 4);
        ctx.fill();
        ctx.stroke();
        // 스커트 / 가죽 허리 자락
        ctx.fillStyle = P.plate;
        ctx.beginPath();
        ctx.moveTo(-7.5, 6);
        ctx.lineTo(7.5, 6);
        ctx.lineTo(leather ? 9 : 10.5, 13.5);
        ctx.lineTo(leather ? -9 : -10.5, 13.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (!leather) {
          ctx.fillStyle = P.plate;
          ctx.fillRect(-4.2, -2, 8.4, 5.5);
          if (L.stage >= 1) {
            ctx.strokeStyle = P.trim;
            ctx.lineWidth = 1;
            ctx.strokeRect(-4.2, -2, 8.4, 5.5);
          }
        } else {
          ctx.fillStyle = P.plate;
          ctx.fillRect(-2.5, -3, 5, 8);
          ctx.strokeStyle = P.trim;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(-6, -3);
          ctx.lineTo(5.5, 5.5);
          ctx.stroke();
        }
        ctx.fillStyle = P.belt;
        ctx.fillRect(-7.5, 5.5, 15, 2.2);
        ctx.fillStyle = buckle;
        ctx.fillRect(-2, 5, 4, 3.2);
        return;
      }

      // 남성: 각진 상체
      ctx.fillStyle = P.body;
      ctx.beginPath();
      ctx.roundRect(leather ? -9 : -9.5, -4.5, leather ? 18 : 19, 16.5, 4);
      ctx.fill();
      ctx.stroke();
      if (!leather) {
        ctx.fillStyle = P.plate;
        ctx.fillRect(-6, -2.5, 12, 7.5);
        if (L.stage >= 1) {
          ctx.strokeStyle = P.trim;
          ctx.lineWidth = 1.1;
          ctx.strokeRect(-6, -2.5, 12, 7.5);
        }
        // 허벅지 판금
        ctx.fillStyle = P.plate;
        ctx.fillRect(-8.5, 9.8, 6.5, 2.2);
        ctx.fillRect(2, 9.8, 6.5, 2.2);
      } else {
        ctx.fillStyle = P.plate;
        ctx.fillRect(-3, -3.5, 6, 10);
        ctx.strokeStyle = P.trim;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-7.5, -3.5);
        ctx.lineTo(6.5, 7);
        ctx.stroke();
      }
      ctx.fillStyle = P.belt;
      ctx.fillRect(-9, 7, 18, 2.8);
      ctx.fillStyle = buckle;
      ctx.fillRect(-2.5, 6.5, 5, 3.8);
      if (leather) {
        ctx.fillStyle = P.plate;
        ctx.fillRect(f * 4.5 - 1.7, 8.5, 3.5, 3.5);
      }
    }

    function hlDrawTorsoExtras(ctx, f, L, isF) {
      hlDrawMoreTorsoExtras(ctx, f, L, isF);
      const P = L.pal;
      const ex = L.extras;
      const w = isF ? 7.5 : 9;
      if (ex.includes('tabard')) {
        ctx.fillStyle = P.tabard;
        ctx.strokeStyle = P.trim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-3.8, -3);
        ctx.lineTo(3.8, -3);
        ctx.lineTo(3.8, isF ? 12 : 13);
        ctx.lineTo(0, isF ? 14 : 15);
        ctx.lineTo(-3.8, isF ? 12 : 13);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      if (ex.includes('sash')) {
        ctx.fillStyle = P.accent;
        ctx.beginPath();
        ctx.moveTo(-w + 0.5, -3.5);
        ctx.lineTo(-w + 3.5, -4.2);
        ctx.lineTo(w - 0.5, 6);
        ctx.lineTo(w - 0.5, 8.5);
        ctx.closePath();
        ctx.fill();
      }
      if (ex.includes('furCollar')) {
        ctx.fillStyle = P.fur;
        const n = 5;
        for (let i = 0; i < n; i++) {
          const x = -w + (i * (w * 2)) / (n - 1);
          ctx.beginPath();
          ctx.arc(x, -4.2, 2.6 + (L.stage >= 3 ? 0.4 : 0), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (ex.includes('scarf')) {
        ctx.fillStyle = P.scarf;
        ctx.beginPath();
        ctx.roundRect(-6, -5.2, 12, 2.8, 1.2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-f * 3, -4);
        ctx.lineTo(-f * 9, 2);
        ctx.lineTo(-f * 6.5, 3);
        ctx.lineTo(-f * 1, -3);
        ctx.closePath();
        ctx.fill();
      }
    }

    function hlDrawShoulders(ctx, L, isF) {
      const P = L.pal;
      const s = L.stage;
      const off = isF ? 8.5 : 10.5;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;

      if (L.shoulders === 'spiked') {
        const r = 3.8 + s * 0.35;
        [-1, 1].forEach((side) => {
          ctx.fillStyle = P.plate;
          ctx.beginPath();
          ctx.arc(side * off, -2, r, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          if (s >= 2) {
            ctx.fillStyle = P.horn;
            const spikes = s >= 4 ? [-0.35, 0.35] : [0];
            spikes.forEach((a) => {
              const bx = side * off + a * r * 1.6;
              ctx.beginPath();
              ctx.moveTo(bx - 1.3, -2 - r * 0.7);
              ctx.lineTo(bx + side * 1.2, -2 - r - 3.2);
              ctx.lineTo(bx + 1.3, -2 - r * 0.7);
              ctx.closePath();
              ctx.fill();
            });
          }
        });
      } else if (L.shoulders === 'round') {
        const r = 4 + s * 0.3;
        [-1, 1].forEach((side) => {
          ctx.fillStyle = P.plate;
          ctx.strokeStyle = s >= 3 ? P.trim : '#0f172a';
          ctx.lineWidth = s >= 3 ? 1.5 : 1.2;
          ctx.beginPath();
          ctx.ellipse(side * off, -2.2, r + 0.8, r, 0, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          if (s >= 2) {
            ctx.fillStyle = P.trim;
            ctx.fillRect(side * off - r - 0.6, -2.6, (r + 0.6) * 2, 1.1);
          }
        });
      } else if (L.shoulders === 'pads') {
        if (s < 2) return;
        [-1, 1].forEach((side) => {
          ctx.fillStyle = P.plate;
          ctx.strokeStyle = s >= 3 ? P.trim : '#1c1917';
          ctx.beginPath();
          ctx.ellipse(side * (off - 0.5), -2.5, 3.6, 2.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      } else if (L.shoulders === 'mantle') {
        if (s < 3) return;
        // 높은 깃 망토 칼라
        ctx.fillStyle = P.cape || P.body;
        ctx.strokeStyle = P.trim;
        ctx.lineWidth = 1.2;
        [-1, 1].forEach((side) => {
          ctx.beginPath();
          ctx.moveTo(side * 2.5, -4.5);
          ctx.lineTo(side * (off + 1.5), -3.5);
          ctx.lineTo(side * (off - 1), -8.5 - (s >= 4 ? 2 : 0));
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      }
    }

    function hlDrawEmblem(ctx, L) {
      if (!L.emblem) return;
      const P = L.pal;
      const cy = 0.8;
      ctx.fillStyle = P.emblem;
      ctx.beginPath();
      if (L.emblem === 'moon') {
        ctx.arc(0, cy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = L.pal.plate;
        ctx.beginPath();
        ctx.arc(1.4, cy - 0.8, 2.6, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      if (L.emblem === 'cross') {
        ctx.fillRect(-0.9, cy - 3.2, 1.8, 6.4);
        ctx.fillRect(-2.6, cy - 1.6, 5.2, 1.7);
        return;
      }
      if (L.emblem === 'fang') {
        ctx.moveTo(-3, cy - 2);
        ctx.lineTo(-1.2, cy + 2.8);
        ctx.lineTo(-0.2, cy - 2);
        ctx.moveTo(0.2, cy - 2);
        ctx.lineTo(1.2, cy + 2.8);
        ctx.lineTo(3, cy - 2);
      } else if (L.emblem === 'leaf') {
        ctx.ellipse(0, cy, 1.5, 3, 0.6, 0, Math.PI * 2);
      } else if (L.emblem === 'star') {
        hlStarPath(ctx, 0, cy, 3, 1.3);
      }
      ctx.fill();
    }

    function hlStarPath(ctx, x, y, outerR, innerR) {
      for (let p = 0; p < 10; p++) {
        const rad = p % 2 === 0 ? outerR : innerR;
        const ang = -Math.PI / 2 + (p * Math.PI) / 5;
        const vx = x + Math.cos(ang) * rad;
        const vy = y + Math.sin(ang) * rad;
        if (p === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
    }

    // ───────── 파츠: 머리 장비 ─────────
    // 두건 뒤판은 얼굴보다 먼저 그림
    function hlDrawHeadBack(ctx, f, L) {
      hlDrawMoreHeadBack(ctx, f, L);
      if (L.head !== 'hood') return;
      const P = L.pal;
      ctx.fillStyle = P.hood;
      ctx.beginPath();
      ctx.arc(0, -10.5, 8.6, 0, Math.PI * 2);
      ctx.fill();
      // 뒤로 늘어진 두건 끝
      ctx.beginPath();
      ctx.moveTo(-f * 5, -16);
      ctx.lineTo(-f * (12 + L.stage * 0.6), -7);
      ctx.lineTo(-f * 5, -4);
      ctx.closePath();
      ctx.fill();
    }

    function hlDrawHeadgear(ctx, f, L, t, helmGem, helmOutline) {
      if (hlDrawMoreHeadgear(ctx, f, L, t, helmGem, helmOutline)) return;
      const P = L.pal;
      const s = L.stage;

      if (L.head === 'hornedHelm') {
        const hornLen = 3.5 + s * 1.7;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        [-1, 1].forEach((side) => {
          const tipX = side * (9 + hornLen * 0.55);
          const tipY = -(15 + hornLen);
          ctx.fillStyle = P.horn;
          ctx.beginPath();
          ctx.moveTo(side * 3.5, -16.8);
          ctx.quadraticCurveTo(side * (8 + hornLen * 0.7), -16.5, tipX, tipY);
          ctx.quadraticCurveTo(side * (10.5 + hornLen * 0.3), -13.5, side * 7, -12.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          if (P.hornTip) {
            ctx.fillStyle = P.hornTip;
            ctx.globalAlpha = 0.65 + Math.sin(t * 6 + side) * 0.3;
            ctx.beginPath();
            ctx.arc(tipX, tipY, 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        });
        if (s >= 4) {
          ctx.fillStyle = P.horn;
          ctx.beginPath();
          ctx.moveTo(-2, -18.6);
          ctx.lineTo(0, -25);
          ctx.lineTo(2, -18.6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.fillStyle = P.helm;
        ctx.strokeStyle = helmOutline;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(0, -12, 7.4, Math.PI * 1.02, -0.02 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = P.trim;
        ctx.fillRect(-7.4, -13.6, 14.8, 1.8);
        // 코 보호대
        ctx.fillStyle = P.plate;
        ctx.fillRect(f * 5 - 0.8, -13, 1.6, 5);
        ctx.fillStyle = helmGem;
        ctx.beginPath();
        ctx.arc(-f * 2, -16, 1.2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      if (L.head === 'greatHelm') {
        // 깃털 장식 (뒤쪽으로 휘날림)
        if (P.plume) {
          ctx.fillStyle = P.plume;
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(0.5, -19);
          ctx.quadraticCurveTo(-f * 6, -24 - s * 0.4 + Math.sin(t * 3) * 0.6, -f * (10 + s * 0.6), -16);
          ctx.quadraticCurveTo(-f * 5, -18.5, -f * 1, -17.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        if (P.wing) {
          ctx.fillStyle = P.wing;
          ctx.strokeStyle = P.trim;
          ctx.lineWidth = 0.9;
          [-1, 1].forEach((side) => {
            ctx.beginPath();
            ctx.moveTo(side * 6.5, -13);
            ctx.quadraticCurveTo(side * 10, -17, side * 12.5, -23);
            ctx.quadraticCurveTo(side * 11, -16, side * 7.5, -11);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          });
        }
        ctx.fillStyle = P.helm;
        ctx.strokeStyle = helmOutline;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(0, -12, 7.6, Math.PI * 1.02, -0.02 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 볼 보호대
        ctx.fillRect(-7.6, -12.2, 2.4, 6.2);
        ctx.fillRect(5.2, -12.2, 2.4, 6.2);
        ctx.strokeRect(-7.6, -12.2, 2.4, 6.2);
        ctx.strokeRect(5.2, -12.2, 2.4, 6.2);
        // 투구 능선 & 이마 띠
        ctx.fillStyle = P.trim;
        ctx.fillRect(-0.7, -19.4, 1.4, 6.5);
        ctx.fillRect(-7.4, -13.4, 14.8, 1.6);
        if (s >= 3) {
          ctx.beginPath();
          [-4.5, 0, 4.5].forEach((x) => {
            ctx.moveTo(x - 1.4, -16.8);
            ctx.lineTo(x, -20.2 - (x === 0 ? 1 : 0));
            ctx.lineTo(x + 1.4, -16.8);
          });
          ctx.fill();
        }
        ctx.fillStyle = helmGem;
        ctx.beginPath();
        ctx.arc(0, -12.6, 1.2, 0, Math.PI * 2);
        ctx.fill();
        if (L.extras.includes('halo')) {
          ctx.strokeStyle = P.halo;
          ctx.lineWidth = 1.6;
          ctx.globalAlpha = 0.75 + Math.sin(t * 2.5) * 0.2;
          ctx.beginPath();
          ctx.ellipse(0, -25.5 + Math.sin(t * 2) * 0.6, 6.5, 1.9, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        return;
      }

      if (L.head === 'hood') {
        // 이마를 덮는 두건 앞판
        ctx.fillStyle = P.hood;
        ctx.strokeStyle = P.hoodRim;
        ctx.lineWidth = s >= 3 ? 1.5 : 1.2;
        ctx.beginPath();
        ctx.arc(0, -12.3, 7.9, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = helmGem;
        ctx.beginPath();
        ctx.arc(f * 1.5, -14.5, 1.1, 0, Math.PI * 2);
        ctx.fill();
        if (P.feather) {
          ctx.save();
          ctx.translate(-f * 5.5, -16.5);
          ctx.rotate(-f * 0.75);
          ctx.fillStyle = P.feather;
          ctx.beginPath();
          ctx.ellipse(0, -4, 1.6, 4.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = P.hoodRim;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(0, 1);
          ctx.lineTo(0, -8.5);
          ctx.stroke();
          ctx.restore();
        }
        if (P.crown) {
          ctx.fillStyle = P.crown;
          [[-4.6, -17.2, -0.6], [0, -19.2, 0], [4.6, -17.2, 0.6]].forEach(([x, y, r]) => {
            ctx.beginPath();
            ctx.ellipse(x, y, 1.5, 3.1, r, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        return;
      }

      if (L.head === 'wizardHat') {
        const h = 9 + s * 1.3;
        const tipX = -f * (3 + s * 0.6) + Math.sin(t * 1.8) * 0.5;
        const tipY = -16 - h;
        ctx.fillStyle = P.hat;
        ctx.strokeStyle = helmOutline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-6.3, -15.5);
        ctx.quadraticCurveTo(-1.5, -16 - h * 0.5, tipX, tipY);
        ctx.quadraticCurveTo(2.5, -16 - h * 0.45, 6.3, -15.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 챙
        ctx.beginPath();
        ctx.ellipse(0, -15.3, 10 + s * 0.4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 모자 띠
        ctx.fillStyle = P.band;
        ctx.beginPath();
        ctx.moveTo(-5.8, -16.4);
        ctx.lineTo(5.8, -16.4);
        ctx.lineTo(5.1, -18.6);
        ctx.lineTo(-5.1, -18.6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = P.gem || helmGem;
        ctx.beginPath();
        ctx.arc(0, -17.5, P.gem ? 1.5 : 1.1, 0, Math.PI * 2);
        ctx.fill();
        if (P.star) {
          ctx.fillStyle = P.star;
          ctx.beginPath();
          hlStarPath(ctx, tipX * 0.45, tipY * 0.5 - 9.5, 2.2, 0.9);
          ctx.fill();
          if (s >= 4) {
            ctx.fillRect(-3.5, -21.5, 1.1, 1.1);
            ctx.fillRect(2.2, -20.5, 1.1, 1.1);
          }
        }
        if (s >= 3) {
          ctx.fillStyle = P.rune || P.trim;
          ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.35;
          ctx.beginPath();
          ctx.arc(tipX, tipY, 1.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    // ───────── 파츠: 주변 이펙트 (앞쪽) ─────────
    function hlDrawFrontExtras(ctx, f, L, t, hunter) {
      const P = L.pal;
      const ex = L.extras;
      if (ex.includes('runes')) {
        const n = L.stage >= 4 ? 3 : 2;
        ctx.fillStyle = P.rune;
        for (let i = 0; i < n; i++) {
          const a = t * 1.6 + (i * Math.PI * 2) / n;
          const x = Math.cos(a) * 14;
          const y = 2 + Math.sin(a) * 5;
          ctx.globalAlpha = 0.55 + (Math.sin(a) + 1) * 0.2;
          ctx.beginPath();
          ctx.moveTo(x, y - 2.4);
          ctx.lineTo(x + 1.6, y);
          ctx.lineTo(x, y + 2.4);
          ctx.lineTo(x - 1.6, y);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (ex.includes('leaves')) {
        ctx.fillStyle = P.crown || P.emblem;
        for (let i = 0; i < 2; i++) {
          const c = (t * 0.5 + i * 0.5 + (hunter.x || 0) * 0.01) % 1;
          const x = -f * (8 + i * 4) + Math.sin(c * Math.PI * 4) * 2.5;
          const y = -14 + c * 26;
          ctx.globalAlpha = (1 - c) * 0.85;
          ctx.beginPath();
          ctx.ellipse(x, y, 1.1, 2.2, c * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (ex.includes('embers')) {
        ctx.fillStyle = P.hornTip || P.accent;
        for (let i = 0; i < 3; i++) {
          const c = (t * 0.7 + i / 3 + (hunter.x || 0) * 0.013) % 1;
          const x = Math.sin(i * 2.1 + c * 5) * 9;
          const y = 8 - c * 30;
          ctx.globalAlpha = (1 - c) * 0.9;
          ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
        }
        ctx.globalAlpha = 1;
      }
    }

    // ───────── 메인: 다리 · 몸통 · 머리 · 머리 장비 ─────────
    // (보행 바운스 translate 가 적용된 상태에서 호출됨)
    function drawHunterBodyLook(ctx, hunter, t, legSwing) {
      const L = getHunterLook(hunter);
      const P = L.pal;
      const f = hunter.facing || 1;
      const isF = hunter.gender === 'F';
      const armorTier = hunter.equipment?.armor?.tier || 1;
      const armorEnhance = hunter.equipment?.armor?.enhance || 0;
      const helmetTier = hunter.equipment?.helmet?.tier || 1;
      const helmetEnhance = hunter.equipment?.helmet?.enhance || 0;
      const glowArmor = armorEnhance >= 10 || armorTier >= 8;
      const outline = glowArmor ? '#38bdf8' : '#0f172a';
      const outlineW = glowArmor ? 1.8 : 1.5;
      const helmOutline = helmetEnhance >= 10 || helmetTier >= 8 ? '#38bdf8' : '#0f172a';
      const buckle = HUNTER_ARMOR_TIER_GEM[Math.min(10, armorTier)] || HUNTER_ARMOR_TIER_GEM[1];
      const helmGem = HUNTER_HELM_TIER_GEM[Math.min(10, helmetTier)] || HUNTER_HELM_TIER_GEM[1];

      // 등 뒤 레이어
      if (L.cape && P.cape) hlDrawCape(ctx, f, L, t);
      if (L.extras.includes('quiver')) hlDrawQuiver(ctx, f, L);
      if (isF) {
        ctx.fillStyle = hunter.hairColor;
        ctx.beginPath();
        ctx.roundRect(-10, -13, 20, 21, [9, 9, 6, 6]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 다리 & 부츠
      ctx.fillStyle = P.legs;
      ctx.fillRect(-5.5, 10 + legSwing * 0.4, 4, 6);
      ctx.fillRect(1.5, 10 - legSwing * 0.4, 4, 6);
      ctx.fillStyle = P.boots;
      ctx.fillRect(-6, 14 + legSwing * 0.4, 5, 2.2);
      ctx.fillRect(1, 14 - legSwing * 0.4, 5, 2.2);

      // 몸통
      hlDrawTorso(ctx, f, L, isF, outline, outlineW, buckle);
      hlDrawTorsoExtras(ctx, f, L, isF);
      hlDrawShoulders(ctx, L, isF);
      hlDrawEmblem(ctx, L);

      // 머리
      hlDrawHeadBack(ctx, f, L);
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(0, -10, 6.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = hunter.hairColor;
      ctx.beginPath();
      ctx.arc(0, -11.5, 7.1, Math.PI, 0);
      ctx.fill();
      if (isF) {
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

      const eyeX = f * 2.3;
      if (isF) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(eyeX, -9.6, 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(eyeX - f * 1.2, -10.8);
        ctx.lineTo(eyeX + f * 1.6, -11.2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(244, 114, 182, 0.48)';
        ctx.beginPath();
        ctx.arc(eyeX - f * 0.6, -7.8, 1.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(eyeX - 1.1, -10.3, 2.2, 2.1);
        ctx.fillStyle = hunter.hairColor;
        ctx.fillRect(eyeX - 1.5, -12.1, 3.2, 1.2);
      }

      hlDrawMoreFace(ctx, hunter, L, t);
      hlDrawHeadgear(ctx, f, L, t, helmGem, helmOutline);
      if (isF) hlDrawFemaleLocks(ctx, hunter, L);
      hlDrawMoreFrontExtras(ctx, f, L, t, hunter);
      hlDrawFrontExtras(ctx, f, L, t, hunter);
    }

    // ═════════ 추가 파츠 라이브러리 (높은 깃 · 깃털 모자 · 어깨 망토 · 마법서 · 수염 등, 2단계 전용 외형에서도 재사용) ═════════
    // 발목까지 내려오는 넓은 망토 (몸 양옆으로 보임)
    function hlDrawCloak(ctx, f, L, t) {
      const P = L.pal;
      const sway = Math.sin(t * 2) * 1.2;
      ctx.fillStyle = P.cape;
      ctx.strokeStyle = P.capeTrim;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-8, -5);
      ctx.lineTo(8, -5);
      const x0 = f * 12;
      const x1 = -f * 18 + sway;
      ctx.lineTo(x0, 16.5);
      // 잎사귀 모양 밑단
      for (let i = 1; i <= 4; i++) {
        const xa = x0 + (x1 - x0) * ((i - 0.5) / 4);
        const xb = x0 + (x1 - x0) * (i / 4);
        ctx.quadraticCurveTo(xa, 19.5, xb, 16.5);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    function hlDrawMoreTorsoExtras(ctx, f, L, isF) {
      const P = L.pal;
      const ex = L.extras;
      if (ex.includes('layerSash')) {
        [[P.sashA, 0], [P.sashB, 2.4]].forEach(([c, o]) => {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(-7.5, -4 + o);
          ctx.lineTo(-4.5, -4.5 + o);
          ctx.lineTo(9.5, 8 + o);
          ctx.lineTo(9.5, 10 + o);
          ctx.closePath();
          ctx.fill();
        });
      }
      if (ex.includes('runeTrim')) {
        ctx.fillStyle = P.rune;
        for (let i = 0; i < 6; i++) ctx.fillRect(-9.5 + i * 3.6, 12.6, 1.8, 1.2);
        for (let i = 0; i < 4; i++) ctx.fillRect(-0.7, -2 + i * 3.8, 1.4, 1.8);
      }
      if (ex.includes('pouches')) {
        ctx.fillStyle = P.pouch;
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 0.8;
        [-6, f * 3.5, 6].forEach((x) => {
          ctx.fillRect(x - 1.6, 8.6, 3.2, 3.4);
          ctx.strokeRect(x - 1.6, 8.6, 3.2, 3.4);
        });
      }
      if (ex.includes('bracer')) {
        ctx.fillStyle = P.bracer;
        ctx.strokeStyle = P.trim;
        ctx.lineWidth = 0.9;
        ctx.fillRect(f * 9 - 2, 0.5, 4, 4.5);
        ctx.strokeRect(f * 9 - 2, 0.5, 4, 4.5);
      }
      if (ex.includes('capelet')) {
        ctx.fillStyle = P.capelet;
        ctx.strokeStyle = P.capeletTrim;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-6, -5.5);
        ctx.lineTo(6, -5.5);
        ctx.lineTo(11, 1.5);
        ctx.quadraticCurveTo(0, 5, -11, 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      if (ex.includes('leafClasp')) {
        ctx.fillStyle = P.clasp;
        [-1, 1].forEach((side) => {
          ctx.beginPath();
          ctx.ellipse(side * 1.8, -3.8, 1.4, 2.6, side * 0.9, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // 머리 뒤쪽 파츠 (얼굴보다 먼저)
    function hlDrawMoreHeadBack(ctx, f, L) {
      const P = L.pal;
      if (L.shoulders === 'highCollar') {
        ctx.fillStyle = P.collar;
        ctx.strokeStyle = P.trim;
        ctx.lineWidth = 1.2;
        [-1, 1].forEach((side) => {
          ctx.beginPath();
          ctx.moveTo(side * 2, -4.5);
          ctx.lineTo(side * 10.5, -4);
          ctx.lineTo(side * (11 + L.stage * 0.4), -16 - L.stage * 0.9);
          ctx.quadraticCurveTo(side * 7, -10, side * 4.5, -9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      }
      if (L.head === 'deepHood') {
        ctx.fillStyle = P.hood;
        ctx.strokeStyle = P.hoodRim;
        ctx.lineWidth = 1.2;
        // 어깨까지 덮는 두건 자락 + 뒤로 처진 뾰족 끝
        ctx.beginPath();
        ctx.moveTo(-10, -1);
        ctx.quadraticCurveTo(-11, -20, 0, -20.5);
        ctx.quadraticCurveTo(-f * 9, -21, -f * 14, -12);
        ctx.quadraticCurveTo(f * 11, -20, 10, -1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // 얼굴 위 파츠: 두건 그림자 + 빛나는 눈 / 수염
    function hlDrawMoreFace(ctx, hunter, L, t) {
      const P = L.pal;
      const f = hunter.facing || 1;
      if (L.face === 'shadow') {
        ctx.fillStyle = 'rgba(15, 10, 40, 0.88)';
        ctx.beginPath();
        ctx.ellipse(0, -9.5, 6, 5.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = P.eyeGlow;
        ctx.globalAlpha = 0.8 + Math.sin(t * 3) * 0.2;
        ctx.fillRect(f * 0.6 - 1, -10.4, 2, 1.6);
        ctx.fillRect(f * 4 - 1, -10.4, 2, 1.6);
        ctx.globalAlpha = 1;
      }
      if (L.beard && hunter.gender !== 'F') {
        ctx.fillStyle = P.beard;
        ctx.beginPath();
        ctx.moveTo(-5, -8);
        ctx.quadraticCurveTo(-4.5, -1, f * 1.5, 1.5);
        ctx.quadraticCurveTo(4.5, -1, 5.5, -8);
        ctx.quadraticCurveTo(0, -5.5, -5, -8);
        ctx.fill();
        ctx.fillRect(f * 0.5 - 2.5, -7.8, 7, 1.4);
      }
    }

    // 추가 머리 장비 (깊은 두건 · 깃털 모자). 그렸으면 true
    function hlDrawMoreHeadgear(ctx, f, L, t, helmGem, helmOutline) {
      const P = L.pal;
      if (L.head === 'deepHood') {
        ctx.fillStyle = P.hood;
        ctx.strokeStyle = P.hoodRim;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-8.2, -4);
        ctx.quadraticCurveTo(-9.5, -18.5, 0, -18.5);
        ctx.quadraticCurveTo(9.5, -18.5, 8.2, -4);
        ctx.lineTo(5.8, -5);
        ctx.quadraticCurveTo(6.5, -14.5, 0, -14.5);
        ctx.quadraticCurveTo(-6.5, -14.5, -5.8, -5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = helmGem;
        ctx.beginPath();
        ctx.arc(0, -16.5, 1.1, 0, Math.PI * 2);
        ctx.fill();
        return true;
      }
      if (L.head === 'featherCap') {
        // 깃털 (모자 뒤에서 위로 휘어짐, 환생할수록 길어지고 2환생부터 두 번째 깃털)
        const fLen = 6 + L.stage * 0.8;
        const feathers = P.feather2 ? [[P.feather2, -1.25, 0.75], [P.feather, -0.9, 1]] : [[P.feather, -0.9, 1]];
        feathers.forEach(([col, rot, k]) => {
          ctx.save();
          ctx.translate(-f * 4, -17);
          ctx.rotate(f * rot + Math.sin(t * 2.2) * 0.05);
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.ellipse(0, -fLen * k + 1, 1.8, fLen * k, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(0, 1);
          ctx.lineTo(0, -fLen * k * 1.8);
          ctx.stroke();
          ctx.restore();
        });
        // 앞으로 뾰족한 모자
        ctx.fillStyle = P.cap;
        ctx.strokeStyle = helmOutline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-f * 8, -12.5);
        ctx.quadraticCurveTo(-f * 6, -21, f * 2, -19);
        ctx.lineTo(f * 10.5, -13);
        ctx.quadraticCurveTo(f * 3, -14.5, -f * 8, -12.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = P.capBand;
        ctx.beginPath();
        ctx.moveTo(-f * 7.8, -12.8);
        ctx.quadraticCurveTo(f * 2, -15, f * 8, -13.6);
        ctx.lineTo(f * 7, -15.6);
        ctx.quadraticCurveTo(f * 1, -16.8, -f * 7.4, -15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = helmGem;
        ctx.beginPath();
        ctx.arc(-f * 3, -14.6, 1.1, 0, Math.PI * 2);
        ctx.fill();
        if (P.crown) {
          // 4환생: 모자 띠 위 황금 잎사귀 장식
          ctx.fillStyle = P.crown;
          [[-1, -17.6, -0.5], [2.6, -18.6, 0.2], [6, -17, 0.8]].forEach(([x, y, r]) => {
            ctx.beginPath();
            ctx.ellipse(f * x, y, 1.3, 2.7, f * r, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        return true;
      }
      return false;
    }

    function hlDrawMoreFrontExtras(ctx, f, L, t, hunter) {
      const P = L.pal;
      const ex = L.extras;
      const bob = Math.sin(t * 2.4 + (hunter.x || 0) * 0.02) * 1.5;
      if (ex.includes('orb')) {
        const ox = -f * 13;
        const oy = -6 + bob;
        ctx.fillStyle = P.orb;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(ox, oy, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(ox, oy, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ox - 0.8, oy - 0.8, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      if (ex.includes('grimoire')) {
        ctx.save();
        ctx.translate(-f * 13.5, -3 + bob);
        ctx.rotate(-f * 0.25);
        ctx.fillStyle = P.book;
        ctx.strokeStyle = P.trim;
        ctx.lineWidth = 1;
        ctx.fillRect(-5, -3.6, 10, 7.2);
        ctx.strokeRect(-5, -3.6, 10, 7.2);
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(-4.2, -3, 3.9, 5.8);
        ctx.fillRect(0.3, -3, 3.9, 5.8);
        ctx.fillStyle = '#a16207';
        ctx.fillRect(-3.6, -1.6, 2.8, 0.6);
        ctx.fillRect(-3.6, 0.2, 2.8, 0.6);
        ctx.fillRect(0.9, -1.6, 2.8, 0.6);
        ctx.restore();
      }
    }

    // 여성 헌터: 투구·두건·모자 밖으로 보이는 긴 옆머리
    function hlDrawFemaleLocks(ctx, hunter, L) {
      const inHood = L.head === 'hood' || L.head === 'deepHood';
      const x = inHood ? 5.6 : 7.2;
      ctx.fillStyle = hunter.hairColor;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 0.7;
      [-1, 1].forEach((side) => {
        // 위는 넓고 아래로 갈수록 가늘어지며 바깥으로 살짝 휘는 긴 머리칼
        ctx.beginPath();
        ctx.moveTo(side * (x - 1.8), -12.5);
        ctx.quadraticCurveTo(side * (x + 2.2), -5, side * (x + 1.6), 3);
        ctx.quadraticCurveTo(side * (x - 0.6), -3, side * (x - 1.6), -7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    }
