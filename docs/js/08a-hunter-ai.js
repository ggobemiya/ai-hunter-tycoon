// [08a-hunter-ai] 헌터 AI: 다음 행동(목적지) 결정
    // ============================================================================
    // 헌터가 할 일을 정하는 규칙만 모아 둔 파일. (헌터의 이동·전투·시설 이용 처리는 08-hunter-class.js)
    //
    // 평상시 우선순위 (위에서부터 먼저)
    //   0. 오크 토벌 / 보스 레이드 준비·진행, 초월 환생의 제단 출정 지시
    //   1. Lv.99 환생 가능 → 환생소
    //   2. 생존: 체력 45% 미만 또는 피로 78 이상 → 신전/여관
    //   3. 배고픔 38 미만 → 주점 · 인성이 마이너스면 정화의 성소
    //   4. 물약: 거의 바닥이면 보충 (마을에 있을 때는 60% 미만이면 미리 보충)
    //   5. 판매: 승급에 쓸 재료를 남기고 팔 전리품이 3개 이상이면 잡화상점
    //   6. 날개 강화 (천공 대장간)
    //   7. 장비 티어 승급 가능 → 대장간
    //   8. 승급 재료 부족 → 지금 갈 수 있는 사냥터에서 수집 (사냥터가 없으면 들어갈 층이 있는 던전)
    //   9. 골드가 있으면 장비 강화 (마법 강화소 · 승급 비용과 물약값은 남김)
    //      사냥 중에도 골드가 넉넉하면(강화비 3배 이상 · 바로 승급 가능) 마을로 돌아와 강화/승급
    //  10. 들어갈 층이 있으면 약 20% 확률로 지하 던전 (피로 40 미만) · 아니면 지금 레벨·환생에 맞는 사냥터
    //  11. 맞는 사냥터가 없으면 들어갈 층이 있는 던전
    //  12. 할 일이 없으면 마을 시설 둘러보기
    // ============================================================================
    // 사냥 대신 지하 던전을 고를 확률 (들어갈 층이 있고 건강할 때)
    const HUNTER_AI_DUNGEON_CHANCE = 0.2;

    const HUNTER_AI_CFG = {
      altarAutoRetryMs: 3 * 60 * 1000, // 제단에서 물러난 뒤 자동 재도전까지 대기 (3분)
      restHpRatio: 0.45,         // 이 아래면 쉬러 감
      restFatigue: 78,
      hungerThreshold: 38,
      sellMinCount: 3,           // 팔 수 있는 전리품이 이 개수 이상이면 잡화상점
      townPotionTopUpRatio: 0.6  // 마을에 있을 때 물약이 최대치의 60% 미만이면 미리 보충
    };

    // 다음 장비 승급에 필요한 재료 수 (판매하지 않고 남겨 둘 양)
    // 가장 낮은 티어 부위의 다음 승급 재료 수를 기준으로 한다.
    function getHunterMaterialReserve(hunter) {
      const slots = ['weapon', 'armor', 'helmet', 'accessory'];
      let reserve = 0;
      let lowestTier = Infinity;
      for (const slot of slots) {
        const item = hunter.equipment?.[slot];
        if (!item || item.tier >= MAX_EQUIP_TIER) continue;
        const rule = TIER_UPGRADE_RULES[item.tier + 1];
        if (!rule) continue;
        if (item.tier < lowestTier) {
          lowestTier = item.tier;
          reserve = rule.matCost;
        }
      }
      return reserve;
    }

    // 잡화상점에서 팔 목록: 승급 재료로 쓸 양은 남기고, 남는 재료는 값이 비싼 것부터 판다
    function getHunterSellPlan(hunter) {
      if (!hunter.inventory) return [];
      const entries = hunter.inventory.getEntriesByCategory().filter(e => e.def && e.def.sellable && e.qty > 0);
      const sellableCrafting = entries.filter(e => e.def.isCraftingMat !== false);
      const sellableCraftingQty = sellableCrafting.reduce((s, e) => s + e.qty, 0);
      // 팔 수 없는 재료로 이미 채워지는 양은 빼고 남길 양 계산
      const nonSellableCrafting = Math.max(0, (hunter.materials || 0) - sellableCraftingQty);
      let keep = Math.max(0, getHunterMaterialReserve(hunter) - nonSellableCrafting);

      const plan = [];
      sellableCrafting
        .slice()
        .sort((a, b) => (a.def.valueMultiplier || 1) - (b.def.valueMultiplier || 1)) // 싼 것부터 남김
        .forEach((e) => {
          const kept = Math.min(e.qty, keep);
          keep -= kept;
          const sellQty = e.qty - kept;
          if (sellQty > 0) plan.push({ id: e.id, qty: sellQty, def: e.def });
        });
      entries.filter(e => e.def.isCraftingMat === false).forEach(e => plan.push({ id: e.id, qty: e.qty, def: e.def }));
      return plan;
    }

    // 지금 들어갈 수 있는 던전 층이 있는지 (없으면 던전까지 갔다가 그냥 돌아오게 됨)
    function canHunterChallengeDungeon(hunter, dungeonBld) {
      if (!dungeonBld || typeof DUNGEON_DIFFICULTY === 'undefined') return false;
      try {
        return (DUNGEON_DIFFICULTY.pickChallengeFloor(hunter, dungeonBld.level) || 0) > 0;
      } catch (_) {
        return false;
      }
    }

    // 지금 레벨·환생에 맞는 사냥터 (점수 높은 순 첫 번째)
    function getHunterBestGround(hunter) {
      const matched = ALL_FIELD_GROUNDS
        .map(hg => ({ hg, pref: evaluateHuntingGroundPreference(hunter, hg) }))
        .filter(entry => entry.pref.matched)
        .sort((a, b) => b.pref.score - a.pref.score);
      return matched.length > 0 ? matched[0].hg : null;
    }

    // Lv.99로 환생할 수 있는 상태인지 (환생소가 있어야 함)
    function isHunterReadyToRebirth(hunter) {
      return hunter.level >= LEVEL_REBIRTH_CONFIG.maxLevel &&
        hunter.rebirthCount < LEVEL_REBIRTH_CONFIG.maxRebirths &&
        village.getAllBuildings().some(b => b.type === 'rebirth_hall');
    }

    // 사냥 중 골드가 넉넉하면 마을로 돌아가 장비를 손볼지 (45초마다 확인)
    // - 대장간에서 바로 승급할 수 있거나, 강화 비용의 3배 이상 골드가 있으면 귀환
    // - 천공의 섬 · 성운의 천궁 · 영웅의 투기장은 제외 (멀리 있는 사냥터)
    const GEAR_RETURN_CHECK_SEC = 45;
    function shouldHunterReturnForGear(hunter, ground, dt) {
      if (!ground || ground.id === SKY_ISLAND_GROUND.id || ground.zoneType === 'HERO_ARENA') return false;
      if (typeof CELESTIAL_PALACE_GROUND !== 'undefined' && ground.id === CELESTIAL_PALACE_GROUND.id) return false;
      hunter.gearReturnTimer = (hunter.gearReturnTimer ?? GEAR_RETURN_CHECK_SEC) - dt;
      if (hunter.gearReturnTimer > 0) return false;
      hunter.gearReturnTimer = GEAR_RETURN_CHECK_SEC;
      if (hunter.hp < hunter.maxHp * 0.45) return false;
      const all = village.getAllBuildings();
      const smithy = all.find(b => b.type === 'smithy');
      if (smithy && ['weapon', 'armor', 'helmet', 'accessory'].some(s => hunter.checkTierUpgradeCondition(s, smithy.level).canUpgrade)) {
        return true;
      }
      if (!all.some(b => b.type === 'enchanter')) return false;
      const pick = hunter.getNextEnhanceTarget();
      if (!pick) return false;
      const up = smithy ? hunter.findTierUpgradeCandidate(smithy.level) : null;
      return canHunterAffordEnhance(hunter, pick.cost * 3, up);
    }

    // 강화비를 낼 여유가 있는지: 승급 비용 + 물약값(100G)을 남기고도 낼 수 있거나,
    // 승급용으로 모으는 중이라도 강화비가 가진 골드의 5% 이하이면 (승급 저축에 거의 영향 없음) 강화한다.
    // 물약 · 도시락 보충이 필요한가? (물약 상점에서 물약과 도시락을 같이 판다 · 08-hunter-class.js applyFacilityService)
    //   하나라도 최대치보다 적고, 모자란 것 중 1개라도 살 골드가 있으면 true
    function hunterNeedsSupplies(hunter, potionShop) {
      if (!potionShop) return false;
      const lv = potionShop.level || 1;
      const potionPrice = Math.max(15, 32 - lv * 2);
      const bentoPrice = 45;
      const gold = hunter.personalGold || 0;
      const lackPotion = (hunter.potions.hp || 0) < getMaxHpPotionCapacity(hunter.level, hunter.rebirthCount)
        || (hunter.potions.mp || 0) < getMaxMpPotionCapacity(hunter.level, hunter.rebirthCount);
      const lackBento = (hunter.bento || 0) < getMaxBentoCapacity(hunter.level, hunter.rebirthCount);
      return (lackPotion && gold >= potionPrice) || (lackBento && gold >= bentoPrice);
    }

    function canHunterAffordEnhance(hunter, cost, upgradeCandidate) {
      const gold = hunter.personalGold || 0;
      if (gold < cost + 100) return false;
      const keepGold = (upgradeCandidate ? upgradeCandidate.rule.goldCost : 0) + 100;
      return gold - cost >= keepGold || cost <= gold * 0.05;
    }

    // 건물 앞으로 이동 (공통)
    function sendHunterToBuilding(hunter, bld, bubbleText = '', bubbleColor = '#fde047') {
      hunter.setDestinationWithGatePath(bld.x, bld.y + bld.h / 2 + 16);
      hunter.targetBuildingName = bld.name;
      hunter.targetBuildingType = bld.type;
      hunter.targetGroundId = null;
      hunter.state = 'WALKING';
      if (bubbleText) interactionManager.spawnBubble(hunter, bubbleText, bubbleColor);
    }

    // 사냥터로 출정 (천공의 섬은 포탈 게이트로)
    function sendHunterToGround(hunter, ground, bubbleText = '', bubbleColor = '#86efac') {
      // 성운의 천궁: 길이 없어 날개로 날아감 (js/15c-celestial-palace.js)
      if (typeof CELESTIAL_PALACE_GROUND !== 'undefined' && ground.id === CELESTIAL_PALACE_GROUND.id) {
        return typeof startCelestialFlight === 'function' ? Boolean(startCelestialFlight(hunter)) : false;
      }
      if (ground.walkable === false && ground.id === SKY_ISLAND_GROUND.id) {
        return Boolean(sendRebirthHunterToSkyIslandGate(hunter));
      }
      const aliveMonsters = ground.monsters.filter(m => m.hp > 0);
      let gx = ground.centerX;
      let gy = ground.centerY;
      if (aliveMonsters.length > 0) {
        const pickMon = aliveMonsters[Math.floor(Math.random() * aliveMonsters.length)];
        gx = pickMon.x;
        gy = pickMon.y;
      } else {
        const pad = 80;
        gx = ground.bounds.x + pad + Math.random() * (ground.bounds.w - pad * 2);
        gy = ground.bounds.y + 95 + Math.random() * (ground.bounds.h - pad - 95);
      }
      hunter.setDestinationWithGatePath(gx, gy);
      hunter.targetBuildingName = ground.name;
      hunter.targetBuildingType = 'hunting_ground';
      hunter.targetGroundId = ground.id;
      hunter.state = 'WALKING';
      if (bubbleText) interactionManager.spawnBubble(hunter, bubbleText, bubbleColor);
      return true;
    }

    Hunter.prototype.pickNextDestination = function (skipEnhance = false) {
      // [최우선] 오크 토벌전 90초 준비(1분 정비 + 30초 대기) 단계
      if (ORC_SUBJUGATION.status === 'PREPARING') {
        if (ORC_SUBJUGATION.fallenHunterIds.has(this.id)) {
          this.state = 'IDLE';
          this.stateTimer = 1.5;
          this.targetBuildingName = '';
          this.targetBuildingType = '';
          this.targetGroundId = null;
          this.currentTargetMonster = null;
          return;
        }
        this.currentTargetMonster = null;
        this.activeGroundId = null;
        const remPrep = ORC_SUBJUGATION.prepTimer || 0;
        // 남은 시간이 30초 이하인 구간은 [오크의 숲] 입구 출격 대기 지점으로 소집
        if (remPrep <= 30) {
          if (this.targetBuildingType !== 'orc_subjugation_standby') {
            const musterPos = getRaidMusterPosition(this);
            this.setDestinationWithGatePath(musterPos.x, musterPos.y);
            this.targetBuildingName = '오크의 숲 입구 출격 대기지 (30초 소집)';
            this.targetBuildingType = 'orc_subjugation_standby';
            this.targetGroundId = null;
            this.state = 'WALKING';
          }
          return;
        }
        const blds = village.getAllBuildings();
        if (this.hp < this.maxHp * 0.9 || this.mp < this.maxMp * 0.85 || this.fatigue > 30) {
          const rec = blds.find(b => b.type === 'temple') || blds.find(b => b.type === 'inn');
          if (rec) {
            this.setDestinationWithGatePath(rec.x, rec.y + rec.h / 2 + 16);
            this.targetBuildingName = rec.name;
            this.targetBuildingType = rec.type;
            this.targetGroundId = null;
            this.state = 'WALKING';
            return;
          }
        }
        if (hunterNeedsSupplies(this, blds.find(b => b.type === "potion"))) { // 물약 · 도시락 보충
          const potBld = blds.find(b => b.type === 'potion');
          if (potBld) {
            this.setDestinationWithGatePath(potBld.x, potBld.y + potBld.h / 2 + 16);
            this.targetBuildingName = potBld.name;
            this.targetBuildingType = potBld.type;
            this.targetGroundId = null;
            this.state = 'WALKING';
            return;
          }
        }
        const smithySubjBld = blds.find(b => b.type === 'smithy');
        if (smithySubjBld && ['weapon', 'armor', 'helmet', 'accessory'].some(s => this.checkTierUpgradeCondition(s, smithySubjBld.level).canUpgrade)) {
          this.setDestinationWithGatePath(smithySubjBld.x, smithySubjBld.y + smithySubjBld.h / 2 + 16);
          this.targetBuildingName = smithySubjBld.name;
          this.targetBuildingType = smithySubjBld.type;
          this.targetGroundId = null;
          this.state = 'WALKING';
          return;
        }
        const encSubjBld = blds.find(b => b.type === 'enchanter');
        if (encSubjBld && this.personalGold >= 200 && ['weapon', 'armor', 'helmet', 'accessory'].some(s => (this.equipment[s]?.enhance || 0) < 15)) {
          this.setDestinationWithGatePath(encSubjBld.x, encSubjBld.y + encSubjBld.h / 2 + 16);
          this.targetBuildingName = encSubjBld.name;
          this.targetBuildingType = encSubjBld.type;
          this.targetGroundId = null;
          this.state = 'WALKING';
          return;
        }
        // 정비 완료 후 마을 동쪽 관문 앞 집결지 대기
        this.setDestinationWithGatePath(
          TOWN_EAST_GATE.entryWaypointX - 24 - Math.random() * 80,
          TOWN_EAST_GATE.roadCenterY + (Math.random() - 0.5) * 44
        );
        this.targetBuildingName = '마을 광장 토벌 집결지';
        this.targetBuildingType = 'orc_subjugation_standby';
        this.targetGroundId = null;
        this.state = 'WALKING';
        return;
      }
  
      if (ORC_SUBJUGATION.status === 'ACTIVE') {
        if (ORC_SUBJUGATION.fallenHunterIds.has(this.id)) {
          this.state = 'IDLE';
          this.stateTimer = 1.5;
          this.targetBuildingName = '';
          this.targetBuildingType = '';
          this.targetGroundId = null;
          this.currentTargetMonster = null;
          return;
        }
        const topGround = HUNTING_GROUNDS.find(g => g.id === 'top_field_70_99');
        const raidSlot = getRaidHunterSlot(this);
        const destX = raidSlot.x;
        const destY = raidSlot.y;
        this.state = 'ORC_SUBJUGATION_RAID';
        this.activeGroundId = 'top_field_70_99';
        this.targetGroundId = 'top_field_70_99';
        this.targetBuildingName = '오크의 숲 (오크 토벌전)';
        this.targetBuildingType = 'orc_subjugation';
        this.setDestinationWithGatePath(destX, destY);
        return;
      }
  
      // [최우선] 보스 필드가 개방된 경우: 1분 정비 시간 동안 회복/물약/강화 정비 후 성소 입구 집결, 전투 개시 시 전원 돌격
      if (BOSS_SANCTUM.status === 'PREPARING') {
        if (BOSS_SANCTUM.fallenHunterIds.has(this.id)) {
          this.state = 'IDLE';
          this.stateTimer = 1.5;
          this.targetBuildingName = '';
          this.targetBuildingType = '';
          this.targetGroundId = null;
          this.currentTargetMonster = null;
          return;
        }
        this.currentTargetMonster = null;
        const blds = village.getAllBuildings();
        if (this.hp < this.maxHp * 0.9 || this.mp < this.maxMp * 0.85 || this.fatigue > 30) {
          const rec = blds.find(b => b.type === 'temple') || blds.find(b => b.type === 'inn');
          if (rec) {
            this.setDestinationWithGatePath(rec.x, rec.y + rec.h / 2 + 16);
            this.targetBuildingName = rec.name;
            this.targetBuildingType = rec.type;
            this.targetGroundId = null;
            this.state = 'WALKING';
            return;
          }
        }
        if (hunterNeedsSupplies(this, blds.find(b => b.type === "potion"))) { // 물약 · 도시락 보충
          const potBld = blds.find(b => b.type === 'potion');
          if (potBld) {
            this.setDestinationWithGatePath(potBld.x, potBld.y + potBld.h / 2 + 16);
            this.targetBuildingName = potBld.name;
            this.targetBuildingType = potBld.type;
            this.targetGroundId = null;
            this.state = 'WALKING';
            return;
          }
        }
        const smithyRaidBld = blds.find(b => b.type === 'smithy');
        if (smithyRaidBld && ['weapon', 'armor', 'helmet', 'accessory'].some(s => this.checkTierUpgradeCondition(s, smithyRaidBld.level).canUpgrade)) {
          this.setDestinationWithGatePath(smithyRaidBld.x, smithyRaidBld.y + smithyRaidBld.h / 2 + 16);
          this.targetBuildingName = smithyRaidBld.name;
          this.targetBuildingType = smithyRaidBld.type;
          this.targetGroundId = null;
          this.state = 'WALKING';
          return;
        }
        const encBld = blds.find(b => b.type === 'enchanter');
        if (encBld && this.personalGold >= 200 && ['weapon', 'armor', 'helmet', 'accessory'].some(s => (this.equipment[s]?.enhance || 0) < 15)) {
          this.setDestinationWithGatePath(encBld.x, encBld.y + encBld.h / 2 + 16);
          this.targetBuildingName = encBld.name;
          this.targetBuildingType = encBld.type;
          this.targetGroundId = null;
          this.state = 'WALKING';
          return;
        }
        // 정비 완료 시 성소 앞 집결지로 이동
        this.setDestinationWithGatePath(
          BOSS_SANCTUM.gateX + (Math.random() - 0.5) * 90,
          BOSS_SANCTUM.gateY + 26 + Math.random() * 14
        );
        this.targetBuildingName = '고대 수호자 성소 집결지';
        this.targetBuildingType = 'boss_standby';
        this.targetGroundId = null;
        this.state = 'WALKING';
        return;
      }
  
      if (BOSS_SANCTUM.status === 'ACTIVE') {
        if (BOSS_SANCTUM.fallenHunterIds.has(this.id)) {
          this.state = 'IDLE';
          this.stateTimer = 1.5;
          this.targetBuildingName = '';
          this.targetBuildingType = '';
          this.targetGroundId = null;
          this.currentTargetMonster = null;
          return;
        }
        this.state = 'BOSS_RAID';
        this.currentTargetMonster = BOSS_SANCTUM.boss;
        this.setDestinationWithGatePath(BOSS_SANCTUM.boss.x, BOSS_SANCTUM.boss.y + 32);
        return;
      }
  
      const buildings = village.getAllBuildings();
  
      // [초월 환생의 제단 출정 지시] 마을에서 회복·식사·물약 정비를 마친 뒤 제단으로 출발
      // (시설마다 한 번씩만 들러서 정비가 끝없이 반복되지 않게 함)
      if (this.altarPrepPending) {
        if (!canCommandRebirthAltarHunt(this)) {
          this.altarPrepPending = false;
          this.altarPrepVisited = null;
        } else {
          const visited = this.altarPrepVisited || (this.altarPrepVisited = {});
          const goPrep = (bld, bubbleText) => {
            visited[bld.type] = true;
            this.setDestinationWithGatePath(bld.x, bld.y + bld.h / 2 + 16);
            this.targetBuildingName = bld.name;
            this.targetBuildingType = bld.type;
            this.targetGroundId = null;
            this.currentTargetMonster = null;
            this.state = 'WALKING';
            if (bubbleText) interactionManager.spawnBubble(this, bubbleText, '#f0abfc');
          };
  
          if (this.hp < this.maxHp * 0.9 || this.mp < this.maxMp * 0.85 || this.fatigue > 30) {
            const rec = buildings.find(b => b.type === 'temple' && !visited.temple)
              || buildings.find(b => b.type === 'inn' && !visited.inn);
            if (rec) { goPrep(rec, '✨ 제단 출정 전 회복 정비!'); return; }
          }
          if (this.hunger < 60) {
            const food = buildings.find(b => b.type === 'tavern' && !visited.tavern);
            if (food) { goPrep(food, '🍖 제단 출정 전 든든히 식사!'); return; }
          }
          if (hunterNeedsSupplies(this, buildings.find(b => b.type === "potion"))) {
            const potBld = buildings.find(b => b.type === "potion" && !visited.potion);
            if (potBld) { goPrep(potBld, "🧪 제단 출정 전 물약 · 도시락 보충!"); return; }
          }
  
          // 정비 완료 → 초월 환생의 제단으로 출발
          this.altarPrepPending = false;
          this.altarPrepVisited = null;
          if (REBIRTH_ALTAR.boss.hp <= 0) {
            resetRebirthAltarBoss(true);
          }
          this.currentTargetMonster = REBIRTH_ALTAR.boss;
          this.currentTargetHunter = null;
          this.activeGroundId = null;
          this.targetBuildingName = REBIRTH_ALTAR.name;
          this.targetBuildingType = REBIRTH_ALTAR.id;
          this.targetGroundId = null;
          this.state = 'WALKING';
          this.setDestinationWithGatePath(
            REBIRTH_ALTAR.centerX + (Math.random() - 0.5) * 44,
            REBIRTH_ALTAR.centerY + 26 + (Math.random() - 0.5) * 20
          );
          interactionManager.spawnBubble(this, '✨ 정비 완료! 초월 환생의 제단으로 출발!', '#f0abfc');
          return;
        }
      }

    // ---------- 평상시 ----------
    const cfg = HUNTER_AI_CFG;
    const find = (type) => buildings.find(b => b.type === type);
    const inTown = this.x < TOWN_EAST_GATE.wallX;

    // 1. Lv.99 환생
    if (this.level >= LEVEL_REBIRTH_CONFIG.maxLevel && this.rebirthCount < LEVEL_REBIRTH_CONFIG.maxRebirths) {
      const rebirthHall = find('rebirth_hall');
      if (rebirthHall) {
        sendHunterToBuilding(this, rebirthHall);
        return;
      } else if (Math.random() < 0.35) {
        interactionManager.spawnBubble(this, '⛩️ Lv.99 달성! 환생소가 지어지길 기다리는 중...', '#fde047');
      }
    }

    // 1-1. 환생 헌터가 초월 윤회의 인장이 없으면 지시가 없어도 제단 출정 (마을에서 정비 후 출발)
    //      제단에서 체력 부족으로 물러나면 3분 뒤 다시 도전하고, 그 사이에는 평소처럼 성장한다.
    if (
      typeof canCommandRebirthAltarHunt === 'function' &&
      canCommandRebirthAltarHunt(this) &&
      Date.now() >= (this.altarAutoRetryAt || 0)
    ) {
      this.altarPrepPending = true;
      this.altarPrepVisited = {};
      interactionManager.spawnBubble(this, '✨ 초월 윤회의 인장을 얻으러 제단 출정 준비!', '#f0abfc');
      this.pickNextDestination(skipEnhance);
      return;
    }

    // 2. 생존: 체력·피로
    if (this.hp < this.maxHp * cfg.restHpRatio || this.fatigue >= cfg.restFatigue) {
      const restBld = find('temple') || find('inn');
      if (restBld) {
        sendHunterToBuilding(this, restBld);
        return;
      }
    }

    // 3. 배고픔
    if (this.hunger < cfg.hungerThreshold) {
      const tavern = find('tavern');
      if (tavern) {
        sendHunterToBuilding(this, tavern);
        return;
      }
    }

    // 3a. 인성이 마이너스면 정화의 성소에서 정화 (정화세를 낼 골드가 있을 때)
    if ((this.alignment || 0) < 0) {
      const sanctuary = find('purification_sanctuary');
      if (sanctuary && (this.personalGold || 0) >= 55 + (sanctuary.level || 1) * 20) {
        sendHunterToBuilding(this, sanctuary, '🕊️ 인성 정화하러 정화의 성소로!', '#86efac');
        return;
      }
    }

    // 4. 물약 · 도시락
    //    - 마을 안: 물약이나 도시락이 최대치보다 하나라도 모자라면(살 골드가 있으면) 사냥 나가기 전에 가득 채운다
    //    - 마을 밖: 물약이 거의 바닥일 때만 돌아와 보충
    const maxHpPotCap = getMaxHpPotionCapacity(this.level, this.rebirthCount);
    const maxMpPotCap = getMaxMpPotionCapacity(this.level, this.rebirthCount);
    const potionsEmpty = this.potions.hp < Math.min(2, maxHpPotCap) || this.potions.mp < Math.min(1, maxMpPotCap);
    const potionShop = find('potion');
    if (potionShop && ((potionsEmpty && this.personalGold >= 50) || (inTown && hunterNeedsSupplies(this, potionShop)))) {
      sendHunterToBuilding(this, potionShop, (this.bento || 0) < getMaxBentoCapacity(this.level, this.rebirthCount) ? '🍱 물약 · 도시락 챙기러!' : '');
      return;
    }

    // 5. 판매 (승급 재료는 남기고)
    const sellCount = getHunterSellPlan(this).reduce((s, e) => s + e.qty, 0);
    if (sellCount >= cfg.sellMinCount) {
      const generalStore = find('generalstore');
      if (generalStore) {
        sendHunterToBuilding(this, generalStore, '🛍️ 전리품·영혼결정 판매하러 잡화상점으로!');
        return;
      }
    }

    // 6. 날개 강화
    this.syncAutoEquipInsignia();
    this.syncAutoEquipWing();
    const wingEnhanceCost = this.getWingEnhanceCost();
    const hasWingEnhanceBudget = Boolean(
      this.getEquippedWing() &&
      (this.wingEnhance || 0) < 15 &&
      (this.wingEnhanceCooldown || 0) <= 0 &&
      this.personalGold >= wingEnhanceCost &&
      this.hp >= this.maxHp * 0.45 &&
      this.fatigue < 80
    );
    if (hasWingEnhanceBudget) {
      const skySmithy = find('sky_smithy');
      if (skySmithy) {
        sendHunterToBuilding(this, skySmithy);
        return;
      }
    }

    // 7~8. 장비 티어 승급
    const isHealthy = this.hp >= this.maxHp * 0.7 && this.mp >= this.maxMp * 0.5 && this.hunger >= 50 && this.fatigue <= 60;
    const smithy = find('smithy');
    const upgradeCandidate = smithy ? this.findTierUpgradeCandidate(smithy.level) : null;
    const canPromoteAnyNow = smithy
      ? ['weapon', 'armor', 'helmet', 'accessory'].some(s => this.checkTierUpgradeCondition(s, smithy.level).canUpgrade)
      : false;

    if (canPromoteAnyNow && smithy) {
      sendHunterToBuilding(this, smithy, '⚒️ 장비 티어 승급 먼저 진행!');
      return;
    }

    // 9. 장비 강화 (골드가 있으면 자주 · 승급 재료를 모으는 중이어도 다른 부위는 강화)
    //    승급 대기 부위가 있으면 그 승급 비용은 남겨 둔다.
    if (!skipEnhance && (this.enhanceCooldown || 0) <= 0 && this.fatigue < 80 && this.hp >= this.maxHp * 0.45) {
      const enchanter = find('enchanter');
      const nextEnhance = enchanter ? this.getNextEnhanceTarget() : null;
      if (nextEnhance && canHunterAffordEnhance(this, nextEnhance.cost, upgradeCandidate)) {
        sendHunterToBuilding(this, enchanter, '🔮 골드가 넉넉하니 장비 강화하러!', '#c084fc');
        return;
      }
    }

    const bestGround = getHunterBestGround(this);
    const dungeonBld = find('dungeon');
    const canDungeon = canHunterChallengeDungeon(this, dungeonBld);

    if (upgradeCandidate && isHealthy && this.materials < upgradeCandidate.rule.matCost) {
      // 재료 부족: 지금 갈 수 있는 사냥터에서 모은다 (환생 헌터는 성역/천공의 섬)
      if (bestGround && sendHunterToGround(this, bestGround, `⚒️ T${upgradeCandidate.nextTier} 승급 재료 수집 출정!`, '#fde047')) {
        return;
      }
      if (canDungeon) {
        sendHunterToBuilding(this, dungeonBld, `🕳️ T${upgradeCandidate.nextTier} 승급 재료 찾으러 던전으로!`, '#c4b5fd');
        return;
      }
    }
    // (재료는 있는데 골드가 부족하면 아래 사냥으로 넘어가 골드를 모은다)

    // 10a. 지하 던전 (들어갈 층이 있으면 사냥 대신 가끔 던전 탐험 · 피로가 낮을 때만)
    if (canDungeon && isHealthy && (this.fatigue || 0) < 40 && Math.random() < HUNTER_AI_DUNGEON_CHANCE) {
      sendHunterToBuilding(this, dungeonBld, '🕳️ 지하 던전 탐험 출발!', '#c4b5fd');
      return;
    }

    // 10. 사냥
    const isRebornHunter = (this.rebirthCount || 0) >= 1;
    if (bestGround && (bestGround.id === SKY_ISLAND_GROUND.id || isRebornHunter || Math.random() < 0.85)) {
      if (sendHunterToGround(this, bestGround)) return;
    }

    // 11. 맞는 사냥터가 없으면 던전
    if (!bestGround && isHealthy && canDungeon) {
      sendHunterToBuilding(this, dungeonBld, '🕳️ 적정 사냥터 부재 · 지하 던전 도전!', '#c4b5fd');
      return;
    }

    // 12. 마을 시설 둘러보기
    const candidates = buildings.filter(b => b.type !== 'townhall' || Math.random() < 0.25);
    if (candidates.length > 0) {
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      sendHunterToBuilding(this, chosen);
    } else {
      this.setDestinationWithGatePath((Math.random() - 0.5) * 140, 18 + (Math.random() - 0.5) * 30);
      this.targetBuildingName = '';
      this.targetBuildingType = '';
      this.targetGroundId = null;
      this.state = 'WALKING';
    }
    if ((this.rebirthCount || 0) >= SKY_ISLAND_GROUND.minRebirth) {
      this.postSkyTownActionDone = true;
    }
  };
