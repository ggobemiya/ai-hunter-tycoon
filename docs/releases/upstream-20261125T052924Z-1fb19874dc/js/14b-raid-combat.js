    // ==========================================
    // [오크 토벌전 전투 행동] - 타겟 선택 · 경비병 피해/전사 · 패배 판정 · 숲 정리
    // 진형 모양/자리 계산은 14a-raid-formation.js
    //
    // 대규모 전투(200 vs 200 이상)를 위해 매 프레임 한 번만 만드는 공용 목록을 사용한다.
    //   f.hunterSideTargets : 오크가 노릴 수 있는 헌터 + 경비병
    //   f.orcTargets        : 토벌군이 노릴 수 있는 오크
    // ==========================================

    // 경비병이 토벌전 전장에서 싸우는 중인지
    function isRaidGuardFighting(g) {
      return Boolean(
        g && g.raidActive && !g.raidFallen && g.hp > 0 &&
        !(Array.isArray(g.raidPath) && g.raidPath.length > 0)
      );
    }

    function getRaidFightingHunters() {
      return hunters.filter(h =>
        h && h.hp > 0 &&
        h.state === 'ORC_SUBJUGATION_RAID' &&
        !ORC_SUBJUGATION.fallenHunterIds.has(h.id) &&
        !(h.waypoints && h.waypoints.length > 1)
      );
    }

    function refreshRaidCombatCaches(f) {
      const list = getRaidFightingHunters();
      if (isRaidGuardFighting(SUPREME_TOWN_GUARD)) list.push(SUPREME_TOWN_GUARD);
      if (isRaidGuardFighting(ARCANE_TOWN_GUARD)) list.push(ARCANE_TOWN_GUARD);
      f.hunterSideTargets = list;
      f.orcTargets = (ORC_STRONGHOLD_ZONE.orcs || []).filter(
        o => o && !o.isDead && o.hp > 0 && o.x <= 2245
      );
    }

    // 오크가 노릴 수 있는 토벌군 (헌터 + 경비병)
    function getRaidHunterSideTargets() {
      const f = getRaidFormation();
      return f ? f.hunterSideTargets : [];
    }

    // 토벌군이 노릴 수 있는 오크
    function getRaidOrcTargets() {
      const f = getRaidFormation();
      return f ? f.orcTargets : [];
    }

    function getRaidLivingOrcs() {
      return (ORC_STRONGHOLD_ZONE.orcs || []).filter(o => o && !o.isDead && o.hp > 0);
    }

    // 진형 안에서 이번 프레임에 할 행동: { target, goalX, goalY }
    // target 이 있고 사거리 안이면 공격, 아니면 goal 로 이동
    // 프레임 도중 쓰러진 유닛은 공용 목록에 남아 있어도 건너뜀
    function isRaidEnemyValid(e) {
      if (!e || e.hp <= 0 || e.isDead || e.raidFallen) return false;
      if (e.id !== undefined && ORC_SUBJUGATION.fallenHunterIds.has(e.id)) return false;
      return true;
    }

    function getRaidFormationOrder(unit, slot, enemies, range, isRanged) {
      const cfg = RAID_FORMATION_CFG;
      let target = null;
      if (slot.released) {
        // 양쪽 1열이 맞붙은 뒤에는 진형을 풀고 전원이 가장 가까운 적을 공격 (오크 로드 포함)
        let best = Infinity;
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (!isRaidEnemyValid(e)) continue;
          const d = Math.hypot(e.x - unit.x, e.y - unit.y);
          if (d < best) { best = d; target = e; }
        }
        if (target) return { target, goalX: target.x, goalY: target.y };
        return { target: null, goalX: slot.x, goalY: slot.y };
      }
      if (isRanged) {
        // 원거리: 자리를 지키며 사거리 안 적을 쏜다. 닿지 않으면 자리에서 조금만 앞으로
        let best = Infinity;
        let nearest = null;
        let nearestD = Infinity;
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (!isRaidEnemyValid(e)) continue;
          const d = Math.hypot(e.x - unit.x, e.y - unit.y);
          if (d <= range && d < best) { best = d; target = e; }
          const ds = Math.hypot(e.x - slot.x, e.y - slot.y);
          if (ds < nearestD) { nearestD = ds; nearest = e; }
        }
        if (target || !nearest) return { target, goalX: slot.x, goalY: slot.y };
        const adv = Math.min(cfg.rangedStepMax, Math.max(0, nearestD - range * 0.9));
        return {
          target: null,
          goalX: slot.x + ((nearest.x - slot.x) / nearestD) * adv,
          goalY: slot.y + ((nearest.y - slot.y) / nearestD) * adv
        };
      }
      const leash = range + (slot.canCharge === false ? cfg.holdLeash : cfg.meleeLeash);
      let best = Infinity;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!isRaidEnemyValid(e)) continue;
        const dSlot = Math.hypot(e.x - slot.x, e.y - slot.y);
        if (dSlot > leash) continue;
        const d = Math.hypot(e.x - unit.x, e.y - unit.y);
        if (d < best) { best = d; target = e; }
      }
      if (target) return { target, goalX: target.x, goalY: target.y };
      return { target: null, goalX: slot.x, goalY: slot.y };
    }

    // 토벌전에 아직 남아있는 헌터 + 경비병 수
    function getRaidRemainingFighters() {
      let count = 0;
      for (let i = 0; i < hunters.length; i++) {
        const h = hunters[i];
        if (h && h.hp > 0 && !ORC_SUBJUGATION.fallenHunterIds.has(h.id)) count++;
      }
      if (!SUPREME_TOWN_GUARD.raidFallen) count++;
      if (!ARCANE_TOWN_GUARD.raidFallen) count++;
      return count;
    }

    // 패배 조건: 참가 헌터와 경비병이 모두 전사
    function checkRaidDefeat() {
      if (ORC_SUBJUGATION.status !== 'ACTIVE') return false;
      if (getRaidRemainingFighters() > 0) return false;
      endOrcSubjugationRaid(false, '참가 헌터·경비병 전원 전사');
      return true;
    }

    // 오크 공격이 경비병에게 명중
    function damageRaidGuard(guard, dmg, isCrit, color, killerName) {
      if (!guard || guard.raidFallen || guard.hp <= 0) return;
      const taken = Math.max(15, Math.round(dmg));
      guard.hp = Math.max(0, guard.hp - taken);
      combatEffects.spawnDamagePopup(guard.x, guard.y, taken, isCrit, color || '#fb7185');
      if (guard.hp > 0) return;
      guard.hp = 0;
      guard.raidFallen = true;
      guard.raidTargetOrc = null;
      guard.raidPath = [];
      guard.x = guard.homeX;
      guard.y = guard.homeY;
      combatEffects.spawnDamagePopup(guard.x, guard.y - 30, `💀 ${guard.name} 전사 (${killerName || '오크 군단'})`, true, '#fca5a5');
      showToast(`💀 ${guard.name}이(가) 오크 토벌전에서 전사했습니다! (${killerName || '오크 군단'})`);
      checkRaidDefeat();
    }

    // 토벌 종료 후 경비병 상태 복구 (전사 해제 · 체력 회복)
    function restoreRaidGuard(guard) {
      if (!guard) return;
      if (guard.raidFallen || guard.hp <= 0) {
        guard.raidFallen = false;
        guard.hp = guard.maxHp;
      }
    }

    // 소집 시작 시 오크의 숲 일반 몬스터 제거 (토벌 종료 후 평소처럼 다시 등장)
    function clearOrcForestMonstersForRaid() {
      const topGround = HUNTING_GROUNDS.find(g => g.id === 'top_field_70_99');
      if (!topGround || !Array.isArray(topGround.monsters)) return;
      topGround.monsters.forEach(m => {
        if (!m || m.hp <= 0) return;
        m.hp = 0;
        m.provoked = false;
        m.aggroTargetId = null;
        m.respawn = 0;
      });
      hunters.forEach(h => {
        if (h && h.currentTargetMonster && topGround.monsters.includes(h.currentTargetMonster)) {
          h.currentTargetMonster = null;
        }
      });
      (ORC_STRONGHOLD_ZONE.orcs || []).forEach(o => {
        if (o && o.currentTarget && topGround.monsters.includes(o.currentTarget)) o.currentTarget = null;
      });
    }
