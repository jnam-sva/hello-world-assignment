// ===== 1. 도안 (설계도에 쓸 그림) =====

const PX = 3; // 도안 1칸 = 화면 3×3 픽셀
const STRIDE = 24; // 이만큼(px) 걸을 때마다 다리 그림을 바꿈 (클수록 느긋한 걸음)

const PALETTE = {
  o: '#0b0b0f', // 외곽선
  b: '#2a2833', // 검은 털
  y: '#fbd00d', // 노란 눈
  w: '#ffffff', // 눈 반짝임
  k: '#ffffff', // 양말 (기본: 흰색)
  v: '#a8a6b3', // 수염
  p: '#e88a9a', // 분홍 코
  s: '#3f6b2a', // 식물 줄기
  l: '#8cc152', // 식물 잎
  d: '#b3a45c', // 시든 잎 (1분 넘게 혼자일 때)
  t: '#f2667f', // 혀 (코보다 진한 분홍)
};

// 몸통: 두 걸음 그림에서 똑같이 쓰는 위쪽 부분
const BODY = [
  '.............................', // (빈 줄 3개: 곧게 세운 꼬리가 올라갈 자리)
  '.............................',
  '.............................',
  '...ooo.......................', // 꼬리 끝: 물음표 윗부분
  '..obbbo......................', // 꼬리가 오른쪽으로 둥글게 넘어감
  '.obooobo.....................', // 물음표 갈고리
  '.obo.obo.........ll.ll.......', // 갈고리 + 머리 위 새싹 잎
  '.obo.obo..........lsl........', // 갈고리 + 머리 위 새싹
  '.obo..o.......o....s....o....', // 둥근 꼬리 끝 + 귀 끝
  '.obo..s......obo...s...obo...', // 꼬리 끝에 매달린 새싹 줄기 + 귀
  '.obo.l.l.....opbo..s..obpo...', // 새싹 잎 + 귀 (p = 분홍 귀 속)
  '.obo.........obbbooooobbbo...', // 정수리
  '.obo.........obbbbbbbbbbbo...', // (꼬리: 외곽선-털-외곽선 3칸)
  '.obo.........obbwybbbwybbo...', // 반짝이는 눈 (w = 하이라이트)
  '.obo.........obbyybbbyybbo...', // 눈
  '.obo.........obbbbbpbbbbbo...', // 코 (수염은 drawWhiskers()에서 선으로)
  '.obo.........obbbbbbbbbbbo...', // 주둥이 (코 아래, 수염 자리)
  '.obo..........obbbbbbbbbo....', // 갸름한 턱
  '.oooooooooooooooooooooooo....', // 등 + 턱 (머리/몸 경계)
  '.ooobbbbbbbbbbbbbbbbbbbo.....', // 몸통
  '..oobbbbbbbbbbbbbbbbbbboo....', // 엉덩이 (1칸만 살짝 볼록)
  '...obbbbbbbbbbbbbbbbbbbbo....', // 가슴 (1칸 볼록)
  '...obbbbbbbbbbbbbbbbbbbbo....',
  '...obbbbbbbbbbbbbbbbbbbbo....',
  '....obbbbbbbbbbbbbbbbbbo.....',
  '....obbbbbbbbbbbbbbbbbbo.....',
  '....obboooboooooobooobo......', // 배 (다리 자리만 털로 열어 둠)
];

// 걸음 A: 다리를 모으고 선 자세
const LEGS_A = [
  '....obbo.obo....obo.obo......', // 뒷다리 허벅지는 넓게
  '.....obo.obo....obo.obo......', // 허벅지가 가늘어짐
  '.....oko.oko....oko.oko......', // 양말 (k = 고양이마다 다른 색)
  '.....okkookko...okkookko.....', // 발 (앞으로 1칸 길게)
  '......oo..oo.....oo..oo......', // 모서리를 깎은 둥근 발바닥
];

// 걸음 B: 다리를 벌린 자세 (위 2줄은 같고, 아래 3줄만 앞뒤로 1칸씩)
const LEGS_B = [
  '....obbo.obo....obo.obo......',
  '.....obo.obo....obo.obo......',
  '....oko...oko..oko...oko.....', // 바깥 다리는 뒤로, 안쪽 다리는 앞으로
  '....okko..okko.okko..okko....',
  '.....oo....oo...oo....oo.....',
];

// 꼬리가 있는 칸: 0~17번 줄, 0~8번 칸 (18번 줄은 등 + 꼬리 뿌리)
const TAIL_ROWS = 18;
const TAIL_COLS = 8;
// 이 줄보다 아래(뿌리 쪽)는 고정, 위쪽(물음표 끝)만 흔들림
const TAIL_BEND_ROW = 12;
// 이 칸보다 오른쪽은 물음표 갈고리와 끝 → 통째로 까딱
const TAIL_HOOK_COL = 4;
// 새싹 잎이 꼬리 끝보다 몇 프레임 늦게 따라올지 (12프레임 = 0.2초)
const SPROUT_LAG = 12;

// 걸을 때 꼬리: 도안(0~8번 칸) 안에 그리면 위로만 세울 수 있어서, 코드로 그리는 "마디 사슬"로 바꿈
// → 도안 왼쪽 바깥(몸 뒤쪽)까지 낮게 뻗고, 끝만 위로 살짝 말림
const TAIL_CHAIN_LENGTH = 12;          // 마디 수 (마디 하나 = 1칸)
const TAIL_CHAIN_ROOT = { col: 2, row: 17 }; // 꼬리 뿌리 (등선 바로 위, 도안 칸 좌표)
const TAIL_CHAIN_START = 168;          // 뿌리 쪽 방향(도): 0 = 앞, 90 = 위, 180 = 뒤 → 168 = 뒤로 거의 수평
const TAIL_CHAIN_END = 90;             // 끝 쪽 방향(도): 위로 말림
const TAIL_CHAIN_WAVE = 12;            // 걸을 때 꼬리가 물결치는 크기(도)

// 걸을 때 도안에는 꼬리를 그리지 않음 (꼬리 자리 18줄을 비움)
const NO_TAIL = [];
for (let row = 0; row < 18; row++) {
  NO_TAIL.push('.........');
}

// 중간 꼬리: 곧은 꼬리와 물음표 사이. 끝이 오른쪽으로 비스듬히 기울어짐
const LEAN_TAIL = [
  '....l.l..', // 새싹 잎
  '.....s...', // 새싹 줄기
  '.....o...', // 둥근 꼬리 끝
  '....obo..', // 한 줄 내려갈 때마다
  '...obo...', //   1칸씩 왼쪽으로
  '..obo....', //   → 비스듬한 꼬리
  '.obo.....', // 여기부터 곧은 꼬리
  '.obo.....',
  '.obo.....',
  '.obo.....',
  '.obo.....',
  '.obo.....',
  '.obo.....',
  '.obo.....',
  '.obo.....',
  '.obo.....',
  '.obo.....',
  '.obo.....',
];

// BODY를 복사한 뒤, 각 줄의 왼쪽 9칸만 주어진 꼬리로 바꾼 몸통을 돌려줌
function withTail(tail) {
  const body = BODY.slice();
  for (let row = 0; row < tail.length; row++) {
    body[row] = tail[row] + BODY[row].slice(9);
  }
  return body;
}

// 꼬리 단계별 몸통: 0 = 꼬리 없음(코드로 그리는 낮은 꼬리), 1 = 비스듬히, 2 = 물음표 (BODY에 그려진 꼬리)
const TAIL_BODIES = [withTail(NO_TAIL), withTail(LEAN_TAIL), BODY];

// 몸통을 복사한 뒤 눈 2줄만 감은 눈으로 바꿈 (꼬리 칸 0~8은 그대로 둠)
function closeEyes(body) {
  const sleepy = body.slice();
  sleepy[13] = body[13].slice(0, 9) + '....obbbbbbbbbbbo...'; // 눈 자리를 털로 덮음
  sleepy[14] = body[14].slice(0, 9) + '....obbbbbbbbbbbo...'; // (감은 눈은 show()에서 1px 선으로 그림)
  return sleepy;
}

// 시든 머리 위 새싹: 줄기가 꺾이고 잎이 아래로 처짐 (색은 show()에서 시든 색으로)
// BODY의 6~10번 줄, 17~21번 칸(5글자)만 이 그림으로 바꿈
const DROOP_SPROUT = [
  '.....', // 원래 잎이 있던 자리 → 비움
  '..ss.', // 줄기 끝이 오른쪽으로 꺾임
  '.ls.l', // 잎이 양옆으로 처짐
  '..s..',
  '..s..',
];

