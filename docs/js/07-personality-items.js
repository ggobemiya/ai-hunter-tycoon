// [07-personality-items] 헌터 성격 · 장비 티어 · 이름 생성 · 아이템 카탈로그 · 인벤토리
    // 32가지 개성 있는 헌터 성격 (특성 18종 + 패널티 14종)
    const HUNTER_PERSONALITIES = [
      { id: 'brave', name: '용맹한', icon: '🔥', kind: 'trait', effectText: '공격력 +14%', atkMult: 0.14 },
      { id: 'cool', name: '냉철한', icon: '❄️', kind: 'trait', effectText: '치명타 확률 +9%', critBonus: 9 },
      { id: 'ironwall', name: '철벽같은', icon: '🛡️', kind: 'trait', effectText: '방어력 +18%', defMult: 0.18 },
      { id: 'agile', name: '민첩한', icon: '💨', kind: 'trait', effectText: '이동 속도 +18', speedBonus: 18 },
      { id: 'lucky', name: '행운아', icon: '🍀', kind: 'trait', effectText: '전리품 획득량 +25%', lootMult: 1.25 },
      { id: 'greedy', name: '탐욕스러운', icon: '💰', kind: 'trait', effectText: '던전 골드 +35%', goldMult: 1.35 },
      { id: 'collector', name: '수집광', icon: '📦', kind: 'trait', effectText: '전리품 재료 +2개 추가', extraMat: 2 },
      { id: 'steelmental', name: '강철멘탈', icon: '🧠', kind: 'trait', effectText: '피로도 누적 -30%', fatigueMult: 0.7 },
      { id: 'ascetic', name: '금욕적인', icon: '🧘', kind: 'trait', effectText: '포만감 소모 -35%', hungerMult: 0.65 },
      { id: 'manaaffinity', name: '마력친화', icon: '🔮', kind: 'trait', effectText: '최대 MP +25% & MP 소모 -25%', mpMult: 0.25, mpSave: 0.75 },
      { id: 'indomitable', name: '불굴의', icon: '❤️‍🔥', kind: 'trait', effectText: '최대 체력 +22%', hpMult: 0.22 },
      { id: 'genius', name: '천재적인', icon: '✨', kind: 'trait', effectText: '공격력 +10% & 치명타 확률 +5%', atkMult: 0.10, critBonus: 5 },
      { id: 'perfectionist', name: '완벽주의자', icon: '📐', kind: 'trait', effectText: '공격력 +8% & 방어력 +8%', atkMult: 0.08, defMult: 0.08 },
      { id: 'curious', name: '호기심많은', icon: '🧭', kind: 'trait', effectText: '던전 탐험 시간 -20%', exploreSpeedMult: 0.8 },
      { id: 'optimistic', name: '낙천적인', icon: '☀️', kind: 'trait', effectText: '시설 회복 효율 +30%', healMult: 1.3 },
      { id: 'charisma', name: '카리스마', icon: '👑', kind: 'trait', effectText: '개인 골드 정산 +30%', personalGoldMult: 1.3 },
      { id: 'hardworker', name: '노력파', icon: '💪', kind: 'trait', effectText: '방어력 +12% & 최대 체력 +10%', defMult: 0.12, hpMult: 0.10 },
      { id: 'nocturnal', name: '야행성', icon: '🌙', kind: 'trait', effectText: '치명타 확률 +6% & 이동 속도 +10', critBonus: 6, speedBonus: 10 },

      { id: 'lazy', name: '게으른', icon: '🦥', kind: 'penalty', effectText: '이동 속도 -14', speedBonus: -14 },
      { id: 'glutton', name: '대식가', icon: '🍖', kind: 'penalty', effectText: '포만감 소모 +45%', hungerMult: 1.45 },
      { id: 'reckless', name: '무모한', icon: '💥', kind: 'penalty', effectText: '방어력 -14%', defMult: -0.14 },
      { id: 'timid', name: '소심한', icon: '💦', kind: 'penalty', effectText: '공격력 -12%', atkMult: -0.12 },
      { id: 'unlucky', name: '불운아', icon: '🌧️', kind: 'penalty', effectText: '치명타 확률 -6%', critBonus: -6 },
      { id: 'glassmental', name: '유리멘탈', icon: '💔', kind: 'penalty', effectText: '피로도 누적 +35%', fatigueMult: 1.35 },
      { id: 'clumsy', name: '덜렁대는', icon: '💰', kind: 'penalty', effectText: '던전 골드 -20%', goldMult: 0.8 },
      { id: 'sluggish', name: '둔중한', icon: '🐢', kind: 'penalty', effectText: '이동 속도 -10 & 치명타 확률 -4%', speedBonus: -10, critBonus: -4 },
      { id: 'extravagant', name: '사치스러운', icon: '💎', kind: 'penalty', effectText: '개인 골드 정산 -25%', personalGoldMult: 0.75 },
      { id: 'manadrain', name: '마력고갈', icon: '🥀', kind: 'penalty', effectText: 'MP 소모 +35%', mpSave: 1.35 },
      { id: 'frail', name: '허약한', icon: '🩹', kind: 'penalty', effectText: '최대 체력 -18%', hpMult: -0.18 },
      { id: 'pessimistic', name: '비관적인', icon: '☁️', kind: 'penalty', effectText: '시설 회복 효율 -20%', healMult: 0.8 },
      { id: 'stubborn', name: '고집불통', icon: '🪨', kind: 'penalty', effectText: '던전 탐험 시간 +20%', exploreSpeedMult: 1.2 },
      { id: 'distracted', name: '산만한', icon: '🦋', kind: 'penalty', effectText: '전리품 획득량 -15%', lootMult: 0.85 }
    ];

    // 환생 전직 성향: 성격 → [공격 'offense' / 방어 'defense' / 'balanced', 좋아하는 세부 성향]
    // 세부 성향: offense(공격) · crit(치명) · magic(마법) · speed(속도) · defense(방어)
    const PERSONALITY_JOB_LEAN = {
      brave: ['offense', 'offense'], cool: ['offense', 'crit'], ironwall: ['defense', 'defense'],
      agile: ['offense', 'speed'], lucky: ['balanced', 'crit'], greedy: ['offense', 'offense'],
      collector: ['balanced', 'speed'], steelmental: ['defense', 'defense'], ascetic: ['defense', 'magic'],
      manaaffinity: ['offense', 'magic'], indomitable: ['defense', 'defense'], genius: ['offense', 'crit'],
      perfectionist: ['balanced', null], curious: ['offense', 'magic'], optimistic: ['defense', 'defense'],
      charisma: ['offense', 'speed'], hardworker: ['defense', 'defense'], nocturnal: ['offense', 'crit'],
      lazy: ['defense', 'defense'], glutton: ['defense', 'defense'], reckless: ['offense', 'offense'],
      timid: ['defense', 'defense'], unlucky: ['defense', null], glassmental: ['defense', 'defense'],
      clumsy: ['balanced', 'offense'], sluggish: ['defense', 'defense'], extravagant: ['offense', 'offense'],
      manadrain: ['offense', 'offense'], frail: ['defense', 'defense'], pessimistic: ['defense', 'defense'],
      stubborn: ['defense', 'defense'], distracted: ['offense', 'speed']
    };

    /**
     * 헌터의 환생 차수(5환생 이상)를 반영한 유효 성격 프로필 반환
     * - 5환생(rebirthCount >= 5) 달성 시 'penalty' 성격의 마이너스(-) 효과는 플러스(+)로 반전되고 2배(x2)로 적용
     */
    function getEffectivePersonalityProfile(personality, rebirthCount = 0) {
      if (!personality || typeof personality !== 'object') {
        return {
          kind: 'none',
          isRebirth5InvertedPenalty: false,
          effectText: '',
          speedBonus: 0,
          atkMult: 0,
          defMult: 0,
          critBonus: 0,
          hpMult: 0,
          mpMult: 0,
          fatigueMult: 1,
          hungerMult: 1,
          mpSave: 1,
          exploreSpeedMult: 1,
          goldMult: 1,
          lootMult: 1,
          healMult: 1,
          personalGoldMult: 1,
          extraMat: 0
        };
      }

      const isRebirth5Penalty = personality.kind === 'penalty' && (Number(rebirthCount) || 0) >= LEVEL_REBIRTH_CONFIG.maxRebirths;
      if (!isRebirth5Penalty) {
        return {
          ...personality,
          isRebirth5InvertedPenalty: false,
          speedBonus: personality.speedBonus || 0,
          atkMult: personality.atkMult || 0,
          defMult: personality.defMult || 0,
          critBonus: personality.critBonus || 0,
          hpMult: personality.hpMult || 0,
          mpMult: personality.mpMult || 0,
          fatigueMult: personality.fatigueMult ?? 1,
          hungerMult: personality.hungerMult ?? 1,
          mpSave: personality.mpSave ?? 1,
          exploreSpeedMult: personality.exploreSpeedMult ?? 1,
          goldMult: personality.goldMult ?? 1,
          lootMult: personality.lootMult ?? 1,
          healMult: personality.healMult ?? 1,
          personalGoldMult: personality.personalGoldMult ?? 1,
          extraMat: personality.extraMat || 0
        };
      }

      const flipRatioDown = (val) => {
        const base = typeof val === 'number' ? val : 1;
        // 예: 1.45(+45% 소모) -> 1 - (0.45 * 2) = 0.10 (-90% 절감/감소)
        return Math.max(0.1, Number((1 - (base - 1) * 2).toFixed(4)));
      };

      const flipRatioUp = (val) => {
        const base = typeof val === 'number' ? val : 1;
        // 예: 0.80(-20% 보상) -> 1 + (0.20 * 2) = 1.40 (+40% 증가)
        return Number((1 + (1 - base) * 2).toFixed(4));
      };

      const speedBonus = -(personality.speedBonus || 0) * 2;
      const atkMult = -(personality.atkMult || 0) * 2;
      const defMult = -(personality.defMult || 0) * 2;
      const critBonus = -(personality.critBonus || 0) * 2;
      const hpMult = -(personality.hpMult || 0) * 2;
      const mpMult = -(personality.mpMult || 0) * 2;
      const fatigueMult = personality.fatigueMult !== undefined ? flipRatioDown(personality.fatigueMult) : 1;
      const hungerMult = personality.hungerMult !== undefined ? flipRatioDown(personality.hungerMult) : 1;
      const mpSave = personality.mpSave !== undefined ? flipRatioDown(personality.mpSave) : 1;
      const exploreSpeedMult = personality.exploreSpeedMult !== undefined ? flipRatioDown(personality.exploreSpeedMult) : 1;
      const goldMult = personality.goldMult !== undefined ? flipRatioUp(personality.goldMult) : 1;
      const lootMult = personality.lootMult !== undefined ? flipRatioUp(personality.lootMult) : 1;
      const healMult = personality.healMult !== undefined ? flipRatioUp(personality.healMult) : 1;
      const personalGoldMult = personality.personalGoldMult !== undefined ? flipRatioUp(personality.personalGoldMult) : 1;

      const effectParts = [];
      if (speedBonus !== 0) effectParts.push(`이동 속도 ${speedBonus > 0 ? `+${speedBonus}` : speedBonus}`);
      if (atkMult !== 0) effectParts.push(`공격력 ${atkMult > 0 ? `+${Math.round(atkMult * 100)}%` : `${Math.round(atkMult * 100)}%`}`);
      if (defMult !== 0) effectParts.push(`방어력 ${defMult > 0 ? `+${Math.round(defMult * 100)}%` : `${Math.round(defMult * 100)}%`}`);
      if (critBonus !== 0) effectParts.push(`치명타 확률 ${critBonus > 0 ? `+${critBonus}%` : `${critBonus}%`}`);
      if (hpMult !== 0) effectParts.push(`최대 체력 ${hpMult > 0 ? `+${Math.round(hpMult * 100)}%` : `${Math.round(hpMult * 100)}%`}`);
      if (mpMult !== 0) effectParts.push(`최대 MP ${mpMult > 0 ? `+${Math.round(mpMult * 100)}%` : `${Math.round(mpMult * 100)}%`}`);
      if (personality.hungerMult !== undefined) effectParts.push(`포만감 소모 -${Math.round((1 - hungerMult) * 100)}%`);
      if (personality.fatigueMult !== undefined) effectParts.push(`피로도 누적 -${Math.round((1 - fatigueMult) * 100)}%`);
      if (personality.goldMult !== undefined) effectParts.push(`던전 골드 +${Math.round((goldMult - 1) * 100)}%`);
      if (personality.personalGoldMult !== undefined) effectParts.push(`개인 골드 정산 +${Math.round((personalGoldMult - 1) * 100)}%`);
      if (personality.mpSave !== undefined) effectParts.push(`MP 소모 -${Math.round((1 - mpSave) * 100)}%`);
      if (personality.healMult !== undefined) effectParts.push(`시설 회복 효율 +${Math.round((healMult - 1) * 100)}%`);
      if (personality.exploreSpeedMult !== undefined) effectParts.push(`던전 탐험 시간 -${Math.round((1 - exploreSpeedMult) * 100)}%`);
      if (personality.lootMult !== undefined) effectParts.push(`전리품 획득량 +${Math.round((lootMult - 1) * 100)}%`);

      return {
        ...personality,
        isRebirth5InvertedPenalty: true,
        effectText: `${effectParts.join(' & ')} (5환생 반전 x2)`,
        speedBonus,
        atkMult,
        defMult,
        critBonus,
        hpMult,
        mpMult,
        fatigueMult,
        hungerMult,
        mpSave,
        exploreSpeedMult,
        goldMult,
        lootMult,
        healMult,
        personalGoldMult,
        extraMat: personality.extraMat || 0
      };
    }

    const JOB_WEAPON_NAMES = {
      '버서커': [
        '수습생 손도끼', '강철 배틀액스', '미스릴 대부', '용살자의 쌍날도끼', '신화 라그나로크',
        '뇌전 파괴부', '심연의 단두대', '성광 심판대부', '혼돈 멸망의 도끼', '창세 파천의 신부'
      ],
      '레인저': [
        '나무 단궁', '복합 사냥궁', '미스릴 장궁', '용린의 폭풍궁', '신화 아르테미스',
        '뇌전 섬광궁', '심연의 그림자활', '성광 천공의 활', '혼돈 파멸의 장궁', '창세 유성신궁'
      ],
      '팔라딘': [
        '수습생 장검', '기사단의 검', '미스릴 성검', '용혈의 심판검', '신화 엑스칼리버',
        '뇌전 성좌의 검', '심연 군주의 마검', '성광 세라핌 성검', '혼돈 균열의 대검', '창세 절대성검'
      ],
      '소서러': [
        '참나무 지팡이', '수정 지팡이', '미스릴 스태프', '용맥의 대지팡이', '신화 아스트랄 로드',
        '뇌전 번개지팡이', '심연 공허의 홀', '성광 천사의 지팡이', '혼돈 차원의 스태프', '창세 태초의 신장'
      ]
    };

    const EQUIP_TIER_NAMES = {
      weapon: [
        '수습생 무기', '강철 무기', '미스릴 무기', '용살자의 무기', '신화 무기',
        '뇌전 무기', '심연 무기', '성광 무기', '혼돈 무기', '창세 절대무기'
      ],
      armor: [
        '가죽 튜닉', '사슬 갑옷', '미스릴 플레이트', '용린 중갑옷', '성광의 성갑',
        '뇌전 성좌갑옷', '심연 암흑중갑', '세라핌 황금성갑', '혼돈 차원갑주', '창세 절대신갑'
      ],
      helmet: [
        '가죽 두건', '철제 투구', '기사의 면갑', '비룡의 투구', '왕관 헬름',
        '뇌전 번개투구', '심연 암흑면갑', '세라핌 천상관', '혼돈 균열투구', '창세 절대신관'
      ],
      accessory: [
        '구리 반지', '은빛 목걸이', '마력의 부적', '심연의 인장', '별빛 성유물',
        '뇌전 성좌반지', '심연 군주의 인장', '세라핌 성광훈장', '혼돈 차원보주', '창세 태초의 성물'
      ]
    };

    // 다음 티어(targetTier: 2~10)로 장비를 업그레이드하기 위한 필수 조건 테이블 (대장간 Lv.2~Lv.10 연동)
    const TIER_UPGRADE_RULES = {
      2:  { reqSmithyLv: 2,  reqEnhance: 3,  goldCost: 12000,   matCost: 8 },
      3:  { reqSmithyLv: 3,  reqEnhance: 6,  goldCost: 35000,   matCost: 20 },
      4:  { reqSmithyLv: 4,  reqEnhance: 9,  goldCost: 90000,   matCost: 45 },
      5:  { reqSmithyLv: 5,  reqEnhance: 12, goldCost: 220000,  matCost: 90 },
      6:  { reqSmithyLv: 6,  reqEnhance: 8,  goldCost: 480000,  matCost: 150 },
      7:  { reqSmithyLv: 7,  reqEnhance: 9,  goldCost: 1050000, matCost: 240 },
      8:  { reqSmithyLv: 8,  reqEnhance: 10, goldCost: 2300000, matCost: 360 },
      9:  { reqSmithyLv: 9,  reqEnhance: 11, goldCost: 5000000, matCost: 520 },
      10: { reqSmithyLv: 10, reqEnhance: 12, goldCost: 11000000, matCost: 750 }
    };

    // 장비 티어(T1~T10)별 능력치 성장 배율 (T1~T5 기존 밸런스 유지 + T6~T10 심층/보스 6~10단계 대응)
    function getEquipTierMultiplier(tier = 1) {
      const t = Math.max(1, Math.min(MAX_EQUIP_TIER, tier));
      if (t <= 5) return t;
      return 5 + Math.pow(t - 5, 1.55) * 2.4;
    }

    // 신규 헌터 영입용 직업 기본 아키타입 (테스트용 사전 배치 헌터 없음)
    const JOB_ARCHETYPES = [
      { job: '버서커', baseAtk: 140, baseDef: 65,  crit: 22, hair: '#f59e0b', armor: '#dc2626' },
      { job: '레인저', baseAtk: 125, baseDef: 52,  crit: 32, hair: '#10b981', armor: '#059669' },
      { job: '팔라딘', baseAtk: 105, baseDef: 110, crit: 14, hair: '#e2e8f0', armor: '#2563eb' },
      { job: '소서러', baseAtk: 155, baseDef: 45,  crit: 25, hair: '#c084fc', armor: '#7c3aed' }
    ];

    const NAME_SYLLABLES_START = [
      '아', '레', '카', '리', '세', '루', '실', '엘', '로', '벨',
      '테', '유', '진', '한', '민', '서', '도', '하', '노', '미',
      '샤', '크', '드', '라', '발', '티', '나', '소', '해', '은'
    ];
    const NAME_SYLLABLES_MID = [
      '르', '이', '엔', '비', '온', '아', '라', '린', '스', '오',
      '우', '준', '연', '하', '윤', '설', '빈', '율', '채', '민'
    ];
    const NAME_SYLLABLES_END = [
      '투르', '비아', '엔', '나', '온', '스', '린', '엘', '드', '란',
      '아', '진', '호', '성', '현', '우', '서', '준', '율', '빈'
    ];

    // 최대 4글자 이내의 중복 없는 랜덤 헌터 이름 생성기
    function generateRandomHunterName(existingHunters = []) {
      const usedNames = new Set(existingHunters.map(h => h.name));
      for (let attempt = 0; attempt < 40; attempt++) {
        const lenType = Math.random();
        let candidate = '';
        if (lenType < 0.35) {
          // 2글자 이름
          const s1 = NAME_SYLLABLES_START[Math.floor(Math.random() * NAME_SYLLABLES_START.length)];
          const s2 = NAME_SYLLABLES_MID[Math.floor(Math.random() * NAME_SYLLABLES_MID.length)];
          candidate = (s1 + s2).slice(0, 4);
        } else if (lenType < 0.8) {
          // 3글자 이름
          const s1 = NAME_SYLLABLES_START[Math.floor(Math.random() * NAME_SYLLABLES_START.length)];
          const s2 = NAME_SYLLABLES_MID[Math.floor(Math.random() * NAME_SYLLABLES_MID.length)];
          const s3 = NAME_SYLLABLES_END[Math.floor(Math.random() * NAME_SYLLABLES_END.length)];
          candidate = (s1 + s2 + s3).slice(0, 3);
        } else {
          // 4글자 이름
          const s1 = NAME_SYLLABLES_START[Math.floor(Math.random() * NAME_SYLLABLES_START.length)];
          const s2 = NAME_SYLLABLES_MID[Math.floor(Math.random() * NAME_SYLLABLES_MID.length)];
          const s3 = NAME_SYLLABLES_END[Math.floor(Math.random() * NAME_SYLLABLES_END.length)];
          candidate = (s1 + s2 + s3).slice(0, 4);
        }
        if (candidate.length >= 2 && candidate.length <= 4 && !usedNames.has(candidate)) {
          return candidate;
        }
      }
      return `모험${Math.floor(10 + Math.random() * 89)}`.slice(0, 4);
    }

    /**
     * ============================================================================
     * 확장형 아이템 도감(ITEM_CATALOG) & 헌터 전용 인벤토리(HunterInventory)
     * - 전리품(loot), 제작/보스 재료(material), 기타 아이템(misc) 등을 자유롭게 확장 가능
     * - 잡화상점 정산, 대장간 승급 재료 소모, 세이브 직렬화와 일원화 연동
     * ============================================================================
     */
    const ITEM_CATALOG = {
      loot_beginner_crystal: {
        id: 'loot_beginner_crystal',
        category: 'loot',
        legacyKey: 'beginner',
        name: '초원 풀잎 결정',
        icon: '🌱',
        rarity: 'common',
        sellable: true,
        isCraftingMat: true,
        valueMultiplier: 1.0,
        desc: '초보 사냥터 마물에게서 얻는 순수한 풀잎 결정'
      },
      loot_mid_ore: {
        id: 'loot_mid_ore',
        category: 'loot',
        legacyKey: 'mid',
        name: '협곡 강철 광석',
        icon: '⛏️',
        rarity: 'uncommon',
        sellable: true,
        isCraftingMat: true,
        valueMultiplier: 2.6,
        desc: '안개 협곡의 단단한 광맥과 몬스터에서 채취한 고가 광석'
      },
      loot_high_heart: {
        id: 'loot_high_heart',
        category: 'loot',
        legacyKey: 'high',
        name: '화산 용암 심장석',
        icon: '🔥',
        rarity: 'rare',
        sellable: true,
        isCraftingMat: true,
        valueMultiplier: 6.5,
        desc: '용암 화산지대 강적의 핵에서 추출한 초고가 희귀 전리품'
      },
      loot_top_astral: {
        id: 'loot_top_astral',
        category: 'loot',
        legacyKey: 'top',
        name: '심연 성좌의 별결정',
        icon: '💠',
        rarity: 'epic',
        sellable: true,
        isCraftingMat: true,
        valueMultiplier: 16.0,
        desc: '초보 사냥터 동쪽 심연 성좌지대에서 채취하는 최고급 성좌 결정'
      },
      loot_celestial_nebula: {
        id: 'loot_celestial_nebula',
        category: 'loot',
        legacyKey: 'celestial',
        name: '천궁의 성운결정',
        icon: '🌌',
        rarity: 'legendary',
        sellable: true,
        isCraftingMat: true,
        valueMultiplier: 24.0,
        desc: '천공의 섬 위 [성운의 천궁]에서만 얻을 수 있는 성운 결정'
      },
      loot_rebirth_essence: {
        id: 'loot_rebirth_essence',
        category: 'loot',
        legacyKey: 'rebirth',
        name: '윤회 성역의 영혼결정',
        icon: '🌠',
        rarity: 'epic',
        sellable: true,
        isCraftingMat: true,
        valueMultiplier: 12.0,
        desc: '중급 사냥터 동쪽 환생 전용 사냥터 [윤회의 성역]에서 획득하는 영혼 결정'
      },
      boss_guardian_core: {
        id: 'boss_guardian_core',
        category: 'material',
        name: '고대 수호자 룬핵',
        icon: '💠',
        rarity: 'epic',
        sellable: true,
        isCraftingMat: true,
        valueMultiplier: 12.0,
        desc: '고대 수호자 보스 토벌 시 획득하는 고농축 마력 룬핵'
      },
      dungeon_abyss_shard: {
        id: 'dungeon_abyss_shard',
        category: 'material',
        name: '심연 던전 마정석',
        icon: '🔮',
        rarity: 'uncommon',
        sellable: true,
        isCraftingMat: true,
        valueMultiplier: 3.2,
        desc: '지하 던전 탐험에서 발견되는 고순도 마정석'
      },
      equip_fragment: {
        id: 'equip_fragment',
        category: 'currency_mat',
        name: '장비조각',
        icon: '🧩',
        rarity: 'rare',
        sellable: false,
        isCraftingMat: true,
        valueMultiplier: 0,
        desc: '몬스터 토벌 시 획득하는 장비 강화 및 승급 전용 재화 (잡화상점 판매 불가)'
      },
      insignia_beginner: {
        id: 'insignia_beginner',
        category: 'insignia',
        regionName: '초보 사냥터',
        name: '초원 수호왕의 인장',
        icon: '🌱',
        rarity: 'uncommon',
        sellable: false,
        isCraftingMat: false,
        monsterDmgBonusPct: 0.25,
        auraColor: '#4ade80',
        desc: '초보 사냥터 중간 보스 토벌 증표. 착용 시 몬스터 대상 입히는 피해 +25% 증가'
      },
      insignia_mid: {
        id: 'insignia_mid',
        category: 'insignia',
        regionName: '중급 사냥터',
        name: '협곡 거신병의 인장',
        icon: '⛰️',
        rarity: 'rare',
        sellable: false,
        isCraftingMat: false,
        monsterDmgBonusPct: 0.50,
        auraColor: '#38bdf8',
        desc: '중급 사냥터 중간 보스 토벌 증표. 착용 시 몬스터 대상 입히는 피해 +50% 증가'
      },
      insignia_high: {
        id: 'insignia_high',
        category: 'insignia',
        regionName: '상급 사냥터',
        name: '화산 패왕의 인장',
        icon: '🌋',
        rarity: 'epic',
        sellable: false,
        isCraftingMat: false,
        monsterDmgBonusPct: 0.75,
        auraColor: '#fb923c',
        desc: '상급 사냥터 중간 보스 토벌 증표. 착용 시 몬스터 대상 입히는 피해 +75% 증가'
      },
      insignia_top: {
        id: 'insignia_top',
        category: 'insignia',
        regionName: '오크의 숲',
        name: '심연 성좌의 인장',
        icon: '🌌',
        rarity: 'legendary',
        sellable: false,
        isCraftingMat: false,
        monsterDmgBonusPct: 1.00,
        auraColor: '#c084fc',
        desc: '최상급 사냥터 중간 보스 토벌 증표. 착용 시 몬스터 대상 입히는 피해 +100% 증가'
      },
      insignia_rebirth_supreme: {
        id: 'insignia_rebirth_supreme',
        category: 'insignia',
        regionName: '초월 환생의 제단',
        name: '초월 윤회의 인장',
        icon: '✨',
        rarity: 'legendary',
        sellable: false,
        isCraftingMat: false,
        monsterDmgBonusPct: 1.50,
        auraColor: '#f472b6',
        desc: '환생 헌터 전용 최상급 중간보스 토벌 증표. 착용 시 몬스터 대상 입히는 피해 +150% 증가'
      },
      sky_sanctuary_wings: {
        id: 'sky_sanctuary_wings',
        category: 'wing',
        regionName: '천공의 섬',
        name: '천공의 성역 날개',
        icon: '🪽',
        rarity: 'legendary',
        sellable: false,
        isCraftingMat: false,
        atkBonusPct: 0.20,
        defBonusPct: 0.20,
        critBonus: 8,
        speedBonus: 16,
        enhanceAtkBonusPct: 0.04,
        enhanceDefBonusPct: 0.04,
        enhanceCritBonus: 1,
        enhanceSpeedBonus: 2,
        desc: '천공의 섬 몬스터 사냥 시 0.01% 확률로 획득하는 성역의 날개. 착용 시 공격력/방어력 +20%, 치명타 +8%, 이동속도 +16 상승 (천공 대장간 강화 시 추가 상승)'
      }
    };

    const REGIONAL_INSIGNIA_IDS = [
      'insignia_beginner',
      'insignia_mid',
      'insignia_high',
      'insignia_top',
      'insignia_rebirth_supreme'
    ];

    const SKY_WING_ITEM_IDS = [
      'sky_sanctuary_wings'
    ];

    const SINGLETON_EQUIP_CATEGORIES = new Set([
      'insignia',
      'wing'
    ]);

    const LOOT_TIER_TO_ITEM_ID = {
      beginner: 'loot_beginner_crystal',
      mid: 'loot_mid_ore',
      high: 'loot_high_heart',
      top: 'loot_top_astral',
      rebirth: 'loot_rebirth_essence',
      celestial: 'loot_celestial_nebula'
    };

    class HunterInventory {
      constructor(maxSlots = 24) {
        this.maxSlots = maxSlots;
        this.items = new Map();
      }

      addItem(id, qty = 1) {
        const amount = Math.max(0, Math.floor(qty));
        if (!id || amount <= 0) return false;
        const def = ITEM_CATALOG[id];
        const isSingleton = def && SINGLETON_EQUIP_CATEGORIES.has(def.category);
        const isEquipFragment = id === 'equip_fragment';
        const existing = this.items.get(id);
        if (existing) {
          if (isSingleton) {
            existing.qty = 1;
            return false;
          }
          if (isEquipFragment) {
            const nextQty = Math.min(EQUIP_FRAGMENT_MAX_STACK, existing.qty + amount);
            const added = nextQty > existing.qty;
            existing.qty = nextQty;
            return added;
          }
          existing.qty += amount;
          return true;
        }
        if (this.items.size >= this.maxSlots) return false;
        const initialQty = isSingleton
          ? 1
          : (isEquipFragment ? Math.min(EQUIP_FRAGMENT_MAX_STACK, amount) : amount);
        this.items.set(id, { id, qty: initialQty });
        return true;
      }

      removeItem(id, qty = 1) {
        const amount = Math.max(0, Math.floor(qty));
        if (!id || amount <= 0) return 0;
        const existing = this.items.get(id);
        if (!existing) return 0;
        const taken = Math.min(existing.qty, amount);
        existing.qty -= taken;
        if (existing.qty <= 0) {
          this.items.delete(id);
        }
        return taken;
      }

      getCount(id) {
        return this.items.get(id)?.qty || 0;
      }

      getTotalItemCount() {
        let sum = 0;
        for (const entry of this.items.values()) {
          sum += entry.qty || 0;
        }
        return sum;
      }

      getTotalCraftingMaterialCount() {
        let sum = 0;
        for (const [id, entry] of this.items.entries()) {
          const def = ITEM_CATALOG[id];
          if (!def || def.isCraftingMat !== false) {
            sum += entry.qty || 0;
          }
        }
        return sum;
      }

      consumeCraftingMaterials(amount) {
        let needed = Math.max(0, Math.floor(amount));
        if (needed <= 0) return true;
        if (this.getTotalCraftingMaterialCount() < needed) return false;

        const priorityOrder = [
          'equip_fragment',
          'loot_beginner_crystal',
          'loot_mid_ore',
          'dungeon_abyss_shard',
          'loot_high_heart',
          'loot_rebirth_essence',
          'boss_guardian_core',
          'loot_top_astral'
        ];
        for (const id of priorityOrder) {
          if (needed <= 0) break;
          const taken = this.removeItem(id, needed);
          needed -= taken;
        }
        for (const [id] of this.items.entries()) {
          if (needed <= 0) break;
          const def = ITEM_CATALOG[id];
          if (!def || def.isCraftingMat !== false) {
            const taken = this.removeItem(id, needed);
            needed -= taken;
          }
        }
        return needed === 0;
      }

      getEntriesByCategory(category = null) {
        const list = [];
        for (const [id, entry] of this.items.entries()) {
          if (!entry || entry.qty <= 0) continue;
          const def = ITEM_CATALOG[id] || {
            id,
            category: 'misc',
            name: id,
            icon: '📦',
            sellable: false,
            valueMultiplier: 1.0,
            desc: '기타 보관 아이템'
          };
          if (!category || def.category === category) {
            list.push({ id, qty: entry.qty, def });
          }
        }
        return list;
      }

      toJSON() {
        const arr = [];
        for (const [id, entry] of this.items.entries()) {
          if (entry && entry.qty > 0) {
            arr.push({ id, qty: entry.qty });
          }
        }
        return arr;
      }

      loadFromJSON(rawArr) {
        this.items.clear();
        if (!Array.isArray(rawArr)) return;
        rawArr.forEach(entry => {
          if (entry && entry.id && entry.qty > 0) {
            const def = ITEM_CATALOG[entry.id];
            const isSingleton = def && SINGLETON_EQUIP_CATEGORIES.has(def.category);
            const rawQty = Math.floor(entry.qty);
            const cappedQty = isSingleton
              ? 1
              : (entry.id === 'equip_fragment' ? Math.min(EQUIP_FRAGMENT_MAX_STACK, rawQty) : rawQty);
            this.items.set(entry.id, {
              id: entry.id,
              qty: cappedQty
            });
          }
        });
      }
    }

    // (분리 시 이동) 원래 05-field-monsters.js 에 있던 초기화 코드 — 장비 티어 함수(getEquipTierMultiplier)가 정의된 뒤 실행돼야 함
    ORC_STRONGHOLD_ZONE.orcs.forEach((o, i) => ensureOrcUnitFields(o, i));
