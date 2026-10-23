import { createContext, useCallback, useContext, useMemo, useState } from "react";

export const VIEWS = ["front", "back", "left", "right", "teeth"];

const initial = () => ({
  purpose: "milk",
  budget: "",
  sellerPrice: "",
  experience: "first_time",
  // view -> { uri, quality: { ok, issues }, species: { species, isCattle } | null }
  photos: {},
  // set when the user retakes one photo from Review; capture returns to Review afterwards
  retakeView: null,
  evaluationId: null,
  // set when the upload failed for lack of internet and the check was queued on the phone (src/offline)
  pendingId: null
});

const CheckFlowContext = createContext(null);

// State for one "Check a New Animal" run, from Purpose to Processing (lives in app/check/_layout.jsx)
export function CheckFlowProvider({ children }) {
  const [state, setState] = useState(initial);

  const update = useCallback((patch) => setState((s) => ({ ...s, ...patch })), []);
  const setPhoto = useCallback((view, photo) => setState((s) => ({ ...s, photos: { ...s.photos, [view]: photo } })), []);
  const reset = useCallback(() => setState(initial()), []);

  const value = useMemo(() => ({ ...state, update, setPhoto, reset }), [state, update, setPhoto, reset]);
  return <CheckFlowContext.Provider value={value}>{children}</CheckFlowContext.Provider>;
}

export const useCheckFlow = () => {
  const ctx = useContext(CheckFlowContext);
  if (!ctx) throw new Error("useCheckFlow must be used inside CheckFlowProvider");
  return ctx;
};

// "250000" -> "2,50,000" (Pakistani digit grouping: last 3 digits, then pairs)
export const formatPkr = (digits) => {
  const d = String(digits || "").replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (d.length <= 3) return d;
  const last3 = d.slice(-3);
  const rest = d.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
};

export const parsePkr = (text) => Number(String(text || "").replace(/\D/g, "")) || 0;
