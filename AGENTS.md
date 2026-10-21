<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The imported CS2 simulator lives in src/app and is rendered client-only from src/routes/index.tsx — it relies on localStorage everywhere.
- Simulation settings (rating weight) live in src/app/utils/settings.ts and are read by mapSimulation — single source for rating-vs-map blending.
- Grand final detection must use isGrandFinalMatch() in tournament.ts — name-based "финал" matching caught quarterfinals.
