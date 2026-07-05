import { useState, useEffect } from 'react';

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleShowdownImported = (e: Event) => {
      const corrections = (e as CustomEvent).detail?.corrections as string[];
      if (corrections && corrections.length > 0) {
        setToast(`Auto-corrected:\n${corrections.join('\n')}`);
        clearTimeout(timer);
        timer = setTimeout(() => setToast(null), 4000);
      }
    };
    window.addEventListener('showdown-imported', handleShowdownImported);
    return () => {
      window.removeEventListener('showdown-imported', handleShowdownImported);
      clearTimeout(timer);
    };
  }, []);

  return { toast, setToast };
}

export default useToast;
