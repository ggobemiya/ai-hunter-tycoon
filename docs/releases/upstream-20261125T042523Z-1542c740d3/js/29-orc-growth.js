// [29-orc-growth] 👹 오크 토벌 중 일반 오크가 쓰러질수록 오크 로드가 커짐 (최대 3배)
    // ============================================================================
    // - 오크 토벌전(전투 중)에만 적용된다.
    // - 오크 로드 크기 = 1 + 2 × (쓰러진 일반 오크 수 ÷ 전체 일반 오크 수)
    //   → 일반 오크가 모두 쓰러지면 최대 3배. (오크 로드 · 오크 대전사는 셈에서 제외)
    // - 토벌이 끝나면 원래 크기로 돌아온다. (저장할 값 없음)
    // - 크기는 그림에만 적용된다 (13-render-village-buildings.js의 오크 그리기에서 곱함).
    //   능력치 버프는 기존 오크 군세 버프(04-orc-stronghold.js: 쓰러진 오크 1마리당 +1%)가 담당.
    // ============================================================================
    const ORC_GROWTH_CFG = {
      maxScale: 3.0
    };

    function getOrcGrowthScale(orc) {
      if (!orc || !isOrcLordUnit(orc)) return 1;
      if (typeof ORC_SUBJUGATION === 'undefined' || ORC_SUBJUGATION.status !== 'ACTIVE') return 1;
      const { alive, dead } = getRegularOrcCounts();
      const total = alive + dead;
      if (total <= 0) return 1;
      return 1 + (ORC_GROWTH_CFG.maxScale - 1) * Math.min(1, dead / total);
    }

    // 일반 오크가 쓰러질 때 오크 로드 머리 위에 커진 크기 표시
    (function hookOrcDeathGrowthPopup() {
      if (typeof killOrcUnit !== 'function') return;
      const origKill = killOrcUnit;
      killOrcUnit = function (orc, ...rest) {
        const wasAlive = orc && !orc.isDead;
        const r = origKill.call(this, orc, ...rest);
        const isRegular = orc && !isOrcLordUnit(orc) && !orc.isGreatWarrior && orc.role !== '오크 대전사';
        if (wasAlive && orc.isDead && isRegular && ORC_SUBJUGATION.status === 'ACTIVE') {
          const lord = ORC_STRONGHOLD_ZONE.orcs.find(o => o && isOrcLordUnit(o));
          if (lord && !lord.isDead && typeof combatEffects !== 'undefined') {
            combatEffects.spawnDamagePopup(lord.x, lord.y - 40, `📈 오크 로드 ×${getOrcGrowthScale(lord).toFixed(1)}`, false, '#fca5a5');
          }
        }
        return r;
      };
    })();
