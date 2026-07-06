"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function ChildPresenceBroadcaster({ childId }: { childId: string }) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("child-presence", {
      config: { presence: { key: childId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {})
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ child_id: childId, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId]);

  return null;
}
