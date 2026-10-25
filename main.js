/**
 * js/main.js
 * Bootstrap & Coordination for "Nghịch Lý Trí Tuệ" (Mind Paradox)
 * Connects PuzzleEngine, GameState, UIRenderer, and UIController
 */

(function () {
  let currentStageId = 1;
  let unlockedHintsByStage = { 1: [], 2: [], 3: [] };

  const stageTitles = {
    1: { tag: 'MÀN 1', title: 'Nghịch Lý Đảo Chiều' },
    2: { tag: 'MÀN 2', title: 'Nghịch Lý Kẻ Nói Dối' },
    3: { tag: 'MÀN 3', title: 'Nghịch Lý Tự Tham Chiếu' }
  };

  /**
   * Safe helper to get puzzle info
   */
  function getPuzzleMeta() {
    if (typeof PuzzleEngine !== 'undefined' && PuzzleEngine.getCurrentPuzzle) {
      return PuzzleEngine.getCurrentPuzzle();
    }
    return { id: currentStageId, type: currentStageId, optimalMoves: 4, clues: [], hints: [] };
  }

  /**
   * Safe helper to get puzzle state
   */
  function getPuzzleState() {
    if (typeof PuzzleEngine !== 'undefined' && PuzzleEngine.getState) {
      return PuzzleEngine.getState();
    }
    return {};
  }

  /**
   * Load and initialize a stage
   */
  function loadStage(stageId) {
    currentStageId = stageId;

    if (typeof PuzzleEngine !== 'undefined' && PuzzleEngine.init) {
      PuzzleEngine.init(stageId);
    }

    // Update Stage Header
    const tagEl = document.getElementById('current-stage-tag');
    const titleEl = document.getElementById('current-stage-title');
    if (tagEl && stageTitles[stageId]) tagEl.textContent = stageTitles[stageId].tag;
    if (titleEl && stageTitles[stageId]) titleEl.textContent = stageTitles[stageId].title;

    // Update Stage Nav Tabs active state
    [1, 2, 3].forEach(id => {
      const tab = document.getElementById(`tab-stage-${id}`);
      if (tab) {
        if (id === stageId) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      }
    });

    const puzzle = getPuzzleMeta();
    const puzzleType = puzzle.type || stageId;

    // Update Clue Board
    UIController.renderClues(puzzle.clues, unlockedHintsByStage[stageId] || []);

    // Update HUD stats
    UIController.updateHUD();

    // Render Canvas
    UIRenderer.render(puzzleType, getPuzzleState(), null);
  }

  /**
   * DOM Ready entrypoint
   */
  window.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize GameState
    if (typeof GameState !== 'undefined' && GameState.init) {
      GameState.init();
    }

    // 2. Initialize Canvas & Renderer
    const canvas = document.getElementById('game-canvas');
    if (canvas && typeof UIRenderer !== 'undefined') {
      UIRenderer.init(canvas);
    }

    // 3. Initialize UI Controller
    if (typeof UIController !== 'undefined') {
      UIController.init();
    }

    // 4. Load initial Stage
    loadStage(1);

    // =========================================================================
    // CANVAS INTERACTION EVENTS
    // =========================================================================
    if (canvas) {
      function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = 600 / rect.width;
        const scaleY = 450 / rect.height;
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY
        };
      }

      // Mouse Move (Hover effects)
      canvas.addEventListener('mousemove', (e) => {
        const { x, y } = getCanvasCoords(e);
        const puzzle = getPuzzleMeta();
        const puzzleType = puzzle.type || currentStageId;
        const hovered = UIRenderer.getClickedElement(x, y, puzzleType);

        canvas.style.cursor = hovered ? 'pointer' : 'default';
        UIRenderer.render(puzzleType, getPuzzleState(), hovered);
      });

      // Mouse Leave
      canvas.addEventListener('mouseleave', () => {
        const puzzle = getPuzzleMeta();
        const puzzleType = puzzle.type || currentStageId;
        canvas.style.cursor = 'default';
        UIRenderer.render(puzzleType, getPuzzleState(), null);
      });

      // Canvas Click
      canvas.addEventListener('click', (e) => {
        const { x, y } = getCanvasCoords(e);
        const puzzle = getPuzzleMeta();
        const puzzleType = puzzle.type || currentStageId;
        const clicked = UIRenderer.getClickedElement(x, y, puzzleType);

        if (!clicked || typeof PuzzleEngine === 'undefined') return;

        let handled = false;

        // Stage 1: Toggle Switch
        if (clicked.type === 'switch') {
          handled = PuzzleEngine.interact({
            type: 'TOGGLE_SWITCH',
            payload: { index: clicked.index }
          });
          UIController.playSound('toggle');
        }
        // Stage 2: Cycle Character Role
        else if (clicked.type === 'character') {
          const state = getPuzzleState();
          const curRole = state.assignments ? state.assignments[clicked.character] : null;
          let nextRole = 'KNIGHT';
          if (curRole === 'KNIGHT') nextRole = 'KNAVE';
          else if (curRole === 'KNAVE') nextRole = 'KNIGHT';

          handled = PuzzleEngine.interact({
            type: 'SET_ROLE',
            payload: { character: clicked.character, role: nextRole }
          });
          UIController.playSound('toggle');
        }
        // Stage 3: Gödel Dial Delta (+ / -)
        else if (clicked.type === 'digit_btn') {
          handled = PuzzleEngine.interact({
            type: 'CHANGE_DIGIT',
            payload: { index: clicked.index, delta: clicked.delta }
          });
          UIController.playSound('click');
        }

        // Re-render and update HUD
        if (handled !== false) {
          UIController.updateHUD();
          UIRenderer.render(puzzleType, getPuzzleState(), clicked);
        }
      });
    }

    // =========================================================================
    // STAGE SELECTOR TABS
    // =========================================================================
    [1, 2, 3].forEach(stageId => {
      const tab = document.getElementById(`tab-stage-${stageId}`);
      if (tab) {
        tab.addEventListener('click', () => {
          UIController.playSound('click');
          const isUnlocked = typeof GameState !== 'undefined' && GameState.isPuzzleUnlocked ?
            GameState.isPuzzleUnlocked(stageId) : (stageId === 1);

          if (isUnlocked) {
            loadStage(stageId);
          } else {
            UIController.playSound('error');
            UIController.showToast(`Màn ${stageId} chưa được mở khóa! Vui lòng hoàn thành màn trước.`, 'warning');
          }
        });
      }
    });

    // =========================================================================
    // CONTROL BUTTONS
    // =========================================================================

    // 1. Verify Solution Button
    const btnVerify = document.getElementById('btn-verify');
    if (btnVerify) {
      btnVerify.addEventListener('click', () => {
        if (typeof PuzzleEngine === 'undefined') return;

        const result = PuzzleEngine.checkSolution ? PuzzleEngine.checkSolution() : { solved: false, message: 'Lỗi kiểm tra.' };
        const puzzle = getPuzzleMeta();
        const state = getPuzzleState();

        if (result.solved) {
          // Solved successfully!
          let completionResult = { baseXP: 150, bonusXP: 0, totalXP: 150, newQuestsCompleted: [] };
          if (typeof GameState !== 'undefined' && GameState.completePuzzle) {
            completionResult = GameState.completePuzzle(currentStageId, state.moves, state.hintsUsed);
          }

          // Trigger particle celebration
          UIRenderer.triggerCelebration();

          // Prepare victory data
          completionResult.moves = state.moves || 0;
          completionResult.hintsUsed = state.hintsUsed || 0;

          // Check for level up
          const oldRank = GameState.getProfile ? GameState.getProfile().rankName : '';
          
          UIController.showToast(result.message || 'Chứng minh hoàn tất! Nghiệm duy nhất đã được xác thực.', 'success');
          UIController.showVictoryModal(completionResult);
          UIController.updateHUD();

          // Check level up modal trigger if rank changed
          const newProfile = GameState.getProfile ? GameState.getProfile() : null;
          if (newProfile && oldRank && newProfile.rankName !== oldRank) {
            setTimeout(() => {
              UIController.showLevelUpModal(newProfile.rankName);
            }, 1200);
          }
        } else {
          // Logic Contradiction detected
          UIRenderer.triggerErrorShake();
          UIController.playSound('error');
          UIController.showToast(result.message || 'Mâu thuẫn logic phát hiện! Nghiệm chưa chính xác.', 'error');
          UIController.renderContradictions(result.details || []);
        }
      });
    }

    // 2. Hint Button
    const btnHint = document.getElementById('btn-hint');
    if (btnHint) {
      btnHint.addEventListener('click', () => {
        if (typeof PuzzleEngine === 'undefined' || !PuzzleEngine.useHint) return;

        const hintRes = PuzzleEngine.useHint();
        if (hintRes.success) {
          UIController.playSound('hint');
          UIController.showToast(`Gợi Ý Mới: ${hintRes.hintText}`, 'info');

          if (!unlockedHintsByStage[currentStageId]) {
            unlockedHintsByStage[currentStageId] = [];
          }
          unlockedHintsByStage[currentStageId].push(hintRes.hintText);

          const puzzle = getPuzzleMeta();
          UIController.renderClues(puzzle.clues, unlockedHintsByStage[currentStageId]);
          UIController.updateHUD();
        } else {
          UIController.playSound('error');
          UIController.showToast(hintRes.hintText || 'Đã hết gợi ý cho màn chơi này!', 'warning');
        }
      });
    }

    // 3. Reset Button
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (typeof PuzzleEngine !== 'undefined' && PuzzleEngine.reset) {
          PuzzleEngine.reset();
        }
        UIController.playSound('click');
        UIController.showToast('Đã khôi phục câu đố về trạng thái khởi điểm.', 'info');

        const puzzle = getPuzzleMeta();
        UIController.updateHUD();
        UIRenderer.render(puzzle.type || currentStageId, getPuzzleState(), null);

        // Reset contradiction box
        UIController.renderClues(puzzle.clues, unlockedHintsByStage[currentStageId] || []);
      });
    }

    // 4. Modal Victory Actions
    const btnNextStage = document.getElementById('btn-next-stage');
    if (btnNextStage) {
      btnNextStage.addEventListener('click', () => {
        UIController.playSound('click');
        const modal = document.getElementById('victory-modal');
        if (modal) modal.classList.add('hidden');

        if (currentStageId < 3) {
          loadStage(currentStageId + 1);
        } else {
          UIController.showToast('Chúc mừng bạn đã chinh phục toàn bộ 3 màn Nghịch Lý Trí Tuệ!', 'success');
          loadStage(1);
        }
      });
    }

    const btnReplay = document.getElementById('btn-replay-stage');
    if (btnReplay) {
      btnReplay.addEventListener('click', () => {
        UIController.playSound('click');
        const modal = document.getElementById('victory-modal');
        if (modal) modal.classList.add('hidden');
        loadStage(currentStageId);
      });
    }
  });
})();
