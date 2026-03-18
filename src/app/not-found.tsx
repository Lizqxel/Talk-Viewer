import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">ページが見つかりません</h1>
      <p className="max-w-md text-sm text-muted-foreground">指定されたトークが削除されたか、URLが変更されています。</p>
      <Button asChild>
        <Link href="/talks">トーク一覧へ戻る</Link>
      </Button>
    </div>
  );
}