function droopSprout(body) {
  const sad = body.slice();
  for (let i = 0; i < DROOP_SPROUT.length; i++) {
    const row = 6 + i;
    sad[row] = body[row].slice(0, 17) + DROOP_SPROUT[i] + body[row].slice(22);
  }
  return sad;
}

// 몸을 둥글게 웅크리고 자는 그림 (다른 그림과 높이를 맞춰서 바닥 위치가 같음)
const CURL_SPRITE = [
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '......................l.l....', // 머리 위 새싹 (처음엔 파릇하게 서 있음)
  '.......................s.....',
  '.......oooooooo....o.......o.', // 등 + 귀 끝
  '.....oobbbbbbbboo.opooooooopo', // 귀 (p = 분홍 귀 속)
  '....obbbbbbbbbbbboobbbbbbbbbo',
  '...obbbbbbbbbbbbbbobbbbbbbbbo',
  '..obbbbbbbbbbbbbbbobbbbbbbbbo', // 감은 눈 자리 (선은 show()에서 1px로 그림)
  '..obbbbbbbbbbbbbbbobbbbpbbbbo', // 코 (얼굴 한가운데 23번 칸)
  '..obbbbbbbbbbbbbbbobbbbbbbbbo', // 통통한 볼
  '..obbooooooooooooooobbbbbbbo.', // 꼬리 윗선 + 둥근 볼 아래
  '...obbbbbbbbbbbbbbbbooooooo..', // 몸을 감싼 꼬리 + 턱
  '....ooooooooooooooooo........', // 바닥
];

// 앉아서 그루밍하는 그림: 머리는 서 있을 때와 같은 자리, 앞발 하나를 입가로 듦
const GROOM_SPRITE = [
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.............................',
  '.................ll.ll.......', // 머리 위 새싹 잎
  '..................lsl........',
  '..............o....s....o....',
  '.............obo...s...obo...',
  '.............opbo..s..obpo...',
  '.............obbbooooobbbo...',
  '.............obbbbbbbbbbbo...',
  '.............obbwybbbwybbo...', // 눈
  '.............obbyybbbyybbo...',
  '.............obbbbbpbbbbbo...', // 코
  '.............obbbbokkobbbo...', // 주둥이 + 핥으려고 든 앞발 (k = 양말 색)
  '..............obbbokkobbo....', // 턱 + 앞발
  '...............obbobbobo.....', // 가슴 + 든 앞다리
  '...............obbobbobo.....',
  '.........oooooobbbbbbbbo.....', // 등 시작
  '.......oobbbbbbbbbbbbbbo.....',
  '......obbbbbbbbbbbbbbbbo.....',
  '.....obbbbbbbbbbbbbbbbbo.....',
  '.....obbbbbbbbbbbbbbbbbbo....', // 가슴 (1칸 볼록)
  '....obbbbbbbbbbbbbbbbbbbo....', // 둥근 엉덩이
  '....obbbbbbbbbbbbobbbbbbo....', // 엉덩이 | 앞다리
  '....obbbbbbbbbbbbobbbbbbo....',
  '.....obbbbbbbbbbbobbbbbbo.l.l', // + 꼬리 끝 새싹 잎
  '....ooooooooooooookkokkoo.s..', // 꼬리 윗선 + 앞발
  '.....obbbbbbbbbbbbbbbbbbbo...', // 바닥을 감싼 꼬리
  '......ooooooooooooooooooo....', // 바닥
];
// 그루밍할 때 이 줄보다 위(머리 + 든 앞발)만 까딱여서 핥는 것처럼 보이게 함
const GROOM_NECK_ROW = 20;

// 핥는 순간의 그림: 든 앞발 윗부분(16번 줄, 19~20번 칸)에 혀(t)를 내밀어 얹음
const GROOM_LICK_SPRITE = GROOM_SPRITE.slice();
GROOM_LICK_SPRITE[16] = GROOM_SPRITE[16].slice(0, 19) + 'tt' + GROOM_SPRITE[16].slice(21);

// 빵굽기(꾹꾹이) 다리: 앞발을 하나씩 번갈아 들었다 놓음
const KNEAD_A = [
  '....obbo.obo....obo.obo......',
  '.....obo.obo....obo.oko......', // 앞쪽 앞발을 들어 올림
  '.....oko.oko....oko.okko.....',
  '.....okkookko...okko.oo......',
  '......oo..oo.....oo..........',
];
const KNEAD_B = [
  '....obbo.obo....obo.obo......',
  '.....obo.obo....oko.obo......', // 뒤쪽 앞발을 들어 올림
  '.....oko.oko....okkooko......',
  '.....okkookko....oo.okko.....',
  '......oo..oo.........oo......',
];

// 쓰다듬지 않고 이만큼 지나면 식물이 시듦 (60프레임 × 60 = 1분)
const WILT_TIME = 60 * 60;

// 쓰다듬어 줄 때 눈: ∩ 모양으로 웃는 눈 (13~14번 줄, 꼬리 칸 0~8은 그대로)
function happyEyes(body) {
  const happy = body.slice();
  happy[13] = body[13].slice(0, 9) + '....obbvvbbbvvbbo...'; // 눈 윗부분
  happy[14] = body[14].slice(0, 9) + '....obvbbvbvbbvbo...'; // 양 끝이 내려옴 → ∩
  return happy;
}

// 머리 위 새싹이 자라는 단계 (0 = 처음 크기). 모두 10번 줄에서 끝나고 위로 자람
// 17~21번 칸(5글자)에 그림
const SPROUT_STAGES = [
  [ // 0단계: 처음 모습
    'll.ll',
    '.lsl.',
    '..s..',
    '..s..',
    '..s..',
  ],
  [ // 1단계: 줄기가 한 칸 길어짐
    'll.ll',
    '.lsl.',
    '..s..',
    '..s..',
    '..s..',
    '..s..',
  ],
  [ // 2단계: 줄기 중간에 작은 잎이 남
    'll.ll',
    '.lsl.',
    '..s..',
    '..sl.',
    '..s..',
    '.ls..',
    '..s..',
  ],
  [ // 3단계: 맨 위에 새 잎이 하나 더
    '.l.l.',
    'll.ll',
    '.lsl.',
    '..sl.',
    '..s..',
    '.ls..',
    '..s..',
    '..s..',
  ],
];

function growSprout(sprite, level) {
  const shape = SPROUT_STAGES[level];
  const grown = sprite.slice();
  // 1) 3~10번 줄의 새싹 자리를 비움
  for (let row = 3; row <= 10; row++) {
    grown[row] = grown[row].slice(0, 17) + '.....' + grown[row].slice(22);
  }
  // 2) 이 단계의 새싹을 아래(10번 줄)부터 맞춰서 그림
  const firstRow = 11 - shape.length;
  for (let i = 0; i < shape.length; i++) {
    const row = firstRow + i;
    grown[row] = grown[row].slice(0, 17) + shape[i] + grown[row].slice(22);
  }
  return grown;
}

// 눈동자가 마우스를 따라감: 2×2 눈(13~14번 줄) 안에서 하얀 눈동자(w) 한 칸의 위치를 바꿈
// col: 0 = 도안의 왼쪽, 1 = 오른쪽 / row: 0 = 위, 1 = 아래
const LEFT_EYE_COL = 16;  // 왼쪽 눈은 16~17번 칸
const RIGHT_EYE_COL = 21; // 오른쪽 눈은 21~22번 칸

function lookEyes(sprite, col, row) {
  // 2×2 눈 한 개: 기본은 노란색, 마우스 쪽 한 칸만 하얀 눈동자 (반짝임 역할도 함)
  const eye = [['y', 'y'], ['y', 'y']];
  eye[row][col] = 'w';

  const looking = sprite.slice();
  for (let r = 0; r < 2; r++) {
    const pair = eye[r][0] + eye[r][1];
    let line = looking[13 + r];
    line = line.slice(0, LEFT_EYE_COL) + pair + line.slice(LEFT_EYE_COL + 2);
    line = line.slice(0, RIGHT_EYE_COL) + pair + line.slice(RIGHT_EYE_COL + 2);
    looking[13 + r] = line;
  }
  return looking;
}

