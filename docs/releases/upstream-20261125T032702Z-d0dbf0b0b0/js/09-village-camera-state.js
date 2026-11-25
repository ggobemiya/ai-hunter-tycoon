// [09-village-camera-state] 건물 카탈로그 · 마을 부지 · 카메라 · 게임 상태 초기화
    /**
     * ============================================================================
     * 마을 건물 카탈로그, 부지(Plot) 시스템 & 2D 카메라 컨트롤러
     * ============================================================================
     */
    const BUILDING_CATALOG = {
      townhall: {
        type: 'townhall', name: '마을 회관', icon: '🏛️', w: 148, h: 102,
        wallColor: '#e2e8f0', roofColor: '#1d4ed8', roofStyle: 'gable', hasChimney: false,
        buildCost: 0, baseUpgradeCost: 500, prosperityPerLv: 60,
        desc: '모험가 마을의 행정 중심지입니다. 단계별 잠금 해제 후 업그레이드하면 Lv.10 기준 최대 30명까지 헌터 정원이 확장됩니다.',
        getStatText: (lv) => `헌터 정원 ${getTownHallCapacity(lv)}명`,
        helpGuide: { role: '마을 최대 헌터 정원 확장(Lv.10 최대 30명) 및 기본 세금 징수' }
      },
      inn: {
        type: 'inn', name: '모험가 여관', icon: '🛏️', w: 132, h: 94,
        wallColor: '#fef3c7', roofColor: '#b45309', roofStyle: 'gable', hasChimney: true,
        buildCost: 300, baseUpgradeCost: 400, prosperityPerLv: 40,
        desc: '지친 헌터들이 숙박하며 체력, MP, 피로도를 회복하는 따뜻한 휴식처입니다.',
        getStatText: (lv) => `체력/MP 회복 +${45 + lv * 10}%`,
        helpGuide: { role: '체력·MP 회복 및 피로도 해소, 숙박 세금 수입' }
      },
      tavern: {
        type: 'tavern', name: '주점 & 식당', icon: '🍖', w: 134, h: 94,
        wallColor: '#fde68a', roofColor: '#9a3412', roofStyle: 'gable', hasChimney: true,
        buildCost: 350, baseUpgradeCost: 420, prosperityPerLv: 45,
        desc: '푸짐한 요리와 음료로 헌터들의 포만감을 100% 충전해 줍니다.',
        getStatText: (lv) => `포만감 100% · 식사세 ${25 + lv * 10}G`,
        helpGuide: { role: '포만감 완충 및 식사 이용료 세금 발생' }
      },
      smithy: {
        type: 'smithy', name: '대장간', icon: '⚒️', w: 136, h: 94,
        wallColor: '#cbd5e1', roofColor: '#374151', roofStyle: 'fortress', hasChimney: true,
        buildCost: 500, baseUpgradeCost: 650, prosperityPerLv: 55,
        desc: '강화 조건을 달성한 헌터의 장비를 상위 티어(T2~T10)로 승급시킵니다.',
        getStatText: (lv) => `최대 T${Math.min(MAX_EQUIP_TIER, lv)} 장비 승급 지원`,
        helpGuide: { role: '대장간 레벨에 따라 T2~T10 상위 티어 장비 승급 해금' }
      },
      enchanter: {
        type: 'enchanter', name: '마법 강화소', icon: '🔮', w: 130, h: 96,
        wallColor: '#e0e7ff', roofColor: '#4338ca', roofStyle: 'spire', hasChimney: false,
        buildCost: 600, baseUpgradeCost: 750, prosperityPerLv: 65,
        desc: '헌터의 무기·방어구·투구·장신구에 마력을 부여해 +15강까지 강화합니다.',
        getStatText: (lv) => `강화 수수료 ${80 + lv * 35}G`,
        helpGuide: { role: '장비 강화(+1~+15) 수행 및 고액 강화 수수료 징수' }
      },
      potion: {
        type: 'potion', name: '물약 상점', icon: '🧪', w: 128, h: 92,
        wallColor: '#dcfce7', roofColor: '#15803d', roofStyle: 'spire', hasChimney: false,
        buildCost: 380, baseUpgradeCost: 450, prosperityPerLv: 40,
        desc: '체력과 마나 회복 물약을 판매하여 헌터들의 사냥 지속력을 높입니다.',
        getStatText: (lv) => `물약 판매세 ${40 + lv * 20}G`,
        helpGuide: { role: 'HP/MP 즉시 보충 및 물약 판매 세금 적립' }
      },
      training: {
        type: 'training', name: '전투 훈련소', icon: '🎯', w: 136, h: 94,
        wallColor: '#ffedd5', roofColor: '#c2410c', roofStyle: 'fortress', hasChimney: false,
        buildCost: 450, baseUpgradeCost: 550, prosperityPerLv: 50,
        desc: '모의 대련과 표적 훈련으로 경험치와 스킬 숙련도를 상승시킵니다.',
        getStatText: (lv) => `수련 EXP +${35 + lv * 25}`,
        helpGuide: { role: '헌터 경험치 및 스킬 사용 숙련도 획득' }
      },
      generalstore: {
        type: 'generalstore', name: '잡화상점', icon: '🛍️', w: 132, h: 92,
        wallColor: '#f0fdfa', roofColor: '#0f766e', roofStyle: 'gable', hasChimney: false,
        buildCost: 400, baseUpgradeCost: 480, prosperityPerLv: 45,
        desc: '사냥터별 전리품(🌱초원 1배 · ⛏️협곡 2.6배 · 🔥화산 6.5배 · 💠성좌 16배)을 난이도별 고액 단가로 매입해 골드로 정산합니다.',
        getStatText: (lv) => {
          const base = 45 + lv * 15;
          return `초원 ${base}G · 협곡 ${Math.round(base * 2.6)}G · 화산 ${Math.round(base * 6.5)}G · 성좌 ${Math.round(base * 16)}G`;
        },
        helpGuide: { role: '사냥터 등급별 전리품 차등 고액 매입 및 거래 수수료 징수' }
      },
      temple: {
        type: 'temple', name: '치유의 신전', icon: '⛪', w: 138, h: 96,
        wallColor: '#f8fafc', roofColor: '#0284c7', roofStyle: 'spire', hasChimney: false,
        buildCost: 650, baseUpgradeCost: 800, prosperityPerLv: 70,
        desc: '신성한 축복으로 부상당한 헌터의 체력·MP·피로도를 100% 완치합니다.',
        getStatText: (lv) => `HP/MP/피로도 100% 완치`,
        helpGuide: { role: '중상 헌터 즉시 완치 및 신전 헌금 세금 수입' }
      },
      guildbank: {
        type: 'guildbank', name: '모험가 길드 금고', icon: '🏦', w: 136, h: 94,
        wallColor: '#fef9c3', roofColor: '#a16207', roofStyle: 'fortress', hasChimney: false,
        buildCost: 700, baseUpgradeCost: 900, prosperityPerLv: 80,
        desc: '마을의 모든 상업 시설에서 걷히는 세금 수입을 레벨당 +12% 증폭시킵니다.',
        getStatText: (lv) => `마을 시설 세금 +${lv * 12}%`,
        helpGuide: { role: '마을 전체 시설 이용 세금 보너스(+12%/Lv) 제공' }
      },
      rebirth_hall: {
        type: 'rebirth_hall', name: '환생소', icon: '⛩️', w: 140, h: 98,
        wallColor: '#f3e8ff', roofColor: '#6b21a8', roofStyle: 'spire', hasChimney: false,
        buildCost: 5000000, baseUpgradeCost: 700, prosperityPerLv: 75,
        desc: 'Lv.99에 도달한 헌터가 환생 의식을 치르며 2가지 전직 선택지 중 하나를 자율 선택해 상위 직업으로 전직하는 신성한 전당입니다.',
        getStatText: (lv) => `환생 & 트리 전직 · 환생 보너스 EXP +${lv * 30}`,
        helpGuide: { role: 'Lv.99 헌터 환생 및 1~5차 트리형 2택1 자율 전직 수행' }
      },
      purification_sanctuary: {
        type: 'purification_sanctuary', name: '정화의 성소', icon: '🕊️', w: 138, h: 96,
        wallColor: '#f0fdf4', roofColor: '#0d9488', roofStyle: 'spire', hasChimney: false,
        buildCost: 650, baseUpgradeCost: 580, prosperityPerLv: 65,
        desc: '악행과 PK로 물든 카오스·악인 헌터의 영혼을 정화하여 인성 수치를 빠르게 회복시켜 주는 성역입니다.',
        getStatText: (lv) => `인성 정화 +${15 + lv * 5} · 정화세 ${55 + lv * 20}G`,
        helpGuide: { role: '음수(-) 인성·카오스 헌터의 인성 회복 및 정화 세금 수입' }
      },
      sky_island_gate: {
        type: 'sky_island_gate', name: '천공의 섬 게이트', icon: '🌀', w: 142, h: 98,
        wallColor: '#e0f2fe', roofColor: '#0369a1', roofStyle: 'spire', hasChimney: false,
        maxLevel: 1, buildCost: 50000000, baseUpgradeCost: 950, prosperityPerLv: 90,
        desc: '3환생 이상 헌터가 최상급 사냥터 위 [천공의 섬]으로 포탈 이동할 수 있는 Lv.1 전용 마력 게이트입니다. 도보 이동이 불가능한 천공의 섬으로 안전하게 전송합니다.',
        getStatText: () => `Lv.1 고정 · 3환생↑ 천공의 섬 포탈 이동 활성`,
        helpGuide: { role: '3환생 이상 헌터의 [천공의 섬] 포탈 전용 이동 지원 (업그레이드 불가 Lv.1 고정 시설)' }
      },
      sky_smithy: {
        type: 'sky_smithy', name: '천공 대장간', icon: '🪽', w: 138, h: 96,
        wallColor: '#e0f2fe', roofColor: '#0284c7', roofStyle: 'spire', hasChimney: true,
        buildCost: 100000000, baseUpgradeCost: 1100, prosperityPerLv: 95,
        desc: '천공의 섬에서 획득한 날개 아이템에 성역의 별빛을 벼려 +15강까지 강화하는 전용 대장간입니다. 건물 레벨당 날개 강화 성공 확률이 0.3%씩 증가합니다(Lv.1 0.3% ~ Lv.10 3%).',
        getStatText: (lv) => {
          const clampedLv = Math.max(1, Math.min(MAX_BUILDING_LEVEL, lv));
          return `날개 강화 성공률 ${(clampedLv * 0.3).toFixed(1)}% · 공명세 ${clampedLv * 120}G`;
        },
        helpGuide: { role: '헌터 착용 날개(+1~+15강, 건물 Lv.1 0.3% ~ Lv.10 3%) 전용 강화 및 성역 제련 세금 수입' }
      },
      colosseum: {
        type: 'colosseum', name: '결투장', icon: '🏟️', w: 146, h: 100,
        wallColor: '#fef3c7', roofColor: '#b91c1c', roofStyle: 'fortress', hasChimney: false,
        maxLevel: 1, buildCost: 30000000, baseUpgradeCost: 1000, prosperityPerLv: 110,
        desc: '5티어 보스 처치 후 건설 가능한 왕국 결투장입니다. 환생·레벨 상위 순 최대 50명이 전원 1T +15강 풀강화 장비 세트를 장착하고 현실 시간 매시 정각(1시간마다) 랜덤 1:1 토너먼트를 펼칩니다. (우승 5,000만G/10점 · 준우승 2,000만G/5점 · 참가 500만G/2점 · 최근 5경기 기록)',
        getStatText: () => `5티어 보스 처치 해금 · 최대 50인 · 1T+15 · 1시간마다 개막`,
        helpGuide: { role: '5티어 보스 처치 후 건설 가능 · 참가자 명단, 텍스트 중계, 준결승·결승 관람, 최근 5경기 기록 및 승점 랭킹 제공' }
      },
      dungeon: {
        type: 'dungeon', name: '지하 던전 입구', icon: '🕳️', w: 138, h: 98,
        wallColor: '#334155', roofColor: '#1e293b', roofStyle: 'fortress', hasChimney: false,
        buildCost: 800, baseUpgradeCost: 1200, prosperityPerLv: 100,
        desc: '심연의 마물들이 도사리는 지하 던전입니다. 레벨당 10층씩 최대 B100F까지 개방됩니다.',
        getStatText: (lv) => `개방 층수 B1F ~ B${lv * 10}F`,
        helpGuide: { role: '고위험 고보상 던전 탐험 (50층 T5 · 100층 T10 장비 필수)' }
      }
    };

    const EXPANSION_COORDS = [
      { x: -380, y: 150 },
      { x: 190,  y: 150 },
      { x: 380,  y: 150 },
      { x: -380, y: 320 },
      { x: -190, y: 320 },
      { x: 0,    y: 320 },
      { x: 190,  y: 320 },
      { x: 380,  y: 320 },
      { x: -380, y: -320 },
      { x: -190, y: -320 },
      { x: 0,    y: -320 },
      { x: 190,  y: -320 },
      { x: 380,  y: -320 },
      { x: -380, y: 490 },
      { x: -190, y: 490 },
      { x: 0,    y: 490 },
      { x: 190,  y: 490 }
    ];

    class VillageManager {
      constructor() {
        this.plots = [];
      }

      createBuildingInstance(type, x, y, level = 1, unlockedMaxLevel = null) {
        const tpl = BUILDING_CATALOG[type];
        if (!tpl) return null;
        return {
          ...tpl,
          x,
          y,
          level,
          unlockedMaxLevel: unlockedMaxLevel !== null ? Math.max(level, unlockedMaxLevel) : level,
          investedGold: tpl.buildCost
        };
      }

      isCoordOccupied(x, y, minDx = 155, minDy = 135) {
        return this.plots.some(p => Math.abs(p.x - x) < minDx && Math.abs(p.y - y) < minDy);
      }

      getAvailableExpansionCoords() {
        return EXPANSION_COORDS.filter(coord => !this.isCoordOccupied(coord.x, coord.y));
      }

      addPlot(id, x, y, initialBuildingType = null, level = 1, unlockedMaxLevel = null) {
        const tpl = initialBuildingType ? BUILDING_CATALOG[initialBuildingType] : null;
        const plot = {
          id,
          x,
          y,
          building: tpl ? {
            ...tpl,
            x,
            y,
            level,
            unlockedMaxLevel: unlockedMaxLevel !== null ? Math.max(level, unlockedMaxLevel) : level,
            investedGold: tpl.buildCost
          } : null
        };
        this.plots.push(plot);
        return plot;
      }

      getStageUnlockCost(building, targetLevel) {
        const base = building.baseUpgradeCost || 400;
        return Math.round(base * 0.75 * Math.pow(1.32, targetLevel - 2));
      }

      getAllBuildings() {
        return this.plots.filter(p => p.building).map(p => p.building);
      }

      getPlotAt(wx, wy) {
        for (let i = this.plots.length - 1; i >= 0; i--) {
          const p = this.plots[i];
          const hw = p.building ? p.building.w / 2 + 8 : 66;
          const hh = p.building ? p.building.h / 2 + 16 : 48;
          if (Math.abs(wx - p.x) <= hw && Math.abs(wy - p.y) <= hh) {
            return p;
          }
        }
        return null;
      }

      getRemainingExpandableCount() {
        return this.getAvailableExpansionCoords().length;
      }

      getNextExpansionCoord() {
        const available = this.getAvailableExpansionCoords();
        return available.length > 0 ? available[0] : null;
      }

      computeTotalProsperity() {
        return this.getAllBuildings().reduce((sum, b) => sum + b.level * (b.prosperityPerLv || 40), 0);
      }
    }

    class CameraController2D {
      constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;

        this.x = 120;
        this.y = 0;
        this.targetX = 120;
        this.targetY = 0;

        this.userZoom = 0.92;
        this.targetUserZoom = 0.92;
        this.minZoom = 0.42;
        this.maxZoom = 2.2;

        this.isDragging = false;
        this.hasMoved = false;
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        this.pinchStartDist = 0;
        this.pinchStartZoom = 1;

        this._resize();
        this._bindEvents();
      }

      get effectiveZoom() {
        return this.userZoom;
      }

      _resize() {
        const vv = window.visualViewport;
        const rawW = vv ? vv.width : (document.documentElement.clientWidth || window.innerWidth);
        const rawH = vv ? vv.height : (document.documentElement.clientHeight || window.innerHeight);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.viewportWidth = Math.max(280, Math.round(rawW));
        this.viewportHeight = Math.max(240, Math.round(rawH));
        this.canvas.style.width = `${this.viewportWidth}px`;
        this.canvas.style.height = `${this.viewportHeight}px`;
        this.canvas.width = Math.max(1, Math.round(this.viewportWidth * dpr));
        this.canvas.height = Math.max(1, Math.round(this.viewportHeight * dpr));
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      _clampTargetBounds() {
        this.targetX = Math.max(-2050, Math.min(3050, this.targetX)); // 서쪽은 왕국 성(js/34-kingdom.js)까지
        this.targetY = Math.max(-1680, Math.min(1260, this.targetY)); // 위쪽은 성운의 천궁(y -1600)까지
      }

      screenToWorld(sx, sy) {
        return {
          x: (sx - this.viewportWidth / 2) / this.effectiveZoom + this.x,
          y: (sy - this.viewportHeight / 2) / this.effectiveZoom + this.y
        };
      }

      zoomAtPoint(newZoom, screenX, screenY) {
        const clamped = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        const before = this.screenToWorld(screenX, screenY);
        this.targetUserZoom = clamped;
        this.userZoom = clamped;
        const after = this.screenToWorld(screenX, screenY);
        this.targetX += before.x - after.x;
        this.targetY += before.y - after.y;
        this.x = this.targetX;
        this.y = this.targetY;
        this._clampTargetBounds();
      }

      reset() {
        this.targetX = 120;
        this.targetY = 0;
        this.targetUserZoom = 0.92;
        gameState.followSelectedHunter = false;
        const fBtn = document.getElementById('btnFollowHunter');
        if (fBtn) {
          fBtn.classList.remove('active');
          fBtn.textContent = '🎥 추적 OFF';
        }
      }

      update() {
        this.x += (this.targetX - this.x) * 0.16;
        this.y += (this.targetY - this.y) * 0.16;
        this.userZoom += (this.targetUserZoom - this.userZoom) * 0.18;
      }

      beginFrame() {
        this.ctx.save();
        this.ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
        this.ctx.scale(this.effectiveZoom, this.effectiveZoom);
        this.ctx.translate(-this.x, -this.y);
      }

      endFrame() {
        this.ctx.restore();
      }

      _bindEvents() {
        const handleViewportChange = () => this._resize();
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('orientationchange', () => setTimeout(handleViewportChange, 120));
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', handleViewportChange);
          window.visualViewport.addEventListener('scroll', handleViewportChange);
        }
        if (typeof ResizeObserver !== 'undefined') {
          const ro = new ResizeObserver(handleViewportChange);
          ro.observe(this.canvas);
        }

        this.canvas.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          this.isDragging = true;
          this.hasMoved = false;
          this.lastPointerX = e.clientX;
          this.lastPointerY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
          if (!this.isDragging) return;
          const dx = e.clientX - this.lastPointerX;
          const dy = e.clientY - this.lastPointerY;
          if (Math.hypot(dx, dy) > 4) {
            this.hasMoved = true;
            gameState.followSelectedHunter = false;
          }
          this.targetX -= dx / this.effectiveZoom;
          this.targetY -= dy / this.effectiveZoom;
          this._clampTargetBounds();
          this.lastPointerX = e.clientX;
          this.lastPointerY = e.clientY;
        });

        window.addEventListener('mouseup', () => {
          this.isDragging = false;
        });

        this.canvas.addEventListener('wheel', (e) => {
          e.preventDefault();
          const factor = e.deltaY < 0 ? 1.12 : 0.89;
          this.zoomAtPoint(this.targetUserZoom * factor, e.clientX, e.clientY);
        }, { passive: false });

        this.canvas.addEventListener('touchstart', (e) => {
          if (e.touches.length === 1) {
            this.isDragging = true;
            this.hasMoved = false;
            this.lastPointerX = e.touches[0].clientX;
            this.lastPointerY = e.touches[0].clientY;
          } else if (e.touches.length === 2) {
            this.isDragging = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this.pinchStartDist = Math.hypot(dx, dy);
            this.pinchStartZoom = this.targetUserZoom;
          }
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
          if (e.touches.length === 1 && this.isDragging) {
            const dx = e.touches[0].clientX - this.lastPointerX;
            const dy = e.touches[0].clientY - this.lastPointerY;
            if (Math.hypot(dx, dy) > 5) {
              this.hasMoved = true;
              gameState.followSelectedHunter = false;
            }
            this.targetX -= dx / this.effectiveZoom;
            this.targetY -= dy / this.effectiveZoom;
            this._clampTargetBounds();
            this.lastPointerX = e.touches[0].clientX;
            this.lastPointerY = e.touches[0].clientY;
          } else if (e.touches.length === 2 && this.pinchStartDist > 0) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            this.zoomAtPoint(this.pinchStartZoom * (dist / this.pinchStartDist), midX, midY);
          }
        }, { passive: true });

        this.canvas.addEventListener('touchend', () => {
          this.isDragging = false;
          this.pinchStartDist = 0;
        });
      }
    }

    /**
     * ============================================================================
     * 게임 상태, 마을 초기 부지·건물 및 헌터 목록 초기화
     * ============================================================================
     */
    const canvas = document.getElementById('gameCanvas');
    const debugText = document.getElementById('debugText');
    const camera = new CameraController2D(canvas);
    const village = new VillageManager();

    const gameState = {
      gold: 2500,
      subjugationPoints: 0,
      userInventory: {},     // 🎒 유저 인벤토리 { 아이템ID: 개수 } (js/25-user-inventory.js)
      banishBonusSlots: 0,   // 5환생 헌터 추방으로 늘어난 헌터 정원 (최대 +20)
      rewardFlags: {},       // 한 번만 주는 보상을 받았는지 (예: boss5Transcend · js/26-transcend.js)
      shopBonusSlots: 0,     // 토벌 포인트 상점에서 산 헌터 정원 (최대 +100 · js/28-subjugation-shop.js)
      mailbox: { claimed: [], personal: [] }, // 📮 우편함: 받은 우편 id · 개인 우편 (js/30-mailbox.js)
      shopPurchases: {},     // 상점 구매 횟수 { 상품ID: { period, count } }
      prosperity: 120,
      huntersCount: 0,
      selectedPlotId: null,
      selectedHunterId: null,
      selectedMonsterRef: null,
      selectedMonsterGroundId: null,
      selectedEquipSlot: null,
      followSelectedHunter: false,
      panelHelpOpen: false,
      relationsExpanded: true,
      activeHunterTab: 'overview',
      oneTimeT3SummonUsed: false,
      powerSavingMode: false
    };

    // 초기 마을 부지 & 핵심 건물 배치 (시작 시 마을 회관만 건설된 상태, 나머지는 빈 부지)
    village.addPlot('plot_townhall',  0,    -150, 'townhall', 1);
    village.addPlot('plot_inn',       -190, -150, null);
    village.addPlot('plot_tavern',    190,  -150, null);
    village.addPlot('plot_smithy',    -380, -150, null);
    village.addPlot('plot_dungeon',   380,  -150, null);
    village.addPlot('plot_colosseum', 0,     150, null);
    village.addPlot('plot_empty_2',   -190,  150, null);

    // 랜덤 Lv.1 헌터 2명 생성 헬퍼
    function createInitialRandomHunters(count = 2) {
      const created = [];
      for (let i = 0; i < count; i++) {
        const archetype = JOB_ARCHETYPES[Math.floor(Math.random() * JOB_ARCHETYPES.length)];
        const randomName = generateRandomHunterName(created);
        const hunter = new Hunter(
          `h_init_${Date.now()}_${i}_${Math.floor(Math.random() * 999)}`,
          {
            ...archetype,
            name: randomName,
            level: 1,
            rebirthCount: 0,
            equipment: {
              weapon:    { tier: 1, enhance: 0 },
              armor:     { tier: 1, enhance: 0 },
              helmet:    { tier: 1, enhance: 0 },
              accessory: { tier: 1, enhance: 0 }
            }
          },
          -35 + i * 70,
          24
        );
        hunter.pickNextDestination();
        created.push(hunter);
      }
      return created;
    }

    const hunters = createInitialRandomHunters(2);
    gameState.huntersCount = hunters.length;

    // 마을 조경 소품 (나무 & 가로등)
    const props = [
      { type: 'tree', x: -490, y: -330 },
      { type: 'tree', x: 470,  y: -330 },
      { type: 'tree', x: -490, y: 310 },
      { type: 'tree', x: 470,  y: 310 },
      { type: 'lamp', x: -115, y: -12 },
      { type: 'lamp', x: 115,  y: -12 },
      { type: 'lamp', x: -290, y: -12 },
      { type: 'lamp', x: 290,  y: -12 }
    ];
