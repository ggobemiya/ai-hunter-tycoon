// [04-orc-stronghold] 오크 군락지 · 오크 토벌전 · 오크 유닛 AI
    /**
     * ============================================================================
     * 최상급 사냥터 오른쪽 옆 적대 구역: 👹 오크 군락지 (헌터 진입 불가)
     * - 최상급 사냥터(x: 1430~2210, y: -340~340) 바로 동쪽(x: 2250~2980)에 배치
     * - 가시 방책과 붉은 결계로 봉쇄되어 모든 헌터가 진입할 수 없음
     * ============================================================================
     */
    const ORC_STRONGHOLD_ZONE = {
      id: 'orc_stronghold_zone',
      name: '오크 군락지 (붉은 철혈 분지)',
      icon: '👹',
      enterableByHunters: false,
      bounds: { x: 2250, y: -340, w: 730, h: 680 },
      centerX: 2615,
      centerY: 0,
      baseCount: 5,
      perTierClearBonus: 2,
      maxCount: 20,
      greatWarriorConfig: {
        isGreatWarrior: true,
        name: '👑 오크 대전사',
        role: '오크 대전사',
        x: 2615,
        y: 92,
        size: 27,
        color: '#7f1d1d',
        horn: '#fde047'
      },
      reinforcementTemplates: [
        { name: '오크 강철돌격병', role: '전위 수비대', size: 16, color: '#4d7c0f', horn: '#e2e8f0' },
        { name: '오크 광전사', role: '전위 수비대', size: 16, color: '#65a30d', horn: '#e2e8f0' },
        { name: '오크 혈투주술사', role: '토템 주술진', size: 15, color: '#7e22ce', horn: '#f472b6' },
        { name: '오크 중갑파쇄병', role: '후방 수비대', size: 17, color: '#3f6212', horn: '#cbd5e1' },
        { name: '오크 정예척후병', role: '외곽 순찰대', size: 15, color: '#4d7c0f', horn: '#fef08a' },
        { name: '오크 핏빛근위병', role: '본진 호위대', size: 17, color: '#991b1b', horn: '#fde047' }
      ],
      orcs: [
        { name: '오크 로드', role: '군락지 지배자', x: 2615, y: -20, size: 22, color: '#991b1b', horn: '#fde047' },
        { name: '오크 강철돌격병', role: '전위 수비대', x: 2370, y: -120, size: 16, color: '#4d7c0f', horn: '#e2e8f0' },
        { name: '오크 광전사', role: '전위 수비대', x: 2390, y: 135, size: 16, color: '#65a30d', horn: '#e2e8f0' },
        { name: '오크 혈투주술사', role: '토템 주술진', x: 2780, y: -150, size: 15, color: '#7e22ce', horn: '#f472b6' },
        { name: '오크 중갑파쇄병', role: '후방 수비대', x: 2810, y: 145, size: 17, color: '#3f6212', horn: '#cbd5e1' }
      ]
    };

    // 오크 군락지 ↔ 최상급 사냥터 연결 통로 (5티어 보스 처치 시 개방)
    const ORC_STRONGHOLD_PASSAGE = {
      xMin: 2210,
      xMax: 2250,
      yMin: -14,
      yMax: 46,
      centerY: 16,
      topSideEntryX: 2195,
      strongholdSideEntryX: 2272
    };

    function isOrcStrongholdPassageOpen() {
      if (typeof BOSS_SANCTUM === 'undefined') return false;
      return Boolean(BOSS_SANCTUM.allStagesCleared || (BOSS_SANCTUM.bossStage || 1) >= 6);
    }

    // 오크 토벌전 상태 관리 (0~7단계 규칙 1단계 구축)
    const ORC_SUBJUGATION = {
      status: 'CLOSED', // 'CLOSED' | 'PREPARING' | 'ACTIVE'
      prepTimer: 0,
      prepDuration: 90, // 총 1분 30초(90초): 마을 60초 정비 + 30초 대기
      fallenHunterIds: new Set(),
      sessionScore: 0
    };

    function isOrcSubjugationInProgress() {
      return ORC_SUBJUGATION.status === 'PREPARING' || ORC_SUBJUGATION.status === 'ACTIVE';
    }

    function getOrcSubjugationRewardPoints(orc) {
      if (!orc) return 1;
      const skillKey = getOrcSkillProfileKey(orc);
      if (skillKey === 'overlord' || orc.name === '오크 로드' || orc.role === '군락지 지배자') return 20;
      if (skillKey === 'great_warrior' || Boolean(orc.isGreatWarrior) || orc.role === '오크 대전사') return 10;
      return 1;
    }

    function isOrcLordUnit(orc) {
      if (!orc) return false;
      const skillKey = getOrcSkillProfileKey(orc);
      return skillKey === 'overlord' || orc.name === '오크 로드' || orc.role === '군락지 지배자';
    }

    function handleHunterFallenInSubjugation(hunter, killerName = '오크 군단') {
      if (!hunter) return;
      ORC_SUBJUGATION.fallenHunterIds.add(hunter.id);
      hunter.hp = Math.round(hunter.maxHp * 0.25);
      hunter.x = (Math.random() - 0.5) * 60;
      hunter.y = 20;
      hunter.waypoints = [];
      hunter.state = 'IDLE';
      hunter.stateTimer = 1.2;
      hunter.activeGroundId = null;
      hunter.targetGroundId = null;
      hunter.targetBuildingName = '';
      hunter.targetBuildingType = '';
      hunter.currentTargetMonster = null;
      hunter.currentTargetHunter = null;
      interactionManager.spawnBubble(hunter, `💀 토벌전 전사 (${killerName}) · 재참가 불가`, '#fca5a5');

      // 패배 조건: 참가 헌터와 경비병이 모두 전사
      checkRaidDefeat();
    }

    function endOrcSubjugationRaid(isVictory, reasonText) {
      if (ORC_SUBJUGATION.status === 'CLOSED') return;
      const earnedPts = Math.max(0, Math.floor(ORC_SUBJUGATION.sessionScore || 0));

      ORC_SUBJUGATION.status = 'CLOSED';
      ORC_SUBJUGATION.prepTimer = 0;
      ORC_SUBJUGATION.fallenHunterIds.clear();
      ORC_SUBJUGATION.sessionScore = 0;

      // 토벌 종료 시 모든 오크 레벨 1 및 관련 킬 카운트 초기화(헌터 킬 기록 유지 정책에 맞춰 몬스터 킬은 0으로 정리)
      const ob = ORC_STRONGHOLD_ZONE.bounds;
      const campX = Math.round(ob.x + ob.w * 0.5);
      const campY = Math.round(ob.y + ob.h * 0.52 + 72);
      ORC_STRONGHOLD_ZONE.orcs.forEach((orc, idx) => {
        ensureOrcUnitFields(orc, idx);
        orc.aiMode = 'GUARD';
        orc.currentTarget = null;
        orc.sortieTimer = 5 + (idx % 5) * 2;
        orc.isDead = false;
        orc.respawnRemainingMs = 0;
        orc.level = 1;
        orc.monsterKillCount = 0;
        orc.totalKillCount = Math.max(0, Math.floor(Number(orc.killCount) || 0));
        orc.nextLevelKills = getOrcNextLevelKillTarget(1);
        const stats = getOrcCombatStats(orc);
        orc.maxHp = stats.maxHp;
        orc.hp = orc.maxHp;
        orc.x = campX + Math.round((Math.random() - 0.5) * 60);
        orc.y = campY + Math.round((Math.random() - 0.5) * 26);
      });

      // 오크 토벌 관련 투사체 정리 및 생존 헌터 마을 복귀 유도
      combatEffects.projectiles = combatEffects.projectiles.filter(
        pr => !pr.isOrcTarget && pr.target?.state !== 'ORC_SUBJUGATION_RAID'
      );

      hunters.forEach((h) => {
        if (!h) return;
        h.currentTargetMonster = null;
        h.currentTargetHunter = null;
        if (
          h.state === 'ORC_SUBJUGATION_RAID' ||
          h.state === 'RAID_PREP_WAIT' ||
          h.targetBuildingType === 'orc_subjugation' ||
          h.targetBuildingType === 'orc_subjugation_standby' ||
          h.activeGroundId === 'top_field_70_99'
        ) {
          h.waypoints = [];
          h.activeGroundId = null;
          h.targetGroundId = null;
          h.targetBuildingName = '';
          h.targetBuildingType = '';
          h.state = 'IDLE';
          h.stateTimer = 0.4;
          interactionManager.spawnBubble(
            h,
            isVictory ? `🏆 토벌 완료! (+${earnedPts}P)` : '🏳️ 토벌 종료 · 마을 복귀',
            isVictory ? '#fde047' : '#cbd5e1'
          );
        }
      });

      updateResourceHUD();
      updateBossRaidHudButton();
      if (typeof scheduleAutoSave === 'function') {
        scheduleAutoSave(400);
      }

      const resultPrefix = isVictory ? '🏆 오크 토벌 승리!' : '💀 오크 토벌 종료!';
      showToast(`${resultPrefix} (${reasonText}) · 획득 토벌 포인트: +${earnedPts.toLocaleString()} P (총 ${Math.floor(gameState.subjugationPoints || 0).toLocaleString()} P)`);
    }

    function areAllOrcsLevel99() {
      if (!ORC_STRONGHOLD_ZONE || !Array.isArray(ORC_STRONGHOLD_ZONE.orcs) || ORC_STRONGHOLD_ZONE.orcs.length === 0) {
        return false;
      }
      return ORC_STRONGHOLD_ZONE.orcs.every(o => o && (o.level || 1) >= ORC_MAX_LEVEL);
    }

    function enforceOrcPassageMovement(entity, prevX, radius = 14) {
      if (!entity || typeof ORC_STRONGHOLD_ZONE === 'undefined') return;
      const ob = ORC_STRONGHOLD_ZONE.bounds;
      const borderX = ob.x;
      const passageOpen = isOrcStrongholdPassageOpen();
      const inPassageY =
        entity.y >= ORC_STRONGHOLD_PASSAGE.yMin + radius * 0.35 &&
        entity.y <= ORC_STRONGHOLD_PASSAGE.yMax - radius * 0.35;

      // 상·하·동 외곽 경계 클램프
      if (entity.x > ob.x + ob.w - radius) entity.x = ob.x + ob.w - radius;
      if (entity.x >= borderX - radius) {
        if (entity.y < ob.y + radius) entity.y = ob.y + radius;
        if (entity.y > ob.y + ob.h - radius) entity.y = ob.y + ob.h - radius;
      }

      // 서쪽 경계(최상급 사냥터 ↔ 오크 군락지) 출입 제한: 5티어 보스 처치 후 통로 구간(yMin~yMax)으로만 출입
      const wasInStronghold = prevX >= borderX;
      const nowInStronghold = entity.x >= borderX;
      if (wasInStronghold !== nowInStronghold) {
        if (!passageOpen || !inPassageY) {
          entity.x = wasInStronghold ? (borderX + radius) : (borderX - radius);
        }
      } else if (!passageOpen && entity.x > borderX - radius && entity.x < borderX + radius) {
        entity.x = prevX >= borderX ? (borderX + radius) : (borderX - radius);
      } else if (passageOpen && !inPassageY && entity.x > borderX - radius && entity.x < borderX + radius) {
        entity.x = prevX >= borderX ? (borderX + radius) : (borderX - radius);
      }
    }

    function getClearedBossTierCount() {
      if (BOSS_SANCTUM.allStagesCleared) {
        return BOSS_SANCTUM.maxBossStage;
      }
      return Math.max(0, Math.min(BOSS_SANCTUM.maxBossStage, (BOSS_SANCTUM.bossStage || 1) - 1));
    }

    function syncOrcStrongholdPopulation(notifyOnGreatWarriorSpawn = false) {
      const clearedTiers = getClearedBossTierCount();
      const shouldSpawnGreatWarrior = clearedTiers >= 10 || Boolean(BOSS_SANCTUM.allStagesCleared);
      const hadGreatWarrior = ORC_STRONGHOLD_ZONE.orcs.some(o => o && o.isGreatWarrior);

      // 기존 오크 대전사를 제외한 일반 오크 병력만 우선 추출해 20마리 한도를 정확히 유지
      const regularOrcs = ORC_STRONGHOLD_ZONE.orcs.filter(o => o && !o.isGreatWarrior);
      const targetRegularCount = Math.min(
        ORC_STRONGHOLD_ZONE.maxCount,
        ORC_STRONGHOLD_ZONE.baseCount + clearedTiers * ORC_STRONGHOLD_ZONE.perTierClearBonus
      );

      if (regularOrcs.length > targetRegularCount) {
        regularOrcs.length = targetRegularCount;
      }

      const b = ORC_STRONGHOLD_ZONE.bounds;
      const campCenterX = b.x + b.w * 0.5;
      const campCenterY = b.y + b.h * 0.52;
      const templates = ORC_STRONGHOLD_ZONE.reinforcementTemplates;

      while (regularOrcs.length < targetRegularCount) {
        const idx = regularOrcs.length;
        const tpl = templates[(idx - 1) % templates.length];
        const ringStep = Math.floor((idx - 5) / 6);
        const angle = ((idx - 5) * 1.08) + ringStep * 0.45;
        const radiusX = Math.min(285, 165 + ringStep * 52 + (idx % 2) * 18);
        const radiusY = Math.min(235, 130 + ringStep * 42 + ((idx + 1) % 2) * 16);
        const ox = Math.max(b.x + 55, Math.min(b.x + b.w - 55, Math.round(campCenterX + Math.cos(angle) * radiusX)));
        const oy = Math.max(b.y + 85, Math.min(b.y + b.h - 45, Math.round(campCenterY + Math.sin(angle) * radiusY)));

        regularOrcs.push(ensureOrcUnitFields({
          id: `orc_reg_${idx}`,
          name: tpl.name,
          role: tpl.role,
          x: ox,
          y: oy,
          homeX: ox,
          homeY: oy,
          size: tpl.size,
          color: tpl.color,
          horn: tpl.horn
        }, idx));
      }

      regularOrcs.forEach((o, i) => ensureOrcUnitFields(o, i));

      if (shouldSpawnGreatWarrior) {
        const existingGw = ORC_STRONGHOLD_ZONE.orcs.find(o => o && o.isGreatWarrior);
        const gwHomeX = Math.round(b.x + b.w * 0.5);
        const gwHomeY = Math.round(b.y + b.h * 0.52 + 86);
        const gw = ensureOrcUnitFields(existingGw || {
          ...ORC_STRONGHOLD_ZONE.greatWarriorConfig,
          id: 'orc_great_warrior',
          x: gwHomeX,
          y: gwHomeY,
          homeX: gwHomeX,
          homeY: gwHomeY
        }, regularOrcs.length);
        gw.homeX = gwHomeX;
        gw.homeY = gwHomeY;
        ORC_STRONGHOLD_ZONE.orcs = [...regularOrcs, gw];
        if (!hadGreatWarrior) {
          console.warn('[오크 군락지 경보] 10티어 보스 처치 여파로 오크 야영지 본진 앞에 [👑 오크 대전사]가 강림했습니다!');
        }
      } else {
        ORC_STRONGHOLD_ZONE.orcs = regularOrcs;
      }
    }

    const ORC_RESPAWN_DURATION_MS = 60000;
    const ORC_MAX_LEVEL = 99;
    const ORC_MAX_LEVEL_TOTAL_KILLS = 500;

    // 오크 유형별 전용 스킬 정의 (일반 오크: 패시브 1 · 액티브 2 / 오크 로드: 패시브 2 · 액티브 3 / 오크 대전사: 패시브 2 · 액티브 3)
    const ORC_DEDICATED_SKILLS = {
      regular: {
        tierLabel: '일반 오크',
        passives: [
          { id: 'orc_reg_pas_1', icon: '🦴', name: '철혈의 가죽', atkMult: 0.08, defMult: 0.14, hpMult: 0.10, desc: '단단한 가죽과 야성으로 방어력 +14%, 체력 +10%, 공격력 +8% 상승' }
        ],
        actives: [
          { id: 'orc_reg_act_1', icon: '🪓', name: '야만 도끼 내려찍기', powerMult: 1.55, cooldown: 3.4, aoeRadius: 48, slashType: 'MELEE', color: '#ef4444', desc: '무기를 크게 휘둘러 155% 피해 및 주변 소규모 충격' },
          { id: 'orc_reg_act_2', icon: '💢', name: '핏빛 돌진격', powerMult: 1.38, cooldown: 4.5, aoeRadius: 34, slashType: 'HOLY', color: '#f97316', desc: '분노를 실어 138% 급습 일격' }
        ]
      },
      shaman: {
        tierLabel: '원거리 주술사',
        isRanged: true,
        rangedRange: 162,
        projType: 'MAGIC_ORB',
        projColor: '#e879f9',
        passives: [
          { id: 'orc_shm_pas_1', icon: '🔮', name: '혈마 주술 공명', atkMult: 0.12, defMult: 0.10, hpMult: 0.08, desc: '혈마의 주술 공명으로 공격력 +12%, 방어력 +10%, 체력 +8% 상승' }
        ],
        actives: [
          { id: 'orc_shm_act_1', icon: '🟣', name: '혈마 탄환 연사', powerMult: 1.52, cooldown: 3.3, aoeRadius: 28, isRangedSkill: true, projType: 'MAGIC_ORB', slashType: 'MAGIC_BURST', color: '#e879f9', desc: '원거리 혈마 탄환을 날려 152% 관통 마법 피해' },
          { id: 'orc_shm_act_2', icon: '☄️', name: '저주 운석 낙하', powerMult: 1.72, cooldown: 4.8, aoeRadius: 62, isRangedSkill: true, projType: 'MAGIC_ORB', slashType: 'MAGIC_BURST', color: '#c084fc', desc: '원거리 대상에게 주술 운석을 떨어뜨려 172% 범위 피해' }
        ]
      },
      overlord: {
        tierLabel: '오크 로드',
        passives: [
          { id: 'orc_lord_pas_1', icon: '👑', name: '군락지 지배자의 위엄', atkMult: 0.22, defMult: 0.24, hpMult: 0.20, desc: '지배자의 권능으로 공격력 +22%, 방어력 +24%, 최대 체력 +20% 증가' },
          { id: 'orc_lord_pas_2', icon: '🔥', name: '패왕의 붉은 혈맥', atkMult: 0.14, defMult: 0.12, hpMult: 0.12, desc: '끓어오르는 혈맥으로 추가 공격력 +14%, 방어력 +12%, 체력 +12% 상승' }
        ],
        actives: [
          { id: 'orc_lord_act_1', icon: '🌋', name: '지배자 대지 파쇄참', powerMult: 1.85, cooldown: 3.2, aoeRadius: 72, slashType: 'MELEE', color: '#f43f5e', desc: '대지를 가르는 참격으로 185% 광역 피해' },
          { id: 'orc_lord_act_2', icon: '🩸', name: '패왕의 선혈 폭풍', powerMult: 1.65, cooldown: 4.4, aoeRadius: 64, slashType: 'MAGIC_BURST', color: '#e11d48', desc: '붉은 혈기를 폭발시켜 165% 범위 피해' },
          { id: 'orc_lord_act_3', icon: '⚡', name: '군락 처형 일섬', powerMult: 2.10, cooldown: 5.8, aoeRadius: 52, slashType: 'HOLY', color: '#facc15', desc: '압도적인 처형 일격으로 210% 치명 피해' }
        ]
      },
      great_warrior: {
        tierLabel: '오크 대전사',
        passives: [
          { id: 'orc_gw_pas_1', icon: '🔱', name: '대전사의 불멸 투기', atkMult: 0.25, defMult: 0.26, hpMult: 0.24, desc: '극한의 투기로 공격력 +25%, 방어력 +26%, 체력 +24% 상승' },
          { id: 'orc_gw_pas_2', icon: '🌟', name: '천혈 패기 갑주', atkMult: 0.16, defMult: 0.18, hpMult: 0.16, desc: '천혈의 패기가 몸을 감싸 방어력 +18%, 체력 +16%, 공격력 +16% 증가' }
        ],
        actives: [
          { id: 'orc_gw_act_1', icon: '💥', name: '천지 개벽 대부격', powerMult: 1.95, cooldown: 3.1, aoeRadius: 78, slashType: 'MELEE', color: '#facc15', desc: '전장을 뒤흔드는 195% 광역 도끼격' },
          { id: 'orc_gw_act_2', icon: '🌪️', name: '대전사 광풍 연무', powerMult: 1.72, cooldown: 4.2, aoeRadius: 68, slashType: 'MAGIC_BURST', color: '#fb923c', desc: '광풍과 함께 휘몰아치는 172% 범위 타격' },
          { id: 'orc_gw_act_3', icon: '👑', name: '파멸의 신성 강타', powerMult: 2.25, cooldown: 5.6, aoeRadius: 58, slashType: 'HOLY', color: '#fef08a', desc: '파멸적인 한 방으로 225% 초강력 일격' }
        ]
      }
    };

    function getOrcSkillProfileKey(orc) {
      if (!orc) return 'regular';
      if (Boolean(orc.isGreatWarrior) || orc.role === '오크 대전사') return 'great_warrior';
      if (orc.role === '군락지 지배자' || orc.name === '오크 로드' || orc.name === '오크 대장' || orc.name === '오크 철혈대족장') {
        return 'overlord';
      }
      if (orc.role === '토템 주술진' || orc.name === '오크 혈투주술사') {
        return 'shaman';
      }
      return 'regular';
    }

    function getOrcDedicatedSkillSet(orc) {
      const key = getOrcSkillProfileKey(orc);
      return ORC_DEDICATED_SKILLS[key] || ORC_DEDICATED_SKILLS.regular;
    }

    // 레벨 L 도달에 필요한 누적 KILL 카운트 (Lv.1: 0킬, Lv.2: 10킬 ~ Lv.99: 500킬)
    function getOrcCumulativeKillsForLevel(level = 1) {
      const lv = Math.max(1, Math.min(ORC_MAX_LEVEL, Math.floor(Number(level) || 1)));
      if (lv <= 1) return 0;
      if (lv === 2) return 10;
      if (lv >= ORC_MAX_LEVEL) return ORC_MAX_LEVEL_TOTAL_KILLS;
      const t = (lv - 2) / (ORC_MAX_LEVEL - 2);
      return Math.round(10 + (ORC_MAX_LEVEL_TOTAL_KILLS - 10) * Math.pow(t, 1.38));
    }

    // 현재 레벨에서 다음 레벨업까지 필요한 목표 누적 KILL 카운트 (Lv.1 -> 10킬, Lv.98 -> 500킬)
    function getOrcNextLevelKillTarget(level = 1) {
      const lv = Math.max(1, Math.min(ORC_MAX_LEVEL, Math.floor(Number(level) || 1)));
      if (lv >= ORC_MAX_LEVEL) return ORC_MAX_LEVEL_TOTAL_KILLS;
      return getOrcCumulativeKillsForLevel(lv + 1);
    }

    // 누적 KILL 카운트로부터 현재 레벨 산출 (1~99)
    function computeOrcLevelFromTotalKills(totalKills = 0) {
      const kills = Math.max(0, Math.floor(Number(totalKills) || 0));
      let lv = 1;
      while (lv < ORC_MAX_LEVEL && kills >= getOrcCumulativeKillsForLevel(lv + 1)) {
        lv += 1;
      }
      return lv;
    }

    // 오크 기본 능력치 (군세 버프 제외)
    function getOrcBaseCombatStats(orc) {
      const lv = Math.max(1, Math.floor(Number(orc?.level) || 1));
      const skillKey = getOrcSkillProfileKey(orc);
      const skillSet = getOrcDedicatedSkillSet(orc);
      const isGw = skillKey === 'great_warrior';
      const isChief = skillKey === 'overlord';
      const isHeavy = orc?.role === '후방 수비대';
      const isShaman = orc?.role === '토템 주술진';

      // 일반 오크(오크 로드·오크 대전사 제외): Lv.1 = 2T 장비 ~ Lv.90 = 10T 장비 단계 착용
      const isRegularOrc = !isGw && !isChief;
      const clampedRegLv = Math.max(1, Math.min(90, lv));
      const equipTier = isRegularOrc
        ? Math.min(10, Math.max(2, Math.round(2 + ((clampedRegLv - 1) / 89) * 8)))
        : 0;
      const equipTierScale = isRegularOrc ? getEquipTierMultiplier(equipTier) : 1;

      // 오크 로드(군락지 지배자): 기존 오크 대장(24000 / 920 / 310) 대비 기본 능력치 2배 및 레벨 성장률 2배(0.28) 적용
      const baseHp = isGw ? 42000 : (isChief ? 48000 : (isHeavy ? 14500 : (isShaman ? 11500 : 12800)));
      const baseAtk = isGw ? 1480 : (isChief ? 1840 : (isShaman ? 690 : (isHeavy ? 640 : 590)));
      const baseDef = isGw ? 480 : (isChief ? 620 : (isHeavy ? 250 : 185));

      const perLevelGrowth = isChief ? 0.28 : 0.14;
      const mult = 1 + (lv - 1) * perLevelGrowth;

      // 오크 전용 패시브 스킬 보너스 합산 (일반/주술사 1개 · 오크 로드 2개 · 오크 대전사 2개)
      let pasHpBonus = 0;
      let pasAtkBonus = 0;
      let pasDefBonus = 0;
      for (let i = 0; i < (skillSet.passives?.length || 0); i++) {
        const ps = skillSet.passives[i];
        pasHpBonus += ps.hpMult || 0;
        pasAtkBonus += ps.atkMult || 0;
        pasDefBonus += ps.defMult || 0;
      }

      const gearHpMult = isRegularOrc ? (1 + (equipTierScale - 1) * 0.08) : 1;
      const gearAtkBonus = isRegularOrc ? equipTierScale * 26 : 0;
      const gearDefBonus = isRegularOrc ? equipTierScale * 20 : 0;
      const regularOrcStatMult = isRegularOrc ? 2.0 : 1.0;
      const regularOrcLv99AtkMult = (isRegularOrc && lv >= ORC_MAX_LEVEL) ? 0.5 : 1.0;
      const overlordLv99HpMult = (isChief && lv >= ORC_MAX_LEVEL) ? 10.0 : 1;

      const isRangedShaman = Boolean(skillSet.isRanged) || isShaman;
      return {
        equipTier,
        maxHp: Math.round(baseHp * mult * gearHpMult * regularOrcStatMult * overlordLv99HpMult * (1 + pasHpBonus)),
        atk: Math.round((baseAtk * mult + gearAtkBonus) * regularOrcStatMult * regularOrcLv99AtkMult * (1 + pasAtkBonus)),
        def: Math.round((baseDef * mult + gearDefBonus) * (1 + pasDefBonus)),
        isRanged: isRangedShaman,
        range: isRangedShaman ? (skillSet.rangedRange || 162) : (isGw ? 44 : 34)
      };
    }

    // [오크 군세 버프]
    // 일반 오크 = 오크 로드·오크 대전사를 제외한 오크
    function getRegularOrcCounts() {
      let alive = 0;
      let dead = 0;
      const list = ORC_STRONGHOLD_ZONE.orcs || [];
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        if (!o) continue;
        const key = getOrcSkillProfileKey(o);
        if (key === 'overlord' || key === 'great_warrior') continue;
        if (o.isDead || o.hp <= 0) dead++;
        else alive++;
      }
      return { alive, dead };
    }

    const ORC_GREAT_WARRIOR_VS_LORD = 1.2;   // 오크 대전사 = 오크 로드 기본 능력치 × 1.2
    const ORC_ARMY_BUFF_PER_ORC = 0.01;      // 일반 오크 1마리당 1%

    // 오크 능력치 (군세 버프 포함)
    //  - 오크 대전사: 오크 로드보다 1.2배 강하고, 살아있는 일반 오크 1마리당 공격력·체력 +1%
    //  - 오크 로드: 죽어있는 일반 오크 1마리당 공격력·체력 +1% (늘어난 체력만큼 즉시 회복)
    function getOrcCombatStats(orc) {
      const key = getOrcSkillProfileKey(orc);
      const stats = getOrcBaseCombatStats(orc);
      if (key === 'great_warrior') {
        const lordLike = getOrcBaseCombatStats({
          level: orc.level,
          role: '군락지 지배자',
          name: '오크 로드'
        });
        const buff = 1 + getRegularOrcCounts().alive * ORC_ARMY_BUFF_PER_ORC;
        stats.armyBuffPct = Math.round((buff - 1) * 100);
        stats.maxHp = Math.round(lordLike.maxHp * ORC_GREAT_WARRIOR_VS_LORD * buff);
        stats.atk = Math.round(lordLike.atk * ORC_GREAT_WARRIOR_VS_LORD * buff);
        stats.def = Math.round(lordLike.def * ORC_GREAT_WARRIOR_VS_LORD);
      } else if (key === 'overlord') {
        const buff = 1 + getRegularOrcCounts().dead * ORC_ARMY_BUFF_PER_ORC;
        stats.armyBuffPct = Math.round((buff - 1) * 100);
        stats.maxHp = Math.round(stats.maxHp * buff);
        stats.atk = Math.round(stats.atk * buff);
      }
      return stats;
    }

    function ensureOrcUnitFields(orc, index = 0) {
      if (!orc || typeof orc !== 'object') return orc;
      if (orc.role === '군락지 지배자' || orc.name === '오크 대장' || orc.name === '오크 철혈대족장') {
        orc.name = '오크 로드';
      }
      if (!orc.id) {
        orc.id = orc.isGreatWarrior ? 'orc_great_warrior' : `orc_unit_${index}`;
      }
      if (typeof orc.homeX !== 'number') orc.homeX = orc.x;
      if (typeof orc.homeY !== 'number') orc.homeY = orc.y;
      orc.killCount = Math.max(0, Math.floor(Number(orc.killCount) || 0));
      orc.monsterKillCount = Math.max(0, Math.floor(Number(orc.monsterKillCount) || 0));
      const explicitTotal = Math.floor(Number(orc.totalKillCount) || 0);
      orc.totalKillCount = Math.max(explicitTotal, orc.killCount + orc.monsterKillCount);

      const savedLv = Math.max(1, Math.min(ORC_MAX_LEVEL, Math.floor(Number(orc.level) || 1)));
      const minKillsForSavedLv = getOrcCumulativeKillsForLevel(savedLv);
      if (orc.totalKillCount < minKillsForSavedLv) {
        orc.totalKillCount = minKillsForSavedLv;
        const accounted = orc.killCount + orc.monsterKillCount;
        if (accounted < orc.totalKillCount) {
          orc.monsterKillCount += (orc.totalKillCount - accounted);
        }
      }

      orc.level = computeOrcLevelFromTotalKills(orc.totalKillCount);
      orc.nextLevelKills = getOrcNextLevelKillTarget(orc.level);
      orc.isDead = Boolean(orc.isDead);
      orc.respawnRemainingMs = orc.isDead
        ? Math.max(0, Math.min(ORC_RESPAWN_DURATION_MS, Math.floor(Number(orc.respawnRemainingMs) || ORC_RESPAWN_DURATION_MS)))
        : 0;

      // 오크 전용 스킬셋 동기화 (일반 오크: 패시브 1·액티브 2 / 오크 로드: 패시브 2·액티브 3 / 오크 대전사: 패시브 2·액티브 3)
      const dedicatedSet = getOrcDedicatedSkillSet(orc);
      orc.skillProfileKey = getOrcSkillProfileKey(orc);
      orc.skills = {
        passives: dedicatedSet.passives.map(p => ({ ...p })),
        actives: dedicatedSet.actives.map((a, aIdx) => {
          const prevCd = Array.isArray(orc.skills?.actives) && orc.skills.actives[aIdx]
            ? (orc.skills.actives[aIdx].cdRemaining || 0)
            : 0;
          return { ...a, cdRemaining: prevCd };
        })
      };

      const stats = getOrcCombatStats(orc);
      orc.equipTier = stats.equipTier || 0;
      orc.maxHp = stats.maxHp;
      if (orc.isDead) {
        orc.hp = 0;
      } else if (typeof orc.hp !== 'number' || orc.hp <= 0) {
        orc.hp = orc.maxHp;
      } else {
        orc.hp = Math.min(orc.maxHp, orc.hp);
      }
      if (typeof orc.attackCooldown !== 'number') orc.attackCooldown = 0.6 + (index % 5) * 0.15;
      if (typeof orc.attackAnimTimer !== 'number') orc.attackAnimTimer = 0;
      if (typeof orc.facing !== 'number') orc.facing = -1;
      if (typeof orc.walkCycle !== 'number') orc.walkCycle = (index % 6) * 0.9;
      if (typeof orc.sortieTimer !== 'number') orc.sortieTimer = 3 + (index % 7) * 2.4;
      if (typeof orc.fullHealReadyTimer !== 'number') orc.fullHealReadyTimer = 0;
      if (typeof orc.wanderX !== 'number') orc.wanderX = orc.x;
      if (typeof orc.wanderY !== 'number') orc.wanderY = orc.y;
      if (typeof orc.wanderTimer !== 'number') orc.wanderTimer = 0.5 + (index % 5) * 0.6;
      if (!orc.aiMode) orc.aiMode = 'GUARD';
      if (!('currentTarget' in orc)) orc.currentTarget = null;
      return orc;
    }

    function pickOrcActiveSkill(orc) {
      ensureOrcUnitFields(orc);
      const actives = orc.skills?.actives || [];
      if (actives.length === 0) return null;
      const ready = actives.filter(s => (s.cdRemaining || 0) <= 0);
      if (ready.length === 0) return null;
      const chosen = ready[Math.floor(Math.random() * ready.length)];
      chosen.cdRemaining = chosen.cooldown || 3.5;
      return chosen;
    }

    function registerOrcKill(orc, targetType = 'monster') {
      if (!orc) return;
      ensureOrcUnitFields(orc);
      const prevLevel = orc.level || 1;

      if (targetType === 'hunter') {
        orc.killCount += 1;
      } else {
        orc.monsterKillCount += 1;
      }
      // 성장 수치(totalKillCount): 처치 1회마다 경험치 배율만큼 쌓인다 (⭐ 01-core-utils.js EXP_RATE · 평소엔 처치 수와 같음)
      orc.totalKillCount = Math.max((Number(orc.totalKillCount) || 0) + applyExpRate(1, 'orc'), orc.killCount + orc.monsterKillCount);
      orc.level = computeOrcLevelFromTotalKills(orc.totalKillCount);
      orc.nextLevelKills = getOrcNextLevelKillTarget(orc.level);

      const stats = getOrcCombatStats(orc);
      orc.maxHp = stats.maxHp;

      if (orc.level > prevLevel && !orc.isDead) {
        orc.hp = orc.maxHp;
        combatEffects.spawnDamagePopup(
          orc.x,
          orc.y - 24,
          `⬆️ LV.${orc.level}! (${orc.killCount + orc.monsterKillCount} KILL)`,
          true,
          '#fde047'
        );
        combatEffects.spawnMeleeSlash({
          x: orc.x,
          y: orc.y - 4,
          facing: 1,
          slashType: 'MAGIC_BURST',
          color: '#facc15'
        });
      }
      // 레벨이 오르면 [👹 오크 토벌] 버튼 상태를 바로 다시 확인 (모든 오크 Lv.99 시 활성화)
      if (orc.level !== prevLevel && typeof updateBossRaidHudButton === 'function') {
        updateBossRaidHudButton();
      }
    }

    function recordOrcMonsterKill(orc) {
      registerOrcKill(orc, 'monster');
    }

    function recordOrcHunterKill(orc) {
      registerOrcKill(orc, 'hunter');
    }

    function killOrcUnit(orc) {
      if (!orc || orc.isDead) return;
      ensureOrcUnitFields(orc);
      const b = ORC_STRONGHOLD_ZONE.bounds;
      const inSubjugation = ORC_SUBJUGATION.status === 'ACTIVE';

      orc.isDead = true;
      orc.hp = 0;
      orc.aiMode = 'DEAD';
      orc.currentTarget = null;
      orc.x = Math.round(b.x + b.w * 0.5);
      orc.y = Math.round(b.y + b.h * 0.52 + 64);

      if (inSubjugation) {
        // 3. 토벌 점수 차등 획득 (일반 오크 1점 · 오크 대전사 10점 · 오크 로드 20점)
        const pts = getOrcSubjugationRewardPoints(orc);
        gameState.subjugationPoints = Math.max(0, Math.floor(Number(gameState.subjugationPoints) || 0)) + pts;
        ORC_SUBJUGATION.sessionScore = (ORC_SUBJUGATION.sessionScore || 0) + pts;
        updateResourceHUD();

        // 6. 토벌 중 사망한 오크는 1레벨로 초기화되고 토벌 종료까지 대기
        orc.level = 1;
        orc.killCount = 0;
        orc.monsterKillCount = 0;
        orc.totalKillCount = 0;
        orc.nextLevelKills = getOrcNextLevelKillTarget(1);
        orc.respawnRemainingMs = 0;
        const resetStats = getOrcCombatStats(orc);
        orc.maxHp = resetStats.maxHp;

        combatEffects.spawnDamagePopup(orc.x, orc.y - 18, `🎖️ +${pts}P · Lv.1 초기화 대기`, true, '#fde047');

        // 7. 오크 로드 사망 시 즉시 토벌 종료
        if (isOrcLordUnit(orc)) {
          endOrcSubjugationRaid(true, '오크 로드 토벌 성공');
        }
        return;
      }

      orc.respawnRemainingMs = ORC_RESPAWN_DURATION_MS;
      combatEffects.spawnDamagePopup(orc.x, orc.y - 18, '💀 전사 (60초 후 부활)', true, '#fca5a5');
    }

    function reviveOrcUnitAtStronghold(orc) {
      if (!orc || isOrcSubjugationInProgress()) return;
      ensureOrcUnitFields(orc);
      const b = ORC_STRONGHOLD_ZONE.bounds;
      const campX = Math.round(b.x + b.w * 0.5);
      const campY = Math.round(b.y + b.h * 0.52 + 72);
      orc.isDead = false;
      orc.respawnRemainingMs = 0;
      orc.aiMode = 'GUARD';
      orc.fullHealReadyTimer = 10.0;
      orc.x = campX + Math.round((Math.random() - 0.5) * 44);
      orc.y = campY + Math.round((Math.random() - 0.5) * 20);
      const stats = getOrcCombatStats(orc);
      orc.maxHp = stats.maxHp;
      orc.hp = orc.maxHp;
      combatEffects.spawnDamagePopup(orc.x, orc.y - 22, `♻️ Lv.${orc.level} 부활!`, true, '#86efac');
      combatEffects.spawnMeleeSlash({
        x: orc.x,
        y: orc.y - 4,
        facing: 1,
        slashType: 'MAGIC_BURST',
        color: '#4ade80'
      });
    }

    function updateOrcStrongholdUnits(dt) {
      const topGround = HUNTING_GROUNDS.find(g => g.id === 'top_field_70_99');
      const ob = ORC_STRONGHOLD_ZONE.bounds;
      const campX = ob.x + ob.w * 0.5;
      const campY = ob.y + ob.h * 0.52;
      const passageOpen = isOrcStrongholdPassageOpen();
      const passage = ORC_STRONGHOLD_PASSAGE;

      ORC_STRONGHOLD_ZONE.orcs.forEach((orc, idx) => {
        ensureOrcUnitFields(orc, idx);

        // 1) 사망 상태: 토벌전 중에는 토벌 종료까지 부활 대기, 평시에는 60초 카운트다운 후 부활
        if (orc.isDead) {
          if (isOrcSubjugationInProgress()) {
            orc.respawnRemainingMs = 0;
            return;
          }
          orc.respawnRemainingMs = Math.max(0, (orc.respawnRemainingMs || 0) - dt * 1000);
          if (orc.respawnRemainingMs <= 0) {
            reviveOrcUnitAtStronghold(orc);
          }
          return;
        }

        const stats = getOrcCombatStats(orc);
        orc.maxHp = stats.maxHp;
        // 오크 로드: 일반 오크 사망으로 늘어난 최대 체력만큼 즉시 회복
        const prevBuffPct = orc.lastArmyBuffPct || 0;
        orc.lastArmyBuffPct = stats.armyBuffPct || 0;
        if (isOrcLordUnit(orc) && orc.hp > 0 && (stats.armyBuffPct || 0) > prevBuffPct) {
          // 버프 증가분(%)만큼 늘어난 체력 = 버프 전 최대 체력 × 증가분
          const curBuff = 1 + (stats.armyBuffPct || 0) / 100;
          const gained = Math.round(orc.maxHp / curBuff * ((stats.armyBuffPct - prevBuffPct) / 100));
          orc.hp = Math.min(orc.maxHp, orc.hp + gained);
          combatEffects.spawnDamagePopup(orc.x, orc.y - 34, `🩸 오크 로드 분노 +${stats.armyBuffPct}% (+${gained.toLocaleString()} HP)`, true, '#f87171');
        }
        if (orc.hp > orc.maxHp) orc.hp = orc.maxHp;
        // 살아있는 오크 체력 초당 0.1% 재생
        if (orc.hp > 0 && orc.hp < orc.maxHp) {
          orc.hp = Math.min(orc.maxHp, orc.hp + orc.maxHp * 0.001 * dt);
        }
        orc.attackCooldown = Math.max(0, (orc.attackCooldown || 0) - dt);
        orc.attackAnimTimer = Math.max(0, (orc.attackAnimTimer || 0) - dt);
        if (Array.isArray(orc.skills?.actives)) {
          for (let sIdx = 0; sIdx < orc.skills.actives.length; sIdx++) {
            const sk = orc.skills.actives[sIdx];
            if ((sk.cdRemaining || 0) > 0) {
              sk.cdRemaining = Math.max(0, sk.cdRemaining - dt);
            }
          }
        }

        // 2) 군락지 내부 체력 완전 회복 및 회복 완료 후 10초 출정 대기 타이머
        const isInsideStronghold = (
          orc.x >= ob.x &&
          orc.x <= ob.x + ob.w &&
          orc.y >= ob.y &&
          orc.y <= ob.y + ob.h
        );
        if (isInsideStronghold) {
          if (orc.hp < orc.maxHp) {
            orc.hp = orc.maxHp;
            orc.fullHealReadyTimer = 10.0;
          } else if ((orc.fullHealReadyTimer || 0) > 0) {
            orc.fullHealReadyTimer = Math.max(0, orc.fullHealReadyTimer - dt);
          }
        }

        // 오크 토벌전(소집 마지막 30초 선집결 + 전투 중)에는 무조건 오크의 숲으로 출정
        const raidMode = ORC_SUBJUGATION.status === 'ACTIVE' || isRaidOrcStaging();
        if (raidMode && orc.aiMode === 'GUARD') {
          orc.aiMode = 'SORTIE';
          orc.currentTarget = null;
        }

        // 5티어 보스 처치 전에는 연결 길이 닫혀 있으므로 출정 불가
        if (!raidMode && !passageOpen && orc.aiMode === 'SORTIE') {
          orc.aiMode = 'GUARD';
        }

        if (orc.aiMode === 'GUARD') {
          orc.sortieTimer = Math.max(0, (orc.sortieTimer || 0) - dt);
          const hx = orc.homeX ?? campX;
          const hy = orc.homeY ?? campY;

          // 최상급 사냥터에서 군락지로 복귀 중이라면 반드시 연결 통로(passage)를 거쳐 귀환
          if (orc.x < ob.x) {
            const needAlignY = orc.y < passage.yMin + 6 || orc.y > passage.yMax - 6;
            const wpX = needAlignY ? passage.topSideEntryX : passage.strongholdSideEntryX;
            const wpY = needAlignY ? passage.centerY : Math.max(passage.yMin + 6, Math.min(passage.yMax - 6, orc.y));
            const dx = wpX - orc.x;
            const dy = wpY - orc.y;
            const d = Math.max(1, Math.hypot(dx, dy));
            const prevX = orc.x;
            if (Math.abs(dx) > 0.5) orc.facing = dx >= 0 ? 1 : -1;
            orc.walkCycle = (orc.walkCycle || 0) + dt * 10;
            orc.x += (dx / d) * 52 * dt;
            orc.y += (dy / d) * 52 * dt;
            enforceOrcPassageMovement(orc, prevX, 14);
            return;
          }

          // 군락지(마을) 내부 자유 배회 이동 및 출정 대기 조건 검사
          orc.wanderTimer = Math.max(0, (orc.wanderTimer || 0) - dt);
          const wx = orc.wanderX ?? hx;
          const wy = orc.wanderY ?? hy;
          const dWander = Math.hypot(wx - orc.x, wy - orc.y);
          if (dWander > 6) {
            const prevX = orc.x;
            if (Math.abs(wx - orc.x) > 0.5) orc.facing = (wx - orc.x) >= 0 ? 1 : -1;
            orc.walkCycle = (orc.walkCycle || 0) + dt * 8.5;
            orc.x += ((wx - orc.x) / dWander) * 40 * dt;
            orc.y += ((wy - orc.y) / dWander) * 40 * dt;
            enforceOrcPassageMovement(orc, prevX, 14);
          } else if (orc.wanderTimer <= 0) {
            orc.wanderTimer = 1.4 + Math.random() * 2.6;
            const padX = 48;
            const padYTop = 82;
            const padYBot = 42;
            orc.wanderX = ob.x + padX + Math.random() * Math.max(40, ob.w - padX * 2);
            orc.wanderY = ob.y + padYTop + Math.random() * Math.max(40, ob.h - padYTop - padYBot);
          }

          if (
            (passageOpen || ORC_SUBJUGATION.status === 'ACTIVE') &&
            topGround &&
            ((orc.level || 1) < ORC_MAX_LEVEL || ORC_SUBJUGATION.status === 'ACTIVE') &&
            orc.hp >= orc.maxHp &&
            (orc.fullHealReadyTimer || 0) <= 0 &&
            orc.sortieTimer <= 0
          ) {
            orc.aiMode = 'SORTIE';
          }
          return;
        }

        // SORTIE 모드: 오크 토벌전 진행 중이 아닐 때 Lv.99 도달 또는 통로 폐쇄 시 군락지로 복귀해 대기
        if (!raidMode && (!passageOpen || !topGround || (orc.level || 1) >= ORC_MAX_LEVEL)) {
          orc.aiMode = 'GUARD';
          orc.currentTarget = null;
          orc.sortieTimer = 4 + Math.random() * 4;
          return;
        }

        const tb = topGround.bounds;

        // 군락지 내부에 있을 때는 먼저 연결 통로(passage.yMin ~ passage.yMax) 입구를 통과해 최상급 사냥터로 진입
        if (orc.x >= passage.topSideEntryX) {
          const needAlignY = orc.y < passage.yMin + 6 || orc.y > passage.yMax - 6;
          const wpX = needAlignY ? passage.strongholdSideEntryX : passage.topSideEntryX - 18;
          const wpY = needAlignY
            ? passage.centerY
            : Math.max(passage.yMin + 6, Math.min(passage.yMax - 6, orc.y));
          const dx = wpX - orc.x;
          const dy = wpY - orc.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const prevX = orc.x;
          if (Math.abs(dx) > 0.5) orc.facing = dx >= 0 ? 1 : -1;
          orc.walkCycle = (orc.walkCycle || 0) + dt * 11;
          orc.x += (dx / dist) * 58 * dt;
          orc.y += (dy / dist) * 58 * dt;
          enforceOrcPassageMovement(orc, prevX, 14);
          return;
        }

        // [오크 토벌전 3열 진형] 1열 오크 로드·대전사, 2열 근접 오크, 3열 주술사
        let raidFormationOrder = null;
        if (raidMode) {
          const raidSlot = getRaidOrcSlot(orc);
          const raidFighters = getRaidHunterSideTargets().filter(h => h.x >= tb.x - 10);
          const order = getRaidFormationOrder(orc, raidSlot, raidFighters, stats.range, stats.isRanged);
          const t = order.target;
          const distT = t ? Math.hypot(t.x - orc.x, t.y - orc.y) : Infinity;
          if (!t || distT > stats.range) {
            const prevX = orc.x;
            orc.currentTarget = t;
            stepRaidUnitToward(orc, order.goalX, order.goalY, 54, dt, -1);
            orc.x = Math.max(tb.x + 28, Math.min(tb.x + tb.w - 28, orc.x));
            orc.y = Math.max(tb.y + 68, Math.min(tb.y + tb.h - 28, orc.y));
            enforceOrcPassageMovement(orc, prevX, 14);
            return;
          }
          raidFormationOrder = order;
        }

        // 2) 다른 오크가 이미 교전/조준 중인 타겟 수를 카운트해 중복 뭉침 사냥 방지
        const countOrcsOnTarget = (candidate) => {
          let cnt = 0;
          for (let j = 0; j < ORC_STRONGHOLD_ZONE.orcs.length; j++) {
            const other = ORC_STRONGHOLD_ZONE.orcs[j];
            if (!other || other === orc || other.isDead || other.hp <= 0) continue;
            if (other.currentTarget === candidate) {
              cnt++;
            } else if (Math.hypot(other.x - candidate.x, other.y - candidate.y) < 58) {
              cnt++;
            }
          }
          return cnt;
        };

        // 최상급 사냥터 내 살아있는 헌터 또는 몬스터 탐색 (점유 타겟 패널티 적용)
        let bestTarget = null;
        let bestIsHunter = false;

        // 토벌전 진행 중에는 살아있는 헌터를 1순위로 우선 타겟팅
        if (raidFormationOrder) {
          bestTarget = raidFormationOrder.target;
          bestIsHunter = true;
        } else if (ORC_SUBJUGATION.status === 'ACTIVE') {
          let bestHunterScore = Infinity;
          for (let i = 0; i < hunters.length; i++) {
            const h = hunters[i];
            const isRaidingTop = (h.state === 'HUNTING_FIELD' && h.activeGroundId === topGround.id) || h.state === 'ORC_SUBJUGATION_RAID';
            if (!h || h.hp <= 0 || !isRaidingTop) continue;
            const d = Math.hypot(h.x - orc.x, h.y - orc.y);
            const score = d + countOrcsOnTarget(h) * 260;
            if (score < bestHunterScore) {
              bestHunterScore = score;
              bestTarget = h;
              bestIsHunter = true;
            }
          }
        }

        // 이미 유효한 살아있는 몬스터 타겟을 잡고 사냥 중이라면 처치할 때까지 타겟 유지
        const lockedMon = (
          !bestTarget &&
          orc.currentTarget &&
          !orc.currentTarget.isDead &&
          typeof orc.currentTarget.hp === 'number' &&
          orc.currentTarget.hp > 0 &&
          topGround.monsters.includes(orc.currentTarget)
        ) ? orc.currentTarget : null;

        if (lockedMon) {
          bestTarget = lockedMon;
          bestIsHunter = false;
        } else if (!bestTarget) {
          let bestScore = Infinity;

          for (let i = 0; i < hunters.length; i++) {
            const h = hunters[i];
            const isHuntingOrRaidingTop = (h.state === 'HUNTING_FIELD' && h.activeGroundId === topGround.id) || h.state === 'ORC_SUBJUGATION_RAID';
            if (!h || h.hp <= 0 || !isHuntingOrRaidingTop) continue;
            const d = Math.hypot(h.x - orc.x, h.y - orc.y);
            const crowdPenalty = countOrcsOnTarget(h) * 260;
            const score = d + crowdPenalty;
            if (score < bestScore) {
              bestScore = score;
              bestTarget = h;
              bestIsHunter = true;
            }
          }

          for (let i = 0; i < topGround.monsters.length; i++) {
            const m = topGround.monsters[i];
            if (!m || m.hp <= 0) continue;
            const d = Math.hypot(m.x - orc.x, m.y - orc.y);
            const crowdPenalty = countOrcsOnTarget(m) * 260;
            const score = (d * 0.94) + crowdPenalty;
            if (score < bestScore) {
              bestScore = score;
              bestTarget = m;
              bestIsHunter = false;
            }
          }
        }

        orc.currentTarget = bestTarget;

        // 3) 교전 대상이 없을 때 오크 고유 인덱스별 분산 구역(Sector)을 순찰하여 전장에 고르게 배치
        if (!bestTarget) {
          const cols = 4;
          const rows = 5;
          const sectorIdx = idx % (cols * rows);
          const col = sectorIdx % cols;
          const row = Math.floor(sectorIdx / cols);
          const padX = 68;
          const padYTop = 88;
          const padYBot = 52;
          const usableW = Math.max(120, tb.w - padX * 2);
          const usableH = Math.max(120, tb.h - padYTop - padYBot);
          const sectorX = tb.x + padX + ((col + 0.5) / cols) * usableW;
          const sectorY = tb.y + padYTop + ((row + 0.5) / rows) * usableH;

          const dx = sectorX - orc.x;
          const dy = sectorY - orc.y;
          const d = Math.hypot(dx, dy);
          if (d > 14) {
            const prevX = orc.x;
            if (Math.abs(dx) > 0.5) orc.facing = dx >= 0 ? 1 : -1;
            orc.walkCycle = (orc.walkCycle || 0) + dt * 9;
            orc.x += (dx / d) * 46 * dt;
            orc.y += (dy / d) * 46 * dt;
            orc.x = Math.max(tb.x + 32, Math.min(tb.x + tb.w - 32, orc.x));
            orc.y = Math.max(tb.y + 72, Math.min(tb.y + tb.h - 32, orc.y));
            enforceOrcPassageMovement(orc, prevX, 14);
          }
          return;
        }

        // 타겟 주변에서도 오크 고유 각도로 포위 위치를 분산시켜 한 점에 겹치지 않도록 유도
        const flankAngle = ((idx % 8) / 8) * Math.PI * 2;
        const flankOffset = Math.min(22, stats.range * 0.55);
        const aimX = bestTarget.x + Math.cos(flankAngle) * flankOffset;
        const aimY = bestTarget.y + Math.sin(flankAngle) * flankOffset;
        const dx = aimX - orc.x;
        const dy = aimY - orc.y;
        const distToTarget = Math.hypot(bestTarget.x - orc.x, bestTarget.y - orc.y);
        const distToAim = Math.hypot(dx, dy);
        if (Math.abs(bestTarget.x - orc.x) > 0.5) {
          orc.facing = (bestTarget.x - orc.x) >= 0 ? 1 : -1;
        }

        if (distToTarget > stats.range) {
          const prevX = orc.x;
          const norm = Math.max(1, distToAim);
          orc.walkCycle = (orc.walkCycle || 0) + dt * 11;
          orc.x += (dx / norm) * 54 * dt;
          orc.y += (dy / norm) * 54 * dt;
          orc.x = Math.max(tb.x + 28, Math.min(tb.x + tb.w - 28, orc.x));
          orc.y = Math.max(tb.y + 68, Math.min(tb.y + tb.h - 28, orc.y));
          enforceOrcPassageMovement(orc, prevX, 14);
          return;
        }

        if (orc.attackCooldown <= 0) {
          orc.attackCooldown = 1.05;
          orc.attackAnimTimer = 0.36;
          const activeSkill = pickOrcActiveSkill(orc);
          const isCrit = Boolean(activeSkill) || (Math.random() < 0.22);
          const skillMult = activeSkill ? (activeSkill.powerMult || 1.5) : 1.0;
          const dmg = Math.max(25, Math.round(stats.atk * skillMult * (isCrit && !activeSkill ? 1.45 : 1.0)));
          const skillSet = getOrcDedicatedSkillSet(orc);
          const useRangedShot = Boolean(stats.isRanged || activeSkill?.isRangedSkill);

          if (activeSkill) {
            combatEffects.spawnDamagePopup(
              orc.x,
              orc.y - 34,
              `${activeSkill.icon} ${activeSkill.name}`,
              true,
              activeSkill.color || '#e879f9'
            );
          }

          if (useRangedShot) {
            const aimX = bestTarget.x;
            const aimY = bestTarget.y;
            const projColor = activeSkill?.color || skillSet.projColor || '#e879f9';
            const projSpeed = activeSkill?.id === 'orc_shm_act_2' ? 285 : 345;
            combatEffects.spawnMeleeSlash({
              x: orc.x + (dx >= 0 ? 14 : -14),
              y: orc.y - 4,
              facing: dx >= 0 ? 1 : -1,
              slashType: 'MAGIC_BURST',
              color: projColor
            });
            combatEffects.spawnProjectile({
              isMonsterProj: true,
              isOrcAttackProj: true,
              orcSource: orc,
              target: bestTarget,
              targetIsHunter: bestIsHunter && !isRaidGuard(bestTarget),
              targetIsGuard: isRaidGuard(bestTarget),
              x: orc.x + (dx >= 0 ? 14 : -14),
              y: orc.y - 6,
              speed: projSpeed,
              projType: skillSet.projType || 'MAGIC_ORB',
              color: projColor,
              dmg,
              isCrit,
              aoeRadius: activeSkill?.aoeRadius || 0,
              aimX,
              aimY
            });
            return;
          }

          combatEffects.spawnMeleeSlash({
            x: orc.x + (dx >= 0 ? 16 : -16),
            y: orc.y - 2,
            facing: dx >= 0 ? 1 : -1,
            slashType: activeSkill ? (activeSkill.slashType || 'MAGIC_BURST') : (orc.role === '토템 주술진' ? 'MAGIC_BURST' : 'MELEE'),
            color: activeSkill ? (activeSkill.color || '#fde047') : (orc.isGreatWarrior ? '#facc15' : '#ef4444')
          });

          if (isRaidGuard(bestTarget)) {
            damageRaidGuard(bestTarget, dmg, isCrit, '#fb7185', `${orc.name} Lv.${orc.level}`);
          } else if (bestIsHunter) {
            const hStats = bestTarget.getComputedStats();
            const takenByHunter = Math.max(15, Math.round(dmg - hStats.def * 0.28));
            bestTarget.hp = Math.max(0, bestTarget.hp - takenByHunter);
            combatEffects.spawnDamagePopup(bestTarget.x, bestTarget.y, takenByHunter, isCrit, '#fb7185');

            if (bestTarget.hp <= 0) {
              recordOrcHunterKill(orc);
              if (ORC_SUBJUGATION.status === 'ACTIVE' && bestTarget.state === 'ORC_SUBJUGATION_RAID') {
                handleHunterFallenInSubjugation(bestTarget, `${orc.name} Lv.${orc.level}`);
              } else {
                bestTarget.hp = Math.round(bestTarget.maxHp * 0.25);
                bestTarget.x = (Math.random() - 0.5) * 60;
                bestTarget.y = 20;
                bestTarget.waypoints = [];
                bestTarget.state = 'IDLE';
                bestTarget.stateTimer = 0.8;
                bestTarget.activeGroundId = null;
                bestTarget.currentTargetMonster = null;
                bestTarget.currentTargetHunter = null;
                interactionManager.spawnBubble(bestTarget, `💀 ${orc.name}(Lv.${orc.level})에게 패배 후 귀환...`, '#fca5a5');
              }
            }
          } else {
            bestTarget.hp = Math.max(0, bestTarget.hp - dmg);
            combatEffects.spawnDamagePopup(bestTarget.x, bestTarget.y, dmg, isCrit, '#fde047');

            if (bestTarget.hp <= 0) {
              bestTarget.hp = 0;
              bestTarget.provoked = false;
              bestTarget.aggroTargetId = null;
              const scaling = getHuntingGroundScaling(topGround, hunters);
              bestTarget.respawn = bestTarget.isFieldMiniBoss ? (bestTarget.respawnDelay || 25) : scaling.respawnDelay;
              recordOrcMonsterKill(orc);
            }
          }
        }
      });
    }
