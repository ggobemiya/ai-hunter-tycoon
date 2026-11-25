// [08-hunter-class] Hunter 클래스 (헌터 AI·전투·성장 전체)
    class Hunter {
      constructor(id, preset, x, y) {
        this.id = id;
        this.name = (preset.name || '모험가').slice(0, 4);
        this.gender = (preset.gender === 'M' || preset.gender === 'F')
          ? preset.gender
          : (Math.random() < 0.5 ? 'F' : 'M');
        this.baseJob = preset.baseJob || preset.job || '버서커';
        this.job = this.baseJob;
        this.baseAtk = preset.baseAtk || 110;
        this.baseDef = preset.baseDef || 60;
        this.crit = preset.crit || 15;
        this.hairColor = preset.hair;
        this.armorColor = preset.armor;

        // 32가지 성격 중 무작위 배정 (특성 또는 패널티 중 1종 보유)
        this.personality = HUNTER_PERSONALITIES[Math.floor(Math.random() * HUNTER_PERSONALITIES.length)];
        // 헌터 인성(-100 카오스 ~ +100 선인, 기본 0 중립)
        this.alignment = Math.max(-100, Math.min(100, Math.round(Number(preset.alignment) || 0)));

        // 4개 부위(무기, 방어구, 투구, 장신구) 독립 장비 데이터 안전 복사
        const srcEq = preset.equipment || {};
        this.equipment = {
          weapon:    { tier: 1, enhance: preset.weaponEnhance || 0, ...(srcEq.weapon || {}) },
          armor:     { tier: 1, enhance: 0, ...(srcEq.armor || {}) },
          helmet:    { tier: 1, enhance: 0, ...(srcEq.helmet || {}) },
          accessory: { tier: 1, enhance: 0, ...(srcEq.accessory || {}) }
        };

        // 성장, 경험치, 환생 및 트리형 전직 상태 (최대 Lv.99 / 최대 5환생 · 1~5차 전직)
        this.rebirthCount = Math.min(LEVEL_REBIRTH_CONFIG.maxRebirths, preset.rebirthCount || 0);
        this.advancementPath = Array.isArray(preset.advancementPath) ? [...preset.advancementPath] : [];
        this.advancementTier = Math.max(preset.advancementTier || 0, this.advancementPath.length);
        const latestNode = this.advancementPath.length > 0
          ? JOB_ADVANCEMENT_NODES_BY_ID[this.advancementPath[this.advancementPath.length - 1]]
          : null;
        this.currentJobName = preset.currentJobName || (latestNode ? latestNode.name : this.baseJob);
        this.level = Math.min(LEVEL_REBIRTH_CONFIG.maxLevel, preset.level || 1);
        this.exp = 0;
        this.notifiedMaxLvForRebirth = false;

        // 확장형 스킬 컨테이너 (기본 직업 액티브2/패시브2 + 전직 단계마다 액티브1/패시브1 누적)
        this.skills = {
          actives: [],
          passives: []
        };
        const jobSkillData = JOB_SKILLS[this.baseJob] || { actives: [], passives: [] };
        jobSkillData.actives.forEach(s => this.learnSkill('actives', s));
        jobSkillData.passives.forEach(s => this.learnSkill('passives', s));

        this.advancementPath.forEach((nodeId) => {
          const advNode = JOB_ADVANCEMENT_NODES_BY_ID[nodeId];
          if (advNode) {
            this.learnSkill('actives', advNode.activeSkill);
            this.learnSkill('passives', advNode.passiveSkill);
          }
        });

        const p = getEffectivePersonalityProfile(this.personality, this.rebirthCount);
        const speedPassiveBonus = this.skills.passives.reduce((acc, sk) => acc + (sk.speedBonus || 0), 0) + (p.speedBonus || 0);

        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.waypoints = [];
        this.baseSpeed = Math.max(36, 68 + speedPassiveBonus);
        this.facing = 1;
        this.walkCycle = Math.random() * Math.PI * 2;

        this.state = 'IDLE';
        this.stateTimer = 0.3 + Math.random() * 0.7;
        this.targetBuildingName = '';
        this.targetBuildingType = '';
        this.targetGroundId = null;
        this.activeGroundId = null;
        this.currentTargetMonster = null;
        this.currentTargetHunter = null;
        this.huntTimer = 0;

        this.dungeonFloor = 0;
        this.dungeonProgress = 0;
        this.dungeonDuration = 0;
        this.dungeonTimer = 0;
        this.bestDungeonFloor = preset.bestDungeonFloor || 0;

        this.personalGold = preset.personalGold ?? 150;
        this.inventory = new HunterInventory(24);
        if (Array.isArray(preset.inventoryItems) && preset.inventoryItems.length > 0) {
          this.inventory.loadFromJSON(preset.inventoryItems);
        } else if (preset.lootInventory && typeof preset.lootInventory === 'object') {
          if (preset.lootInventory.beginner > 0) this.inventory.addItem('loot_beginner_crystal', preset.lootInventory.beginner);
          if (preset.lootInventory.mid > 0) this.inventory.addItem('loot_mid_ore', preset.lootInventory.mid);
          if (preset.lootInventory.high > 0) this.inventory.addItem('loot_high_heart', preset.lootInventory.high);
          const accounted = (preset.lootInventory.beginner || 0) + (preset.lootInventory.mid || 0) + (preset.lootInventory.high || 0);
          const rem = Math.max(0, (preset.materials || 0) - accounted);
          if (rem > 0) this.inventory.addItem('loot_beginner_crystal', rem);
        } else if ((preset.materials || 0) > 0) {
          this.inventory.addItem('loot_beginner_crystal', preset.materials);
        }
        this.earnedGold = preset.earnedGold ?? 0;
        const initMaxHpPot = getMaxHpPotionCapacity(this.level, this.rebirthCount);
        const initMaxMpPot = getMaxMpPotionCapacity(this.level, this.rebirthCount);
        this.potions = {
          hp: 2,
          mp: 2,
          ...(preset.potions || {}),
          hp: Math.min(initMaxHpPot, Math.max(0, preset.potions?.hp ?? 2)),
          mp: Math.min(initMaxMpPot, Math.max(0, preset.potions?.mp ?? 2))
        };
        const initMaxBento = getMaxBentoCapacity(this.level, this.rebirthCount);
        this.bento = Math.min(
          initMaxBento,
          Math.max(0, preset.bento ?? (initMaxBento > 0 ? initMaxBento : 0))
        );

        this.hunger = 80 + Math.random() * 20;
        this.fatigue = Math.random() * 20;
        this.attackCooldown = 0;
        this.attackAnimTimer = 0;
        this.enhanceCooldown = 0;
        this.wingEnhanceCooldown = 0;
        this.facilityStuckTimer = 0;
        this.particles = [];
        this.equippedInsigniaId = (preset.equippedInsigniaId && ITEM_CATALOG[preset.equippedInsigniaId])
          ? preset.equippedInsigniaId
          : null;
        this.syncAutoEquipInsignia();
        this.equippedWingId = (preset.equippedWingId && ITEM_CATALOG[preset.equippedWingId])
        ? preset.equippedWingId
        : null;
      this.wingEnhance = Math.max(0, Math.min(15, Math.floor(Number(preset.wingEnhance) || 0)));
      this.postSkyTownActionDone = false;
      // 몬스터 3마리 사냥당 인성 +1 누적용 카운터
      this.monsterKillAlignmentProgress = Math.max(0, Math.min(2, Math.floor(Number(preset.monsterKillAlignmentProgress) || 0)));

        this.maxHp = 500;
        this.maxMp = 160;
        this.hp = 500;
        this.mp = 160;
        this.recalculateVitals(true);
      }

      get speed() {
        const wing = this.getEquippedWing();
        const enh = Math.max(0, this.wingEnhance || 0);
        const wingSpeed = wing ? ((wing.speedBonus || 0) + enh * (wing.enhanceSpeedBonus || 0)) : 0;
        return (this.baseSpeed || 68) + wingSpeed;
      }

      set speed(val) {
        this.baseSpeed = val;
      }

      get materials() {
        return this.inventory ? this.inventory.getTotalCraftingMaterialCount() : 0;
      }

      set materials(val) {
        if (!this.inventory) return;
        const target = Math.max(0, Math.floor(val || 0));
        const current = this.materials;
        if (target > current) {
          this.inventory.addItem('loot_beginner_crystal', target - current);
        } else if (target < current) {
          this.inventory.consumeCraftingMaterials(current - target);
        }
      }

      get lootInventory() {
        return {
          beginner: this.inventory ? this.inventory.getCount('loot_beginner_crystal') : 0,
          mid: this.inventory ? this.inventory.getCount('loot_mid_ore') : 0,
          high: this.inventory ? this.inventory.getCount('loot_high_heart') : 0,
          top: this.inventory ? this.inventory.getCount('loot_top_astral') : 0,
          rebirth: this.inventory ? this.inventory.getCount('loot_rebirth_essence') : 0
        };
      }

      set lootInventory(obj) {
        if (!this.inventory || !obj) return;
        ['beginner', 'mid', 'high', 'top', 'rebirth'].forEach(k => {
          const itemId = LOOT_TIER_TO_ITEM_ID[k];
          const cur = this.inventory.getCount(itemId);
          const next = Math.max(0, Math.floor(obj[k] || 0));
          if (next > cur) this.inventory.addItem(itemId, next - cur);
          else if (next < cur) this.inventory.removeItem(itemId, cur - next);
        });
      }

      learnSkill(category, skillTpl) {
        if (!skillTpl || !this.skills[category]) return;
        const exists = this.skills[category].some(s => (skillTpl.id && s.id === skillTpl.id) || s.name === skillTpl.name);
        if (exists) return;
        const lv = Math.min(SKILL_SYSTEM_CONFIG.maxSkillLevel, Math.max(1, skillTpl.lv || 1));
        this.skills[category].push({
          ...skillTpl,
          lv,
          uses: Math.max(0, skillTpl.uses || 0),
          reqUses: SKILL_SYSTEM_CONFIG.getRequiredUses(lv),
          cooldownRemaining: 0
        });
      }

      // 전직 선택: 성격으로 공격/방어 성향을 정하고, 성향이 맞는 직업을 고른다 (PERSONALITY_JOB_LEAN 참고)
      chooseAdvancementOption(optA, optB) {
        const lean = PERSONALITY_JOB_LEAN[this.personality?.id] || ['balanced', null];
        const scoreOption = (opt) => {
          let s = Math.random() * 4;                                   // 같은 점수일 때만 갈리는 작은 운
          const side = opt.tendency === 'defense' ? 'defense' : 'offense'; // 방어형 외에는 공격형
          if (lean[0] === side) s += 10;                               // 공격/방어 성향이 맞으면 크게 가산
          if (lean[1] && lean[1] === opt.tendency) s += 5;             // 좋아하는 세부 성향(치명·마법·속도 등)
          return s;
        };
        return scoreOption(optA) >= scoreOption(optB) ? optA : optB;
      }

      performRebirth(rebirthHall = null) {
        if (this.level < LEVEL_REBIRTH_CONFIG.maxLevel || this.rebirthCount >= LEVEL_REBIRTH_CONFIG.maxRebirths) {
          return false;
        }
        const choices = getNextAdvancementChoices(this);
        const pickedNode = choices.length >= 2
          ? this.chooseAdvancementOption(choices[0], choices[1])
          : (choices[0] || null);

        this.rebirthCount += 1;
        this.level = 1;
        this.exp = 0;
        this.notifiedMaxLvForRebirth = false;

        if (pickedNode) {
          this.advancementPath.push(pickedNode.id);
          this.advancementTier = this.advancementPath.length;
          this.currentJobName = pickedNode.name;
          this.learnSkill('actives', pickedNode.activeSkill);
          this.learnSkill('passives', pickedNode.passiveSkill);
        }

        const hallLv = rebirthHall ? rebirthHall.level : 1;
        if (hallLv > 1) {
          this.gainExp(hallLv * 30);
        }

        const postRebirthMaxBento = getMaxBentoCapacity(this.level, this.rebirthCount);
        this.bento = Math.min(postRebirthMaxBento, Math.max(this.bento || 0, 1));
        const postRebirthMaxHpPot = getMaxHpPotionCapacity(this.level, this.rebirthCount);
        const postRebirthMaxMpPot = getMaxMpPotionCapacity(this.level, this.rebirthCount);
        if (this.potions) {
          this.potions.hp = Math.min(postRebirthMaxHpPot, Math.max(0, this.potions.hp || 0));
          this.potions.mp = Math.min(postRebirthMaxMpPot, Math.max(0, this.potions.mp || 0));
        }

        this.recalculateVitals(true);
        const advLabel = pickedNode ? ` · [${pickedNode.name}] 전직 완료!` : '';
        interactionManager.spawnBubble(this, `✨ ${this.rebirthCount}환생 달성!${advLabel}`, '#f0abfc');
        showToast(`⛩️ ${this.name} ${this.rebirthCount}환생 달성!${advLabel}`);
        return true;
      }

      gainExp(amount) {
        const gain = Math.max(0, Math.round(applyExpRate(amount, 'hunter'))); // ⭐ 경험치 배율 (01-core-utils.js EXP_RATE)
        if (gain <= 0) return;
        if (this.level >= LEVEL_REBIRTH_CONFIG.maxLevel) {
          this.exp = this.getRequiredExp();
          if (!this.notifiedMaxLvForRebirth && this.rebirthCount < LEVEL_REBIRTH_CONFIG.maxRebirths) {
            this.notifiedMaxLvForRebirth = true;
            interactionManager.spawnBubble(this, '✨ Lv.99 달성! 환생소에서 환생 가능!', '#fde047');
          }
          return;
        }
        this.exp += gain;
        let leveledUp = false;
        while (this.level < LEVEL_REBIRTH_CONFIG.maxLevel && this.exp >= this.getRequiredExp()) {
          this.exp -= this.getRequiredExp();
          this.level += 1;
          leveledUp = true;
          if (this.level === 20) {
            const maxBento = getMaxBentoCapacity(20, this.rebirthCount);
            this.bento = Math.max(this.bento || 0, maxBento);
          }
          if ((this.rebirthCount || 0) < 1 && this.level >= 40 && this.level % 20 === 0) {
            const nextHpMax = getMaxHpPotionCapacity(this.level, this.rebirthCount);
            if (this.potions) {
              this.potions.hp = Math.min(nextHpMax, (this.potions.hp || 0) + 1);
            }
          }
        }
        if (this.level >= LEVEL_REBIRTH_CONFIG.maxLevel) {
          this.exp = this.getRequiredExp();
        }
        if (leveledUp) {
          this.recalculateVitals(false);
          this.hp = this.maxHp;
          this.mp = this.maxMp;
          interactionManager.spawnBubble(this, `🆙 Lv.${this.level} 달성!`, '#fde047');
        }
      }

      setDestinationWithGatePath(destX, destY) {
        this.targetX = destX;
        this.targetY = destY;
        const startInTown = this.x < TOWN_EAST_GATE.wallX;
        const destInTown = destX < TOWN_EAST_GATE.wallX;
        const path = [];

        // 1) 출발지가 사냥터 안쪽(중급/상급/최상급/환생 성역)인 경우 연결 통로를 거쳐 초보 사냥터 도로로 이동
        const startInTopField = !startInTown && this.x >= 1410 && this.y >= -360 && this.y <= 360;
        const destInTopField = !destInTown && destX >= 1410 && destY >= -360 && destY <= 360;
        const startInRebirthField = !startInTown && this.x >= 1410 && this.y > 360 && this.y <= 795;
        const destInRebirthField = !destInTown && destX >= 1410 && destY > 360 && destY <= 795;
        const startInSouthField = !startInTown && (this.y >= 352.5 || startInRebirthField);
        const destInSouthField = !destInTown && (destY >= 352.5 || destInRebirthField);

        if (startInTopField && !destInTopField) {
          path.push({ x: 1455, y: 18 });
          path.push({ x: 1365, y: 18 });
        }

        if (startInRebirthField && !destInRebirthField) {
          path.push({ x: 1455, y: 575 });
          path.push({ x: 1365, y: 575 });
          path.push({ x: 960, y: 575 });
        }

        if (startInSouthField && (!destInSouthField || destInTown)) {
          if (this.y >= 800) {
            path.push({ x: 960, y: 840 });
            path.push({ x: 960, y: 760 });
          }
          path.push({ x: 960, y: 390 });
          path.push({ x: 960, y: 310 });
        } else if (startInSouthField && destInSouthField && !startInRebirthField && !destInRebirthField) {
          // 중급 <-> 상급 사냥터 간 직접 이동 시 연결 통로 경유
          if (this.y < 800 && destY >= 800) {
            path.push({ x: 960, y: 760 });
            path.push({ x: 960, y: 840 });
          } else if (this.y >= 800 && destY < 800) {
            path.push({ x: 960, y: 840 });
            path.push({ x: 960, y: 760 });
          }
        }

        // 2) 마을 <-> 사냥터 동쪽 관문 경유
        if (startInTown !== destInTown) {
          if (startInTown) {
            path.push({ x: TOWN_EAST_GATE.entryWaypointX, y: TOWN_EAST_GATE.roadCenterY });
            path.push({ x: TOWN_EAST_GATE.exitWaypointX, y: TOWN_EAST_GATE.roadCenterY });
          } else {
            path.push({ x: TOWN_EAST_GATE.exitWaypointX, y: TOWN_EAST_GATE.roadCenterY });
            path.push({ x: TOWN_EAST_GATE.entryWaypointX, y: TOWN_EAST_GATE.roadCenterY });
          }
        }

        // 3) 목적지가 최상급 또는 중급/상급/환생 전용 사냥터인 경우 진입 연결 통로 경유
        if (!startInTopField && destInTopField) {
          path.push({ x: 1365, y: 18 });
          path.push({ x: 1455, y: 18 });
        }

        if ((!startInSouthField || startInTown) && destInSouthField) {
          path.push({ x: 960, y: 310 });
          path.push({ x: 960, y: 390 });
          if (destInRebirthField) {
            path.push({ x: 960, y: 575 });
            path.push({ x: 1365, y: 575 });
            path.push({ x: 1455, y: 575 });
          } else if (destY >= 800) {
            path.push({ x: 960, y: 760 });
            path.push({ x: 960, y: 840 });
          }
        } else if (!startInRebirthField && destInRebirthField) {
          path.push({ x: 960, y: 575 });
          path.push({ x: 1365, y: 575 });
          path.push({ x: 1455, y: 575 });
        }

        path.push({ x: destX, y: destY });
        this.waypoints = path;
      }

      getCombatProfile() {
        const job = this.baseJob || this.job;
        const rangedScale = 0.7; // 원거리 헌터 사거리 30% 감소
        const rangerRange = Math.round(168 * rangedScale);
        const sorcererRange = Math.round(158 * rangedScale);
        const isRebornMelee = (this.rebirthCount || 0) >= 1;
        const halfRangedMeleeRange = Math.round(rangerRange * 0.5);

        if (job === '레인저') {
          return {
            style: 'RANGED',
            range: rangerRange,
            cooldown: 0.78,
            projType: 'ARROW',
            projColor: '#34d399',
            slashType: 'MELEE',
            slashColor: '#34d399'
          };
        }
        if (job === '소서러') {
          return {
            style: 'RANGED',
            range: sorcererRange,
            cooldown: 0.96,
            projType: 'MAGIC_ORB',
            projColor: '#c084fc',
            slashType: 'MAGIC_BURST',
            slashColor: '#c084fc'
          };
        }
        if (job === '팔라딘') {
          return {
            style: 'MELEE',
            range: isRebornMelee ? halfRangedMeleeRange : 36,
            cooldown: 0.92,
            projType: 'MAGIC_ORB',
            projColor: '#fde047',
            slashType: 'HOLY',
            slashColor: '#fde047'
          };
        }
        return {
          style: 'MELEE',
          range: isRebornMelee ? halfRangedMeleeRange : 34,
          cooldown: 0.85,
          projType: 'MAGIC_ORB',
          projColor: '#f87171',
          slashType: 'MELEE',
          slashColor: '#f87171'
        };
      }

      getEquippedInsignia() {
        if (!this.equippedInsigniaId) return null;
        return ITEM_CATALOG[this.equippedInsigniaId] || null;
      }

      getMonsterDamageMultiplier(target = null) {
        const isOrcEntity = Boolean(
          target &&
          (
            target.isOrcUnit ||
            target.orcRef ||
            target.isGreatWarrior ||
            target.role === '군락지 지배자' ||
            target.role === '오크 대전사' ||
            target.role === '전위 수비대' ||
            target.role === '후방 수비대' ||
            target.role === '토템 주술진' ||
            target.role === '외곽 순찰대' ||
            target.role === '본진 호위대'
          )
        );
        const isTierBossEntity = Boolean(
          target &&
          (
            target === BOSS_SANCTUM.boss ||
            target.isBossTarget ||
            target.kind === 'ancient_guardian' ||
            (typeof target.stage === 'number' && target.regenPerSec !== undefined)
          )
        );
        if (isOrcEntity || isTierBossEntity) return 1.0;
        const ins = this.getEquippedInsignia();
        return ins ? (1 + (ins.monsterDmgBonusPct || 0)) : 1.0;
      }

      equipInsignia(insigniaId) {
        const def = ITEM_CATALOG[insigniaId];
        if (!def || def.category !== 'insignia') return false;
        if (!this.inventory || this.inventory.getCount(insigniaId) <= 0) return false;
        this.equippedInsigniaId = insigniaId;
        return true;
      }

      syncAutoEquipInsignia() {
        if (!this.inventory) return false;
        let bestId = null;
        let bestBonus = -1;

        if (this.equippedInsigniaId && this.inventory.getCount(this.equippedInsigniaId) > 0) {
          const curDef = ITEM_CATALOG[this.equippedInsigniaId];
          if (curDef && curDef.category === 'insignia') {
            bestId = this.equippedInsigniaId;
            bestBonus = curDef.monsterDmgBonusPct || 0;
          }
        }

        for (let i = 0; i < REGIONAL_INSIGNIA_IDS.length; i++) {
          const insId = REGIONAL_INSIGNIA_IDS[i];
          if (this.inventory.getCount(insId) <= 0) continue;
          const def = ITEM_CATALOG[insId];
          if (!def) continue;
          const bonus = def.monsterDmgBonusPct || 0;
          if (bonus > bestBonus) {
            bestBonus = bonus;
            bestId = insId;
          }
        }

        if (bestId && this.equippedInsigniaId !== bestId) {
          this.equippedInsigniaId = bestId;
          return true;
        }
        return Boolean(bestId);
      }

      getEquippedWing() {
        if (!this.equippedWingId) return null;
        return ITEM_CATALOG[this.equippedWingId] || null;
      }

      equipWing(wingId) {
        const def = ITEM_CATALOG[wingId];
        if (!def || def.category !== 'wing') return false;
        if (!this.inventory || this.inventory.getCount(wingId) <= 0) return false;
        this.equippedWingId = wingId;
        this.recalculateVitals(false);
        return true;
      }

      syncAutoEquipWing() {
        if (!this.inventory) return false;
        if (this.equippedWingId && this.inventory.getCount(this.equippedWingId) > 0) {
          return true;
        }
        for (const wId of SKY_WING_ITEM_IDS) {
          if (this.inventory.getCount(wId) > 0) {
            this.equippedWingId = wId;
            this.recalculateVitals(false);
            return true;
          }
        }
        this.equippedWingId = null;
        return false;
      }

      getWingEnhanceCost() {
        const enh = Math.max(0, Math.min(15, this.wingEnhance || 0));
        if (enh >= 15) return Infinity;
        return 10000000 + enh * 10000000;
      }

      // 스킬 레벨에 따른 배율 계산 (Lv.1 = 1.0배, Lv.20 = 2.14배)
      getSkillLevelMultiplier(skill) {
        return 1 + ((skill.lv || 1) - 1) * SKILL_SYSTEM_CONFIG.effectScalePerLevel;
      }

      // 스킬 사용 시 숙련도(사용 횟수) 누적 및 최대 Lv.20 레벨업 처리
      recordSkillUse(category, index = 0, gainAmount = 1) {
        const list = this.skills[category];
        if (!list || !list[index]) return null;
        const sk = list[index];
        if (sk.lv >= SKILL_SYSTEM_CONFIG.maxSkillLevel) return null;

        sk.uses += gainAmount;
        while (sk.uses >= sk.reqUses && sk.lv < SKILL_SYSTEM_CONFIG.maxSkillLevel) {
          sk.uses -= sk.reqUses;
          sk.lv += 1;
          sk.reqUses = SKILL_SYSTEM_CONFIG.getRequiredUses(sk.lv);
          this.recalculateVitals(false);
        }
        if (sk.lv >= SKILL_SYSTEM_CONFIG.maxSkillLevel) {
          sk.uses = sk.reqUses;
        }
        return sk;
      }

      getRequiredExp() {
        const baseExp = Math.round(80 + Math.pow(this.level, 1.35) * 18);
        const rebirthCount = Math.max(0, Math.min(LEVEL_REBIRTH_CONFIG.maxRebirths, Number(this.rebirthCount) || 0));
        const rebirthExpMult = REBIRTH_REQUIRED_EXP_MULT[rebirthCount] ?? 1;
        return Math.round(baseExp * rebirthExpMult);
      }

      // 헌터 인성 수치 변동 (-100 ~ +100 범위로 클램프)
      modifyAlignment(delta) {
        const d = Math.round(Number(delta) || 0);
        if (!d) return getAlignmentInfo(this.alignment);
        this.alignment = Math.max(-100, Math.min(100, (this.alignment || 0) + d));
        return getAlignmentInfo(this.alignment);
      }

      // 몬스터 1마리 처치 시 3마리 단위로 인성 +1 회복
      recordMonsterKillForAlignment() {
        this.monsterKillAlignmentProgress = (this.monsterKillAlignmentProgress || 0) + 1;
        if (this.monsterKillAlignmentProgress >= 3) {
          this.monsterKillAlignmentProgress = 0;
          const prevInfo = getAlignmentInfo(this.alignment);
          const nextInfo = this.modifyAlignment(1);
          return { gained: true, prev: prevInfo, next: nextInfo };
        }
        return { gained: false, progress: this.monsterKillAlignmentProgress };
      }

      // 레벨 및 환생 횟수를 반영한 최대 HP/MP 재산출
      recalculateVitals(fillFull = false) {
        const p = getEffectivePersonalityProfile(this.personality, this.rebirthCount);
        const rebirthMult = 1 + this.rebirthCount * LEVEL_REBIRTH_CONFIG.rebirthStatBonusPerStack;
        const hpPassiveMult = this.skills.passives.reduce(
          (acc, sk) => acc + (sk.hpMult || 0) * this.getSkillLevelMultiplier(sk),
          1
        ) + (p.hpMult || 0);
        const mpPassiveMult = this.skills.passives.reduce(
          (acc, sk) => acc + (sk.mpMult || 0) * this.getSkillLevelMultiplier(sk),
          1
        ) + (p.mpMult || 0);

        // 직업 전투 스타일에 따른 체력 및 레벨업 체력 성장 보정: 근거리 기본 +8% & 레벨업 체력 상승 +30% 증가, 원거리 -8% 감소
        const combatStyle = this.getCombatProfile().style;
        const styleHpMult = combatStyle === 'RANGED' ? 0.92 : 1.08;
        const hpPerLevel = combatStyle === 'MELEE' ? Math.round(55 * 1.3) : 55;

        // 마을 번영도 1,000 단위 상승 시마다 체력 보너스 (근접 +5%, 원거리 +2%)
        const prosperityTier = Math.max(0, Math.floor((Number(gameState?.prosperity) || 0) / 1000));
        const prosperityHpMult = 1 + prosperityTier * (combatStyle === 'RANGED' ? 0.02 : 0.05);

        const prevMaxHp = this.maxHp || 500;
        const prevMaxMp = this.maxMp || 160;
        this.maxHp = Math.max(200, Math.round((480 + this.level * hpPerLevel) * hpPassiveMult * rebirthMult * styleHpMult * prosperityHpMult));
        const baseMp = this.job === '소서러' ? 300 : 150;
        this.maxMp = Math.max(80, Math.round((baseMp + this.level * 22) * mpPassiveMult * rebirthMult));

        if (fillFull) {
          this.hp = Math.round(this.maxHp * (0.8 + Math.random() * 0.2));
          this.mp = Math.round(this.maxMp * (0.75 + Math.random() * 0.25));
        } else {
          this.hp = Math.min(this.maxHp, Math.round((this.hp / prevMaxHp) * this.maxHp));
          this.mp = Math.min(this.maxMp, Math.round((this.mp / prevMaxMp) * this.maxMp));
        }
      }

      get weaponEnhance() {
        return this.equipment.weapon.enhance;
      }

      getEquipDisplayName(slot) {
        const item = this.equipment[slot];
        const names = (slot === 'weapon' && JOB_WEAPON_NAMES[this.job])
          ? JOB_WEAPON_NAMES[this.job]
          : (EQUIP_TIER_NAMES[slot] || ['장비']);
        return names[Math.min(names.length - 1, Math.max(0, item.tier - 1))];
      }

      // 특정 부위 장비의 다음 티어 승급 조건 판정
      checkTierUpgradeCondition(slot, smithyLv = 1) {
        const item = this.equipment[slot];
        if (!item || item.tier >= MAX_EQUIP_TIER) {
          return { canUpgrade: false, isMax: true, reason: `최고 티어(T${MAX_EQUIP_TIER})` };
        }
        const nextTier = item.tier + 1;
        const rule = TIER_UPGRADE_RULES[nextTier];
        if (!rule) {
          return { canUpgrade: false, isMax: true, reason: `최고 티어(T${MAX_EQUIP_TIER})` };
        }
        if (smithyLv < rule.reqSmithyLv) {
          return { canUpgrade: false, nextTier, rule, reason: `대장간 Lv.${rule.reqSmithyLv} 필요` };
        }
        if (item.enhance < rule.reqEnhance) {
          return { canUpgrade: false, nextTier, rule, reason: `+${rule.reqEnhance}강 이상 필요` };
        }
        if (this.personalGold < rule.goldCost) {
          return { canUpgrade: false, nextTier, rule, reason: `${formatGold(rule.goldCost)}G 부족` };
        }
        if (this.materials < rule.matCost) {
          return { canUpgrade: false, nextTier, rule, reason: `재료 ${rule.matCost}개 필요` };
        }
        return { canUpgrade: true, nextTier, rule, reason: `T${nextTier} 승급 가능!` };
      }

      getComputedStats() {
        const w = this.equipment.weapon;
        const a = this.equipment.armor;
        const h = this.equipment.helmet;
        const acc = this.equipment.accessory;

        const wScale = getEquipTierMultiplier(w.tier);
        const aScale = getEquipTierMultiplier(a.tier);
        const hScale = getEquipTierMultiplier(h.tier);
        const accScale = getEquipTierMultiplier(acc.tier);

        const levelAtk = (this.level - 1) * 6;
        const levelDef = (this.level - 1) * 4;
        const atkBonus = levelAtk + wScale * 28 + w.enhance * (18 + Math.max(0, w.tier - 5) * 6) + accScale * 10;
        const defBonus = levelDef + aScale * 22 + a.enhance * (12 + Math.max(0, a.tier - 5) * 4) + hScale * 14 + h.enhance * (8 + Math.max(0, h.tier - 5) * 3);
        const critBonus = Math.min(25, acc.tier * 2) + Math.floor(acc.enhance * 0.6) + Math.floor(w.enhance * 0.4);

        const passives = this.skills?.passives || [];
        const p = getEffectivePersonalityProfile(this.personality, this.rebirthCount);
        const rebirthMult = 1 + this.rebirthCount * LEVEL_REBIRTH_CONFIG.rebirthStatBonusPerStack;
        const rebirthCrit = this.rebirthCount * LEVEL_REBIRTH_CONFIG.rebirthCritBonusPerStack;

        const atkMult = passives.reduce(
          (sum, sk) => sum + (sk.atkMult || 0) * this.getSkillLevelMultiplier(sk),
          1
        ) + (p.atkMult || 0);
        const defMult = passives.reduce(
          (sum, sk) => sum + (sk.defMult || 0) * this.getSkillLevelMultiplier(sk),
          1
        ) + (p.defMult || 0);
        const passiveCrit = passives.reduce(
          (sum, sk) => sum + Math.round((sk.critBonus || 0) * this.getSkillLevelMultiplier(sk)),
          0
        ) + (p.critBonus || 0);

        // 마을 번영도 1,000 단위 상승 시마다 공격력 보너스 (근접 +2%, 원거리 +1%)
        const combatStyle = this.getCombatProfile().style;
        const prosperityTier = Math.max(0, Math.floor((Number(gameState?.prosperity) || 0) / 1000));
        const prosperityAtkMult = 1 + prosperityTier * (combatStyle === 'RANGED' ? 0.01 : 0.02);

        // 근접 계열 헌터: 첫 환생(rebirthCount >= 1) 시 방어력 +100% 증가, 이후 환생당 +50% 추가 증가
        const meleeFirstRebirthDefBonus = (combatStyle === 'MELEE' && (this.rebirthCount || 0) >= 1)
          ? (1.0 + Math.max(0, (this.rebirthCount || 0) - 1) * 0.5)
          : 0;
        const wing = this.getEquippedWing();
        const wEnh = Math.max(0, this.wingEnhance || 0);
        const wingAtkBonus = wing ? ((wing.atkBonusPct || 0) + wEnh * (wing.enhanceAtkBonusPct || 0)) : 0;
        const wingDefBonus = wing ? ((wing.defBonusPct || 0) + wEnh * (wing.enhanceDefBonusPct || 0)) : 0;
        const wingCritBonus = wing ? ((wing.critBonus || 0) + wEnh * (wing.enhanceCritBonus || 0)) : 0;

        return {
          atk: Math.max(10, Math.round((this.baseAtk + atkBonus) * (atkMult + wingAtkBonus) * rebirthMult * prosperityAtkMult)),
          def: Math.max(5, Math.round((this.baseDef + defBonus) * (defMult + meleeFirstRebirthDefBonus + wingDefBonus) * rebirthMult)),
          crit: Math.max(1, Math.min(95, this.crit + critBonus + passiveCrit + rebirthCrit + wingCritBonus))
        };
      }

      getStatusDescription() {
        if (this.state === 'ORC_SUBJUGATION_RAID') {
        return '👹 오크 토벌전 · 오크의 숲 총력 교전 중!';
      }
      if (ORC_SUBJUGATION.status === 'PREPARING') {
        const rem = Math.max(0, Math.ceil(ORC_SUBJUGATION.prepTimer || 0));
        if (rem > 30) {
          return `⏳ 오크 토벌전 · 마을 정비 중 (${rem - 30}s / 대기 ${rem}s)`;
        }
        return `🛑 오크 토벌전 · 출격 대기 중 (${rem}s)`;
      }
      if (this.state === 'REBIRTH_ALTAR_HUNT') {
          return '✨ 초월 환생의 제단 최상급 중간보스 교전 중!';
        }
        if (this.state === 'BOSS_RAID') {
          return '🔥 고대 수호자 성소 보스 레이드 교전 중!';
        }
        if (this.state === 'RAID_PREP_WAIT') {
          return '⏳ 보스 레이드 정비 완료 · 성소 입구 집결 대기';
        }
        if (this.state === 'HUNTING_FIELD') {
          const g = HUNTING_GROUNDS.find(hg => hg.id === this.activeGroundId);
          const gName = g ? g.name : '초보 사냥터';
          if (this.currentTargetHunter && this.currentTargetHunter.hp > 0 && this.currentTargetHunter.state === 'HUNTING_FIELD') {
            return `⚔️ ${gName} PvP 교전 중 (🎯 ${this.currentTargetHunter.name})`;
          }
          const mult = g ? g.getExpMultiplier(this.level) : 1;
          const rateTag = mult > 1 ? 'EXP +50%' : (mult < 1 ? 'EXP -90% 패널티' : '기본 EXP');
          const targetTag = (this.currentTargetMonster && this.currentTargetMonster.hp > 0)
            ? ` · 🎯 ${this.currentTargetMonster.name}`
            : '';
          return `⚔️ ${gName} 사냥 중 (${rateTag})${targetTag}`;
        }
        if (this.state === 'IN_DUNGEON') {
          return `🕳️ 지하 던전 B${this.dungeonFloor}F 탐험 중 (${this.dungeonProgress}%)`;
        }
        if (this.state === 'USING_FACILITY' && this.targetBuildingName) {
          return `🏠 ${this.targetBuildingName} 이용 중`;
        }
        if (this.state === 'WALKING' && this.targetBuildingName) {
          return `🚶 ${this.targetBuildingName}(으)로 이동 중`;
        }
        return '🚶 마을 광장 순찰 중';
      }

      hasMatchedHuntingGround() {
        return ALL_FIELD_GROUNDS.some(g => evaluateHuntingGroundPreference(this, g).matched);
      }

      getNextEnhanceTarget() {
        const smithy = village.getAllBuildings().find(b => b.type === 'smithy');
        const smithyLv = smithy ? smithy.level : 1;
        const ownedFrags = this.inventory ? this.inventory.getCount('equip_fragment') : 0;
        const slots = ['weapon', 'armor', 'helmet', 'accessory'];
        const candidates = [];

        for (const slot of slots) {
          const item = this.equipment[slot];
          if (!item || item.enhance >= 15) continue;
          if (item.tier < MAX_EQUIP_TIER) {
            const rule = TIER_UPGRADE_RULES[item.tier + 1];
            if (rule && smithyLv >= rule.reqSmithyLv && item.enhance >= rule.reqEnhance) {
              continue;
            }
          }
          const cost = 120 + item.enhance * 55 + (item.tier - 1) * 90;
          const fragCost = Math.max(1, item.tier + Math.floor(item.enhance / 3));
          if (this.personalGold >= cost && ownedFrags >= fragCost) {
            candidates.push({ slot, item, cost, fragCost });
          }
        }
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => (a.item.enhance - b.item.enhance) || (a.cost - b.cost));
        return candidates[0];
      }

      findTierUpgradeCandidate(smithyLv = 1) {
        const slots = ['weapon', 'armor', 'helmet', 'accessory'];
        let best = null;
        for (const slot of slots) {
          const item = this.equipment[slot];
          if (!item || item.tier >= MAX_EQUIP_TIER) continue;
          const nextTier = item.tier + 1;
          const rule = TIER_UPGRADE_RULES[nextTier];
          if (!rule) continue;
          if (smithyLv >= rule.reqSmithyLv && item.enhance >= rule.reqEnhance) {
            if (!best || nextTier < best.nextTier || (nextTier === best.nextTier && rule.goldCost < best.rule.goldCost)) {
              best = { slot, item, nextTier, rule };
            }
          }
        }
        return best;
      }

      // pickNextDestination(다음 행동 결정)은 js/08a-hunter-ai.js 로 옮겨 관리합니다.

      useAutoPotionsInCombat() {
        const maxBento = getMaxBentoCapacity(this.level, this.rebirthCount);
        if (maxBento > 0) {
          this.bento = Math.min(maxBento, Math.max(0, this.bento || 0));
          if (this.bento > 0 && (this.hunger < 45 || this.fatigue >= 65)) {
            this.bento -= 1;
            this.hunger = Math.min(100, this.hunger + 45);
            this.fatigue = Math.max(0, this.fatigue - 35);
            combatEffects.spawnDamagePopup(this.x, this.y - 6, '🍱 +포만감/피로회복', false, '#fde047');
            interactionManager.spawnBubble(this, `🍱 도시락 섭취! (남은 도시락 ${this.bento}/${maxBento})`, '#fde047');
          }
        }

        if (this.hp < this.maxHp * 0.45 && this.potions.hp > 0) {
          this.potions.hp -= 1;
          const heal = Math.round(this.maxHp * 0.45);
          this.hp = Math.min(this.maxHp, this.hp + heal);
          combatEffects.spawnDamagePopup(this.x, this.y, `+${heal} HP`, false, '#4ade80');
          interactionManager.spawnBubble(this, `🧪 HP 물약 복용 (${this.potions.hp}/${getMaxHpPotionCapacity(this.level, this.rebirthCount)})`, '#86efac');
        }
        if (this.mp < this.maxMp * 0.3 && this.potions.mp > 0) {
          this.potions.mp -= 1;
          const restore = Math.round(this.maxMp * 0.5);
          this.mp = Math.min(this.maxMp, this.mp + restore);
          combatEffects.spawnDamagePopup(this.x, this.y - 10, `+${restore} MP`, false, '#38bdf8');
          interactionManager.spawnBubble(this, `💧 MP 물약 복용 (${this.potions.mp}/${getMaxMpPotionCapacity(this.level, this.rebirthCount)})`, '#7dd3fc');
        }
      }

      tryUseActiveSkill(stats) {
        if (!this.skills?.actives?.length) return null;
        // 현재 쿨타임이 완료된(cooldownRemaining <= 0) 액티브 스킬만 후보로 선정
        const readyIndices = [];
        this.skills.actives.forEach((sk, idx) => {
          if ((sk.cooldownRemaining || 0) <= 0) {
            const weight = 1 + (sk.advTier || 0);
            for (let w = 0; w < weight; w++) readyIndices.push(idx);
          }
        });
        if (readyIndices.length === 0) return null;

        const skIdx = readyIndices[Math.floor(Math.random() * readyIndices.length)];
        const sk = this.skills.actives[skIdx];
        const actualMpCost = this.getSkillMpCost(sk);

        if (this.mp < actualMpCost) return null;
        this.mp -= actualMpCost;
        const baseCd = sk.cooldown || (5.5 + (sk.advTier || 0) * 0.5);
        sk.cooldownRemaining = Math.max(2.0, Number((baseCd * (1 - ((sk.lv || 1) - 1) * 0.015)).toFixed(1)));
        this.recordSkillUse('actives', skIdx);

        const skillMult = (sk.basePower / 100) * this.getSkillLevelMultiplier(sk);
        return { skill: sk, dmgMult: Math.max(1.25, skillMult * 0.75) };
      }

      // 스킬 피해량(기본 위력 + 스킬 레벨 성장 반영 위력)이 높을수록 MP 소모량이 가중 증가하도록 계산
      getSkillMpCost(skill) {
        if (!skill) return 0;
        const passives = this.skills?.passives || [];
        const p = this.personality || {};
        const mpSave = passives.reduce((acc, s) => acc * (s.mpSave || 1), 1) * (p.mpSave || 1);

        const basePower = skill.basePower || 100;
        const scaledPower = basePower * this.getSkillLevelMultiplier(skill);
        // 기준 위력(150%) 초과분에 비례해 MP 소모 배율을 높임 (최소 0.85배 ~ 최대 2.6배)
        const powerExcessRatio = Math.max(0, (scaledPower - 150) / 100);
        const damageMpMultiplier = Math.min(2.6, Math.max(0.85, 1 + powerExcessRatio * 0.45));

        return Math.max(5, Math.round((skill.mpCost || 30) * damageMpMultiplier * mpSave));
      }

      update(dt) {
        const stepStartX = this.x;
        const stepStartY = this.y;

        // 무기 강화 반짝이 입자 (+10강·+15강): 헌터 기준 위치로 저장해 헌터를 따라다니고,
        // 사냥·던전 등 어떤 상태에서도 매 프레임 움직이고 사라지게 한다 (필드에 잔상이 남지 않음)
        if (this.weaponEnhance >= 10 && Math.random() < (this.weaponEnhance >= 15 ? 0.55 : 0.3)) {
          this.particles.push({
            x: this.facing * 22 + (Math.random() - 0.5) * 8,
            y: -18 + (Math.random() - 0.5) * 14,
            vx: (Math.random() - 0.5) * 14,
            vy: -18 - Math.random() * 20,
            life: 0.65,
            maxLife: 0.65,
            size: this.weaponEnhance >= 15 ? 3.2 : 2.2
          });
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) this.particles.splice(i, 1);
        }
        if (this.particles.length > 40) this.particles.splice(0, this.particles.length - 40);

        if (this.attackAnimTimer > 0) {
          this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
        }
        if ((this.miniBossBuffTimer || 0) > 0) {
          this.miniBossBuffTimer = Math.max(0, this.miniBossBuffTimer - dt);
        }
        if ((this.enhanceCooldown || 0) > 0) {
          this.enhanceCooldown = Math.max(0, this.enhanceCooldown - dt);
        }
        if ((this.wingEnhanceCooldown || 0) > 0) {
          this.wingEnhanceCooldown = Math.max(0, this.wingEnhanceCooldown - dt);
        }
        if (this.state !== 'USING_FACILITY') {
          this.facilityStuckTimer = 0;
        }
        if (this.skills?.actives) {
          for (let i = 0; i < this.skills.actives.length; i++) {
            const sk = this.skills.actives[i];
            if ((sk.cooldownRemaining || 0) > 0) {
              sk.cooldownRemaining = Math.max(0, sk.cooldownRemaining - dt);
            }
          }
        }

        // 전투 중 HP/MP 물약 자동 복용
        if (this.state === 'HUNTING_FIELD' || this.state === 'BOSS_RAID' || this.state === 'ORC_SUBJUGATION_RAID' || this.state === 'REBIRTH_ALTAR_HUNT' || this.state === 'IN_DUNGEON') {
          this.useAutoPotionsInCombat();
        }

        // [오크 토벌전: 오크의 숲 진격 및 교전 상태]
        if (this.state === 'ORC_SUBJUGATION_RAID') {
          if (ORC_SUBJUGATION.status !== 'ACTIVE' || ORC_SUBJUGATION.fallenHunterIds.has(this.id)) {
            this.state = 'IDLE';
            this.stateTimer = 0.4;
            this.activeGroundId = null;
            this.targetGroundId = null;
            this.currentTargetMonster = null;
            return;
          }

          // 마을 → 관문 → 초보 사냥터 → 오크의 숲 진입 경유지 이동
          if (this.waypoints && this.waypoints.length > 1) {
            const curGoal = this.waypoints[0];
            const dx = curGoal.x - this.x;
            const dy = curGoal.y - this.y;
            const d = Math.hypot(dx, dy);
            if (d < 6) {
              this.waypoints.shift();
            } else {
              this.facing = dx >= 0 ? 1 : -1;
              this.x += (dx / d) * this.speed * RAID_FORMATION_CFG.hunterMoveMult * dt;
              this.y += (dy / d) * this.speed * RAID_FORMATION_CFG.hunterMoveMult * dt;
              enforceTownWallCollision(this, 12);
              this.walkCycle += dt * 12;
            }
            rescueStrandedHunterIfNeeded(this, stepStartX, stepStartY, dt);
            return;
          }

          const livingOrcs = (ORC_STRONGHOLD_ZONE.orcs || []).filter(o => o && !o.isDead && o.hp > 0);
          if (livingOrcs.length === 0) {
            return;
          }

          // 3열 진형: 자기 자리를 기준으로 싸움 (근접은 자리 근처 적에게 돌진, 원거리는 자리에서 사격)
          const combat = this.getCombatProfile();
          const effectiveRange = combat.style === 'RANGED' ? combat.range : (combat.range + 16);
          const raidSlot = getRaidHunterSlot(this);
          const raidOrder = getRaidFormationOrder(
            this,
            raidSlot,
            getRaidOrcTargets(),
            effectiveRange,
            combat.style === 'RANGED'
          );
          const targetOrc = raidOrder.target;
          this.currentTargetMonster = targetOrc;

          if (!targetOrc) {
            stepRaidUnitToward(this, raidOrder.goalX, raidOrder.goalY, this.speed * RAID_FORMATION_CFG.hunterMoveMult, dt, 1);
            enforceTownWallCollision(this, 12);
          }

          if (targetOrc) {
            const dx = targetOrc.x - this.x;
            const dy = targetOrc.y - this.y;
            const distToOrc = Math.hypot(dx, dy);

            if (distToOrc > effectiveRange) {
              stepRaidUnitToward(this, raidOrder.goalX, raidOrder.goalY, this.speed * RAID_FORMATION_CFG.hunterMoveMult, dt, 1);
              enforceTownWallCollision(this, 12);
            } else {
              this.facing = targetOrc.x >= this.x ? 1 : -1;
              this.attackCooldown = (this.attackCooldown || 0) - dt;
              if (this.attackCooldown <= 0) {
                this.attackCooldown = combat.cooldown;
                this.attackAnimTimer = 0.34;
                const stats = this.getComputedStats();
                const isCrit = Math.random() * 100 < stats.crit;
                const skillCast = Math.random() < 0.48 ? this.tryUseActiveSkill(stats) : null;
                const mult = (isCrit ? 1.5 : 0.92) * (skillCast ? skillCast.dmgMult : 1);
                const rawDmg = Math.max(15, Math.round(stats.atk * mult));

                if (combat.style === 'RANGED') {
                  combatEffects.spawnProjectile({
                    attacker: this,
                    target: targetOrc,
                    ground: null,
                    isMonsterProj: true,
                    isOrcTarget: true,
                    x: this.x + this.facing * 12,
                    y: this.y - 4,
                    speed: combat.projType === 'ARROW' ? 390 : 300,
                    projType: combat.projType,
                    color: skillCast ? '#fde047' : combat.projColor,
                    dmg: rawDmg,
                    isCrit: isCrit || !!skillCast
                  });
                } else {
                  combatEffects.spawnMeleeSlash({
                    x: this.x + this.facing * 18,
                    y: this.y - 2,
                    facing: this.facing,
                    slashType: combat.slashType,
                    color: skillCast ? '#fde047' : combat.slashColor
                  });
                  const oStats = getOrcCombatStats(targetOrc);
                  const takenDmg = Math.max(12, Math.round(rawDmg - oStats.def * 0.22));
                  targetOrc.hp = Math.max(0, targetOrc.hp - takenDmg);
                  combatEffects.spawnDamagePopup(targetOrc.x, targetOrc.y - 10, takenDmg, isCrit || !!skillCast, '#fde047');
                  if (targetOrc.hp <= 0) {
                    killOrcUnit(targetOrc);
                  }
                }
              }
            }
          }
          rescueStrandedHunterIfNeeded(this, stepStartX, stepStartY, dt);
          return;
        }

        // [환생 헌터 전용: 초월 환생의 제단 최상급 중간보스 교전 상태]
        if (this.state === 'REBIRTH_ALTAR_HUNT') {
          if (!canHunterEnterRebirthAltar(this)) {
            this.state = 'IDLE';
            this.stateTimer = 0.5;
            this.targetBuildingName = '';
            this.targetBuildingType = '';
            this.currentTargetMonster = null;
            return;
          }
          if (this.hp < this.maxHp * 0.25 || this.fatigue >= 90) {
            this.state = 'IDLE';
            this.stateTimer = 0.4;
            this.targetBuildingName = '';
            this.targetBuildingType = '';
            this.currentTargetMonster = null;
            interactionManager.spawnBubble(this, '💫 체력/피로 한계 · 제단 후퇴!', '#fca5a5');
            // 자동 제단 출정은 잠시 쉬었다가 다시 도전 (js/08a-hunter-ai.js)
            this.altarAutoRetryAt = Date.now() + HUNTER_AI_CFG.altarAutoRetryMs;
            return;
          }

          if (this.waypoints && this.waypoints.length > 0) {
            const curGoal = this.waypoints[0];
            const dx = curGoal.x - this.x;
            const dy = curGoal.y - this.y;
            const d = Math.hypot(dx, dy);
            if (d < 5) {
              this.waypoints.shift();
            } else {
              this.facing = dx >= 0 ? 1 : -1;
              this.x += (dx / d) * this.speed * 1.18 * dt;
              this.y += (dy / d) * this.speed * 1.18 * dt;
              enforceTownWallCollision(this, 12);
              this.walkCycle += dt * 12;
            }
            return;
          }

          const altarBoss = REBIRTH_ALTAR.boss;
          if (!altarBoss || altarBoss.hp <= 0) {
            this.state = 'IDLE';
            this.stateTimer = 0.8;
            this.targetBuildingName = '';
            this.targetBuildingType = '';
            this.currentTargetMonster = null;
            return;
          }

          const distToAltarBoss = Math.hypot(altarBoss.x - this.x, altarBoss.y - this.y);
          const combat = this.getCombatProfile();
          const effectiveRange = combat.style === 'RANGED' ? combat.range : (combat.range + 22);

          if (distToAltarBoss > effectiveRange) {
            const dx = altarBoss.x - this.x;
            const dy = altarBoss.y - this.y;
            const moveDist = Math.max(1, distToAltarBoss);
            this.facing = dx >= 0 ? 1 : -1;
            this.x += (dx / moveDist) * this.speed * 1.15 * dt;
            this.y += (dy / moveDist) * this.speed * 1.15 * dt;
            enforceTownWallCollision(this, 12);
            this.walkCycle += dt * 12;
          } else {
            this.facing = altarBoss.x >= this.x ? 1 : -1;
            this.attackCooldown = (this.attackCooldown || 0) - dt;
            this.fatigue = Math.min(100, this.fatigue + dt * 2.1 * (this.personality?.fatigueMult || 1));
            this.hunger = Math.max(0, this.hunger - dt * 1.3 * (this.personality?.hungerMult || 1));

            if (this.attackCooldown <= 0) {
              this.attackCooldown = combat.cooldown;
              this.attackAnimTimer = 0.34;
              const stats = this.getComputedStats();
              const isCrit = Math.random() * 100 < stats.crit;
              const skillCast = Math.random() < 0.5 ? this.tryUseActiveSkill(stats) : null;
              const mult = (isCrit ? 1.55 : 0.96) * (skillCast ? skillCast.dmgMult : 1);
              const dmg = Math.max(20, Math.round(stats.atk * mult * this.getMonsterDamageMultiplier()));

              if (combat.style === 'RANGED') {
                combatEffects.spawnProjectile({
                  attacker: this,
                  target: altarBoss,
                  ground: null,
                  isRebirthAltarTarget: true,
                  x: this.x + this.facing * 12,
                  y: this.y - 4,
                  speed: combat.projType === 'ARROW' ? 395 : 305,
                  projType: combat.projType,
                  color: skillCast ? '#fde047' : '#f472b6',
                  dmg,
                  isCrit: isCrit || !!skillCast
                });
              } else {
                combatEffects.spawnMeleeSlash({
                  x: this.x + this.facing * 18,
                  y: this.y - 2,
                  facing: this.facing,
                  slashType: combat.slashType,
                  color: skillCast ? '#fde047' : '#f472b6'
                });
                combatEffects.applyHitToRebirthAltarBoss(this, altarBoss, dmg, isCrit || !!skillCast);
              }
            }
          }
          rescueStrandedHunterIfNeeded(this, stepStartX, stepStartY, dt);
          return;
        }

        // [보스 레이드 전용 교전 상태]
        if (this.state === 'BOSS_RAID') {
          if (BOSS_SANCTUM.status !== 'ACTIVE' || BOSS_SANCTUM.boss.hp <= 0 || BOSS_SANCTUM.fallenHunterIds.has(this.id)) {
            this.state = 'IDLE';
            this.stateTimer = 0.4;
            this.currentTargetMonster = null;
            return;
          }
          // 성벽/관문을 아직 통과하지 못했다면 경유지로 먼저 이동
          if (this.waypoints && this.waypoints.length > 1) {
            const curGoal = this.waypoints[0];
            const dx = curGoal.x - this.x;
            const dy = curGoal.y - this.y;
            const d = Math.hypot(dx, dy);
            if (d < 6) {
              this.waypoints.shift();
            } else {
              this.facing = dx >= 0 ? 1 : -1;
              this.x += (dx / d) * this.speed * 1.15 * dt;
              this.y += (dy / d) * this.speed * 1.15 * dt;
              enforceTownWallCollision(this, 12);
              this.walkCycle += dt * 12;
            }
            return;
          }

          const boss = BOSS_SANCTUM.boss;
          const sb = BOSS_SANCTUM.bounds;
          const isInsideSanctum = (
            this.x >= sb.x + 22 &&
            this.x <= sb.x + sb.w - 22 &&
            this.y >= sb.y + 22 &&
            this.y <= sb.y + sb.h - 18
          );
          const distToBoss = Math.hypot(boss.x - this.x, boss.y - this.y);
          const combat = this.getCombatProfile();
          const effectiveRange = combat.style === 'RANGED' ? combat.range : (combat.range + 18);

          if (!isInsideSanctum || distToBoss > effectiveRange) {
            const dx = boss.x - this.x;
            const dy = boss.y - this.y;
            const moveDist = Math.max(1, distToBoss);
            this.facing = dx >= 0 ? 1 : -1;
            this.x += (dx / moveDist) * this.speed * 1.12 * dt;
            this.y += (dy / moveDist) * this.speed * 1.12 * dt;
            enforceTownWallCollision(this, 12);
            this.walkCycle += dt * 12;
          } else {
            this.facing = boss.x >= this.x ? 1 : -1;
            this.attackCooldown = (this.attackCooldown || 0) - dt;
            if (this.attackCooldown <= 0) {
              this.attackCooldown = combat.cooldown;
              this.attackAnimTimer = 0.34;
              const stats = this.getComputedStats();
              const isCrit = Math.random() * 100 < stats.crit;
              const skillCast = Math.random() < 0.48 ? this.tryUseActiveSkill(stats) : null;
              const mult = (isCrit ? 1.5 : 0.92) * (skillCast ? skillCast.dmgMult : 1);
              const dmg = Math.max(15, Math.round(stats.atk * mult * this.getMonsterDamageMultiplier(boss)));

              if (combat.style === 'RANGED') {
                combatEffects.spawnProjectile({
                  attacker: this,
                  target: boss,
                  ground: null,
                  isBossTarget: true,
                  x: this.x + this.facing * 12,
                  y: this.y - 4,
                  speed: combat.projType === 'ARROW' ? 390 : 300,
                  projType: combat.projType,
                  color: skillCast ? '#fde047' : combat.projColor,
                  dmg,
                  isCrit: isCrit || !!skillCast
                });
              } else {
                combatEffects.spawnMeleeSlash({
                  x: this.x + this.facing * 20,
                  y: this.y - 2,
                  facing: this.facing,
                  slashType: combat.slashType,
                  color: skillCast ? '#fde047' : combat.slashColor
                });
                combatEffects.applyHitToBoss(this, boss, dmg, isCrit || !!skillCast);
              }
            }
          }
          rescueStrandedHunterIfNeeded(this, stepStartX, stepStartY, dt);
          return;
        }

        // [사냥터 야외 필드 전투 상태]
        if (this.state === 'HUNTING_FIELD') {
          const ground = ALL_FIELD_GROUNDS.find(g => g.id === this.activeGroundId);
          const hasActivePvpDuel = Boolean(
            this.currentTargetHunter &&
            this.currentTargetHunter.hp > 0 &&
            this.currentTargetHunter.state === 'HUNTING_FIELD' &&
            this.currentTargetHunter.activeGroundId === ground?.id
          );

          // PvP 교전 중에는 한쪽 헌터가 사망할 때까지 이탈/휴식 조건을 보류해 끝까지 결판냄
          if (!ground || (!hasActivePvpDuel && (this.hp < this.maxHp * 0.35 || this.fatigue >= 85))) {
            if (ground && ground.id === SKY_ISLAND_GROUND.id) {
              teleportHunterFromSkyIslandToTown(this, '✨ 체력/피로 한계 · 마을 순간 이동 후퇴!');
              return;
            }
            this.state = 'IDLE';
            this.stateTimer = 0.4;
            this.activeGroundId = null;
            this.currentTargetMonster = null;
            this.currentTargetHunter = null;
            return;
          }

          // Lv.99로 환생할 수 있으면 사냥을 멈추고 바로 환생소로
          if (!hasActivePvpDuel && isHunterReadyToRebirth(this)) {
            if (ground.id === SKY_ISLAND_GROUND.id) {
              teleportHunterFromSkyIslandToTown(this, '✨ Lv.99 달성 · 환생하러 마을로 순간 이동!');
              return;
            }
            interactionManager.spawnBubble(this, '⛩️ Lv.99 달성! 환생하러 마을로!', '#fde047');
            this.state = 'IDLE';
            this.stateTimer = 0.3;
            this.activeGroundId = null;
            this.currentTargetMonster = null;
            this.currentTargetHunter = null;
            return;
          }

          // 골드가 넉넉하면 사냥을 잠시 멈추고 마을로 돌아가 강화소/대장간 이용 (js/08a-hunter-ai.js)
          if (!hasActivePvpDuel && typeof shouldHunterReturnForGear === 'function' && shouldHunterReturnForGear(this, ground, dt)) {
            interactionManager.spawnBubble(this, '💰 골드가 넉넉하다! 장비 손보러 마을로!', '#fde047');
            this.state = 'IDLE';
            this.stateTimer = 0.3;
            this.activeGroundId = null;
            this.currentTargetMonster = null;
            this.currentTargetHunter = null;
            return;
          }

          // 본인이 21레벨에 도달해 초보 사냥터 경험치 90% 감소 패널티가 적용되면 스스로 사냥터 이탈 판단
          const pref = evaluateHuntingGroundPreference(this, ground);
          if (!hasActivePvpDuel && !pref.matched) {
            if (ground.id === SKY_ISLAND_GROUND.id) {
              teleportHunterFromSkyIslandToTown(this, '✨ 천공의 섬 이탈 · 마을 순간 이동!');
              return;
            }
            if (ground.id === 'top_field_70_99' && isOrcStrongholdPassageOpen()) {
              this.x = 1365;
              this.y = 18;
              this.waypoints = [];
              this.state = 'IDLE';
              this.stateTimer = 0.3;
              this.activeGroundId = null;
              this.targetGroundId = null;
              this.currentTargetMonster = null;
              this.currentTargetHunter = null;
              interactionManager.spawnBubble(this, '🚫 오크의 숲 토벌 전용 구역 전환 · 철수!', '#fca5a5');
              return;
            }
            interactionManager.spawnBubble(
              this,
              (this.rebirthCount || 0) === 0 && this.level > (ground.maxRecLv || 99)
                ? `🎓 Lv.${this.level} 달성! 상위 사냥터로!`
                : '🔄 지금 맞는 사냥터로 이동!',
              '#38bdf8'
            );
            this.state = 'IDLE';
            this.stateTimer = 0.4;
            this.activeGroundId = null;
            this.currentTargetMonster = null;
            this.currentTargetHunter = null;
            return;
          }

          // [헌터 간 PvP 구역(LAWLESS_PK): 상급 사냥터 무법 교전 판정]
          const zoneRule = ZONE_RULES[ground.zoneType] || ZONE_RULES.NORMAL_HUNT;
          const isSelfReborn = (this.rebirthCount || 0) > 0;
          if (zoneRule.allowPk || hasActivePvpDuel) {
            const isValidPvpTarget = (t) => (
              t &&
              t.id !== this.id &&
              ((t.rebirthCount || 0) > 0) === isSelfReborn &&
              t.hp > 0 &&
              t.state === 'HUNTING_FIELD' &&
              t.activeGroundId === ground.id
            );

            // PvP 완화 (06-skills-dungeon-jobs.js PVP_CALM_CFG): 선공은 가끔만 고민 · 교전이 끝나면 휴전 · 가까운 상대만
            this.pvpInitCooldown = Math.max(0, (this.pvpInitCooldown || 0) - dt);
            if (!isValidPvpTarget(this.currentTargetHunter)) {
              if (this.currentTargetHunter) {
                this.pvpInitCooldown = Math.max(this.pvpInitCooldown, PVP_CALM_CFG.truceAfterDuelSec);
              }
              this.currentTargetHunter = null;
              let bestRival = null;
              let bestScore = 0;
              // ⚔️ 영웅의 투기장(js/32-hero-arena.js): 무한 PvP · 가장 가까운 영웅을 바로 노림 (휴전 · 확률 · 원한 없음)
              if (ground.zoneType === 'HERO_ARENA') {
                // 이미 다른 헌터와 싸우는 중인 영웅보다 교전하지 않는 영웅을 먼저 노린다 (그다음 가까운 순)
                const isBusy = (c) => Boolean(
                  (c.currentTargetHunter && c.currentTargetHunter !== this && c.currentTargetHunter.hp > 0) ||
                  hunters.some(o => o !== this && o !== c && o.currentTargetHunter === c && o.hp > 0)
                );
                let bestKey = Infinity;
                for (let i = 0; i < hunters.length; i++) {
                  const candidate = hunters[i];
                  if (!isValidPvpTarget(candidate)) continue;
                  const d = Math.hypot(candidate.x - this.x, candidate.y - this.y);
                  const key = (isBusy(candidate) ? 1e6 : 0) + d;
                  if (key < bestKey) { bestKey = key; bestRival = candidate; }
                }
                this.pvpInitCooldown = 0;
              }
              const mayInitiate = ground.zoneType !== 'HERO_ARENA' && this.pvpInitCooldown <= 0;
              if (mayInitiate) {
                this.pvpInitCooldown = PVP_CALM_CFG.decideEverySec * (0.8 + Math.random() * 0.4);
              }
              const willInitiate = mayInitiate && Math.random() < PVP_CALM_CFG.initiateChance;
              for (let i = 0; i < hunters.length && willInitiate; i++) {
                const candidate = hunters[i];
                if (!isValidPvpTarget(candidate)) continue;
                if (Math.hypot(candidate.x - this.x, candidate.y - this.y) > PVP_CALM_CFG.maxTargetDist) continue;
                const evalRes = interactionManager.evaluatePkEngagement(this, candidate, ground.zoneType);
                const relToCand = interactionManager.getRelation(this, candidate);
                // 동맹 관계라도 무법지대(LAWLESS_PK)에서는 탐욕·무모함·분쟁으로 동맹이 깨지며 선공할 수 있음
                const allyBetrayRoll = relToCand.tier === 'ally'
                  ? (PK_AGGRESSIVE_PERSONALITIES.has(this.personality?.id) && Math.random() < 0.12)
                  : false;
                if (evalRes.action === 'ATTACK_PK' || allyBetrayRoll) {
                  const d = Math.hypot(candidate.x - this.x, candidate.y - this.y);
                  const score = ((evalRes.aggressionScore || 45) - (relToCand.tier === 'ally' ? 20 : 0)) - d * 0.08;
                  if (score > bestScore) {
                    bestScore = score;
                    bestRival = candidate;
                  }
                }
              }
              if (bestRival && ground.zoneType === 'HERO_ARENA') {
                // 투기장 대결은 정식 경기: 관계도 · 동맹에 영향 없음
                this.currentTargetHunter = bestRival;
                this.currentTargetMonster = null;
              } else if (bestRival) {
                const prevRel = interactionManager.getRelation(this, bestRival);
                if (prevRel.tier === 'ally') {
                  interactionManager.modifyAffinity(this, bestRival, -28, 1);
                  interactionManager.spawnBubble(this, `💔 동맹 파기! ${bestRival.name}을 노린다!`, '#fb7185');
                } else {
                  interactionManager.spawnBubble(this, `⚔️ PvP 선공! ${bestRival.name}!`, '#fb7185');
                }
                this.currentTargetHunter = bestRival;
                this.currentTargetMonster = null;
              }
            }

            if (isValidPvpTarget(this.currentTargetHunter)) {
              const rival = this.currentTargetHunter;
              // PvP 결판이 날 때까지 서로 대상을 고정 유지
              if (!rival.currentTargetHunter || rival.currentTargetHunter.hp <= 0) {
                rival.currentTargetHunter = this;
                rival.currentTargetMonster = null;
              }
              const rivalDist = Math.hypot(rival.x - this.x, rival.y - this.y);
              const combat = this.getCombatProfile();
              const approachRange = combat.style === 'MELEE' ? combat.range * 0.85 : combat.range;
              const canAttackNow = rivalDist <= combat.range + 6;

              if (rivalDist > approachRange && !canAttackNow) {
                const dx = rival.x - this.x;
                const dy = rival.y - this.y;
                this.facing = dx >= 0 ? 1 : -1;
                this.x += (dx / rivalDist) * this.speed * 1.15 * dt;
                this.y += (dy / rivalDist) * this.speed * 1.15 * dt;
                enforceTownWallCollision(this, 12);
                this.walkCycle += dt * 11;
              }

              if (canAttackNow) {
                this.facing = rival.x >= this.x ? 1 : -1;
                this.attackCooldown = (this.attackCooldown || 0) - dt;
                this.fatigue = Math.min(100, this.fatigue + dt * 2.4 * (this.personality?.fatigueMult || 1));
                this.hunger = Math.max(0, this.hunger - dt * 1.5 * (this.personality?.hungerMult || 1));

                if (this.attackCooldown <= 0) {
                  this.attackCooldown = combat.cooldown;
                  this.attackAnimTimer = 0.34;
                  const stats = this.getComputedStats();
                  const isCrit = Math.random() * 100 < stats.crit;
                  const skillCast = Math.random() < 0.45 ? this.tryUseActiveSkill(stats) : null;
                  const mult = (isCrit ? 1.45 : 0.9) * (skillCast ? skillCast.dmgMult : 1);
                  const dmg = Math.max(14, Math.round(stats.atk * mult));

                  if (combat.style === 'RANGED') {
                    combatEffects.spawnProjectile({
                      attacker: this,
                      target: rival,
                      ground,
                      isPvpTarget: true,
                      x: this.x + this.facing * 12,
                      y: this.y - 4,
                      speed: combat.projType === 'ARROW' ? 385 : 295,
                      projType: combat.projType,
                      color: skillCast ? '#fde047' : '#fb7185',
                      dmg,
                      isCrit: isCrit || !!skillCast
                    });
                  } else {
                    combatEffects.spawnMeleeSlash({
                      x: this.x + this.facing * 18,
                      y: this.y - 2,
                      facing: this.facing,
                      slashType: combat.slashType,
                      color: skillCast ? '#fde047' : '#fb7185'
                    });
                    combatEffects.applyHitToHunterPvP(this, rival, dmg, isCrit || !!skillCast);
                  }
                }
              }
              return;
            }
          }

          const aliveMonsters = ground.monsters.filter(m => m.hp > 0);
          if (aliveMonsters.length === 0) {
            this.currentTargetMonster = null;
            this.huntTimer -= dt;
            if (this.huntTimer <= 0) {
              if (ground.id === SKY_ISLAND_GROUND.id) {
                teleportHunterFromSkyIslandToTown(this, '✨ 천공의 섬 사냥 종료 · 마을 순간 이동!');
                return;
              }
              this.state = 'IDLE';
              this.stateTimer = 0.5;
              this.activeGroundId = null;
            }
            return;
          }

          // 현재 공격 중인 대상이 살아있으면 끝까지 유지, 처치(hp <= 0)되었거나 없을 때만 다음 최근접 타겟 선정
          let targetMonster = (
            this.currentTargetMonster &&
            this.currentTargetMonster.hp > 0 &&
            ground.monsters.includes(this.currentTargetMonster)
          ) ? this.currentTargetMonster : null;

          // 다른 헌터가 이미 사냥 중인 몬스터인지 동료 관계도로 공격 회피 여부 판정
          const getFellowOccupantsOnMonster = (mon) => {
            if (!mon || mon.hp <= 0) return [];
            const occupants = [];
            for (let i = 0; i < hunters.length; i++) {
              const other = hunters[i];
              if (!other || other.id === this.id) continue;
              if (other.state !== 'HUNTING_FIELD' || other.activeGroundId !== ground.id) continue;
              const isTargeting = other.currentTargetMonster === mon || mon.aggroTargetId === other.id;
              if (!isTargeting) continue;
              occupants.push({ other, rel: interactionManager.getRelation(this, other) });
            }
            return occupants;
          };

          const isMonsterOccupiedByFellow = (mon) => {
            const occupants = getFellowOccupantsOnMonster(mon);
            if (occupants.length === 0) return false;
            const isAggroPersonality = PK_AGGRESSIVE_PERSONALITIES.has(this.personality?.id);
            const isHighLawlessZone = ground.id === 'high_field_40_70';

            for (let i = 0; i < occupants.length; i++) {
              const { rel } = occupants[i];
              // 상급 사냥터에서는 호감도가 높아도 몬스터 스틸 시도가 발생할 수 있도록 허용
              if (isHighLawlessZone) {
                if (rel.tier === 'ally') {
                  if (Math.random() < (isAggroPersonality ? 0.55 : 0.72)) return true;
                  continue;
                }
                if (rel.tier === 'friendly') {
                  if (Math.random() < (isAggroPersonality ? 0.45 : 0.62)) return true;
                  continue;
                }
              }

              // 동맹(60+) / 우호(20~59): 동료 몬스터 존중해 공격 안 함
              if (rel.tier === 'ally' || rel.tier === 'friendly') return true;
              // 중립(-19~19): 호전적 성격이 아니면 양보하고 공격 안 함 (호전적 성격도 70% 확률로 회피)
              if (rel.tier === 'neutral') {
                if (isAggroPersonality ? (Math.random() < 0.7) : true) return true;
              } else if (rel.tier === 'wary') {
                // 경계(-59~-20): 45% 확률로 회피
                if (Math.random() < 0.45) return true;
              } else {
                // 숙적(-60 이하): 15% 확률로 회피
                if (Math.random() < 0.15) return true;
              }
            }
            return false;
          };

          if (targetMonster && isMonsterOccupiedByFellow(targetMonster)) {
            targetMonster = null;
            this.currentTargetMonster = null;
          }

          if (!targetMonster) {
            const preferredCandidates = aliveMonsters.filter(m => !isMonsterOccupiedByFellow(m));
            // 양보해야 할 몬스터가 있더라도 멈추지 않고 살아있는 몬스터 중 차선 타겟을 선택해 계속 사냥 진행
            const pool = preferredCandidates.length > 0 ? preferredCandidates : aliveMonsters;

            let nearest = pool[0];
            let bestDist = Math.hypot(nearest.x - this.x, nearest.y - this.y);
            for (let i = 1; i < pool.length; i++) {
              const d = Math.hypot(pool[i].x - this.x, pool[i].y - this.y);
              if (d < bestDist) {
                bestDist = d;
                nearest = pool[i];
              }
            }
            targetMonster = nearest;
            this.currentTargetMonster = nearest;
          }

          const targetDist = Math.hypot(targetMonster.x - this.x, targetMonster.y - this.y);
          const combat = this.getCombatProfile();
          // 근접 헌터는 공격 범위보다 20% 더 가깝게(80% 거리) 접근하되, 이미 공격 범위에 들어오면 즉시 공격 가능
          const approachRange = combat.style === 'MELEE' ? combat.range * 0.8 : combat.range;
          const canAttackNow = targetDist <= combat.range;

          if (targetDist > approachRange && !canAttackNow) {
            const dx = targetMonster.x - this.x;
            const dy = targetMonster.y - this.y;
            this.facing = dx >= 0 ? 1 : -1;
            this.x += (dx / targetDist) * this.speed * dt;
            this.y += (dy / targetDist) * this.speed * dt;
            enforceTownWallCollision(this, 12);
            this.walkCycle += dt * 11;
          }

          if (canAttackNow) {
            // 직업 사거리 내 진입: 근접/원거리 공격 모션 및 타격 즉시 실행
            this.facing = targetMonster.x >= this.x ? 1 : -1;
            this.attackCooldown = (this.attackCooldown || 0) - dt;
            const meleeStrainMult = combat.style === 'MELEE' ? 0.7 : 1;
            this.fatigue = Math.min(100, this.fatigue + dt * 2.2 * meleeStrainMult * (this.personality?.fatigueMult || 1));
            this.hunger = Math.max(0, this.hunger - dt * 1.4 * meleeStrainMult * (this.personality?.hungerMult || 1));

            if (this.attackCooldown <= 0) {
              this.attackCooldown = combat.cooldown;
              this.attackAnimTimer = 0.34;

              // 다른 헌터가 사냥 중인 몬스터를 공격할 때 동료 관계도 등급별 호감도 하락 확률 적용
              const fellowOccupants = getFellowOccupantsOnMonster(targetMonster);
              if (fellowOccupants.length > 0) {
                const isHighLawlessZone = ground.id === 'high_field_40_70';
                const dropChanceByTier = isHighLawlessZone
                  ? {
                      ally: 0.85,
                      friendly: 0.78,
                      neutral: 0.55,
                      wary: 0.45,
                      rival: 0.35
                    }
                  : {
                      ally: 0.22,
                      friendly: 0.16,
                      neutral: 0.10,
                      wary: 0.08,
                      rival: 0.05
                    };
                const dropDeltaByTier = isHighLawlessZone
                  ? {
                      ally: -6,
                      friendly: -5,
                      neutral: -4,
                      wary: -4,
                      rival: -4
                    }
                  : {
                      ally: -2,
                      friendly: -2,
                      neutral: -1,
                      wary: -2,
                      rival: -2
                    };

                fellowOccupants.forEach(({ other, rel }) => {
                  const chance = dropChanceByTier[rel.tier] ?? 0.1;
                  if (Math.random() < chance) {
                    // 동맹 관계일수록 스틸 시 배신감으로 호감도 하락 폭이 더 크게 적용
                    const baseDelta = dropDeltaByTier[rel.tier] ?? -1;
                    const delta = rel.tier === 'ally' ? Math.min(baseDelta, -10) : baseDelta;
                    const grudgeAdd = ((isHighLawlessZone || rel.tier === 'ally' || rel.tier === 'rival') && Math.random() < 0.45) ? 1 : 0;
                    interactionManager.modifyAffinity(this, other, delta, grudgeAdd);
                    if (isHighLawlessZone || Math.random() < 0.35) {
                      const stealMsg = rel.tier === 'ally'
                        ? `💔 ${this.name}! 동맹인데 뒤통수를 치다니!`
                        : (rel.tier === 'friendly'
                            ? `💢 ${this.name}! 우호 관계를 배신하다니!`
                            : `💢 ${this.name} 내 사냥감 스틸하지 마!`);
                      interactionManager.spawnBubble(other, stealMsg, '#fca5a5');
                    }
                  }
                });
              }

              const stats = this.getComputedStats();
              const isCrit = Math.random() * 100 < stats.crit;
              const skillCast = Math.random() < 0.45 ? this.tryUseActiveSkill(stats) : null;
              const mult = (isCrit ? 1.5 : 0.9) * (skillCast ? skillCast.dmgMult : 1);
              const dmg = Math.max(12, Math.round(stats.atk * mult * this.getMonsterDamageMultiplier(targetMonster)));

              if (combat.style === 'RANGED') {
                // 원거리 직업: 화살 또는 마법 구체 투사체 발사
                combatEffects.spawnProjectile({
                  attacker: this,
                  target: targetMonster,
                  ground,
                  x: this.x + this.facing * 12,
                  y: this.y - 4,
                  speed: combat.projType === 'ARROW' ? 380 : 290,
                  projType: combat.projType,
                  color: skillCast ? '#fde047' : combat.projColor,
                  dmg,
                  isCrit: isCrit || !!skillCast
                });
              } else {
                // 근접 직업: 전방 검기/도끼 참격 이펙트 + 즉시 근접 타격 & 반격 피해
                combatEffects.spawnMeleeSlash({
                  x: this.x + this.facing * 18,
                  y: this.y - 2,
                  facing: this.facing,
                  slashType: combat.slashType,
                  color: skillCast ? '#fde047' : combat.slashColor
                });
                const counterDmg = Math.max(12, Math.round((targetMonster.atk || 50) - stats.def * 0.24));
                this.hp = Math.max(1, this.hp - counterDmg);
                combatEffects.applyHitToMonster(this, targetMonster, ground, dmg, isCrit || !!skillCast);
              }
            }

            // 근접 몬스터는 공격을 받아 어그로(provoked)가 활성화되었을 때 근접 반격 수행 (원거리 몬스터는 루프에서 투사체 발사)
            if (targetMonster.provoked && !targetMonster.isRanged) {
              targetMonster.attackCooldown = (targetMonster.attackCooldown || 0) - dt;
              if (targetMonster.hp > 0 && targetMonster.attackCooldown <= 0) {
                targetMonster.attackCooldown = 1.15;
                const stats = this.getComputedStats();
                const rawMonsterAtk = targetMonster.atk || 50;
                const takenDmg = Math.max(10, Math.round(rawMonsterAtk * (combat.style === 'RANGED' ? 0.65 : 0.85) - stats.def * 0.22));
                this.hp = Math.max(1, this.hp - takenDmg);
              }
            }
          }
          rescueStrandedHunterIfNeeded(this, stepStartX, stepStartY, dt);
          return;
        }

        if (this.state === 'IN_DUNGEON') {
          const passives = this.skills?.passives || [];
          const p = getEffectivePersonalityProfile(this.personality, this.rebirthCount);
          const mpSave = passives.reduce((acc, sk) => acc * (sk.mpSave || 1), 1) * (p.mpSave || 1);
          const fatigueResist = passives.reduce((acc, sk) => acc * (sk.fatigueResist || 1), 1) * (p.fatigueMult || 1);
          const hungerMult = p.hungerMult || 1;

          this.dungeonTimer -= dt;
          this.dungeonProgress = Math.min(100, Math.round((1 - this.dungeonTimer / this.dungeonDuration) * 100));

          // 깊은 층수일수록 교전 피해 및 MP/피로도 소모가 훨씬 가혹하게 증가
          const floorIntensity = 1 + this.dungeonFloor * 0.06;
          this.hp = Math.max(1, this.hp - dt * (8 + this.dungeonFloor * 1.4));
          this.mp = Math.max(0, this.mp - dt * 8 * floorIntensity * mpSave);
          this.fatigue = Math.min(100, this.fatigue + dt * 5.5 * floorIntensity * fatigueResist);
          this.hunger = Math.max(0, this.hunger - dt * 3.0 * hungerMult);

          const dungeonBld = village.getAllBuildings().find(b => b.type === 'dungeon');
          if (!dungeonBld || this.dungeonTimer <= 0) {
            if (dungeonBld) {
              const attempt = DUNGEON_DIFFICULTY.resolveClearAttempt(this, this.dungeonFloor);
              this.hp = Math.max(1, Math.round(this.hp - this.maxHp * attempt.hpLossRatio * 0.45));

              if (attempt.success) {
                const goldMult = (p.goldMult || 1) * (p.lootMult || 1);
                const reward = Math.round((120 + this.dungeonFloor * 48) * dungeonBld.level * goldMult);
                const gainedMat = (1 + Math.floor(this.dungeonFloor / 6) + Math.floor(dungeonBld.level / 2)) + (p.extraMat || 0);
                const hunterShare = Math.round(reward * 0.65 * (p.personalGoldMult || 1));
                this.personalGold += hunterShare;
                if (gainedMat > 0) {
                  this.inventory.addItem('dungeon_abyss_shard', gainedMat);
                }
                const isNewRecord = this.dungeonFloor > this.bestDungeonFloor;
                if (isNewRecord) {
                  this.bestDungeonFloor = this.dungeonFloor;
                }

                // 던전 전투 경험치 획득 + 스킬 사용 숙련도 누적 및 레벨업 체크
                const gainedExp = (90 + this.dungeonFloor * 42) * dungeonBld.level;
                this.gainExp(gainedExp);

                const pasIdx = Math.floor(Math.random() * Math.max(1, this.skills.passives.length));
                const leveledPas = this.recordSkillUse('passives', pasIdx);

                gameState.gold += reward;
                updateResourceHUD();
                const recordTag = isNewRecord ? ' 🏆최고기록!' : '';
                const skillUpTag = leveledPas ? ` · ${leveledPas.name} Lv.${leveledPas.lv}!` : '';
                showToast(`💎 ${this.name} B${this.dungeonFloor}F 클리어!${recordTag}${skillUpTag} (+${reward.toLocaleString()}G)`);
              } else {
                // 공략 실패: 부상 후퇴 및 소량의 전투 경험치만 획득
                this.hp = Math.max(1, Math.round(this.hp * 0.15));
                this.fatigue = Math.min(100, this.fatigue + 25);
                this.gainExp(20 + this.dungeonFloor * 8);
                interactionManager.spawnBubble(this, `🩸 B${this.dungeonFloor}F 후퇴...`, '#fca5a5');
                showToast(`💀 ${this.name} B${this.dungeonFloor}F 공략 실패! (${attempt.reason})`);
              }
            }
            this.state = 'IDLE';
            this.stateTimer = 0.6;
            this.dungeonFloor = 0;
            this.dungeonProgress = 0;
          }
          return;
        }


        if (this.state === 'IDLE') {
          this.stateTimer -= dt;
          if (this.stateTimer <= 0) {
            this.pickNextDestination();
          }
        } else if (this.state === 'WALKING') {
          // 사냥터 출정 이동 중 사냥터 경계에 진입하면 끝점까지 가지 않고 즉시 몬스터 탐색 및 교전 전환
          if (this.targetBuildingType === 'hunting_ground' && this.targetGroundId) {
            const ground = HUNTING_GROUNDS.find(g => g.id === this.targetGroundId);
            const hasRemainingMidWaypoints = ground && (ground.id === 'mid_field_20_40' || ground.id === 'top_field_70_99' || ground.id === 'rebirth_sanctuary_field') && (this.waypoints?.length || 0) > 1;
            if (ground && !hasRemainingMidWaypoints) {
              const b = ground.bounds;
              const enteredGround = (
                this.x >= b.x + 24 &&
                this.x <= b.x + b.w - 24 &&
                this.y >= b.y + 68 &&
                this.y <= b.y + b.h - 24
              );
              if (enteredGround) {
                const pref = evaluateHuntingGroundPreference(this, ground);
                this.waypoints = [];
                this.state = 'HUNTING_FIELD';
                this.activeGroundId = ground.id;
                if (!this.currentTargetMonster || this.currentTargetMonster.hp <= 0) {
                  this.currentTargetMonster = null;
                }
                this.huntTimer = 14 + Math.random() * 6;
                interactionManager.spawnBubble(
                  this,
                  pref.matched ? `🌿 사냥 시작! (${pref.label})` : '⚠️ 경험치 90% 감소 구간...',
                  pref.matched ? '#86efac' : '#fca5a5'
                );
                return;
              }
            }
          }

          const curGoal = (this.waypoints && this.waypoints.length > 0)
            ? this.waypoints[0]
            : { x: this.targetX, y: this.targetY };
          const dx = curGoal.x - this.x;
          const dy = curGoal.y - this.y;
          const dist = Math.hypot(dx, dy);

          if (this.targetBuildingType === 'sky_island_portal') {
            const skyGate = village.getAllBuildings().find(b => b.type === 'sky_island_gate');
            if (skyGate && canHunterEnterSkyIsland(this)) {
              const gateDoorX = skyGate.x;
              const gateDoorY = skyGate.y + skyGate.h / 2 + 16;
              if (Math.hypot(gateDoorX - this.x, gateDoorY - this.y) <= 22) {
                teleportHunterToSkyIsland(this, skyGate);
                return;
              }
            }
          }

          if (dist < 4) {
            this.x = curGoal.x;
            this.y = curGoal.y;

            if (this.waypoints && this.waypoints.length > 0) {
              this.waypoints.shift();
              if (this.waypoints.length > 0) return;
            }

            if (this.targetBuildingType === 'sky_island_portal') {
              const skyGate = village.getAllBuildings().find(b => b.type === 'sky_island_gate');
              if (!skyGate || !canHunterEnterSkyIsland(this)) {
                this.state = 'IDLE';
                this.stateTimer = 0.5;
                this.targetBuildingName = '';
                this.targetBuildingType = '';
                this.targetGroundId = null;
                return;
              }
              teleportHunterToSkyIsland(this, skyGate);
              return;
            }

            if (this.targetBuildingType === REBIRTH_ALTAR.id) {
              if (!canHunterEnterRebirthAltar(this)) {
                this.state = 'IDLE';
                this.stateTimer = 0.5;
                this.targetBuildingName = '';
                this.targetBuildingType = '';
                showToast(`🔒 '${this.name}' 헌터는 1환생 이상만 [초월 환생의 제단]에 입장할 수 있습니다.`);
                return;
              }
              this.state = 'REBIRTH_ALTAR_HUNT';
              this.currentTargetMonster = REBIRTH_ALTAR.boss;
              interactionManager.spawnBubble(this, '✨ 초월 환생의 제단 교전 개시!', '#f0abfc');
              return;
            }

            if (this.targetBuildingType === 'hunting_ground' && this.targetGroundId) {
              const ground = HUNTING_GROUNDS.find(g => g.id === this.targetGroundId);
              if (ground) {
                const pref = evaluateHuntingGroundPreference(this, ground);
                this.state = 'HUNTING_FIELD';
                this.activeGroundId = ground.id;
                if (!this.currentTargetMonster || this.currentTargetMonster.hp <= 0) {
                  this.currentTargetMonster = null;
                }
                this.huntTimer = 14 + Math.random() * 6;
                interactionManager.spawnBubble(
                  this,
                  pref.matched ? `🌿 사냥 시작! (${pref.label})` : '⚠️ 경험치 90% 감소 구간...',
                  pref.matched ? '#86efac' : '#fca5a5'
                );
                return;
              }
            }

            if (this.targetBuildingType === 'dungeon') {
              const dungeonBld = village.getAllBuildings().find(b => b.type === 'dungeon');
              if (dungeonBld) {
                const floor = DUNGEON_DIFFICULTY.pickChallengeFloor(this, dungeonBld.level);
                if (!floor || floor <= 0) {
                  this.state = 'IDLE';
                  this.stateTimer = 1.2;
                  this.targetBuildingName = '';
                  this.targetBuildingType = '';
                  interactionManager.spawnBubble(this, '🛡️ 권장 장비 미달 · 던전 도전 보류!', '#fca5a5');
                  return;
                }
                const exploreMult = this.personality?.exploreSpeedMult || 1;
                this.state = 'IN_DUNGEON';
                this.dungeonFloor = floor;
                this.dungeonProgress = 0;
                this.dungeonDuration = Math.max(4.5, (6 + floor * 0.22) * exploreMult);
                this.dungeonTimer = this.dungeonDuration;
                this.targetBuildingName = '';
                this.targetBuildingType = '';
                return;
              }
            }
            if (this.targetBuildingType === 'boss_standby' || this.targetBuildingType === 'orc_subjugation_standby') {
              this.state = 'RAID_PREP_WAIT';
              this.stateTimer = 2.0;
              return;
            }

            if (this.targetBuildingType) {
              this.state = 'USING_FACILITY';
              this.stateTimer = 2.6 + Math.random() * 1.4;
              this.applyFacilityService(this.targetBuildingType);
            } else {
              this.state = 'IDLE';
              this.stateTimer = 0.8 + Math.random() * 1.2;
            }
          } else {
            this.facing = dx >= 0 ? 1 : -1;
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
            enforceTownWallCollision(this, 12);
            this.walkCycle += dt * 10;
            rescueStrandedHunterIfNeeded(this, stepStartX, stepStartY, dt);
          }
        } else if (this.state === 'RAID_PREP_WAIT') {
          const inPrep = BOSS_SANCTUM.status === 'PREPARING' || ORC_SUBJUGATION.status === 'PREPARING';
          const isFallen = BOSS_SANCTUM.fallenHunterIds.has(this.id) || ORC_SUBJUGATION.fallenHunterIds.has(this.id);
          if (!inPrep || isFallen) {
            this.state = 'IDLE';
            this.stateTimer = 0.2;
          }
        } else if (this.state === 'USING_FACILITY') {
          this.facilityStuckTimer = (this.facilityStuckTimer || 0) + dt;
          // 마법 강화소 이용 중 승급 기준(대장간 레벨·강화 수치·골드)을 충족한 장비가 생기면 즉시 중단 후 승급/재료 수집 전환
          if (this.targetBuildingType === 'enchanter') {
            const smithyBld = village.getAllBuildings().find(b => b.type === 'smithy');
            if (smithyBld && ['weapon', 'armor', 'helmet', 'accessory'].some(s => this.checkTierUpgradeCondition(s, smithyBld.level).canUpgrade)) {
              this.facilityStuckTimer = 0;
              this.state = 'IDLE';
              this.stateTimer = 0.05;
              this.targetBuildingName = '';
              this.targetBuildingType = '';
              return;
            }
          }
          // 동일 시설에서 4.5초 이상 정체될 경우 강제 해제 후 다음 목적지 재탐색
          if (this.facilityStuckTimer > 4.5) {
            this.facilityStuckTimer = 0;
            this.enhanceCooldown = 25;
            this.state = 'IDLE';
            this.stateTimer = 0.1;
            this.targetBuildingName = '';
            this.targetBuildingType = '';
            this.pickNextDestination(true);
            return;
          }
          this.stateTimer -= dt;
          if (this.stateTimer <= 0) {
            this.facilityStuckTimer = 0;
            this.state = 'IDLE';
            this.stateTimer = 0.5 + Math.random() * 0.8;
            this.targetBuildingName = '';
            this.targetBuildingType = '';
          }
        }
      }

      applyFacilityService(bldType) {
        const bld = village.getAllBuildings().find(b => b.type === bldType);
        const lv = bld ? bld.level : 1;
        const p = getEffectivePersonalityProfile(this.personality, this.rebirthCount);
        const healMult = p.healMult || 1;
        let baseFee = 0;

        if (bldType === 'inn') {
          const hpHeal = Math.round(this.maxHp * (0.45 + lv * 0.1) * healMult);
          const mpHeal = Math.round(this.maxMp * (0.45 + lv * 0.1) * healMult);
          const fatigueDrop = Math.round((45 + lv * 10) * healMult);
          const prevHp = this.hp;
          const prevMp = this.mp;
          const prevFatigue = this.fatigue;

          this.hp = Math.min(this.maxHp, this.hp + hpHeal);
          this.mp = Math.min(this.maxMp, this.mp + mpHeal);
          this.fatigue = Math.max(0, this.fatigue - fatigueDrop);

          if (this.hp > prevHp || this.mp > prevMp || this.fatigue < prevFatigue) {
            baseFee = 30 + lv * 15;
          }
        } else if (bldType === 'tavern') {
          const prevHunger = this.hunger;
          const prevHp = this.hp;
          const prevFatigue = this.fatigue;
          const prevBento = this.bento || 0;

          this.hunger = 100;
          this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.2 * healMult));
          this.fatigue = Math.max(0, this.fatigue - 15);

          const maxBento = getMaxBentoCapacity(this.level, this.rebirthCount);
          const bentoPrice = 45;
          let boughtBento = 0;
          if (maxBento > 0) {
            this.bento = Math.min(maxBento, prevBento);
            while (this.bento < maxBento && this.personalGold >= bentoPrice) {
              this.personalGold -= bentoPrice;
              this.bento += 1;
              boughtBento += 1;
            }
          }

          if (this.hunger > prevHunger || this.hp > prevHp || this.fatigue < prevFatigue || boughtBento > 0) {
            baseFee = 25 + lv * 10 + boughtBento * 10;
          }
          if (boughtBento > 0) {
            interactionManager.spawnBubble(this, `🍱 도시락 보충 (${this.bento}/${maxBento})`, '#fde047');
          }
        } else if (bldType === 'potion') {
          const unitPrice = Math.max(15, 32 - lv * 2);
          const maxHpPot = getMaxHpPotionCapacity(this.level, this.rebirthCount);
          const maxMpPot = getMaxMpPotionCapacity(this.level, this.rebirthCount);
          this.potions.hp = Math.min(maxHpPot, Math.max(0, this.potions.hp || 0));
          let boughtCount = 0;
          while (this.potions.hp < maxHpPot && this.personalGold >= unitPrice) {
            this.personalGold -= unitPrice;
            this.potions.hp += 1;
            boughtCount += 1;
          }
          this.potions.mp = Math.min(maxMpPot, Math.max(0, this.potions.mp || 0));
          while (this.potions.mp < maxMpPot && this.personalGold >= unitPrice) {
            this.personalGold -= unitPrice;
            this.potions.mp += 1;
            boughtCount += 1;
          }

          const maxBento = getMaxBentoCapacity(this.level, this.rebirthCount);
          const bentoPrice = 45;
          let boughtBento = 0;
          if (maxBento > 0) {
            this.bento = Math.min(maxBento, Math.max(0, this.bento || 0));
            while (this.bento < maxBento && this.personalGold >= bentoPrice) {
              this.personalGold -= bentoPrice;
              this.bento += 1;
              boughtBento += 1;
            }
          }

          const prevHp = this.hp;
          const prevMp = this.mp;
          this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.35 * healMult));
          this.mp = Math.min(this.maxMp, this.mp + Math.round(this.maxMp * 0.5 * healMult));

          if (boughtCount > 0 || boughtBento > 0 || this.hp > prevHp || this.mp > prevMp) {
            baseFee = 25 + lv * 10 + (boughtCount + boughtBento) * 10;
          }
          if (boughtCount > 0 || boughtBento > 0) {
            const bentoLabel = maxBento > 0 ? ` · 🍱${this.bento}/${maxBento}` : '';
            interactionManager.spawnBubble(this, `🧪 물약 보충 (HP ${this.potions.hp}/${maxHpPot} · MP ${this.potions.mp}/${maxMpPot}${bentoLabel})`, '#86efac');
          }
        } else if (bldType === 'temple') {
          const needsCare = this.hp < this.maxHp || this.mp < this.maxMp || this.fatigue > 0;
          if (needsCare) {
            this.hp = this.maxHp;
            this.mp = this.maxMp;
            this.fatigue = 0;
            baseFee = 60 + lv * 25;
            interactionManager.spawnBubble(this, '✨ 신성한 축복으로 완치!', '#7dd3fc');
          }
        } else if (bldType === 'training') {
          if (this.fatigue < 95) {
            baseFee = 45 + lv * 20;
            this.gainExp(35 + lv * 25);
            const pasIdx = Math.floor(Math.random() * Math.max(1, this.skills.passives.length));
            this.recordSkillUse('passives', pasIdx);
            this.fatigue = Math.min(100, this.fatigue + 12);
            interactionManager.spawnBubble(this, '🎯 전투 기술 수련 완료!', '#fde047');
          }
        } else if (bldType === 'enchanter') {
          const pick = this.getNextEnhanceTarget();
          if (!pick) {
            // 실제 강화 비용(골드/장비조각) 부족 또는 전 부위 +15강 도달 시 재방문 쿨타임을 부여하고 즉시 사냥터 등 다음 목적지로 출발
            this.enhanceCooldown = 25;
            this.facilityStuckTimer = 0;
            this.state = 'IDLE';
            this.stateTimer = 0.1;
            this.targetBuildingName = '';
            this.targetBuildingType = '';
            this.pickNextDestination(true);
            return;
          }
          this.personalGold -= pick.cost;
          if (this.inventory && pick.fragCost > 0) {
            this.inventory.removeItem('equip_fragment', pick.fragCost);
          }
          this.enhanceCooldown = 3; // 골드가 남아 있으면 곧바로 이어서 강화
          baseFee = 80 + lv * 35;
          const chance = Math.min(0.96, Math.max(0.32, 0.86 - pick.item.enhance * 0.04 + lv * 0.025));
          if (Math.random() < chance) {
            pick.item.enhance += 1;
            this.recalculateVitals(false);
            interactionManager.spawnBubble(this, `🔮 ${this.getEquipDisplayName(pick.slot)} +${pick.item.enhance}강! (🧩-${pick.fragCost})`, '#c084fc');
          } else {
            interactionManager.spawnBubble(this, `💦 강화 마력 흩어짐... (🧩-${pick.fragCost})`, '#94a3b8');
          }
        } else if (bldType === 'smithy') {
          const slots = ['weapon', 'armor', 'helmet', 'accessory']
            .sort((a, b) => (this.equipment[a]?.tier || 1) - (this.equipment[b]?.tier || 1));
          for (const slot of slots) {
            const cond = this.checkTierUpgradeCondition(slot, lv);
            if (cond.canUpgrade) {
              const fragBefore = this.inventory ? this.inventory.getCount('equip_fragment') : 0;
              const rebirthEssenceBefore = this.inventory ? this.inventory.getCount('loot_rebirth_essence') : 0;
              this.personalGold -= cond.rule.goldCost;
              this.inventory.consumeCraftingMaterials(cond.rule.matCost);
              const fragAfter = this.inventory ? this.inventory.getCount('equip_fragment') : 0;
              const rebirthEssenceAfter = this.inventory ? this.inventory.getCount('loot_rebirth_essence') : 0;
              const usedFragments = Math.max(0, fragBefore - fragAfter);
              const usedRebirthEssence = Math.max(0, rebirthEssenceBefore - rebirthEssenceAfter);
              this.equipment[slot].tier = cond.nextTier;
              this.equipment[slot].enhance = 0;
              this.recalculateVitals(false);
              baseFee = 70 + lv * 30;
              const matNoteParts = [];
              if (usedFragments > 0) matNoteParts.push(`🧩장비조각 ${usedFragments}개`);
              if (usedRebirthEssence > 0) matNoteParts.push(`🌠영혼결정 ${usedRebirthEssence}개`);
              const matNote = matNoteParts.length > 0 ? ` (${matNoteParts.join(' · ')} 소모)` : '';
              interactionManager.spawnBubble(this, `⚒️ T${cond.nextTier} 장비 승급 성공!${matNote}`, '#fde047');
              showToast(`⚒️ ${this.name} [${this.getEquipDisplayName(slot)}] T${cond.nextTier} 승급 완료!${matNote}`);
              break;
            }
          }
        } else if (bldType === 'sky_smithy') {
          this.syncAutoEquipWing();
          const equippedWing = this.getEquippedWing();
          const curEnh = Math.max(0, this.wingEnhance || 0);
          const enhCost = this.getWingEnhanceCost();
          if (!equippedWing || curEnh >= 15 || this.personalGold < enhCost) {
            this.wingEnhanceCooldown = 25;
            this.facilityStuckTimer = 0;
            this.state = 'IDLE';
            this.stateTimer = 0.1;
            this.targetBuildingName = '';
            this.targetBuildingType = '';
            this.pickNextDestination(true);
            return;
          }
          this.personalGold -= enhCost;
          this.wingEnhanceCooldown = 14;
          baseFee = Math.round(enhCost * 0.25) + lv * 120;
          const clampedLv = Math.max(1, Math.min(MAX_BUILDING_LEVEL, lv));
          const successChance = clampedLv * 0.003;
          if (Math.random() < successChance) {
            this.wingEnhance = curEnh + 1;
            this.recalculateVitals(false);
            interactionManager.spawnBubble(
              this,
              `🪽 ${equippedWing.name} +${this.wingEnhance}강 성공!`,
              '#7dd3fc'
            );
            showToast(`🪽 ${this.name} [${equippedWing.name}] +${this.wingEnhance}강 강화 성공!`);
          } else {
            interactionManager.spawnBubble(this, '💨 천공 성광 흩어짐 (강화 실패)...', '#94a3b8');
          }
        } else if (bldType === 'generalstore') {
          const unitPrice = 45 + lv * 15;
          // 다음 장비 승급에 쓸 재료는 남기고 판다 (js/08a-hunter-ai.js)
          const sellableEntries = getHunterSellPlan(this);

          if (sellableEntries.length > 0) {
            let totalSaleValue = 0;
            let soldTotal = 0;
            const breakdownParts = [];

            sellableEntries.forEach(({ id, qty, def }) => {
              const mult = def.valueMultiplier || 1.0;
              totalSaleValue += Math.round(qty * unitPrice * mult);
              soldTotal += qty;
              breakdownParts.push(`${def.icon}x${qty}`);
              this.inventory.removeItem(id, qty);
            });

            this.personalGold += totalSaleValue;
            baseFee = Math.round(totalSaleValue * 0.25);

            interactionManager.spawnBubble(
              this,
              `🛍️ 전리품 ${soldTotal}개 정산 +${formatGold(totalSaleValue)}G (${breakdownParts.join(' ')})`,
              '#fde047'
            );
          }
        } else if (bldType === 'townhall' || bldType === 'guildbank') {
          if (this.personalGold >= 35 + lv * 15) {
            baseFee = 35 + lv * 15;
            this.personalGold -= baseFee;
          }
        } else if (bldType === 'rebirth_hall') {
          if (this.level >= LEVEL_REBIRTH_CONFIG.maxLevel && this.rebirthCount < LEVEL_REBIRTH_CONFIG.maxRebirths) {
            if (this.performRebirth(bld)) {
              baseFee = 100 + lv * 40;
            }
          } else if (this.mp < this.maxMp || this.level < LEVEL_REBIRTH_CONFIG.maxLevel) {
            baseFee = 100 + lv * 40;
            this.gainExp(25 + lv * 15);
            this.mp = Math.min(this.maxMp, this.mp + Math.round(this.maxMp * 0.35));
            interactionManager.spawnBubble(this, '⛩️ 환생소 영혼 명상 완료!', '#d8b4fe');
          }
        } else if (bldType === 'purification_sanctuary') {
          const purifyGain = Math.round((15 + lv * 5) * healMult);
          if ((this.alignment || 0) < 0) {
            const prevAlign = getAlignmentInfo(this.alignment);
            const nextAlign = this.modifyAlignment(purifyGain);
            baseFee = 55 + lv * 20;
            interactionManager.spawnBubble(
              this,
              `🕊️ 정화의 성소 축복! 인성 +${purifyGain} (${nextAlign.value})`,
              '#86efac'
            );
            if (prevAlign.value <= -50 && nextAlign.value > -50) {
              showToast(`🕊️ '${this.name}' 헌터가 [정화의 성소]에서 정화되어 카오스(-50 이하) 상태를 벗어났습니다!`);
            }
          }
        }

        if (baseFee > 0) {
          collectFacilityTax(this, baseFee);
        }
      }
    }
