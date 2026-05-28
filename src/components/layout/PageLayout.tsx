import type { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav, type BottomNavKey } from "./BottomNav";
import styles from "./PageLayout.module.css";

interface PageLayoutProps {
  children: ReactNode;
  /** Which bottom-nav tab to highlight. Omit on screens without the nav. */
  navKey?: BottomNavKey;
  /** Page title shown in the header (ignored when `branded` is true). */
  title?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  /** Right slot in the header. */
  headerRight?: ReactNode;
  branded?: boolean;
  hideHeader?: boolean;
  hideBottomNav?: boolean;
  /**
   * Force a dark surface regardless of the app theme. Used by the Reels feed
   * (spec §5.5) — the dark wrapper makes the `main` slot fill the viewport
   * and removes the centered max-width so the video can go edge-to-edge.
   */
  theme?: "dark";
  /** Overflow the main scroll container so feeds can paginate themselves. */
  className?: string;
}

export function PageLayout({
  children,
  navKey,
  title,
  showBack,
  onBack,
  headerRight,
  branded,
  hideHeader,
  hideBottomNav,
  theme,
  className,
}: PageLayoutProps) {
  const shellCls = [styles.shell, theme === "dark" ? styles.shellDark : ""]
    .filter(Boolean)
    .join(" ");
  const mainCls = [
    styles.main,
    theme === "dark" ? styles.mainDark : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={shellCls} data-theme={theme ?? undefined}>
      {!hideHeader ? (
        <Header
          title={title}
          showBack={showBack}
          onBack={onBack}
          right={headerRight}
          branded={branded}
        />
      ) : null}
      <main className={mainCls}>{children}</main>
      {!hideBottomNav ? <BottomNav active={navKey} /> : null}
    </div>
  );
}