// 귀 쫑긋: 한쪽 귀 끝(8번 줄)을 바깥으로 한 칸 옮김. side: -1 = 도안의 왼쪽 귀, 1 = 오른쪽 귀
function twitchEar(sprite, side) {
  const twitched = sprite.slice();
  const row = sprite[8];
  if (side === -1) {
    twitched[8] = row.slice(0, 13) + 'o.' + row.slice(15);   // 14번 칸 귀 끝 → 13번 칸
  } else {
    twitched[8] = row.slice(0, 24) + '.o' + row.slice(26);   // 24번 칸 귀 끝 → 25번 칸
  }
  return twitched;
}

// 쓰다듬을 때 떠오르는 작은 하트 (x = 칠하는 칸, 한 칸 = 2픽셀)
const HEART = [
  '.x.x.',
  'xxxxx',
  '.xxx.',
  '..x..',
];

// 마우스 인터랙션 설정
const NOTICE_RANGE = 110;   // 마우스가 고양이 중심에서 이 거리(px) 안에 오면 알아챔
const FORGET_RANGE = 170;   // 이보다 멀어지면 다시 알아챌 수 있게 됨
const APPROACH_SPEED = 0.5; // 마우스 쪽으로 다가가는 속도 (걷기보다 천천히)
const WATCH_RANGE = 200;    // 이 거리 안에서 마우스가 다가오는 속도를 살핌
const FAST_CLOSE = 6;       // 한 프레임에 이만큼(px) 넘게 가까워지면 "너무 빨라!" → 한 걸음 물러남
const SLOW_CLOSE = 0.3;     // 이보다 빠르고 FAST_CLOSE보다 느리면 "천천히 오네" → 기다림
const BACK_SPEED = 1.5;     // 물러나는 속도
const BODY_SPLIT_COL = 13;  // 걸을 때 이 칸보다 왼쪽(엉덩이·꼬리)과 오른쪽(머리·가슴)이 번갈아 오르내림
const GROW_TIME = 120;      // 이만큼(2초) 계속 쓰다듬을 때마다 새싹이 한 단계 자람
const STROKE_MIN = 1;       // 한 프레임에 이보다 많이(px) 옆으로 움직여야 쓰다듬는 손길로 침
const STROKE_KEEP = 40;     // 손길 방향이 한 번 바뀔 때마다 이만큼(프레임) 쓰다듬는 중으로 유지

// ===== 2. 클래스 (생물을 찍어내는 틀) =====

class Creature {
  constructor(name, x, y, speed) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.speed = speed; // 한 프레임에 몇 픽셀씩 걸을지
    this.step = 0;      // 지금까지 걸은 거리 (다리 그림을 고를 때 씀)
    this.sockColor = PALETTE.k; // 이 고양이의 양말 색 (기본: 흰색)
    this.timid = true;          // 성격: true = 조심스러움 (마우스가 빨리 오면 놀라서 물러남)

    this.energy = 100; // 기운 (0 ~ 100)
    this.tailCurl = 1; // 꼬리 말림 정도: 0 = 곧게 세움, 1 = 물음표
    this.aloneTime = 0; // 마지막으로 쓰다듬은 뒤 지난 시간 (프레임). 쓰다듬으면 0

    this.dir = 1;          // 바라보는 방향: 1 = 오른쪽, -1 = 왼쪽
    this.noticed = false;  // 마우스를 이미 알아챘는지 (멀어지면 다시 false)
    this.petTime = 0;      // 이번에 쭉 쓰다듬은 시간 (프레임)
    this.sproutLevel = 0;  // 머리 위 새싹 크기 (0 ~ 3)
    this.hearts = [];      // 떠오르는 하트들 { x, y, life }
    this.mouseClosing = 0;   // 마우스가 다가오는 속도 (px/프레임, +면 다가오는 중)
    this.strokeDir = 0;      // 마지막 손길 방향: 1 = 오른쪽, -1 = 왼쪽, 0 = 아직 없음
    this.strokeTime = 0;     // 남은 "쓰다듬는 중" 시간 (프레임). 왔다갔다 할수록 채워짐

    // 생동감을 위한 작은 움직임들
    this.moveSpeed = 0;                      // 지금 실제로 걷는 속도 (speed까지 서서히 빨라짐)
    this.blinkTimer = floor(random(60, 240)); // 다음 눈 깜빡임까지 남은 프레임
    this.blinking = 0;                       // 눈 감고 있는 남은 프레임 (깜빡이는 중이면 > 0)
    this.earTimer = 0;                       // 귀가 쫑긋한 채로 남은 프레임
    this.earSide = 1;                        // 쫑긋한 귀: -1 = 왼쪽, 1 = 오른쪽

