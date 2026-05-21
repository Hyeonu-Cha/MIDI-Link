import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';

interface ApplicationLaunchEditorProps {
  appPath: string;
  appArgs: string;
  errors: Record<string, string>;
  onAppPathChange: (appPath: string) => void;
  onAppArgsChange: (appArgs: string) => void;
  onErrorClear: (field: string) => void;
}

const inputCls = 'w-full bg-surface-container-high border border-outline-variant/30 focus:border-primary-container text-on-surface text-sm px-3 py-1.5 rounded-lg outline-none placeholder:text-on-surface-variant/40';
const labelCls = 'font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60';

const ApplicationLaunchEditor: React.FC<ApplicationLaunchEditorProps> = ({
  appPath,
  appArgs,
  errors,
  onAppPathChange,
  onAppArgsChange,
  onErrorClear,
}) => {
  const handleBrowse = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Applications', extensions: ['exe', 'bat', 'cmd', 'msi'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (selected) {
      onAppPathChange(selected as string);
      onErrorClear('appPath');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className={labelCls}>Application Path</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={appPath}
            onChange={(e) => { onAppPathChange(e.target.value); if (errors.appPath) onErrorClear('appPath'); }}
            placeholder="C:\Program Files\App\app.exe"
            className={`flex-1 min-w-0 bg-surface-container-high border ${errors.appPath ? 'border-error' : 'border-outline-variant/30'} focus:border-primary-container text-on-surface text-sm px-3 py-1.5 rounded-lg outline-none placeholder:text-on-surface-variant/40`}
          />
          <button
            type="button"
            onClick={handleBrowse}
            className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/30 hover:border-primary-container/40 text-on-surface-variant hover:text-on-surface transition-all flex-shrink-0"
            title="Browse for application"
          >
            <span className="material-symbols-outlined text-sm">folder_open</span>
          </button>
        </div>
        {errors.appPath && <p className="text-xs text-error">{errors.appPath}</p>}
      </div>
      <div className="space-y-2">
        <label className={labelCls}>Arguments (optional)</label>
        <input
          type="text"
          value={appArgs}
          onChange={(e) => onAppArgsChange(e.target.value)}
          placeholder="--arg1 value1 --arg2"
          className={inputCls}
        />
      </div>
    </div>
  );
};

export default ApplicationLaunchEditor;
