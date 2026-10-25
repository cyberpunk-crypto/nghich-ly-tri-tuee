// js/gameState.js
// Game State & Storage cho Nghịch Lý Trí Tuệ (Mind Paradox)

/**
 * Module GameState
 * Quản lý XP, Ranks, Tiến trình giải đố, Nhiệm vụ (Quest Log) và LocalStorage
 */
const GameState = (function () {
  const STORAGE_KEY = 'NghichLyTriTue_SaveData';

  // Định nghĩa danh hiệu (Ranks) theo bảng điểm XP
  const RANKS = [
    { name: 'Tập sự Suy Luận', minXP: 0, nextXP: 300 },
    { name: 'Học giả Phân tích', minXP: 300, nextXP: 700 },
    { name: 'Bậc thầy Logic', minXP: 700, nextXP: 1200 },
    { name: 'Đại sư Nghịch Lý', minXP: 1200, nextXP: 1200 }
  ];

  // Danh mục nhiệm vụ hệ thống
  const QUEST_DEFINITIONS = [
    {
      id: 'quest_first_blood',
      title: 'Khai Mở Trí Tuệ',
      desc: 'Hoàn thành màn đầu tiên bất kỳ',
      rewardXP: 100
    },
    {
      id: 'quest_pure_mind',
      title: 'Tâm Trí Thuần Khiết',
      desc: 'Hoàn thành một màn bất kỳ không dùng Hint',
      rewardXP: 150
    },
    {
      id: 'quest_speed_deduction',
      title: 'Suy Luận Thần Tốc',
      desc: 'Hoàn thành Màn 1 trong đúng 4 nước đi tối ưu',
      rewardXP: 150
    },
    {
      id: 'quest_truth_seeker',
      title: 'Người Kiếm Tìm Chân Lý',
      desc: 'Vạch trần đúng toàn bộ 4 Hiệp sĩ/Kẻ giả mạo ở Màn 2 trong lần nộp đáp án đầu tiên',
      rewardXP: 150
    },
    {
      id: 'quest_godel_conqueror',
      title: 'Chinh Phục Gödel',
      desc: 'Khai mở Ổ khóa Gödel ở Màn 3',
      rewardXP: 200
    },
    {
      id: 'quest_master_rank',
      title: 'Bậc Thầy Logic',
      desc: 'Đạt danh hiệu Bậc thầy Logic (700+ XP)',
      rewardXP: 250
    }
  ];

  // Bộ nhớ đệm in-memory (fallback khi không có window.localStorage trong môi trường Node.js)
  let memoryStorage = {};

  function storageGet(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {}
    return Object.prototype.hasOwnProperty.call(memoryStorage, key) ? memoryStorage[key] : null;
  }

  function storageSet(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {}
    memoryStorage[key] = String(value);
  }

  function storageRemove(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}
    delete memoryStorage[key];
  }

  // Schema mặc định theo đặc tả mục 4.4 của GAME_SPEC.md
  function getDefaultData() {
    return {
      version: 1,
      xp: 0,
      rankIndex: 0,
      unlockedPuzzles: [1],
      completedPuzzles: [],
      puzzleStats: {
        "1": { bestMoves: null, noHintCompleted: false },
        "2": { bestMoves: null, noHintCompleted: false },
        "3": { bestMoves: null, noHintCompleted: false }
      },
      quests: {
        quest_first_blood: { completed: false, claimed: false },
        quest_pure_mind: { completed: false, claimed: false },
        quest_speed_deduction: { completed: false, claimed: false },
        quest_truth_seeker: { completed: false, claimed: false },
        quest_godel_conqueror: { completed: false, claimed: false },
        quest_master_rank: { completed: false, claimed: false }
      },
      soundEnabled: true
    };
  }

  let data = getDefaultData();

  /**
   * Tính toán thông tin Rank dựa trên tổng XP
   * @param {number} xp
   */
  function calculateRank(xp) {
    let rankIndex = 0;
    if (xp >= 1200) {
      rankIndex = 3;
    } else if (xp >= 700) {
      rankIndex = 2;
    } else if (xp >= 300) {
      rankIndex = 1;
    } else {
      rankIndex = 0;
    }

    const rank = RANKS[rankIndex];
    let progressPercent = 100;

    if (rankIndex < 3) {
      const range = rank.nextXP - rank.minXP;
      const current = xp - rank.minXP;
      progressPercent = Math.min(100, Math.max(0, Math.round((current / range) * 100)));
    }

    return {
      rankIndex: rankIndex,
      rankName: rank.name,
      nextRankXP: rank.nextXP,
      progressPercent: progressPercent
    };
  }

  /**
   * Khởi tạo: tải dữ liệu từ localStorage hoặc tạo mới schema mặc định
   */
  function init() {
    const raw = storageGet(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.xp === 'number') {
          data = Object.assign(getDefaultData(), parsed);
          // Đảm bảo quests và puzzleStats có đủ cấu trúc
          data.quests = Object.assign(getDefaultData().quests, parsed.quests || {});
          data.puzzleStats = Object.assign(getDefaultData().puzzleStats, parsed.puzzleStats || {});
          if (!Array.isArray(data.unlockedPuzzles) || data.unlockedPuzzles.length === 0) {
            data.unlockedPuzzles = [1];
          }
          if (!Array.isArray(data.completedPuzzles)) {
            data.completedPuzzles = [];
          }
        } else {
          data = getDefaultData();
        }
      } catch (e) {
        data = getDefaultData();
      }
    } else {
      data = getDefaultData();
    }

    // Cập nhật rankIndex đúng theo XP
    const rankInfo = calculateRank(data.xp);
    data.rankIndex = rankInfo.rankIndex;

    // Kiểm tra nếu XP đã đạt Bậc thầy Logic
    if (data.xp >= 700 && data.quests.quest_master_rank) {
      data.quests.quest_master_rank.completed = true;
    }

    save();
  }

  /**
   * Trả về thông tin hồ sơ người chơi
   * @returns {{ xp: number, rankName: string, rankIndex: number, nextRankXP: number, progressPercent: number }}
   */
  function getProfile() {
    const rankInfo = calculateRank(data.xp);
    return {
      xp: data.xp,
      rankName: rankInfo.rankName,
      rankIndex: rankInfo.rankIndex,
      nextRankXP: rankInfo.nextRankXP,
      progressPercent: rankInfo.progressPercent
    };
  }

  /**
   * Cộng XP và kiểm tra thăng cấp
   * @param {number} amount
   * @param {string} reason
   * @returns {{ newXP: number, leveledUp: boolean, oldRank: string, newRank: string }}
   */
  function addXP(amount, reason) {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      const currentRank = calculateRank(data.xp);
      return {
        newXP: data.xp,
        leveledUp: false,
        oldRank: currentRank.rankName,
        newRank: currentRank.rankName
      };
    }

    const oldXP = data.xp;
    const oldRankInfo = calculateRank(oldXP);

    data.xp += num;

    const newRankInfo = calculateRank(data.xp);
    data.rankIndex = newRankInfo.rankIndex;

    const leveledUp = newRankInfo.rankIndex > oldRankInfo.rankIndex;

    // Tự động kiểm tra quest_master_rank khi XP đạt 700
    if (data.xp >= 700 && data.quests.quest_master_rank && !data.quests.quest_master_rank.completed) {
      data.quests.quest_master_rank.completed = true;
    }

    save();

    return {
      newXP: data.xp,
      leveledUp: leveledUp,
      oldRank: oldRankInfo.rankName,
      newRank: newRankInfo.rankName
    };
  }

  /**
   * Hoàn thành màn chơi: tính base XP, bonus XP, cập nhật tiến trình và mở khóa màn tiếp theo
   * @param {number} puzzleId
   * @param {number} moves
   * @param {number} hintsUsed
   * @returns {{ baseXP: number, bonusXP: number, totalXP: number, newQuestsCompleted: Array<string> }}
   */
  function completePuzzle(puzzleId, moves, hintsUsed) {
    const pId = Number(puzzleId);
    const m = Number(moves) || 0;
    const h = Number(hintsUsed) || 0;

    // 1. Base XP
    let baseXP = 150;
    if (pId === 2) baseXP = 200;
    else if (pId === 3) baseXP = 250;

    // 2. Bonus XP
    let bonusXP = 0;
    // Bonus No-Hint (+100 XP)
    if (h === 0) {
      bonusXP += 100;
    }
    // Bonus Move-Efficiency (+50 XP)
    if (pId === 1 && m <= 4) {
      bonusXP += 50;
    } else if (pId === 2 && m <= 4) {
      bonusXP += 50;
    } else if (pId === 3 && m <= 6) {
      bonusXP += 50;
    }

    const totalXP = baseXP + bonusXP;

    // Cập nhật completedPuzzles
    if (!data.completedPuzzles.includes(pId)) {
      data.completedPuzzles.push(pId);
    }

    // Tự động unlock màn kế tiếp khi hoàn thành màn trước
    const nextPuzzleId = pId + 1;
    if (nextPuzzleId <= 3 && !data.unlockedPuzzles.includes(nextPuzzleId)) {
      data.unlockedPuzzles.push(nextPuzzleId);
    }

    // Cập nhật thống kê màn chơi
    if (!data.puzzleStats[pId]) {
      data.puzzleStats[pId] = { bestMoves: null, noHintCompleted: false };
    }
    const stat = data.puzzleStats[pId];
    if (stat.bestMoves === null || m < stat.bestMoves) {
      stat.bestMoves = m;
    }
    if (h === 0) {
      stat.noHintCompleted = true;
    }

    // Kiểm tra các nhiệm vụ đạt được
    const newQuestsCompleted = [];

    function markQuest(qId) {
      if (data.quests[qId] && !data.quests[qId].completed) {
        data.quests[qId].completed = true;
        newQuestsCompleted.push(qId);
      }
    }

    // quest_first_blood: Hoàn thành màn đầu tiên bất kỳ
    if (data.completedPuzzles.length > 0) {
      markQuest('quest_first_blood');
    }

    // quest_pure_mind: Hoàn thành một màn bất kỳ không dùng Hint
    if (h === 0) {
      markQuest('quest_pure_mind');
    }

    // quest_speed_deduction: Hoàn thành Màn 1 trong đúng 4 nước đi tối ưu
    if (pId === 1 && m <= 4) {
      markQuest('quest_speed_deduction');
    }

    // quest_truth_seeker: Vạch trần đúng toàn bộ 4 Hiệp sĩ/Kẻ giả mạo ở Màn 2 trong lần nộp đáp án đầu tiên
    if (pId === 2 && m <= 4) {
      markQuest('quest_truth_seeker');
    }

    // quest_godel_conqueror: Khai mở Ổ khóa Gödel ở Màn 3
    if (pId === 3) {
      markQuest('quest_godel_conqueror');
    }

    // Cộng XP cho người chơi
    addXP(totalXP, `Hoàn thành Màn ${pId}`);

    // quest_master_rank: Đạt danh hiệu Bậc thầy Logic (700+ XP)
    if (data.xp >= 700) {
      markQuest('quest_master_rank');
    }

    save();

    return {
      baseXP: baseXP,
      bonusXP: bonusXP,
      totalXP: totalXP,
      newQuestsCompleted: newQuestsCompleted
    };
  }

  /**
   * Lấy danh sách nhiệm vụ kèm trạng thái hiện tại
   * @returns {Array<{ id: string, title: string, desc: string, rewardXP: number, completed: boolean, claimed: boolean }>}
   */
  function getQuests() {
    return QUEST_DEFINITIONS.map(function (q) {
      const state = data.quests[q.id] || { completed: false, claimed: false };
      return {
        id: q.id,
        title: q.title,
        desc: q.desc,
        rewardXP: q.rewardXP,
        completed: Boolean(state.completed),
        claimed: Boolean(state.claimed)
      };
    });
  }

  /**
   * Nhận thưởng nhiệm vụ đã hoàn thành
   * @param {string} questId
   * @returns {{ success: boolean, rewardXP: number }}
   */
  function claimQuest(questId) {
    const questMeta = QUEST_DEFINITIONS.find(function (q) { return q.id === questId; });
    if (!questMeta) {
      return { success: false, rewardXP: 0 };
    }

    const questState = data.quests[questId];
    if (!questState || !questState.completed || questState.claimed) {
      return { success: false, rewardXP: 0 };
    }

    questState.claimed = true;
    addXP(questMeta.rewardXP, `Nhận thưởng nhiệm vụ: ${questMeta.title}`);
    save();

    return {
      success: true,
      rewardXP: questMeta.rewardXP
    };
  }

  /**
   * Kiểm tra màn chơi đã được mở khóa chưa
   * @param {number} puzzleId
   * @returns {boolean}
   */
  function isPuzzleUnlocked(puzzleId) {
    const pId = Number(puzzleId);
    if (pId === 1) return true;
    return data.unlockedPuzzles.includes(pId);
  }

  /**
   * Lưu dữ liệu vào storage
   */
  function save() {
    storageSet(STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Xóa dữ liệu đã lưu và khôi phục mặc định
   */
  function resetSave() {
    storageRemove(STORAGE_KEY);
    data = getDefaultData();
    save();
  }

  /**
   * Trả về bản sao dữ liệu hiện tại (cho mục đích test/debug)
   */
  function getData() {
    return JSON.parse(JSON.stringify(data));
  }

  return {
    init: init,
    getProfile: getProfile,
    addXP: addXP,
    completePuzzle: completePuzzle,
    getQuests: getQuests,
    claimQuest: claimQuest,
    isPuzzleUnlocked: isPuzzleUnlocked,
    save: save,
    resetSave: resetSave,
    getData: getData
  };
})();

// Tự động khởi tạo GameState khi nạp module
GameState.init();

// Export cho cả trình duyệt (window) lẫn Node.js (module.exports)
if (typeof window !== 'undefined') {
  window.GameState = GameState;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameState };
  module.exports.GameState = GameState;
  module.exports.default = GameState;
}
