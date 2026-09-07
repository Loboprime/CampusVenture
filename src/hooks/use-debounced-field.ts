import { useEffect, useRef, useState } from "react";

/**
 * Keeps typing instant by holding the value locally and pushing it to the
 * shared store on a short delay (and immediately on unmount).
 */
export function useDebouncedField<T>(
  external: T,
  commit: (value: T) => void,
  delay = 300,
): [T, (value: T) => void] {
  const [local, setLocal] = useState<T>(external);
  const dirty = useRef(false);
  const commitRef = useRef(commit);
  commitRef.current = commit;

  // Adopt outside changes only when the user isn't mid-edit.
  useEffect(() => {
    if (!dirty.current) setLocal(external);
  }, [external]);

  useEffect(() => {
    if (!dirty.current) return;
    const t = window.setTimeout(() => {
      dirty.current = false;
      commitRef.current(local);
    }, delay);
    return () => window.clearTimeout(t);
  }, [local, delay]);

  useEffect(
    () => () => {
      if (dirty.current) commitRef.current(localRef.current);
    },
    [],
  );

  const localRef = useRef(local);
  localRef.current = local;

  return [
    local,
    (value: T) => {
      dirty.current = true;
      setLocal(value);
    },
  ];
}
