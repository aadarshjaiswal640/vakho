import React, { useEffect, useState } from 'react';

// Access global Prism object loaded via script tags
const Prism = (window as any).Prism;

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (val: string) => void;
  activeLine?: number; // 1-based
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, language, onChange, activeLine }) => {
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (Prism) {
        const grammar = Prism.languages[language] || Prism.languages.javascript;
        const highlighted = Prism.highlight(code, grammar, language);
        setHtml(highlighted);
    } else {
        setHtml(code); // Fallback if Prism not loaded
    }
  }, [code, language]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = code.substring(0, start) + '  ' + code.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  };

  // Calculate top position for active line highlight
  // Assuming 24px line height (1.5rem or dependent on font size)
  const lineHeight = 24; 
  const topOffset = activeLine ? (activeLine - 1) * lineHeight : 0;

  return (
    <div className="relative w-full h-full bg-[#1e1e1e] overflow-hidden font-mono text-sm border border-slate-700 rounded-md">
      {/* Scroll Wrapper */}
      <div className="relative w-full h-full overflow-auto">
        
        {/* Layer 1: Highlight Strip */}
        {activeLine && (
          <div 
            className="absolute left-0 w-full bg-yellow-500/20 border-l-2 border-yellow-500 transition-all duration-300 pointer-events-none z-10 flex items-center"
            style={{ top: `${topOffset + 20}px`, height: `${lineHeight}px` }} // +20 for padding top
          >
            <span className="absolute right-4 text-yellow-500 text-xs font-bold opacity-70">← AI IS HERE</span>
          </div>
        )}

        {/* Layer 2: Prism Output */}
        <pre 
            aria-hidden="true"
            className={`language-${language} m-0 p-5 min-h-full pointer-events-none absolute top-0 left-0 w-full z-0`}
            style={{ lineHeight: `${lineHeight}px` }}
        >
          <code dangerouslySetInnerHTML={{ __html: html + '<br />' }} />
        </pre>

        {/* Layer 3: Textarea */}
        <textarea
          value={code}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="absolute top-0 left-0 w-full h-full p-5 bg-transparent text-transparent caret-white resize-none outline-none z-20 font-mono"
          style={{ lineHeight: `${lineHeight}px` }}
        />
      </div>
      
      {/* Footer Info */}
      <div className="absolute bottom-0 right-0 bg-slate-800 text-xs text-slate-400 px-2 py-1 rounded-tl-md z-30 pointer-events-none">
        {language.toUpperCase()} | Ln {code.split('\n').length}
      </div>
    </div>
  );
};