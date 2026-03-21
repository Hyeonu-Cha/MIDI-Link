import React from 'react';

interface TextEditorProps {
  text: string;
  errors: Record<string, string>;
  onTextChange: (text: string) => void;
  onErrorClear: (field: string) => void;
}

const TextEditor: React.FC<TextEditorProps> = ({
  text,
  errors,
  onTextChange,
  onErrorClear,
}) => {
  return (
    <div className="action-fields">
      <div className="form-group">
        <label>Text to Type:</label>
        <textarea
          value={text}
          onChange={(e) => {
            onTextChange(e.target.value);
            if (errors.text) {
              onErrorClear('text');
            }
          }}
          placeholder="Enter the text to type..."
          rows={4}
          className={errors.text ? 'error' : ''}
        />
        {errors.text && <div className="error-message">{errors.text}</div>}
      </div>
    </div>
  );
};

export default TextEditor;