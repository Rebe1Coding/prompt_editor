import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

const remarkPlugins = [remarkGfm];
const rehypePlugins = [[rehypeHighlight, { detect: true, ignoreMissing: true }]];

const components = {
  a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
};

export default function Markdown({ children }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
