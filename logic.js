// js/logic.js
// Core Logic Engine cho Nghịch Lý Trí Tuệ (Mind Paradox)

/**
 * Module PuzzleEngine
 * Quản lý trạng thái logic và kiểm tra nghiệm chứng minh cho từng màn chơi
 */
const PuzzleEngine = (function () {
  // Lấy nguồn dữ liệu PUZZLES_DATA từ scope hiện tại hoặc môi trường Node/Browser
  function getPuzzlesSource() {
    if (typeof PUZZLES_DATA !== 'undefined') {
      return PUZZLES_DATA;
    }
    if (typeof window !== 'undefined' && window.PUZZLES_DATA) {
      return window.PUZZLES_DATA;
    }
    try {
      const required = require('./puzzles');
      return required.PUZZLES_DATA || required;
    } catch (e) {
      return [];
    }
  }

  let currentPuzzle = null;
  let currentState = null;

  /**
   * Khởi tạo màn chơi (1, 2, hoặc 3), reset lượt đi, cờ hint
   * @param {number} puzzleId 
   */
  function init(puzzleId) {
    const id = typeof puzzleId === 'undefined' ? 1 : Number(puzzleId);
    let puzzles = getPuzzlesSource();
    if (puzzles && puzzles.PUZZLES_DATA) {
      puzzles = puzzles.PUZZLES_DATA;
    }
    const list = Array.isArray(puzzles) ? puzzles : (puzzles ? Object.values(puzzles) : []);
    const puzzle = list.find(function (p) { return p && (p.id === id || p.id === puzzleId); });

    if (!puzzle) {
      throw new Error('Puzzle not found with id: ' + puzzleId);
    }

    currentPuzzle = puzzle;

    // Khởi tạo state tương ứng từng loại màn
    if (puzzle.id === 1 || puzzle.type === 'PARITY_MATRIX') {
      currentState = {
        values: Array.isArray(puzzle.initialState) ? puzzle.initialState.slice() : [1, 0, 1, 0, 1, 0, 1, 0, 1],
        moves: 0,
        hintsUsed: 0
      };
    } else if (puzzle.id === 2 || puzzle.type === 'KNIGHTS_KNAVES') {
      currentState = {
        assignments: Object.assign({}, puzzle.initialState || { A: null, B: null, C: null, D: null }),
        moves: 0,
        hintsUsed: 0
      };
    } else if (puzzle.id === 3 || puzzle.type === 'AUTOBIOGRAPHICAL_LOCK') {
      currentState = {
        digits: Array.isArray(puzzle.initialState) ? puzzle.initialState.slice() : [0, 0, 0, 0],
        moves: 0,
        hintsUsed: 0
      };
    } else {
      currentState = {
        moves: 0,
        hintsUsed: 0
      };
    }
  }

  /**
   * Trả về thông tin meta của màn (id, title, type, optimalMoves, clues, hints)
   * @returns {Object|null}
   */
  function getCurrentPuzzle() {
    if (!currentPuzzle) return null;
    return {
      id: currentPuzzle.id,
      title: currentPuzzle.title,
      subtitle: currentPuzzle.subtitle || '',
      type: currentPuzzle.type,
      optimalMoves: currentPuzzle.optimalMoves,
      clues: currentPuzzle.clues ? currentPuzzle.clues.slice() : [],
      hints: currentPuzzle.hints ? currentPuzzle.hints.slice() : [],
      description: currentPuzzle.description || '',
      baseXP: currentPuzzle.baseXP || 0,
      characters: currentPuzzle.characters ? currentPuzzle.characters.slice() : []
    };
  }

  /**
   * Trả về state tương tác hiện tại
   * Màn 1: { values: Array<number>(9), moves: number, hintsUsed: number }
   * Màn 2: { assignments: { A, B, C, D }, moves: number, hintsUsed: number }
   * Màn 3: { digits: Array<number>(4), moves: number, hintsUsed: number }
   * @returns {Object}
   */
  function getState() {
    if (!currentState) return null;

    if (currentState.values) {
      return {
        values: currentState.values.slice(),
        moves: currentState.moves,
        hintsUsed: currentState.hintsUsed
      };
    }

    if (currentState.assignments) {
      return {
        assignments: Object.assign({}, currentState.assignments),
        moves: currentState.moves,
        hintsUsed: currentState.hintsUsed
      };
    }

    if (currentState.digits) {
      return {
        digits: currentState.digits.slice(),
        moves: currentState.moves,
        hintsUsed: currentState.hintsUsed
      };
    }

    return Object.assign({}, currentState);
  }

  /**
   * Thực hiện hành động tương tác:
   * - Màn 1: action = { type: 'TOGGLE_SWITCH', payload: { index: number } } (0..8)
   * - Màn 2: action = { type: 'SET_ROLE', payload: { character: 'A'|'B'|'C'|'D', role: 'KNIGHT'|'KNAVE' } }
   * - Màn 3: action = { type: 'CHANGE_DIGIT', payload: { index: number, delta: number } } (delta = +1 hoặc -1)
   * Tự động tăng biến moves. Trả về true nếu hợp lệ.
   * @param {{ type: string, payload: any }} action
   * @returns {boolean}
   */
  function interact(action) {
    if (!action || !action.type || !currentState) {
      return false;
    }

    const payload = action.payload || {};

    switch (action.type) {
      case 'TOGGLE_SWITCH': {
        const idx = typeof payload.index === 'string' ? parseInt(payload.index, 10) : payload.index;
        if (typeof idx !== 'number' || isNaN(idx) || idx < 0 || idx > 8 || !Number.isInteger(idx)) {
          return false;
        }
        if (!currentState.values) return false;

        const row = Math.floor(idx / 3);
        const col = idx % 3;

        // Ma trận 3x3: Đảo trạng thái ô hiện tại và các ô kề cạnh (trên, dưới, trái, phải)
        const targets = [idx];
        if (row > 0) targets.push(idx - 3); // Trên
        if (row < 2) targets.push(idx + 3); // Dưới
        if (col > 0) targets.push(idx - 1); // Trái
        if (col < 2) targets.push(idx + 1); // Phải

        for (let i = 0; i < targets.length; i++) {
          const t = targets[i];
          currentState.values[t] = currentState.values[t] === 1 ? 0 : 1;
        }

        currentState.moves++;
        return true;
      }

      case 'SET_ROLE': {
        if (!payload.character || !currentState.assignments) return false;
        const char = String(payload.character).toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(char)) return false;

        let role = payload.role;
        if (role !== null && role !== undefined) {
          role = String(role).toUpperCase();
          if (role !== 'KNIGHT' && role !== 'KNAVE') return false;
        } else {
          role = null;
        }

        currentState.assignments[char] = role;
        currentState.moves++;
        return true;
      }

      case 'CHANGE_DIGIT': {
        const idx = typeof payload.index === 'string' ? parseInt(payload.index, 10) : payload.index;
        if (typeof idx !== 'number' || isNaN(idx) || idx < 0 || idx > 3 || !Number.isInteger(idx)) {
          return false;
        }
        if (!currentState.digits) return false;

        const val = typeof payload.value === 'string' ? parseInt(payload.value, 10) : payload.value;
        const delta = typeof payload.delta === 'string' ? parseInt(payload.delta, 10) : payload.delta;

        if (typeof val === 'number' && !isNaN(val) && Number.isInteger(val)) {
          currentState.digits[idx] = ((val % 4) + 4) % 4;
        } else if (typeof delta === 'number' && !isNaN(delta) && Number.isInteger(delta)) {
          currentState.digits[idx] = ((currentState.digits[idx] + delta) % 4 + 4) % 4;
        } else {
          return false;
        }

        currentState.moves++;
        return true;
      }

      default:
        return false;
    }
  }

  /**
   * Khôi phục câu đố về trạng thái khởi điểm ban đầu
   */
  function reset() {
    if (!currentPuzzle) return;
    init(currentPuzzle.id);
  }

  /**
   * Mở khóa gợi ý tiếp theo, tăng hintsUsed
   * @returns {{ success: boolean, hintText: string, hintsRemaining: number }}
   */
  function useHint() {
    if (!currentPuzzle || !currentState) {
      return { success: false, hintText: 'Chưa khởi tạo màn chơi.', hintsRemaining: 0 };
    }

    const hints = currentPuzzle.hints || [];
    if (currentState.hintsUsed < hints.length) {
      const hintText = hints[currentState.hintsUsed];
      currentState.hintsUsed++;
      const hintsRemaining = hints.length - currentState.hintsUsed;
      return {
        success: true,
        hintText: hintText,
        hintsRemaining: hintsRemaining
      };
    }

    return {
      success: false,
      hintText: hints.length > 0 ? hints[hints.length - 1] : 'Không còn gợi ý nào khác.',
      hintsRemaining: 0
    };
  }

  /**
   * Kiểm tra trạng thái hiện tại so với nghiệm chứng minh logic.
   * Trả về solved: true nếu đúng 100%; solved: false kèm danh sách mâu thuẫn (details)
   * @returns {{ solved: boolean, message: string, details: Array<string> }}
   */
  function checkSolution() {
    if (!currentPuzzle || !currentState) {
      return { solved: false, message: 'Chưa khởi tạo màn chơi.', details: ['Không có dữ liệu màn chơi.'] };
    }

    // --- MÀN 1: NGHỊCH LÝ ĐẢO CHIỀU (PARITY MATRIX) ---
    if (currentPuzzle.id === 1 || currentPuzzle.type === 'PARITY_MATRIX') {
      const values = currentState.values;
      const offIndices = [];

      for (let i = 0; i < values.length; i++) {
        if (values[i] !== 1) {
          offIndices.push(i);
        }
      }

      if (offIndices.length === 0) {
        return {
          solved: true,
          message: 'Nghịch lý đảo chiều đã được hóa giải hoàn toàn! Toàn bộ 9 ô công tắc đã đồng bộ phát sáng.',
          details: []
        };
      }

      const details = offIndices.map(function (idx) {
        const row = Math.floor(idx / 3) + 1;
        const col = (idx % 3) + 1;
        return `Công tắc ô #${idx} (hàng ${row}, cột ${col}) vẫn đang tắt (0).`;
      });

      return {
        solved: false,
        message: `Ma trận chưa đồng bộ. Còn ${offIndices.length} công tắc đang ở trạng thái tắt.`,
        details: details
      };
    }

    // --- MÀN 2: NGHỊCH LÝ KẺ NÓI DỐI (KNIGHTS & KNAVES) ---
    if (currentPuzzle.id === 2 || currentPuzzle.type === 'KNIGHTS_KNAVES') {
      const assignments = currentState.assignments;
      const unassigned = ['A', 'B', 'C', 'D'].filter(function (c) {
        return assignments[c] !== 'KNIGHT' && assignments[c] !== 'KNAVE';
      });

      if (unassigned.length > 0) {
        return {
          solved: false,
          message: 'Chưa hoàn tất gán nhãn cho tất cả nhân vật.',
          details: unassigned.map(function (c) { return `Nhân vật ${c} chưa được phân định vai trò (Hiệp sĩ hoặc Kẻ giả mạo).`; })
        };
      }

      const details = [];

      // Phát biểu của A: "B là kẻ giả mạo (Knave)" <=> (A === KNIGHT <=> B === KNAVE)
      const aSaysTrue = assignments.B === 'KNAVE';
      const aIsKnight = assignments.A === 'KNIGHT';
      if (aIsKnight !== aSaysTrue) {
        if (aIsKnight) {
          details.push('Mâu thuẫn với A: A là Hiệp sĩ (nói thật) nhưng tuyên bố "B là KNAVE", trong khi bạn gán B là KNIGHT.');
        } else {
          details.push('Mâu thuẫn với A: A là Kẻ giả mạo (nói dối) nhưng tuyên bố "B là KNAVE", trong khi thực tế B đúng là KNAVE.');
        }
      }

      // Phát biểu của B: "C là kẻ giả mạo (Knave)" <=> (B === KNIGHT <=> C === KNAVE)
      const bSaysTrue = assignments.C === 'KNAVE';
      const bIsKnight = assignments.B === 'KNIGHT';
      if (bIsKnight !== bSaysTrue) {
        if (bIsKnight) {
          details.push('Mâu thuẫn với B: B là Hiệp sĩ (nói thật) nhưng tuyên bố "C là KNAVE", trong khi bạn gán C là KNIGHT.');
        } else {
          details.push('Mâu thuẫn với B: B là Kẻ giả mạo (nói dối) nhưng tuyên bố "C là KNAVE", trong khi thực tế C đúng là KNAVE.');
        }
      }

      // Phát biểu của C: "D là kẻ giả mạo (Knave)" <=> (C === KNIGHT <=> D === KNAVE)
      const cSaysTrue = assignments.D === 'KNAVE';
      const cIsKnight = assignments.C === 'KNIGHT';
      if (cIsKnight !== cSaysTrue) {
        if (cIsKnight) {
          details.push('Mâu thuẫn với C: C là Hiệp sĩ (nói thật) nhưng tuyên bố "D là KNAVE", trong khi bạn gán D là KNIGHT.');
        } else {
          details.push('Mâu thuẫn với C: C là Kẻ giả mạo (nói dối) nhưng tuyên bố "D là KNAVE", trong khi thực tế D đúng là KNAVE.');
        }
      }

      // Phát biểu của D: "Chính xác 2 trong 4 chúng tôi là kẻ giả mạo"
      const knavesCount = ['A', 'B', 'C', 'D'].filter(function (c) { return assignments[c] === 'KNAVE'; }).length;
      const dSaysTrue = knavesCount === 2;
      const dIsKnight = assignments.D === 'KNIGHT';
      if (dIsKnight !== dSaysTrue) {
        if (dIsKnight) {
          details.push(`Mâu thuẫn với D: D là Hiệp sĩ (nói thật) nhưng có ${knavesCount} KNAVE (D tuyên bố có chính xác 2 KNAVE).`);
        } else {
          details.push(`Mâu thuẫn với D: D là Kẻ giả mạo (nói dối) nhưng thực tế có chính xác 2 KNAVE (lời D nói lại thành sự thật).`);
        }
      }

      if (details.length === 0) {
        return {
          solved: true,
          message: 'Chính xác tuyệt đối! Hệ thống logic nhất quán: A=KNAVE, B=KNIGHT, C=KNAVE, D=KNIGHT.',
          details: []
        };
      }

      return {
        solved: false,
        message: 'Phát hiện mâu thuẫn logic trong hệ thống lời khai!',
        details: details
      };
    }

    // --- MÀN 3: NGHỊCH LÝ TỰ THAM CHIẾU (GÖDEL'S AUTOBIOGRAPHICAL LOCK) ---
    if (currentPuzzle.id === 3 || currentPuzzle.type === 'AUTOBIOGRAPHICAL_LOCK') {
      const digits = currentState.digits;
      const details = [];

      // 1. Tiên đề Bảo toàn Tần suất: S0 + S1 + S2 + S3 = 4
      const sum = digits.reduce(function (acc, val) { return acc + val; }, 0);
      if (sum !== 4) {
        details.push(`Vi phạm Tiên đề Bảo toàn Tần suất: Tổng 4 chữ số là ${sum} (yêu cầu tổng = 4).`);
      }

      // 2. Tiên đề Chẵn Lẻ Gödel: S0 và S2 phải chẵn (0 hoặc 2)
      if (digits[0] % 2 !== 0) {
        details.push(`Vi phạm Tiên đề Chẵn Lẻ Gödel: Ô S0 mang giá trị ${digits[0]} (yêu cầu phải là số chẵn: 0 hoặc 2).`);
      }
      if (digits[2] % 2 !== 0) {
        details.push(`Vi phạm Tiên đề Chẵn Lẻ Gödel: Ô S2 mang giá trị ${digits[2]} (yêu cầu phải là số chẵn: 0 hoặc 2).`);
      }

      // 3. Quy luật Tự tham chiếu: Ô Si phải bằng số lần chữ số i xuất hiện trong 4 ô
      for (let i = 0; i < 4; i++) {
        const actualCount = digits.filter(function (d) { return d === i; }).length;
        if (digits[i] !== actualCount) {
          details.push(`Mâu thuẫn tại ô S${i}: Đang đặt giá trị ${digits[i]}, nhưng chữ số ${i} xuất hiện ${actualCount} lần.`);
        }
      }

      if (details.length === 0) {
        return {
          solved: true,
          message: 'Khóa Gödel mở thành công! Dãy số tự tham chiếu hoàn hảo [2, 0, 2, 0].',
          details: []
        };
      }

      return {
        solved: false,
        message: 'Ổ khóa Gödel chưa mở: Tồn tại mâu thuẫn tự tham chiếu hoặc vi phạm tiên đề!',
        details: details
      };
    }

    return {
      solved: false,
      message: 'Màn chơi không xác định.',
      details: []
    };
  }

  return {
    init: init,
    getCurrentPuzzle: getCurrentPuzzle,
    getState: getState,
    interact: interact,
    reset: reset,
    useHint: useHint,
    checkSolution: checkSolution
  };
})();

// Export cho cả trình duyệt (window) lẫn Node.js (module.exports)
if (typeof window !== 'undefined') {
  window.PuzzleEngine = PuzzleEngine;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PuzzleEngine };
  module.exports.PuzzleEngine = PuzzleEngine;
  module.exports.default = PuzzleEngine;
}
