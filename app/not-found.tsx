import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageShell eyebrow="404" title="Page not found" description="The tournament or admin page you requested does not exist.">
      <Link href="/">
        <Button>Return home</Button>
      </Link>
    </PageShell>
  );
}
