import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVenture, timeAgo } from "@/lib/store";

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, hydrated } = useVenture();
  const count = hydrated ? unreadCount : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
        >
          <Bell className="size-4" />
          {count > 0 && (
            <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-medium">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => void markAllRead()}
            disabled={count === 0}
          >
            <CheckCheck className="size-3.5" aria-hidden="true" />
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id} className="flex gap-3 px-4 py-3">
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-muted" : "bg-primary"}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
