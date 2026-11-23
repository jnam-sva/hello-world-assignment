# Week 10 — Plant Mood: A Word from the Plant · 식물의 한마디

**Week 10 homework: final-project proposal and spike plan · 10주차 과제: 기말 프로젝트 제안서와 스파이크 계획 · November 23, 2026**

> **Note:** The experiment has not been run yet. This submission is the plan only; the results will be added after I run it.
>
> **메모:** 실험은 아직 진행하지 못했습니다. 이번에는 계획서만 제출하며, 결과는 실험을 진행한 뒤 추가합니다.

[English](#english) · [한국어](#한국어)

---

## English

### Idea

A plant that shows its mood through light and sound as the soil dries or gets wet (the code in this folder, as of commit `2be4c1e`). I want to add **a short line from the plant** on screen, for example "I'm a little thirsty."

- **For:** people who forget to water their plants, or water them too often
- **Core experience:** soil dries → amber pulse and a sigh + "I'm thirsty" → I water it → green rises with a chime + "Thank you"

### Scope

- **Must:** write line cards for each state; run the experiment below
- **Should:** show the line on the p5 screen, based on the result
- **Nice:** call the local model directly from p5
- **Stopping point:** all four states produce a line with nothing invented
- **Cut:** if the model invents things in the experiment, I skip connecting it to the screen and choose lines with a rule instead.
- **Where it runs:** Arduino (LEDs), browser (sound, screen), my laptop (the model, only while I build for now)
- **System map:** moisture sensor → Arduino (state logic, LEDs) → serial → p5 (sound, screen, line) → (Nice) local model. The only data is the state, moisture (%), and time since the state began.

### Small experiment

- **Question:** Given only the facts I provide, can a small local model say a line as the plant without inventing anything?
- **Setup:** LM Studio + Qwen2.5-1.5B-Instruct. A new chat for every try.
- **Method:** give the same facts (state, moisture, time in state) and ask two ways.
  - **A, write:** "Using only the facts below, say one sentence as the plant."
  - **B, choose:** "Reply with only the number of the best card, 1–7. If none fits, 0."
  - Six situations (the 4 ordinary states + moisture 0% + moisture missing), each asked once with A and once with B → 12 runs in total
- **Prediction:** A will invent things I did not give, like sunlight or dates. B will be accurate, but no better than a one-line rule.
- **Next decision:**
  - If A invents nothing → the p5 screen sends the state to the model automatically and shows the model's line on screen.
  - If only B is reliable → choose cards with a rule, no model.
  - If neither is reliable → drop the line and keep light and sound only.

### Result (to record after running)

| | Correct | Invented | Wrong |
| --- | --- | --- | --- |
| A write (/6) | | | |
| B choose (/6) | | | |

- First replies, verbatim:
- What I learned / what is still unknown:
- Next decision:

### Handoff

- **Run:** upload `plant_mood_led/plant_emotion.ino` with the Arduino IDE (needs the FastLED library). Quit the IDE, then open `plant_mood_sound_and_visual/index.html` in Chrome and press "Connect Arduino + turn on sound". Without the hardware, press keys `0`–`3` (a simulation).
- **Known limit:** `plant_mood_sound_and_visual/plant-gradient.js` is still empty, so the screen background is a solid colour for now.
- **Credits:** p5.js, FastLED, Qwen2.5-1.5B-Instruct, LM Studio. This plan was organised with Claude.
- **AI use:** I built the Arduino code and the p5 sound and screen code with Claude Code. The four states, the signal language, and the feel of each state's colour and sound are my decisions.
  - **Volume slider:** added at my request after feedback from a classmate.
  - **Dry colour:** it started as brown, but the LEDs cannot show brown, so I accepted amber, an alternative Claude Code suggested.
  - **Waiting after watering:** while testing, I found that soil moisture takes time to settle, so I added the wait.
  - **Soggy sound:** treating the plant as a character, I asked for it to sound "underwater".
- **Roles and support:** a solo project. I need a check of my LM Studio setup and one classmate to test with.
- **Privacy:** no camera or microphone; the model runs only on my laptop.
- **Accessibility:** the line is added to light and sound, so a person can tell the state without reading.

---

## 한국어

### 아이디어

흙의 수분에 따라 빛과 소리로 기분을 표현하는 식물입니다(이 폴더의 코드, 커밋 `2be4c1e` 기준). 여기에 **식물의 한마디**를 화면에 더하려고 합니다. 예: "목이 조금 말라요."

- **대상:** 물 주는 걸 잊거나 너무 자주 주는 사람
- **핵심 경험:** 흙이 마름 → 호박색 맥박과 한숨 + "목이 말라요" → 물을 줌 → 초록이 차오르고 차임 + "고마워요"

### 범위

- **Must:** 상태별 대사 카드 쓰기, 아래 실험 실행
- **Should:** 결과에 따라 p5 화면에 한마디 표시
- **Nice:** p5에서 로컬 모델 직접 부르기
- **멈출 지점:** 4개 상태 모두 지어낸 말 없이 한마디가 나올 때
- **뺄 것:** 실험에서 모델이 지어낸 말을 하면, 화면에 모델을 연결하는 단계는 빼고 규칙으로 대사를 고릅니다.
- **어디서 실행되나:** Arduino(LED), 브라우저(소리, 화면), 내 노트북(모델, 지금은 제작할 때만)
- **시스템 지도:** 수분 센서 → Arduino(상태 판단, LED) → 시리얼 → p5(소리, 화면, 한마디) → (Nice) 로컬 모델. 다루는 데이터는 상태, 수분(%), 그 상태가 된 뒤 지난 시간뿐입니다.

### 작은 실험

- **질문:** 작은 로컬 모델이 내가 준 사실만 보고, 지어내지 않고 식물의 한마디를 할 수 있을까?
- **설정:** LM Studio + Qwen2.5-1.5B-Instruct. 시도마다 새 대화를 엽니다.
- **방법:** 같은 사실(상태, 수분, 지난 시간)을 주고 두 가지로 물어봅니다.
  - **A 쓰게 하기:** "아래 사실만 사용해서 식물로서 한 문장으로 말해."
  - **B 고르게 하기:** "내가 쓴 카드 1–7 중 가장 맞는 번호만 답해. 없으면 0."
  - 상황 6가지(보통 상태 4개 + 수분 0% + 수분 값 없음)를 A와 B로 한 번씩 물어봄 → 총 12번
- **예측:** A는 햇빛이나 날짜처럼 주지 않은 것을 지어낼 것이다. B는 정확하지만 규칙 한 줄로 고르는 것과 다르지 않을 것이다.
- **다음 결정:**
  - A가 지어내지 않으면 → p5 화면이 상태를 모델에 자동으로 보내고, 모델의 한마디를 화면에 띄워 봅니다.
  - B만 믿을 만하면 → 모델 없이 규칙으로 카드를 고릅니다.
  - 둘 다 불안하면 → 한마디는 빼고 빛과 소리만으로 갑니다.

### 결과 (실행 후 기록)

| | 맞음 | 지어냄 | 틀림 |
| --- | --- | --- | --- |
| A 쓰게 하기 (/6) | | | |
| B 고르게 하기 (/6) | | | |

- 첫 응답 원문:
- 배운 것 / 아직 모르는 것:
- 다음 결정:

### 인계

- **실행:** Arduino IDE로 `plant_mood_led/plant_emotion.ino`를 업로드합니다(FastLED 라이브러리 필요). IDE를 종료한 뒤 Chrome에서 `plant_mood_sound_and_visual/index.html`을 열고 "Connect Arduino + turn on sound"를 누릅니다. 장치 없이 볼 때는 키보드 `0`–`3`을 누릅니다(시뮬레이션).
- **알려진 한계:** `plant_mood_sound_and_visual/plant-gradient.js`가 아직 비어 있어서, 지금은 화면 배경이 단색입니다.
- **크레딧:** p5.js, FastLED, Qwen2.5-1.5B-Instruct, LM Studio. 이 계획서는 Claude와 함께 정리했습니다.
- **AI 사용:** Claude Code로 Arduino 코드와 p5 소리·화면 코드를 만들었습니다. 상태 4개, 신호 언어, 각 상태의 색과 소리 느낌은 제가 정했습니다.
  - **볼륨 슬라이더:** 동료의 피드백을 듣고 추가를 요청했습니다.
  - **Dry 색:** 처음에는 갈색이었지만 LED가 갈색을 표현하지 못해서, Claude Code가 대안으로 제안한 호박색을 받아들였습니다.
  - **물을 준 직후의 대기:** 직접 테스트하다가 흙의 수분이 바뀌는 데 시간이 걸린다는 것을 발견하고 적용했습니다.
  - **Soggy 소리:** 식물을 의인화해서, "물속처럼" 들리게 만들어 달라고 제가 요청했습니다.
- **역할과 지원:** 개인 프로젝트. LM Studio 설치 확인과 테스트할 동료 1명이 필요합니다.
- **개인정보:** 카메라와 마이크를 쓰지 않고, 모델은 내 노트북에서만 실행됩니다.
- **접근성:** 한마디는 빛과 소리에 더하는 신호라서, 글자를 읽지 않아도 상태를 알 수 있습니다.
