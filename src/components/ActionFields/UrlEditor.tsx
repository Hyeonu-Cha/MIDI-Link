import React from 'react';

interface UrlEditorProps {
  url: string;
  errors: Record<string, string>;
  onUrlChange: (url: string) => void;
  onErrorClear: (field: string) => void;
}

const UrlEditor: React.FC<UrlEditorProps> = ({
  url,
  errors,
  onUrlChange,
  onErrorClear,
}) => {
  return (
    <div className="action-fields">
      <div className="form-group">
        <label>URL:</label>
        <input
          type="url"
          value={url}
          onChange={(e) => {
            onUrlChange(e.target.value);
            if (errors.url) {
              onErrorClear('url');
            }
          }}
          placeholder="https://example.com"
          className={errors.url ? 'error' : ''}
        />
        {errors.url && <div className="error-message">{errors.url}</div>}
      </div>
    </div>
  );
};

export default UrlEditor;