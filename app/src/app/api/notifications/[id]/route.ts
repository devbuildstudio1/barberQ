import { handle, jsonOk } from "@/lib/api/response";
import { unwrap } from "@/lib/api/unwrap";
import { deleteNotificationAction, markNotificationReadAction } from "@/lib/notifications/actions";

export const PATCH = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  return jsonOk(unwrap(await markNotificationReadAction({ id })));
});

export const DELETE = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  return jsonOk(unwrap(await deleteNotificationAction({ id })));
});
