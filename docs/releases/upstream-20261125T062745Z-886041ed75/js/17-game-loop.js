// [17-game-loop] 게임 루프 (시뮬레이션 스텝 · 백그라운드 진행 · 렌더 루프)
    let lastTimestamp = performance.now();
    let lastWallClockMs = Date.now();
    let uiSyncTimer = 0;
    let gameStarted = false;
    let bgTickTimer = null;

    // 모바일·PC에서 화면 전환/백그라운드 진입 및 복귀 시 경과 시간을 감지해 시뮬레이션 반영
    function advanceSimulationByElapsedSeconds(totalElapsedSec, maxCapSec = 600) {
      if (!gameStarted || !Number.isFinite(totalElapsedSec) || totalElapsedSec <= 0.05) return;
      const clampedElapsed = Math.min(maxCapSec, totalElapsedSec);
      const stepSize = 0.05;
      let rem = clampedElapsed;
      while (rem > 0.0001) {
        const slice = Math.min(stepSize, rem);
        stepSimulation(slice);
        rem -= slice;
      }
      updateResourceHUD();
      updateBossRaidHudButton();
      refreshHunterPanel();
      refreshDungeonExplorerPanel();
    }

    function syncElapsedTimeFromWallClock() {
      const nowWall = Date.now();
      const nowPerf = performance.now();
      const wallElapsedSec = Math.max(0, (nowWall - lastWallClockMs) / 1000);
      lastWallClockMs = nowWall;
      lastTimestamp = nowPerf;
      if (wallElapsedSec > 0.25) {
        advanceSimulationByElapsedSeconds(wallElapsedSec, 600);
        if (wallElapsedSec > 600) window.grantOfflineRewardsForSeconds?.(wallElapsedSec - 600, 'background');
      }
    }

    // 창 최소화·백그라운드 전환 시에도 rAF 중단과 무관하게 실제 경과 시간(dt)만큼 시뮬레이션 진행
    function stepSimulation(dt) {
      updateRaidFormation(dt);
      // [오크 토벌전 90초 준비(1분 정비 + 30초 오크의 숲 입구 소집 대기) 및 오크의 숲 일제 진격 전환]
      if (ORC_SUBJUGATION.status === 'PREPARING') {
        const prevPrep = ORC_SUBJUGATION.prepTimer || 0;
        const nextPrep = Math.max(0, prevPrep - dt);
        ORC_SUBJUGATION.prepTimer = nextPrep;

        // 1분(60초) 정비 종료 후 남은 30초 소집 대기 진입 시 헌터들을 [오크의 숲] 입구로 소집
        if (prevPrep > 30 && nextPrep <= 30) {
          clearOrcForestMonstersForRaid();
          hunters.forEach((h) => {
            if (!h || h.hp <= 0 || ORC_SUBJUGATION.fallenHunterIds.has(h.id)) return;
            h.waypoints = [];
            h.targetBuildingName = '오크의 숲 입구 출격 대기지 (30초 소집)';
            h.targetBuildingType = 'orc_subjugation_standby';
            h.targetGroundId = null;
            h.state = 'WALKING';
            const musterPos = getRaidMusterPosition(h);
            h.setDestinationWithGatePath(musterPos.x, musterPos.y);
            interactionManager.spawnBubble(h, '🛑 1분 정비 완료! 오크의 숲 입구 30초 소집!', '#fde047');
          });
          showToast('🛑 1분 마을 정비 완료! 30초간 [오크의 숲] 입구로 소집 대기 후 오크의 숲으로 일제히 진격합니다.');
        }

        updateBossRaidHudButton();
        if (ORC_SUBJUGATION.prepTimer <= 0) {
          launchOrcSubjugationBattle();
        }
      } else if (ORC_SUBJUGATION.status === 'ACTIVE') {
        const remainingSubjHunters = getRaidRemainingFighters();
        const lordUnit = ORC_STRONGHOLD_ZONE.orcs.find(o => isOrcLordUnit(o));
        if (remainingSubjHunters === 0) {
          endOrcSubjugationRaid(false, '참가 헌터·경비병 전원 전사');
          return;
        }
        if (!lordUnit || lordUnit.isDead || lordUnit.hp <= 0) {
          endOrcSubjugationRaid(true, '오크 로드 토벌 성공');
          return;
        }
      }

      // [보스 레이드 정비 카운트다운 및 보스전 진행/재생/반격 처리]
      if (BOSS_SANCTUM.status === 'PREPARING') {
        BOSS_SANCTUM.prepTimer = Math.max(0, (BOSS_SANCTUM.prepTimer || 0) - dt);
        updateBossRaidHudButton();

        if (BOSS_SANCTUM.prepTimer <= 0) {
          BOSS_SANCTUM.status = 'ACTIVE';
          BOSS_SANCTUM.prepTimer = 0;
          BOSS_SANCTUM.raidTimer = BOSS_SANCTUM.raidDuration;
          updateBossRaidHudButton();

          const cfg = getBossStageConfig(BOSS_SANCTUM.bossStage);
          showToast(`🔥 60초 정비 완료! [${cfg.theme.title}] 보스 성소 결계가 개방되었습니다!`);

          hunters.forEach((h) => {
            if (!h || h.hp <= 0) return;
            if (BOSS_SANCTUM.fallenHunterIds.has(h.id)) return;
            if (h.state === 'REBIRTH_ALTAR_HUNT') return;

            const onSky = h.activeGroundId === SKY_ISLAND_GROUND.id || h.skyIslandPortalWarp === true || (
              h.x >= SKY_ISLAND_GROUND.bounds.x - 20 &&
              h.x <= SKY_ISLAND_GROUND.bounds.x + SKY_ISLAND_GROUND.bounds.w + 20 &&
              h.y >= SKY_ISLAND_GROUND.bounds.y - 20 &&
              h.y <= SKY_ISLAND_GROUND.bounds.y + SKY_ISLAND_GROUND.bounds.h + 20
            );
            if (onSky) {
              teleportHunterFromSkyIslandToTown(h, '✨ 보스전 돌격! 마을로 순간 이동!');
            }

            h.activeGroundId = null;
            h.targetGroundId = null;
            h.targetBuildingName = BOSS_SANCTUM.name;
            h.targetBuildingType = BOSS_SANCTUM.id;
            h.currentTargetMonster = BOSS_SANCTUM.boss;
            h.currentTargetHunter = null;
            h.state = 'BOSS_RAID';
            h.setDestinationWithGatePath(
              BOSS_SANCTUM.boss.x + (Math.random() - 0.5) * 44,
              BOSS_SANCTUM.boss.y + 32 + (Math.random() - 0.5) * 16
            );
            interactionManager.spawnBubble(h, '⚔️ 보스 성소로 총공격!', '#fda4af');
          });
        }
      } else if (BOSS_SANCTUM.status === 'ACTIVE') {
        const boss = BOSS_SANCTUM.boss;
        const activeRaiders = hunters.filter(
          h => h && h.hp > 0 && !BOSS_SANCTUM.fallenHunterIds.has(h.id) && h.state !== 'REBIRTH_ALTAR_HUNT'
        );

        BOSS_SANCTUM.raidTimer = Math.max(0, (BOSS_SANCTUM.raidTimer ?? BOSS_SANCTUM.raidDuration) - dt);
        if (BOSS_SANCTUM.raidTimer <= 0) {
          failBossRaidAndReset('제한시간 3분 초과');
          return;
        }

        if (activeRaiders.length === 0) {
          failBossRaidAndReset('참가 헌터 전원 전투 불능');
        } else if (boss && boss.hp > 0) {
          // 보스 초당 체력 재생 및 근접 광역 반격
          if (boss.regenPerSec > 0 && boss.hp < boss.maxHp) {
            boss.hp = Math.min(boss.maxHp, boss.hp + boss.regenPerSec * dt);
          }
          if (boss.attackAnimTimer > 0) {
            boss.attackAnimTimer = Math.max(0, boss.attackAnimTimer - dt);
          }

          boss.attackCooldown = (boss.attackCooldown || 0) - dt;
          const engagedRaidersAll = activeRaiders.filter(
            h => h.state === 'BOSS_RAID' && Math.hypot(h.x - boss.x, h.y - boss.y) <= (boss.range || 152)
          );
          const currentBossStage = boss.stage || BOSS_SANCTUM.bossStage;
          const maxSimultaneousTargets = currentBossStage >= 7
            ? (3 + (currentBossStage - 6))
            : engagedRaidersAll.length;
          const engagedRaiders = engagedRaidersAll.slice(0, maxSimultaneousTargets);

          if (engagedRaiders.length > 0 && boss.attackCooldown <= 0) {
            boss.attackCooldown = 1.65;
            boss.attackAnimTimer = 0.45;
            engagedRaiders.forEach((raider) => {
              const rStats = raider.getComputedStats();
              const takenDmg = Math.max(18, Math.round((boss.atk || 169) - rStats.def * 0.35));
              raider.hp = Math.max(0, raider.hp - takenDmg);
              combatEffects.spawnDamagePopup(raider.x, raider.y, takenDmg, false, '#fda4af');

              if (raider.hp <= 0) {
                raider.hp = Math.round(raider.maxHp * 0.25);
                raider.x = 0;
                raider.y = 20;
                raider.waypoints = [];
                raider.currentTargetMonster = null;
                raider.state = 'IDLE';
                raider.stateTimer = 0.8;
                BOSS_SANCTUM.fallenHunterIds.add(raider.id);
                interactionManager.spawnBubble(raider, '💫 보스전 부상 후퇴!', '#fca5a5');
              }
            });
          }
          updateBossRaidHudButton();
        }
      }

      // [초월 환생의 제단 최상급 중간보스 리스폰 및 교전 반격]
      const rbBoss = REBIRTH_ALTAR.boss;
      if (rbBoss) {
        if (rbBoss.attackAnimTimer > 0) {
          rbBoss.attackAnimTimer = Math.max(0, rbBoss.attackAnimTimer - dt);
        }
        if (rbBoss.hp <= 0) {
          if ((rbBoss.respawn || 0) > 0) {
            rbBoss.respawn -= dt;
            if (rbBoss.respawn <= 0) {
              resetRebirthAltarBoss(true);
            }
          }
        } else {
          rbBoss.attackCooldown = (rbBoss.attackCooldown || 0) - dt;
          const altarChallengers = hunters.filter(
            h => h.state === 'REBIRTH_ALTAR_HUNT' && h.hp > 0 && Math.hypot(h.x - rbBoss.x, h.y - rbBoss.y) <= rbBoss.range + 42
          );
          if (altarChallengers.length > 0 && rbBoss.attackCooldown <= 0) {
            rbBoss.attackCooldown = 1.2;
            rbBoss.attackAnimTimer = 0.35;
            altarChallengers.forEach((challenger) => {
              const cStats = challenger.getComputedStats();
              const taken = Math.max(24, Math.round((rbBoss.atk || 265) - cStats.def * 0.32));
              challenger.hp = Math.max(1, challenger.hp - taken);
              combatEffects.spawnDamagePopup(challenger.x, challenger.y, taken, false, '#f472b6');
            });
          }
        }
      }

      // 사냥터 헌터 수(일반 최대 5명, 환생 전용 사냥터 최대 8명) 체크 후 몬스터 수 동적 증감 및 리스폰 타이머 갱신
      ALL_FIELD_GROUNDS.forEach((hg) => {
        const scaling = getHuntingGroundScaling(hg, hunters);

        // 4. 토벌전 중 몬스터 미소환
        if (!isOrcSubjugationInProgress()) {
          // 헌터/오크 수 증가 시 최대 몬스터 수까지 추가 스폰 (0.1% 확률로 중간 보스 등장 판정)
          while (hg.monsters.length < scaling.targetMonsterCount) {
            const spawned = createGroundMonster(hg, hg.monsters.length, true);
            spawned.respawn = 0;
            hg.monsters.push(spawned);
          }
        }

        // 헌터/오크가 빠져나가면 처치된(hp <= 0) 몬스터 초과 슬롯부터 정리
        if (hg.monsters.length > scaling.targetMonsterCount) {
          const deadIdx = hg.monsters.findIndex(m => m.hp <= 0);
          if (deadIdx !== -1) {
            hg.monsters.splice(deadIdx, 1);
          } else if (hg.id === 'top_field_70_99') {
            // 최상급 사냥터에 헌터/오크가 줄어들어 살아있는 몬스터가 목표치를 초과하면 주기적으로 초과 개체 디스폰
            hg.despawnTimer = (hg.despawnTimer || 0) + dt;
            if (hg.despawnTimer >= 2.6) {
              hg.despawnTimer = 0;

              const activeCombatants = [
                ...hunters.filter(h => h && h.hp > 0 && h.state === 'HUNTING_FIELD' && h.activeGroundId === hg.id),
                ...(typeof ORC_STRONGHOLD_ZONE !== 'undefined' && Array.isArray(ORC_STRONGHOLD_ZONE.orcs)
                  ? ORC_STRONGHOLD_ZONE.orcs.filter(o => o && !o.isDead && (o.hp || 0) > 0 && (o.x < ORC_STRONGHOLD_ZONE.bounds.x || o.aiMode === 'SORTIE'))
                  : [])
              ];

              // 비전투(provoked === false) 및 생존 헌터·오크로부터 가장 먼 몬스터 우선 선택 (팝업 선택 몬스터 보호)
              let candidateIdx = -1;
              let bestScore = -Infinity;
              for (let i = hg.monsters.length - 1; i >= 0; i--) {
                const cand = hg.monsters[i];
                if (!cand || cand.hp <= 0) continue;
                if (gameState.selectedMonsterRef === cand) continue;

                const isEngaged = Boolean(
                  cand.provoked ||
                  hunters.some(h => h && h.currentTargetMonster === cand) ||
                  (typeof ORC_STRONGHOLD_ZONE !== 'undefined' && ORC_STRONGHOLD_ZONE.orcs.some(o => o && o.currentTarget === cand))
                );

                let minDistToCombatant = 9999;
                for (let c = 0; c < activeCombatants.length; c++) {
                  const unit = activeCombatants[c];
                  const d = Math.hypot(cand.x - unit.x, cand.y - unit.y);
                  if (d < minDistToCombatant) minDistToCombatant = d;
                }

                // 비전투 개체(+10000 가중치) 및 멀리 떨어진 개체 우선 디스폰 (중간 보스는 일반 몬스터보다 후순위)
                const score = (isEngaged ? 0 : 10000) + minDistToCombatant - (cand.isFieldMiniBoss ? 5000 : 0);
                if (score > bestScore) {
                  bestScore = score;
                  candidateIdx = i;
                }
              }

              if (candidateIdx !== -1) {
                const [removedMon] = hg.monsters.splice(candidateIdx, 1);
                if (removedMon) {
                  hunters.forEach(h => {
                    if (h && h.currentTargetMonster === removedMon) h.currentTargetMonster = null;
                  });
                  if (typeof ORC_STRONGHOLD_ZONE !== 'undefined' && Array.isArray(ORC_STRONGHOLD_ZONE.orcs)) {
                    ORC_STRONGHOLD_ZONE.orcs.forEach(o => {
                      if (o && o.currentTarget === removedMon) o.currentTarget = null;
                    });
                  }
                }
              }
            }
          }
        } else if (hg.id === 'top_field_70_99') {
          hg.despawnTimer = 0;
        }

        hg.monsters.forEach((m, mIdx) => {
          if (m.hp <= 0) {
            // 4. 토벌전 중 몬스터 미소환 (리스폰 차단)
            if (isOrcSubjugationInProgress()) {
              return;
            }
            if ((m.respawn || 0) <= 0) {
              m.respawn = scaling.respawnDelay;
            }
            m.respawn -= dt;
            if (m.respawn <= 0) {
              // 리젠 시 일반 몬스터로 복귀하며 0.1% 확률로 중간 보스 등장 판정
              const respawned = createGroundMonster(hg, mIdx, true);
              hg.monsters[mIdx] = respawned;
            }
          } else if (m.hp > 0) {
            // 천공의 섬(sky_island_field) 몬스터가 영역 밖에 위치해 있을 경우 천공의 섬 내부 좌표로 즉시 복귀
            if (hg.id === SKY_ISLAND_GROUND.id || hg.id === CELESTIAL_PALACE_GROUND.id) {
              const b = hg.bounds;
              const isOutsideSky = (
                m.x < b.x + 40 ||
                m.x > b.x + b.w - 40 ||
                m.y < b.y + 76 ||
                m.y > b.y + b.h - 24
              );
              if (isOutsideSky) {
                const safeX = b.x + 75 + Math.random() * (b.w - 150);
                const safeY = b.y + 92 + Math.random() * (b.h - 120);
                m.x = safeX;
                m.y = safeY;
                m.spawnX = safeX;
                m.spawnY = safeY;
                m.wanderX = safeX;
                m.wanderY = safeY;
                m.provoked = false;
                m.aggroTargetId = null;
              }
            }

            // 중급 사냥터(mid_field_20_40) 이상 구역은 근처 헌터를 발견 시 먼저 선공
            const isAggressiveZone = hg.id !== 'beginner_field';
            if (isAggressiveZone && !m.provoked) {
              const aggroRange = m.isRanged ? Math.max(165, (m.range || 156) + 20) : 135;
              let nearestHunter = null;
              let nearestDist = aggroRange;
              for (let i = 0; i < hunters.length; i++) {
                const h = hunters[i];
                if (!h || h.hp <= 0) continue;
                if (h.state !== 'HUNTING_FIELD' || h.activeGroundId !== hg.id) continue;
                const d = Math.hypot(h.x - m.x, h.y - m.y);
                if (d <= nearestDist) {
                  nearestDist = d;
                  nearestHunter = h;
                }
              }
              let nearestOrc = null;
              if (hg.id === 'top_field_70_99' && typeof ORC_STRONGHOLD_ZONE !== 'undefined') {
                for (let i = 0; i < ORC_STRONGHOLD_ZONE.orcs.length; i++) {
                  const o = ORC_STRONGHOLD_ZONE.orcs[i];
                  if (!o || o.isDead || o.hp <= 0 || o.aiMode !== 'SORTIE') continue;
                  const d = Math.hypot(o.x - m.x, o.y - m.y);
                  if (d <= nearestDist) {
                    nearestDist = d;
                    nearestOrc = o;
                    nearestHunter = null;
                  }
                }
              }
              if (nearestOrc) {
                m.provoked = true;
                m.aggroTargetId = null;
                m.aggroOrcId = nearestOrc.id;
              } else if (nearestHunter) {
                m.provoked = true;
                m.aggroOrcId = null;
                m.aggroTargetId = nearestHunter.id;
                if (!nearestHunter.currentTargetMonster || nearestHunter.currentTargetMonster.hp <= 0) {
                  nearestHunter.currentTargetMonster = m;
                }
              }
            }

            // 살아있는 몬스터 이동 및 공격 로직: 선공/피격 어그로 대상(헌터 또는 출정 오크) 추적·공격, 그 외에는 배회
            const aggroTarget = m.provoked
              ? hunters.find(h => h.id === m.aggroTargetId && h.state === 'HUNTING_FIELD' && h.hp > 0)
              : null;
            const aggroOrc = (!aggroTarget && m.provoked && m.aggroOrcId && hg.id === 'top_field_70_99')
              ? ORC_STRONGHOLD_ZONE.orcs.find(o => o && o.id === m.aggroOrcId && !o.isDead && o.hp > 0 && o.aiMode === 'SORTIE')
              : null;

            if (aggroTarget) {
              const prevMonX = m.x;
              const dx = aggroTarget.x - m.x;
              const dy = aggroTarget.y - m.y;
              const dist = Math.hypot(dx, dy);
              if (Math.abs(dx) > 0.5) m.facing = dx >= 0 ? 1 : -1;
              const stopDist = m.isRanged ? (m.range || 148) : 24;
              if (dist > stopDist) {
                m.x += (dx / dist) * 38 * dt;
                m.y += (dy / dist) * 38 * dt;
                m.walkCycle = (m.walkCycle || 0) + dt * 10;
                if (hg.id === 'top_field_70_99') enforceOrcPassageMovement(m, prevMonX, 12);
              } else if (m.isRanged) {
                // 원거리 몬스터(숲 고블린궁수 / 마력 오크사수): 사거리 내 헌터에게 투사체 발사
                m.attackCooldown = (m.attackCooldown || 0) - dt;
                if (m.attackCooldown <= 0) {
                  m.attackCooldown = 1.25;
                  combatEffects.spawnProjectile({
                    isMonsterProj: true,
                    target: aggroTarget,
                    x: m.x,
                    y: m.y - 4,
                    speed: 310,
                    projType: m.kind === 'doppelganger' ? (m.doppelJob === '소서러' ? 'MAGIC_ORB' : 'ARROW') : 'GOBLIN_ARROW',
                    color: m.kind === 'doppelganger' ? '#e5e7eb' : (m.kind === 'manaorc' ? '#d8b4fe' : '#a3e635'),
                    dmg: m.atk || 62
                  });
                }
              } else {
                // 근접 선공 몬스터(철갑 골렘 / 그림자 늑대 등): 사거리 내 진입 시 직접 근접 공격
                m.attackCooldown = (m.attackCooldown || 0) - dt;
                if (m.attackCooldown <= 0) {
                  m.attackCooldown = 1.15;
                  const stats = aggroTarget.getComputedStats();
                  const takenDmg = Math.max(10, Math.round((m.atk || 50) * 0.85 - stats.def * 0.22));
                  aggroTarget.hp = Math.max(1, aggroTarget.hp - takenDmg);
                  combatEffects.spawnDamagePopup(aggroTarget.x, aggroTarget.y, takenDmg, false, '#fca5a5');
                }
              }
            } else if (aggroOrc) {
              const prevMonX = m.x;
              const dx = aggroOrc.x - m.x;
              const dy = aggroOrc.y - m.y;
              const dist = Math.hypot(dx, dy);
              if (Math.abs(dx) > 0.5) m.facing = dx >= 0 ? 1 : -1;
              const stopDist = m.isRanged ? (m.range || 168) : 28;
              if (dist > stopDist) {
                m.x += (dx / dist) * 38 * dt;
                m.y += (dy / dist) * 38 * dt;
                m.walkCycle = (m.walkCycle || 0) + dt * 10;
                if (hg.id === 'top_field_70_99') enforceOrcPassageMovement(m, prevMonX, 12);
              } else if (m.isRanged) {
                m.attackCooldown = (m.attackCooldown || 0) - dt;
                if (m.attackCooldown <= 0) {
                  m.attackCooldown = 1.25;
                  combatEffects.spawnProjectile({
                    isMonsterProj: true,
                    isOrcTarget: true,
                    target: aggroOrc,
                    x: m.x,
                    y: m.y - 4,
                    speed: 310,
                    projType: 'MAGIC_ORB',
                    color: '#d8b4fe',
                    dmg: m.atk || 480
                  });
                }
              } else {
                m.attackCooldown = (m.attackCooldown || 0) - dt;
                if (m.attackCooldown <= 0) {
                  m.attackCooldown = 1.15;
                  const oStats = getOrcCombatStats(aggroOrc);
                  const takenDmg = Math.max(12, Math.round((m.atk || 440) * 0.85 - oStats.def * 0.22));
                  aggroOrc.hp = Math.max(0, aggroOrc.hp - takenDmg);
                  combatEffects.spawnDamagePopup(aggroOrc.x, aggroOrc.y - 10, takenDmg, false, '#fca5a5');
                  if (aggroOrc.hp <= 0) {
                    killOrcUnit(aggroOrc);
                    m.provoked = false;
                    m.aggroOrcId = null;
                  }
                }
              }
            } else {
              const prevMonX = m.x;
              m.provoked = false;
              m.aggroTargetId = null;
              m.aggroOrcId = null;
              m.wanderTimer = (m.wanderTimer || 0) - dt;
              const dx = (m.wanderX ?? m.x) - m.x;
              const dy = (m.wanderY ?? m.y) - m.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 4) {
                if (Math.abs(dx) > 0.5) m.facing = dx >= 0 ? 1 : -1;
                m.x += (dx / dist) * 20 * dt;
                m.y += (dy / dist) * 20 * dt;
                m.walkCycle = (m.walkCycle || 0) + dt * 7;
                if (hg.id === 'top_field_70_99') enforceOrcPassageMovement(m, prevMonX, 12);
              } else if (m.wanderTimer <= 0) {
                m.wanderTimer = 1.6 + Math.random() * 2.8;
                const pad = 55;
                m.wanderX = Math.max(hg.bounds.x + pad, Math.min(hg.bounds.x + hg.bounds.w - pad, m.spawnX + (Math.random() - 0.5) * 180));
                m.wanderY = Math.max(hg.bounds.y + 85, Math.min(hg.bounds.y + hg.bounds.h - pad, m.spawnY + (Math.random() - 0.5) * 180));
              }
            }
            enforceTownWallCollision(m, 12);
          }
        });
      });

      hunters.forEach(h => h.update(dt));
      updateOrcStrongholdUnits(dt);
      SUPREME_TOWN_GUARD.update(dt);
      ARCANE_TOWN_GUARD.update(dt);

      // [3환생 이상 헌터 천공의 섬 게이트 출정 유도]
      if (BOSS_SANCTUM.status === 'CLOSED') {
        const hasSkyGate = village.getAllBuildings().some(b => b.type === 'sky_island_gate');
        if (hasSkyGate) {
          for (let i = 0; i < hunters.length; i++) {
            const h = hunters[i];
            if (!h || h.hp <= 0) continue;
            if ((h.rebirthCount || 0) < SKY_ISLAND_GROUND.minRebirth) continue;
            if (h.activeGroundId === SKY_ISLAND_GROUND.id) continue;
            if (h.targetBuildingType === 'sky_island_portal') continue;
            if (h.state === 'IN_DUNGEON' || h.state === 'REBIRTH_ALTAR_HUNT') continue;
            if (!h.postSkyTownActionDone) continue;
            const isHealthyForGate = h.hp >= h.maxHp * 0.45 && h.fatigue < 78;
            if (!isHealthyForGate) continue;
            if (h.state === 'IDLE' || (h.state === 'HUNTING_FIELD' && Math.random() < dt * 0.35)) {
              sendRebirthHunterToSkyIslandGate(h);
            }
          }
        }
      }

      combatEffects.update(dt);
      interactionManager.update(dt, hunters, 'SAFE_TOWN');
    }

    function startBackgroundSimulationLoop() {
      if (bgTickTimer !== null) return;
      lastWallClockMs = Date.now();
      bgTickTimer = setInterval(() => {
        if (!gameStarted) return;
        const now = performance.now();
        const nowWall = Date.now();
        const perfElapsed = Math.max(0, (now - lastTimestamp) / 1000);
        const wallElapsed = Math.max(0, (nowWall - lastWallClockMs) / 1000);
        const elapsed = Math.max(perfElapsed, wallElapsed);
        // 창 최소화/백그라운드 상태에서 rAF가 멈춰 있을 때만 0.05초 단위 서브스텝으로 시뮬레이션 보정 진행
        if (document.hidden || elapsed > 0.25) {
          lastTimestamp = now;
          lastWallClockMs = nowWall;
          advanceSimulationByElapsedSeconds(elapsed, 600);
          // 10분을 넘게 백그라운드에 있었으면 나머지 시간은 자리 비운 동안 보상으로 지급
          if (elapsed > 600) window.grantOfflineRewardsForSeconds?.(elapsed - 600, 'background');
        } else {
          lastWallClockMs = nowWall;
        }
      }, 200);
    }

    window.addEventListener('focus', () => {
      syncElapsedTimeFromWallClock();
    });
    window.addEventListener('pageshow', () => {
      syncElapsedTimeFromWallClock();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        lastWallClockMs = Date.now();
        flushSyncBackup();
      } else if (document.visibilityState === 'visible') {
        syncElapsedTimeFromWallClock();
      }
    });

    window.finishGameLoading = function (statusMessage = '준비 완료!') {
      if (gameStarted) return;
      gameStarted = true;

      const barEl = document.getElementById('loadingBarFill');
      const statusEl = document.getElementById('loadingStatusText');
      const screenEl = document.getElementById('loadingScreen');

      if (barEl) barEl.style.width = '100%';
      if (statusEl) statusEl.textContent = statusMessage;

      lastTimestamp = performance.now();
      lastWallClockMs = Date.now();
      startBackgroundSimulationLoop();
      requestAnimationFrame(renderLoop);

      setTimeout(() => {
        if (screenEl) screenEl.classList.add('fade-out');
      }, 260);

      // 화면이 열린 시점부터 10초 뒤 좌측 상단 HUD 자동 숨김 처리
      setTimeout(() => {
        const hudEl = document.getElementById('hudInfo');
        if (hudEl) hudEl.classList.add('hidden-fade');
      }, 10260);
    };

    // 네트워크 지연 시에도 2.5초 후에는 안전하게 게임 화면 오픈
    setTimeout(() => {
      window.finishGameLoading?.('마을에 입장합니다...');
    }, 2500);

    function renderLoop(now = performance.now()) {
      try {
        const dt = Math.min(0.05, Math.max(0, (now - lastTimestamp) / 1000));
        lastTimestamp = now;
        lastWallClockMs = Date.now();

        stepSimulation(dt);

        // 추적 모드 활성화 시 선택된 헌터 위치로 카메라 부드럽게 이동
        if (gameState.followSelectedHunter && gameState.selectedHunterId) {
          const targetHunter = interactionManager.hunterIndex.get(gameState.selectedHunterId);
          if (targetHunter && targetHunter.state !== 'IN_DUNGEON') {
            camera.targetX = targetHunter.x;
            camera.targetY = targetHunter.y;
            camera._clampTargetBounds();
          }
        }

        camera.update();

        const ctx = camera.ctx;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        camera.beginFrame();
        updateWorldViewRect(camera); // 화면에 보이는 범위 (화면 밖 그리기 생략용 · 01-core-utils.js)

        // 1. 마을 지형 및 동적 지선 도로
        drawVillageGround(ctx);

        // 2. 나무/가로등 장식
        drawProps(ctx);
        SUPREME_TOWN_GUARD.draw(ctx);
        ARCANE_TOWN_GUARD.draw(ctx);

        // 3. 부지(빈 터 + 건물)와 헌터들을 Y좌표(깊이) 순으로 통합 정렬 렌더링
        const renderables = [
          ...village.plots.map(p => ({ kind: 'plot', y: p.y, data: p })),
          ...hunters.filter(h => h.state !== 'IN_DUNGEON').map(h => ({ kind: 'hunter', y: h.y, data: h })),
          ...(typeof getKingdomRenderables === 'function' ? getKingdomRenderables() : []) // 👑 왕국 병력 (js/34-kingdom.js)
        ].sort((a, b) => a.y - b.y);

        renderables.forEach((item) => {
          if (item.kind === 'plot') {
            const plot = item.data;
            const isSelected = plot.id === gameState.selectedPlotId;
            if (plot.building) {
              drawBuilding(ctx, plot.building, isSelected);
            } else {
              drawEmptyPlot(ctx, plot, isSelected);
            }
          } else if (item.kind === 'kingdom_unit') {
            drawKingdomUnit(ctx, item.data);
          } else {
            drawHunterWithWeapon(ctx, item.data);
          }
        });

        // 헌터 간 상호작용 말풍선 오버레이
        interactionManager.drawBubbles(ctx);

        // 근접 참격, 원거리 투사체 및 타격 데미지 팝업 렌더링
        combatEffects.draw(ctx);

        camera.endFrame();

        // 100명+ 대규모 헌터 운용 시 DOM 재렌더링 과부하 방지를 위해 0.25초 주기로 UI 패널 동기화
        uiSyncTimer += dt;
        if (uiSyncTimer >= 0.25) {
          uiSyncTimer = 0;
          refreshDungeonExplorerPanel();
          refreshHunterPanel();
          refreshMonsterPopup();
          if (document.getElementById('hunterRosterBackdrop')?.classList.contains('open')) {
            renderHunterRosterModal(false);
          }
        }

        if (debugText) {
          debugText.innerHTML = `
            뷰포트: ${Math.round(camera.viewportWidth)} × ${Math.round(camera.viewportHeight)} | 배율: <b>${camera.effectiveZoom.toFixed(2)}x</b><br/>
            +10강(청색 마력) 및 +15강(황금 화염) 무기를 착용한 헌터들이 마을을 순찰합니다.
          `;
        }
      } catch (err) {
        console.error('Render loop error:', err);
      }

      requestAnimationFrame(renderLoop);
    }
