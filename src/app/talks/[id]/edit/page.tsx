import { TalkEditorPageClient } from "@/components/talk/talk-editor-page-client";
import { talkRepository } from "@/lib/repository";

interface TalkEditPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const talks = await talkRepository.getTalkList();
  return talks.map((talk) => ({ id: talk.id }));
}

export default async function TalkEditPage({ params }: TalkEditPageProps) {
  const { id } = await params;
  return <TalkEditorPageClient talkId={id} />;
}
