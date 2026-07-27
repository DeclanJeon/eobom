"use client";

import {
  BoldItalicUnderlineToggles,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertImage,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  UndoRedo,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import { forwardRef } from "react";

export const ReflectionEditor = forwardRef<
  MDXEditorMethods,
  {
    markdown: string;
    onChange: (markdown: string) => void;
    placeholder?: string;
  }
>(function ReflectionEditor({ markdown, onChange, placeholder }, ref) {
  return (
    <MDXEditor
      ref={ref}
      markdown={markdown}
      onChange={onChange}
      placeholder={placeholder}
      contentEditableClassName="eobom-editor-content"
      className="eobom-editor"
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        imagePlugin({
          imageUploadHandler: async (file) => {
            const form = new FormData();
            form.set("image", file);
            const response = await fetch("/api/uploads", {
              method: "POST",
              body: form,
            });
            const data = (await response.json()) as {
              url?: string;
              error?: string;
            };
            if (!response.ok || !data.url) {
              throw new Error(data.error || "이미지 업로드에 실패했습니다.");
            }
            return data.url;
          },
        }),
        diffSourcePlugin({ viewMode: "rich-text", diffMarkdown: "" }),
        toolbarPlugin({
          toolbarContents: () => (
            <DiffSourceToggleWrapper options={["rich-text", "source"]}>
              <UndoRedo />
              <BoldItalicUnderlineToggles />
              <ListsToggle />
              <CreateLink />
              <InsertImage />
              <InsertThematicBreak />
            </DiffSourceToggleWrapper>
          ),
        }),
      ]}
    />
  );
});
