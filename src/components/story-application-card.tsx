"use client";

type Props = {
  title: string;
  body: string[];
  closing: string;
  onReadClick?: () => void;
  onWriteClick?: () => void;
};

export function StoryApplicationCard({ title, body, closing, onReadClick, onWriteClick }: Props) {
  return (
    <div className="story-card">
      <div className="story-eyebrow">이 말씀, 이런 이야기와 겹쳐 읽어보세요</div>
      <div className="story-title">{title}</div>
      <div className="story-body">
        {body.map((line, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : "6px 0 0" }}>
            {line}
          </p>
        ))}
      </div>
      <p className="story-closing">{closing}</p>
      <div className="story-actions">
        <button type="button" className="btn-ghost" onClick={onReadClick}>
          그냥 읽기
        </button>
        <button type="button" className="btn-leaf" onClick={onWriteClick}>
          한 줄 남기기
        </button>
      </div>
    </div>
  );
}
