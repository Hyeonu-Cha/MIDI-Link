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

const labelCls = 'font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60';

const ScriptExecutionEditor: React.FC<ScriptExecutionEditorProps> = ({
  scriptType,
  scriptContent,
  errors,
  onScriptTypeChange,
  onScriptContentChange,
  onErrorClear,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className={labelCls}>Script Type</label>
        <div className="relative">
          <select
            value={scriptType}
            onChange={(e) => onScriptTypeChange(e.target.value as ScriptType)}
            className="w-full bg-surface-container-high border border-outline-variant/30 focus:border-primary-container text-on-surface text-sm px-3 py-1.5 rounded-lg outline-none appearance-none cursor-pointer"
          >
            <option value={ScriptType.PowerShell}>PowerShell (Windows)</option>
            <option value={ScriptType.Bash}>Bash (Linux/macOS)</option>
            <option value={ScriptType.Cmd}>Command Prompt (Windows)</option>
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-sm">arrow_drop_down</span>
        </div>
      </div>
      <div className="space-y-2">
        <label className={labelCls}>Script Content</label>
        <textarea
          value={scriptContent}
          onChange={(e) => { onScriptContentChange(e.target.value); if (errors.scriptContent) onErrorClear('scriptContent'); }}
          placeholder="Enter your script commands..."
          rows={6}
          className={`w-full bg-surface-container-high border ${errors.scriptContent ? 'border-error' : 'border-outline-variant/30'} focus:border-primary-container text-on-surface text-sm px-3 py-1.5 rounded-lg outline-none placeholder:text-on-surface-variant/40 resize-none font-mono`}
        />
        {errors.scriptContent && <p className="text-xs text-error">{errors.scriptContent}</p>}
      </div>
    </div>
  );
};

export default ScriptExecutionEditor;
