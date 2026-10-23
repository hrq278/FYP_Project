// Design tokens from docs/design/MaweshiAI_UI_Spec.md §1.1
export const colors = {
  primary: "#1F5F3A",
  primaryDark: "#143F27",
  primaryTint: "#E3EFE5",
  primaryTintSoft: "#F2F8F3",
  primaryTintBorder: "#C9DCCD",
  accent: "#E8A317",
  accentBright: "#F2B23A",
  accentText: "#B45309",
  background: "#FAF7F0",
  surface: "#FFFFFF",
  surfaceMuted: "#EFEBE1",
  border: "#DCD6C8",
  borderSoft: "#E6E0D3",
  divider: "#EFEBE1",
  textPrimary: "#1B1F1A",
  textSecondary: "#3F473D",
  textMuted: "#4A5248",
  textDisabled: "#5E655B",
  iconMuted: "#6B7068",
  iconInactive: "#B9B2A3",
  cameraBg: "#10150F",
  cameraControl: "#263024",
  cameraTrack: "#3A4637",
  white: "#FFFFFF",
  stepDone: "#5FA874"
};

// Verdicts are never colour-only: always paired with an icon and a label (spec §1.1)
export const verdictColors = {
  recommended: { bg: "#DDF0E2", text: "#14532D", fill: "#1E7A3E" },
  caution: { bg: "#FCEFCF", text: "#6E4300", fill: "#D18A00" },
  not_recommended: { bg: "#FBE1DE", text: "#8F1A1A", fill: "#C0262D" }
};

// Photo-quality warning (blurry, dark)
export const warningColors = {
  border: "#C2410C",
  text: "#9A3412",
  bannerBg: "#FDEBD8",
  bannerText: "#7C2D12"
};