    this.standStill(); // 기본 상태: 가만히 서서 숨쉬기
  }

  // 매 프레임 "지금 상태에 맞는 일"을 함 (world = 고양이가 사는 환경. 밤인지 알려 줌)
  update(world) {
    // ---- 마우스 인터랙션: 상태별 일보다 먼저 확인 ----
    // 1) 마우스를 고양이 위에서 왔다갔다 하면 = 쓰다듬는 중
    this.checkStroke();
    if (this.strokeTime > 0 && this.state !== 'sleep') {
      this.getPetted();
    }
    // 2) 마우스가 충분히 멀어지면 다음에 다시 알아챌 수 있게 됨
    if (this.noticed && !this.mouseWithin(FORGET_RANGE)) {
      this.noticed = false;
    }
    // 3) 마우스가 다가오는 속도에 따라: 너무 빠르면 물러나고, 천천히 오면 기다림
    this.measureMouseSpeed();
    const watching = this.state === 'idle' || this.state === 'walk' ||
                     this.state === 'notice' || this.state === 'approach' ||
                     this.state === 'wait';
    // (고양이 위에서 쓰다듬는 손길은 다가오는 걸로 치지 않음 → 쓰다듬다가 놀라서 물러나지 않게)
    // (대담한 고양이는 마우스가 어떻게 다가오든 신경 쓰지 않음 → 물러나지도, 멈춰 기다리지도 않음)
    if (this.timid && watching && this.mouseWithin(WATCH_RANGE) && !this.isUnderMouse()) {
      if (this.mouseClosing > FAST_CLOSE) {
        this.stepBack();
      } else if (this.mouseClosing > SLOW_CLOSE) {
        this.waitForMouse();
      }
    }
    // 4) 서 있거나 걷다가 마우스가 가까이 오면 멈칫
    if ((this.state === 'idle' || this.state === 'walk') &&
        !this.noticed && this.mouseWithin(NOTICE_RANGE)) {
      this.notice();
    }

    // ---- 상태별로 하는 일 ----
    if (this.state === 'idle') {
      this.energy = this.energy - 0.02; // 서 있어도 아주 조금씩 줄어듦
      if (world.isNight()) {
        this.energy = this.energy - 0.04; // 밤에는 더 빨리 졸려짐
      }
      this.timer = this.timer - 1;
      if (this.timer <= 0) {
        this.chooseNext(world); // 충분히 서 있었으면 다음에 할 일을 고름
      }
    } else if (this.state === 'walk') {
      this.move();
      this.energy = this.energy - 0.2; // 걸으면 기운이 빨리 줄어듦
      this.timer = this.timer - 1;
      if (this.timer <= 0) {
        this.standStill(); // 충분히 걸었으면 멈춰 섬
      }
    } else if (this.state === 'sleep') {
      this.energy = this.energy + 0.5; // 자면 기운이 차오름
      if (this.energy >= 100) {
        this.wakeUp();
      }
    } else if (this.state === 'groom' || this.state === 'knead') {
      this.energy = this.energy - 0.02; // 제자리에서 하는 일이라 조금만 줄어듦
      this.timer = this.timer - 1;
      if (this.timer <= 0) {
        this.standStill(); // 다 했으면 다시 서 있기
      }
    } else if (this.state === 'notice') {
      this.timer = this.timer - 1; // 멈칫한 채로 잠깐 바라봄
      if (this.timer <= 0) {
        this.state = 'approach';
      }
    } else if (this.state === 'approach') {
      this.approachMouse();
    } else if (this.state === 'retreat') {
      // 마우스 쪽을 본 채로 뒷걸음질
      this.x = constrain(this.x - BACK_SPEED * this.dir, 0, width - BODY[0].length * PX);
      this.step = this.step + BACK_SPEED;
      this.timer = this.timer - 1;
      if (this.timer <= 0) {
        this.waitForMouse(); // 물러난 뒤엔 조심스럽게 기다림
      }
    } else if (this.state === 'wait') {
      // 마우스가 천천히 오는 동안은 waitForMouse()가 timer를 다시 채움
      this.faceMouse();
      this.timer = this.timer - 1;
      if (this.timer <= 0) {
        if (this.mouseWithin(NOTICE_RANGE)) {
          this.state = 'approach'; // 마우스가 멈췄으니 이제 내가 다가감
        } else {
          this.standStill();
        }
      }
    } else if (this.state === 'happy') {
      // 쓰다듬는 동안은 getPetted()가 계속 다시 채워 줌 → 손을 떼면 줄어듦
      this.happyTimer = this.happyTimer - 1;
      if (this.happyTimer <= 0) {
        this.petTime = 0;
        this.standStill();
      }
    } else if (this.state === 'curl') {
      this.energy = min(this.energy + 0.5, 100); // 웅크리고 자는 중이라 기운이 참
      this.timer = this.timer - 1;
      if (this.timer <= 0) {
        this.standStill(); // 낮잠이 끝나면 일어남
      }
    }

    // 쓰다듬지 않은 시간은 무슨 상태든 계속 늘어남
    this.aloneTime = this.aloneTime + 1;
    if (this.isWilted()) {
      this.sproutLevel = 0; // 시들면 키워 둔 새싹도 처음 크기로
    }

    this.updateHearts();
    this.updateLittleMoves();

    // 어떤 상태든 기운이 바닥나면 잠듦
    if (this.energy <= 0 && this.state !== 'sleep' && this.state !== 'curl') {
      this.sleep();
    }

    // 꼬리는 목표 모양을 향해 조금씩 바뀜 (걸을 땐 곧게, 아니면 물음표)
    let tailTarget = 1;
    if (this.state === 'walk' || this.state === 'approach' ||
        this.state === 'notice' || this.state === 'happy' ||
        this.state === 'retreat') {
      tailTarget = 0; // 걷거나, 궁금하거나, 놀랐거나, 기분 좋을 땐 꼬리를 곧게 세움
    }
    this.tailCurl = lerp(this.tailCurl, tailTarget, 0.06);
  }

  // 꼬리 말림 정도(0~1)를 그림 번호(0, 1, 2)로 바꿈
  tailStage() {
    if (this.tailCurl < 0.33) {
      return 0; // 곧게
    }
    if (this.tailCurl < 0.66) {
      return 1; // 비스듬히
    }
    return 2;   // 물음표
  }

  standStill() {
    this.state = 'idle';
    this.timer = floor(random(120, 300)); // 2~5초 동안 서 있기
  }

  startWalking() {
    this.state = 'walk';
    this.dir = random([1, -1]); // 오른쪽이나 왼쪽 중 아무 쪽으로
    this.timer = floor(random(120, 300)); // 2~5초 동안 걷기
    this.moveSpeed = 0;         // 멈춘 상태에서 출발 → move()에서 서서히 빨라짐
  }

  sleep() {
    this.state = 'sleep';
    this.energy = 0;
  }

  wakeUp() {
    this.energy = 100;
    this.standStill(); // 깨어나면 기본 상태로
  }

  // 가만히 서 있다가 다음에 할 일 고르기
  // 배열에서 하나를 무작위로 뽑음 (여러 번 넣은 일이 더 자주 나옴)
  chooseNext(world) {
    let choices = ['walk', 'walk', 'groom', 'knead', 'curl']; // 낮: 걷기가 조금 더 자주
    if (world.isNight()) {
      choices = ['curl', 'curl', 'curl', 'groom', 'walk'];    // 밤: 웅크리고 자기가 자주
    }
    const next = random(choices);
    if (next === 'walk') {
      this.startWalking();
    } else if (next === 'groom') {
      this.startGrooming();
    } else if (next === 'knead') {
      this.startKneading();
    } else if (next === 'curl') {
      this.curlUp();
    }
  }

  // 1. 앉아서 그루밍하기 (4~6초)
  startGrooming() {
    this.state = 'groom';
    this.timer = floor(random(240, 360));
  }

  // 2. 빵굽기 (4~6초)
  startKneading() {
    this.state = 'knead';
    this.timer = floor(random(240, 360));
  }

  // 3. 몸을 웅크리고 낮잠 (8~12초)
  curlUp() {
    this.state = 'curl';
    this.timer = floor(random(480, 720));
  }

  // ---- 인터랙션 1: 마우스가 가까이 오면 멈칫했다가 천천히 다가옴 ----

  // 고양이 그림의 한가운데 (화면 좌표)
  centerX() {
    return this.x + BODY[0].length * PX / 2;
  }

  centerY() {
    return this.y + CURL_SPRITE.length * PX / 2;
  }

  // 마우스가 고양이 중심에서 range(px) 안에 있는지 (캔버스 밖이면 false)
  mouseWithin(range) {
    if (mouseX <= 0 || mouseX >= width || mouseY <= 0 || mouseY >= height) {
      return false;
    }
    return dist(mouseX, mouseY, this.centerX(), this.centerY()) < range;
  }

  // 마우스 쪽을 바라봄
  faceMouse() {
    if (mouseX < this.centerX()) {
      this.dir = -1;
    } else {
      this.dir = 1;
    }
  }

  // 멈칫: 그 자리에 멈춰서 마우스 쪽을 봄 (약 0.7초)
  notice() {
    this.noticed = true;
    this.faceMouse();
    if (!this.timid) {
      this.state = 'approach'; // 대담한 고양이: 멈칫(!) 없이 바로 다가감
      return;
    }
    this.state = 'notice';     // 조심스러운 고양이: 약 0.7초 멈칫하고 "!"
    this.timer = 40;
  }

  // (x, y)가 캔버스 안인지
  inCanvas(x, y) {
    return x > 0 && x < width && y > 0 && y < height;
  }

  // 마우스가 얼마나 빨리 다가오는지 재기
  // pmouseX/pmouseY = 지난 프레임의 마우스 위치 (p5가 자동으로 기억해 줌)
  // 고양이 자리는 그대로 두고 마우스 위치만 비교 → 고양이가 걸어가서 가까워진 건 세지 않음
  measureMouseSpeed() {
    let closing = 0;
    if (this.inCanvas(mouseX, mouseY) && this.inCanvas(pmouseX, pmouseY)) {
      const before = dist(pmouseX, pmouseY, this.centerX(), this.centerY());
      const now = dist(mouseX, mouseY, this.centerX(), this.centerY());
      closing = before - now; // 거리가 줄었으면 +
    }

    // 한 프레임 값은 들쭉날쭉해서 부드럽게 평균 냄
    this.mouseClosing = lerp(this.mouseClosing, closing, 0.3);
  }

  // 한 걸음 물러나기 (약 0.3초 동안 뒷걸음)
  stepBack() {
    if (this.state === 'retreat') {
      return; // 이미 물러나는 중
    }
    this.state = 'retreat';
    this.noticed = true;
    this.timer = 18;
    this.faceMouse(); // 마우스를 보면서 뒤로
  }

  // 천천히 기다리기: 제자리에서 마우스 쪽을 보고 기다림
  // (물러나는 중에는 update()의 watching 조건에서 빠져서 여기로 오지 않음 → 끝까지 물러남)
  waitForMouse() {
    this.state = 'wait';
    this.noticed = true;
    this.timer = 50; // 마우스가 멈추고 50프레임 지나면 다가감
    this.faceMouse();
  }

  // 눈동자가 볼 방향 (도안 기준). 마우스가 없으면 앞쪽 아래를 봄
  pupil(faceY) {
    const look = { col: 1, row: 1 };
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
      // 화면에서 마우스가 얼굴보다 오른쪽이면 +. 왼쪽을 보고 있으면(뒤집힘) 부호를 바꿔 도안 기준으로
      const dx = (mouseX - this.screenX(19.5)) * this.dir;
      if (dx < 0) {
        look.col = 0;
      }
      if (mouseY < faceY + 13.5 * PX) {
        look.row = 0;
      }
    }
    return look;
  }

  // 천천히 다가가기: 가까워지거나 마우스가 멀리 가면 멈춤
  approachMouse() {
    this.faceMouse();
    if (abs(mouseX - this.centerX()) < 30 || !this.mouseWithin(FORGET_RANGE)) {
      this.standStill();
      return;
    }
    this.x = this.x + APPROACH_SPEED * this.dir;
    this.step = this.step + APPROACH_SPEED; // 다리 그림도 걸음만큼 바뀜
  }

  // ---- 인터랙션 2, 3: 쓰다듬으면 좋아하고, 오래 쓰다듬으면 새싹이 자람 ----

  // 깜빡임, 귀 쫑긋 같은 작은 움직임의 타이머
  updateLittleMoves() {
    // 눈 깜빡임: 1~4초마다 6프레임(0.1초) 동안 눈을 감음
    if (this.blinking > 0) {
      this.blinking = this.blinking - 1;
    } else {
      this.blinkTimer = this.blinkTimer - 1;
      if (this.blinkTimer <= 0) {
        this.blinking = 6;
        this.blinkTimer = floor(random(60, 240));
      }
    }

    // 귀 쫑긋: 가만히 있을 때 가끔(1초에 약 20% 확률) 한쪽 귀가 10프레임 동안 움찔
    if (this.earTimer > 0) {
      this.earTimer = this.earTimer - 1;
    } else if ((this.state === 'idle' || this.state === 'wait') && random() < 0.004) {
      this.earTimer = 10;
      this.earSide = random([-1, 1]);
    }
  }

  // 손길 읽기: 고양이 위에서 마우스가 옆으로 움직이는 방향이 바뀔 때마다(왔다갔다) 쓰다듬는 시간을 채움
  checkStroke() {
    this.strokeTime = max(this.strokeTime - 1, 0); // 손길이 멈추면 조금씩 줄어듦

    if (!this.isUnderMouse()) {
      this.strokeDir = 0; // 고양이 밖으로 나가면 처음부터 다시
      return;
    }

    const dx = mouseX - pmouseX; // 이번 프레임에 마우스가 옆으로 움직인 양
    if (abs(dx) < STROKE_MIN) {
      return; // 거의 안 움직였으면 손길이 아님 (그냥 올려 둔 것)
    }

    let dir = 1;
    if (dx < 0) {
      dir = -1;
    }
    if (this.strokeDir !== 0 && dir !== this.strokeDir) {
      this.strokeTime = STROKE_KEEP; // 방향이 바뀜 = 한 번 "쓱-" 왔다갔다 함
    }
    this.strokeDir = dir;
  }

  // 쓰다듬는 동안 매 프레임 불림
  getPetted() {
    this.aloneTime = 0; // 식물이 다시 파릇해짐
    if (this.state !== 'happy') {
      this.state = 'happy';
      this.petTime = 0;
    }
    this.happyTimer = 45; // 손을 떼고도 0.75초는 기분 좋은 채로

    this.petTime = this.petTime + 1;
    if (this.petTime % GROW_TIME === 0 && this.sproutLevel < SPROUT_STAGES.length - 1) {
      this.sproutLevel = this.sproutLevel + 1; // 2초마다 한 단계 자람
    }

    if (frameCount % 20 === 0) {
      // 머리 위에서 하트가 하나 생겨남
      this.hearts.push({ x: this.centerX() + random(-15, 15), y: this.y + 4 * PX, life: 60 });
    }
  }

  // 하트들을 위로 띄우고, 수명이 다 된 하트는 목록에서 지움
  updateHearts() {
    for (const heart of this.hearts) {
      heart.y = heart.y - 0.5;
      heart.life = heart.life - 1;
    }
    this.hearts = this.hearts.filter((heart) => heart.life > 0);
  }

  drawHearts() {
    fill(PALETTE.p);
    for (const heart of this.hearts) {
      for (let r = 0; r < HEART.length; r++) {
        for (let c = 0; c < HEART[r].length; c++) {
          if (HEART[r][c] === 'x') {
            rect(floor(heart.x) + c * 2, floor(heart.y) + r * 2, 2, 2);
          }
        }
      }
    }
  }

  // 기분 좋을 때 골골: 몸이 1픽셀씩 떨림
  purrShake() {
    if (this.state === 'happy' && frameCount % 6 < 3) {
      return 1;
    }
    return 0;
  }

  // 도안의 칸 위치(col)를 화면 x로 바꿈. 왼쪽을 볼 때는 좌우를 뒤집음
  screenX(col) {
    const left = floor(this.x) + this.purrShake();
    if (this.dir === 1) {
      return left + col * PX;
    }
    return left + (BODY[0].length - col) * PX;
  }

  // 쓰다듬지 않은 지 1분이 넘었는지
  isWilted() {
    return this.aloneTime >= WILT_TIME;
  }

  // 그루밍: 머리와 든 앞발을 몇 픽셀 내릴지 (0.5초마다 까딱 → 핥는 모습)
  lickOffset() {
    if (frameCount % 30 < 15) {
      return 2;
    }
    return 0;
  }

  // 마우스가 이 고양이 그림 위에 있는지
  isUnderMouse() {
    const w = BODY[0].length * PX;
    const h = CURL_SPRITE.length * PX;
    return mouseX > this.x && mouseX < this.x + w &&
           mouseY > this.y && mouseY < this.y + h;
  }

  // 숨쉬기: 몸통을 몇 픽셀 내릴지 (0 또는 1)
  // 걷는 중인지 (걷기, 다가가기, 물러나기)
  isWalking() {
    return this.state === 'walk' || this.state === 'approach' || this.state === 'retreat';
  }

  // 걸을 때 몸 흔들림: col번째 칸을 몇 픽셀 내릴지 (0 ~ 2)
  // 앞(머리·가슴)과 뒤(엉덩이·꼬리)가 시소처럼 번갈아 부드럽게 오르내림
  walkRock(col) {
    if (!this.isWalking()) {
      return 0;
    }
    // 다리 A → B → A 한 바퀴(STRIDE × 2) 동안 -1 → 1 → -1 로 부드럽게 오가는 값
    const swing = sin(this.step * PI / STRIDE);
    if (col < BODY_SPLIT_COL) {
      return round(1 + swing); // 뒤쪽: 0 ~ 2픽셀
    }
    return round(1 - swing);   // 앞쪽: 뒤쪽과 반대로 0 ~ 2픽셀
  }

  breathOffset() {
    if (this.isWalking()) {
      return 0; // 걸을 때 몸 움직임은 walkRock()이 맡음
    }
    if (this.state === 'groom' || this.state === 'notice') {
      return 0; // 그루밍할 때, 멈칫했을 때는 숨쉬기 움직임 없음
    }

    let breathSpeed = 0.06;       // 서 있을 때: 약 1.7초에 한 번
    if (this.state === 'sleep' || this.state === 'curl') {
      breathSpeed = 0.03;         // 잘 때: 두 배 느리게
    }

    if (sin(frameCount * breathSpeed) > 0) {
      return 1; // 숨을 내쉴 때 몸통이 1픽셀 내려감
    }
    return 0;
  }

  // 까딱 리듬: f번째 프레임에 꼬리 끝이 얼마나 기울었는지 (0 ~ 1)
  // 3초(180프레임)마다 한 번, 처음 1초 동안 부드럽게 기울었다 돌아오고 나머지 2초는 쉼
  flickAt(f) {
    const t = f % 180;
    if (t < 0 || t >= 60) {
      return 0; // 쉬는 시간
    }
    return sin(PI * t / 60); // 0 → 1 → 0
  }

  // 꼬리 칸 하나를 옆으로 몇 픽셀 밀지
  tailSway(row, col, c) {
    // 걸을 때: 곧게 세운 꼬리 끝이 걸음에 맞춰 좌우로 살랑 (뿌리 쪽은 고정)
    let amount = 0;               // 꼬리 모양이 바뀌는 중에는 까딱이지 않음
    if (this.tailStage() !== 2) {
      return 0;
    }
    if (this.state === 'idle' || this.state === 'knead' || this.state === 'wait') {
      amount = 3;                 // 서 있을 때, 빵 구울 때, 기다릴 때: 끝이 최대 3픽셀 (1칸)
    } else if (this.state === 'sleep') {
      amount = 1;                 // 잘 때: 아주 살짝
    }

    // 새싹 잎: 한 박자(SPROUT_LAG) 전의 까딱을 따라감 → 늦게 따라 흔들림
    if (c === 'l') {
      return round(this.flickAt(frameCount - SPROUT_LAG) * amount);
    }

    // 뿌리 쪽은 거의 고정, 위로 갈수록 많이
    let bend = constrain((TAIL_BEND_ROW - row) / 7, 0, 1);
    if (col >= TAIL_HOOK_COL) {
      bend = 1; // 물음표 갈고리, 꼬리 끝, 새싹 줄기는 통째로
    }

    return round(this.flickAt(frameCount) * amount * bend);
  }

  // 낮은 꼬리의 마디 위치들 (도안 칸 좌표). 뿌리에서 한 칸씩 방향을 틀며 이어 나감
  walkTailCells() {
    let col = TAIL_CHAIN_ROOT.col;
    let row = TAIL_CHAIN_ROOT.row;
    const cells = [{ col: col, row: row }];
    for (let i = 1; i <= TAIL_CHAIN_LENGTH; i++) {
      const t = i / TAIL_CHAIN_LENGTH; // 뿌리 0 → 끝 1
      // t를 세제곱 → 대부분은 뒤로 낮게 가다가 끝부분에서만 빠르게 위로 말림
      let angle = lerp(TAIL_CHAIN_START, TAIL_CHAIN_END, t * t * t);
      // 물결: 걸음에 맞춰 흔들리되, 끝으로 갈수록 늦고(i * 0.4) 크게(× t)
      angle = angle + TAIL_CHAIN_WAVE * sin(this.step * PI / STRIDE - i * 0.4) * t;
      col = col + cos(radians(angle));
      row = row - sin(radians(angle)); // 화면은 아래가 +라서 위로 가려면 빼기
      const cell = { col: round(col), row: round(row) };
      const last = cells[cells.length - 1];
      if (cell.col !== last.col || cell.row !== last.row) {
        cells.push(cell); // 같은 칸이 연달아 나오면 한 번만
      }
    }
    return cells;
  }

  // 도안의 col번째 칸부터 span칸짜리 가로 영역의 화면 왼쪽 끝 (뒤집혀도 맞게)
  spanX(col, span) {
    if (this.dir === 1) {
      return this.screenX(col);
    }
    return this.screenX(col + span);
  }

  // 낮은 꼬리 그리기: 마디마다 3×3칸 외곽선 → 그 위에 1칸 털 → 끝에 새싹
  drawWalkTail(top) {
    const cells = this.walkTailCells();

    fill(PALETTE.o);
    for (const c of cells) {
      rect(this.spanX(c.col - 1, 3), top + (c.row - 1) * PX, 3 * PX, 3 * PX);
    }
    fill(PALETTE.b);
    for (const c of cells) {
      rect(this.spanX(c.col, 1), top + c.row * PX, PX, PX);
    }

    // 꼬리 끝 새싹: 끝 마디 위로 줄기, 그 위 양옆에 잎
    const tip = cells[cells.length - 1];
    fill(PALETTE.s);
    rect(this.spanX(tip.col, 1), top + (tip.row - 2) * PX, PX, PX);
    let leaf = PALETTE.l;
    if (this.isWilted()) {
      leaf = PALETTE.d;
    }
    fill(leaf);
    rect(this.spanX(tip.col - 1, 1), top + (tip.row - 3) * PX, PX, PX);
    rect(this.spanX(tip.col + 1, 1), top + (tip.row - 3) * PX, PX, PX);
  }

  move() {
    // 처음엔 서서히 빨라지고, 걷기가 끝나기 0.5초 전부터는 서서히 느려짐
    let targetSpeed = this.speed;
    if (this.timer < 30) {
      targetSpeed = this.speed * 0.3;
    }
    this.moveSpeed = lerp(this.moveSpeed, targetSpeed, 0.05);

    this.x = this.x + this.moveSpeed * this.dir; // dir이 -1이면 왼쪽으로
    this.step = this.step + this.moveSpeed;

    const w = BODY[0].length * PX;
    if (this.x > width) {
      this.x = -w;    // 오른쪽 끝으로 나가면 왼쪽 밖에서 다시 등장
    } else if (this.x < -w) {
      this.x = width; // 왼쪽 끝으로 나가면 오른쪽 밖에서 다시 등장
    }
  }

  show(world) {
    // 그림을 세 부분으로 골라서 조립함
    // 1) 몸통: 지금 꼬리 단계에 맞는 몸통
    let body = TAIL_BODIES[this.tailStage()];

    // 2) 눈: 자는 중이거나 빵 구울 때(기분 좋아서) 감은 눈으로
    if (this.state === 'sleep' || this.state === 'knead') {
      body = closeEyes(body);
    } else if (this.state === 'happy') {
      body = happyEyes(body); // 쓰다듬어 주면 ∩ 모양으로 웃는 눈
    }

    // 3) 다리: 걸을 때는 STRIDE마다 A ↔ B, 아니면 모은 다리
    let legs = LEGS_A;
    if (this.state === 'walk' || this.state === 'approach' || this.state === 'retreat') {
      const frameIndex = floor(this.step / STRIDE) % 2;
      legs = [LEGS_A, LEGS_B][frameIndex];
    } else if (this.state === 'knead') {
      const kneadIndex = floor(frameCount / 15) % 2; // 0.25초마다 앞발 번갈아
      legs = [KNEAD_A, KNEAD_B][kneadIndex];
    }

    let sprite = body.concat(legs);

    // 앉거나 웅크린 자세는 완전히 다른 그림 1장
    if (this.state === 'groom') {
      sprite = GROOM_SPRITE;
      if (this.lickOffset() > 0) {
        sprite = GROOM_LICK_SPRITE; // 고개를 숙인 순간에만 혀가 보임
      }
    } else if (this.state === 'curl') {
      sprite = CURL_SPRITE;
    }

    // 눈을 뜨고 있으면 눈동자가 마우스 쪽을 봄
    const eyesOpen = this.state !== 'sleep' && this.state !== 'knead' &&
                     this.state !== 'happy' && this.state !== 'curl';
    if (eyesOpen && this.blinking > 0) {
      sprite = closeEyes(sprite);  // 깜빡이는 순간엔 잠깐 감은 눈
    } else if (eyesOpen) {
      const look = this.pupil(this.y);
      sprite = lookEyes(sprite, look.col, look.row);
    }

    // 귀 쫑긋 (웅크린 그림은 귀 자리가 달라서 건너뜀)
    if (this.earTimer > 0 && this.state !== 'curl') {
      sprite = twitchEar(sprite, this.earSide);
    }

    // 4) 머리 위 새싹: 1분 넘게 혼자면 처지고, 아니면 키운 만큼 자란 모습
    //    (웅크린 그림은 새싹 자리가 달라서 건너뜀)
    if (this.state !== 'curl') {
      if (this.isWilted()) {
        sprite = droopSprout(sprite);
      } else {
        sprite = growSprout(sprite, this.sproutLevel);
      }
    }

    // 몸통은 숨쉬기만큼 내려가고, 다리는 땅에 그대로
    const bodyY = this.y + this.breathOffset();
    // 그루밍할 때 얼굴은 핥는 까딱임을 따라감
    let faceY = bodyY + this.walkRock(BODY_SPLIT_COL); // 얼굴(앞쪽)도 걸음에 맞춰 오르내림
    if (this.state === 'groom') {
      faceY = this.y + this.lickOffset();
    }

    noStroke();

    // 낮은 꼬리는 몸보다 먼저 그림 → 꼬리 뿌리가 몸 뒤로 숨음
    if (this.tailStage() === 0 && this.state !== 'groom' && this.state !== 'curl') {
      this.drawWalkTail(bodyY + this.walkRock(0)); // 엉덩이와 같이 오르내림
    }

    for (let row = 0; row < sprite.length; row++) {
      let top = this.y;           // 다리 줄
      if (this.state === 'groom') {
        if (row < GROOM_NECK_ROW) {
          top = faceY;            // 머리 + 든 앞발만 까딱
        }
      } else if (row < BODY.length || this.state === 'curl') {
        top = bodyY;              // 몸통 줄 (웅크렸을 땐 공 모양 전체가 숨쉼)
      }
      for (let col = 0; col < sprite[row].length; col++) {
        const c = sprite[row][col];
        if (c === '.') continue;
        if (c === 'k') {
          fill(this.sockColor); // 양말만 고양이마다 다른 색
        } else if (c === 'l' && this.isWilted()) {
          fill(PALETTE.d); // 1분 넘게 혼자면 잎이 시든 색
        } else {
          fill(PALETTE[c]);
        }
        // 꼬리 칸이면 옆으로 살랑
        let sway = 0;
        if (row < TAIL_ROWS && col <= TAIL_COLS) {
          sway = this.tailSway(row, col, c);
        }
        // 오른쪽을 볼 땐 칸의 왼쪽 끝, 왼쪽을 볼 땐 (뒤집혔으니) 칸의 오른쪽 끝이 기준
        let cellX = this.screenX(col);
        if (this.dir === -1) {
          cellX = this.screenX(col + 1);
        }
        // 몸통 줄이면 걸을 때 앞/뒤가 번갈아 오르내림 (다리는 땅에 그대로)
        let rock = 0;
        if (row < BODY.length) {
          rock = this.walkRock(col);
        }
        rect(cellX + sway * this.dir, top + row * PX + rock, PX, PX);
      }
    }

    if (this.state !== 'curl') {
      this.drawWhiskers(faceY); // 수염도 얼굴과 같이 움직여야 함 (웅크렸을 땐 얼굴 위치가 달라서 생략)
    }

    // 감은 눈: 잘 때, 웅크렸을 때, 빵 구울 때, 깜빡이는 순간
    const eyesClosed = this.state === 'sleep' || this.state === 'curl' || this.state === 'knead' ||
                       (eyesOpen && this.blinking > 0);
    if (eyesClosed) {
      this.drawSleepyEyes(faceY);
    }

    const w = sprite[0].length * PX;
    const h = sprite.length * PX;
    textAlign(CENTER);
    fill(world.labelColor()); // 이름표는 밝은 땅 위라 어두운 색
    text(this.name, this.x + w / 2, this.y + h + 18); // 얇아진 땅 안에 들어가게

    fill(world.textColor());  // Zz, ! 는 하늘 위라 낮엔 어둡게, 밤엔 밝게

    if (this.state === 'sleep') {
      text('Zz', this.screenX(29), bodyY + 7 * PX); // 머리 앞쪽 위
    } else if (this.state === 'curl') {
      text('Zz', this.screenX(29), bodyY + 21 * PX); // 말고 있을 땐 머리가 낮음
    } else if (this.state === 'notice') {
      text('!', this.screenX(19.5), bodyY + 3 * PX); // 멈칫! 머리 위에 느낌표
    } else if (this.state === 'retreat') {
      text('!!', this.screenX(19.5), bodyY + 3 * PX); // 깜짝! 너무 빨리 왔어
    }

    this.drawHearts();

    // 디버그: D 키를 누르면 머리 위에 지금 상태와 성격을 보여 줌 (확인용)
    if (showDebug) {
      let personality = 'timid';
      if (!this.timid) {
        personality = 'bold';
      }
      textSize(7);
      fill(world.textColor());
      text(this.state + ' / ' + personality, this.x + w / 2, this.y - 4);
      textSize(10);
    }

  }

  // 감은 눈: 도안 1칸(3px)보다 얇은 1px 가로 직선
  drawSleepyEyes(y) {
    let row = 14.5;          // 서 있는 그림: 14번 줄 한가운데
    let eyes = [16, 21];     // 왼쪽 눈 16~17번 칸, 오른쪽 눈 21~22번 칸
    if (this.state === 'curl') {
      row = 26.5;            // 웅크린 그림: 26번 줄
      eyes = [20, 25];       // 20~21번 칸, 25~26번 칸
    }

    stroke(PALETTE.v);
    strokeWeight(1);
    for (const col of eyes) {
      // 눈 하나 = 가로 직선 하나: 눈 칸 2개의 왼쪽 끝 → 오른쪽 끝
      line(this.screenX(col), y + row * PX, this.screenX(col + 2), y + row * PX);
    }
    noStroke();
  }

  // 수염은 도안 1칸(PX)보다 얇게 그리려고 rect 대신 line으로 그림
  // 숫자는 도안의 칸 번호 (16.5 = 16번 줄의 한가운데). x는 screenX()로 바꿔서 뒤집혀도 맞게
  drawWhiskers(y) {
    stroke(PALETTE.v);
    strokeWeight(1);

    // 왼쪽: 볼(15번 칸)에서 바깥쪽으로
    line(this.screenX(15), y + 16.5 * PX, this.screenX(11), y + 16.25 * PX);
    line(this.screenX(15), y + 17.5 * PX, this.screenX(11.5), y + 17.75 * PX);

    // 오른쪽: 왼쪽을 얼굴 가운데 기준으로 뒤집은 위치
    line(this.screenX(24), y + 16.5 * PX, this.screenX(28), y + 16.25 * PX);
    line(this.screenX(24), y + 17.5 * PX, this.screenX(27.5), y + 17.75 * PX);

    noStroke();
  }
}

