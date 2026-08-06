"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRootContext } from "@/context/RootContext";

export function MediTrackDashboardPage() {
  const { user, handleLogout } = useRootContext();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-1">
          <h1 className="text-2xl font-bold">MediTrack</h1>
          <p className="text-sm text-muted-foreground">
            Welcome{user?.firstName ? `, ${user.firstName}` : ""}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            You're signed in to the MediTrack (human) workspace. Full dashboard
            screens are on the way — this confirms login and routing land you
            in the right place for your company's mode.
          </p>
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
