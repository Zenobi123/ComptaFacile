create or replace function public.create_company_onboarding(
    tenant_name text,
    legal_name text,
    trade_name text default null,
    legal_form text default null,
    niu text default null,
    rccm text default null,
    sector text default null,
    address text default null,
    city text default null,
    tax_center text default null,
    tax_regime text default 'reel',
    dsf_type text default 'systeme_normal',
    accounting_system text default 'normal',
    starts_on date default make_date(extract(year from now())::integer, 1, 1),
    ends_on date default make_date(extract(year from now())::integer, 12, 31),
    vat_enabled boolean default false,
    withholding_enabled boolean default false,
    stock_enabled boolean default false,
    fixed_assets_enabled boolean default false,
    payroll_enabled boolean default false
)
returns table (
    tenant_id uuid,
    company_id uuid,
    fiscal_year_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid := auth.uid();
    created_tenant_id uuid;
    created_company_id uuid;
    created_fiscal_year_id uuid;
    current_period_start date;
    current_period_end date;
    fiscal_year_label text;
begin
    if current_user_id is null then
        raise exception 'Authentication is required to create a company onboarding dossier';
    end if;

    if starts_on >= ends_on then
        raise exception 'Fiscal year start date must be before end date';
    end if;

    fiscal_year_label := concat(extract(year from starts_on)::integer, '-', extract(year from ends_on)::integer);

    insert into public.tenants (name, tenant_type, status, created_by, updated_by)
    values (tenant_name, 'company', 'active', current_user_id, current_user_id)
    returning id into created_tenant_id;

    insert into public.tenant_memberships (
        tenant_id,
        user_id,
        role,
        status,
        created_by,
        updated_by
    )
    values (
        created_tenant_id,
        current_user_id,
        'admin_entreprise',
        'active',
        current_user_id,
        current_user_id
    );

    insert into public.companies (
        tenant_id,
        legal_name,
        trade_name,
        legal_form,
        niu,
        rccm,
        sector,
        address,
        city,
        tax_center,
        status,
        created_by,
        updated_by
    )
    values (
        created_tenant_id,
        legal_name,
        trade_name,
        legal_form,
        niu,
        rccm,
        sector,
        address,
        city,
        tax_center,
        'active',
        current_user_id,
        current_user_id
    )
    returning id into created_company_id;

    insert into public.fiscal_years (
        tenant_id,
        company_id,
        label,
        starts_on,
        ends_on,
        status,
        created_by,
        updated_by
    )
    values (
        created_tenant_id,
        created_company_id,
        fiscal_year_label,
        starts_on,
        ends_on,
        'open',
        current_user_id,
        current_user_id
    )
    returning id into created_fiscal_year_id;

    current_period_start := date_trunc('month', starts_on)::date;

    while current_period_start <= ends_on loop
        current_period_end := least(
            (current_period_start + interval '1 month - 1 day')::date,
            ends_on
        );

        insert into public.accounting_periods (
            tenant_id,
            company_id,
            fiscal_year_id,
            label,
            starts_on,
            ends_on,
            status,
            created_by,
            updated_by
        )
        values (
            created_tenant_id,
            created_company_id,
            created_fiscal_year_id,
            to_char(current_period_start, 'YYYY-MM'),
            greatest(current_period_start, starts_on),
            current_period_end,
            'open',
            current_user_id,
            current_user_id
        );

        current_period_start := (current_period_start + interval '1 month')::date;
    end loop;

    insert into public.company_fiscal_profiles (
        tenant_id,
        company_id,
        fiscal_year_id,
        tax_regime,
        dsf_type,
        accounting_system,
        vat_enabled,
        withholding_enabled,
        stock_enabled,
        fixed_assets_enabled,
        payroll_enabled,
        created_by,
        updated_by
    )
    values (
        created_tenant_id,
        created_company_id,
        created_fiscal_year_id,
        tax_regime,
        dsf_type,
        accounting_system,
        vat_enabled,
        withholding_enabled,
        stock_enabled,
        fixed_assets_enabled,
        payroll_enabled,
        current_user_id,
        current_user_id
    );

    insert into public.journals (
        tenant_id,
        company_id,
        code,
        label,
        journal_type,
        created_by,
        updated_by
    )
    select
        created_tenant_id,
        created_company_id,
        upper(left(code, 4)),
        label,
        code,
        current_user_id,
        current_user_id
    from public.journal_type_templates
    where code in ('purchases', 'sales', 'bank', 'cash', 'miscellaneous', 'tax', 'opening');

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
        created_tenant_id,
        created_company_id,
        current_user_id,
        'company_onboarding_created',
        'companies',
        created_company_id,
        jsonb_build_object('fiscal_year_id', created_fiscal_year_id)
    );

    return query select created_tenant_id, created_company_id, created_fiscal_year_id;
end;
$$;

revoke all on function public.create_company_onboarding(
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    date,
    date,
    boolean,
    boolean,
    boolean,
    boolean,
    boolean
) from public;

grant execute on function public.create_company_onboarding(
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    date,
    date,
    boolean,
    boolean,
    boolean,
    boolean,
    boolean
) to authenticated;
