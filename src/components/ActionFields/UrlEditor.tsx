import React from 'react';

interface UrlEditorProps {
  url: string;
  errors: Record<string, string>;
  onUrlChange: (url: string) => void;
  onErrorClear: (field: string) => void;
}

const UrlEditor: React.FC<UrlEditorProps> = ({ url, errors, onUrlChange, onErrorClear }) => {
  return (
    <div className="space-y-2">
      <label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">URL</label>
      <input
        type="url"
        value={url}
        onChange={(e) => { onUrlChange(e.target.value); if (errors.url) onErrorClear('url'); }}
        placeholder="https://example.com"
        className={`w-full bg-surface-container-high border ${errors.url ? 'border-error' : 'border-outline-variant/30'} focus:border-primary-container text-on-surface text-sm px-3 py-1.5 rounded-lg outline-none placeholder:text-on-surface-variant/40`}
      />
      {errors.url && <p className="text-xs text-error">{errors.url}</p>}
    </div>
  );
};

export default UrlEditor;
