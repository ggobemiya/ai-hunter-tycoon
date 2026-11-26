// [15c-celestial-palace] 🌌 성운의 천궁: 날개 비행 이동 · 구역 그리기
    // ============================================================================
    // - 천공의 섬 위(200칸 떨어진 하늘)에 떠 있는 4환생 이상 전용 사냥터
    //   (정의: js/03-hunting-grounds.js CELESTIAL_PALACE_GROUND)
    // - 날개를 착용한 헌터만 들어갈 수 있고, 천공의 섬에서 날개를 펼쳐 날아서 오간다.
    //     · 갈 때: 마을 → 천공의 섬 게이트(포탈) → 천공의 섬 도착 → 날개로 천궁까지 비행 → 사냥
    //     · 올 때: 천궁 → 날개로 천공의 섬까지 비행 → 천공의 섬 포탈로 마을 귀환
    //       (체력 부족·물약 소진·레이드 소집 등으로 사냥을 멈추면 자동으로 귀환)
    // - 몬스터는 천공의 섬 상위 버전 (크기 1.5배로 그림)
    // ============================================================================
    const CELESTIAL_FLIGHT_CFG = {
      minSpeed: 200,          // 비행 속도 (px/초, 최소)
      speedMult: 2.6,         // 헌터 이동 속도 × 2.6
      arriveDist: 10
    };

    function isPointInCelestialPalace(x, y, margin = 30) {
      const b = CELESTIAL_PALACE_GROUND.bounds;
      return x >= b.x - margin && x <= b.x + b.w + margin && y >= b.y - margin && y <= b.y + b.h + margin;
    }

    function isPointOnSkyIsland(x, y, margin = 24) {
      const b = SKY_ISLAND_GROUND.bounds;
      return x >= b.x - margin && x <= b.x + b.w + margin && y >= b.y - margin && y <= b.y + b.h + margin;
    }

    // 천궁 구역 안에 있거나 날아가는 중인 헌터 (갇힘 구조 · 벽 충돌 대상에서 제외)
    function isHunterInCelestialPalace(hunter) {
      if (!hunter) return false;
      return hunter.state === 'CELESTIAL_FLIGHT' || isPointInCelestialPalace(hunter.x, hunter.y);
    }

    function pickCelestialLandingSpot() {
      const g = CELESTIAL_PALACE_GROUND;
      const b = g.bounds;
      const alive = g.monsters.filter(m => m && m.hp > 0);
      if (alive.length > 0) {
        const m = alive[Math.floor(Math.random() * alive.length)];
        return {
          x: Math.max(b.x + 60, Math.min(b.x + b.w - 60, m.x + (Math.random() - 0.5) * 60)),
          y: Math.max(b.y + 140, Math.min(b.y + b.h - 40, m.y + 30 + Math.random() * 20))
        };
      }
      return { x: b.x + 90 + Math.random() * (b.w - 180), y: b.y + 150 + Math.random() * (b.h - 190) };
    }

    // 천공의 섬 북쪽 가장자리(천궁 쪽) 착지 지점
    function pickSkyIslandLandingSpot() {
      const b = SKY_ISLAND_GROUND.bounds;
      return { x: b.x + 120 + Math.random() * (b.w - 240), y: b.y + 110 + Math.random() * 60 };
    }

    function beginCelestialFlight(hunter, dir, dest, bubble) {
      hunter.state = 'CELESTIAL_FLIGHT';
      hunter.celestialFlightDir = dir;
      hunter.flightTargetX = dest.x;
      hunter.flightTargetY = dest.y;
      hunter.waypoints = [];
      hunter.activeGroundId = null;
      hunter.currentTargetMonster = null;
      hunter.currentTargetHunter = null;
      if (bubble) interactionManager.spawnBubble(hunter, bubble, '#c4b5fd');
    }

    // 천궁 출정 시작 (AI가 천궁 사냥을 고르면 호출)
    // 천공의 섬에 있으면 바로 날아오르고, 마을 등에 있으면 먼저 천공의 섬 게이트(포탈)로 간다.
    function startCelestialFlight(hunter) {
      if (!hunter || !canHunterEnterCelestialPalace(hunter)) return false;
      const onSky = hunter.activeGroundId === SKY_ISLAND_GROUND.id || isPointOnSkyIsland(hunter.x, hunter.y);
      if (onSky) {
        hunter.celestialViaPortal = false;
        hunter.skyIslandPortalWarp = false;
        beginCelestialFlight(hunter, 'up', pickCelestialLandingSpot(), '🪽 날개를 펼쳐 성운의 천궁으로 비상!');
        hunter.targetGroundId = CELESTIAL_PALACE_GROUND.id;
        hunter.targetBuildingName = CELESTIAL_PALACE_GROUND.name;
        hunter.targetBuildingType = 'hunting_ground';
        return true;
      }
      // 천공의 섬 포탈부터
      if (typeof sendRebirthHunterToSkyIslandGate === 'function' && sendRebirthHunterToSkyIslandGate(hunter)) {
        hunter.celestialViaPortal = true;
        hunter.targetBuildingName = '천공의 섬 게이트 → ' + CELESTIAL_PALACE_GROUND.name;
        return true;
      }
      return false;
    }

    // 천궁에서 천공의 섬으로 날아 내려간 뒤 포탈로 마을 귀환
    function startCelestialReturn(hunter, reason = '🪽 천궁에서 천공의 섬으로 하강!') {
      hunter.celestialViaPortal = false;
      beginCelestialFlight(hunter, 'down', pickSkyIslandLandingSpot(), reason);
    }

    function stepCelestialFlight(hunter, dt) {
      const speed = Math.max(CELESTIAL_FLIGHT_CFG.minSpeed, (hunter.speed || 70) * CELESTIAL_FLIGHT_CFG.speedMult);
      const dx = hunter.flightTargetX - hunter.x;
      const dy = hunter.flightTargetY - hunter.y;
      const d = Math.hypot(dx, dy);
      // 비행 중에도 강화 반짝이는 계속 사라지게
      for (let i = hunter.particles.length - 1; i >= 0; i--) {
        const p = hunter.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) hunter.particles.splice(i, 1);
      }
      if (hunter.attackAnimTimer > 0) hunter.attackAnimTimer = Math.max(0, hunter.attackAnimTimer - dt);

      if (d <= Math.max(CELESTIAL_FLIGHT_CFG.arriveDist, speed * dt)) {
        hunter.x = hunter.flightTargetX;
        hunter.y = hunter.flightTargetY;
        const dir = hunter.celestialFlightDir;
        hunter.celestialFlightDir = null;
        if (dir === 'up' && canHunterEnterCelestialPalace(hunter)) {
          hunter.state = 'HUNTING_FIELD';
          hunter.activeGroundId = CELESTIAL_PALACE_GROUND.id;
          hunter.targetGroundId = CELESTIAL_PALACE_GROUND.id;
          hunter.targetBuildingType = 'hunting_ground';
          hunter.huntTimer = 14 + Math.random() * 6;
          hunter.currentTargetMonster = null;
          interactionManager.spawnBubble(hunter, '🌌 성운의 천궁 도착! 사냥 시작!', '#c4b5fd');
        } else {
          // 천공의 섬에 내려앉으면 포탈로 마을 귀환
          teleportHunterFromSkyIslandToTown(hunter, '✨ 천공의 섬 포탈로 마을 귀환!');
          if (hunter.state === 'CELESTIAL_FLIGHT' || hunter.state === 'HUNTING_FIELD') {
            hunter.state = 'IDLE';
            hunter.stateTimer = 0.3;
          }
        }
        return;
      }
      hunter.facing = dx >= 0 ? 1 : -1;
      hunter.x += (dx / d) * speed * dt;
      hunter.y += (dy / d) * speed * dt;
      hunter.walkCycle = (hunter.walkCycle || 0) + dt * 6;

      // 날개 깃털 가루 (비행 흔적)
      if (Math.random() < dt * 14) {
        hunter.particles.push({
          x: -hunter.facing * (8 + Math.random() * 10),
          y: -10 + (Math.random() - 0.5) * 12,
          vx: -hunter.facing * (20 + Math.random() * 25),
          vy: 10 + Math.random() * 15,
          life: 0.5,
          maxLife: 0.5,
          size: 2
        });
      }
    }

    // 헌터 업데이트: 비행 중이면 비행만, 아니면 평소대로
    //  + 포탈로 천공의 섬에 막 도착한 천궁 출정 헌터는 바로 날아오름
    //  + 천궁에 남았는데 사냥 중이 아니면 천공의 섬으로 내려가 귀환
    (function hookHunterCelestialFlight() {
      const origUpdate = Hunter.prototype.update;
      Hunter.prototype.update = function (dt) {
        if (this.state === 'CELESTIAL_FLIGHT') {
          stepCelestialFlight(this, dt);
          return;
        }
        origUpdate.call(this, dt);
        if (this.state === 'CELESTIAL_FLIGHT') return; // 방금 AI가 천궁 비행을 시작한 경우

        if (this.celestialViaPortal) {
          if (this.activeGroundId === SKY_ISLAND_GROUND.id && this.state === 'HUNTING_FIELD') {
            this.celestialViaPortal = false;
            if (canHunterEnterCelestialPalace(this)) {
              this.skyIslandPortalWarp = false;
              beginCelestialFlight(this, 'up', pickCelestialLandingSpot(), '🪽 천공의 섬에서 성운의 천궁으로 비상!');
              this.targetGroundId = CELESTIAL_PALACE_GROUND.id;
              this.targetBuildingName = CELESTIAL_PALACE_GROUND.name;
              this.targetBuildingType = 'hunting_ground';
            }
            return;
          }
          // 게이트로 가는 길이 아닌 다른 일(레이드 소집 등)로 바뀌면 출정 취소
          if (this.targetBuildingType !== 'sky_island_portal') this.celestialViaPortal = false;
        }

        if (isPointInCelestialPalace(this.x, this.y)) {
          const huntingHere = this.state === 'HUNTING_FIELD' && this.activeGroundId === CELESTIAL_PALACE_GROUND.id;
          if (!huntingHere) startCelestialReturn(this);
        }
      };
    })();

    // ---------- 그리기 ----------
    function drawCelestialPalaceArea(ctx) {
      const g = CELESTIAL_PALACE_GROUND;
      const b = g.bounds;
      const t = performance.now() * 0.001;
      ctx.save();

      // 1) 성운 빛 (뒤쪽 은은한 보랏빛)
      const glow = ctx.createRadialGradient(g.centerX, g.centerY, 40, g.centerX, g.centerY, b.w * 0.7);
      glow.addColorStop(0, 'rgba(167, 139, 250, 0.35)');
      glow.addColorStop(0.6, 'rgba(91, 33, 182, 0.18)');
      glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(b.x - 140, b.y - 120, b.w + 280, b.h + 240);

      // 2) 구름 바닥 (가장자리를 뭉게구름으로 감쌈)
      const pad = 22;
      ctx.fillStyle = 'rgba(237, 233, 254, 0.92)';
      ctx.strokeStyle = 'rgba(196, 181, 253, 0.9)';
      ctx.lineWidth = 2;
      const puffs = [];
      const stepX = 38;
      for (let x = b.x - pad; x <= b.x + b.w + pad; x += stepX) {
        puffs.push([x, b.y - pad + 6, 24]);
        puffs.push([x, b.y + b.h + pad - 6, 26]);
      }
      for (let y = b.y - pad; y <= b.y + b.h + pad; y += stepX) {
        puffs.push([b.x - pad + 4, y, 24]);
        puffs.push([b.x + b.w + pad - 4, y, 24]);
      }
      puffs.forEach(([x, y, r], i) => {
        ctx.beginPath();
        ctx.arc(x, y + Math.sin(t * 0.8 + i) * 1.5, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // 3) 천궁 바닥 (밤하늘 성운 타일)
      const floor = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
      floor.addColorStop(0, '#2e1065');
      floor.addColorStop(0.55, '#3b0764');
      floor.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = floor;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 26);
      ctx.fill();
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 별 반짝임
      for (let i = 0; i < 46; i++) {
        const sx = b.x + 20 + ((i * 97) % (b.w - 40));
        const sy = b.y + 18 + ((i * 53) % (b.h - 36));
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.6 + i * 1.7));
        ctx.fillStyle = `rgba(254, 249, 195, ${a})`;
        ctx.beginPath();
        ctx.arc(sx, sy, i % 5 === 0 ? 2.2 : 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4) 뒤쪽 금빛 천궁 기둥과 아치
      const pillarY = b.y + 14;
      for (let i = 0; i < 6; i++) {
        const px = b.x + 70 + i * ((b.w - 140) / 5);
        const pg = ctx.createLinearGradient(px - 8, 0, px + 8, 0);
        pg.addColorStop(0, '#a16207');
        pg.addColorStop(0.5, '#fde68a');
        pg.addColorStop(1, '#a16207');
        ctx.fillStyle = pg;
        ctx.fillRect(px - 7, pillarY + 18, 14, 50);
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(px - 10, pillarY + 14, 20, 6);
        ctx.fillRect(px - 10, pillarY + 66, 20, 5);
      }
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const x0 = b.x + 70 + i * ((b.w - 140) / 5);
        const x1 = b.x + 70 + (i + 1) * ((b.w - 140) / 5);
        ctx.beginPath();
        ctx.moveTo(x0, pillarY + 18);
        ctx.quadraticCurveTo((x0 + x1) / 2, pillarY - 8, x1, pillarY + 18);
        ctx.stroke();
      }

      // 5) 이름표 (다른 사냥터처럼 맵 위쪽 · 구름 테두리 바깥에 불투명 판으로)
      const signW = 450;
      const signH = 42;
      const signX = b.x + b.w / 2 - signW / 2;
      const signY = b.y - 100;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = 'rgba(196, 181, 253, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(signX, signY, signW, signH, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌌 성운의 천궁 [4환생 이상 · 날개 착용 헌터 전용 · 비행 입장]', b.x + b.w / 2, signY + 14);
      ctx.fillStyle = '#fde68a';
      ctx.font = '11px sans-serif';
      ctx.fillText('🪽 날개로만 오갈 수 있는 하늘 위 신전 · 17,000 EXP · 성운결정 드랍', b.x + b.w / 2, signY + 30);
      ctx.restore();

      // 6) 몬스터 (성운 날개 천사 4종 · 1.5배 크기 · js/15e-celestial-monsters.js)
      const scale = g.monsterScale || 1.5;
      g.monsters.forEach((m) => {
        if (!m || m.hp <= 0) return;
        if (typeof drawNebulaAngelMonster === 'function') {
          drawNebulaAngelMonster(ctx, m, 1.25); // 날개가 커서 몸은 1.25배
          return;
        }
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.scale(scale, scale);
        ctx.translate(-m.x, -m.y);
        drawFieldMonster(ctx, m);
        ctx.restore();
      });
    }

    (function hookCelestialDraw() {
      if (typeof drawVillageGround !== 'function') return;
      const origDraw = drawVillageGround;
      drawVillageGround = function (ctx, ...rest) {
        const r = origDraw.call(this, ctx, ...rest);
        try { drawCelestialPalaceArea(ctx); } catch (_) {}
        return r;
      };
    })();
