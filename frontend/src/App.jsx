// src/App.jsx — Root router: Login → Admin dashboard OR User storefront
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ThemeProvider } from "./theme/ThemeContext";
import LoginPage  from "./pages/LoginPage";
import AdminApp   from "./AdminApp";
import StoreFront from "./store/StoreFront";
import DevMailboxPage from "./pages/DevMailboxPage";

function Router() {
  const { user } = useAuth();
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/dev/mailbox")) {
    return <DevMailboxPage />;
  }
  if (!user)                  return <LoginPage />;
  if (user.role === "admin")  return <AdminApp />;
  return <StoreFront />;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router />
      </ThemeProvider>
    </AuthProvider>
  );
}
