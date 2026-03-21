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
    <div className="action-fields">
      <div className="form-group">
        <label>Application Path:</label>
        <div className="input-with-icon">
          <input
            type="text"
            value={appPath}
            onChange={(e) => {
              onAppPathChange(e.target.value);
              if (errors.appPath) onErrorClear('appPath');
            }}
            placeholder="C:\Program Files\App\app.exe"
            className={errors.appPath ? 'error' : ''}
          />
          <button type="button" onClick={handleBrowse} className="input-icon-btn" title="Browse for application">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
        {errors.appPath && <div className="error-message">{errors.appPath}</div>}
      </div>
      <div className="form-group">
        <label>Arguments (optional):</label>
        <input
          type="text"
          value={appArgs}
          onChange={(e) => onAppArgsChange(e.target.value)}
          placeholder="--arg1 value1 --arg2"
        />
      </div>
    </div>
  );
};

export default ApplicationLaunchEditor;