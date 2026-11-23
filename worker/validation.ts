import { z } from "zod";
import {
  ITEM_TYPES,
  MAX_LABEL_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_URL_LENGTH,
  PRIORITIES,
  STATUSES,
} from "../shared/items";

// What the API accepts from a caller. Every schema below is a description of
// valid input: Zod checks incoming data against it and either hands back clean,
// correctly typed data or says what is wrong. Nothing here touches the
// database.
//
// Each schema is "strict", which means a field it does not know about is an
// error rather than ignored. A caller who sends a field that does nothing
// should be told, not left thinking it worked.

const title = z
  .string({
    // Leaving the title out and sending something that is not text get
    // different messages, because they are different mistakes.
    error: (issue) =>
      issue.input === undefined ? "A title is required." : "The title must be text.",
  })
  .trim()
  .min(1, "A title is required.")
  .max(MAX_TITLE_LENGTH, `The title must be at most ${MAX_TITLE_LENGTH} characters.`);

const notes = z
  .string({ error: "The notes must be text." })
  .max(MAX_NOTES_LENGTH, `The notes must be at most ${MAX_NOTES_LENGTH} characters.`);

const type = z.enum(ITEM_TYPES, { error: `The type must be one of: ${ITEM_TYPES.join(", ")}.` });

const priority = z.enum(PRIORITIES, {
  error: `The priority must be one of: ${PRIORITIES.join(", ")}.`,
});

// z.iso.date() accepts real calendar dates only, so 2026-02-30 is refused.
const date = (name: string) =>
  z.iso.date({ error: `${name} must be a real date written as YYYY-MM-DD.` });

const cents = (name: string) =>
  z
    .number({ error: `${name} must be a number of cents.` })
    .int(`${name} must be a whole number of cents.`)
    .nonnegative(`${name} cannot be negative.`);

const shop = z
  .string({ error: "The shop must be text." })
  .trim()
  .max(MAX_LABEL_LENGTH, `The shop must be at most ${MAX_LABEL_LENGTH} characters.`);

/** Message for a body that is not a JSON object at all. Other problems keep Zod's own message. */
const notAnObject = (issue: { code: string }) =>
  issue.code === "invalid_type" ? "Send the data as a JSON object." : undefined;

/**
 * True for a web address: it must be written starting http:// or https://, and
 * be one the URL parser accepts. The parser alone is too forgiving. It reads
 * "http:example.com" as a web address, but the database, which only accepts
 * text that starts with http:// or https://, would refuse it.
 */
function isWebAddress(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** A new item. Only the title is required. A new item always starts as an idea. */
export const createItemSchema = z.strictObject(
  {
    title,
    notes: notes.optional(),
    type: type.optional(),
    priority: priority.optional(),
    neededBy: date("The needed-by date").nullable().optional(),
    budgetCents: cents("The budget").nullable().optional(),
    // Who added the item is never accepted from the caller: it comes from the
    // sign-in token. Only whether it is private can be chosen.
    isPrivate: z.boolean({ error: "Private must be true or false." }).optional(),
  },
  { error: notAnObject },
);
export type CreateItemInput = z.infer<typeof createItemSchema>;

/**
 * A change to an item: any of the same fields, but at least one. A field that
 * is left out stays as it is. A date or budget set to null is cleared.
 */
export const updateItemSchema = createItemSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    error: "Send at least one field to change.",
  });
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

/**
 * A change of status. The purchase details only make sense for "bought", so
 * sending them with any other status is an error.
 */
export const changeStatusSchema = z
  .strictObject(
    {
      status: z.enum(STATUSES, { error: `The status must be one of: ${STATUSES.join(", ")}.` }),
      boughtOn: date("The bought-on date").optional(),
      paidCents: cents("The price paid").optional(),
      boughtFrom: shop.optional(),
    },
    { error: notAnObject },
  )
  .refine(
    (input) =>
      input.status === "bought" ||
      (input.boughtOn === undefined &&
        input.paidCents === undefined &&
        input.boughtFrom === undefined),
    { error: "Purchase details can only be sent with the status bought." },
  );

/** A link to add to an item. */
export const addLinkSchema = z.strictObject(
  {
    url: z
      .string({ error: "The link must be text." })
      .trim()
      .max(MAX_URL_LENGTH, `The link must be at most ${MAX_URL_LENGTH} characters.`)
      .refine(isWebAddress, {
        error: "The link must be a web address starting with http:// or https://.",
      }),
    label: z
      .string({ error: "The label must be text." })
      .trim()
      .max(MAX_LABEL_LENGTH, `The label must be at most ${MAX_LABEL_LENGTH} characters.`)
      .optional(),
  },
  { error: notAnObject },
);

/**
 * Checks a request body against a schema. Returns the clean data, or the
 * first problem as a sentence for the caller.
 */
export function parse<T>(schema: z.ZodType<T>, body: unknown): { data: T } | { error: string } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { data: result.data };
  }
  return { error: result.error.issues[0]?.message ?? "The request is not valid." };
}
