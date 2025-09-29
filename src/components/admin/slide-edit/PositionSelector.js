import React from 'react';
import { 
  MoveUpLeft, 
  MoveUp, 
  MoveUpRight, 
  MoveLeft, 
  Circle, 
  MoveRight, 
  MoveDownLeft, 
  MoveDown, 
  MoveDownRight 
} from 'lucide-react';

function PositionSelector({ currentPosition, onPositionChange }) {
  const positions = [
    { id: 'top left', icon: MoveUpLeft, title: 'Top Left' },
    { id: 'top', icon: MoveUp, title: 'Top Center' },
    { id: 'top right', icon: MoveUpRight, title: 'Top Right' },
    { id: 'left', icon: MoveLeft, title: 'Left' },
    { id: 'center', icon: Circle, title: 'Center' },
    { id: 'right', icon: MoveRight, title: 'Right' },
    { id: 'bottom left', icon: MoveDownLeft, title: 'Bottom Left' },
    { id: 'bottom', icon: MoveDown, title: 'Bottom Center' },
    { id: 'bottom right', icon: MoveDownRight, title: 'Bottom Right' }
  ];

  return (
    <div className="position-selector">
      <div className="position-grid">
        {positions.map(position => {
          const IconComponent = position.icon;
          return (
            <button 
              key={position.id}
              className={`position-btn ${currentPosition === position.id ? 'active' : ''}`}
              onClick={() => onPositionChange(position.id)}
              title={position.title}
              aria-label={position.title}
            >
              <IconComponent size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PositionSelector;
