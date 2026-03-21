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
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={appPath}
            onChange={(e) => {
              onAppPathChange(e.target.value);
              if (errors.appPath) {
                onErrorClear('appPath');
              }
            }}
            placeholder="C:\Program Files\App\app.exe"
            className={errors.appPath ? 'error' : ''}
            style={{ flex: 1 }}
          />
          <button type="button" onClick={handleBrowse} className="browse-btn">
            Browse...
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