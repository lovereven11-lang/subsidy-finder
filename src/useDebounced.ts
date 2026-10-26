import { useEffect, useState } from "react";

// 입력이 멈춘 뒤 delay만큼 지나야 값을 바꾼다. 글자마다 서버를 부르지 않기 위해 쓴다.
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
