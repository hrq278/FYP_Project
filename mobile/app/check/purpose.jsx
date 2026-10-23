import { useTranslation } from "react-i18next";
import ComingSoon from "../../src/components/ComingSoon";

// Buying Purpose screen: built in Module 5
export default function Purpose() {
  const { t } = useTranslation();
  return <ComingSoon title={t("home.heroTitle")} />;
}
