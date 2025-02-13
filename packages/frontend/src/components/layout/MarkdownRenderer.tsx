import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <div className="paragraph">{children}</div>,
        code: ({ children }) => (
          <span className="code-snippet">{children}</span>
        ),
        em: ({ children }) => <span className="emphasis">{children}</span>,
        strong: ({ children }) => <span className="keyword">{children}</span>,
        h3: ({ children }) => <div className="section-header">{children}</div>,
        ul: ({ children }) => <ul className="list unordered">{children}</ul>,
        ol: ({ children }) => <ol className="list ordered">{children}</ol>,
        li: ({ children }) => <li className="list-item">{children}</li>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default React.memo(MarkdownRenderer);
