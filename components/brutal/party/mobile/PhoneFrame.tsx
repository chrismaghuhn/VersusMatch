import type { ReactNode } from "react";
import { Signal, Wifi, Battery } from "lucide-react";
import { Meta } from "@/components/brutal/party/shared/Shell";

export function PhoneFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Meta>{label}</Meta>
      <div className="relative mx-auto mt-2" style={{ width: 280 }}>
        <div className="absolute inset-0 -m-2 rounded-[40px] bg-[#1a1a1a]" />
        <div
          className="relative overflow-hidden rounded-[32px] border border-white/10"
          style={{ aspectRatio: "9/19.5" }}
        >
          <div
            className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-black/90 px-5 py-1 text-white/80 backdrop-blur"
            style={{ fontSize: 10, fontWeight: 700 }}
          >
            <span style={{ fontFamily: "ui-monospace, monospace" }}>9:41</span>
            <div className="absolute left-1/2 top-0 h-4 w-20 -translate-x-1/2 rounded-b-2xl bg-black" />
            <div className="flex items-center gap-1">
              <Signal className="h-2.5 w-2.5" />
              <Wifi className="h-2.5 w-2.5" />
              <Battery className="h-2.5 w-2.5" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 top-6 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}
