create type public.tax_declaration_status as enum ('planned', 'prepared', 'submitted', 'paid', 'late');

create table public.tax_declarations (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    company_id uuid not null,
    fiscal_year_id uuid not null,
    tax_type text not null,
    period_label text not null,
    due_date date not null,
    status public.tax_declaration_status not null default 'planned',
    amount_due numeric(18, 2) not null default 0,
    submitted_at timestamptz,
    payment_reference text,
    notes text,
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint tax_declarations_fiscal_year_fk foreign key (tenant_id, company_id, fiscal_year_id) references public.fiscal_years (tenant_id, company_id, id) on delete cascade,
    constraint tax_declarations_amount_check check (amount_due >= 0),
    constraint tax_declarations_period_unique unique (tenant_id, company_id, fiscal_year_id, tax_type, period_label)
);

create index tax_declarations_company_due_idx on public.tax_declarations (tenant_id, company_id, fiscal_year_id, due_date);

create trigger tax_declarations_set_updated_at before update on public.tax_declarations for each row execute function public.set_updated_at();

alter table public.tax_declarations enable row level security;

create policy "tax declarations are readable by tenant members"
on public.tax_declarations for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "tax declarations are managed by fiscal roles"
on public.tax_declarations for all
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'fiscaliste', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'fiscaliste', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create or replace function public.create_tax_declaration(
    tenant_id uuid,
    company_id uuid,
    fiscal_year_id uuid,
    tax_type text,
    period_label text,
    due_date date,
    amount_due numeric default 0,
    status public.tax_declaration_status default 'planned',
    notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid := auth.uid();
    created_declaration_id uuid;
begin
    if current_user_id is null then
        raise exception 'Authentication is required to create a tax declaration';
    end if;

    if amount_due < 0 then
        raise exception 'Tax amount cannot be negative';
    end if;

    if not public.has_tenant_role(
        tenant_id,
        array['admin_entreprise', 'chef_comptable', 'comptable', 'fiscaliste', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[],
        current_user_id
    ) then
        raise exception 'Current user is not allowed to create tax declarations for this tenant';
    end if;

    if not exists (
        select 1
        from public.fiscal_years
        where id = fiscal_year_id
          and tenant_id = create_tax_declaration.tenant_id
          and company_id = create_tax_declaration.company_id
    ) then
        raise exception 'Fiscal year not found for this tenant and company';
    end if;

    insert into public.tax_declarations (
        tenant_id,
        company_id,
        fiscal_year_id,
        tax_type,
        period_label,
        due_date,
        amount_due,
        status,
        notes,
        submitted_at,
        created_by,
        updated_by
    )
    values (
        tenant_id,
        company_id,
        fiscal_year_id,
        tax_type,
        period_label,
        due_date,
        amount_due,
        status,
        notes,
        case when status in ('submitted', 'paid') then now() else null end,
        current_user_id,
        current_user_id
    )
    returning id into created_declaration_id;

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
        'tax_declaration_created',
        'tax_declarations',
        created_declaration_id,
        jsonb_build_object('tax_type', tax_type, 'period_label', period_label, 'amount_due', amount_due)
    );

    return created_declaration_id;
end;
$$;

create or replace function public.get_tax_snapshot(
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
        raise exception 'Authentication is required to read tax data';
    end if;

    if not public.is_tenant_member(p_tenant_id, current_user_id) then
        raise exception 'Current user is not allowed to read tax data for this tenant';
    end if;

    return (
        select jsonb_build_object(
            'declarations',
            coalesce(
                (
                    select jsonb_agg(
                        jsonb_build_object(
                            'id', id,
                            'tax_type', tax_type,
                            'period_label', period_label,
                            'due_date', due_date,
                            'status', status,
                            'amount_due', amount_due,
                            'submitted_at', submitted_at,
                            'payment_reference', payment_reference,
                            'notes', notes
                        )
                        order by due_date asc, tax_type asc
                    )
                    from public.tax_declarations
                    where tenant_id = p_tenant_id
                      and company_id = p_company_id
                      and fiscal_year_id = p_fiscal_year_id
                ),
                '[]'::jsonb
            ),
            'totals',
            jsonb_build_object(
                'planned_count',
                coalesce((select count(*) from public.tax_declarations where tenant_id = p_tenant_id and company_id = p_company_id and fiscal_year_id = p_fiscal_year_id and status = 'planned'), 0),
                'submitted_count',
                coalesce((select count(*) from public.tax_declarations where tenant_id = p_tenant_id and company_id = p_company_id and fiscal_year_id = p_fiscal_year_id and status in ('submitted', 'paid')), 0),
                'late_count',
                coalesce((select count(*) from public.tax_declarations where tenant_id = p_tenant_id and company_id = p_company_id and fiscal_year_id = p_fiscal_year_id and (status = 'late' or (status in ('planned', 'prepared') and due_date < current_date))), 0),
                'amount_due',
                coalesce((select sum(amount_due) from public.tax_declarations where tenant_id = p_tenant_id and company_id = p_company_id and fiscal_year_id = p_fiscal_year_id and status in ('planned', 'prepared', 'late')), 0)
            )
        )
    );
end;
$$;

revoke all on function public.create_tax_declaration(uuid, uuid, uuid, text, text, date, numeric, public.tax_declaration_status, text) from public;
grant execute on function public.create_tax_declaration(uuid, uuid, uuid, text, text, date, numeric, public.tax_declaration_status, text) to authenticated;

revoke all on function public.get_tax_snapshot(uuid, uuid, uuid) from public;
grant execute on function public.get_tax_snapshot(uuid, uuid, uuid) to authenticated;
