import "server-only";

import type { EmailCategory, EmailTemplateStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { renderTemplate, type TemplateName } from "@/lib/email/email-types";
import { flattenTemplateVariables } from "@/lib/email/template-interpolation";
import { TEMPLATE_CATEGORY, TEMPLATE_DESCRIPTIONS } from "@/features/communications/config/template-catalog";
import { TEMPLATE_SAMPLE_PROPS } from "@/features/communications/config/template-sample-props";

const SYSTEM_TEMPLATE_KEYS = new Set<string>(Object.keys(TEMPLATE_CATEGORY));

export function isSystemTemplateKey(key: string): key is TemplateName {
  return SYSTEM_TEMPLATE_KEYS.has(key);
}

/** "new_direct_message" -> "New Direct Message" — the one place this conversion happens, reused by the catalog table and the editor. */
export function humanizeTemplateKey(key: string) {
  return key
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

// Always available at Preview/Send Test time (sample props) and, once a
// custom template gets a real call site, whatever that call site passes —
// but since no call site exists yet for a brand-new custom template, only
// this small, always-safe set is offered rather than guessing what a future
// caller might provide.
const GENERAL_TEMPLATE_VARIABLES = ["fullName", "firstName", "email"];

/** Every `{{variable}}` the editor can safely offer for a template key. */
export function getAvailableVariables(templateKey: string): string[] {
  if (isSystemTemplateKey(templateKey)) {
    return Object.keys(flattenTemplateVariables(TEMPLATE_SAMPLE_PROPS[templateKey])).sort();
  }
  return [...GENERAL_TEMPLATE_VARIABLES];
}

/** The realistic sample values behind those variables, for the editor's live preview. */
export function getSampleVariableValues(templateKey: string): Record<string, string> {
  if (isSystemTemplateKey(templateKey)) {
    return flattenTemplateVariables(TEMPLATE_SAMPLE_PROPS[templateKey]);
  }
  return { fullName: "Christian Bipat", firstName: "Christian", email: "example@example.com" };
}

export type EmailTemplateListRow = {
  id: string | null;
  templateKey: string;
  isSystem: boolean;
  name: string;
  description: string | null;
  category: EmailCategory;
  hasOverride: boolean;
  overrideStatus: EmailTemplateStatus | null;
  updatedAt: Date | null;
  updatedByName: string | null;
};

/** Every system template (all 51, always present) plus every custom template row — the Email Templates catalog table's full row set. */
export async function listEmailTemplateRows(organizationId: string): Promise<EmailTemplateListRow[]> {
  const overrides = await prisma.emailTemplate.findMany({
    where: { organizationId },
    include: { updatedBy: { select: { fullName: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const overrideByKey = new Map(overrides.map((o) => [o.templateKey, o]));

  const systemRows: EmailTemplateListRow[] = (Object.keys(TEMPLATE_CATEGORY) as TemplateName[]).map((key) => {
    const override = overrideByKey.get(key);
    return {
      id: override?.id ?? null,
      templateKey: key,
      isSystem: true,
      name: override?.name ?? humanizeTemplateKey(key),
      description: override?.description ?? TEMPLATE_DESCRIPTIONS[key],
      category: override?.category ?? TEMPLATE_CATEGORY[key],
      hasOverride: Boolean(override),
      overrideStatus: override?.status ?? null,
      updatedAt: override?.updatedAt ?? null,
      updatedByName: override?.updatedBy?.fullName ?? null,
    };
  });

  const customRows: EmailTemplateListRow[] = overrides
    .filter((o) => !o.isSystem)
    .map((o) => ({
      id: o.id,
      templateKey: o.templateKey,
      isSystem: false,
      name: o.name,
      description: o.description,
      category: o.category,
      hasOverride: true,
      overrideStatus: o.status,
      updatedAt: o.updatedAt,
      updatedByName: o.updatedBy?.fullName ?? null,
    }));

  return [...systemRows, ...customRows];
}

export type EmailTemplateEditData = {
  id: string | null;
  templateKey: string;
  isSystem: boolean;
  /** True when nothing has been saved for this key yet — editing a system template for the first time. */
  isNew: boolean;
  name: string;
  description: string;
  category: EmailCategory;
  subject: string;
  previewText: string;
  bodyHtml: string;
  status: EmailTemplateStatus;
  updatedAt: Date | null;
  updatedByName: string | null;
  createdByName: string | null;
};

/**
 * Loads a template for the editor — an existing override row if one exists,
 * otherwise (for a system key with no override yet) a fresh DRAFT seeded
 * from the catalog's name/description/category and the template's live
 * subject line. The body starts empty rather than a guessed extraction of
 * the current React Email component's inner content (there's no safe way
 * to unwrap EmailLayout's own children back out of rendered HTML) — the
 * editor instead offers a "Preview current default" action so the admin can
 * see exactly what they're starting from while writing new content.
 */
export async function getEmailTemplateForEdit(organizationId: string, templateKey: string): Promise<EmailTemplateEditData | null> {
  const override = await prisma.emailTemplate.findUnique({
    where: { organizationId_templateKey: { organizationId, templateKey } },
    include: { updatedBy: { select: { fullName: true } }, createdBy: { select: { fullName: true } } },
  });

  if (override) {
    return {
      id: override.id,
      templateKey: override.templateKey,
      isSystem: override.isSystem,
      isNew: false,
      name: override.name,
      description: override.description ?? "",
      category: override.category,
      subject: override.subject,
      previewText: override.previewText ?? "",
      bodyHtml: override.bodyHtml,
      status: override.status,
      updatedAt: override.updatedAt,
      updatedByName: override.updatedBy?.fullName ?? null,
      createdByName: override.createdBy?.fullName ?? null,
    };
  }

  if (!isSystemTemplateKey(templateKey)) return null;

  const { subject } = await renderTemplate(templateKey, TEMPLATE_SAMPLE_PROPS[templateKey]);
  return {
    id: null,
    templateKey,
    isSystem: true,
    isNew: true,
    name: humanizeTemplateKey(templateKey),
    description: TEMPLATE_DESCRIPTIONS[templateKey],
    category: TEMPLATE_CATEGORY[templateKey],
    subject,
    previewText: "",
    bodyHtml: "",
    status: "DRAFT",
    updatedAt: null,
    updatedByName: null,
    createdByName: null,
  };
}

export async function templateKeyIsTaken(organizationId: string, templateKey: string): Promise<boolean> {
  if (isSystemTemplateKey(templateKey)) return true;
  const existing = await prisma.emailTemplate.findUnique({
    where: { organizationId_templateKey: { organizationId, templateKey } },
    select: { id: true },
  });
  return Boolean(existing);
}
