import { handle, jsonOk } from "@/lib/api/response";
import { unwrap } from "@/lib/api/unwrap";
import { markAllNotificationsReadAction } from "@/lib/notifications/actions";

export const POST = handle(async () => jsonOk(unwrap(await markAllNotificationsReadAction())));
