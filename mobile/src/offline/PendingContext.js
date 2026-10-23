import NetInfo from "@react-native-community/netinfo";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { flushPending, listPending, removePending, submitPending, subscribe } from "./pending";

const PendingContext = createContext(null);

/**
 * Queued offline checks for the whole app: the list, whether the phone is online, and
 * `sentCount`, which goes up whenever queued checks reach the server so lists can reload.
 * Waiting checks are sent automatically when the connection comes back.
 */
export function PendingProvider({ children }) {
  const [items, setItems] = useState([]);
  const [online, setOnline] = useState(true);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    listPending().then(setItems);
    return subscribe((list) => setItems([...list]));
  }, []);

  const flush = useCallback(async () => {
    const n = await flushPending();
    if (n) setSentCount((c) => c + n);
    return n;
  }, []);

  useEffect(
    () =>
      // Fires once right away too, which sends anything left from the last time the app was open
      NetInfo.addEventListener((state) => {
        const up = state.isConnected !== false && state.isInternetReachable !== false;
        setOnline(up);
        if (up) flush();
      }),
    [flush]
  );

  const retry = useCallback(async (id) => {
    const evaluationId = await submitPending(id);
    setSentCount((c) => c + 1);
    return evaluationId;
  }, []);

  const value = useMemo(() => ({ items, online, sentCount, flush, retry, remove: removePending }), [items, online, sentCount, flush, retry]);
  return <PendingContext.Provider value={value}>{children}</PendingContext.Provider>;
}

export const usePending = () => {
  const ctx = useContext(PendingContext);
  if (!ctx) throw new Error("usePending must be used inside PendingProvider");
  return ctx;
};
