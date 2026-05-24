create type public.treasury_account_type as enum ('bank', 'cash', 'mobile_money');
create type public.treasury_transaction_direction as enum ('inflow', 'outflow');

create table public.treasury_accounts (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    company_id uuid not null,
    account_type public.treasury_account_type not null,
    name text not null,
    institution_name text,
    account_number text,
    currency char(3) not null default 'XAF',
    opening_balance numeric(18, 2) not null default 0,
    is_active boolean not null default true,
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint treasury_accounts_company_fk foreign key (tenant_id, company_id) references public.companies (tenant_id, id) on delete cascade,
    constraint treasury_accounts_tenant_company_id_unique unique (tenant_id, company_id, id),
    constraint treasury_accounts_company_name_unique unique (tenant_id, company_id, name)
);

create table public.treasury_transactions (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    company_id uuid not null,
    fiscal_year_id uuid not null,
    treasury_account_id uuid not null,
    direction public.treasury_transaction_direction not null,
    transaction_date date not null,
    label text not null,
    reference text,
    amount numeric(18, 2) not null,
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint treasury_transactions_fiscal_year_fk foreign key (tenant_id, company_id, fiscal_year_id) references public.fiscal_years (tenant_id, company_id, id) on delete restrict,
    constraint treasury_transactions_account_fk foreign key (tenant_id, company_id, treasury_account_id) references public.treasury_accounts (tenant_id, company_id, id) on delete restrict,
    constraint treasury_transactions_amount_check check (amount > 0)
);

create index treasury_accounts_company_idx on public.treasury_accounts (tenant_id, company_id, account_type);
create index treasury_transactions_account_idx on public.treasury_transactions (tenant_id, company_id, treasury_account_id, transaction_date desc);

create trigger treasury_accounts_set_updated_at before update on public.treasury_accounts for each row execute function public.set_updated_at();
create trigger treasury_transactions_set_updated_at before update on public.treasury_transactions for each row execute function public.set_updated_at();

alter table public.treasury_accounts enable row level security;
alter table public.treasury_transactions enable row level security;

