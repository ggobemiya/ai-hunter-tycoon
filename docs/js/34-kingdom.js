// [34-kingdom] 👑 왕국 성 (마을 서쪽) · 왕국 병력(황실 근위병 · 근위대장) · 연병장
    // ============================================================================
    // ■ 지도
    //   - 마을 서쪽 왕국 성: 성벽 안 1,440 × 1,920 (가로는 마을의 약 1.3배, 세로는 약 1.8배). 둘레를 물이 찬 해자가 감싼다.
    //   - 마을 큰길(y 18)에서 회색 벽돌 다리가 해자를 건너 왕국 성문으로 이어진다 (유일한 출입로).
    //     처음에는 다리 가운데가 끊겨 있고, 첫 황실 근위병을 영입하면 복구된다 (gameState.kingdom.bridgeOpen).
    //   - 헌터는 출입 금지: 마을 서쪽 끝(KINGDOM.villageEdgeX)을 넘지 못한다.
    //   - 메인 성: 왕국 가장 왼쪽의 정사각형 (13 × 13칸), 오른쪽 · 위 · 아래는 폐허 칸.
    //   - 메인 성 둘레는 도로 한 칸 크기(64 × 64)의 폐허 칸 (메인 성 자리를 뺀 나머지 모두).
    //     건물은 여러 칸을 차지한다 (KINGDOM_BUILDINGS의 cols × rows · 연병장 3 × 3칸).
    //     추후: 폐허 정리, 꾸미기 사물(도로 · 나무 · 화단 · 분수대 …)도 칸 단위로 놓을 예정.
    //   - 처음에는 성 전체가 폐허. 첫 황실 근위병을 영입하면 폐허 칸을 눌러 연병장을 지을 수 있다 (골드).
    // ■ 폐허 정리
    //   - 건물을 지으면 그 자리 칸은 자동으로 정리된다.
    //   - 칸을 눌러 [근위병에게 정리 지시] (또는 여러 칸 지시 모드). 왕국 안을 순찰하던 부대가 가까운 지시 칸으로 가서
    //     둘러서서 치운다: 한 칸 = clearMemberSec ÷ 부대 인원 (6명 40초). 다 치우면 다음 칸, 없으면 순찰로 복귀.
    //   - 저장: gameState.kingdom.cleared (정리된 칸) · clearQueue (지시한 칸)
    // ■ 왕국 병력 (헌터 · 마을 경비병과 따로 관리: gameState.kingdom.units)
    //   - 황실 근위병 · 황실 근위대장 (그 위 계급은 그림을 받으면 추가: KINGDOM_RANKS). 지금은 순찰 · 폐허 정리만 한다.
    //   - 능력치: 근위병 Lv.1 = 1환생 Lv.1 헌터, Lv.99 = 5환생 Lv.99 헌터 전투력의 2배 (KINGDOM_STAT_ANCHORS) · 계급 배율 mult.
    //   - 레벨: 최대 99, 시간에 따라 경험치를 얻어 Lv.1→99 약 10일 (KINGDOM_LEVEL_DAYS · 꺼 둔 동안은 헌터와 같은 12시간 · 80%).
    //   - 추후: 왕국군과 헌터가 함께 들어가는 사냥터.
    //   - 근위대장 1명 + 근위병 최대 5명이 한 부대. 근위대장을 맨 앞에 두고 뒤로 한 줄로 서서
    //     왕국 성 안 → 다리 → 마을을 돌며 순찰한다. (대장이 없는 근위병은 맨 앞 근위병을 따라 다님)
    //   - 영입: 토벌 포인트 상점 (지금은 '준비 중'으로 잠겨 있음 · recruitKingdomUnit()으로 연결됨)
    // ■ 저장: gameState.kingdom = { units:[...], bridgeOpen, sites:{ 기준칸id: { type, cols, rows, cells:[칸id…], builtAt } } }
    // ============================================================================
    const KINGDOM = {
      villageEdgeX: -455,            // 헌터는 이보다 서쪽으로 못 감 (다리가 시작되는 x -470 바로 앞 · 다리 · 해자 · 왕국은 출입 금지)
      // 왕국 성벽 안쪽 (큰길 y 18을 가운데로 위아래 960씩)
      inner: { x: -2100, y: -942, w: 1440, h: 1920 },
      wallThick: 24,
      moatWidth: 70,
      road: { y: 18, halfW: 32 },    // 다리 · 성 안 큰길
      gateX: -660,                   // 성문 (성벽 동쪽 면)
      // 메인 성 부지: 왕국 가장 왼쪽(서쪽 둘레 길 바로 옆)의 정사각형 (13 × 13칸 = 832 × 832), 세로는 한가운데.
      //   큰길이 성문에서 성 동쪽 정문까지 이어진다.
      castle: { x: -2052, y: -398, w: 832, h: 832 },
      // 순찰 · 둘레 길 (성벽 바로 안쪽을 한 바퀴 · 가운데 선)
      paths: { westX: -2072, eastX: -688, northY: -866, southY: 900, halfW: 18 },
      // 폐허 칸 구역 · 칸 = 도로 한 칸 크기. 메인 성 자리 칸은 빼고 만든다.
      //   n: 큰길 위 21열 × 13줄 · s: 큰길 아래 21열 × 13줄 (메인 성과 겹치는 칸은 없음)
      tile: 64,
      blocks: [
        { id: 'n', x0: -2052, y0: -846, cols: 21, rows: 13 },
        { id: 's', x0: -2052, y0: 50, cols: 21, rows: 13 }
      ],
      trainingGroundCost: 50000000,  // 연병장 건설 골드
      clearMemberSec: 240,           // 폐허 한 칸 정리 = 240초 ÷ 부대 인원 (6명 부대 40초)
      squadSize: 5,                  // 근위대장 1명이 이끄는 근위병 수
      patrolSpeed: 46,
      followGap: 24                  // 부대 안 줄 간격
    };

    // 칸 목록: id 'k_구역_줄_열' (중심 x · y, 크기 w · h). 빨리 찾도록 번호표도 만든다.
    KINGDOM.sites = [];
    KINGDOM.cellById = new Map();
    KINGDOM.cellGrid = {};
    KINGDOM.blocks.forEach((b) => {
      KINGDOM.cellGrid[b.id] = [];
      for (let r = 0; r < b.rows; r++) {
        KINGDOM.cellGrid[b.id][r] = [];
        for (let c = 0; c < b.cols; c++) {
          const cell = {
            id: `k_${b.id}_${r}_${c}`,
            block: b.id, row: r, col: c,
            x: b.x0 + c * KINGDOM.tile + KINGDOM.tile / 2,
            y: b.y0 + r * KINGDOM.tile + KINGDOM.tile / 2,
            w: KINGDOM.tile,
            h: KINGDOM.tile
          };
          const C = KINGDOM.castle; // 메인 성 자리는 칸이 아님
          if (cell.x > C.x && cell.x < C.x + C.w && cell.y > C.y && cell.y < C.y + C.h) { KINGDOM.cellGrid[b.id][r][c] = null; continue; }
          KINGDOM.sites.push(cell);
          KINGDOM.cellById.set(cell.id, cell);
          KINGDOM.cellGrid[b.id][r][c] = cell;
        }
      }
    });

    // 왕국 건물 종류 (cols × rows 칸을 차지 · 추후 추가: 기사단 · 마탑 …)
    const KINGDOM_BUILDINGS = {
      // 연병장: 가로 10 × 세로 6칸 (상 · 하 방향) · 좌 · 우로 돌리면 6 × 10칸. 그림은 js/35-parade-ground.js
      training_ground: { name: '연병장', icon: '🚩', cols: 10, rows: 6, rotatable: true, ready: true },
      knights_hall: { name: '기사단', icon: '🛡️', cols: 4, rows: 3, ready: false },
      mage_tower: { name: '마탑', icon: '🔮', cols: 3, rows: 4, ready: false }
    };

    // 방향(상 UP · 하 DOWN · 좌 LEFT · 우 RIGHT)에 따른 차지 칸 수: 좌 · 우면 가로 · 세로가 바뀐다
    const KINGDOM_DIRS = [
      { id: 'DOWN', label: '⬇️ 하' }, { id: 'UP', label: '⬆️ 상' },
      { id: 'LEFT', label: '⬅️ 좌' }, { id: 'RIGHT', label: '➡️ 우' }
    ];
    function getKingdomBuildingSize(def, dir = 'DOWN') {
      const side = def.rotatable && (dir === 'LEFT' || dir === 'RIGHT');
      return side ? { cols: def.rows, rows: def.cols } : { cols: def.cols, rows: def.rows };
    }

    function getKingdomCell(block, row, col) {
      return KINGDOM.cellGrid[block]?.[row]?.[col] || null;
    }

    // 칸id → 그 칸을 차지한 건물 (매번 다시 만들지 않도록 건물 기록이 바뀔 때만 새로 계산)
    let kingdomOccupancyKey = '';
    let kingdomOccupancy = new Map();
    function getKingdomOccupancy() {
      const sites = getKingdomState().sites;
      const key = JSON.stringify(sites);
      if (key !== kingdomOccupancyKey) {
        kingdomOccupancyKey = key;
        kingdomOccupancy = new Map();
        Object.entries(sites).forEach(([anchor, b]) => {
          if (!b) return;
          const cells = Array.isArray(b.cells) && b.cells.length ? b.cells : [anchor];
          cells.forEach(id => kingdomOccupancy.set(id, { anchor, ...b, cells }));
        });
      }
      return kingdomOccupancy;
    }

    // 어떤 칸을 차지한 건물 (없으면 null)
    function getKingdomBuildingOnCell(cellId) {
      return getKingdomOccupancy().get(cellId) || null;
    }

    // 기준 칸(왼쪽 위)에서 cols × rows 칸을 차지할 수 있으면 그 칸 목록, 아니면 null
    function getKingdomPlacementCells(anchorCell, cols = 1, rows = 1) {
      if (!anchorCell) return null;
      const cells = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = getKingdomCell(anchorCell.block, anchorCell.row + r, anchorCell.col + c);
          if (!cell || getKingdomBuildingOnCell(cell.id)) return null;
          cells.push(cell);
        }
      }
      return cells;
    }

    // 누른 칸을 포함하도록 cols × rows 자리를 찾는다 (누른 칸이 가운데에 가까운 자리부터)
    function findKingdomPlacementAround(cell, cols, rows) {
      if (!cell) return null;
      const tries = [];
      for (let dr = 0; dr < rows; dr++) {
        for (let dc = 0; dc < cols; dc++) {
          const off = Math.abs(dr - (rows - 1) / 2) + Math.abs(dc - (cols - 1) / 2);
          tries.push({ dr, dc, off });
        }
      }
      tries.sort((a, b) => a.off - b.off);
      for (const t of tries) {
        const anchor = getKingdomCell(cell.block, cell.row - t.dr, cell.col - t.dc);
        const cells = getKingdomPlacementCells(anchor, cols, rows);
        if (cells) return cells;
      }
      return null;
    }

    // 여러 칸을 덮는 사각형
    function getKingdomCellsRect(cells) {
      const x0 = Math.min(...cells.map(c => c.x - c.w / 2));
      const y0 = Math.min(...cells.map(c => c.y - c.h / 2));
      const x1 = Math.max(...cells.map(c => c.x + c.w / 2));
      const y1 = Math.max(...cells.map(c => c.y + c.h / 2));
      return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
    }

    // 다리가 열렸는지 (첫 황실 근위병을 영입하면 열리고, 그 뒤로는 계속 열려 있음)
    function isKingdomBridgeOpen() {
      const st = getKingdomState();
      return Boolean(st.bridgeOpen) || st.units.length > 0;
    }

    // 순찰 길 (한 바퀴): 마을 서쪽 입구 → 마을 북쪽 → 동쪽 → 남쪽 → 서쪽 → 다리 → 성문
    //   → 큰길로 메인 성 정문 앞까지 갔다 돌아와 → 성벽 안쪽 둘레 길 한 바퀴 → 성문 → 다리
    const KINGDOM_PATROL_ROUTE = (() => {
      const P = KINGDOM.paths;
      const castleFrontX = KINGDOM.castle.x + KINGDOM.castle.w + 20;
      return [
        { x: -470, y: 18 }, { x: -470, y: -235 }, { x: 470, y: -235 }, { x: 470, y: 235 },
        { x: -470, y: 235 }, { x: -470, y: 18 }, { x: -600, y: 18 }, { x: -700, y: 18 },
        { x: castleFrontX, y: 18 }, { x: P.eastX, y: 18 },
        { x: P.eastX, y: P.northY }, { x: P.westX, y: P.northY }, { x: P.westX, y: P.southY }, { x: P.eastX, y: P.southY },
        { x: P.eastX, y: 18 }, { x: -700, y: 18 }, { x: -600, y: 18 }
      ];
    })();


    // ---------- 왕국 상태 ----------
    function getKingdomState() {
      if (!gameState.kingdom || typeof gameState.kingdom !== 'object') gameState.kingdom = { units: [], sites: {} };
      const k = gameState.kingdom;
      if (!Array.isArray(k.units)) k.units = [];
      if (!k.sites || typeof k.sites !== 'object') k.sites = {};
      if (!Array.isArray(k.cleared)) k.cleared = [];       // 정리가 끝난 칸 id
      if (!Array.isArray(k.clearQueue)) k.clearQueue = []; // 근위병에게 정리를 지시한 칸 id (지시한 순서)
      return k;
    }

    // ---------- 폐허 정리 (근위병이 시간을 들여 치움 · 건물을 지으면 그 자리는 자동 정리) ----------
    let kingdomClearedSet = null;
    let kingdomClearedLen = -1;
    function isKingdomCellCleared(cellId) {
      const list = getKingdomState().cleared;
      if (!kingdomClearedSet || kingdomClearedLen !== list.length) {
        kingdomClearedSet = new Set(list);
        kingdomClearedLen = list.length;
      }
      return kingdomClearedSet.has(cellId);
    }

    function markKingdomCellsCleared(ids) {
      const st = getKingdomState();
      ids.forEach((id) => { if (!isKingdomCellCleared(id)) st.cleared.push(id); });
      st.clearQueue = st.clearQueue.filter(id => !ids.includes(id));
      kingdomClearedSet = null;
    }

    // 정리 지시할 수 있는 칸: 폐허이고 건물이 없는 칸
    function canOrderKingdomClear(cellId) {
      return KINGDOM.cellById.has(cellId) && !isKingdomCellCleared(cellId) && !getKingdomBuildingOnCell(cellId);
    }

    function toggleKingdomClearOrder(cellId) {
      const st = getKingdomState();
      const i = st.clearQueue.indexOf(cellId);
      if (i >= 0) {
        st.clearQueue.splice(i, 1);
        KingdomRuntime.squads.forEach((sq) => { if (sq.workCell === cellId) stopSquadWork(sq); });
        return false;
      }
      if (!canOrderKingdomClear(cellId)) return false;
      st.clearQueue.push(cellId);
      return true;
    }

    function getKingdomUnits() {
      return getKingdomState().units;
    }

    function hasTrainingGround() {
      return Object.values(getKingdomState().sites).some(s => s && s.type === 'training_ground');
    }

    // ---------- 왕국 병력 (헌터와 같은 레벨 · 능력치 체계, 지금은 순찰 전용) ----------
    // ============================================================================
    // 👑 왕국 병력 능력치 · 레벨 (헌터와 같은 능력치 체계: 공격 · 방어 · 체력 · 치명 · 전투력)
    //   - 기준 = 황실 근위병. 최대 Lv.99.
    //     Lv.1  = 1환생 Lv.1 헌터 (표준 장비 T7 +12, 4직업 평균) 와 같은 능력치
    //     Lv.99 = 5환생 Lv.99 헌터 (표준 장비 T10 +12, 4직업 평균) 전투력의 2배
    //     그 사이는 레벨마다 같은 비율로 매끄럽게 오른다 (치명은 % 라서 2배 대신 90%까지).
    //     (기준값은 test/expsim.js로 잰 값 · 전투력 공식 = 06-skills-dungeon-jobs.js evaluateHunterPower)
    //   - 계급 배율 (근위병 = 1): 근위대장 ×2 · 왕실 기사 ×4 · 왕실 마법사 ×2 (근위대장급)
    //     · 왕실 기사단장 ×12 (기사 ×3) · 왕실 대마법사 ×12 (기사단장급) · 왕자 ×24 (기사단장 ×2) · 공주 ×24 (대마법사 ×2)
    //     → 공격 · 방어 · 체력 · 전투력에 곱한다. 치명은 계급과 상관없이 같다.
    //   - 그림이 아직 없는 계급(available: false)은 영입 · 순찰에 나오지 않는다 (그림은 따로 받아서 추가).
    // ============================================================================
    const KINGDOM_STAT_ANCHORS = {
      lv1: { atk: 1552, def: 1837, hp: 966, crit: 57, power: 27043 },     // 1환생 Lv.1 헌터
      lv99: { atk: 17046, def: 29748, hp: 52940, crit: 90, power: 183476 } // 5환생 Lv.99 헌터 × 2
    };
    const KINGDOM_RANKS = {
      guard: { name: '황실 근위병', mult: 1, available: true, img: { m: 'guard_m', f: 'guard_f' }, size: 46 },
      captain: { name: '황실 근위대장', mult: 2, available: true, img: { m: 'guard_captain_m', f: 'guard_captain_f' }, size: 52 },
      knight: { name: '왕실 기사', mult: 4, available: false, size: 54 },
      mage: { name: '왕실 마법사', mult: 2, available: false, size: 50 },
      knight_commander: { name: '왕실 기사단장', mult: 12, available: false, size: 58 },
      archmage: { name: '왕실 대마법사', mult: 12, available: false, size: 56 },
      prince: { name: '왕자', mult: 24, available: false, size: 58 },
      princess: { name: '공주', mult: 24, available: false, size: 56 }
    };
    const KINGDOM_MAX_LEVEL = 99;

    function getKingdomUnitStats(u) {
      const r = KINGDOM_RANKS[u.rank] || KINGDOM_RANKS.guard;
      const lv = Math.max(1, Math.min(KINGDOM_MAX_LEVEL, u.level || 1));
      const f = (lv - 1) / (KINGDOM_MAX_LEVEL - 1);
      const A = KINGDOM_STAT_ANCHORS;
      const grow = k => A.lv1[k] * Math.pow(A.lv99[k] / A.lv1[k], f);
      // 🎖️ 등급 효과 (B +15% ~ EX+ +55% · js/37-hunter-grade.js)
      const g = typeof getKingdomUnitGrade === "function" ? 1 + getKingdomUnitGrade(u).bonus : 1;
      return {
        atk: Math.round(grow("atk") * r.mult * g),
        def: Math.round(grow("def") * r.mult * g),
        maxHp: Math.round(grow("hp") * r.mult * g),
        crit: Math.round(A.lv1.crit + (A.lv99.crit - A.lv1.crit) * f),
        power: Math.round(grow("power") * r.mult * g)
      };
    }

    // ---------- 레벨업 경험치: 순찰 · 정리하며 시간에 따라 오른다 ----------
    //   다음 레벨까지 필요 경험치 = 1,000 × 레벨^1.5 · 초당 경험치는 Lv.1→99가 약 10일(240시간)이 되도록 계산
    //   (게임을 꺼 둔 동안에도 자리 비운 보상과 같은 규칙으로 쌓인다: 최대 12시간 · 80%)
    const KINGDOM_LEVEL_DAYS = 10;
    function getKingdomRequiredExp(lv) {
      return Math.round(1000 * Math.pow(Math.max(1, lv), 1.5));
    }
    const KINGDOM_EXP_PER_SEC = (() => {
      let total = 0;
      for (let lv = 1; lv < KINGDOM_MAX_LEVEL; lv++) total += getKingdomRequiredExp(lv);
      return total / (KINGDOM_LEVEL_DAYS * 86400);
    })();

    function gainKingdomUnitExp(u, amount) {
      if (!u || (u.level || 1) >= KINGDOM_MAX_LEVEL) return false;
      u.level = Math.max(1, u.level || 1);
      u.exp = (u.exp || 0) + applyExpRate(amount, 'kingdom'); // ⭐ 경험치 배율 (01-core-utils.js EXP_RATE)
      let leveled = false;
      while (u.level < KINGDOM_MAX_LEVEL && u.exp >= getKingdomRequiredExp(u.level)) {
        u.exp -= getKingdomRequiredExp(u.level);
        u.level += 1;
        leveled = true;
      }
      if (u.level >= KINGDOM_MAX_LEVEL) u.exp = 0;
      return leveled;
    }

    function gainKingdomExpForSeconds(sec) {
      if (!(sec > 0)) return;
      getKingdomUnits().forEach((u) => {
        const before = u.level || 1;
        if (gainKingdomUnitExp(u, KINGDOM_EXP_PER_SEC * sec) && typeof combatEffects !== 'undefined' && combatEffects.spawnDamagePopup) {
          const pos = KingdomRuntime.unitPos.get(u.id);
          if (pos && u.level > before) combatEffects.spawnDamagePopup(pos.x, pos.y - 50, `⬆️ Lv.${u.level}`, false, '#fde047');
        }
      });
    }

    // 영입 (상점에서 호출). 반환: 새 병력
    function recruitKingdomUnit(rank = 'guard') {
      const st = getKingdomState();
      // 그림이 있는 계급만 영입 (나머지는 그림을 받은 뒤 available: true 로 바꾸면 된다)
      const r = KINGDOM_RANKS[rank] && KINGDOM_RANKS[rank].available ? rank : 'guard';
      const isFirstGuard = st.units.length === 0;
      const unit = {
        id: `k_${r}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        rank: r,
        gender: Math.random() < 0.5 ? 'm' : 'f',
        name: typeof generateRandomHunterName === 'function' ? generateRandomHunterName(hunters) : (r === 'captain' ? '근위대장' : '근위병'),
        level: 1,
        exp: 0,
        joinedAt: Date.now()
      };
      if (typeof getKingdomUnitGrade === "function") getKingdomUnitGrade(unit); // 🎖️ 영입할 때 등급 결정 (B 이상)
      st.units.push(unit);
      const bridgeWasClosed = !st.bridgeOpen;
      st.bridgeOpen = true; // 첫 황실 근위병이 오면 끊긴 돌다리가 복구된다
      rebuildKingdomSquads();
      showToast(`👑 ${KINGDOM_RANKS[r].name} '${unit.name}' 이(가) 왕국에 합류했습니다!`);
      if (bridgeWasClosed) {
        setTimeout(() => showToast('🌉 끊겨 있던 왕국의 돌다리가 복구되었습니다!'), 1400);
      }
      if (isFirstGuard && !hasTrainingGround()) {
        setTimeout(() => showToast('🏗️ 왕국 성의 폐허 칸을 눌러 [연병장]을 지을 수 있습니다!'), 3000);
      }
      if (typeof flushSyncBackup === 'function') flushSyncBackup();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
      return unit;
    }

    // ---------- 부대 편성 · 순찰 ----------
    // 실행 중 정보(위치 · 발자취)는 저장하지 않는다.
    const KingdomRuntime = { squads: [], unitPos: new Map() };

    function rebuildKingdomSquads() {
      const units = getKingdomUnits().filter(u => KINGDOM_RANKS[u.rank] && KINGDOM_RANKS[u.rank].available);
      const captains = units.filter(u => u.rank === 'captain');
      const guards = units.filter(u => u.rank === 'guard');
      const squads = [];
      captains.forEach((c) => {
        squads.push([c, ...guards.splice(0, KINGDOM.squadSize)]);
      });
      // 대장이 없는 근위병은 6명씩 묶어 맨 앞 근위병이 이끈다
      while (guards.length > 0) squads.push(guards.splice(0, KINGDOM.squadSize + 1));

      KingdomRuntime.squads = squads.map((members, i) => {
        // 부대마다 순찰 시작 지점을 나눠 겹치지 않게
        const startIdx = (i * 5 + 8) % KINGDOM_PATROL_ROUTE.length;
        const start = KINGDOM_PATROL_ROUTE[startIdx];
        return {
          members,
          wpIndex: (startIdx + 1) % KINGDOM_PATROL_ROUTE.length,
          x: start.x,
          y: start.y,
          facing: 1,
          trail: [{ x: start.x, y: start.y }],
          walkT: Math.random() * 10
        };
      });
      KingdomRuntime.unitPos.clear();
      KingdomRuntime.squads.forEach(sq => placeSquadMembers(sq));
    }

    // 발자취를 따라 뒤로 followGap 간격마다 한 명씩 세운다
    function placeSquadMembers(sq) {
      let need = 0;
      let idx = sq.trail.length - 1;
      let px = sq.x;
      let py = sq.y;
      let acc = 0;
      sq.members.forEach((u, k) => {
        need = k * KINGDOM.followGap;
        while (acc < need && idx > 0) {
          const a = sq.trail[idx - 1];
          const seg = Math.hypot(px - a.x, py - a.y);
          if (acc + seg >= need) {
            const t = (need - acc) / Math.max(0.001, seg);
            px += (a.x - px) * t;
            py += (a.y - py) * t;
            acc = need;
            break;
          }
          acc += seg;
          px = a.x;
          py = a.y;
          idx -= 1;
        }
        const prev = KingdomRuntime.unitPos.get(u.id);
        const facing = prev ? (Math.abs(px - prev.x) > 0.01 ? Math.sign(px - prev.x) : prev.facing) : sq.facing;
        KingdomRuntime.unitPos.set(u.id, { x: px, y: py + (k === 0 ? 0 : 0), facing, rank: u.rank, unit: u, walkT: sq.walkT + k * 0.7 });
      });
    }

    // ---------- 길 찾기: 메인 성을 돌아서 간다 ----------
    function segHitsRect(a, b, R) {
      // 선분 a→b가 사각형 R과 겹치는지 (잘게 나눠 확인 · 짧은 거리라 충분)
      const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 16));
      for (let i = 0; i <= steps; i++) {
        const x = a.x + (b.x - a.x) * (i / steps);
        const y = a.y + (b.y - a.y) * (i / steps);
        if (x > R.x0 && x < R.x1 && y > R.y0 && y < R.y1) return true;
      }
      return false;
    }

    function planKingdomPath(from, to) {
      const C = KINGDOM.castle;
      const m = 34;
      const R = { x0: C.x - m + 2, y0: C.y - m + 2, x1: C.x + C.w + m - 2, y1: C.y + C.h + m - 2 };
      if (!segHitsRect(from, to, R)) return [to];
      const corners = [
        { x: C.x - m, y: C.y - m }, { x: C.x + C.w + m, y: C.y - m },
        { x: C.x + C.w + m, y: C.y + C.h + m }, { x: C.x - m, y: C.y + C.h + m }
      ];
      const len = pts => pts.reduce((s, p, i) => s + Math.hypot(p.x - (i ? pts[i - 1].x : from.x), p.y - (i ? pts[i - 1].y : from.y)), 0);
      let best = null;
      corners.forEach((c) => {
        if (!segHitsRect(from, c, R) && !segHitsRect(c, to, R)) {
          const p = [c, to];
          if (!best || len(p) < len(best)) best = p;
        }
      });
      if (best) return best;
      for (let i = 0; i < 4; i++) {
        [1, 3].forEach((d) => {
          const c1 = corners[i];
          const c2 = corners[(i + d) % 4];
          if (!segHitsRect(from, c1, R) && !segHitsRect(c2, to, R)) {
            const p = [c1, c2, to];
            if (!best || len(p) < len(best)) best = p;
          }
        });
      }
      return best || [to];
    }

    // ---------- 근위병 폐허 정리 ----------
    function isSquadInsideKingdom(sq) {
      const I = KINGDOM.inner;
      return sq.x > I.x && sq.x < I.x + I.w - 30 && sq.y > I.y && sq.y < I.y + I.h;
    }

    function pickKingdomWorkCell(sq) {
      const st = getKingdomState();
      const taken = new Set(KingdomRuntime.squads.filter(o => o !== sq && o.workCell).map(o => o.workCell));
      let best = null;
      let bestD = Infinity;
      st.clearQueue.forEach((id) => {
        if (taken.has(id) || !canOrderKingdomClear(id)) return;
        const c = KINGDOM.cellById.get(id);
        const d = Math.hypot(c.x - sq.x, c.y - sq.y);
        if (d < bestD) { bestD = d; best = c; }
      });
      return best;
    }

    function startSquadWork(sq, cell) {
      sq.mode = 'toWork';
      sq.workCell = cell.id;
      sq.workT = 0;
      sq.path = planKingdomPath({ x: sq.x, y: sq.y }, { x: cell.x, y: cell.y + 24 });
    }

    // 하던 정리를 멈추고 가장 가까운 왕국 안 순찰 지점으로 돌아간다
    function stopSquadWork(sq) {
      sq.workCell = null;
      sq.workT = 0;
      let bestI = -1;
      let bestD = Infinity;
      KINGDOM_PATROL_ROUTE.forEach((p, i) => {
        if (p.x > KINGDOM.gateX - 20) return; // 왕국 안 지점만
        const d = Math.hypot(p.x - sq.x, p.y - sq.y);
        if (d < bestD) { bestD = d; bestI = i; }
      });
      if (bestI < 0) { sq.mode = 'patrol'; return; }
      sq.mode = 'return';
      sq.returnIndex = bestI;
      sq.path = planKingdomPath({ x: sq.x, y: sq.y }, KINGDOM_PATROL_ROUTE[bestI]);
      sq.trail = [{ x: sq.x, y: sq.y }];
    }

    function finishSquadWork(sq) {
      const cell = KINGDOM.cellById.get(sq.workCell);
      markKingdomCellsCleared([sq.workCell]);
      if (cell && typeof combatEffects !== 'undefined' && combatEffects.spawnDamagePopup) {
        combatEffects.spawnDamagePopup(cell.x, cell.y - 10, '✨ 정리 완료', false, '#86efac');
      }
      if (KingdomRuntime.orderMode) renderKingdomOrderBar();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(1500);
      sq.workCell = null;
      const next = pickKingdomWorkCell(sq);
      sq.trail = [{ x: sq.x, y: sq.y }];
      if (next) startSquadWork(sq, next);
      else stopSquadWork(sq);
    }

    // 길(path)을 따라 이동. 끝까지 가면 true
    function moveSquadAlongPath(sq, move) {
      while (move > 0 && sq.path && sq.path.length) {
        const wp = sq.path[0];
        const dx = wp.x - sq.x;
        const dy = wp.y - sq.y;
        const d = Math.hypot(dx, dy);
        if (d <= move) {
          sq.x = wp.x;
          sq.y = wp.y;
          move -= d;
          sq.path.shift();
        } else {
          sq.x += (dx / d) * move;
          sq.y += (dy / d) * move;
          if (Math.abs(dx) > 0.5) sq.facing = Math.sign(dx);
          move = 0;
        }
      }
      return !sq.path || sq.path.length === 0;
    }

    // 정리하는 동안: 부대원이 칸을 빙 둘러서서 일한다
    function placeSquadWorking(sq, cell) {
      const n = sq.members.length;
      sq.members.forEach((u, k) => {
        const a = (k / n) * Math.PI * 2 + Math.PI / 2;
        const x = cell.x + Math.cos(a) * 30;
        const y = cell.y + Math.sin(a) * 22 + 16;
        KingdomRuntime.unitPos.set(u.id, {
          x, y, facing: cell.x >= x ? 1 : -1, rank: u.rank, unit: u,
          walkT: sq.walkT * 1.6 + k * 0.9, working: true
        });
      });
    }

    function getSquadClearSec(sq) {
      return KINGDOM.clearMemberSec / Math.max(1, sq.members.length);
    }

    function updateKingdom(dt) {
      gainKingdomExpForSeconds(dt); // 왕국 병력은 시간에 따라 경험치를 얻는다
      if (!KingdomRuntime.squads.length) return;
      KingdomRuntime.squads.forEach((sq) => {
        sq.mode = sq.mode || 'patrol';
        const move = KINGDOM.patrolSpeed * dt;

        if (sq.mode === 'patrol') {
          // 왕국 안을 순찰하다 정리할 칸이 있으면 그쪽으로
          if (isSquadInsideKingdom(sq)) {
            const cell = pickKingdomWorkCell(sq);
            if (cell) startSquadWork(sq, cell);
          }
        }

        if (sq.mode === 'patrol') {
          let left = move;
          while (left > 0) {
            const wp = KINGDOM_PATROL_ROUTE[sq.wpIndex];
            const dx = wp.x - sq.x;
            const dy = wp.y - sq.y;
            const d = Math.hypot(dx, dy);
            if (d <= left) {
              sq.x = wp.x;
              sq.y = wp.y;
              left -= d;
              sq.wpIndex = (sq.wpIndex + 1) % KINGDOM_PATROL_ROUTE.length;
            } else {
              sq.x += (dx / d) * left;
              sq.y += (dy / d) * left;
              if (Math.abs(dx) > 0.5) sq.facing = Math.sign(dx);
              left = 0;
            }
          }
        } else if (sq.mode === 'toWork') {
          if (!canOrderKingdomClear(sq.workCell) || !getKingdomState().clearQueue.includes(sq.workCell)) {
            stopSquadWork(sq); // 지시가 취소됐거나 그 자리에 건물이 생김
          } else if (moveSquadAlongPath(sq, move)) {
            sq.mode = 'working';
            sq.workT = 0;
          }
        } else if (sq.mode === 'working') {
          const cell = KINGDOM.cellById.get(sq.workCell);
          if (!cell || !canOrderKingdomClear(sq.workCell) || !getKingdomState().clearQueue.includes(sq.workCell)) {
            stopSquadWork(sq);
          } else {
            sq.workT += dt;
            sq.walkT += dt;
            placeSquadWorking(sq, cell);
            if (sq.workT >= getSquadClearSec(sq)) finishSquadWork(sq);
            return;
          }
        } else if (sq.mode === 'return') {
          if (moveSquadAlongPath(sq, move)) {
            sq.mode = 'patrol';
            sq.wpIndex = ((sq.returnIndex || 0) + 1) % KINGDOM_PATROL_ROUTE.length;
          }
        }

        const last = sq.trail[sq.trail.length - 1];
        if (Math.hypot(sq.x - last.x, sq.y - last.y) >= 4) sq.trail.push({ x: sq.x, y: sq.y });
        const maxPts = Math.ceil((sq.members.length * KINGDOM.followGap) / 4) + 20;
        if (sq.trail.length > maxPts) sq.trail.splice(0, sq.trail.length - maxPts);
        sq.walkT += dt;
        placeSquadMembers(sq);
      });
    }

    // ---------- 그림: 이미지 ----------
    const KINGDOM_IMG = {};
    ['guard_m', 'guard_f', 'guard_captain_m', 'guard_captain_f', 'guard_weapon_spear', 'guard_captain_weapon_spear'].forEach((k) => {
      const img = new Image();
      img.src = `assets/royal_guard/${k}.png`;
      KINGDOM_IMG[k] = img;
    });
    const imgReady = (img) => img && img.complete && img.naturalWidth > 0;

    function drawKingdomUnit(ctx, pos) {
      const u = pos.unit;
      const r = KINGDOM_RANKS[u.rank] || KINGDOM_RANKS.guard;
      const body = KINGDOM_IMG[r.img[u.gender] || r.img.m];
      const spear = KINGDOM_IMG[u.rank === 'captain' ? 'guard_captain_weapon_spear' : 'guard_weapon_spear'];
      const s = r.size;
      const bob = Math.abs(Math.sin(pos.walkT * 7)) * 2;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      // 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 2, s * 0.26, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.scale(pos.facing < 0 ? -1 : 1, 1);
      // 창: 몸 앞쪽(오른손)에 세워 든다
      if (imgReady(spear)) {
        ctx.save();
        ctx.translate(s * 0.22, -s * 0.5 - bob);
        ctx.rotate(-Math.PI / 4); // 그림의 창은 대각선 → 세로로 세움
        const sl = s * 1.25;
        ctx.drawImage(spear, -sl / 2, -sl / 2, sl, sl);
        ctx.restore();
      }
      if (imgReady(body)) {
        ctx.drawImage(body, -s / 2, -s - bob + 4, s, s);
      } else {
        ctx.fillStyle = u.rank === 'captain' ? '#1d4ed8' : '#b91c1c';
        ctx.fillRect(-7, -26 - bob, 14, 24);
      }
      ctx.restore();
      if (u.rank === 'captain') {
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        const label = `👑 ${u.name}`;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
        ctx.beginPath();
        ctx.roundRect(pos.x - tw / 2 - 5, pos.y - s - 16, tw + 10, 14, 4);
        ctx.fill();
        ctx.fillStyle = '#93c5fd';
        ctx.fillText(label, pos.x, pos.y - s - 5);
      }
    }

    // 17-game-loop.js가 헌터 · 건물과 함께 깊이(y) 순으로 그린다
    function getKingdomRenderables() {
      const out = [];
      KingdomRuntime.unitPos.forEach((pos) => out.push({ kind: 'kingdom_unit', y: pos.y, data: pos }));
      return out;
    }

    // ---------- 그림: 왕국 성 지형 (해자 · 다리 · 성벽 · 폐허 · 건물) ----------
    function hash2(a, b) {
      return Math.abs(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1;
    }

    function drawRubble(ctx, x, y, w, h, seed, count = 14) {
      for (let i = 0; i < count; i++) {
        const rx = x + hash2(seed, i) * w;
        const ry = y + hash2(i, seed) * h;
        const rs = 4 + hash2(seed + i, 3) * 9;
        ctx.fillStyle = hash2(i, seed + 1) > 0.5 ? '#6b7280' : '#57534e';
        ctx.beginPath();
        ctx.ellipse(rx, ry, rs, rs * 0.6, hash2(i, i) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---------- 폐허 칸 (도로 한 칸 크기) ----------
    // 380칸을 매 화면 그리므로 가볍게: 화면에 보이는 칸만, 칸마다 몇 번의 붓질만 한다.
    function getKingdomViewRect() {
      try {
        const a = camera.screenToWorld(0, 0);
        const b = camera.screenToWorld(camera.viewportWidth, camera.viewportHeight);
        return { x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) };
      } catch (_) {
        return { x0: -1e9, y0: -1e9, x1: 1e9, y1: 1e9 };
      }
    }

    // 빈 칸 가운데 반투명 망치 (그림 글자 대신 선 몇 개로 · '여기에 지을 수 있다'는 느낌만)
    function drawTileHammer(ctx, x, y) {
      ctx.strokeStyle = 'rgba(214, 180, 120, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 9);   // 자루
      ctx.lineTo(x + 3, y - 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(203, 213, 225, 0.95)';
      ctx.beginPath();            // 머리 (기울어진 네모)
      ctx.moveTo(x - 1, y - 9);
      ctx.lineTo(x + 5, y - 15);
      ctx.lineTo(x + 12, y - 8);
      ctx.lineTo(x + 6, y - 2);
      ctx.closePath();
      ctx.fill();
    }

    function drawKingdomTiles(ctx) {
      const T = KINGDOM.tile;
      const view = getKingdomViewRect();
      const zoom = (typeof camera !== 'undefined' && camera.effectiveZoom) || 1;
      const showHammer = zoom >= 0.55;
      KINGDOM.blocks.forEach((b) => {
        const bw = b.cols * T;
        const bh = b.rows * T;
        if (b.x0 > view.x1 || b.x0 + bw < view.x0 || b.y0 > view.y1 || b.y0 + bh < view.y0) return;
        // 구역 바닥 (금 간 돌바닥) + 칸 줄
        ctx.fillStyle = '#4b4f45';
        ctx.fillRect(b.x0, b.y0, bw, bh);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let c = 0; c <= b.cols; c++) { ctx.moveTo(b.x0 + c * T, b.y0); ctx.lineTo(b.x0 + c * T, b.y0 + bh); }
        for (let r = 0; r <= b.rows; r++) { ctx.moveTo(b.x0, b.y0 + r * T); ctx.lineTo(b.x0 + bw, b.y0 + r * T); }
        ctx.stroke();

        const c0 = Math.max(0, Math.floor((view.x0 - b.x0) / T));
        const c1 = Math.min(b.cols - 1, Math.floor((view.x1 - b.x0) / T));
        const r0 = Math.max(0, Math.floor((view.y0 - b.y0) / T));
        const r1 = Math.min(b.rows - 1, Math.floor((view.y1 - b.y0) / T));
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const cell = KINGDOM.cellGrid[b.id][r][c];
            if (!cell || getKingdomBuildingOnCell(cell.id)) continue; // 메인 성 자리 · 건물 칸은 건너뜀
            if (isKingdomCellCleared(cell.id)) {
              // 정리된 칸: 깨끗한 흙바닥 + 풀 조금
              ctx.fillStyle = '#6b7b52';
              ctx.fillRect(b.x0 + c * T + 1, b.y0 + r * T + 1, T - 2, T - 2);
              ctx.fillStyle = 'rgba(134, 179, 95, 0.35)';
              ctx.fillRect(b.x0 + c * T + 8 + hash2(r, c) * 30, b.y0 + r * T + 10 + hash2(c, r) * 34, 10, 4);
              continue;
            }
            const x = b.x0 + c * T;
            const y = b.y0 + r * T;
            const h1 = hash2(r + 3, c + 7);
            const h2 = hash2(c + 11, r + 5);
            // 금 · 돌무더기 · 잡초를 칸마다 조금씩
            if (h1 > 0.55) {
              ctx.strokeStyle = 'rgba(20, 20, 20, 0.4)';
              ctx.beginPath();
              ctx.moveTo(x + 8 + h2 * 20, y + 10);
              ctx.lineTo(x + 30 + h1 * 10, y + 34 + h2 * 16);
              ctx.stroke();
            }
            if (h2 > 0.6) {
              ctx.fillStyle = h1 > 0.5 ? '#6b7280' : '#57534e';
              ctx.beginPath();
              ctx.ellipse(x + 14 + h1 * 36, y + 44 + h2 * 10, 5 + h2 * 4, 3 + h1 * 2, h1 * 3, 0, Math.PI * 2);
              ctx.fill();
            }
            if (h1 < 0.18) {
              ctx.fillStyle = 'rgba(74, 124, 58, 0.55)';
              ctx.beginPath();
              ctx.arc(x + 12 + h2 * 40, y + 14 + h1 * 120, 5 + h2 * 4, 0, Math.PI * 2);
              ctx.fill();
            }
            if (h2 < 0.08) {
              ctx.fillStyle = '#78716c'; // 무너진 벽 조각
              ctx.fillRect(x + 6, y + 6, T * 0.5, 7);
            }
          }
        }
        if (showHammer) {
          ctx.save();
          ctx.globalAlpha = 0.32;
          for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
              const cell = KINGDOM.cellGrid[b.id][r][c];
              if (cell && !getKingdomBuildingOnCell(cell.id)) drawTileHammer(ctx, cell.x, cell.y + 2);
            }
          }
          ctx.restore();
        }
        // 정리 지시한 칸: 노란 점선 테두리 + 빗자루 · 정리 중이면 진행 막대
        const queue = getKingdomState().clearQueue;
        if (queue.length) {
          const working = new Map();
          KingdomRuntime.squads.forEach((sq) => { if (sq.mode === 'working' && sq.workCell) working.set(sq.workCell, sq); });
          ctx.save();
          ctx.setLineDash([6, 4]);
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
          queue.forEach((id) => {
            const cell = KINGDOM.cellById.get(id);
            if (!cell || cell.block !== b.id) return;
            if (cell.x < view.x0 - T || cell.x > view.x1 + T || cell.y < view.y0 - T || cell.y > view.y1 + T) return;
            ctx.strokeRect(cell.x - T / 2 + 3, cell.y - T / 2 + 3, T - 6, T - 6);
            ctx.fillStyle = 'rgba(250, 204, 21, 0.9)';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🧹', cell.x + T / 2 - 13, cell.y - T / 2 + 13);
            const sq = working.get(id);
            if (sq) {
              const p = Math.min(1, sq.workT / getSquadClearSec(sq));
              ctx.setLineDash([]);
              ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
              ctx.fillRect(cell.x - 24, cell.y + T / 2 + 22, 48, 7); // 일하는 부대원 발밑 아래 (대장 이름표 · 몸에 가리지 않게)
              ctx.fillStyle = '#4ade80';
              ctx.fillRect(cell.x - 23, cell.y + T / 2 + 23, 46 * p, 5);
              ctx.setLineDash([6, 4]);
            }
          });
          ctx.restore();
        }
      });
    }

    function drawSiteSign(ctx, site, text, color) {
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      const tw = ctx.measureText(text).width;
      const sy = site.y + site.h / 2 - 16;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.beginPath();
      ctx.roundRect(site.x - tw / 2 - 8, sy - 13, tw + 16, 20, 6);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillText(text, site.x, sy + 2);
    }

    function drawTrainingGround(ctx, site, t) {
      const x = site.x - site.w / 2;
      const y = site.y - site.h / 2;
      // 흙 마당 + 나무 울타리
      ctx.fillStyle = '#a07a4f';
      ctx.beginPath();
      ctx.roundRect(x, y, site.w, site.h, 12);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.arc(x + hash2(i, 1) * site.w, y + hash2(1, i) * site.h, 6 + hash2(i, 4) * 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#5b3a1f';
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 6, y + 6, site.w - 12, site.h - 12);
      ctx.fillStyle = '#5b3a1f';
      for (let px = x + 6; px <= x + site.w - 6; px += 29) {
        ctx.fillRect(px - 3, y + 2, 6, 10);
        ctx.fillRect(px - 3, y + site.h - 12, 6, 10);
      }
      // 허수아비 (훈련용 목인) 3개
      [[-0.25, -0.12], [0, -0.12], [0.25, -0.12]].forEach(([fx, fy], i) => {
        const dx = site.x + fx * site.w;
        const dy = site.y + fy * site.h;
        const sway = Math.sin(t * 2 + i) * 1.5;
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(dx - 2, dy - 26, 4, 30);
        ctx.fillRect(dx - 14 + sway, dy - 20, 28, 4);
        ctx.fillStyle = '#d6b37a';
        ctx.beginPath();
        ctx.arc(dx + sway, dy - 30, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(dx - 6 + sway, dy - 16, 12, 10);
      });
      // 무기 거치대 (칸 크기에 맞춰 창 개수 조절)
      const rackW = Math.min(120, site.w - 60);
      const spears = Math.max(3, Math.floor(rackW / 22));
      const rackY = site.y + Math.min(50, site.h * 0.2);
      ctx.fillStyle = '#4a2f17';
      ctx.fillRect(site.x - rackW / 2, rackY, rackW, 7);
      for (let i = 0; i < spears; i++) {
        const sx = site.x - rackW / 2 + 10 + i * ((rackW - 20) / Math.max(1, spears - 1));
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, rackY + 2);
        ctx.lineTo(sx, rackY - 34);
        ctx.stroke();
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath();
        ctx.moveTo(sx, rackY - 42);
        ctx.lineTo(sx - 4, rackY - 32);
        ctx.lineTo(sx + 4, rackY - 32);
        ctx.closePath();
        ctx.fill();
      }
      // 깃발
      ctx.fillStyle = '#e7e5e4';
      ctx.fillRect(x + site.w - 34, y + 18, 3, 46);
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(x + site.w - 31, y + 18);
      ctx.lineTo(x + site.w - 6, y + 26 + Math.sin(t * 3) * 2);
      ctx.lineTo(x + site.w - 31, y + 34);
      ctx.closePath();
      ctx.fill();
      drawSiteSign(ctx, site, '⚔️ 연병장', '#fde68a');
    }

    function drawRuinedCastle(ctx) {
      const c = KINGDOM.castle;
      // 기단
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.roundRect(c.x, c.y, c.w, c.h, 16);
      ctx.fill();
      // 바닥 석판
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1;
      for (let gy = c.y + 30; gy < c.y + c.h; gy += 46) {
        ctx.beginPath();
        ctx.moveTo(c.x + 10, gy);
        ctx.lineTo(c.x + c.w - 10, gy);
        ctx.stroke();
      }
      // 무너진 외벽 (끊긴 구간)
      ctx.fillStyle = '#6b6b70';
      const wall = 18;
      [[0, 0.32], [0.48, 0.78]].forEach(([a, b]) => ctx.fillRect(c.x + c.w * a, c.y, c.w * (b - a), wall));
      [[0.1, 0.4], [0.62, 1]].forEach(([a, b]) => ctx.fillRect(c.x + c.w * a, c.y + c.h - wall, c.w * (b - a), wall));
      [[0, 0.22], [0.36, 0.58], [0.74, 1]].forEach(([a, b]) => ctx.fillRect(c.x, c.y + c.h * a, wall, c.h * (b - a)));
      [[0.05, 0.4], [0.6, 0.95]].forEach(([a, b]) => ctx.fillRect(c.x + c.w - wall, c.y + c.h * a, wall, c.h * (b - a)));
      // 무너진 탑 (네 모서리 + 가운데 큰 탑)
      const tower = (tx, ty, r, broken) => {
        ctx.fillStyle = '#52525b';
        ctx.beginPath();
        ctx.arc(tx, ty, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#27272a';
        ctx.beginPath();
        ctx.arc(tx, ty, r * 0.62, 0, Math.PI * 2);
        ctx.fill();
        if (broken) drawRubble(ctx, tx - r, ty - r * 0.4, r * 2, r * 1.6, tx * 0.01 + ty * 0.01, 8);
      };
      tower(c.x + 30, c.y + 30, 34, true);
      tower(c.x + c.w - 30, c.y + 30, 34, false);
      tower(c.x + 30, c.y + c.h - 30, 34, false);
      tower(c.x + c.w - 30, c.y + c.h - 30, 34, true);
      // 중앙 본성 터: 부서진 큰 홀
      const kx = c.x + c.w / 2;
      const ky = c.y + c.h / 2;
      ctx.fillStyle = '#57534e';
      ctx.fillRect(kx - 190, ky - 260, 380, 22);
      ctx.fillRect(kx - 190, ky - 260, 22, 300);
      ctx.fillRect(kx + 168, ky - 60, 22, 320);
      ctx.fillRect(kx - 40, ky + 238, 230, 22);
      for (let i = 0; i < 6; i++) {
        // 부러진 기둥
        const px = kx - 120 + i * 48;
        ctx.fillStyle = '#a8a29e';
        ctx.beginPath();
        ctx.arc(px, ky - 150, 11, 0, Math.PI * 2);
        ctx.arc(px, ky + 140, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      tower(kx, ky, 70, true);
      drawRubble(ctx, c.x + 60, c.y + 120, c.w - 120, c.h - 240, 4.2, 46);
      ctx.fillStyle = 'rgba(74, 124, 58, 0.45)';
      for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.arc(c.x + hash2(i, 31) * c.w, c.y + hash2(31, i) * c.h, 6 + hash2(i, 13) * 9, 0, Math.PI * 2);
        ctx.fill();
      }
      drawSiteSign(ctx, { x: kx, y: ky + 330, w: 0, h: 0 }, '🏰 메인 성 (폐허)', '#e2e8f0');
    }

    function drawKingdomGround(ctx) {
      const t = performance.now() / 1000;
      const I = KINGDOM.inner;
      const wt = KINGDOM.wallThick;
      const mw = KINGDOM.moatWidth;
      const ox = I.x - wt - mw;
      const oy = I.y - wt - mw;
      const ow = I.w + (wt + mw) * 2;
      const oh = I.h + (wt + mw) * 2;

      // 마을 바깥 서쪽 잔디 (마을 바닥 그림은 x -1100부터라 그 서쪽을 채움)
      ctx.fillStyle = '#2d4c3e';
      ctx.fillRect(-4600, -2800, 4600 - 563, 5800); // 마을 바닥 상자(x -560부터)와 테두리는 덮지 않음
      ctx.fillRect(-563, 1500, 1113, 1300);         // 마을 아래쪽 (왕국이 세로로 길어져 카메라가 더 내려감)

      // 해자 (물)
      const water = ctx.createLinearGradient(ox, oy, ox + ow, oy + oh);
      water.addColorStop(0, '#1d4e89');
      water.addColorStop(1, '#2563a8');
      ctx.fillStyle = water;
      ctx.beginPath();
      ctx.roundRect(ox, oy, ow, oh, 40);
      ctx.fill();
      // 물결
      ctx.strokeStyle = 'rgba(191, 219, 254, 0.28)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 40; i++) {
        const side = i % 4;
        const f = ((i * 0.137 + t * 0.02) % 1);
        let wx;
        let wy;
        if (side === 0) { wx = ox + f * ow; wy = oy + mw * 0.5; }
        else if (side === 1) { wx = ox + f * ow; wy = oy + oh - mw * 0.5; }
        else if (side === 2) { wx = ox + mw * 0.5; wy = oy + f * oh; }
        else { wx = ox + ow - mw * 0.5; wy = oy + f * oh; }
        ctx.beginPath();
        ctx.moveTo(wx - 8, wy + Math.sin(t * 2 + i) * 2);
        ctx.quadraticCurveTo(wx, wy - 4, wx + 8, wy + Math.sin(t * 2 + i) * 2);
        ctx.stroke();
      }
      // 해자 안쪽 둑
      ctx.fillStyle = '#3a5a40';
      ctx.beginPath();
      ctx.roundRect(I.x - wt - 8, I.y - wt - 8, I.w + (wt + 8) * 2, I.h + (wt + 8) * 2, 22);
      ctx.fill();

      // 성 안 바닥 (잡초 섞인 흙 · 폐허)
      ctx.fillStyle = '#4a5240';
      ctx.fillRect(I.x, I.y, I.w, I.h);
      ctx.fillStyle = 'rgba(74, 124, 58, 0.35)';
      for (let i = 0; i < 60; i++) {
        ctx.beginPath();
        ctx.arc(I.x + hash2(i, 51) * I.w, I.y + hash2(51, i) * I.h, 8 + hash2(i, 5) * 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // 성 안 큰길 (성문 → 메인 성) · 순찰 길
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(KINGDOM.castle.x + KINGDOM.castle.w, KINGDOM.road.y - KINGDOM.road.halfW, KINGDOM.gateX - (KINGDOM.castle.x + KINGDOM.castle.w), KINGDOM.road.halfW * 2);
      ctx.fillStyle = 'rgba(107, 114, 128, 0.55)';
      const P = KINGDOM.paths;
      const pw = P.halfW * 2;
      ctx.fillRect(P.westX - P.halfW, P.northY - P.halfW, pw, P.southY - P.northY + pw); // 메인 성 앞 세로길
      ctx.fillRect(P.eastX - P.halfW, P.northY - P.halfW, pw, P.southY - P.northY + pw); // 동쪽 길
      ctx.fillRect(P.westX - P.halfW, P.northY - P.halfW, P.eastX - P.westX + pw, pw);   // 북쪽 길
      ctx.fillRect(P.westX - P.halfW, P.southY - P.halfW, P.eastX - P.westX + pw, pw);   // 남쪽 길

      // 회색 벽돌 다리 (마을 서쪽 끝 → 해자 → 성문)
      const by = KINGDOM.road.y - KINGDOM.road.halfW;
      const bh = KINGDOM.road.halfW * 2;
      const bx0 = I.x + I.w;            // 성벽 바깥면 쪽
      const bx1 = -470;                 // 마을 큰길
      const moatX0 = I.x + I.w + wt;    // 해자 시작 (성벽 바깥)
      const moatX1 = ox + ow;           // 해자 끝 (마을 쪽 둑)
      const bridgeOpen = isKingdomBridgeOpen();
      // 끊긴 다리: 해자 가운데 부분이 없다 (첫 황실 근위병을 영입하면 복구)
      const gapX0 = moatX0 + 14;
      const gapX1 = moatX1 - 14;
      const brickRun = (x0, x1) => {
        if (x1 <= x0) return;
        ctx.fillStyle = '#8b8f97';
        ctx.fillRect(x0, by, x1 - x0, bh);
        ctx.strokeStyle = 'rgba(55, 65, 81, 0.55)';
        ctx.lineWidth = 1;
        for (let row = 0; row < bh; row += 10) {
          ctx.beginPath();
          ctx.moveTo(x0, by + row);
          ctx.lineTo(x1, by + row);
          ctx.stroke();
          const off = (row / 10) % 2 === 0 ? 0 : 10;
          for (let bx = bx0 + off; bx < x1; bx += 20) {
            if (bx < x0) continue;
            ctx.beginPath();
            ctx.moveTo(bx, by + row);
            ctx.lineTo(bx, by + row + 10);
            ctx.stroke();
          }
        }
      };
      if (bridgeOpen) {
        brickRun(bx0, bx1);
        // 다리 난간 (해자 위 구간)
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(bx0, by - 6, moatX1 - bx0 + 6, 6);
        ctx.fillRect(bx0, by + bh, moatX1 - bx0 + 6, 6);
      } else {
        brickRun(bx0, gapX0);
        brickRun(gapX1, bx1);
        // 부서진 끝 (들쭉날쭉)
        ctx.fillStyle = '#8b8f97';
        for (let i = 0; i < 6; i++) {
          const yy = by + i * (bh / 6);
          ctx.fillRect(gapX0, yy, 4 + hash2(i, 1) * 9, bh / 6);
          const w2 = 4 + hash2(i, 2) * 9;
          ctx.fillRect(gapX1 - w2, yy, w2, bh / 6);
        }
        // 물에 떨어진 돌덩이
        ctx.fillStyle = 'rgba(107, 114, 128, 0.85)';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.ellipse(gapX0 + 10 + hash2(i, 5) * (gapX1 - gapX0 - 20), by + 8 + hash2(5, i) * (bh - 16), 4 + hash2(i, 9) * 3, 3, hash2(i, i), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(bx0, by - 6, gapX0 - bx0 + 4, 6);
        ctx.fillRect(bx0, by + bh, gapX0 - bx0 + 4, 6);
        ctx.fillRect(gapX1 - 4, by - 6, moatX1 - gapX1 + 10, 6);
        ctx.fillRect(gapX1 - 4, by + bh, moatX1 - gapX1 + 10, 6);
      }

      // 성벽 (폐허: 군데군데 무너짐) · 동쪽 성문
      const wallColor = '#71717a';
      ctx.fillStyle = wallColor;
      const seg = (x, y, w, h) => ctx.fillRect(x, y, w, h);
      // 북 · 남 성벽
      [[0, 0.18], [0.24, 0.55], [0.63, 0.86], [0.9, 1]].forEach(([a, b]) => seg(I.x - wt + (I.w + wt * 2) * a, I.y - wt, (I.w + wt * 2) * (b - a), wt));
      [[0, 0.3], [0.37, 0.7], [0.76, 1]].forEach(([a, b]) => seg(I.x - wt + (I.w + wt * 2) * a, I.y + I.h, (I.w + wt * 2) * (b - a), wt));
      // 서쪽 성벽
      [[0, 0.4], [0.47, 1]].forEach(([a, b]) => seg(I.x - wt, I.y - wt + (I.h + wt * 2) * a, wt, (I.h + wt * 2) * (b - a)));
      // 동쪽 성벽 (가운데 성문 자리 비움)
      seg(I.x + I.w, I.y - wt, wt, (KINGDOM.road.y - KINGDOM.road.halfW) - (I.y - wt) - 6);
      seg(I.x + I.w, KINGDOM.road.y + KINGDOM.road.halfW + 6, wt, (I.y + I.h + wt) - (KINGDOM.road.y + KINGDOM.road.halfW + 6));
      // 성벽 톱니
      ctx.fillStyle = '#a1a1aa';
      for (let x = I.x - wt; x < I.x + I.w + wt; x += 28) {
        if (hash2(x, 1) > 0.25) ctx.fillRect(x, I.y - wt - 6, 14, 6);
      }
      // 무너진 자리 돌무더기
      drawRubble(ctx, I.x + I.w * 0.18, I.y - wt - 10, 90, 30, 1.1, 8);
      drawRubble(ctx, I.x + I.w * 0.7, I.y + I.h - 4, 90, 30, 2.3, 8);
      drawRubble(ctx, I.x - wt - 6, I.y + I.h * 0.42, 30, 90, 3.7, 8);
      // 성문 기둥
      ctx.fillStyle = '#52525b';
      ctx.fillRect(I.x + I.w - 4, KINGDOM.road.y - KINGDOM.road.halfW - 18, wt + 8, 18);
      ctx.fillRect(I.x + I.w - 4, KINGDOM.road.y + KINGDOM.road.halfW, wt + 8, 18);

      // 메인 성 · 건물 부지
      // 빈 칸은 폐허, 건물은 차지한 칸들을 덮는 크기로 그린다 (2 · 3칸 건물 대비)
      drawKingdomTiles(ctx);
      drawRuinedCastle(ctx); // 칸 바닥 위에 메인 성
      Object.entries(getKingdomState().sites).forEach(([anchor, b]) => {
        if (!b) return;
        const cells = (Array.isArray(b.cells) && b.cells.length ? b.cells : [anchor])
          .map(id => KINGDOM.cellById.get(id)).filter(Boolean);
        if (!cells.length) return;
        const rect = getKingdomCellsRect(cells);
        const movingThis = KingdomRuntime.placing && KingdomRuntime.placing.moveAnchor === anchor;
        ctx.save();
        if (movingThis) ctx.globalAlpha = 0.3; // 옮기는 중인 건물은 흐리게
        if (b.type === 'training_ground') {
          // 보내 주신 연병장 그림(js/35-parade-ground.js)을 차지한 칸 크기에 맞춰 늘려 그린다
          if (typeof drawMedievalParadeGround === 'function' && typeof getParadeGroundDimensions === 'function') {
            const dir = b.dir || 'DOWN';
            const dim = getParadeGroundDimensions(dir);
            const s = Math.min(rect.w / dim.w, rect.h / dim.h);
            ctx.save();
            ctx.translate(rect.x, rect.y);
            ctx.scale(s, s);
            drawMedievalParadeGround(ctx, { x: 0, y: 0, direction: dir, name: '연병장', level: 1, hideLabel: true }, false);
            ctx.restore();
            drawSiteSign(ctx, rect, '🚩 연병장', '#fde68a');
          } else {
            drawTrainingGround(ctx, rect, t);
          }
        }
        ctx.restore();
      });

      drawKingdomPlacementGhost(ctx); // 🏗️ 배치 미리보기

      // 왕국 이름판 (성문 위)
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      const title = '👑 왕국 성';
      const tw = ctx.measureText(title).width;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(KINGDOM.gateX - 110 - tw / 2 - 12, KINGDOM.road.y - 15, tw + 24, 30, 8); // 성문 안쪽 큰길 위 (부지 칸을 가리지 않게)
      ctx.fill();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fde68a';
      ctx.fillText(title, KINGDOM.gateX - 110, KINGDOM.road.y + 6);
    }

    if (typeof drawVillageGround === 'function') {
      const origDrawVillageGroundForKingdom = drawVillageGround;
      drawVillageGround = function (ctx, ...rest) {
        const r = origDrawVillageGroundForKingdom.call(this, ctx, ...rest);
        try { drawKingdomGround(ctx); } catch (err) { console.error('kingdom draw', err); }
        return r;
      };
    }

    // ---------- 헌터 출입 금지 ----------
    (function blockHuntersFromKingdom() {
      const origUpdateForKingdom = Hunter.prototype.update;
      Hunter.prototype.update = function (dt) {
        origUpdateForKingdom.call(this, dt);
        if (this.x < KINGDOM.villageEdgeX) {
          this.x = KINGDOM.villageEdgeX;
          if (Array.isArray(this.waypoints)) this.waypoints = this.waypoints.filter(w => !w || w.x >= KINGDOM.villageEdgeX);
        }
      };
    })();

    // ---------- 매 틱: 순찰 ----------
    if (typeof stepSimulation === 'function') {
      const origStepForKingdom = stepSimulation;
      stepSimulation = function (dt, ...rest) {
        const r = origStepForKingdom.call(this, dt, ...rest);
        try { updateKingdom(dt); } catch (_) {}
        return r;
      };
    }

    // ---------- 클릭: 왕국 부지 · 메인 성 · 병력 ----------
    function getKingdomSiteAt(wx, wy) {
      return KINGDOM.sites.find(s => Math.abs(wx - s.x) <= s.w / 2 && Math.abs(wy - s.y) <= s.h / 2) || null;
    }

    function isPointInCastle(wx, wy) {
      const c = KINGDOM.castle;
      return wx >= c.x && wx <= c.x + c.w && wy >= c.y && wy <= c.y + c.h;
    }

    function getKingdomUnitAt(wx, wy) {
      let best = null;
      let bestD = 26;
      KingdomRuntime.unitPos.forEach((pos) => {
        const d = Math.hypot(wx - pos.x, wy - (pos.y - 20));
        if (d < bestD) { bestD = d; best = pos.unit; }
      });
      return best;
    }

    function ensureKingdomModal() {
      if (document.getElementById('kingdomBackdrop')) return;
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div class="tier-modal-backdrop" id="kingdomBackdrop" style="z-index:44;">
          <div class="tier-modal" style="width:min(95vw,520px);">
            <div class="panel-header">
              <div class="panel-title"><span>👑</span><span id="kingdomModalTitle">왕국 성</span></div>
              <button class="btn-close" id="btnCloseKingdom">✕</button>
            </div>
            <div class="tier-modal-body" id="kingdomBody"></div>
          </div>
        </div>
      `;
      document.body.appendChild(wrap.firstElementChild);
      const bd = document.getElementById('kingdomBackdrop');
      document.getElementById('btnCloseKingdom').addEventListener('click', () => bd.classList.remove('open'));
      bd.addEventListener('click', (e) => { if (e.target === bd) bd.classList.remove('open'); });
      document.getElementById('kingdomBody').addEventListener('click', (e) => {
        const b = e.target.closest('[data-kingdom-build]');
        if (b) {
          bd.classList.remove('open');
          startKingdomPlacement('training_ground', KINGDOM.cellById.get(b.getAttribute('data-kingdom-build')), null);
          return;
        }
        const mv = e.target.closest('[data-kingdom-move]');
        if (mv) {
          bd.classList.remove('open');
          const anchor = mv.getAttribute('data-kingdom-move');
          const rec = getKingdomState().sites[anchor];
          if (rec) startKingdomPlacement(rec.type, KINGDOM.cellById.get(anchor), anchor);
          return;
        }
        const dirBtn = e.target.closest('[data-kingdom-dir]');
        if (dirBtn) {
          KingdomRuntime.buildDir = dirBtn.getAttribute('data-kingdom-dir');
          openKingdomSitePanel(KINGDOM.cellById.get(dirBtn.getAttribute('data-kingdom-dir-site')));
          return;
        }
        const rot = e.target.closest('[data-kingdom-rotate]');
        if (rot) { rotateKingdomBuilding(rot.getAttribute('data-kingdom-rotate')); return; }
        const cl = e.target.closest('[data-kingdom-clear]');
        if (cl) {
          const id = cl.getAttribute('data-kingdom-clear');
          const added = toggleKingdomClearOrder(id);
          showToast(added ? '🧹 근위병에게 정리를 지시했습니다.' : '🧹 정리 지시를 취소했습니다.');
          if (typeof scheduleAutoSave === 'function') scheduleAutoSave(800);
          openKingdomSitePanel(KINGDOM.cellById.get(id));
        }
        if (e.target.closest('[data-kingdom-order-mode]')) {
          bd.classList.remove('open');
          setKingdomOrderMode(true);
        }
      });
    }

    function renderKingdomForcesHtml() {
      const units = getKingdomUnits();
      if (units.length === 0) {
        return '<div class="kingdom-note">아직 왕국 병력이 없습니다. 🎖️ 토벌 포인트 상점에서 황실 근위병을 영입할 수 있습니다 (준비 중).</div>';
      }
      const rows = units.map((u) => {
        const s = getKingdomUnitStats(u);
        return `<div class="kingdom-unit-row">
          <span>${u.rank === 'captain' ? '👑' : '🛡️'} ${typeof getKingdomGradeHtml === "function" ? getKingdomGradeHtml(u) + " " : ""}<b>${u.name}</b> <span style="color:#94a3b8;">${(KINGDOM_RANKS[u.rank] || KINGDOM_RANKS.guard).name} · Lv.${u.level || 1}</span></span>
          <span style="color:#fde68a;font-weight:800;">⚡ 전투력 ${s.power.toLocaleString()}</span>
        </div>`;
      }).join('');
      const captains = units.filter(u => u.rank === 'captain').length;
      return `<div class="kingdom-note">왕국 병력 ${units.length}명 (근위대장 ${captains} · 근위병 ${units.length - captains}) · 부대 ${KingdomRuntime.squads.length}개가 순찰 중</div>${rows}`;
    }

    function openKingdomSitePanel(site) {
      ensureKingdomModal();
      const st = getKingdomState();
      const built = site ? getKingdomBuildingOnCell(site.id) : null; // 여러 칸 건물이면 어느 칸을 눌러도 같은 건물
      const hasGuard = st.units.length > 0;
      let html = '';
      if (!site) {
        document.getElementById('kingdomModalTitle').textContent = '메인 성 (폐허)';
        html += '<div class="kingdom-note">왕국의 중심이 될 메인 성입니다. 지금은 무너진 폐허로, 추후 복구할 수 있습니다.</div>';
        html += '<div class="kingdom-sub">👑 왕국 병력 (헌터 · 경비병과 따로 관리)</div>';
        html += renderKingdomForcesHtml();
      } else if (built && built.type === 'training_ground') {
        const dirLabel = (KINGDOM_DIRS.find(d => d.id === (built.dir || 'DOWN')) || KINGDOM_DIRS[0]).label;
        document.getElementById('kingdomModalTitle').textContent = '🚩 연병장';
        html += `<div class="kingdom-note">황실 근위병이 훈련하는 연병장입니다 (${built.cols}×${built.rows}칸 · 입구 ${dirLabel}). 근위병과 근위대장은 왕국 성과 마을을 순찰합니다.</div>`;
        html += `<button type="button" class="btn-upgrade" data-kingdom-rotate="${built.anchor}" style="width:100%;">🔄 방향 돌리기 (상 · 하 · 좌 · 우)</button>`;
        html += `<button type="button" class="btn-upgrade" data-kingdom-move="${built.anchor}" style="width:100%;margin-top:6px;background:linear-gradient(135deg,#0f766e,#115e59);">📍 위치 옮기기 (무료)</button>`;
        html += '<div class="kingdom-sub">👑 왕국 병력</div>';
        html += renderKingdomForcesHtml();
      } else {
        const tgDef = KINGDOM_BUILDINGS.training_ground;
        const cleared = isKingdomCellCleared(site.id);
        document.getElementById('kingdomModalTitle').textContent = cleared ? '🌱 정리된 부지' : '🔨 왕국 부지';
        html += cleared
          ? '<div class="kingdom-note">폐허를 치운 깨끗한 부지입니다. 건물을 짓거나 꾸미기(도로 · 나무 · 화단 · 분수대 등 · 추후 추가)를 놓을 수 있습니다.</div>'
          : `<div class="kingdom-note">무너진 왕국 부지입니다. 근위병에게 정리를 맡기거나, 바로 건물을 지을 수 있습니다 (지은 자리는 자동으로 정리). 건물은 누른 칸을 중심으로 여러 칸을 차지합니다 (연병장 ${tgDef.cols}×${tgDef.rows}칸 · 방향을 돌리면 ${tgDef.rows}×${tgDef.cols}칸).</div>`;
        // 🧹 근위병 폐허 정리
        if (!cleared) {
          html += '<div class="kingdom-sub">🧹 폐허 정리</div>';
          if (!hasGuard) {
            html += '<div class="kingdom-note" style="color:#fca5a5;">🔒 황실 근위병이 있어야 폐허를 정리할 수 있습니다.</div>';
          } else {
            const pos = st.clearQueue.indexOf(site.id);
            const perTile = Math.round(KINGDOM.clearMemberSec / Math.min(KINGDOM.squadSize + 1, Math.max(1, st.units.length)));
            html += pos >= 0
              ? `<div class="kingdom-note">⏳ 정리 대기 중 (${pos + 1}번째 · 전체 ${st.clearQueue.length}칸)</div><button type="button" class="btn-upgrade" data-kingdom-clear="${site.id}" style="width:100%;background:rgba(51,65,85,0.85);box-shadow:none;">지시 취소</button>`
              : `<button type="button" class="btn-upgrade" data-kingdom-clear="${site.id}" style="width:100%;">🧹 근위병에게 정리 지시</button>`;
            html += `<button type="button" class="btn-upgrade" data-kingdom-order-mode="1" style="width:100%;margin-top:6px;background:linear-gradient(135deg,#0f766e,#115e59);">🧹 여러 칸 지시 모드 (칸을 누를 때마다 지시 · 취소)</button>`;
            html += `<div class="kingdom-soon">근위병 부대가 왕국을 순찰하다 가까운 칸부터 치웁니다. 한 칸에 약 ${perTile}초 (부대 인원이 많을수록 빠름).</div>`;
          }
          html += '<div class="kingdom-sub">🏗️ 건물</div>';
        }
        if (hasTrainingGround()) {
          html += '<div class="kingdom-note" style="color:#94a3b8;">연병장은 이미 지었습니다. 다른 건물은 추후 추가될 예정입니다.</div>';
        } else if (!hasGuard) {
          html += '<div class="kingdom-note" style="color:#fca5a5;">🔒 첫 황실 근위병을 영입하면 연병장을 지을 수 있습니다. (왕국으로 가는 돌다리도 그때 복구됩니다)</div>';
        } else {
          const cost = KINGDOM.trainingGroundCost;
          const ok = (gameState.gold || 0) >= cost;
          html += `<button type="button" class="btn-upgrade" data-kingdom-build="${site.id}" ${ok ? '' : 'disabled'} style="width:100%;">🚩 연병장 건설 · 위치 고르기 (${tgDef.cols}×${tgDef.rows}칸 · ${formatGold(cost)} G)</button>`;
          html += '<div class="kingdom-soon">누르면 미리보기가 나옵니다. 원하는 칸을 눌러 자리를 옮기고, 방향을 돌린 뒤 [여기에 짓기]를 누르세요.</div>';
          if (!ok) html += '<div class="kingdom-note" style="color:#fca5a5;">골드가 부족합니다.</div>';
        }
        html += `<div class="kingdom-soon">🛡️ 기사단 · 🔮 마탑: 추후 추가 예정</div>`;
      }
      document.getElementById('kingdomBody').innerHTML = html;
      document.getElementById('kingdomBackdrop').classList.add('open');
    }

    function buildKingdomTrainingGround(siteId) {
      const st = getKingdomState();
      const site = KINGDOM.cellById.get(siteId);
      const def = KINGDOM_BUILDINGS.training_ground;
      const dir = KingdomRuntime.buildDir || 'DOWN';
      const size = getKingdomBuildingSize(def, dir);
      const cells = findKingdomPlacementAround(site, size.cols, size.rows); // 누른 칸을 포함하는 자리
      if (!site || !cells) { showToast('⚠️ 이 근처에는 연병장이 들어갈 빈 자리가 없습니다.'); return false; }
      if (st.units.length === 0) { showToast('🔒 첫 황실 근위병을 영입해야 연병장을 지을 수 있습니다.'); return false; }
      if (hasTrainingGround()) { showToast('⚠️ 연병장은 이미 있습니다.'); return false; }
      const cost = KINGDOM.trainingGroundCost;
      if ((gameState.gold || 0) < cost) { showToast(`⚠️ 골드가 부족합니다! (${formatGold(cost)} G 필요)`); return false; }
      gameState.gold -= cost;
      st.sites[cells[0].id] = { type: 'training_ground', dir, cols: size.cols, rows: size.rows, cells: cells.map(c => c.id), builtAt: Date.now() }; // 기준 = 왼쪽 위 칸
      markKingdomCellsCleared(cells.map(c => c.id)); // 건물을 지으면 그 자리 폐허는 자동 정리
      updateResourceHUD();
      showToast(`⚔️ 왕국 성에 연병장을 지었습니다! (-${formatGold(cost)} G)`);
      if (typeof flushSyncBackup === 'function') flushSyncBackup();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
      openKingdomSitePanel(site);
      return true;
    }

    // ============================================================================
    // 🏗️ 배치 모드: 유저가 원하는 자리에 건물 짓기 · 옮기기
    //   - 미리보기(반투명 건물)가 나오고, 칸을 누르면 그 칸을 가운데로 미리보기가 옮겨진다.
    //   - 초록 테두리 = 지을 수 있음 · 빨강 = 다른 건물 · 메인 성과 겹치거나 구역 밖.
    //   - 화면 위 줄: [🔄 방향] [✅ 여기에 짓기 / 옮기기] [취소]
    //   - 건물은 큰길로 나뉜 위 · 아래 구역 중 한 구역 안에만 들어간다.
    // ============================================================================
    function getKingdomBlock(id) {
      return KINGDOM.blocks.find(b => b.id === id) || null;
    }

    function getPlacementSize(P) {
      return getKingdomBuildingSize(KINGDOM_BUILDINGS[P.type], P.dir);
    }

    // 누른 칸을 가운데로, 구역 안에 들어가게 기준(왼쪽 위) 칸을 맞춘다
    function setKingdomPlacementCenter(cell) {
      const P = KingdomRuntime.placing;
      if (!P || !cell) return;
      const b = getKingdomBlock(cell.block);
      const size = getPlacementSize(P);
      P.block = cell.block;
      P.row = Math.max(0, Math.min(b.rows - size.rows, cell.row - Math.floor(size.rows / 2)));
      P.col = Math.max(0, Math.min(b.cols - size.cols, cell.col - Math.floor(size.cols / 2)));
      P.centerCellId = cell.id;
    }

    // 미리보기 자리 정보: 칸 목록 · 사각형 · 지을 수 있는지
    function getKingdomPlacementInfo() {
      const P = KingdomRuntime.placing;
      if (!P) return null;
      const b = getKingdomBlock(P.block);
      const size = getPlacementSize(P);
      const T = KINGDOM.tile;
      const rect = { x: b.x0 + (P.col + size.cols / 2) * T, y: b.y0 + (P.row + size.rows / 2) * T, w: size.cols * T, h: size.rows * T };
      const fits = P.row + size.rows <= b.rows && P.col + size.cols <= b.cols;
      const cells = [];
      let ok = fits;
      let reason = fits ? '' : '구역 밖';
      for (let r = 0; r < size.rows && ok; r++) {
        for (let c = 0; c < size.cols; c++) {
          const cell = getKingdomCell(P.block, P.row + r, P.col + c);
          if (!cell) { ok = false; reason = '메인 성과 겹침'; break; }
          const occ = getKingdomBuildingOnCell(cell.id);
          if (occ && occ.anchor !== P.moveAnchor) { ok = false; reason = '다른 건물과 겹침'; break; }
          cells.push(cell);
        }
      }
      return { ok, reason, cells, rect, size };
    }

    function startKingdomPlacement(type, cell, moveAnchor = null) {
      const def = KINGDOM_BUILDINGS[type];
      if (!def || !cell) return false;
      if (!moveAnchor) {
        if (getKingdomState().units.length === 0) { showToast('🔒 첫 황실 근위병을 영입해야 지을 수 있습니다.'); return false; }
        if (type === 'training_ground' && hasTrainingGround()) { showToast('⚠️ 연병장은 이미 있습니다.'); return false; }
      }
      setKingdomOrderMode(false);
      const rec = moveAnchor ? getKingdomState().sites[moveAnchor] : null;
      KingdomRuntime.placing = { type, dir: (rec && rec.dir) || KingdomRuntime.buildDir || 'DOWN', moveAnchor };
      if (rec) {
        // 옮길 때는 지금 자리 그대로에서 시작
        const first = KINGDOM.cellById.get((rec.cells && rec.cells[0]) || moveAnchor);
        KingdomRuntime.placing.block = first.block;
        KingdomRuntime.placing.row = first.row;
        KingdomRuntime.placing.col = first.col;
      } else {
        setKingdomPlacementCenter(cell);
      }
      const info = getKingdomPlacementInfo();
      if (info && typeof camera !== 'undefined') { camera.targetX = info.rect.x; camera.targetY = info.rect.y; }
      renderKingdomPlacementBar();
      return true;
    }

    function rotateKingdomPlacement() {
      const P = KingdomRuntime.placing;
      if (!P || !KINGDOM_BUILDINGS[P.type].rotatable) return;
      const info = getKingdomPlacementInfo();
      const order = ['DOWN', 'LEFT', 'UP', 'RIGHT'];
      P.dir = order[(order.indexOf(P.dir) + 1) % 4];
      // 지금 가운데 칸을 기준으로 다시 맞춘다
      const b = getKingdomBlock(P.block);
      const cr = Math.floor((info.rect.y - b.y0) / KINGDOM.tile);
      const cc = Math.floor((info.rect.x - b.x0) / KINGDOM.tile);
      const center = { block: P.block, row: Math.max(0, Math.min(b.rows - 1, cr)), col: Math.max(0, Math.min(b.cols - 1, cc)) };
      setKingdomPlacementCenter(center);
      renderKingdomPlacementBar();
    }

    function cancelKingdomPlacement() {
      KingdomRuntime.placing = null;
      renderKingdomPlacementBar();
    }

    function confirmKingdomPlacement() {
      const P = KingdomRuntime.placing;
      if (!P) return false;
      const info = getKingdomPlacementInfo();
      if (!info.ok) { showToast(`⚠️ 여기에는 지을 수 없습니다 (${info.reason}).`); return false; }
      const st = getKingdomState();
      const def = KINGDOM_BUILDINGS[P.type];
      const ids = info.cells.map(c => c.id);
      if (P.moveAnchor) {
        const rec = st.sites[P.moveAnchor];
        if (!rec) { cancelKingdomPlacement(); return false; }
        delete st.sites[P.moveAnchor];
        st.sites[ids[0]] = { ...rec, dir: P.dir, cols: info.size.cols, rows: info.size.rows, cells: ids };
        showToast(`📍 ${def.name}을(를) 옮겼습니다.`);
      } else {
        if (st.units.length === 0) { showToast('🔒 첫 황실 근위병을 영입해야 지을 수 있습니다.'); return false; }
        if (P.type === 'training_ground' && hasTrainingGround()) { showToast('⚠️ 연병장은 이미 있습니다.'); cancelKingdomPlacement(); return false; }
        const cost = KINGDOM.trainingGroundCost;
        if ((gameState.gold || 0) < cost) { showToast(`⚠️ 골드가 부족합니다! (${formatGold(cost)} G 필요)`); return false; }
        gameState.gold -= cost;
        st.sites[ids[0]] = { type: P.type, dir: P.dir, cols: info.size.cols, rows: info.size.rows, cells: ids, builtAt: Date.now() };
        updateResourceHUD();
        showToast(`🚩 왕국 성에 ${def.name}을(를) 지었습니다! (-${formatGold(cost)} G)`);
      }
      markKingdomCellsCleared(ids); // 건물 자리 폐허는 자동 정리
      KingdomRuntime.buildDir = P.dir;
      KingdomRuntime.placing = null;
      renderKingdomPlacementBar();
      if (typeof flushSyncBackup === 'function') flushSyncBackup();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
      return true;
    }

    function renderKingdomPlacementBar() {
      let bar = document.getElementById('kingdomPlaceBar');
      const P = KingdomRuntime.placing;
      if (!P) {
        if (bar) bar.remove();
        return;
      }
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'kingdomPlaceBar';
        bar.className = 'kingdom-order-bar kingdom-place-bar';
        document.body.appendChild(bar);
        bar.addEventListener('click', (e) => {
          if (e.target.closest('[data-place-rotate]')) rotateKingdomPlacement();
          else if (e.target.closest('[data-place-ok]')) confirmKingdomPlacement();
          else if (e.target.closest('[data-place-cancel]')) cancelKingdomPlacement();
        });
      }
      const def = KINGDOM_BUILDINGS[P.type];
      const info = getKingdomPlacementInfo();
      const dirLabel = (KINGDOM_DIRS.find(d => d.id === P.dir) || {}).label || P.dir;
      const okText = P.moveAnchor ? '✅ 여기로 옮기기' : `✅ 여기에 짓기 (${formatGold(KINGDOM.trainingGroundCost)} G)`;
      bar.innerHTML = `
        <span>🏗️ <b>${def.name}</b> ${info.size.cols}×${info.size.rows}칸 · 입구 ${dirLabel} · 원하는 칸을 누르세요
          <b style="color:${info.ok ? '#86efac' : '#fca5a5'};">${info.ok ? '· 지을 수 있음' : `· ${info.reason}`}</b></span>
        <span class="kingdom-place-btns">
          ${def.rotatable ? '<button type="button" data-place-rotate="1">🔄 방향</button>' : ''}
          <button type="button" data-place-ok="1" ${info.ok ? '' : 'disabled'}>${okText}</button>
          <button type="button" data-place-cancel="1" class="ghost">취소</button>
        </span>`;
    }

    // 미리보기 그리기 (지형 위 · 병력 아래)
    function drawKingdomPlacementGhost(ctx) {
      const P = KingdomRuntime.placing;
      if (!P) return;
      const info = getKingdomPlacementInfo();
      const r = info.rect;
      ctx.save();
      ctx.globalAlpha = 0.6;
      if (P.type === 'training_ground' && typeof drawMedievalParadeGround === 'function') {
        const dim = getParadeGroundDimensions(P.dir);
        const s = Math.min(r.w / dim.w, r.h / dim.h);
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.scale(s, s);
        drawMedievalParadeGround(ctx, { x: 0, y: 0, direction: P.dir, name: KINGDOM_BUILDINGS[P.type].name, level: 1, hideLabel: true }, false);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = info.ok ? 'rgba(34, 197, 94, 0.16)' : 'rgba(239, 68, 68, 0.22)';
      ctx.fillRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h);
      ctx.strokeStyle = info.ok ? '#4ade80' : '#f87171';
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h);
      ctx.restore();
    }

    // 🔄 건물 방향 돌리기: 하 → 좌 → 상 → 우 순서로, 같은 자리(가운데)에서 들어갈 수 있는 다음 방향으로 돌린다
    function rotateKingdomBuilding(anchor) {
      const st = getKingdomState();
      const rec = st.sites[anchor];
      const def = rec ? KINGDOM_BUILDINGS[rec.type] : null;
      if (!rec || !def || !def.rotatable) return false;
      const oldCells = (rec.cells || [anchor]).map(id => KINGDOM.cellById.get(id)).filter(Boolean);
      const rect = getKingdomCellsRect(oldCells);
      let center = oldCells[0];
      let bestD = Infinity;
      oldCells.forEach((c) => { const d = Math.hypot(c.x - rect.x, c.y - rect.y); if (d < bestD) { bestD = d; center = c; } });
      const order = ['DOWN', 'LEFT', 'UP', 'RIGHT'];
      let dir = rec.dir || 'DOWN';
      delete st.sites[anchor]; // 자기 자리는 비운 채로 새 자리를 찾는다
      for (let i = 0; i < 3; i++) {
        dir = order[(order.indexOf(dir) + 1) % 4];
        const size = getKingdomBuildingSize(def, dir);
        const cells = findKingdomPlacementAround(center, size.cols, size.rows);
        if (cells) {
          st.sites[cells[0].id] = { ...rec, dir, cols: size.cols, rows: size.rows, cells: cells.map(c => c.id) };
          markKingdomCellsCleared(cells.map(c => c.id));
          showToast(`🔄 ${def.name} 방향: ${(KINGDOM_DIRS.find(d => d.id === dir) || {}).label || dir}`);
          if (typeof scheduleAutoSave === 'function') scheduleAutoSave(500);
          openKingdomSitePanel(cells[0]);
          return true;
        }
      }
      st.sites[anchor] = rec; // 둘 곳이 없으면 그대로
      showToast('⚠️ 돌릴 공간이 부족합니다. (다른 방향은 가로 · 세로 칸 수가 바뀝니다)');
      return false;
    }

    function openKingdomUnitPanel(u) {
      ensureKingdomModal();
      const s = getKingdomUnitStats(u);
      const r = KINGDOM_RANKS[u.rank] || KINGDOM_RANKS.guard;
      const lv = u.level || 1;
      const maxed = lv >= KINGDOM_MAX_LEVEL;
      const req = getKingdomRequiredExp(lv);
      const pct = maxed ? 100 : Math.min(100, ((u.exp || 0) / req) * 100);
      const secLeft = maxed ? 0 : Math.max(0, (req - (u.exp || 0)) / Math.max(1e-9, KINGDOM_EXP_PER_SEC * getExpRate('kingdom')));
      const fmtLeft = secLeft >= 3600 ? `${Math.floor(secLeft / 3600)}시간 ${Math.floor((secLeft % 3600) / 60)}분` : `${Math.max(1, Math.ceil(secLeft / 60))}분`;
      document.getElementById('kingdomModalTitle').textContent = `${u.rank === 'captain' ? '👑' : '🛡️'} ${u.name}`;
      document.getElementById('kingdomBody').innerHTML = `
        <div class="kingdom-unit-card">
          ${r.img ? `<img src="assets/royal_guard/${r.img[u.gender] || r.img.m}.png" alt="" draggable="false">` : ''}
          <div style="flex:1;min-width:0;">
            <div style="font-weight:800;color:#fde68a;">${typeof getKingdomGradeHtml === "function" ? getKingdomGradeHtml(u) + " " : ""}${r.name} · Lv.${lv}${maxed ? ' (MAX)' : ''}</div>
            <div style="margin-top:4px;color:#fde047;font-weight:800;">⚡ 전투력 ${s.power.toLocaleString()}</div>
            <div style="margin-top:4px;color:#cbd5e1;">❤️ 체력 ${s.maxHp.toLocaleString()} · ⚔️ 공격 ${s.atk.toLocaleString()} · 🛡️ 방어 ${s.def.toLocaleString()} · 💥 치명 ${s.crit}%</div>
            <div class="kingdom-exp-track"><div style="width:${pct.toFixed(1)}%"></div></div>
            <div style="margin-top:3px;color:#94a3b8;font-size:11px;">${maxed ? '최대 레벨' : `경험치 ${Math.floor(u.exp || 0).toLocaleString()} / ${req.toLocaleString()} · 다음 레벨까지 약 ${fmtLeft}`}</div>
            <div style="margin-top:4px;color:#94a3b8;font-size:11.5px;">왕국 병력 · 왕국 성과 마을을 부대로 순찰 중</div>
          </div>
        </div>`;
      document.getElementById('kingdomBackdrop').classList.add('open');
    }

    // ---------- 🧹 여러 칸 지시 모드 (화면 위 안내 줄) ----------
    function renderKingdomOrderBar() {
      let bar = document.getElementById('kingdomOrderBar');
      if (!KingdomRuntime.orderMode) {
        if (bar) bar.remove();
        return;
      }
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'kingdomOrderBar';
        bar.className = 'kingdom-order-bar';
        document.body.appendChild(bar);
        bar.addEventListener('click', (e) => {
          if (e.target.closest('[data-kingdom-order-end]')) setKingdomOrderMode(false);
        });
      }
      const n = getKingdomState().clearQueue.length;
      bar.innerHTML = `<span>🧹 폐허 칸을 누르면 정리 지시 · 다시 누르면 취소 <b>(대기 ${n}칸)</b></span><button type="button" data-kingdom-order-end="1">끝내기</button>`;
    }

    function setKingdomOrderMode(on) {
      KingdomRuntime.orderMode = Boolean(on);
      renderKingdomOrderBar();
      if (on) showToast('🧹 여러 칸 지시 모드: 폐허 칸을 누를 때마다 정리 지시 · 취소됩니다.');
    }

    (function bindKingdomClicks() {
      const cv = typeof canvas !== 'undefined' ? canvas : document.getElementById('gameCanvas');
      if (!cv) return;
      // 헌터 · 부지 클릭(11-ui-actions.js)보다 먼저 확인
      cv.addEventListener('click', (e) => {
        if (camera.hasMoved) return;
        const w = camera.screenToWorld(e.clientX, e.clientY);
        if (KingdomRuntime.placing && w.x < KINGDOM.villageEdgeX) {
          // 🏗️ 배치 모드: 누른 칸으로 미리보기를 옮긴다 (왕국 안 다른 클릭은 무시)
          e.stopImmediatePropagation();
          const cell = getKingdomSiteAt(w.x, w.y);
          if (cell) { setKingdomPlacementCenter(cell); renderKingdomPlacementBar(); }
          return;
        }
        const unit = getKingdomUnitAt(w.x, w.y);
        if (unit) {
          e.stopImmediatePropagation();
          openKingdomUnitPanel(unit);
          return;
        }
        if (w.x >= KINGDOM.villageEdgeX - 10) return; // 마을 쪽은 원래 동작
        const site = getKingdomSiteAt(w.x, w.y);
        if (site && KingdomRuntime.orderMode) {
          // 🧹 여러 칸 지시 모드: 누를 때마다 지시 · 취소 (창을 열지 않음)
          e.stopImmediatePropagation();
          if (canOrderKingdomClear(site.id) || getKingdomState().clearQueue.includes(site.id)) {
            toggleKingdomClearOrder(site.id);
            if (typeof scheduleAutoSave === 'function') scheduleAutoSave(800);
          }
          renderKingdomOrderBar();
          return;
        }
        if (site) {
          e.stopImmediatePropagation();
          openKingdomSitePanel(site);
          return;
        }
        if (isPointInCastle(w.x, w.y)) {
          e.stopImmediatePropagation();
          openKingdomSitePanel(null);
        }
      }, true);
    })();

    // ---------- 저장 불러오기 ----------
    if (typeof applyLoadedSaveData === 'function') {
      const origApplyForKingdom = applyLoadedSaveData;
      applyLoadedSaveData = function (...args) {
        const r = origApplyForKingdom.apply(this, args);
        try {
          const st = getKingdomState();
          // 없는 칸을 가리키는 건물 기록은 정리 (예전 4칸 부지 시절 테스트 데이터 등)
          Object.keys(st.sites).forEach((id) => { if (!KINGDOM.sites.some(s => s.id === id)) delete st.sites[id]; });
          rebuildKingdomSquads();
        } catch (_) {}
        return r;
      };
    }
    getKingdomState();
    rebuildKingdomSquads();

    // 게임을 꺼 둔 동안: 자리 비운 보상(24-offline-rewards.js)과 같은 규칙으로 왕국 병력도 경험치 (최대 12시간 · 80%)
    (function hookKingdomOfflineExp() {
      const orig = window.grantOfflineRewardsForSeconds;
      if (typeof orig !== 'function') return;
      window.grantOfflineRewardsForSeconds = function (awaySec, ...rest) {
        try {
          const cfg = typeof OFFLINE_REWARD_CFG !== 'undefined' ? OFFLINE_REWARD_CFG : { minSeconds: 60, maxSeconds: 12 * 3600, efficiency: 0.8 };
          const sec = Math.max(0, Number(awaySec) || 0);
          if (sec >= cfg.minSeconds) gainKingdomExpForSeconds(Math.min(cfg.maxSeconds, sec) * cfg.efficiency); // 헌터와 같은 규칙 (최대 12시간 · 80%)
        } catch (_) {}
        return orig.call(this, awaySec, ...rest);
      };
    })();
