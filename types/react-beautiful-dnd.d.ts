import 'react-beautiful-dnd';

declare module 'react-beautiful-dnd' {
  export interface DraggableStateSnapshot {
    isDragging: boolean;
    draggingOver: string | null;
  }
}

