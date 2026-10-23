import { useTranslation } from "react-i18next";
import ComingSoon from "../../src/components/ComingSoon";

// Result Report screen: built in Module 6
export default function Report() {
  const { t } = useTranslation();
  return <ComingSoon title={t("home.recent")} />;
}