// ===== 3. 환경 (고양이가 사는 풀밭 + 낮과 밤) =====

const GROUND_Y = 212;        // 땅의 높이 (고양이 발바닥이 닿는 곳). 그 아래는 연한 땅
const DAY_LENGTH = 60 * 120; // 하루 길이: 7200프레임 = 약 2분

// 하루 중 시간(0 ~ 1)에 따른 하늘색. [시간, 색] 사이를 부드럽게 섞음
// 0 = 아침, 0.5 = 노을, 0.65 ~ 0.88 = 밤, 0.95 = 새벽
const SKY_KEYS = [
  [0.00, '#cfe6ee'], // 아침
  [0.45, '#cfe6ee'], // 오후까지 맑은 하늘
  [0.55, '#f2b98b'], // 노을
  [0.65, '#2f3a63'], // 밤
  [0.88, '#2f3a63'],
  [0.95, '#f4c9a8'], // 새벽
  [1.00, '#cfe6ee'], // 다시 아침
];

// 어두운 정도 (0 = 낮, 1 = 한밤). 밤에 풀 색을 어둡게 하는 데 씀
const DARK_KEYS = [
  [0.00, 0],
  [0.45, 0],
  [0.62, 1],
  [0.88, 1],
  [0.98, 0],
  [1.00, 0],
];

