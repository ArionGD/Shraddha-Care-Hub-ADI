import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, UserPlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MemberOption {
  id: string;
  name: string;
  membership_id: string | null;
  phone_digits: string | null;
  status: string;
}

interface Props {
  onSelect: (member: { id: string; name: string } | { guestName: string }) => void;
  placeholder?: string;
  className?: string;
}

export function MemberSearchCombobox({ onSelect, placeholder = "Search member…", className }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [guestName, setGuestName] = useState("");

  const trimmed = query.trim();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["member-search", trimmed],
    queryFn: async () => {
      if (trimmed.length < 2) return [];
      const { data, error } = await supabase
        .from("member_imports")
        .select("id, name, membership_id, phone_digits, status")
        .ilike("name", `%${trimmed}%`)
        .limit(10);
      if (error) throw error;
      return (data ?? []) as MemberOption[];
    },
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });

  const handleSelect = useCallback(
    (m: MemberOption) => {
      onSelect({ id: m.id, name: m.name });
      setQuery("");
      setOpen(false);
    },
    [onSelect],
  );

  const handleGuestSubmit = useCallback(() => {
    const name = guestName.trim();
    if (!name) return;
    onSelect({ guestName: name });
    setGuestName("");
    setGuestMode(false);
    setQuery("");
    setOpen(false);
  }, [guestName, onSelect]);

  if (guestMode) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Guest name…"
          className="h-9"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleGuestSubmit();
            if (e.key === "Escape") setGuestMode(false);
          }}
        />
        <Button size="sm" variant="outline" onClick={handleGuestSubmit} disabled={!guestName.trim()}>
          Add
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setGuestMode(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-9 h-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && trimmed.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md max-h-56 overflow-y-auto">
          {members.length === 0 && !isLoading && (
            <div className="p-3 text-sm text-muted-foreground text-center">No members found</div>
          )}
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors"
              onClick={() => handleSelect(m)}
            >
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{m.name}</span>
                  {m.status && (
                    <span className={cn(
                      "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                      m.status === "active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                      m.status === "due" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {m.status}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {m.membership_id && <span>{m.membership_id}</span>}
                  {m.phone_digits && <span>••••{m.phone_digits.slice(-4)}</span>}
                </div>
              </div>
            </button>
          ))}
          <button
            type="button"
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent border-t transition-colors text-muted-foreground"
            onClick={() => {
              setGuestMode(true);
              setOpen(false);
            }}
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            Add as guest
          </button>
        </div>
      )}

      {/* Close dropdown on outside click */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
