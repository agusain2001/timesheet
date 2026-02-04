import { ManageTasks } from "@/features/tasks";
import ContentContainer from "@/components/layout/ContentContainer";

export default async function TasksPage() {
  return (
    <ContentContainer>
      <ManageTasks />
    </ContentContainer>
  );
}
