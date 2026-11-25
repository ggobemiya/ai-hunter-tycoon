// [14-town-guards] 마을 경비병 NPC (최강 경비병 · 마법 경비병)
    // 마을 내부 순찰 전용 경계 클램프 (마을 밖 · 동쪽 성벽/관문 밖 이탈 원천 차단)
    function clampGuardInsideTown(guard, radius = 14) {
      const minX = -515 + radius;
      const maxX = TOWN_EAST_GATE.wallX - TOWN_EAST_GATE.wallHalfThick - radius - 4;
      const minY = -375 + radius;
      const maxY = 375 - radius;

      if (guard.x < minX) guard.x = minX;
      if (guard.x > maxX) guard.x = maxX;
      if (guard.y < minY) guard.y = minY;
      if (guard.y > maxY) guard.y = maxY;
    }

    // 마을 내 경비병 피격 시 카오스 헌터 반격 실행 헬퍼
    function triggerChaosHunterCounterAttack(hunter, guard) {
      if (!hunter || !guard || hunter.hp <= 0) return;
      const dist = Math.hypot(guard.x - hunter.x, guard.y - hunter.y);
      const combat = typeof hunter.getCombatProfile === 'function'
        ? hunter.getCombatProfile()
        : { style: 'MELEE', range: 36, projType: 'MAGIC_ORB', slashType: 'MELEE', slashColor: '#f87171' };
      const counterRange = combat.style === 'RANGED' ? Math.max(150, combat.range || 160) : Math.max(54, (combat.range || 36) + 18);

      if (dist > counterRange) return;

      hunter.facing = guard.x >= hunter.x ? 1 : -1;
      hunter.attackAnimTimer = 0.28;

      const stats = typeof hunter.getComputedStats === 'function'
        ? hunter.getComputedStats()
        : { atk: hunter.baseAtk || 110, crit: hunter.crit || 15 };
      const isCrit = Math.random() * 100 < (stats.crit || 15);
      const counterDmg = Math.max(12, Math.round((stats.atk || 110) * (isCrit ? 1.35 : 0.85)));

      if (combat.style === 'RANGED' && typeof combatEffects !== 'undefined') {
        combatEffects.spawnProjectile({
          attacker: hunter,
          target: {
            x: guard.x,
            y: guard.y,
            hp: 999999,
            _isGuardDummyTarget: true
          },
          ground: null,
          isGuardCounterProj: true,
          x: hunter.x + hunter.facing * 12,
          y: hunter.y - 4,
          speed: combat.projType === 'ARROW' ? 390 : 300,
          projType: combat.projType || 'MAGIC_ORB',
          color: '#fb7185',
          dmg: counterDmg,
          isCrit
        });
      } else if (typeof combatEffects !== 'undefined') {
        combatEffects.spawnMeleeSlash({
          x: hunter.x + hunter.facing * 16,
          y: hunter.y - 2,
          facing: hunter.facing,
          slashType: combat.slashType || 'MELEE',
          color: '#fb7185'
        });
        combatEffects.spawnDamagePopup(guard.x, guard.y - 8, counterDmg, isCrit, '#fda4af');
      }

      if (Math.random() < 0.35 && typeof interactionManager !== 'undefined') {
        interactionManager.spawnBubble(hunter, '⚔️ 반격!', '#fca5a5');
      }
    }

    // ============================================================================
    // 오크 토벌전 경비병 동행 출정
    // - 토벌전이 ACTIVE가 되면 경비병도 동쪽 관문 → 도로 → 오크의 숲 통로를 거쳐 진격
    // - 오크의 숲(최상급 사냥터) 안에 있는 살아있는 오크와 교전 (오크 처치 시 토벌 점수 정상 반영)
    // - 토벌전이 끝나면 같은 길을 되짚어 마을 순찰 지점으로 복귀
    // ============================================================================
    const GUARD_RAID_ROAD_Y = TOWN_EAST_GATE.roadCenterY;
    const GUARD_RAID_FIELD_OUTER_X = 1365; // 오크의 숲 통로 바깥쪽(도로 쪽)
    const GUARD_RAID_FIELD_INNER_X = 1455; // 오크의 숲 통로 안쪽
    const GUARD_RAID_FIELD_EDGE_X = 1410;  // 이 X 이상이면 오크의 숲 안으로 간주
    const GUARD_RAID_ORC_MAX_X = 2245;     // 오크 군락지 결계 안쪽 오크는 추격하지 않음
    const GUARD_RAID_STANDBY_X = 1335;     // 오크의 숲 입구 출격 대기지 (헌터 대기 지점 바로 뒤)
    const GUARD_RAID_STANDBY_SECONDS = 30; // 토벌 준비 마지막 30초 소집

    function getGuardRaidField() {
      return HUNTING_GROUNDS.find(g => g.id === 'top_field_70_99') || null;
    }

    function buildGuardPathToOrcForest(guard, destX, destY) {
      const path = [];
      if (guard.x < TOWN_EAST_GATE.wallX) {
        path.push({ x: TOWN_EAST_GATE.entryWaypointX, y: GUARD_RAID_ROAD_Y });
        path.push({ x: TOWN_EAST_GATE.exitWaypointX, y: GUARD_RAID_ROAD_Y });
      }
      if (guard.x < GUARD_RAID_FIELD_EDGE_X) {
        path.push({ x: GUARD_RAID_FIELD_OUTER_X, y: GUARD_RAID_ROAD_Y });
        path.push({ x: GUARD_RAID_FIELD_INNER_X, y: GUARD_RAID_ROAD_Y });
      }
      path.push({ x: destX, y: destY });
      return path;
    }

    function buildGuardPathToTown(guard) {
      const path = [];
      if (guard.x >= GUARD_RAID_FIELD_EDGE_X) {
        path.push({ x: GUARD_RAID_FIELD_INNER_X, y: GUARD_RAID_ROAD_Y });
        path.push({ x: GUARD_RAID_FIELD_OUTER_X, y: GUARD_RAID_ROAD_Y });
      }
      if (guard.x >= TOWN_EAST_GATE.wallX - TOWN_EAST_GATE.wallHalfThick) {
        path.push({ x: TOWN_EAST_GATE.exitWaypointX, y: GUARD_RAID_ROAD_Y });
        path.push({ x: TOWN_EAST_GATE.entryWaypointX, y: GUARD_RAID_ROAD_Y });
      }
      path.push({ x: guard.homeX, y: guard.homeY });
      return path;
    }

    // 경로 지점을 따라 이동 (남은 경로가 있으면 true)
    function moveGuardAlongPath(guard, dt, speed) {
      const path = guard.raidPath;
      if (!Array.isArray(path) || path.length === 0) return false;
      const wp = path[0];
      const dx = wp.x - guard.x;
      const dy = wp.y - guard.y;
      const d = Math.hypot(dx, dy);
      const step = speed * dt;
      if (d <= Math.max(6, step)) {
        guard.x = wp.x;
        guard.y = wp.y;
        path.shift();
      } else {
        guard.facing = dx >= 0 ? 1 : -1;
        guard.x += (dx / d) * step;
        guard.y += (dy / d) * step;
        guard.walkCycle += dt * 12;
      }
      return path.length > 0;
    }

    function clampGuardInsideOrcForest(guard, radius = 14) {
      const field = getGuardRaidField();
      if (!field) return;
      const b = field.bounds;
      guard.x = Math.max(b.x + radius + 10, Math.min(b.x + b.w - radius, guard.x));
      guard.y = Math.max(b.y + 68, Math.min(b.y + b.h - radius - 14, guard.y));
    }

    function findGuardRaidOrcTarget(guard) {
      const orcs = (ORC_STRONGHOLD_ZONE.orcs || []).filter(
        o => o && !o.isDead && o.hp > 0 && o.x <= GUARD_RAID_ORC_MAX_X
      );
      const cur = guard.raidTargetOrc;
      if (cur && orcs.includes(cur)) return cur;
      let best = null;
      let bestDist = Infinity;
      for (let i = 0; i < orcs.length; i++) {
        const d = Math.hypot(orcs[i].x - guard.x, orcs[i].y - guard.y);
        if (d < bestDist) {
          bestDist = d;
          best = orcs[i];
        }
      }
      return best;
    }

    // 토벌전 중 경비병 행동 (cfg: slotAngle, isRanged, attackRange, cooldown, slashType, color, popupColor, label)
    function updateGuardOrcRaid(guard, dt, cfg) {
      const field = getGuardRaidField();
      if (!field) return;
      guard.targetHunterId = null;

      if (!guard.raidActive) {
        guard.raidActive = true;
        guard.raidStaging = false;
        guard.raidReturning = false;
        guard.raidTargetOrc = null;
        const startSlot = getRaidHunterSlot(guard);
        guard.raidPath = buildGuardPathToOrcForest(guard, startSlot.x, startSlot.y);
        combatEffects.spawnDamagePopup(guard.x, guard.y - 30, `${cfg.label} 토벌 동행 출정!`, true, cfg.popupColor);
      }

      // 1) 오크의 숲까지 진군
      if (moveGuardAlongPath(guard, dt, guard.speed * 1.2)) return;

      // 2) 3열 진형 자리를 지키며 오크와 교전 (수호대장 1열, 아크메이지 3열)
      const slot = getRaidHunterSlot(guard);
      const order = getRaidFormationOrder(guard, slot, getRaidOrcTargets(), cfg.attackRange, cfg.isRanged);
      const target = order.target;
      guard.raidTargetOrc = target;
      const dist = target ? Math.hypot(target.x - guard.x, target.y - guard.y) : Infinity;
      if (!target || dist > cfg.attackRange) {
        stepRaidUnitToward(guard, order.goalX, order.goalY, guard.speed, dt, 1);
        clampGuardInsideOrcForest(guard, 14);
        return;
      }
      guard.facing = target.x >= guard.x ? 1 : -1;
      if (guard.attackCooldown > 0) return;

      guard.attackCooldown = cfg.cooldown;
      guard.attackAnimTimer = cfg.isRanged ? 0.34 : 0.32;
      combatEffects.spawnMeleeSlash({
        x: guard.x + guard.facing * (cfg.isRanged ? 14 : 20),
        y: guard.y - (cfg.isRanged ? 4 : 2),
        facing: guard.facing,
        slashType: cfg.slashType,
        color: cfg.color
      });

      if (cfg.isRanged) {
        combatEffects.spawnProjectile({
          attacker: guard,
          target,
          ground: null,
          isMonsterProj: true,
          isOrcTarget: true,
          x: guard.x + guard.facing * 12,
          y: guard.y - 6,
          speed: 320,
          projType: 'MAGIC_ORB',
          color: cfg.color,
          dmg: guard.atk,
          isCrit: true
        });
        return;
      }

      const oStats = getOrcCombatStats(target);
      const takenDmg = Math.max(12, Math.round(guard.atk - oStats.def * 0.22));
      target.hp = Math.max(0, target.hp - takenDmg);
      combatEffects.spawnDamagePopup(target.x, target.y - 10, takenDmg, true, cfg.popupColor);
      if (target.hp <= 0) {
        killOrcUnit(target);
        guard.raidTargetOrc = null;
      }
    }

    // 토벌전 동행/복귀 처리 (true를 반환하면 이번 프레임의 마을 순찰 로직은 건너뜀)
    function handleGuardRaidDuty(guard, dt, cfg) {
      if (ORC_SUBJUGATION.status === 'ACTIVE') {
        // 토벌전에서 전사한 경비병은 마을 초소에서 토벌 종료까지 대기
        if (guard.raidFallen) return true;
        updateGuardOrcRaid(guard, dt, cfg);
        return true;
      }
      restoreRaidGuard(guard);

      // 토벌 준비 마지막 30초: 헌터들과 함께 오크의 숲 입구 출격 대기지로 소집
      if (ORC_SUBJUGATION.status === 'PREPARING' && (ORC_SUBJUGATION.prepTimer || 0) <= GUARD_RAID_STANDBY_SECONDS) {
        guard.targetHunterId = null;
        if (!guard.raidStaging) {
          guard.raidStaging = true;
          guard.raidReturning = false;
          const musterPos = getRaidMusterPosition(guard);
          guard.raidPath = buildGuardPathToOrcForest(guard, musterPos.x, musterPos.y);
          // 대기지는 숲 바깥이므로 숲 안쪽 통로 지점은 제외
          guard.raidPath = guard.raidPath.filter(wp => wp.x !== GUARD_RAID_FIELD_INNER_X);
          guard.raidPath = guard.raidPath.filter(wp => !(wp.x === GUARD_RAID_FIELD_OUTER_X && wp.y === GUARD_RAID_ROAD_Y));
          combatEffects.spawnDamagePopup(guard.x, guard.y - 30, `${cfg.label} 오크의 숲 입구 소집!`, true, cfg.popupColor);
        }
        if (!moveGuardAlongPath(guard, dt, guard.speed * 1.2)) {
          guard.facing = 1;
        }
        return true;
      }

      if (guard.raidActive || guard.raidStaging) {
        guard.raidActive = false;
        guard.raidStaging = false;
        guard.raidReturning = true;
        guard.raidTargetOrc = null;
        guard.raidPath = buildGuardPathToTown(guard);
      }
      if (guard.raidReturning) {
        if (moveGuardAlongPath(guard, dt, guard.speed * 1.2)) return true;
        guard.raidReturning = false;
        guard.raidPath = [];
      }
      return false;
    }

    // 마을 수호 최강 경비병 NPC (마을 내부 순찰 · 카오스 성향 -50 이하 헌터 추적 및 제압)
    const SUPREME_TOWN_GUARD = {
      name: '🛡️ 창세 수호대장',
      level: 1,
      hp: 250000,
      maxHp: 250000,
      x: 340,
      y: 18,
      homeX: 340,
      homeY: 18,
      patrolPoints: [
        { x: 340, y: 18 },
        { x: 180, y: -150 },
        { x: -190, y: -150 },
        { x: -340, y: 18 },
        { x: -190, y: 180 },
        { x: 220, y: 180 }
      ],
      patrolIndex: 0,
      speed: 118,
      atk: 9500,
      detectRange: 340,
      attackRange: 42,
      attackCooldown: 0,
      attackAnimTimer: 0,
      facing: -1,
      walkCycle: 0,
      targetHunterId: null,
      speechTimer: 0,

      findChaosTargetInTown() {
        let bestTarget = null;
        let bestDist = this.detectRange;
        for (let i = 0; i < hunters.length; i++) {
          const h = hunters[i];
          if (!h || h.hp <= 0 || h.state === 'IN_DUNGEON') continue;
          const isInTown = h.x < TOWN_EAST_GATE.wallX - TOWN_EAST_GATE.wallHalfThick;
          const isChaos = (h.alignment || 0) <= -50;
          if (!isInTown || !isChaos) continue;
          const d = Math.hypot(h.x - this.x, h.y - this.y);
          if (d <= bestDist) {
            bestDist = d;
            bestTarget = h;
          }
        }
        return bestTarget;
      },

      update(dt) {
        if (this.attackAnimTimer > 0) {
          this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
        }
        if (this.attackCooldown > 0) {
          this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        }
        if (this.speechTimer > 0) {
          this.speechTimer = Math.max(0, this.speechTimer - dt);
        }

        // 오크 토벌전 진행 중에는 오크의 숲으로 동행 출정, 종료 후 마을 복귀
        if (handleGuardRaidDuty(this, dt, {
          slotAngle: Math.PI * 0.5,
          isRanged: false,
          attackRange: this.attackRange,
          cooldown: 0.65,
          slashType: 'HOLY',
          color: '#fde047',
          popupColor: '#fde047',
          label: '🛡️'
        })) {
          return;
        }

        clampGuardInsideTown(this, 14);

        const target = this.findChaosTargetInTown();
        if (target) {
          if (this.targetHunterId !== target.id) {
            this.targetHunterId = target.id;
            if (this.speechTimer <= 0) {
              this.speechTimer = 3.0;
              interactionManager.spawnBubble(target, `🚨 카오스(${target.alignment}) 경비병 출현!`, '#fca5a5');
              showToast(`🛡️ 최강 경비병 [${this.name}]이(가) 마을 내 카오스 헌터 '${target.name}'(${target.alignment})을(를) 추격합니다!`);
            }
          }

          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const dist = Math.hypot(dx, dy);
          this.facing = dx >= 0 ? 1 : -1;

          if (dist > this.attackRange) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
            clampGuardInsideTown(this, 14);
            this.walkCycle += dt * 13;
          } else if (this.attackCooldown <= 0) {
            this.attackCooldown = 0.65;
            this.attackAnimTimer = 0.32;
            combatEffects.spawnMeleeSlash({
              x: this.x + this.facing * 20,
              y: this.y - 2,
              facing: this.facing,
              slashType: 'HOLY',
              color: '#fde047'
            });

            const rawDmg = this.atk;
            target.hp = Math.max(0, target.hp - rawDmg);
            combatEffects.spawnDamagePopup(target.x, target.y, rawDmg, true, '#f87171');
            triggerChaosHunterCounterAttack(target, this);

            if (target.hp <= 0) {
              const prevAlign = getAlignmentInfo(target.alignment);
              const nextAlign = target.modifyAlignment(3);
              target.hp = Math.round(target.maxHp * 0.3);
              target.mp = Math.round(target.maxMp * 0.4);
              target.x = 595;
              target.y = TOWN_EAST_GATE.roadCenterY;
              target.waypoints = [];
              target.currentTargetHunter = null;
              target.currentTargetMonster = null;
              target.state = 'IDLE';
              target.stateTimer = 0.8;
              this.targetHunterId = null;

              interactionManager.spawnBubble(target, `⚖️ 경비병 제압 · 인성 +3 (${nextAlign.value})`, '#86efac');
              refreshHunterPanel();
              if (document.getElementById('hunterRosterBackdrop')?.classList.contains('open')) {
                renderHunterRosterModal(false);
              }
              showToast(`🛡️ 최강 경비병이 카오스 헌터 '${target.name}'을(를) 제압했습니다! (인성 ${prevAlign.value} → ${nextAlign.value}, +3)`);
            }
          }
          return;
        }

        // 카오스 대상이 없을 때는 마을 내부 순찰 지점을 순서대로 순찰
        this.targetHunterId = null;
        const wp = this.patrolPoints[this.patrolIndex % this.patrolPoints.length] || { x: this.homeX, y: this.homeY };
        const hdx = wp.x - this.x;
        const hdy = wp.y - this.y;
        const hdist = Math.hypot(hdx, hdy);
        if (hdist > 6) {
          this.facing = hdx >= 0 ? 1 : -1;
          this.x += (hdx / hdist) * (this.speed * 0.68) * dt;
          this.y += (hdy / hdist) * (this.speed * 0.68) * dt;
          clampGuardInsideTown(this, 14);
          this.walkCycle += dt * 9;
        } else {
          this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
        }
      },

      draw(ctx) {
        const t = performance.now() * 0.0035;
        const lv = this.level || 1;
        const auraScale = 1 + Math.min(0.45, (lv - 1) * 0.005);
        const isAlert = Boolean(this.targetHunterId) || Boolean(this.raidActive) || Boolean(this.raidStaging) || Boolean(this.raidReturning);
        const wp = this.patrolPoints[this.patrolIndex % this.patrolPoints.length] || { x: this.homeX, y: this.homeY };
        const bobY = Math.hypot(wp.x - this.x, wp.y - this.y) > 6 || isAlert
          ? Math.abs(Math.sin(this.walkCycle)) * 2.5
          : Math.sin(t * 2) * 1.2;

        ctx.save();
        ctx.translate(this.x, this.y);

        // 수호자 신성 오오라 (발밑 회전 마법진 + 상체 후광 + 상승 빛입자)
        ctx.save();
        ctx.translate(0, 14);
        ctx.scale(auraScale, 0.44 * auraScale);

        const outerGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
        if (isAlert) {
          outerGrad.addColorStop(0, 'rgba(248, 113, 113, 0.45)');
          outerGrad.addColorStop(0.65, 'rgba(239, 68, 68, 0.22)');
          outerGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        } else {
          outerGrad.addColorStop(0, 'rgba(253, 224, 71, 0.42)');
          outerGrad.addColorStop(0.65, 'rgba(245, 158, 11, 0.18)');
          outerGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        }
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.rotate(t * 1.4);
        ctx.strokeStyle = isAlert ? 'rgba(252, 165, 165, 0.9)' : 'rgba(253, 224, 71, 0.85)';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([8, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, 23 + Math.sin(t * 3) * 1.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.rotate(-t * 2.2);
        ctx.strokeStyle = isAlert ? 'rgba(248, 113, 113, 0.7)' : 'rgba(251, 191, 36, 0.65)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, 16.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.restore();

        // 상체 신성 후광 링 및 상승 오오라 입자
        ctx.save();
        ctx.strokeStyle = isAlert ? 'rgba(248, 113, 113, 0.36)' : 'rgba(253, 224, 71, 0.34)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, -4 - bobY, 17 + Math.sin(t * 2.8) * 1.5, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < 4; i++) {
          const phase = (t * 0.85 + i * 0.25) % 1;
          const angle = i * (Math.PI * 0.5) + t * 1.6;
          const px = Math.cos(angle) * (13 + Math.sin(t * 2 + i) * 3);
          const py = 12 - phase * 34 - bobY;
          ctx.fillStyle = isAlert
            ? `rgba(252, 165, 165, ${(1 - phase) * 0.85})`
            : `rgba(254, 240, 138, ${(1 - phase) * 0.85})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.9 * (1 - phase * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.beginPath();
        ctx.ellipse(0, 15, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(0, -bobY);

        // 다리
        const legSwing = Math.sin(this.walkCycle) * 3.5;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-6, 9 + legSwing * 0.4, 4.5, 7);
        ctx.fillRect(1.5, 9 - legSwing * 0.4, 4.5, 7);

        // 붉은 수호 망토
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.moveTo(-7, -4);
        ctx.lineTo(-this.facing * 14, 14);
        ctx.lineTo(this.facing * 6, 14);
        ctx.lineTo(7, -4);
        ctx.closePath();
        ctx.fill();

        // 황금-백은 중갑 몸통
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-10, -5, 20, 17, 5);
        ctx.fill();
        ctx.stroke();

        // 투구 & 붉은 깃털 장식
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -12, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(-this.facing * 4, -21, 8, 3.5, -this.facing * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // 대검 참격 스윙
        ctx.save();
        ctx.translate(this.facing * 11, 1);
        const swingAng = this.attackAnimTimer > 0
          ? -0.9 + (1 - this.attackAnimTimer / 0.32) * 2.1
          : 0.35;
        ctx.rotate(this.facing * swingAng);
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-3, 2);
        ctx.lineTo(-2.5, -28);
        ctx.lineTo(0, -34);
        ctx.lineTo(2.5, -28);
        ctx.lineTo(3, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // 명판
        const guardLabel = `Lv.${this.level || 1} ${this.name}`;
        ctx.font = 'bold 10.5px sans-serif';
        const tw = ctx.measureText(guardLabel).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(-tw / 2 - 7, -37, tw + 14, 16, 5);
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(guardLabel, 0, -29);

        ctx.restore();
      }
    };

    // 마을 수호 마법 계열 경비병 NPC (마을 내부 순찰 · 원거리 마법 투사체로 카오스 -50 이하 헌터 제압)
    const ARCANE_TOWN_GUARD = {
      name: '🔮 아크메이지 수호자',
      level: 1,
      hp: 250000,
      maxHp: 250000,
      x: 240,
      y: -95,
      homeX: 240,
      homeY: -95,
      patrolPoints: [
        { x: 240, y: -95 },
        { x: -120, y: -95 },
        { x: -310, y: 18 },
        { x: -140, y: 120 },
        { x: 240, y: 120 },
        { x: 360, y: 18 }
      ],
      patrolIndex: 0,
      speed: 112,
      atk: 9500,
      detectRange: 360,
      attackRange: 170,
      attackCooldown: 0,
      attackAnimTimer: 0,
      facing: -1,
      walkCycle: 0,
      targetHunterId: null,
      speechTimer: 0,

      findChaosTargetInTown() {
        let bestTarget = null;
        let bestDist = this.detectRange;
        for (let i = 0; i < hunters.length; i++) {
          const h = hunters[i];
          if (!h || h.hp <= 0 || h.state === 'IN_DUNGEON') continue;
          const isInTown = h.x < TOWN_EAST_GATE.wallX - TOWN_EAST_GATE.wallHalfThick;
          const isChaos = (h.alignment || 0) <= -50;
          if (!isInTown || !isChaos) continue;
          const d = Math.hypot(h.x - this.x, h.y - this.y);
          if (d <= bestDist) {
            bestDist = d;
            bestTarget = h;
          }
        }
        return bestTarget;
      },

      update(dt) {
        if (this.attackAnimTimer > 0) {
          this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
        }
        if (this.attackCooldown > 0) {
          this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        }
        if (this.speechTimer > 0) {
          this.speechTimer = Math.max(0, this.speechTimer - dt);
        }

        // 오크 토벌전 진행 중에는 오크의 숲으로 동행 출정, 종료 후 마을 복귀
        if (handleGuardRaidDuty(this, dt, {
          slotAngle: -Math.PI * 0.5,
          isRanged: true,
          attackRange: this.attackRange,
          cooldown: 0.72,
          slashType: 'MAGIC_BURST',
          color: '#c084fc',
          popupColor: '#e879f9',
          label: '🔮'
        })) {
          return;
        }

        clampGuardInsideTown(this, 14);

        const target = this.findChaosTargetInTown();
        if (target) {
          if (this.targetHunterId !== target.id) {
            this.targetHunterId = target.id;
            if (this.speechTimer <= 0) {
              this.speechTimer = 3.0;
              interactionManager.spawnBubble(target, `🔮 마법 경비병 조준! (${target.alignment})`, '#e879f9');
              showToast(`🔮 마법 경비병 [${this.name}]이(가) 마을 내 카오스 헌터 '${target.name}'(${target.alignment})을(를) 마법으로 추적합니다!`);
            }
          }

          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const dist = Math.hypot(dx, dy);
          this.facing = dx >= 0 ? 1 : -1;

          if (dist > this.attackRange) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
            clampGuardInsideTown(this, 14);
            this.walkCycle += dt * 12;
          } else if (this.attackCooldown <= 0) {
            this.attackCooldown = 0.72;
            this.attackAnimTimer = 0.34;
            combatEffects.spawnMeleeSlash({
              x: this.x + this.facing * 14,
              y: this.y - 4,
              facing: this.facing,
              slashType: 'MAGIC_BURST',
              color: '#c084fc'
            });

            const rawDmg = this.atk;
            target.hp = Math.max(0, target.hp - rawDmg);
            combatEffects.spawnDamagePopup(target.x, target.y, rawDmg, true, '#e879f9');
            triggerChaosHunterCounterAttack(target, this);

            if (target.hp <= 0) {
              const prevAlign = getAlignmentInfo(target.alignment);
              const nextAlign = target.modifyAlignment(3);
              target.hp = Math.round(target.maxHp * 0.3);
              target.mp = Math.round(target.maxMp * 0.4);
              target.x = 595;
              target.y = TOWN_EAST_GATE.roadCenterY;
              target.waypoints = [];
              target.currentTargetHunter = null;
              target.currentTargetMonster = null;
              target.state = 'IDLE';
              target.stateTimer = 0.8;
              this.targetHunterId = null;

              interactionManager.spawnBubble(target, `⚖️ 마법 제압 · 인성 +3 (${nextAlign.value})`, '#86efac');
              refreshHunterPanel();
              if (document.getElementById('hunterRosterBackdrop')?.classList.contains('open')) {
                renderHunterRosterModal(false);
              }
              showToast(`🔮 마법 경비병이 카오스 헌터 '${target.name}'을(를) 제압했습니다! (인성 ${prevAlign.value} → ${nextAlign.value}, +3)`);
            }
          }
          return;
        }

        // 카오스 대상이 없을 때는 마을 내부 순찰 지점을 순서대로 순찰
        this.targetHunterId = null;
        const wp = this.patrolPoints[this.patrolIndex % this.patrolPoints.length] || { x: this.homeX, y: this.homeY };
        const hdx = wp.x - this.x;
        const hdy = wp.y - this.y;
        const hdist = Math.hypot(hdx, hdy);
        if (hdist > 6) {
          this.facing = hdx >= 0 ? 1 : -1;
          this.x += (hdx / hdist) * (this.speed * 0.65) * dt;
          this.y += (hdy / hdist) * (this.speed * 0.65) * dt;
          clampGuardInsideTown(this, 14);
          this.walkCycle += dt * 8.5;
        } else {
          this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
        }
      },

      draw(ctx) {
        const t = performance.now() * 0.0035;
        const lv = this.level || 1;
        const auraScale = 1 + Math.min(0.45, (lv - 1) * 0.005);
        const isAlert = Boolean(this.targetHunterId) || Boolean(this.raidActive) || Boolean(this.raidStaging) || Boolean(this.raidReturning);
        const wp = this.patrolPoints[this.patrolIndex % this.patrolPoints.length] || { x: this.homeX, y: this.homeY };
        const bobY = Math.hypot(wp.x - this.x, wp.y - this.y) > 6 || isAlert
          ? Math.abs(Math.sin(this.walkCycle)) * 2.2
          : Math.sin(t * 2.2) * 1.5;

        ctx.save();
        ctx.translate(this.x, this.y);

        // 마법 수호자 아스트랄 오오라 (비전 회전 룬 마법진 + 공전 마력 구체 + 상승 오오라 입자)
        ctx.save();
        ctx.translate(0, 14);
        ctx.scale(auraScale, 0.44 * auraScale);

        const outerGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 31);
        if (isAlert) {
          outerGrad.addColorStop(0, 'rgba(244, 114, 182, 0.46)');
          outerGrad.addColorStop(0.65, 'rgba(217, 70, 239, 0.24)');
          outerGrad.addColorStop(1, 'rgba(217, 70, 239, 0)');
        } else {
          outerGrad.addColorStop(0, 'rgba(192, 132, 252, 0.44)');
          outerGrad.addColorStop(0.65, 'rgba(124, 58, 237, 0.2)');
          outerGrad.addColorStop(1, 'rgba(124, 58, 237, 0)');
        }
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 31, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.rotate(-t * 1.6);
        ctx.strokeStyle = isAlert ? 'rgba(240, 171, 252, 0.92)' : 'rgba(192, 132, 252, 0.85)';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([7, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 23 + Math.sin(t * 3.2) * 1.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 내측 회전 사각 룬 프레임
        ctx.save();
        ctx.rotate(t * 2.1);
        ctx.strokeStyle = isAlert ? 'rgba(232, 121, 249, 0.78)' : 'rgba(129, 140, 248, 0.72)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-12, -12, 24, 24);
        ctx.restore();
        ctx.restore();

        // 상체 공전 비전 위습 및 상승 마력 입자
        ctx.save();
        for (let i = 0; i < 2; i++) {
          const orbAng = t * 3.1 + i * Math.PI;
          const ox = Math.cos(orbAng) * 16;
          const oy = -5 - bobY + Math.sin(orbAng) * 5;
          ctx.fillStyle = isAlert ? '#f472b6' : '#c084fc';
          ctx.shadowColor = isAlert ? '#e879f9' : '#a855f7';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        for (let i = 0; i < 4; i++) {
          const phase = (t * 0.9 + i * 0.25) % 1;
          const angle = -i * (Math.PI * 0.5) - t * 1.8;
          const px = Math.cos(angle) * (13 + Math.cos(t * 2.2 + i) * 3);
          const py = 12 - phase * 35 - bobY;
          ctx.fillStyle = isAlert
            ? `rgba(244, 114, 182, ${(1 - phase) * 0.88})`
            : `rgba(216, 180, 254, ${(1 - phase) * 0.88})`;
          ctx.beginPath();
          ctx.arc(px, py, 2 * (1 - phase * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 15, 13.5, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(0, -bobY);

        // 다리
        const legSwing = Math.sin(this.walkCycle) * 3;
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(-5.5, 9 + legSwing * 0.35, 4, 7);
        ctx.fillRect(1.5, 9 - legSwing * 0.35, 4, 7);

        // 아크메이지 로브 & 망토
        ctx.fillStyle = '#581c87';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(-10, -5, 20, 17, 6);
        ctx.fill();
        ctx.stroke();

        // 머리 & 마법사 모자/후드
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(0, -11, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#6b21a8';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-11, -13);
        ctx.lineTo(0, -27);
        ctx.lineTo(11, -13);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 마법 지팡이 & 부유 수정 오브
        ctx.save();
        ctx.translate(this.facing * 11, 1);
        const castLift = this.attackAnimTimer > 0 ? -0.35 : 0.12;
        ctx.rotate(this.facing * castLift);
        ctx.strokeStyle = '#e9d5ff';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(0, 11);
        ctx.lineTo(0, -20);
        ctx.stroke();

        ctx.fillStyle = '#e879f9';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, -23, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        // 명판
        const guardLabel = `Lv.${this.level || 1} ${this.name}`;
        ctx.font = 'bold 10.5px sans-serif';
        const tw = ctx.measureText(guardLabel).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(-tw / 2 - 7, -40, tw + 14, 16, 5);
        ctx.fill();
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.fillStyle = '#e9d5ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(guardLabel, 0, -32);

        ctx.restore();
      }
    };
