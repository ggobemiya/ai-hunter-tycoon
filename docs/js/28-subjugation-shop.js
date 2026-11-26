// [28-subjugation-shop] 🎖️ 토벌 포인트 상점
    // ============================================================================
    // - 상단 🎖️ 토벌 포인트 칩을 누르면 열린다. 오크 토벌로 모은 토벌 포인트로 산다.
    // - 산 물건은 🎒 인벤토리(25-user-inventory.js)로 들어가고, 정원 +1은 바로 적용된다.
    // - 구매 한도(하루 · 주간)는 저장 데이터와 이 기기 기록 둘 다에 남기고 더 큰 쪽을 쓴다.
    //   → 예전 저장을 불러와도 이미 산 횟수는 되돌아오지 않는다 (상점 리세 방지).
    //   (예전 저장 코드 불러오기 자체는 27-reroll-guard.js가 막는다)
    // - 하루: 기기 시간 기준 자정에 초기화 · 주간: 월요일 0시에 초기화
    // - 가격은 아래 SUBJ_SHOP_ITEMS의 price만 바꾸면 된다. (임시 가격)
    // ============================================================================
    const SUBJ_SHOP_ITEMS = [
      {
        id: 'rebirth5_summon',
        give: { itemId: 'rebirth5_summon_ticket', qty: 1 },
        price: 500,
        limit: { period: 'week', count: 5 }
      },
      {
        id: 'transcend',
        give: { itemId: 'transcend_ticket', qty: 1 },
        price: 700,
        limit: { period: 'week', count: 3 }
      },
      { id: 'equip_set_t8', give: { itemId: 'equip_set_t8', qty: 1 }, price: 100, limit: null },
      { id: 'equip_set_t9', give: { itemId: 'equip_set_t9', qty: 1 }, price: 200, limit: null },
      { id: 'equip_set_t10', give: { itemId: 'equip_set_t10', qty: 1 }, price: 350, limit: null },
      {
        id: 'capacity_plus',
        name: '헌터 최대 인원 +1',
        icon: '🏠',
        desc: '사는 즉시 헌터 최대 인원이 1명 늘어납니다. 토벌 포인트로 늘릴 수 있는 인원은 최대 +100명입니다.',
        price: 1000,
        limit: { period: 'week', count: 5 },
        totalCap: () => ({ now: Math.floor(Number(gameState.shopBonusSlots) || 0), max: 100 }),
        apply: () => {
          gameState.shopBonusSlots = Math.min(100, Math.floor(Number(gameState.shopBonusSlots) || 0) + 1);
          updateResourceHUD();
        }
      },
      // 👑 황실 근위병 · 황실 근위대장: 상점에 미리 보여 주기만 함 (comingSoon → 구매 불가 · 가격 미정)
      {
        id: 'royal_guard',
        name: '황실 근위병',
        img: 'assets/royal_guard/guard_m.png',
        desc: '황실을 지키는 창병. 곧 추가될 예정입니다.',
        price: null,
        limit: null,
        comingSoon: true,
        // 잠금을 풀 때: comingSoon 지우고 price 정하기 → 사면 바로 왕국 병력으로 합류 (js/34-kingdom.js)
        apply: () => recruitKingdomUnit('guard')
      },
      {
        id: 'royal_guard_captain',
        name: '황실 근위대장',
        img: 'assets/royal_guard/guard_captain_m.png',
        desc: '황실 근위병을 이끄는 대장. 곧 추가될 예정입니다.',
        price: null,
        limit: null,
        comingSoon: true,
        apply: () => recruitKingdomUnit('captain')
      }
    ];

    // ---------- 인벤토리 아이템: 환생5 헌터 소환권 & EX 등급 5환생 소환권(우편 전용) ----------
    registerUserItem({
      id: 'rebirth5_summon_ticket',
      name: '환생5 헌터 소환권',
      icon: '📜',
      desc: '5환생을 마친 Lv.1 헌터 1명을 소환합니다. 직업 · 5차 전직 · 성격은 무작위이며, 전 부위 T4 +0 장비를 착용합니다. 헌터 최대 인원에 자리가 있어야 합니다.',
      howToGet: '🎖️ 토벌 포인트 상점 (주 5개)',
      onUse: () => summonRebirth5HunterWithTicket()
    });

    registerUserItem({
      id: 'rebirth5_ex_summon_ticket',
      name: 'EX 등급 5환생 소환권',
      icon: '🌟',
      desc: 'EX 등급(능력치 +45%)의 5환생 Lv.1 헌터 1명을 소환합니다. 직업 · 5차 전직 · 성격은 무작위이며, 전 부위 T4 +0 장비를 착용합니다. 헌터 최대 인원에 자리가 있어야 합니다.',
      howToGet: '📮 운영자 우편 · 이벤트 보상 전용',
      onUse: () => summonRebirth5HunterWithTicket({ itemId: 'rebirth5_ex_summon_ticket', birthGrade: 'EX' })
    });

    function summonRebirth5HunterWithTicket(opts = {}) {
      const ticketId = opts?.itemId || 'rebirth5_summon_ticket';
      const fixedGrade = opts?.birthGrade || null;
      const maxCap = getMaxHunterCapacity();
      if (hunters.length >= maxCap) {
        showToast(`⚠️ 헌터 최대 인원(${maxCap}명)이 가득 찼습니다!`);
        return false;
      }
      if (!consumeUserItem(ticketId, 1)) return false;

      const archetype = JOB_ARCHETYPES[Math.floor(Math.random() * JOB_ARCHETYPES.length)];
      const advPath = [];
      let curNodeId = null;
      for (let tier = 1; tier <= LEVEL_REBIRTH_CONFIG.maxRebirths; tier++) {
        let choices;
        if (tier === 1) {
          choices = JOB_ADVANCEMENT_TREE[archetype.job]?.tiers?.[0] || [];
        } else {
          const prevNode = curNodeId ? JOB_ADVANCEMENT_NODES_BY_ID[curNodeId] : null;
          choices = prevNode && prevNode.childrenIds?.length > 0
            ? prevNode.childrenIds.map(id => JOB_ADVANCEMENT_NODES_BY_ID[id]).filter(Boolean)
            : (JOB_ADVANCEMENT_TREE[archetype.job]?.tiers?.[tier - 1] || []);
        }
        const picked = choices[Math.floor(Math.random() * choices.length)] || null;
        if (picked) {
          advPath.push(picked.id);
          curNodeId = picked.id;
        }
      }
      const finalNode = curNodeId ? JOB_ADVANCEMENT_NODES_BY_ID[curNodeId] : null;
      const rb = LEVEL_REBIRTH_CONFIG.maxRebirths;
      const h = new Hunter(
        `h_rb5_${Date.now()}_${Math.floor(Math.random() * 999)}`,
        {
          ...archetype,
          name: generateRandomHunterName(hunters),
          baseJob: archetype.job,
          job: archetype.job,
          currentJobName: finalNode ? finalNode.name : archetype.job,
          advancementPath: advPath,
          advancementTier: advPath.length,
          level: 1,
          rebirthCount: rb,
          ...(fixedGrade ? { birthGrade: fixedGrade } : {}),
          personalGold: 300,
          bento: getMaxBentoCapacity(1, rb),
          potions: { hp: getMaxHpPotionCapacity(1, rb), mp: getMaxMpPotionCapacity(1, rb) },
          equipment: {
            weapon: { tier: 4, enhance: 0 },
            armor: { tier: 4, enhance: 0 },
            helmet: { tier: 4, enhance: 0 },
            accessory: { tier: 4, enhance: 0 }
          }
        },
        (Math.random() - 0.5) * 60,
        22 + (Math.random() - 0.5) * 20
      );
      h.pickNextDestination();
      hunters.push(h);
      updateResourceHUD();
      if (document.getElementById('hunterRosterBackdrop')?.classList.contains('open')) renderHunterRosterModal(true);
      if (fixedGrade && typeof h.recalculateVitals === 'function') h.recalculateVitals(true);
      const gradeTag = fixedGrade ? `[${fixedGrade}] ` : '';
      interactionManager.spawnBubble(h, `${fixedGrade ? '🌟' : '📜'} ${gradeTag}5환생 ${h.currentJobName} 소환!`, '#fde047');
      showToast(`${fixedGrade ? '🌟' : '📜'} ${gradeTag}5환생 [${h.currentJobName}] '${h.name}' 헌터 소환! (${hunters.length} / ${getMaxHunterCapacity()}명)`);
      document.getElementById('userInventoryBackdrop')?.classList.remove('open');
      if (typeof camera !== 'undefined') { camera.targetX = h.x; camera.targetY = h.y; }
      if (typeof openHunterPanel === 'function') openHunterPanel(h);
      if (typeof flushSyncBackup === 'function') flushSyncBackup();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
      return true;
    }

    // ---------- 인벤토리 아이템: T8 / T9 / T10 장비 세트 교환권 ----------
    const EQUIP_SET_SLOTS = ['weapon', 'armor', 'helmet', 'accessory'];
    [8, 9, 10].forEach((tier) => {
      registerUserItem({
        id: `equip_set_t${tier}`,
        name: `T${tier} 장비 세트 교환권`,
        icon: tier === 10 ? '👑' : (tier === 9 ? '🌀' : '✨'),
        desc: `원하는 헌터 1명의 무기 · 방어구 · 투구 · 장신구를 T${tier} 장비로 바꿉니다. T${tier}보다 낮은 부위만 바뀌고(+0강, 대장간 승급과 같음), 이미 T${tier} 이상인 부위는 그대로입니다.`,
        howToGet: '🎖️ 토벌 포인트 상점',
        onUse: () => openShopHunterPicker({
          title: `T${tier} 장비 세트 교환권 · 헌터 고르기`,
          note: `T${tier}보다 낮은 부위가 T${tier} +0강으로 바뀝니다.`,
          canPick: (h) => EQUIP_SET_SLOTS.some(s => (h.equipment?.[s]?.tier || 1) < tier),
          rowInfo: (h) => `무T${h.equipment.weapon.tier} · 갑T${h.equipment.armor.tier} · 투T${h.equipment.helmet.tier} · 장T${h.equipment.accessory.tier}`,
          blockedText: '이미 모두 T' + tier + ' 이상',
          buttonText: `T${tier}로 교체`,
          onPick: (h) => applyEquipSetTicket(h, tier)
        })
      });
    });

    function applyEquipSetTicket(h, tier) {
      if (!h) return false;
      const lower = EQUIP_SET_SLOTS.filter(s => (h.equipment?.[s]?.tier || 1) < tier);
      if (lower.length === 0) {
        showToast(`⚠️ '${h.name}' 헌터는 이미 모든 부위가 T${tier} 이상입니다.`);
        return false;
      }
      if (!consumeUserItem(`equip_set_t${tier}`, 1)) {
        showToast('⚠️ 교환권이 없습니다.');
        return false;
      }
      lower.forEach((s) => {
        h.equipment[s].tier = tier;
        h.equipment[s].enhance = 0;
      });
      h.recalculateVitals(false);
      interactionManager.spawnBubble(h, `✨ T${tier} 장비 세트 착용!`, '#fde047');
      showToast(`✨ '${h.name}' 헌터 ${lower.length}부위를 T${tier} 장비로 교체했습니다!`);
      if (gameState.selectedHunterId === h.id && typeof refreshHunterPanel === 'function') refreshHunterPanel();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
      return true;
    }

    // ---------- 헌터 고르기 창 (교환권용) ----------
    let shopPickerCfg = null;

    function ensureShopHunterPicker() {
      if (document.getElementById('shopHunterPickBackdrop')) return;
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div class="tier-modal-backdrop" id="shopHunterPickBackdrop" style="z-index:46;">
          <div class="tier-modal" style="width:min(95vw,520px);">
            <div class="panel-header">
              <div class="panel-title"><span>🎯</span><span id="shopHunterPickTitle">헌터 고르기</span></div>
              <button class="btn-close" id="btnCloseShopHunterPick">✕</button>
            </div>
            <div class="tier-modal-body" id="shopHunterPickBody"></div>
          </div>
        </div>
      `;
      document.body.appendChild(wrap.firstElementChild);
      const bd = document.getElementById('shopHunterPickBackdrop');
      document.getElementById('btnCloseShopHunterPick').addEventListener('click', () => bd.classList.remove('open'));
      bd.addEventListener('click', (e) => { if (e.target === bd) bd.classList.remove('open'); });
      document.getElementById('shopHunterPickBody').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-shop-pick]');
        if (!btn || !shopPickerCfg) return;
        const h = hunters.find(item => item.id === btn.getAttribute('data-shop-pick'));
        if (h && shopPickerCfg.onPick(h)) bd.classList.remove('open');
      });
    }

    function openShopHunterPicker(cfg) {
      ensureShopHunterPicker();
      shopPickerCfg = cfg;
      document.getElementById('shopHunterPickTitle').textContent = cfg.title;
      const list = [...hunters].sort((a, b) => (b.rebirthCount - a.rebirthCount) || (b.level - a.level));
      const rows = list.map((h) => {
        const ok = cfg.canPick(h);
        return `
          <div class="transcend-pick-row">
            <div>
              <div style="font-weight:800;">${h.name} <span style="color:#94a3b8;font-weight:600;">${h.currentJobName || h.job} · Lv.${h.level}${h.rebirthCount ? ` · ${h.rebirthCount}환생` : ''}</span></div>
              <div style="font-size:11px;color:#fde68a;">${cfg.rowInfo(h)}</div>
            </div>
            ${ok
              ? `<button type="button" class="btn-roster-transcend" data-shop-pick="${h.id}">${cfg.buttonText}</button>`
              : `<span style="font-size:11px;color:#94a3b8;">${cfg.blockedText}</span>`}
          </div>
        `;
      }).join('');
      document.getElementById('shopHunterPickBody').innerHTML = `
        <div style="font-size:12px;color:#cbd5e1;">${cfg.note}</div>
        <div class="transcend-pick-list">${rows || '<div style="color:#94a3b8;font-size:12px;">헌터가 없습니다.</div>'}</div>
      `;
      document.getElementById('shopHunterPickBackdrop').classList.add('open');
    }

    // ---------- 구매 한도 (상점 리세 방지) ----------
    const SHOP_LEDGER_KEY = 'aiht_shop_ledger_v1';

    function shopDateKey(d = new Date()) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    function shopPeriodKey(period) {
      const now = new Date();
      if (period === 'week') {
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dow = (monday.getDay() + 6) % 7; // 월=0 … 일=6
        monday.setDate(monday.getDate() - dow);
        return `W${shopDateKey(monday)}`;
      }
      return `D${shopDateKey(now)}`;
    }

    function readShopLedger() {
      try {
        const raw = JSON.parse(localStorage.getItem(SHOP_LEDGER_KEY) || '{}');
        return raw && typeof raw === 'object' ? raw : {};
      } catch (_) {
        return {};
      }
    }

    function writeShopLedger(ledger) {
      try { localStorage.setItem(SHOP_LEDGER_KEY, JSON.stringify(ledger)); } catch (_) {}
    }

    function shopVillageKey() {
      return typeof getRerollGuardVillageId === 'function' ? getRerollGuardVillageId() : 'default';
    }

    // 이번 기간에 산 횟수: 저장 데이터와 이 기기 기록 중 큰 쪽
    function getShopBoughtCount(item) {
      if (!item.limit) return 0;
      const pk = shopPeriodKey(item.limit.period);
      const fromSave = gameState.shopPurchases?.[item.id];
      const saveCount = fromSave && fromSave.period === pk ? Math.floor(Number(fromSave.count) || 0) : 0;
      const dev = readShopLedger()[shopVillageKey()]?.[item.id];
      const devCount = dev && dev.period === pk ? Math.floor(Number(dev.count) || 0) : 0;
      return Math.max(saveCount, devCount);
    }

    function recordShopPurchase(item) {
      if (!item.limit) return;
      const pk = shopPeriodKey(item.limit.period);
      const next = getShopBoughtCount(item) + 1;
      if (!gameState.shopPurchases || typeof gameState.shopPurchases !== 'object') gameState.shopPurchases = {};
      gameState.shopPurchases[item.id] = { period: pk, count: next };
      const ledger = readShopLedger();
      const vk = shopVillageKey();
      ledger[vk] = ledger[vk] || {};
      ledger[vk][item.id] = { period: pk, count: next };
      writeShopLedger(ledger);
    }

    function getShopItemView(item) {
      const def = item.give ? USER_ITEM_CATALOG[item.give.itemId] : null;
      return {
        name: item.name || def?.name || item.id,
        icon: item.icon || def?.icon || '🎁',
        desc: item.desc || def?.desc || ''
      };
    }

    function getShopBlockReason(item) {
      if (item.comingSoon) return '준비 중';
      const pts = Math.floor(Number(gameState.subjugationPoints) || 0);
      if (item.limit && getShopBoughtCount(item) >= item.limit.count) {
        return item.limit.period === 'day' ? '오늘 한도 소진' : '이번 주 한도 소진';
      }
      if (item.totalCap) {
        const c = item.totalCap();
        if (c.now >= c.max) return `최대 +${c.max} 달성`;
      }
      if (pts < item.price) return '포인트 부족';
      return '';
    }

    function buyShopItem(itemId) {
      const item = SUBJ_SHOP_ITEMS.find(it => it.id === itemId);
      if (!item) return false;
      const reason = getShopBlockReason(item);
      if (reason) {
        showToast(`⚠️ ${reason}`);
        return false;
      }
      gameState.subjugationPoints = Math.floor(Number(gameState.subjugationPoints) || 0) - item.price;
      recordShopPurchase(item);
      const view = getShopItemView(item);
      if (item.give) addUserItem(item.give.itemId, item.give.qty || 1);
      if (typeof item.apply === 'function') item.apply();
      updateResourceHUD();
      showToast(`🎖️ ${view.icon} ${view.name} 구매! (-${item.price.toLocaleString()} P)${item.give ? ' · 🎒 인벤토리로 들어갔습니다' : ''}`);
      // 구매는 바로 저장 (새로고침으로 되돌리기 방지)
      if (typeof flushSyncBackup === 'function') flushSyncBackup();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
      renderSubjugationShop();
      return true;
    }

    // ---------- 상점 창 ----------
    function ensureSubjugationShopModal() {
      if (document.getElementById('subjShopBackdrop')) return;
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div class="tier-modal-backdrop" id="subjShopBackdrop" style="z-index:44;">
          <div class="tier-modal" style="width:min(95vw,620px);">
            <div class="panel-header">
              <div class="panel-title"><span>🎖️</span><span>토벌 포인트 상점</span></div>
              <button class="btn-close" id="btnCloseSubjShop">✕</button>
            </div>
            <div class="tier-modal-body" id="subjShopBody"></div>
          </div>
        </div>
      `;
      document.body.appendChild(wrap.firstElementChild);
      const bd = document.getElementById('subjShopBackdrop');
      document.getElementById('btnCloseSubjShop').addEventListener('click', () => bd.classList.remove('open'));
      bd.addEventListener('click', (e) => { if (e.target === bd) bd.classList.remove('open'); });
      document.getElementById('subjShopBody').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-shop-buy]');
        if (btn) buyShopItem(btn.getAttribute('data-shop-buy'));
        if (e.target.closest('#btnShopOpenInventory') && typeof openUserInventory === 'function') openUserInventory();
      });
    }

    function renderSubjugationShop() {
      const body = document.getElementById('subjShopBody');
      if (!body) return;
      const pts = Math.floor(Number(gameState.subjugationPoints) || 0);
      const cards = SUBJ_SHOP_ITEMS.map((item) => {
        const view = getShopItemView(item);
        const reason = getShopBlockReason(item);
        const limitText = item.limit
          ? `${item.limit.period === 'day' ? '오늘' : '이번 주'} ${getShopBoughtCount(item)} / ${item.limit.count}`
          : (item.comingSoon ? '🔒 구매 불가' : '한도 없음');
        const capText = item.totalCap ? ` · 누적 +${item.totalCap().now} / +${item.totalCap().max}` : '';
        return `
          <div class="shop-card${item.comingSoon ? ' coming-soon' : ''}">
            <div class="shop-card-icon">${item.img ? `<img src="${item.img}" alt="" draggable="false">` : view.icon}</div>
            <div class="shop-card-main">
              <div class="shop-card-name">${view.name}</div>
              <div class="shop-card-desc">${view.desc}</div>
              <div class="shop-card-limit">${limitText}${capText}</div>
            </div>
            <div class="shop-card-buy">
              <div class="shop-card-price">${item.price != null ? `${item.price.toLocaleString()} P` : '가격 미정'}</div>
              <button type="button" class="btn-upgrade" data-shop-buy="${item.id}" ${reason ? 'disabled' : ''}>${reason || '구매'}</button>
            </div>
          </div>
        `;
      }).join('');
      body.innerHTML = `
        <div class="shop-head">
          <span>보유 토벌 포인트 <b style="color:#fde047;">${pts.toLocaleString()} P</b></span>
          <button type="button" class="dock-btn" id="btnShopOpenInventory" style="padding:5px 10px;font-size:11.5px;">🎒 인벤토리</button>
        </div>
        <div style="font-size:11px;color:#94a3b8;margin:4px 0 8px;">오크 토벌에서 포인트를 얻습니다 (일반 오크 1P · 대전사 10P · 오크 로드 20P). 하루 한도는 자정, 주간 한도는 월요일 0시에 초기화됩니다. 저장을 다시 불러와도 산 횟수는 되돌아오지 않습니다.</div>
        <div class="shop-list">${cards}</div>
      `;
    }

    function openSubjugationShop() {
      ensureSubjugationShopModal();
      renderSubjugationShop();
      document.getElementById('subjShopBackdrop').classList.add('open');
    }

    document.getElementById('btnOpenSubjugationShop')?.addEventListener('click', openSubjugationShop);

    // 포인트 · 인벤토리가 바뀌면 열려 있는 상점도 맞춘다
    onUserInventoryChange(() => {
      if (document.getElementById('subjShopBackdrop')?.classList.contains('open')) renderSubjugationShop();
    });
