create or replace function public.get_accounting_snapshot(
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
        raise exception 'Authentication is required to read accounting reports';
    end if;

    if not public.is_tenant_member(p_tenant_id, current_user_id) then
        raise exception 'Current user is not allowed to read accounting reports for this tenant';
    end if;

    if not exists (
        select 1
        from public.fiscal_years
        where tenant_id = p_tenant_id
          and company_id = p_company_id
          and id = p_fiscal_year_id
    ) then
        raise exception 'Fiscal year not found for this tenant and company';
    end if;

    return (
        with recent_entries as (
            select
                je.id,
                je.entry_date,
                je.label,
                je.reference,
                je.status,
                je.created_at,
                j.code as journal_code,
                j.label as journal_label
            from public.journal_entries je
            join public.journals j
              on j.id = je.journal_id
             and j.tenant_id = je.tenant_id
             and j.company_id = je.company_id
            where je.tenant_id = p_tenant_id
              and je.company_id = p_company_id
              and je.fiscal_year_id = p_fiscal_year_id
            order by je.entry_date desc, je.created_at desc
            limit 20
        ),
        recent_entry_lines as (
            select
                jel.journal_entry_id,
                jsonb_agg(
                    jsonb_build_object(
                        'line_number', jel.line_number,
                        'account_number', ca.account_number,
                        'account_label', ca.label,
                        'label', jel.label,
                        'debit_amount', jel.debit_amount,
                        'credit_amount', jel.credit_amount
                    )
                    order by jel.line_number
                ) as lines
            from public.journal_entry_lines jel
            join public.company_accounts ca
              on ca.id = jel.account_id
             and ca.tenant_id = jel.tenant_id
             and ca.company_id = jel.company_id
            where jel.tenant_id = p_tenant_id
              and jel.company_id = p_company_id
              and exists (
                  select 1
                  from recent_entries re
                  where re.id = jel.journal_entry_id
              )
            group by jel.journal_entry_id
        ),
        balance_rows as (
            select
                ca.id as account_id,
                ca.account_number,
                ca.label,
                coalesce(sum(jel.debit_amount), 0)::numeric(18, 2) as debit_total,
                coalesce(sum(jel.credit_amount), 0)::numeric(18, 2) as credit_total,
                (
                    coalesce(sum(jel.debit_amount), 0)
                    - coalesce(sum(jel.credit_amount), 0)
                )::numeric(18, 2) as balance
            from public.company_accounts ca
            left join public.journal_entry_lines jel
              on jel.account_id = ca.id
             and jel.tenant_id = ca.tenant_id
             and jel.company_id = ca.company_id
            left join public.journal_entries je
              on je.id = jel.journal_entry_id
             and je.tenant_id = jel.tenant_id
             and je.company_id = jel.company_id
             and je.fiscal_year_id = p_fiscal_year_id
             and je.status in ('pending_review', 'validated')
            where ca.tenant_id = p_tenant_id
              and ca.company_id = p_company_id
              and ca.is_active = true
            group by ca.id, ca.account_number, ca.label
            having coalesce(sum(jel.debit_amount), 0) <> 0
                or coalesce(sum(jel.credit_amount), 0) <> 0
            order by ca.account_number
        )
        select jsonb_build_object(
            'entries',
            coalesce(
                (
                    select jsonb_agg(
                        jsonb_build_object(
                            'id', re.id,
                            'entry_date', re.entry_date,
                            'label', re.label,
                            'reference', re.reference,
                            'status', re.status,
                            'journal_code', re.journal_code,
                            'journal_label', re.journal_label,
                            'lines', coalesce(rel.lines, '[]'::jsonb)
                        )
                        order by re.entry_date desc, re.created_at desc
                    )
                    from recent_entries re
                    left join recent_entry_lines rel
                      on rel.journal_entry_id = re.id
                ),
                '[]'::jsonb
            ),
            'balance',
            coalesce(
                (
                    select jsonb_agg(
                        jsonb_build_object(
                            'account_id', br.account_id,
                            'account_number', br.account_number,
                            'label', br.label,
                            'debit_total', br.debit_total,
                            'credit_total', br.credit_total,
                            'balance', br.balance
                        )
                        order by br.account_number
                    )
                    from balance_rows br
                ),
                '[]'::jsonb
            )
        )
    );
end;
$$;

revoke all on function public.get_accounting_snapshot(uuid, uuid, uuid) from public;
grant execute on function public.get_accounting_snapshot(uuid, uuid, uuid) to authenticated;