// 풀 색 3가지: 노란 기를 빼고 더 푸르게 (이름은 역할 그대로: 밝은 풀, 길쭉한 풀·새싹, 짙은 풀)
const GRASS_LIME = '#6cc04f';  // 싱그러운 초록 (was #97bb4a)
const GRASS_OLIVE = '#5e9e58'; // 푸른 세이지 (was #8a9a5a)
const GRASS_DEEP = '#2f8a52';  // 짙은 에메랄드 (was #4f884f)
const GRASS_COLORS = [GRASS_LIME, GRASS_LIME, GRASS_OLIVE, GRASS_DEEP]; // 연두가 가장 많이
const GROUND_COLOR = '#e6ecd9';                         // 풀 아래쪽: 연한 세이지 (풀과 같은 초록 계열)

// 풀밭 새싹: 줄기 하나에 크기가 다른 잎 두 장 (x = 잎, s = 줄기와 만나는 곳)
// 이 3줄 아래로는 줄기만 땅까지 내려감
const MEADOW_SPROUT = [
  'xx..xxx',
  'xxx.xx.',
  '.xxs...',
];
const SPROUT_STEM_COL = 3; // 위 그림에서 줄기가 있는 칸
const NIGHT_TINT = '#1c2440';
const SKY_BAND = 6;         // 하늘을 이 높이(px)의 가로 띠로 나눠서 칠함 (픽셀 느낌의 그라데이션)
const SKY_WAVE_SPEED = 0.004; // 하늘 물결이 움직이는 속도 (작을수록 천천히)                           // 밤에 풀을 어둡게 할 때 섞는 색

