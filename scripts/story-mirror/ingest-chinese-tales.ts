/**
 * 이야기 거울 코퍼스 확장 - 중국 설화 Phase 3
 *
 * 25편 중국 고전·설화 StoryWork + StoryChunk를 생성한다.
 * excerpt는 150~350자 4층 구조(사건→감정→전환→응축)로 작성한다.
 */
import { db } from "@/lib/db";

const CORPUS_VERSION = "v4.2-seed-1";

type TaleInput = {
  id: string;
  slug: string;
  title: string;
  titleOriginal?: string;
  author?: string;
  era: string;
  excerpt: string;
  themes: string[];
  emotions: string[];
  situations: string[];
  locator?: string;
};

const TALES: TaleInput[] = [
  {
    id: "chinese-three-kingdoms-zhuge",
    slug: "chinese-three-kingdoms-zhuge",
    title: "제갈량",
    titleOriginal: "Zhuge Liang",
    era: "삼국",
    excerpt:
      "제갈량은 초가에 숨어 살다 유비의 세 번의 방문 끝에 세상에 나왔습니다. 그는 지략으로 약한 촉을 지탱했지만, 끝끝내 중원을 통일하지는 못했습니다. 마지막까지 출사를 멈추지 않은 그의 마음에는 사명과 한계가 함께 있었습니다. 능력이 뛰어나도 시대의 무게 앞에서는 겸손한 헌신만이 남는 경우가 있습니다.",
    themes: ["사명", "지혜", "헌신", "한계"],
    emotions: ["결의", "고독", "안타까움"],
    situations: ["부름을 받음", "불가능한 과제", "끝까지 감당함"],
  },
  {
    id: "chinese-guan-yu",
    slug: "chinese-guan-yu",
    title: "관우",
    titleOriginal: "Guan Yu",
    era: "삼국",
    excerpt:
      "관우는 의리를 목숨처럼 여겨 조조의 후대를 받고도 유비에게로 돌아갔습니다. 그는 강했지만 자존심이 화를 부르기도 했고, 끝내 형주의 함락과 함께 쓰러졌습니다. 신처럼 받들어진 뒤에도 그의 이야기는 충성과 오만 사이를 오갑니다. 의리는 사람을 빛나게 하지만, 유연함을 잃으면 스스로를 가둡니다.",
    themes: ["의리", "자존심", "충성", "몰락"],
    emotions: ["자부", "분노", "비장"],
    situations: ["은혜와 의리", "오만한 판단", "최후의 고립"],
  },
  {
    id: "chinese-cao-cao",
    slug: "chinese-cao-cao",
    title: "조조",
    titleOriginal: "Cao Cao",
    era: "삼국",
    excerpt:
      "조조는 난세에 재능을 모아 나라를 재편하려 했습니다. 그는 인재를 아끼면서도 의심이 많았고, 승리 속에서도 배신과 피의 그림자를 남겼습니다. 영웅과 간웅 사이라는 평가처럼, 그의 야망은 질서를 만들면서 동시에 상처를 만들었습니다. 큰일을 하려는 마음은 때로 사람을 도구로 보게 만듭니다.",
    themes: ["야망", "질서", "의심", "권력"],
    emotions: ["갈망", "불안", "냉정"],
    situations: ["인재 등용", "배신에 대한 두려움", "목적을 위한 수단"],
  },
  {
    id: "chinese-water-margin-song",
    slug: "chinese-water-margin-song",
    title: "송강",
    titleOriginal: "Song Jiang",
    era: "송",
    excerpt:
      "송강은 의리를 중시해 양산박의 중심이 되었지만, 조정에 귀순하려는 마음도 품었습니다. 형제들과의 연대와 국가에 대한 미련 사이에서 그는 흔들렸고, 그 선택은 공동체의 운명을 갈랐습니다. 어디에 속할 것인가 하는 질문은 지도자를 가장 외롭게 만듭니다. 양쪽을 모두 붙잡으려다 둘 다 놓칠 수 있습니다.",
    themes: ["의리", "귀속", "리더십", "딜레마"],
    emotions: ["고민", "의리", "착잡"],
    situations: ["동료와 국가 사이", "귀순의 유혹", "공동체의 분기점"],
  },
  {
    id: "chinese-wu-song",
    slug: "chinese-wu-song",
    title: "무송",
    titleOriginal: "Wu Song",
    era: "송",
    excerpt:
      "무송은 호랑이를 때려잡은 용맹으로 이름을 얻었지만, 형의 원수를 갚는 길에서 법과 폭력 사이를 걸었습니다. 정의감이 그를 움직였고, 동시에 피로 물든 복수로 그를 몰아갔습니다. 강한 사람은 약자를 지키기도 하고 선을 넘기도 합니다. 용기가 복수와 구별되지 않을 때 이야기는 비극에 가까워집니다.",
    themes: ["용기", "복수", "정의", "폭력"],
    emotions: ["분노", "비장", "허무"],
    situations: ["원수 갚기", "법을 넘는 정의", "용맹의 대가"],
  },
  {
    id: "chinese-journey-wukong",
    slug: "chinese-journey-wukong",
    title: "손오공",
    titleOriginal: "Sun Wukong",
    era: "명",
    excerpt:
      "손오공은 하늘도 거스르는 재주로 자유를 외치다 오행산 아래 눌렸습니다. 삼장법사를 따르며 그는 제멋대로인 힘을 길들이는 법을 배웠고, 시련마다 장난기와 충성 사이를 오갔습니다. 길들여지지 않던 힘이 동행을 만나 의미가 생겼습니다. 자유는 억압의 반대만이 아니라, 방향을 얻는 일이기도 합니다.",
    themes: ["자유", "성장", "동행", "수련"],
    emotions: ["반항", "답답", "성숙"],
    situations: ["억눌린 힘", "스승과의 여정", "자아 길들이기"],
  },
  {
    id: "chinese-tripitaka",
    slug: "chinese-tripitaka",
    title: "삼장법사",
    titleOriginal: "Tang Sanzang",
    era: "명",
    excerpt:
      "삼장법사는 경전을 구하려 서역으로 떠났습니다. 그는 무력이 약해 자주 위험에 처했지만, 포기하지 않는 신념으로 제자들을 이끌었습니다. 강한 손오공조차 그의 진심 앞에서는 발길을 돌렸습니다. 힘이 없어도 방향이 분명하면 사람들을 모을 수 있습니다. 약한 리더도 중심이 분명하면 강한 이들을 한길로 모읍니다.",
    themes: ["신념", "여정", "리더십", "인내"],
    emotions: ["경건", "불안", "희망"],
    situations: ["먼 순례", "약한 리더", "신념으로 이끌기"],
  },
  {
    id: "chinese-mencius-mother",
    slug: "chinese-mencius-mother",
    title: "맹모삼천",
    titleOriginal: "Mencius' Mother",
    era: "전국",
    excerpt:
      "맹자의 어머니는 아들의 배움을 위해 세 번 이사를 했습니다. 묘지 옆, 시장 옆을 지나 서당 옆에서야 마음을 놓았습니다. 환경이 사람을 만든다는 믿음으로 그는 불편을 감수했습니다. 좋은 교육은 때로 큰 강의보다, 곁에 무엇을 두느냐에서 시작됩니다. 곁의 공기가 아이의 습관을 만든다는 오래된 통찰입니다.",
    themes: ["교육", "환경", "모성", "선택"],
    emotions: ["걱정", "결단", "안도"],
    situations: ["아이 키우기", "환경 바꾸기", "장기적 투자"],
  },
  {
    id: "chinese-yugong",
    slug: "chinese-yugong",
    title: "우공이산",
    titleOriginal: "The Foolish Old Man Removes the Mountains",
    era: "열자",
    excerpt:
      "우공은 집 앞을 가로막은 산을 옮기기로 했습니다. 사람들은 웃었지만, 그는 자손 대대로 퍼낼 것이라 답했습니다. 그 마음이 하늘에 닿아 산이 옮겨졌다는 이야기가 남았습니다. 당장의 불가능보다 이어질 의지가 더 큰 힘을 만들 수 있습니다. 한 사람의 고집이 세대의 길을 열 수도 있습니다.",
    themes: ["인내", "의지", "장기전", "신념"],
    emotions: ["조롱", "고집", "감동"],
    situations: ["불가능한 과제", "세대에 걸친 노력", "비웃음을 견딤"],
  },
  {
    id: "chinese-saiweng",
    slug: "chinese-saiweng",
    title: "새옹지마",
    titleOriginal: "The Old Man at the Fort",
    era: "회남자",
    excerpt:
      "변방의 노인은 말이 도망가자 불행이라 단정하지 않았고, 말이 돌아오자 행복이라 단정하지 않았습니다. 아들의 낙마와 징집 면제까지, 사건은 계속 다른 얼굴로 이어졌습니다. 지금의 득실이 이야기의 끝이 아닐 수 있습니다. 성급한 판단보다 시간을 두는 지혜가 마음을 지킵니다.",
    themes: ["관점", "수용", "시간", "평정"],
    emotions: ["담담", "놀람", "성찰"],
    situations: ["갑작스러운 손실", "예상 밖 이득", "판단 유보"],
  },
  {
    id: "chinese-boya-ziqi",
    slug: "chinese-boya-ziqi",
    title: "백아절현",
    titleOriginal: "Boya Breaks His Zither",
    era: "열자",
    excerpt:
      "백아는 자기 거문고 소리를 알아주는 종자기가 죽자 줄을 끊었습니다. 더 이상 연주할 귀를 잃었기 때문이었습니다. 최고의 기예도 알아보는 이가 없으면 외로워집니다. 진정한 우정은 실력을 평가하는 관계가 아니라, 마음을 알아듣는 관계입니다. 알아주는 이가 사라지면 예술도 침묵을 택할 수 있습니다.",
    themes: ["우정", "상실", "이해", "고독"],
    emotions: ["그리움", "허전", "애도"],
    situations: ["유일한 지음", "벗의 죽음", "의미를 잃음"],
  },
  {
    id: "chinese-woxin",
    slug: "chinese-woxin",
    title: "와신상담",
    titleOriginal: "Sleeping on Brushwood and Tasting Gall",
    era: "춘추",
    excerpt:
      "월왕 구천은 패배 후 장작 위에서 자고 쓸개를 맛보며 치욕을 기억했습니다. 그는 복수를 서두르지 않고 국력을 기른 끝에 오를 이겼습니다. 수치를 연료로 삼되 감정에만 취하지 않은 인내였습니다. 복수보다 강한 것은 자신을 단련하는 시간입니다. 치욕을 기억하되 시간에 실어 단련할 때 역전이 옵니다.",
    themes: ["인내", "치욕", "복수", "수련"],
    emotions: ["수치", "절제", "결의"],
    situations: ["패배 후 재기", "오래 참기", "계획적 회복"],
  },
  {
    id: "chinese-white-snake",
    slug: "chinese-white-snake",
    title: "백사전",
    titleOriginal: "Legend of the White Snake",
    era: "민간",
    excerpt:
      "백사는 사람이 되어 허선과 사랑에 빠졌지만, 정체가 드러나며 갈등이 시작되었습니다. 법해 스님의 개입과 탑 아래의 이별 속에서, 인간과 요괴의 사랑은 시련을 견뎌야 했습니다. 다른 존재끼리의 인연은 이해와 편견 사이를 오갑니다. 사랑은 경계를 넘지만, 세상은 쉽게 허락하지 않습니다.",
    themes: ["사랑", "편견", "이별", "정체"],
    emotions: ["애틋", "두려움", "슬픔"],
    situations: ["숨긴 정체", "외부의 개입", "금지된 사랑"],
  },
  {
    id: "chinese-mulan",
    slug: "chinese-mulan",
    title: "목란",
    titleOriginal: "Mulan",
    era: "남북조",
    excerpt:
      "목란은 늙은 아버지를 대신해 남장을 하고 전장에 나갔습니다. 공적을 세우고도 관직보다 집으로 돌아가 부모를 모시기를 택했습니다. 영웅이 되는 것보다 가족을 지키는 쪽이 그의 중심이었습니다. 큰 희생은 때로는 이름을 남기려는 마음이 아니라 사랑에서 나옵니다. 드러난 공보다 집으로 돌아가는 선택이 그를 완성했습니다.",
    themes: ["효", "희생", "정체", "귀향"],
    emotions: ["결단", "긴장", "안도"],
    situations: ["부모를 대신함", "숨긴 정체", "공을 내려놓음"],
  },
  {
    id: "chinese-zhuangzi-butterfly",
    slug: "chinese-zhuangzi-butterfly",
    title: "호접몽",
    titleOriginal: "Zhuangzi's Butterfly Dream",
    era: "전국",
    excerpt:
      "장자는 나비가 된 꿈을 꾸고 깨어나, 자신이 나비 꿈을 꾼 것인지 나비가 장자를 꿈꾼 것인지 물었습니다. 확실한 경계가 흔들리자 집착할 자아가 가벼워졌습니다. 고정된 나에 대한 집착이 풀릴 때 시야가 넓어집니다. 삶의 해석은 하나만이 아닐 수 있습니다. 경계를 의심할 때 집착은 느슨해지고 세계는 넓어집니다.",
    themes: ["자아", "관점", "해방", "철학"],
    emotions: ["묘함", "평온", "호기심"],
    situations: ["꿈과 현실", "정체성 질문", "집착 내려놓기"],
  },
  {
    id: "chinese-jingwei",
    slug: "chinese-jingwei",
    title: "정위전해",
    titleOriginal: "Jingwei Filling the Sea",
    era: "산해경",
    excerpt:
      "정위는 바다에 빠져 죽은 뒤 새가 되어, 나무 돌멩이로 바다를 메우려 했습니다. 끝이 보이지 않는 작업이었지만 그는 멈추지 않았습니다. 무모해 보이는 집념이 상실에 대한 응답이 되었습니다. 되돌릴 수 없는 손실 앞에서도, 사람은 의미 있는 행동을 선택합니다. 메울 수 없는 바다 앞에서도 애도는 행동이 됩니다.",
    themes: ["상실", "집념", "무모함", "애도"],
    emotions: ["비통", "고집", "비장"],
    situations: ["돌이킬 수 없는 죽음", "끝없는 작업", "상실 후 행동"],
  },
  {
    id: "chinese-kuafu",
    slug: "chinese-kuafu",
    title: "과보추일",
    titleOriginal: "Kua Fu Chasing the Sun",
    era: "산해경",
    excerpt:
      "과보는 해를 쫓아 달리다 목이 말라 쓰러졌습니다. 그의 지팡이는 복숭아숲이 되어 후인에게 남았습니다. 도달하지 못한 질주가 완전히 헛되지는 않았습니다. 실패처럼 보이는 열망도 다른 형태의 유산을 남길 수 있습니다. 닿지 못한 질주가 숲이 되어 남을 수도 있습니다. 열망의 끝은 실패가 아니라 유산이 되기도 합니다.",
    themes: ["열망", "한계", "유산", "도전"],
    emotions: ["갈망", "탈진", "장엄"],
    situations: ["불가능한 추격", "힘을 다함", "남기는 것"],
  },
  {
    id: "chinese-yugong-neighbor",
    slug: "chinese-yugong-neighbor",
    title: "우공의 이웃",
    titleOriginal: "The Neighbor of Yugong",
    era: "열자",
    excerpt:
      "우공이 산을 옮긴다 하자 이웃은 비웃었습니다. 눈에 보이는 계산만으로는 그의 계획이 성립하지 않았기 때문입니다. 그러나 의지가 세대를 넘어가면서 불가능은 다시 정의되었습니다. 현실적인 회의도 필요하지만, 그것만으로는 새 길이 열리지 않을 때가 있습니다. 계산 밖의 의지가 현실을 다시 쓰기도 합니다.",
    themes: ["회의", "비전", "설득", "시간"],
    emotions: ["조소", "답답", "깨달음"],
    situations: ["비웃는 주변", "장기 계획", "관점의 차이"],
  },
  {
    id: "chinese-liang-zhu",
    slug: "chinese-liang-zhu",
    title: "양산백과 축영대",
    titleOriginal: "Butterfly Lovers",
    era: "민간",
    excerpt:
      "축영대는 남장을 하고 수학하다 양산백과 마음이 통했습니다. 정체가 밝혀지고 혼인이 어긋나자 두 사람은 끝내 함께하지 못했고, 무덤에서 나비로 피어났다는 이야기가 남았습니다. 이루어지지 못한 사랑이 다른 형태로 남습니다. 억압된 진심은 사라지지 않고 상징이 됩니다. 막힌 사랑은 다른 형상으로 세상을 남겨집니다.",
    themes: ["사랑", "억압", "변신", "비극"],
    emotions: ["설렘", "절망", "애틋"],
    situations: ["숨긴 정체", "이루어지지 못한 혼인", "사후의 합일"],
  },
  {
    id: "chinese-chang-e",
    slug: "chinese-chang-e",
    title: "항아",
    titleOriginal: "Chang'e",
    era: "신화",
    excerpt:
      "항아는 불사약을 마시고 달로 올라갔습니다. 영원에 가까워졌지만 곁의 사람은 멀어졌고, 달은 고독한 거처가 되었습니다. 완벽한 안전이나 영생을 택한 자리에 외로움이 남았습니다. 무엇을 얻는 선택에는 무엇을 잃는 그림자가 따릅니다. 영원을 얻은 자리에도 빈자리는 남습니다.",
    themes: ["선택", "고독", "영생", "대가"],
    emotions: ["유혹", "후회", "외로움"],
    situations: ["금지된 약", "돌이킬 수 없는 선택", "혼자의 영원"],
  },
  {
    id: "chinese-houyi",
    slug: "chinese-houyi",
    title: "후예",
    titleOriginal: "Hou Yi",
    era: "신화",
    excerpt:
      "후예는 열 개의 해를 쏘아 세상을 구했지만, 그 뒤로 사랑과 불사약을 둘러싼 갈등을 맞았습니다. 영웅의 활약이 끝난 자리에서 인간적인 상실이 시작되었습니다. 위대한 구원 이후에도 일상의 관계는 따로 돌봐야 합니다. 세상을 구한 손이 가까운 마음을 놓칠 수 있습니다. 큰일을 한 뒤에도 가까운 마음은 따로 돌봐야 합니다.",
    themes: ["영웅", "상실", "책임", "관계"],
    emotions: ["자부", "허전", "후회"],
    situations: ["세상을 구함", "이후의 공허", "가까운 이의 이별"],
  },
  {
    id: "chinese-qu-yuan",
    slug: "chinese-qu-yuan",
    title: "굴원",
    titleOriginal: "Qu Yuan",
    era: "전국",
    excerpt:
      "굴원은 조국을 염려하다 중상을 입고 강가에 섰습니다. 그는 뜻을 굽히지 못한 채 물에 몸을 던졌고, 사람들은 훗날 그 마음을 기렸습니다. 올곧음이 그를 외롭게 만들었지만, 그 외로움은 기억으로 남았습니다. 타협하지 않는 양심은 생전에는 짐이 되고 사후에는 빛이 되기도 합니다.",
    themes: ["충정", "고독", "절조", "상실"],
    emotions: ["비분", "절망", "존경"],
    situations: ["중상모략", "뜻을 굽히지 않음", "최후의 선택"],
  },
  {
    id: "chinese-fan-li",
    slug: "chinese-fan-li",
    title: "범려",
    titleOriginal: "Fan Li",
    era: "춘추",
    excerpt:
      "범려는 월나라의 승리를 도운 뒤 공신 자리에 머물지 않고 떠나 상인이 되었습니다. 그는 공이 클수록 물러날 때를 알아야 한다고 본 것입니다. 정점에 오래 머물려는 욕심보다 떠남의 타이밍이 그를 살렸습니다. 성공 이후의 겸손이 다음 삶을 엽니다. 정점에서 떠날 줄 아는 사람이 다음 자유를 얻습니다.",
    themes: ["물러남", "지혜", "성공", "절제"],
    emotions: ["통찰", "담담", "자유"],
    situations: ["공신 자리", "자발적 은퇴", "제2의 삶"],
  },
  {
    id: "chinese-sima-qian",
    slug: "chinese-sima-qian",
    title: "사마천",
    titleOriginal: "Sima Qian",
    era: "한",
    excerpt:
      "사마천은 궁형을 당한 치욕 속에서도 사기 저술을 포기하지 않았습니다. 몸을 보존한 이유는 가문의 명예가 아니라 역사를 남기기 위함이었습니다. 수치를 견딘 기록이 후세의 거울이 되었습니다. 살아남은 이유가 분명하면, 가장 어두운 시간도 작업실이 됩니다. 수치를 삼킨 기록이 후대의 거울이 되었습니다.",
    themes: ["치욕", "기록", "인내", "사명"],
    emotions: ["수치", "결의", "비장"],
    situations: ["모멸을 견딤", "대작을 완성", "의미를 위한 생존"],
  },
  {
    id: "chinese-tao-yuanming",
    slug: "chinese-tao-yuanming",
    title: "도연명",
    titleOriginal: "Tao Yuanming",
    era: "동진",
    excerpt:
      "도연명은 관직의 굴레를 벗고 귀거래사를 남기며 전원으로 돌아갔습니다. 가난해도 허리를 굽히지 않는 쪽을 택했고, 국화와 술 사이에서 자기 리듬을 찾았습니다. 세상의 성공 정의에서 내려온 사람이 다른 풍요를 봅니다. 떠남은 포기가 아니라 기준을 바꾸는 일일 수 있습니다.",
    themes: ["자유", "은퇴", "자존", "단순함"],
    emotions: ["후련", "쓸쓸", "평온"],
    situations: ["관직 이탈", "가난한 자존", "자기 삶의 회복"],
  },
];

