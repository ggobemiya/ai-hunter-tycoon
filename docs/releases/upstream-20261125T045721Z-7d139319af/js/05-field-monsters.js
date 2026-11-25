// [05-field-monsters] 사냥터 스케일링 · 천공의 섬 이동 · 몬스터/중간보스 생성
    // 사냥터 내 사냥 중인 헌터 수(및 최상급 사냥터 출정 오크 수)에 따른 목표 몬스터 수 및 리젠 시간 계산
    function getHuntingGroundScaling(ground, hunterList) {
      const hunterCount = (Array.isArray(hunterList) ? hunterList : []).filter(
        h => h && h.hp > 0 && h.state === 'HUNTING_FIELD' && h.activeGroundId === ground.id
      ).length;

      let orcCount = 0;
      if (
        ground &&
        ground.id === 'top_field_70_99' &&
        typeof ORC_STRONGHOLD_ZONE !== 'undefined' &&
        Array.isArray(ORC_STRONGHOLD_ZONE.orcs)
      ) {
        const tb = ground.bounds;
        const strongholdLeftX = ORC_STRONGHOLD_ZONE.bounds.x;
        orcCount = ORC_STRONGHOLD_ZONE.orcs.filter((o) => {
          if (!o || o.isDead || (o.hp || 0) <= 0) return false;
          const isOutOfStronghold = o.x < strongholdLeftX || o.aiMode === 'SORTIE';
          const inTopFieldArea =
            o.x >= tb.x - 20 &&
            o.x <= strongholdLeftX + 10 &&
            o.y >= tb.y - 30 &&
            o.y <= tb.y + tb.h + 30;
          return isOutOfStronghold && inTopFieldArea;
        }).length;
      }

      const rawCount = hunterCount + orcCount;
      const maxCap = ground.maxCountedHunters || (ground.id === 'top_field_70_99' ? 8 : 5);
      const countedHunters = Math.min(maxCap, rawCount);
      const targetMonsterCount = Math.min(
        ground.maxMonsterCount,
        ground.baseMonsterCount + countedHunters * 3 // 1.5배 스폰 확장: 기본 6마리 ~ 최대 18~30마리
      );
      const respawnDelay = Math.max(0.75, (4.5 - countedHunters * 0.65) / 1.5); // 리젠 주기 1.5배 가속
      return { rawCount, hunterCount, orcCount, countedHunters, targetMonsterCount, respawnDelay };
    }


    function isSkyIslandOpened() {
      return true;
    }

    // 천공의 섬 최소 입장 장비: 전 부위 T7 이상 + 평균 +10강 이상
    // (시뮬레이션: 5환생 Lv.1 기준 T4+0은 10분에 위기 198회, T6+10강 17회, T7+10강 4회, T8+10강 0회)
    // 미달이면 윤회의 성역 · 지하 던전에서 장비를 맞춘 뒤 이동한다.
    const SKY_ISLAND_MIN_GEAR = { minTier: 7, minAvgEnhance: 10 };

    function meetsSkyIslandGear(hunter) {
      const eq = hunter?.equipment;
      if (!eq) return false;
      const slots = ['weapon', 'armor', 'helmet', 'accessory'];
      const minTier = Math.min(...slots.map(s => eq[s]?.tier || 1));
      const avgEnh = slots.reduce((sum, s) => sum + (eq[s]?.enhance || 0), 0) / slots.length;
      return minTier >= SKY_ISLAND_MIN_GEAR.minTier && avgEnh >= SKY_ISLAND_MIN_GEAR.minAvgEnhance;
    }

    function canHunterEnterSkyIsland(hunter) {
      return Boolean(isSkyIslandOpened() && hunter && (hunter.rebirthCount || 0) >= SKY_ISLAND_GROUND.minRebirth && meetsSkyIslandGear(hunter));
    }

    function teleportHunterToSkyIsland(hunter, gateBuilding) {
      if (!hunter || !canHunterEnterSkyIsland(hunter)) return false;
      const aliveSkyMonsters = SKY_ISLAND_GROUND.monsters.filter(m => m && m.hp > 0);
      const pickMon = aliveSkyMonsters.length > 0
        ? aliveSkyMonsters[Math.floor(Math.random() * aliveSkyMonsters.length)]
        : null;
      const b = SKY_ISLAND_GROUND.bounds;
      const destX = pickMon
        ? Math.max(b.x + 65, Math.min(b.x + b.w - 65, pickMon.x + (Math.random() - 0.5) * 28))
        : (b.x + 110 + Math.random() * (b.w - 220));
      const destY = pickMon
        ? Math.max(b.y + 85, Math.min(b.y + b.h - 45, pickMon.y + (Math.random() - 0.5) * 24))
        : (b.y + 110 + Math.random() * (b.h - 165));

      combatEffects.spawnMeleeSlash({
        x: hunter.x,
        y: hunter.y - 4,
        facing: hunter.facing || 1,
        slashType: 'MAGIC_BURST',
        color: '#38bdf8'
      });

      hunter.x = destX;
      hunter.y = destY;
      hunter.targetX = destX;
      hunter.targetY = destY;
      hunter.waypoints = [];
      hunter.skyIslandPortalWarp = true;
      hunter.activeGroundId = SKY_ISLAND_GROUND.id;
      hunter.targetGroundId = SKY_ISLAND_GROUND.id;
      hunter.targetBuildingName = SKY_ISLAND_GROUND.name;
      hunter.targetBuildingType = 'hunting_ground';
      hunter.currentTargetMonster = pickMon || null;
      hunter.currentTargetHunter = null;
      hunter.huntTimer = 22 + Math.random() * 10;
      hunter.state = 'HUNTING_FIELD';

      combatEffects.spawnMeleeSlash({
        x: hunter.x,
        y: hunter.y - 4,
        facing: hunter.facing || 1,
        slashType: 'MAGIC_BURST',
        color: '#fde047'
      });

      const gateLv = gateBuilding ? gateBuilding.level : 1;
      interactionManager.spawnBubble(hunter, `☁️ 천공의 섬 포탈 이동! (Lv.${gateLv})`, '#7dd3fc');
      return true;
    }

    function sendRebirthHunterToSkyIslandGate(hunter) {
      if (!hunter || !canHunterEnterSkyIsland(hunter)) return false; // 환생 + 최소 장비 조건
      const skyGate = village.getAllBuildings().find(b => b.type === 'sky_island_gate');
      if (!skyGate) return false;
      const destX = skyGate.x;
      const destY = skyGate.y + skyGate.h / 2 + 16;
      hunter.setDestinationWithGatePath(destX, destY);
      hunter.targetBuildingName = `${skyGate.name} → ${SKY_ISLAND_GROUND.name}`;
      hunter.targetBuildingType = 'sky_island_portal';
      hunter.targetGroundId = SKY_ISLAND_GROUND.id;
      hunter.activeGroundId = null;
      hunter.currentTargetMonster = null;
      hunter.currentTargetHunter = null;
      hunter.skyIslandPortalWarp = false;
      hunter.state = 'WALKING';
      interactionManager.spawnBubble(hunter, '🌀 천공의 섬 게이트로 향하는 중!', '#7dd3fc');
      return true;
    }

    function teleportHunterFromSkyIslandToTown(hunter, reasonBubble = '✨ 천공의 섬에서 마을로 순간 이동!') {
      if (!hunter) return false;
      const skyGate = village.getAllBuildings().find(b => b.type === 'sky_island_gate');
      const destX = skyGate
        ? skyGate.x + (Math.random() - 0.5) * 32
        : (Math.random() - 0.5) * 80;
      const destY = skyGate
        ? skyGate.y + skyGate.h / 2 + 18 + (Math.random() - 0.5) * 14
        : (TOWN_EAST_GATE.roadCenterY + (Math.random() - 0.5) * 16);

      combatEffects.spawnMeleeSlash({
        x: hunter.x,
        y: hunter.y - 4,
        facing: hunter.facing || 1,
        slashType: 'MAGIC_BURST',
        color: '#38bdf8'
      });

      hunter.x = destX;
      hunter.y = destY;
      hunter.targetX = destX;
      hunter.targetY = destY;
      hunter.waypoints = [];
      hunter.skyIslandPortalWarp = false;
      hunter.activeGroundId = null;
      hunter.targetGroundId = null;
      hunter.targetBuildingName = '';
      hunter.targetBuildingType = '';
      hunter.currentTargetMonster = null;
      hunter.currentTargetHunter = null;
      // 3환생 이상 헌터는 마을 복귀 후 마을 행동을 정확히 1회 수행한 뒤 천공의 섬 게이트로 이동
      hunter.postSkyTownActionDone = false;
      hunter.state = 'IDLE';
      hunter.stateTimer = 0.25;

      combatEffects.spawnMeleeSlash({
        x: hunter.x,
        y: hunter.y - 4,
        facing: hunter.facing || 1,
        slashType: 'MAGIC_BURST',
        color: '#fde047'
      });

      if (reasonBubble) {
        interactionManager.spawnBubble(hunter, reasonBubble, '#7dd3fc');
      }
      return true;
    }

    // 고대 수호자(해금 보스) 위력의 1/5(20%) 능력치를 계산해 필드 중간 보스 생성
    const FIELD_MINIBOSS_SPAWN_CHANCE = 0.001; // 0.1% 확률로 등장

    function createFieldMiniBoss(ground) {
      const cfg = ground.miniBossConfig;
      if (!cfg) return null;
      const guardianCfg = getBossStageConfig(cfg.bossStageRef || 1);
      // 고대 수호자 위력의 1/5 기준 체력에 중간보스 체력 +50%(1.5x) 적용
      const miniHp = Math.max(2250, Math.round((guardianCfg.maxHp / 5) * 1.5));
      const miniAtk = Math.max(30, Math.round((guardianCfg.atk / 5) * (cfg.atkMultiplier || 1)));
      const sx = ground.bounds.x + ground.bounds.w * 0.72;
      const sy = ground.bounds.y + ground.bounds.h * 0.54;
      return {
        isFieldMiniBoss: true,
        kind: 'field_miniboss',
        bossTheme: cfg.bossTheme || 'meadow_slime',
        insigniaId: cfg.insigniaId || null,
        name: cfg.name,
        color: cfg.color || '#f59e0b',
        stroke: cfg.stroke || '#fde047',
        hp: miniHp,
        maxHp: miniHp,
        atk: miniAtk,
        isRanged: !!cfg.isRanged,
        range: cfg.range || 40,
        respawnDelay: cfg.respawnDelay || 25,
        x: sx,
        y: sy,
        spawnX: sx,
        spawnY: sy,
        wanderX: sx,
        wanderY: sy,
        wanderTimer: 2.0,
        provoked: false,
        aggroTargetId: null,
        respawn: 0,
        attackCooldown: 0.9
      };
    }

    function createGroundMonster(ground, index, allowMiniBossRoll = false) {
      if (allowMiniBossRoll && ground.miniBossConfig && !ground.monsters.some(m => m && m.isFieldMiniBoss && m.hp > 0)) {
        if (Math.random() < FIELD_MINIBOSS_SPAWN_CHANCE) {
          const miniBoss = createFieldMiniBoss(ground);
          if (miniBoss) {
            if (typeof showToast === 'function' && typeof gameStarted !== 'undefined' && gameStarted) {
              showToast(`⚠️ [${ground.name}]에 희귀 중간 보스 ${miniBoss.name} 출현!`);
            }
            return miniBoss;
          }
        }
      }

      const tpl = ground.monsterTemplates[index % ground.monsterTemplates.length];
      const pad = 70;
      const sx = ground.bounds.x + pad + Math.random() * (ground.bounds.w - pad * 2);
      const sy = ground.bounds.y + 88 + Math.random() * (ground.bounds.h - pad - 88);
      return {
        isFieldMiniBoss: false,
        kind: tpl.kind || 'slime',
        doppelJob: tpl.doppelJob || null,
        doppelGender: tpl.doppelGender || (Math.random() < 0.5 ? 'F' : 'M'),
        name: tpl.name,
        color: tpl.color,
        stroke: tpl.stroke,
        hp: tpl.hp,
        maxHp: tpl.hp,
        atk: tpl.atk,
        isRanged: !!tpl.isRanged,
        range: tpl.range || 26,
        facing: Math.random() < 0.5 ? 1 : -1,
        walkCycle: Math.random() * Math.PI * 2,
        attackAnimTimer: 0,
        x: sx,
        y: sy,
        spawnX: sx,
        spawnY: sy,
        wanderX: sx,
        wanderY: sy,
        wanderTimer: 1 + Math.random() * 2.5,
        provoked: false,
        aggroTargetId: null,
        respawn: 0,
        attackCooldown: 0.6 + Math.random() * 0.6
      };
    }

    ALL_FIELD_GROUNDS.forEach((hg) => {
      for (let i = 0; i < hg.baseMonsterCount; i++) {
        hg.monsters.push(createGroundMonster(hg, i, true));
      }
    });

    // 성운의 천궁: 4환생 이상 + 날개를 착용한 헌터만 (날개로 날아서 이동)
    function canHunterEnterCelestialPalace(hunter) {
      if (!hunter || (hunter.rebirthCount || 0) < CELESTIAL_PALACE_GROUND.minRebirth) return false;
      // 천공의 섬 포탈을 거쳐 가므로 천공의 섬 게이트가 있어야 함
      if (!canHunterEnterSkyIsland(hunter)) return false;
      if (!village.getAllBuildings().some(b => b.type === 'sky_island_gate')) return false;
      return Boolean(hunter.getEquippedWing && hunter.getEquippedWing());
    }

    function evaluateHuntingGroundPreference(hunter, ground) {
      const rebirths = hunter?.rebirthCount || 0;
      if (ground.id === CELESTIAL_PALACE_GROUND.id) {
        if ((hunter?.rebirthCount || 0) < CELESTIAL_PALACE_GROUND.minRebirth) {
          return { score: 0, matched: false, label: '성운의 천궁 (4환생 이상 · 날개 착용 시 비행 입장)' };
        }
        if (!canHunterEnterCelestialPalace(hunter)) {
          return { score: 0, matched: false, label: '성운의 천궁 (날개를 착용해야 날아갈 수 있음)' };
        }
        return { score: 190, matched: true, label: `성운의 천궁 비행 출정 (${rebirths}환생 · 4,300 EXP)` };
      }
      if (ground.id === 'top_field_70_99' && typeof isOrcStrongholdPassageOpen === 'function' && isOrcStrongholdPassageOpen()) {
        return { score: 0, matched: false, label: '토벌 전용 필드 (5티어 보스 처치 후 헌터 출입 불가)' };
      }
      if (ground.walkable === false) {
        if (!canHunterEnterSkyIsland(hunter)) {
          return { score: 0, matched: false, label: (hunter.rebirthCount || 0) >= SKY_ISLAND_GROUND.minRebirth ? '천공의 섬 (전 부위 T7 이상 + 평균 +10강 필요)' : '천공의 섬 (3환생 이상 · 포탈 전용)' };
        }
        const skyGate = village.getAllBuildings().find(b => b.type === 'sky_island_gate');
        if (!skyGate) {
          return { score: 0, matched: false, label: '천공의 섬 게이트 건설 필요' };
        }
        return { score: 165, matched: true, label: `천공의 섬 포탈 출정 (${rebirths}환생 · 2,650 EXP)` };
      }
      if (ground.minRebirth) {
        if (rebirths < ground.minRebirth) {
          return { score: 0, matched: false, label: `환생 전용 (${ground.minRebirth}환생 이상 입장 가능)` };
        }
        const skyGate = village.getAllBuildings().find(b => b.type === 'sky_island_gate');
        const sanctuaryScore = (rebirths >= 3 && skyGate) ? 85 : 130;
        return { score: sanctuaryScore, matched: true, label: `환생 성역 (${rebirths}환생 전용 · 기본 EXP)` };
      }
      // 1환생 이상 환생 헌터는 일반 사냥터(초보·중급·상급·최상급) 출정 대상에서 제외
      if (rebirths >= 1) {
        return { score: 0, matched: false, label: '환생 헌터 전용 사냥터 이용 대상' };
      }
      const lv = hunter.level;
      if (lv >= ground.minRecLv && lv <= ground.maxRecLv) {
        const expLabel = lv <= 10 ? '초보 보너스 (+50% EXP)' : '적정 사냥터 (기본 EXP)';
        return { score: lv <= 10 ? 100 : 88, matched: true, label: expLabel };
      }
      if (lv > ground.maxRecLv) {
        // 21레벨 이상 초보 사냥터 진입 시 경험치 90% 패널티 인지 -> 기피
        return { score: 8, matched: false, label: '고레벨 패널티 (-90% EXP)' };
      }
      return { score: 15, matched: false, label: '권장 레벨 미달' };
    }
