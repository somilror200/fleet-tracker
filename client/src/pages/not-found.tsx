import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex min-h-full w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-7 w-7 shrink-0 text-destructive" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                That Fleet Tracker page does not exist or may have moved.
              </p>
            </div>
          </div>
          <Button asChild className="mt-6">
            <Link href="/">Return to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
