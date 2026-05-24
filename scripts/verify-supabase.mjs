import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

loadEnvFile(".env");
loadEnvFile(".env.local");

const supabaseUrl = env("SUPABASE_VERIFY_URL") || env("VITE_SUPABASE_URL") || "http://127.0.0.1:54321";
const supabaseAnonKey = env("SUPABASE_VERIFY_ANON_KEY") || env("VITE_SUPABASE_ANON_KEY");
const ownerEmail = env("SUPABASE_VERIFY_USER_EMAIL") || "owner.verify@comptafacile.test";
const ownerPassword = env("SUPABASE_VERIFY_USER_PASSWORD") || "Password123!";
const intruderEmail = env("SUPABASE_VERIFY_INTRUDER_EMAIL") || "intruder.verify@comptafacile.test";
const intruderPassword = env("SUPABASE_VERIFY_INTRUDER_PASSWORD") || "Password123!";

if (!supabaseAnonKey) {
  fail("SUPABASE_VERIFY_ANON_KEY or VITE_SUPABASE_ANON_KEY is required.");
}

const owner = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const intruder = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const suffix = Date.now().toString(36);
const invoiceNumber = `VERIFY-${suffix}`;

await authenticate(owner, ownerEmail, ownerPassword, "Verification Owner");
log("owner authenticated");

const onboarding = await rpc(owner, "create_company_onboarding", {
  tenant_name: `Verification Tenant ${suffix}`,
  legal_name: `Verification SARL ${suffix}`,
  trade_name: "Verification",
  legal_form: "SARL",
  niu: `NIU-${suffix}`,
  city: "Yaounde",
  tax_center: "Centre test",
  tax_regime: "reel",
  dsf_type: "systeme_normal",
  accounting_system: "normal",
  starts_on: "2026-01-01",
  ends_on: "2026-12-31",
  vat_enabled: true,
  withholding_enabled: true,
});
const created = Array.isArray(onboarding) ? onboarding[0] : onboarding;
assert(created?.tenant_id && created?.company_id && created?.fiscal_year_id, "onboarding returned ids");
log("company onboarding created");

const tenantId = created.tenant_id;
const companyId = created.company_id;
const fiscalYearId = created.fiscal_year_id;

const period = await first(
  owner
    .from("accounting_periods")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("company_id", companyId)
    .eq("fiscal_year_id", fiscalYearId)
    .order("starts_on", { ascending: true })
    .limit(1),
  "accounting period",
);
const journal = await first(
  owner
    .from("journals")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("company_id", companyId)
    .eq("journal_type", "miscellaneous")
    .limit(1),
  "miscellaneous journal",
);

const cashAccount = await insertReturning(
  owner.from("company_accounts").insert({
    tenant_id: tenantId,
    company_id: companyId,
    account_number: `571${suffix.slice(-3)}`,
    label: "Caisse verification",
    class_code: "5",
  }),
  "cash account",
);
const revenueAccount = await insertReturning(
  owner.from("company_accounts").insert({
    tenant_id: tenantId,
    company_id: companyId,
    account_number: `701${suffix.slice(-3)}`,
    label: "Ventes verification",
    class_code: "7",
  }),
  "revenue account",
);

await expectRpcFailure(
  owner,
  "create_journal_entry",
  {
    tenant_id: tenantId,
    company_id: companyId,
    fiscal_year_id: fiscalYearId,
    accounting_period_id: period.id,
    journal_id: journal.id,
    entry_date: "2026-01-15",
    label: "Ecriture desequilibree",
    target_status: "validated",
    lines: [
      { account_id: cashAccount.id, debit_amount: 1000, credit_amount: 0 },
      { account_id: revenueAccount.id, debit_amount: 0, credit_amount: 900 },
    ],
  },
  "unbalanced journal entry rejected",
);

await rpc(owner, "create_journal_entry", {
  tenant_id: tenantId,
  company_id: companyId,
  fiscal_year_id: fiscalYearId,
  accounting_period_id: period.id,
  journal_id: journal.id,
  entry_date: "2026-01-15",
  label: "Ecriture verification",
  reference: "VERIFY-JE",
  target_status: "validated",
  lines: [
    { account_id: cashAccount.id, debit_amount: 1000, credit_amount: 0 },
    { account_id: revenueAccount.id, debit_amount: 0, credit_amount: 1000 },
  ],
});
log("balanced journal entry created");

const accountingSnapshot = await rpc(owner, "get_accounting_snapshot", {
  p_tenant_id: tenantId,
  p_company_id: companyId,
  p_fiscal_year_id: fiscalYearId,
});
assert(accountingSnapshot.entries?.length >= 1, "accounting snapshot has entries");
assert(accountingSnapshot.balance?.length >= 1, "accounting snapshot has balance rows");

const customer = await insertReturning(
  owner.from("third_parties").insert({
    tenant_id: tenantId,
    company_id: companyId,
    party_type: "customer",
    name: `Client Verification ${suffix}`,
    city: "Yaounde",
  }),
  "customer",
);

