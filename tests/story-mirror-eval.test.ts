import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { matchPhaseA, type StoryCandidate } from "../src/lib/story-mirror/matcher";
import { shouldExcludeFromMatching } from "../src/lib/story-mirror/safety";

type S = { id: string; desc: string; themes: string[]; emotions: string[]; count: number; expect?: string[]; crisis?: string; forbidden?: string[] };
const scenarios: S[] = JSON.parse(readFileSync("tests/story-mirror-evaluation.json", "utf-8"));

const ALL: StoryCandidate[] = [
  {id:"david-psalms",workId:"w1",name:"다윗",workTitle:"시편",themes:["회개","겸손","인내","신뢰와 의심","사명과 방향"],emotions:["두려움","기쁨","슬픔","감사","후회"],situations:[],summary:"",contentWarnings:[]},
  {id:"ruth-moab",workId:"w2",name:"루스",workTitle:"루스기",themes:["기다림","인내","신뢰와 의심","가난과 존엄","동행"],emotions:["그리움","두려움","희망","평온"],situations:[],summary:"",contentWarnings:[]},
  {id:"hagar-wilderness",workId:"w3",name:"하갈",workTitle:"창세기",themes:["외로움","정체성","소속","용기와 두려움"],emotions:["절망","두려움","놀람","위로"],situations:[],summary:"",contentWarnings:[]},
  {id:"elijah-carmel",workId:"w4",name:"엘리야",workTitle:"열왕기상",themes:["용기와 두려움","사명과 방향","인내","한계"],emotions:["열정","절망","피로","위로","희망"],situations:[],summary:"",contentWarnings:[]},
  {id:"prodigal-son",workId:"w5",name:"탕자",workTitle:"누가복음",themes:["회개","자기 발견","용서","가난과 존엄"],emotions:["후회","두려움","체념","희망","기쁨"],situations:[],summary:"",contentWarnings:[]},
  {id:"joseph-egypt",workId:"w6",name:"요셉",workTitle:"창세기",themes:["인내","용기와 두려움","용서","신뢰와 의심","변화"],emotions:["두려움","슬픔","분노","기쁨","위로"],situations:[],summary:"",contentWarnings:[]},
  {id:"esther-persia",workId:"w7",name:"에스델",workTitle:"에스델기",themes:["용기와 두려움","사명과 방향","선택","동행"],emotions:["불안","두려움","열정","희망"],situations:[],summary:"",contentWarnings:[]},
  {id:"job-suffering",workId:"w8",name:"욥",workTitle:"욥기",themes:["인내","신뢰와 의심","한계","기도"],emotions:["절망","슬픔","분노","인내","평온"],situations:[],summary:"",contentWarnings:[]},
  {id:"peter-denial",workId:"w9",name:"베드로",workTitle:"요한복음",themes:["회개","용기와 두려움","용서","정체성"],emotions:["두려움","후회","슬픔","희망","기쁨"],situations:[],summary:"",contentWarnings:[]},
  {id:"jonah-reluctance",workId:"w10",name:"요나",workTitle:"요나",themes:["사명과 방향","저항","선택","인내"],emotions:["불안","분노","체념","평온"],situations:[],summary:"",contentWarnings:[]},
  {id:"chunhyang",workId:"w11",name:"춘향",workTitle:"춘향전",themes:["관계의 망설임","인내","용기와 두려움","가난과 존엄"],emotions:["기쁨","두려움","슬픔","희망"],situations:[],summary:"",contentWarnings:[]},
  {id:"heungbu",workId:"w12",name:"흥부",workTitle:"흥부전",themes:["가난과 존엄","감사","변화","관계의 망설임"],emotions:["기쁨","그리움","감사","후회"],situations:[],summary:"",contentWarnings:[]},
  {id:"simcheong",workId:"w13",name:"심청",workTitle:"심봉전",themes:["희생","동행","신뢰와 의심","가난과 존엄"],emotions:["슬픔","두려움","희망","기쁨"],situations:[],summary:"",contentWarnings:[]},
  {id:"hong-gildong",workId:"w14",name:"홍길동",workTitle:"홍길동전",themes:["정체성","정의","용기와 두려움","사명과 방향"],emotions:["분노","희망","열정","기쁨"],situations:[],summary:"",contentWarnings:[]},
  {id:"hifi",workId:"w15",name:"하이디",workTitle:"하이디",themes:["자기 발견","소속","변화","동행"],emotions:["기쁨","그리움","슬픔","희망"],situations:[],summary:"",contentWarnings:[]},
];

function up(th: string[], em: string[], n: number) {
  return { topThemes: th as never[], topEmotions: em as never[], themeFrequency: {}, emotionFrequency: {}, scriptureRefs: [], entryCount: n, dateSpan: { earliest: "", latest: "" } };
}

describe("Evaluation", () => {
  let tp = 0, ts = 0, ce = 0, ct = 0, nc = 0, nt = 0;

  for (const s of scenarios) {
    it(`${s.id}: ${s.desc}`, () => {
      if (s.crisis) { ct++; const ex = shouldExcludeFromMatching(s.crisis); if (ex) ce++; expect(ex).toBe(true); return; }
      const r = matchPhaseA(up(s.themes, s.emotions, s.count), ALL, { maxResults: 5 });
      const ids = r.map((x) => x.cardId);
      if (!s.expect || s.expect.length === 0) { nt++; const ok = ids.length === 0 || r.every((x) => x.score < 0.3); if (ok) nc++; expect(ok).toBe(true); return; }
      if (s.forbidden) { for (const x of r) for (const f of s.forbidden) expect(x.matchReason).not.toContain(f); }
      const ok = ids.slice(0, 3).some((id) => s.expect!.includes(id));
      if (ok) tp++; ts++;
      expect(ok).toBe(true);
    });
  }

  it("precision@3 >= 0.6", () => { if (ts > 0) { const p = tp / ts; console.log(`  P@3: ${tp}/${ts} = ${(p * 100).toFixed(1)}%`); expect(p).toBeGreaterThanOrEqual(0.6); } });
  it("crisis exclusion = 100%", () => { if (ct > 0) { console.log(`  Crisis: ${ce}/${ct}`); expect(ce / ct).toBe(1); } });
  it("no-match accuracy >= 0.8", () => { if (nt > 0) { console.log(`  NoMatch: ${nc}/${nt}`); expect(nc / nt).toBeGreaterThanOrEqual(0.8); } });
});
