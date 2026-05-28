import { NavLink } from "react-router-dom";
import { useState } from "react";
import { Home, Search, Plus, Film, User } from "lucide-react";
import { CreateSheet } from "../reels/CreateSheet";
import styles from "./BottomNav.module.css";

export type BottomNavKey =
  | "home"
  | "search"
  | "add"
  | "messages"
  | "profile"
  | "reels";

interface RouteItem {
  type: "route";
  key: BottomNavKey;
  to: string;
  label: string;
  icon: React.ReactNode;
}

interface ActionItem {
  type: "action";
  key: BottomNavKey;
  label: string;
  icon: React.ReactNode;
}

type Item = RouteItem | ActionItem;

/**
 * Layout chosen per the plan's "Default A": Home / Discover / Create / Reels /
 * Profile. The center slot is now an action button that opens a bottom
 * sheet — no route attached — so the user explicitly picks between sharing
 * music and creating a reel. Messages moved to a header icon.
 */
const ITEMS: Item[] = [
  {
    type: "route",
    key: "home",
    to: "/home-feed",
    label: "Home",
    icon: <Home size={22} aria-hidden />,
  },
  {
    type: "route",
    key: "search",
    to: "/discover",
    label: "Discover",
    icon: <Search size={22} aria-hidden />,
  },
  {
    type: "action",
    key: "add",
    label: "Create",
    icon: <Plus size={22} aria-hidden />,
  },
  {
    type: "route",
    key: "reels",
    to: "/reels",
    label: "Reels",
    icon: <Film size={22} aria-hidden />,
  },
  {
    type: "route",
    key: "profile",
    to: "/profile",
    label: "Profile",
    icon: <User size={22} aria-hidden />,
  },
];

/**
 * Single shared bottom nav. Route items use NavLink so the active state is
 * derived from the URL — no per-page boolean to keep in sync. The center
 * "Create" slot is an action, not a route: it opens the CreateSheet bottom
 * sheet which picks between music-share and new-reel.
 */
export function BottomNav({ active }: { active?: BottomNavKey } = {}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav} aria-label="Primary">
        <ul className={styles.list}>
          {ITEMS.map((item) => {
            if (item.type === "action") {
              return (
                <li key={item.key} className={styles.item}>
                  <button
                    type="button"
                    className={`${styles.link} ${styles.create}`}
                    onClick={() => setCreateOpen(true)}
                    aria-label={item.label}
                    aria-haspopup="dialog"
                    aria-expanded={createOpen}
                  >
                    {item.icon}
                    <span className={styles.label}>{item.label}</span>
                  </button>
                </li>
              );
            }

            const isActive = active ? active === item.key : undefined;
            return (
              <li key={item.key} className={styles.item}>
                <NavLink
                  to={item.to}
                  className={({ isActive: routeActive }) =>
                    [
                      styles.link,
                      (isActive ?? routeActive) ? styles.linkActive : "",
                    ]
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
      <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