async function main() {
  console.log(`[ingest-chinese] ${TALES.length}편 중국 설화 처리 시작`);
  let created = 0;
  let skipped = 0;

  for (const tale of TALES) {
    if (tale.excerpt.length < 150 || tale.excerpt.length > 350) {
      throw new Error(`excerpt 길이 오류: ${tale.title} (${tale.excerpt.length})`);
    }

    const existing = await db.storyWork.findFirst({
      where: { OR: [{ id: tale.id }, { slug: tale.slug }] },
    });

    if (existing && existing.id !== tale.id) {
      console.log(`  [skip] ${tale.title} (slug 충돌: ${existing.id})`);
      skipped++;
      continue;
    }

    if (existing) {
      await db.storyWork.update({
        where: { id: tale.id },
        data: {
          title: tale.title,
          titleOriginal: tale.titleOriginal ?? null,
          author: tale.author ?? null,
          era: tale.era,
          corpusVersion: CORPUS_VERSION,
          rightsStatus: "approved",
          culture: "eastern",
          language: "ko",
        },
      });
      await db.storyChunk.upsert({
        where: { id: `${tale.id}-chunk` },
        create: {
          id: `${tale.id}-chunk`,
          workId: tale.id,
          chunkIndex: 0,
          corpusVersion: CORPUS_VERSION,
          language: "ko",
          rightsStatus: "approved",
          citationAllowed: true,
          title: tale.title,
          locator: tale.locator ?? null,
          text: tale.excerpt,
          excerpt: tale.excerpt.slice(0, 200),
          summary: tale.excerpt,
          themes: JSON.stringify(tale.themes),
          emotions: JSON.stringify(tale.emotions),
          situations: JSON.stringify(tale.situations),
          sourceUrl: null,
          checksum: null,
        },
        update: {
          title: tale.title,
          locator: tale.locator ?? null,
          text: tale.excerpt,
          excerpt: tale.excerpt.slice(0, 200),
          summary: tale.excerpt,
          themes: JSON.stringify(tale.themes),
          emotions: JSON.stringify(tale.emotions),
          situations: JSON.stringify(tale.situations),
          corpusVersion: CORPUS_VERSION,
          rightsStatus: "approved",
          language: "ko",
        },
      });
      console.log(`  [upd] ${tale.title} (len:${tale.excerpt.length})`);
      created++;
      continue;
    }

    await db.storyWork.create({
      data: {
        id: tale.id,
        slug: tale.slug,
        title: tale.title,
        titleOriginal: tale.titleOriginal ?? null,
        author: tale.author ?? null,
        translator: null,
        sourceKind: "internal",
        language: "ko",
        culture: "eastern",
        era: tale.era,
        sourceUrl: "https://zh.wikipedia.org",
        landingPageUrl: null,
        licenseUrl: null,
        rightsRegion: "world",
        rightsBasis: "public_domain",
        rightsStatus: "approved",
        rightsCheckedAt: null,
        rightsNotes: null,
        checksum: null,
        corpusVersion: CORPUS_VERSION,
      },
    });

    await db.storyChunk.create({
      data: {
        id: `${tale.id}-chunk`,
        workId: tale.id,
        chunkIndex: 0,
        corpusVersion: CORPUS_VERSION,
        language: "ko",
        rightsStatus: "approved",
        citationAllowed: true,
        title: tale.title,
        locator: tale.locator ?? null,
        text: tale.excerpt,
        excerpt: tale.excerpt.slice(0, 200),
        summary: tale.excerpt,
        themes: JSON.stringify(tale.themes),
        emotions: JSON.stringify(tale.emotions),
        situations: JSON.stringify(tale.situations),
        sourceUrl: null,
        checksum: null,
      },
    });

    created++;
    console.log(`  [ok] ${tale.title} (len:${tale.excerpt.length})`);
  }

  console.log(`\n[ingest-chinese] 완료: ${created}편 처리, ${skipped}편 건너뜀`);
}

main().catch((err) => {
  console.error("[ingest-chinese] 실패:", err);
  process.exit(1);
});
