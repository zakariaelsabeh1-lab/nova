(
echo # Nova — Claude Code Instructions
echo.
echo ## Model
echo Always use claude-sonnet-4-6. Use claude-opus-4-6 for complex logic only.
echo.
echo ## Skills
echo Load and apply all installed skills before starting any task:
echo - webdesign-pro ^(uipro-cli v2.2.3^)
echo - brainstorming
echo - frontend-design
echo - supabase-postgres-best-practices
echo - vercel-react-best-practices
echo - shadcn
echo - stop-slop
echo.
echo ## Rules
echo - Do not explain. Just build.
echo - Do not ask for confirmation. Just build.
echo - Do not summarize completed steps. Just move to the next one.
echo - Always review CLAUDE.md before starting any task.
echo - Always push to GitHub after completing each major feature.
echo - Build locally at C:\Users\zerot\Desktop\nova
echo - Use .env for all credentials. Never hardcode keys.
echo.
echo ## Stack
echo - Frontend: React + Vite + Tailwind CSS
echo - Backend: Supabase ^(auth + database + storage^)
echo - Email: Resend
echo - Hosting: Vercel
echo - UI: shadcn/ui + custom Tailwind
echo.
echo ## Design Tokens
echo - Primary: #0f172a ^(navy^)
echo - Accent: #0ea5e9 ^(teal^)
echo - Background: #f1f5f9
echo - Font: Inter
echo.
echo ## Board Types
echo - Tasks
echo - Projects
echo - Assignments
echo - Vacation
echo.
echo ## Auth
echo - Supabase Auth
echo - Invite-only, no public signup
echo - Roles: Admin, Member
echo.
echo ## Notifications
echo - Resend for all emails
echo - Triggers: @ mention, assignment, daily digest
echo - Daily digest via scheduled function
) > CLAUDE.md