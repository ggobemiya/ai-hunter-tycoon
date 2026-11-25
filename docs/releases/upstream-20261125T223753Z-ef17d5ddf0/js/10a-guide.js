// [10a-guide] 📖 가이드 (기능별 설명 탭) + 📜 패치노트
    // ============================================================================
    // 가이드 창(📖 가이드 버튼)의 탭 내용을 그린다.
    //   - 장비 티어표 · 직업/전직 · 성격 도감 · 보스 탭은 10-ui-panels.js의 기존 내용을 그대로 쓰고,
    //     나머지 탭은 이 파일에서 그린다. (탭 버튼 목록: index.html #helpNavTabs)
    //
    // 📜 패치노트 작성 규칙
    //   - 업로드할 때마다, 업로드 직전에 PATCH_NOTES 맨 위에 새 항목을 하나 추가한다.
    //   - 화면에는 최근 PATCH_NOTE_SHOW_COUNT(10)개만 보이고, 그보다 오래된 항목은 지워도 된다.
    // ============================================================================
    const PATCH_NOTE_SHOW_COUNT = 10;
    const PATCH_NOTES = [
      {
        date: '2026-11-25',
        title: '📱 휴대폰 장시간 사용 최적화',
        items: [
          '📱 화면 글자(골드 · 포인트 · 헌터 수 등)를 값이 바뀔 때만 다시 그립니다. 같은 내용을 1초에 수십 번 다시 쓰던 것을 없애 휴대폰 부담을 크게 줄였습니다.',
          '🔋 휴대폰 · 태블릿에서 화면을 5초 동안 만지지 않으면 1초에 30번만 그립니다 (만지면 바로 60번). 게임 진행 속도는 그대로이며, 오래 켜 두어도 덜 뜨거워집니다.'
        ]
      },
      {
        date: '2026-11-25',
        title: '👹 오크 군락지 총 병력 표시',
        items: [
          '⚔️ 오크 군락지 안내판에 현재 오크 병력 총 인원(활동 중 · 부활 대기)이 표시됩니다. 오크 로드 · 대전사 · 증원 오크까지 모두 셉니다.',
          '안내판 글자가 길어지면 안내판 폭이 자동으로 늘어나 글자가 밖으로 넘치지 않습니다.'
        ]
      },
      {
        date: '2026-11-25',
        title: '🤖 자동 추방 헌터 테두리 표시',
        items: [
          '🔴 마을 전체 헌터 목록에서 자동 추방 슬롯에 들어 있는 헌터 카드는 빨간 테두리로 표시됩니다.',
          '🟢 보호 등급이라 슬롯이 잠긴(자동 추방하지 않는) 헌터 카드는 초록 테두리로 표시됩니다.'
        ]
      },
      {
        date: '2026-11-25',
        title: '🤖 자동 추방 슬롯 스크롤',
        items: [
          '🤖 자동 추방 슬롯이 많아도 슬롯 칸 안에서 위아래로 밀어 끝까지 볼 수 있습니다. 아래 헌터 목록도 함께 보입니다.'
        ]
      },
      {
        date: '2026-11-25',
        title: '🤖 헌터 자동 추방',
        items: [
          '🤖 마을 전체 헌터 목록의 [🤖 자동 추방] 버튼을 누르면 슬롯이 열립니다 (최대 10칸 · 마을 헌터 수까지).',
          '🚪 슬롯에 넣은 헌터가 5환생 Lv.99가 되면 자동으로 추방(초월권 등 추방 보상 그대로)하고, 새 헌터를 영입(200G)해 같은 슬롯에 넣습니다.',
          '🎖️ 슬롯 맨 위 [보호 등급]보다 높거나 같은 등급의 헌터는 추방하지 않습니다. 등급이 보이면(5환생) 그 슬롯이 잠기고, 직접 빼거나 추방할 수 있습니다.',
          '🔒 잠금한 헌터는 슬롯에 넣을 수 없고, 보스 레이드 · 오크 토벌 중에는 끝난 뒤에 추방합니다.'
        ]
      },
      {
        date: '2026-11-25',
        title: '📋 헌터 목록 접기 · 등급 정렬 · 📱 메뉴 정리',
        items: [
          '📋 마을 전체 헌터 목록의 카드마다 ▲/▼ 화살표로 접고 펼칠 수 있습니다. 접으면 이름 · 환생 줄과 버튼만 남습니다.',
          '📋 목록 맨 위 버튼 하나로 전체 접기 / 전체 펼치기를 할 수 있고, 접은 상태는 기기에 기억됩니다.',
          '🎖️ 정렬의 [레벨]이 [등급]으로 바뀌었습니다. 5환생 헌터를 높은 등급부터 보여 주고, 등급이 아직 안 보이는 헌터는 그 뒤에 환생 · 레벨 순으로 나옵니다.',
          '📱 휴대폰 메뉴에서 [초기화]를 왼쪽 위로 옮겼습니다. 메뉴 버튼을 다시 누르다 초기화를 잘못 누르는 일이 없도록 했습니다.'
        ]
      },
      {
        date: '2026-11-25',
        title: '👹 Lv.99 오크 증원 · 💀 제단 보스 리치 킹',
        items: [
          '👹 [오크 토벌] 버튼이 켜져 있는 동안 10분마다 Lv.99 오크 2마리(종류 무작위)가 오크 군락지에 증원됩니다 (최대 40마리).',
          '🌙 게임을 꺼 둔 동안에도 최대 12시간까지 소급해서 증원됩니다. 토벌전이 끝나면 증원 오크는 사라집니다.',
          '💀 초월 환생의 제단 보스가 [리치 킹]으로 바뀌었습니다. 공격 직전에는 보라 불꽃을 모으고, 공격할 때 해골 불꽃을 내뿜습니다. 능력치와 보상은 그대로입니다.'
        ]
      },
      {
        date: '2026-11-25',
        title: '👑 황실 병력 등급 · 🔒 헌터 잠금',
        items: [
          '👑 황실 근위병 · 근위대장(앞으로 추가될 계급 포함)도 영입할 때 등급을 받습니다. B등급 이상만 나오며, 공격력 · 방어력 · 체력 · 전투력이 올라갑니다 (B +15% ~ EX+ +55%).',
          '👑 병력 등급은 왕국 병력 목록과 병력 정보창에 항상 표시되고, 저장 데이터에 함께 저장됩니다.',
          '🔒 헌터 정보창 · 전체 헌터 목록의 이름 옆 🔓 버튼으로 헌터를 잠글 수 있습니다. 잠긴 헌터는 추방 버튼이 회색으로 꺼져 실수로 추방되지 않습니다.'
        ]
      },
      {
        date: '2026-11-25',
        title: '📖 가이드: 태생 등급 설명 추가',
        items: [
          '📖 가이드 [헌터 육성] 탭에 🎖️ 태생 등급 설명이 추가되었습니다. 12개 등급의 나올 확률과 능력치 변화를 한눈에 볼 수 있습니다.'
        ]
      },
      {
        date: '2026-11-25',
        title: '🎖️ 헌터 태생 등급 (F ~ EX+)',
        items: [
          '🎖️ 모든 헌터는 태어날 때 F · E · D · C · B · A · S · SS · SSS · SSS+ · EX · EX+ 중 하나의 등급을 받습니다 (기존 헌터도 1번 정해짐).',
          '💪 등급에 따라 공격력 · 방어력 · 최대 HP · 최대 MP가 달라집니다 (F -20% ~ C 기준 ~ EX+ +55%). 가장 흔한 등급은 C입니다.',
          '👀 등급은 5환생을 하면 보입니다. 헌터 목록에는 "A 환생 ★★★★★"처럼, 헌터 정보창에는 그림 왼쪽 위에 표시됩니다.'
        ]
      }
    ];

    (function hookGuideTabs() {
      if (typeof renderHelpModalContent !== 'function') return;
      const renderOriginalGuideTab = renderHelpModalContent;

      const note = (title, html) => `<div class="tier-note-card"><h4>${title}</h4>${html}</div>`;
      const intro = (html) => `<div style="font-size:12px;color:#cbd5e1;">${html}</div>`;
      const safe = (fn, fallback = '') => { try { return fn(); } catch (_) { return fallback; } };

      function renderStartTab() {
        return `
          ${intro('헌터들은 <b>스스로 생각해서</b> 사냥·성장·휴식을 반복합니다. 마을 주인인 당신은 <b>헌터를 영입하고, 시설을 짓고, 큰 전투(보스 · 오크 토벌)를 열어</b> 마을을 키웁니다.')}
          <div class="tier-note-grid">
            ${note('① 헌터 영입', '하단 <b>⚔️ 영입</b> 버튼으로 헌터를 데려옵니다. 직업(버서커 · 팔라딘 · 레인저 · 소서러)과 성격은 무작위입니다. 헌터 수는 마을 회관 레벨(정원)까지입니다.')}
            ${note('② 마을 시설 짓기', '빈 부지를 눌러 시설을 짓고, 건물을 눌러 업그레이드합니다. <b>+ 부지</b>로 땅을 넓힐 수 있습니다. 시설이 늘수록 헌터가 강해지고 마을 수입과 <b>번영도</b>가 오릅니다.')}
            ${note('③ 헌터는 자동으로 움직임', '배고프면 주점, 다치면 신전, 물약이 떨어지면 상점, 장비 승급 재료가 모이면 대장간에 갑니다. 그 외에는 레벨·환생에 맞는 사냥터나 던전에서 사냥합니다.')}
            ${note('④ 큰 전투 열기', '상단 <b>🔥 보스 오픈</b>으로 보스 성소를 열고, 모든 오크가 Lv.99가 되면 <b>👹 오크 토벌</b>을 열 수 있습니다. 매시 정각에는 <b>🏟️ 결투장</b> 토너먼트가 자동으로 열립니다.')}
            ${note('⑤ 화면 조작', '드래그로 이동, 휠/두 손가락으로 확대·축소, 헌터·건물·몬스터를 누르면 정보창이 열립니다. 헌터 정보창의 <b>🎥 추적</b>으로 카메라가 헌터를 따라갑니다.')}
            ${note('⑥ 저장', '자동으로 이 기기에 저장됩니다. <b>구글 로그인</b>을 하면 클라우드에도 저장되어 다른 기기에서 이어 할 수 있습니다. 자세한 내용은 💾 저장 · 보상 탭을 보세요.')}
            ${note('⑦ 🎒 인벤토리 · 📮 우편', '하단 <b>🎒 인벤토리</b> 버튼으로 마을 주인이 가진 아이템(초월권 등)을 보고 사용합니다. 옆의 <b>📮 우편</b>에는 운영자 보상·이벤트 선물이 도착하며 [받기]를 눌러 받습니다.')}
            ${note('⑧ 편의 기능','<b>🌙 절전</b>: 화면을 어둡게 하고 그리기를 줄여 배터리를 아낍니다. <b>전체화면</b> 버튼과 화면 꺼짐 방지가 있고, 홈 화면에 추가하면 앱처럼 실행됩니다.')}
          </div>
        `;
      }

      function renderTownTab() {
        // 시설 목록(기존) + 번영도(기존)를 한 탭에
        const body = document.getElementById('helpModalBody');
        renderOriginalGuideTab('town');
        const townHtml = body.innerHTML;
        renderOriginalGuideTab('prosperity');
        const prosperityHtml = body.innerHTML;
        return `
          ${intro('빈 부지에 시설을 짓고 업그레이드하면 헌터들이 이용하며 강해지고, 마을 금고에 골드가 쌓입니다. 건물마다 <b>체력</b>이 있어(Lv.10 기준 1,000만 · 결투장 · 천공의 섬 게이트는 1,000만 고정) 0이 되면 파괴되며, 마을 회관은 Lv.1로 내려갑니다. 부서진 건물은 건물 창의 <b>🔧 수리</b> 버튼으로 골드를 내고 고칩니다 (완전 수리 = 설치 · 업그레이드 · 해금 비용 합계의 절반 · 잃은 체력만큼만). 시설 업그레이드는 <b>보스 단계를 처치할 때마다</b> 상한이 풀립니다.')}
          <div style="font-size:12.5px;font-weight:800;color:#fde047;margin-top:6px;">🏗️ 마을 시설</div>
          ${townHtml}
          <div style="font-size:12.5px;font-weight:800;color:#fde047;margin-top:10px;">📈 마을 번영도</div>
          ${prosperityHtml}
        `;
      }

      function renderHunterTab() {
        const body = document.getElementById('helpModalBody');
        renderOriginalGuideTab('hunter');
        const oldHunterHtml = body.innerHTML;
        return `
          ${intro('헌터는 사냥으로 경험치를 얻어 <b>Lv.99</b>까지 크고, 환생하며 더 강해집니다. 헌터를 누르면 능력치 · 장비 · 스킬 · 관계도를 볼 수 있습니다.')}
          <div class="tier-note-grid">
            ${note('🧠 헌터가 스스로 하는 일 (우선순위)', `
              <div>1. 오크 토벌 · 보스 레이드 소집, 제단 출정 지시</div>
              <div>2. Lv.99 → 환생소에서 환생 (1환생을 하면 스스로 초월 환생의 제단에 가서 인장 획득)</div>
              <div>3. 체력 45% 미만 · 피로 78 이상 → 신전/여관 · 배고프면 주점</div>
              <div>4. 물약 보충 · 전리품 판매(승급 재료는 남김) · 날개 강화 · 장비 승급/강화</div>
              <div>5. 레벨·환생에 맞는 사냥터 → 없으면 던전 → 할 일이 없으면 마을 구경</div>
              <div style="margin-top:4px;color:#94a3b8;">환생 헌터는 힘이 붙을 때까지 일반 사냥터에서도 사냥합니다.</div>
            `)}
            ${note('⏱️ 성장 속도 (게임을 켜 둔 기준)', `
              <div>• Lv.1부터 <b>4환생 Lv.99</b>까지 약 <b>하루(24시간)</b>: 환생 전 약 4.6시간 · 1~4환생 각 약 4~6시간</div>
              <div>• <b>5환생 Lv.1 → Lv.99</b>도 약 <b>하루(24시간)</b></div>
              <div style="color:#94a3b8;">단계에 맞는 장비 기준이며, 번영도 · 날개 · 인장이 있으면 더 빠릅니다. 꺼 둔 시간은 최대 12시간까지 80%로 소급됩니다.</div>
            `)}
            ${note('🔴 초월 (5환생 이후)', `
              <div>• <b>5단계 보스를 처음 처치</b>하면 초월권 <b>2장</b>을 한 번 받습니다.</div>
              <div>• <b>5환생 Lv.99 헌터를 추방</b>하면 초월권 <b>1장</b> + 토벌 포인트 <b>+50</b> + 헌터 최대 인원 <b>+1</b> (추방으로 늘어나는 인원은 최대 +20). Lv.98 이하로 추방하면 보상이 없습니다.</div>
              <div>• 초월권은 🎒 인벤토리에 보관됩니다. 인벤토리에서 [사용]을 누르거나 전체 헌터 목록의 <b>🔴 초월</b> 버튼으로 1환생 이상 헌터를 초월시킵니다.</div>
              <div>• 1초월마다 금색 환생 별 1개가 <b style="color:#ef4444;">빨간 별</b>로 바뀌고 전체 능력(공격력 · 방어력 · 체력 · 마나) <b>+20%</b>. 환생 별 수만큼, 최대 <b>5초월(+100%)</b>까지.</div>
            `)}
            ${typeof HUNTER_GRADES !== 'undefined' ? note('🎖️ 태생 등급', `
              <div>• 헌터는 태어날 때 등급 하나를 받고, 평생 바뀌지 않습니다. 등급에 따라 <b>공격력 · 방어력 · 최대 HP · 최대 MP</b>가 달라집니다 (C등급이 기준).</div>
              <div>• 효과는 처음부터 적용되지만, 등급은 <b>5환생</b>을 해야 보입니다. 전체 헌터 목록에는 <b>"A 환생 ★★★★★"</b>처럼, 헌터 정보창에는 그림 왼쪽 위에 표시됩니다.</div>
              <div style="display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:6px;">${HUNTER_GRADES.map(gr => `<span style="white-space:nowrap;"><span class="hunter-grade ${gr.cls}">${gr.id}</span> <span style="color:#cbd5e1;">${gr.chance}%</span> <span style="color:${gr.bonus > 0 ? '#86efac' : (gr.bonus < 0 ? '#fca5a5' : '#94a3b8')};">${gr.bonus > 0 ? '+' : ''}${Math.round(gr.bonus * 100)}%</span></span>`).join('')}</div>
              <div style="color:#94a3b8;margin-top:4px;">등급 · 나올 확률 · 능력치 순서입니다.</div>
            `) : ''}
            ${note('🛠️ 헌터 관리','헌터 정보창에서 <b>✏️ 이름변경</b>, <b>🚪 추방</b>, <b>✨ 제단 출정</b>(1환생 이상)을 할 수 있습니다. 상단의 헌터 수를 누르면 전체 헌터 목록이 열립니다.')}
            ${note('😈 인성 & 카오스', '인성은 -100(카오스) ~ +100(선인)입니다. 헌터끼리 싸우면(PK) 인성이 떨어지고, -50 이하(카오스)가 되면 마을 경비병이 쫓아와 제압합니다. 인성이 마이너스인 헌터는 정화세가 있으면 스스로 정화의 성소에 가서 정화합니다. 상급 사냥터(용암 화산지대)는 PvP 무법지대입니다.')}
          </div>
          ${oldHunterHtml}
        `;
      }

      function renderEquipTab() {
        const body = document.getElementById('helpModalBody');
        renderOriginalGuideTab('tier');
        const tierHtml = body.innerHTML;
        const wing = safe(() => ITEM_CATALOG.sky_sanctuary_wings, null);
        return `
          ${tierHtml}
          <div class="tier-note-grid">
            ${note('✨ 강화 (마법 강화소)', '무기·방어구·투구·장신구를 <b>+15강</b>까지 강화합니다. <b>+10강</b>부터 무기가 하늘색으로, <b>+15강</b>은 금색으로 빛납니다. 이름표의 <b>[+N]</b>은 무기 강화 수치입니다.')}
            ${note('🔨 승급 (대장간)', '정해진 강화 수치와 <b>사냥터 전리품(재료)</b>을 모으면 대장간에서 다음 티어로 승급합니다. 헌터는 승급 재료를 팔지 않고 남겨 둡니다.')}
            ${note('🗡️ 무기 모습', '무기는 직업과 환생 단계(0~5)에 따라 모습이 바뀝니다. 버서커 도끼 · 팔라딘 검 · 레인저 활 · 소서러 지팡이.')}
            ${wing ? note(`${wing.icon} ${wing.name}`, `${wing.desc}.<br/>날개가 있어야 <b>🌌 성운의 천궁</b>에 갈 수 있습니다.`) : ''}
            ${note('🎖️ 지역 인장', '각 사냥터의 중간보스를 잡으면 그 지역 인장(몬스터 피해 증가)을 얻습니다. 초월 환생의 제단 보스는 <b>✨ 초월 윤회의 인장</b>을 줍니다.')}
          </div>
        `;
      }

      function renderGroundsTab() {
        const grounds = safe(() => (typeof ALL_FIELD_GROUNDS !== 'undefined' ? ALL_FIELD_GROUNDS : HUNTING_GROUNDS), []);
        const cards = grounds.map((g) => {
          const cond = [];
          if (g.minRebirth) cond.push(`${g.minRebirth}환생 이상`);
          if (g.requiresWing) cond.push('날개 착용');
          const lv = (g.minRecLv && g.maxRecLv) ? `권장 Lv.${g.minRecLv}~${g.maxRecLv}` : '';
          let how = '마을 관문에서 걸어서 이동';
          if (g.id === 'sky_island_field') how = '마을의 천공의 섬 게이트(포탈)로 순간 이동';
          if (g.id === 'celestial_palace_field') how = '천공의 섬 포탈 → 날개로 날아서 이동';
          if (g.id === 'hero_arena_field') how = '마을 북쪽 [투기장 입구]에서 순간 이동 (마을 성벽 바로 위 원형 투기장)';
          if (g.id === 'top_field_70_99') how = '마을 관문에서 이동 · 오크 군락지와 맞닿은 숲 (5단계 보스 처치 시 통로 개방)';
          const extra = [];
          if (g.id === 'beginner_field') extra.push('Lv.1~10 경험치 +50% · Lv.21 이상은 경험치 -90%');
          if (g.id === 'hero_arena_field') extra.push('몬스터 없이 영웅끼리 끝없이 싸우는 PvP 배틀필드 · 처치하면 경험치와 골드 · 상대가 없으면 🧘 홀로 수련(시간에 따라 경험치)', '입장 장비: 전 부위 T7 이상 + 평균 +10강 · 인성 감소 · 약탈 없음 · 쓰러지면 마을에서 정비 후 복귀');
          if (g.id === 'sky_island_field') extra.push('입장 장비: 전 부위 T7 이상 + 평균 +10강 (미달이면 윤회의 성역 · 지하 던전에서 장비를 맞춤)');
          if (g.id === 'high_field_40_70') extra.push('PvP 무법지대: 헌터끼리 싸울 수 있음 (가까운 상대에게 가끔 선공 · 교전 뒤 1분 휴전 · 한 방에 최대 체력의 약 22%까지만 피해)');
          if (g.id === 'celestial_palace_field') extra.push('몬스터 4종: 성운의 수호대천사 · 별빛 심판 세라핌 · 천궁의 성가 지휘자(원거리) · 성운왕좌의 수호신');
          return `
            <div class="facility-guide-card">
              <div class="facility-guide-head">
                <span class="facility-guide-title">${g.icon || '🗺️'} ${g.name}</span>
                <span class="facility-guide-cost">${[lv, ...cond].filter(Boolean).join(' · ') || '누구나'}</span>
              </div>
              <div class="facility-guide-stat">${g.id === 'hero_arena_field' && typeof getArenaExpPerKill === 'function'
                ? `처치당 EXP ${getArenaExpPerKill(1).toLocaleString()}(Lv.1) ~ ${getArenaExpPerKill(99).toLocaleString()}(Lv.99) · 처치당 골드 ${Number(ARENA_CFG.goldPerKill).toLocaleString()}`
                : `기본 EXP ${Number(g.baseExp || 0).toLocaleString()} · 기본 골드 ${Number(g.baseGold || 0).toLocaleString()}${g.lootSpec ? ` · 전리품 ${g.lootSpec.icon || ''} ${g.lootSpec.name}` : ''}`}</div>
              <div class="facility-guide-role">🚶 ${how}${extra.length ? `<br/>• ${extra.join('<br/>• ')}` : ''}${g.miniBossConfig ? `<br/>👑 희귀 중간보스: ${g.miniBossConfig.name}` : ''}</div>
            </div>
          `;
        }).join('');
        const dungeonDesc = safe(() => BUILDING_CATALOG.dungeon.desc, '지하 던전은 레벨당 10층씩 최대 B100F까지 열립니다.');
        return `
          ${intro('헌터는 자기 레벨·환생에 맞는 사냥터를 스스로 고릅니다. 사냥터 몬스터를 잡으면 경험치 · 골드 · <b>장비 승급 재료(전리품)</b> · 장비조각을 얻습니다.')}
          <div class="facility-guide-grid">${cards}</div>
          <div class="tier-note-grid">
            ${note('🕳️ 지하 던전', `${dungeonDesc} 50층부터는 전 부위 T5 이상(강화가 조금 부족해도 높은 티어면 통과), 100층은 전 부위 T10 + 평균 +13강이 필요합니다. 들어갈 층이 있는 헌터는 사냥 대신 약 20% 확률로 던전 탐험을 갑니다.`)}
            ${note('👑 희귀 중간보스', '사냥터 몬스터가 나타날 때 0.1% 확률로 중간보스가 등장합니다. 처치하면 지역 인장과 큰 보상을 얻습니다.')}
          </div>
        `;
      }

      function renderOrcTab() {
        const maxGuard = safe(() => MAX_GUARD_LEVEL, 99);
        return `
          ${intro('마을 동쪽 <b>👹 오크 군락지</b>의 오크들은 헌터와 몬스터를 쓰러뜨리며 레벨이 오르고(게임을 꺼 둔 동안에도 80% 소급). 오크 토벌 중에는 일반 오크가 쓰러질수록 <b>오크 로드</b>가 커집니다(모두 쓰러지면 3배). <b>모든 오크가 Lv.99</b>가 되면 상단 <b>👹 오크 토벌</b> 버튼으로 대규모 토벌전을 열 수 있습니다.')}
          <div class="tier-note-grid">
            ${note('⏱️ 진행 순서', `
              <div>1. 토벌 개시 → 모든 헌터가 마을로 모여 <b>60초 정비</b> (천공의 섬 헌터는 순간 이동)</div>
              <div>2. 이어서 <b>30초 대기</b> — 이때 오크들이 먼저 오크의 숲으로 나와 진형을 짭니다</div>
              <div>3. 총 1분 30초 뒤 숲의 일반 몬스터가 사라지고, 토벌군이 오크의 숲으로 진격해 전투 시작</div>
              <div style="margin-top:4px;color:#94a3b8;">보스 레이드 중에는 시작할 수 없습니다.</div>
            `)}
            ${note('🛡️ 토벌군 진형 (서쪽)', `
              <div>선봉: 🛡️ 창세 수호대장 (헌터보다 훨씬 앞)</div>
              <div>1열: 팔라딘 · 버서커 (근접)</div>
              <div>2열: 레인저 · 소서러 · 🔮 아크메이지 수호자 (원거리)</div>
            `)}
            ${note('👹 오크군 진형 (동쪽)', `
              <div>대전사가 있을 때: 1열 👑 오크 대전사 → 2열 근접 → 3열 원거리 → 4열 오크 로드</div>
              <div>대전사가 없을 때: 1열 근접 → 2열 원거리 → 3열 오크 로드</div>
              <div style="margin-top:4px;color:#94a3b8;">👑 오크 대전사는 10단계 보스를 처치하면 등장합니다. 인원이 많으면 열을 여러 줄로 나눠 200 대 200 이상도 진형을 유지합니다.</div>
            `)}
            ${note('⚔️ 전투', '양쪽 1열끼리 먼저 부딪히는 중세 전쟁처럼 시작하고, 전투가 시작되면 진형을 풀고 <b>모두 공격에 가담</b>합니다. 쓰러진 헌터는 마을로 돌아가고 그 토벌전에는 다시 참가할 수 없습니다.')}
            ${note('📈 오크 군세 버프', `
              <div>👑 오크 대전사: 오크 로드보다 <b>1.2배</b> 강하고, 살아 있는 일반 오크 1마리당 공격력·체력 <b>+1%</b> (오크가 줄면 함께 줄어듦)</div>
              <div style="margin-top:4px;">👹 오크 로드: 일반 오크가 쓰러질 때마다 공격력·체력 <b>+1%</b>, 늘어난 체력만큼 바로 회복</div>
            `)}
            ${note('🏆 승리 · 패배', `
              <div>승리: 오크군 전멸 · 토벌 포인트 획득 (일반 오크 1P · 오크 대전사 10P · 오크 로드 20P)</div>
              <div>패배: 참가 헌터와 경비병이 <b>모두 전사</b></div>
              <div style="margin-top:4px;color:#94a3b8;">경비병도 토벌전에 함께 싸웁니다 (경비병 최대 Lv.${maxGuard}).</div>
            `)}
            ${note('🎖️ 토벌 포인트 상점', `
              <div>상단 <b>🎖️ 토벌 포인트</b>를 누르면 상점이 열립니다. 산 물건은 🎒 인벤토리로 들어갑니다.</div>
              ${typeof SUBJ_SHOP_ITEMS !== 'undefined' ? SUBJ_SHOP_ITEMS.map((it) => {
                const v = getShopItemView(it);
                const lim = it.limit ? ` · ${it.limit.period === 'day' ? '하루' : '주'} ${it.limit.count}회` : '';
                if (it.comingSoon) return `<div>• 👑 ${v.name}: <b>🔒 준비 중</b> (구매 불가)</div>`;
                return `<div>• ${v.icon} ${v.name}: <b>${it.price.toLocaleString()} P</b>${lim}</div>`;
              }).join('') : ''}
              <div style="margin-top:4px;color:#94a3b8;">하루 한도는 자정, 주간 한도는 월요일 0시에 초기화됩니다. 저장을 다시 불러와도 산 횟수는 되돌아오지 않습니다.</div>
            `)}
          </div>
        `;
      }

      function renderGuardsTab() {
        const body = document.getElementById('helpModalBody');
        renderOriginalGuideTab('guards');
        const oldHtml = body.innerHTML;
        const maxGuard = safe(() => MAX_GUARD_LEVEL, 99);
        const cost1 = safe(() => formatGold(getGuardUpgradeCost(1)), '');
        const cost50 = safe(() => formatGold(getGuardUpgradeCost(50)), '');
        return `
          ${oldHtml}
          <div class="tier-note-grid">
            ${note('⬆️ 경비병 강화', `경비병을 눌러 마을 금고 골드로 강화합니다 (최대 <b>Lv.${maxGuard}</b>). 레벨당 체력 <b>+25%</b>, 공격력 <b>+35%</b>, 이동속도가 조금씩 오릅니다.<br/>강화 비용: Lv.1 → 2 <b>${cost1} G</b> · Lv.50 → 51 <b>${cost50} G</b> (레벨마다 1.22배)`)}
            ${note('👹 오크 토벌 참전', '오크 토벌전에서 창세 수호대장은 선봉, 아크메이지 수호자는 원거리 2열에 서서 함께 싸웁니다. 경비병과 헌터가 모두 쓰러지면 토벌 패배입니다.')}
          </div>
        `;
      }

      function renderColosseumTab() {
        const c = safe(() => COLOSSEUM_REWARD_CONFIG, null);
        const g = (v) => safe(() => formatGold(v), String(v));
        return `
          ${intro('<b>🏟️ 왕국 결투장</b>은 현실 시간 <b>매시 정각</b>에 자동으로 열리는 1:1 토너먼트입니다.')}
          <div class="tier-note-grid">
            ${note('📋 참가자 선발', '환생 횟수 → 레벨 순으로 상위 <b>최대 50명</b>이 뽑힙니다. 공정한 대결을 위해 모두 <b>T1 +15강 장비 세트</b>로 맞춰 싸웁니다.')}
            ${note('⚔️ 경기 방식', '무작위 대진의 1:1 싱글 엘리미네이션(지면 탈락)입니다. 준결승 · 결승은 더 오래 겨루고, 실제 헌터 모습으로 관람할 수 있습니다.')}
            ${c ? note('🏆 상금 & 승점', `우승 <b>${g(c.CHAMPION_GOLD)} G</b> · 승점 ${c.CHAMPION_POINTS}<br/>준우승 <b>${g(c.RUNNER_UP_GOLD)} G</b> · 승점 ${c.RUNNER_UP_POINTS}<br/>참가상 <b>${g(c.PARTICIPANT_GOLD)} G</b> · 승점 ${c.PARTICIPANT_POINTS}`) : ''}
            ${note('📜 기록', `최근 경기 기록 ${c ? c.MAX_HISTORY_RECORDS : 5}개와 토너먼트 회차, 헌터별 우승 · 준우승 · 참가 횟수가 저장됩니다. 게임을 꺼 둔 사이 지나간 정각 토너먼트는 다시 켜면 열립니다.`)}
          </div>
        `;
      }

      function renderSaveTab() {
        return `
          ${intro('게임은 자동으로 저장됩니다. 구글 로그인을 하면 여러 기기에서 이어서 할 수 있습니다.')}
          <div class="tier-note-grid">
            ${note('💾 이 기기 저장', '로그인하지 않아도 이 브라우저에 자동 저장됩니다. 브라우저 데이터를 지우면 사라지므로 구글 로그인이나 저장 코드를 권장합니다.')}
            ${note('☁️ 구글 로그인 · 클라우드 저장', `
              <div>• 로그인하면 <b>5분마다</b>, 저장 버튼을 누를 때, 창을 닫거나 내릴 때 클라우드에 저장합니다.</div>
              <div>• 같은 기기에서는 묻지 않고 이어서 저장합니다 (새로고침해도 창이 뜨지 않음).</div>
              <div>• 다른 기기에서 켜면 더 최근에 플레이한 쪽을 자동으로 쓰고, 바뀌기 전 데이터는 ☁️ 메뉴에서 되돌릴 수 있습니다.</div>
              <div>• 두 기기를 동시에 켜서 서로 덮어쓸 때만 어느 쪽을 쓸지 묻습니다.</div>
            `)}
            ${note('🔑 저장 코드', '저장 데이터를 문자열 코드로 내보내고 불러올 수 있습니다. 다른 기기로 옮길 때 쓰세요.')}
            ${note('🛡️ 리세마라 방지', '같은 마을의 <b>예전 저장 코드·파일로는 되돌릴 수 없습니다</b>. 이 기기가 그 마을의 더 최신 저장을 이미 가지고 있으면 불러오기가 막힙니다. 다른 기기에서 가져온 <b>최신</b> 저장은 그대로 불러올 수 있고, 구글 클라우드 동기화는 항상 더 최근 저장을 씁니다.')}
            ${note('💤 자리 비운 동안 보상', `
              <div>게임을 꺼 둔 시간(최대 <b>12시간</b>)만큼 최근 약 30분 동안의 <b>시간당 수입 × 80%</b>를 다시 켤 때 한 번에 받습니다.</div>
              <div>• 받는 것: 마을 금고 골드 · 헌터별 경험치 · 헌터별 개인 골드 · 오크 처치 수(오크 레벨업)</div>
              <div>• 받지 않는 것: 보스 레이드 · 오크 토벌 · 결투장 · 장비 강화 · 헌터 위치</div>
              <div>• 다른 기기에서 클라우드로 불러와도 똑같이 받습니다.</div>
            `)}
            ${note('⚠️ 전체 초기화', '☰ 메뉴의 초기화는 모든 진행을 지웁니다. 되돌릴 수 없으니 저장 코드를 먼저 백업하세요.')}
          </div>
        `;
      }

      function renderPatchTab() {
        const list = PATCH_NOTES.slice(0, PATCH_NOTE_SHOW_COUNT);
        return `
          ${intro(`최근 업데이트 <b>${list.length}개</b>입니다. (최신순)`)}
          <div class="tier-note-grid">
            ${list.map((p, i) => `
              <div class="tier-note-card" style="${i === 0 ? 'border-color:rgba(253,224,71,0.55);' : ''}">
                <h4>${i === 0 ? '🆕 ' : ''}${p.title} <span style="font-size:10.5px;color:#94a3b8;font-weight:600;">${p.date}</span></h4>
                ${p.items.map(t => `<div style="margin-top:3px;">• ${t}</div>`).join('')}
              </div>
            `).join('')}
          </div>
        `;
      }

      const NEW_TABS = {
        start: renderStartTab,
        town: renderTownTab,
        hunter: renderHunterTab,
        tier: renderEquipTab,
        grounds: renderGroundsTab,
        orc: renderOrcTab,
        guards: renderGuardsTab,
        colosseum: renderColosseumTab,
        save: renderSaveTab,
        patch: renderPatchTab
      };

      renderHelpModalContent = function (tabKey) {
        const fn = NEW_TABS[tabKey];
        if (!fn) {
          // 직업 · 성격 · 보스 탭은 기존 그대로
          renderOriginalGuideTab(tabKey);
          return;
        }
        const body = document.getElementById('helpModalBody');
        if (!body) return;
        const html = fn();
        // 기존 그리기가 남긴 보스 탭 확장 상태 정리
        const modalEl = body.closest('.tier-modal');
        if (modalEl) modalEl.classList.remove('boss-guide-expanded');
        body.classList.remove('boss-scroll-2x');
        body.innerHTML = html;
        body.scrollTop = 0;
      };
    })();
