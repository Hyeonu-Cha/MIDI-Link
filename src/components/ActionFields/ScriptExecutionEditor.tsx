import React from 'react';
import { ScriptType } from '../../types';

interface ScriptExecutionEditorProps {
  scriptType: ScriptType;
  scriptContent: string;
  errors: Record<string, string>;
  onScriptTypeChange: (scriptType: ScriptType) => void;
  onScriptContentChange: (content: string) => void;
  onErrorClear: (field: string) => void;
}

const ScriptExecutionEditor: React.FC<ScriptExecutionEditorProps> = ({
  scriptType,
  scriptContent,
  errors,
  onScriptTypeChange,
  onScriptContentChange,
  onErrorClear,
}) => {
  return (
    <div className="action-fields">
      <div className="form-group">
        <label>Script Type:</label>
        <select
          value={scriptType}
          onChange={(e) => onScriptTypeChange(e.target.value as ScriptType)}
        >
          <option value={ScriptType.PowerShell}>PowerShell (Windows)</option>
          <option value={ScriptType.Bash}>Bash (Linux/macOS)</option>
          <option value={ScriptType.Cmd}>Command Prompt (Windows)</option>
        </select>
      </div>
      <div className="form-group">
        <label>Script Content:</label>
        <textarea
          value={scriptContent}
          onChange={(e) => {
            onScriptContentChange(e.target.value);
            if (errors.scriptContent) {
              onErrorClear('scriptContent');
            }
          }}
          placeholder="Enter your script commands..."
          rows={8}
          style={{ fontFamily: 'monospace' }}
          className={errors.scriptContent ? 'error' : ''}
        />
        {errors.scriptContent && <div className="error-message">{errors.scriptContent}</div>}
        <div className="help-text">
          Example commands:
          <ul>
            <li>PowerShell: Get-Process | Where-Object {'{'}$_.CPU -gt 100{'}'}</li>
            <li>Bash: ls -la && echo "Directory listing complete"</li>
            <li>Cmd: dir && echo Directory listing complete</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ScriptExecutionEditor;