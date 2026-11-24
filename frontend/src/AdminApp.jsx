// src/AdminApp.jsx  — Admin-only dashboard shell
import { useState } from "react";
import { C } from "./theme/colors";
import Sidebar from "./components/Sidebar";
import { useAuth } from "./auth/AuthContext";

// Pages
import OverviewPage    from "./pages/OverviewPage";
import GenderPage      from "./pages/GenderPage";
import ReviewsPage     from "./pages/ReviewsPage";
import JourneyPage     from "./pages/JourneyPage";
import RevenuePage     from "./pages/RevenuePage";
import OpportunityPage from "./pages/OpportunityPage";
import CataloguePage   from "./pages/CataloguePage";
import BrandsPage      from "./pages/BrandsPage";
import EffectsPage     from "./pages/EffectsPage";
import PricingPage     from "./pages/PricingPage";
import SkinTypesPage   from "./pages/SkinTypesPage";
import ChatbotPage     from "./pages/ChatbotPage";
import UsersPage       from "./pages/UsersPage";

const PAGES = {
  overview:    <OverviewPage />,
  gender:      <GenderPage />,
  reviews:     <ReviewsPage />,
  journey:     <JourneyPage />,
  revenue:     <RevenuePage />,
  opportunity: <OpportunityPage />,
  catalogue:   <CataloguePage />,
  brands:      <BrandsPage />,
  effects:     <EffectsPage />,
  pricing:     <PricingPage />,
  skintypes:   <SkinTypesPage />,
  chatbot:     <ChatbotPage />,
  users:       <UsersPage />,
};

export default function AdminApp() {
  const getInitialAdminTab = () => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (tabParam && PAGES[tabParam]) return tabParam;
      const hashParam = window.location.hash.replace("#", "");
      if (hashParam && PAGES[hashParam]) return hashParam;
      const saved = localStorage.getItem("admin_active_tab");
      if (saved && PAGES[saved]) return saved;
    }
    return "overview";
  };

  const [page, setPageState] = useState(getInitialAdminTab);
  const { user, logout } = useAuth();

  const setPage = (newPage) => {
    setPageState(newPage);
    try {
      localStorage.setItem("admin_active_tab", newPage);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", newPage);
        window.history.replaceState({}, "", url.toString());
      }
    } catch (e) {
      console.error("Failed to persist admin tab:", e);
    }
  };

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: C.bg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: C.text,
    }}>
      <Sidebar page={page} setPage={setPage} user={user} onLogout={logout} />

      <main style={{
        flex: 1,
        padding: "2rem 2.5rem",
        overflowY: "auto",
        minWidth: 0,
      }}>
        {PAGES[page] ?? <OverviewPage />}
      </main>
    </div>
  );
}
