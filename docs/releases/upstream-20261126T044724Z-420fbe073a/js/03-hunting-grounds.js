// [03-hunting-grounds] 사냥터 정의 · 천공의 섬 필드
    /**
     * ============================================================================
     * 확장형 사냥터 시스템 (초보 사냥터 오픈 + 레벨 구간별 경험치 보정 & 헌터 선호도 AI)
     * - 향후 중급/상급/무법 PK 사냥터 추가 시 HUNTING_GROUNDS 배열에 등록하면 자동 연동
     * ============================================================================
     */
    const HUNTING_GROUNDS = [
      {
        id: 'beginner_field',
        name: '초보 사냥터 (고요한 초원)',
        icon: '🌿',
        zoneType: 'NORMAL_HUNT',
        minRecLv: 1,
        maxRecLv: 20,
        bounds: { x: 610, y: -340, w: 780, h: 680 },
        centerX: 960,
        centerY: 0,
        baseExp: 38,
        baseGold: 22,
        lootSpec: {
          itemId: 'loot_beginner_crystal',
          tierKey: 'beginner',
          name: '초원 풀잎 결정',
          icon: '🌱',
          dropChance: 0.45,
          valueMultiplier: 1.0
        },
        baseMonsterCount: 6,
        maxMonsterCount: 18,
        miniBossConfig: {
          bossStageRef: 1,
          kind: 'field_miniboss',
          bossTheme: 'meadow_slime',
          name: '👑 초원의 수호왕 슬라임 [중간 보스]',
          insigniaId: 'insignia_beginner',
          color: '#10b981',
          stroke: '#fde047',
          isRanged: false,
          range: 38,
          respawnDelay: 22
        },
        monsterTemplates: [
          { kind: 'slime',      name: '초록 슬라임',   color: '#4ade80', stroke: '#15803d', hp: 850,  atk: 43, isRanged: false, range: 26 },
          { kind: 'hornrabbit', name: '뿔 토끼',       color: '#f8fafc', stroke: '#94a3b8', hp: 975,  atk: 50, isRanged: false, range: 26 },
          { kind: 'goblin',     name: '숲 고블린궁수', color: '#65a30d', stroke: '#365314', hp: 1150, atk: 62, isRanged: true,  range: 148 },
          { kind: 'kingslime',  name: '킹 슬라임',     color: '#38bdf8', stroke: '#0369a1', hp: 1400, atk: 73, isRanged: false, range: 28 }
        ],
        // 1~10레벨: 경험치 1.5배(+50% 증가), 11~20레벨: 1.0배(기본), 21레벨 이상: 경험치 90% 감소(0.1배)
        getExpMultiplier(hunterLevel) {
          if (hunterLevel <= 10) return 1.5;
          if (hunterLevel <= 20) return 1.0;
          return 0.1;
        },
        monsters: []
      },
      {
        id: 'mid_field_20_40',
        name: '중급 사냥터 (안개 협곡)',
        icon: '⛰️',
        zoneType: 'NORMAL_HUNT',
        minRecLv: 20,
        maxRecLv: 40,
        bounds: { x: 610, y: 365, w: 780, h: 420 },
        centerX: 980,
        centerY: 575,
        // 초보 사냥터(y: -340~340)를 관통해 남쪽 경계(y: 340~365)를 넘어 진입하는 경유 경로
        routeThroughBeginnerWaypoints: [
          { x: 960, y: 120 },
          { x: 960, y: 255 },
          { x: 960, y: 353 }
        ],
        baseExp: 145,
        baseGold: 78,
        goldDropRange: { min: 200, max: 500 },
        lootSpec: {
          itemId: 'loot_mid_ore',
          tierKey: 'mid',
          name: '협곡 강철 광석',
          icon: '⛏️',
          dropChance: 0.52,
          valueMultiplier: 2.6
        },
        baseMonsterCount: 6,
        maxMonsterCount: 18,
        miniBossConfig: {
          bossStageRef: 2,
          kind: 'field_miniboss',
          bossTheme: 'canyon_golem',
          name: '👑 협곡의 강철 거신병 [중간 보스]',
          insigniaId: 'insignia_mid',
          color: '#64748b',
          stroke: '#38bdf8',
          isRanged: false,
          range: 42,
          respawnDelay: 28
        },
        monsterTemplates: [
          { kind: 'irongolem',  name: '철갑 골렘',     color: '#94a3b8', stroke: '#334155', hp: 3600, atk: 145, isRanged: false, range: 30 },
          { kind: 'shadowwolf', name: '그림자 늑대',   color: '#475569', stroke: '#0f172a', hp: 3100, atk: 162, isRanged: false, range: 28 },
          { kind: 'manaorc',    name: '마력 오크사수', color: '#a855f7', stroke: '#581c87', hp: 3400, atk: 175, isRanged: true,  range: 156 },
          { kind: 'kingslime',  name: '고대 수호슬라임',color: '#f59e0b', stroke: '#92400e', hp: 4400, atk: 190, isRanged: false, range: 32 }
        ],
        // 20~40레벨 적정 구간 기본 경험치 적용 (추가 보너스 미적용)
        getExpMultiplier(hunterLevel) {
          if (hunterLevel >= 20 && hunterLevel <= 40) return 1.0;
          if (hunterLevel > 40) return 0.25;
          return 0.35;
        },
        monsters: []
      },
      {
        id: 'rebirth_sanctuary_field',
        name: '윤회의 성역 (환생 전용 · 1환생↑)',
        icon: '🌠',
        zoneType: 'NORMAL_HUNT',
        minRebirth: 1,
        minRecLv: 1,
        maxRecLv: 99,
        bounds: { x: 1430, y: 365, w: 780, h: 420 },
        centerX: 1820,
        centerY: 575,
        baseExp: 980,
        baseGold: 1040,
        goldDropRange: { min: 3000, max: 7600 },
        lootSpec: {
          itemId: 'loot_rebirth_essence',
          tierKey: 'rebirth',
          name: '윤회 성역의 영혼결정',
          icon: '🌠',
          dropChance: 0.65,
          valueMultiplier: 12.0
        },
        baseMonsterCount: 6,
        maxMonsterCount: 30,
        maxCountedHunters: 8,
        miniBossConfig: {
          bossStageRef: 6,
          kind: 'field_miniboss',
          bossTheme: 'gray_doppelganger_king',
          name: '👑 도플갱어 군주 [중간 보스]',
          insigniaId: null,
          atkMultiplier: 1.5,
          color: '#9ca3af',
          stroke: '#e5e7eb',
          isRanged: false,
          range: 46,
          respawnDelay: 36
        },
        monsterTemplates: [
          { kind: 'doppelganger', doppelJob: '팔라딘', doppelGender: 'M', name: '도플갱어 수호기사', color: '#9ca3af', stroke: '#e5e7eb', hp: 26000, atk: 510, isRanged: false, range: 32 },
          { kind: 'doppelganger', doppelJob: '버서커', doppelGender: 'F', name: '도플갱어 광전사',   color: '#9ca3af', stroke: '#e5e7eb', hp: 23500, atk: 563, isRanged: false, range: 30 },
          { kind: 'doppelganger', doppelJob: '소서러', doppelGender: 'F', name: '도플갱어 마도사',   color: '#9ca3af', stroke: '#e5e7eb', hp: 25000, atk: 593, isRanged: true,  range: 168 },
          { kind: 'doppelganger', doppelJob: '레인저', doppelGender: 'M', name: '도플갱어 추적자',   color: '#9ca3af', stroke: '#e5e7eb', hp: 32000, atk: 645, isRanged: true,  range: 164 }
        ],
        // 환생 헌터 전 구간(Lv.1~99) 기본 경험치 적용 (추가 보너스 미적용)
        getExpMultiplier(hunterLevel) {
          return 1.0;
        },
        monsters: []
      },
      {
        id: 'high_field_40_70',
        name: '상급 사냥터 (용암 화산지대 · PvP 무법지대)',
        icon: '🌋',
        zoneType: 'LAWLESS_PK',
        minRecLv: 40,
        maxRecLv: 99,
        bounds: { x: 610, y: 815, w: 780, h: 430 },
        centerX: 980,
        centerY: 1030,
        // 중급 사냥터(y: 365~785)를 관통해 남쪽 경계(y: 785~815)를 넘어 진입하는 경유 경로
        routeThroughMidWaypoints: [
          { x: 960, y: 520 },
          { x: 960, y: 690 },
          { x: 960, y: 800 }
        ],
        baseExp: 420,
        baseGold: 220,
        goldDropRange: { min: 650, max: 1600 },
        lootSpec: {
          itemId: 'loot_high_heart',
          tierKey: 'high',
          name: '화산 용암 심장석',
          icon: '🔥',
          dropChance: 0.60,
          valueMultiplier: 6.5
        },
        baseMonsterCount: 6,
        maxMonsterCount: 18,
        miniBossConfig: {
          bossStageRef: 4,
          kind: 'field_miniboss',
          bossTheme: 'volcano_overlord',
          name: '👑 용암 심연의 패왕군주 [중간 보스]',
          insigniaId: 'insignia_high',
          color: '#dc2626',
          stroke: '#fde047',
          isRanged: false,
          range: 46,
          respawnDelay: 35
        },
        monsterTemplates: [
          { kind: 'irongolem',  name: '흑요석 골렘',   color: '#27272a', stroke: '#ef4444', hp: 11800, atk: 312, isRanged: false, range: 32 },
          { kind: 'shadowwolf', name: '화염 지옥개',   color: '#7f1d1d', stroke: '#fb923c', hp: 10400, atk: 348, isRanged: false, range: 30 },
          { kind: 'manaorc',    name: '용암 주술사수', color: '#991b1b', stroke: '#fde047', hp: 11200, atk: 372, isRanged: true,  range: 164 },
          { kind: 'kingslime',  name: '마그마 군주',   color: '#ea580c', stroke: '#fef08a', hp: 14500, atk: 408, isRanged: false, range: 34 }
        ],
        // 40~70레벨 적정 구간 기본 경험치 적용
        // 40~99레벨 적정 구간 기본 경험치 적용
        getExpMultiplier(hunterLevel) {
          if (hunterLevel >= 40 && hunterLevel <= 99) return 1.0;
          return 0.2;
        },
        monsters: []
      },
      {
        id: 'top_field_70_99',
        name: '오크의 숲',
        icon: '🌲',
        zoneType: 'NORMAL_HUNT',
        minRecLv: 70,
        maxRecLv: 99,
        bounds: { x: 1430, y: -340, w: 780, h: 680 },
        centerX: 1820,
        centerY: 0,
        // 초보 사냥터(x: 610~1390)를 동쪽으로 관통해 연결 통로(x: 1390~1430)를 거쳐 진입
        routeEastThroughBeginnerWaypoints: [
          { x: 1000, y: 18 },
          { x: 1365, y: 18 },
          { x: 1455, y: 18 }
        ],
        baseExp: 1280,
        baseGold: 680,
        goldDropRange: { min: 2200, max: 5200 },
        lootSpec: {
          itemId: 'loot_top_astral',
          tierKey: 'top',
          name: '심연 성좌의 별결정',
          icon: '💠',
          dropChance: 0.68,
          valueMultiplier: 16.0
        },
        baseMonsterCount: 6,
        maxMonsterCount: 30,
        maxCountedHunters: 8,
        miniBossConfig: {
          bossStageRef: 7,
          kind: 'field_miniboss',
          bossTheme: 'volcano_overlord',
          name: '👑 심연 성좌의 파멸군주 [중간 보스]',
          insigniaId: 'insignia_top',
          color: '#7c3aed',
          stroke: '#fde047',
          isRanged: false,
          range: 50,
          respawnDelay: 42
        },
        monsterTemplates: [
          { kind: 'irongolem',  name: '성좌 수호거신병', color: '#312e81', stroke: '#818cf8', hp: 42000, atk: 440, isRanged: false, range: 34 },
          { kind: 'shadowwolf', name: '공허 그림자야수', color: '#1e1b4b', stroke: '#c084fc', hp: 37500, atk: 480, isRanged: false, range: 32 },
          { kind: 'manaorc',    name: '심연 별빛주술사', color: '#581c87', stroke: '#f0abfc', hp: 39500, atk: 510, isRanged: true,  range: 172 },
          { kind: 'kingslime',  name: '창세 심연군주',   color: '#4c1d95', stroke: '#fde047', hp: 52000, atk: 570, isRanged: false, range: 36 }
        ],
        // 70~99레벨 적정 구간 기본 경험치 적용
        getExpMultiplier(hunterLevel) {
          if (hunterLevel >= 70 && hunterLevel <= 99) return 1.0;
          return 0.15;
        },
        monsters: []
      }
    ];

    /**
     * ============================================================================
     * 최상급 사냥터 위쪽 3환생 이상 전용 구역: ☁️ 천공의 섬 (도보 이동 불가 · 포탈 전용)
     * ============================================================================
     */
    const SKY_ISLAND_GROUND = {
      id: 'sky_island_field',
      name: '천공의 섬 (성역 구름군도)',
      icon: '☁️',
      zoneType: 'NORMAL_HUNT',
      isOpen: false,
      walkable: false,
      minRebirth: 3,
      minRecLv: 1,
      maxRecLv: 99,
      bounds: { x: 1515, y: -1010, w: 755, h: 390 }, // 최상급 사냥터에서 위로 떨어진 하늘 (세로 390)
      centerX: 1892,
      centerY: -815,
      baseExp: 2650,
      baseGold: 2900,
      goldDropRange: { min: 9600, max: 23000 },
      lootSpec: {
        itemId: 'loot_top_astral',
        tierKey: 'top',
        name: '심연 성좌의 별결정',
        icon: '💠',
        dropChance: 0.75,
        valueMultiplier: 16.0
      },
      baseMonsterCount: 6,
      maxMonsterCount: 18,
      monsterTemplates: [
        { kind: 'irongolem',  name: '백익의 수호천사',   color: '#0284c7', stroke: '#fde047', hp: 88000,  atk: 780, isRanged: false, range: 36 },
        { kind: 'shadowwolf', name: '성광의 심판천사',   color: '#38bdf8', stroke: '#f8fafc', hp: 79000,  atk: 840, isRanged: false, range: 34 },
        { kind: 'manaorc',    name: '천공의 성가대천사', color: '#6366f1', stroke: '#fef08a', hp: 83000,  atk: 890, isRanged: true,  range: 176 },
        { kind: 'kingslime',  name: '대천사 세라핌',     color: '#0ea5e9', stroke: '#fde047', hp: 108000, atk: 960, isRanged: false, range: 38 }
      ],
      getExpMultiplier() {
        return 1.0;
      },
      monsters: []
    };

    /**
     * ============================================================================
     * 천공의 섬 위 4환생 이상 · 날개 착용 헌터 전용 구역: 🌌 성운의 천궁 (비행 전용 · 길 없음)
     * 천공의 섬 상위 버전: 몬스터 체력 약 2.7배 · 공격력 약 1.45배 · 크기 1.5배
     * 이동 · 그리기 · 진입 조건은 js/15c-celestial-palace.js
     * ============================================================================
     */
    const CELESTIAL_PALACE_GROUND = {
      id: 'celestial_palace_field',
      name: '성운의 천궁',
      icon: '🌌',
      zoneType: 'NORMAL_HUNT',
      walkable: false,
      requiresWing: true,
      minRebirth: 4,
      minRecLv: 1,
      maxRecLv: 99,
      bounds: { x: 1545, y: -1600, w: 700, h: 390 }, // 천공의 섬 위로 200 떨어진 하늘 (세로 390)
      centerX: 1895,
      centerY: -1405,
      monsterScale: 1.5,
      baseExp: 17000,
      baseGold: 4700,
      goldDropRange: { min: 16000, max: 38000 },
      lootSpec: {
        itemId: 'loot_celestial_nebula',
        tierKey: 'celestial',
        name: '천궁의 성운결정',
        icon: '🌌',
        dropChance: 0.8,
        valueMultiplier: 24.0
      },
      baseMonsterCount: 6,
      maxMonsterCount: 16,
      // 몬스터 체력: 처음 값의 1.3배 · 경험치 17,000 조정 (2026-11-26)
      monsterTemplates: [
        { kind: 'irongolem',  name: '성운의 수호대천사',   color: '#7c3aed', stroke: '#fde047', hp: 308100, atk: 1130, isRanged: false, range: 48 },
        { kind: 'shadowwolf', name: '별빛 심판 세라핌',   color: '#a855f7', stroke: '#fef9c3', hp: 276900, atk: 1220, isRanged: false, range: 46 },
        { kind: 'manaorc',    name: '천궁의 성가 지휘자', color: '#4f46e5', stroke: '#fbcfe8', hp: 292500, atk: 1290, isRanged: true,  range: 190 },
        { kind: 'kingslime',  name: '성운왕좌의 수호신',   color: '#6d28d9', stroke: '#fde047', hp: 382200, atk: 1390, isRanged: false, range: 52 }
      ],
      getExpMultiplier() {
        return 1.0;
      },
      monsters: []
    };

    const ALL_FIELD_GROUNDS = [...HUNTING_GROUNDS, SKY_ISLAND_GROUND, CELESTIAL_PALACE_GROUND];
