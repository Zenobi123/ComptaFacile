create type public.third_party_type as enum ('customer', 'supplier', 'administration', 'employee', 'partner');
create type public.sales_invoice_status as enum ('draft', 'issued', 'paid', 'cancelled');

create table public.third_parties (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    company_id uuid not null,
    party_type public.third_party_type not null,
    name text not null,
    niu text,
    email text,
    phone text,
    city text,
    address text,
    is_active boolean not null default true,
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint third_parties_company_fk foreign key (tenant_id, company_id) references public.companies (tenant_id, id) on delete cascade,
    constraint third_parties_tenant_company_id_unique unique (tenant_id, company_id, id),
    constraint third_parties_company_name_unique unique (tenant_id, company_id, name)
);

create table public.sales_invoices (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    company_id uuid not null,
    fiscal_year_id uuid not null,
    customer_id uuid not null,
    invoice_number text not null,
    invoice_date date not null,
    due_date date,
    status public.sales_invoice_status not null default 'draft',
    currency char(3) not null default 'XAF',
    subtotal_amount numeric(18, 2) not null default 0,
    tax_amount numeric(18, 2) not null default 0,
    total_amount numeric(18, 2) not null default 0,
    notes text,
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint sales_invoices_fiscal_year_fk foreign key (tenant_id, company_id, fiscal_year_id) references public.fiscal_years (tenant_id, company_id, id) on delete restrict,
    constraint sales_invoices_customer_fk foreign key (tenant_id, company_id, customer_id) references public.third_parties (tenant_id, company_id, id) on delete restrict,
    constraint sales_invoices_tenant_company_id_unique unique (tenant_id, company_id, id),
    constraint sales_invoices_company_number_unique unique (tenant_id, company_id, invoice_number),
    constraint sales_invoices_amounts_check check (
        subtotal_amount >= 0
        and tax_amount >= 0
        and total_amount = subtotal_amount + tax_amount
    )
);

create table public.sales_invoice_lines (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    company_id uuid not null,
    invoice_id uuid not null,
    line_number integer not null,
    description text not null,
    quantity numeric(18, 2) not null default 1,
    unit_price numeric(18, 2) not null default 0,
    tax_rate numeric(7, 4) not null default 0,
    subtotal_amount numeric(18, 2) not null default 0,
    tax_amount numeric(18, 2) not null default 0,
    total_amount numeric(18, 2) not null default 0,
    created_by uuid references auth.users (id),
    updated_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint sales_invoice_lines_invoice_fk foreign key (tenant_id, company_id, invoice_id) references public.sales_invoices (tenant_id, company_id, id) on delete cascade,
    constraint sales_invoice_lines_invoice_line_unique unique (invoice_id, line_number),
    constraint sales_invoice_lines_amounts_check check (
        quantity > 0
        and unit_price >= 0
        and tax_rate >= 0
        and subtotal_amount >= 0
        and tax_amount >= 0
        and total_amount = subtotal_amount + tax_amount
    )
);

create index third_parties_company_idx on public.third_parties (tenant_id, company_id, party_type);
create index sales_invoices_company_year_idx on public.sales_invoices (tenant_id, company_id, fiscal_year_id, invoice_date desc);
create index sales_invoice_lines_invoice_idx on public.sales_invoice_lines (tenant_id, company_id, invoice_id);

create trigger third_parties_set_updated_at before update on public.third_parties for each row execute function public.set_updated_at();
create trigger sales_invoices_set_updated_at before update on public.sales_invoices for each row execute function public.set_updated_at();
create trigger sales_invoice_lines_set_updated_at before update on public.sales_invoice_lines for each row execute function public.set_updated_at();

alter table public.third_parties enable row level security;
alter table public.sales_invoices enable row level security;
alter table public.sales_invoice_lines enable row level security;

create policy "third parties are readable by tenant members"
on public.third_parties for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "third parties are managed by commercial roles"
on public.third_parties for all
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "sales invoices are readable by tenant members"
on public.sales_invoices for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "sales invoices are managed by commercial roles"
on public.sales_invoices for all
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create policy "sales invoice lines are readable by tenant members"
on public.sales_invoice_lines for select
to authenticated
using (public.is_tenant_member(tenant_id));

