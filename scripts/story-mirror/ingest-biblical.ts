/**
 * 이야기 거울 코퍼스 확장 - 성경 인물 Phase 1
 *
 * 30명 성경 인물의 StoryWork + StoryChunk를 생성한다.
 * excerpt는 150~350자 4층 구조(사건→감정→전환→응축)로 작성한다.
 */

import { db } from "@/lib/db";

const CORPUS_VERSION = "v4.3-corpus-expand";

type CharacterInput = {
  id: string;
  slug: string;
  title: string;
  titleOriginal?: string;
  author?: string;
  era: string;
  excerpt: string; // 150~350자 4층 구조
  themes: string[];
  emotions: string[];
  situations: string[];
  locator?: string;
};

const CHARACTERS: CharacterInput[] = [
  // ===== 반드시 포함할 Top 10 =====
  {
    id: "biblical-abraham",
    slug: "biblical-abraham",
    title: "아브라함",
    titleOriginal: "Abraham",
    era: "구약",
    excerpt: "아브라함은 하나님을 떠나 고향을 떠나야 하는 부르심을 받았습니다. 낯선 땅으로 향하는 길 위에서 그는 약속을 믿지만 동시에 두려움도 안고 있었습니다. 때로는 자신의 연약함으로 인해 약속을 왜곡하기도 했습니다. 그러나 하나님은 그의 걸음을 하나씩 붙들어 주셨습니다. 그의 여정은 순종이 완벽해서가 아니라, 걸어가다가도 다시 일어나 계속 걸었기에 가능했습니다.",
    themes: ["기다림", "순종", "떠남", "약속"],
    emotions: ["두려움", "기대", "믿음"],
    situations: ["새로운 시작", "불확실한 미래", "약속을 붙잡는 삶"],
  },
  {
    id: "biblical-joseph",
    slug: "biblical-joseph",
    title: "요셉",
    titleOriginal: "Joseph",
    era: "구약",
    excerpt: "요셉은 형제들에게 배신당해 애굽에 팔려갔습니다. 억울한 옥살이와 잊혀지는 시간 속에서도 그는 자신의 자리를 지켰습니다. 시간이 흘러 형제들이 다시 그의 앞에 섰을 때, 요셉은 원망이 아닌 용서로 그들을 맞이했습니다. 그가 깨달은 것은 자신의 아픔조차 더 큰 이야기 속에 놓여 있었다는 것이었습니다. 통은 끝이 아니라 새로운 시작의 씨앗이었습니다.",
    themes: ["배신", "용서", "섭리", "인내"],
    emotions: ["고통", "체념", "회복"],
    situations: ["억울한 상황", "가족 갈등", "시간 속 인내"],
  },
  {
    id: "biblical-elijah",
    slug: "biblical-elijah",
    title: "엘리야",
    titleOriginal: "Elijah",
    era: "구약",
    excerpt: "엘리야는 갈멜 산에서 큰 승리를 경험한 후 곧바로 깊은 낙심에 빠졌습니다. 그는 '나만 남았다'며 광야로 도망쳤습니다. 하나님은 그를 책망하지 않으셨습니다. 대신 따뜻한 음식과 잠으로 먼저 그의 몸을 돌보시고, 그제야 부드러운 음성으로 말씀하셨습니다. 엘리야는 자신의 약함을 숨길 필요가 없었습니다. 번아웃은 실패가 아니라, 다시 일어나기 위한 쉼이 될 수 있습니다.",
    themes: ["번아웃", "외로움", "회복"],
    emotions: ["낙심", "두려움", "안도"],
    situations: ["영적 침체", "고립감", "재충전이 필요한 때"],
  },
  {
    id: "biblical-job",
    slug: "biblical-job",
    title: "욥",
    titleOriginal: "Job",
    era: "구약",
    excerpt: "욥은 하루아침에 재산과 자녀와 건강을 모두 잃었습니다. 친구들은 그의 고통을 그의 죄 때문이라고 몰아세웠습니다. 욥은 하나님께 이유를 묻고 항변했지만, 하나님은 침묵으로 응답하셨습니다. 끝내 욥은 이유를 알지 못했지만, 하나님을 만나는 경험 자체가 그의 회복이 되었습니다. 때로 질문은 답을 얻지 못해도, 묻는 과정 속에서 우리는 하나님을 더 깊이 만나게 됩니다.",
    themes: ["고난", "질문", "인내"],
    emotions: ["통곡", "부당함", "신뢰"],
    situations: ["이해할 수 없는 고통", "침묵의 하나님", "신실함의 시험"],
  },
  {
    id: "biblical-jeremiah",
    slug: "biblical-jeremiah",
    title: "예레미야",
    titleOriginal: "Jeremiah",
    era: "구약",
    excerpt: "예레미야는 '우는 선지자'로 불렸습니다. 그는 백성에게 회개를 외쳤지만 받아들여지지 않았고, 조롱과 박해를 받았습니다. 그의 마음은 찢어졌지만 그는 멈출 수 없었습니다. 하나님 말씀이 그에게는 '타는 불' 같았습니다. 예레미야의 눈물은 약함이 아니라, 하나님의 마음을 함께 아파하는 사랑의 증거였습니다. 외로움 속에서도 사명을 놓지 않는 것은 그 자체로 강력한 증언입니다.",
    themes: ["고독", "눈물", "사명"],
    emotions: ["슬픔", "외로움", "불타는 열정"],
    situations: ["불응받는 외침", "혼자의 길", "사명감의 무게"],
  },
  {
    id: "biblical-ruth",
    slug: "biblical-ruth",
    title: "룻",
    titleOriginal: "Ruth",
    era: "구약",
    excerpt: "룻은 남편을 잃은 채 시어머니 나오미와 함께 선 베들레헴으로 왔습니다. 모든 것을 잃은 자리에 그녀가 선택한 것은 '당신의 백성이 나의 백성'이라는 결단이었습니다. 그녀는 이삭을 줍는 낮은 자리에서 성실히 일했습니다. 보아스는 그녀의 신실함을 보았고, 하나님은 그 작은 충성을 큰 축복으로 바꾸셨습니다. 상실은 끝이 아니라, 새로운 시작을 위한 텅 빈 공간이 될 수 있습니다.",
    themes: ["상실", "충성", "새로운 시작"],
    emotions: ["슬픔", "결단", "희망"],
    situations: ["예기치 않은 상실", "새로운 환경", "낮은 자리에서의 성실"],
  },
  {
    id: "biblical-hannah",
    slug: "biblical-hannah",
    title: "한나",
    titleOriginal: "Hannah",
    era: "구약",
    excerpt: "한나는 아이를 낳지 못하는 고통과 브닌나의 조롱 속에서 하나님께 통곡하며 기도했습니다. 그녀는 말보다는 눈물로 기도했습니다. 하나님은 그녀의 간구를 들으셨고 사무엘을 주셨습니다. 한나는 그 아들을 하나님께 돌려드렸습니다. 그녀의 기도는 얻기 위한 것이 아니라, 이미 자신의 모든 것을 하나님께 드린 자리에서 나온 것이었습니다. 기다림의 시간도 기도가 될 수 있습니다.",
    themes: ["기도", "기다림", "헌신"],
    emotions: ["통곡", "인내", "기쁨"],
    situations: ["응답 없는 기도", "경쟁과 조롱", "하나님께 드리는 삶"],
  },
  {
    id: "biblical-paul",
    slug: "biblical-paul",
    title: "바울",
    titleOriginal: "Paul",
    era: "신약",
    excerpt: "바울은 교회를 핍박하던 자에서 복음의 전파자로 완전히 뒤집힌 삶을 살았습니다. 그는 여러 번 매를 맞고 옥에 갇히고 배신당했습니다. 그의 육신은 약해졌지만 영은 날로 강해졌습니다. 그는 '내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있다'고 고백했습니다. 변화는 한순간에 일어나지만, 그 변화를 살아가는 것은 평생의 여정입니다.",
    themes: ["변화", "사명", "고난"],
    emotions: ["열정", "약함 속 강함", "기쁨"],
    situations: ["과거와의 단절", "박해 속 전도", "육신의 약함"],
  },
  {
    id: "biblical-thomas",
    slug: "biblical-thomas",
    title: "도마",
    titleOriginal: "Thomas",
    era: "신약",
    excerpt: `도마는 '의심하는 도마'로 기억됩니다. 그는 다른 제자들이 부활을 증언할 때 "내가 직접 봐야 믿겠다"고 했습니다. 예수님은 그를 책망하지 않으시고 직접 나타나 상처를 보여주셨습니다. 도마의 의심은 불신이 아니라 진실을 간절히 구하는 과정이었습니다. 예수님은 그 과정마저 품어주셨습니다. 의심은 믿음의 적이 아니라, 더 깊은 믿음을 향한 문이 될 수 있습니다.`,
    themes: ["의심", "확신", "탐구"],
    emotions: ["불안", "간절함", "확신"],
    situations: ["믿음의 위기", "증거를 구하는 마음", "예상치 못한 만남"],
  },
  {
    id: "biblical-mary-magdalene",
    slug: "biblical-mary-magdalene",
    title: "막달라 마리아",
    titleOriginal: "Mary Magdalene",
    era: "신약",
    excerpt: "막달라 마리아는 일곱 귀신이 겨나간 자리에서 예수를 따르기 시작했습니다. 사람들은 그녀의 과거를 잊지 않았지만, 예수는 그녀를 있는 그대로 받아주셨습니다. 그녀는 십자가 아래서 끝까지 예수를 지켰고, 부활의 첫 증인이 되었습니다. 그녀의 아픔은 치유되었고, 그 치유는 증언이 되었습니다. 상처 입은 치유자는 다른 상처 입은 자를 가장 깊이 이해할 수 있습니다.",
    themes: ["회복", "치유", "증언"],
    emotions: ["해방", "감사", "충성"],
    situations: ["과거의 상처", "낙인 속 새로운 시작", "끝까지 남는 사랑"],
  },
  // ===== 추가 인물 20명 =====
  {
    id: "biblical-jacob",
    slug: "biblical-jacob",
    title: "야곱",
    titleOriginal: "Jacob",
    era: "구약",
    excerpt: "야곱은 형의 축복을 속여 빼앗고 도망자 생활을 했습니다. 외삼촌 라반에게 속고 속이며, 그는 자신의 교활함이 다른 이에게 돌아오는 아픔을 맛보았습니다. 복 강에서 천사와 씨름하며 그는 '이스라엘'이라는 새 이름을 받았습니다. 야곱은 속이는 자에서 하나님과 씨름하는 자로 바뀌었습니다. 우리 안의 욕심과 두려움도 하나님 앞에서 Wrestling할 때 진짜 이름이 붙여집니다.",
    themes: ["두려움", "욕심", "변화", "화해"],
    emotions: ["죄책감", "고립", "변화"],
    situations: ["과거의 실수", "가족 화해", "정체성 변화"],
  },
  {
    id: "biblical-moses",
    slug: "biblical-moses",
    title: "모세",
    titleOriginal: "Moses",
    era: "구약",
    excerpt: "모세는 왕궁에서 자랐으나 자신의 민족을 위해 살인 후 광야로 도망쳤습니다. 40년 목동 생활 후 하나님은 그를 다시 부르셨습니다. 그는 말더듬이를 이유로 거절했지만, 하나님은 아론을 함께 주셨습니다. 모세는 완전한 리더가 아니었습니다. 그는 때로 불순종했고 가나안 땅에 들어가지 못했습니다. 그러나 그의 인생은 하나님과 동행한 여정이었습니다. 사명은 완벽함이 아니라 동행에서 나옵니다.",
    themes: ["사명", "부담", "리더십", "실"],
    emotions: ["부담", "소명", "후회"],
    situations: ["예상치 못한 부르심", "리더의 무게", "완성하지 못한 꿈"],
  },
  {
    id: "biblical-joshua",
    slug: "biblical-joshua",
    title: "여호수아",
    titleOriginal: "Joshua",
    era: "구약",
    excerpt: "여호수아는 모세의 후계자로 40년 광야 생활 후 가나안 정복이라는 거대한 과제를 받았습니다. 하나님은 '강하고 담대하라'고 세 번이나 말씀하셨습니다. 여호수아는 두려웠지만 순종했습니다. 요단강을 건너고 여리고 성을 무너뜨렸습니다. 그는 '나와 내 집은 여호와를 섬기겠노라'고 선언했습니다. 다음 세대를 이끌어가는 일은 큰 용기가 필요합니다. 담대함은 두려움이 없는 것이 아니라, 두려움 속에서도 한 걸음 내딛는 것입니다.",
    themes: ["용기", "책임", "순종"],
    emotions: ["두려움", "결단", "담대함"],
    situations: ["새로운 역할", "세대를 잇는 책임", "큰 결단 앞"],
  },
  {
    id: "biblical-gideon",
    slug: "biblical-gideon",
    title: "기드온",
    titleOriginal: "Gideon",
    era: "구약",
    excerpt: "기드온은 포도주 틀 아래 숨어 밀을 타작할 만큼 두려움에 떨고 있었습니다. 천사가 '큰 용사여'라고 부르자, 그는 '우리는 지파 중 가장 작고 나는 그중 막내'라고 답했습니다. 하나님은 3만 명 중 300명만 남기고 미디안을 이기게 하셨습니다. 기드온의 약함이 하나님의 능력이 나타나는 통로가 되었습니다. 자신감 부족은 사명의 장애물이 아니라, 하나님이 함께하심을 보여주는 무대입니다.",
    themes: ["자신감 부족", "믿음", "약함 속 강함"],
    emotions: ["두려움", "의심", "점점 커지는 믿음"],
    situations: ["작은 나", "예상치 못한 부르심", "불가능한 과제"],
  },
  {
    id: "biblical-samuel",
    slug: "biblical-samuel",
    title: "사무엘",
    titleOriginal: "Samuel",
    era: "구약",
    excerpt: "어린 사무엘은 밤중에 하나님의 음성을 듣고 '여기 있나이다'라고 답했습니다. 그는 엘리 제사장 아래서 자랐지만, 타락한 시대에 바른 선지자로 일어났습니다. 백성들이 왕을 요구할 때 그는 아파했지만 하나님의 뜻을 구했습니다. 사무엘은 어려서부터 하나님의 음성을 듣는 법을 배웠습니다. 작은 순종이 쌓여 한 사람의 인생이 됩니다.",
    themes: ["부르심", "순종", "경청"],
    emotions: ["겸손", "헌신", "책임"],
    situations: ["어린 시절의 발견", "타락한 시대", "하나님의 음성 듣기"],
  },
  {
    id: "biblical-esther",
    slug: "biblical-esther",
    title: "에스델",
    titleOriginal: "Esther",
    era: "구약",
    excerpt: "에스델은 왕비가 되었지만 민족이 학살당할 위기에 처했을 때 죽음을 무릅쓰고 왕 앞에 나갔습니다. '죽으면 죽으리이다'라는 고백은 그녀의 결단이었습니다. 하나님은 그녀의 아름다움과 용기를 통해 민족을 구원하셨습니다. 에스델은 자신의 자리가 우연이 아니라 '이때를 위해' 준비되었음을 알았습니다. 당신의 자리는 당신의 사명입니다.",
    themes: ["용기", "책임", "이때를 위해"],
    emotions: ["두려움", "결단", "희생"],
    situations: ["위기의 순간", "자신의 자리 발견", "타인을 위한 용기"],
  },
  {
    id: "biblical-nehemiah",
    slug: "biblical-nehemiah",
    title: "느헤미야",
    titleOriginal: "Nehemiah",
    era: "구약",
    excerpt: "느헤미야는 왕의 술관원이라는 편안한 자리를 버리고 폐허가 된 예루살렘 성벽을 재건하러 갔습니다. 적들은 조롱하고 위협했지만, 그는 한 손에는 일을 하고 다른 손에는 무기를 들었습니다. 52일 만에 성벽이 완성되었습니다. 느헤미야의 기도와 계획과 행동은 하나로 움직였습니다. 재건은 한 사람이 포기하지 않을 때 시작됩니다.",
    themes: ["재건", "공동체", "기도와 행동"],
    emotions: ["애통", "결단", "인내"],
    situations: ["무너진 것 회복", "비방 속 일하기", "공동체 재건"],
  },
  {
    id: "biblical-mary",
    slug: "biblical-mary",
    title: "마리아",
    titleOriginal: "Mary",
    era: "신약",
    excerpt: "마리아는 천사의 방문을 받고 '내게 어찌 이런 일이 있으리이까'라고 물었지만, '주의 말씀대로 내게 이루어지이다'로 답했습니다. 그녀는 약혼자 요셉과 사회의 시선 앞에서도 순종을 선택했습니다. 마리아의 찬가는 낮아진 자를 높이는 하나님의 성품을 노래했습니다. 순종은 편안한 길이 아니지만, 가장 아름다운 열매를 맺는 길입니다.",
    themes: ["순종", "헌신", "믿음"],
    emotions: ["놀람", "두려움", "기쁨"],
    situations: ["예상치 못한 부르심", "사회의 시선", "하나님의 계획"],
  },
  {
    id: "biblical-joseph-nt",
    slug: "biblical-joseph-nt",
    title: "요셉 (마리아의 남편)",
    titleOriginal: "Joseph (Husband of Mary)",
    era: "신약",
    excerpt: "요셉은 약혼녀 마리아가 임신했다는 소식을 듣고 조용히 떠나려 했습니다. 그러나 꿈속에서 천사의 음성을 듣고 마리아를 아내로 맞이했습니다. 그는 예수님의 양육자로서 예루살렘을 떠나고 다시 돌아오는 순종의 길을 걸었습니다. 요셉은 거의 말을 기록하지 않았지만, 그의 침묵과 순종이 예수님을 지켜냈습니다. 침묵도 사랑의 한 형태입니다.",
    themes: ["침묵", "책임", "순종"],
    emotions: ["혼란", "결단", "조용한 사랑"],
    situations: ["예상치 못한 상황", "조용한 희생", "가족의 책임"],
  },
  {
    id: "biblical-john-baptist",
    slug: "biblical-john-baptist",
    title: "세례요한",
    titleOriginal: "John the Baptist",
    era: "신약",
    excerpt: "세례요한은 광야에서 '회개하라'고 외치며 예수님을 준비했습니다. 그는 '나는 메시아가 아니다. 그는 흥하여야 하겠고 나는 하여야 하리라'고 했습니다. 요한은 헤롯에게 책망했다가 옥에 갇혀 목이 잘렸습니다. 그의 삶은 자신을 드러내지 않고 그리스도를 드러내는 길이었습니다. 진짜 영향력은 자신을 비우는 데서 나옵니다.",
    themes: ["정체성", "사명", "비움"],
    emotions: ["결단", "고독", "기쁨"],
    situations: ["자기 비움", "불편한 진리 말하기", "사명의 완성"],
  },
  {
    id: "biblical-timothy",
    slug: "biblical-timothy",
    title: "디모데",
    titleOriginal: "Timothy",
    era: "신약",
    excerpt: "디모데는 젊은 나이로 교회를 이끌라는 바울의 부름을 받았습니다. 그는 '너는 젊음을 무시하지 말라'는 격려가 필요했습니다. 디모데는 병약함에도 사명을 감당했습니다. 그는 바울의 영적 아들이자 동역자였습니다. 디모데의 이야지는 젊은 리더에게 용기를 줍니다. 나이와 경험이 부족해도 하나님은 사용하십니다.",
    themes: ["두려움", "성장", "젊은 리더십"],
    emotions: ["불안", "용기", "충성"],
    situations: ["젊은 리더의 부담", "선배와의 관계", "약함 속 사명"],
  },
  {
    id: "biblical-luke",
    slug: "biblical-luke",
    title: "누가",
    titleOriginal: "Luke",
    era: "신약",
    excerpt: "누가는 이방인 의사로 바울의 동역자가 되었습니다. 그는 복음서와 사도행전을 기록하여 초기 교회의 이야기를 후대에 전했습니다. 누가는 예수님의 자비와 가난한 자에 대한 관심을 특히 강조했습니다. 그의 기록은 역사적 정확성과 신학적 통찰을 모두 담았습니다. 누가는 자신의 은사로 하나님의 이야기를 문서화했습니다. 당신의 전문성도 하나님의 도구가 될 수 있습니다.",
    themes: ["동행", "기록", "은사"],
    emotions: ["충성", "관심", "정확함"],
    situations: ["은사 발견", "동역자의 역할", "기록의 사명"],
  },
  {
    id: "biblical-stephen",
    slug: "biblical-stephen",
    title: "스데반",
    titleOriginal: "Stephen",
    era: "신약",
    excerpt: "스데반은 초대 교회의 일곱 집사 중 한 명이었습니다. 그는 성령과 지혜가 충만하여 큰 권능으로 표적을 행했습니다. 공회 앞에서 설교하다가 돌에 맞아 순교했습니다. 죽으면서도 '주 예수여 내 영혼을 받으시옵소서'라고 기도했습니다. 스데반의 피는 교회의 씨앗이 되었습니다. 진실한 증언은 죽음을 넘어 생명으로 이어집니다.",
    themes: ["용기", "순교", "증언"],
    emotions: ["담대함", "평화", "용서"],
    situations: ["진실 말하기", "박해 앞 담대함", "최후의 증언"],
  },
  {
    id: "biblical-philip",
    slug: "biblical-philip",
    title: "빌립",
    titleOriginal: "Philip",
    era: "신약",
    excerpt: "빌립은 에디피아 내시를 만나 복음을 전했습니다. 성령이 '그 수레에 가까이 가라'고 하셨을 때, 빌립은 순종했습니다. 내시는 이사야 53장을 읽고 있었는데, 빌립은 예수님을 그 예언으로 설명했습니다. 내시는 기뻐하며 세례를 받았습니다. 빌립의 순종은 한 사람을 구원으로 이끌었습니다. 작은 순종이 한 사람의 영원을 바꿉니다.",
    themes: ["순종", "전도", "기회"],
    emotions: ["민감함", "기쁨", "순종"],
    situations: ["예상치 못한 만남", "성령의 인도하심", "한 사람에 대한 사랑"],
  },
  {
    id: "biblical-zacchaeus",
    slug: "biblical-zacchaeus",
    title: "삭개오",
    titleOriginal: "Zacchaenus",
    era: "신약",
    excerpt: "삭개오는 키 작은 세리장이라 예수님을 보기 위해 뽕나무에 올랐습니다. 사람들은 그를 죄인으로 보았지만, 예수는 그의 집에 가겠다고 하셨습니다. 삭개오는 재물의 절반을 가난한 자에게 주고 네 갑절이나 토색한 것을 갚겠다고 했습니다. 예수는 '오늘 구원이 이 집에 이르렀다'고 선언하셨습니다. 삭개오의 변화는 만남에서 시작되었습니다. 예수님을 만나는 순간, 모든 것이 바뀝니다.",
    themes: ["변화", "회개", "만남"],
    emotions: ["갈망", "수치", "기쁨"],
    situations: ["남들의 시선", "예상치 못한 만남", "회개와 보상"],
  },
  {
    id: "biblical-nicodemus",
    slug: "biblical-nicodemus",
    title: "니고데모",
    titleOriginal: "Nicodemus",
    era: "신약",
    excerpt: "니고데모는 밤중에 예수님을 찾아왔습니다. 그는 바리새인 지도자라 공개적으로 나오기 두려웠습니다. 예수는 그에게 '사람이 거듭나지 않으면 하나님 나라를 볼 수 없다'고 말씀하셨습니다. 나중에 니고데모는 예수의 시체를 가져다가 장사지냈습니다. 그의 믿음은 밤에서 낮으로, 은밀에서 공개로 자라났습니다. 의심과 탐구도 믿음의 시작이 될 수 있습니다.",
    themes: ["탐구", "두려움", "성장"],
    emotions: ["호기심", "두려움", "점점 커지는 확신"],
    situations: ["밤중의 질문", "사회적 지위와 믿음", "은밀한 제자에서 공개 제자로"],
  },
  {
    id: "biblical-good-samaritan",
    slug: "biblical-good-samaritan",
    title: "선한 사마리아인",
    titleOriginal: "Good Samaritan",
    era: "신약",
    excerpt: "예수의 비유 속 사마리아인은 강도 만난 유대인을 보고도 지나친 제사장과 레위인과 달리 불쌍히 여겨 기름과 포도주로 싸매고 여관까지 돌보았습니다. 사마리아인은 문화적으로 적대 관계에 있었지만, 이웃 사랑은 경계를 넘었습니다. 예수는 '네가 가서 이와 같이 하라'고 하셨습니다. 이웃 사랑은 편의가 아니라 희생에서 나옵니다.",
    themes: ["자비", "이웃 사랑", "희생"],
    emotions: ["연민", "용기", "책임"],
    situations: ["도움이 필요한 사람", "경계 넘기", "실천하는 사랑"],
  },
  {
    id: "biblical-father-prodigal",
    slug: "biblical-father-prodigal",
    title: "탕자의 아버지",
    titleOriginal: "Father of the Prodigal Son",
    era: "신약",
    excerpt: "아버지는 작은 아들이 재산을 요구해 떠나는 것을 막지 않았습니다. 날마다 먼 곳을 바라보며 기다렸습니다. 아들이 돌아올 때 아버지는 달려가 안았습니다. 큰아들은 분개했지만, 아버지는 '이 내 아들은 죽었다가 다시 살아났다'고 잔치를 베풀었습니다. 아버지의 사랑은 조건이 아니라 기다림과 환영이었습니다. 용서는 끝이 아니라 새로운 시작입니다.",
    themes: ["용서", "기다림", "무조건적 사랑"],
    emotions: ["그리움", "기쁨", "너그러움"],
    situations: ["떠난 가족", "용서의 결단", "형제 갈등"],
  },
  {
    id: "biblical-emmaus",
    slug: "biblical-emmaus",
    title: "엠마오 제자",
    titleOriginal: "Disciples on the Road to Emmaus",
    era: "신약",
    excerpt: "두 제자는 예수의 죽음 후 낙심하여 엠마오로 향하고 있었습니다. 부활하신 예수가 그들과 동행했지만 그들은 알아보지 못했습니다. 예수가 성경을 풀어 설명하실 때 그들의 마음이 뜨거워졌습니다. 떡을 떼실 때 비로소 알아보고 예수는 사라지셨습니다. 그들은 곧바로 예루살렘으로 돌아가 증언했습니다. 낙심한 길에서도 예수님은 이미 함께 계셨습니다.",
    themes: ["낙심", "깨달음", "동행"],
    emotions: ["실망", "뜨거움", "기쁨"],
    situations: ["낙심한 여정", "알아차리지 못한 동행", "깨달음 후 행동"],
  },
];

