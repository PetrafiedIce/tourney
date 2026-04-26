"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toaster";
import { LADDERS } from "@/lib/constants";

export function TournamentForm() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const adminTokenValue = String(formData.get("adminToken") ?? "").trim();
      const payload = {
        name: String(formData.get("name") ?? ""),
        ladder: String(formData.get("ladder") ?? ""),
        usernames: String(formData.get("usernames") ?? ""),
        ...(adminTokenValue ? { adminToken: adminTokenValue } : {}),
      };

      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(typeof data.message === "string" ? data.message : "Failed to create tournament.");
      }

      const tournamentId = String(data.tournamentId);
      const adminToken = String(data.adminToken);
      pushToast({ title: "Tournament created", description: "Players were registered and the bracket is ready to configure." });
      router.push(`/admin/t/${tournamentId}?token=${encodeURIComponent(adminToken)}`);
      router.refresh();
    } catch (error) {
      pushToast({
        title: "Could not create tournament",
        description: error instanceof Error ? error.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Create a new tournament</CardTitle>
        <CardDescription>Paste usernames, pick a FlowPvP ladder, and the app will verify UUIDs server-side.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="name">Tournament name</Label>
            <Input id="name" name="name" placeholder="Friday Night Mace Cup" required />
          </div>
          <div className="grid gap-2 md:max-w-xs">
            <Label htmlFor="ladder">Ladder</Label>
            <Select id="ladder" name="ladder" required defaultValue="mace">
              {LADDERS.map((ladder) => (
                <option key={ladder.id} value={ladder.id}>
                  {ladder.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="usernames">Usernames</Label>
            <Textarea id="usernames" name="usernames" placeholder={"karlazuz\nIvanF5\n..."} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adminToken">Admin token (optional)</Label>
            <Input id="adminToken" name="adminToken" placeholder="Leave blank to auto-generate" />
          </div>
          <div>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Tournament"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
