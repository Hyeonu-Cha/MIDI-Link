import { FC, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

interface PointSelectorProps {
  mouseX: number;
  mouseY: number;
  isSelecting: boolean;
  onStartSelection: () => void;
  onPositionChange: (x: number, y: number) => void;
  errors?: Record<string, string>;
}

const PointSelector: FC<PointSelectorProps> = ({
  mouseX,
  mouseY,
  isSelecting,
  onStartSelection,
  onPositionChange,
  errors = {},
}) => {
  const [showOverlay, setShowOverlay] = useState(false);

  const handleStartPointSelection = () => {
    onStartSelection();
    setShowOverlay(true);
  };

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    onPositionChange(e.clientX, e.clientY);
    setShowOverlay(false);
  }, [onPositionChange]);

  // Handle Escape key to cancel selection
  useEffect(() => {
    if (!showOverlay) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowOverlay(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showOverlay]);

  return (
    <div className="form-group">
      <label>Click Position:</label>
      <div className="position-selection">
        <button
          type="button"
          onClick={handleStartPointSelection}
          className="select-point-btn"
          disabled={isSelecting}
        >
          {showOverlay ? 'Click anywhere on screen...' : 'Select Point on Screen'}
        </button>
        <div className="help-text">
          Click the button above, then click anywhere on your screen to set the coordinates. Press Escape to cancel.
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>X Position:</label>
          <input
            type="number"
            value={mouseX}
            onChange={(e) => onPositionChange(Number(e.target.value), mouseY)}
            className={errors.mousePosition ? 'error' : ''}
          />
        </div>
        <div className="form-group">
          <label>Y Position:</label>
          <input
            type="number"
            value={mouseY}
            onChange={(e) => onPositionChange(mouseX, Number(e.target.value))}
            className={errors.mousePosition ? 'error' : ''}
          />
        </div>
      </div>
      {errors.mousePosition && <div className="error-message">{errors.mousePosition}</div>}
      <div className="help-text">
        Current position: ({mouseX}, {mouseY})
      </div>
      {showOverlay && createPortal(
        <div
          className="point-selection-overlay"
          onClick={handleOverlayClick}
        />,
        document.body
      )}
    </div>
  );
};

export default PointSelector;
