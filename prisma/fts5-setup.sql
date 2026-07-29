-- Story Mirror RAG v4.2 — SQLite FTS5 local search index
-- 임베딩 없이 한국어/영어 텍스트를 전문 검색한다.
-- 토크나이저: unicode61 (한글은 음절 블록 단위 토큰 → 2음절 단어도 정확 매칭).
-- 인라인(standalone) FTS5 테이블: chunkId를 FK로 두고 StoryChunk와 트리거로 동기화한다.

DROP TRIGGER IF EXISTS story_chunk_ai;
DROP TRIGGER IF EXISTS story_chunk_ad;
DROP TRIGGER IF EXISTS story_chunk_au;
DROP TABLE IF EXISTS StoryChunkFts;

CREATE VIRTUAL TABLE IF NOT EXISTS StoryChunkFts USING fts5(
  chunkId UNINDEXED,
  text,
  excerpt,
  summary,
  title,
  themes,
  tokenize = 'unicode61'
);

-- StoryChunk 삽입/수정/삭제 시 FTS5 인덱스를 자동 동기화한다.
CREATE TRIGGER IF NOT EXISTS story_chunk_ai AFTER INSERT ON StoryChunk BEGIN
  INSERT INTO StoryChunkFts (chunkId, text, excerpt, summary, title, themes)
  VALUES (new.id, new.text, new.excerpt, new.summary, new.title, new.themes);
END;

CREATE TRIGGER IF NOT EXISTS story_chunk_ad AFTER DELETE ON StoryChunk BEGIN
  DELETE FROM StoryChunkFts WHERE chunkId = old.id;
END;

CREATE TRIGGER IF NOT EXISTS story_chunk_au AFTER UPDATE ON StoryChunk BEGIN
  DELETE FROM StoryChunkFts WHERE chunkId = old.id;
  INSERT INTO StoryChunkFts (chunkId, text, excerpt, summary, title, themes)
  VALUES (new.id, new.text, new.excerpt, new.summary, new.title, new.themes);
END;

-- 기존 StoryChunk 행을 FTS5로 백필한다(토크나이저 변경/신규 DB 대비).
INSERT INTO StoryChunkFts (chunkId, text, excerpt, summary, title, themes)
SELECT id, text, excerpt, summary, title, themes FROM StoryChunk;
