    // ==========================================
    // [오크 토벌전 진형 배치] - 진형 모양/자리 계산 전용
    // 전투 행동(타겟·피해·패배 판정)은 14b-raid-combat.js
    //
    // 토벌군 (서쪽, 동쪽을 바라봄)
    //   선봉: 🛡️ 창세 수호대장 (헌터 1열보다 훨씬 앞)
    //   1열: 팔라딘 · 버서커 (근접)
    //   2열: 레인저 · 소서러 · 🔮 아크메이지 수호자 (원거리)
    // 오크군 (동쪽, 서쪽을 바라봄)
    //   (대전사 있을 때) 1열 👑 오크 대전사 → 2열 근접 → 3열 원거리 → 4열 오크 로드
    //   (대전사 없을 때) 1열 근접 → 2열 원거리 → 3열 오크 로드
    //   오크 로드는 맨 뒤, 수호대장-헌터 간격의 절반만큼 떨어져 지휘
    //
    // 대규모 토벌전(200 vs 200 이상)을 고려해 인원이 많으면 열을 여러 줄로 나누고
    // 위아래 간격을 자동으로 좁혀 오크의 숲 안에 들어가도록 배치한다.
    // ==========================================
    const RAID_FORMATION_CFG = {
      muster: {            // 소집 대기 진형 (오크의 숲 입구 앞, 촘촘하게)
        rowSpacing: 20,    // 같은 줄 위아래 간격
        subColGap: 14,     // 한 열이 여러 줄일 때 줄 사이 간격
        rankGap: 30,       // 열과 열 사이 간격
        leadGap: 34,       // 선봉과 1열 사이 간격
        usableHeight: 300, // 한 줄이 차지할 수 있는 최대 높이
        maxColumnsPerRank: 6
      },
      battle: {            // 오크의 숲 전투 진형 (넓게, 열 구분이 뚜렷하게)
        rowSpacing: 40,
        subColGap: 28,
        rankGap: 72,
        leadGap: 130,      // 창세 수호대장이 헌터 1열보다 앞서는 거리
        usableHeight: 520,
        maxColumnsPerRank: 6
      },
      lordGapRatio: 0.5,   // 오크 로드 간격 = 수호대장-헌터 간격 × 0.5
      maxRowsPerColumn: 14,
      musterFrontX: 1380,  // 소집 대기 시 토벌군 맨 앞 위치
      musterY: 18,
      forestMinX: 1450,    // 오크의 숲 안쪽 서쪽 끝 (진형 뒤꽁무니 한계)
      forestMaxX: 2178,    // 오크의 숲 안쪽 동쪽 끝
      hunterStartFrontX: 1690, // 전투 개시 후 수호대장 첫 위치
      orcStartFrontX: 1950,    // 오크 1열 첫 위치 (진형이 깊으면 자동으로 앞당김)
      battleY: 0,
      orcStagingSeconds: 30,  // 소집 30초 동안 오크군 선집결
      formUpSeconds: 5,       // 전투 개시 후 진형을 맞추는 시간
      hunterAdvanceSpeed: 42, // 토벌군 진형 전진 속도
      orcAdvanceSpeed: 24,    // 오크군 진형 전진 속도
      hunterMoveMult: 1.4,    // 헌터가 자기 자리로 걷는 속도 배율
      clashGap: 30,           // 양쪽 1열이 이 거리까지 다가오면 멈춤
      meleeLeash: 70,         // 돌격 허가된 근접 유닛이 자리에서 벗어나 싸울 수 있는 거리
      holdLeash: 10,          // 돌격 대기 중인 근접 유닛은 바로 앞까지 온 적만 상대
      secondWaveDelay: 6,     // 1열끼리 맞붙고 이 시간이 지나면 뒷열 근접 유닛도 돌격
      rangedStepMax: 50       // 원거리 유닛이 사거리를 맞추려 자리에서 앞으로 나올 수 있는 거리
    };

    function isRaidGuard(unit) {
      return unit === SUPREME_TOWN_GUARD || unit === ARCANE_TOWN_GUARD;
    }

    function getRaidHunterRank(unit) {
      if (unit === SUPREME_TOWN_GUARD) return 0;
      if (unit === ARCANE_TOWN_GUARD) return 2;
      const job = unit.baseJob || unit.job;
      if (job === '레인저' || job === '소서러') return 2;
      return 1; // 팔라딘 · 버서커
    }

    function getRaidOrcRole(orc) {
      if (isOrcLordUnit(orc)) return 'lord';
      if (orc.isGreatWarrior || orc.role === '오크 대전사') return 'gw';
      if (orc.role === '토템 주술진' || orc.name === '오크 혈투주술사') return 'ranged';
      return 'melee';
    }

    // ranks: 열별 유닛 배열, gaps[r]: r번째 열 앞 간격, dir=+1 이면 동쪽을 바라봄
    // 반환: { slots: Map(unit → {dx, dy, rank}), rankDx[], depth }
    function layoutRaidRanks(ranks, gaps, dir, spec) {
      const cfg = RAID_FORMATION_CFG;
      const slots = new Map();
      const rankDx = [];
      let cursor = 0;
      for (let r = 0; r < ranks.length; r++) {
        const list = ranks[r];
        if (r > 0) cursor += gaps[r] || spec.rankGap;
        rankDx[r] = -dir * cursor;
        const n = list.length;
        if (n === 0) continue;
        let cols = Math.max(1, Math.ceil(n / cfg.maxRowsPerColumn));
        cols = Math.min(cols, spec.maxColumnsPerRank);
        const perCol = Math.ceil(n / cols);
        const spacing = perCol > 1
          ? Math.min(spec.rowSpacing, spec.usableHeight / (perCol - 1))
          : spec.rowSpacing;
        for (let i = 0; i < n; i++) {
          const col = Math.floor(i / perCol);
          const rowIdx = i % perCol;
          const inCol = Math.min(perCol, n - col * perCol);
          // 뒷줄은 반 칸 엇갈리게 세워 겹쳐 보이지 않도록
          const stagger = (col % 2) * spacing * 0.5 * (inCol < perCol ? 0 : 1);
          slots.set(list[i], {
            dx: -dir * (cursor + col * spec.subColGap),
            dy: (rowIdx - (inCol - 1) / 2) * spacing + stagger,
            rank: r
          });
        }
        cursor += (Math.ceil(n / perCol) - 1) * spec.subColGap;
      }
      return { slots, rankDx, depth: cursor };
    }

    function getRaidHunterSideUnits() {
      const list = hunters.filter(
        h => h && h.hp > 0 && !ORC_SUBJUGATION.fallenHunterIds.has(h.id)
      );
      const guards = [SUPREME_TOWN_GUARD, ARCANE_TOWN_GUARD].filter(g => !g.raidFallen);
      return [...guards, ...list];
    }

    function buildRaidHunterLayout(isBattle) {
      const spec = isBattle ? RAID_FORMATION_CFG.battle : RAID_FORMATION_CFG.muster;
      const ranks = [[], [], []];
      const units = getRaidHunterSideUnits();
      // 같은 열 안에서는 직업별로 묶어서 정렬
      units.sort((a, b) => {
        const ja = a.baseJob || '';
        const jb = b.baseJob || '';
        if (ja !== jb) return ja < jb ? -1 : 1;
        return String(a.id || '').localeCompare(String(b.id || ''));
      });
      units.forEach(u => ranks[getRaidHunterRank(u)].push(u));
      // 아크메이지 수호자는 원거리 열 첫 줄 한가운데
      const back = ranks[2];
      const amIdx = back.indexOf(ARCANE_TOWN_GUARD);
      if (amIdx >= 0) {
        back.splice(amIdx, 1);
        const firstCol = Math.min(back.length + 1, RAID_FORMATION_CFG.maxRowsPerColumn);
        back.splice(Math.floor((firstCol - 1) / 2), 0, ARCANE_TOWN_GUARD);
      }
      const layout = layoutRaidRanks(ranks, [0, spec.leadGap, spec.rankGap], 1, spec);
      layout.commanderRank = -1;
      return layout;
    }

    function buildRaidOrcLayout() {
      const spec = RAID_FORMATION_CFG.battle;
      const groups = { gw: [], melee: [], ranged: [], lord: [] };
      (ORC_STRONGHOLD_ZONE.orcs || []).forEach(o => {
        if (o && !o.isDead && o.hp > 0) groups[getRaidOrcRole(o)].push(o);
      });
      const ranks = [];
      const gaps = [];
      ['gw', 'melee', 'ranged'].forEach(key => {
        if (groups[key].length === 0) return;
        ranks.push(groups[key]);
        gaps.push(spec.rankGap);
      });
      let commanderRank = -1;
      if (groups.lord.length > 0) {
        commanderRank = ranks.length;
        ranks.push(groups.lord);
        gaps.push(ranks.length > 1 ? spec.leadGap * RAID_FORMATION_CFG.lordGapRatio : 0);
      }
      const layout = layoutRaidRanks(ranks, gaps, -1, spec);
      layout.commanderRank = commanderRank;
      return layout;
    }

    function getRaidOrcStartFrontX(orcLayout) {
      const cfg = RAID_FORMATION_CFG;
      return Math.max(cfg.forestMinX + 220, Math.min(cfg.orcStartFrontX, cfg.forestMaxX - orcLayout.depth));
    }

    function getRaidHunterStartFrontX(hunterLayout) {
      const cfg = RAID_FORMATION_CFG;
      return Math.min(cfg.forestMaxX - 220, Math.max(cfg.hunterStartFrontX, cfg.forestMinX + hunterLayout.depth));
    }

    // 소집 마지막 30초: 오크군이 먼저 오크의 숲에 나와 진형을 짜는 구간
    function isRaidOrcStaging() {
      return ORC_SUBJUGATION.status === 'PREPARING' &&
        (ORC_SUBJUGATION.prepTimer || 0) <= RAID_FORMATION_CFG.orcStagingSeconds;
    }

    function getRaidFormation() {
      return ORC_SUBJUGATION.formation || null;
    }

    function resetRaidBattleFormation(f) {
      const cfg = RAID_FORMATION_CFG;
      f.phase = 'BATTLE';
      f.hunterLayout = buildRaidHunterLayout(true);
      f.orcLayout = buildRaidOrcLayout();
      f.hunterAnchorX = getRaidHunterStartFrontX(f.hunterLayout);
      f.hunterAnchorY = cfg.battleY;
      f.orcAnchorX = getRaidOrcStartFrontX(f.orcLayout);
      f.orcAnchorY = cfg.battleY;
      f.orcFrontX = f.orcAnchorX;
      f.formTimer = cfg.formUpSeconds;
      f.clashElapsed = 0;
      f.released = false;
    }

    function ensureRaidFormation() {
      const cfg = RAID_FORMATION_CFG;
      if (!ORC_SUBJUGATION.formation) {
        const orcLayout = buildRaidOrcLayout();
        const orcX = getRaidOrcStartFrontX(orcLayout);
        ORC_SUBJUGATION.formation = {
          phase: 'MUSTER',
          musterLayout: buildRaidHunterLayout(false),
          hunterLayout: buildRaidHunterLayout(true),
          orcLayout,
          hunterAnchorX: cfg.hunterStartFrontX,
          hunterAnchorY: cfg.battleY,
          orcAnchorX: orcX,
          orcAnchorY: cfg.battleY,
          orcFrontX: orcX,
          formTimer: 0,
          clashElapsed: 0,
          hunterFrontRank: 1,
          orcFrontRank: 0,
          hunterSideTargets: [],
          orcTargets: []
        };
      }
      const f = ORC_SUBJUGATION.formation;
      if (ORC_SUBJUGATION.status === 'ACTIVE' && f.phase !== 'BATTLE') {
        resetRaidBattleFormation(f);
      }
      return f;
    }

    // 가장 앞쪽에 살아있는 열 번호 (없으면 null)
    function getRaidFrontRank(layout, isAlive) {
      let best = null;
      layout.slots.forEach((s, unit) => {
        if (!isAlive(unit)) return;
        if (best === null || s.rank < best) best = s.rank;
      });
      return best;
    }

    function isRaidHunterAlive(u) {
      return u && u.hp > 0 && !ORC_SUBJUGATION.fallenHunterIds.has(u.id);
    }

    function isRaidOrcAlive(o) {
      return o && !o.isDead && o.hp > 0;
    }

    // 근접 유닛 돌격 허가: 맨 앞 열은 바로, 뒷열은 1열끼리 맞붙고 일정 시간 뒤 (지휘관 열은 제외)
    function canRaidRankCharge(f, rank, frontRank, commanderRank) {
      if (rank <= frontRank) return true;
      if (rank === commanderRank) return false;
      return (f.clashElapsed || 0) >= RAID_FORMATION_CFG.secondWaveDelay;
    }

    function getRaidHunterSlot(unit) {
      const f = ensureRaidFormation();
      let s = f.hunterLayout.slots.get(unit);
      if (!s) {
        // 새로 합류한 유닛이 있으면 진형을 다시 짠다
        f.hunterLayout = buildRaidHunterLayout(true);
        s = f.hunterLayout.slots.get(unit);
      }
      if (!s) return { x: f.hunterAnchorX, y: f.hunterAnchorY, rank: 1, canCharge: true };
      let x = f.hunterAnchorX + s.dx;
      // 선봉(수호대장)은 오크 1열을 넘어서 서지 않음
      if (s.rank === 0) x = Math.min(x, (f.orcFrontX || x) - 10);
      return {
        x,
        y: f.hunterAnchorY + s.dy,
        rank: s.rank,
        canCharge: s.rank === 0 || canRaidRankCharge(f, s.rank, f.hunterFrontRank, -1),
        released: Boolean(f.released)
      };
    }

    function getRaidOrcSlot(orc) {
      const f = ensureRaidFormation();
      let s = f.orcLayout.slots.get(orc);
      if (!s) {
        f.orcLayout = buildRaidOrcLayout();
        s = f.orcLayout.slots.get(orc);
      }
      if (!s) return { x: f.orcAnchorX, y: f.orcAnchorY, rank: 0, canCharge: true };
      return {
        x: f.orcAnchorX + s.dx,
        y: f.orcAnchorY + s.dy,
        rank: s.rank,
        canCharge: canRaidRankCharge(f, s.rank, f.orcFrontRank, f.orcLayout.commanderRank),
        released: Boolean(f.released)
      };
    }

    // 소집 대기지(오크의 숲 입구 앞) 자리 (촘촘한 대기 진형)
    function getRaidMusterPosition(unit) {
      const f = ensureRaidFormation();
      let s = f.musterLayout.slots.get(unit);
      if (!s) {
        f.musterLayout = buildRaidHunterLayout(false);
        s = f.musterLayout.slots.get(unit);
      }
      const dx = s ? s.dx : -RAID_FORMATION_CFG.muster.rankGap;
      const dy = s ? s.dy : 0;
      return { x: RAID_FORMATION_CFG.musterFrontX + dx, y: RAID_FORMATION_CFG.musterY + dy };
    }

    // 매 프레임 진형 기준점과 공용 목록을 갱신 (게임 루프에서 유닛 업데이트 전에 호출)
    function updateRaidFormation(dt) {
      if (ORC_SUBJUGATION.status === 'CLOSED') {
        ORC_SUBJUGATION.formation = null;
        return;
      }
      const f = ensureRaidFormation();
      refreshRaidCombatCaches(f);
      if (ORC_SUBJUGATION.status === 'PREPARING') {
        f.phase = 'MUSTER';
        return;
      }
      // ACTIVE
      const cfg = RAID_FORMATION_CFG;
      let hRank = getRaidFrontRank(f.hunterLayout, u => !isRaidGuard(u) && isRaidHunterAlive(u));
      if (hRank === null) {
        // 헌터가 모두 쓰러지면 남은 경비병 위치를 토벌군 전열로 본다
        hRank = getRaidFrontRank(f.hunterLayout, u => isRaidGuard(u) && !u.raidFallen && u.hp > 0);
      }
      const oRank = getRaidFrontRank(f.orcLayout, isRaidOrcAlive);
      f.hunterFrontRank = hRank === null ? 1 : hRank;
      f.orcFrontRank = oRank === null ? 0 : oRank;
      const hFront = f.hunterAnchorX + (hRank === null ? 0 : f.hunterLayout.rankDx[hRank]);
      const oFront = f.orcAnchorX + (oRank === null ? 0 : f.orcLayout.rankDx[oRank]);
      f.orcFrontX = oFront;
      if (f.formTimer > 0) {
        f.formTimer = Math.max(0, f.formTimer - dt);
        return;
      }
      const gap = oFront - hFront;
      if (gap > cfg.clashGap) {
        const total = cfg.hunterAdvanceSpeed + cfg.orcAdvanceSpeed;
        const close = Math.min(total * dt, gap - cfg.clashGap);
        f.hunterAnchorX = Math.min(2160, f.hunterAnchorX + close * (cfg.hunterAdvanceSpeed / total));
        f.orcAnchorX = Math.max(1600, f.orcAnchorX - close * (cfg.orcAdvanceSpeed / total));
      }
      // 1열끼리 맞붙은 시간 (뒷열 2차 돌격 타이밍)
      if (gap <= cfg.clashGap + 6) {
        f.clashElapsed = (f.clashElapsed || 0) + dt;
        // 1열끼리 맞붙는 순간 진형 해제 → 전원 자유 공격
        f.released = true;
      }
    }

    // 지정 위치로 한 프레임 이동 (도착했으면 true)
    function stepRaidUnitToward(unit, gx, gy, speed, dt, faceDir) {
      const dx = gx - unit.x;
      const dy = gy - unit.y;
      const d = Math.hypot(dx, dy);
      if (d <= 3) {
        unit.facing = faceDir;
        return true;
      }
      const step = Math.min(d, speed * dt);
      unit.x += (dx / d) * step;
      unit.y += (dy / d) * step;
      if (Math.abs(dx) > 0.5) unit.facing = dx >= 0 ? 1 : -1;
      unit.walkCycle = (unit.walkCycle || 0) + dt * 12;
      return false;
    }