async function main() {
  console.log(`[ingest-biblical] ${CHARACTERS.length}명 성경 인물 처리 시작`);
  let created = 0;
  let skipped = 0;

  for (const char of CHARACTERS) {
    const existing = await db.storyWork.findUnique({ where: { id: char.id } });
    if (existing) {
      console.log(`  [skip] ${char.title} (이미 존재)`);
      skipped++;
      continue;
    }

    await db.storyWork.create({
      data: {
        id: char.id,
        slug: char.slug,
        title: char.title,
        titleOriginal: char.titleOriginal ?? null,
        author: char.author ?? null,
        translator: null,
        sourceKind: "bible",
        language: "ko",
        culture: "biblical",
        era: char.era,
        sourceUrl: "https://www.bible.com",
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
        id: `${char.id}-chunk`,
        workId: char.id,
        chunkIndex: 0,
        corpusVersion: CORPUS_VERSION,
        language: "ko",
        rightsStatus: "approved",
        citationAllowed: true,
        title: char.title,
        locator: char.locator ?? null,
        text: char.excerpt,
        excerpt: char.excerpt.slice(0, 200),
        summary: char.excerpt,
        themes: JSON.stringify(char.themes),
        emotions: JSON.stringify(char.emotions),
        situations: JSON.stringify(char.situations),
        sourceUrl: null,
        checksum: null,
      },
    });

    created++;
    console.log(`  [ok] ${char.title} (themes:${char.themes.length}, emotions:${char.emotions.length})`);
  }

  console.log(`\n[ingest-biblical] 완료: ${created}명 생성, ${skipped}명 건너뜀`);
}

main().catch((err) => {
  console.error("[ingest-biblical] 패:", err);
  process.exit(1);
});
