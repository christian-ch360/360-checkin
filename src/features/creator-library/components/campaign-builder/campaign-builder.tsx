"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import type { ContentCategory } from "@prisma/client";
import { categoryVisual } from "@/features/creator-library/config/category-visuals";
import {
  CAMPAIGN_BUDGET_FLEXIBILITY_LABELS,
  CAMPAIGN_DELIVERABLE_GROUPS,
  CAMPAIGN_DELIVERABLE_LABELS,
  CAMPAIGN_GOAL_LABELS,
  CAMPAIGN_LOCATION_SCOPE_LABELS,
  CAMPAIGN_TYPE_LABELS,
  DESIRED_REACH_TIER_LABELS,
  campaignBudgetFlexibilityValues,
  campaignDeliverableTypeValues,
  campaignGoalValues,
  campaignLocationScopeValues,
  campaignRequestTypeValues,
  desiredReachTierValues,
} from "@/features/creator-library/config/campaign-config";
import { CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";
import {
  EMPTY_CAMPAIGN_REQUEST_INPUT,
  type CampaignRequestInput,
} from "@/features/creator-library/schemas/campaign-request.schema";
import { submitCampaignRequest } from "@/features/creator-library/services/campaign-request.actions";
import { CampaignSummary } from "@/features/creator-library/components/campaign-summary";
import { ChipGroup, FieldLabel, StepSection, TextAreaField, TextField, ToggleChip } from "@/features/creator-library/components/campaign-builder/form-fields";
import type { LibraryCategoryCount } from "@/features/creator-library/services/creator-library.service";

const STEP_LABELS = ["Basics", "Goals", "Requirements", "Deliverables", "Budget", "Review"];
const PLATFORM_OPTIONS: { value: "INSTAGRAM" | "TIKTOK" | "YOUTUBE"; label: string }[] = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE", label: "YouTube" },
];

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function CampaignBuilder({ categories }: { categories: LibraryCategoryCount[] }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CampaignRequestInput>(EMPTY_CAMPAIGN_REQUEST_INPUT);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  function set<K extends keyof CampaignRequestInput>(key: K, value: CampaignRequestInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    setError(null);
    if (step === 1 && !form.campaignName?.toString().trim()) {
      setError("Give the campaign a name before continuing.");
      return;
    }
    if (step === 1 && !form.contactEmail?.toString().trim()) {
      setError("Add a contact email so our team can reach you.");
      return;
    }
    setStep((s) => Math.min(6, s + 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function findMyCreators() {
    setError(null);
    startTransition(async () => {
      const result = await submitCampaignRequest(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
    });
  }

  const goalLabels = (form.goals ?? []).map((g) => CAMPAIGN_GOAL_LABELS[g]);
  const categoryLabels = (form.categories ?? []).map((c) => CONTENT_CATEGORY_LABELS[c as ContentCategory]);
  const platformLabels = (form.platforms ?? []).map((p) => PLATFORM_OPTIONS.find((o) => o.value === p)?.label ?? p);

  // Spec: no campaign status/candidate results are ever shown to the
  // brand — this confirmation card is the entire post-submit experience.
  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-8 sm:py-24">
        <div className="rounded-2xl border border-[#EAE1CB] bg-white p-6 text-center sm:p-14">
          <span className="mx-auto grid size-14 place-items-center rounded-full border border-[#E8D5A3] bg-[#F5F1E8]">
            <CheckCircle2 className="size-6 text-[#B8935A]" aria-hidden />
          </span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[#161616] sm:text-3xl">Request received.</h1>
          <p className="mt-3 text-[#6B6B6B]">
            Thanks for sharing your campaign brief. Our team will review the opportunity and reach out to you directly.
          </p>
          <Link
            href="/creator-library"
            className="mt-8 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-[#161616] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#161616]/90 sm:inline-flex sm:w-auto sm:min-h-0"
          >
            Back to Creator Network
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8 sm:py-14">
      <BuilderStepper step={step} />

      <div className="mt-8 rounded-2xl border border-[#EAE1CB] bg-white p-6 sm:p-8">
        {step === 1 ? (
          <div className="space-y-5">
            <StepSection title="Campaign Basics">
              <div>
                <FieldLabel>Campaign Name</FieldLabel>
                <TextField
                  value={form.campaignName as string}
                  onChange={(e) => set("campaignName", e.target.value)}
                  placeholder="Summer Skincare Launch"
                  autoFocus
                />
              </div>
            </StepSection>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel hint="optional">Brand Name</FieldLabel>
                <TextField value={form.brandName as string} onChange={(e) => set("brandName", e.target.value)} placeholder="Glow Skincare Co." />
              </div>
              <div>
                <FieldLabel hint="optional">Brand Website</FieldLabel>
                <TextField value={form.brandWebsite as string} onChange={(e) => set("brandWebsite", e.target.value)} placeholder="glowskincare.com" />
              </div>
            </div>

            <div>
              <FieldLabel>Campaign Type</FieldLabel>
              <ChipGroup>
                {campaignRequestTypeValues.map((type) => (
                  <ToggleChip key={type} label={CAMPAIGN_TYPE_LABELS[type]} active={form.campaignType === type} onClick={() => set("campaignType", type)} />
                ))}
              </ChipGroup>
            </div>

            <div>
              <FieldLabel>Campaign Description</FieldLabel>
              <TextAreaField
                rows={5}
                value={form.description as string}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Tell us what you're trying to accomplish."
              />
            </div>

            <StepSection title="Your Contact Information" description="So our team can reach you directly about this campaign.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel hint="optional">Contact Name</FieldLabel>
                  <TextField value={form.contactName as string} onChange={(e) => set("contactName", e.target.value)} placeholder="Sam Rivera" />
                </div>
                <div>
                  <FieldLabel>Contact Email</FieldLabel>
                  <TextField
                    type="email"
                    value={form.contactEmail as string}
                    onChange={(e) => set("contactEmail", e.target.value)}
                    placeholder="sam@glowskincare.com"
                  />
                </div>
                <div>
                  <FieldLabel hint="optional">Contact Phone</FieldLabel>
                  <TextField value={form.contactPhone as string} onChange={(e) => set("contactPhone", e.target.value)} placeholder="(555) 123-4567" />
                </div>
                <div>
                  <FieldLabel hint="optional">Desired Timeline</FieldLabel>
                  <TextField value={form.timeline as string} onChange={(e) => set("timeline", e.target.value)} placeholder="Launching in 6 weeks" />
                </div>
              </div>
            </StepSection>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <StepSection title="Campaign Goals" description="Select every goal that applies.">
              <ChipGroup>
                {campaignGoalValues.map((goal) => (
                  <ToggleChip
                    key={goal}
                    label={CAMPAIGN_GOAL_LABELS[goal]}
                    active={(form.goals ?? []).includes(goal)}
                    onClick={() => set("goals", toggleValue(form.goals ?? [], goal))}
                  />
                ))}
              </ChipGroup>
            </StepSection>
            <div>
              <FieldLabel hint="optional">Campaign Objective</FieldLabel>
              <TextAreaField
                rows={3}
                value={form.objective as string}
                onChange={(e) => set("objective", e.target.value)}
                placeholder="Anything more specific about what success looks like?"
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <StepSection title="Categories" description="Which kinds of creators fit this campaign?">
              <ChipGroup>
                {categories.map((entry) => (
                  <ToggleChip
                    key={entry.category}
                    label={entry.label}
                    emoji={categoryVisual(entry.category).emoji}
                    active={(form.categories ?? []).includes(entry.category)}
                    onClick={() => set("categories", toggleValue(form.categories ?? [], entry.category))}
                  />
                ))}
              </ChipGroup>
            </StepSection>

            <StepSection title="Preferred Platforms">
              <ChipGroup>
                {PLATFORM_OPTIONS.map((platform) => (
                  <ToggleChip
                    key={platform.value}
                    label={platform.label}
                    active={(form.platforms ?? []).includes(platform.value)}
                    onClick={() => set("platforms", toggleValue(form.platforms ?? [], platform.value))}
                  />
                ))}
              </ChipGroup>
            </StepSection>

            <StepSection title="Creator Reach">
              <ChipGroup>
                {desiredReachTierValues.map((tier) => (
                  <ToggleChip
                    key={tier}
                    label={DESIRED_REACH_TIER_LABELS[tier]}
                    active={(form.reachTiers ?? []).includes(tier)}
                    onClick={() => set("reachTiers", toggleValue(form.reachTiers ?? [], tier))}
                  />
                ))}
              </ChipGroup>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel hint="optional">Minimum Followers</FieldLabel>
                  <TextField
                    inputMode="numeric"
                    value={form.minimumFollowers as string}
                    onChange={(e) => set("minimumFollowers", e.target.value)}
                    placeholder="10000"
                  />
                </div>
                <div>
                  <FieldLabel hint="optional">Maximum Followers</FieldLabel>
                  <TextField
                    inputMode="numeric"
                    value={form.maximumFollowers as string}
                    onChange={(e) => set("maximumFollowers", e.target.value)}
                    placeholder="500000"
                  />
                </div>
              </div>
            </StepSection>

            <StepSection title="Location">
              <ChipGroup>
                {campaignLocationScopeValues.map((scope) => (
                  <ToggleChip
                    key={scope}
                    label={CAMPAIGN_LOCATION_SCOPE_LABELS[scope]}
                    active={form.locationScope === scope}
                    onClick={() => set("locationScope", scope)}
                  />
                ))}
              </ChipGroup>
              {form.locationScope !== "WORLDWIDE" ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <div>
                    <FieldLabel>Country</FieldLabel>
                    <TextField value={form.country as string} onChange={(e) => set("country", e.target.value)} placeholder="United States" />
                  </div>
                  {form.locationScope === "STATE" || form.locationScope === "CITY" ? (
                    <div>
                      <FieldLabel>State</FieldLabel>
                      <TextField value={form.state as string} onChange={(e) => set("state", e.target.value)} placeholder="California" />
                    </div>
                  ) : null}
                  {form.locationScope === "CITY" ? (
                    <div>
                      <FieldLabel>City</FieldLabel>
                      <TextField value={form.city as string} onChange={(e) => set("city", e.target.value)} placeholder="Los Angeles" />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </StepSection>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            {CAMPAIGN_DELIVERABLE_GROUPS.map((group) => (
              <StepSection key={group.platform} title={group.platform}>
                <ChipGroup>
                  {group.types.map((type) => (
                    <ToggleChip
                      key={type}
                      label={CAMPAIGN_DELIVERABLE_LABELS[type]}
                      active={(form.deliverables ?? []).includes(type)}
                      onClick={() => set("deliverables", toggleValue(form.deliverables ?? [], type))}
                    />
                  ))}
                </ChipGroup>
              </StepSection>
            ))}
            <div className="max-w-xs">
              <FieldLabel>Number of Creators Needed</FieldLabel>
              <TextField inputMode="numeric" value={form.creatorCount as string} onChange={(e) => set("creatorCount", e.target.value)} placeholder="10" />
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Total Campaign Budget</FieldLabel>
                <TextField value={form.totalBudget as string} onChange={(e) => set("totalBudget", e.target.value)} placeholder="$50,000" />
              </div>
              <div>
                <FieldLabel hint="optional">Preferred Budget Per Creator</FieldLabel>
                <TextField
                  value={form.preferredBudgetPerCreator as string}
                  onChange={(e) => set("preferredBudgetPerCreator", e.target.value)}
                  placeholder="$2,500"
                />
              </div>
            </div>
            <StepSection title="Budget Flexibility">
              <ChipGroup>
                {campaignBudgetFlexibilityValues.map((flex) => (
                  <ToggleChip
                    key={flex}
                    label={CAMPAIGN_BUDGET_FLEXIBILITY_LABELS[flex]}
                    active={form.budgetFlexibility === flex}
                    onClick={() => set("budgetFlexibility", flex)}
                  />
                ))}
              </ChipGroup>
            </StepSection>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-6">
            <StepSection title="Review Campaign" description="Here's what we'll use to find your creators." />
            <CampaignSummary
              data={{
                campaignName: (form.campaignName as string) ?? "",
                goalLabels,
                categoryLabels,
                platformLabels,
                creatorCount: form.creatorCount ? Number(form.creatorCount) : null,
                totalBudget: form.totalBudget ? Number(String(form.totalBudget).replace(/[$,\s]/g, "")) : null,
              }}
            />
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#EAE1CB] pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <button
            type="button"
            onClick={back}
            disabled={step === 1 || isPending}
            className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-[#6B6B6B] transition-colors hover:text-[#161616] disabled:pointer-events-none disabled:opacity-40 sm:min-h-0"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>

          {step < 6 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-[#161616] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#161616]/90 sm:min-h-0 sm:w-auto"
            >
              Next
              <ArrowRight className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={findMyCreators}
              disabled={isPending}
              className="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full border border-[#D4AF6A] bg-[#161616] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#161616]/90 disabled:opacity-60 sm:min-h-0 sm:w-auto"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Find My Creators
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BuilderStepper({ step }: { step: number }) {
  return (
    <>
      {/* Mobile — compact "STEP N OF 6" + current step title + a thin
          progress bar, not six desktop step markers squeezed onto a phone. */}
      <div className="border-b border-[#EAE1CB] pb-4 sm:hidden">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#B8935A] uppercase">
          Step {step} of {STEP_LABELS.length}
        </p>
        <p className="mt-1 text-lg font-semibold text-[#161616]">{STEP_LABELS[step - 1]}</p>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#EAE1CB]">
          <div
            className="h-full rounded-full bg-[#D4AF6A] transition-all duration-300"
            style={{ width: `${(step / STEP_LABELS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Tablet/desktop — the full six-step list. */}
      <ol className="hidden flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#EAE1CB] pb-4 sm:flex">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={
                  active
                    ? "text-sm font-semibold tabular-nums text-[#161616]"
                    : done
                      ? "text-sm font-semibold tabular-nums text-[#B8935A]"
                      : "text-sm font-semibold tabular-nums text-[#6B6B6B]/50"
                }
              >
                {String(n).padStart(2, "0")}
              </span>
              <span
                className={
                  active
                    ? "text-[0.7rem] font-semibold tracking-[0.16em] text-[#161616] uppercase"
                    : "text-[0.7rem] font-semibold tracking-[0.16em] text-[#6B6B6B] uppercase"
                }
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}
