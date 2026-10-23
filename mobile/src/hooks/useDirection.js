import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { isRTL } from "../i18n";

// Direction-aware icons: "forward" points left in Urdu (right-to-left)
export function useDirection() {
  const { i18n } = useTranslation();
  const rtl = isRTL(i18n.language);
  return {
    rtl,
    ForwardArrow: rtl ? ArrowLeft : ArrowRight,
    BackArrow: rtl ? ArrowRight : ArrowLeft,
    ForwardChevron: rtl ? ChevronLeft : ChevronRight
  };
}
