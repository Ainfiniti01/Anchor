import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { ChatProvider } from "./context/ChatContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Onboarding from "./pages/Onboarding";
import SetupProfile from "./pages/SetupProfile";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Progress from "./pages/Progress";
import Settings from "./pages/Settings";
import CheckIn from "./pages/CheckIn";
import LogUrge from "./pages/LogUrge";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import PinLock from "./components/PinLock";
import { useAuthLock } from "./hooks/use-auth-lock";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isLocked, unlock } = useAuthLock();
  const location = useLocation();
  
  // Double safety: Never show PIN lock on these routes regardless of state
  const safePaths = ['/', '/login', '/register', '/onboarding', '/forgot-password', '/setup-profile'];
  const shouldShowLock = isLocked && !safePaths.includes(location.pathname);

  return (
    <>
      {shouldShowLock && <PinLock onSuccess={unlock} />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/setup-profile" element={<SetupProfile />} />
        <Route path="/home" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/check-in" element={<CheckIn />} />
        <Route path="/log-urge" element={<LogUrge />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ChatProvider>
              <AppContent />
            </ChatProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;