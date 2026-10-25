/**
 * js/ui.js
 * UI Controller for "Nghịch Lý Trí Tuệ" (Mind Paradox)
 * Conforms to GAME_SPEC.md Section 6.4:
 * - DOM binding, HUD updates, Stage selector states
 * - Clue Board / Deductive Notebook rendering
 * - Modals: Victory Modal, Level Up Modal, Quest Log Modal
 * - Toast notification system
 * - Zero-asset Web Audio synthesizer for crisp sound effects
 */

const UIController = (function () {
  // Sound Synthesizer State
  let soundEnabled = true;
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, type, duration, gainVal = 0.1) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio context might fail on restricted environments
    }
  }

  function playSound(name) {
    if (!soundEnabled) return;
    switch (name) {
      case 'click':
        playTone(600, 'sine', 0.08, 0.08);
        break;
      case 'toggle':
        playTone(440, 'triangle', 0.12, 0.09);
        break;
      case 'hint':
        playTone(784, 'sine', 0.2, 0.08);
        setTimeout(() => playTone(987.77, 'sine', 0.3, 0.08), 120);
        break;
      case 'error':
        playTone(180, 'sawtooth', 0.25, 0.12);
        break;
      case 'victory':
        playTone(523.25, 'sine', 0.18, 0.1);
        setTimeout(() => playTone(659.25, 'sine', 0.18, 0.1), 150);
        setTimeout(() => playTone(783.99, 'sine', 0.22, 0.1), 300);
        setTimeout(() => playTone(1046.50, 'sine', 0.4, 0.12), 480);
        break;
      case 'levelup':
        playTone(440, 'triangle', 0.2, 0.1);
        setTimeout(() => playTone(554.37, 'triangle', 0.2, 0.1), 160);
        setTimeout(() => playTone(659.25, 'triangle', 0.2, 0.1), 320);
        setTimeout(() => playTone(880, 'sine', 0.5, 0.15), 480);
        break;
      case 'claim':
        playTone(880, 'sine', 0.12, 0.1);
        setTimeout(() => playTone(1174.66, 'sine', 0.25, 0.1), 120);
        break;
    }
  }

  /**
   * 1. Initialize DOM & Listeners
   */
  function init() {
    // Sound Toggle
    const btnSound = document.getElementById('btn-sound-toggle');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        const soundIcon = document.getElementById('sound-icon');
        if (soundIcon) {
          soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
        }
        showToast(soundEnabled ? 'Đã bật âm thanh' : 'Đã tắt âm thanh', 'info');
      });
    }

    // Quest Modal open/close
    const btnOpenQuests = document.getElementById('btn-open-quests');
    if (btnOpenQuests) {
      btnOpenQuests.addEventListener('click', () => {
        playSound('click');
        openQuestModal();
      });
    }

    const btnCloseQuest = document.getElementById('btn-close-quest-modal');
    if (btnCloseQuest) {
      btnCloseQuest.addEventListener('click', () => {
        playSound('click');
        closeQuestModal();
      });
    }

    const btnQuestClose = document.getElementById('btn-quest-close');
    if (btnQuestClose) {
      btnQuestClose.addEventListener('click', () => {
        playSound('click');
        closeQuestModal();
      });
    }

    // Level up acknowledge
    const btnLevelUpAck = document.getElementById('btn-levelup-ack');
    if (btnLevelUpAck) {
      btnLevelUpAck.addEventListener('click', () => {
        playSound('click');
        const modal = document.getElementById('levelup-modal');
        if (modal) modal.classList.add('hidden');
      });
    }

    // Modal background click to close
    const questModal = document.getElementById('quest-modal');
    if (questModal) {
      questModal.addEventListener('click', (e) => {
        if (e.target === questModal) closeQuestModal();
      });
    }

    const victoryModal = document.getElementById('victory-modal');
    if (victoryModal) {
      victoryModal.addEventListener('click', (e) => {
        if (e.target === victoryModal) victoryModal.classList.add('hidden');
      });
    }

    // Initial update
    updateHUD();
  }

  /**
   * 2. Update HUD & Top Navigation
   */
  function updateHUD() {
    if (typeof GameState === 'undefined') return;

    const profile = GameState.getProfile();
    if (!profile) return;

    // Rank Badge
    const rankNameEl = document.getElementById('hud-rank-name');
    const rankIconEl = document.getElementById('hud-rank-icon');
    const rankBadgeEl = document.getElementById('hud-rank-badge');
    if (rankNameEl) rankNameEl.textContent = profile.rankName;

    const rankIcons = ['🛡️', '📜', '🔮', '👑'];
    if (rankIconEl) {
      rankIconEl.textContent = rankIcons[profile.rankIndex] || '🛡️';
    }

    // XP Text & Fill
    const xpTextEl = document.getElementById('hud-xp-text');
    const xpFillEl = document.getElementById('hud-xp-fill');
    if (xpTextEl) {
      if (profile.nextRankXP === null || profile.nextRankXP === undefined) {
        xpTextEl.textContent = `${profile.xp} XP (MAX)`;
      } else {
        xpTextEl.textContent = `${profile.xp} / ${profile.nextRankXP} XP`;
      }
    }
    if (xpFillEl) {
      xpFillEl.style.width = `${Math.min(100, Math.max(0, profile.progressPercent))}%`;
    }

    // Quest badge notification
    const quests = GameState.getQuests ? GameState.getQuests() : [];
    const claimableCount = quests.filter(q => q.completed && !q.claimed).length;
    const badgeEl = document.getElementById('quest-badge-count');
    if (badgeEl) {
      if (claimableCount > 0) {
        badgeEl.textContent = claimableCount;
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.classList.add('hidden');
      }
    }

    // Moves and hints in Arena header
    if (typeof PuzzleEngine !== 'undefined') {
      const state = PuzzleEngine.getState ? PuzzleEngine.getState() : null;
      const puzzle = PuzzleEngine.getCurrentPuzzle ? PuzzleEngine.getCurrentPuzzle() : null;

      const movesEl = document.getElementById('arena-moves-val');
      if (movesEl && state) {
        movesEl.textContent = state.moves || 0;
      }

      const optimalEl = document.getElementById('arena-optimal-val');
      if (optimalEl && puzzle) {
        optimalEl.textContent = `≤ ${puzzle.optimalMoves || 4}`;
      }

      // Hints indicator
      const hintCountEl = document.getElementById('hint-count-indicator');
      if (hintCountEl && puzzle) {
        const totalHints = (puzzle.hints && puzzle.hints.length) ? puzzle.hints.length : 3;
        const used = state ? (state.hintsUsed || 0) : 0;
        const remaining = Math.max(0, totalHints - used);
        hintCountEl.textContent = `${remaining}/${totalHints}`;
      }
    }

    // Stage Selector Tabs statuses
    [1, 2, 3].forEach(stageId => {
      const tabEl = document.getElementById(`tab-stage-${stageId}`);
      const statusEl = document.getElementById(`tab-status-${stageId}`);
      if (!tabEl || !statusEl) return;

      const isUnlocked = GameState.isPuzzleUnlocked ? GameState.isPuzzleUnlocked(stageId) : (stageId === 1);
      
      let isCompleted = false;
      if (GameState.getData && GameState.getData().completedPuzzles) {
        isCompleted = GameState.getData().completedPuzzles.includes(stageId);
      } else if (GameState.getCompletedPuzzles) {
        isCompleted = GameState.getCompletedPuzzles().includes(stageId);
      }

      if (isCompleted) {
        statusEl.innerHTML = '<span class="status-indicator solved">✓</span>';
        tabEl.classList.remove('locked');
      } else if (isUnlocked) {
        statusEl.innerHTML = '<span class="status-indicator"></span>';
        tabEl.classList.remove('locked');
      } else {
        statusEl.innerHTML = '<span class="status-indicator">🔒</span>';
        tabEl.classList.add('locked');
      }
    });
  }

  /**
   * 3. Render Clues & Deductive Notebook
   */
  function renderClues(clues, unlockedHints = []) {
    // 1. Axioms
    const container = document.getElementById('axioms-list-container');
    if (container) {
      container.innerHTML = '';
      if (!clues || clues.length === 0) {
        container.innerHTML = '<li class="axiom-item">Không có tiên đề cho màn này.</li>';
      } else {
        clues.forEach((axiomText, idx) => {
          const li = document.createElement('li');
          li.className = 'axiom-item';
          li.innerHTML = axiomText;
          container.appendChild(li);
        });
      }
    }

    // 2. Unlocked Hints
    const hintsContainer = document.getElementById('unlocked-hints-container');
    if (hintsContainer) {
      hintsContainer.innerHTML = '';
      if (!unlockedHints || unlockedHints.length === 0) {
        hintsContainer.innerHTML = '<div class="empty-hints-notice">Chưa có manh mối nào được mở khóa. Hãy suy luận dựa trên tiên đề hoặc nhấn nút Gợi Ý.</div>';
      } else {
        unlockedHints.forEach(hintText => {
          const div = document.createElement('div');
          div.className = 'hint-item';
          div.innerHTML = `💡 <strong>Manh Mối:</strong> ${hintText}`;
          hintsContainer.appendChild(div);
        });
      }
    }

    // 3. Clear Contradiction log initially
    const contraBox = document.getElementById('contradiction-details-container');
    if (contraBox) {
      contraBox.innerHTML = '<span class="placeholder-text">Chưa phát hiện mâu thuẫn. Hệ thống sẵn sàng cho lần kiểm tra tiếp theo.</span>';
    }
  }

  /**
   * Render Contradiction details in Clue Board
   */
  function renderContradictions(details = []) {
    const contraBox = document.getElementById('contradiction-details-container');
    if (!contraBox) return;

    if (!details || details.length === 0) {
      contraBox.innerHTML = '<span class="placeholder-text">Phát hiện mâu thuẫn logic chưa xác định. Hãy rà soát lại các tiên đề.</span>';
      return;
    }

    let html = '<strong>Chi tiết mâu thuẫn được phát hiện:</strong><ul>';
    details.forEach(item => {
      html += `<li>⚠️ ${item}</li>`;
    });
    html += '</ul>';
    contraBox.innerHTML = html;
  }

  /**
   * 4. Toast Notifications
   */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠️'
    };

    toast.innerHTML = `<span style="font-weight: bold; font-size: 1.1em;">${icons[type] || 'ℹ'}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode === container) {
          container.removeChild(toast);
        }
      }, 300);
    }, 3500);
  }

  /**
   * 5. Victory Modal
   */
  function showVictoryModal(result) {
    playSound('victory');
    const modal = document.getElementById('victory-modal');
    if (!modal) return;

    const stageHeading = document.getElementById('current-stage-title');
    const vicStageName = document.getElementById('victory-stage-name');
    if (vicStageName && stageHeading) {
      vicStageName.textContent = `Bạn đã tìm ra nghiệm duy nhất của ${stageHeading.textContent}`;
    }

    // Breakdown values
    const baseXP = result.baseXP || 0;
    const bonusNoHint = result.hintsUsed === 0 ? 100 : 0;
    const bonusMoves = (result.bonusXP !== undefined && (result.bonusXP - bonusNoHint) > 0) ? (result.bonusXP - bonusNoHint) : 0;
    const totalXP = result.totalXP || (baseXP + bonusNoHint + bonusMoves);

    const baseEl = document.getElementById('vic-base-xp');
    const noHintEl = document.getElementById('vic-bonus-nohint');
    const movesEl = document.getElementById('vic-bonus-moves');
    const totalEl = document.getElementById('vic-total-xp');

    if (baseEl) baseEl.textContent = `+${baseXP} XP`;
    if (noHintEl) noHintEl.textContent = bonusNoHint > 0 ? `+${bonusNoHint} XP` : '0 XP';
    if (movesEl) movesEl.textContent = bonusMoves > 0 ? `+${bonusMoves} XP` : '0 XP';
    if (totalEl) totalEl.textContent = `+${totalXP} XP`;

    const summaryEl = document.getElementById('vic-moves-summary');
    if (summaryEl && result.moves !== undefined) {
      summaryEl.innerHTML = `Đã hoàn thành sau <strong>${result.moves} nước đi</strong>`;
    }

    modal.classList.remove('hidden');
  }

  /**
   * 6. Level Up Modal
   */
  function showLevelUpModal(rankName) {
    playSound('levelup');
    const modal = document.getElementById('levelup-modal');
    if (!modal) return;

    const rankEl = document.getElementById('levelup-rank-name');
    if (rankEl) rankEl.textContent = rankName.toUpperCase();

    const descEl = document.getElementById('levelup-rank-desc');
    const descriptions = {
      'Tập sự Suy Luận': 'Bắt đầu hành trình giải mã những bí ẩn logic.',
      'Học giả Phân tích': 'Bạn đã chứng minh khả năng giải mã các cấu trúc logic phức tạp!',
      'Bậc thầy Logic': 'Tư duy của bạn sắc bén vượt qua các nghịch lý đa chiều!',
      'Đại sư Nghịch Lý': 'Đỉnh cao trí tuệ tối thượng! Không nghịch lý nào làm khó được bạn!'
    };
    if (descEl) {
      descEl.textContent = descriptions[rankName] || 'Trí tuệ logic của bạn đã đạt đến tầm cao mới!';
    }

    modal.classList.remove('hidden');
  }

  /**
   * 7. Quest Modal
   */
  function openQuestModal() {
    renderQuestList();
    const modal = document.getElementById('quest-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function closeQuestModal() {
    const modal = document.getElementById('quest-modal');
    if (modal) modal.classList.add('hidden');
  }

  function renderQuestList() {
    const container = document.getElementById('quest-list-container');
    if (!container || typeof GameState === 'undefined') return;

    const quests = GameState.getQuests ? GameState.getQuests() : [];
    container.innerHTML = '';

    let completedCount = 0;

    quests.forEach(q => {
      if (q.completed) completedCount++;

      const item = document.createElement('div');
      item.className = `quest-item ${q.completed ? 'completed' : ''} ${q.claimed ? 'claimed' : ''}`;

      let actionHtml = '';
      if (q.claimed) {
        actionHtml = '<span class="quest-status-badge claimed">✓ ĐÃ NHẬN</span>';
      } else if (q.completed) {
        actionHtml = `<button class="btn-claim" data-quest-id="${q.id}">Nhận +${q.rewardXP} XP</button>`;
      } else {
        actionHtml = '<span class="quest-status-badge locked">Chưa đạt</span>';
      }

      item.innerHTML = `
        <div class="quest-info">
          <div class="quest-header-line">
            <span class="quest-title">${q.title}</span>
            <span class="quest-reward-pill">+${q.rewardXP} XP</span>
          </div>
          <p class="quest-desc">${q.desc}</p>
        </div>
        <div class="quest-action">
          ${actionHtml}
        </div>
      `;

      container.appendChild(item);
    });

    // Bind Claim Buttons
    container.querySelectorAll('.btn-claim').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const questId = e.currentTarget.getAttribute('data-quest-id');
        if (!questId) return;

        const res = GameState.claimQuest(questId);
        if (res && res.success) {
          playSound('claim');
          showToast(`Nhận thành công +${res.rewardXP} XP!`, 'success');
          updateHUD();
          renderQuestList();
        }
      });
    });

    // Summary count
    const summaryEl = document.getElementById('quest-completion-summary');
    if (summaryEl) {
      summaryEl.textContent = `Đã hoàn thành: ${completedCount} / ${quests.length}`;
    }
  }

  return {
    init,
    updateHUD,
    renderClues,
    renderContradictions,
    showToast,
    showVictoryModal,
    showLevelUpModal,
    openQuestModal,
    closeQuestModal,
    renderQuestList,
    playSound
  };
})();
