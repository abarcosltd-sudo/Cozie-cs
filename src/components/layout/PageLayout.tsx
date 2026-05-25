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
  className,
}: PageLayoutProps) {
  return (
    <div className={styles.shell}>
      {!hideHeader ? (
        <Header
          title={title}
          showBack={showBack}
          onBack={onBack}
          right={headerRight}
          branded={branded}
        />
      ) : null}
      <main className={[styles.main, className].filter(Boolean).join(" ")}>
        {children}
      </main>
      {!hideBottomNav ? <BottomNav active={navKey} /> : null}
    </div>
  );
}
