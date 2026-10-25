// js/puzzles.js
// Dữ liệu các màn chơi nghịch lý logic thuần túy

const PUZZLES_DATA = [
  {
    id: 1,
    title: 'Nghịch Lý Đảo Chiều',
    subtitle: 'Parity Matrix / Inversion Switches',
    type: 'PARITY_MATRIX',
    difficulty: 'Cơ bản',
    baseXP: 150,
    optimalMoves: 4,
    description: 'Một ma trận công tắc 3x3 đối xứng. Kích hoạt một ô sẽ đảo ngược trạng thái của chính nó và các ô kề cạnh (trên, dưới, trái, phải). Hãy đưa toàn bộ 9 ô về trạng thái kích hoạt (1).',
    initialState: [1, 0, 1, 0, 1, 0, 1, 0, 1],
    targetState: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    solution: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    optimalActions: [1, 3, 5, 7],
    clues: [
      'Tiên đề 1: Lũy đẳng Modulo 2 - Gạt một công tắc 2 lần tương đương không gạt (x ⊕ x = 0).',
      'Tiên đề 2: Ô trung tâm nhận 5 tác động (chính nó + 4 cạnh). Do hiện tại đã bật (1), tổng số lần kích hoạt 4 cạnh + tâm phải là số chẵn.',
      'Tiên đề 3: Xét 4 góc: Mỗi góc chỉ nhận tác động từ chính nó và 2 ô cạnh kề.'
    ],
    hints: [
      'Chú ý tính đối xứng của bàn cờ và 4 ô góc ban đầu đều đã bật (1).',
      'Ô trung tâm (ô số 4) hiện tại đang bật. Thử không gạt ô trung tâm mà chỉ tác động vào các ô lân cận.',
      'Nghiệm tối ưu: Gạt chính xác 4 ô hình chữ thập: Trên (ô 1), Trái (ô 3), Phải (ô 5), Dưới (ô 7).'
    ]
  },
  {
    id: 2,
    title: 'Nghịch Lý Kẻ Nói Dối',
    subtitle: 'Knights & Knaves Deduction',
    type: 'KNIGHTS_KNAVES',
    difficulty: 'Trung cấp',
    baseXP: 200,
    optimalMoves: 4,
    description: '4 nhân vật A, B, C, D canh giữ 4 Cổng Logic. Hiệp sĩ (KNIGHT) luôn nói thật, Kẻ giả mạo (KNAVE) luôn nói dối. Hãy xác định chính xác danh tính của từng người.',
    characters: [
      { id: 'A', name: 'Alice', statement: 'B là kẻ giả mạo (Knave).' },
      { id: 'B', name: 'Bob', statement: 'C là kẻ giả mạo (Knave).' },
      { id: 'C', name: 'Chloe', statement: 'D là kẻ giả mạo (Knave).' },
      { id: 'D', name: 'Daniel', statement: 'Chính xác 2 trong 4 chúng tôi là kẻ giả mạo.' }
    ],
    initialState: {
      A: null,
      B: null,
      C: null,
      D: null
    },
    solution: {
      A: 'KNAVE',
      B: 'KNIGHT',
      C: 'KNAVE',
      D: 'KNIGHT'
    },
    clues: [
      'A tuyên bố: "B là kẻ giả mạo (Knave)" (A ⟺ ¬B).',
      'B tuyên bố: "C là kẻ giả mạo (Knave)" (B ⟺ ¬C).',
      'C tuyên bố: "D là kẻ giả mạo (Knave)" (C ⟺ ¬D).',
      'D tuyên bố: "Chính xác 2 trong 4 chúng tôi là kẻ giả mạo" (D ⟺ count(Knaves) == 2).'
    ],
    hints: [
      'Nếu X nói Y là Knave, thì X và Y có bản chất trái ngược nhau (một người là Knight, người kia là Knave).',
      'Vì chuỗi A ⟺ ¬B, B ⟺ ¬C, C ⟺ ¬D: A và C cùng phe, B và D cùng phe. Luôn có đúng 2 Knave và 2 Knight!',
      'Vì luôn có đúng 2 Knave, lời D nói luôn là Sự Thật. Vậy D chắc chắn là KNIGHT! Từ đó suy ra B là KNIGHT, còn A và C là KNAVE.'
    ]
  },
  {
    id: 3,
    title: 'Nghịch Lý Tự Tham Chiếu',
    subtitle: "Gödel's Autobiographical Lock",
    type: 'AUTOBIOGRAPHICAL_LOCK',
    difficulty: 'Cao cấp',
    baseXP: 250,
    optimalMoves: 6,
    description: 'Ổ khóa số gồm 4 ô [S0, S1, S2, S3]. Mỗi ô Si tuyên bố số lần chữ số i xuất hiện trong toàn bộ 4 ô số. Hãy tìm tổ hợp thỏa mãn nghịch lý tự tham chiếu.',
    initialState: [0, 0, 0, 0],
    solution: [2, 0, 2, 0],
    targetState: [2, 0, 2, 0],
    clues: [
      'Tiên đề Bảo toàn Tần suất: Tổng giá trị S0 + S1 + S2 + S3 = 4.',
      'Tiên đề Chẵn Lẻ Gödel: Ô S0 và S2 phải có giá trị chẵn (S0, S2 ∈ {0, 2}).',
      'Quy luật Tự tham chiếu: Giá trị tại ô thứ i (0-3) phải bằng chính xác số lần chữ số i xuất hiện trong 4 ô.'
    ],
    hints: [
      'Tổng 4 chữ số phải luôn bằng 4 vì có đúng 4 vị trí trong dãy số.',
      'S0 không thể bằng 0 (vì nếu bằng 0 thì không có số 0 nào, dẫn đến mâu thuẫn). Do S0 chẵn nên S0 = 2.',
      'Khi S0 = 2, có hai số 0 ở các vị trí khác (S1=0, S3=0). Chữ số 2 xuất hiện ở S0 và chính S2. Nghiệm chuẩn xác là [2, 0, 2, 0].'
    ]
  }
];

// Helper method to retrieve puzzle by ID
PUZZLES_DATA.getById = function (id) {
  return PUZZLES_DATA.find(function (p) { return p.id === id; }) || null;
};

// Export cho cả trình duyệt (window) lẫn Node.js (module.exports)
if (typeof window !== 'undefined') {
  window.PUZZLES_DATA = PUZZLES_DATA;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PUZZLES_DATA;
  module.exports.PUZZLES_DATA = PUZZLES_DATA;
}
