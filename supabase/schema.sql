-- ============================================================================
-- Studio / agency system — database schema
-- Paste this whole file into the Supabase SQL Editor (Database → SQL Editor →
-- New query → paste → Run). Safe to run more than once.
-- ============================================================================

create extension if not exists pgcrypto;

-- One row per client. `portal_token` is the secret used for the client's
-- self-serve portal link (/portal/<token>).
create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  company      text default '',
  email        text default '',
  portal_token uuid not null default gen_random_uuid(),
  created_at   timestamptz not null default now()
);
-- add newer columns on existing databases too (safe to re-run):
alter table public.clients add column if not exists email text default '';
alter table public.clients add column if not exists logo_url text;
alter table public.clients add column if not exists brand_color text default '#D2452B';
alter table public.clients add column if not exists brand_font text default '';
alter table public.clients add column if not exists onboarding jsonb not null
  default '{"registration":true,"onboarding":false,"whatsapp":false,"drive":false}'::jsonb;
alter table public.clients add column if not exists language text not null default 'en';
-- client accounts + billing plan
alter table public.clients add column if not exists password_hash text;
alter table public.clients add column if not exists plan text not null default 'growth';
alter table public.clients add column if not exists payment_method text not null default 'bank_transfer';
alter table public.clients add column if not exists stripe_customer_id text;
alter table public.clients add column if not exists stripe_subscription_id text;
create unique index if not exists clients_portal_token_idx on public.clients(portal_token);

-- invoices (one row per billed period; bank transfer + stripe)
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  number text not null,
  plan text not null default 'growth',
  amount_cents integer not null default 0,
  currency text not null default 'eur',
  method text not null default 'bank_transfer',
  status text not null default 'sent',
  period_label text,
  stripe_invoice_id text,
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  paid_at timestamptz
);
create index if not exists invoices_client_idx on public.invoices(client_id);
alter table public.invoices enable row level security;

-- People invited from the client's company (they get the portal link).
create table if not exists public.client_contacts (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  name       text default '',
  email      text not null,
  created_at timestamptz not null default now()
);
create index if not exists client_contacts_client_idx on public.client_contacts(client_id);
alter table public.client_contacts enable row level security;
-- multi-seat: a contact with a password can log into the client's Locker Room
alter table public.client_contacts add column if not exists password_hash text;

