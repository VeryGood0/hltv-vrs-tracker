import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import "../app/app.css";

const App = lazy(() => import("../app/App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CS2 Match Predictor — симулятор турниров" },
      { name: "description", content: "Предиктор и симулятор матчей и турниров CS2 на основе рейтинга VRS и статистики карт." },
      { property: "og:title", content: "CS2 Match Predictor" },
      { property: "og:description", content: "Предиктор и симулятор матчей и турниров CS2 на основе рейтинга VRS и статистики карт." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,400;0,600;0,700;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="dark min-h-screen antialiased">
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
