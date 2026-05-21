import React from 'react';

interface TextEditorProps {
  text: string;
  errors: Record<string, string>;
  onTextChange: (text: string) => void;
  onErrorClear: (field: string) => void;
}

const TextEditor: React.FC<TextEditorProps> = ({ text, errors, onTextChange, onErrorClear }) => {
  return (
    <div className="space-y-2">
      <label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Text to Type</label>
      <textarea
        value={text}
        onChange={(e) => { onTextChange(e.target.value); if (errors.text) onErrorClear('text'); }}
        placeholder="Enter the text to type..."
        rows={3}
        className={`w-full bg-surface-container-high border ${errors.text ? 'border-error' : 'border-outline-variant/30'} focus:border-primary-container text-on-surface text-sm px-3 py-1.5 rounded-lg outline-none placeholder:text-on-surface-variant/40 resize-none`}
      />
      {errors.text && <p className="text-xs text-error">{errors.text}</p>}
    </div>
  );
};

export default TextEditor;
