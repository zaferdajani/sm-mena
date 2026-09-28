// Shared input rules for Collaboration V2 (client and server validate the same way).
import { z } from "zod";
import { deliverable } from "@/lib/deliverables";
import { COUNTRY_CODES } from "@/lib/countries";
import { CITIES } from "@/lib/labels";
import { AVAILABILITY_STATUSES, CAPACITY_UNITS, COLLAB_MODES, RATE_UNITS, VISIBILITIES, WORK_MODES, MAX_RECIPIENTS } from "./types";
import { isDateString, isTimeZone } from "./time";

const uuid = z.string().uuid();
const dateStr = z.string().refine(isDateString, "date");
const tz = z.string().max(64).refine(isTimeZone, "timezone");
const shortText = (max: number) => z.string().trim().max(max);
const currency = z.string().regex(/^[A-Z]{3}$/);
/** Money typed in whole currency units (with up to 3 decimals), stored as thousandths. */
/** Whole currency units with up to 3 decimals, stored as thousandths in an int4 column (so at most 2,000,000). */
const money = z.coerce.number().min(0).max(2_000_000).transform((v) => Math.round(v * 1000));

export const collabProfileSchema = z.object({
  modes: z.array(z.enum(COLLAB_MODES)).max(3),
  workModes: z.array(z.enum(WORK_MODES)).max(3),
  openToWork: z.enum(["yes", "no", "unknown"]),
});

export const availabilitySchema = z
  .object({
    from: dateStr,
    to: dateStr,
    timezone: tz,
    status: z.enum(AVAILABILITY_STATUSES),
    capacityUnits: z.union([z.literal(""), z.coerce.number().int().min(0).max(1000)]),
    capacityUnit: z.union([z.literal(""), z.enum(CAPACITY_UNITS)]),
    visibility: z.enum(VISIBILITIES),
    note: shortText(200),
  })
  .refine((v) => v.from <= v.to, { message: "order", path: ["to"] });

export const needSchema = z
  .object({
    title: shortText(120).min(3),
    roles: z.array(z.string().max(60)).min(1).max(6),
    services: z.array(z.string().max(60)).max(8),
    scope: shortText(2000),
    workMode: z.enum(WORK_MODES),
    city: z.union([z.literal(""), z.enum(CITIES)]),
    country: z.enum(COUNTRY_CODES as unknown as [string, ...string[]]),
    languages: z.array(z.enum(["ar", "en"])).max(2),
    startsOn: z.union([z.literal(""), dateStr]),
    endsOn: z.union([z.literal(""), dateStr]),
    budgetMin: z.union([z.literal(""), money]),
    budgetMax: z.union([z.literal(""), money]),
    modes: z.array(z.enum(COLLAB_MODES)).min(1).max(3),
    audience: z.enum(["public", "partners"]),
    days: z.coerce.number().int().min(1).max(90),
  })
  .refine((v) => !v.startsOn || !v.endsOn || v.startsOn <= v.endsOn, { message: "order", path: ["endsOn"] })
  .refine((v) => v.budgetMin === "" || v.budgetMax === "" || v.budgetMin <= v.budgetMax, { message: "order", path: ["budgetMax"] });

export const rosterSchema = z.object({
  providerAgencyId: uuid,
  groupName: shortText(40),
  tags: z.array(shortText(30)).max(8),
  notes: shortText(1000),
  rate: z.union([z.literal(""), money]),
  rateUnit: z.union([z.literal(""), z.enum(RATE_UNITS)]),
});

export const inviteSchema = z.object({
  label: shortText(60),
  roles: z.array(z.string().max(60)).max(6),
});

export const deliverableLineSchema = z.object({ key: z.string().max(60).refine((k) => Boolean(deliverable(k)), "unknown deliverable"), quantity: z.coerce.number().int().min(1).max(1000), platform: z.string().max(30).nullable().optional() });

export const inquirySchema = z
  .object({
    title: shortText(120).min(3),
    role: z.union([z.literal(""), z.string().max(60)]),
    deliverables: z.array(deliverableLineSchema).max(20),
    scope: shortText(3000),
    assetsNote: shortText(500),
    startsOn: z.union([z.literal(""), dateStr]),
    dueOn: z.union([z.literal(""), dateStr]),
    timezone: tz,
    workMode: z.enum(WORK_MODES),
    city: z.union([z.literal(""), z.enum(CITIES)]),
    budget: z.union([z.literal(""), money]),
    privacyMode: z.enum(COLLAB_MODES),
    responseDays: z.coerce.number().int().min(1).max(30),
    recipients: z.array(uuid).min(1).max(MAX_RECIPIENTS),
    needId: z.union([z.literal(""), uuid]),
    parentContractId: z.union([z.literal(""), uuid]),
  })
  .refine((v) => !v.startsOn || !v.dueOn || v.startsOn <= v.dueOn, { message: "order", path: ["dueOn"] });

export const quoteSchema = z
  .object({
    amount: money,
    currency,
    startsOn: z.union([z.literal(""), dateStr]),
    dueOn: z.union([z.literal(""), dateStr]),
    scopeNote: shortText(2000),
    exclusions: shortText(1000),
  })
  .refine((v) => !v.startsOn || !v.dueOn || v.startsOn <= v.dueOn, { message: "order", path: ["dueOn"] });

export type NeedInput = z.infer<typeof needSchema>;
export type InquiryInput = z.infer<typeof inquirySchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
