import { FC } from 'react';
import { SystemCommandType, ScriptType } from '../../types';
import KeyboardShortcutEditor from './KeyboardShortcutEditor';
import ApplicationLaunchEditor from './ApplicationLaunchEditor';
import UrlEditor from './UrlEditor';
import TextEditor from './TextEditor';
import MouseClickEditor from './MouseClickEditor';
import SystemCommandEditor from './SystemCommandEditor';
import ScriptExecutionEditor from './ScriptExecutionEditor';

interface ActionFieldsRendererProps {
  actionType: string;
  formData: {
    keys: string[];
    modifiers: string[];
    keyInput: string;
    appPath: string;
    appArgs: string;
    url: string;
    text: string;
    mouseButton: string;
    mouseX: number;
    mouseY: number;
    isSelectingPoint: boolean;
    systemCommand: SystemCommandType;
    scriptType: ScriptType;
    scriptContent: string;
  };
  errors: Record<string, string>;
  onUpdateField: (field: string, value: any) => void;
  onErrorClear: (field: string) => void;
}

const ActionFieldsRenderer: FC<ActionFieldsRendererProps> = ({
  actionType,
  formData,
  errors,
  onUpdateField,
  onErrorClear,
}) => {
  const handleStartSelection = () => {
    onUpdateField('isSelectingPoint', true);
  };

  const handlePositionChange = (x: number, y: number) => {
    onUpdateField('mouseX', x);
    onUpdateField('mouseY', y);
    onUpdateField('isSelectingPoint', false);
  };

  switch (actionType) {
    case 'KeyboardShortcut':
      return (
        <KeyboardShortcutEditor
          keys={formData.keys}
          modifiers={formData.modifiers}
          keyInput={formData.keyInput}
          errors={errors}
          onKeysChange={(keys) => onUpdateField('keys', keys)}
          onModifiersChange={(modifiers) => onUpdateField('modifiers', modifiers)}
          onKeyInputChange={(keyInput) => onUpdateField('keyInput', keyInput)}
          onErrorClear={onErrorClear}
        />
      );

    case 'LaunchApplication':
      return (
        <ApplicationLaunchEditor
          appPath={formData.appPath}
          appArgs={formData.appArgs}
          errors={errors}
          onAppPathChange={(appPath) => onUpdateField('appPath', appPath)}
          onAppArgsChange={(appArgs) => onUpdateField('appArgs', appArgs)}
          onErrorClear={onErrorClear}
        />
      );

    case 'OpenUrl':
      return (
        <UrlEditor
          url={formData.url}
          errors={errors}
          onUrlChange={(url) => onUpdateField('url', url)}
          onErrorClear={onErrorClear}
        />
      );

    case 'TypeText':
      return (
        <TextEditor
          text={formData.text}
          errors={errors}
          onTextChange={(text) => onUpdateField('text', text)}
          onErrorClear={onErrorClear}
        />
      );

    case 'MouseClick':
      return (
        <MouseClickEditor
          mouseButton={formData.mouseButton}
          mouseX={formData.mouseX}
          mouseY={formData.mouseY}
          isSelectingPoint={formData.isSelectingPoint}
          errors={errors}
          onMouseButtonChange={(button) => onUpdateField('mouseButton', button)}
          onPositionChange={handlePositionChange}
          onStartSelection={handleStartSelection}
          onErrorClear={onErrorClear}
        />
      );

    case 'SystemCommand':
      return (
        <SystemCommandEditor
          systemCommand={formData.systemCommand}
          onSystemCommandChange={(command) => onUpdateField('systemCommand', command)}
        />
      );

    case 'ScriptExecution':
      return (
        <ScriptExecutionEditor
          scriptType={formData.scriptType}
          scriptContent={formData.scriptContent}
          errors={errors}
          onScriptTypeChange={(scriptType) => onUpdateField('scriptType', scriptType)}
          onScriptContentChange={(content) => onUpdateField('scriptContent', content)}
          onErrorClear={onErrorClear}
        />
      );

    default:
      return null;
  }
};

export default ActionFieldsRenderer;