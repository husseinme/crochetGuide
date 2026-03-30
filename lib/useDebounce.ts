"use client";
import { useRef } from "react";

export function useDebounce<T extends (...args: any[]) => void>(fn: T, delay = 400) {
  const timeout = useRef<NodeJS.Timeout | null>(null);

  return (...args: Parameters<T>) => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}
