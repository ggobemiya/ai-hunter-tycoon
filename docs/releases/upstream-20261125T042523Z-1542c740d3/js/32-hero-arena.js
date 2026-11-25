// [32-hero-arena] ⚔️ 영웅의 투기장 (5환생 전용 · 무한 PvP 배틀필드)
    // ============================================================================
    // - 마을 성벽 바로 위(북쪽)에 붙어 있는 원형 대형 투기장 (석조 외벽 · 모래 경기장).
    // - 5환생 + 천공의 섬과 같은 최소 장비(전 부위 T7 이상 · 평균 +10강) 헌터만 입장.
    // - 마을 북쪽 끝 [투기장 입구]까지 걸어가면 투기장 안으로 순간 이동한다.
    // - 몬스터가 없고, 안의 영웅끼리 가장 가까운 상대와 끝없이 싸운다 (08-hunter-class.js PvP 판정 HERO_ARENA).
    //   · 투기장 대결은 정식 경기라 인성 감소 · 약탈 · 관계도 변화가 없다.
    // - 상대를 쓰러뜨리면 경험치와 골드를 얻는다 (ARENA_CFG). 경험치는 5환생 Lv.1→99 약 24시간이 유지되도록 맞춘 값.
    // - 투기장 안에서는 HP/MP 물약을 쓰지 않는다 (도시락은 먹음).
    // - 상대를 고를 때 이미 싸우는 중인 영웅보다 교전하지 않는 영웅을 먼저 노린다 (08-hunter-class.js).
    // - 쓰러져도 포만감·피로가 괜찮으면 1초 뒤 투기장 안 아무 곳에서 체력·MP 가득 찬 채 부활한다.
    //   배고프거나 지쳤으면 마을로 돌아가 정비(휴식 · 식사 · 치료)한 뒤 다시 온다.
    // - 상대가 없으면(영웅이 1명뿐일 때 등) 🧘 홀로 수련: 시간에 따라 경험치를 얻는다 (ARENA_CFG.soloTrainExpBase).
    // ============================================================================
    const ARENA_CFG = {
      // 처치 1회 경험치 = expPerKillBase × (1 + 레벨 × expPerKillLvSlope)
      expPerKillBase: 8000,        // 시뮬레이션으로 맞춤 (물약 금지 · 투기장 안 부활 적용 후): 5환생 영웅 10명 기준 Lv.1→99 약 24.2시간
      expPerKillLvSlope: 0.0075,
      goldPerKill: 30000,          // 처치 1회 개인 골드
      preferChance: 0.85,          // 5환생 영웅이 사냥터를 고를 때 투기장을 우선할 확률 (재료가 필요하면 재료 사냥터 먼저)
      soloTrainStartSec: 3,        // 상대가 없으면 이만큼 지난 뒤부터 홀로 수련
      soloTrainExpBase: 700,       // 홀로 수련 초당 경험치 = soloTrainExpBase × (1 + 레벨 × 0.0064) (몬스터 사냥과 비슷한 속도)
      respawnDelaySec: 1,          // 쓰러진 뒤 투기장 안에서 다시 나타나기까지 (초)
      respawnMinHunger: 38,        // 포만감이 이 이상이고
      respawnMaxFatigue: 78,       // 피로가 이 미만이면 마을로 가지 않고 투기장에서 부활 (헌터 AI 휴식·식사 기준과 같음)
      entrance: { x: 0, y: -380 }  // 마을 북쪽 끝 투기장 입구
    };

    const HERO_ARENA_GROUND = {
      id: 'hero_arena_field',
      name: '영웅의 투기장 (5환생 전용 · 무한 PvP)',
      icon: '⚔️',
      zoneType: 'HERO_ARENA',
      walkable: false,
      minRebirth: 5,
      minRecLv: 1,
      maxRecLv: 99,
      // 타원형 경기장 (가로 반지름 340 · 세로 반지름 240)
      centerX: 0,
      centerY: -850,   // 마을 성벽(위쪽 끝 y -470) 바로 위 (앞쪽 외벽 높이까지 고려)
      radiusX: 340,
      radiusY: 240,
      bounds: { x: -340, y: -1090, w: 680, h: 480 },
      baseExp: 0,
      baseGold: 0,
      baseMonsterCount: 0,
      maxMonsterCount: 0,
      maxCountedHunters: 0,
      monsterTemplates: [],
      monsters: [],
      lootSpec: null
    };
    ALL_FIELD_GROUNDS.push(HERO_ARENA_GROUND);
    ZONE_RULES.HERO_ARENA = { label: '영웅의 투기장 (무한 PvP)', allowPk: true };

    function isPointInHeroArena(x, y, pad = 30) {
      const g = HERO_ARENA_GROUND;
      const nx = (x - g.centerX) / (g.radiusX + pad);
      const ny = (y - g.centerY) / (g.radiusY + pad);
      return nx * nx + ny * ny <= 1;
    }

    function isHunterHuntingInArena(h) {
      return h && h.state === 'HUNTING_FIELD' && h.activeGroundId === HERO_ARENA_GROUND.id;
    }

    function canHunterEnterHeroArena(h) {
      if (!h || (h.rebirthCount || 0) < HERO_ARENA_GROUND.minRebirth) return false;
      return typeof meetsSkyIslandGear === 'function' ? meetsSkyIslandGear(h) : true;
    }

    function pickArenaSpawnPoint() {
      const g = HERO_ARENA_GROUND;
      const a = Math.random() * Math.PI * 2;
      const r = 0.35 + Math.random() * 0.5;
      return { x: g.centerX + Math.cos(a) * g.radiusX * r, y: g.centerY + Math.sin(a) * g.radiusY * r };
    }

    function getArenaExpPerKill(level) {
      return Math.round(ARENA_CFG.expPerKillBase * (1 + Math.max(1, level || 1) * ARENA_CFG.expPerKillLvSlope));
    }

    function getArenaSoloTrainExpPerSec(level) {
      return ARENA_CFG.soloTrainExpBase * (1 + Math.max(1, level || 1) * 0.0064);
    }

    // 투기장 입구로 걸어가기 (도착하면 update 훅에서 순간 이동)
    function startArenaEntry(h) {
      if (!canHunterEnterHeroArena(h)) return false;
      h.arenaEntryPending = true;
      h.setDestinationWithGatePath(ARENA_CFG.entrance.x, ARENA_CFG.entrance.y);
      h.targetBuildingName = '⚔️ 영웅의 투기장 입구';
      h.targetBuildingType = 'hero_arena_gate';
      h.targetGroundId = HERO_ARENA_GROUND.id;
      h.state = 'WALKING';
      interactionManager.spawnBubble(h, '⚔️ 영웅의 투기장으로!', '#fca5a5');
      return true;
    }

    function warpHunterIntoArena(h) {
      const p = pickArenaSpawnPoint();
      h.arenaEntryPending = false;
      h.x = p.x;
      h.y = p.y;
      h.waypoints = [];
      h.state = 'HUNTING_FIELD';
      h.activeGroundId = HERO_ARENA_GROUND.id;
      h.targetGroundId = HERO_ARENA_GROUND.id;
      h.targetBuildingType = 'hunting_ground';
      h.targetBuildingName = HERO_ARENA_GROUND.name;
      h.huntTimer = 60 + Math.random() * 30;
      h.arenaAloneTimer = 0;
      h.currentTargetMonster = null;
      h.currentTargetHunter = null;
      interactionManager.spawnBubble(h, '🏟️ 투기장 입장! 결투 시작!', '#fde047');
    }

    function warpHunterOutOfArena(h, text = '🏟️ 투기장에서 마을로') {
      h.arenaEntryPending = false;
      h.x = ARENA_CFG.entrance.x + (Math.random() - 0.5) * 40;
      h.y = ARENA_CFG.entrance.y + 20;
      h.waypoints = [];
      h.activeGroundId = null;
      h.currentTargetHunter = null;
      h.currentTargetMonster = null;
      if (h.state === 'HUNTING_FIELD' || h.state === 'WALKING') {
        h.state = 'IDLE';
        h.stateTimer = 0.4;
      }
      if (text) interactionManager.spawnBubble(h, text, '#cbd5e1');
    }

    // ---------- 투기장 안 부활 ----------
    // 쓰러져도 포만감이 남아 있고 피로가 심하지 않으면, 마을로 가지 않고 1초 뒤 투기장 안 아무 곳에서 다시 나타난다 (체력·MP 가득).
    // 배고프거나 지쳤으면 예전처럼 마을로 돌아가 정비한다.
    function canArenaRespawn(h) {
      return (h.hunger || 0) >= ARENA_CFG.respawnMinHunger && (h.fatigue || 0) < ARENA_CFG.respawnMaxFatigue;
    }

    function startArenaRespawn(h) {
      h.arenaRespawnTimer = ARENA_CFG.respawnDelaySec;
      const p = pickArenaSpawnPoint(); // 기다리는 동안은 투기장 안에 보이지 않게 둔다 (그리기 생략)
      h.x = p.x;
      h.y = p.y;
      h.activeGroundId = null;
      h.currentTargetHunter = null;
      h.currentTargetMonster = null;
      h.state = 'IDLE';
      h.stateTimer = 999;              // 기다리는 동안 다음 행동을 고르지 않게
      h.targetBuildingType = 'arena_respawn';
      h.targetBuildingName = '⚔️ 투기장 부활 대기';
      h.waypoints = [];
      interactionManager.spawnBubble(h, '💀 쓰러짐 · 1초 뒤 투기장에서 부활!', '#fca5a5');
    }

    function finishArenaRespawn(h) {
      h.arenaRespawnTimer = 0;
      if (h.targetBuildingType !== 'arena_respawn' || !canHunterEnterHeroArena(h)) {
        // 기다리는 사이 레이드 소집 등 다른 일이 생겼으면 그 일을 한다
        if (h.targetBuildingType === 'arena_respawn') {
          h.targetBuildingType = '';
          h.targetBuildingName = '';
          h.stateTimer = 0.2;
        }
        return;
      }
      h.hp = h.maxHp;
      h.mp = h.maxMp;
      warpHunterIntoArena(h);
      interactionManager.spawnBubble(h, '✨ 투기장 부활!', '#fde047');
    }

    // 🧪 투기장 안에서는 HP/MP 물약을 쓰지 않는다 (도시락은 먹을 수 있음)
    (function blockArenaPotions() {
      const origUsePotions = Hunter.prototype.useAutoPotionsInCombat;
      Hunter.prototype.useAutoPotionsInCombat = function (...args) {
        if (!isHunterHuntingInArena(this) || !this.potions) return origUsePotions.apply(this, args);
        const keepHp = this.potions.hp;
        const keepMp = this.potions.mp;
        this.potions.hp = 0;
        this.potions.mp = 0;
        try {
          return origUsePotions.apply(this, args);
        } finally {
          this.potions.hp = keepHp;
          this.potions.mp = keepMp;
        }
      };
    })();

    // ---------- 사냥터 선택 (AI) ----------
    if (typeof evaluateHuntingGroundPreference === 'function') {
      const origEval = evaluateHuntingGroundPreference;
      evaluateHuntingGroundPreference = function (hunter, ground) {
        if (ground && ground.id === HERO_ARENA_GROUND.id) {
          if ((hunter?.rebirthCount || 0) < 5) return { score: 0, matched: false, label: '영웅의 투기장 (5환생 전용)' };
          if (!canHunterEnterHeroArena(hunter)) return { score: 0, matched: false, label: '영웅의 투기장 (전 부위 T7 이상 + 평균 +10강 필요)' };
          // 5환생 영웅의 주 무대: 보통은 투기장을 가장 먼저 고른다 (마을에서 다음 할 일을 정할 때마다 arenaMood를 새로 정함)
          // 장비 승급 재료가 모자라면 재료가 나오는 사냥터(천궁 · 천공의 섬)를 먼저 간다
          const smithy = village.getAllBuildings().find(b => b.type === 'smithy');
          const cand = smithy && typeof hunter.findTierUpgradeCandidate === 'function' ? hunter.findTierUpgradeCandidate(smithy.level) : null;
          const needMats = Boolean(cand && (hunter.materials || 0) < cand.rule.matCost);
          return { score: (!needMats && hunter.arenaMood) ? 200 : 110, matched: true, label: '영웅의 투기장 (무한 PvP · 처치 시 경험치 · 골드)' };
        }
        return origEval(hunter, ground);
      };
    }

    if (typeof sendHunterToGround === 'function') {
      const origSendToGround = sendHunterToGround;
      sendHunterToGround = function (hunter, ground, ...rest) {
        if (ground && ground.id === HERO_ARENA_GROUND.id) return startArenaEntry(hunter);
        return origSendToGround(hunter, ground, ...rest);
      };
    }

    (function hookArenaMood() {
      const origPick = Hunter.prototype.pickNextDestination;
      Hunter.prototype.pickNextDestination = function (...args) {
        if ((this.rebirthCount || 0) >= 5) this.arenaMood = Math.random() < ARENA_CFG.preferChance;
        if (!this.arenaEntryPending) this.arenaEntryPending = false;
        return origPick.apply(this, args);
      };
    })();

    // ---------- 입장 · 퇴장 · 혼자 남음 ----------
    (function hookArenaUpdate() {
      const origUpdate = Hunter.prototype.update;
      Hunter.prototype.update = function (dt) {
        if (this.arenaRespawnTimer > 0) {
          if (this.targetBuildingType === 'arena_respawn') {
            this.arenaRespawnTimer -= dt;
            if (this.arenaRespawnTimer <= 0) finishArenaRespawn(this);
            return;
          }
          this.arenaRespawnTimer = 0; // 다른 일로 바뀜 → 아래에서 투기장 밖으로
        }
        if (this.arenaEntryPending) {
          const d = Math.hypot(this.x - ARENA_CFG.entrance.x, this.y - ARENA_CFG.entrance.y);
          if (d <= 26 && canHunterEnterHeroArena(this)) {
            warpHunterIntoArena(this);
          } else if (this.targetBuildingType !== 'hero_arena_gate') {
            this.arenaEntryPending = false; // 다른 일(레이드 소집 등)로 바뀜
          }
        }
        origUpdate.call(this, dt);

        if (isHunterHuntingInArena(this)) {
          const hasOpponent = hunters.some(o => o !== this && isHunterHuntingInArena(o) && o.hp > 0 && (o.rebirthCount || 0) > 0);
          this.arenaAloneTimer = hasOpponent ? 0 : (this.arenaAloneTimer || 0) + dt;
          // 🧘 홀로 수련: 투기장에 상대가 없으면 시간에 따라 경험치를 얻는다
          if (!hasOpponent && this.arenaAloneTimer >= ARENA_CFG.soloTrainStartSec) {
            const gain = getArenaSoloTrainExpPerSec(this.level) * dt;
            this.arenaSoloExpBuf = (this.arenaSoloExpBuf || 0) + gain;
            if (this.arenaSoloExpBuf >= 1) {
              const whole = Math.floor(this.arenaSoloExpBuf);
              this.arenaSoloExpBuf -= whole;
              this.gainExp(whole);
            }
            this.arenaSoloBubbleTimer = (this.arenaSoloBubbleTimer || 0) - dt;
            if (this.arenaSoloBubbleTimer <= 0) {
              this.arenaSoloBubbleTimer = 10;
              interactionManager.spawnBubble(this, `🧘 홀로 수련 중 · 초당 +${Math.round(getArenaSoloTrainExpPerSec(this.level)).toLocaleString()} EXP`, '#c4b5fd');
            }
          }
        } else if (!this.arenaEntryPending && isPointInHeroArena(this.x, this.y)) {
          // 사냥을 멈췄거나(체력 · 피로 · 레이드 소집) 다른 일로 바뀌면 마을로
          warpHunterOutOfArena(this, '');
        }
      };
    })();

    // 갇힘 구조 · 벽 충돌 예외 (02-boss-rebirth-altar.js가 천궁 판정 함수를 씀)
    if (typeof isHunterInCelestialPalace === 'function') {
      const origInCelestial = isHunterInCelestialPalace;
      isHunterInCelestialPalace = function (h) {
        return origInCelestial(h) || (h && isPointInHeroArena(h.x, h.y));
      };
    }

    // ---------- 투기장 처치: 경험치 · 골드 (약탈 · 인성 · 관계도 변화 없음) ----------
    (function hookArenaKills() {
      if (typeof combatEffects === 'undefined' || typeof combatEffects.applyHitToHunterPvP !== 'function') return;
      const origHit = combatEffects.applyHitToHunterPvP;
      combatEffects.applyHitToHunterPvP = function (attacker, defender, dmg, isCrit) {
        if (defender && defender.arenaRespawnTimer > 0) return; // 부활 대기 중(보이지 않음)에는 맞지 않음
        const inArena = isHunterHuntingInArena(attacker) && isHunterHuntingInArena(defender);
        if (!inArena) return origHit.call(this, attacker, defender, dmg, isCrit);

        const keep = {
          aGold: attacker.personalGold, aMat: attacker.materials, aAlign: attacker.alignment,
          dGold: defender.personalGold, dMat: defender.materials
        };
        const origToast = showToast;
        const origAff = interactionManager.modifyAffinity;
        const origGain = attacker.gainExp;
        showToast = () => {};
        const origBubble = interactionManager.spawnBubble;
        // 일반 사냥터 PvP 말풍선(인성 -5 · 약탈 골드 · 마을 귀환)은 투기장에서는 띄우지 않는다
        interactionManager.spawnBubble = function (h, text, ...more) {
          if (/PvP 승리|PvP 사망/.test(String(text || ''))) return;
          return origBubble.call(this, h, text, ...more);
        };
        interactionManager.modifyAffinity = () => {};
        attacker.gainExp = () => {}; // 기존 PvP 처치 경험치(120) 대신 투기장 보상
        let r;
        try {
          r = origHit.call(this, attacker, defender, dmg, isCrit);
        } finally {
          showToast = origToast;
          interactionManager.spawnBubble = origBubble;
          interactionManager.modifyAffinity = origAff;
          delete attacker.gainExp;
          if (attacker.gainExp !== origGain) attacker.gainExp = origGain;
        }

        const died = defender.activeGroundId !== HERO_ARENA_GROUND.id;
        if (died) {
          // 약탈 · 인성 감소 되돌리기
          attacker.personalGold = keep.aGold;
          attacker.materials = keep.aMat;
          attacker.alignment = keep.aAlign;
          defender.personalGold = keep.dGold;
          defender.materials = keep.dMat;

          const exp = getArenaExpPerKill(attacker.level);
          attacker.gainExp(exp);
          attacker.personalGold += ARENA_CFG.goldPerKill;
          attacker.arenaKills = (attacker.arenaKills || 0) + 1;
          defender.arenaDeaths = (defender.arenaDeaths || 0) + 1;
          interactionManager.spawnBubble(attacker, '🏆 투기장 승리!', '#fde047'); // 표시만 짧게 (경험치·골드는 그대로 받음)
          if (canArenaRespawn(defender)) {
            startArenaRespawn(defender);
          } else {
            interactionManager.spawnBubble(defender, '💀 투기장에서 쓰러짐 · 마을에서 정비', '#fca5a5');
          }
        }
        return r;
      };
    })();

    // ---------- ⚖️ PvP 공통 밸런스 (투기장 · 상급 사냥터 무법지대 모두) ----------
    // 영웅끼리 한두 방에 끝나던 것을 여러 번 주고받는 결투로 바꾸고, 먼저 때리는 원거리의 이점을 줄인다.
    //   1회 피해 = (원래 피해 - 방어 감산) × damageMult (원거리는 × rangedMult)
    //   단, 상대 최대 체력의 maxHitPct(원거리 rangedMaxHitPct)를 넘지 않음
    //   (시뮬레이션: 5환생 Lv.20·50·80에서 결투 약 26~36초 · 약 25~28타 · 근접 34승 / 원거리 36승)
    const PVP_BALANCE_CFG = {
      damageMult: 1.0,
      rangedMult: 0.9,
      maxHitPct: 0.22,
      rangedMaxHitPct: 0.21
    };

    (function hookPvpBalance() {
      if (typeof combatEffects === 'undefined' || typeof combatEffects.applyHitToHunterPvP !== 'function') return;
      const origHitForBalance = combatEffects.applyHitToHunterPvP;
      combatEffects.applyHitToHunterPvP = function (attacker, defender, dmg, isCrit) {
        if (!attacker || !defender) return origHitForBalance.call(this, attacker, defender, dmg, isCrit);
        const defSub = (defender.getComputedStats().def || 0) * 0.32; // 원래 PvP 방어 감산과 같은 값
        const ranged = attacker.getCombatProfile && attacker.getCombatProfile().style === 'RANGED';
        const mitigated = Math.max(12, (dmg || 0) - defSub);
        const capPct = ranged ? PVP_BALANCE_CFG.rangedMaxHitPct : PVP_BALANCE_CFG.maxHitPct;
        const target = Math.max(8, Math.min(
          mitigated * PVP_BALANCE_CFG.damageMult * (ranged ? PVP_BALANCE_CFG.rangedMult : 1),
          (defender.maxHp || 1) * capPct * (isCrit ? 1.3 : 1)
        ));
        // 원래 함수가 방어 감산을 다시 하므로 그만큼 더해서 넘긴다 → 실제 피해 = target
        return origHitForBalance.call(this, attacker, defender, Math.round(target + defSub), isCrit);
      };
    })();

    // ---------- 그리기: 원형 투기장 · 마을 북쪽 입구 ----------
    function drawHeroArena(ctx) {
      const g = HERO_ARENA_GROUND;
      const t = performance.now() * 0.001;
      const cx = g.centerX;
      const cy = g.centerY;
      const rx = g.radiusX;
      const ry = g.radiusY;
      ctx.save();

      // ── 로마 콜로세움 모양 ──────────────────────────────────────────────
      // 위에서 비스듬히 내려다본 타원형: 바깥 지붕 테두리 → 안쪽 계단식 관중석 → 포디움 벽 → 모래 경기장
      // 앞쪽(아래) 절반은 세로 외벽이 보이게: 3층 아치 회랑 + 맨 위 아틱(작은 창) · 오른쪽 앞 일부는 무너진 모습
      const rimRx = rx + 96;
      const rimRy = ry + 68;
      const H = 64; // 앞쪽 외벽 높이
      const onRim = (a, ox = rimRx, oy = rimRy, dy = 0) => ({ x: cx + Math.cos(a) * ox, y: cy + Math.sin(a) * oy + dy });

      // 1) 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + H + 10, rimRx + 10, rimRy + 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2) 바깥 테두리 윗면 (트래버틴 석재)
      ctx.fillStyle = '#c9b48d';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rimRx, rimRy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8c7350';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 3) 뒤쪽 벽 안쪽 면의 위층 아치 (안에서 보이는 회랑)
      ctx.fillStyle = '#5b4a36';
      for (let i = 0; i <= 34; i++) {
        const a = Math.PI + (i / 34) * Math.PI;
        const p = onRim(a, rimRx - 9, rimRy - 7);
        ctx.beginPath();
        ctx.roundRect(p.x - 3.5, p.y - 4, 7, 8, [3, 3, 0, 0]);
        ctx.fill();
      }

      // 4) 계단식 관중석 (바깥 → 안쪽 · 색을 번갈아)
      const seatBands = 6;
      for (let k = 0; k < seatBands; k++) {
        const f = 1 - k / seatBands;
        const sx = rx + 12 + (rimRx - 16 - (rx + 12)) * f;
        const sy = ry + 9 + (rimRy - 12 - (ry + 9)) * f;
        ctx.fillStyle = k % 2 === 0 ? '#ddc9a3' : '#cdb68c';
        ctx.beginPath();
        ctx.ellipse(cx, cy, sx, sy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120, 95, 60, 0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // 관중석 계단 통로 (방사형)
      ctx.strokeStyle = 'rgba(110, 85, 55, 0.55)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const p1 = onRim(a, rx + 12, ry + 9);
        const p2 = onRim(a, rimRx - 16, rimRy - 12);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      // 관중 출입구 (보미토리움)
      ctx.fillStyle = '#4a3b2b';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + Math.PI / 24;
        const p = onRim(a, (rx + rimRx) / 2, (ry + rimRy) / 2);
        ctx.fillRect(p.x - 4, p.y - 3, 8, 6);
      }
      // 귀빈석 (북쪽 가운데)
      const vip = onRim(Math.PI * 1.5, rx + 30, ry + 22);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(vip.x - 26, vip.y - 9, 52, 12);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(vip.x - 26, vip.y - 11, 52, 3);

      // 5) 포디움 벽 (경기장을 두른 낮은 벽)
      ctx.fillStyle = '#8a7152';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx + 10, ry + 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // 6) 경기장 바닥 (모래)
      const floor = ctx.createRadialGradient(cx, cy, 20, cx, cy, rx);
      floor.addColorStop(0, '#f6dfa4');
      floor.addColorStop(0.75, '#e8c98b');
      floor.addColorStop(1, '#c99c5c');
      ctx.fillStyle = floor;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 85, 40, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.3, ry * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 7) 앞쪽 외벽 (세로면): 조각으로 나눠 그려 오른쪽 앞 일부를 무너뜨림
      const slices = 64;
      const isBroken = (a) => a > Math.PI * 0.14 && a < Math.PI * 0.32;
      const brokenTop = (i) => H * (0.3 + 0.22 * Math.abs(Math.sin(i * 2.7)));
      for (let i = 0; i < slices; i++) {
        const a0 = (i / slices) * Math.PI;
        const a1 = ((i + 1) / slices) * Math.PI;
        const top0 = isBroken(a0) ? brokenTop(i) : 0;
        const top1 = isBroken(a1) ? brokenTop(i + 1) : 0;
        const p0 = onRim(a0);
        const p1 = onRim(a1);
        const shade = 0.82 + 0.18 * Math.sin((a0 + a1) / 2); // 가운데가 밝고 양옆이 어두움
        const cr = Math.round(214 * shade);
        const cg = Math.round(193 * shade);
        const cb = Math.round(150 * shade);
        if (top0 > 0 || top1 > 0) {
          // 무너진 자리: 안쪽 벽이 드러난 모습 (어두운 석재 + 안쪽 아치)
          ctx.fillStyle = '#9a8360';
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p1.x, p1.y + top1);
          ctx.lineTo(p0.x, p0.y + top0);
          ctx.closePath();
          ctx.fill();
          if (i % 2 === 0) {
            ctx.fillStyle = '#5b4a36';
            ctx.fillRect((p0.x + p1.x) / 2 - 2, p0.y + Math.min(top0, top1) * 0.35, 4, Math.min(top0, top1) * 0.4);
          }
        }
        ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y + top0);
        ctx.lineTo(p1.x, p1.y + top1);
        ctx.lineTo(p1.x, p1.y + H);
        ctx.lineTo(p0.x, p0.y + H);
        ctx.closePath();
        ctx.fill();
      }
      // 층 구분 띠 (코니스)
      const rows = [0.18, 0.45, 0.72, 1.0];
      ctx.strokeStyle = '#8c7350';
      ctx.lineWidth = 2;
      rows.forEach((fr) => {
        ctx.beginPath();
        let started = false;
        for (let i = 0; i <= slices; i++) {
          const a = (i / slices) * Math.PI;
          const top = isBroken(a) ? brokenTop(i) : 0;
          const yOff = H * fr;
          if (yOff < top) { started = false; continue; }
          const p = onRim(a, rimRx, rimRy, yOff);
          if (!started) { ctx.moveTo(p.x, p.y); started = true; } else { ctx.lineTo(p.x, p.y); }
        }
        ctx.stroke();
      });
      // 아치 회랑 3층 + 아틱 작은 창
      const cols = 40;
      for (let i = 0; i < cols; i++) {
        const a = Math.PI * (0.04 + 0.92 * ((i + 0.5) / cols));
        const p = onRim(a);
        const pNext = onRim(Math.PI * (0.04 + 0.92 * ((i + 1.5) / cols)));
        const span = Math.max(2, Math.abs(pNext.x - p.x));
        const w = span * 0.58;
        const top = isBroken(a) ? brokenTop(Math.round((a / Math.PI) * slices)) : 0;
        if (top <= 0 && i % 2 === 0) {
          ctx.fillStyle = '#5b4a36';
          ctx.fillRect(p.x - w * 0.22, p.y + H * 0.06, w * 0.44, H * 0.08);
        }
        for (let rIdx = 0; rIdx < 3; rIdx++) {
          const y0 = H * rows[rIdx] + 2;
          const y1 = H * rows[rIdx + 1] - 1;
          if (y0 < top) continue;
          const ah = y1 - y0;
          ctx.fillStyle = rIdx === 2 ? '#3b2f24' : '#4a3a2b';
          ctx.beginPath();
          ctx.roundRect(p.x - w / 2, p.y + y0 + ah * 0.12, w, ah * 0.88, [w / 2, w / 2, 0, 0]);
          ctx.fill();
        }
      }
      // 무너진 부분 윗면 잔해
      ctx.fillStyle = '#b39b72';
      for (let i = 0; i < slices; i++) {
        const a = ((i + 0.5) / slices) * Math.PI;
        if (!isBroken(a)) continue;
        const p = onRim(a, rimRx, rimRy, brokenTop(i));
        ctx.fillRect(p.x - 3, p.y - 2, 6, 4);
      }

      // 8) 깃발 (뒤쪽 꼭대기)
      [Math.PI * 1.22, Math.PI * 1.78].forEach((a, idx) => {
        const s = idx === 0 ? -1 : 1;
        const p = onRim(a);
        ctx.strokeStyle = '#e7e5e4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y - 56);
        ctx.stroke();
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 56);
        ctx.lineTo(p.x + s * 34, p.y - 48 + Math.sin(t * 3 + s) * 3);
        ctx.lineTo(p.x, p.y - 38);
        ctx.closePath();
        ctx.fill();
      });

      // 5) 이름표 (투기장 위)
      const signW = 470;
      const signY = cy - ry - 150;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = 'rgba(252, 165, 165, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - signW / 2, signY, signW, 42, 10);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fecaca';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('⚔️ 영웅의 투기장 [5환생 전용 · 무한 PvP 배틀필드]', cx, signY + 14);
      ctx.fillStyle = '#fde68a';
      ctx.font = '11px sans-serif';
      const inside = hunters.filter(isHunterHuntingInArena).length;
      ctx.fillText(`처치 시 경험치 · 골드 · 쓰러지면 마을에서 정비 · 지금 ${inside}명 결투 중`, cx, signY + 30);

      // 6) 마을 북쪽 입구 (작은 포탈)
      const ex = ARENA_CFG.entrance.x;
      const ey = ARENA_CFG.entrance.y;
      const pulse = 1 + Math.sin(t * 3) * 0.08;
      ctx.fillStyle = 'rgba(220, 38, 38, 0.25)';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 26 * pulse, 12 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fecaca';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('⚔️ 투기장 입구 (5환생)', ex, ey - 20);
      ctx.restore();
    }

    if (typeof drawVillageGround === 'function') {
      const origDrawForArena = drawVillageGround;
      drawVillageGround = function (ctx, ...rest) {
        const r = origDrawForArena.call(this, ctx, ...rest);
        try { drawHeroArena(ctx); } catch (_) {}
        return r;
      };
    }

    // 부활 대기 중(1초)인 영웅은 그리지 않는다
    if (typeof drawHunterWithWeapon === 'function') {
      const origDrawHunter = drawHunterWithWeapon;
      drawHunterWithWeapon = function (ctx, hunter, ...rest) {
        if (hunter && hunter.arenaRespawnTimer > 0) return;
        return origDrawHunter.call(this, ctx, hunter, ...rest);
      };
    }