await rpc(owner, "create_sales_invoice", {
  tenant_id: tenantId,
  company_id: companyId,
  fiscal_year_id: fiscalYearId,
  customer_id: customer.id,
  invoice_number: invoiceNumber,
  invoice_date: "2026-01-20",
  due_date: "2026-02-05",
  status: "issued",
  lines: [{ description: "Prestation verification", quantity: 1, unit_price: 2500, tax_rate: 19.25 }],
});
const billingSnapshot = await rpc(owner, "get_billing_snapshot", {
  p_tenant_id: tenantId,
  p_company_id: companyId,
  p_fiscal_year_id: fiscalYearId,
});
assert(billingSnapshot.customers?.length >= 1, "billing snapshot has customers");
assert(billingSnapshot.invoices?.length >= 1, "billing snapshot has invoices");
log("sales billing verified");

const treasuryAccount = await insertReturning(
  owner.from("treasury_accounts").insert({
    tenant_id: tenantId,
    company_id: companyId,
    account_type: "cash",
    name: `Caisse verification ${suffix}`,
    opening_balance: 1000,
  }),
  "treasury account",
);
await expectRpcFailure(
  owner,
  "create_treasury_transaction",
  {
    tenant_id: tenantId,
    company_id: companyId,
    fiscal_year_id: fiscalYearId,
    treasury_account_id: treasuryAccount.id,
    direction: "outflow",
    transaction_date: "2026-01-21",
    label: "Montant invalide",
    amount: -1,
  },
  "negative treasury transaction rejected",
);
await rpc(owner, "create_treasury_transaction", {
  tenant_id: tenantId,
  company_id: companyId,
  fiscal_year_id: fiscalYearId,
  treasury_account_id: treasuryAccount.id,
  direction: "inflow",
  transaction_date: "2026-01-21",
  label: "Encaissement verification",
  amount: 5000,
  reference: "VERIFY-CASH",
});
const treasurySnapshot = await rpc(owner, "get_treasury_snapshot", {
  p_tenant_id: tenantId,
  p_company_id: companyId,
  p_fiscal_year_id: fiscalYearId,
});
assert(treasurySnapshot.accounts?.length >= 1, "treasury snapshot has accounts");
assert(treasurySnapshot.transactions?.length >= 1, "treasury snapshot has transactions");
log("treasury verified");

await expectRpcFailure(
  owner,
  "create_tax_declaration",
  {
    tenant_id: tenantId,
    company_id: companyId,
    fiscal_year_id: fiscalYearId,
    tax_type: "TVA",
    period_label: "2026-01",
    due_date: "2026-02-15",
    amount_due: -100,
  },
  "negative tax declaration rejected",
);
await rpc(owner, "create_tax_declaration", {
  tenant_id: tenantId,
  company_id: companyId,
  fiscal_year_id: fiscalYearId,
  tax_type: "TVA",
  period_label: "2026-01",
  due_date: "2026-02-15",
  amount_due: 1250,
  status: "prepared",
  notes: "Verification",
});
const taxSnapshot = await rpc(owner, "get_tax_snapshot", {
  p_tenant_id: tenantId,
  p_company_id: companyId,
  p_fiscal_year_id: fiscalYearId,
});
assert(taxSnapshot.declarations?.length >= 1, "tax snapshot has declarations");
log("tax verified");

await authenticate(intruder, intruderEmail, intruderPassword, "Verification Intruder");
const { data: intruderCompanies, error: intruderCompaniesError } = await intruder
  .from("companies")
  .select("id")
  .eq("tenant_id", tenantId);
assert(!intruderCompaniesError, "intruder company query is allowed but filtered");
assert(Array.isArray(intruderCompanies) && intruderCompanies.length === 0, "RLS hides tenant rows from non-member");
await expectRpcFailure(
  intruder,
  "get_accounting_snapshot",
  {
    p_tenant_id: tenantId,
    p_company_id: companyId,
    p_fiscal_year_id: fiscalYearId,
  },
  "snapshot RPC rejects non-member",
);
log("RLS isolation verified");

console.log("Supabase verification completed successfully.");

async function authenticate(client, email, password, fullName) {
  const signUp = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (signUp.error && !isExistingUserError(signUp.error)) {
    throw signUp.error;
  }

  if (!signUp.data.session) {
    const signIn = await client.auth.signInWithPassword({ email, password });
    if (signIn.error) {
      throw new Error(
        `Unable to authenticate ${email}. If using Supabase Cloud, disable email confirmations for the verification project or pre-create this user. ${signIn.error.message}`,
      );
    }
  }
}

async function rpc(client, name, args) {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new Error(`${name} failed: ${error.message}`);
  }
  return data;
}

async function expectRpcFailure(client, name, args, message) {
  const { error } = await client.rpc(name, args);
  if (!error) {
    fail(`${message}: expected RPC failure`);
  }
  log(message);
}

async function first(query, label) {
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  const row = data?.[0];
  assert(row, `${label} exists`);
  return row;
}

async function insertReturning(query, label) {
  const { data, error } = await query.select("*").single();
  if (error) {
    throw new Error(`${label} insert failed: ${error.message}`);
  }
  assert(data?.id, `${label} returned id`);
  return data;
}

function env(name) {
  return process.env[name]?.trim();
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
  log(message);
}

function fail(message) {
  console.error(`Verification failed: ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`OK: ${message}`);
}

function isExistingUserError(error) {
  const message = error.message.toLowerCase();
  return message.includes("already") || message.includes("registered") || message.includes("exists");
}
