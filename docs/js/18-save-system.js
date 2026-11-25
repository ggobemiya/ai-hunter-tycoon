// [18-save-system] 저장/불러오기 (localStorage · IndexedDB · 클라우드 · 마이그레이션)
    // ============================================================================
    // 로컬 + 클라우드 진행상황 저장/불러오기 시스템 (오프라인·샌드박스 즉시 대응)
    // ============================================================================
    // 패치 무손실 영구 저장 · 다중 백업 미러 · 스키마 자동 마이그레이션 시스템
    // ============================================================================
    const SAVE_SCHEMA_VERSION = 3;
    const PERSISTENT_MASTER_KEY = 'adventurer_village_persistent_master_v1';
    const LEGACY_SAVE_KEYS = [
      'adventurer_village_save_slot_v1',
      'adventurer_village_local_backup',
      'adventurer_village_save_v3'
    ];
    const WINDOW_NAME_SAVE_PREFIX = '__ADV_VILLAGE_SAVE_MIRROR__:';
    const IDB_DB_NAME = 'AdventurerVillagePersistentDB';
    const IDB_STORE_NAME = 'villageSaves';
    const IDB_SLOT_KEY = 'mainSlot';

    const DEFAULT_PLOT_BLUEPRINTS = [
      { id: 'plot_townhall',  x: 0,    y: -150, type: 'townhall', level: 1 },
      { id: 'plot_inn',       x: -190, y: -150, type: null,       level: 1 },
      { id: 'plot_tavern',    x: 190,  y: -150, type: null,       level: 1 },
      { id: 'plot_smithy',    x: -380, y: -150, type: null,       level: 1 },
      { id: 'plot_dungeon',   x: 380,  y: -150, type: null,       level: 1 },
      { id: 'plot_colosseum', x: 0,     y: 150, type: null,       level: 1 },
      { id: 'plot_empty_2',   x: -190,  y: 150, type: null,       level: 1 }
    ];

    const LEGACY_JOB_MAP = {
      berserker: '버서커',
      ranger: '레인저',
      paladin: '팔라딘',
      sorcerer: '소서러'
    };

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    let db = null;
    let auth = null;
    let currentUser = null;
    let firestoreSetDoc = null;
    let firestoreDoc = null;
    let isStorageReady = false;
    let isResettingProgress = false;
    let debouncedSaveTimer = null;

    function safeParseJson(val, fallback) {
      if (val === null || val === undefined) return fallback;
      if (typeof val === 'object') return val;
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch (_) {
          return fallback;
        }
      }
      return fallback;
    }

    function readWindowNameBackup() {
      try {
        if (typeof window.name === 'string' && window.name.startsWith(WINDOW_NAME_SAVE_PREFIX)) {
          const raw = window.name.slice(WINDOW_NAME_SAVE_PREFIX.length);
          return safeParseJson(raw, null);
        }
      } catch (_) {}
      return null;
    }

    function writeWindowNameBackup(payload) {
      try {
        window.name = WINDOW_NAME_SAVE_PREFIX + JSON.stringify(payload);
      } catch (_) {}
    }

    function clearWindowNameBackup() {
      try {
        if (typeof window.name === 'string' && window.name.startsWith(WINDOW_NAME_SAVE_PREFIX)) {
          window.name = '';
        }
      } catch (_) {}
    }

    function writeIndexedDBBackup(payload) {
      try {
        if (typeof indexedDB === 'undefined') return;
        const req = indexedDB.open(IDB_DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const idb = e.target.result;
          if (!idb.objectStoreNames.contains(IDB_STORE_NAME)) {
            idb.createObjectStore(IDB_STORE_NAME);
          }
        };
        req.onsuccess = (e) => {
          try {
            const idb = e.target.result;
            const tx = idb.transaction(IDB_STORE_NAME, 'readwrite');
            tx.objectStore(IDB_STORE_NAME).put(payload, IDB_SLOT_KEY);
            tx.oncomplete = () => idb.close();
          } catch (_) {}
        };
      } catch (_) {}
    }

    function readIndexedDBBackupWithTimeout(timeoutMs = 450) {
      return new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') {
          resolve(null);
          return;
        }
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve(null);
          }
        }, timeoutMs);

        try {
          const req = indexedDB.open(IDB_DB_NAME, 1);
          req.onupgradeneeded = (e) => {
            const idb = e.target.result;
            if (!idb.objectStoreNames.contains(IDB_STORE_NAME)) {
              idb.createObjectStore(IDB_STORE_NAME);
            }
          };
          req.onsuccess = (e) => {
            try {
              const idb = e.target.result;
              const tx = idb.transaction(IDB_STORE_NAME, 'readonly');
              const getReq = tx.objectStore(IDB_STORE_NAME).get(IDB_SLOT_KEY);
              getReq.onsuccess = () => {
                clearTimeout(timer);
                idb.close();
                if (!settled) {
                  settled = true;
                  resolve(getReq.result || null);
                }
              };
              getReq.onerror = () => {
                clearTimeout(timer);
                idb.close();
                if (!settled) {
                  settled = true;
                  resolve(null);
                }
              };
            } catch (_) {
              clearTimeout(timer);
              if (!settled) {
                settled = true;
                resolve(null);
              }
            }
          };
          req.onerror = () => {
            clearTimeout(timer);
            if (!settled) {
              settled = true;
              resolve(null);
            }
          };
        } catch (_) {
          clearTimeout(timer);
          if (!settled) {
            settled = true;
            resolve(null);
          }
        }
      });
    }

    function clearIndexedDBBackup() {
      try {
        if (typeof indexedDB === 'undefined') return;
        const req = indexedDB.open(IDB_DB_NAME, 1);
        req.onsuccess = (e) => {
          try {
            const idb = e.target.result;
            if (idb.objectStoreNames.contains(IDB_STORE_NAME)) {
              const tx = idb.transaction(IDB_STORE_NAME, 'readwrite');
              tx.objectStore(IDB_STORE_NAME).delete(IDB_SLOT_KEY);
              tx.oncomplete = () => idb.close();
            } else {
              idb.close();
            }
          } catch (_) {}
        };
      } catch (_) {}
    }

    // 구버전/타 스키마 세이브 데이터를 현재 버전 스키마로 무손실 정규화
    function normalizeAndMigrateSaveData(raw) {
      if (!raw || typeof raw !== 'object') return null;
      if (!Array.isArray(raw.plots) && !Array.isArray(raw.hunters)) return null;

      return {
        schemaVersion: SAVE_SCHEMA_VERSION,
        savedAt: typeof raw.savedAt === 'number' ? raw.savedAt : 1,
        gold: typeof raw.gold === 'number' ? raw.gold : 2500,
        subjugationPoints: typeof raw.subjugationPoints === 'number' ? Math.max(0, Math.floor(raw.subjugationPoints)) : 0,
        userInventory: raw.userInventory && typeof raw.userInventory === 'object' ? raw.userInventory : {},
        banishBonusSlots: Math.max(0, Math.min(20, Math.floor(Number(raw.banishBonusSlots) || 0))),
        rewardFlags: raw.rewardFlags && typeof raw.rewardFlags === 'object' ? raw.rewardFlags : {},
        shopBonusSlots: Math.max(0, Math.min(100, Math.floor(Number(raw.shopBonusSlots) || 0))),
        mailbox: raw.mailbox && typeof raw.mailbox === 'object' ? raw.mailbox : { claimed: [], personal: [] },
        shopPurchases: raw.shopPurchases && typeof raw.shopPurchases === 'object' ? raw.shopPurchases : {},
        villageId: typeof raw.villageId === 'string' ? raw.villageId : '',
        saveSeq: Math.max(0, Math.floor(Number(raw.saveSeq) || 0)),
        userCode: typeof raw.userCode === 'string' ? raw.userCode : '',
        userCodeCreatedAt: Math.max(0, Number(raw.userCodeCreatedAt) || 0),
        kingdom: raw.kingdom && typeof raw.kingdom === 'object' ? raw.kingdom : null,
        orcReinforce: raw.orcReinforce && typeof raw.orcReinforce === "object" ? raw.orcReinforce : null,
        autoBanish: raw.autoBanish && typeof raw.autoBanish === "object" ? raw.autoBanish : null,
        oneTimeT3SummonUsed: Boolean(raw.oneTimeT3SummonUsed),
        bossStage: typeof raw.bossStage === 'number' ? raw.bossStage : 1,
        allStagesCleared: Boolean(raw.allStagesCleared),
        guardLevels: raw.guardLevels && typeof raw.guardLevels === 'object' ? {
          supreme: Math.max(1, Math.min(MAX_GUARD_LEVEL, Number(raw.guardLevels.supreme) || 1)),
          arcane: Math.max(1, Math.min(MAX_GUARD_LEVEL, Number(raw.guardLevels.arcane) || 1))
        } : { supreme: 1, arcane: 1 },
        camera: raw.camera && typeof raw.camera === 'object' ? {
          x: typeof raw.camera.x === 'number' ? raw.camera.x : 120,
          y: typeof raw.camera.y === 'number' ? raw.camera.y : 0,
          userZoom: typeof raw.camera.userZoom === 'number' ? raw.camera.userZoom : 0.92
        } : null,
        plots: Array.isArray(raw.plots) ? raw.plots : [],
        hunters: Array.isArray(raw.hunters) ? raw.hunters : [],
        orcUnits: Array.isArray(raw.orcUnits) ? raw.orcUnits : [],
        colosseum: raw.colosseum && typeof raw.colosseum === 'object' ? raw.colosseum : null,
        offlineRates: raw.offlineRates && typeof raw.offlineRates === 'object' ? raw.offlineRates : null,
        relationsJson: typeof raw.relationsJson === 'string'
          ? raw.relationsJson
          : JSON.stringify(Array.isArray(raw.relations) ? raw.relations : [])
      };
    }

    // localStorage 마스터키 + 레거시 키 + window.name + IndexedDB 중 가장 최신 데이터 탐색
    async function findBestLocalSaveCandidate() {
      const candidates = [];

      const keysToCheck = [PERSISTENT_MASTER_KEY, ...LEGACY_SAVE_KEYS];
      for (const k of keysToCheck) {
        try {
          const str = localStorage.getItem(k);
          if (str) {
            const parsed = normalizeAndMigrateSaveData(safeParseJson(str, null));
            if (parsed) candidates.push(parsed);
          }
        } catch (_) {}
      }

      const winMirror = normalizeAndMigrateSaveData(readWindowNameBackup());
      if (winMirror) candidates.push(winMirror);

      const idbMirror = normalizeAndMigrateSaveData(await readIndexedDBBackupWithTimeout(450));
      if (idbMirror) candidates.push(idbMirror);

      if (candidates.length === 0) return null;

      candidates.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      return candidates[0];
    }

    function serializeGameSaveData() {
      return {
        schemaVersion: SAVE_SCHEMA_VERSION,
        savedAt: Date.now(),
        gold: gameState.gold,
        subjugationPoints: Math.max(0, Math.floor(Number(gameState.subjugationPoints) || 0)),
        userInventory: { ...(gameState.userInventory || {}) },
        banishBonusSlots: Math.max(0, Math.floor(Number(gameState.banishBonusSlots) || 0)),
        rewardFlags: { ...(gameState.rewardFlags || {}) },
        shopBonusSlots: Math.max(0, Math.floor(Number(gameState.shopBonusSlots) || 0)),
        mailbox: JSON.parse(JSON.stringify(gameState.mailbox || { claimed: [], personal: [] })),
        shopPurchases: JSON.parse(JSON.stringify(gameState.shopPurchases || {})),
        // 리세마라 방지용 마을 번호 · 저장 순번 (js/27-reroll-guard.js)
        villageId: typeof getRerollGuardVillageId === 'function' ? getRerollGuardVillageId() : (gameState.villageId || ''),
        saveSeq: typeof nextRerollGuardSaveSeq === 'function' ? nextRerollGuardSaveSeq() : (Number(gameState.saveSeq) || 0),
        userCode: typeof getUserCode === 'function' ? getUserCode() : (gameState.userCode || ''),
        userCodeCreatedAt: Number(gameState.userCodeCreatedAt) || 0,
        kingdom: gameState.kingdom ? JSON.parse(JSON.stringify(gameState.kingdom)) : null, // 👑 왕국 병력 · 부지 (js/34-kingdom.js)
        orcReinforce: gameState.orcReinforce ? JSON.parse(JSON.stringify(gameState.orcReinforce)) : null, // 👹 Lv.99 오크 증원 (js/39-orc-reinforce.js)
        autoBanish: gameState.autoBanish ? JSON.parse(JSON.stringify(gameState.autoBanish)) : null, // 🤖 자동 추방 슬롯 (js/41-auto-banish.js)
        oneTimeT3SummonUsed: Boolean(gameState.oneTimeT3SummonUsed),
        bossStage: BOSS_SANCTUM.bossStage,
        allStagesCleared: BOSS_SANCTUM.allStagesCleared,
        guardLevels: {
          supreme: SUPREME_TOWN_GUARD.level || 1,
          arcane: ARCANE_TOWN_GUARD.level || 1
        },
        camera: {
          x: Math.round(camera.targetX),
          y: Math.round(camera.targetY),
          userZoom: Number(camera.targetUserZoom.toFixed(3))
        },
        plots: village.plots.map(p => ({
          id: p.id,
          x: p.x,
          y: p.y,
          building: p.building ? {
            type: p.building.type,
            level: p.building.level,
            unlockedMaxLevel: p.building.unlockedMaxLevel || p.building.level,
            investedGold: p.building.investedGold || p.building.buildCost,
            hp: typeof p.building.hp === 'number' ? Math.round(p.building.hp) : undefined
          } : null
        })),
        hunters: hunters.map(h => ({
          id: h.id,
          name: h.name,
          gender: h.gender || 'M',
          job: h.baseJob || h.job,
          baseJob: h.baseJob || h.job,
          currentJobName: h.currentJobName || h.job,
          advancementPath: Array.isArray(h.advancementPath) ? h.advancementPath : [],
          baseAtk: h.baseAtk,
          baseDef: h.baseDef,
          crit: h.crit,
          hairColor: h.hairColor,
          armorColor: h.armorColor,
          personalityId: h.personality?.id || 'brave',
          alignment: Math.max(-100, Math.min(100, Math.round(Number(h.alignment) || 0))),
          equipment: JSON.stringify(h.equipment),
          potions: JSON.stringify(h.potions || { hp: 2, mp: 2 }),
          advancementTier: h.advancementTier || 0,
          transcendCount: h.transcendCount || 0,
          birthGrade: h.birthGrade || '', // 태생 등급 (js/37-hunter-grade.js)
          locked: !!h.locked, // 🔒 잠금 (추방 방지 · js/38-hunter-lock.js)
          rebirthCount: h.rebirthCount || 0,
          level: h.level || 1,
          exp: h.exp || 0,
          hp: h.hp,
          mp: h.mp,
          hunger: h.hunger,
          fatigue: h.fatigue,
          personalGold: h.personalGold,
          bento: h.bento || 0,
          materials: h.materials,
          lootInventoryJson: JSON.stringify(h.lootInventory || { beginner: 0, mid: 0, high: 0 }),
          inventoryJson: JSON.stringify(h.inventory ? h.inventory.toJSON() : []),
          earnedGold: h.earnedGold || 0,
          bestDungeonFloor: h.bestDungeonFloor || 0,
          equippedInsigniaId: h.equippedInsigniaId || null,
          equippedWingId: h.equippedWingId || null,
          wingEnhance: h.wingEnhance || 0,
          monsterKillAlignmentProgress: h.monsterKillAlignmentProgress || 0,
          x: h.x,
          y: h.y,
          skillsJson: JSON.stringify(h.skills)
        })),
        orcUnits: ORC_STRONGHOLD_ZONE.orcs.map((o, idx) => {
          ensureOrcUnitFields(o, idx);
          return {
            id: o.id,
            name: o.name,
            role: o.role,
            isGreatWarrior: Boolean(o.isGreatWarrior),
            level: o.level || 1,
            killCount: o.killCount || 0,
            monsterKillCount: o.monsterKillCount || 0,
            totalKillCount: o.totalKillCount || ((o.killCount || 0) + (o.monsterKillCount || 0)),
            hp: Math.round(o.hp ?? o.maxHp ?? 10000),
            isDead: Boolean(o.isDead),
            respawnRemainingMs: Math.max(0, Math.round(o.respawnRemainingMs || 0)),
            x: Math.round(o.x ?? o.homeX ?? 2615),
            y: Math.round(o.y ?? o.homeY ?? 0),
            homeX: Math.round(o.homeX ?? o.x ?? 2615),
            homeY: Math.round(o.homeY ?? o.y ?? 0)
          };
        }),
        colosseum: serializeColosseumSaveData(),
        offlineRates: typeof getOfflineRatesForSave === 'function' ? getOfflineRatesForSave() : null,
        relationsJson: JSON.stringify(Array.from(interactionManager.relations.entries()))
      };
    }

    // [결투장 기록] 시즌 번호 · 헌터별 우승/준우승/참가/승점/상금/결투 전적 · 최근 대회 기록
    function pickColosseumFighter(f) {
      if (!f) return null;
      return { id: f.id, name: f.name, displayJob: f.displayJob, jobIcon: f.jobIcon };
    }

    function serializeColosseumSaveData() {
      if (typeof COLOSSEUM_STATE === 'undefined') return null;
      return {
        season: Math.max(1, Math.floor(Number(COLOSSEUM_STATE.season) || 1)),
        lastSlotKey: COLOSSEUM_STATE.lastTriggeredSlotKey || null, // 마지막으로 자동 개막한 시간 (중복 개막 방지)
        standings: Array.from(COLOSSEUM_STATE.standings.values()).map(st => ({
          id: st.id,
          name: st.name,
          displayJob: st.displayJob,
          jobIcon: st.jobIcon,
          points: st.points || 0,
          prizeGold: st.prizeGold || 0,
          wins: st.wins || 0,
          runnerUps: st.runnerUps || 0,
          participations: st.participations || 0,
          duelWins: st.duelWins || 0,
          duelLosses: st.duelLosses || 0
        })),
        history: (COLOSSEUM_STATE.history || []).map(r => ({
          season: r.season,
          timestamp: r.timestamp,
          triggerLabel: r.triggerLabel,
          participantCount: r.participantCount,
          champion: pickColosseumFighter(r.champion),
          runnerUp: pickColosseumFighter(r.runnerUp)
        })),
        tournament: typeof serializeColosseumTournament === 'function' ? serializeColosseumTournament() : null
      };
    }

    function applyColosseumSaveData(saved) {
      if (typeof COLOSSEUM_STATE === 'undefined') return;
      const src = saved && typeof saved === 'object' ? saved : null;
      COLOSSEUM_STATE.season = Math.max(1, Math.floor(Number(src?.season) || 1));
      COLOSSEUM_STATE.lastTriggeredSlotKey = (src && typeof src.lastSlotKey === 'string') ? src.lastSlotKey : null;
      COLOSSEUM_STATE.standings = new Map();
      (Array.isArray(src?.standings) ? src.standings : []).forEach(st => {
        if (!st || st.id === undefined || st.id === null) return;
        COLOSSEUM_STATE.standings.set(st.id, {
          id: st.id,
          name: st.name || '',
          displayJob: st.displayJob || '',
          jobIcon: st.jobIcon || '',
          points: Number(st.points) || 0,
          prizeGold: Number(st.prizeGold) || 0,
          wins: Number(st.wins) || 0,
          runnerUps: Number(st.runnerUps) || 0,
          participations: Number(st.participations) || 0,
          duelWins: Number(st.duelWins) || 0,
          duelLosses: Number(st.duelLosses) || 0
        });
      });
      COLOSSEUM_STATE.history = Array.isArray(src?.history) ? src.history.filter(Boolean) : [];
      // 마지막 토너먼트 대진표·경기 기록 복원
      if (typeof restoreColosseumTournament === 'function') restoreColosseumTournament(src?.tournament || null);
    }

    function mergeHunterSkillsNonDestructive(hunter, savedSkillsRaw) {
      const savedSkills = safeParseJson(savedSkillsRaw, null);
      if (!savedSkills || typeof savedSkills !== 'object') return;

      ['actives', 'passives'].forEach((cat) => {
        const savedList = Array.isArray(savedSkills[cat]) ? savedSkills[cat] : [];
        const currentList = hunter.skills[cat] || [];

        savedList.forEach((sItem, idx) => {
          if (!sItem) return;
          const match = currentList.find(c => (sItem.id && c.id === sItem.id) || c.name === sItem.name) || currentList[idx];
          if (match) {
            match.lv = Math.min(SKILL_SYSTEM_CONFIG.maxSkillLevel, Math.max(1, sItem.lv || 1));
            match.uses = Math.max(0, sItem.uses || 0);
            match.reqUses = SKILL_SYSTEM_CONFIG.getRequiredUses(match.lv);
          } else {
            hunter.learnSkill(cat, sItem);
          }
        });
      });
    }

    function applyLoadedSaveData(rawData) {
      const data = normalizeAndMigrateSaveData(rawData);
      if (!data) return;

      if (typeof data.gold === 'number') gameState.gold = data.gold;
      if (typeof data.subjugationPoints === 'number') {
        gameState.subjugationPoints = Math.max(0, Math.floor(data.subjugationPoints));
      }
      // 🎒 유저 인벤토리 · 추방 보너스 정원 (js/25-user-inventory.js)
      gameState.userInventory = {};
      Object.entries(data.userInventory || {}).forEach(([k, v]) => {
        const n = Math.max(0, Math.floor(Number(v) || 0));
        if (n > 0) gameState.userInventory[k] = n;
      });
      gameState.banishBonusSlots = Math.max(0, Math.min(20, Math.floor(Number(data.banishBonusSlots) || 0)));
      gameState.rewardFlags = { ...(data.rewardFlags || {}) };
      gameState.shopBonusSlots = Math.max(0, Math.min(100, Math.floor(Number(data.shopBonusSlots) || 0)));
      gameState.mailbox = {
        claimed: Array.isArray(data.mailbox?.claimed) ? [...data.mailbox.claimed] : [],
        personal: Array.isArray(data.mailbox?.personal) ? JSON.parse(JSON.stringify(data.mailbox.personal)) : []
      };
      gameState.shopPurchases = JSON.parse(JSON.stringify(data.shopPurchases || {}));
      if (data.villageId) gameState.villageId = data.villageId;
      gameState.saveSeq = Math.max(0, Math.floor(Number(data.saveSeq) || 0));
      // 👑 왕국 (js/34-kingdom.js): 병력 · 건물 부지
      // (병력 · 건물 · 다리 · 정리된 칸 · 정리 지시를 모두 그대로 가져온다 · 모양 정리는 34-kingdom.js getKingdomState)
      gameState.kingdom = data.kingdom && typeof data.kingdom === 'object'
        ? JSON.parse(JSON.stringify(data.kingdom))
        : { units: [], sites: {} };
      // 👹 Lv.99 오크 증원 (js/39-orc-reinforce.js): 쌓인 시간 · 증원 오크 목록
      gameState.orcReinforce = data.orcReinforce && typeof data.orcReinforce === "object"
        ? JSON.parse(JSON.stringify(data.orcReinforce))
        : null;
      // 🤖 자동 추방 슬롯 (js/41-auto-banish.js)
      gameState.autoBanish = data.autoBanish && typeof data.autoBanish === "object"
        ? JSON.parse(JSON.stringify(data.autoBanish))
        : null;
      // 유저 고유 코드 (js/33-user-code.js): 저장에 코드가 있으면 그 코드를 쓴다
      if (typeof data.userCode === 'string' && /^[A-Z0-9]{8}$/.test(data.userCode)) {
        gameState.userCode = data.userCode;
        gameState.userCodeCreatedAt = Number(data.userCodeCreatedAt) || 0;
      }
      gameState.oneTimeT3SummonUsed = Boolean(data.oneTimeT3SummonUsed);
      if (typeof data.bossStage === 'number') {
        BOSS_SANCTUM.bossStage = Math.max(1, Math.min(BOSS_SANCTUM.maxBossStage, data.bossStage));
      }
      if (typeof data.allStagesCleared === 'boolean') {
        BOSS_SANCTUM.allStagesCleared = data.allStagesCleared;
      }
      applyColosseumSaveData(data.colosseum);
      SUPREME_TOWN_GUARD.level = data.guardLevels?.supreme || 1;
      ARCANE_TOWN_GUARD.level = data.guardLevels?.arcane || 1;
      getTownGuardsList().forEach(e => syncTownGuardStats(e, true));
      resetBossSanctumMonster();
      syncOrcStrongholdPopulation();

      if (Array.isArray(data.orcUnits) && data.orcUnits.length > 0) {
        const ob = ORC_STRONGHOLD_ZONE.bounds;
        data.orcUnits.forEach((savedOrc, idx) => {
          if (!savedOrc || typeof savedOrc !== 'object') return;
          const isSavedLord = savedOrc.role === '군락지 지배자' || savedOrc.name === '오크 대장' || savedOrc.name === '오크 철혈대족장' || savedOrc.name === '오크 로드';
          const targetOrc = ORC_STRONGHOLD_ZONE.orcs.find(
            o => (savedOrc.id && o.id === savedOrc.id) ||
                 (Boolean(savedOrc.isGreatWarrior) && Boolean(o.isGreatWarrior)) ||
                 (isSavedLord && o.role === '군락지 지배자')
          ) || ORC_STRONGHOLD_ZONE.orcs[idx];

          if (targetOrc) {
            if (isSavedLord || targetOrc.role === '군락지 지배자') {
              targetOrc.name = '오크 로드';
            }
            targetOrc.level = Math.max(1, Math.min(ORC_MAX_LEVEL, Math.floor(Number(savedOrc.level) || 1)));
            targetOrc.killCount = Math.max(0, Math.floor(Number(savedOrc.killCount) || 0));
            targetOrc.monsterKillCount = Math.max(0, Math.floor(Number(savedOrc.monsterKillCount) || 0));
            targetOrc.totalKillCount = Math.max(
              Math.floor(Number(savedOrc.totalKillCount) || 0),
              targetOrc.killCount + targetOrc.monsterKillCount
            );
            targetOrc.isDead = Boolean(savedOrc.isDead);
            targetOrc.respawnRemainingMs = targetOrc.isDead
              ? Math.max(0, Math.min(ORC_RESPAWN_DURATION_MS, Math.floor(Number(savedOrc.respawnRemainingMs) || ORC_RESPAWN_DURATION_MS)))
              : 0;
            if (typeof savedOrc.homeX === 'number' && savedOrc.homeX >= ob.x + 20 && savedOrc.homeX <= ob.x + ob.w - 20) {
              targetOrc.homeX = savedOrc.homeX;
            }
            if (typeof savedOrc.homeY === 'number' && savedOrc.homeY >= ob.y + 20 && savedOrc.homeY <= ob.y + ob.h - 20) {
              targetOrc.homeY = savedOrc.homeY;
            }
            if (typeof savedOrc.x === 'number' && savedOrc.x >= ob.x - 800 && savedOrc.x <= ob.x + ob.w - 14) {
              targetOrc.x = savedOrc.x;
            } else {
              targetOrc.x = targetOrc.homeX;
            }
            if (typeof savedOrc.y === 'number' && savedOrc.y >= ob.y + 14 && savedOrc.y <= ob.y + ob.h - 14) {
              targetOrc.y = savedOrc.y;
            } else {
              targetOrc.y = targetOrc.homeY;
            }
            ensureOrcUnitFields(targetOrc, idx);
            if (!targetOrc.isDead && typeof savedOrc.hp === 'number' && savedOrc.hp > 0) {
              targetOrc.hp = targetOrc.name === '오크 로드'
                ? targetOrc.maxHp
                : Math.min(targetOrc.maxHp, savedOrc.hp);
            }
          }
        });
      }

      // 1) 부지 및 건물 비파괴 복원 + 패치로 새로 추가된 기본 부지 자동 병합
      const maxAllowedUnlock = BOSS_SANCTUM.allStagesCleared ? MAX_BUILDING_LEVEL : BOSS_SANCTUM.bossStage;
      village.plots.length = 0;
      const existingPlotIds = new Set();
      const sortedPlots = [...data.plots].sort((a, b) => (b.building ? 1 : 0) - (a.building ? 1 : 0));

      sortedPlots.forEach(pData => {
        if (!pData) return;
        let px = typeof pData.x === 'number' ? pData.x : 0;
        let py = typeof pData.y === 'number' ? pData.y : 150;
        if (village.isCoordOccupied(px, py)) {
          if (!pData.building) return;
          const altCoord = village.getNextExpansionCoord();
          if (!altCoord) return;
          px = altCoord.x;
          py = altCoord.y;
        }
        const hasValidBuilding = pData.building && BUILDING_CATALOG[pData.building.type];
        const catMaxLv = hasValidBuilding ? (BUILDING_CATALOG[pData.building.type].maxLevel || MAX_BUILDING_LEVEL) : MAX_BUILDING_LEVEL;
        const bLv = hasValidBuilding ? Math.max(1, Math.min(catMaxLv, pData.building.level || 1)) : 1;
        const rawUnlock = hasValidBuilding ? (pData.building.unlockedMaxLevel || bLv) : 1;
        const validUnlock = Math.max(bLv, Math.min(Math.max(rawUnlock, maxAllowedUnlock >= bLv ? rawUnlock : bLv), catMaxLv));
        const plotId = pData.id || `plot_migrated_${village.plots.length}`;
        const plot = village.addPlot(
          plotId,
          px,
          py,
          hasValidBuilding ? pData.building.type : null,
          bLv,
          hasValidBuilding ? validUnlock : null
        );
        existingPlotIds.add(plotId);
        if (plot.building && pData.building?.investedGold) {
          plot.building.investedGold = pData.building.investedGold;
        }
        // 건물 체력 (js/31-building-hp.js) · 저장된 값이 있으면 그 레벨 기준으로 유지
        if (plot.building && typeof pData.building?.hp === 'number') {
          plot.building.hp = Math.max(1, pData.building.hp);
          plot.building.hpLevel = plot.building.level;
        }
      });

      // 패치로 추가된 신규 기본 부지가 있다면 기존 건물을 건드리지 않고 빈 부지로 병합
      DEFAULT_PLOT_BLUEPRINTS.forEach((bp) => {
        if (!existingPlotIds.has(bp.id) && !village.isCoordOccupied(bp.x, bp.y)) {
          const alreadyHasType = bp.type && village.getAllBuildings().some(b => b.type === bp.type);
          village.addPlot(bp.id, bp.x, bp.y, alreadyHasType ? null : bp.type, bp.level);
        }
      });

      // 2) 헌터 목록 비파괴 복원 (구버전 필드/스킬 구조 자동 마이그레이션 포함)
      if (Array.isArray(data.hunters)) {
        hunters.length = 0;
        data.hunters.forEach((hData, idx) => {
          if (!hData) return;
          const normalizedJob = LEGACY_JOB_MAP[hData.job] || LEGACY_JOB_MAP[hData.jobId] || hData.job || '버서커';
          const arch = JOB_ARCHETYPES.find(a => a.job === normalizedJob) || JOB_ARCHETYPES[0];
          const parsedEquip = safeParseJson(hData.equipment, {});

          const restored = new Hunter(
            hData.id || `h_restored_${idx}_${Date.now()}`,
            {
              name: hData.name || '모험가',
              gender: (hData.gender === 'M' || hData.gender === 'F') ? hData.gender : undefined,
              job: arch.job,
              baseJob: arch.job,
              currentJobName: hData.currentJobName || arch.job,
              advancementPath: Array.isArray(hData.advancementPath) ? hData.advancementPath : [],
              baseAtk: typeof hData.baseAtk === 'number' ? hData.baseAtk : arch.baseAtk,
              baseDef: typeof hData.baseDef === 'number' ? hData.baseDef : arch.baseDef,
              crit: typeof hData.crit === 'number' ? hData.crit : arch.crit,
              hair: hData.hairColor || arch.hair,
              armor: hData.armorColor || arch.armor,
              advancementTier: hData.advancementTier || 0,
              rebirthCount: hData.rebirthCount || 0,
              level: hData.level || 1,
              equipment: parsedEquip
            },
            typeof hData.x === 'number' ? hData.x : 0,
            typeof hData.y === 'number' ? hData.y : 20
          );

          // 이전 세이브에서 환생 횟수가 전직 경로보다 많을 경우 누락된 전직 단계 자동 계승
          while (restored.advancementPath.length < restored.rebirthCount) {
            const tempRebirth = restored.rebirthCount;
            restored.rebirthCount = restored.advancementPath.length;
            const choices = getNextAdvancementChoices(restored);
            restored.rebirthCount = tempRebirth;
            if (!choices.length) break;
            const picked = choices.length >= 2
              ? restored.chooseAdvancementOption(choices[0], choices[1])
              : choices[0];
            restored.advancementPath.push(picked.id);
            restored.advancementTier = restored.advancementPath.length;
            restored.currentJobName = picked.name;
            restored.learnSkill('actives', picked.activeSkill);
            restored.learnSkill('passives', picked.passiveSkill);
          }

          const foundP = HUNTER_PERSONALITIES.find(p => p.id === hData.personalityId);
          if (foundP) restored.personality = foundP;
          if (typeof hData.alignment === 'number') {
            restored.alignment = Math.max(-100, Math.min(100, Math.round(hData.alignment)));
          }
          if (typeof hData.monsterKillAlignmentProgress === 'number') {
            restored.monsterKillAlignmentProgress = Math.max(0, Math.min(2, Math.floor(hData.monsterKillAlignmentProgress)));
          }

          const parsedPotions = safeParseJson(hData.potions, null);
          if (parsedPotions && typeof parsedPotions === 'object') {
            const maxHpPot = getMaxHpPotionCapacity(restored.level, restored.rebirthCount);
            const maxMpPot = getMaxMpPotionCapacity(restored.level, restored.rebirthCount);
            restored.potions = {
              hp: Math.min(maxHpPot, Math.max(0, parsedPotions.hp ?? 2)),
              mp: Math.min(maxMpPot, Math.max(0, parsedPotions.mp ?? 2))
            };
          }

          mergeHunterSkillsNonDestructive(restored, hData.skillsJson || hData.skills);

          restored.transcendCount = Math.max(0, Math.min(5, restored.rebirthCount || 0, Math.floor(Number(hData.transcendCount) || 0)));
          if (typeof hData.birthGrade === 'string' && hData.birthGrade) restored.birthGrade = hData.birthGrade; // 태생 등급
          restored.locked = !!hData.locked; // 🔒 잠금
          restored.recalculateVitals(false);
          restored.exp = typeof hData.exp === 'number' ? hData.exp : 0;
          if (typeof hData.hp === 'number') restored.hp = Math.min(restored.maxHp, Math.max(1, hData.hp));
          if (typeof hData.mp === 'number') restored.mp = Math.min(restored.maxMp, Math.max(0, hData.mp));

          const savedHunger = typeof hData.hunger === 'number' ? hData.hunger : hData.satiety;
          if (typeof savedHunger === 'number') restored.hunger = savedHunger;
          if (typeof hData.fatigue === 'number') restored.fatigue = hData.fatigue;

          const savedGold = typeof hData.personalGold === 'number' ? hData.personalGold : hData.gold;
          if (typeof savedGold === 'number') restored.personalGold = savedGold;
          const maxBento = getMaxBentoCapacity(restored.level, restored.rebirthCount);
          if (maxBento > 0) {
            restored.bento = typeof hData.bento === 'number'
              ? Math.min(maxBento, Math.max(0, hData.bento))
              : maxBento;
          } else {
            restored.bento = 0;
          }
          if (typeof hData.materials === 'number') restored.materials = hData.materials;
          const parsedInvArr = safeParseJson(hData.inventoryJson || hData.inventoryItems, null);
          if (Array.isArray(parsedInvArr) && parsedInvArr.length > 0) {
            restored.inventory.loadFromJSON(parsedInvArr);
          } else {
            const parsedLootInv = safeParseJson(hData.lootInventoryJson || hData.lootInventory, null);
            if (parsedLootInv && typeof parsedLootInv === 'object') {
              restored.lootInventory = {
                beginner: Math.max(0, parsedLootInv.beginner || 0),
                mid: Math.max(0, parsedLootInv.mid || 0),
                high: Math.max(0, parsedLootInv.high || 0)
              };
            }
          }
          if (typeof hData.earnedGold === 'number') restored.earnedGold = hData.earnedGold;
          if (typeof hData.equippedWingId === 'number') {
            restored.equippedWingId = null;
          }
          if (hData.equippedWingId && ITEM_CATALOG[hData.equippedWingId]) {
            restored.equippedWingId = hData.equippedWingId;
          }
          if (typeof hData.wingEnhance === 'number') {
            restored.wingEnhance = Math.max(0, Math.min(15, Math.floor(hData.wingEnhance)));
          }
          restored.syncAutoEquipInsignia();
          restored.syncAutoEquipWing();

          restored.pickNextDestination();
          hunters.push(restored);
        });
      }

      // 3) 헌터 간 관계도 복원
      if (data.relationsJson) {
        const entries = safeParseJson(data.relationsJson, null);
        if (Array.isArray(entries)) {
          interactionManager.relations = new Map(entries);
        }
      }

      // 4) 카메라 시점 복원
      if (data.camera) {
        camera.x = camera.targetX = data.camera.x;
        camera.y = camera.targetY = data.camera.y;
        camera.userZoom = camera.targetUserZoom = data.camera.userZoom;
        camera._clampTargetBounds();
      }

      closeBuildingPanel();
      closeHunterPanel();
      updateResourceHUD();
      updateBossRaidHudButton();
    }

    function writeLocalSaveMirrors(payload) {
      if (isResettingProgress) return false;
      let savedLocally = false;
      const serialized = JSON.stringify(payload);
      try {
        localStorage.setItem(PERSISTENT_MASTER_KEY, serialized);
        localStorage.setItem(LEGACY_SAVE_KEYS[0], serialized);
        savedLocally = true;
      } catch (_) {}
      writeWindowNameBackup(payload);
      writeIndexedDBBackup(payload);
      return savedLocally;
    }

    // 페이지 이탈·새로고침·패치 덮어쓰기 직전 동기 즉시 백업
    function flushSyncBackup() {
      if (!isStorageReady || isResettingProgress) return;
      try {
        const payload = serializeGameSaveData();
        writeLocalSaveMirrors(payload);
      } catch (_) {}
    }

    function scheduleAutoSave(delayMs = 1200) {
      if (!isStorageReady || isResettingProgress) return;
      clearTimeout(debouncedSaveTimer);
      debouncedSaveTimer = setTimeout(() => {
        saveProgressToStorage(false);
      }, delayMs);
    }

    async function saveProgressToStorage(isManual = true) {
      if (isResettingProgress) return;
      const payload = serializeGameSaveData();
      const savedLocally = writeLocalSaveMirrors(payload);

      if (db && currentUser && firestoreSetDoc && firestoreDoc) {
        try {
          const saveRef = firestoreDoc(db, 'artifacts', appId, 'users', currentUser.uid, 'villageSaves', 'mainSlot');
          await firestoreSetDoc(saveRef, payload);
          if (isManual) showToast('💾 마을과 헌터 진행 상황이 안전하게 저장되었습니다!');
          return;
        } catch (_) {}
      }

      if (isManual) {
        showToast(savedLocally ? '💾 진행 상황이 영구 저장소에 저장되었습니다!' : '⚠️ 저장 중 오류가 발생했습니다.');
      }
    }

    // 상태 변경 시 자동 저장 트리거 연결
    const _origUpdateResourceHUD = updateResourceHUD;
    updateResourceHUD = function (...args) {
      _origUpdateResourceHUD.apply(this, args);
      if (isStorageReady) scheduleAutoSave(1200);
    };

    const _origUpdateBossRaidHudButton = updateBossRaidHudButton;
    updateBossRaidHudButton = function (...args) {
      _origUpdateBossRaidHudButton.apply(this, args);
      if (isStorageReady && BOSS_SANCTUM.status === 'CLOSED') scheduleAutoSave(1200);
    };

    window.addEventListener('pagehide', flushSyncBackup);
    window.addEventListener('beforeunload', flushSyncBackup);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushSyncBackup();
    });

    async function initStorageSystem() {
      const barEl = document.getElementById('loadingBarFill');
      const statusEl = document.getElementById('loadingStatusText');

      try {
        const localData = await findBestLocalSaveCandidate();

        if (typeof __firebase_config === 'undefined') {
          if (localData) {
            applyLoadedSaveData(localData);
            isStorageReady = true;
            writeLocalSaveMirrors(serializeGameSaveData());
            window.finishGameLoading?.('이전 마을 및 헌터 데이터를 복원했습니다!');
            // 게임이 꺼져 있던 시간만큼 자리 비운 동안 보상 지급 (js/24-offline-rewards.js)
            setTimeout(() => window.grantOfflineRewardsForLoadedSave?.(localData, 'closed'), 400);
          } else {
            isStorageReady = true;
            writeLocalSaveMirrors(serializeGameSaveData());
            window.finishGameLoading?.('새 모험가 마을을 시작합니다!');
          }
          return;
        }

        if (barEl) barEl.style.width = '45%';
        if (statusEl) statusEl.textContent = '모험가 길드 서버에 연결 중...';

        const [appMod, authMod, fsMod] = await Promise.all([
          import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js"),
          import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"),
          import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js")
        ]);

        const firebaseConfig = JSON.parse(__firebase_config);
        const app = appMod.initializeApp(firebaseConfig);
        db = fsMod.getFirestore(app);
        auth = authMod.getAuth(app);
        firestoreSetDoc = fsMod.setDoc;
        firestoreDoc = fsMod.doc;

        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          const cred = await authMod.signInWithCustomToken(auth, __initial_auth_token);
          currentUser = cred.user;
        } else {
          const cred = await authMod.signInAnonymously(auth);
          currentUser = cred.user;
        }

        if (barEl) barEl.style.width = '78%';
        if (statusEl) statusEl.textContent = '저장된 마을 및 헌터 데이터 불러오는 중...';

        const saveRef = fsMod.doc(db, 'artifacts', appId, 'users', currentUser.uid, 'villageSaves', 'mainSlot');
        const snap = await fsMod.getDoc(saveRef);
        const cloudData = snap.exists() ? normalizeAndMigrateSaveData(snap.data()) : null;

        // 클라우드와 로컬 중 더 최신 진행 데이터를 자동 선택
        const chosenData = (cloudData && localData)
          ? ((cloudData.savedAt >= localData.savedAt) ? cloudData : localData)
          : (cloudData || localData);

        if (chosenData) {
          applyLoadedSaveData(chosenData);
          isStorageReady = true;
          writeLocalSaveMirrors(serializeGameSaveData());
          window.finishGameLoading?.('이전 마을 및 헌터 데이터를 복원했습니다!');
          showToast('📂 기존 마을과 헌터 진행 상황을 불러왔습니다!');
        } else {
          isStorageReady = true;
          writeLocalSaveMirrors(serializeGameSaveData());
          window.finishGameLoading?.('새로운 모험가 마을을 열었습니다!');
        }
      } catch (err) {
        try {
          const fallbackLocal = await findBestLocalSaveCandidate();
          if (fallbackLocal) applyLoadedSaveData(fallbackLocal);
        } catch (_) {}
        isStorageReady = true;
        window.finishGameLoading?.('오프라인 모드로 마을을 시작합니다!');
      } finally {
        isStorageReady = true;
        setInterval(() => {
          saveProgressToStorage(false);
        }, 25000);
      }
    }

    document.getElementById('btnSaveCloud')?.addEventListener('click', () => {
      saveProgressToStorage(false);
      openSaveCodeModal();
    });
