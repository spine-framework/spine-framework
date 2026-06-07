#!/usr/bin/env node
// Postinstall welcome message — runs automatically after npm install spine-framework.
// Tells the agent (or developer) exactly what to do next.
// Uses only Node built-ins — no dependencies.

const lines = [
  '',
  '╭──────────────────────────────────────────────────────────────╮',
  '│                                                              │',
  '│   ███████╗██████╗ ██╗███╗   ██╗███████╗                    │',
  '│   ██╔════╝██╔══██╗██║████╗  ██║██╔════╝                    │',
  '│   ███████╗██████╔╝██║██╔██╗ ██║█████╗                      │',
  '│   ╚════██║██╔═══╝ ██║██║╚██╗██║██╔══╝                      │',
  '│   ███████║██║     ██║██║ ╚████║███████╗                    │',
  '│   ╚══════╝╚═╝     ╚═╝╚═╝  ╚═══╝╚══════╝  Framework v0.1   │',
  '│                                                              │',
  '╰──────────────────────────────────────────────────────────────╯',
  '',
  '  Spine Framework installed successfully!',
  '',
  '  To complete setup you need a Supabase project.',
  '  ─────────────────────────────────────────────',
  '  If you have one already, run:',
  '',
  '    spine-framework init \\',
  '      --url       https://<project>.supabase.co \\',
  '      --anon-key  <anon-key> \\',
  '      --service-role-key <service-role-key>',
  '',
  '  Your credentials are at:',
  '  Supabase Dashboard → Your Project → Settings → API',
  '',
  '  ─────────────────────────────────────────────',
  '  If you need a Supabase project, create one at:',
  '  https://supabase.com/dashboard → New project',
  '',
  '  After init:',
  '    spine-framework install-app <app-slug>   # optional apps',
  '    npm run assemble && netlify dev           # start dev server',
  '',
  '  Docs: https://github.com/art-mojo-admin/spine',
  '',
]

console.log(lines.join('\n'))
