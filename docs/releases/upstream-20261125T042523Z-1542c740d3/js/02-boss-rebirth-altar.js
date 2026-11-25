// [02-boss-rebirth-altar] 보스 성소 · 환생 제단 · 마을 성벽 충돌
    // 보스 레이드 전용 필드 (초보 사냥터 북쪽 고대 수호자의 성소 · 1~10단계 고유 외형/이름 & 요구 레벨 반영)
    const BOSS_STAGE_THEMES = [
      { stage: 1,  reqLv: 20, title: '고대 숲의 수호거신',     body: '#881337', limb: '#4c0519', stroke: '#fda4af', horn: '#facc15', core: '#f43f5e', aura: 'rgba(251, 113, 133, 0.52)', crownStyle: 'horns' },
      { stage: 2,  reqLv: 30, title: '강철 성채의 파쇄골렘',   body: '#334155', limb: '#1e293b', stroke: '#94a3b8', horn: '#e2e8f0', core: '#f97316', aura: 'rgba(148, 163, 184, 0.52)', crownStyle: 'fortress' },
      { stage: 3,  reqLv: 40, title: '미스릴 심연의 마도거신', body: '#0f766e', limb: '#115e59', stroke: '#5eead4', horn: '#38bdf8', core: '#2dd4bf', aura: 'rgba(45, 212, 191, 0.55)',  crownStyle: 'crystal' },
      { stage: 4,  reqLv: 50, title: '용혈 화염의 패왕군주',   body: '#991b1b', limb: '#450a0a', stroke: '#fca5a5', horn: '#fb923c', core: '#fde047', aura: 'rgba(249, 115, 22, 0.58)',  crownStyle: 'dragon' },
      { stage: 5,  reqLv: 60, title: '빙결 설원의 서리거인왕', body: '#1d4ed8', limb: '#1e3a8a', stroke: '#93c5fd', horn: '#e0f2fe', core: '#38bdf8', aura: 'rgba(56, 189, 248, 0.58)',  crownStyle: 'crystal' },
      { stage: 6,  reqLv: 80, title: '천둥 성좌의 뇌전수호자', body: '#581c87', limb: '#3b0764', stroke: '#d8b4fe', horn: '#fde047', core: '#a855f7', aura: 'rgba(192, 132, 252, 0.6)',  crownStyle: 'halo' },
      { stage: 7,  reqLv: 70, title: '심연 그림자의 암흑군주', body: '#18181b', limb: '#09090b', stroke: '#a855f7', horn: '#f43f5e', core: '#c084fc', aura: 'rgba(168, 85, 247, 0.62)',  crownStyle: 'dragon' },
      { stage: 8,  reqLv: 80, title: '성광 심판의 황금세라핌', body: '#b45309', limb: '#78350f', stroke: '#fef08a', horn: '#ffffff', core: '#fef9c3', aura: 'rgba(253, 224, 71, 0.65)',  crownStyle: 'halo' },
      { stage: 9,  reqLv: 90, title: '혼돈 차원의 파멸거신',   body: '#701a75', limb: '#4a044e', stroke: '#f0abfc', horn: '#fb7185', core: '#e879f9', aura: 'rgba(232, 121, 249, 0.68)', crownStyle: 'chaos' },
      { stage: 10, reqLv: 95, title: '초월 창세의 절대수호신', body: '#f8fafc', limb: '#cbd5e1', stroke: '#fde047', horn: '#38bdf8', core: '#f43f5e', aura: 'rgba(254, 240, 138, 0.78)', crownStyle: 'transcendent' }
    ];

    const BOSS_SANCTUM = {
      id: 'boss_sanctum',
      name: '고대 수호자의 성소 (보스 필드)',
      bounds: { x: 760, y: -575, w: 420, h: 205 },
      gateX: 970,
      gateY: -370,
      status: 'CLOSED', // 'CLOSED' | 'PREPARING' | 'ACTIVE'
      prepTimer: 0,
      prepDuration: 60, // 1분(60초) 정비 시간
      raidTimer: 0,
      raidDuration: 180, // 티어보스 오픈 후 3분(180초) 제한시간
      bossStage: 1,     // 1단계(Lv.20 T1 +3강) ~ 10단계(Lv.95 T10 +12강)
      maxBossStage: 10,
      allStagesCleared: false,
      fallenHunterIds: new Set(),
      boss: {
        stage: 1,
        kind: 'ancient_guardian',
        name: '고대 숲의 수호거신 [Lv.20 · T1 +3강 · 4인]',
        hp: 121680,
        maxHp: 121680,
        atk: 169,
        def: 155,
        regenPerSec: 312,
        range: 152,
        x: 970,
        y: -461,
        attackCooldown: 0,
        attackAnimTimer: 0
      }
    };

    /**
     * ============================================================================
     * 환생 헌터(1환생 이상) 전용 최상급 중간보스 소형 구역: ✨ 초월 환생의 제단
     * - 고대 수호자의 성소(x: 760~1180, y: -575~-370) 바로 오른쪽 옆에 배치
     * - 1환생(rebirthCount >= 1) 미만 헌터 입장 차단 & 유저 직접 출정 지시 지원
     * ============================================================================
     */
    const REBIRTH_ALTAR = {
      id: 'rebirth_altar',
      name: '초월 환생의 제단',
      minRebirth: 1,
      bounds: { x: 1200, y: -575, w: 210, h: 205 },
      centerX: 1305,
      centerY: -472,
      respawnDelay: 18,
      boss: {
        isRebirthSupremeBoss: true,
        kind: 'rebirth_supreme_miniboss',
        name: '👑 초월 윤회의 집행자 [1환생↑]',
        hp: 63000,
        maxHp: 63000,
        atk: 265,
        def: 180,
        range: 64,
        x: 1305,
        y: -461,
        respawn: 0,
        attackCooldown: 1.0,
        attackAnimTimer: 0,
        rewardVillageGold: 12000,
        rewardHunterGold: 8500,
        rewardExp: 4800,
        rewardAstralCount: 4,
        insigniaId: 'insignia_rebirth_supreme'
      }
    };

    function resetRebirthAltarBoss(fullHeal = true) {
      const b = REBIRTH_ALTAR.boss;
      b.maxHp = 63000;
      b.x = REBIRTH_ALTAR.bounds.x + REBIRTH_ALTAR.bounds.w * 0.5;
      b.y = REBIRTH_ALTAR.bounds.y + 114;
      b.respawn = 0;
      b.attackCooldown = 1.0;
      b.attackAnimTimer = 0;
      if (fullHeal) {
        b.hp = b.maxHp;
      }
    }

    function canHunterEnterRebirthAltar(hunter) {
      return Boolean(hunter && (hunter.rebirthCount || 0) >= REBIRTH_ALTAR.minRebirth);
    }

    function hasRebirthSupremeInsignia(hunter) {
      if (!hunter) return false;
      if (hunter.equippedInsigniaId === 'insignia_rebirth_supreme') return true;
      return Boolean(hunter.inventory && hunter.inventory.getCount('insignia_rebirth_supreme') > 0);
    }

    function canCommandRebirthAltarHunt(hunter) {
      return canHunterEnterRebirthAltar(hunter) && !hasRebirthSupremeInsignia(hunter);
    }

    function commandRebirthAltarHunt(hunter, focusCamera = false) {
      if (!hunter) return false;
      if (!canHunterEnterRebirthAltar(hunter)) {
        showToast(`🔒 '${hunter.name}' 헌터는 1환생 이상만 [초월 환생의 제단]에 출정할 수 있습니다.`);
        return false;
      }
      if (hasRebirthSupremeInsignia(hunter)) {
        showToast(`✨ '${hunter.name}' 헌터는 이미 [초월 윤회의 인장]을 보유하고 있습니다.`);
        return false;
      }
      if (REBIRTH_ALTAR.boss.hp <= 0) {
        resetRebirthAltarBoss(true);
      }

      // 천공의 섬에 체류 중인 3환생 이상 헌터가 제단출정을 지시받으면 먼저 천공의 섬에서 마을로 복귀시킨 뒤 제단으로 이동
      const siBounds = SKY_ISLAND_GROUND.bounds;
      const isOnSkyIsland = (
        hunter.activeGroundId === SKY_ISLAND_GROUND.id ||
        hunter.skyIslandPortalWarp === true ||
        (
          hunter.x >= siBounds.x - 24 &&
          hunter.x <= siBounds.x + siBounds.w + 24 &&
          hunter.y >= siBounds.y - 24 &&
          hunter.y <= siBounds.y + siBounds.h + 24
        )
      );
      if (isOnSkyIsland) {
        teleportHunterFromSkyIslandToTown(hunter, '✨ 천공의 섬 이탈 · 환생 제단 출정!');
      }

      // 바로 제단으로 가지 않고, 마을에 들러 회복·식사·물약 정비를 마친 뒤 출발 (pickNextDestination에서 처리)
      hunter.altarPrepPending = true;
      hunter.altarPrepVisited = {};
      hunter.currentTargetMonster = null;
      hunter.currentTargetHunter = null;
      hunter.activeGroundId = null;
      hunter.targetGroundId = null;
      hunter.waypoints = [];
      hunter.pickNextDestination();

      interactionManager.spawnBubble(hunter, '✨ 제단 출정 명령! 마을에서 정비 후 출발!', '#f0abfc');
      showToast(`✨ '${hunter.name}'(${hunter.rebirthCount}환생) 헌터가 마을에서 정비한 뒤 [초월 환생의 제단]으로 출정합니다!`);

      if (focusCamera) {
        gameState.followSelectedHunter = true;
        const fBtn = document.getElementById('btnFollowHunter');
        if (fBtn) {
          fBtn.classList.add('active');
          fBtn.textContent = '🎥 추적 ON';
        }
        camera.targetX = REBIRTH_ALTAR.centerX;
        camera.targetY = REBIRTH_ALTAR.centerY;
      }
      refreshHunterPanel();
      return true;
    }

    // 티어 보스 밸런스 보정표 (권장 스펙 파티가 제한시간 안에 딱 잡을 수 있게 시뮬레이션으로 맞춘 값)
    //   hp: 체력 배율 · atk: 공격력 배율 · def: 방어력 배율 · regen: 초당 재생 배율 (아래 기본 계산 결과에 곱함)
    const BOSS_BALANCE_TUNING = {
      1: { hp: 1.4883, atk: 0.6574, regen: 0.5804, def: 0.9034 },
      2: { hp: 1.6382, atk: 0.552, regen: 0.6394, def: 0.5717 },
      3: { hp: 0.9805, atk: 0.3199, regen: 0.3824, def: 0.432 },
      4: { hp: 1.5158, atk: 0.2531, regen: 0.5913, def: 0.3272 },
      5: { hp: 1.2379, atk: 0.2742, regen: 0.4827, def: 0.2457 },
      6: { hp: 0.7727, atk: 0.2074, regen: 0.3767, def: 0.1817 },
      7: { hp: 0.3362, atk: 0.7523, regen: 0.4917, def: 0.2632 },
      8: { hp: 0.3421, atk: 0.9338, regen: 0.5003, def: 0.2981 },
      9: { hp: 0.4188, atk: 1.3514, regen: 0.6125, def: 0.4087 },
      10: { hp: 0.3761, atk: 1.4189, regen: 0.5501, def: 0.4029 }
    };

    function getBossStageConfig(stage = BOSS_SANCTUM.bossStage) {
  const s = Math.max(1, Math.min(BOSS_SANCTUM.maxBossStage, stage));
  const theme = BOSS_STAGE_THEMES[s - 1] || BOSS_STAGE_THEMES[0];
  const reqLv = theme.reqLv;
  const reqTier = s;
  const reqEnhance = s >= 5 ? 12 : (s === 4 ? 10 : (s + 2)); // 1~3보스: +3~+5강, 4보스: +10강 이상, 5보스 이상: +12강 이상
  const reqEnhanceLabel = s >= 4 ? `+${reqEnhance}강 이상` : `+${reqEnhance}강`;
  const reqRebirthByStage = {
    7: 1,
    8: 2,
    9: 4,
    10: 5
  };
  const reqRebirth = reqRebirthByStage[s] || 0;
  const reqStageOrRebirthLabel = s >= 7 ? `${reqRebirth}환생↑` : (s === 6 ? `Lv.${reqLv}↑` : `Lv.${reqLv}`);

  // 각 티어별 보스에 마을 회관 헌터 정원 수 반영 (1보스: 4인 ~ 10보스: 회관 Lv.10 기준 30인)
      const recHunters = s === 1 ? 4 : getTownHallCapacity(s);
      const hunterCountScale = recHunters / 4;

      // 요구 헌터 레벨(Lv.20 -> Lv.95), 장비 티어/강화 성장, 마을 회관 헌터 인원수 반영 (체력 +20% 상향 적용)
      const lvFactor = reqLv / 20;
      const equipFactor = Math.pow(1.42, s - 1);
      const combinedScale = Math.pow(lvFactor, 1.35) * equipFactor;
      const atkScale = Math.pow(lvFactor, 1.15) * Math.pow(1.32, s - 1);
      const baseHpBoosted = Math.round(101400 * 1.2); // 보스 체력 +20% 상향
      const baseRegenBoosted = Math.round(260 * 1.2);

      // 2티어(2단계) 보스 밸런스 조정: 체력 1/2(0.5배), 공격력 1/5 감소(0.8배)
      // 3티어(3단계 · 미스릴 심연의 마도거신) 이상 상위 보스 밸런스 조정: 체력 50% 하향(0.5배)
      // 4단계 보스 밸런스 조정: 체력 추가 50% 감소(0.5배 -> 기존 0.5배 대비 절반)
      // 5단계 이상 보스 밸런스 조정: 체력 80% 감소(0.2배), 공격력 30% 감소(0.7배)
      const stageHpMult = s === 2
        ? 0.5
        : (s === 4 ? 0.25 : (s >= 5 ? 0.2 : (s >= 3 ? 0.5 : 1)));
      const tier7PlusHpMult = s >= 7 ? 3 : 1;
      const stageAtkMult = s === 2
        ? 0.8
        : (s === 7 ? 0.55 : (s >= 8 ? 0.455 : (s >= 5 ? 0.7 : 1)));
      // 6티어(6단계) 이상 보스 체력 회복력(초당 재생)을 80%(0.8배)로 적용
      const tier6PlusRegenFactor = s >= 6 ? 0.8 : 1.0;
      const baseRegenMult = (s >= 6 ? (stageHpMult * 1) : stageHpMult) * tier6PlusRegenFactor;
      const stage7RegenMult = s >= 7 ? (baseRegenMult * 1) : baseRegenMult;
      const stage8RegenMult = s >= 8 ? (stage7RegenMult * 1) : stage7RegenMult;
      const stage9RegenMult = s === 9 ? (stage8RegenMult * 1) : stage8RegenMult;
      const stageRegenMult = s >= 10 ? (stage9RegenMult * 1) : stage9RegenMult;

      return {
        stage: s,
        theme,
        reqLv,
        reqTier,
        reqEnhance,
        reqRebirth: s >= 7 ? reqRebirth : 0,
        recHunters,
        reqLabel: `${reqStageOrRebirthLabel} · T${reqTier} ${reqEnhanceLabel} · ${recHunters}인`,
        fullName: theme.title,
        maxHp: Math.round(baseHpBoosted * combinedScale * hunterCountScale * stageHpMult * tier7PlusHpMult * (BOSS_BALANCE_TUNING[s]?.hp ?? 1)),
        atk: Math.round(169 * atkScale * stageAtkMult * (BOSS_BALANCE_TUNING[s]?.atk ?? 1)),
        def: Math.round(155 * atkScale * (BOSS_BALANCE_TUNING[s]?.def ?? 1)),
        regenPerSec: Math.round(baseRegenBoosted * combinedScale * hunterCountScale * stageRegenMult * (BOSS_BALANCE_TUNING[s]?.regen ?? 1)),
        rewardVillageGold: Math.round(3000 * Math.pow(1.65, s - 1) * Math.pow(hunterCountScale, 0.55)),
        rewardHunterGold: Math.round(900 * Math.pow(1.58, s - 1)),
        rewardExp: Math.round(1400 * Math.pow(1.55, s - 1)),
        rewardMats: 5 + (s - 1) * 3
      };
    }

    // 현재 보스 티어(BOSS_SANCTUM.bossStage) 구간에 따른 골드 기부 자판 단위 반환
    // 1~2 티어: 1,000 / 10,000 / 10만
    // 3~4 티어: 1만 / 10만 / 100만
    // 5~6 티어: 10만 / 100만 / 1000만
    // 7~10 티어: 100만 / 1000만 / 1억
    function getDonationKeypadUnitsByBossStage(stage = BOSS_SANCTUM.bossStage) {
      const s = Math.max(1, Math.min(BOSS_SANCTUM.maxBossStage, Number(stage) || 1));
      if (s <= 2) {
        return [
          { amount: 1000, label: '+1,000' },
          { amount: 10000, label: '+1만' },
          { amount: 100000, label: '+10만' }
        ];
      }
      if (s <= 4) {
        return [
          { amount: 10000, label: '+1만' },
          { amount: 100000, label: '+10만' },
          { amount: 1000000, label: '+100만' }
        ];
      }
      if (s <= 6) {
        return [
          { amount: 100000, label: '+10만' },
          { amount: 1000000, label: '+100만' },
          { amount: 10000000, label: '+1000만' }
        ];
      }
      return [
        { amount: 1000000, label: '+100만' },
        { amount: 10000000, label: '+1000만' },
        { amount: 100000000, label: '+1억' }
      ];
    }

    function syncDonationKeypadButtons() {
      const units = getDonationKeypadUnitsByBossStage(BOSS_SANCTUM.bossStage);
      const modalAddBtns = document.querySelectorAll('#rosterDonateBackdrop [data-donate-add]');
      modalAddBtns.forEach((btn, idx) => {
        const u = units[idx];
        if (!u) return;
        btn.setAttribute('data-donate-add', String(u.amount));
        btn.textContent = u.label;
      });

      const panelBtns = document.querySelectorAll('#hunterDonateRow .btn-donate-gold');
      panelBtns.forEach((btn, idx) => {
        const u = units[idx];
        if (!u) return;
        btn.setAttribute('data-donate-amount', String(u.amount));
        btn.textContent = u.label;
      });
    }

    function resetBossSanctumMonster() {
      const cfg = getBossStageConfig(BOSS_SANCTUM.bossStage);
      BOSS_SANCTUM.boss.stage = cfg.stage;
      BOSS_SANCTUM.boss.name = cfg.fullName;
      BOSS_SANCTUM.boss.maxHp = cfg.maxHp;
      BOSS_SANCTUM.boss.hp = cfg.maxHp;
      BOSS_SANCTUM.boss.atk = cfg.atk;
      BOSS_SANCTUM.boss.def = cfg.def;
      BOSS_SANCTUM.boss.regenPerSec = cfg.regenPerSec;
      BOSS_SANCTUM.boss.x = BOSS_SANCTUM.bounds.x + BOSS_SANCTUM.bounds.w / 2;
      BOSS_SANCTUM.boss.y = BOSS_SANCTUM.bounds.y + 114;
      BOSS_SANCTUM.boss.attackCooldown = 0;
      BOSS_SANCTUM.boss.attackAnimTimer = 0;
    }

    /**
     * ============================================================================
     * 마을 동쪽 성벽 & 관문(길) 경계 정의
     * - 길이 아닌 구역(y < gateTopY 또는 y > gateBottomY)은 견고한 석조 성벽으로 차단
     * - 헌터가 마을 <-> 사냥터 왕래 시 반드시 동쪽 관문 길(x: 540, y: 18)을 경유
     * ============================================================================
     */
    const TOWN_EAST_GATE = {
      wallX: 542,        // 성벽 중심 X 좌표
      wallHalfThick: 18, // 성벽 반두께 (524 ~ 560)
      gateTopY: -36,     // 관문 통로 상단 경계
      gateBottomY: 72,   // 관문 통로 하단 경계
      entryWaypointX: 506,
      exitWaypointX: 586,
      roadCenterY: 18
    };

    // 마을과 사냥터 사이 벽 충돌 보정 및 보스 성소·환생 제단 봉인 결계 충돌 보정
    function enforceTownWallCollision(entity, radius = 12) {
      const minX = TOWN_EAST_GATE.wallX - TOWN_EAST_GATE.wallHalfThick - radius;
      const maxX = TOWN_EAST_GATE.wallX + TOWN_EAST_GATE.wallHalfThick + radius;
      const inGateCorridor = (entity.y >= TOWN_EAST_GATE.gateTopY + radius * 0.5) &&
                             (entity.y <= TOWN_EAST_GATE.gateBottomY - radius * 0.5);

      if (!inGateCorridor && entity.x > minX && entity.x < maxX) {
        if (entity.x <= TOWN_EAST_GATE.wallX) {
          entity.x = minX;
        } else {
          entity.x = maxX;
        }
      }

      // 초보 사냥터 남쪽 경계(y: 340~365)에서 중급 사냥터 연결 통로(x: 926~994) 외 구역 벽 충돌 보정
      if (entity.x >= 560 && entity.x <= 1410 && entity.y > 340 - radius && entity.y < 365 + radius) {
        const inMidPass = entity.x >= 936 && entity.x <= 984;
        if (!inMidPass) {
          entity.y = entity.y <= 352.5 ? (340 - radius) : (365 + radius);
        }
      }

      // 중급 사냥터 남쪽 경계(y: 785~815)에서 상급 사냥터 연결 통로(x: 926~994) 외 구역 벽 충돌 보정
      if (entity.x >= 560 && entity.x <= 1410 && entity.y > 785 - radius && entity.y < 815 + radius) {
        const inHighPass = entity.x >= 936 && entity.x <= 984;
        if (!inHighPass) {
          entity.y = entity.y <= 800 ? (785 - radius) : (815 + radius);
        }
      }

      // 초보 사냥터 동쪽 경계(x: 1390~1430)에서 최상급 사냥터 연결 통로(y: -12~48) 외 구역 벽 충돌 보정
      if (entity.y >= -360 && entity.y <= 360 && entity.x > 1390 - radius && entity.x < 1430 + radius) {
        const isHunterEntity = entity instanceof Hunter;
        const isSubjugationActive = typeof ORC_SUBJUGATION !== 'undefined' && ORC_SUBJUGATION.status === 'ACTIVE';
        const blockedBySubjugation = isHunterEntity && !isSubjugationActive && typeof isOrcStrongholdPassageOpen === 'function' && isOrcStrongholdPassageOpen();
        const inTopPass = !blockedBySubjugation && entity.y >= -4 && entity.y <= 40;
        if (!inTopPass) {
          entity.x = entity.x <= 1410 ? (1390 - radius) : (1430 + radius);
        }
      }

      // 5티어 보스 처치 후 오크의 숲(토벌 전용 필드) 내부에 헌터가 남아있으면 토벌전 중이 아닐 때만 경계 밖으로 철수
      const isSubjugationActiveNow = typeof ORC_SUBJUGATION !== 'undefined' && ORC_SUBJUGATION.status === 'ACTIVE';
      if (entity instanceof Hunter && !isSubjugationActiveNow && typeof isOrcStrongholdPassageOpen === 'function' && isOrcStrongholdPassageOpen()) {
        if (entity.x >= 1430 - radius && entity.y >= -360 && entity.y <= 360) {
          entity.x = 1365;
          entity.y = 18;
          entity.waypoints = [];
          if (entity.activeGroundId === 'top_field_70_99' || entity.targetGroundId === 'top_field_70_99') {
            entity.activeGroundId = null;
            entity.targetGroundId = null;
            entity.currentTargetMonster = null;
            entity.currentTargetHunter = null;
            entity.state = 'IDLE';
            entity.stateTimer = 0.2;
          }
        }
      }

      // [천공의 섬: 도보 이동 불가(walkable: false) · 포탈 전용 이동 구역]
      const si = SKY_ISLAND_GROUND.bounds;
      const isPortalWarpingHunter = entity instanceof Hunter && (entity.skyIslandPortalWarp === true || entity.activeGroundId === SKY_ISLAND_GROUND.id);
      const isSkyIslandMonster = !isPortalWarpingHunter && !(entity instanceof Hunter) && SKY_ISLAND_GROUND.monsters.includes(entity);
      if (isSkyIslandMonster) {
        const minX = si.x + 45 + radius;
        const maxX = si.x + si.w - 45 - radius;
        const minY = si.y + 82 + radius;
        const maxY = si.y + si.h - 28 - radius;
        if (entity.x < minX) entity.x = minX;
        if (entity.x > maxX) entity.x = maxX;
        if (entity.y < minY) entity.y = minY;
        if (entity.y > maxY) entity.y = maxY;
      } else if (!isPortalWarpingHunter) {
        const pad = radius + 4;
        if (
          entity.x >= si.x - pad &&
          entity.x <= si.x + si.w + pad &&
          entity.y >= si.y - pad &&
          entity.y <= si.y + si.h + pad
        ) {
          const dLeft = Math.abs(entity.x - (si.x - pad));
          const dRight = Math.abs((si.x + si.w + pad) - entity.x);
          const dTop = Math.abs(entity.y - (si.y - pad));
          const dBottom = Math.abs((si.y + si.h + pad) - entity.y);
          const minD = Math.min(dLeft, dRight, dTop, dBottom);
          if (minD === dBottom) entity.y = si.y + si.h + pad;
          else if (minD === dTop) entity.y = si.y - pad;
          else if (minD === dLeft) entity.x = si.x - pad;
          else entity.x = si.x + si.w + pad;
        }
      }
    }

    // 헌터가 길이 아닌 외곽 구역이나 경계 벽에 끼어 정체되었는지 검사하고 정상 도로로 복귀
    function rescueStrandedHunterIfNeeded(hunter, prevX, prevY, dt) {
      if (!hunter || hunter.state === 'IN_DUNGEON') return;
      const isActivelyAttacking =
        (hunter.state === 'HUNTING_FIELD' || hunter.state === 'BOSS_RAID') &&
        hunter.attackAnimTimer > 0;
      const isMovingState =
        hunter.state === 'WALKING' ||
        (hunter.state === 'BOSS_RAID' && !isActivelyAttacking) ||
        (hunter.state === 'HUNTING_FIELD' && !isActivelyAttacking);
      if (!isMovingState) {
        hunter.stuckMoveTimer = 0;
        return;
      }

      const movedDist = Math.hypot(hunter.x - prevX, hunter.y - prevY);
      if (movedDist < 6 * dt) {
        hunter.stuckMoveTimer = (hunter.stuckMoveTimer || 0) + dt;
      } else {
        hunter.stuckMoveTimer = Math.max(0, (hunter.stuckMoveTimer || 0) - dt * 2);
      }

      // 경계 벽 틈새나 맵 외곽 구역에 1.2초 이상 갇힌 경우 즉시 가장 가까운 안전 통로/광장으로 복귀
      const inSkyIslandBounds = (
        hunter.activeGroundId === SKY_ISLAND_GROUND.id ||
        hunter.skyIslandPortalWarp === true ||
        (
          hunter.x >= SKY_ISLAND_GROUND.bounds.x - 24 &&
          hunter.x <= SKY_ISLAND_GROUND.bounds.x + SKY_ISLAND_GROUND.bounds.w + 24 &&
          hunter.y >= SKY_ISLAND_GROUND.bounds.y - 24 &&
          hunter.y <= SKY_ISLAND_GROUND.bounds.y + SKY_ISLAND_GROUND.bounds.h + 24
        )
      );
      // 성운의 천궁(하늘 위 비행 구역)에서 사냥 · 비행 중인 헌터는 갇힘 구조 대상이 아님 (js/15c-celestial-palace.js)
      if (typeof isHunterInCelestialPalace === 'function' && isHunterInCelestialPalace(hunter)) {
        hunter.stuckMoveTimer = 0;
        return;
      }
      if (inSkyIslandBounds) {
        if (hunter.state === 'HUNTING_FIELD' && hunter.activeGroundId === SKY_ISLAND_GROUND.id) {
          hunter.stuckMoveTimer = 0;
          return;
        }
        teleportHunterFromSkyIslandToTown(hunter, '✨ 천공의 섬에서 마을로 순간 이동!');
        return;
      }

      const inWallBand = (
        hunter.x >= TOWN_EAST_GATE.wallX - TOWN_EAST_GATE.wallHalfThick - 14 &&
        hunter.x <= TOWN_EAST_GATE.wallX + TOWN_EAST_GATE.wallHalfThick + 14 &&
        (hunter.y < TOWN_EAST_GATE.gateTopY || hunter.y > TOWN_EAST_GATE.gateBottomY)
      );
      const inMidSouthWall = (
        hunter.x >= 560 && hunter.x <= 1410 &&
        hunter.y >= 332 && hunter.y <= 373 &&
        (hunter.x < 936 || hunter.x > 984)
      );
      const inHighSouthWall = (
        hunter.x >= 560 && hunter.x <= 1410 &&
        hunter.y >= 777 && hunter.y <= 823 &&
        (hunter.x < 936 || hunter.x > 984)
      );
      const inTopEastWall = (
        hunter.y >= -360 && hunter.y <= 360 &&
        hunter.x >= 1382 && hunter.x <= 1438 &&
        (hunter.y < -4 || hunter.y > 40)
      );
      const inMidEastWall = (
        hunter.y >= 360 && hunter.y <= 795 &&
        hunter.x >= 1382 && hunter.x <= 1438 &&
        ((hunter.rebirthCount || 0) < 1 || hunter.y < 553 || hunter.y > 597)
      );
      const outOfPlayableBounds = hunter.x < -640 || hunter.x > 2240 || hunter.y < -820 || hunter.y > 1270;

      if (hunter.stuckMoveTimer >= 1.2 || inWallBand || inMidSouthWall || inHighSouthWall || inTopEastWall || inMidEastWall || outOfPlayableBounds) {
        hunter.stuckMoveTimer = 0;
        if (hunter.x < TOWN_EAST_GATE.wallX) {
          // 마을 쪽 갇힘 -> 중앙 광장 도로로 복귀 후 경로 재계산
          hunter.x = Math.max(-440, Math.min(480, hunter.x));
          hunter.y = TOWN_EAST_GATE.roadCenterY;
        } else if (hunter.x >= 1410 && hunter.y >= -360 && hunter.y <= 360) {
          // 최상급 사냥터 구역 내 통로로 복귀
          hunter.x = Math.max(1465, Math.min(2160, hunter.x));
          hunter.y = Math.max(-260, Math.min(300, hunter.y));
        } else if (hunter.x >= 1410 && hunter.y >= 360 && hunter.y <= 795) {
          // 환생 전용 사냥터 구역 내 통로로 복귀 (미환생 시 중급 사냥터 통로로 복귀)
          if ((hunter.rebirthCount || 0) >= 1) {
            hunter.x = Math.max(1465, Math.min(2160, hunter.x));
            hunter.y = Math.max(410, Math.min(740, hunter.y));
          } else {
            hunter.x = 1340;
            hunter.y = 575;
          }
        } else if (hunter.y >= 800) {
          // 상급 사냥터 구역 내 통로로 복귀
          hunter.x = Math.max(650, Math.min(1340, hunter.x));
          hunter.y = Math.max(855, Math.min(1200, hunter.y));
        } else if (hunter.y >= 352) {
          // 중급 사냥터 구역 내 통로로 복귀
          hunter.x = Math.max(650, Math.min(1340, hunter.x));
          hunter.y = Math.max(405, Math.min(750, hunter.y));
        } else {
          // 초보 사냥터 구역 내 도로로 복귀
          hunter.x = Math.max(635, Math.min(1340, hunter.x));
          hunter.y = Math.max(-250, Math.min(300, hunter.y));
        }

        if (hunter.state === 'BOSS_RAID') {
          hunter.setDestinationWithGatePath(BOSS_SANCTUM.boss.x, BOSS_SANCTUM.boss.y + 32);
        } else if (hunter.state === 'WALKING') {
          hunter.setDestinationWithGatePath(hunter.targetX, hunter.targetY);
        } else {
          hunter.currentTargetMonster = null;
          hunter.pickNextDestination();
        }
      }
    }
