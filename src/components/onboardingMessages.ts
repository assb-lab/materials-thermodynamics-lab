import type { Lang } from "../i18n";

const ja = {
  toggle: "使い方",
  title: "2つの計算ツールを使う",
  close: "ガイドを閉じる",
  intro: "相図で組成と相平衡を調べ、反応電位で作動イオンに対する安定性を調べます。",
  dataTitle: "1. データを用意する",
  dataBody:
    "各画面の「サンプル / MP サンプル」は実際の Materials Project データで、API キーなしで試せます。独自の化学系は MP API キーで取得するか、保存した JSON を読み込みます。",
  dataNote: "反応電位の「デモデータ」は架空のエネルギーです。計算値は 0 K の DFT に基づきます。",
  phaseTitle: "2. 擬三元相図で調べる",
  phaseBody:
    "3つの端成分を入力してデータを読み込みます。図上のカーソル座標と分解生成物を確認し、クリックで組成を固定します。",
  phaseNote: "「反応ライン」で始点と終点を選ぶと、混合比に沿った反応エネルギーを比較できます。",
  phaseOpen: "擬三元相図を開く",
  voltageTitle: "3. 反応電位を調べる",
  voltageBody:
    "対象組成と作動イオンを選んでデータを読み込みます。グラフと反応表で安定性ウィンドウ、酸化・還元生成物を確認します。",
  voltageNote:
    "体積膨張率と被膜厚みはオプションから選択できます。図は SVG、反応表は CSV / JSON で保存できます。",
  voltageOpen: "反応電位計算を開く",
} as const;

export type OnboardingKey = keyof typeof ja;
export const onboardingMessages: Record<Lang, Record<OnboardingKey, string>> = {
  ja,
  en: {
    toggle: "Guide",
    title: "Using both calculation tools",
    close: "Close the guide",
    intro:
      "Explore compositions and phase equilibria with the phase diagram, then examine stability against a working ion with the voltage calculator.",
    dataTitle: "1. Choose your data",
    dataBody:
      "“Sample / MP sample” on each page uses real Materials Project data and works without an API key. For your own chemical system, fetch with an MP API key or load saved JSON.",
    dataNote:
      "The voltage calculator’s “Demo data” uses made-up energies. Calculated energies are based on 0 K DFT.",
    phaseTitle: "2. Explore a phase diagram",
    phaseBody:
      "Enter three end members and load data. Check the cursor coordinates and decomposition products on the diagram, then click to pin a composition.",
    phaseNote:
      "Choose a start and end with “Reaction line” to compare reaction energies along the mixing ratio.",
    phaseOpen: "Open the phase diagram",
    voltageTitle: "3. Explore reaction voltages",
    voltageBody:
      "Choose a target composition and working ion, then load data. Use the graph and reaction table to inspect the stability window and oxidation/reduction products.",
    voltageNote:
      "Enable volume expansion and film thickness under Options. Save figures as SVG and reaction tables as CSV / JSON.",
    voltageOpen: "Open the voltage calculator",
  },
  "zh-CN": {
    toggle: "使用指南",
    title: "使用两个计算工具",
    close: "关闭指南",
    intro: "通过相图研究组成与相平衡，再通过反应电位计算器研究相对于工作离子的稳定性。",
    dataTitle: "1. 准备数据",
    dataBody:
      "各页面的“示例 / MP 示例”使用真实的 Materials Project 数据，无需 API key 即可试用。其他化学体系可使用 MP API key 获取，或载入已保存的 JSON。",
    dataNote: "反应电位计算器的“演示数据”使用虚构能量。计算能量基于 0 K 的 DFT。",
    phaseTitle: "2. 研究赝三元相图",
    phaseBody: "输入三个端元并载入数据。在图上查看光标坐标与分解产物，点击即可固定组成。",
    phaseNote: "使用“反应线”选择起点和终点，比较不同混合比例下的反应能。",
    phaseOpen: "打开赝三元相图",
    voltageTitle: "3. 研究反应电位",
    voltageBody:
      "选择目标组成和工作离子，然后载入数据。通过图表和反应表查看稳定性窗口及氧化、还原产物。",
    voltageNote:
      "可在选项中启用体积膨胀率和膜层厚度。图形可保存为 SVG，反应表可保存为 CSV / JSON。",
    voltageOpen: "打开反应电位计算器",
  },
  ko: {
    toggle: "사용 안내",
    title: "두 계산 도구 사용하기",
    close: "안내 닫기",
    intro:
      "상도로 조성과 상평형을 살펴보고, 반응 전위 계산기로 작동 이온에 대한 안정성을 확인합니다.",
    dataTitle: "1. 데이터 준비",
    dataBody:
      "각 화면의 “샘플 / MP 샘플”은 실제 Materials Project 데이터이며 API key 없이 사용할 수 있습니다. 다른 화학계는 MP API key로 가져오거나 저장된 JSON을 불러오세요.",
    dataNote:
      "반응 전위 계산기의 “데모 데이터”는 가상 에너지를 사용합니다. 계산 에너지는 0 K DFT를 기반으로 합니다.",
    phaseTitle: "2. 의사 삼원계 상도 살펴보기",
    phaseBody:
      "세 단성분을 입력하고 데이터를 불러오세요. 도표에서 커서 좌표와 분해 생성물을 확인하고 클릭하여 조성을 고정합니다.",
    phaseNote:
      "“반응선”에서 시작점과 끝점을 선택하면 혼합비에 따른 반응 에너지를 비교할 수 있습니다.",
    phaseOpen: "상도 열기",
    voltageTitle: "3. 반응 전위 살펴보기",
    voltageBody:
      "대상 조성과 작동 이온을 선택한 후 데이터를 불러오세요. 그래프와 반응표에서 안정성 창과 산화·환원 생성물을 확인합니다.",
    voltageNote:
      "옵션에서 부피 팽창률과 피막 두께를 활성화할 수 있습니다. 그림은 SVG, 반응표는 CSV / JSON으로 저장합니다.",
    voltageOpen: "반응 전위 계산기 열기",
  },
};
