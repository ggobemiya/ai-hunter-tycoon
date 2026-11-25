// [36-render-cull] 🖥️ 화면 밖 그리기 생략 (성능 · 화면을 끌 때 버벅임 줄이기)
    // ============================================================================
    // 지도 전체(마을 · 사냥터 몬스터 · 오크 · 보스 · 투기장 · 천궁 · 왕국 · 헌터)를 매 화면 다 그리면
    // 휴대폰에서 한 화면에 수십 ms가 걸려 화면 이동이 끊긴다. 지금 보이는 범위(01-core-utils.js
    // isWorldPointVisible / isWorldRectVisible) 밖에 있는 것은 그리기를 건너뛴다.
    //   - 메인 게임 화면(캔버스)에 그릴 때만 생략한다. 결투장 등 다른 화면에 그릴 때는 그대로 그린다.
    //   - 여유(pad)를 넉넉히 둬서 화면 가장자리에 걸친 것(이름표 · 날개 · 큰 보스)은 그대로 보인다.
    //   - 게임 진행(이동 · 전투 · 경험치)은 전혀 건드리지 않는다. 그리기만 생략한다.
    // 이 파일은 그리기 함수를 쓰는 모든 파일 뒤에 불러온다 (index.html 맨 끝).
    // ============================================================================
    (function installRenderCulling() {
      const wrap = (name, isVisible) => {
        const orig = window[name];
        if (typeof orig !== 'function') return;
        window[name] = function (ctx, obj, ...rest) {
          try {
            if (!isVisible(ctx, obj)) return undefined;
          } catch (_) { /* 판단이 안 되면 그냥 그린다 */ }
          return orig.call(this, ctx, obj, ...rest);
        };
      };

      // 사냥터 · 천공의 섬 · 천궁 몬스터
      wrap('drawFieldMonster', (ctx, m) => !m || isWorldPointVisible(m.x, m.y, 180, ctx));
      // 성소 보스 · 제단 보스 (크고 오라가 넓음)
      wrap('drawBossGuardian', (ctx, b) => !b || isWorldPointVisible(b.x, b.y, 420, ctx));
      wrap('drawRebirthSupremeBoss', (ctx, b) => !b || isWorldPointVisible(b.x, b.y, 420, ctx));
      // 헌터 (날개 · 이름표 · 별 포함)
      wrap('drawHunterWithWeapon', (ctx, h) => !h || isWorldPointVisible(h.x, h.y, 150, ctx));
      // 마을 건물 · 빈 부지 (지붕 아이콘 · 이름표가 위아래로 나옴)
      wrap('drawBuilding', (ctx, b) => !b || isWorldRectVisible(b.x - (b.w || 140) / 2, b.y - (b.h || 100) / 2, b.w || 140, b.h || 100, 140, ctx));
      wrap('drawEmptyPlot', (ctx, p) => !p || isWorldPointVisible(p.x, p.y, 160, ctx));
      // 왕국 병력
      wrap('drawKingdomUnit', (ctx, pos) => !pos || isWorldPointVisible(pos.x, pos.y, 120, ctx));

      // 넓은 구역 그림: 구역 전체가 화면 밖이면 통째로 생략
      const wrapArea = (name, getRect) => {
        const orig = window[name];
        if (typeof orig !== 'function') return;
        window[name] = function (ctx, ...rest) {
          try {
            const r = getRect();
            if (r && !isWorldRectVisible(r.x, r.y, r.w, r.h, 80, ctx)) return undefined;
          } catch (_) { /* 그냥 그린다 */ }
          return orig.call(this, ctx, ...rest);
        };
      };
      // ☁️ 성운의 천궁 (구름 · 계단 · 장식이 둘레로 퍼져 있어 넉넉히)
      wrapArea('drawCelestialPalaceArea', () => {
        if (typeof CELESTIAL_PALACE_GROUND === 'undefined') return null;
        const b = CELESTIAL_PALACE_GROUND.bounds;
        return { x: b.x - 400, y: b.y - 400, w: b.w + 800, h: b.h + 800 };
      });
      // ⚔️ 영웅의 투기장 (콜로세움 외벽 · 깃발 · 입구 포털 포함)
      wrapArea('drawHeroArena', () => {
        if (typeof HERO_ARENA_GROUND === 'undefined') return null;
        const g = HERO_ARENA_GROUND;
        return { x: g.centerX - g.radiusX - 200, y: g.centerY - g.radiusY - 260, w: (g.radiusX + 200) * 2, h: (g.radiusY + 260) * 2 + 520 };
      });
      // 👑 왕국 성 (해자 · 다리까지) — 바깥 잔디는 넓게 칠하므로 왕국이 안 보일 때도 잔디만은 칠해야 한다
      if (typeof drawKingdomGround === 'function' && typeof KINGDOM !== 'undefined') {
        const origKingdom = drawKingdomGround;
        drawKingdomGround = function (ctx, ...rest) {
          try {
            const I = KINGDOM.inner;
            const m = KINGDOM.wallThick + KINGDOM.moatWidth + 40;
            if (!isWorldRectVisible(I.x - m, I.y - m, (KINGDOM.villageEdgeX + 20) - (I.x - m), I.h + m * 2, 60, ctx)) {
              ctx.fillStyle = '#2d4c3e'; // 왕국 바깥 잔디 (원래 그림과 같은 범위)
              ctx.fillRect(-4600, -2800, 4600 - 563, 5800);
              ctx.fillRect(-563, 1500, 1113, 1300);
              return undefined;
            }
          } catch (_) { /* 그냥 그린다 */ }
          return origKingdom.call(this, ctx, ...rest);
        };
      }
    })();
