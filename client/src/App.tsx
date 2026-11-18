import JournalLibrary from "./components/JournalLibrary";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
function Router() {
    return (<Switch>
      <Route path="/journal-library" component={JournalLibrary} />
      <Route path="/" component={Home}/>
      <Route path="/404" component={NotFound}/>
      <Route component={NotFound}/>
    </Switch>);
}
function App() {
    return (<ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster position="bottom-right" closeButton />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>);
}
export default App;
