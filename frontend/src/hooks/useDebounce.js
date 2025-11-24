import { useRef, useCallback } from 'react';

/**
 * Custom hook to prevent duplicate API calls from double-clicks or rapid submissions
 * @param {number} delay - Delay in milliseconds (default: 1000ms)
 * @returns {function} - Debounced function wrapper
 */
export const useDebounce = (delay = 1000) => {
  const inProgressRef = useRef(false);

  const debounce = useCallback(
    async (fn) => {
      if (inProgressRef.current) {
        console.log('⏳ Request already in progress, ignoring duplicate');
        return null;
      }

      inProgressRef.current = true;
      try {
        const result = await fn();
        return result;
      } finally {
        // Reset after delay to prevent accidental blocks
        setTimeout(() => {
          inProgressRef.current = false;
        }, delay);
      }
    },
    [delay]
  );

  return debounce;
};

/**
 * Custom hook for managing loading states in CRUD operations
 * Prevents duplicate submissions while an operation is in progress
 */
export const useSubmitGuard = () => {
  const isSubmittingRef = useRef(false);

  const guardedSubmit = useCallback(async (submitFn) => {
    if (isSubmittingRef.current) {
      console.log('⚠️ Submission already in progress');
      return { success: false, message: 'Please wait, processing your request...' };
    }

    isSubmittingRef.current = true;
    try {
      const result = await submitFn();
      return result;
    } finally {
      isSubmittingRef.current = false;
    }
  }, []);

  const isSubmitting = () => isSubmittingRef.current;

  return { guardedSubmit, isSubmitting };
};