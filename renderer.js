/**
 * js/renderer.js
 * Canvas 2D Renderer for "Nghịch Lý Trí Tuệ" (Mind Paradox)
 * Conforms to GAME_SPEC.md Section 6.3:
 * - Retina HD high-DPI scaling via devicePixelRatio
 * - Stage 1: 3x3 Parity Matrix with rounded glowing switches
 * - Stage 2: 4 Knights & Knaves character cards with toggle badges
 * - Stage 3: Gödel Autobiographical lock dials with +/- buttons and live validation
 * - Particle fireworks celebration system
 * - Error shake effect
 */

const UIRenderer = (function () {
  let canvas = null;
  let ctx = null;
  let dpr = 1;

  // Stored state for re-rendering during particle animation
  let currentType = null;
  let currentState = null;
  let currentHovered = null;

  // Particle System
  let particles = [];
  let isCelebrationActive = false;
  let celebrationEndTime = 0;

  // Shake / Error pulse state
  let isErrorShaking = false;
  let errorEndTime = 0;

  // Layout geometries cache for fast hit-testing
  const layout = {
    stage1: {
      startX: 158,
      startY: 83,
      cellSize: 84,
      gap: 16
    },
    stage2: {
      cards: [
        { char: 'A', name: 'Alice (A)', quote: '“B là kẻ giả mạo (Knave).”', x: 20, y: 65, w: 270, h: 160 },
        { char: 'B', name: 'Bob (B)', quote: '“C là kẻ giả mạo (Knave).”', x: 310, y: 65, w: 270, h: 160 },
        { char: 'C', name: 'Chloe (C)', quote: '“D là kẻ giả mạo (Knave).”', x: 20, y: 245, w: 270, h: 160 },
        { char: 'D', name: 'Daniel (D)', quote: '“Chính xác 2 trong 4 chúng tôi là kẻ giả mạo.”', x: 310, y: 245, w: 270, h: 160 }
      ]
    },
    stage3: {
      startX: 45,
      startY: 80,
      dialW: 105,
      gap: 30,
      labels: ['Ô S₀', 'Ô S₁', 'Ô S₂', 'Ô S₃'],
      subtexts: ['Đếm số chữ số 0', 'Đếm số chữ số 1', 'Đếm số chữ số 2', 'Đếm số chữ số 3']
    }
  };

  /**
   * Helper: Draw rounded rectangle
   */
  function roundRect(context, x, y, width, height, radius) {
    if (typeof radius === 'number') {
      radius = { tl: radius, tr: radius, br: radius, bl: radius };
    }
    context.beginPath();
    context.moveTo(x + radius.tl, y);
    context.lineTo(x + width - radius.tr, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    context.lineTo(x + width, y + height - radius.br);
    context.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    context.lineTo(x + radius.bl, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    context.lineTo(x, y + radius.tl);
    context.quadraticCurveTo(x, y, x + radius.tl, y);
    context.closePath();
  }

  /**
   * Determine stage category from puzzleType or puzzleState
   */
  function detectStage(puzzleType, puzzleState) {
    if (puzzleType === 1 || puzzleType === '1' || puzzleType === 'PARITY_MATRIX' || (puzzleState && puzzleState.values)) {
      return 1;
    }
    if (puzzleType === 2 || puzzleType === '2' || puzzleType === 'KNIGHTS_KNAVES' || (puzzleState && puzzleState.assignments)) {
      return 2;
    }
    if (puzzleType === 3 || puzzleType === '3' || puzzleType === 'GODEL_LOCK' || puzzleType === 'AUTOBIOGRAPHICAL_LOCK' || (puzzleState && puzzleState.digits)) {
      return 3;
    }
    return 1;
  }

  /**
   * 1. Initialize Canvas & Retina Scaling
   */
  function init(canvasElement) {
    if (!canvasElement) return;
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    dpr = window.devicePixelRatio || 1;

    // Retina HD 600x450
    canvas.width = 600 * dpr;
    canvas.height = 450 * dpr;
    canvas.style.width = '600px';
    canvas.style.height = '450px';

    ctx.scale(dpr, dpr);
  }

  /**
   * 2. Main Render Method
   */
  function render(puzzleType, puzzleState, hoveredElement) {
    if (!ctx) return;
    currentType = puzzleType;
    currentState = puzzleState;
    currentHovered = hoveredElement;

    // Clear background
    ctx.clearRect(0, 0, 600, 450);

    // Deep Canvas backdrop
    ctx.fillStyle = '#090e1a';
    ctx.fillRect(0, 0, 600, 450);

    // Draw subtle grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    for (let x = 30; x < 600; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 450);
      ctx.stroke();
    }
    for (let y = 30; y < 450; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(600, y);
      ctx.stroke();
    }

    const stageNum = detectStage(puzzleType, puzzleState);

    if (stageNum === 1) {
      renderStage1(puzzleState, hoveredElement);
    } else if (stageNum === 2) {
      renderStage2(puzzleState, hoveredElement);
    } else if (stageNum === 3) {
      renderStage3(puzzleState, hoveredElement);
    }

    // Render transient error flash vignette if active
    if (isErrorShaking && Date.now() < errorEndTime) {
      ctx.save();
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, 594, 444);
      ctx.restore();
    }

    // Render active particles
    if (particles.length > 0) {
      renderParticles();
    }
  }

  /**
   * =========================================================================
   * STAGE 1: Parity Matrix (3x3 switches)
   * =========================================================================
   */
  function renderStage1(state, hovered) {
    const values = (state && state.values) ? state.values : [1, 0, 1, 0, 1, 0, 1, 0, 1];
    const { startX, startY, cellSize, gap } = layout.stage1;

    // Top Header Banner
    ctx.save();
    ctx.font = 'bold 13px "Outfit", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '1px';
    ctx.fillText('MA TRẬN ĐẢO CHIỀU MODULO 2 (PARITY MATRIX)', 300, 34);

    ctx.font = '12px "Outfit", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Quy luật: Gạt 1 công tắc sẽ đảo trạng thái của chính nó và 4 ô kề cạnh (Hình dấu +)', 300, 56);
    ctx.restore();

    // Check hovered cell to highlight cross neighbors
    let hoveredIdx = (hovered && hovered.type === 'switch') ? hovered.index : -1;
    let neighbors = [];
    if (hoveredIdx >= 0) {
      const hr = Math.floor(hoveredIdx / 3);
      const hc = hoveredIdx % 3;
      neighbors.push(hoveredIdx);
      if (hr > 0) neighbors.push((hr - 1) * 3 + hc); // Top
      if (hr < 2) neighbors.push((hr + 1) * 3 + hc); // Bottom
      if (hc > 0) neighbors.push(hr * 3 + (hc - 1)); // Left
      if (hc < 2) neighbors.push(hr * 3 + (hc + 1)); // Right
    }

    // Draw 3x3 switches
    let activeCount = 0;
    for (let i = 0; i < 9; i++) {
      const r = Math.floor(i / 3);
      const c = i % 3;
      const x = startX + c * (cellSize + gap);
      const y = startY + r * (cellSize + gap);
      const val = values[i] || 0;
      if (val === 1) activeCount++;

      const isHovered = (hoveredIdx === i);
      const isNeighbor = neighbors.includes(i) && !isHovered;

      ctx.save();
      // Cell Shadow / Glow
      if (val === 1) {
        ctx.shadowColor = 'rgba(6, 182, 212, 0.75)';
        ctx.shadowBlur = isHovered ? 24 : 16;
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8;
      }

      // Base Background
      roundRect(ctx, x, y, cellSize, cellSize, 14);
      if (val === 1) {
        const grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
        grad.addColorStop(0, '#06b6d4');
        grad.addColorStop(1, '#0e7490');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = isHovered ? '#1e293b' : '#131b2e';
      }
      ctx.fill();

      // Border
      ctx.shadowBlur = 0;
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      if (val === 1) {
        ctx.strokeStyle = '#67e8f9';
      } else if (isHovered) {
        ctx.strokeStyle = '#38bdf8';
      } else if (isNeighbor) {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
        ctx.setLineDash([4, 4]);
      } else {
        ctx.strokeStyle = '#25334e';
      }
      ctx.stroke();
      ctx.restore();

      // Inner Symbol / Number
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;

      if (val === 1) {
        // Glowing Center Core
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#a5f3fc';
        ctx.shadowBlur = 10;
        ctx.fill();

        // Label "1" or Icon
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        ctx.fillStyle = '#0891b2';
        ctx.shadowBlur = 0;
        ctx.fillText('1', cx, cy + 1);
      } else {
        // Inactive Ring
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.strokeStyle = isHovered ? '#64748b' : '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 16px "JetBrains Mono", monospace';
        ctx.fillStyle = isHovered ? '#94a3b8' : '#475569';
        ctx.fillText('0', cx, cy + 1);
      }

      // Small cell index tag in corner
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = val === 1 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(148, 163, 184, 0.4)';
      ctx.fillText(`[${i}]`, x + 16, y + 14);

      ctx.restore();
    }

    // Bottom Status Bar
    ctx.save();
    ctx.font = '600 13px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = activeCount === 9 ? '#34d399' : '#cbd5e1';
    ctx.fillText(`Lõi Kích Hoạt: ${activeCount} / 9 ${activeCount === 9 ? '(ĐÃ ĐẠT NGHIỆM TỐI ƯU!)' : ''}`, 300, 396);

    // Indicator Dots
    for (let d = 0; d < 9; d++) {
      const dotX = 300 - (4 * 16) + (d * 16);
      ctx.beginPath();
      ctx.arc(dotX, 416, 4, 0, Math.PI * 2);
      ctx.fillStyle = values[d] === 1 ? '#06b6d4' : '#1e293b';
      ctx.fill();
      if (values[d] === 1) {
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * =========================================================================
   * STAGE 2: Knights & Knaves (4 Characters)
   * =========================================================================
   */
  function renderStage2(state, hovered) {
    const assignments = (state && state.assignments) ? state.assignments : { A: null, B: null, C: null, D: null };
    const { cards } = layout.stage2;

    // Header Banner
    ctx.save();
    ctx.font = 'bold 13px "Outfit", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '1px';
    ctx.fillText('4 CỔNG CHÂN TRỊ: HIỆP SĨ & KẺ GIẢ MẠO', 300, 30);

    ctx.font = '12px "Outfit", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Bấm vào Thẻ nhân vật hoặc Nút để chuyển vai trò: [HIỆP SĨ] ↔ [KẺ GIẢ MẠO]', 300, 48);
    ctx.restore();

    cards.forEach((card) => {
      const role = assignments[card.char] || null;
      const isHovered = (hovered && hovered.type === 'character' && hovered.character === card.char);

      ctx.save();

      // Card Background
      roundRect(ctx, card.x, card.y, card.w, card.h, 12);
      ctx.fillStyle = isHovered ? '#1a243d' : '#131b2e';
      ctx.fill();

      // Card Border & Glow
      ctx.lineWidth = isHovered ? 2 : 1;
      if (role === 'KNIGHT') {
        ctx.strokeStyle = isHovered ? '#34d399' : 'rgba(16, 185, 129, 0.4)';
        if (isHovered) {
          ctx.shadowColor = 'rgba(16, 185, 129, 0.3)';
          ctx.shadowBlur = 12;
        }
      } else if (role === 'KNAVE') {
        ctx.strokeStyle = isHovered ? '#fb7185' : 'rgba(244, 63, 94, 0.4)';
        if (isHovered) {
          ctx.shadowColor = 'rgba(244, 63, 94, 0.3)';
          ctx.shadowBlur = 12;
        }
      } else {
        ctx.strokeStyle = isHovered ? '#6366f1' : '#1e293b';
      }
      ctx.stroke();
      ctx.restore();

      // Avatar Icon Circle
      ctx.save();
      const avatarX = card.x + 28;
      const avatarY = card.y + 28;
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, 16, 0, Math.PI * 2);
      if (role === 'KNIGHT') {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.strokeStyle = '#10b981';
      } else if (role === 'KNAVE') {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
        ctx.strokeStyle = '#f43f5e';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = '#334155';
      }
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      // Avatar Emoji/Symbol
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = role === 'KNIGHT' ? '🛡️' : (role === 'KNAVE' ? '🎭' : '👤');
      ctx.fillText(icon, avatarX, avatarY + 1);

      // Character Name
      ctx.font = 'bold 14px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(card.name, card.x + 54, card.y + 28);
      ctx.restore();

      // Statement Speech Box
      ctx.save();
      const quoteX = card.x + 14;
      const quoteY = card.y + 54;
      const quoteW = card.w - 28;
      const quoteH = 46;

      roundRect(ctx, quoteX, quoteY, quoteW, quoteH, 8);
      ctx.fillStyle = 'rgba(9, 14, 26, 0.6)';
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = 'italic 11.5px "Outfit", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Multi-line quote formatting
      if (card.char === 'D') {
        ctx.fillText('“Chính xác 2 trong 4 chúng tôi', quoteX + 8, quoteY + 8);
        ctx.fillText('là kẻ giả mạo.”', quoteX + 8, quoteY + 24);
      } else {
        ctx.fillText(card.quote, quoteX + 8, quoteY + 14);
      }
      ctx.restore();

      // Role Selection Badge Button
      ctx.save();
      const btnX = card.x + 14;
      const btnY = card.y + 110;
      const btnW = card.w - 28;
      const btnH = 36;

      roundRect(ctx, btnX, btnY, btnW, btnH, 8);
      if (role === 'KNIGHT') {
        ctx.fillStyle = '#064e3b';
        ctx.strokeStyle = '#10b981';
      } else if (role === 'KNAVE') {
        ctx.fillStyle = '#4c0519';
        ctx.strokeStyle = '#f43f5e';
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#334155';
      }
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      // Badge Text
      ctx.font = 'bold 12px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (role === 'KNIGHT') {
        ctx.fillStyle = '#6ee7b7';
        ctx.fillText('🛡️ VAI TRÒ: HIỆP SĨ (KNIGHT)', btnX + btnW / 2, btnY + btnH / 2);
      } else if (role === 'KNAVE') {
        ctx.fillStyle = '#fda4af';
        ctx.fillText('🎭 VAI TRÒ: KẺ GIẢ MẠO (KNAVE)', btnX + btnW / 2, btnY + btnH / 2);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('❓ CHƯA CHỌN (Nhấn để gán vai trò)', btnX + btnW / 2, btnY + btnH / 2);
      }
      ctx.restore();
    });

    // Bottom Hint / Summary
    ctx.save();
    let assignedCount = Object.values(assignments).filter(Boolean).length;
    ctx.font = '600 12px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = assignedCount === 4 ? '#38bdf8' : '#64748b';
    ctx.fillText(`Đã xác định: ${assignedCount} / 4 nhân vật. Nhấn "Kiểm tra Đáp án" sau khi hoàn tất.`, 300, 426);
    ctx.restore();
  }

  /**
   * =========================================================================
   * STAGE 3: Gödel Autobiographical Lock (4 Dials)
   * =========================================================================
   */
  function renderStage3(state, hovered) {
    const digits = (state && state.digits) ? state.digits : [0, 0, 0, 0];
    const { startX, startY, dialW, gap, labels, subtexts } = layout.stage3;

    // Header Banner
    ctx.save();
    ctx.font = 'bold 13px "Outfit", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '1px';
    ctx.fillText('Ổ KHÓA TỰ THAM CHIẾU GÖDEL (AUTOBIOGRAPHICAL LOCK)', 300, 30);

    ctx.font = '12px "Outfit", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Mỗi ô Si tuyên bố số lần chữ số i xuất hiện trong toàn bộ 4 ô [S₀, S₁, S₂, S₃]', 300, 48);
    ctx.restore();

    // Calculate real occurrences of 0, 1, 2, 3
    const counts = [0, 0, 0, 0];
    let sum = 0;
    digits.forEach(d => {
      if (d >= 0 && d <= 3) counts[d]++;
      sum += d;
    });

    for (let i = 0; i < 4; i++) {
      const x = startX + i * (dialW + gap);
      const y = startY;
      const val = digits[i];
      const isConsistent = (counts[i] === val);

      // Dial Container Card
      ctx.save();
      roundRect(ctx, x, y, dialW, 230, 12);
      ctx.fillStyle = '#131b2e';
      ctx.fill();
      ctx.strokeStyle = isConsistent ? 'rgba(16, 185, 129, 0.4)' : '#1e293b';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Top Label
      ctx.save();
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#22d3ee';
      ctx.fillText(labels[i], x + dialW / 2, y + 26);
      ctx.restore();

      // Button: Increment (+)
      const isPlusHovered = (hovered && hovered.type === 'digit_btn' && hovered.index === i && hovered.delta === 1);
      const btnPlusY = y + 42;
      ctx.save();
      roundRect(ctx, x + 16, btnPlusY, dialW - 32, 30, 6);
      ctx.fillStyle = isPlusHovered ? '#1e293b' : '#0e1525';
      ctx.fill();
      ctx.strokeStyle = isPlusHovered ? '#38bdf8' : '#25334e';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isPlusHovered ? '#38bdf8' : '#94a3b8';
      ctx.fillText('+', x + dialW / 2, btnPlusY + 15);
      ctx.restore();

      // Central Display Box
      const boxY = y + 80;
      ctx.save();
      roundRect(ctx, x + 16, boxY, dialW - 32, 56, 8);
      ctx.fillStyle = '#090e1a';
      ctx.fill();
      ctx.strokeStyle = isConsistent ? '#10b981' : '#06b6d4';
      ctx.lineWidth = 2;
      ctx.shadowColor = isConsistent ? 'rgba(16, 185, 129, 0.4)' : 'rgba(6, 182, 212, 0.3)';
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Value text
      ctx.shadowBlur = 0;
      ctx.font = 'bold 32px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(val.toString(), x + dialW / 2, boxY + 28);
      ctx.restore();

      // Button: Decrement (-)
      const isMinusHovered = (hovered && hovered.type === 'digit_btn' && hovered.index === i && hovered.delta === -1);
      const btnMinusY = y + 144;
      ctx.save();
      roundRect(ctx, x + 16, btnMinusY, dialW - 32, 30, 6);
      ctx.fillStyle = isMinusHovered ? '#1e293b' : '#0e1525';
      ctx.fill();
      ctx.strokeStyle = isMinusHovered ? '#38bdf8' : '#25334e';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isMinusHovered ? '#38bdf8' : '#94a3b8';
      ctx.fillText('−', x + dialW / 2, btnMinusY + 15);
      ctx.restore();

      // Subtext Meaning
      ctx.save();
      ctx.font = '11px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(subtexts[i], x + dialW / 2, y + 195);

      // Real vs Claimed indicator
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      if (isConsistent) {
        ctx.fillStyle = '#34d399';
        ctx.fillText(`✓ Thực tế: ${counts[i]}`, x + dialW / 2, y + 214);
      } else {
        ctx.fillStyle = '#f43f5e';
        ctx.fillText(`✗ Thực tế: ${counts[i]}`, x + dialW / 2, y + 214);
      }
      ctx.restore();
    }

    // Bottom Validation Status Bar
    ctx.save();
    const statusY = 330;
    roundRect(ctx, 45, statusY, 510, 95, 10);
    ctx.fillStyle = '#131b2e';
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Summary checks
    ctx.font = 'bold 12px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('KIỂM TRA TIÊN ĐỀ GÖDEL THỜI GIAN THỰC:', 65, statusY + 24);

    // 1. Sum Check
    ctx.font = '12px "JetBrains Mono", monospace';
    const isSumValid = (sum === 4);
    ctx.fillStyle = isSumValid ? '#34d399' : '#f59e0b';
    ctx.fillText(`1. Tổng tần suất (S₀+S₁+S₂+S₃): ${sum} / 4 ${isSumValid ? '✓ [ĐẠT]' : '✗ [CHƯA ĐẠT]'}`, 65, statusY + 46);

    // 2. Parity Check
    const isS0Even = (digits[0] % 2 === 0);
    const isS2Even = (digits[2] % 2 === 0);
    const isParityValid = isS0Even && isS2Even;
    ctx.fillStyle = isParityValid ? '#34d399' : '#f59e0b';
    ctx.fillText(`2. Tiên đề chẵn lẻ: S₀=${digits[0]} (${isS0Even ? 'Chẵn' : 'Lẻ'}), S₂=${digits[2]} (${isS2Even ? 'Chẵn' : 'Lẻ'}) ${isParityValid ? '✓ [ĐẠT]' : '✗ [CHƯA ĐẠT]'}`, 65, statusY + 68);

    // 3. Self-Consistency Check
    const allConsistent = counts.every((c, idx) => c === digits[idx]);
    if (allConsistent && isSumValid && isParityValid) {
      ctx.fillStyle = '#34d399';
      ctx.fillText('★ Ổ KHÓA HOÀN TOÀN TỰ NHẤT QUÁN! NHẤN KIỂM TRA ĐÁP ÁN.', 65, statusY + 86);
    }
    ctx.restore();
  }

  /**
   * =========================================================================
   * 3. Coordinate Hit-Testing
   * =========================================================================
   */
  function getClickedElement(mouseX, mouseY, puzzleType) {
    const stageNum = detectStage(puzzleType, currentState);

    // Stage 1: Switches
    if (stageNum === 1) {
      const { startX, startY, cellSize, gap } = layout.stage1;
      for (let i = 0; i < 9; i++) {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const x = startX + c * (cellSize + gap);
        const y = startY + r * (cellSize + gap);
        if (mouseX >= x && mouseX <= x + cellSize && mouseY >= y && mouseY <= y + cellSize) {
          return { type: 'switch', index: i };
        }
      }
      return null;
    }

    // Stage 2: Character Cards
    if (stageNum === 2) {
      const { cards } = layout.stage2;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (mouseX >= card.x && mouseX <= card.x + card.w && mouseY >= card.y && mouseY <= card.y + card.h) {
          return { type: 'character', character: card.char };
        }
      }
      return null;
    }

    // Stage 3: Gödel Dial Buttons
    if (stageNum === 3) {
      const { startX, startY, dialW, gap } = layout.stage3;
      for (let i = 0; i < 4; i++) {
        const x = startX + i * (dialW + gap);
        const y = startY;

        // Button +
        const btnPlusY = y + 42;
        if (mouseX >= x + 16 && mouseX <= x + dialW - 16 && mouseY >= btnPlusY && mouseY <= btnPlusY + 30) {
          return { type: 'digit_btn', index: i, delta: 1 };
        }

        // Button -
        const btnMinusY = y + 144;
        if (mouseX >= x + 16 && mouseX <= x + dialW - 16 && mouseY >= btnMinusY && mouseY <= btnMinusY + 30) {
          return { type: 'digit_btn', index: i, delta: -1 };
        }
      }
      return null;
    }

    return null;
  }

  /**
   * =========================================================================
   * 4. Particle Celebration System
   * =========================================================================
   */
  function triggerCelebration() {
    isCelebrationActive = true;
    celebrationEndTime = Date.now() + 2500;
    particles = [];

    const colors = ['#06b6d4', '#22d3ee', '#10b981', '#34d399', '#f59e0b', '#fbbf24', '#6366f1', '#a855f7', '#ffffff'];
    const launchPoints = [
      { x: 150, y: 400 },
      { x: 300, y: 380 },
      { x: 450, y: 400 }
    ];

    launchPoints.forEach(pt => {
      for (let i = 0; i < 45; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
        const speed = 4 + Math.random() * 8;
        particles.push({
          x: pt.x,
          y: pt.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 3 + Math.random() * 5,
          alpha: 1.0,
          decay: 0.012 + Math.random() * 0.015,
          gravity: 0.14,
          shape: Math.random() > 0.5 ? 'circle' : 'square',
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.2
        });
      }
    });

    requestAnimationFrame(animateCelebration);
  }

  function animateCelebration() {
    if (!isCelebrationActive) return;

    // Re-render base scene
    render(currentType, currentState, currentHovered);

    if (Date.now() > celebrationEndTime || particles.length === 0) {
      isCelebrationActive = false;
      particles = [];
      render(currentType, currentState, currentHovered);
      return;
    }

    requestAnimationFrame(animateCelebration);
  }

  function renderParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.alpha -= p.decay;
      p.rotation += p.vRot;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
  }

  /**
   * =========================================================================
   * 5. Error Shake Effect
   * =========================================================================
   */
  function triggerErrorShake() {
    isErrorShaking = true;
    errorEndTime = Date.now() + 450;

    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) {
      wrapper.classList.remove('shake-error');
      // Reflow
      void wrapper.offsetWidth;
      wrapper.classList.add('shake-error');
      setTimeout(() => {
        wrapper.classList.remove('shake-error');
        isErrorShaking = false;
        render(currentType, currentState, currentHovered);
      }, 450);
    }

    render(currentType, currentState, currentHovered);
  }

  return {
    init,
    render,
    getClickedElement,
    triggerCelebration,
    triggerErrorShake
  };
})();
