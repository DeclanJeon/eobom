/**
 * 이야기 거울 코퍼스 확장 - 한국 전래동화/민담 Phase 2
 *
 * 40편 한국 전래·민담 StoryWork + StoryChunk를 생성한다.
 * excerpt는 150~350자 4층 구조(사건→감정→전환→응축)로 작성한다.
 */
import { db } from "@/lib/db";

const CORPUS_VERSION = "v4.3-corpus-expand";

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
  // ===== 전래동화 20 =====
  {
    id: "korean-ft-heungbu",
    slug: "korean-ft-heungbu",
    title: "흥부와 놀부",
    era: "조선",
    excerpt:
      "흥부는 형 놀부에게 쫓겨나 가난 속에서도 다친 제비를 고쳐 주었습니다. 제비가 물어다 준 박에서 보물이 나오자 놀부는 욕심으로 제비를 해치고 박을 탔지만, 그 안에서 나온 것은 재앙이었습니다. 흥부는 그래도 형을 외면하지 않았습니다. 베풂은 계산이 아니라 마음의 방식이라는 것을, 이 이야기는 가난 속에서도 보여 줍니다.",
    themes: ["나눔", "욕심", "형제", "베풂"],
    emotions: ["연민", "분노", "안타까움"],
    situations: ["가족 갈등", "욕심의 결과", "약자를 돕는 선택"],
  },
  {
    id: "korean-ft-simcheong",
    slug: "korean-ft-simcheong",
    title: "심청전",
    era: "조선",
    excerpt:
      "심청은 눈먼 아버지를 위해 공양미 삼백 석의 대가로 바다에 몸을 던졌습니다. 그는 두려움보다 효를 먼저 선택했고, 그 희생은 죽음으로 끝나지 않고 다시 삶으로 돌아왔습니다. 아버지는 눈을 뜨고 딸을 다시 만났습니다. 사랑은 때로 자신을 내어주는 방식으로 세상을 바꿉니다.",
    themes: ["효", "희생", "가족", "구원"],
    emotions: ["슬픔", "결단", "감사"],
    situations: ["부모를 위한 선택", "큰 희생", "다시 만난 사랑"],
  },
  {
    id: "korean-ft-chunhyang",
    slug: "korean-ft-chunhyang",
    title: "춘향과 이몽룡",
    era: "조선",
    excerpt:
      "춘향은 신분의 벽 앞에서도 이몽룡과의 약속을 지키려 했습니다. 변학도의 위협 속에서도 그는 몸을 굽히지 않았고, 그 고집은 자존심이 아니라 사랑에 대한 신실함이었습니다. 결국 이몽룡이 암행어사로 돌아와 억울함을 풀어 주었습니다. 진실한 마음은 시간이 걸려도 스스로를 증명합니다.",
    themes: ["신실함", "신분", "사랑", "저항"],
    emotions: ["그리움", "고통", "희망"],
    situations: ["약속 지키기", "권력 앞의 저항", "오랜 기다림"],
  },
  {
    id: "korean-ft-honggildong",
    slug: "korean-ft-honggildong",
    title: "홍길동",
    era: "조선",
    excerpt:
      "홍길동은 서자로 태어나 아버지를 아버지라 부르지 못했습니다. 그 상처는 그를 집 밖으로 밀어냈고, 그는 불의한 권세가의 재물을 빼앗아 가난한 이들에게 나누었습니다. 법 바깥에서 정의를 찾으려 한 그의 길은 위험했지만, 무시당한 이름이 정의를 갈망하게 만들 수 있음을 보여 줍니다.",
    themes: ["정의", "신분", "소외", "저항"],
    emotions: ["분노", "외로움", "결의"],
    situations: ["인정받지 못함", "불의에 맞섬", "이름을 찾는 여정"],
  },
  {
    id: "korean-ft-gyeonu-jiknyeo",
    slug: "korean-ft-gyeonu-jiknyeo",
    title: "견우와 직녀",
    era: "고전",
    excerpt:
      "견우와 직녀는 사랑 때문에 일을 잊었고, 하늘은 그들을 은하수 양편으로 갈라놓았습니다. 일 년에 단 하루, 오작교 위에서만 만날 수 있었습니다. 그리움은 형벌처럼 길었지만, 그 하루는 더 절실한 만남이 되었습니다. 멀어진 사이에서도 마음은 다리를 놓을 수 있습니다. 기다려 본 사람만이 그 하루의 무게를 압니다.",
    themes: ["그리움", "이별", "만남", "기다림"],
    emotions: ["그리움", "슬픔", "설렘"],
    situations: ["먼 이별", "짧은 재회", "약속된 만남"],
  },
  {
    id: "korean-ft-sun-moon-siblings",
    slug: "korean-ft-sun-moon-siblings",
    title: "해와 달이 된 오누이",
    era: "전래",
    excerpt:
      "호랑이가 어머니를 삼키고 오누이를 쫓자, 아이들은 하늘로 줄을 올려 도움을 청했습니다. 그들은 두려움 속에서 서로를 붙잡았고, 결국 해와 달이 되어 세상을 비추게 되었습니다. 공포의 밤을 지나 빛으로 남은 그들의 이야기는, 위기가 사람을 영원히 갈라놓지 않을 수도 있음을 말합니다.",
    themes: ["위기", "구원", "형제", "변신"],
    emotions: ["공포", "의지", "안도"],
    situations: ["쫓기는 밤", "서로를 지킴", "위기 속 간구"],
  },
  {
    id: "korean-ft-fairy-woodcutter",
    slug: "korean-ft-fairy-woodcutter",
    title: "선녀와 나무꾼",
    era: "전래",
    excerpt:
      "나무꾼은 사슴의 말을 듣고 선녀의 날개옷을 숨겨 그와 가정을 이루었습니다. 그러나 그리움에 날개옷을 돌려주자 선녀는 하늘로 돌아갔습니다. 그는 뒤늦게 사랑을 지키지 못한 후회를 안고 하늘로 향했습니다. 붙잡아 둔 관계는 오래가지 못하고, 신뢰를 줄 때 비로소 진짜 인연이 됩니다.",
    themes: ["신뢰", "후회", "그리움", "인연"],
    emotions: ["설렘", "불안", "후회"],
    situations: ["숨긴 진실", "놓친 사랑", "뒤늦은 깨달음"],
  },
  {
    id: "korean-ft-tokki",
    slug: "korean-ft-tokki",
    title: "토끼전",
    era: "조선",
    excerpt:
      "용왕이 병을 고치려 토끼 간을 구하자, 자라가 토끼를 용궁으로 데려갔습니다. 죽음을 눈앞에 둔 토끼는 간을 육지에 두고 왔다고 속여 위기를 벗어났습니다. 지혜는 힘이 약한 자에게 남은 마지막 칼이었습니다. 절체절명의 순간에도 머리를 쓰면 길이 열릴 수 있습니다. 위기는 때로 지혜를 깨우는 문이 되기도 합니다.",
    themes: ["지혜", "위기", "생존", "말"],
    emotions: ["공포", "기민", "안도"],
    situations: ["속임수 위기", "말재주로 탈출", "약자의 지혜"],
  },
  {
    id: "korean-ft-byeoljubu",
    slug: "korean-ft-byeoljubu",
    title: "별주부전",
    era: "조선",
    excerpt:
      "별주부 자라는 병든 용왕을 위해 토끼를 데려오라는 명을 받습니다. 충성 때문에 속임수에 가담했지만, 토끼의 기지로 계획은 무너졌습니다. 그는 임무를 다하지 못한 채 돌아가야 했습니다. 맹목적인 충성은 때로 다른 생명을 위태롭게 만든다는 것을 이 이야기는 조용히 지적합니다.",
    themes: ["충성", "임무", "딜레마", "생명"],
    emotions: ["고민", "초조", "허탈"],
    situations: ["명령과 양심", "실패한 임무", "충성 사이의 갈등"],
  },
  {
    id: "korean-ft-kongjwi-patjwi",
    slug: "korean-ft-kongjwi-patjwi",
    title: "콩쥐팥쥐",
    era: "전래",
    excerpt:
      "콩쥐는 계모와 팥쥐의 구박 속에서도 맡겨진 일을 해냈습니다. 불가능해 보이던 빨래와 밭일을 도우미들의 도움으로 마치고 잔치에 갔고, 잃어버린 꽃신이 인연이 되어 억울함이 드러났습니다. 착한 사람이 항상 바로 보상받지는 않지만, 견딘 시간은 결국 진실을 드러내는 쪽이 됩니다.",
    themes: ["인내", "억울함", "회복", "가족"],
    emotions: ["설움", "외로움", "희망"],
    situations: ["구박받는 일상", "숨은 도움", "진실이 밝혀짐"],
  },
  {
    id: "korean-ft-baridegi",
    slug: "korean-ft-baridegi",
    title: "바리데기",
    era: "무속신화",
    excerpt:
      "바리데기는 버려진 공주였지만, 병든 부모를 살리기 위해 저승 길을 걸었습니다. 그는 고된 심부름과 시련을 감수하고 약수를 얻어 돌아왔습니다. 버려진 이가 구원자가 되는 역설 속에서, 버림받은 상처가 오히려 누군가를 살리는 힘이 될 수 있음을 보여 줍니다. 버림받은 자리가 구원의 출발점이 될 수 있습니다.",
    themes: ["버림", "효", "시련", "구원"],
    emotions: ["슬픔", "결단", "연민"],
    situations: ["버려진 아이", "저승 여정", "부모를 살림"],
  },
  {
    id: "korean-ft-dangun",
    slug: "korean-ft-dangun",
    title: "단군신화",
    era: "고조선",
    excerpt:
      "곰과 호랑이는 사람이 되기 위해 동굴에서 쑥과 마늘만 먹어야 했습니다. 호랑이는 견디지 못하고 뛰쳐나갔지만, 곰은 참아 웅녀가 되었습니다. 기다림과 인내가 새로운 삶의 문이 되었고, 그 선택은 한 민족의 시작 이야기로 남았습니다. 변하지 않는 사람은 없고, 견디는 사람이 다음 장을 엽니다.",
    themes: ["인내", "변화", "선택", "시작"],
    emotions: ["갈망", "인내", "희망"],
    situations: ["견디는 시간", "중도 포기", "새로운 정체성"],
  },
  {
    id: "korean-ft-jumong",
    slug: "korean-ft-jumong",
    title: "주몽신화",
    era: "고구려",
    excerpt:
      "주몽은 모함을 피해 남쪽으로 달아나는 길에 큰 강을 만났습니다. 뒤에서는 추격이 다가오고, 앞에는 건널 수 없는 물이 가로막았습니다. 그때 물고기와 자라가 등을 이어 다리를 만들었습니다. 혼자서는 못 건널 강이, 뜻밖의 도움으로 길이 됩니다. 위기의 끝에서 동행이 나타납니다.",
    themes: ["도피", "사명", "도움", "건국"],
    emotions: ["절박", "두려움", "감사"],
    situations: ["쫓기는 도망", "막힌 길", "뜻밖의 원조"],
  },
  {
    id: "korean-ft-ondal-pyeonggang",
    slug: "korean-ft-ondal-pyeonggang",
    title: "온달과 평강공주",
    era: "고구려",
    excerpt:
      "평강공주는 '온달에게 시집보낸다'는 말을 진짜로 받아들여 궁을 나왔습니다. 사람들은 비웃었지만, 공주는 온달을 일으키고 함께 무예를 익혔습니다. 보잘것없어 보이던 사람이 나라의 영웅이 되었습니다. 사람의 가능성은 지금 모습이 아니라, 누구와 어떻게 믿어 주는가에 달려 있습니다.",
    themes: ["믿음", "성장", "편견", "동행"],
    emotions: ["결단", "수치", "자부"],
    situations: ["편견을 거스름", "함께 성장", "숨은 가능성"],
  },
  {
    id: "korean-ft-rabbit-turtle",
    slug: "korean-ft-rabbit-turtle",
    title: "토끼와 거북",
    era: "전래",
    excerpt:
      "빠른 토끼는 느린 거북을 얕보고 길 위에서 잠이 들었습니다. 거북은 묵묵히 걸음을 옮겨 결승점에 먼저 도착했습니다. 승부는 재능의 자만이 아니라 끝까지 가는 태도에서 갈렸습니다. 앞서 있다고 멈추는 순간, 뒤처져 보이던 꾸준함이 앞질러 갑니다. 꾸준함은 느려 보여도 가장 멀리 갑니다.",
    themes: ["겸손", "꾸준함", "자만", "인내"],
    emotions: ["방심", "조급", "통쾌"],
    situations: ["과신", "느린 전진", "역전"],
  },
  {
    id: "korean-ft-magic-mortar",
    slug: "korean-ft-magic-mortar",
    title: "도깨비 방망이",
    era: "전래",
    excerpt:
      "착한 나무꾼은 도깨비에게 정직하게 굴어 방망이를 얻었고, 필요한 것을 만들어 이웃과 나눴습니다. 욕심 많은 이웃은 같은 수법을 흉내 내다 들켜 벌을 받았습니다. 같은 기회라도 마음의 결이 결과를 바꿉니다. 요행을 닮은 선물도, 탐욕 앞에서는 화가 됩니다. 마음이 먼저 준비되지 않은 복은 독이 됩니다.",
    themes: ["정직", "욕심", "나눔", "인과"],
    emotions: ["기쁨", "탐욕", "후회"],
    situations: ["뜻밖의 선물", "흉내 낸 욕심", "정직의 보상"],
  },
  {
    id: "korean-ft-three-brothers",
    slug: "korean-ft-three-brothers",
    title: "혹부리 영감",
    era: "전래",
    excerpt:
      "혹 달린 영감은 도깨비들 앞에서 자연스럽게 노래를 불러 혹을 떼어 내는 복을 받았습니다. 소문을 들은 이웃 영감은 일부러 흉내 내다 혹을 하나 더 붙이고 말았습니다. 남의 복을 그대로 베끼려 할 때, 복은 복이 되지 않습니다. 진짜 행운은 상황과 마음이 맞닿을 때 옵니다.",
    themes: ["진정성", "모방", "욕심", "결과"],
    emotions: ["놀라움", "질투", "낭패"],
    situations: ["뜻밖의 복", "흉내 내기", "욕심의 대가"],
  },
  {
    id: "korean-ft-green-frog",
    slug: "korean-ft-green-frog",
    title: "청개구리",
    era: "전래",
    excerpt:
      "청개구리는 어머니의 말을 반대로만 했습니다. 어머니가 임종 때 산이 아닌 냇가에 묻어 달라 한 것도, 반대로 할 것을 알았기 때문이었습니다. 그 뒤 청개구리는 비가 오면 무덤이 떠내려갈까 봐 울었습니다. 늦게 깨닫는 후회는 눈물이 되지만, 살아 있을 때 순종이 더 가볍습니다.",
    themes: ["후회", "불순종", "효", "뒤늦은 깨달음"],
    emotions: ["반항", "슬픔", "후회"],
    situations: ["말을 듣지 않음", "어머니의 지혜", "늦어 버린 마음"],
  },
  {
    id: "korean-ft-mirror",
    slug: "korean-ft-mirror",
    title: "거울을 처음 본 사람들",
    era: "전래",
    excerpt:
      "시골 부부가 거울을 처음 보고, 남편은 젊은 여자를, 아내는 젊은 남자를 숨겼다며 싸웠습니다. 장모가 보고는 주름진 노파가 왔다며 한숨을 쉬었습니다. 서로를 의심하기 시작하자 단순한 사물이 갈등의 씨앗이 되었습니다. 모르는 것을 두려워할 때, 관계는 쉽게 금이 갑니다.",
    themes: ["오해", "질투", "무지", "관계"],
    emotions: ["의심", "분노", "당황"],
    situations: ["처음 보는 것", "부부 싸움", "오해가 커짐"],
  },
  {
    id: "korean-ft-filial-tiger",
    slug: "korean-ft-filial-tiger",
    title: "효성 어린 호랑이",
    era: "민담",
    excerpt:
      "어떤 호랑이는 은혜를 입은 뒤 사람을 해치지 않고 오히려 지켰다는 이야기가 전해집니다. 맹수도 받은 마음을 기억한다는 설정 속에서, 사람들은 은혜와 보답을 되새겼습니다. 두려움의 대상도 관계 안에서는 달라질 수 있습니다. 베푼 선은 예상치 못한 자리에서 돌아옵니다. 은혜는 형태를 바꿔 다시 사람을 찾아옵니다.",
    themes: ["은혜", "보답", "공존", "기억"],
    emotions: ["고마움", "경외", "안도"],
    situations: ["생명을 구함", "은혜 갚기", "위협이 보호로"],
  },

  // ===== 민담 20 =====
  {
    id: "korean-ft-dokkaebi-game",
    slug: "korean-ft-dokkaebi-game",
    title: "도깨비와 씨름",
    era: "민담",
    excerpt:
      "한 사람이 밤길에 도깨비를 만나 씨름을 하게 되었습니다. 힘으로 이기기 어렵자 그는 꾀를 내어 위기를 넘겼습니다. 도깨비는 무섭지만 어리석고, 사람은 약하지만 머리를 씁니다. 절대적으로 강한 상대 앞에서도, 지혜는 틈을 만들어 냅니다. 겁이 나도 머리를 쓰면 길이 생깁니다.",
    themes: ["지혜", "용기", "대결", "위기"],
    emotions: ["공포", "긴장", "안도"],
    situations: ["밤길의 조우", "힘의 열세", "기지로 탈출"],
  },
  {
    id: "korean-ft-tiger-dried-persimmon",
    slug: "korean-ft-tiger-dried-persimmon",
    title: "호랑이와 곶감",
    era: "민담",
    excerpt:
      "울음을 그치지 않는 아이를 달래려 어머니가 '호랑이가 온다' 해도 소용없다가, '곶감 준다' 하니 아이가 울음을 멈췄습니다. 바깥에서 듣던 호랑이는 곶감이 자신보다 무서운 줄 알고 도망쳤습니다. 오해는 때로 강한 자까지 물러서게 합니다. 이름 모를 두려움이 진짜 위협보다 클 수 있습니다.",
    themes: ["오해", "두려움", "말", "아이러니"],
    emotions: ["공포", "황당", "웃음"],
    situations: ["아이를 달램", "착각", "강한 자의 후퇴"],
  },
  {
    id: "korean-ft-grateful-magpie",
    slug: "korean-ft-grateful-magpie",
    title: "은혜 갚은 까치",
    era: "민담",
    excerpt:
      "청년이 뱀에게 잡아먹힐 뻔한 까치를 구해 주자, 까치는 훗날 위험에서 그를 구했다는 이야기가 있습니다. 작은 생명의 위기를 지나친 않은 마음이, 나중에 자신의 위기를 넘기는 다리가 되었습니다. 사소한 선이 어디에 씨앗을 심는지는 당장 보이지 않습니다. 작은 선의 씨앗은 멀리서 꽃을 피웁니다.",
    themes: ["은혜", "생명", "보답", "선"],
    emotions: ["연민", "고마움", "안도"],
    situations: ["작은 구조", "훗날의 위기", "예상 못한 보답"],
  },
  {
    id: "korean-ft-fox-sister",
    slug: "korean-ft-fox-sister",
    title: "여우 누이",
    era: "민담",
    excerpt:
      "집안에 들어온 여우 누이는 사람을 닮았지만 본성은 달랐습니다. 남동생은 뒤늦게 정체를 알고 도망쳐 살아남았습니다. 익숙한 얼굴 뒤에 다른 마음이 있을 수 있다는 경고와 함께, 위험을 직감하고 떠나는 용기도 필요하다는 이야기를 남깁니다. 익숙함 속에서도 위험을 알아채는 눈이 필요합니다.",
    themes: ["정체", "위험", "직감", "생존"],
    emotions: ["불안", "배신감", "공포"],
    situations: ["낯선 가족의 등장", "숨은 정체", "탈출"],
  },
  {
    id: "korean-ft-gold-silver-axe",
    slug: "korean-ft-gold-silver-axe",
    title: "금도끼 은도끼",
    era: "전래",
    excerpt:
      "정직한 나무꾼은 연못에 빠진 쇠도끼만 자기 것이라고 했고, 산신령은 금도끼와 은도끼까지 그에게 주었습니다. 욕심 많은 이웃은 거짓으로 금도끼를 탐하다 모두 잃었습니다. 당장 이득처럼 보이는 말이, 신뢰가 걸린 자리에서는 가장 비싼 손실이 됩니다. 정직은 느리지만 가장 확실한 이득입니다.",
    themes: ["정직", "욕심", "신뢰", "보상"],
    emotions: ["당황", "탐욕", "기쁨"],
    situations: ["잃어버린 도구", "시험받는 정직", "거짓의 대가"],
  },
  {
    id: "korean-ft-woodcutter-filial",
    slug: "korean-ft-woodcutter-filial",
    title: "나무꾼과 어머니",
    era: "민담",
    excerpt:
      "가난한 나무꾼은 먹을 것이 없어도 어머니 몫을 먼저 챙겼습니다. 그 마음이 알려지자 마을 사람들과 하늘이 그를 도왔다는 이야기가 이어집니다. 형편이 어려울수록 누구를 먼저 생각하는가가 그 사람의 중심을 드러냅니다. 작은 효가 큰 복을 부른다는 옛사람의 믿음이 담겨 있습니다.",
    themes: ["효", "가난", "우선순위", "돌봄"],
    emotions: ["애틋", "걱정", "따뜻함"],
    situations: ["가난한 식사", "어버이 봉양", "숨은 선행"],
  },
  {
    id: "korean-ft-wise-farmer",
    slug: "korean-ft-wise-farmer",
    title: "지혜로운 농부",
    era: "민담",
    excerpt:
      "농부는 고을 원님의 어려운 수수께끼 같은 판결 앞에서 평범한 상식으로 진실을 가려냈습니다. 권위가 길을 잃을 때, 삶의 경험이 나침반이 되었습니다. 배움의 많고 적음보다 사물의 이치를 오래 관찰한 사람이 더 바른 답을 낼 때가 있습니다. 삶의 이치는 높은 자리보다 낮은 자리에서 빛납니다.",
    themes: ["지혜", "상식", "정의", "관찰"],
    emotions: ["긴장", "통쾌", "신뢰"],
    situations: ["어려운 판결", "권위 앞의 발언", "생활의 지혜"],
  },
  {
    id: "korean-ft-filial-son",
    slug: "korean-ft-filial-son",
    title: "효자 설화",
    era: "민담",
    excerpt:
      "추운 겨울, 병든 부모가 잉어를 찾자 아들은 얼음을 깨고 물고기를 구했다는 이야기가 전해집니다. 불가능해 보이는 바람 앞에서도 그는 자리를 뜨지 않았습니다. 효는 거창한 말이 아니라, 포기하지 않는 손발로 표현됩니다. 절실한 사랑은 길을 만들어 갑니다. 절실한 사랑은 얼음도 깨고 길을 만듭니다.",
    themes: ["효", "절실함", "인내", "돌봄"],
    emotions: ["애탐", "절박", "기쁨"],
    situations: ["부모의 병", "겨울 강", "불가능한 부탁"],
  },
  {
    id: "korean-ft-two-brothers-land",
    slug: "korean-ft-two-brothers-land",
    title: "의좋은 형제",
    era: "민담",
    excerpt:
      "두 형제는 추수한 곡식을 나누며, 서로 상대가 더 필요할 것이라 생각해 밤마다 몰래 볏가리를 옮겨 놓았습니다. 아침마다 곡식이 그대로인 이유를 알고 그들은 부둥켜안았습니다. 손해가 될까 봐가 아니라, 형제가 넉넉할까 봐 움직이는 마음이 진짜 나눔입니다. 서로를 먼저 생각하는 마음이 진짜 풍요입니다.",
    themes: ["형제", "나눔", "배려", "가족"],
    emotions: ["다정", "감동", "안심"],
    situations: ["추수 후 분배", "몰래 돕는 밤", "마음이 마주침"],
  },
  {
    id: "korean-ft-snake-bridegroom",
    slug: "korean-ft-snake-bridegroom",
    title: "뱀 신랑",
    era: "민담",
    excerpt:
      "뱀의 모습을 한 신랑을 받아들인 여인은 두려움 속에서도 약속을 지켰습니다. 시련이 끝난 뒤 신랑은 사람이 되어 돌아왔다는 이야기들이 있습니다. 겉모습만 보고 관계를 단정하지 않는 믿음이, 숨은 본질을 기다리게 합니다. 혐오 너머의 약속을 지키는 일은 쉽지 않습니다. 겉모습 너머를 믿는 일은 용기를 요구합니다.",
    themes: ["약속", "편견", "변신", "신뢰"],
    emotions: ["두려움", "혐오", "안도"],
    situations: ["낯선 혼인", "겉과 속", "시련 후 회복"],
  },
  {
    id: "korean-ft-lazybone",
    slug: "korean-ft-lazybone",
    title: "게으름뱅이 이야기",
    era: "민담",
    excerpt:
      "일하기 싫어하던 사람은 결국 굶주림과 웃음거리가 되어 뒤늦게 몸을 움직입니다. 편의만 쫓던 삶이 스스로를 궁지로 몬 뒤에야 일상의 소중함을 배웁니다. 미룬 노동은 사라지지 않고 빚처럼 쌓입니다. 작은 성실이 큰 낭패를 막는다는 평범한 진실을 전합니다. 미룬 하루는 언젠가 한꺼번에 청구서를 보냅니다.",
    themes: ["성실", "게으름", "교훈", "일상"],
    emotions: ["나태", "후회", "각성"],
    situations: ["일 미루기", "궁핍", "뒤늦은 각오"],
  },
  {
    id: "korean-ft-three-wishes",
    slug: "korean-ft-three-wishes",
    title: "세 가지 소원",
    era: "민담",
    excerpt:
      "소원을 들어주는 존재를 만난 부부는 욕심과 말실수로 기회를 허비합니다. 정말로 필요한 것을 고르기 전에 감정부터 앞세워 낭패를 봅니다. 주어진 기회보다 그것을 다루는 마음이 결과를 결정합니다. 바라던 문이 열려도, 지혜 없으면 빈손으로 닫힙니다. 기회는 절제와 만날 때 비로소 복이 됩니다.",
    themes: ["소원", "절제", "지혜", "욕심"],
    emotions: ["흥분", "짜증", "후회"],
    situations: ["뜻밖의 기회", "말실수", "기회 상실"],
  },
  {
    id: "korean-ft-old-man-with-lump",
    slug: "korean-ft-old-man-with-lump",
    title: "혹 떼러 간 영감",
    era: "민담",
    excerpt:
      "산속에서 도깨비를 만난 영감은 두려워하면서도 자리를 피하지 않고 함께 어울렸습니다. 그 자연스러움이 혹을 떼는 복이 되었지만, 흉내만 낸 사람은 화를 입었습니다. 상황에 진짜로 임하는 태도와 결과만 가로채려는 태도는 다릅니다. 복은 연출이 아니라 응대에서 옵니다. 복은 연출이 아니라 진심 어린 응대에서 옵니다.",
    themes: ["태도", "복", "모방", "진정성"],
    emotions: ["두려움", "신남", "낭패"],
    situations: ["예상치 못한 만남", "자연스러운 응대", "가짜 흉내"],
  },
  {
    id: "korean-ft-pond-snail-bride",
    slug: "korean-ft-pond-snail-bride",
    title: "우렁이 각시",
    era: "전래",
    excerpt:
      "혼자 살던 총각의 집에 우렁이 각시가 나타나 밥을 짓고 살림을 도왔습니다. 정체를 궁금히 여긴 총각이 몰래 엿보자 그녀는 떠났거나 시련이 시작됩니다. 고마운 존재도 신뢰 없이 소유하려 하면 관계가 깨집니다. 비밀을 존중하는 일이 사랑을 지키는 예의가 되기도 합니다. 존중 없는 호기심은 고마운 인연을 떠나보냅니다.",
    themes: ["신뢰", "호기심", "동거", "존중"],
    emotions: ["고마움", "궁금", "상실"],
    situations: ["혼자의 살림", "숨은 조력자", "엿본 비밀"],
  },
  {
    id: "korean-ft-fairies-bath",
    slug: "korean-ft-fairies-bath",
    title: "선녀의 연못",
    era: "전래",
    excerpt:
      "나무꾼이 연못에서 선녀들의 옷을 발견하고 그중 하나를 숨기면서 이야기가 시작됩니다. 잠깐의 소유욕이 하늘의 질서를 흔들고, 끝내 그리움과 이별을 남깁니다. 주운 기회를 제 것처럼 움켜쥘 때, 관계는 왜곡됩니다. 빌려 온 듯한 행운일수록 더 조심해야 합니다. 주운 행운일수록 더 조심히 다루어야 합니다.",
    themes: ["욕심", "인연", "이별", "경계"],
    emotions: ["유혹", "불안", "그리움"],
    situations: ["금지된 기회", "숨긴 옷", "깨진 균형"],
  },
  {
    id: "korean-ft-mouse-marriage",
    slug: "korean-ft-mouse-marriage",
    title: "쥐의 혼사",
    era: "민담",
    excerpt:
      "쥐 부부는 세상에서 가장 강한 사윗감을 찾아 해, 구름, 바람, 담을 전전한 끝에 다시 쥐를 택합니다. 멀리 돌고 나서야 자기 자리에 맞는 인연을 알아봅니다. 더 강해 보이는 대상이 항상 더 좋은 선택은 아닙니다. 어울림은 세기가 아니라 맞춤에서 옵니다. 어울림은 세기가 아니라 서로를 알아보는 눈에서 옵니다.",
    themes: ["분별", "인연", "자족", "비교"],
    emotions: ["조바심", "감탄", "안도"],
    situations: ["배우자 찾기", "더 센 상대", "제자리 발견"],
  },
  {
    id: "korean-ft-stone-bridge",
    slug: "korean-ft-stone-bridge",
    title: "돌다리와 나그네",
    era: "민담",
    excerpt:
      "위태로운 개울에 누군가 돌을 놓아 두었고, 나그네들은 아무 말 없이 그 위로 건넜습니다. 돌을 놓은 사람은 이름 없이 사라졌지만, 길은 남았습니다. 드러나지 않는 수고가 여러 사람의 발이 됩니다. 칭찬받지 못해도 남을 위해 놓는 돌이 세상을 잇습니다. 이름 없는 배려가 세상의 길을 잇습니다.",
    themes: ["익명", "섬김", "길", "배려"],
    emotions: ["담담", "고마움", "평온"],
    situations: ["어려운 길", "이름 없는 도움", "뒤따르는 발걸음"],
  },
  {
    id: "korean-ft-borrowed-fortune",
    slug: "korean-ft-borrowed-fortune",
    title: "빌린 복",
    era: "민담",
    excerpt:
      "가난하던 사람이 잠시 큰돈을 만졌다가 씀씀이를 아끼지 않아 다시 빈손이 됩니다. 갑자기 열린 행운을 뿌리 없는 소비로 날려 버린 뒤, 그는 작은 일상의 소중함을 배웁니다. 복은 들어오는 속도보다 다루는 태도가 더 중요합니다. 지키지 못하는 풍요는 잠깐의 꿈입니다. 다루는 법이 없는 풍요는 금세 빈손이 됩니다.",
    themes: ["절제", "행운", "교훈", "일상"],
    emotions: ["들뜸", "후회", "허무"],
    situations: ["갑작스러운 재물", "헤픈 소비", "원점 회귀"],
  },
  {
    id: "korean-ft-blindman-sight",
    slug: "korean-ft-blindman-sight",
    title: "눈을 뜬 맹인",
    era: "민담",
    excerpt:
      "오랫동안 앞을 못 보던 사람이 눈을 뜨고 세상을 보자, 기쁨과 함께 이전에 느끼지 못했던 번잡함도 함께 들어왔습니다. 그는 보는 것이 전부 복이 아님을 잠시 깨닫습니다. 결핍이 사라진 자리에도 새로운 무게가 생깁니다. 회복 뒤에는 다른 종류의 지혜가 필요합니다. 회복 뒤에는 새로운 종류의 지혜가 필요합니다.",
    themes: ["회복", "결핍", "감사", "변화"],
    emotions: ["기쁨", "당황", "성찰"],
    situations: ["오랜 장애", "갑작스러운 회복", "새로운 적응"],
  },
  {
    id: "korean-ft-shared-umbrella",
    slug: "korean-ft-shared-umbrella",
    title: "우산 하나",
    era: "민담",
    excerpt:
      "갑작스러운 소나기에 우산 하나를 나눠 쓴 두 사람은 처음엔 불편해했지만, 곧 발맞추어 걸었습니다. 비는 그쳤고, 짧은 동행은 서로에게 따뜻한 기억으로 남았습니다. 부족한 것을 나누면 관계는 시작됩니다. 완전한 준비가 없어도 함께 비를 피울 수 있습니다. 부족한 것을 나눌 때 동행이 시작됩니다.",
    themes: ["나눔", "동행", "환대", "일상"],
    emotions: ["난처", "따뜻함", "여운"],
    situations: ["갑작스러운 비", "낯선 이와 공유", "짧은 동행"],
  },
];

async function main() {
  console.log(`[ingest-korean] ${TALES.length}편 전래/민담 처리 시작`);
  let created = 0;
  let skipped = 0;

  for (const tale of TALES) {
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
          culture: "korean",
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
        sourceKind: "korean_open_data",
        language: "ko",
        culture: "korean",
        era: tale.era,
        sourceUrl: "https://www.culture.go.kr",
        landingPageUrl: null,
        licenseUrl: null,
        rightsRegion: "KR",
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

  console.log(`\n[ingest-korean] 완료: ${created}편 생성, ${skipped}편 건너뜀`);
}

main().catch((err) => {
  console.error("[ingest-korean] 실패:", err);
  process.exit(1);
});
