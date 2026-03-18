import { TalksExplorer } from "@/components/talk/talks-explorer";
import { talkRepository } from "@/lib/repository";

export default async function TalksPage() {

  const [talks, categories, tags, productLabels, sceneLabels] = await Promise.all([
    talkRepository.getTalkList(),
    talkRepository.getTalkCategories(),
    talkRepository.getTalkTags(),
    talkRepository.getProductLabels(),
    talkRepository.getSceneLabels(),
  ]);

  return (
    <TalksExplorer
      talks={talks}
      categories={categories}
      tags={tags}
      productLabels={productLabels}
      sceneLabels={sceneLabels}
    />
  );
}
