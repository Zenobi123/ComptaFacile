create or replace function public.create_journal_entry(
    tenant_id uuid,
    company_id uuid,
    fiscal_year_id uuid,
    accounting_period_id uuid,
    journal_id uuid,
    entry_date date,
    label text,
    reference text default null,
    target_status public.journal_entry_status default 'draft',
    lines jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid := auth.uid();
    created_entry_id uuid;
    line_item jsonb;
    line_count integer := 0;
    debit_total numeric(18, 2) := 0;
    credit_total numeric(18, 2) := 0;
    line_debit numeric(18, 2);
    line_credit numeric(18, 2);
    line_account_id uuid;
    period_state public.accounting_period_status;
begin
    if current_user_id is null then
        raise exception 'Authentication is required to create a journal entry';
    end if;

    if not public.has_tenant_role(
        tenant_id,
        array[
            'admin_entreprise',
            'chef_comptable',
            'comptable',
            'fiscaliste',
            'caissier',
            'admin_saas',
            'super_admin_saas'
        ]::public.member_role[],
        current_user_id
    ) then
        raise exception 'Current user is not allowed to create journal entries for this tenant';
    end if;

    if jsonb_typeof(lines) <> 'array' or jsonb_array_length(lines) < 2 then
        raise exception 'A journal entry must contain at least two lines';
    end if;

    if target_status not in ('draft', 'pending_review', 'validated') then
        raise exception 'Unsupported target journal entry status';
    end if;

    select status into period_state
    from public.accounting_periods
    where id = accounting_period_id
      and tenant_id = create_journal_entry.tenant_id
      and company_id = create_journal_entry.company_id
      and fiscal_year_id = create_journal_entry.fiscal_year_id;

    if period_state is null then
        raise exception 'Accounting period not found for this tenant, company and fiscal year';
    end if;

    if period_state in ('locked', 'closed') then
        raise exception 'Journal entries cannot be created in a locked or closed period';
    end if;

    if not exists (
        select 1
        from public.journals
        where id = journal_id
          and tenant_id = create_journal_entry.tenant_id
          and company_id = create_journal_entry.company_id
          and is_active = true
    ) then
        raise exception 'Active journal not found for this tenant and company';
    end if;

    for line_item in select * from jsonb_array_elements(lines)
    loop
        line_count := line_count + 1;
        line_account_id := (line_item ->> 'account_id')::uuid;
        line_debit := coalesce(nullif(line_item ->> 'debit_amount', '')::numeric, 0);
        line_credit := coalesce(nullif(line_item ->> 'credit_amount', '')::numeric, 0);

        if line_debit < 0 or line_credit < 0 then
            raise exception 'Line amounts cannot be negative';
        end if;

        if (line_debit > 0 and line_credit > 0) or (line_debit = 0 and line_credit = 0) then
            raise exception 'Each line must contain either a debit amount or a credit amount';
        end if;

        if not exists (
            select 1
            from public.company_accounts
            where id = line_account_id
              and tenant_id = create_journal_entry.tenant_id
              and company_id = create_journal_entry.company_id
              and is_active = true
        ) then
            raise exception 'Active account not found for one journal entry line';
        end if;

        debit_total := debit_total + line_debit;
        credit_total := credit_total + line_credit;
    end loop;

    if debit_total <> credit_total then
        raise exception 'Journal entry is not balanced';
    end if;

    insert into public.journal_entries (
        tenant_id,
        company_id,
        fiscal_year_id,
        accounting_period_id,
        journal_id,
        entry_date,
        label,
        reference,
        status,
        created_by,
        updated_by
    )
    values (
        tenant_id,
        company_id,
        fiscal_year_id,
        accounting_period_id,
        journal_id,
        entry_date,
        label,
        reference,
        'draft',
        current_user_id,
        current_user_id
    )
    returning id into created_entry_id;

    line_count := 0;

    for line_item in select * from jsonb_array_elements(lines)
    loop
        line_count := line_count + 1;

        insert into public.journal_entry_lines (
            tenant_id,
            company_id,
            journal_entry_id,
            account_id,
            line_number,
            label,
            debit_amount,
            credit_amount,
            created_by,
            updated_by
        )
        values (
            tenant_id,
            company_id,
            created_entry_id,
            (line_item ->> 'account_id')::uuid,
            line_count,
            nullif(line_item ->> 'label', ''),
            coalesce(nullif(line_item ->> 'debit_amount', '')::numeric, 0),
            coalesce(nullif(line_item ->> 'credit_amount', '')::numeric, 0),
            current_user_id,
            current_user_id
        );
    end loop;

    if target_status <> 'draft' then
        update public.journal_entries
        set status = target_status,
            updated_by = current_user_id
        where id = created_entry_id;
    end if;

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
        'journal_entry_created',
        'journal_entries',
        created_entry_id,
        jsonb_build_object(
            'status',
            target_status,
            'debit_total',
            debit_total,
            'credit_total',
            credit_total
        )
    );

    return created_entry_id;
end;
$$;

revoke all on function public.create_journal_entry(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    date,
    text,
    text,
    public.journal_entry_status,
    jsonb
) from public;

grant execute on function public.create_journal_entry(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    date,
    text,
    text,
    public.journal_entry_status,
    jsonb
) to authenticated;
