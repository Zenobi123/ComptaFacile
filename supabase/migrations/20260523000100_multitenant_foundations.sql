create extension if not exists pgcrypto;

create type public.tenant_type as enum ('company', 'firm', 'association');
create type public.member_role as enum (
    'super_admin_saas',
    'admin_saas',
    'admin_entreprise',
    'chef_comptable',
    'comptable',
    'caissier',
    'fiscaliste',
    'dirigeant',
    'auditeur',
    'collaborateur_cabinet'
);
create type public.member_status as enum ('invited', 'active', 'suspended', 'disabled');
create type public.fiscal_year_status as enum ('draft', 'open', 'closed', 'archived');
create type public.accounting_period_status as enum ('open', 'in_review', 'locked', 'closed');
create type public.journal_entry_status as enum ('draft', 'pending_review', 'validated', 'rejected', 'reversed');

create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    email text not null,
    full_name text,
    is_platform_admin boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.tenants (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    tenant_type public.tenant_type not null default 'company',
    status text not null default 'active',
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.tenant_memberships (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants (id) on delete cascade,
    user_id uuid references auth.users (id) on delete cascade,
    invited_email text,
    role public.member_role not null,
    status public.member_status not null default 'invited',
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint tenant_memberships_user_or_email_check check (user_id is not null or invited_email is not null),
    constraint tenant_memberships_unique_user unique (tenant_id, user_id),
    constraint tenant_memberships_unique_invite unique (tenant_id, invited_email)
);

create table public.companies (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants (id) on delete cascade,
    legal_name text not null,
    trade_name text,
    legal_form text,
    niu text,
    rccm text,
    sector text,
    address text,
    city text,
    tax_center text,
    default_currency char(3) not null default 'XAF',
    status text not null default 'draft',
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint companies_tenant_id_id_unique unique (tenant_id, id),
    constraint companies_tenant_niu_unique unique (tenant_id, niu)
);

create table public.fiscal_years (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    company_id uuid not null,
    label text not null,
    starts_on date not null,
    ends_on date not null,
    status public.fiscal_year_status not null default 'draft',
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fiscal_years_company_fk foreign key (tenant_id, company_id) references public.companies (tenant_id, id) on delete cascade,
    constraint fiscal_years_tenant_company_id_unique unique (tenant_id, company_id, id),
    constraint fiscal_years_dates_check check (starts_on < ends_on),
    constraint fiscal_years_company_label_unique unique (tenant_id, company_id, label)
);

create table public.accounting_periods (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    company_id uuid not null,
    fiscal_year_id uuid not null,
    label text not null,
    starts_on date not null,
    ends_on date not null,
    status public.accounting_period_status not null default 'open',
    reopened_reason text,
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint accounting_periods_fiscal_year_fk foreign key (tenant_id, company_id, fiscal_year_id) references public.fiscal_years (tenant_id, company_id, id) on delete cascade,
    constraint accounting_periods_tenant_company_fy_id_unique unique (tenant_id, company_id, fiscal_year_id, id),
    constraint accounting_periods_dates_check check (starts_on <= ends_on),
    constraint accounting_periods_company_label_unique unique (tenant_id, company_id, fiscal_year_id, label)
);

create table public.company_fiscal_profiles (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    company_id uuid not null,
    fiscal_year_id uuid not null,
    tax_regime text not null,
    dsf_type text,
    accounting_system text not null default 'normal',
    vat_enabled boolean not null default false,
    withholding_enabled boolean not null default false,
    stock_enabled boolean not null default false,
    fixed_assets_enabled boolean not null default false,
    payroll_enabled boolean not null default false,
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint company_fiscal_profiles_fiscal_year_fk foreign key (tenant_id, company_id, fiscal_year_id) references public.fiscal_years (tenant_id, company_id, id) on delete cascade,
    constraint company_fiscal_profiles_year_unique unique (tenant_id, company_id, fiscal_year_id)
);

create table public.ohada_account_classes (
    class_code text primary key,
    label text not null,
    description text,
    sort_order integer not null
);

create table public.company_accounts (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    company_id uuid not null,
    account_number text not null,
    label text not null,
    class_code text not null references public.ohada_account_classes (class_code),
    parent_account_id uuid references public.company_accounts (id),
    is_active boolean not null default true,
    is_reference boolean not null default false,
    requires_lettering boolean not null default false,
    treasury_kind text,
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint company_accounts_company_fk foreign key (tenant_id, company_id) references public.companies (tenant_id, id) on delete cascade,
    constraint company_accounts_tenant_company_id_unique unique (tenant_id, company_id, id),
    constraint company_accounts_company_number_unique unique (tenant_id, company_id, account_number),
    constraint company_accounts_number_class_check check (left(account_number, 1) = class_code)
);

create table public.journal_type_templates (
    code text primary key,
    label text not null,
    sort_order integer not null
);

create table public.journals (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    company_id uuid not null,
    code text not null,
    label text not null,
    journal_type text not null references public.journal_type_templates (code),
    is_active boolean not null default true,
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint journals_company_fk foreign key (tenant_id, company_id) references public.companies (tenant_id, id) on delete cascade,
    constraint journals_tenant_company_id_unique unique (tenant_id, company_id, id),
    constraint journals_company_code_unique unique (tenant_id, company_id, code)
);

create table public.journal_entries (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    company_id uuid not null,
    fiscal_year_id uuid not null,
    accounting_period_id uuid not null,
    journal_id uuid not null,
    entry_number text,
    entry_date date not null,
    label text not null,
    reference text,
    status public.journal_entry_status not null default 'draft',
    reversal_of_entry_id uuid references public.journal_entries (id),
    validated_at timestamptz,
    validated_by uuid references auth.users (id),
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint journal_entries_period_fk foreign key (tenant_id, company_id, fiscal_year_id, accounting_period_id) references public.accounting_periods (tenant_id, company_id, fiscal_year_id, id),
    constraint journal_entries_journal_fk foreign key (tenant_id, company_id, journal_id) references public.journals (tenant_id, company_id, id),
    constraint journal_entries_tenant_company_id_unique unique (tenant_id, company_id, id),
    constraint journal_entries_number_unique unique (tenant_id, company_id, fiscal_year_id, journal_id, entry_number)
);

create table public.journal_entry_lines (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    company_id uuid not null,
    journal_entry_id uuid not null,
    account_id uuid not null,
    line_number integer not null,
    label text,
    debit_amount numeric(18, 2) not null default 0,
    credit_amount numeric(18, 2) not null default 0,
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint journal_entry_lines_entry_fk foreign key (tenant_id, company_id, journal_entry_id) references public.journal_entries (tenant_id, company_id, id) on delete cascade,
    constraint journal_entry_lines_account_fk foreign key (tenant_id, company_id, account_id) references public.company_accounts (tenant_id, company_id, id),
    constraint journal_entry_lines_entry_line_unique unique (journal_entry_id, line_number),
    constraint journal_entry_lines_amounts_check check (
        debit_amount >= 0
        and credit_amount >= 0
        and (
            (debit_amount > 0 and credit_amount = 0)
            or (credit_amount > 0 and debit_amount = 0)
        )
    )
);

create table public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.tenants (id) on delete set null,
    company_id uuid,
    actor_id uuid references auth.users (id),
    action text not null,
    entity_table text not null,
    entity_id uuid,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index tenant_memberships_user_idx on public.tenant_memberships (user_id, status);
create index companies_tenant_idx on public.companies (tenant_id);
create index fiscal_years_company_idx on public.fiscal_years (tenant_id, company_id);
create index accounting_periods_year_idx on public.accounting_periods (tenant_id, company_id, fiscal_year_id);
create index company_accounts_company_idx on public.company_accounts (tenant_id, company_id);
create index journals_company_idx on public.journals (tenant_id, company_id);
create index journal_entries_company_year_idx on public.journal_entries (tenant_id, company_id, fiscal_year_id);
create index journal_entry_lines_entry_idx on public.journal_entry_lines (tenant_id, company_id, journal_entry_id);
create index audit_logs_tenant_created_idx on public.audit_logs (tenant_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function public.is_platform_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = check_user_id
          and is_platform_admin = true
    );
$$;

create or replace function public.is_tenant_member(check_tenant_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.is_platform_admin(check_user_id)
        or exists (
            select 1
            from public.tenant_memberships
            where tenant_id = check_tenant_id
              and user_id = check_user_id
              and status = 'active'
        );
$$;

create or replace function public.has_tenant_role(
    check_tenant_id uuid,
    allowed_roles public.member_role[],
    check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.is_platform_admin(check_user_id)
        or exists (
            select 1
            from public.tenant_memberships
            where tenant_id = check_tenant_id
              and user_id = check_user_id
              and status = 'active'
              and role = any(allowed_roles)
        );
$$;

create or replace function public.prevent_validated_entry_changes()
returns trigger
language plpgsql
as $$
begin
    if old.status in ('validated', 'reversed') then
        raise exception 'Validated or reversed journal entries cannot be modified directly';
    end if;

    return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.prevent_validated_entry_line_changes()
returns trigger
language plpgsql
as $$
declare
    parent_status public.journal_entry_status;
begin
    select status into parent_status
    from public.journal_entries
    where id = coalesce(new.journal_entry_id, old.journal_entry_id);

    if parent_status in ('validated', 'reversed') then
        raise exception 'Lines of validated or reversed journal entries cannot be modified directly';
    end if;

    return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.ensure_entry_can_be_validated()
returns trigger
language plpgsql
as $$
declare
    line_count integer;
    debit_total numeric(18, 2);
    credit_total numeric(18, 2);
    period_status public.accounting_period_status;
begin
    if new.status = 'validated' and old.status is distinct from 'validated' then
        select count(*), coalesce(sum(debit_amount), 0), coalesce(sum(credit_amount), 0)
        into line_count, debit_total, credit_total
        from public.journal_entry_lines
        where tenant_id = new.tenant_id
          and company_id = new.company_id
          and journal_entry_id = new.id;

        if line_count < 2 then
            raise exception 'A validated journal entry must contain at least two lines';
        end if;

        if debit_total <> credit_total then
            raise exception 'A validated journal entry must be balanced';
        end if;

        select status into period_status
        from public.accounting_periods
        where id = new.accounting_period_id;

        if period_status in ('locked', 'closed') then
            raise exception 'A journal entry cannot be validated in a locked or closed period';
        end if;

        new.validated_at = coalesce(new.validated_at, now());
        new.validated_by = coalesce(new.validated_by, auth.uid());
    end if;

    return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger tenants_set_updated_at before update on public.tenants for each row execute function public.set_updated_at();
create trigger tenant_memberships_set_updated_at before update on public.tenant_memberships for each row execute function public.set_updated_at();
create trigger companies_set_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger fiscal_years_set_updated_at before update on public.fiscal_years for each row execute function public.set_updated_at();
create trigger accounting_periods_set_updated_at before update on public.accounting_periods for each row execute function public.set_updated_at();
create trigger company_fiscal_profiles_set_updated_at before update on public.company_fiscal_profiles for each row execute function public.set_updated_at();
create trigger company_accounts_set_updated_at before update on public.company_accounts for each row execute function public.set_updated_at();
create trigger journals_set_updated_at before update on public.journals for each row execute function public.set_updated_at();
create trigger journal_entries_set_updated_at before update on public.journal_entries for each row execute function public.set_updated_at();
create trigger journal_entry_lines_set_updated_at before update on public.journal_entry_lines for each row execute function public.set_updated_at();
create trigger journal_entries_prevent_validated_changes before update or delete on public.journal_entries for each row execute function public.prevent_validated_entry_changes();
create trigger journal_entries_validate_before_update before update of status on public.journal_entries for each row execute function public.ensure_entry_can_be_validated();
create trigger journal_entry_lines_prevent_validated_changes before update or delete on public.journal_entry_lines for each row execute function public.prevent_validated_entry_line_changes();

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.companies enable row level security;
alter table public.fiscal_years enable row level security;
alter table public.accounting_periods enable row level security;
alter table public.company_fiscal_profiles enable row level security;
alter table public.company_accounts enable row level security;
alter table public.journals enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_entry_lines enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles are readable by owner or platform admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_platform_admin());

create policy "profiles can be inserted by owner"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "profiles can be updated by owner or platform admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_platform_admin())
with check (id = auth.uid() or public.is_platform_admin());

create policy "tenants are readable by members"
on public.tenants for select
to authenticated
using (public.is_tenant_member(id));

create policy "tenants can be created by authenticated users"
on public.tenants for insert
to authenticated
with check (created_by = auth.uid() or public.is_platform_admin());

create policy "tenants can be updated by tenant admins"
on public.tenants for update
to authenticated
using (public.has_tenant_role(id, array['admin_entreprise', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(id, array['admin_entreprise', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "tenant memberships are readable by tenant members"
on public.tenant_memberships for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "tenant memberships are managed by tenant admins"
on public.tenant_memberships for all
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "companies are readable by tenant members"
on public.companies for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "companies are managed by tenant admins"
on public.companies for all
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "fiscal years are readable by tenant members"
on public.fiscal_years for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "fiscal years are managed by accounting admins"
on public.fiscal_years for all
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'fiscaliste', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'fiscaliste', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "accounting periods are readable by tenant members"
on public.accounting_periods for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "accounting periods are managed by accounting admins"
on public.accounting_periods for all
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "fiscal profiles are readable by tenant members"
on public.company_fiscal_profiles for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "fiscal profiles are managed by fiscal roles"
on public.company_fiscal_profiles for all
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'fiscaliste', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'fiscaliste', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "company accounts are readable by tenant members"
on public.company_accounts for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "company accounts are managed by accounting roles"
on public.company_accounts for all
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "journals are readable by tenant members"
on public.journals for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "journals are managed by accounting roles"
on public.journals for all
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "journal entries are readable by tenant members"
on public.journal_entries for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "journal entries are writable by accounting roles"
on public.journal_entries for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'fiscaliste', 'caissier', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "journal entries are updatable by accounting roles"
on public.journal_entries for update
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'fiscaliste', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'fiscaliste', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "journal entry lines are readable by tenant members"
on public.journal_entry_lines for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "journal entry lines are writable by accounting roles"
on public.journal_entry_lines for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'fiscaliste', 'caissier', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "journal entry lines are updatable by accounting roles"
on public.journal_entry_lines for update
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'fiscaliste', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'fiscaliste', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "audit logs are readable by audit roles"
on public.audit_logs for select
to authenticated
using (tenant_id is null and public.is_platform_admin() or public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'auditeur', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "audit logs can be inserted by tenant members"
on public.audit_logs for insert
to authenticated
with check (tenant_id is null and public.is_platform_admin() or public.is_tenant_member(tenant_id));

insert into public.ohada_account_classes (class_code, label, description, sort_order) values
    ('1', 'Ressources durables', 'Capitaux, emprunts et ressources assimilees.', 1),
    ('2', 'Actif immobilise', 'Immobilisations incorporelles, corporelles et financieres.', 2),
    ('3', 'Stocks', 'Stocks et en-cours.', 3),
    ('4', 'Tiers', 'Clients, fournisseurs, personnel, administrations et autres tiers.', 4),
    ('5', 'Tresorerie', 'Banques, caisses et instruments de tresorerie.', 5),
    ('6', 'Charges des activites ordinaires', 'Charges d exploitation et charges ordinaires.', 6),
    ('7', 'Produits des activites ordinaires', 'Ventes, prestations et autres produits ordinaires.', 7),
    ('8', 'Autres charges et produits', 'Comptes speciaux et autres charges ou produits.', 8);

insert into public.journal_type_templates (code, label, sort_order) values
    ('purchases', 'Achats', 1),
    ('sales', 'Ventes', 2),
    ('bank', 'Banque', 3),
    ('cash', 'Caisse', 4),
    ('miscellaneous', 'Operations diverses', 5),
    ('payroll', 'Paie', 6),
    ('stock', 'Stocks', 7),
    ('fixed_assets', 'Immobilisations', 8),
    ('tax', 'Fiscalite', 9),
    ('opening', 'A-nouveaux', 10);
