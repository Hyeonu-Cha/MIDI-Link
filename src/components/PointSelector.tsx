import React, { useRef, useEffect } from 'react';

interface PointSelectorProps {
  mouseX: number;
  mouseY: number;
  isSelecting: boolean;
  onStartSelection: () => void;
  onPositionChange: (x: number, y: number) => void;
  errors?: Record<string, string>;
}

const PointSelector: React.FC<PointSelectorProps> = ({
  mouseX,
  mouseY,
  isSelecting,
  onStartSelection,
  onPositionChange,
  errors = {},
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Clean up overlay if component unmounts during selection
  useEffect(() => {
    return () => {
      if (overlayRef.current && document.body.contains(overlayRef.current)) {
        document.body.removeChild(overlayRef.current);
        document.body.style.pointerEvents = 'auto';
      }
    };
  }, []);

  const handleStartPointSelection = () => {
    onStartSelection();
    document.body.style.pointerEvents = 'none';

    const overlay = document.createElement('div');
    overlayRef.current = overlay;
    overlay.id = 'point-selection-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(255, 0, 0, 0.1);
      cursor: crosshair;
      z-index: 9999;
      pointer-events: auto;
    `;

    const cleanup = () => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      document.body.style.pointerEvents = 'auto';
      document.removeEventListener('keydown', handleEscape);
      overlayRef.current = null;
    };

    const handleClick = (e: MouseEvent) => {
      onPositionChange(e.clientX, e.clientY);
      cleanup();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
      }
    };

    overlay.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleEscape);
    document.body.appendChild(overlay);
  };

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
          {isSelecting ? 'Click anywhere on screen...' : 'Select Point on Screen'}
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
    </div>
  );
};

export default PointSelector;