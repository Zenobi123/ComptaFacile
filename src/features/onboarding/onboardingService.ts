import { z } from "zod";
import { supabase } from "../../lib/supabase";

export const onboardingSchema = z.object({
  tenantName: z.string().min(2, "Nom de tenant requis"),
  legalName: z.string().min(2, "Raison sociale requise"),
  tradeName: z.string().optional(),
  legalForm: z.string().optional(),
  niu: z.string().optional(),
  rccm: z.string().optional(),
  sector: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  taxCenter: z.string().optional(),
  taxRegime: z.string().min(2, "Regime fiscal requis"),
  dsfType: z.string().min(2, "Type DSF requis"),
  accountingSystem: z.string().min(2, "Systeme comptable requis"),
  startsOn: z.string().min(10, "Date de debut requise"),
  endsOn: z.string().min(10, "Date de fin requise"),
  vatEnabled: z.boolean(),
  withholdingEnabled: z.boolean(),
  stockEnabled: z.boolean(),
  fixedAssetsEnabled: z.boolean(),
  payrollEnabled: z.boolean(),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;

export type OnboardingResult = {
  tenantId: string;
  companyId: string;
  fiscalYearId: string;
};

function nullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function createCompanyOnboarding(
  values: OnboardingFormData,
): Promise<OnboardingResult> {
  if (!supabase) {
    throw new Error("Supabase n'est pas configure pour cet environnement.");
  }

  const payload = onboardingSchema.parse(values);

  const { data, error } = await supabase.rpc("create_company_onboarding", {
    tenant_name: payload.tenantName.trim(),
    legal_name: payload.legalName.trim(),
    trade_name: nullable(payload.tradeName),
    legal_form: nullable(payload.legalForm),
    niu: nullable(payload.niu),
    rccm: nullable(payload.rccm),
    sector: nullable(payload.sector),
    address: nullable(payload.address),
    city: nullable(payload.city),
    tax_center: nullable(payload.taxCenter),
    tax_regime: payload.taxRegime,
    dsf_type: payload.dsfType,
    accounting_system: payload.accountingSystem,
    starts_on: payload.startsOn,
    ends_on: payload.endsOn,
    vat_enabled: payload.vatEnabled,
    withholding_enabled: payload.withholdingEnabled,
    stock_enabled: payload.stockEnabled,
    fixed_assets_enabled: payload.fixedAssetsEnabled,
    payroll_enabled: payload.payrollEnabled,
  });

  if (error) {
    throw new Error(error.message);
  }

  const created = data[0];

  if (!created) {
    throw new Error("La creation du dossier entreprise n'a retourne aucun identifiant.");
  }

  return {
    tenantId: created.tenant_id,
    companyId: created.company_id,
    fiscalYearId: created.fiscal_year_id,
  };
}