create policy "treasury accounts are readable by tenant members"
on public.treasury_accounts for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "treasury accounts are managed by treasury roles"
on public.treasury_accounts for all
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'caissier', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'caissier', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "treasury transactions are readable by tenant members"
on public.treasury_transactions for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "treasury transactions are managed by treasury roles"
on public.treasury_transactions for all
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'caissier', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'caissier', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create or replace function public.create_treasury_transaction(
    tenant_id uuid,
    company_id uuid,
    fiscal_year_id uuid,
    treasury_account_id uuid,
    direction public.treasury_transaction_direction,
    transaction_date date,
    label text,
    amount numeric,
    reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid := auth.uid();
    created_transaction_id uuid;
begin
    if current_user_id is null then
        raise exception 'Authentication is required to create a treasury transaction';
    end if;

    if amount <= 0 then
        raise exception 'Treasury transaction amount must be positive';
    end if;

    if not public.has_tenant_role(
        tenant_id,
        array['admin_entreprise', 'chef_comptable', 'comptable', 'caissier', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[],
        current_user_id
    ) then
        raise exception 'Current user is not allowed to create treasury transactions for this tenant';
    end if;

    if not exists (
        select 1
        from public.fiscal_years
        where id = fiscal_year_id
          and tenant_id = create_treasury_transaction.tenant_id
          and company_id = create_treasury_transaction.company_id
    ) then
        raise exception 'Fiscal year not found for this tenant and company';
    end if;

    if not exists (
        select 1
        from public.treasury_accounts
        where id = treasury_account_id
          and tenant_id = create_treasury_transaction.tenant_id
          and company_id = create_treasury_transaction.company_id
          and is_active = true
    ) then
        raise exception 'Active treasury account not found for this tenant and company';
    end if;

    insert into public.treasury_transactions (
        tenant_id,
        company_id,
        fiscal_year_id,
        treasury_account_id,
        direction,
        transaction_date,
        label,
        amount,
        reference,
        created_by,
        updated_by
    )
    values (
        tenant_id,
        company_id,
        fiscal_year_id,
        treasury_account_id,
        direction,
        transaction_date,
        label,
        amount,
        reference,
        current_user_id,
        current_user_id
    )
    returning id into created_transaction_id;

    insert into public.audit_logs (
        tenant_id,
        company_id,
        actor_id,
        action,
        entity_table,
        entity_id,
        metadata
    )
    values (
        tenant_id,
        company_id,
        current_user_id,
        'treasury_transaction_created',
        'treasury_transactions',
        created_transaction_id,
        jsonb_build_object('direction', direction, 'amount', amount)
    );

    return created_transaction_id;
end;
$$;

create or replace function public.get_treasury_snapshot(
    p_tenant_id uuid,
    p_company_id uuid,
    p_fiscal_year_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid := auth.uid();
begin
    if current_user_id is null then
        raise exception 'Authentication is required to read treasury data';
    end if;

    if not public.is_tenant_member(p_tenant_id, current_user_id) then
        raise exception 'Current user is not allowed to read treasury data for this tenant';
    end if;

    return (
        with account_rows as (
            select
                ta.id,
                ta.name,
                ta.account_type,
                ta.institution_name,
                ta.currency,
                ta.opening_balance,
                (
                    ta.opening_balance
                    + coalesce(sum(
                        case
                            when tt.direction = 'inflow' then tt.amount
                            when tt.direction = 'outflow' then -tt.amount
                            else 0
                        end
                    ), 0)
                )::numeric(18, 2) as current_balance
            from public.treasury_accounts ta
            left join public.treasury_transactions tt
              on tt.treasury_account_id = ta.id
             and tt.tenant_id = ta.tenant_id
             and tt.company_id = ta.company_id
             and tt.fiscal_year_id = p_fiscal_year_id
            where ta.tenant_id = p_tenant_id
              and ta.company_id = p_company_id
              and ta.is_active = true
            group by ta.id, ta.name, ta.account_type, ta.institution_name, ta.currency, ta.opening_balance
            order by ta.account_type, ta.name
        ),
        transaction_rows as (
            select
                tt.id,
                tt.transaction_date,
                tt.direction,
                tt.label,
                tt.reference,
                tt.amount,
                tt.created_at,
                ta.name as account_name
            from public.treasury_transactions tt
            join public.treasury_accounts ta
              on ta.id = tt.treasury_account_id
             and ta.tenant_id = tt.tenant_id
             and ta.company_id = tt.company_id
            where tt.tenant_id = p_tenant_id
              and tt.company_id = p_company_id
              and tt.fiscal_year_id = p_fiscal_year_id
            order by tt.transaction_date desc, tt.created_at desc
            limit 20
        )
        select jsonb_build_object(
            'accounts',
            coalesce(
                (
                    select jsonb_agg(
                        jsonb_build_object(
                            'id', id,
                            'name', name,
                            'account_type', account_type,
                            'institution_name', institution_name,
                            'currency', currency,
                            'opening_balance', opening_balance,
                            'current_balance', current_balance
                        )
                        order by account_type, name
                    )
                    from account_rows
                ),
                '[]'::jsonb
            ),
            'transactions',
            coalesce(
                (
                    select jsonb_agg(
                        jsonb_build_object(
                            'id', id,
                            'transaction_date', transaction_date,
                            'direction', direction,
                            'label', label,
                            'reference', reference,
                            'amount', amount,
                            'account_name', account_name
                        )
                        order by transaction_date desc, created_at desc
                    )
                    from transaction_rows
                ),
                '[]'::jsonb
            )
        )
    );
end;
$$;

revoke all on function public.create_treasury_transaction(uuid, uuid, uuid, uuid, public.treasury_transaction_direction, date, text, numeric, text) from public;
grant execute on function public.create_treasury_transaction(uuid, uuid, uuid, uuid, public.treasury_transaction_direction, date, text, numeric, text) to authenticated;

revoke all on function public.get_treasury_snapshot(uuid, uuid, uuid) from public;
grant execute on function public.get_treasury_snapshot(uuid, uuid, uuid) to authenticated;
