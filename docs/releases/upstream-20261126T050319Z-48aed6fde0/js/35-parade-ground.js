// [35-parade-ground] 🚩 중세 왕립 연병장 그림 (보내 주신 medieval_parade_ground.js · 4방향 회전)
// 게임에 맞춘 변경 2가지만: ① 기본 크기를 왕국 연병장 칸 비율 10 × 6 (가로 220 × 세로 132)으로
//   ② bld.hideLabel 이면 아래 이름표를 그리지 않음 (왕국은 34-kingdom.js가 크게 늘려 그리며 따로 이름판을 붙임)
/**
 * ============================================================================
 * 중세 왕립 연병장 (중앙 건물 없는 개방형 · 4방향 회전 지원: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT')
 * - 기존 마을 렌더러 drawBuilding(ctx, bld, isSelected)에 바로 연결 가능
 * ============================================================================
 */
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    const r = Array.isArray(radii) ? (radii[0] || 0) : (radii || 0);
    const radius = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    this.beginPath();
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
    return this;
  };
}

const PARADE_GROUND_BUILDING_DEF = {
  type: 'parade_ground',
  name: '왕립 연병장',
  icon: '🚩',
  w: 176,
  h: 132,
  buildCost: 900,
  baseUpgradeCost: 1100,
  prosperityPerLv: 85,
  direction: 'DOWN', // 'DOWN'(하) | 'UP'(상) | 'LEFT'(좌) | 'RIGHT'(우)
  desc: '탁 트인 석조 연병장 마당에서 기사단과 모험가들이 진형 훈련과 무기 수련을 펼치는 중세 훈련장입니다. 상·하·좌·우 4방향으로 회전 배치할 수 있습니다.',
  getStatText: (lv) => `전투 훈련 효율 +${20 + lv * 10}% · 치명/공격 수련`
};

function rotateParadeDirection(currentDir, step = 1) {
  const dirs = ['DOWN', 'LEFT', 'UP', 'RIGHT'];
  const idx = dirs.indexOf(currentDir);
  const safeIdx = idx >= 0 ? idx : 0;
  return dirs[(safeIdx + step + dirs.length * 4) % dirs.length];
}

function getParadeGroundDimensions(direction = 'DOWN') {
  const isSide = direction === 'LEFT' || direction === 'RIGHT';
  return isSide ? { w: 132, h: 220 } : { w: 220, h: 132 }; // 왕국 연병장 10 × 6칸 비율
}

function getParadeGroundDoorOffset(direction = 'DOWN') {
  const dim = getParadeGroundDimensions(direction);
  if (direction === 'UP') return { dx: 0, dy: -dim.h / 2 - 12 };
  if (direction === 'LEFT') return { dx: -dim.w / 2 - 12, dy: 0 };
  if (direction === 'RIGHT') return { dx: dim.w / 2 + 12, dy: 0 };
  return { dx: 0, dy: dim.h / 2 + 12 };
}