create policy "sales invoice lines are managed by commercial roles"
on public.sales_invoice_lines for all
to authenticated
using (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[]))
with check (public.has_tenant_role(tenant_id, array['admin_entreprise', 'chef_comptable', 'comptable', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[]));

create or replace function public.create_sales_invoice(
    tenant_id uuid,
    company_id uuid,
    fiscal_year_id uuid,
    customer_id uuid,
    invoice_number text,
    invoice_date date,
    due_date date default null,
    status public.sales_invoice_status default 'draft',
    notes text default null,
    lines jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid := auth.uid();
    created_invoice_id uuid;
    line_item jsonb;
    line_count integer := 0;
    line_quantity numeric(18, 2);
    line_unit_price numeric(18, 2);
    line_tax_rate numeric(7, 4);
    line_subtotal numeric(18, 2);
    line_tax numeric(18, 2);
    invoice_subtotal numeric(18, 2) := 0;
    invoice_tax numeric(18, 2) := 0;
begin
    if current_user_id is null then
        raise exception 'Authentication is required to create a sales invoice';
    end if;

    if not public.has_tenant_role(
        tenant_id,
        array['admin_entreprise', 'chef_comptable', 'comptable', 'dirigeant', 'admin_saas', 'super_admin_saas']::public.member_role[],
        current_user_id
    ) then
        raise exception 'Current user is not allowed to create sales invoices for this tenant';
    end if;

    if jsonb_typeof(lines) <> 'array' or jsonb_array_length(lines) = 0 then
        raise exception 'A sales invoice must contain at least one line';
    end if;

    if status not in ('draft', 'issued') then
        raise exception 'A new sales invoice can only be draft or issued';
    end if;

    if not exists (
        select 1
        from public.fiscal_years
        where id = fiscal_year_id
          and tenant_id = create_sales_invoice.tenant_id
          and company_id = create_sales_invoice.company_id
    ) then
        raise exception 'Fiscal year not found for this tenant and company';
    end if;

    if not exists (
        select 1
        from public.third_parties
        where id = customer_id
          and tenant_id = create_sales_invoice.tenant_id
          and company_id = create_sales_invoice.company_id
          and party_type = 'customer'
          and is_active = true
    ) then
        raise exception 'Active customer not found for this tenant and company';
    end if;

    for line_item in select * from jsonb_array_elements(lines)
    loop
        line_quantity := coalesce(nullif(line_item ->> 'quantity', '')::numeric, 0);
        line_unit_price := coalesce(nullif(line_item ->> 'unit_price', '')::numeric, 0);
        line_tax_rate := coalesce(nullif(line_item ->> 'tax_rate', '')::numeric, 0);

        if line_quantity <= 0 or line_unit_price < 0 or line_tax_rate < 0 then
            raise exception 'Invoice line quantities, prices and tax rates must be valid';
        end if;

        line_subtotal := round(line_quantity * line_unit_price, 2);
        line_tax := round(line_subtotal * line_tax_rate / 100, 2);
        invoice_subtotal := invoice_subtotal + line_subtotal;
        invoice_tax := invoice_tax + line_tax;
    end loop;

    insert into public.sales_invoices (
        tenant_id,
        company_id,
        fiscal_year_id,
        customer_id,
        invoice_number,
        invoice_date,
        due_date,
        status,
        subtotal_amount,
        tax_amount,
        total_amount,
        notes,
        created_by,
        updated_by
    )
    values (
        tenant_id,
        company_id,
        fiscal_year_id,
        customer_id,
        invoice_number,
        invoice_date,
        due_date,
        status,
        invoice_subtotal,
        invoice_tax,
        invoice_subtotal + invoice_tax,
        notes,
        current_user_id,
        current_user_id
    )
    returning id into created_invoice_id;

    for line_item in select * from jsonb_array_elements(lines)
    loop
        line_count := line_count + 1;
        line_quantity := coalesce(nullif(line_item ->> 'quantity', '')::numeric, 0);
        line_unit_price := coalesce(nullif(line_item ->> 'unit_price', '')::numeric, 0);
        line_tax_rate := coalesce(nullif(line_item ->> 'tax_rate', '')::numeric, 0);
        line_subtotal := round(line_quantity * line_unit_price, 2);
        line_tax := round(line_subtotal * line_tax_rate / 100, 2);

        insert into public.sales_invoice_lines (
            tenant_id,
            company_id,
            invoice_id,
            line_number,
            description,
            quantity,
            unit_price,
            tax_rate,
            subtotal_amount,
            tax_amount,
            total_amount,
            created_by,
            updated_by
        )
        values (
            tenant_id,
            company_id,
            created_invoice_id,
            line_count,
            coalesce(nullif(line_item ->> 'description', ''), 'Article facture'),
            line_quantity,
            line_unit_price,
            line_tax_rate,
            line_subtotal,
            line_tax,
            line_subtotal + line_tax,
            current_user_id,
            current_user_id
        );
    end loop;

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
        'sales_invoice_created',
        'sales_invoices',
        created_invoice_id,
        jsonb_build_object(
            'status', status,
            'subtotal_amount', invoice_subtotal,
            'tax_amount', invoice_tax,
            'total_amount', invoice_subtotal + invoice_tax
        )
    );

    return created_invoice_id;
end;
$$;

create or replace function public.get_billing_snapshot(
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
        raise exception 'Authentication is required to read billing data';
    end if;

    if not public.is_tenant_member(p_tenant_id, current_user_id) then
        raise exception 'Current user is not allowed to read billing data for this tenant';
    end if;

    return (
        with invoice_rows as (
            select
                si.id,
                si.invoice_number,
                si.invoice_date,
                si.due_date,
                si.status,
                si.total_amount,
                si.tax_amount,
                si.created_at,
                tp.name as customer_name
            from public.sales_invoices si
            join public.third_parties tp
              on tp.id = si.customer_id
             and tp.tenant_id = si.tenant_id
             and tp.company_id = si.company_id
            where si.tenant_id = p_tenant_id
              and si.company_id = p_company_id
              and si.fiscal_year_id = p_fiscal_year_id
            order by si.invoice_date desc, si.created_at desc
            limit 20
        )
        select jsonb_build_object(
            'customers',
            coalesce(
                (
                    select jsonb_agg(
                        jsonb_build_object(
                            'id', id,
                            'name', name,
                            'niu', niu,
                            'city', city,
                            'phone', phone,
                            'email', email
                        )
                        order by name
                    )
                    from public.third_parties
                    where tenant_id = p_tenant_id
                      and company_id = p_company_id
                      and party_type = 'customer'
                      and is_active = true
                ),
                '[]'::jsonb
            ),
            'invoices',
            coalesce(
                (
                    select jsonb_agg(
                        jsonb_build_object(
                            'id', id,
                            'invoice_number', invoice_number,
                            'invoice_date', invoice_date,
                            'due_date', due_date,
                            'status', status,
                            'total_amount', total_amount,
                            'tax_amount', tax_amount,
                            'customer_name', customer_name
                        )
                        order by invoice_date desc, created_at desc
                    )
                    from invoice_rows
                ),
                '[]'::jsonb
            ),
            'totals',
            jsonb_build_object(
                'draft_count',
                coalesce((select count(*) from public.sales_invoices where tenant_id = p_tenant_id and company_id = p_company_id and fiscal_year_id = p_fiscal_year_id and status = 'draft'), 0),
                'issued_count',
                coalesce((select count(*) from public.sales_invoices where tenant_id = p_tenant_id and company_id = p_company_id and fiscal_year_id = p_fiscal_year_id and status = 'issued'), 0),
                'paid_count',
                coalesce((select count(*) from public.sales_invoices where tenant_id = p_tenant_id and company_id = p_company_id and fiscal_year_id = p_fiscal_year_id and status = 'paid'), 0),
                'issued_amount',
                coalesce((select sum(total_amount) from public.sales_invoices where tenant_id = p_tenant_id and company_id = p_company_id and fiscal_year_id = p_fiscal_year_id and status in ('issued', 'paid')), 0)
            )
        )
    );
end;
$$;

revoke all on function public.create_sales_invoice(uuid, uuid, uuid, uuid, text, date, date, public.sales_invoice_status, text, jsonb) from public;
grant execute on function public.create_sales_invoice(uuid, uuid, uuid, uuid, text, date, date, public.sales_invoice_status, text, jsonb) to authenticated;

revoke all on function public.get_billing_snapshot(uuid, uuid, uuid) from public;
grant execute on function public.get_billing_snapshot(uuid, uuid, uuid) to authenticated;
