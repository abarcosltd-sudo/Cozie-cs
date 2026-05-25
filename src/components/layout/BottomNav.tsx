import { NavLink } from "react-router-dom";
import { Home, Search, Plus, MessageCircle, User } from "lucide-react";
import styles from "./BottomNav.module.css";

export type BottomNavKey = "home" | "search" | "add" | "messages" | "profile";

interface Item {
  key: BottomNavKey;
  to: string;
  label: string;
  icon: React.ReactNode;
}

const ITEMS: Item[] = [
  { key: "home", to: "/home-feed", label: "Home", icon: <Home size={22} aria-hidden /> },
  { key: "search", to: "/discover", label: "Discover", icon: <Search size={22} aria-hidden /> },
  { key: "add", to: "/share-music", label: "Share", icon: <Plus size={22} aria-hidden /> },
  { key: "messages", to: "/messages", label: "Messages", icon: <MessageCircle size={22} aria-hidden /> },
  { key: "profile", to: "/profile", label: "Profile", icon: <User size={22} aria-hidden /> },
];

/**
 * Single shared bottom nav. Uses NavLink so the active state is computed by
 * React Router from the URL — no per-page boolean to keep in sync.
 */
export function BottomNav({ active }: { active?: BottomNavKey } = {}) {
  return (
    <nav className={styles.nav} aria-label="Primary">
      <ul className={styles.list}>
        {ITEMS.map((item) => {
          const isActive = active ? active === item.key : undefined;
          return (
            <li key={item.key} className={styles.item}>
              <NavLink
                to={item.to}
                className={({ isActive: routeActive }) =>
                  [styles.link, (isActive ?? routeActive) ? styles.linkActive : ""]
                    .filter(Boolean)
                    .join(" ")
                }
                aria-label={item.label}
                end
              >
                {item.icon}
                <span className={styles.label}>{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