function drawRoyalBannerStandard(ctx, x, y, t, phaseOffset = 0) {
  ctx.save();
  ctx.translate(x, y);

  // 석조 기단
  ctx.fillStyle = '#475569';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.roundRect(-6, -2, 12, 6, 2);
  ctx.fill();
  ctx.stroke();

  // 금장 깃대
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-1.5, -34, 3, 33);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(0, -39);
  ctx.lineTo(3.5, -34);
  ctx.lineTo(0, -31);
  ctx.lineTo(-3.5, -34);
  ctx.closePath();
  ctx.fill();

  // 바람에 펄럭이는 왕실 군기(배너)
  const sway = Math.sin(t * 2.4 + phaseOffset) * 2.2;
  ctx.fillStyle = '#991b1b';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(1.5, -32);
  ctx.quadraticCurveTo(11, -31 + sway * 0.4, 19, -29 + sway);
  ctx.lineTo(16, -23 + sway * 0.8);
  ctx.lineTo(19, -17 + sway);
  ctx.quadraticCurveTo(10, -18 + sway * 0.4, 1.5, -18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 배너 중앙 황금 문장 다이아몬드
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.moveTo(9.5, -27.5 + sway * 0.45);
  ctx.lineTo(12.2, -24.8 + sway * 0.45);
  ctx.lineTo(9.5, -22.1 + sway * 0.45);
  ctx.lineTo(6.8, -24.8 + sway * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawBronzeBrazier(ctx, x, y, t, seed = 0) {
  ctx.save();
  ctx.translate(x, y);

  // 화로 받침대
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-5, 4);
  ctx.lineTo(-3.5, -3);
  ctx.lineTo(3.5, -3);
  ctx.lineTo(5, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 청동 화로 접시
  ctx.fillStyle = '#92400e';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -4, 6, 0, Math.PI);
  ctx.fill();
  ctx.stroke();

  // 은은한 불꽃 글로우
  const flicker = Math.sin(t * 5.2 + seed) * 1.1;
  ctx.fillStyle = 'rgba(249, 115, 22, 0.28)';
  ctx.beginPath();
  ctx.arc(0, -7, 8 + flicker * 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(-4, -4);
  ctx.quadraticCurveTo(-2, -12 - flicker, 0, -14 - flicker);
  ctx.quadraticCurveTo(2, -11 - flicker, 4, -4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(0, -6.5, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawMedievalParadeGround(ctx, bld, isSelected = false) {
  const dir = bld.direction || 'DOWN';
  const dim = getParadeGroundDimensions(dir);
  const w = dim.w;
  const h = dim.h;
  const left = bld.x - w / 2;
  const top = bld.y - h / 2;
  const t = performance.now() * 0.003;

  ctx.save();

  // 선택 테두리
  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(left - 10, top - 14, w + 20, h + 24, 18);
    ctx.stroke();
  }

  // 1) 바닥 입체 그림자 & 중세 석재 연병장 외곽 테두리
  ctx.fillStyle = 'rgba(2, 6, 23, 0.42)';
  ctx.beginPath();
  ctx.roundRect(left + 5, top + 8, w, h, 16);
  ctx.fill();

  ctx.fillStyle = '#475569';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(left, top, w, h, 16);
  ctx.fill();
  ctx.stroke();

  // 2) 안쪽 황토·모래 훈련 마당 & 미묘한 질감
  const pad = 10;
  const sandGrad = ctx.createLinearGradient(left, top, left + w, top + h);
  sandGrad.addColorStop(0, '#c8a97e');
  sandGrad.addColorStop(0.5, '#bfa074');
  sandGrad.addColorStop(1, '#ab8b60');

  ctx.fillStyle = sandGrad;
  ctx.beginPath();
  ctx.roundRect(left + pad, top + pad, w - pad * 2, h - pad * 2, 10);
  ctx.fill();

  // 모래 위 발자국/훈련 원형 궤적 & 중앙 사열 문장 라인 (건물 없이 개방된 중앙 마당)
  ctx.save();
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(left + 17, top + 17, w - 34, h - 34, 7);
  ctx.stroke();

  // 중앙 대련 원형 링
  const ringR = Math.min(w, h) * 0.23;
  ctx.strokeStyle = 'rgba(146, 64, 14, 0.34)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(bld.x, bld.y, ringR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(254, 243, 199, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(bld.x, bld.y, ringR - 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 3) 입구 방향 돌바닥 진입로 강조
  ctx.fillStyle = '#64748b';
  if (dir === 'DOWN') {
    ctx.fillRect(bld.x - 18, top + h - 12, 36, 13);
  } else if (dir === 'UP') {
    ctx.fillRect(bld.x - 18, top - 1, 36, 13);
  } else if (dir === 'LEFT') {
    ctx.fillRect(left - 1, bld.y - 18, 13, 36);
  } else if (dir === 'RIGHT') {
    ctx.fillRect(left + w - 12, bld.y - 18, 13, 36);
  }

  // 4) 석조 성벽 난간 & 기둥 (입구 방향 중앙은 개방)
  const drawStonePillar = (px, py) => {
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(px - 5, py - 6, 10, 11, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(px - 3.5, py - 5, 7, 3);
  };

  // 상단 난간
  ctx.fillStyle = '#64748b';
  if (dir === 'UP') {
    ctx.fillRect(left + 10, top + 2, w / 2 - 28, 5);
    ctx.fillRect(bld.x + 18, top + 2, w / 2 - 28, 5);
  } else {
    ctx.fillRect(left + 10, top + 2, w - 20, 5);
  }
  // 하단 난간
  if (dir === 'DOWN') {
    ctx.fillRect(left + 10, top + h - 7, w / 2 - 28, 5);
    ctx.fillRect(bld.x + 18, top + h - 7, w / 2 - 28, 5);
  } else {
    ctx.fillRect(left + 10, top + h - 7, w - 20, 5);
  }
  // 좌측 난간
  if (dir === 'LEFT') {
    ctx.fillRect(left + 2, top + 10, 5, h / 2 - 28);
    ctx.fillRect(left + 2, bld.y + 18, 5, h / 2 - 28);
  } else {
    ctx.fillRect(left + 2, top + 10, 5, h - 20);
  }
  // 우측 난간
  if (dir === 'RIGHT') {
    ctx.fillRect(left + w - 7, top + 10, 5, h / 2 - 28);
    ctx.fillRect(left + w - 7, bld.y + 18, 5, h / 2 - 28);
  } else {
    ctx.fillRect(left + w - 7, top + 10, 5, h - 20);
  }

  // 네 모서리 석조 기둥 + 입구 문주 기둥
  drawStonePillar(left + 6, top + 6);
  drawStonePillar(left + w - 6, top + 6);
  drawStonePillar(left + 6, top + h - 6);
  drawStonePillar(left + w - 6, top + h - 6);

  if (dir === 'DOWN') {
    drawStonePillar(bld.x - 19, top + h - 5);
    drawStonePillar(bld.x + 19, top + h - 5);
  } else if (dir === 'UP') {
    drawStonePillar(bld.x - 19, top + 5);
    drawStonePillar(bld.x + 19, top + 5);
  } else if (dir === 'LEFT') {
    drawStonePillar(left + 5, bld.y - 19);
    drawStonePillar(left + 5, bld.y + 19);
  } else if (dir === 'RIGHT') {
    drawStonePillar(left + w - 5, bld.y - 19);
    drawStonePillar(left + w - 5, bld.y + 19);
  }

  // 5) 회전 방향별 훈련 기구 & 왕실 군기 배치 (중앙은 비워두고 테두리 안쪽에 정갈하게 배치)
  let banner1 = { x: left + 26, y: top + 18 };
  let banner2 = { x: left + w - 26, y: top + 18 };
  let dummyPos = { x: left + 34, y: bld.y + 16 };
  let targetPos = { x: left + w - 34, y: bld.y + 14 };
  let rackPos = { x: bld.x, y: top + 24 };
  let brazier1 = { x: bld.x - 26, y: top + h - 10 };
  let brazier2 = { x: bld.x + 26, y: top + h - 10 };

  if (dir === 'UP') {
    banner1 = { x: left + 26, y: top + h - 16 };
    banner2 = { x: left + w - 26, y: top + h - 16 };
    dummyPos = { x: left + 34, y: bld.y - 14 };
    targetPos = { x: left + w - 34, y: bld.y - 16 };
    rackPos = { x: bld.x, y: top + h - 24 };
    brazier1 = { x: bld.x - 26, y: top + 10 };
    brazier2 = { x: bld.x + 26, y: top + 10 };
  } else if (dir === 'LEFT') {
    banner1 = { x: left + w - 22, y: top + 28 };
    banner2 = { x: left + w - 22, y: top + h - 24 };
    dummyPos = { x: bld.x - 14, y: top + 34 };
    targetPos = { x: bld.x - 14, y: top + h - 34 };
    rackPos = { x: left + w - 26, y: bld.y };
    brazier1 = { x: left + 10, y: bld.y - 26 };
    brazier2 = { x: left + 10, y: bld.y + 26 };
  } else if (dir === 'RIGHT') {
    banner1 = { x: left + 22, y: top + 28 };
    banner2 = { x: left + 22, y: top + h - 24 };
    dummyPos = { x: bld.x + 14, y: top + 34 };
    targetPos = { x: bld.x + 14, y: top + h - 34 };
    rackPos = { x: left + 26, y: bld.y };
    brazier1 = { x: left + w - 10, y: bld.y - 26 };
    brazier2 = { x: left + w - 10, y: bld.y + 26 };
  }

  // 무기 & 방패 거치대
  ctx.save();
  ctx.translate(rackPos.x, rackPos.y);
  ctx.fillStyle = '#451a03';
  ctx.fillRect(-16, -9, 3, 17);
  ctx.fillRect(13, -9, 3, 17);
  ctx.fillRect(-17, -6, 34, 3);
  ctx.fillRect(-17, 2, 34, 3);
  // 거치된 장검 & 창
  [-9, -3, 3, 9].forEach((wx, idx) => {
    ctx.strokeStyle = idx % 2 === 0 ? '#e2e8f0' : '#fbbf24';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(wx, -13);
    ctx.lineTo(wx, 7);
    ctx.stroke();
  });
  ctx.restore();

  // 훈련용 밀짚 허수아비 (기사 투구 장식 포함)
  ctx.save();
  ctx.translate(dummyPos.x, dummyPos.y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 9, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(0, 11);
  ctx.moveTo(-10, -4);
  ctx.lineTo(10, -4);
  ctx.stroke();
  ctx.fillStyle = '#eab308';
  ctx.strokeStyle = '#854d0e';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-6.5, -8, 13, 13, 3.5);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -13, 4.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 나무 방패 부착
  ctx.fillStyle = '#991b1b';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(-9.5, -3, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 양궁 원형 과녁판 (화살 꽂힘 디테일)
  ctx.save();
  ctx.translate(targetPos.x, targetPos.y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 11, 9, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-6, 11);
  ctx.lineTo(0, -2);
  ctx.lineTo(6, 11);
  ctx.stroke();
  ['#1e293b', '#ef4444', '#ffffff', '#ef4444', '#facc15'].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, -4, 10 - i * 1.9, 0, Math.PI * 2);
    ctx.fill();
  });
  // 명중한 화살
  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(7, -11);
  ctx.stroke();
  ctx.restore();

  // 왕실 군기 2기 & 입구 청동 화로 2기
  drawRoyalBannerStandard(ctx, banner1.x, banner1.y, t, 0);
  drawRoyalBannerStandard(ctx, banner2.x, banner2.y, t, 1.4);
  drawBronzeBrazier(ctx, brazier1.x, brazier1.y, t, 0.5);
  drawBronzeBrazier(ctx, brazier2.x, brazier2.y, t, 2.1);

  // 하단 건물 이름표
  if (bld.hideLabel) { ctx.restore(); return; }
  const dirTagMap = { DOWN: '하', UP: '상', LEFT: '좌', RIGHT: '우' };
  const label = `Lv.${bld.level || 1} ${bld.name} [${dirTagMap[dir] || dir}]`;
  ctx.font = 'bold 11.5px sans-serif';
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.beginPath();
  ctx.roundRect(bld.x - tw / 2 - 10, top + h + 8, tw + 20, 22, 6);
  ctx.fill();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bld.x, top + h + 19);

  ctx.restore();
}

window.PARADE_GROUND_BUILDING_DEF = PARADE_GROUND_BUILDING_DEF;
window.rotateParadeDirection = rotateParadeDirection;
window.getParadeGroundDimensions = getParadeGroundDimensions;
window.getParadeGroundDoorOffset = getParadeGroundDoorOffset;
window.drawMedievalParadeGround = drawMedievalParadeGround;
