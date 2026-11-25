// [25-user-inventory] 🎒 유저(마을 주인) 인벤토리
    // ============================================================================
    // - 마을 주인이 가진 아이템: gameState.userInventory = { 아이템ID: 개수 }
    //   (저장: 18-save-system.js userInventory · 저장 코드: 19-save-code-reset.js 'ui')
    // - 하단 🎒 인벤토리 버튼으로 열고, 아이템을 골라 [사용]을 누른다.
    // - 새 아이템(티켓 등)은 다른 파일에서 registerUserItem()으로 등록한다.
    //     registerUserItem({
    //       id, name, icon, desc, howToGet,
    //       onUse: () => { ... }        // 있으면 [사용] 버튼이 보인다
    //     })
    // - 아이템 수가 바뀌면 onUserInventoryChange()로 등록한 함수들이 불린다.
    // ============================================================================
    const USER_ITEM_CATALOG = {};
    const USER_INV_SLOT_COUNT = 20;
    const userInventoryChangeListeners = [];
    let selectedUserItemId = null;

    function registerUserItem(def) {
      if (!def || !def.id) return;
      USER_ITEM_CATALOG[def.id] = { usable: typeof def.onUse === 'function', ...def };
    }

    function onUserInventoryChange(fn) {
      if (typeof fn === 'function') userInventoryChangeListeners.push(fn);
    }

    function getUserInventory() {
      if (!gameState.userInventory || typeof gameState.userInventory !== 'object') gameState.userInventory = {};
      return gameState.userInventory;
    }

    function getUserItemCount(itemId) {
      return Math.max(0, Math.floor(Number(getUserInventory()[itemId]) || 0));
    }

    function addUserItem(itemId, qty = 1) {
      const inv = getUserInventory();
      inv[itemId] = getUserItemCount(itemId) + Math.max(0, Math.floor(qty));
      refreshUserInventoryViews();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
    }

    function consumeUserItem(itemId, qty = 1) {
      const have = getUserItemCount(itemId);
      if (have < qty) return false;
      const inv = getUserInventory();
      if (have - qty <= 0) delete inv[itemId];
      else inv[itemId] = have - qty;
      refreshUserInventoryViews();
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave(300);
      return true;
    }

    // ---------- 화면 ----------
    function ensureUserInventoryModal() {
      if (document.getElementById('userInventoryBackdrop')) return;
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div class="tier-modal-backdrop" id="userInventoryBackdrop" style="z-index:44;">
          <div class="tier-modal" style="width:min(95vw,560px);">
            <div class="panel-header">
              <div class="panel-title"><span>🎒</span><span>내 인벤토리</span></div>
              <button class="btn-close" id="btnCloseUserInventory">✕</button>
            </div>
            <div class="tier-modal-body" id="userInventoryBody"></div>
          </div>
        </div>
      `;
      document.body.appendChild(wrap.firstElementChild);

      const backdrop = document.getElementById('userInventoryBackdrop');
      document.getElementById('btnCloseUserInventory').addEventListener('click', () => backdrop.classList.remove('open'));
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.classList.remove('open'); });
      document.getElementById('userInventoryBody').addEventListener('click', (e) => {
        const slot = e.target.closest('.user-inv-slot[data-item-id]');
        if (slot) {
          selectedUserItemId = slot.getAttribute('data-item-id');
          renderUserInventory();
          return;
        }
        if (e.target.closest('#btnUseUserItem')) useSelectedUserItem();
      });
    }

    function renderUserInventory() {
      const body = document.getElementById('userInventoryBody');
      if (!body) return;
      const ownedIds = Object.keys(getUserInventory()).filter(id => getUserItemCount(id) > 0 && USER_ITEM_CATALOG[id]);
      if (selectedUserItemId && !ownedIds.includes(selectedUserItemId)) selectedUserItemId = null;
      if (!selectedUserItemId && ownedIds.length > 0) selectedUserItemId = ownedIds[0];

      const slots = [];
      for (let i = 0; i < Math.max(USER_INV_SLOT_COUNT, ownedIds.length); i++) {
        const id = ownedIds[i];
        if (!id) {
          slots.push('<div class="user-inv-slot empty"></div>');
          continue;
        }
        const item = USER_ITEM_CATALOG[id];
        slots.push(`
          <div class="user-inv-slot ${id === selectedUserItemId ? 'selected' : ''}" data-item-id="${id}" title="${item.name}">
            <span class="inv-icon">${item.icon}</span>
            <span>${item.name}</span>
            <span class="inv-qty">x${getUserItemCount(id)}</span>
          </div>
        `);
      }

      const sel = selectedUserItemId ? USER_ITEM_CATALOG[selectedUserItemId] : null;
      const howList = Object.values(USER_ITEM_CATALOG)
        .map(it => `<div>${it.icon} ${it.name}: ${it.howToGet || ''}</div>`).join('');
      const detail = sel
        ? `
          <div class="user-inv-detail">
            <div style="font-size:13.5px;font-weight:800;color:#fecaca;">${sel.icon} ${sel.name} <span style="color:#fde047;">x${getUserItemCount(sel.id)}</span></div>
            <div style="margin-top:4px;">${sel.desc || ''}</div>
            ${sel.howToGet ? `<div style="margin-top:4px;color:#94a3b8;font-size:11px;">얻는 방법: ${sel.howToGet}</div>` : ''}
            ${sel.usable ? '<button type="button" class="btn-upgrade" id="btnUseUserItem" style="margin-top:8px;width:100%;background:linear-gradient(135deg,#dc2626,#991b1b);">사용</button>' : ''}
          </div>
        `
        : `<div class="user-inv-detail">아직 아이템이 없습니다.<div style="color:#94a3b8;font-size:11px;margin-top:4px;">${howList}</div></div>`;

      body.innerHTML = `
        <div style="font-size:11.5px;color:#94a3b8;margin-bottom:8px;">마을 주인이 가진 아이템입니다. 아이템을 고른 뒤 [사용]을 누르세요.</div>
        <div class="user-inv-grid">${slots.join('')}</div>
        ${detail}
      `;
    }

    function useSelectedUserItem() {
      const item = selectedUserItemId ? USER_ITEM_CATALOG[selectedUserItemId] : null;
      if (!item || typeof item.onUse !== 'function') return;
      if (getUserItemCount(item.id) <= 0) {
        showToast(`⚠️ ${item.name}이(가) 없습니다.`);
        return;
      }
      item.onUse();
    }

    function openUserInventory() {
      ensureUserInventoryModal();
      renderUserInventory();
      document.getElementById('userInventoryBackdrop').classList.add('open');
    }

    function updateUserInventoryButton() {
      const btn = document.getElementById('btnOpenUserInventory');
      if (!btn) return;
      const total = Object.keys(getUserInventory())
        .filter(id => USER_ITEM_CATALOG[id])
        .reduce((sum, id) => sum + getUserItemCount(id), 0);
      btn.textContent = total > 0 ? `🎒 인벤토리 (${total})` : '🎒 인벤토리';
    }

    function refreshUserInventoryViews() {
      if (document.getElementById('userInventoryBackdrop')?.classList.contains('open')) renderUserInventory();
      updateUserInventoryButton();
      userInventoryChangeListeners.forEach((fn) => { try { fn(); } catch (_) {} });
    }

    document.getElementById('btnOpenUserInventory')?.addEventListener('click', openUserInventory);

    // 저장을 불러온 뒤 화면 맞추기
    if (typeof applyLoadedSaveData === 'function') {
      const origApplyForInventory = applyLoadedSaveData;
      applyLoadedSaveData = function (...args) {
        const r = origApplyForInventory.apply(this, args);
        try { refreshUserInventoryViews(); } catch (_) {}
        return r;
      };
    }