class World {
  constructor() {
    this.time = 0.1; // 하루 중 지금 시간 (0 ~ 1). 아침에서 시작

    // 풀: 한 번만 만들어 두고 매 프레임 똑같이 그림 (draw에서 random 쓰면 풀이 깜빡임)
    // 1) 바닥줄: 모든 칸에 1칸짜리 풀이 깔림 (색만 제각각)
    this.baseColors = [];
    for (let x = 0; x < width; x = x + PX) {
      this.baseColors.push(random(GRASS_COLORS));
    }

    // 2) 풀잎: 대부분 짧고, 가끔 길쭉하고, 군데군데 비어 있음
    this.blades = [];
    for (let x = 0; x < width; x = x + PX) {
      const roll = random();
      let h = 0;
      if (roll < 0.3) {
        h = 0;                          // 30%: 바닥줄만 (빈 공간)
      } else if (roll < 0.8) {
        h = floor(random(1, 3));        // 50%: 1~2칸 짧은 풀
      } else if (roll < 0.94) {
        h = 3;                          // 14%: 3칸
      } else {
        h = floor(random(4, 7));        // 6%: 4~6칸 길쭉한 풀
      }
      if (h === 0) {
        continue;
      }

      let c = random(GRASS_COLORS);
      if (h >= 4) {
        c = GRASS_OLIVE;                // 길쭉한 풀은 올리브색
      }
      let lean = 0;
      if (h >= 2 && random() < 0.3) {
        lean = random([-1, 1]);         // 30%: 끝 한 칸이 대각선으로 꺾임
      }
      this.blades.push({ x: x, h: h, color: c, lean: lean });
    }

    // 3) 새싹: 혼자 있거나 2~3개가 모여 있음
    this.sprouts = [];
    for (let group = 0; group < 4; group++) {
      let x = floor(random(4, width / PX - 8)) * PX;
      const count = random([1, 1, 2, 3]);
      for (let i = 0; i < count; i++) {
        this.sprouts.push({
          x: x,
          stem: floor(random(3, 7)),    // 잎 아래 줄기 길이 3~6칸
          flip: random([true, false]),  // 잎 모양 좌우 뒤집기
        });
        x = x + floor(random(7, 11)) * PX; // 같은 무리의 다음 새싹은 잎이 겹치지 않게 옆에
      }
    }
  }

