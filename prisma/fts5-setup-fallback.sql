-- Fallback FTS5 for SQLite without remove_diacritics 2 (e.g. 3.46)
-- Used when fts5-setup.sql with remove_diacritics fails on older SQLite.
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

INSERT INTO StoryChunkFts (chunkId, text, excerpt, summary, title, themes)
SELECT id, text, excerpt, summary, title, themes FROM StoryChunk;
