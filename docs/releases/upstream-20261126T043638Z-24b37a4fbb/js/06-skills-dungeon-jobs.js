// [06-skills-dungeon-jobs] 스킬 시스템 · 던전 난이도 · 직업/전직 트리 · 헌터 상호작용(PK)
    const SKILL_SYSTEM_CONFIG = {
      maxSkillLevel: 20,
      // Lv.1(1.0배)에서 Lv.20(2.0배)까지 최대 +100% 증가 (예: 120% -> 240%)
      effectScalePerLevel: 1 / 19,
      // 다음 스킬 레벨업에 필요한 사용 횟수(숙련도) 계산식
      getRequiredUses(currentLv) {
        return 4 + currentLv * 3;
      }
    };

    /**
     * ============================================================================
     * 지하 던전 공략 난이도 & 층수별 장비 티어·강화 커트라인 시스템 (T1 ~ T10 · B1F ~ B100F)
     * - 50층 기준 전 부위 T5 장비, 100층 기준 전 부위 T10 장비 + 고강화 필수!
     * ============================================================================
     */
    const DUNGEON_DIFFICULTY = {
      // 층수에 따른 최소 평균 장비 티어 요구치 (10층당 1티어 상승, 100층 = 전 부위 T10 필수)
      getRequiredMinTierAvg(floor) {
        if (floor >= 100) return 10.0;
        if (floor >= 90) return 9.0;
        if (floor >= 80) return 8.0;
        if (floor >= 70) return 7.0;
        if (floor >= 60) return 6.0;
        if (floor >= 50) return 5.0;
        if (floor >= 45) return 4.5;
        if (floor >= 40) return 4.0;
        if (floor >= 30) return 3.25;
        if (floor >= 20) return 2.25;
        if (floor >= 10) return 1.5;
        return 1.0;
      },
      // 층수별 권장 평균 강화 수치 (+0 ~ +15강)
      getRequiredAvgEnhance(floor) {
        if (floor >= 100) return 13;
        if (floor >= 80) return 12;
        if (floor >= 60) return 11;
        if (floor >= 50) return 12; // 50층은 풀 T5 + 평균 +12강 이상 필수
        if (floor >= 40) return 9;
        if (floor >= 30) return 7;
        if (floor >= 20) return 5;
        if (floor >= 10) return 3;
        return 0;
      },
      // 층수별 권장 전투력 (T1~T10 장비 및 강화 수치 반영 곡선)
      getRequiredCombatPower(floor) {
        if (floor <= 50) {
          return Math.round(310 + Math.pow(floor, 2.05) * 1.5);
        }
        const base50 = 310 + Math.pow(50, 2.05) * 1.5;
        const extraRatio = (floor - 50) / 50;
        return Math.round(base50 * Math.pow(6.2, extraRatio));
      },
      // 헌터의 현재 장비 티어·강화·스탯·환생·스킬을 종합한 전투력 산출
      evaluateHunterPower(hunter) {
        const stats = hunter.getComputedStats();
        const eq = hunter.equipment;
        const slots = ['weapon', 'armor', 'helmet', 'accessory'];
        const totalTier = slots.reduce((s, k) => s + (eq[k]?.tier || 1), 0);
        const totalEnhance = slots.reduce((s, k) => s + (eq[k]?.enhance || 0), 0);
        const avgTier = totalTier / 4;
        const avgEnhance = totalEnhance / 4;
        // 강화 +3강당 +0.25티어급 위력 보정 (고강화 장비의 상위 층수 돌파 반영)
        const effectiveTierAvg = avgTier + (avgEnhance / 12);
        const isFullT5 = slots.every(k => (eq[k]?.tier || 1) >= 5);
        const isFullT10 = slots.every(k => (eq[k]?.tier || 1) >= MAX_EQUIP_TIER);
        const skillLvSum = [...(hunter.skills?.actives || []), ...(hunter.skills?.passives || [])]
          .reduce((s, sk) => s + (sk.lv || 1), 0);

        const power = Math.round(
          stats.atk * 2.4 +
          stats.def * 2.1 +
          hunter.maxHp * 0.35 +
          stats.crit * 14 +
          Math.pow(avgTier, 1.55) * 740 +
          totalEnhance * 65 +
          skillLvSum * 18
        );

        return { power, avgTier, avgEnhance, effectiveTierAvg, totalTier, totalEnhance, isFullT5, isFullT10 };
      },
      // 헌터가 도전할 목표 층수 선정 (장비 티어 & 강화 상태 기반 안전 층수 + 돌파 도전)
      pickChallengeFloor(hunter, dungeonLevel) {
        const maxOpenFloor = Math.max(1, dungeonLevel * 10);
        const { power, avgTier, avgEnhance, effectiveTierAvg, isFullT5, isFullT10 } = this.evaluateHunterPower(hunter);

        let highestEligibleFloor = 0;
        for (let f = 1; f <= maxOpenFloor; f++) {
          // 50층부터는 전 부위 T5 이상 필수 (강화가 조금 부족해도 높은 티어면 아래 유효 티어로 통과)
          if (f >= 50 && !isFullT5) break;
          if (f >= 100 && (!isFullT10 || avgEnhance < this.getRequiredAvgEnhance(100))) break;

          const reqMinTier = this.getRequiredMinTierAvg(f);
          const reqEnhance = this.getRequiredAvgEnhance(f);
          const reqEffectiveTier = reqMinTier + (reqEnhance / 14);
          const reqPower = this.getRequiredCombatPower(f);

          if (
            avgTier + 0.02 >= reqMinTier &&
            effectiveTierAvg + 0.02 >= reqEffectiveTier &&
            power >= reqPower * 0.95
          ) {
            highestEligibleFloor = f;
          } else {
            break;
          }
        }

        if (highestEligibleFloor <= 0) {
          return 0;
        }

        const safeFloor = Math.max(1, highestEligibleFloor);
        const nextFrontier = Math.min(highestEligibleFloor, Math.max(1, hunter.bestDungeonFloor + 1));
        if (Math.random() < 0.55) {
          return Math.min(highestEligibleFloor, Math.max(safeFloor, nextFrontier));
        }
        return safeFloor;
      },
      // 실제 던전 공략 성공 여부 및 피해량 계산 (장비 티어 + 강화 상태 종합 판정)
      resolveClearAttempt(hunter, floor) {
        const evalData = this.evaluateHunterPower(hunter);
        const reqMinTier = this.getRequiredMinTierAvg(floor);
        const reqEnhance = this.getRequiredAvgEnhance(floor);
        const reqPower = this.getRequiredCombatPower(floor);

        // 100층은 풀 T10 장비 + 평균 +13강 이상 필수
        if (floor >= 100 && (!evalData.isFullT10 || evalData.avgEnhance < reqEnhance)) {
          return {
            success: false,
            reason: `100층 필수 조건 미달 (전 부위 T10 + 평균 +${reqEnhance}강 이상 필요 / 현재 T${evalData.avgTier.toFixed(1)} +${evalData.avgEnhance.toFixed(1)}강)`,
            hpLossRatio: 0.78
          };
        }

        // 50층부터는 전 부위 T5 이상 필수 (강화 부족은 높은 티어로 보완 가능 · 아래 유효 티어 판정)
        if (floor >= 50 && !evalData.isFullT5) {
          return {
            success: false,
            reason: `50층 필수 조건 미달 (전 부위 T5 이상 필요 / 현재 T${evalData.avgTier.toFixed(1)} +${evalData.avgEnhance.toFixed(1)}강)`,
            hpLossRatio: 0.72
          };
        }

        // 강화 보정이 포함된 유효 장비 등급 판정
        const reqEffectiveTier = reqMinTier + (reqEnhance / 14);
        if (evalData.effectiveTierAvg + 0.02 < reqEffectiveTier) {
          return {
            success: false,
            reason: `장비 티어·강화 부족 (현재 T${evalData.avgTier.toFixed(1)} +${evalData.avgEnhance.toFixed(1)}강 / 권장 T${reqMinTier.toFixed(1)} +${reqEnhance}강)`,
            hpLossRatio: 0.65
          };
        }

        const powerRatio = evalData.power / reqPower;
        if (powerRatio < 0.85) {
          return {
            success: false,
            reason: `전투력 부족 (${evalData.power.toLocaleString()} / 권장 ${reqPower.toLocaleString()})`,
            hpLossRatio: 0.6
          };
        }

        // 강화 보너스 충족도에 따른 승률 계산
        const enhanceBonusChance = Math.max(-0.15, (evalData.avgEnhance - reqEnhance) * 0.03);
        const winChance = Math.min(0.98, Math.max(0.15, (powerRatio - 0.8) * 1.75 + enhanceBonusChance));
        const success = Math.random() < winChance;
        const hpLossRatio = success
          ? Math.max(0.12, Math.min(0.62, 0.52 / powerRatio))
          : 0.68;

        return {
          success,
          reason: success ? '공략 성공' : `보스 광폭화 제압 실패 (전투력 ${evalData.power.toLocaleString()}/${reqPower.toLocaleString()})`,
          hpLossRatio
        };
      }
    };

    /**
     * ============================================================================
     * 자율 AI 헌터 시스템 (직업별 전용 무기 + 4부위 장비 + 직업별 스킬 + 무기 이펙트)
     * ============================================================================
     */
    const JOB_SKILLS = {
      '버서커': {
        actives: [
          { id: 'bsk_act_1', advTier: 0, icon: '🪓', name: '대지 분쇄격', mpCost: 35, desc: '강력한 내려찍기로 공격력 {power}% 광역 피해 & 기절 부여', basePower: 240 },
          { id: 'bsk_act_2', advTier: 0, icon: '🔥', name: '광전사의 포효', mpCost: 45, desc: '10초간 공격 속도 +40%, 공격력 +{power}% 폭주 상태 돌입', basePower: 30 }
        ],
        passives: [
          { id: 'bsk_pas_1', advTier: 0, icon: '🩸', name: '전투의 갈증', desc: '공격력 +{val}% & 처치 시 최대 체력 3% 회복', atkMult: 0.15 },
          { id: 'bsk_pas_2', advTier: 0, icon: '💢', name: '불굴의 투지', desc: '방어력 +{val}%', defMult: 0.10 }
        ]
      },
      '레인저': {
        actives: [
          { id: 'rng_act_1', advTier: 0, icon: '🏹', name: '연속 속사', mpCost: 30, desc: '전방 적에게 5연속 화살을 발사해 총 {power}% 관통 피해', basePower: 210 },
          { id: 'rng_act_2', advTier: 0, icon: '🌪️', name: '폭풍 화살비', mpCost: 50, desc: '넓은 범위에 화살비를 쏟아부어 {power}% 광역 제압', basePower: 190 }
        ],
        passives: [
          { id: 'rng_pas_1', advTier: 0, icon: '🦅', name: '매의 눈', desc: '치명타 확률 +{val}%', critBonus: 10 },
          { id: 'rng_pas_2', advTier: 0, icon: '🍃', name: '바람의 발걸음', desc: '이동 속도 +12 & 공격력 +{val}%', atkMult: 0.08, speedBonus: 12 }
        ]
      },
      '팔라딘': {
        actives: [
          { id: 'pld_act_1', advTier: 0, icon: '✨', name: '성광의 심판', mpCost: 40, desc: '신성한 빛의 검기로 공격력 {power}% 피해 & 악마형 추가 타격', basePower: 200 },
          { id: 'pld_act_2', advTier: 0, icon: '🛡️', name: '신성한 수호막', mpCost: 55, desc: '8초간 받는 피해 {power}% 감소 및 체력 지속 회복', basePower: 45 }
        ],
        passives: [
          { id: 'pld_pas_1', advTier: 0, icon: '⚜️', name: '신념의 갑주', desc: '방어력 +{val}% & 최대 체력 +15%', defMult: 0.20, hpMult: 0.15 },
          { id: 'pld_pas_2', advTier: 0, icon: '💖', name: '빛의 축복', desc: '피로도 누적 -{val}%', fatigueResist: 0.75 }
        ]
      },
      '소서러': {
        actives: [
          { id: 'sor_act_1', advTier: 0, icon: '☄️', name: '메테오 스트라이크', mpCost: 65, desc: '거대 운석을 소환해 공격력 {power}% 초강력 화염 폭발', basePower: 320 },
          { id: 'sor_act_2', advTier: 0, icon: '❄️', name: '빙결의 감옥', mpCost: 40, desc: '적들을 얼어붙게 만들어 {power}% 냉기 피해 및 이동 봉쇄', basePower: 180 }
        ],
        passives: [
          { id: 'sor_pas_1', advTier: 0, icon: '🔮', name: '마력 증폭', desc: '공격력 +{val}% & 치명타 확률 +5%', atkMult: 0.18, critBonus: 5 },
          { id: 'sor_pas_2', advTier: 0, icon: '💧', name: '아스트랄 순환', desc: '최대 MP +{val}% & MP 소모 -30%', mpMult: 0.25, mpSave: 0.7 }
        ]
      }
    };

    // 추후 전직 시스템 추가 시 전직 직업별 스킬 목록을 등록할 수 있는 확장 레지스트리
    const ADVANCEMENT_JOB_SKILLS = {};
    function registerAdvancementSkills(advancedJobName, skillSet) {
      ADVANCEMENT_JOB_SKILLS[advancedJobName] = skillSet;
    }

    /**
     * ============================================================================
     * 5단계 이진 트리 전직 시스템 (1환생 ~ 5환생 · 전직마다 2개 직업 선택지)
     * - 모든 전직 직업은 고유 액티브 스킬 1개 + 패시브 스킬 1개를 보유
     * - 1차(2종) -> 2차(4종) -> 3차(8종) -> 4차(16종) -> 5차(32종) 트리 계보
     * ============================================================================
     */
    const RAW_ADVANCEMENT_BLUEPRINTS = {
      '버서커': {
        prefix: 'bsk',
        tiers: [
          // 1차 전직 (2종)
          [
            ['워로드', '🛡️', 'defense', '파쇄 진격', '🔨', '강철 패기', '🧱'],
            ['광전사', '🪓', 'offense', '광란의 난무', '💢', '피의 갈망', '🩸']
          ],
          // 2차 전직 (4종)
          [
            ['파괴군주', '⚔️', 'offense', '대지 양단격', '🌋', '패왕의 위압', '👑'],
            ['철혈장군', '🏰', 'defense', '철벽 돌격진', '🛡️', '불굴의 갑주', '🦾'],
            ['혈마전사', '🩸', 'crit', '선혈의 일격', '🗡️', '흡혈 본능', '🦇'],
            ['화염광전사', '🔥', 'offense', '폭염 대폭발', '💥', '화염 심장', '❤️‍🔥']
          ],
          // 3차 전직 (8종)
          [
            ['대지분쇄자', '🏔️', 'offense', '지각 붕괴파', '🪨', '거인의 근력', '💪'],
            ['패왕', '👑', 'crit', '패왕 일섬', '⚡', '무쌍의 투기', '✨'],
            ['강철수호장', '🛡️', 'defense', '절대 방어태세', '🔰', '강철의 육체', '⛓️'],
            ['전장의지휘관', '🚩', 'speed', '돌격 함성', '📯', '전장의 기동력', '💨'],
            ['핏빛학살자', '🔪', 'crit', '살육의 회오리', '🌪️', '치명적 살기', '🎯'],
            ['심연광전사', '🌑', 'magic', '암흑 파동참', '🔮', '심연의 마력체', '🌌'],
            ['업화의투사', '🔥', 'offense', '업화 연옥참', '☄️', '작열하는 투지', '☀️'],
            ['용혈버서커', '🐉', 'defense', '용린 분쇄격', '🐲', '고룡의 혈통', '🧬']
          ],
          // 4차 전직 (16종)
          [
            ['지진의거인', '🗿', 'defense', '대지진 강타', '🌍', '거신의 대지축복', '⛰️'],
            ['산맥파괴자', '⛏️', 'offense', '산맥 붕괴격', '💥', '파괴자의 본능', '🔨'],
            ['무쌍패제', '🔱', 'offense', '무쌍 천패참', '⚔️', '제왕의 위엄', '👑'],
            ['천하제일투신', '🥋', 'crit', '투신 멸살권', '👊', '극한의 전투감각', '👁️'],
            ['불멸의방벽', '🏛️', 'defense', '불멸 수호진', '🛡️', '금강불괴 육신', '💎'],
            ['강철패장', '⚙️', 'offense', '강철 파쇄포', '💣', '중장갑 돌파력', '🛡️'],
            ['승리의군단장', '🎖️', 'speed', '필승 돌격령', '🎺', '질풍 진군술', '🐎'],
            ['전쟁의화신', '⚔️', 'offense', '전쟁신 강림격', '🔥', '끝없는 투쟁심', '♾️'],
            ['선혈의사신', '💀', 'crit', '사신의 낫질', '🌙', '치명타 극대화', '🩸'],
            ['진홍의수라', '👹', 'offense', '수라 멸절참', '🗡️', '아수라의 분노', '💢'],
            ['혼돈의폭군', '🌀', 'magic', '혼돈 폭열파', '🎆', '카오스 마력증폭', '🔮'],
            ['어둠의광왕', '🦇', 'crit', '칠흑 광란격', '🌑', '암흑의 치명술', '🖤'],
            ['불꽃의심판자', '⚖️', 'offense', '성염 심판검', '🔥', '불꽃의 심판관', '✨'],
            ['태양의광전사', '☀️', 'speed', '태양광 돌진', '🌟', '태양의 가호', '🔆'],
            ['적룡의계승자', '🐲', 'magic', '적룡 브레스', '🔥', '용왕의 마력심장', '💎'],
            ['드래곤슬레이어', '🗡️', 'crit', '멸룡 비오의', '⚡', '용살자의 집중', '🎯']
          ],
          // 5차 전직 (32종)
          [
            ['대지의주재자', '🌍', 'defense', '행성 분쇄격', '🪐', '대지신의 권능', '🏔️'],
            ['태초의거신', '🗿', 'offense', '태초 거신격', '💥', '원초의 괴력', '💪'],
            ['천지개벽투신', '⚡', 'offense', '천지개벽참', '🌌', '개벽의 투기', '🔥'],
            ['성벽붕괴왕', '🏰', 'defense', '만리성벽 파쇄', '🔨', '공성왕의 맷집', '🛡️'],
            ['절대패왕', '👑', 'offense', '절대패왕권', '🔱', '절대자의 위압', '✨'],
            ['무극투제', '♾️', 'crit', '무극 연환격', '🌀', '무극의 통찰', '👁️'],
            ['투신강림', '🔥', 'offense', '투신 천벌격', '☄️', '투신의 신격', '⚡'],
            ['파천무제', '⚔️', 'crit', '파천 일도류', '🌠', '파천의 예리함', '🎯'],
            ['금강불괴왕', '💎', 'defense', '금강 수호결계', '🛡️', '불괴의 신성체', '✨'],
            ['영원한수호신', '👼', 'defense', '영원의 방패', '🔰', '불멸의 생명력', '💖'],
            ['철혈황제', '👑', 'offense', '철혈 제국포', '💣', '황제의 강철심장', '⚙️'],
            ['강철의군신', '⚔️', 'speed', '강철 섬광돌격', '⚡', '군신의 기동전', '💨'],
            ['불패의대원수', '🎖️', 'defense', '불패 진형전개', '🚩', '불패의 전술안', '🧠'],
            ['천군지휘제', '📯', 'speed', '천군 질풍격', '🌪️', '천군의 가속', '👟'],
            ['아레스의화신', '🔥', 'offense', '전신 아레스창', '🔱', '전쟁신의 축복', '⚔️'],
            ['전쟁신', '🌋', 'crit', '신벌 대격돌', '💥', '전쟁신의 광기', '🩸'],
            ['혈월의지배자', '🌕', 'crit', '혈월 멸살파', '🩸', '혈월의 마력', '🔮'],
            ['진홍의사신왕', '💀', 'offense', '진홍 사신참', '🗡️', '사신왕의 낫', '🌑'],
            ['아수라왕', '👹', 'offense', '육도 아수라격', '🔥', '아수라 신공', '💢'],
            ['멸살의귀신', '👻', 'crit', '귀신 멸살섬', '⚡', '귀신의 살기', '🎯'],
            ['혼돈의파괴신', '🌀', 'magic', '혼돈 창세붕괴', '🌌', '파괴신의 마력', '🔮'],
            ['종말의폭군', '☄️', 'offense', '종말 대폭발', '💥', '폭군의 절대힘', '👑'],
            ['칠흑의마왕', '😈', 'magic', '칠흑 마왕파', '🌑', '마왕의 암흑체', '🖤'],
            ['심연의광제', '🌌', 'crit', '심연 광란참', '🗡️', '심연의 예리함', '👁️'],
            ['성염의집행자', '🔥', 'offense', '성염 천벌격', '☀️', '성염의 가호', '✨'],
            ['작열의군주', '🌋', 'magic', '작열 용암폭발', '💥', '화염군주의 마나', '💧'],
            ['태양신투사', '☀️', 'offense', '태양신 섬광참', '🌟', '태양신의 권능', '👑'],
            ['홍염의패자', '❤️‍🔥', 'speed', '홍염 질주격', '🔥', '홍염의 신속', '💨'],
            ['고대용왕', '🐉', 'defense', '고대용왕의 포효', '🐲', '용왕의 비늘', '🛡️'],
            ['진룡의화신', '🐲', 'magic', '진룡 천상파', '⚡', '진룡의 마력핵', '💎'],
            ['멸룡의신살자', '⚔️', 'crit', '신살 멸룡검', '🌠', '신살자의 극의', '🎯'],
            ['창세의용살왕', '👑', 'offense', '창세 파룡격', '🌋', '창세왕의 패기', '✨']
          ]
        ]
      },
      '레인저': {
        prefix: 'rng',
        tiers: [
          // 1차 전직 (2종)
          [
            ['스나이퍼', '🎯', 'crit', '정밀 저격탄', '🏹', '고배율 조준경', '🔭'],
            ['윈드워커', '🍃', 'speed', '질풍 연사격', '🌪️', '바람의 가호', '💨']
          ],
          // 2차 전직 (4종)
          [
            ['호크아이', '🦅', 'crit', '매의 일격', '⚡', '천리안 통찰', '👁️'],
            ['그림자명사수', '🌑', 'offense', '암살 독화살', '🗡️', '그림자 은신술', '👤'],
            ['폭풍궁수', '⛈️', 'speed', '뇌운 화살비', '🌩️', '폭풍의 탄력', '🌀'],
            ['정령사수', '🌿', 'magic', '정령의 마력시', '✨', '자연 마나교감', '💧']
          ],
          // 3차 전직 (8종)
          [
            ['천리안사수', '🔭', 'crit', '초원거리 관통시', '🌠', '신안의 집중력', '🎯'],
            ['일격필살궁수', '💥', 'offense', '필살 급소사격', '🏹', '치명적 파괴시', '💢'],
            ['암영추적자', '👤', 'speed', '그림자 기습연사', '🌑', '무음의 발걸음', '👟'],
            ['밤의사냥꾼', '🌙', 'crit', '월하의 사냥시', '🦇', '야간 사냥본능', '🦉'],
            ['질풍연사수', '🌪️', 'speed', '초고속 폭풍연사', '💨', '질풍의 활시위', '🍃'],
            ['뇌전궁수', '⚡', 'magic', '낙뢰 관통화살', '🌩️', '뇌전 마력충전', '🔋'],
            ['자연의감시자', '🌳', 'defense', '가시덩굴 결계시', '🌿', '대자연의 보호막', '🛡️'],
            ['달빛궁수', '🌕', 'magic', '은빛 월광화살', '✨', '달빛 마력순환', '🔮']
          ],
          // 4차 전직 (16종)
          [
            ['신안의저격수', '👁️', 'crit', '신안 천공저격', '🌟', '절대 명중률', '🎯'],
            ['별빛관측사수', '🌌', 'magic', '성좌 유성사격', '☄️', '별빛 마력증폭', '✨'],
            ['파멸의저격왕', '💣', 'offense', '파멸 폭열화살', '💥', '중화기 활시위', '🏹'],
            ['절대명중사수', '🎯', 'crit', '인과 필중화살', '⚡', '완벽한 조준술', '📐'],
            ['그림자암살궁수', '🗡️', 'crit', '무영 암살연격', '🌑', '치명 독극물', '🧪'],
            ['무영의사냥꾼', '👻', 'speed', '유령 환영사격', '💨', '잔상 회피기동', '🍃'],
            ['월하의처형자', '🌙', 'offense', '혈월 처형화살', '🩸', '처형자의 냉혹함', '❄️'],
            ['칠흑의추적왕', '🖤', 'speed', '칠흑 그림자추적', '👤', '어둠의 신속', '⚡'],
            ['허리케인아처', '🌀', 'speed', '태풍 회오리화살', '🌪️', '폭풍의 가속력', '💨'],
            ['초음속궁수', '🚀', 'offense', '음속 돌파화살', '💫', '초음속 연사체질', '🔥'],
            ['번개화살사수', '⚡', 'magic', '천둥 번개연사', '🌩️', '전격 마력화살', '🔮'],
            ['천둥의궁신', '🌩️', 'offense', '벽력 천벌사격', '💥', '뇌신의 위력', '👑'],
            ['세계수의수호궁', '🌲', 'defense', '세계수 뿌리속박', '🌿', '생명수의 축복', '💖'],
            ['대자연의현자궁', '🍃', 'magic', '대자연 정령폭풍', '✨', '정령왕의 지혜', '📘'],
            ['은월의성궁수', '🌕', 'magic', '은월 성광화살', '🌟', '성광 마력순환', '💧'],
            ['아르테미스사제', '🏹', 'crit', '여신의 은빛화살', '🌙', '달여신의 축복', '👑']
          ],
          // 5차 전직 (32종)
          [
            ['천공의신궁', '🌌', 'crit', '천공 파멸신시', '🌠', '신궁의 권능', '👑'],
            ['만리필중신', '🎯', 'offense', '만리 일격필살', '💥', '필중의 신격', '👁️'],
            ['성좌의저격신', '✨', 'magic', '성좌 붕괴사격', '☄️', '우주 마력공명', '🔮'],
            ['유성우궁제', '☄️', 'offense', '천체 유성우폭격', '🌟', '유성군 화력증폭', '🔥'],
            ['종언의탄환궁', '💣', 'offense', '종언 아포칼립스시', '💥', '종말의 파괴력', '💢'],
            ['절명신궁', '💀', 'crit', '절명 일점사격', '🏹', '절명의 치명타', '🎯'],
            ['인과율의사수', '⏳', 'crit', '인과 역전화살', '🌀', '운명 조작조준', '👁️'],
            ['필멸의궁황', '👑', 'offense', '궁황 천벌연사', '⚡', '황제의 궁술', '✨'],
            ['허공의암살신', '🌑', 'crit', '허공 절단화살', '🗡️', '차원 암살기법', '👤'],
            ['그림자궁제', '🖤', 'offense', '그림자 군단사격', '🦇', '암흑 제왕의 힘', '👑'],
            ['무형의사신궁', '👻', 'speed', '무형 사신연격', '💨', '초월적 민첩성', '🍃'],
            ['유령사냥왕', '🌙', 'crit', '유령 영혼관통시', '🔮', '영혼 사냥본능', '🎯'],
            ['혈월의저격신', '🩸', 'offense', '혈월 진홍화살', '🌕', '혈월의 광기', '💢'],
            ['심야의집행궁', '⚖️', 'crit', '심야 단죄사격', '🗡️', '집행신의 냉철함', '❄️'],
            ['심연의사냥신', '🌌', 'magic', '심연 공허화살', '🌑', '심연 마력흡수', '💧'],
            ['암흑의추적제', '🦇', 'speed', '암흑 섬광추적', '⚡', '추적제의 신속', '👟'],
            ['태풍의지배궁', '🌪️', 'speed', '대태풍 소용돌이시', '🌀', '폭풍신 가속', '💨'],
            ['폭풍신궁', '⛈️', 'offense', '폭풍신 천둥화살', '🌩️', '폭풍의 파괴력', '💥'],
            ['광속의섬광궁', '💫', 'speed', '광속 레이저화살', '🌟', '빛의 속도', '⚡'],
            ['시공질주궁', '⏳', 'speed', '시공간 도약연사', '🌀', '시간 가속술', '🔮'],
            ['뇌제의신궁', '⚡', 'magic', '뇌제 천벌낙뢰시', '🌩️', '뇌제의 마력체', '🔋'],
            ['천벌의번개궁', '🌩️', 'offense', '천벌 뇌광폭격', '💥', '번개신의 위엄', '👑'],
            ['뇌신강림궁', '⚡', 'crit', '뇌신 섬광일격', '🌠', '뇌신의 집중력', '🎯'],
            ['벽력의궁황', '💥', 'offense', '벽력 대폭발화살', '🔥', '벽력의 충격파', '💢'],
            ['생명의신목궁', '🌳', 'defense', '신목 생명화살', '🌿', '세계수의 불멸성', '💖'],
            ['에덴의수호신궁', '🏞️', 'defense', '에덴 성역화살비', '✨', '낙원의 수호막', '🛡️'],
            ['정령왕의계약궁', '🧚', 'magic', '4대정령 합동사격', '🌈', '정령왕의 마나', '💧'],
            ['가이아의신궁', '🌍', 'defense', '가이아 대지화살', '🏔️', '대지모신의 가호', '🛡️'],
            ['월신의대행자', '🌕', 'magic', '월신 은빛심판시', '✨', '월신의 마력축복', '🔮'],
            ['창월의신궁', '🌙', 'crit', '창월 초승달참격', '🌠', '창월의 예리함', '🎯'],
            ['달의여신강림', '👸', 'magic', '아르테미스 신벌시', '🌟', '여신의 절대마력', '👑'],
            ['천상사냥신궁', '🏹', 'crit', '천상 유성신격', '☄️', '사냥신의 완벽함', '✨']
          ]
        ]
      },
      '팔라딘': {
        prefix: 'pld',
        tiers: [
          // 1차 전직 (2종)
          [
            ['가디언', '🛡️', 'defense', '철벽 방패강타', '🔰', '수호자의 신념', '🏰'],
            ['크루세이더', '⚔️', 'offense', '십자군 성광참', '✝️', '성전의 열정', '🔥']
          ],
          // 2차 전직 (4종)
          [
            ['아이언월', '🧱', 'defense', '강철 성벽전개', '🛡️', '난공불락 방어술', '⚙️'],
            ['성전수호자', '⛪', 'magic', '성역 치유파동', '💖', '신성한 가호', '✨'],
            ['빛의심판관', '⚖️', 'offense', '단죄의 빛기둥', '🌟', '심판자의 권능', '👑'],
            ['성광기사', '☀️', 'crit', '성광 일섬검', '⚡', '광휘의 검술', '🗡️']
          ],
          // 3차 전직 (8종)
          [
            ['강철요새기사', '🏰', 'defense', '요새 철벽방어', '🛡️', '거대 방패숙련', '🧱'],
            ['불굴의수호경', '🦾', 'defense', '불굴의 수호맹세', '🔰', '강인한 생명력', '❤️‍🔥'],
            ['신성방패기사', '✨', 'magic', '성광 반사방패', '🪞', '신성 마력방어', '🔮'],
            ['성역의파수꾼', '⛩️', 'defense', '성역 결계선포', '🌟', '파수꾼의 인내', '🧘'],
            ['천벌의집행관', '⚡', 'offense', '천벌 성광낙뢰', '🌩️', '집행관의 위압', '💢'],
            ['광휘의단죄자', '🔆', 'crit', '광휘 연쇄심판', '⚔️', '빛의 예리함', '🎯'],
            ['태양기사단장', '☀️', 'offense', '태양검 대폭발', '🔥', '기사단장의 지휘', '🚩'],
            ['여명의성기사', '🌅', 'speed', '여명 섬광돌진', '💨', '새벽의 기동력', '👟']
          ],
          // 4차 전직 (16종)
          [
            ['절대방어성기사', '🛡️', 'defense', '절대 수호영역', '🔰', '완벽한 방어태세', '🏰'],
            ['난공불락수호왕', '👑', 'defense', '수호왕의 철벽진', '🧱', '왕의 불굴체력', '💖'],
            ['불멸의성기사', '🔥', 'defense', '불멸 성화재생', '❤️‍🔥', '불사조의 성혈', '🧬'],
            ['금강수호성인', '💎', 'defense', '금강 신성수호', '✨', '금강불괴 성체', '🗿'],
            ['이지스의계승자', '🔰', 'magic', '이지스 신성방패', '🌟', '신기의 마력보호', '🔮'],
            ['성광방벽기사', '🔆', 'defense', '성광 다중결계', '🛡️', '광휘 방벽강화', '✨'],
            ['천상성역수호자', '👼', 'magic', '천상 성역강림', '⛪', '천계의 축복', '💧'],
            ['신전의대수호경', '🏛️', 'defense', '대신전 수호파동', '🔔', '신전 수호의지', '🛡️'],
            ['신성심판대제', '⚖️', 'offense', '대제 신성심판', '⚡', '절대 심판권능', '👑'],
            ['천상의처단자', '🗡️', 'crit', '천상 처단일격', '🌠', '처단자의 치명검', '🎯'],
            ['백광의심판왕', '🌟', 'offense', '백광 섬멸검기', '💥', '백광의 파괴력', '☀️'],
            ['성화집행기사', '🔥', 'magic', '정화의 성화폭풍', '☄️', '성화 마력순환', '🔮'],
            ['황금태양성기사', '☀️', 'offense', '황금태양 성검참', '⚔️', '태양의 황금갑주', '👑'],
            ['광명기사황제', '🔆', 'crit', '광명 황제일섬', '⚡', '황제의 성광검술', '✨'],
            ['새벽별성기사', '⭐', 'speed', '새벽별 유성돌격', '💫', '샛별의 신속가호', '💨'],
            ['천사강림기사', '👼', 'magic', '대천사 강림검', '🌟', '천사의 날개축복', '🕊️']
          ],
          // 5차 전직 (32종)
          [
            ['영원한성벽신', '🏰', 'defense', '영원 신성요새', '🛡️', '성벽신의 절대방어', '💎'],
            ['절대수호신장', '🔰', 'defense', '신장 수호결계', '✨', '수호신장의 권능', '👑'],
            ['불패의요새왕', '🧱', 'defense', '불패 철벽반격', '⚔️', '요새왕의 강철심장', '⚙️'],
            ['철벽신기사', '🛡️', 'defense', '철벽 신성방패', '🔰', '신기사의 불굴혼', '❤️‍🔥'],
            ['불사조성기사', '🦅', 'defense', '불사조 성광부활', '🔥', '영원한 재생력', '💖'],
            ['영생의수호성', '♾️', 'magic', '영생 성수축복', '💧', '영생의 생명마나', '✨'],
            ['금강불괴성신', '💎', 'defense', '금강 천상수호', '🗿', '불괴신체의 극의', '🛡️'],
            ['대지의수호성왕', '🌍', 'defense', '대지 성왕방벽', '🏔️', '대지모신의 수호', '👑'],
            ['신기이지스의주인', '🔰', 'magic', '진·이지스 절대방어', '🌟', '신기 공명마력', '🔮'],
            ['천상방패신', '👼', 'defense', '천상 수호신기', '🛡️', '방패신의 가호', '✨'],
            ['성광결계수호신', '🔆', 'magic', '성광 천상대결계', '⛪', '결계신의 마력체', '💧'],
            ['신성방벽황제', '👑', 'defense', '황제 신성철벽', '🏰', '방벽황제의 위엄', '🛡️'],
            ['발할라수호신', '⚔️', 'offense', '발할라 영령수호검', '🌟', '전사들의 축복', '🔥'],
            ['천계수호대장', '👼', 'speed', '천계 섬광수호돌격', '💨', '천계군의 기동성', '👟'],
            ['대성당수호성신', '⛪', 'magic', '대성당 성광심판파', '🔔', '성신의 신성마력', '✨'],
            ['신전의절대자', '🏛️', 'defense', '절대 성역선포', '🔰', '신전 절대수호', '💎'],
            ['천상심판신', '⚖️', 'offense', '천상 절대심판검', '⚡', '심판신의 권능', '👑'],
            ['절대단죄성황', '👑', 'offense', '성황 단죄천벌', '💥', '성황의 심판위력', '🔥'],
            ['미카엘의대행자', '👼', 'offense', '대천사 불꽃성검', '🗡️', '미카엘의 신성력', '🌟'],
            ['신벌집행신', '⚡', 'crit', '신벌 일격단죄', '🌩️', '집행신의 치명검', '🎯'],
            ['순백의심판성신', '🕊️', 'magic', '순백 성광소멸파', '✨', '순백의 마력정화', '🔮'],
            ['광휘의절대왕', '🔆', 'offense', '광휘 천상대검', '☀️', '절대왕의 빛의힘', '👑'],
            ['정화의성화신', '🔥', 'magic', '정화 성화대폭발', '☄️', '성화신의 마나순환', '💧'],
            ['천화심판관', '🌋', 'offense', '천화 성검심판', '⚔️', '천화의 파괴검술', '💢'],
            ['태양신기사황', '☀️', 'offense', '태양신 황금성검', '🌟', '태양신의 절대권능', '👑'],
            ['황금빛성신', '✨', 'defense', '황금 성광수호막', '🛡️', '황금성신의 가호', '💖'],
            ['광명의대황제', '👑', 'crit', '광명 제국성검참', '⚡', '대황제의 검술극의', '🎯'],
            ['성광지배자', '🌟', 'magic', '성광 우주심판', '🌌', '성광 마력지배', '🔮'],
            ['여명신성기사', '🌅', 'speed', '여명 초광속돌격', '💫', '여명신의 신속', '💨'],
            ['샛별의대천사', '⭐', 'crit', '샛별 유성성검', '🌠', '대천사의 예리함', '🎯'],
            ['세라핌성기사', '👼', 'magic', '세라핌 6익성광파', '✨', '치천사의 신성마력', '👑'],
            ['창세의성광신', '🌌', 'offense', '창세 빛의심판', '☀️', '창세성광의 권능', '💎']
          ]
        ]
      },
      '소서러': {
        prefix: 'sor',
        tiers: [
          // 1차 전직 (2종)
          [
            ['아크메이지', '🔮', 'magic', '비전 대폭발', '✨', '대마법사의 지혜', '📘'],
            ['워록', '🌑', 'offense', '암흑 영혼파동', '💀', '금단의 마력계약', '🩸']
          ],
          // 2차 전직 (4종)
          [
            ['원소술사', '🌈', 'offense', '원소 융합폭격', '☄️', '원소 친화력', '🔥'],
            ['별빛현자', '🌟', 'magic', '성광 유성낙하', '🌠', '천체 마나순환', '💧'],
            ['흑마도사', '🖤', 'crit', '심연 저주폭발', '☠️', '암흑 치명마력', '👁️'],
            ['차원술사', '🌀', 'speed', '차원 균열파', '🌌', '공간 도약가속', '💨']
          ],
          // 3차 전직 (8종)
          [
            ['화염대마도사', '🔥', 'offense', '헬파이어 메테오', '☄️', '화염 마력극대화', '❤️‍🔥'],
            ['빙결대마도사', '❄️', 'defense', '블리자드 빙결폭풍', '🧊', '만년빙 마력갑주', '🛡️'],
            ['천체마도사', '🌌', 'magic', '성운 중력붕괴', '🪐', '우주 마나공명', '✨'],
            ['비전대현자', '📜', 'magic', '진리의 비전광선', '⚡', '현자의 마나절감', '💧'],
            ['심연지배자', '🌑', 'offense', '심연 암흑대폭발', '💥', '심연의 마력증폭', '🔮'],
            ['사령마도사', '💀', 'defense', '영혼 흡수결계', '👻', '불사의 영혼보호', '🛡️'],
            ['시공간마도사', '⏳', 'speed', '시간 왜곡폭격', '🌀', '시공 가속마법', '💨'],
            ['혼돈술사', '🎆', 'crit', '혼돈 카오스볼트', '⚡', '혼돈의 치명폭발', '🎯']
          ],
          // 4차 전직 (16종)
          [
            ['업화마도제', '🌋', 'offense', '업화 초열지옥', '🔥', '마도제의 화염권능', '👑'],
            ['태양폭발술사', '☀️', 'crit', '태양 플레어폭발', '💥', '태양광 치명마법', '🌟'],
            ['절대영도마도사', '🧊', 'defense', '절대영도 빙결파', '❄️', '절대영도 보호막', '🛡️'],
            ['만년설빙현자', '🏔️', 'magic', '만년설 빙하낙하', '🌨️', '설빙의 마나순환', '💧'],
            ['성운의지배자', '🌌', 'magic', '성운 초신성폭발', '✨', '성운 마력지배', '🔮'],
            ['은하마도현자', '🌠', 'offense', '은하수 마력격류', '☄️', '은하 현자의 지혜', '📘'],
            ['진리의대현자', '📖', 'magic', '진리 아카식광선', '🌟', '진리 탐구마나', '💧'],
            ['마력원천마도왕', '👑', 'offense', '마력원천 대붕괴', '💥', '무한 마력원천', '♾️'],
            ['심연의마왕술사', '😈', 'offense', '마왕 심연멸망파', '🌑', '마왕의 파괴마력', '🔥'],
            ['공허의지배자', '🕳️', 'crit', '공허 차원소멸', '🌀', '공허의 치명통찰', '👁️'],
            ['리치로드', '💀', 'defense', '리치 영혼방패', '🛡️', '불멸 리치의 마력', '❄️'],
            ['명계의지배자', '🦇', 'magic', '명계 사신소환파', '👻', '명계의 영혼마나', '💧'],
            ['시간의현자', '⌛', 'speed', '시간 정지폭격', '⚡', '시간 가속현자', '💨'],
            ['공간왜곡마도왕', '🌀', 'offense', '공간 절단대폭발', '💥', '공간 지배권능', '👑'],
            ['혼돈의대마도사', '🎆', 'crit', '혼돈 대격변마법', '🌩️', '카오스 치명증폭', '🎯'],
            ['파멸의비전술사', '☄️', 'offense', '파멸 비전종말파', '🔥', '파멸술사의 마력', '💢']
          ],
          // 5차 전직 (32종)
          [
            ['홍련의화염신', '🔥', 'offense', '홍련 천지소각', '🌋', '화염신의 절대권능', '👑'],
            ['태초불꽃마신', '❤️‍🔥', 'magic', '태초 불꽃창세파', '☄️', '태초불꽃 마력체', '🔮'],
            ['초신성마도신', '🌟', 'offense', '초신성 대폭발', '💥', '초신성의 파괴력', '🔥'],
            ['항성붕괴술사', '☀️', 'crit', '항성 블랙홀붕괴', '🌌', '항성 치명마법', '🎯'],
            ['빙하시대마신', '🧊', 'defense', '빙하시대 절대동결', '❄️', '빙하마신의 철벽', '🛡️'],
            ['영원동결신', '❄️', 'magic', '영원 빙결심판', '🌨️', '영원동결 마나체', '💧'],
            ['빙결여왕현자', '👸', 'defense', '여왕의 빙정결계', '💎', '빙정여왕의 가호', '✨'],
            ['설원신마도사', '🏔️', 'magic', '설원 천상눈보라', '❄️', '설원신의 마력순환', '🔮'],
            ['우주창조마신', '🌌', 'magic', '빅뱅 창세마법', '✨', '우주창조의 마나', '♾️'],
            ['성좌지배마황', '👑', 'offense', '성좌 유성대폭격', '🌠', '마황의 성좌권능', '🌟'],
            ['은하수대현신', '🌠', 'magic', '은하 대현신광선', '💫', '대현신의 무한지혜', '📘'],
            ['천체법칙의주인', '🪐', 'crit', '천체 궤도붕괴파', '☄️', '법칙 지배치명술', '👁️'],
            ['아카식현자신', '📖', 'magic', '아카식 절대진리파', '🌟', '전지적 마나절감', '💧'],
            ['전지전능마도신', '✨', 'offense', '전지전능 천벌마법', '⚡', '마도신의 절대마력', '👑'],
            ['무한마력마신', '♾️', 'magic', '무한 마력초폭발', '💥', '무한 마나원천', '🔮'],
            ['태초마나지배자', '💧', 'offense', '태초 마나해일', '🌊', '태초마나의 지배권', '✨'],
            ['심연절대마신', '😈', 'offense', '심연 절대멸망파', '🌑', '심연마신의 파괴권능', '🔥'],
            ['칠흑의마도황제', '🖤', 'crit', '칠흑 황제암흑파', '⚡', '마도황제의 치명술', '🎯'],
            ['허무의마신', '🕳️', 'crit', '허무 존재소멸파', '🌀', '허무의 절대통찰', '👁️'],
            ['공허창조술사', '🌌', 'magic', '공허 차원창조폭발', '🎆', '공허 마력순환', '🔮'],
            ['불멸의사령신', '💀', 'defense', '불멸 사령대군단', '👻', '불멸신체의 영혼막', '🛡️'],
            ['영혼지배마왕', '👑', 'magic', '영혼 붕괴대마법', '🖤', '영혼지배 마나흡수', '💧'],
            ['하데스의대행자', '🦇', 'offense', '하데스 명계심판', '🔥', '명계신의 파괴권능', '💀'],
            ['황천의마도신', '🌑', 'defense', '황천 영혼수호막', '🛡️', '황천신의 불멸가호', '💖'],
            ['크로노스현자', '⏳', 'speed', '크로노스 시간붕괴', '⚡', '시간신의 초가속', '💨'],
            ['영겁의시간신', '⌛', 'magic', '영겁 시공소멸파', '🌀', '영겁의 마력순환', '🔮'],
            ['차원초월마신', '🌀', 'offense', '차원 초월대폭발', '💥', '차원초월의 파괴력', '👑'],
            ['무한공간지배자', '🌌', 'speed', '무한 공간연쇄폭격', '🌠', '공간지배 기동마법', '💨'],
            ['혼돈창세마신', '🎆', 'offense', '혼돈 창세붕괴파', '☄️', '창세마신의 혼돈력', '🔥'],
            ['카오스로드', '🌀', 'crit', '카오스 절대파멸', '⚡', '카오스로드는 치명극의', '🎯'],
            ['종말예언마신', '☄️', 'offense', '종말 아포칼립스', '🌋', '종말마신의 권능', '👑'],
            ['아포칼립스마황', '👑', 'crit', '아포칼립스 성멸파', '💥', '마황의 종말치명술', '🎯']
          ]
        ]
      }
    };

    const JOB_ADVANCEMENT_TREE = {};
    const JOB_ADVANCEMENT_NODES_BY_ID = {};

    (function buildJobAdvancementTree() {
      Object.entries(RAW_ADVANCEMENT_BLUEPRINTS).forEach(([baseJob, cfg]) => {
        const prefix = cfg.prefix;
        const tierNodesList = [];

        cfg.tiers.forEach((tierEntries, tIdx) => {
          const tier = tIdx + 1; // 1 ~ 5차 전직
          const nodes = tierEntries.map((entry, idx) => {
            const [name, icon, tendency, activeName, activeIcon, passiveName, passiveIcon] = entry;
            const id = `${prefix}_t${tier}_${idx}`;
            const parentId = tier === 1 ? null : `${prefix}_t${tier - 1}_${Math.floor(idx / 2)}`;
            const childrenIds = tier < 5 ? [`${prefix}_t${tier + 1}_${idx * 2}`, `${prefix}_t${tier + 1}_${idx * 2 + 1}`] : [];

            const activePower = 190 + tier * 42 + (tendency === 'offense' ? 28 : 0);
            const activeMpCost = Math.max(25, 32 + tier * 6);

            const passiveSkill = {
              id: `${id}_pas`,
              advTier: tier,
              icon: passiveIcon,
              name: passiveName,
              desc: ''
            };

            if (tendency === 'offense') {
              const pct = 8 + tier * 2;
              passiveSkill.atkMult = pct / 100;
              passiveSkill.desc = `[${tier}차 전직] 공격력 +${pct}%`;
            } else if (tendency === 'defense') {
              const defPct = 9 + tier * 2;
              const hpPct = 6 + tier * 2;
              passiveSkill.defMult = defPct / 100;
              passiveSkill.hpMult = hpPct / 100;
              passiveSkill.desc = `[${tier}차 전직] 방어력 +${defPct}% & 최대 체력 +${hpPct}%`;
            } else if (tendency === 'crit') {
              const critVal = 4 + tier * 2;
              passiveSkill.critBonus = critVal;
              passiveSkill.desc = `[${tier}차 전직] 치명타 확률 +${critVal}%`;
            } else if (tendency === 'magic') {
              const mpPct = 10 + tier * 3;
              const atkPct = 6 + tier;
              passiveSkill.mpMult = mpPct / 100;
              passiveSkill.atkMult = atkPct / 100;
              passiveSkill.desc = `[${tier}차 전직] 최대 MP +${mpPct}% & 공격력 +${atkPct}%`;
            } else {
              const spdVal = 5 + tier * 2;
              const atkPct = 6 + tier;
              passiveSkill.speedBonus = spdVal;
              passiveSkill.atkMult = atkPct / 100;
              passiveSkill.desc = `[${tier}차 전직] 이동 속도 +${spdVal} & 공격력 +${atkPct}%`;
            }

            const activeSkill = {
              id: `${id}_act`,
              advTier: tier,
              icon: activeIcon,
              name: activeName,
              mpCost: activeMpCost,
              basePower: activePower,
              desc: `[${tier}차 전직] 고유 오의로 공격력 {power}% 강력 피해 부여`
            };

            const node = {
              id,
              tier,
              index: idx,
              baseJob,
              name,
              icon,
              tendency,
              parentId,
              childrenIds,
              activeSkill,
              passiveSkill
            };

            JOB_ADVANCEMENT_NODES_BY_ID[id] = node;
            registerAdvancementSkills(name, {
              actives: [activeSkill],
              passives: [passiveSkill]
            });
            return node;
          });
          tierNodesList.push(nodes);
        });

        JOB_ADVANCEMENT_TREE[baseJob] = {
          baseJob,
          prefix,
          tiers: tierNodesList
        };
      });
    })();

    function getNextAdvancementChoices(hunter) {
      const nextTier = (hunter.rebirthCount || 0) + 1;
      if (nextTier > LEVEL_REBIRTH_CONFIG.maxRebirths) return [];
      const tree = JOB_ADVANCEMENT_TREE[hunter.baseJob || hunter.job];
      if (!tree) return [];

      if (nextTier === 1) {
        return tree.tiers[0] ? [...tree.tiers[0]] : [];
      }
      const prevNodeId = hunter.advancementPath?.[nextTier - 2];
      const prevNode = prevNodeId ? JOB_ADVANCEMENT_NODES_BY_ID[prevNodeId] : null;
      if (prevNode && prevNode.childrenIds.length === 2) {
        return prevNode.childrenIds.map(cid => JOB_ADVANCEMENT_NODES_BY_ID[cid]).filter(Boolean);
      }
      const tierList = tree.tiers[nextTier - 1] || [];
      return tierList.slice(0, 2);
    }

    const PK_AGGRESSIVE_PERSONALITIES = new Set(['reckless', 'greedy', 'brave', 'nocturnal']);

    // 상급 사냥터(무법지대) PvP 완화 설정 (08-hunter-class.js PvP 판정에서 사용)
    //   decideEverySec: 선공을 고민하는 간격(초) · initiateChance: 그때 실제로 선공을 찾을 확률
    //   truceAfterDuelSec: 교전이 끝난 뒤 새 선공 금지 시간 · maxTargetDist: 노릴 수 있는 거리(px)
    //   (공격받으면 반격은 그대로 함 · 영웅의 투기장 HERO_ARENA는 이 설정 없이 무한 PvP)
    const PVP_CALM_CFG = {
      decideEverySec: 20,
      initiateChance: 0.2,
      truceAfterDuelSec: 60,
      maxTargetDist: 180
    };
    const COOPERATIVE_PERSONALITIES = new Set(['optimistic', 'charisma', 'hardworker', 'indomitable', 'ironwall']);
    const ZONE_RULES = {
      SAFE_TOWN: { label: '안전 마을 구역', allowPk: false },
      NORMAL_HUNT: { label: '일반 사냥터 구역', allowPk: false },
      LAWLESS_PK: { label: '무법 분쟁 구역', allowPk: true }
    };

    const RELATION_CIRCLE_LIMIT = 12; // 헌터 한 명이 기억하는 관계 수 (관계도 창 표시 인원과 같음)

    class HunterInteractionManager {
      constructor() {
        this.relations = new Map();
        this.pairCooldowns = new Map();
        this.activeBubbles = [];
        this.maxActiveBubbles = 16;
        this.spatialGrid = new Map();
        this.cellSize = 90;
        this.interactRadius = 64;
        this.maxInteractionsPerTick = 3;
        this.scanTimer = 0;
        this.gcTimer = 0;
        this.hunterIndex = new Map();
      }

      _getPairKey(idA, idB) {
        return idA < idB ? `${idA}::${idB}` : `${idB}::${idA}`;
      }

      _computeBaseAffinity(hunterA, hunterB) {
        const pA = hunterA.personality?.id || '';
        const pB = hunterB.personality?.id || '';
        let base = 0;
        if (COOPERATIVE_PERSONALITIES.has(pA)) base += 8;
        if (COOPERATIVE_PERSONALITIES.has(pB)) base += 8;
        if (PK_AGGRESSIVE_PERSONALITIES.has(pA) && PK_AGGRESSIVE_PERSONALITIES.has(pB)) base -= 12;
        return Math.max(-100, Math.min(100, base));
      }

      getRelation(hunterA, hunterB) {
        if (!hunterA || !hunterB || hunterA.id === hunterB.id) {
          return { affinity: 0, tier: 'neutral', label: '중립', badgeClass: 'rel-badge-neutral', pkGrudge: 0, interactions: 0 };
        }
        const key = this._getPairKey(hunterA.id, hunterB.id);
        const rec = this.relations.get(key);
        if (!rec) {
          const baseAff = this._computeBaseAffinity(hunterA, hunterB);
          return {
            affinity: baseAff,
            interactions: 0,
            pkGrudge: 0,
            ...this.classifyAffinity(baseAff)
          };
        }
        return {
          ...rec,
          ...this.classifyAffinity(rec.affinity)
        };
      }

      // 특정 헌터가 실제로 교류했거나 호감/적대 편차가 큰 주요 관계만 추출 (100명 규모 UI 최적화)
      getNotableRelations(targetHunter, allHunters, limit = 12) {
        if (!targetHunter) return [];
        const results = [];
        for (const other of allHunters) {
          if (other.id === targetHunter.id) continue;
          const key = this._getPairKey(targetHunter.id, other.id);
          const stored = this.relations.get(key);
          if (!stored && allHunters.length > 15) continue; // 15명 초과 시 실제 교류 기록 위주 표시
          const rel = this.getRelation(targetHunter, other);
          results.push({ other, rel, priority: Math.abs(rel.affinity) + rel.interactions * 5 + rel.pkGrudge * 20 });
        }
        results.sort((a, b) => b.priority - a.priority);
        return results.slice(0, limit);
      }

      // 관계도는 헌터마다 가장 깊은 12명까지만 유지 (관계도 창에 보이는 12명)
      // 그 밖의 헌터와는 기록을 지워 중립으로 되돌린다. 냉철한 헌터는 원한·인연을 그대로 기억한다.
      pruneRelationsToCircle(limit = RELATION_CIRCLE_LIMIT) {
        const byHunter = new Map();
        for (const [key, rec] of this.relations.entries()) {
          const ids = key.split('::');
          const priority = Math.abs(rec.affinity) + rec.interactions * 5 + rec.pkGrudge * 20;
          ids.forEach((id) => {
            if (!byHunter.has(id)) byHunter.set(id, []);
            byHunter.get(id).push({ key, priority });
          });
        }
        for (const [id, list] of byHunter.entries()) {
          if (list.length <= limit) continue;
          const h = this.hunterIndex.get(id) || (typeof hunters !== 'undefined' ? hunters.find(x => x.id === id) : null);
          if (h && h.personality?.id === 'cool') continue;
          list.sort((a, b) => b.priority - a.priority);
          list.slice(limit).forEach(e => this.relations.delete(e.key));
        }
      }

      // 특정 헌터 기준 현재 마을 내 숙적(rival, 호감도 -60 이하) 인원수 및 PvP 받는 피해 감소율 계산
      // 2명: 10%, 3명: 20%, 4명: 30%, 5명: 40%, 6명 이상: 최대 50%
      getRivalPvpDefenseBonus(targetHunter, allHunters) {
        if (!targetHunter || !Array.isArray(allHunters)) {
          return { rivalCount: 0, dmgReductionPct: 0 };
        }
        let rivalCount = 0;
        for (let i = 0; i < allHunters.length; i++) {
          const other = allHunters[i];
          if (!other || other.id === targetHunter.id) continue;
          const rel = this.getRelation(targetHunter, other);
          if (rel.tier === 'rival') {
            rivalCount += 1;
          }
        }
        if (rivalCount < 2) {
          return { rivalCount, dmgReductionPct: 0 };
        }
        const dmgReductionPct = Math.min(50, (rivalCount - 1) * 10);
        return { rivalCount, dmgReductionPct };
      }

      classifyAffinity(score) {
        if (score >= 60)  return { tier: 'ally',     label: '동맹', badgeClass: 'rel-badge-ally' };
        if (score >= 20)  return { tier: 'friendly', label: '우호', badgeClass: 'rel-badge-friendly' };
        if (score > -20)  return { tier: 'neutral',  label: '중립', badgeClass: 'rel-badge-neutral' };
        if (score > -60)  return { tier: 'wary',     label: '경계', badgeClass: 'rel-badge-wary' };
        return               { tier: 'rival',    label: '숙적', badgeClass: 'rel-badge-rival' };
      }

      modifyAffinity(hunterA, hunterB, delta, grudgeDelta = 0) {
        if (!hunterA || !hunterB || hunterA.id === hunterB.id) return;
        const key = this._getPairKey(hunterA.id, hunterB.id);
        let rec = this.relations.get(key);
        if (!rec) {
          rec = {
            affinity: this._computeBaseAffinity(hunterA, hunterB),
            interactions: 0,
            pkGrudge: 0
          };
          this.relations.set(key, rec);
        }
        rec.affinity = Math.max(-100, Math.min(100, rec.affinity + delta));
        rec.interactions += 1;
        rec.pkGrudge = Math.max(0, rec.pkGrudge + grudgeDelta);
      }

      // 숙적 관계 헌터 간 화해 처리 (양방향 호감도 회복 및 원한 감소)
      reconcileRivalPair(hunterA, hunterB, affinityBoost = 55, grudgeReduction = 2) {
        if (!hunterA || !hunterB || hunterA.id === hunterB.id) return null;
        const key = this._getPairKey(hunterA.id, hunterB.id);
        let rec = this.relations.get(key);
        if (!rec) {
          rec = {
            affinity: this._computeBaseAffinity(hunterA, hunterB),
            interactions: 0,
            pkGrudge: 0
          };
          this.relations.set(key, rec);
        }
        const prevAffinity = rec.affinity;
        rec.affinity = Math.max(20, Math.min(100, rec.affinity + affinityBoost));
        rec.pkGrudge = Math.max(0, (rec.pkGrudge || 0) - grudgeReduction);
        rec.interactions += 1;
        const nextClass = this.classifyAffinity(rec.affinity);
        return {
          prevAffinity,
          nextAffinity: rec.affinity,
          ...nextClass
        };
      }

      // 해제/사망 등으로 제거된 헌터의 관계·쿨다운 데이터 일괄 정리 (메모리 누수 방지)
      purgeHunterData(removedHunterId) {
        for (const key of this.relations.keys()) {
          if (key.includes(removedHunterId)) this.relations.delete(key);
        }
        for (const key of this.pairCooldowns.keys()) {
          if (key.includes(removedHunterId)) this.pairCooldowns.delete(key);
        }
      }

      // [추후 PK 지역 확장용 핵심 API]
      evaluatePkEngagement(attacker, defender, zoneType = 'SAFE_TOWN') {
        const rule = ZONE_RULES[zoneType] || ZONE_RULES.SAFE_TOWN;
        if (!attacker || !defender || attacker.id === defender.id) {
          return { action: 'IGNORE', reason: '대상 없음' };
        }
        // 일반 헌터(0환생)와 환생 헌터(1환생 이상) 간 PvP 금지
        const isAttackerReborn = (attacker.rebirthCount || 0) > 0;
        const isDefenderReborn = (defender.rebirthCount || 0) > 0;
        if (isAttackerReborn !== isDefenderReborn) {
          return { action: 'IGNORE', reason: '일반·환생 헌터 간 PvP 금지' };
        }
        const rel = this.getRelation(attacker, defender);

        if (!rule.allowPk) {
          return {
            action: rel.affinity >= 20 ? 'COOPERATE_PVE' : 'PEACEFUL_PASS',
            reason: `${rule.label} 보호 적용`
          };
        }

        if (rel.tier === 'ally' || rel.affinity >= 45) {
          return { action: 'ASSIST_ALLY', reason: '동맹 보호 및 파티 협공' };
        }
        const isPredator = PK_AGGRESSIVE_PERSONALITIES.has(attacker.personality?.id);
        const hasGrudge = rel.pkGrudge > 0 || rel.affinity <= -35;
        const lootIncentive = attacker.personality?.id === 'greedy' && defender.materials >= 3;

        if (hasGrudge || (isPredator && rel.affinity < 0) || lootIncentive) {
          return {
            action: 'ATTACK_PK',
            reason: hasGrudge ? '숙적 원한 PK 선공' : '전리품 약탈 PK 선공',
            aggressionScore: Math.min(100, Math.abs(rel.affinity) + rel.pkGrudge * 15 + (isPredator ? 25 : 0))
          };
        }

        return { action: 'CAUTIOUS_AVOID', reason: '불필요한 교전 회피' };
      }

      spawnBubble(hunter, text, color = '#f8fafc') {
        // 선택된 헌터의 말풍선은 우선 보장하고, 일반 말풍선은 상한(maxActiveBubbles) 이내에서만 생성
        const isPriority = hunter.id === gameState.selectedHunterId;
        if (!isPriority && this.activeBubbles.length >= this.maxActiveBubbles) return;

        // 동일 헌터가 이미 말풍선을 띄우고 있으면 최신 내용으로 교체
        const existingIdx = this.activeBubbles.findIndex(b => b.hunterId === hunter.id);
        const bubbleObj = {
          hunterId: hunter.id,
          x: hunter.x,
          y: hunter.y - 46,
          text,
          color,
          life: 2.3,
          maxLife: 2.3
        };
        if (existingIdx >= 0) {
          this.activeBubbles[existingIdx] = bubbleObj;
        } else {
          this.activeBubbles.push(bubbleObj);
        }
      }

      triggerTownInteraction(hA, hB) {
        // 마을 상호작용이 잦아 호감도가 쉽게 오르내리지 않도록 65% 확률로 가벼운 인사만 진행
        if (Math.random() < 0.65) {
          this.spawnBubble(hA, `👋 ${hB.name}`, '#cbd5e1');
          return;
        }

        const rel = this.getRelation(hA, hB);
        const pA = hA.personality?.id || '';
        const pB = hB.personality?.id || '';
        const isAggressive = PK_AGGRESSIVE_PERSONALITIES.has(pA) || PK_AGGRESSIVE_PERSONALITIES.has(pB);

        if (rel.affinity <= -25 || (isAggressive && rel.affinity < -10 && Math.random() < 0.25)) {
          // 숙적 관계(-60 이하)일 경우 일정 확률로 먼저 화해 제안을 시도
          if (rel.tier === 'rival' && Math.random() < 0.35) {
            const res = this.reconcileRivalPair(hA, hB, 58, 2);
            if (res) {
              this.spawnBubble(hA, `🕊️ ${hB.name}, 과거는 잊자`, '#7dd3fc');
              this.spawnBubble(hB, `🤝 좋아, 화해하자! (${res.label})`, '#86efac');
              return;
            }
          }
          this.modifyAffinity(hA, hB, -3, 0);
          this.spawnBubble(hA, '⚡ 눈빛이 마주쳤다...', '#fca5a5');
          this.spawnBubble(hB, '💢 신경 쓰이네', '#fde047');
          return;
        }

        if (rel.affinity >= 30 && (hB.hp < hB.maxHp * 0.65 || hB.mp < hB.maxMp * 0.65)) {
          const healHp = Math.round(hB.maxHp * 0.08);
          const healMp = Math.round(hB.maxMp * 0.1);
          hB.hp = Math.min(hB.maxHp, hB.hp + healHp);
          hB.mp = Math.min(hB.maxMp, hB.mp + healMp);
          hA.gainExp(10);
          this.modifyAffinity(hA, hB, 2, 0);
          this.spawnBubble(hA, `🤝 힘내, ${hB.name}`, '#86efac');
          this.spawnBubble(hB, '💖 고마워', '#7dd3fc');
          return;
        }

        // 동맹(60+) 관계라도 영원하지 않으며, 드물게 이해관계 충돌이나 오해로 동맹이 흔들릴 수 있음
        if (rel.tier === 'ally' && Math.random() < 0.14) {
          const driftDelta = Math.random() < 0.35 ? -18 : -8;
          this.modifyAffinity(hA, hB, driftDelta, driftDelta <= -15 ? 1 : 0);
          const updated = this.getRelation(hA, hB);
          this.spawnBubble(hA, `🤔 ${hB.name}, 요즘 생각이 다르네`, '#fde047');
          this.spawnBubble(hB, `😒 우리 사이도 영원하진 않지 (${updated.label})`, '#fca5a5');
          return;
        }

        if (hA.personalGold >= 900 && hB.personalGold < 250 && rel.affinity >= 25 && Math.random() < 0.35) {
          const gift = 30;
          hA.personalGold -= gift;
          hB.personalGold += gift;
          this.modifyAffinity(hA, hB, 3, 0);
          this.spawnBubble(hA, `💰 조금 보태 (${gift}G)`, '#fde047');
          this.spawnBubble(hB, '✨ 고마워', '#86efac');
          return;
        }

        if (Math.random() < 0.4) {
          this.modifyAffinity(hA, hB, 2, 0);
          this.spawnBubble(hA, `💬 ${hB.name}, 수고해`, '#e0f2fe');
          this.spawnBubble(hB, '👍 응, 너도', '#bae6fd');
        }
      }

      update(dt, hunterList, zoneType = 'SAFE_TOWN') {
        // 1) ID 빠른 조회 테이블 구축 (O(N))
        this.hunterIndex.clear();
        for (let i = 0; i < hunterList.length; i++) {
          this.hunterIndex.set(hunterList[i].id, hunterList[i]);
        }

        // 2) 말풍선 수명 및 위치 추적 (O(B), B <= 16)
        for (let i = this.activeBubbles.length - 1; i >= 0; i--) {
          const b = this.activeBubbles[i];
          b.life -= dt;
          const owner = this.hunterIndex.get(b.hunterId);
          if (owner && owner.state !== 'IN_DUNGEON') {
            b.x = owner.x;
            b.y = owner.y - 46;
          }
          if (b.life <= 0) this.activeBubbles.splice(i, 1);
        }

        // 3) 쿨다운 감소
        for (const [k, cd] of this.pairCooldowns.entries()) {
          if (cd - dt <= 0) this.pairCooldowns.delete(k);
          else this.pairCooldowns.set(k, cd - dt);
        }

        // 4) 주기적 고아 관계 데이터 정리 + 관계 12명 유지 (5초마다)
        this.gcTimer += dt;
        if (this.gcTimer >= 5) {
          this.gcTimer = 0;
          for (const key of this.relations.keys()) {
            const [idA, idB] = key.split('::');
            if (!this.hunterIndex.has(idA) || !this.hunterIndex.has(idB)) {
              this.relations.delete(key);
            }
          }
          this.pruneRelationsToCircle();
        }

        this.scanTimer -= dt;
        if (this.scanTimer > 0) return;
        this.scanTimer = 1.6;

        // 5) 공간 해시 그리드 구축 (O(N)) -> 100명+ 규모에서도 근접 셀만 탐색
        this.spatialGrid.clear();
        const activeHunters = [];
        for (let i = 0; i < hunterList.length; i++) {
          const h = hunterList[i];
          if (h.state === 'IN_DUNGEON') continue;
          activeHunters.push(h);
          const cx = Math.floor(h.x / this.cellSize);
          const cy = Math.floor(h.y / this.cellSize);
          const cellKey = `${cx},${cy}`;
          let bucket = this.spatialGrid.get(cellKey);
          if (!bucket) {
            bucket = [];
            this.spatialGrid.set(cellKey, bucket);
          }
          bucket.push(h);
        }

        let triggeredCount = 0;
        const rSq = this.interactRadius * this.interactRadius;

        for (let i = 0; i < activeHunters.length; i++) {
          if (triggeredCount >= this.maxInteractionsPerTick) break;
          const hA = activeHunters[i];
          const cx = Math.floor(hA.x / this.cellSize);
          const cy = Math.floor(hA.y / this.cellSize);

          // 인접 3x3 셀만 검사
          for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
              const neighbors = this.spatialGrid.get(`${cx + ox},${cy + oy}`);
              if (!neighbors) continue;

              for (let j = 0; j < neighbors.length; j++) {
                const hB = neighbors[j];
                if (hA.id >= hB.id) continue; // 중복 쌍 검사 방지

                const dx = hA.x - hB.x;
                const dy = hA.y - hB.y;
                if (dx * dx + dy * dy > rSq) continue;

                const pairKey = `${hA.id}::${hB.id}`;
                if (this.pairCooldowns.has(pairKey)) continue;

                this.pairCooldowns.set(pairKey, 45 + Math.random() * 25);
                if (zoneType === 'SAFE_TOWN') {
                  this.triggerTownInteraction(hA, hB);
                  triggeredCount++;
                  if (triggeredCount >= this.maxInteractionsPerTick) break;
                }
              }
            }
          }
        }
      }

      drawBubbles(ctx) {
        this.activeBubbles.forEach((b) => {
          const alpha = Math.min(1, b.life / 0.45);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.font = 'bold 10.5px sans-serif';
          const tw = ctx.measureText(b.text).width;
          const boxW = tw + 14;
          const boxH = 20;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.beginPath();
          ctx.roundRect(b.x - boxW / 2, b.y - boxH / 2, boxW, boxH, 8);
          ctx.fill();

          ctx.strokeStyle = b.color;
          ctx.lineWidth = 1.4;
          ctx.stroke();

          ctx.fillStyle = b.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.text, b.x, b.y);
          ctx.restore();
        });
      }
    }

    const interactionManager = new HunterInteractionManager();
