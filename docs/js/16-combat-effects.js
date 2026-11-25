// [16-combat-effects] 전투 이펙트 (참격 · 투사체 · 데미지 팝업)
    /**
     * ============================================================================
     * 근접 참격, 원거리 투사체(화살/마법 구체) & 전투 데미지 팝업 매니저
     * ============================================================================
     */
    const combatEffects = {
      projectiles: [],
      slashes: [],
      popups: [],

      spawnProjectile(opts) {
        this.projectiles.push({ ...opts, life: 1.4 });
      },

      spawnMeleeSlash(opts) {
        this.slashes.push({ ...opts, life: 0.24, maxLife: 0.24 });
      },

      spawnDamagePopup(x, y, dmg, isCrit, customColor = null) {
        this.popups.push({
          x: x + (Math.random() - 0.5) * 12,
          y: y - 16,
          text: isCrit ? `💥 ${dmg}!` : `-${dmg}`,
          color: customColor || (isCrit ? '#fde047' : '#f8fafc'),
          isCrit,
          life: 0.75,
          maxLife: 0.75
        });
      },

      applyHitToMonster(hunter, monster, ground, dmg, isCrit) {
        if (!monster || monster.hp <= 0) return;
        const prevOwnerId = monster.aggroTargetId;
        // 피격 시 비선공 해제 -> 해당 헌터에게 반격 어그로 활성화
        monster.provoked = true;
        monster.aggroTargetId = hunter.id;
        monster.hp -= dmg;
        this.spawnDamagePopup(monster.x, monster.y, dmg, isCrit);

        if (monster.hp <= 0) {
          // 상급 사냥터에서 다른 헌터가 잡던 몬스터(어그로 대상 또는 교전 중)를 가로채 처치(막타 스틸)한 경우 호감도 대폭 감소
          if (ground && ground.id === 'high_field_40_70') {
            const victims = new Map();
            if (prevOwnerId && prevOwnerId !== hunter.id) {
              const prevHunter = hunters.find(h => h.id === prevOwnerId);
              if (prevHunter) victims.set(prevHunter.id, prevHunter);
            }
            for (let i = 0; i < hunters.length; i++) {
              const other = hunters[i];
              if (!other || other.id === hunter.id) continue;
              if (other.state === 'HUNTING_FIELD' && other.activeGroundId === ground.id && other.currentTargetMonster === monster) {
                victims.set(other.id, other);
              }
            }
            victims.forEach((victim) => {
              const rel = interactionManager.getRelation(hunter, victim);
              const killStealPenalty = (rel.tier === 'ally' || rel.tier === 'friendly') ? -10 : -7;
              interactionManager.modifyAffinity(hunter, victim, killStealPenalty, 1);
              interactionManager.spawnBubble(victim, `😡 ${hunter.name}이(가) 몬스터를 스틸했다!`, '#fb7185');
            });
          }

          monster.hp = 0;
          monster.provoked = false;
          monster.aggroTargetId = null;
          if (hunter.currentTargetMonster === monster) {
            hunter.currentTargetMonster = null;
          }
          const scaling = getHuntingGroundScaling(ground, hunters);
          monster.respawn = monster.isFieldMiniBoss ? (monster.respawnDelay || 25) : scaling.respawnDelay;

          // [천공의 섬 전용 0.01% 확률 날개 아이템 드랍]
          if (ground && ground.id === SKY_ISLAND_GROUND.id && Math.random() < 0.0001) {
            const wingId = 'sky_sanctuary_wings';
            const wingDef = ITEM_CATALOG[wingId];
            if (wingDef && hunter.inventory) {
              const alreadyOwnedWing = hunter.inventory.getCount(wingId) >= 1;
              if (!alreadyOwnedWing) {
                hunter.inventory.addItem(wingId, 1);
                if (!hunter.equippedWingId) {
                  hunter.equipWing(wingId);
                }
                interactionManager.spawnBubble(hunter, `🪽 [0.01%] ${wingDef.name} 획득 & 착용!`, '#7dd3fc');
                showToast(`🪽 경축! '${hunter.name}' 헌터가 천공의 섬에서 [0.01%] 확률로 [${wingDef.name}]을(를) 획득했습니다!`);
              } else {
                showToast(`🪽 '${hunter.name}' 헌터는 이미 [${wingDef.name}]을(를) 보유 중입니다.`);
              }
            }
          }

          const isMiniBoss = !!monster.isFieldMiniBoss;
          if (isMiniBoss) {
            const insId = monster.insigniaId ?? ground.miniBossConfig?.insigniaId ?? null;
            const insDef = insId ? ITEM_CATALOG[insId] : null;
            if (insDef && hunter.inventory) {
              const alreadyOwned = hunter.inventory.getCount(insId) >= 1;
              if (!alreadyOwned) {
                hunter.inventory.addItem(insId, 1);
                hunter.syncAutoEquipInsignia();
                const dmgPct = Math.round((insDef.monsterDmgBonusPct || 0) * 100);
                showToast(`🏅 ${hunter.name}이(가) [${insDef.name}] 획득 & 착용! (몬스터 대상 입히는 피해 +${dmgPct}%)`);
              } else {
                hunter.syncAutoEquipInsignia();
                showToast(`🏅 ${hunter.name}은(는) 이미 [${insDef.name}]을(를) 보유 중입니다. (인장 종류별 최대 1개)`);
              }
            }
          }
          const p = getEffectivePersonalityProfile(hunter.personality, hunter.rebirthCount);
          const expMult = ground.getExpMultiplier(hunter.level);
          const finalExp = Math.max(1, Math.round(ground.baseExp * expMult * (isMiniBoss ? 5 : 1)));
          const rolledBaseGold = ground.goldDropRange
            ? Math.round(
                ground.goldDropRange.min +
                Math.random() * (ground.goldDropRange.max - ground.goldDropRange.min)
              )
            : ground.baseGold;
          const goldDrop = Math.round(rolledBaseGold * (p.goldMult || 1) * (isMiniBoss ? 4 : 1));
          const hunterShare = Math.round(goldDrop * 0.7 * (p.personalGoldMult || 1));

          hunter.personalGold += hunterShare;
          const lootSpec = ground.lootSpec || { itemId: 'loot_beginner_crystal', tierKey: 'beginner', name: '초원 풀잎 결정', icon: '🌱', dropChance: 0.45 };
          const fieldTierDropCountById = {
            beginner_field: 1,
            mid_field_20_40: 2,
            high_field_40_70: 3,
            rebirth_sanctuary_field: 4,
            top_field_70_99: 5,
            sky_island_field: 6,
            celestial_palace_field: 7
          };
          const baseFieldLootQty = fieldTierDropCountById[ground?.id] || 1;
          const gainedFragments = isMiniBoss ? (baseFieldLootQty * 3) : baseFieldLootQty;
          if (hunter.inventory && gainedFragments > 0) {
            hunter.inventory.addItem('equip_fragment', gainedFragments);
          }
          if (isMiniBoss || Math.random() < (lootSpec.dropChance ?? 0.45)) {
            const targetItemId = lootSpec.itemId || LOOT_TIER_TO_ITEM_ID[lootSpec.tierKey] || 'loot_beginner_crystal';
            const dropQty = isMiniBoss ? (baseFieldLootQty + 2) : baseFieldLootQty;
            hunter.inventory.addItem(targetItemId, dropQty, {
              category: 'loot',
              name: lootSpec.name,
              icon: lootSpec.icon,
              sellable: true,
              isCraftingMat: true,
              valueMultiplier: lootSpec.valueMultiplier || 1.0
            });
            // 잡템·장비조각 획득 표시는 띄우지 않음 (중간보스 처치만 표시)
            if (isMiniBoss) interactionManager.spawnBubble(hunter, `👑 중간보스 처치! 🧩+${gainedFragments} ${lootSpec.icon}x${dropQty} +${formatGold(hunterShare)}G`, '#fde047');
          }
          gameState.gold += goldDrop;
          updateResourceHUD();

          const prevLv = hunter.level;
          hunter.gainExp(finalExp);

          // 몬스터 3마리 사냥 시 인성 +1 반영
          const alignKillRes = hunter.recordMonsterKillForAlignment();
          if (alignKillRes && alignKillRes.gained && alignKillRes.next.value !== alignKillRes.prev.value) {
            interactionManager.spawnBubble(hunter, `😇 몬스터 3마리 사냥 · 인성 +1 (${alignKillRes.next.value})`, '#86efac');
          }

          // 몬스터 처치 시 패시브 스킬 숙련도 상승 (1씩 증가)
          const pasIdx = Math.floor(Math.random() * Math.max(1, hunter.skills.passives.length));
          const prevPasLv = hunter.skills.passives[pasIdx]?.lv || 1;
          const updatedPas = hunter.recordSkillUse('passives', pasIdx);

          if (updatedPas && updatedPas.lv > prevPasLv) {
            interactionManager.spawnBubble(hunter, `🌟 패시브 [${updatedPas.name}] Lv.${updatedPas.lv}!`, '#c084fc');
          } else if (hunter.level > prevLv && hunter.level === 21) {
            interactionManager.spawnBubble(hunter, '⚠️ Lv.21! 초보사냥터 EXP -90% 구간', '#fde047');
          }
          // 몬스터 처치마다 뜨던 '+경험치' 말풍선은 화면이 복잡해져서 표시하지 않음
        }
      },

      applyHitToHunterPvP(attacker, defender, dmg, isCrit) {
        if (!attacker || !defender || defender.hp <= 0) return;
        if (((attacker.rebirthCount || 0) > 0) !== ((defender.rebirthCount || 0) > 0)) {
          if (attacker.currentTargetHunter === defender) attacker.currentTargetHunter = null;
          if (defender.currentTargetHunter === attacker) defender.currentTargetHunter = null;
          return;
        }

        // 피격당한 헌터도 즉시 반격 대상으로 전환하며 사망할 때까지 교전 유지
        defender.currentTargetHunter = attacker;
        defender.currentTargetMonster = null;
        if (!attacker.currentTargetHunter || attacker.currentTargetHunter.hp <= 0) {
          attacker.currentTargetHunter = defender;
          attacker.currentTargetMonster = null;
        }

        const defStats = defender.getComputedStats();
        const baseMitigatedDmg = Math.max(12, Math.round(dmg - defStats.def * 0.32));
        const { dmgReductionPct } = interactionManager.getRivalPvpDefenseBonus(defender, hunters);
        const mitigatedDmg = dmgReductionPct > 0
          ? Math.max(8, Math.round(baseMitigatedDmg * (1 - dmgReductionPct / 100)))
          : baseMitigatedDmg;
        defender.hp = Math.max(0, defender.hp - mitigatedDmg);
        this.spawnDamagePopup(defender.x, defender.y, mitigatedDmg, isCrit, isCrit ? '#fde047' : '#fb7185');
        interactionManager.modifyAffinity(attacker, defender, -2, 0);

        if (defender.hp <= 0) {
          // PvP 사망 확정: 소지 골드·재료 일부 약탈 정산 및 마을 귀환
          const lootedGold = Math.min(defender.personalGold, Math.max(30, Math.round(defender.personalGold * 0.2)));
          const lootedMat = defender.materials > 0 ? Math.min(defender.materials, Math.max(1, Math.floor(defender.materials * 0.25))) : 0;

          defender.personalGold = Math.max(0, defender.personalGold - lootedGold);
          defender.materials = Math.max(0, defender.materials - lootedMat);
          attacker.personalGold += lootedGold;
          attacker.materials += lootedMat;

          interactionManager.modifyAffinity(attacker, defender, -18, 2);

          defender.hp = Math.round(defender.maxHp * 0.22);
          defender.x = (Math.random() - 0.5) * 60;
          defender.y = 20;
          defender.waypoints = [];
          defender.state = 'IDLE';
          defender.stateTimer = 0.8;
          defender.activeGroundId = null;
          defender.currentTargetMonster = null;
          defender.currentTargetHunter = null;

          attacker.currentTargetHunter = null;
          attacker.gainExp(120);

          // 헌터를 죽일 경우 인성 -5 하락
          const prevAtkAlign = getAlignmentInfo(attacker.alignment);
          const nextAtkAlign = attacker.modifyAlignment(-5);

          const lootLabel = lootedGold > 0 || lootedMat > 0
            ? ` (+${formatGold(lootedGold)}G · 재료 ${lootedMat}개)`
            : '';
          interactionManager.spawnBubble(attacker, `🏆 PvP 승리 · 인성 -5 (${nextAtkAlign.value})${lootLabel}`, '#fde047');
          interactionManager.spawnBubble(defender, '💀 PvP 사망 후 마을 귀환...', '#fca5a5');
          showToast(`⚔️ [PvP 사망 결판] ${attacker.name}이(가) ${defender.name}을(를) 쓰러뜨렸습니다! (인성 ${prevAtkAlign.value} → ${nextAtkAlign.value}, -5)${lootLabel}`);
        }
      },

      update(dt) {
        // 원거리 투사체 이동 및 명중 판정 (헌터 투사체 + 원거리 몬스터 투사체)
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
          const pr = this.projectiles[i];
          pr.life -= dt;
          if (pr.life <= 0 || !pr.target || pr.target.hp <= 0) {
            this.projectiles.splice(i, 1);
            continue;
          }
          const dx = pr.target.x - pr.x;
          const dy = (pr.target.y - 2) - pr.y;
          const dist = Math.hypot(dx, dy);
          const step = pr.speed * dt;
          if (dist <= step + 8) {
            if (pr.isMonsterProj) {
              if (pr.isOrcAttackProj) {
                const srcOrc = pr.orcSource;
                if (pr.targetIsGuard) {
                  // 오크 토벌전: 경비병 명중
                  if (ORC_SUBJUGATION.status === 'ACTIVE') {
                    damageRaidGuard(pr.target, pr.dmg, pr.isCrit, pr.color || '#e879f9', srcOrc?.name || '오크 혈투주술사');
                  }
                } else if (pr.targetIsHunter) {
                  const targetHunter = pr.target;
                  const canHitHunter = targetHunter && targetHunter.hp > 0 && (
                    targetHunter.state === 'HUNTING_FIELD' ||
                    (ORC_SUBJUGATION.status === 'ACTIVE' && targetHunter.state === 'ORC_SUBJUGATION_RAID')
                  );
                  if (canHitHunter) {
                    const hStats = targetHunter.getComputedStats();
                    const takenByHunter = Math.max(15, Math.round(pr.dmg - hStats.def * 0.28));
                    targetHunter.hp = Math.max(0, targetHunter.hp - takenByHunter);
                    this.spawnDamagePopup(targetHunter.x, targetHunter.y, takenByHunter, pr.isCrit, pr.color || '#e879f9');
                    if (targetHunter.hp <= 0) {
                      if (srcOrc) recordOrcHunterKill(srcOrc);
                      if (ORC_SUBJUGATION.status === 'ACTIVE' && targetHunter.state === 'ORC_SUBJUGATION_RAID') {
                        handleHunterFallenInSubjugation(targetHunter, srcOrc?.name || '오크 혈투주술사');
                      } else {
                        targetHunter.hp = Math.round(targetHunter.maxHp * 0.25);
                        targetHunter.x = (Math.random() - 0.5) * 60;
                        targetHunter.y = 20;
                        targetHunter.waypoints = [];
                        targetHunter.state = 'IDLE';
                        targetHunter.stateTimer = 0.8;
                        targetHunter.activeGroundId = null;
                        targetHunter.currentTargetMonster = null;
                        targetHunter.currentTargetHunter = null;
                        interactionManager.spawnBubble(targetHunter, `💀 ${srcOrc?.name || '오크 혈투주술사'}의 원거리 주술에 패배...`, '#fca5a5');
                      }
                    }
                  }
                } else {
                  const targetMon = pr.target;
                  const topGround = HUNTING_GROUNDS.find(g => g.id === 'top_field_70_99');
                  if (targetMon && targetMon.hp > 0) {
                    targetMon.hp = Math.max(0, targetMon.hp - pr.dmg);
                    this.spawnDamagePopup(targetMon.x, targetMon.y, pr.dmg, pr.isCrit, pr.color || '#e879f9');
                    if (targetMon.hp <= 0) {
                      targetMon.hp = 0;
                      targetMon.provoked = false;
                      targetMon.aggroTargetId = null;
                      if (topGround) {
                        const scaling = getHuntingGroundScaling(topGround, hunters);
                        targetMon.respawn = targetMon.isFieldMiniBoss ? (targetMon.respawnDelay || 25) : scaling.respawnDelay;
                      }
                      if (srcOrc) recordOrcMonsterKill(srcOrc);
                    }
                  }
                }
                this.slashes.push({
                  x: pr.target.x,
                  y: pr.target.y - 2,
                  facing: 1,
                  slashType: 'MAGIC_BURST',
                  color: pr.color || '#e879f9',
                  life: 0.25,
                  maxLife: 0.25
                });
                this.projectiles.splice(i, 1);
                continue;
              }
              if (pr.isOrcTarget) {
                const targetOrc = pr.target;
                if (targetOrc && !targetOrc.isDead && targetOrc.hp > 0) {
                  const oStats = getOrcCombatStats(targetOrc);
                  const takenDmg = Math.max(12, Math.round(pr.dmg - oStats.def * 0.22));
                  targetOrc.hp = Math.max(0, targetOrc.hp - takenDmg);
                  this.spawnDamagePopup(targetOrc.x, targetOrc.y - 10, takenDmg, false, '#fca5a5');
                  if (targetOrc.hp <= 0) {
                    killOrcUnit(targetOrc);
                  }
                }
                this.projectiles.splice(i, 1);
                continue;
              }
              // 원거리 몬스터(숲 고블린궁수 / 보스) 투사체가 헌터에게 적중
              const targetHunter = pr.target;
              if ((targetHunter.state === 'HUNTING_FIELD' || targetHunter.state === 'BOSS_RAID' || targetHunter.state === 'REBIRTH_ALTAR_HUNT') && targetHunter.hp > 0) {
                const stats = targetHunter.getComputedStats();
                const takenDmg = Math.max(10, Math.round(pr.dmg - stats.def * 0.28));
                targetHunter.hp = Math.max(0, targetHunter.hp - takenDmg);
                this.spawnDamagePopup(targetHunter.x, targetHunter.y, takenDmg, false, '#fca5a5');
                if (targetHunter.hp <= 0 && targetHunter.state === 'BOSS_RAID') {
                  targetHunter.hp = Math.round(targetHunter.maxHp * 0.25);
                  targetHunter.x = 0;
                  targetHunter.y = 20;
                  targetHunter.waypoints = [];
                  targetHunter.state = 'IDLE';
                  BOSS_SANCTUM.fallenHunterIds.add(targetHunter.id);
                  interactionManager.spawnBubble(targetHunter, '💫 보스전 부상 후퇴!', '#fca5a5');
                } else if (targetHunter.hp <= 0) {
                  targetHunter.hp = 1;
                }
              }
            } else if (pr.isGuardCounterProj) {
              this.spawnDamagePopup(pr.target.x, pr.target.y - 8, pr.dmg, pr.isCrit, '#fda4af');
            } else if (pr.isPvpTarget) {
              this.applyHitToHunterPvP(pr.attacker, pr.target, pr.dmg, pr.isCrit);
              if (pr.projType === 'MAGIC_ORB') {
                this.slashes.push({
                  x: pr.target.x,
                  y: pr.target.y - 2,
                  facing: 1,
                  slashType: 'MAGIC_BURST',
                  color: '#fb7185',
                  life: 0.25,
                  maxLife: 0.25
                });
              }
            } else if (pr.isRebirthAltarTarget) {
              this.applyHitToRebirthAltarBoss(pr.attacker, pr.target, pr.dmg, pr.isCrit);
              if (pr.projType === 'MAGIC_ORB') {
                this.slashes.push({
                  x: pr.target.x,
                  y: pr.target.y - 2,
                  facing: 1,
                  slashType: 'MAGIC_BURST',
                  color: '#f472b6',
                  life: 0.25,
                  maxLife: 0.25
                });
              }
            } else if (pr.isBossTarget) {
              this.applyHitToBoss(pr.attacker, pr.target, pr.dmg, pr.isCrit);
              if (pr.projType === 'MAGIC_ORB') {
                this.slashes.push({
                  x: pr.target.x,
                  y: pr.target.y - 2,
                  facing: 1,
                  slashType: 'MAGIC_BURST',
                  color: '#d8b4fe',
                  life: 0.25,
                  maxLife: 0.25
                });
              }
            } else {
              this.applyHitToMonster(pr.attacker, pr.target, pr.ground, pr.dmg, pr.isCrit);
              // 마법 구체 명중 시 작은 마력 폭발 링 추가
              if (pr.projType === 'MAGIC_ORB') {
                this.slashes.push({
                  x: pr.target.x,
                  y: pr.target.y - 2,
                  facing: 1,
                  slashType: 'MAGIC_BURST',
                  color: '#d8b4fe',
                  life: 0.25,
                  maxLife: 0.25
                });
              }
            }
            this.projectiles.splice(i, 1);
          } else {
            pr.x += (dx / dist) * step;
            pr.y += (dy / dist) * step;
            pr.angle = Math.atan2(dy, dx);
          }
        }

        for (let i = this.slashes.length - 1; i >= 0; i--) {
          this.slashes[i].life -= dt;
          if (this.slashes[i].life <= 0) this.slashes.splice(i, 1);
        }

        for (let i = this.popups.length - 1; i >= 0; i--) {
          const pop = this.popups[i];
          pop.y -= 24 * dt;
          pop.life -= dt;
          if (pop.life <= 0) this.popups.splice(i, 1);
        }
      },

      applyHitToRebirthAltarBoss(hunter, altarBoss, dmg, isCrit) {
        if (!altarBoss || altarBoss.hp <= 0) return;
        const effectiveDmg = Math.max(10, Math.round(dmg - (altarBoss.def || 180) * 0.45));
        altarBoss.hp = Math.max(0, altarBoss.hp - effectiveDmg);
        this.spawnDamagePopup(altarBoss.x, altarBoss.y - 14, effectiveDmg, isCrit, isCrit ? '#fde047' : '#f472b6');

        if (altarBoss.hp <= 0) {
          altarBoss.hp = 0;
          altarBoss.respawn = REBIRTH_ALTAR.respawnDelay;
          const p = getEffectivePersonalityProfile(hunter.personality, hunter.rebirthCount);
          const hunterGoldGain = Math.round((altarBoss.rewardHunterGold || 8500) * (p.personalGoldMult || 1));
          const villageGoldGain = altarBoss.rewardVillageGold || 12000;
          const expGain = altarBoss.rewardExp || 4800;
          const astralGain = (altarBoss.rewardAstralCount || 4) + (p.extraMat || 0);

          hunter.personalGold += hunterGoldGain;
          gameState.gold += villageGoldGain;
          if (hunter.inventory) {
            hunter.inventory.addItem('loot_top_astral', astralGain);
            const insId = altarBoss.insigniaId || 'insignia_rebirth_supreme';
            const insDef = ITEM_CATALOG[insId];
            const alreadyOwnedIns = insDef ? hunter.inventory.getCount(insId) >= 1 : true;
            if (insDef && !alreadyOwnedIns) {
              hunter.inventory.addItem(insId, 1);
            }
            hunter.syncAutoEquipInsignia();
          }

          hunter.gainExp(expGain);
          const pasIdx = Math.floor(Math.random() * Math.max(1, hunter.skills.passives.length));
          hunter.recordSkillUse('passives', pasIdx);

          hunter.currentTargetMonster = null;
          hunter.targetBuildingName = '';
          hunter.targetBuildingType = '';
          hunter.state = 'IDLE';
          hunter.stateTimer = 0.6;

          updateResourceHUD();
          refreshHunterPanel();
          interactionManager.spawnBubble(hunter, `✨ 초월 집행자 처치! +${formatGold(hunterGoldGain)}G`, '#f0abfc');
          const insToastSuffix = (hunter.inventory && hunter.inventory.getCount('insignia_rebirth_supreme') === 1)
            ? ' · ✨초월 윤회의 인장(+150% 피해) 보유'
            : '';
          showToast(`✨ '${hunter.name}' [리치 킹] 토벌! +${formatGold(hunterGoldGain)}G · 💠별결정 ${astralGain}개${insToastSuffix}!`);
        }
      },

      applyHitToBoss(hunter, boss, dmg, isCrit) {
        if (!boss || boss.hp <= 0 || BOSS_SANCTUM.status !== 'ACTIVE') return;
        // 보스 방어력 감산 적용 (저레벨·저강화 헌터는 유효 피해가 급감해 공략 불가)
        const effectiveDmg = Math.max(1, Math.round(dmg - (boss.def || 155)));
        boss.hp = Math.max(0, boss.hp - effectiveDmg);
        this.spawnDamagePopup(boss.x, boss.y - 16, effectiveDmg, isCrit, isCrit ? '#fde047' : '#fda4af');

        if (boss.hp <= 0) {
          // 보스 토벌 성공! 현재 난이도 보상 지급 후 다음 난이도 보스(T1 +3강 -> T2 +4강 ... -> T10 +12강)로 진화
          const clearedCfg = getBossStageConfig(BOSS_SANCTUM.bossStage);
          const hasNextStage = BOSS_SANCTUM.bossStage < BOSS_SANCTUM.maxBossStage;
          if (hasNextStage) {
            BOSS_SANCTUM.bossStage += 1;
          } else {
            BOSS_SANCTUM.allStagesCleared = true;
          }
          const nextCfg = getBossStageConfig(BOSS_SANCTUM.bossStage);

          BOSS_SANCTUM.status = 'CLOSED';
          BOSS_SANCTUM.prepTimer = 0;
          BOSS_SANCTUM.fallenHunterIds.clear();
          resetBossSanctumMonster();
          syncOrcStrongholdPopulation(true);
          updateBossRaidHudButton();

          gameState.gold += clearedCfg.rewardVillageGold;
          updateResourceHUD();
          hunters.forEach((h) => {
            h.personalGold += clearedCfg.rewardHunterGold;
            if (clearedCfg.rewardMats > 0) {
              h.inventory.addItem('boss_guardian_core', clearedCfg.rewardMats);
            }
            h.gainExp(clearedCfg.rewardExp);
            const pasIdx = Math.floor(Math.random() * Math.max(1, h.skills.passives.length));
            h.recordSkillUse('passives', pasIdx);
            h.currentTargetMonster = null;
            h.state = 'IDLE';
            h.stateTimer = 0.5;
            interactionManager.spawnBubble(h, `🏆 T${clearedCfg.stage} 보스 토벌 성공!`, '#fde047');
          });
          const regularCountAfter = ORC_STRONGHOLD_ZONE.orcs.filter(o => o && !o.isGreatWarrior).length;
          const nextMsg = hasNextStage
            ? `건물 Lv.${clearedCfg.stage + 1} 해금 개방 · 오크 군락지 병력 ${regularCountAfter}/${ORC_STRONGHOLD_ZONE.maxCount}마리로 증원 · 다음 보스 [${nextCfg.fullName}] 출현!`
            : `최종 T10 보스 제패 달성 · 오크 야영지 본진 앞에 [👑 오크 대전사] 출현! (주둔 ${regularCountAfter}/${ORC_STRONGHOLD_ZONE.maxCount}마리)`;
          showToast(`🎉 T${clearedCfg.stage} 보스 토벌 (+${formatGold(clearedCfg.rewardVillageGold)}G)! ${nextMsg}`);
        }
      },

      draw(ctx) {
        // 1. 근접 참격 / 성광 찌르기 / 마력 폭발 이펙트
        this.slashes.forEach((sl) => {
          const prog = 1 - (sl.life / sl.maxLife);
          const alpha = Math.max(0, 1 - prog);
          ctx.save();
          ctx.translate(sl.x, sl.y);
          ctx.globalAlpha = alpha;

          if (sl.slashType === 'MAGIC_BURST') {
            ctx.strokeStyle = sl.color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 6 + prog * 18, 0, Math.PI * 2);
            ctx.stroke();
          } else if (sl.slashType === 'HOLY') {
            // 팔라딘 성광 찌르기 파동
            ctx.strokeStyle = sl.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-sl.facing * 6, 0);
            ctx.lineTo(sl.facing * (16 + prog * 14), 0);
            ctx.moveTo(sl.facing * (8 + prog * 10), -9);
            ctx.lineTo(sl.facing * (8 + prog * 10), 9);
            ctx.stroke();
          } else {
            // 버서커 부채꼴 참격 궤적
            ctx.strokeStyle = sl.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            const startAng = sl.facing > 0 ? -Math.PI * 0.45 : Math.PI * 0.55;
            const endAng = sl.facing > 0 ? Math.PI * 0.45 : Math.PI * 1.45;
            ctx.arc(0, 0, 18 + prog * 6, startAng, endAng);
            ctx.stroke();
          }
          ctx.restore();
        });

        // 2. 원거리 투사체 (레인저 화살 / 고블린 독화살 / 소서러 마력 구체)
        this.projectiles.forEach((pr) => {
          ctx.save();
          ctx.translate(pr.x, pr.y);
          if (pr.projType === 'ARROW' || pr.projType === 'GOBLIN_ARROW') {
            ctx.rotate(pr.angle || 0);
            ctx.strokeStyle = pr.projType === 'GOBLIN_ARROW' ? '#bef264' : '#fef3c7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-9, 0);
            ctx.lineTo(7, 0);
            ctx.stroke();
            ctx.fillStyle = pr.color;
            ctx.beginPath();
            ctx.moveTo(11, 0);
            ctx.lineTo(6, -3);
            ctx.lineTo(6, 3);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillStyle = pr.color;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        });

        // 3. 타격 데미지 팝업
        this.popups.forEach((pop) => {
          const alpha = Math.min(1, pop.life / 0.25);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.font = pop.isCrit ? 'bold 12px sans-serif' : 'bold 10.5px sans-serif';
          ctx.fillStyle = pop.color;
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.lineWidth = 2.5;
          ctx.textAlign = 'center';
          ctx.strokeText(pop.text, pop.x, pop.y);
          ctx.fillText(pop.text, pop.x, pop.y);
          ctx.restore();
        });
      }
    };

    /**
     * ============================================================================
     * 메인 게임 루프
     * ============================================================================
     */
    updateResourceHUD();
    updateBossRaidHudButton();
    syncDonationKeypadButtons();
