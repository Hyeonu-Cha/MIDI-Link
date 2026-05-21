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
    if (errors.mousePosition) onErrorClear('mousePosition');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Mouse Button</label>
        <div className="relative">
          <select
            value={mouseButton}
            onChange={(e) => onMouseButtonChange(e.target.value)}
            className="w-full bg-surface-container-high border border-outline-variant/30 focus:border-primary-container text-on-surface text-sm px-3 py-1.5 rounded-lg outline-none appearance-none cursor-pointer"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="middle">Middle</option>
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-sm">arrow_drop_down</span>
        </div>
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
