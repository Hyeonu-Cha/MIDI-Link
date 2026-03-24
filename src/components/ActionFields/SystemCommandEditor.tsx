import { FC } from 'react';
import { SystemCommandType } from '../../types';

interface SystemCommandEditorProps {
  systemCommand: SystemCommandType;
  onSystemCommandChange: (command: SystemCommandType) => void;
}

const SystemCommandEditor: FC<SystemCommandEditorProps> = ({
  systemCommand,
  onSystemCommandChange,
}) => {
  return (
    <div className="action-fields">
      <div className="form-group">
        <label>System Command:</label>
        <select
          value={systemCommand}
          onChange={(e) => onSystemCommandChange(e.target.value as SystemCommandType)}
        >
          <optgroup label="Media Controls">
            <option value={SystemCommandType.VolumeUp}>Volume Up</option>
            <option value={SystemCommandType.VolumeDown}>Volume Down</option>
            <option value={SystemCommandType.Mute}>Mute</option>
            <option value={SystemCommandType.PlayPause}>Play/Pause</option>
            <option value={SystemCommandType.NextTrack}>Next Track</option>
            <option value={SystemCommandType.PreviousTrack}>Previous Track</option>
          </optgroup>
          <optgroup label="System Controls">
            <option value={SystemCommandType.BrightnessUp}>Brightness Up</option>
            <option value={SystemCommandType.BrightnessDown}>Brightness Down</option>
            <option value={SystemCommandType.Sleep}>Sleep</option>
            <option value={SystemCommandType.Lock}>Lock Screen</option>
            <option value={SystemCommandType.Shutdown}>Shutdown</option>
            <option value={SystemCommandType.Restart}>Restart</option>
          </optgroup>
          <optgroup label="Window Controls">
            <option value={SystemCommandType.MinimizeWindow}>Minimize Window</option>
            <option value={SystemCommandType.MaximizeWindow}>Maximize Window</option>
            <option value={SystemCommandType.CloseWindow}>Close Window</option>
            <option value={SystemCommandType.SwitchDesktop}>Switch Desktop</option>
            <option value={SystemCommandType.TaskView}>Task View</option>
          </optgroup>
          <optgroup label="Utilities">
            <option value={SystemCommandType.Screenshot}>Screenshot</option>
            <option value={SystemCommandType.ClipboardCopy}>Copy</option>
            <option value={SystemCommandType.ClipboardPaste}>Paste</option>
          </optgroup>
        </select>
      </div>
    </div>
  );
};

export default SystemCommandEditor;