// [22-cloud-save] 구글 로그인 + 클라우드 저장 (Firebase Authentication · Cloud Firestore)
    // ============================================================================
    // - 로그인하지 않아도 지금처럼 이 기기(브라우저)에만 저장하며 플레이할 수 있다.
    // - 구글로 로그인하면 5분마다, 저장 버튼을 누를 때, 창을 닫거나 내릴 때 클라우드에 올린다.
    // - 같은 기기가 올린 저장이면 묻지 않고 이어서 저장한다 (새로고침해도 창이 뜨지 않음).
    // - 다른 기기가 올린 저장이면 더 최근에 플레이한 쪽을 자동으로 쓰고, 바뀌기 전 데이터는 ☁️ 메뉴에서 되돌릴 수 있다.
    // - 두 기기를 동시에 켜 두고 플레이하다 서로 덮어쓸 상황이면 그때만 어느 쪽을 쓸지 묻는다.
    // - 클라우드에는 저장 코드(압축 문자열)와 요약 정보만 저장한다: players/{uid}
    // ============================================================================

    // Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹)에서 복사한 값을 넣는다.
    // (이 값은 공개되어도 괜찮은 식별 정보이며, 실제 보호는 Firestore 보안 규칙이 담당한다.)
    const CLOUD_FIREBASE_CONFIG = {
      apiKey: 'AIzaSyBaONprPyyoVp6X-jc6y4u7iqLhD-jfsfc',
      authDomain: 'ai-hunter-tycoon.firebaseapp.com',
      projectId: 'ai-hunter-tycoon',
      storageBucket: 'ai-hunter-tycoon.firebasestorage.app',
      messagingSenderId: '437359381118',
      appId: '1:437359381118:web:6669af21c8945ae454262f'
    };

    const CLOUD_SDK_VERSION = '11.6.1';
    const CLOUD_AUTO_UPLOAD_MS = 5 * 60000; // 5분마다 자동 클라우드 저장 (무료 한도 절약)
    const CLOUD_SYNC_MARK_KEY = 'ai_hunter_cloud_synced_v1'; // { [uid]: 마지막으로 맞춘 클라우드 savedAt }
    const CLOUD_DEVICE_ID_KEY = 'ai_hunter_device_id_v1';   // 이 기기(브라우저) 고유 번호
    const CLOUD_BACKUP_KEY = 'ai_hunter_cloud_backup_v1';   // 자동으로 바뀌기 전 데이터 (되돌리기용)

    // 이 기기 고유 번호: 클라우드 저장을 누가 올렸는지 구분 (같은 기기면 묻지 않음)
    const CLOUD_DEVICE_ID = (() => {
      try {
        let id = localStorage.getItem(CLOUD_DEVICE_ID_KEY);
        if (!id) {
          id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
          localStorage.setItem(CLOUD_DEVICE_ID_KEY, id);
        }
        return id;
      } catch (_) {
        return `dev_tmp_${Math.random().toString(36).slice(2, 10)}`;
      }
    })();

    // 게임을 켤 때 이 기기에 남아 있던 마지막 저장 시각 (게임이 돌기 시작하면 계속 갱신되므로 시작 시점에 기억)
    const CLOUD_BOOT_LOCAL_SAVED_AT = (() => {
      try {
        const raw = localStorage.getItem(PERSISTENT_MASTER_KEY);
        return raw ? (Number(JSON.parse(raw)?.savedAt) || 0) : 0;
      } catch (_) {
        return 0;
      }
    })();

    const CloudSave = {
      enabled: false,
      ready: false,
      error: '',
      authMod: null,
      fsMod: null,
      auth: null,
      db: null,
      user: null,
      syncing: false,
      uploading: false,
      conflict: null,        // 다른 기기의 더 최신 클라우드 데이터 (선택 대기 중)
      syncedUid: null,       // 이번 접속에서 동기화 확인을 마친 계정
      lastUploadAt: 0,
      lastCloudMeta: null
    };

    // ---------- 이 기기에서 마지막으로 맞춘 클라우드 저장 시각 ----------
    function readCloudSyncMarks() {
      try {
        const raw = localStorage.getItem(CLOUD_SYNC_MARK_KEY);
        const obj = raw ? JSON.parse(raw) : {};
        return obj && typeof obj === 'object' ? obj : {};
      } catch (_) {
        return {};
      }
    }

    function getCloudSyncMark(uid) {
      return Number(readCloudSyncMarks()[uid]) || 0;
    }

    function setCloudSyncMark(uid, savedAt) {
      try {
        const marks = readCloudSyncMarks();
        marks[uid] = savedAt;
        localStorage.setItem(CLOUD_SYNC_MARK_KEY, JSON.stringify(marks));
      } catch (_) {}
    }

    function clearCloudSyncMarks() {
      try { localStorage.removeItem(CLOUD_SYNC_MARK_KEY); } catch (_) {}
    }

    // ---------- 자동으로 바뀌기 전 데이터 보관 (되돌리기) ----------
    function readCloudBackup() {
      try {
        const raw = localStorage.getItem(CLOUD_BACKUP_KEY);
        const obj = raw ? JSON.parse(raw) : null;
        return obj && typeof obj.code === 'string' && obj.code ? obj : null;
      } catch (_) {
        return null;
      }
    }

    function saveCloudBackup(backup) {
      try {
        localStorage.setItem(CLOUD_BACKUP_KEY, JSON.stringify({ ...backup, backedUpAt: Date.now() }));
      } catch (_) {}
    }

    async function backupLocalBeforeReplace(reason) {
      try {
        const payload = serializeGameSaveData();
        const code = await encodeSaveDataToCode(payload);
        saveCloudBackup({ code, savedAt: payload.savedAt, summary: buildCloudSummary(payload), reason });
      } catch (_) {}
    }

    // 보관해 둔 데이터로 되돌리기 (지금 데이터는 다시 보관해 두어 한 번 더 되돌릴 수 있음)
    async function restoreCloudBackup() {
      const backup = readCloudBackup();
      if (!backup) return false;
      try {
        const data = await decodeSaveCodeToData(backup.code);
        await backupLocalBeforeReplace('되돌리기 전 데이터');
        applyLoadedSaveData(data);
        await saveProgressToStorage(false);
        CloudSave.conflict = null;
        if (CloudSave.user) {
          CloudSave.syncedUid = CloudSave.user.uid;
          await uploadCloudSave({ manual: false, force: true });
        }
        showToast('↩️ 이전 데이터로 되돌렸습니다.');
        return true;
      } catch (_) {
        showToast('⚠️ 이전 데이터로 되돌리지 못했습니다.');
        return false;
      }
    }

    // ---------- 요약 정보 ----------
    function buildCloudSummary(data) {
      const huntersList = Array.isArray(data?.hunters) ? data.hunters : [];
      return {
        savedAt: Number(data?.savedAt) || 0,
        gold: Math.max(0, Math.floor(Number(data?.gold) || 0)),
        hunterCount: huntersList.length,
        bossStage: Number(data?.bossStage) || 1
      };
    }

    function formatCloudTime(ms) {
      if (!ms) return '-';
      const d = new Date(ms);
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    function describeCloudSummary(s) {
      if (!s) return '-';
      return `🕒 ${formatCloudTime(s.savedAt)} · 💰 ${formatGold(s.gold)} G · 🧑‍🤝‍🧑 헌터 ${s.hunterCount}명 · 👹 보스 ${s.bossStage}단계`;
    }

    // ---------- Firebase 준비 ----------
    async function initCloudSave() {
      renderCloudSaveUi();
      if (!CLOUD_FIREBASE_CONFIG) return;
      CloudSave.enabled = true;
      try {
        const base = `https://www.gstatic.com/firebasejs/${CLOUD_SDK_VERSION}`;
        const [appMod, authMod, fsMod] = await Promise.all([
          import(`${base}/firebase-app.js`),
          import(`${base}/firebase-auth.js`),
          import(`${base}/firebase-firestore.js`)
        ]);
        const app = appMod.initializeApp(CLOUD_FIREBASE_CONFIG, 'ai-hunter-cloud');
        CloudSave.authMod = authMod;
        CloudSave.fsMod = fsMod;
        CloudSave.auth = authMod.getAuth(app);
        CloudSave.db = fsMod.getFirestore(app);
        try { await authMod.setPersistence(CloudSave.auth, authMod.browserLocalPersistence); } catch (_) {}
        try { await authMod.getRedirectResult(CloudSave.auth); } catch (_) {}
        authMod.onAuthStateChanged(CloudSave.auth, (user) => {
          CloudSave.user = user || null;
          if (!user) {
            CloudSave.conflict = null;
            CloudSave.syncedUid = null;
          }
          renderCloudSaveUi();
          if (user) syncCloudOnLogin();
        });
        CloudSave.ready = true;
      } catch (err) {
        CloudSave.error = '클라우드 서버에 연결하지 못했습니다. (오프라인이거나 차단됨)';
      }
      renderCloudSaveUi();
    }

    function getCloudDocRef(uid) {
      return CloudSave.fsMod.doc(CloudSave.db, 'players', uid);
    }

    async function readCloudSaveDoc(uid) {
      const snap = await CloudSave.fsMod.getDoc(getCloudDocRef(uid));
      if (!snap.exists()) return null;
      const d = snap.data() || {};
      return {
        code: typeof d.code === 'string' ? d.code : '',
        savedAt: Number(d.savedAt) || 0,
        deviceId: typeof d.deviceId === 'string' ? d.deviceId : '',
        summary: d.summary || null
      };
    }

    function waitForLocalStorageReady() {
      return new Promise((resolve) => {
        const tick = () => {
          if (isStorageReady && !isResettingProgress) resolve();
          else setTimeout(tick, 300);
        };
        tick();
      });
    }

    // ---------- 로그인 직후 동기화 ----------
    async function syncCloudOnLogin() {
      const user = CloudSave.user;
      if (!user || CloudSave.syncing || CloudSave.syncedUid === user.uid) return;
      CloudSave.syncing = true;
      renderCloudSaveUi();
      try {
        await waitForLocalStorageReady();
        const cloud = await readCloudSaveDoc(user.uid);
        CloudSave.lastCloudMeta = cloud;
        if (!cloud || !cloud.code) {
          // 클라우드에 저장이 없으면 이 기기 진행을 첫 저장으로 올린다
          CloudSave.syncedUid = user.uid;
          await uploadCloudSave({ manual: false, firstUpload: true });
          return;
        }
        const mark = getCloudSyncMark(user.uid);
        if (cloud.deviceId === CLOUD_DEVICE_ID || cloud.savedAt <= mark) {
          // 이 기기가 올린 저장이거나, 이 기기가 마지막 클라우드 저장과 같거나 더 앞서 있음
          // → 묻지 않고 이 기기 진행을 올린다
          CloudSave.syncedUid = user.uid;
          await uploadCloudSave({ manual: false, skipCheck: true });
          return;
        }
        // 다른 기기가 올린 저장 → 더 최근에 플레이한 쪽을 자동으로 사용 (바뀌기 전 데이터는 되돌리기용으로 보관)
        if (cloud.savedAt >= CLOUD_BOOT_LOCAL_SAVED_AT) {
          await backupLocalBeforeReplace('다른 기기의 더 최신 진행을 불러오기 전 이 기기 데이터');
          await applyCloudSave(cloud, { silent: true });
          showToast('☁️ 다른 기기에서 이어서 한 최신 진행을 불러왔습니다. (☁️ 메뉴에서 되돌리기 가능)');
        } else {
          saveCloudBackup({ code: cloud.code, savedAt: cloud.savedAt, summary: cloud.summary, reason: '이 기기 진행으로 덮어쓰기 전 클라우드 데이터' });
          CloudSave.syncedUid = user.uid;
          await uploadCloudSave({ manual: false, skipCheck: true });
          showToast('☁️ 이 기기 진행이 더 최신이라 클라우드에 저장했습니다. (☁️ 메뉴에서 되돌리기 가능)');
        }
      } catch (err) {
        CloudSave.error = '클라우드 저장을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
      } finally {
        CloudSave.syncing = false;
        renderCloudSaveUi();
      }
    }

    // ---------- 업로드 ----------
    async function uploadCloudSave({ manual = false, firstUpload = false, force = false, skipCheck = false } = {}) {
      const user = CloudSave.user;
      if (!CloudSave.ready || !user) {
        if (manual) showToast('☁️ 구글 로그인 후 클라우드에 저장할 수 있습니다.');
        return false;
      }
      if (CloudSave.conflict && !force) {
        if (manual) openCloudSaveModal();
        return false;
      }
      if (CloudSave.syncedUid !== user.uid && !force) return false;
      if (!isStorageReady || isResettingProgress || CloudSave.uploading) return false;
      CloudSave.uploading = true;
      renderCloudSaveUi();
      try {
        // 게임을 켜 둔 동안 다른 기기가 더 최근 데이터를 올렸는지 확인 (동시에 두 기기로 플레이할 때 덮어쓰기 방지)
        if (!force && !firstUpload && !skipCheck) {
          const cloud = await readCloudSaveDoc(user.uid);
          if (cloud && cloud.deviceId !== CLOUD_DEVICE_ID && cloud.savedAt > getCloudSyncMark(user.uid)) {
            CloudSave.conflict = cloud;
            openCloudSaveModal();
            return false;
          }
        }
        const payload = serializeGameSaveData();
        const code = await encodeSaveDataToCode(payload);
        const summary = buildCloudSummary(payload);
        // 페이지가 닫히며 업로드가 끝나기 전에 끊겨도 다음 접속 때 헷갈리지 않도록 기록을 먼저 남긴다
        setCloudSyncMark(user.uid, payload.savedAt);
        await CloudSave.fsMod.setDoc(getCloudDocRef(user.uid), {
          code,
          savedAt: payload.savedAt,
          deviceId: CLOUD_DEVICE_ID,
          summary,
          updatedAt: CloudSave.fsMod.serverTimestamp()
        });
        CloudSave.lastUploadAt = Date.now();
        CloudSave.lastCloudMeta = { code, savedAt: payload.savedAt, summary };
        CloudSave.error = '';
        if (manual) showToast('☁️ 클라우드에 저장했습니다!');
        else if (firstUpload) showToast('☁️ 구글 계정에 첫 클라우드 저장을 완료했습니다!');
        return true;
      } catch (err) {
        CloudSave.error = '클라우드 저장에 실패했습니다. (이 기기에는 계속 저장됩니다)';
        if (manual) showToast('⚠️ 클라우드 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return false;
      } finally {
        CloudSave.uploading = false;
        renderCloudSaveUi();
      }
    }

    // ---------- 클라우드 데이터 불러오기 ----------
    async function applyCloudSave(cloud, { silent = false, grantOffline = true } = {}) {
      const user = CloudSave.user;
      if (!user || !cloud || !cloud.code) return false;
      try {
        const data = await decodeSaveCodeToData(cloud.code);
        applyLoadedSaveData(data);
        setCloudSyncMark(user.uid, cloud.savedAt);
        CloudSave.conflict = null;
        CloudSave.syncedUid = user.uid;
        CloudSave.lastCloudMeta = cloud;
        await saveProgressToStorage(false); // 이 기기 저장도 클라우드 데이터로 맞춤
        if (!silent) showToast('☁️ 클라우드 저장 데이터를 불러왔습니다!');
        // 클라우드에 저장된 시각부터 지금까지 비어 있던 시간만큼 자리 비운 동안 보상
        if (grantOffline) setTimeout(() => window.grantOfflineRewardsForLoadedSave?.({ savedAt: cloud.savedAt }, 'closed'), 300);
        return true;
      } catch (err) {
        showToast('⚠️ 클라우드 저장 데이터를 불러오지 못했습니다.');
        return false;
      } finally {
        renderCloudSaveUi();
      }
    }

    // ---------- 로그인 / 로그아웃 ----------
    async function signInCloudWithGoogle() {
      if (!CloudSave.ready) return;
      const { authMod, auth } = CloudSave;
      const provider = new authMod.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await authMod.signInWithPopup(auth, provider);
      } catch (err) {
        const code = err?.code || '';
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
          try { await authMod.signInWithRedirect(auth, provider); } catch (_) {}
          return;
        }
        if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
          showToast('⚠️ 구글 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        }
      }
    }

    async function signOutCloud() {
      if (!CloudSave.ready || !CloudSave.user) return;
      await uploadCloudSave({ manual: false });
      try { await CloudSave.authMod.signOut(CloudSave.auth); } catch (_) {}
      showToast('👋 로그아웃했습니다. 이 기기에는 계속 저장됩니다.');
    }

    // ---------- 화면 ----------
    function getCloudAccountLabel() {
      const u = CloudSave.user;
      if (!u) return '';
      return u.displayName || (u.email ? u.email.split('@')[0] : '구글 계정');
    }

    function renderCloudSaveUi() {
      const navBtn = document.getElementById('btnCloudAccount');
      if (navBtn) {
        let label = '☁️ 로그인';
        if (CloudSave.user) label = CloudSave.conflict ? '☁️ 확인 필요' : `☁️ ${getCloudAccountLabel()}`;
        if (navBtn.textContent !== label) navBtn.textContent = label;
        navBtn.classList.toggle('cloud-attention', Boolean(CloudSave.conflict));
      }

      const body = document.getElementById('cloudSaveBody');
      if (!body || !document.getElementById('cloudSaveBackdrop')?.classList.contains('open')) return;

      const btn = (id, text, style = '') =>
        `<button type="button" class="btn-upgrade" data-cloud-action="${id}" style="width:100%;${style}">${text}</button>`;
      const note = (text, color = '#cbd5e1') =>
        `<div style="font-size:12px;line-height:1.55;color:${color};">${text}</div>`;

      let html = '';
      if (!CloudSave.enabled) {
        html += note('☁️ 클라우드 저장이 아직 설정되지 않았습니다.<br/>지금은 이 기기(브라우저)에만 저장됩니다.');
      } else if (!CloudSave.ready) {
        html += note(CloudSave.error || '클라우드 서버에 연결하는 중...');
      } else if (!CloudSave.user) {
        html += note('구글 계정으로 로그인하면 진행 상황이 클라우드에 저장되어<br/><b style="color:#fde047;">PC·휴대폰 어디서든 이어서</b> 플레이할 수 있습니다.');
        html += note('로그인하지 않아도 이 기기에는 계속 저장됩니다.', '#94a3b8');
        html += btn('login', 'G 구글로 로그인', 'background:linear-gradient(135deg,#2563eb,#1d4ed8);');
      } else if (CloudSave.conflict) {
        const cloudSum = CloudSave.conflict.summary || null;
        const localSum = buildCloudSummary(serializeGameSaveData());
        html += note(`<b style="color:#fde047;">${getCloudAccountLabel()}</b> 계정에 이 기기보다 <b style="color:#fca5a5;">더 최근에 저장된 데이터</b>가 있습니다. 어느 쪽으로 이어서 할까요?`);
        html += `<div style="font-size:11.5px;color:#e2e8f0;background:rgba(15,23,42,0.72);padding:7px 9px;border-radius:8px;line-height:1.6;">
          <b>☁️ 클라우드</b><br/>${describeCloudSummary(cloudSum)}<br/>
          <b>📱 이 기기</b><br/>${describeCloudSummary(localSum)}</div>`;
        html += btn('use-cloud', '☁️ 클라우드 데이터 불러오기', 'background:linear-gradient(135deg,#059669,#047857);');
        html += btn('use-local', '📱 이 기기 진행으로 클라우드 덮어쓰기', 'background:linear-gradient(135deg,#d97706,#b45309);');
        html += note('선택한 반대쪽 데이터는 사라집니다. 고르기 전에는 클라우드 자동 저장이 멈춥니다.', '#94a3b8');
      } else {
        html += note(`✅ <b style="color:#86efac;">${getCloudAccountLabel()}</b> 계정으로 로그인됨${CloudSave.user.email ? `<br/><span style="color:#94a3b8;">${CloudSave.user.email}</span>` : ''}`);
        const meta = CloudSave.lastCloudMeta;
        html += note(`마지막 클라우드 저장: ${meta?.summary ? describeCloudSummary(meta.summary) : (CloudSave.syncing ? '확인 중...' : '-')}`);
        html += note('5분마다, 그리고 저장 버튼을 누르거나 창을 닫을 때 자동으로 클라우드에 저장됩니다.', '#94a3b8');
        html += btn('upload', CloudSave.uploading ? '☁️ 저장 중...' : '☁️ 지금 클라우드에 저장');
        const backup = readCloudBackup();
        if (backup) {
          html += note(`↩️ 되돌리기 가능: ${backup.reason || '이전 데이터'}<br/>${describeCloudSummary(backup.summary)}`, '#fcd34d');
          html += btn('restore', '↩️ 이전 데이터로 되돌리기', 'background:rgba(180,83,9,0.55);border-color:rgba(251,191,36,0.5);color:#fef3c7;box-shadow:none;');
        }
        html += btn('logout', '로그아웃', 'background:rgba(51,65,85,0.75);border-color:rgba(148,163,184,0.35);color:#e2e8f0;box-shadow:none;');
      }
      if (CloudSave.error && CloudSave.ready) html += note(`⚠️ ${CloudSave.error}`, '#fca5a5');

      if (body.innerHTML !== html) body.innerHTML = html;
    }

    function openCloudSaveModal() {
      document.getElementById('cloudSaveBackdrop')?.classList.add('open');
      renderCloudSaveUi();
    }

    function closeCloudSaveModal() {
      document.getElementById('cloudSaveBackdrop')?.classList.remove('open');
    }

    (function bindCloudSaveControls() {
      document.getElementById('btnCloudAccount')?.addEventListener('click', openCloudSaveModal);
      document.getElementById('btnCloseCloudSave')?.addEventListener('click', closeCloudSaveModal);
      document.getElementById('cloudSaveBackdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'cloudSaveBackdrop') closeCloudSaveModal();
      });
      document.getElementById('cloudSaveBody')?.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-cloud-action]');
        if (!b || b.disabled) return;
        b.disabled = true;
        const action = b.getAttribute('data-cloud-action');
        try {
          if (action === 'login') await signInCloudWithGoogle();
          else if (action === 'logout') await signOutCloud();
          else if (action === 'upload') await uploadCloudSave({ manual: true });
          else if (action === 'restore') {
            if (await restoreCloudBackup()) closeCloudSaveModal();
          }
          else if (action === 'use-cloud') {
            if (await applyCloudSave(CloudSave.conflict)) closeCloudSaveModal();
          } else if (action === 'use-local') {
            CloudSave.conflict = null;
            CloudSave.syncedUid = CloudSave.user?.uid || null;
            if (await uploadCloudSave({ manual: true, force: true })) closeCloudSaveModal();
          }
        } finally {
          b.disabled = false;
          renderCloudSaveUi();
        }
      });

      // 기존 💾 저장 버튼을 누르면 클라우드에도 저장
      document.getElementById('btnSaveCloud')?.addEventListener('click', () => {
        if (CloudSave.user) uploadCloudSave({ manual: true });
      });

      // 5분마다 자동 클라우드 저장
      setInterval(() => {
        if (CloudSave.user && !CloudSave.conflict) uploadCloudSave({ manual: false });
      }, CLOUD_AUTO_UPLOAD_MS);

      // 창을 내리거나 닫을 때 클라우드 저장 시도 (최근 20초 안에 올렸으면 생략)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'hidden') return;
        if (!CloudSave.user || CloudSave.conflict) return;
        if (Date.now() - CloudSave.lastUploadAt < 20000) return;
        uploadCloudSave({ manual: false });
      });

      // 초기화하면 이 기기의 동기화 기록도 지워, 다음 로그인 때 클라우드 데이터를 덮어쓰기 전에 묻도록 함
      const origReset = resetAllGameProgress;
      resetAllGameProgress = async function (...args) {
        clearCloudSyncMarks();
        CloudSave.syncedUid = null;
        return origReset.apply(this, args);
      };
    })();

    initCloudSave();
