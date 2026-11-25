// [19-save-code-reset] 저장 코드 내보내기/불러오기 · 전체 초기화
    const SAVE_CODE_PREFIX = 'AVSAVE1:';
    const SAVE_CODE_COMPACT_PREFIX = 'AVSAVE2:';

    function buildCompactSavePayload(payloadObj) {
      const src = normalizeAndMigrateSaveData(payloadObj) || serializeGameSaveData();
      const compactPlots = (src.plots || []).map((p) => {
        const b = p.building;
        if (!b) return [p.id, p.x, p.y, null];
        const bArr = [b.type, b.level || 1];
        const hasHp = typeof b.hp === 'number';
        if (hasHp || (b.unlockedMaxLevel || b.level || 1) !== (b.level || 1)) {
          bArr.push(b.unlockedMaxLevel || b.level || 1);
        }
        if (hasHp) bArr.push(Math.round(b.hp)); // 건물 체력 (js/31-building-hp.js)
        return [p.id, p.x, p.y, bArr];
      });

      const compactHunters = (src.hunters || []).map((h) => {
        const eqObj = safeParseJson(h.equipment, {});
        const slotKeys = ['weapon', 'armor', 'helmet', 'accessory'];
        const eqArr = slotKeys.map((k) => {
          const item = eqObj?.[k] || {};
          const t = item.tier || 1;
          const e = item.enhance || 0;
          return e > 0 ? [t, e] : t;
        });
        while (eqArr.length > 0 && eqArr[eqArr.length - 1] === 1) {
          eqArr.pop();
        }

        const parsedSkills = safeParseJson(h.skillsJson || h.skills, null);
        const skillProg = [];
        if (parsedSkills && typeof parsedSkills === 'object') {
          ['actives', 'passives'].forEach((cat) => {
            const list = Array.isArray(parsedSkills[cat]) ? parsedSkills[cat] : [];
            list.forEach((sk, i) => {
              if (!sk) return;
              const lv = sk.lv || 1;
              const uses = sk.uses || 0;
              if (lv > 1 || uses > 0) {
                skillProg.push([cat[0], sk.id || i, lv, uses]);
              }
            });
          });
        }

        const invArr = safeParseJson(h.inventoryJson || h.inventoryItems, []);
        const compactInv = Array.isArray(invArr)
          ? invArr.filter(it => it && it.id && it.qty > 0).map(it => [it.id, it.qty])
          : [];

        const potionsObj = safeParseJson(h.potions, { hp: 2, mp: 2 });
        const hpPot = potionsObj?.hp ?? 2;
        const mpPot = potionsObj?.mp ?? 2;

        return {
          i: h.id,
          n: h.name,
          gd: h.gender === 'F' ? 'F' : 'M',
          j: h.baseJob || h.job,
          cj: h.currentJobName !== (h.baseJob || h.job) ? h.currentJobName : undefined,
          ap: Array.isArray(h.advancementPath) && h.advancementPath.length > 0 ? h.advancementPath : undefined,
          p: h.personalityId,
          al: h.alignment || 0,
          eq: eqArr.length > 0 ? eqArr : undefined,
          rb: h.rebirthCount || 0,
          tc: h.transcendCount || undefined,
          bg: h.birthGrade || undefined, // 태생 등급
          lk: h.locked ? 1 : undefined, // 🔒 잠금
          lv: h.level || 1,
          xp: h.exp || 0,
          hp: Math.round(h.hp ?? 100),
          mp: Math.round(h.mp ?? 100),
          hu: Math.round(h.hunger ?? 100),
          fa: Math.round(h.fatigue ?? 0),
          g: Math.round(h.personalGold ?? 0),
          be: h.bento || 0,
          inv: compactInv.length > 0 ? compactInv : undefined,
          po: (hpPot !== 2 || mpPot !== 2) ? [hpPot, mpPot] : undefined,
          bf: h.bestDungeonFloor || 0,
          ins: h.equippedInsigniaId || undefined,
          wg: h.equippedWingId || undefined,
          we: h.wingEnhance || 0,
          x: Math.round(h.x ?? 0),
          y: Math.round(h.y ?? 20),
          sk: skillProg.length > 0 ? skillProg : undefined
        };
      });

      const relEntries = safeParseJson(src.relationsJson, []);
      const compactRel = Array.isArray(relEntries)
        ? relEntries.map(([pairKey, rec]) => [
            pairKey,
            rec?.affinity ?? 0,
            rec?.interactions ?? 0,
            rec?.pkGrudge ?? 0
          ])
        : [];

      const out = {
        v: 2,
        t: src.savedAt || Date.now(),
        g: Math.round(src.gold ?? 2500),
        s3: src.oneTimeT3SummonUsed ? 1 : 0,
        bs: src.bossStage || 1,
        bc: src.allStagesCleared ? 1 : 0,
        pl: compactPlots,
        hu: compactHunters
      };
      if (Array.isArray(src.orcUnits) && src.orcUnits.length > 0) {
        out.oc = src.orcUnits.map((o, idx) => [
          o.id || (o.isGreatWarrior ? 'orc_great_warrior' : `orc_unit_${idx}`),
          o.level || 1,
          o.totalKillCount || ((o.killCount || 0) + (o.monsterKillCount || 0)),
          o.killCount || 0,
          o.monsterKillCount || 0,
          o.isDead ? 1 : 0,
          o.respawnRemainingMs || 0,
          Math.round(o.hp ?? 0),
          o.isGreatWarrior ? 1 : 0
        ]);
      }
      if (compactRel.length > 0) out.rl = compactRel;
      if (src.camera) {
        out.cm = [src.camera.x, src.camera.y, src.camera.userZoom];
      }
      // 토벌 포인트 · 경비병 레벨 · 결투장 기록 (예전 저장 코드에는 빠져 있던 항목)
      // 자리 비운 동안 보상용 초당 수입 [금고 골드, 측정 시간, [[헌터id, 경험치, 개인골드, 장비조각], ...]]
      if (src.offlineRates) {
        out.or = [
          src.offlineRates.goldPerSec || 0,
          src.offlineRates.measuredSec || 0,
          (src.offlineRates.hunters || []).map(hr => [hr.id, hr.expPerSec || 0, hr.goldPerSec || 0, hr.fragPerSec || 0]), // 4번째: 장비조각/초
          (src.offlineRates.orcs || []).map(orr => [orr.id, orr.killsPerSec || 0])
        ];
      }
      if (src.subjugationPoints) out.sp = src.subjugationPoints;
      if (src.userInventory && Object.keys(src.userInventory).length > 0) out.ui = src.userInventory;
      if (src.banishBonusSlots) out.bb = src.banishBonusSlots;
      if (src.rewardFlags && Object.keys(src.rewardFlags).length > 0) out.rf = src.rewardFlags;
      if (src.shopBonusSlots) out.sb = src.shopBonusSlots;
      if (src.mailbox && ((src.mailbox.claimed || []).length > 0 || (src.mailbox.personal || []).length > 0)) out.mb = src.mailbox;
      if (src.shopPurchases && Object.keys(src.shopPurchases).length > 0) out.spc = src.shopPurchases;
      if (src.villageId) out.vi = src.villageId;
      if (src.saveSeq) out.sq = src.saveSeq;
      if (src.userCode) { out.uc = src.userCode; out.ucT = src.userCodeCreatedAt || 0; }
      if (src.kingdom && ((src.kingdom.units || []).length > 0 || Object.keys(src.kingdom.sites || {}).length > 0 || (src.kingdom.cleared || []).length > 0 || (src.kingdom.clearQueue || []).length > 0 || src.kingdom.bridgeOpen)) out.kd = src.kingdom;
      if (src.guardLevels) out.gl = [src.guardLevels.supreme || 1, src.guardLevels.arcane || 1];
      if (src.colosseum) {
        const fighterArr = (f) => (f ? [f.id, f.name || '', f.displayJob || '', f.jobIcon || ''] : 0);
        out.co = {
          s: src.colosseum.season || 1,
          k: src.colosseum.lastSlotKey || 0,
          st: (src.colosseum.standings || []).map(st => [
            st.id, st.name || '', st.displayJob || '', st.jobIcon || '',
            st.points || 0, st.prizeGold || 0, st.wins || 0, st.runnerUps || 0,
            st.participations || 0, st.duelWins || 0, st.duelLosses || 0
          ]),
          h: (src.colosseum.history || []).map(r => [
            r.season, r.timestamp || '', r.triggerLabel || '', r.participantCount || 0,
            fighterArr(r.champion), fighterArr(r.runnerUp)
          ]),
          // 마지막 토너먼트 [시즌, 개막 이름, 시각, 대진 순서(출전자 번호), 경기별 주사위, 출전자 능력치]
          tn: (() => {
            const tn = src.colosseum.tournament;
            if (!tn || !Array.isArray(tn.participants) || tn.participants.length < 2) return 0;
            const idxOf = new Map(tn.participants.map((p, i) => [p.id, i]));
            return [
              tn.season || 1, tn.triggerLabel || '', tn.playedAt || 0,
              (tn.orderIds || []).map(id => idxOf.has(id) ? idxOf.get(id) : -1),
              tn.seeds || [],
              tn.participants.map(p => [
                p.seedRank, p.id, p.name, p.baseJob, p.displayJob, p.jobIcon, p.color, p.level, p.rebirthCount,
                p.maxHp, p.maxMp, p.atk, p.def, p.crit, p.speed,
                (p.activeSkills || []).map(s => [s.name, s.icon, s.powerMult, s.mpCost])
              ])
            ];
          })()
        };
      }
      return out;
    }

    function expandCompactSavePayload(c) {
      if (!c || typeof c !== 'object' || c.v !== 2) return null;
      const slotKeys = ['weapon', 'armor', 'helmet', 'accessory'];

      const plots = (Array.isArray(c.pl) ? c.pl : []).map((row, idx) => {
        if (!Array.isArray(row)) return null;
        const [id, x, y, bInfo] = row;
        let building = null;
        if (Array.isArray(bInfo) && bInfo.length >= 2) {
          const [type, level, unlockedMaxLevel, hp] = bInfo;
          building = {
            type,
            level: level || 1,
            unlockedMaxLevel: unlockedMaxLevel || level || 1,
            hp: typeof hp === 'number' ? hp : undefined
          };
        }
        return {
          id: id || `plot_c_${idx}`,
          x: typeof x === 'number' ? x : 0,
          y: typeof y === 'number' ? y : 0,
          building
        };
      }).filter(Boolean);

      const hunters = (Array.isArray(c.hu) ? c.hu : []).map((h, idx) => {
        const eqArr = Array.isArray(h.eq) ? h.eq : [];
        const equipment = {};
        slotKeys.forEach((slot, sIdx) => {
          const rawSlot = eqArr[sIdx];
          if (Array.isArray(rawSlot)) {
            equipment[slot] = { tier: rawSlot[0] || 1, enhance: rawSlot[1] || 0 };
          } else {
            equipment[slot] = { tier: rawSlot || 1, enhance: 0 };
          }
        });

        const skillsObj = { actives: [], passives: [] };
        if (Array.isArray(h.sk)) {
          h.sk.forEach((skRow) => {
            if (!Array.isArray(skRow) || skRow.length < 3) return;
            const [catCode, idOrIdx, lv, uses] = skRow;
            const cat = catCode === 'p' ? 'passives' : 'actives';
            skillsObj[cat].push({
              id: typeof idOrIdx === 'string' ? idOrIdx : undefined,
              lv: lv || 1,
              uses: uses || 0
            });
          });
        }

        const poArr = Array.isArray(h.po) ? h.po : [2, 2];
        const inventoryItems = Array.isArray(h.inv)
          ? h.inv.map(([id, qty]) => ({ id, qty })).filter(x => x.id && x.qty > 0)
          : [];

        return {
          id: h.i || `h_c_${idx}`,
          name: h.n || '모험가',
          gender: (h.gd === 'M' || h.gd === 'F') ? h.gd : undefined,
          job: h.j || '버서커',
          baseJob: h.j || '버서커',
          currentJobName: h.cj || h.j || '버서커',
          advancementPath: Array.isArray(h.ap) ? h.ap : [],
          personalityId: h.p || 'brave',
          alignment: typeof h.al === 'number' ? h.al : 0,
          equipment: JSON.stringify(equipment),
          potions: JSON.stringify({ hp: poArr[0] ?? 2, mp: poArr[1] ?? 2 }),
          rebirthCount: h.rb || 0,
          transcendCount: h.tc || 0,
          birthGrade: typeof h.bg === 'string' ? h.bg : '',
          locked: !!h.lk,
          level: h.lv || 1,
          exp: h.xp || 0,
          hp: h.hp,
          mp: h.mp,
          hunger: h.hu,
          fatigue: h.fa,
          personalGold: h.g,
          bento: h.be || 0,
          inventoryJson: JSON.stringify(inventoryItems),
          bestDungeonFloor: h.bestDungeonFloor || 0,
          equippedInsigniaId: h.equippedInsigniaId || null,
          equippedWingId: h.equippedWingId || null,
          wingEnhance: h.wingEnhance || 0,
          x: h.x,
          y: h.y,
          skillsJson: JSON.stringify(skillsObj)
        };
      });

      const relationsEntries = Array.isArray(c.rl)
        ? c.rl.map(([pairKey, affinity, interactions, pkGrudge]) => [
            pairKey,
            {
              affinity: affinity ?? 0,
              interactions: interactions ?? 0,
              pkGrudge: pkGrudge ?? 0
            }
          ])
        : [];

      const camArr = Array.isArray(c.cm) ? c.cm : null;
      const orcUnits = Array.isArray(c.oc)
        ? c.oc.map((row, idx) => {
            if (!Array.isArray(row)) return null;
            const [id, level, totalKillsOrLegacyExp, killCount, monsterKillCount, isDeadFlag, respawnMs, hp, isGwFlag] = row;
            const parsedHunterKills = killCount || 0;
            const parsedMonsterKills = monsterKillCount || 0;
            const parsedTotalKills = Math.max(
              totalKillsOrLegacyExp || 0,
              parsedHunterKills + parsedMonsterKills
            );
            return {
              id: id || (isGwFlag ? 'orc_great_warrior' : `orc_unit_${idx}`),
              level: level || 1,
              totalKillCount: parsedTotalKills,
              killCount: parsedHunterKills,
              monsterKillCount: parsedMonsterKills,
              isDead: Boolean(isDeadFlag),
              respawnRemainingMs: respawnMs || 0,
              hp: typeof hp === 'number' ? hp : undefined,
              isGreatWarrior: Boolean(isGwFlag)
            };
          }).filter(Boolean)
        : [];

      const fighterObj = (a) => (Array.isArray(a) ? { id: a[0], name: a[1], displayJob: a[2], jobIcon: a[3] } : null);
      const colosseum = (c.co && typeof c.co === 'object') ? {
        season: c.co.s || 1,
        lastSlotKey: typeof c.co.k === 'string' ? c.co.k : null,
        standings: (Array.isArray(c.co.st) ? c.co.st : []).filter(Array.isArray).map(r => ({
          id: r[0], name: r[1], displayJob: r[2], jobIcon: r[3],
          points: r[4] || 0, prizeGold: r[5] || 0, wins: r[6] || 0, runnerUps: r[7] || 0,
          participations: r[8] || 0, duelWins: r[9] || 0, duelLosses: r[10] || 0
        })),
        history: (Array.isArray(c.co.h) ? c.co.h : []).filter(Array.isArray).map(r => ({
          season: r[0], timestamp: r[1], triggerLabel: r[2], participantCount: r[3] || 0,
          champion: fighterObj(r[4]), runnerUp: fighterObj(r[5])
        })),
        tournament: (() => {
          const tn = c.co.tn;
          if (!Array.isArray(tn) || !Array.isArray(tn[5])) return null;
          const participants = tn[5].filter(Array.isArray).map(r => ({
            seedRank: r[0], id: r[1], name: r[2], baseJob: r[3], displayJob: r[4], jobIcon: r[5], color: r[6],
            level: r[7], rebirthCount: r[8], maxHp: r[9], maxMp: r[10], atk: r[11], def: r[12], crit: r[13], speed: r[14],
            activeSkills: (Array.isArray(r[15]) ? r[15] : []).filter(Array.isArray).map(s => ({ name: s[0], icon: s[1], powerMult: s[2], mpCost: s[3] }))
          }));
          return {
            season: tn[0] || 1,
            triggerLabel: tn[1] || '',
            playedAt: tn[2] || 0,
            orderIds: (Array.isArray(tn[3]) ? tn[3] : []).map(i => participants[i]?.id).filter(id => id !== undefined),
            seeds: Array.isArray(tn[4]) ? tn[4] : [],
            participants
          };
        })()
      } : null;

      return normalizeAndMigrateSaveData({
        schemaVersion: SAVE_SCHEMA_VERSION,
        savedAt: c.t || Date.now(),
        gold: c.g ?? 2500,
        subjugationPoints: Number(c.sp) || 0,
        userInventory: c.ui && typeof c.ui === 'object' ? c.ui : {},
        banishBonusSlots: Number(c.bb) || 0,
        rewardFlags: c.rf && typeof c.rf === 'object' ? c.rf : {},
        shopBonusSlots: Number(c.sb) || 0,
        mailbox: c.mb && typeof c.mb === 'object' ? c.mb : { claimed: [], personal: [] },
        shopPurchases: c.spc && typeof c.spc === 'object' ? c.spc : {},
        villageId: typeof c.vi === 'string' ? c.vi : '',
        saveSeq: Number(c.sq) || 0,
        userCode: typeof c.uc === 'string' ? c.uc : '',
        userCodeCreatedAt: Number(c.ucT) || 0,
        kingdom: c.kd && typeof c.kd === 'object' ? c.kd : null,
        guardLevels: Array.isArray(c.gl) ? { supreme: c.gl[0] || 1, arcane: c.gl[1] || 1 } : undefined,
        colosseum,
        offlineRates: Array.isArray(c.or) ? {
          goldPerSec: Number(c.or[0]) || 0,
          measuredSec: Number(c.or[1]) || 0,
          hunters: (Array.isArray(c.or[2]) ? c.or[2] : []).filter(Array.isArray).map(r => ({ id: r[0], expPerSec: Number(r[1]) || 0, goldPerSec: Number(r[2]) || 0, fragPerSec: Number(r[3]) || 0 })),
          orcs: (Array.isArray(c.or[3]) ? c.or[3] : []).filter(Array.isArray).map(r => ({ id: r[0], killsPerSec: Number(r[1]) || 0 }))
        } : null,
        oneTimeT3SummonUsed: Boolean(c.s3),
        bossStage: c.bs || 1,
        allStagesCleared: Boolean(c.bc),
        camera: camArr ? { x: camArr[0] ?? 120, y: camArr[1] ?? 0, userZoom: camArr[2] ?? 0.92 } : null,
        plots,
        hunters,
        orcUnits,
        relationsJson: JSON.stringify(relationsEntries)
      });
    }

    function bytesToBase64Url(bytes) {
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const sub = bytes.subarray(i, Math.min(bytes.length, i + chunkSize));
        binary += String.fromCharCode.apply(null, sub);
      }
      return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }

    function base64UrlToBytes(b64UrlStr) {
      const cleanedB64 = b64UrlStr.replace(/[^A-Za-z0-9\-_=]/g, '');
      if (!cleanedB64) {
        throw new Error('올바른 저장 코드 형식이 아닙니다.');
      }
      let standardB64 = cleanedB64.replace(/-/g, '+').replace(/_/g, '/');
      while (standardB64.length % 4 !== 0) {
        standardB64 += '=';
      }
      const binaryStr = atob(standardB64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return bytes;
    }

    async function compressUtf8Bytes(bytes) {
      if (typeof CompressionStream === 'function') {
        try {
          const cs = new CompressionStream('deflate-raw');
          const writer = cs.writable.getWriter();
          writer.write(bytes);
          writer.close();
          const buf = await new Response(cs.readable).arrayBuffer();
          return { bytes: new Uint8Array(buf), compressed: true };
        } catch (_) {}
      }
      return { bytes, compressed: false };
    }

    async function decompressUtf8Bytes(bytes) {
      if (typeof DecompressionStream === 'function') {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(bytes);
        writer.close();
        const buf = await new Response(ds.readable).arrayBuffer();
        return new Uint8Array(buf);
      }
      throw new Error('압축 해제 기능을 지원하지 않는 브라우저입니다.');
    }

    async function encodeSaveDataToCode(payloadObj) {
      const compact = buildCompactSavePayload(payloadObj);
      const jsonStr = JSON.stringify(compact);
      const utf8Bytes = new TextEncoder().encode(jsonStr);
      const packed = await compressUtf8Bytes(utf8Bytes);
      const encodedBody = bytesToBase64Url(packed.bytes);
      return (packed.compressed ? SAVE_CODE_COMPACT_PREFIX : SAVE_CODE_PREFIX) + encodedBody;
    }

    async function decodeSaveCodeToData(rawInput) {
      if (typeof rawInput !== 'string') {
        throw new Error('코드 문자열이 비어 있습니다.');
      }
      const trimmed = rawInput.trim();
      if (!trimmed) {
        throw new Error('불러올 저장 코드를 입력하거나 붙여넣어 주세요.');
      }

      if (trimmed.startsWith('{')) {
        const parsedJson = JSON.parse(trimmed);
        const normalizedJson = normalizeAndMigrateSaveData(parsedJson);
        if (!normalizedJson) throw new Error('유효하지 않은 저장 데이터 형식입니다.');
        return normalizedJson;
      }

      const isCompressed = trimmed.startsWith(SAVE_CODE_COMPACT_PREFIX);
      const bodyPart = isCompressed
        ? trimmed.slice(SAVE_CODE_COMPACT_PREFIX.length).trim()
        : (trimmed.startsWith(SAVE_CODE_PREFIX)
            ? trimmed.slice(SAVE_CODE_PREFIX.length).trim()
            : trimmed);

      const rawBytes = base64UrlToBytes(bodyPart);
      const jsonBytes = isCompressed ? await decompressUtf8Bytes(rawBytes) : rawBytes;
      const decodedJsonText = new TextDecoder().decode(jsonBytes);
      const parsedObj = JSON.parse(decodedJsonText);

      const normalized = parsedObj && parsedObj.v === 2
        ? expandCompactSavePayload(parsedObj)
        : normalizeAndMigrateSaveData(parsedObj);

      if (!normalized) {
        throw new Error('손상되었거나 호환되지 않는 저장 코드입니다.');
      }
      return normalized;
    }

    function setSaveCodeFeedback(text, isError = false) {
      const el = document.getElementById('saveCodeFeedbackMsg');
      if (!el) return;
      el.textContent = text || '';
      el.style.color = isError ? '#fca5a5' : '#86efac';
    }

    async function refreshSaveCodeExportBox() {
      try {
        const payload = serializeGameSaveData();
        const codeStr = await encodeSaveDataToCode(payload);
        const ta = document.getElementById('saveCodeTextarea');
        const meta = document.getElementById('saveCodeMetaBadge');
        if (ta) ta.value = codeStr;
        if (meta) {
          const modeLabel = codeStr.startsWith(SAVE_CODE_COMPACT_PREFIX) ? '압축코드' : '축약코드';
          meta.textContent = `${modeLabel} · 헌터 ${payload.hunters.length}명 · ${formatGold(payload.gold)}G · ${codeStr.length.toLocaleString()}자`;
        }
        setSaveCodeFeedback('✅ 압축·축약된 저장 코드가 생성되었습니다.');
      } catch (err) {
        setSaveCodeFeedback(`⚠️ 코드 생성 실패: ${err.message || err}`, true);
      }
    }

    function openSaveCodeModal() {
      refreshSaveCodeExportBox();
      document.getElementById('saveCodeModalBackdrop')?.classList.add('open');
    }

    function closeSaveCodeModal() {
      document.getElementById('saveCodeModalBackdrop')?.classList.remove('open');
    }

    let pendingDecodedSaveData = null;

    function openLoadCodeConfirmModal(decodedData) {
      pendingDecodedSaveData = decodedData;
      const descEl = document.getElementById('loadCodeConfirmDesc');
      if (descEl && decodedData) {
        const hunterCnt = Array.isArray(decodedData.hunters) ? decodedData.hunters.length : 0;
        const goldAmt = formatGold(decodedData.gold ?? 0);
        const stageNum = decodedData.bossStage || 1;
        descEl.innerHTML = `
          저장 코드를 불러오면 <b style="color:#fca5a5;">현재 진행 중인 마을·골드·헌터·장비 데이터가 모두 덮어씌워집니다.</b><br/>
          <div style="margin-top:6px;padding:7px 9px;background:rgba(15,23,42,0.85);border:1px solid rgba(251,191,36,0.35);border-radius:8px;font-size:11.5px;color:#fde68a;">
            📦 불러올 데이터: <b>헌터 ${hunterCnt}명 · ${goldAmt} G · 보스 ${stageNum}단계</b>
          </div>
          <div style="margin-top:6px;font-size:11.5px;color:#fde047;">정말 현재 진행 상황을 덮어쓰고 불러오시겠습니까?</div>
        `;
      }
      document.getElementById('loadCodeConfirmBackdrop')?.classList.add('open');
    }

    function closeLoadCodeConfirmModal() {
      pendingDecodedSaveData = null;
      document.getElementById('loadCodeConfirmBackdrop')?.classList.remove('open');
    }

    function clearSaveCodeModalState() {
      const ta = document.getElementById('saveCodeTextarea');
      const meta = document.getElementById('saveCodeMetaBadge');
      const fileInput = document.getElementById('saveCodeFileInput');
      if (ta) ta.value = '';
      if (meta) meta.textContent = '준비 중...';
      if (fileInput) fileInput.value = '';
      setSaveCodeFeedback('');
      closeLoadCodeConfirmModal();
      closeSaveCodeModal();
    }

    async function applySaveCodeString(rawCode) {
      const normalized = await decodeSaveCodeToData(rawCode);
      openLoadCodeConfirmModal(normalized);
    }

    function commitPendingSaveCodeLoad() {
      if (!pendingDecodedSaveData) return;
      const normalized = pendingDecodedSaveData;
      closeLoadCodeConfirmModal();
      applyLoadedSaveData(normalized);
      writeLocalSaveMirrors(serializeGameSaveData());
      if (document.getElementById('hunterRosterBackdrop')?.classList.contains('open')) {
        renderHunterRosterModal(true);
      }
      closeSaveCodeModal();
      showToast(`📥 저장 코드를 불러왔습니다! (헌터 ${hunters.length}명 · ${formatGold(gameState.gold)}G)`);
    }

    (function bindSaveCodeModalControls() {
      document.getElementById('btnCloseSaveCodeModal')?.addEventListener('click', closeSaveCodeModal);
      document.getElementById('btnCancelSaveCodeAction')?.addEventListener('click', closeSaveCodeModal);
      document.getElementById('saveCodeModalBackdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'saveCodeModalBackdrop') closeSaveCodeModal();
      });
      document.getElementById('btnCloseLoadCodeConfirmModal')?.addEventListener('click', closeLoadCodeConfirmModal);
      document.getElementById('btnCancelLoadCodeConfirm')?.addEventListener('click', closeLoadCodeConfirmModal);
      document.getElementById('loadCodeConfirmBackdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'loadCodeConfirmBackdrop') closeLoadCodeConfirmModal();
      });
      document.getElementById('btnConfirmLoadCodeAction')?.addEventListener('click', commitPendingSaveCodeLoad);

      document.getElementById('btnGenerateSaveCode')?.addEventListener('click', async () => {
        await saveProgressToStorage(false);
        await refreshSaveCodeExportBox();
      });

      document.getElementById('btnCopySaveCode')?.addEventListener('click', async () => {
        try {
          const ta = document.getElementById('saveCodeTextarea');
          if (!ta) return;
          if (!ta.value.trim()) {
            await refreshSaveCodeExportBox();
          }
          ta.focus();
          ta.select();
          ta.setSelectionRange(0, ta.value.length);
          let copied = false;
          try {
            copied = document.execCommand('copy');
          } catch (_) {
            copied = false;
          }
          if (copied) {
            setSaveCodeFeedback('📋 저장 코드가 클립보드에 복사되었습니다!');
            showToast('📋 저장 코드가 클립보드에 복사되었습니다!');
          } else {
            setSaveCodeFeedback('ℹ️ 코드가 선택되었습니다. 길게 누르거나 Ctrl+C / Cmd+C로 복사해 주세요.');
          }
        } catch (_) {
          setSaveCodeFeedback('⚠️ 코드 복사 중 문제가 발생했습니다. 텍스트를 직접 선택해 복사해 주세요.', true);
        }
      });

      document.getElementById('btnDownloadSaveFile')?.addEventListener('click', async () => {
        try {
          const ta = document.getElementById('saveCodeTextarea');
          const codeStr = (ta && ta.value.trim()) ? ta.value.trim() : await encodeSaveDataToCode(serializeGameSaveData());
          const blob = new Blob([codeStr], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
          a.href = url;
          a.download = `adventurer-village-save-${stamp}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setSaveCodeFeedback('⬇️ 저장 코드 파일(.txt) 다운로드를 시작했습니다.');
          showToast('⬇️ 저장 코드 파일이 다운로드되었습니다!');
        } catch (err) {
          setSaveCodeFeedback(`⚠️ 파일 저장 실패: ${err.message || err}`, true);
        }
      });

      document.getElementById('saveCodeFileInput')?.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const text = typeof reader.result === 'string' ? reader.result : '';
            const ta = document.getElementById('saveCodeTextarea');
            if (ta) ta.value = text.trim();
            await applySaveCodeString(text);
          } catch (err) {
            setSaveCodeFeedback(`⚠️ 파일 불러오기 실패: ${err.message || err}`, true);
          } finally {
            e.target.value = '';
          }
        };
        reader.onerror = () => {
          setSaveCodeFeedback('⚠️ 저장 파일을 읽는 중 오류가 발생했습니다.', true);
          e.target.value = '';
        };
        reader.readAsText(file, 'utf-8');
      });

      document.getElementById('btnLoadSaveCodeAction')?.addEventListener('click', async () => {
        try {
          const ta = document.getElementById('saveCodeTextarea');
          await applySaveCodeString(ta ? ta.value : '');
        } catch (err) {
          setSaveCodeFeedback(`⚠️ 불러오기 실패: ${err.message || err}`, true);
        }
      });
    })();

    async function resetAllGameProgress() {
      if (isResettingProgress) return;
      isResettingProgress = true;
      isStorageReady = false;
      clearTimeout(debouncedSaveTimer);

      try {
        try {
          localStorage.removeItem(PERSISTENT_MASTER_KEY);
          LEGACY_SAVE_KEYS.forEach(k => localStorage.removeItem(k));
        } catch (_) {}
        clearWindowNameBackup();
        clearIndexedDBBackup();

        if (db && currentUser && firestoreDoc) {
          try {
            const [fsMod] = await Promise.all([
              import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js")
            ]);
            if (typeof fsMod.deleteDoc === 'function') {
              const saveRef = firestoreDoc(db, 'artifacts', appId, 'users', currentUser.uid, 'villageSaves', 'mainSlot');
              await fsMod.deleteDoc(saveRef);
            }
          } catch (_) {}
        }

        gameState.gold = 2500;
        gameState.subjugationPoints = 0;
        gameState.userInventory = {};
        gameState.banishBonusSlots = 0;
        gameState.rewardFlags = {};
        // 새 마을: 새 마을 번호 (예전 마을 기록은 이 기기에 남아 예전 저장으로 되돌리기를 막음)
        gameState.shopBonusSlots = 0;
        gameState.mailbox = { claimed: [], personal: [] };
        gameState.shopPurchases = {};
        gameState.villageId = '';
        gameState.saveSeq = 0;
        gameState.kingdom = { units: [], sites: {} };
        gameState.selectedPlotId = null;
        gameState.selectedHunterId = null;
        gameState.selectedEquipSlot = null;
        gameState.followSelectedHunter = false;
        gameState.activeHunterTab = 'overview';
        gameState.oneTimeT3SummonUsed = false;
        gameState.powerSavingMode = false;
        document.getElementById('powerSavingOverlay')?.classList.remove('active');
        const psBtn = document.getElementById('btnTogglePowerSaving');
        if (psBtn) {
          psBtn.classList.remove('active');
          psBtn.textContent = '🌙 절전';
        }
        const summonBtnEl = document.getElementById('btnSummonOneTimeT3Hunter');
        if (summonBtnEl) {
          summonBtnEl.style.display = '';
          summonBtnEl.disabled = false;
          summonBtnEl.textContent = '✨ 1회 한정 3T·Lv.1 소환';
        }

        BOSS_SANCTUM.status = 'CLOSED';
        BOSS_SANCTUM.prepTimer = 0;
        BOSS_SANCTUM.raidTimer = 0;
        BOSS_SANCTUM.bossStage = 1;
        BOSS_SANCTUM.allStagesCleared = false;
        BOSS_SANCTUM.fallenHunterIds.clear();
        ORC_SUBJUGATION.status = 'CLOSED';
        ORC_SUBJUGATION.prepTimer = 0;
        ORC_SUBJUGATION.fallenHunterIds.clear();
        ORC_SUBJUGATION.sessionScore = 0;
        SUPREME_TOWN_GUARD.level = 1;
        ARCANE_TOWN_GUARD.level = 1;
        getTownGuardsList().forEach(e => syncTownGuardStats(e, true));
        resetBossSanctumMonster();
        const defaultOrcHomeSlots = [
          { x: 2615, y: -20 },
          { x: 2370, y: -120 },
          { x: 2390, y: 135 },
          { x: 2780, y: -150 },
          { x: 2810, y: 145 }
        ];
        ORC_STRONGHOLD_ZONE.orcs.forEach((o, i) => {
          const slot = defaultOrcHomeSlots[i] || {
            x: 2615 + ((i % 3) - 1) * 140,
            y: (i % 2 === 0 ? -110 : 120)
          };
          if (o.role === '군락지 지배자' || o.name === '오크 대장' || o.name === '오크 철혈대족장') {
            o.name = '오크 로드';
          }
          o.level = 1;
          o.killCount = 0;
          o.monsterKillCount = 0;
          o.totalKillCount = 0;
          o.isDead = false;
          o.respawnRemainingMs = 0;
          o.aiMode = 'GUARD';
          o.fullHealReadyTimer = 0;
          o.sortieTimer = 3 + (i % 7) * 2.4;
          o.homeX = slot.x;
          o.homeY = slot.y;
          o.x = slot.x;
          o.y = slot.y;
          o.facing = -1;
          ensureOrcUnitFields(o, i);
          o.hp = o.maxHp;
        });
        syncOrcStrongholdPopulation();
        resetRebirthAltarBoss(true);

        if (typeof COLOSSEUM_STATE !== 'undefined') {
          COLOSSEUM_STATE.season = 1;
          COLOSSEUM_STATE.participants = [];
          COLOSSEUM_STATE.rounds = [];
          COLOSSEUM_STATE.champion = null;
          COLOSSEUM_STATE.runnerUp = null;
          COLOSSEUM_STATE.history = [];
          COLOSSEUM_STATE.standings?.clear?.();
          COLOSSEUM_STATE.selectedMatchId = null;
          COLOSSEUM_STATE.spectatorMatchId = null;
          COLOSSEUM_STATE.playback = null;
        }

        interactionManager.relations.clear();
        interactionManager.pairCooldowns.clear();
        interactionManager.activeBubbles.length = 0;
        combatEffects.projectiles.length = 0;
        combatEffects.slashes.length = 0;
        combatEffects.popups.length = 0;

        village.plots.length = 0;
        DEFAULT_PLOT_BLUEPRINTS.forEach(bp => {
          village.addPlot(bp.id, bp.x, bp.y, bp.type, bp.level);
        });

        hunters.length = 0;
        createInitialRandomHunters(2).forEach(h => hunters.push(h));

        closeBuildingPanel();
        closeHunterPanel();
        closeMonsterPopup();
        closeRenameHunterModal();
        closeDemolishConfirmModal();
        closeRosterDonateModal();
        closeBanishConfirmModal();
        clearSaveCodeModalState();
        document.getElementById('hunterRosterBackdrop')?.classList.remove('open');
        document.getElementById('guardRosterBackdrop')?.classList.remove('open');
        document.getElementById('colosseumModalBackdrop')?.classList.remove('open');
        document.getElementById('helpModalBackdrop')?.classList.remove('open');
        document.getElementById('resetConfirmBackdrop')?.classList.remove('open');
        camera.reset();
        updateResourceHUD();
        updateBossRaidHudButton();

        isStorageReady = true;
        isResettingProgress = false;
        writeLocalSaveMirrors(serializeGameSaveData());
        showToast('🔄 마을과 헌터 데이터가 초기화되었습니다!');
      } catch (err) {
        console.error('Reset error:', err);
        isStorageReady = true;
        isResettingProgress = false;
        showToast('⚠️ 초기화 중 오류가 발생해 기본 상태로 복구했습니다.');
      }
    }

    document.getElementById('btnResetProgress')?.addEventListener('click', () => {
      if (isResettingProgress) return;
      document.getElementById('resetConfirmBackdrop')?.classList.add('open');
    });
    document.getElementById('btnCancelResetModal')?.addEventListener('click', () => {
      document.getElementById('resetConfirmBackdrop')?.classList.remove('open');
    });
    document.getElementById('btnCancelResetAction')?.addEventListener('click', () => {
      document.getElementById('resetConfirmBackdrop')?.classList.remove('open');
    });
    document.getElementById('resetConfirmBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'resetConfirmBackdrop') {
        e.currentTarget.classList.remove('open');
      }
    });
    document.getElementById('btnConfirmResetAction')?.addEventListener('click', () => {
      resetAllGameProgress();
    });
