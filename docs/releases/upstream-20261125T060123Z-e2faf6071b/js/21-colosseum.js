// [21-colosseum] 왕국 결투장 토너먼트 · 관람 + 최종 초기화 호출
    /**
     * ============================================================================
     * 왕국 결투장 (Colosseum 1:1 Tournament System)
     * 1. 환생 횟수 -> 레벨 상위 순 최대 50명 선발 (전원 1T +15강 풀강화 장비 세트 보정)
     * 2. 랜덤 배치 1:1 싱글 엘리미네이션 토너먼트
     * 3. 현실 시간 매시 정각(1시간마다) 자동 개막
     * 4. 최대 기록 5경기 유지
     * 5. 상금(우승 5,000만 / 준우승 2,000만 / 참가상 500만) & 승점(우승 10 / 준우승 5 / 참가 2)
     * ============================================================================
     */
    const COLOSSEUM_REWARD_CONFIG = {
      CHAMPION_GOLD: 50000000,     // 우승 상금 5000만
      RUNNER_UP_GOLD: 20000000,    // 준우승 상금 2000만
      PARTICIPANT_GOLD: 5000000,   // 참가상 500만
      CHAMPION_POINTS: 10,         // 우승 승점 10점
      RUNNER_UP_POINTS: 5,         // 준우승 승점 5점
      PARTICIPANT_POINTS: 2,       // 참가 승점 2점
      MAX_HISTORY_RECORDS: 5       // 최대 기록 5 경기
    };

    const COLOSSEUM_STATE = {
      season: 1,
      activeTab: 'participants',
      lastTriggeredSlotKey: null,
      participants: [],
      rounds: [],
      champion: null,
      runnerUp: null,
      history: [],
      standings: new Map(),
      selectedMatchId: null,
      spectatorMatchId: null,
      playback: null,
      animFrameId: null,
      lastAnimTime: 0
    };

    function getColosseumStandingEntry(fighter) {
      if (!COLOSSEUM_STATE.standings.has(fighter.id)) {
        COLOSSEUM_STATE.standings.set(fighter.id, {
          id: fighter.id,
          name: fighter.name,
          displayJob: fighter.displayJob,
          jobIcon: fighter.jobIcon,
          points: 0,
          prizeGold: 0,
          wins: 0,
          runnerUps: 0,
          participations: 0,
          duelWins: 0,
          duelLosses: 0
        });
      }
      const entry = COLOSSEUM_STATE.standings.get(fighter.id);
      entry.name = fighter.name;
      entry.displayJob = fighter.displayJob;
      if (typeof entry.duelWins !== 'number') entry.duelWins = 0;
      if (typeof entry.duelLosses !== 'number') entry.duelLosses = 0;
      return entry;
    }

    // 1. 환생 -> 레벨 순 상위 최대 50명 선발 및 1T +15 풀강화 장비 세트 장착 스냅샷 생성
    function buildColosseumParticipants() {
      const sorted = [...hunters].sort((a, b) => {
        const rbDiff = (b.rebirthCount || 0) - (a.rebirthCount || 0);
        if (rbDiff !== 0) return rbDiff;
        const lvDiff = (b.level || 1) - (a.level || 1);
        if (lvDiff !== 0) return lvDiff;
        return (b.exp || 0) - (a.exp || 0);
      });

      const top50 = sorted.slice(0, 50);
      return top50.map((h, idx) => {
        // 임시로 1T +15 풀강화 장비 세트를 장착시켜 공정한 1T+15 전투 능력치 계산 후 원래 장비 복원
        const origEquip = JSON.parse(JSON.stringify(h.equipment));
        const origHp = h.hp;
        const origMp = h.mp;
        const origMaxHp = h.maxHp;
        const origMaxMp = h.maxMp;

        ['weapon', 'armor', 'helmet', 'accessory'].forEach((slot) => {
          h.equipment[slot] = { tier: 1, enhance: 15 };
        });
        h.recalculateVitals(false);
        const fullT1Stats = h.getComputedStats();
        const arenaMaxHp = h.maxHp;
        const arenaMaxMp = h.maxMp;

        const activeSkills = (h.skills?.actives || []).map((sk) => {
          const mult = h.getSkillLevelMultiplier(sk);
          return {
            name: sk.name,
            icon: sk.icon || '⚡',
            powerMult: Math.round(Math.max(1.35, ((sk.basePower || 180) / 100) * mult * 0.78) * 10000) / 10000,
            mpCost: Math.round(Math.max(15, h.getSkillMpCost(sk)))
          };
        });

        // 원래 장비 및 바이탈 복원
        h.equipment = origEquip;
        h.maxHp = origMaxHp;
        h.maxMp = origMaxMp;
        h.hp = origHp;
        h.mp = origMp;

        const jobColorMap = {
          '버서커': '#ef4444',
          '레인저': '#10b981',
          '팔라딘': '#f59e0b',
          '소서러': '#a855f7'
        };
        const jobIconMap = {
          '버서커': '🪓',
          '레인저': '🏹',
          '팔라딘': '🛡️',
          '소서러': '🔮'
        };

        return {
          seedRank: idx + 1,
          id: h.id,
          name: h.name,
          baseJob: h.baseJob || h.job,
          displayJob: h.currentJobName || h.job,
          jobIcon: jobIconMap[h.baseJob || h.job] || '⚔️',
          color: jobColorMap[h.baseJob || h.job] || '#38bdf8',
          level: h.level || 1,
          rebirthCount: h.rebirthCount || 0,
          equipBadge: '전 부위 1T +15강 풀세트',
          maxHp: Math.round(arenaMaxHp),
          maxMp: Math.round(arenaMaxMp),
          atk: Math.round(fullT1Stats.atk),
          def: Math.round(fullT1Stats.def),
          crit: Math.round((fullT1Stats.crit || 0) * 100) / 100,
          speed: Math.round((h.speed || 70) * 100) / 100,
          activeSkills
        };
      });
    }

    function shuffleColosseumList(arr) {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    // 준결승·결승 관람 결투 길이 설정
    // 한 선수가 상대를 쓰러뜨리는 데 평균 targetHits번 이상 공격해야 하도록 양쪽 공격력을 같은 비율로 낮춘다
    const COLOSSEUM_FEATURED_DUEL = {
      targetHits: 26,   // 계산상 한 선수가 26회 공격해야 쓰러지도록 (스킬·치명타 포함 실제로는 양쪽 합쳐 평균 약 20합 · 30초 안팎)
      maxTurns: 90      // 판정승 전 최대 합 수
    };

    function getColosseumFeaturedDamageScale(a, b) {
      // 스킬·치명타를 감안한 평균 1회 피해 추정 (스킬 약 절반 · 평균 배율 약 1.6)
      const avgHit = (att, def) => {
        const base = att.atk * 1.07 * (1 + (Math.min(100, att.crit || 0) / 100) * 0.45);
        return Math.max(45, base * 1.3 - def.def * 0.36);
      };
      const hitsAtoB = b.maxHp / avgHit(a, b);
      const hitsBtoA = a.maxHp / avgHit(b, a);
      const fastest = Math.min(hitsAtoB, hitsBtoA);
      if (!Number.isFinite(fastest) || fastest <= 0) return 1;
      return Math.max(0.02, Math.min(1, fastest / COLOSSEUM_FEATURED_DUEL.targetHits));
    }

    // 2. 1:1 결투 시뮬레이션 (텍스트 로그 + 준결승/결승전 스킬 이펙트·스킬명 타임라인 생성)
    // 경기마다 고정된 번호(시드)로 굴리는 주사위: 같은 번호면 언제 다시 돌려도 같은 경기 결과가 나온다
    function createColosseumRng(seed) {
      let a = (seed >>> 0) || 1;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function newColosseumSeed() {
      return Math.floor(Math.random() * 4294967295) >>> 0;
    }

    function simulateColosseumDuel(fighterA, fighterB, roundName, matchLabel, rng = Math.random) {
      if (!fighterB) {
        return {
          winner: fighterA,
          loser: null,
          isBye: true,
          logs: [`[부전승] ${fighterA.name} (환생 ${fighterA.rebirthCount} · Lv.${fighterA.level} · 1T+15 풀세트) 선수가 부전승으로 다음 라운드에 진출합니다.`],
          timeline: [],
          duration: 2
        };
      }

      let hpA = fighterA.maxHp;
      let hpB = fighterB.maxHp;
      let mpA = fighterA.maxMp;
      let mpB = fighterB.maxMp;
      const logs = [];
      const timeline = [];

      logs.push(`⚔️ [${roundName} ${matchLabel}] ${fighterA.name}(${fighterA.displayJob} · ${fighterA.rebirthCount}환생 Lv.${fighterA.level} · 1T+15) VS ${fighterB.name}(${fighterB.displayJob} · ${fighterB.rebirthCount}환생 Lv.${fighterB.level} · 1T+15)`);
      timeline.push({
        time: 0.3,
        type: 'START',
        hpA, hpB,
        text: `${fighterA.name} VS ${fighterB.name} 결투 시작!`
      });

      // 준결승·결승은 관람용으로 길게: 두 선수 모두 공격력을 같은 비율로 낮춰 승부 확률은 그대로 두고 합 수만 늘린다
      const isFeaturedRound = roundName === '준결승전' || roundName === '결승전';
      const dmgScale = isFeaturedRound ? getColosseumFeaturedDamageScale(fighterA, fighterB) : 1;
      const maxTurns = isFeaturedRound ? COLOSSEUM_FEATURED_DUEL.maxTurns : 45;

      let turn = 1;
      let tCursor = 1.0;
      let turnA = fighterA.speed >= fighterB.speed ? true : rng() < 0.5;

      while (hpA > 0 && hpB > 0 && turn <= maxTurns) {
        const atkFighter = turnA ? fighterA : fighterB;
        const defFighter = turnA ? fighterB : fighterA;
        const side = turnA ? 'LEFT' : 'RIGHT';
        const curMp = turnA ? mpA : mpB;

        const usableSkills = (atkFighter.activeSkills || []).filter(s => curMp >= s.mpCost);
        const castSkill = (usableSkills.length > 0 && (rng() < 0.55 || turn % 2 === 1))
          ? usableSkills[Math.floor(rng() * usableSkills.length)]
          : null;

        let rawDmg = atkFighter.atk * (0.95 + rng() * 0.25);
        if (castSkill) {
          if (turnA) mpA = Math.max(0, mpA - castSkill.mpCost);
          else mpB = Math.max(0, mpB - castSkill.mpCost);
          rawDmg = atkFighter.atk * castSkill.powerMult;
        }

        const isCrit = rng() * 100 < atkFighter.crit;
        if (isCrit) rawDmg *= 1.45;

        const finalDmg = Math.max(Math.round(45 * dmgScale), Math.round((rawDmg - defFighter.def * 0.36) * dmgScale), 1);
        if (turnA) hpB = Math.max(0, hpB - finalDmg);
        else hpA = Math.max(0, hpA - finalDmg);

        if (castSkill) {
          const critTxt = isCrit ? ' [치명타!]' : '';
          logs.push(`[${turn}합] ✨ ${atkFighter.name}의 스킬 【${castSkill.icon} ${castSkill.name}】 발동!${critTxt} → ${defFighter.name}에게 ${finalDmg.toLocaleString()} 피해! (남은 HP: ${(turnA ? hpB : hpA).toLocaleString()})`);
          timeline.push({
            time: tCursor,
            type: 'SKILL',
            side,
            attackerName: atkFighter.name,
            skillName: `${castSkill.icon} ${castSkill.name}`,
            color: atkFighter.color,
            damage: finalDmg,
            isCrit,
            hpA,
            hpB,
            text: `${atkFighter.name} 【${castSkill.name}】 발동! (-${finalDmg.toLocaleString()})`
          });
          tCursor += 1.55;
        } else {
          const critTxt = isCrit ? ' [급소 일격!]' : '';
          logs.push(`[${turn}합] 🗡️ ${atkFighter.name}의 1T 무기 강타${critTxt} → ${defFighter.name}에게 ${finalDmg.toLocaleString()} 피해 (남은 HP: ${(turnA ? hpB : hpA).toLocaleString()})`);
          timeline.push({
            time: tCursor,
            type: 'ATTACK',
            side,
            attackerName: atkFighter.name,
            skillName: isCrit ? '💥 1T 치명 일섬' : '⚔️ 1T 무기 연격',
            color: atkFighter.color,
            damage: finalDmg,
            isCrit,
            hpA,
            hpB,
            text: `${atkFighter.name}의 공격 (-${finalDmg.toLocaleString()})`
          });
          tCursor += 1.1;
        }

        turnA = !turnA;
        turn++;
      }

      const winner = hpA >= hpB ? fighterA : fighterB;
      const loser = winner.id === fighterA.id ? fighterB : fighterA;
      logs.push(`🏆 [승자 확정] ${winner.name} 선수가 ${loser.name} 선수를 제압하고 다음 라운드에 진출했습니다!`);
      timeline.push({
        time: tCursor + 0.35,
        type: 'END',
        winnerName: winner.name,
        winnerSide: winner.id === fighterA.id ? 'LEFT' : 'RIGHT',
        hpA,
        hpB,
        text: `👑 승자: ${winner.name}!`
      });

      return {
        winner,
        loser,
        isBye: false,
        logs,
        timeline,
        duration: tCursor + 1.5
      };
    }

    // 대진 순서(order)대로 토너먼트 전 라운드를 진행해 결과를 만든다
    // seedsIn을 주면 그 주사위 번호로 똑같은 경기를 다시 재생한다 (저장된 토너먼트 복원용, 전적은 다시 쌓지 않음)
    function buildColosseumRounds(order, seedsIn = null, isReplay = false) {
      const rounds = [];
      const seeds = [];
      let seedIdx = 0;
      let pool = [...order];
      let roundIdx = 1;

      while (pool.length > 1) {
        const cnt = pool.length;
        let roundName = `${roundIdx}라운드 (${cnt}강)`;
        let isSpectatable = false;
        if (cnt === 2) {
          roundName = '결승전';
          isSpectatable = true;
        } else if (cnt <= 4) {
          roundName = '준결승전';
          isSpectatable = true;
        } else if (cnt <= 8) {
          roundName = '8강전';
        } else if (cnt <= 16) {
          roundName = '16강전';
        } else if (cnt <= 32) {
          roundName = '32강전';
        } else {
          roundName = `예선전 (${cnt}강)`;
        }

        const matches = [];
        const nextPool = [];
        for (let i = 0; i < pool.length; i += 2) {
          const fA = pool[i];
          const fB = pool[i + 1] || null;
          const mNum = Math.floor(i / 2) + 1;
          const mLabel = `${mNum}경기`;
          const seed = (seedsIn && seedIdx < seedsIn.length) ? (seedsIn[seedIdx] >>> 0) : newColosseumSeed();
          seedIdx++;
          seeds.push(seed);
          const sim = simulateColosseumDuel(fA, fB, roundName, mLabel, createColosseumRng(seed));

          if (!isReplay && !sim.isBye && sim.winner && sim.loser) {
            const winSt = getColosseumStandingEntry(sim.winner);
            const loseSt = getColosseumStandingEntry(sim.loser);
            winSt.duelWins += 1;
            loseSt.duelLosses += 1;
          }

          matches.push({
            id: `col_r${roundIdx}_m${mNum}`,
            roundIdx,
            roundName,
            matchLabel: mLabel,
            isSpectatable,
            fighterA: fA,
            fighterB: fB,
            winner: sim.winner,
            loser: sim.loser,
            isBye: sim.isBye,
            logs: sim.logs,
            timeline: sim.timeline,
            duration: sim.duration
          });
          nextPool.push(sim.winner);
        }

        rounds.push({
          roundIdx,
          roundName,
          isSpectatable,
          matches
        });
        pool = nextPool;
        roundIdx++;
      }

      return { rounds, champion: pool[0] || null, seeds };
    }

    // ---------- 마지막 토너먼트 저장 · 복원 ----------
    function serializeColosseumTournament() {
      const lt = COLOSSEUM_STATE.lastTournament;
      if (!lt || !Array.isArray(lt.participants) || lt.participants.length < 2) return null;
      return {
        season: lt.season,
        triggerLabel: lt.triggerLabel || '',
        playedAt: lt.playedAt || 0,
        orderIds: lt.orderIds,
        seeds: lt.seeds,
        participants: lt.participants.map(p => ({
          seedRank: p.seedRank, id: p.id, name: p.name, baseJob: p.baseJob, displayJob: p.displayJob,
          jobIcon: p.jobIcon, color: p.color, level: p.level, rebirthCount: p.rebirthCount,
          maxHp: p.maxHp, maxMp: p.maxMp, atk: p.atk, def: p.def, crit: p.crit, speed: p.speed,
          activeSkills: (p.activeSkills || []).map(s => ({ name: s.name, icon: s.icon, powerMult: s.powerMult, mpCost: s.mpCost }))
        }))
      };
    }

    // 저장된 토너먼트를 같은 주사위 번호로 다시 재생해 대진표·경기 기록·관람을 복원 (상금·승점은 다시 주지 않음)
    function restoreColosseumTournament(saved) {
      COLOSSEUM_STATE.participants = [];
      COLOSSEUM_STATE.rounds = [];
      COLOSSEUM_STATE.champion = null;
      COLOSSEUM_STATE.runnerUp = null;
      COLOSSEUM_STATE.selectedMatchId = null;
      COLOSSEUM_STATE.spectatorMatchId = null;
      COLOSSEUM_STATE.lastTournament = null;
      if (!saved || !Array.isArray(saved.participants) || saved.participants.length < 2) return;
      try {
        const participants = saved.participants.map(p => ({ ...p, equipBadge: '전 부위 1T +15강 풀세트', activeSkills: Array.isArray(p.activeSkills) ? p.activeSkills : [] }));
        const byId = new Map(participants.map(p => [p.id, p]));
        const order = (Array.isArray(saved.orderIds) ? saved.orderIds : []).map(id => byId.get(id)).filter(Boolean);
        if (order.length < 2) return;
        const built = buildColosseumRounds(order, Array.isArray(saved.seeds) ? saved.seeds : [], true);
        COLOSSEUM_STATE.participants = participants;
        COLOSSEUM_STATE.rounds = built.rounds;
        COLOSSEUM_STATE.champion = built.champion;
        const finalRound = built.rounds[built.rounds.length - 1];
        const finalMatch = finalRound?.matches?.[0] || null;
        COLOSSEUM_STATE.runnerUp = finalMatch?.loser || null;
        COLOSSEUM_STATE.selectedMatchId = finalMatch ? finalMatch.id : null;
        COLOSSEUM_STATE.lastTournament = { ...saved, participants };
      } catch (_) {}
    }

    // 3. 랜덤 배치 1:1 싱글 엘리미네이션 토너먼트 실행
    function runColosseumTournament(triggerLabel = '정규 개막') {
      const colBld = village.getAllBuildings().find(b => b.type === 'colosseum');
      if (!colBld) {
        return false;
      }

      const selected50 = buildColosseumParticipants();
      if (selected50.length < 2) {
        showToast('⚠️ 결투장 토너먼트를 진행하려면 최소 2명 이상의 헌터가 필요합니다.');
        return false;
      }

      COLOSSEUM_STATE.participants = selected50;
      COLOSSEUM_STATE.rounds = [];
      COLOSSEUM_STATE.champion = null;
      COLOSSEUM_STATE.runnerUp = null;

      const order = shuffleColosseumList(selected50);
      const built = buildColosseumRounds(order);
      COLOSSEUM_STATE.rounds = built.rounds;
      COLOSSEUM_STATE.champion = built.champion;
      const finalRound = COLOSSEUM_STATE.rounds[COLOSSEUM_STATE.rounds.length - 1];
      const finalMatch = finalRound?.matches?.[0] || null;
      COLOSSEUM_STATE.runnerUp = finalMatch?.loser || null;
      COLOSSEUM_STATE.selectedMatchId = finalMatch ? finalMatch.id : null;
      COLOSSEUM_STATE.spectatorMatchId = finalMatch && !finalMatch.isBye ? finalMatch.id : null;

      const currentSeasonNum = COLOSSEUM_STATE.season;
      // 새로고침 후에도 대진표·경기 기록을 다시 볼 수 있도록 이번 토너먼트를 기억 (출전자 능력치 + 대진 순서 + 경기별 주사위 번호)
      COLOSSEUM_STATE.lastTournament = {
        season: currentSeasonNum,
        triggerLabel,
        playedAt: Date.now(),
        participants: selected50,
        orderIds: order.map(p => p.id),
        seeds: built.seeds
      };

      // 상금 및 승점 정산 (1. 참가 전원 참가상 500만G + 2점)
      selected50.forEach((p) => {
        const st = getColosseumStandingEntry(p);
        st.participations += 1;
        st.prizeGold += COLOSSEUM_REWARD_CONFIG.PARTICIPANT_GOLD;
        st.points += COLOSSEUM_REWARD_CONFIG.PARTICIPANT_POINTS;

        const realHunter = hunters.find(h => h.id === p.id);
        if (realHunter) {
          realHunter.personalGold += COLOSSEUM_REWARD_CONFIG.PARTICIPANT_GOLD;
        }
      });

      // 2. 준우승자 추가 정산 (총 준우승 상금 2,000만G + 5점 반영)
      if (COLOSSEUM_STATE.runnerUp) {
        const rUp = COLOSSEUM_STATE.runnerUp;
        const stRunner = getColosseumStandingEntry(rUp);
        const extraRunnerGold = COLOSSEUM_REWARD_CONFIG.RUNNER_UP_GOLD - COLOSSEUM_REWARD_CONFIG.PARTICIPANT_GOLD;
        const extraRunnerPts = COLOSSEUM_REWARD_CONFIG.RUNNER_UP_POINTS - COLOSSEUM_REWARD_CONFIG.PARTICIPANT_POINTS;
        stRunner.runnerUps += 1;
        stRunner.prizeGold += extraRunnerGold;
        stRunner.points += extraRunnerPts;

        const realRunner = hunters.find(h => h.id === rUp.id);
        if (realRunner) {
          realRunner.personalGold += extraRunnerGold;
          realRunner.gainExp(350);
          interactionManager.spawnBubble(realRunner, `🥈 제 ${currentSeasonNum}회 결투장 준우승! (+2,000만G / +5점)`, '#bae6fd');
        }
      }

      // 3. 우승자 추가 정산 (총 우승 상금 5,000만G + 10점 반영)
      const champ = COLOSSEUM_STATE.champion;
      if (champ) {
        const stChamp = getColosseumStandingEntry(champ);
        const extraChampGold = COLOSSEUM_REWARD_CONFIG.CHAMPION_GOLD - COLOSSEUM_REWARD_CONFIG.PARTICIPANT_GOLD;
        const extraChampPts = COLOSSEUM_REWARD_CONFIG.CHAMPION_POINTS - COLOSSEUM_REWARD_CONFIG.PARTICIPANT_POINTS;
        stChamp.wins += 1;
        stChamp.prizeGold += extraChampGold;
        stChamp.points += extraChampPts;

        const realChamp = hunters.find(h => h.id === champ.id);
        if (realChamp) {
          realChamp.personalGold += extraChampGold;
          realChamp.gainExp(800);
          interactionManager.spawnBubble(realChamp, `👑 제 ${currentSeasonNum}회 결투장 우승! (+5,000만G / +10점)`, '#fde047');
        }
      }

      // 최근 토너먼트 기록 저장 (최대 5경기 유지)
      const nowTime = new Date();
      const timeLabel = `${String(nowTime.getHours()).padStart(2, '0')}:${String(nowTime.getMinutes()).padStart(2, '0')}:${String(nowTime.getSeconds()).padStart(2, '0')}`;
      COLOSSEUM_STATE.history.unshift({
        season: currentSeasonNum,
        timestamp: timeLabel,
        triggerLabel,
        participantCount: selected50.length,
        champion: champ ? { ...champ } : null,
        runnerUp: COLOSSEUM_STATE.runnerUp ? { ...COLOSSEUM_STATE.runnerUp } : null
      });
      if (COLOSSEUM_STATE.history.length > COLOSSEUM_REWARD_CONFIG.MAX_HISTORY_RECORDS) {
        COLOSSEUM_STATE.history = COLOSSEUM_STATE.history.slice(0, COLOSSEUM_REWARD_CONFIG.MAX_HISTORY_RECORDS);
      }

      showToast(`🏟️ 제 ${currentSeasonNum}회 결투장 종료! 우승: ${champ.name} (5,000만G / +10점) · 준우승: ${COLOSSEUM_STATE.runnerUp ? COLOSSEUM_STATE.runnerUp.name : '-'}`);
      COLOSSEUM_STATE.season += 1;

      if (document.getElementById('hunterRosterBackdrop')?.classList.contains('open')) {
        renderHunterRosterModal(false);
      }
      if (document.getElementById('colosseumModalBackdrop')?.classList.contains('open')) {
        renderColosseumModal();
      }
      return true;
    }

    // 4. 현실 시간 매시 정각(1시간마다) 자동 개막 스케줄러
    function checkColosseumRealTimeSchedule() {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();

      const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h + 1, 0, 0, 0);
      const nextHourLabel = `${pad(nextHour.getHours())}:00`;

      const diffSec = Math.max(0, Math.floor((nextHour - now) / 1000));
      const mm = Math.floor((diffSec % 3600) / 60);
      const ss = diffSec % 60;

      const badge = document.getElementById('colosseumScheduleBadge');
      if (badge) {
        badge.textContent = `다음 개막 ${nextHourLabel} (${pad(mm)}:${pad(ss)})`;
      }

      // 매시 정각 자동 개막
      // 정각 0~3초에만 확인하면, 창이 뒤에 있거나 화면이 꺼져 브라우저가 타이머를 1분에 한 번만 돌릴 때 거의 매번 놓친다.
      // 그래서 '이번 시간 토너먼트를 아직 안 열었으면' 언제 확인하든 한 번 연다. (열었던 시간은 저장되어 새로고침해도 중복 개막 없음)
      if (typeof isStorageReady !== 'undefined' && !isStorageReady) return;
      const slotKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${h}`;
      if (!COLOSSEUM_STATE.lastTriggeredSlotKey) {
        // 처음 시작한 게임: 다음 정각부터 개막
        COLOSSEUM_STATE.lastTriggeredSlotKey = slotKey;
        return;
      }
      if (COLOSSEUM_STATE.lastTriggeredSlotKey !== slotKey) {
        COLOSSEUM_STATE.lastTriggeredSlotKey = slotKey;
        runColosseumTournament(`매시 정각(${pad(h)}:00) 자동 개막`);
      }
    }

    setInterval(checkColosseumRealTimeSchedule, 1000);

    function findColosseumMatchById(matchId) {
      for (const r of COLOSSEUM_STATE.rounds) {
        const found = r.matches.find(m => m.id === matchId);
        if (found) return found;
      }
      return null;
    }

    function stopColosseumSpectatorLoop() {
      if (COLOSSEUM_STATE.animFrameId) {
        cancelAnimationFrame(COLOSSEUM_STATE.animFrameId);
        COLOSSEUM_STATE.animFrameId = null;
      }
    }

    function startColosseumSpectatorMatch(matchId) {
      const match = findColosseumMatchById(matchId);
      if (!match || !match.fighterB) return;
      COLOSSEUM_STATE.spectatorMatchId = match.id;
      COLOSSEUM_STATE.playback = {
        match,
        elapsed: 0,
        evIndex: 0,
        hpA: match.fighterA.maxHp,
        hpB: match.fighterB.maxHp,
        leftDash: 0,
        rightDash: 0,
        leftFlash: 0,
        rightFlash: 0,
        leftSwing: 0,
        rightSwing: 0,
        leftRecoil: 0,
        rightRecoil: 0,
        screenShake: 0,
        sparks: [],
        effects: [],
        banners: [],
        commentary: `${match.roundName} ${match.matchLabel} · ${match.fighterA.name} VS ${match.fighterB.name}`
      };
      COLOSSEUM_STATE.lastAnimTime = performance.now();
      if (!COLOSSEUM_STATE.animFrameId) {
        COLOSSEUM_STATE.animFrameId = requestAnimationFrame(stepColosseumArena);
      }
    }

    // 실제 헌터를 결투장 크기로 그린다 (마을에서 보이는 모습 그대로: 직업·환생 외형, 장비, 날개, 무기 강화 이펙트)
    const COLOSSEUM_REAL_HUNTER_SCALE = 2.1;
    const COLOSSEUM_REAL_HUNTER_FOOT_Y = 18; // 마을 헌터 그림에서 발 위치 (발이 결투장 그림자 위에 오도록 맞춤)
    function drawColosseumRealHunter(ctx, realHunter, facing, { bob = 0, lean = 0, swing = 0, walkPhase = 0, flash = false } = {}) {
      // 원본 헌터는 건드리지 않도록 겉모습만 빌린 대리 객체로 그린다
      const proxy = Object.create(realHunter);
      proxy.x = 0;
      proxy.y = 0;
      proxy.facing = facing;
      proxy.state = swing > 0.05 ? 'ATTACKING' : 'WALKING';
      proxy.walkCycle = walkPhase * 0.5;
      proxy.attackAnimTimer = swing > 0.05 ? Math.min(0.34, swing * 0.34) : 0;
      proxy.particles = [];
      proxy.id = `__arena__${realHunter.id}`; // 마을 선택 표시가 그려지지 않도록
      proxy.hideNameTag = true;

      ctx.save();
      ctx.translate(0, 22 - COLOSSEUM_REAL_HUNTER_FOOT_Y * COLOSSEUM_REAL_HUNTER_SCALE + bob);
      ctx.rotate(lean);
      ctx.scale(COLOSSEUM_REAL_HUNTER_SCALE, COLOSSEUM_REAL_HUNTER_SCALE);
      if (flash) ctx.filter = 'brightness(1.9)';
      try {
        drawHunterWithWeapon(ctx, proxy);
      } catch (_) {}
      ctx.filter = 'none';
      ctx.restore();
    }

    function drawColosseumArenaCharacter(ctx, fighter, x, y, facing, opts = {}) {
      const {
        flash = false,
        swing = 0,
        recoil = 0,
        walkPhase = 0,
        isSkill = false,
        isWinner = false,
        isLoser = false
      } = opts;

      const t = performance.now() * 0.004;
      const rebirthTier = Math.max(0, Math.min(5, fighter.rebirthCount || 0));
      const bob = isLoser ? 4 : Math.sin(walkPhase) * 2.5 - Math.abs(swing) * 5;
      const lean = swing * 0.24 * facing - recoil * 0.2 * facing;

      ctx.save();
      ctx.translate(x, y);
      if (isLoser) {
        ctx.globalAlpha = 0.45;
      }

      // 1. 발밑 원형 아레나 그림자 & 환생 윤회 오라 링
      ctx.save();
      ctx.translate(0, 22);
      ctx.scale(1, 0.42);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fill();

      if (rebirthTier > 0 || isWinner) {
        ctx.save();
        ctx.rotate(t * (1.2 + rebirthTier * 0.25));
        ctx.strokeStyle = isWinner ? '#fde047' : fighter.color;
        ctx.lineWidth = 2.4;
        ctx.setLineDash([8, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, 34 + Math.sin(t * 3) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // 준결승·결승 관람: 실제 헌터 외형(직업·환생 외형 · 장비 · 날개 · 무기 강화 이펙트)으로 그린다
      const realHunter = (typeof hunters !== 'undefined') ? hunters.find(hh => hh.id === fighter.id) : null;
      if (realHunter && typeof drawHunterWithWeapon === 'function') {
        drawColosseumRealHunter(ctx, realHunter, facing, { bob, lean, swing, walkPhase, flash });
      } else {
      ctx.save();
      ctx.translate(0, bob);
      ctx.rotate(lean);

      // 2. 등 뒤 망토 / 날개 실루엣
      ctx.fillStyle = fighter.color;
      ctx.globalAlpha = isLoser ? 0.4 : 0.72;
      ctx.beginPath();
      ctx.moveTo(-facing * 4, -8);
      ctx.lineTo(-facing * 24, 14 + Math.sin(t * 5) * 2.5);
      ctx.lineTo(-facing * 6, 18);
      ctx.lineTo(facing * 6, 14);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = isLoser ? 0.45 : 1;

      if (rebirthTier >= 2) {
        [-1, 1].forEach((side) => {
          ctx.save();
          ctx.translate(-facing * 5, -6);
          ctx.rotate(side * (0.45 + Math.sin(t * 4) * 0.16));
          ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-facing * 14, -18, -facing * 24, -8);
          ctx.quadraticCurveTo(-facing * 16, 4, 0, 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      }

      // 3. 다리
      const legSwing = Math.sin(walkPhase) * 5;
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-10, 10 + legSwing * 0.4, 8, 13, 3);
      ctx.roundRect(2, 10 - legSwing * 0.4, 8, 13, 3);
      ctx.fill();
      ctx.stroke();

      // 4. 1T +15 풀강화 갑옷 & 견갑
      ctx.fillStyle = flash ? '#ffffff' : fighter.color;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(-14, -10, 28, 23, 6);
      ctx.fill();
      ctx.stroke();

      // 흉갑 장식 라인
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, -3);
      ctx.lineTo(0, 4);
      ctx.lineTo(8, -3);
      ctx.stroke();

      // 양 어깨 1T +15 견갑
      [-15, 15].forEach((sx) => {
        ctx.fillStyle = flash ? '#ffffff' : '#fef08a';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(sx, -8, 6.2, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      // 5. 머리, 헤어, 눈, 1T 투구
      ctx.fillStyle = flash ? '#ffffff' : '#fde68a';
      ctx.beginPath();
      ctx.arc(0, -21, 11.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, -23.5, 12, Math.PI * 1.05, -0.05 * Math.PI);
      ctx.closePath();
      ctx.fill();

      // 눈빛
      ctx.fillStyle = isSkill ? '#fde047' : '#0f172a';
      ctx.beginPath();
      ctx.arc(facing * 4.2, -20, 2.1, 0, Math.PI * 2);
      ctx.fill();

      // 환생 별 표시 (머리 위)
      if (rebirthTier > 0) {
        // 초월한 만큼 앞쪽 별은 빨간색
        const liveH = hunters.find(hh => hh.id === fighter.id);
        const tc = Math.max(0, Math.min(rebirthTier, Math.floor(Number(fighter.transcendCount ?? liveH?.transcendCount) || 0)));
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        const starW = ctx.measureText('★').width;
        const sx0 = -(starW * rebirthTier) / 2;
        for (let si = 0; si < rebirthTier; si++) {
          ctx.fillStyle = si < tc ? '#ef4444' : '#facc15';
          ctx.fillText('★', sx0 + si * starW, -39);
        }
        ctx.textAlign = 'center';
      }

      // 6. 직업별 무기 & 공격 스윙 모션
      ctx.save();
      ctx.translate(facing * 14, -2);
      const weaponAngle = facing * (0.35 - swing * 1.45);
      ctx.rotate(weaponAngle);

      if (isSkill || swing > 0.25) {
        ctx.save();
        ctx.shadowColor = isSkill ? '#fde047' : fighter.color;
        ctx.shadowBlur = 16;
        ctx.strokeStyle = isSkill ? '#fde047' : '#e0f2fe';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, -14, 24, -Math.PI * 0.85, Math.PI * 0.25);
        ctx.stroke();
        ctx.restore();
      }

      if (fighter.baseJob === '버서커') {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-2.5, -34, 5, 42);
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-2, -32);
        ctx.quadraticCurveTo(-18, -34, -19, -22);
        ctx.quadraticCurveTo(-17, -12, -2, -15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (fighter.baseJob === '레인저') {
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -12, 16, -1.2, 1.2);
        ctx.stroke();
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-4, -12);
        ctx.lineTo(18, -12);
        ctx.stroke();
      } else if (fighter.baseJob === '소서러') {
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.lineTo(0, -28);
        ctx.stroke();
        ctx.fillStyle = '#e879f9';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, -32, 7.5 + Math.sin(t * 6) * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-4, 2);
        ctx.lineTo(-3, -34);
        ctx.lineTo(0, -41);
        ctx.lineTo(3, -34);
        ctx.lineTo(4, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
      ctx.restore();
      }

      // 7. 하단 명판
      ctx.font = 'bold 12px sans-serif';
      const label = `${fighter.jobIcon} ${fighter.name}`;
      const tw = ctx.measureText(label).width + 16;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.roundRect(-tw / 2, 34, tw, 20, 6);
      ctx.fill();
      ctx.strokeStyle = isWinner ? '#fde047' : 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      ctx.fillStyle = isWinner ? '#fde047' : '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 44);

      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText(`${fighter.rebirthCount}환생 · Lv.${fighter.level} · 1T+15`, 0, 63);

      ctx.restore();
    }

    function stepColosseumArena(now) {
      const modalOpen = document.getElementById('colosseumModalBackdrop')?.classList.contains('open');
      if (!modalOpen || COLOSSEUM_STATE.activeTab !== 'spectator' || !COLOSSEUM_STATE.playback) {
        COLOSSEUM_STATE.animFrameId = null;
        return;
      }

      const dt = Math.min(0.08, Math.max(0, (now - COLOSSEUM_STATE.lastAnimTime) / 1000));
      COLOSSEUM_STATE.lastAnimTime = now;

      const pb = COLOSSEUM_STATE.playback;
      pb.elapsed += dt;

      while (pb.evIndex < pb.match.timeline.length && pb.elapsed >= pb.match.timeline[pb.evIndex].time) {
        const ev = pb.match.timeline[pb.evIndex];
        pb.evIndex++;
        pb.hpA = ev.hpA;
        pb.hpB = ev.hpB;
        pb.commentary = ev.text;

        if (ev.type === 'SKILL' || ev.type === 'ATTACK') {
          const isLeft = ev.side === 'LEFT';
          if (isLeft) {
            pb.leftDash = 1.0;
            pb.leftSwing = 1.0;
            pb.rightFlash = 0.45;
            pb.rightRecoil = 1.0;
          } else {
            pb.rightDash = 1.0;
            pb.rightSwing = 1.0;
            pb.leftFlash = 0.45;
            pb.leftRecoil = 1.0;
          }
          pb.screenShake = ev.type === 'SKILL' ? 9 : 4.5;

          const srcX = isLeft ? 0.27 : 0.73;
          const dstX = isLeft ? 0.73 : 0.27;

          for (let s = 0; s < (ev.type === 'SKILL' ? 14 : 7); s++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 70 + Math.random() * 140;
            pb.sparks.push({
              rx: dstX,
              ry: 0.62,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd - 45,
              color: ev.type === 'SKILL' ? '#fde047' : (ev.color || '#38bdf8'),
              size: ev.type === 'SKILL' ? 3.5 : 2.5,
              life: 0.55,
              maxLife: 0.55
            });
          }

          pb.banners.push({
            kind: 'SKILL',
            text: ev.skillName,
            color: ev.color || '#fde047',
            rx: srcX,
            ry: 0.24,
            life: 1.55,
            maxLife: 1.55
          });
          pb.banners.push({
            kind: 'DMG',
            text: `${ev.isCrit ? '💥 ' : '-'}${ev.damage.toLocaleString()}`,
            color: ev.isCrit ? '#fde047' : '#fda4af',
            rx: dstX,
            ry: 0.42,
            life: 1.15,
            maxLife: 1.15
          });
          pb.effects.push({
            isSkill: ev.type === 'SKILL',
            isLeft,
            color: ev.color || '#fde047',
            srcX,
            dstX,
            life: 0.75,
            maxLife: 0.75
          });
        }
      }

      pb.leftDash = Math.max(0, pb.leftDash - dt * 2.4);
      pb.rightDash = Math.max(0, pb.rightDash - dt * 2.4);
      pb.leftSwing = Math.max(0, pb.leftSwing - dt * 2.8);
      pb.rightSwing = Math.max(0, pb.rightSwing - dt * 2.8);
      pb.leftRecoil = Math.max(0, pb.leftRecoil - dt * 2.5);
      pb.rightRecoil = Math.max(0, pb.rightRecoil - dt * 2.5);
      pb.leftFlash = Math.max(0, pb.leftFlash - dt * 2.6);
      pb.rightFlash = Math.max(0, pb.rightFlash - dt * 2.6);
      pb.screenShake = Math.max(0, pb.screenShake - dt * 28);

      const arenaCanvas = document.getElementById('colosseumArenaCanvas');
      if (arenaCanvas) {
        const rect = arenaCanvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(300, Math.round(rect.width));
        const h = Math.max(220, Math.round(rect.height));
        if (arenaCanvas.width !== Math.round(w * dpr) || arenaCanvas.height !== Math.round(h * dpr)) {
          arenaCanvas.width = Math.round(w * dpr);
          arenaCanvas.height = Math.round(h * dpr);
        }
        const ctx = arenaCanvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        ctx.save();
        if (pb.screenShake > 0.2) {
          const sx = (Math.random() - 0.5) * pb.screenShake;
          const sy = (Math.random() - 0.5) * pb.screenShake;
          ctx.translate(sx, sy);
        }

        // 아레나 바닥 원형 무대 & 투기장 기둥 빛줄기
        const stageGrad = ctx.createRadialGradient(w * 0.5, h * 0.68, 20, w * 0.5, h * 0.68, w * 0.45);
        stageGrad.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
        stageGrad.addColorStop(0.65, 'rgba(99, 102, 241, 0.08)');
        stageGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = stageGrad;
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.68, w * 0.44, h * 0.19, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.18)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.68, w * 0.28, h * 0.11, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 상단 양측 HP 게이지 바
        const ratioA = Math.max(0, pb.hpA / pb.match.fighterA.maxHp);
        const ratioB = Math.max(0, pb.hpB / pb.match.fighterB.maxHp);
        const barW = w * 0.36;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(16, 14, barW, 12);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(16, 14, barW * ratioA, 12);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${pb.match.fighterA.name} (${pb.hpA.toLocaleString()})`, 16, 40);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(w - 16 - barW, 14, barW, 12);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(w - 16 - barW * ratioB, 14, barW * ratioB, 12);
        ctx.textAlign = 'right';
        ctx.fillText(`${pb.match.fighterB.name} (${pb.hpB.toLocaleString()})`, w - 16, 40);

        // 좌/우 헌터 돌진·반동 좌표 및 실제 외형 렌더링
        const dashOffset = Math.sin(pb.leftDash * Math.PI) * 0.22 - Math.sin(pb.leftRecoil * Math.PI) * 0.05;
        const rightDashOffset = Math.sin(pb.rightDash * Math.PI) * 0.22 - Math.sin(pb.rightRecoil * Math.PI) * 0.05;
        const lx = (0.27 + dashOffset) * w;
        const rx = (0.73 - rightDashOffset) * w;
        const fy = h * 0.58;
        const isFinished = pb.evIndex >= pb.match.timeline.length;
        const winnerId = pb.match.winner?.id;

        drawColosseumArenaCharacter(ctx, pb.match.fighterA, lx, fy, 1, {
          flash: pb.leftFlash > 0,
          swing: pb.leftSwing,
          recoil: pb.leftRecoil,
          walkPhase: pb.elapsed * 9,
          isSkill: pb.leftSwing > 0.45,
          isWinner: isFinished && winnerId === pb.match.fighterA.id,
          isLoser: isFinished && winnerId !== pb.match.fighterA.id
        });

        drawColosseumArenaCharacter(ctx, pb.match.fighterB, rx, fy, -1, {
          flash: pb.rightFlash > 0,
          swing: pb.rightSwing,
          recoil: pb.rightRecoil,
          walkPhase: pb.elapsed * 9 + 1.4,
          isSkill: pb.rightSwing > 0.45,
          isWinner: isFinished && winnerId === pb.match.fighterB.id,
          isLoser: isFinished && winnerId !== pb.match.fighterB.id
        });

        // 스킬 이펙트 (참격 호 + 광선 + 충격파 링)
        for (let i = pb.effects.length - 1; i >= 0; i--) {
          const ef = pb.effects[i];
          ef.life -= dt;
          if (ef.life <= 0) {
            pb.effects.splice(i, 1);
            continue;
          }
          const prog = 1 - ef.life / ef.maxLife;
          const targetPx = ef.dstX * w;
          const targetPy = fy - 6;

          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - prog);
          if (ef.isSkill) {
            const grad = ctx.createLinearGradient(ef.srcX * w, targetPy, targetPx, targetPy);
            grad.addColorStop(0, 'rgba(253, 224, 71, 0.15)');
            grad.addColorStop(1, ef.color);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 12 * (1 - prog * 0.55);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ef.srcX * w, targetPy);
            ctx.lineTo(targetPx, targetPy);
            ctx.stroke();

            // 교차 검기/마법진 이펙트
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(targetPx, targetPy, 22 + prog * 54, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.strokeStyle = ef.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(targetPx, targetPy, 12 + prog * 34, -0.9, 0.9);
            ctx.stroke();
          }
          ctx.restore();
        }

        // 타격 스파크 파티클
        for (let i = pb.sparks.length - 1; i >= 0; i--) {
          const sp = pb.sparks[i];
          sp.life -= dt;
          if (sp.life <= 0) {
            pb.sparks.splice(i, 1);
            continue;
          }
          sp.rx += (sp.vx * dt) / w;
          sp.ry += (sp.vy * dt) / h;
          sp.vy += 260 * dt;

          ctx.save();
          ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
          ctx.fillStyle = sp.color;
          ctx.beginPath();
          ctx.arc(sp.rx * w, sp.ry * h, sp.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 스킬명 배너 및 데미지 팝업 표시
        for (let i = pb.banners.length - 1; i >= 0; i--) {
          const bn = pb.banners[i];
          bn.life -= dt;
          if (bn.life <= 0) {
            pb.banners.splice(i, 1);
            continue;
          }
          const prog = 1 - bn.life / bn.maxLife;
          const bx = bn.rx * w;
          const by = (bn.ry - prog * 0.08) * h;

          ctx.save();
          ctx.globalAlpha = Math.min(1, bn.life * 2);
          if (bn.kind === 'SKILL') {
            ctx.font = 'bold 13px sans-serif';
            const tw = ctx.measureText(bn.text).width + 22;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
            ctx.strokeStyle = bn.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(bx - tw / 2, by - 15, tw, 26, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = bn.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(bn.text, bx, by - 2);
          } else {
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#090d16';
            ctx.lineWidth = 3.5;
            ctx.strokeText(bn.text, bx, by);
            ctx.fillStyle = bn.color;
            ctx.fillText(bn.text, bx, by);
          }
          ctx.restore();
        }

        ctx.restore();

        const commEl = document.getElementById('colosseumCommentaryText');
        if (commEl) commEl.textContent = pb.commentary;
      }

      COLOSSEUM_STATE.animFrameId = requestAnimationFrame(stepColosseumArena);
    }

    function renderColosseumModal() {
      const body = document.getElementById('colosseumModalBody');
      const titleEl = document.getElementById('colosseumModalTitle');
      if (!body) return;

      checkColosseumRealTimeSchedule();
      document.querySelectorAll('#colosseumTabBar .help-tab-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-col-tab') === COLOSSEUM_STATE.activeTab);
      });

      const currentRoster = COLOSSEUM_STATE.participants.length > 0
        ? COLOSSEUM_STATE.participants
        : buildColosseumParticipants();

      if (titleEl) {
        const displaySeason = COLOSSEUM_STATE.rounds.length > 0 ? COLOSSEUM_STATE.season - 1 : COLOSSEUM_STATE.season;
        titleEl.textContent = `왕국 결투장 · 제 ${displaySeason}회 1:1 토너먼트 (${currentRoster.length}/50명)`;
      }

      if (COLOSSEUM_STATE.activeTab === 'participants') {
        stopColosseumSpectatorLoop();
        if (currentRoster.length === 0) {
          body.innerHTML = `<div style="padding:24px;text-align:center;color:#94a3b8;">현재 마을에 등록 가능한 헌터가 없습니다.</div>`;
          return;
        }
        body.innerHTML = `
          <div style="font-size:12px;color:#fde68a;font-weight:700;">
            🏅 환생 횟수 → 레벨 상위 순으로 선발된 <b>${currentRoster.length}명</b>의 출전 명단입니다. 모든 참가자는 결투장 규칙에 따라 <b>전 부위 1T +15강 풀강화 장비 세트</b>를 착용하고 출전합니다.
          </div>
          <div class="hunter-roster-grid">
            ${currentRoster.map((p) => `
              <div class="roster-card" style="cursor:default;">
                <div class="roster-card-top">
                  <div class="roster-name-group">
                    <span class="roster-job-badge">#${p.seedRank}</span>
                    <span class="roster-hunter-name">${p.jobIcon} ${p.name}</span>
                  </div>
                  <span class="personality-tag-trait">${p.rebirthCount}환생 · Lv.${p.level}</span>
                </div>
                <div class="roster-card-meta" style="color:#fef08a;font-weight:800;">
                  <span>🛡️ ${p.equipBadge}</span>
                  <span>${p.displayJob}</span>
                </div>
                <div class="roster-card-meta">
                  <span>❤️ HP ${p.maxHp.toLocaleString()}</span>
                  <span>⚔️ ATK ${p.atk.toLocaleString()} · 🛡️ DEF ${p.def.toLocaleString()}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `;
        return;
      }

      if (COLOSSEUM_STATE.activeTab === 'bracket') {
        stopColosseumSpectatorLoop();
        if (COLOSSEUM_STATE.rounds.length === 0) {
          body.innerHTML = `
            <div style="padding:28px;text-align:center;color:#cbd5e1;line-height:1.6;">
              아직 개막된 토너먼트 기록이 없습니다.<br/>
              매일 현실 시간 <b>오전 10:00</b> 또는 <b>저녁 22:00</b>에 자동 개막하며, 우측 상단 <b>⚡ 즉시 토너먼트 개막</b> 버튼으로 지금 바로 시작할 수 있습니다.
            </div>
          `;
          return;
        }

        const selectedMatch = findColosseumMatchById(COLOSSEUM_STATE.selectedMatchId) || COLOSSEUM_STATE.rounds[COLOSSEUM_STATE.rounds.length - 1].matches[0];
        const reversedRounds = [...COLOSSEUM_STATE.rounds].reverse();

        body.innerHTML = `
          ${COLOSSEUM_STATE.champion ? `
            <div style="background:linear-gradient(135deg, rgba(245,158,11,0.22), rgba(220,38,38,0.22));border:1px solid rgba(250,204,21,0.5);border-radius:11px;padding:9px 12px;font-size:12.5px;font-weight:800;color:#fde047;line-height:1.5;">
              👑 우승: ${COLOSSEUM_STATE.champion.name} (${COLOSSEUM_STATE.champion.displayJob} · 상금 5,000만G / +10점)<br/>
              ${COLOSSEUM_STATE.runnerUp ? `<span style="color:#bae6fd;">🥈 준우승: ${COLOSSEUM_STATE.runnerUp.name} (${COLOSSEUM_STATE.runnerUp.displayJob} · 상금 2,000만G / +5점) · 🎖️ 참가상 전원 500만G / +2점</span>` : ''}
            </div>
          ` : ''}
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(290px, 1fr));gap:12px;">
            <div id="colosseumRoundListScroll" style="display:flex;flex-direction:column;gap:10px;max-height:52vh;overflow-y:auto;padding-right:4px;">
              ${reversedRounds.map((r) => `
                <div class="colosseum-round-card">
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;font-weight:800;color:#f8fafc;">
                    <span>${r.roundName} (${r.matches.length}경기)</span>
                    <span style="font-size:10.5px;color:${r.isSpectatable ? '#fda4af' : '#7dd3fc'};">
                      ${r.isSpectatable ? '🎥 라이브 스킬 관람 가능' : '📜 텍스트 전투 기록'}
                    </span>
                  </div>
                  ${r.matches.map((m) => {
                    const fBText = m.fighterB ? m.fighterB.name : '부전승';
                    const isActive = selectedMatch && selectedMatch.id === m.id;
                    return `
                      <div class="colosseum-match-row ${isActive ? 'active' : ''}" data-col-match-id="${m.id}">
                        <div style="font-size:11.5px;color:#e2e8f0;min-width:0;flex:1;">
                          <span style="color:#94a3b8;font-weight:700;">[${m.matchLabel}]</span>
                          <b style="color:${m.winner?.id === m.fighterA.id ? '#fde047' : '#cbd5e1'};">${m.fighterA.name}</b>
                          <span style="color:#64748b;"> vs </span>
                          <b style="color:${m.fighterB && m.winner?.id === m.fighterB.id ? '#fde047' : '#cbd5e1'};">${fBText}</b>
                        </div>
                        ${m.isSpectatable && !m.isBye ? `
                          <button type="button" class="btn-roster-focus" data-col-watch-id="${m.id}">🎥 관람</button>
                        ` : `<span style="font-size:10px;color:#7dd3fc;white-space:nowrap;">텍스트</span>`}
                      </div>
                    `;
                  }).join('')}
                </div>
              `).join('')}
            </div>

            <div id="colosseumMatchLogPanel" style="display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:12.5px;font-weight:800;color:#fde68a;">📜 ${selectedMatch ? `${selectedMatch.roundName} ${selectedMatch.matchLabel} 전투 내용` : '경기 로그'}</span>
                ${selectedMatch && selectedMatch.isSpectatable && !selectedMatch.isBye ? `
                  <button type="button" class="btn-roster-focus" data-col-watch-id="${selectedMatch.id}">⚔️ 라이브 전투 관람하기</button>
                ` : ''}
              </div>
              <div class="colosseum-log-box">
                ${(selectedMatch?.logs || []).map((line) => `<div>${line}</div>`).join('')}
              </div>
            </div>
          </div>
        `;
        return;
      }

      if (COLOSSEUM_STATE.activeTab === 'history') {
        stopColosseumSpectatorLoop();
        const rankedStandings = Array.from(COLOSSEUM_STATE.standings.values())
          .sort((a, b) => (b.points - a.points) || (b.wins - a.wins) || (b.runnerUps - a.runnerUps));

        body.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:12px;">
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;font-weight:800;color:#fde68a;">🗂️ 최근 결투장 기록 (최대 ${COLOSSEUM_REWARD_CONFIG.MAX_HISTORY_RECORDS}경기 유지)</span>
                <span class="badge-lv">${COLOSSEUM_STATE.history.length} / ${COLOSSEUM_REWARD_CONFIG.MAX_HISTORY_RECORDS}</span>
              </div>
              ${COLOSSEUM_STATE.history.length === 0 ? `
                <div style="padding:22px;text-align:center;color:#94a3b8;background:rgba(15,23,42,0.7);border-radius:10px;font-size:12px;">
                  아직 완료된 결투장 경기 기록이 없습니다.
                </div>
              ` : COLOSSEUM_STATE.history.map((rec) => `
                <div class="colosseum-round-card" style="gap:4px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8;">
                    <b style="color:#fbbf24;">제 ${rec.season}회 결투장 (${rec.participantCount}인)</b>
                    <span>${rec.timestamp} · ${rec.triggerLabel}</span>
                  </div>
                  <div style="font-size:12px;font-weight:800;color:#fde047;">
                    👑 우승: ${rec.champion ? `${rec.champion.jobIcon} ${rec.champion.name}` : '-'} <span style="font-size:10.5px;color:#86efac;">(5,000만G · +10점)</span>
                  </div>
                  <div style="font-size:11.5px;font-weight:700;color:#bae6fd;">
                    🥈 준우승: ${rec.runnerUp ? `${rec.runnerUp.jobIcon} ${rec.runnerUp.name}` : '-'} <span style="font-size:10.5px;color:#cbd5e1;">(2,000만G · +5점)</span>
                  </div>
                  <div style="font-size:10.5px;color:#94a3b8;">
                    🎖️ 참가상: 출전 헌터 전원 각 500만G · +2점 지급 완료
                  </div>
                </div>
              `).join('')}
            </div>

            <div style="display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;font-weight:800;color:#7dd3fc;">🏆 누적 승점 & 상금 랭킹</span>
                <span style="font-size:10.5px;color:#94a3b8;">우승 10점 · 준우승 5점 · 참가 2점</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;max-height:48vh;overflow-y:auto;padding-right:4px;">
                ${rankedStandings.length === 0 ? `
                  <div style="padding:22px;text-align:center;color:#94a3b8;background:rgba(15,23,42,0.7);border-radius:10px;font-size:12px;">
                    토너먼트 종료 시 헌터별 누적 승점과 상금이 집계됩니다.
                  </div>
                ` : rankedStandings.map((st, idx) => `
                  <div class="colosseum-match-row" style="cursor:default;">
                    <div style="font-size:11.5px;color:#f8fafc;min-width:0;flex:1;">
                      <b style="color:${idx === 0 ? '#fde047' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#fdba74' : '#94a3b8'};">#${idx + 1}</b>
                      <span style="margin-left:4px;font-weight:800;">${st.jobIcon} ${st.name}</span>
                      <span style="font-size:10px;color:#94a3b8;margin-left:4px;">(우승 ${st.wins} · 준우승 ${st.runnerUps} · 참가 ${st.participations})</span>
                    </div>
                    <div style="text-align:right;white-space:nowrap;">
                      <div style="font-size:11.5px;font-weight:800;color:#4ade80;">${st.points}점</div>
                      <div style="font-size:10px;color:#fde68a;">${formatGold(st.prizeGold)} G</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
        return;
      }

      // 3) 준결승 · 결승전 라이브 관람 탭
      const spectatableMatches = [];
      COLOSSEUM_STATE.rounds.forEach((r) => {
        if (r.isSpectatable) {
          r.matches.forEach((m) => {
            if (!m.isBye) spectatableMatches.push(m);
          });
        }
      });

      if (spectatableMatches.length === 0) {
        stopColosseumSpectatorLoop();
        body.innerHTML = `
          <div style="padding:28px;text-align:center;color:#cbd5e1;line-height:1.6;">
            관람 가능한 <b>준결승전 · 결승전</b> 경기가 아직 없습니다.<br/>
            토너먼트를 개막하면 준결승 및 결승전의 스킬 이펙트와 스킬명이 연출되는 라이브 결투를 관람할 수 있습니다.
          </div>
        `;
        return;
      }

      const activeSpecId = spectatableMatches.some(m => m.id === COLOSSEUM_STATE.spectatorMatchId)
        ? COLOSSEUM_STATE.spectatorMatchId
        : spectatableMatches[spectatableMatches.length - 1].id;

      body.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px;">
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${spectatableMatches.map((m) => `
              <button type="button" class="help-tab-btn ${m.id === activeSpecId ? 'active' : ''}" data-col-spec-select="${m.id}">
                ⚔️ ${m.roundName} ${m.matchLabel}: ${m.fighterA.name} vs ${m.fighterB.name}
              </button>
            `).join('')}
          </div>
          <button type="button" class="btn-roster-focus" id="btnReplayColosseumMatch">🔁 전투 다시 재생</button>
        </div>
        <div class="colosseum-arena-wrap">
          <canvas id="colosseumArenaCanvas"></canvas>
          <div id="colosseumCommentaryText" style="font-size:12px;font-weight:700;color:#fde68a;text-align:center;">
            전투 중계를 불러오는 중...
          </div>
        </div>
      `;

      document.getElementById('btnReplayColosseumMatch')?.addEventListener('click', () => {
        startColosseumSpectatorMatch(activeSpecId);
      });

      startColosseumSpectatorMatch(activeSpecId);
    }

    function openColosseumModal(defaultTab = null) {
      closeBuildingPanel();
      closeHunterPanel();
      closeMonsterPopup();
      if (defaultTab) {
        COLOSSEUM_STATE.activeTab = defaultTab;
      }
      renderColosseumModal();
      document.getElementById('colosseumModalBackdrop')?.classList.add('open');
    }

    function closeColosseumModal() {
      stopColosseumSpectatorLoop();
      document.getElementById('colosseumModalBackdrop')?.classList.remove('open');
    }

    document.getElementById('btnCloseColosseumModal')?.addEventListener('click', closeColosseumModal);
    document.getElementById('colosseumModalBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'colosseumModalBackdrop') closeColosseumModal();
    });
    document.getElementById('colosseumTabBar')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-col-tab]');
      if (!btn) return;
      COLOSSEUM_STATE.activeTab = btn.getAttribute('data-col-tab');
      renderColosseumModal();
    });
    document.getElementById('colosseumModalBody')?.addEventListener('click', (e) => {
      const watchBtn = e.target.closest('[data-col-watch-id]');
      if (watchBtn) {
        e.stopPropagation();
        const mId = watchBtn.getAttribute('data-col-watch-id');
        COLOSSEUM_STATE.spectatorMatchId = mId;
        COLOSSEUM_STATE.activeTab = 'spectator';
        renderColosseumModal();
        return;
      }
      const specBtn = e.target.closest('[data-col-spec-select]');
      if (specBtn) {
        const mId = specBtn.getAttribute('data-col-spec-select');
        COLOSSEUM_STATE.spectatorMatchId = mId;
        renderColosseumModal();
        return;
      }
      const matchRow = e.target.closest('[data-col-match-id]');
      if (matchRow) {
        const nextMatchId = matchRow.getAttribute('data-col-match-id');
        COLOSSEUM_STATE.selectedMatchId = nextMatchId;
        const selectedMatch = findColosseumMatchById(nextMatchId);
        const logPanel = document.getElementById('colosseumMatchLogPanel');
        if (selectedMatch && logPanel) {
          document.querySelectorAll('#colosseumRoundListScroll .colosseum-match-row').forEach((row) => {
            row.classList.toggle('active', row.getAttribute('data-col-match-id') === nextMatchId);
          });
          logPanel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:12.5px;font-weight:800;color:#fde68a;">📜 ${selectedMatch.roundName} ${selectedMatch.matchLabel} 전투 내용</span>
              ${selectedMatch.isSpectatable && !selectedMatch.isBye ? `
                <button type="button" class="btn-roster-focus" data-col-watch-id="${selectedMatch.id}">⚔️ 라이브 전투 관람하기</button>
              ` : ''}
            </div>
            <div class="colosseum-log-box">
              ${(selectedMatch.logs || []).map((line) => `<div>${line}</div>`).join('')}
            </div>
          `;
        } else {
          renderColosseumModal();
        }
      }
    });

    initStorageSystem();