  update() {
    this.time = (this.time + 1 / DAY_LENGTH) % 1; // 1을 넘으면 다시 0 (다음 날 아침)
  }

  // [시간, 값] 목록에서 지금 시간에 맞는 두 값을 찾아 섞음
  // amt = 두 시간 사이에서 얼마나 왔는지 (0 ~ 1)
  pick(keys) {
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, a] = keys[i];
      const [t1, b] = keys[i + 1];
      if (this.time >= t0 && this.time <= t1) {
        const amt = (this.time - t0) / (t1 - t0);
        if (typeof a === 'string') {
          return lerpColor(color(a), color(b), amt); // 색이면 색끼리 섞기
        }
        return lerp(a, b, amt);                      // 숫자면 숫자끼리 섞기
      }
    }
    return keys[0][1];
  }

  darkness() {
    return this.pick(DARK_KEYS);
  }

  isNight() {
    return this.darkness() > 0.5;
  }

  // 하늘 위 글자(Zz, !)는 낮엔 어둡게, 밤엔 밝게
  textColor() {
    if (this.isNight()) {
      return '#e6e3f0';
    }
    return PALETTE.o;
  }

  // 이름표는 밝은 땅 위라 항상 어두운 색
  labelColor() {
    return PALETTE.o;
  }

  // 밤이 될수록 원래 색에 밤 색을 섞어서 어둡게
  shade(c) {
    return lerpColor(color(c), color(NIGHT_TINT), this.darkness() * 0.6);
  }

  // 고양이보다 먼저 그리는 것: 하늘색(시간에 따라 변함), 연한 땅
  showBack() {
    noStroke();

    // 하늘: 위는 조금 짙게, 아래(땅 쪽)는 조금 밝게 → 그 경계가 물결처럼 천천히 오르내림
    const sky = this.pick(SKY_KEYS);                         // 지금 시간의 하늘색
    const skyTop = lerpColor(sky, color(NIGHT_TINT), 0.18);  // 위쪽: 살짝 어둡게
    const skyBottom = lerpColor(sky, color(255), 0.25);      // 아래쪽: 살짝 밝게
    for (let y = 0; y < GROUND_Y; y = y + SKY_BAND) {
      // 기본은 위→아래로 0→1, 거기에 느린 물결을 더함 (y마다 박자가 달라서 띠가 일렁임)
      const wave = 0.12 * sin(frameCount * SKY_WAVE_SPEED * TWO_PI + y * 0.03);
      const amt = constrain(y / GROUND_Y + wave, 0, 1);
      fill(lerpColor(skyTop, skyBottom, amt));
      rect(0, y, width, SKY_BAND);
    }

    // 풀 아래쪽: 두꺼운 땅 대신 연한 세이지색 (밤에도 그대로)
    fill(GROUND_COLOR);
    rect(0, GROUND_Y, width, height - GROUND_Y);
  }

  // 고양이보다 나중에 그리는 것: 풀과 새싹 → 고양이가 풀 뒤에 있는 것처럼 보임
  showFront() {
    noStroke();

    // 바닥줄
    for (let i = 0; i < this.baseColors.length; i++) {
      fill(this.shade(this.baseColors[i]));
      rect(i * PX, GROUND_Y - PX, PX, PX);
    }

    // 새싹 (풀잎보다 먼저 → 줄기 밑동이 풀 속에 묻힘)
    for (const sprout of this.sprouts) {
      this.drawMeadowSprout(sprout);
    }

    // 풀잎
    for (const blade of this.blades) {
      this.drawBlade(blade);
    }
  }

  // 풀잎 하나: 바닥줄 위로 h칸, 한 가지 색
  drawBlade(blade) {
    fill(this.shade(blade.color));
    // 바람: 옆 풀과 조금씩 박자가 다르게 (x를 더해서) 끝이 1픽셀씩 흔들림
    const wind = round(sin(frameCount * 0.03 + blade.x * 0.05));
    for (let i = 1; i <= blade.h; i++) {   // i = 1 이 바닥줄 바로 위 칸
      let dx = 0;
      if (i === blade.h) {
        dx = blade.lean * PX + wind;       // 맨 끝 칸: 대각선으로 꺾이고 바람에 살랑
      }
      rect(blade.x + dx, GROUND_Y - (i + 1) * PX, PX, PX);
    }
  }

  // 풀밭 새싹: 잎 3줄 + 땅까지 내려오는 줄기
  drawMeadowSprout(sprout) {
    fill(this.shade(GRASS_OLIVE));
    const sway = round(sin(frameCount * 0.025 + sprout.x * 0.1)); // 잎이 1픽셀씩 살랑
    const leafTop = GROUND_Y - (sprout.stem + MEADOW_SPROUT.length) * PX;

    for (let r = 0; r < MEADOW_SPROUT.length; r++) {
      let line = MEADOW_SPROUT[r];
      if (sprout.flip) {
        line = line.split('').reverse().join(''); // 글자 순서를 거꾸로 → 좌우 반전
      }
      for (let c = 0; c < line.length; c++) {
        if (line[c] !== '.') {
          rect(sprout.x + (c - SPROUT_STEM_COL) * PX + sway, leafTop + r * PX, PX, PX);
        }
      }
    }
    // 줄기: 잎 바로 아래부터 땅까지
    rect(sprout.x, leafTop + MEADOW_SPROUT.length * PX, PX, sprout.stem * PX);
  }

  // 시간을 건너뜀 (확인용)
  skip(amount) {
    this.time = (this.time + amount) % 1;
  }
}

// ===== 4. 실행 =====

let world;
let cat1;
let cat2;
let showDebug = false; // D 키로 켜고 끄는 디버그 표시

function setup() {
  createCanvas(480, 240);
  textFont('Press Start 2P');
  textSize(10);

  world = new World();

  // 발바닥(그림 맨 아래)이 땅에 닿도록: 땅 높이 - 그림 높이
  const catY = GROUND_Y - CURL_SPRITE.length * PX;
  cat1 = new Creature('Moss', 60, catY, 1);
  cat2 = new Creature('Fern', 280, catY, 2);
  cat1.timid = false; // Moss는 대담한 성격: 마우스가 빨리 와도 놀라지 않음

  cat2.energy = 40; // Fern은 조금 피곤한 상태로 시작
  cat2.sockColor = PALETTE.b; // Fern은 양말 없이 검은 발 (Fern은 기본값대로 조심스러운 성격)
}

function draw() {
  world.update();
  world.showBack(); // 하늘색 + 연한 땅

  cat1.update(world);
  cat1.show(world);

  cat2.update(world);
  cat2.show(world);

  world.showFront(); // 풀과 새싹 (고양이를 덮어서 고양이가 풀 뒤에 있는 것처럼)
}

// 쓰다듬기는 update()의 checkStroke()에서 확인함 (마우스를 고양이 위에서 왔다갔다)

// T 키를 누르면 시간이 하루의 1/4만큼 빨리 감김 (밤을 기다리지 않고 확인하기)
function keyPressed() {
  if (key === 't' || key === 'T') {
    world.skip(0.25);
  }
  if (key === 'd' || key === 'D') {
    showDebug = !showDebug; // true ↔ false 뒤집기
  }
}

// 이 줄이 브라우저 콘솔에 보이면 최신 sketch.js가 실행 중인 것
console.log('PlantCat sketch loaded (v2: low walking tail): Moss = bold, Fern = timid');
