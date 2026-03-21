import React from 'react';
import PointSelector from '../PointSelector';

interface MouseClickEditorProps {
  mouseButton: string;
  mouseX: number;
  mouseY: number;
  isSelectingPoint: boolean;
  errors: Record<string, string>;
  onMouseButtonChange: (button: string) => void;
  onPositionChange: (x: number, y: number) => void;
  onStartSelection: () => void;
  onErrorClear: (field: string) => void;
}

const MouseClickEditor: React.FC<MouseClickEditorProps> = ({
  mouseButton,
  mouseX,
  mouseY,
  isSelectingPoint,
  errors,
  onMouseButtonChange,
  onPositionChange,
  onStartSelection,
  onErrorClear,
}) => {
  const handlePositionChange = (x: number, y: number) => {
    onPositionChange(x, y);
    if (errors.mousePosition) {
      onErrorClear('mousePosition');
    }
  };

  return (
    <div className="action-fields">
      <div className="form-group">
        <label>Mouse Button:</label>
        <select value={mouseButton} onChange={(e) => onMouseButtonChange(e.target.value)}>
          <option value="left">Left</option>
          <option value="right">Right</option>
          <option value="middle">Middle</option>
        </select>
      </div>
      <PointSelector
        mouseX={mouseX}
        mouseY={mouseY}
        isSelecting={isSelectingPoint}
        onStartSelection={onStartSelection}
        onPositionChange={handlePositionChange}
        errors={errors}
      />
    </div>
  );
};

export default MouseClickEditor;