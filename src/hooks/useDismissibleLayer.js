import { useEffect } from 'react';

export default function useDismissibleLayer({
  isOpen,
  containerRef,
  onDismiss,
  closeOnEscape = false
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerLikeDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        onDismiss();
      }
    }

    function handleKeyDown(event) {
      if (closeOnEscape && event.key === 'Escape') {
        onDismiss();
      }
    }

    // Keep both pointer and mouse/touch listeners for broad browser/test compatibility.
    document.addEventListener('pointerdown', handlePointerLikeDown);
    document.addEventListener('mousedown', handlePointerLikeDown);
    document.addEventListener('touchstart', handlePointerLikeDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerLikeDown);
      document.removeEventListener('mousedown', handlePointerLikeDown);
      document.removeEventListener('touchstart', handlePointerLikeDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOnEscape, containerRef, isOpen, onDismiss]);
}