-- Work requests. A ticket moves across the kanban via `status`.
-- Business rule: a client may have at most ONE ticket in 'in_progress'
-- (enforced by the partial unique index below + a check in the server action).
create table if not exists public.tickets (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  title       text not null default 'Untitled request',
  description text default '',
  form        jsonb not null default '{}'::jsonb,  -- intake answers (type, deadline, refs…)
  status      text not null default 'backlog'
              check (status in ('backlog','ready','in_progress','review','done')),
  priority    int not null default 0,              -- higher = more urgent
  position    double precision not null default 0, -- order within a column
  created_by  text not null default 'studio'       -- 'studio' | 'client'
              check (created_by in ('studio','client')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.tickets add column if not exists deliverable_url text;
create index if not exists tickets_client_idx on public.tickets(client_id);
create index if not exists tickets_status_idx on public.tickets(status);

-- Client-attached files/photos on a request (shown to the designer on the ticket).
create table if not exists public.ticket_attachments (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.tickets(id) on delete cascade,
  url        text not null,
  name       text,
  kind       text not null default 'image',
  created_at timestamptz not null default now()
);
create index if not exists ticket_attachments_ticket_idx on public.ticket_attachments(ticket_id);
alter table public.ticket_attachments enable row level security;

-- Design versions on a ticket. Each change request adds a new link; the accepted
-- one (else the latest) is what the client sees as the main design.
create table if not exists public.ticket_versions (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.tickets(id) on delete cascade,
  version    int not null default 1,
  url        text not null,
  status     text not null default 'pending'
             check (status in ('pending','accepted','changes')),
  created_at timestamptz not null default now()
);
create index if not exists ticket_versions_ticket_idx on public.ticket_versions(ticket_id);
alter table public.ticket_versions enable row level security;

-- in-app notifications (studio inbox + per-client Locker Room inbox)
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  audience   text not null default 'studio' check (audience in ('studio','client')),
  client_id  uuid references public.clients(id) on delete cascade,
  type       text not null default 'info',
  title      text not null,
  body       text default '',
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_audience_idx on public.notifications(audience, created_at desc);
create index if not exists notifications_client_idx on public.notifications(client_id, created_at desc);
alter table public.notifications enable row level security;

-- subscription status (pause billing without deleting the account)
alter table public.clients add column if not exists status text not null default 'active';
-- per-client WhatsApp group (CallMeBot): notifications for this client post here
alter table public.clients add column if not exists whatsapp_phone text default '';
alter table public.clients add column if not exists whatsapp_apikey text default '';

-- brand hub: extra brand info on the client + a per-client asset library
alter table public.clients add column if not exists brand_palette jsonb not null default '[]'::jsonb;
alter table public.clients add column if not exists brand_guidelines text default '';
create table if not exists public.brand_assets (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  name       text not null,
  url        text not null,
  kind       text not null default 'file',
  created_at timestamptz not null default now()
);
create index if not exists brand_assets_client_idx on public.brand_assets(client_id);
alter table public.brand_assets enable row level security;

-- studio settings (single-owner key/value store: bank details, plan prices, SLA…)
create table if not exists public.app_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;

-- Client evaluation of a delivered design, on a ticket.
create table if not exists public.ticket_feedback (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.tickets(id) on delete cascade,
  score      int check (score between 0 and 10),
  note       text default '',
  decision   text check (decision in ('approved','changes')),
  created_at timestamptz not null default now()
);
create index if not exists ticket_feedback_ticket_idx on public.ticket_feedback(ticket_id);
alter table public.ticket_feedback enable row level security;
create unique index if not exists tickets_one_in_progress_per_client
  on public.tickets(client_id) where status = 'in_progress';

-- Time tracking. A running timer is a row with ended_at IS NULL.
create table if not exists public.time_entries (
  id               uuid primary key default gen_random_uuid(),
  ticket_id        uuid not null references public.tickets(id) on delete cascade,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  duration_seconds int,
  note             text default ''
);
create index if not exists time_entries_ticket_idx on public.time_entries(ticket_id);
create index if not exists time_entries_running_idx on public.time_entries(ended_at) where ended_at is null;
-- At most one running timer at a time (a single designer works one thing at once).
create unique index if not exists time_entries_one_running
  on public.time_entries ((ended_at is null)) where ended_at is null;

-- One row per stylescape (a concept board), owned by a client and optionally
-- attached to a ticket as a deliverable.
create table if not exists public.stylescapes (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references public.clients(id) on delete cascade,
  ticket_id    uuid references public.tickets(id) on delete set null,
  title        text not null default 'Untitled concept',
  concept_note text default '',
  layout_key   text not null default 'editorial',
  attributes   text[] not null default '{}',
  palette      text[] not null default '{}',
  share_token  uuid not null default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists stylescapes_client_idx on public.stylescapes(client_id);
create index if not exists stylescapes_ticket_idx on public.stylescapes(ticket_id);
create unique index if not exists stylescapes_share_token_idx on public.stylescapes(share_token);

-- One row per tile that has an attached image ("col-row" key, e.g. "3-1").
create table if not exists public.tiles (
  id            uuid primary key default gen_random_uuid(),
  stylescape_id uuid not null references public.stylescapes(id) on delete cascade,
  tile_key      text not null,
  image_url     text,
  unique (stylescape_id, tile_key)
);

-- Client feedback on a stylescape. tile_key null = whole-direction rating.
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  stylescape_id uuid not null references public.stylescapes(id) on delete cascade,
  tile_key      text,
  score         int not null check (score between 0 and 10),
  note          text default '',
  reviewer_name text default '',
  created_at    timestamptz not null default now()
);
create index if not exists reviews_stylescape_idx on public.reviews(stylescape_id);

-- The app talks to these tables only from the server using the service-role key,
-- which bypasses RLS. Enabling RLS with no public policies means the anon/public
-- key cannot read or write anything directly. That is intentional.
alter table public.clients      enable row level security;
alter table public.tickets      enable row level security;
alter table public.time_entries enable row level security;
alter table public.stylescapes  enable row level security;
alter table public.tiles        enable row level security;
alter table public.reviews      enable row level security;

-- Public bucket for brand-material images (read-only to the world; uploads go
-- through the server with the service-role key).
insert into storage.buckets (id, name, public)
values ('stylescape-images', 'stylescape-images', true)
on conflict (id) do nothing;
