import { Hammer } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { EmptyState, Screen, ScreenHeader } from "./Layout";
import { colors } from "../theme";

// Placeholder for routes built in later modules (analysis flow: Module 5, report: Module 6)
export default function ComingSoon({ title }) {
  const { t } = useTranslation();
  return (
    <Screen fixed>
      <ScreenHeader title={title} />
      <EmptyState illustration={<Hammer size={64} color={colors.primary} />} title={title} body={t("common.comingSoon")} />
    </Screen>
  );
}
